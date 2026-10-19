# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): 598f347e60134b8901944cb8c18c3431bf4e3318ca7a07eb3efd009d44f6f603
"""Zentrale des Notification Center: Meldungen der Integrationen sammeln.

Empfängt die vier Ereignisse der Schnittstelle (Schema 1, siehe README):

- ``notification_center_register``  - Katalog der Meldungsarten einer Quelle
- ``notification_center_report``    - eine Meldung (``active``/``resolved``)
- ``notification_center_sync``      - welche Keys einer Art wirklich aktiv sind
- ``notification_center_ping``      - sendet das Notification Center selbst

Die Meldungen tragen nur Schlüssel und Platzhalter. Die Texte stammen aus dem
Katalog der Quelle und werden hier in der Sprache von Home Assistant
zusammengesetzt (Rückfall: Englisch, dann der Name der Meldungsart).

Zustellung: Push über die Empfänger-Profile, einstellbar je Dringlichkeit.
Der Lautlos-Modus hält Push-Nachrichten zurück (die Meldungen bleiben in Karte
und Widget sichtbar); ``critical`` kann ihn umgehen. Nichts in dieser Datei
schreibt Inhalte von Meldungen (Namen, Rufnummern, Texte) ins Log.
"""
from __future__ import annotations

import hashlib
import json
import logging
import re
import time
from collections import deque
from datetime import datetime, timedelta, timezone
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import CALLBACK_TYPE, Event, HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_call_later, async_track_time_interval
from homeassistant.helpers.start import async_at_started
from homeassistant.helpers.storage import Store

from .const import (
    BUNDLE_LIMIT,
    BUNDLE_WINDOW,
    CARD_VERSION,
    CONF_CRITICAL_BYPASS,
    CONF_DELIVERY,
    CONF_HISTORY_DAYS,
    CONF_HISTORY_MAX,
    CONF_RECIPIENTS,
    CONF_SILENT,
    DEFAULT_HISTORY_DAYS,
    DEFAULT_HISTORY_MAX,
    DOMAIN,
    EVENT_PING,
    EVENT_REGISTER,
    EVENT_REPORT,
    EVENT_SYNC,
    LANGUAGES,
    RECIPIENT_PUSH,
    SCHEMA,
    SELF_SOURCE,
    SEVERITIES,
    SIGNAL_UPDATED,
    UPDATE_CHECK_HOURS,
    URGENCY_CRITICAL,
    URGENCY_HIGH,
    URGENCY_NORMAL,
    VERSION,
)
from .notify import build_payload
from .update_check import async_check_update

_LOGGER = logging.getLogger(__name__)

STORE_VERSION = 1
SAVE_DELAY = 5
LOG_SIZE = 40
MAX_TEXT = 200
MAX_DATA_BYTES = 1024
TYPE_RE = re.compile(r"^[a-z0-9_]{1,64}$")
ICON_RE = re.compile(r"^[a-z0-9_-]{1,32}:[a-z0-9_-]{1,64}$")
PLACEHOLDER_RE = re.compile(r"\{(\w+)\}")

SEVERITY_TO_URGENCY = {
    "critical": URGENCY_CRITICAL,
    "warning": URGENCY_HIGH,
    "info": URGENCY_NORMAL,
    "ok": URGENCY_NORMAL,
}
# Ohne eigene Einstellung gehen nur kritische Meldungen und Warnungen als Push raus.
DEFAULT_PUSH_SEVERITIES = ("critical", "warning")

SEVERITY_NAMES = {
    "de": {"critical": "kritisch", "warning": "Warnung", "info": "Info", "ok": "in Ordnung"},
    "en": {"critical": "critical", "warning": "warning", "info": "info", "ok": "ok"},
    "nl": {"critical": "kritiek", "warning": "waarschuwing", "info": "info", "ok": "in orde"},
    "fr": {"critical": "critique", "warning": "avertissement", "info": "info", "ok": "OK"},
    "es": {"critical": "crítico", "warning": "advertencia", "info": "info", "ok": "correcto"},
}

HUB_TEXTS = {
    "de": {"bundle_title": "{n} weitere Meldungen", "bundle_message": "{label}: {n} weitere Meldungen (siehe Notification Center)."},
    "en": {"bundle_title": "{n} more notifications", "bundle_message": "{label}: {n} more notifications (see Notification Center)."},
    "nl": {"bundle_title": "{n} meer meldingen", "bundle_message": "{label}: {n} meer meldingen (zie Notification Center)."},
    "fr": {"bundle_title": "{n} notifications de plus", "bundle_message": "{label} : {n} notifications de plus (voir Notification Center)."},
    "es": {"bundle_title": "{n} avisos más", "bundle_message": "{label}: {n} avisos más (ver Notification Center)."},
}

# Eigene Quelle: Testmeldung, um Zustellung und Lautlos-Modus zu prüfen.
SELF_CATALOG = [
    {
        "type": "test",
        "severity": "info",
        "resolvable": False,
        "enabled": True,
        "icon": "mdi:bell-check-outline",
        "texts": {
            "de": {"label": "Testmeldung", "title": "Testmeldung", "message": "Das Notification Center funktioniert (Dringlichkeit: {severity})."},
            "en": {"label": "Test message", "title": "Test message", "message": "Notification Center works (urgency: {severity})."},
            "nl": {"label": "Testmelding", "title": "Testmelding", "message": "Notification Center werkt (urgentie: {severity})."},
            "fr": {"label": "Message de test", "title": "Message de test", "message": "Notification Center fonctionne (urgence : {severity})."},
            "es": {"label": "Mensaje de prueba", "title": "Mensaje de prueba", "message": "Notification Center funciona (urgencia: {severity})."},
        },
    }
]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _text(value: Any, limit: int = MAX_TEXT) -> str:
    return str(value if value is not None else "")[:limit]


def make_identity(source: str, entry_id: str, type_: str, key: str) -> str:
    return f"{source}|{entry_id}|{type_}|{key}"


def message_id(identity: str) -> str:
    return hashlib.sha1(identity.encode("utf-8")).hexdigest()[:12]  # noqa: S324 - nur ID


def fill(template: str, placeholders: dict[str, Any]) -> str:
    """``{name}`` ersetzen; unbekannte Platzhalter bleiben stehen."""
    return PLACEHOLDER_RE.sub(lambda m: _text(placeholders.get(m.group(1), m.group(0))), template)


def pick_texts(texts: dict[str, Any], lang: str, type_: str) -> dict[str, str]:
    """Rückfall: gewählte Sprache -> en -> Name der Meldungsart."""
    for code in (lang, "en"):
        item = texts.get(code)
        if isinstance(item, dict):
            return {
                "label": _text(item.get("label") or type_),
                "title": _text(item.get("title") or item.get("label") or type_),
                "message": _text(item.get("message") or ""),
            }
    return {"label": type_, "title": type_, "message": ""}


class NotificationHub:
    """Sammelt, sortiert und stellt Meldungen zu."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self.entry = entry
        self._store: Store = Store(hass, STORE_VERSION, f"{DOMAIN}.messages")
        self.sources: dict[tuple[str, str], dict[str, Any]] = {}
        self.messages: dict[str, dict[str, Any]] = {}
        self.history: list[dict[str, Any]] = []
        self.acked: set[str] = set()
        self.log: deque[dict[str, Any]] = deque(maxlen=LOG_SIZE)
        self.update_info: dict[str, Any] = {
            "installed": VERSION,
            "latest_version": None,
            "release_url": None,
            "update_available": False,
            "checked_at": None,
            "check_failed": False,
        }
        self._seen: set[tuple[str, str]] = set()
        self._bundles: dict[tuple[str, str, str], dict[str, Any]] = {}
        self._warned_schema = False
        self._unsubs: list[CALLBACK_TYPE] = []

    # ------------------------------------------------------------------
    # Lebenszyklus
    # ------------------------------------------------------------------
    async def async_load(self) -> None:
        data = await self._store.async_load() or {}
        self.messages = {m["identity"]: m for m in data.get("messages", []) if "identity" in m}
        self.history = list(data.get("history", []))
        self.acked = set(data.get("acked", []))
        for src in data.get("sources", []):
            self.sources[(src["source"], src["entry_id"])] = src
        self._register_self()
        self._prune_history()

    @callback
    def async_start(self) -> None:
        """Listener anmelden, Ping senden, Update-Prüfung starten."""
        bus = self.hass.bus
        self.entry.async_on_unload(bus.async_listen(EVENT_REGISTER, self._on_register))
        self.entry.async_on_unload(bus.async_listen(EVENT_REPORT, self._on_report))
        self.entry.async_on_unload(bus.async_listen(EVENT_SYNC, self._on_sync))
        self.entry.async_on_unload(self.async_stop)

        # Ping erst, wenn Home Assistant gestartet ist (Events werden nicht nachgeliefert).
        unsub_start = async_at_started(self.hass, self._send_ping)
        if unsub_start:
            self._unsubs.append(unsub_start)
        self._unsubs.append(
            async_track_time_interval(
                self.hass, self._scheduled_update_check, timedelta(hours=UPDATE_CHECK_HOURS)
            )
        )
        self.entry.async_create_background_task(
            self.hass, self.async_check_update(), "notification_center_update_check"
        )

    @callback
    def async_stop(self) -> None:
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
        for bundle in self._bundles.values():
            handle = bundle.get("handle")
            if handle:
                handle()
        self._bundles.clear()
        self._store.async_delay_save(self._store_data, 0)

    @callback
    def _send_ping(self, _hass: HomeAssistant) -> None:
        self.hass.bus.async_fire(EVENT_PING, {"schema": SCHEMA})

    async def _scheduled_update_check(self, _now_: datetime) -> None:
        await self.async_check_update()

    async def async_check_update(self) -> dict[str, Any]:
        self.update_info = await async_check_update(self.hass)
        self._changed(save=False)
        return self.update_info

    # ------------------------------------------------------------------
    # Optionen
    # ------------------------------------------------------------------
    @property
    def options(self) -> dict[str, Any]:
        return self.entry.options

    @property
    def silent(self) -> bool:
        return bool(self.options.get(CONF_SILENT, False))

    @property
    def critical_bypass(self) -> bool:
        return bool(self.options.get(CONF_CRITICAL_BYPASS, True))

    @property
    def language(self) -> str:
        lang = (self.hass.config.language or "en").split("-")[0].lower()
        return lang if lang in LANGUAGES else "en"

    def delivery_for(self, severity: str) -> list[str]:
        """IDs der Profile, die für diese Dringlichkeit Push erhalten."""
        profiles = {r["id"]: r for r in self.options.get(CONF_RECIPIENTS, [])}
        configured = self.options.get(CONF_DELIVERY)
        if isinstance(configured, dict) and severity in configured:
            wanted = list(configured[severity])
        elif severity in DEFAULT_PUSH_SEVERITIES:
            wanted = [rid for rid, r in profiles.items() if r.get("type") == RECIPIENT_PUSH]
        else:
            wanted = []
        return [rid for rid in wanted if rid in profiles]

    # ------------------------------------------------------------------
    # Eigene Quelle (Testmeldung)
    # ------------------------------------------------------------------
    def _register_self(self) -> None:
        self.sources[(SELF_SOURCE, self.entry.entry_id)] = {
            "source": SELF_SOURCE,
            "entry_id": self.entry.entry_id,
            "name": "Notification Center",
            "version": VERSION,
            "icon": "mdi:bell-badge-outline",
            "enabled": True,
            "types": {item["type"]: self._clean_type(item) for item in SELF_CATALOG},
            "last_seen": _now(),
        }
        self._seen.add((SELF_SOURCE, self.entry.entry_id))

    # ------------------------------------------------------------------
    # Empfang
    # ------------------------------------------------------------------
    def _log(self, kind: str, source: str = "", type_: str = "", state: str = "") -> None:
        # Bewusst ohne key, Namen und Platzhalter (Datenschutz).
        self.log.appendleft({"time": _now(), "kind": kind, "source": source, "type": type_, "state": state})

    def _schema_ok(self, data: dict[str, Any]) -> bool:
        schema = data.get("schema")
        if schema == SCHEMA:
            return True
        if isinstance(schema, int) and schema > SCHEMA and not self._warned_schema:
            self._warned_schema = True
            _LOGGER.warning("Meldung mit neuerem Schema %s ignoriert (unterstützt: %s)", schema, SCHEMA)
        return False

    @staticmethod
    def _clean_type(item: dict[str, Any]) -> dict[str, Any] | None:
        type_ = item.get("type")
        if not isinstance(type_, str) or not TYPE_RE.match(type_):
            return None
        severity = item.get("severity")
        texts: dict[str, dict[str, str]] = {}
        raw_texts = item.get("texts")
        if isinstance(raw_texts, dict):
            for lang in LANGUAGES:
                entry = raw_texts.get(lang)
                if isinstance(entry, dict):
                    texts[lang] = {
                        "label": _text(entry.get("label")),
                        "title": _text(entry.get("title")),
                        "message": _text(entry.get("message")),
                    }
        icon = item.get("icon")
        return {
            "type": type_,
            "severity": severity if severity in SEVERITIES else "info",
            "resolvable": bool(item.get("resolvable", True)),
            "enabled": bool(item.get("enabled", True)),
            "icon": icon if isinstance(icon, str) and ICON_RE.match(icon) else None,
            "texts": texts,
        }

    @callback
    def _on_register(self, event: Event) -> None:
        data = event.data
        if not self._schema_ok(data):
            return
        source, entry_id = data.get("source"), data.get("entry_id")
        types = data.get("types")
        if not (isinstance(source, str) and isinstance(entry_id, str) and source and isinstance(types, list)):
            _LOGGER.debug("Ungültige Anmeldung verworfen")
            return
        icon = data.get("icon")
        clean_types = {}
        for item in types:
            if isinstance(item, dict):
                cleaned = self._clean_type(item)
                if cleaned:
                    clean_types[cleaned["type"]] = cleaned
        self.sources[(source, entry_id)] = {
            "source": _text(source, 64),
            "entry_id": _text(entry_id, 64),
            "name": _text(data.get("name") or source, 80),
            "version": _text(data.get("version"), 32),
            "icon": icon if isinstance(icon, str) and ICON_RE.match(icon) else "mdi:bell-outline",
            "enabled": bool(data.get("enabled", True)),
            "types": clean_types,
            "last_seen": _now(),
        }
        self._seen.add((source, entry_id))
        self._log("register", source)
        self._changed()

    @callback
    def _on_report(self, event: Event) -> None:
        self.process_report(event.data)

    @callback
    def process_report(self, data: dict[str, Any]) -> None:
        if not self._schema_ok(data):
            return
        source, entry_id, type_, key, state = (
            data.get("source"), data.get("entry_id"), data.get("type"), data.get("key"), data.get("state")
        )
        if not (
            isinstance(source, str) and source
            and isinstance(entry_id, str) and entry_id
            and isinstance(type_, str) and TYPE_RE.match(type_)
            and key not in (None, "")
            and state in ("active", "resolved")
        ):
            _LOGGER.debug("Meldung mit fehlendem Pflichtfeld verworfen")
            return
        key = _text(key, 120)
        identity = make_identity(source, entry_id, type_, key)
        initial = bool(data.get("initial", False))

        if state == "resolved":
            self.acked.discard(identity)
            if identity in self.messages:
                self._close(identity, "resolved")
            self._log("report", source, type_, "resolved")
            self._changed()
            return

        if identity in self.acked:
            if initial:
                return  # vom Nutzer quittiert, Zustand besteht weiter
            self.acked.discard(identity)

        catalog = (self.sources.get((source, entry_id)) or {}).get("types", {}).get(type_)
        severity = data.get("severity")
        if severity not in SEVERITIES:
            severity = catalog["severity"] if catalog else "info"

        subject = data.get("subject") if isinstance(data.get("subject"), dict) else {}
        placeholders = data.get("placeholders") if isinstance(data.get("placeholders"), dict) else {}
        extra = data.get("data") if isinstance(data.get("data"), dict) else {}
        try:
            if len(json.dumps(extra)) > MAX_DATA_BYTES:
                extra = {}
        except (TypeError, ValueError):
            extra = {}

        existing = self.messages.get(identity)
        message = {
            "identity": identity,
            "id": message_id(identity),
            "source": source,
            "entry_id": entry_id,
            "type": type_,
            "key": key,
            "severity": severity,
            "subject": {k: _text(subject.get(k), 80) for k in ("id", "name", "kind") if k in subject},
            "placeholders": {
                _text(k, 40): _text(v, 120)
                for k, v in placeholders.items()
                if isinstance(v, (str, int, float))
            },
            "data": extra,
            "initial": initial,
            "created": existing["created"] if existing else _now(),
            "updated": _now(),
        }
        self.messages[identity] = message
        self._log("report", source, type_, "active")
        self._changed()
        if existing is None and not initial:
            self._deliver(message)

    @callback
    def _on_sync(self, event: Event) -> None:
        data = event.data
        if not self._schema_ok(data):
            return
        source, entry_id, type_, keys = (
            data.get("source"), data.get("entry_id"), data.get("type"), data.get("active_keys")
        )
        if not (isinstance(source, str) and isinstance(entry_id, str) and isinstance(type_, str) and isinstance(keys, list)):
            return
        catalog = (self.sources.get((source, entry_id)) or {}).get("types", {}).get(type_)
        if catalog is None or not catalog["resolvable"]:
            return  # nicht auflösbare Arten werden nie per Sync geschlossen
        active = {_text(k, 120) for k in keys}
        changed = False
        for identity, msg in list(self.messages.items()):
            if (msg["source"], msg["entry_id"], msg["type"]) == (source, entry_id, type_) and msg["key"] not in active:
                self._close(identity, "resolved")
                changed = True
        for identity in list(self.acked):
            parts = identity.split("|", 3)
            if len(parts) == 4 and tuple(parts[:3]) == (source, entry_id, type_) and parts[3] not in active:
                self.acked.discard(identity)
        self._log("sync", source, type_)
        if changed:
            self._changed()

    # ------------------------------------------------------------------
    # Schließen, Quittieren, Verlauf
    # ------------------------------------------------------------------
    def _close(self, identity: str, status: str) -> None:
        msg = self.messages.pop(identity, None)
        if msg is None:
            return
        msg["status"] = status
        msg["closed"] = _now()
        self.history.insert(0, msg)
        self._prune_history()

    def _prune_history(self) -> None:
        days = int(self.options.get(CONF_HISTORY_DAYS, DEFAULT_HISTORY_DAYS))
        limit = int(self.options.get(CONF_HISTORY_MAX, DEFAULT_HISTORY_MAX))
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        self.history = [m for m in self.history if m.get("closed", "") >= cutoff][:limit]

    @callback
    def async_ack(self, msg_id: str) -> bool:
        for identity, msg in list(self.messages.items()):
            if msg["id"] == msg_id:
                if self._is_resolvable(msg):
                    self.acked.add(identity)
                self._close(identity, "ack")
                self._log("ack", msg["source"], msg["type"])
                self._changed()
                return True
        return False

    @callback
    def async_ack_all(self) -> int:
        count = 0
        for identity, msg in list(self.messages.items()):
            if self._is_resolvable(msg):
                self.acked.add(identity)
            self._close(identity, "ack")
            count += 1
        if count:
            self._log("ack")
            self._changed()
        return count

    @callback
    def async_clear_history(self) -> None:
        self.history = []
        self._changed()

    def _is_resolvable(self, msg: dict[str, Any]) -> bool:
        catalog = (self.sources.get((msg["source"], msg["entry_id"])) or {}).get("types", {}).get(msg["type"])
        return bool(catalog and catalog["resolvable"])

    @callback
    def async_send_test(self, severity: str) -> None:
        """Testmeldung über den normalen Weg (inkl. Zustellung)."""
        if severity not in SEVERITIES:
            severity = "info"
        self.process_report(
            {
                "schema": SCHEMA,
                "source": SELF_SOURCE,
                "entry_id": self.entry.entry_id,
                "type": "test",
                "key": f"test_{int(time.time() * 1000)}",
                "state": "active",
                "severity": severity,
                "subject": {"kind": "system", "name": "Notification Center"},
                "placeholders": {"severity": SEVERITY_NAMES[self.language][severity]},
            }
        )

    # ------------------------------------------------------------------
    # Zustellung
    # ------------------------------------------------------------------
    def _deliver(self, msg: dict[str, Any]) -> None:
        severity = msg["severity"]
        if self.silent and not (severity == "critical" and self.critical_bypass):
            self._log("push_silent", msg["source"], msg["type"])
            return
        targets = self.delivery_for(severity)
        if not targets:
            return

        # Bündeln: ab der 6. gleichartigen Meldung im Zeitfenster nur noch eine Zusammenfassung.
        key = (msg["source"], msg["entry_id"], msg["type"])
        now = time.monotonic()
        bundle = self._bundles.get(key)
        if bundle is None or now - bundle["start"] > BUNDLE_WINDOW:
            bundle = {"start": now, "count": 0, "extra": 0, "severity": severity, "handle": None}
            self._bundles[key] = bundle
        bundle["count"] += 1
        if bundle["count"] > BUNDLE_LIMIT:
            bundle["extra"] += 1
            if bundle["handle"] is None:
                delay = max(1.0, BUNDLE_WINDOW - (now - bundle["start"]))
                bundle["handle"] = async_call_later(
                    self.hass, delay, lambda _n, k=key, t=tuple(targets): self._flush_bundle(k, list(t))
                )
            return
        title, text = self.render(msg)
        self._push(targets, title, text, severity)

    @callback
    def _flush_bundle(self, key: tuple[str, str, str], targets: list[str]) -> None:
        bundle = self._bundles.pop(key, None)
        if not bundle or not bundle["extra"]:
            return
        source = self.sources.get((key[0], key[1])) or {}
        catalog = source.get("types", {}).get(key[2], {})
        label = pick_texts(catalog.get("texts", {}), self.language, key[2])["label"]
        texts = HUB_TEXTS[self.language]
        values = {"n": bundle["extra"], "label": label}
        self._push(targets, fill(texts["bundle_title"], values), fill(texts["bundle_message"], values), bundle["severity"])

    def render(self, msg: dict[str, Any]) -> tuple[str, str]:
        """Titel und Text in der Sprache von Home Assistant."""
        source = self.sources.get((msg["source"], msg["entry_id"])) or {}
        catalog = source.get("types", {}).get(msg["type"], {})
        texts = pick_texts(catalog.get("texts", {}), self.language, msg["type"])
        return fill(texts["title"], msg["placeholders"]), fill(texts["message"], msg["placeholders"])

    def _push(self, targets: list[str], title: str, text: str, severity: str) -> None:
        profiles = {r["id"]: r for r in self.options.get(CONF_RECIPIENTS, [])}
        urgency = SEVERITY_TO_URGENCY[severity]
        for profile_id in targets:
            profile = profiles.get(profile_id)
            if profile is None:
                continue
            payload = build_payload(profile["type"], title, text, urgency)
            self.hass.async_create_task(self._async_send(profile, payload))

    async def _async_send(self, profile: dict[str, Any], payload: dict[str, Any]) -> None:
        try:
            await self.hass.services.async_call("notify", profile["target"], payload, blocking=True)
            self._log("push", state="ok")
        except Exception:  # noqa: BLE001 - ein Profil darf die anderen nicht aufhalten
            self._log("push", state="error")
            _LOGGER.warning("Zustellung an Profil %s fehlgeschlagen", profile.get("id"))

    # ------------------------------------------------------------------
    # Ausgabe für Sensor und Karte
    # ------------------------------------------------------------------
    @callback
    def _changed(self, save: bool = True) -> None:
        if save:
            self._store.async_delay_save(self._store_data, SAVE_DELAY)
        async_dispatcher_send(self.hass, SIGNAL_UPDATED)

    def _store_data(self) -> dict[str, Any]:
        return {
            "messages": list(self.messages.values()),
            "history": self.history,
            "acked": sorted(self.acked),
            "sources": [s for s in self.sources.values() if s["source"] != SELF_SOURCE],
        }

    def _item(self, msg: dict[str, Any]) -> dict[str, Any]:
        source = self.sources.get((msg["source"], msg["entry_id"])) or {}
        catalog = source.get("types", {}).get(msg["type"], {})
        title, text = self.render(msg)
        subject = msg.get("subject") or {}
        item = {
            "id": msg["id"],
            "title": title,
            "message": text,
            "severity": msg["severity"],
            "source": msg["source"],
            "source_name": source.get("name") or msg["source"],
            "type": msg["type"],
            "icon": catalog.get("icon") or source.get("icon"),
            "created_at": msg["created"],
            "resolvable": bool(catalog.get("resolvable", False)),
        }
        if subject.get("name"):
            item["subject_name"] = subject["name"]
        if msg.get("closed"):
            item["closed_at"] = msg["closed"]
            item["status"] = msg.get("status")
        return item

    def items(self) -> list[dict[str, Any]]:
        order = {s: i for i, s in enumerate(SEVERITIES)}
        ranked = sorted(self.messages.values(), key=lambda m: m["created"], reverse=True)
        ranked.sort(key=lambda m: order.get(m["severity"], 9))
        return [self._item(m) for m in ranked]

    def sources_snapshot(self) -> list[dict[str, Any]]:
        order = {s: i for i, s in enumerate(SEVERITIES)}
        counts: dict[tuple[str, str, str], int] = {}
        for msg in self.messages.values():
            k = (msg["source"], msg["entry_id"], msg["type"])
            counts[k] = counts.get(k, 0) + 1
        result = []
        for (source, entry_id), src in sorted(self.sources.items(), key=lambda kv: kv[1]["name"].casefold()):
            types = sorted(src["types"].values(), key=lambda t: order[t["severity"]])
            result.append(
                {
                    "source": source,
                    "entry_id": entry_id,
                    "name": src["name"],
                    "version": src["version"],
                    "icon": src["icon"],
                    "enabled": src["enabled"],
                    "seen": (source, entry_id) in self._seen,
                    "types": [
                        {
                            "type": t["type"],
                            "severity": t["severity"],
                            "icon": t["icon"],
                            "enabled": t["enabled"] and src["enabled"],
                            "label": pick_texts(t["texts"], self.language, t["type"])["label"],
                            "open": counts.get((source, entry_id, t["type"]), 0),
                        }
                        for t in types
                    ],
                }
            )
        return result

    def attributes(self) -> dict[str, Any]:
        counts = {s: 0 for s in SEVERITIES}
        for msg in self.messages.values():
            counts[msg["severity"]] = counts.get(msg["severity"], 0) + 1
        profiles = [
            {"id": r["id"], "name": r["name"], "type": r["type"]}
            for r in self.options.get(CONF_RECIPIENTS, [])
        ]
        return {
            "by_severity": counts,
            "history": [self._item(m) for m in self.history[:50]],
            "sources": self.sources_snapshot(),
            "settings": {
                "silent_mode": self.silent,
                "critical_bypass": self.critical_bypass,
                "history_days": int(self.options.get(CONF_HISTORY_DAYS, DEFAULT_HISTORY_DAYS)),
                "history_max": int(self.options.get(CONF_HISTORY_MAX, DEFAULT_HISTORY_MAX)),
                "profiles": profiles,
                "delivery": {s: self.delivery_for(s) for s in SEVERITIES},
            },
            "app": {
                "version": VERSION,
                "card_version": CARD_VERSION,
                **{k: v for k, v in self.update_info.items() if k != "installed"},
            },
            "log": list(self.log),
        }
