# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): 1a2c7eaa2e9560c8f7147ad72128a2ffa7abe972a270f9bb79506b4fd8d2303b
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

import yaml

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import CALLBACK_TYPE, Event, HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_call_later, async_track_time_interval
from homeassistant.helpers.start import async_at_started
from homeassistant.helpers.storage import Store

from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.helpers.template import Template
from homeassistant.util import slugify

from .const import (
    BUNDLE_LIMIT,
    IMPORT_PREFIX,
    INBOUND_PREFIX,
    SAMPLE_BYTES,
    MAX_CARD_BYTES,
    MAX_CARD_YAML_CHARS,
    SERVICE_PREFIX,
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
DOMAIN_RE = re.compile(r"^[a-z0-9_]{1,64}$")
MAX_PLACEHOLDER = 2000
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
    return PLACEHOLDER_RE.sub(lambda m: _text(placeholders.get(m.group(1), m.group(0)), MAX_PLACEHOLDER), template)


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
        # Einstellungen des Nutzers (Stufen-Zuordnung, Popup-Karten, Import-Regeln)
        self.prefs: dict[str, Any] = {"severity_map": {}, "cards": {}, "imports": [], "inbound": []}
        self.samples: dict[str, dict[str, str]] = {}
        self._inbound_unsubs: list[CALLBACK_TYPE] = []
        self._import_unsub: CALLBACK_TYPE | None = None
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
        stored_prefs = data.get("prefs") or {}
        self.prefs = {
            "severity_map": dict(stored_prefs.get("severity_map", {})),
            "cards": dict(stored_prefs.get("cards", {})),
            "imports": list(stored_prefs.get("imports", [])),
            "inbound": list(stored_prefs.get("inbound", [])),
        }
        self.samples = dict(data.get("samples", {}))
        self._register_self()
        for rule in self.prefs["imports"]:
            self._register_import(rule)
        for rule in self.prefs["inbound"]:
            self._register_inbound(rule)
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
        self._restart_inbound()
        unsub_imports = async_at_started(self.hass, self._start_imports)
        if unsub_imports:
            self._unsubs.append(unsub_imports)
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
        self._stop_inbound()
        if self._import_unsub:
            self._import_unsub()
            self._import_unsub = None
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

    @staticmethod
    def parse_card_yaml(text: str) -> dict[str, Any]:
        """Kartencode aus dem Karteneditor (YAML, JSON ist ebenfalls gültig) in ein Dict wandeln.

        Löst ``ValueError`` mit der Position ("Zeile:Spalte") aus, wenn der Text kein gültiges YAML ist.
        Anker und Verweise (``&``/``*``) sind nicht erlaubt (Schutz vor aufgeblähten Dokumenten).
        """
        if not isinstance(text, str) or len(text) > MAX_CARD_YAML_CHARS:
            raise ValueError("size")
        try:
            for event in yaml.parse(text, Loader=yaml.SafeLoader):
                if isinstance(event, yaml.AliasEvent) or getattr(event, "anchor", None):
                    raise ValueError("anchor")
            data = yaml.safe_load(text)
        except yaml.YAMLError as err:
            mark = getattr(err, "problem_mark", None)
            raise ValueError(f"{mark.line + 1}:{mark.column + 1}" if mark else "?") from None
        # Eine Liste mit genau einer Karte (z. B. aus einem Stapel kopiert) wird akzeptiert.
        if isinstance(data, list) and len(data) == 1:
            data = data[0]
        if not isinstance(data, dict):
            raise ValueError("type")
        return data

    @staticmethod
    def card_to_yaml(card: dict[str, Any] | None) -> str:
        """Kartenkonfiguration als YAML-Text für das Eingabefeld."""
        if not card:
            return ""
        try:
            return yaml.safe_dump(card, sort_keys=False, allow_unicode=True, default_flow_style=False).rstrip("\n")
        except yaml.YAMLError:
            return ""

    @staticmethod
    def _clean_card(card: Any) -> dict[str, Any] | None:
        """Lovelace-Kartenkonfiguration der Quelle (Popup); nur ein Dict mit ``type``."""
        if not isinstance(card, dict) or not isinstance(card.get("type"), str) or not card["type"]:
            return None
        try:
            if len(json.dumps(card)) > MAX_CARD_BYTES:
                return None
        except (TypeError, ValueError):
            return None
        return card

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
        domain = data.get("domain")
        card = data.get("card")
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
            "domain": domain if isinstance(domain, str) and DOMAIN_RE.match(domain) else None,
            "card": self._clean_card(card),
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
        reported = data.get("severity")
        if reported not in SEVERITIES:
            reported = catalog["severity"] if catalog else "info"
        severity = self.effective_severity(source, type_, reported)

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
            "severity_reported": reported,
            "subject": {k: _text(subject.get(k), 80) for k in ("id", "name", "kind") if k in subject},
            "placeholders": {
                _text(k, 40): _text(v, MAX_PLACEHOLDER)
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
    # Stufen-Zuordnung und Popup-Karten (vom Nutzer einstellbar)
    # ------------------------------------------------------------------
    def effective_severity(self, source: str, type_: str, reported: str) -> str:
        chosen = self.prefs["severity_map"].get(f"{source}|{type_}")
        return chosen if chosen in SEVERITIES else reported

    @callback
    def async_set_severity(self, source: str, type_: str, severity: str | None) -> None:
        """Stufe einer Meldungsart festlegen; ``None`` stellt die Vorgabe der Quelle wieder her."""
        key = f"{source}|{type_}"
        if severity in SEVERITIES:
            self.prefs["severity_map"][key] = severity
        else:
            self.prefs["severity_map"].pop(key, None)
        for msg in self.messages.values():
            if msg["source"] == source and msg["type"] == type_:
                msg["severity"] = self.effective_severity(source, type_, msg.get("severity_reported", msg["severity"]))
        self._changed()

    @callback
    def async_set_card(self, source: str, card: dict[str, Any] | None) -> bool:
        if card is None:
            self.prefs["cards"].pop(source, None)
        else:
            cleaned = self._clean_card(card)
            if cleaned is None:
                return False
            self.prefs["cards"][source] = cleaned
        self._changed()
        return True

    # ------------------------------------------------------------------
    # Import: Entity-Regeln und Service
    # ------------------------------------------------------------------
    def _register_import(self, rule: dict[str, Any]) -> None:
        source = IMPORT_PREFIX + rule["id"]
        texts = {lang: {"label": rule["name"], "title": "{title}", "message": "{message}"} for lang in LANGUAGES}
        self.sources[(source, self.entry.entry_id)] = {
            "source": source,
            "entry_id": self.entry.entry_id,
            "name": rule["name"],
            "version": "",
            "icon": rule.get("icon") or "mdi:import",
            "enabled": True,
            "domain": rule.get("domain"),
            "card": None,
            "imported": True,
            "types": {
                "entity": {
                    "type": "entity",
                    "severity": rule["severity"],
                    "resolvable": True,
                    "enabled": True,
                    "icon": rule.get("icon"),
                    "texts": texts,
                }
            },
            "last_seen": _now(),
        }
        self._seen.add((source, self.entry.entry_id))

    @callback
    def async_set_import(self, rule: dict[str, Any]) -> dict[str, Any]:
        rules = self.prefs["imports"]
        rule = dict(rule)
        if not rule.get("id"):
            base = slugify(rule["name"]) or "regel"
            taken = {r["id"] for r in rules}
            rule["id"], n = base, 2
            while rule["id"] in taken:
                rule["id"], n = f"{base}_{n}", n + 1
        for i, existing in enumerate(rules):
            if existing["id"] == rule["id"]:
                rules[i] = rule
                break
        else:
            rules.append(rule)
        self._register_import(rule)
        self._restart_imports()
        self._changed()
        return rule

    @callback
    def async_delete_import(self, rule_id: str) -> bool:
        rules = self.prefs["imports"]
        remaining = [r for r in rules if r["id"] != rule_id]
        if len(remaining) == len(rules):
            return False
        self.prefs["imports"] = remaining
        source = IMPORT_PREFIX + rule_id
        for identity, msg in list(self.messages.items()):
            if msg["source"] == source:
                self._close(identity, "resolved")
        self.sources.pop((source, self.entry.entry_id), None)
        self._seen.discard((source, self.entry.entry_id))
        self._restart_imports()
        self._changed()
        return True

    @callback
    def _start_imports(self, _hass: HomeAssistant | None = None) -> None:
        self._restart_imports(initial=True)

    @callback
    def _restart_imports(self, initial: bool = False) -> None:
        if self._import_unsub:
            self._import_unsub()
            self._import_unsub = None
        rules = self.prefs["imports"]
        if not rules:
            return
        entity_ids = sorted({r["entity_id"] for r in rules})
        self._import_unsub = async_track_state_change_event(self.hass, entity_ids, self._on_import_state)
        for rule in rules:
            self._eval_import(rule, initial=True)

    @callback
    def _on_import_state(self, event: Event) -> None:
        entity_id = event.data.get("entity_id")
        new_state = event.data.get("new_state")
        # Eine neu hinzugekommene Entität gilt als Startzustand (kein Push).
        initial = event.data.get("old_state") is None or new_state is None
        for rule in self.prefs["imports"]:
            if rule["entity_id"] == entity_id:
                self._eval_import(rule, initial=initial)

    @staticmethod
    def _import_active(rule: dict[str, Any], state: str) -> bool:
        if rule["mode"] == "count":
            try:
                return float(state) > 0
            except (TypeError, ValueError):
                return False
        return state in rule.get("states", [])

    def _render_template(self, text: str, fallback: str, variables: dict[str, Any]) -> str:
        if not text:
            return fallback
        try:
            return _text(Template(text, self.hass).async_render(variables, parse_result=False), MAX_PLACEHOLDER)
        except Exception:  # noqa: BLE001 - fehlerhafte Vorlage darf nichts blockieren
            _LOGGER.debug("Vorlage der Import-Regel konnte nicht gerendert werden")
            return fallback

    @callback
    def _eval_import(self, rule: dict[str, Any], initial: bool) -> None:
        state_obj = self.hass.states.get(rule["entity_id"])
        source = IMPORT_PREFIX + rule["id"]
        base = {"schema": SCHEMA, "source": source, "entry_id": self.entry.entry_id, "type": "entity", "key": rule["entity_id"]}
        active = state_obj is not None and self._import_active(rule, state_obj.state)
        if not active:
            if make_identity(source, self.entry.entry_id, "entity", rule["entity_id"]) in self.messages:
                self.process_report({**base, "state": "resolved"})
            return
        variables = {
            "state": state_obj.state,
            "name": state_obj.name,
            "entity_id": rule["entity_id"],
            "attrs": dict(state_obj.attributes),
        }
        title = self._render_template(rule.get("title", ""), rule["name"], variables)
        message = self._render_template(rule.get("message", ""), state_obj.state, variables)
        self.process_report(
            {
                **base,
                "state": "active",
                "severity": rule["severity"],
                "initial": initial,
                "subject": {"kind": "import", "name": state_obj.name},
                "placeholders": {"title": title, "message": message},
            }
        )

    # ------------------------------------------------------------------
    # Eingangs-Regeln: Ereignis oder Service -> Meldung (Zuordnung durch den Nutzer)
    # ------------------------------------------------------------------
    def _register_inbound(self, rule: dict[str, Any]) -> None:
        source = INBOUND_PREFIX + rule["id"]
        texts = {lang: {"label": rule["name"], "title": "{title}", "message": "{message}"} for lang in LANGUAGES}
        self.sources[(source, self.entry.entry_id)] = {
            "source": source,
            "entry_id": self.entry.entry_id,
            "name": rule["name"],
            "version": "",
            "icon": rule.get("icon") or "mdi:import",
            "enabled": True,
            "domain": rule.get("domain"),
            "card": None,
            "imported": True,
            "types": {
                "event": {
                    "type": "event",
                    "severity": rule["severity"],
                    "resolvable": True,
                    "enabled": True,
                    "icon": rule.get("icon"),
                    "texts": texts,
                }
            },
            "last_seen": _now(),
        }
        self._seen.add((source, self.entry.entry_id))

    @callback
    def async_set_inbound(self, rule: dict[str, Any]) -> dict[str, Any]:
        rules = self.prefs["inbound"]
        rule = dict(rule)
        if not rule.get("id"):
            base = slugify(rule["name"]) or "regel"
            taken = {r["id"] for r in rules}
            rule["id"], n = base, 2
            while rule["id"] in taken:
                rule["id"], n = f"{base}_{n}", n + 1
        for i, existing in enumerate(rules):
            if existing["id"] == rule["id"]:
                rules[i] = rule
                break
        else:
            rules.append(rule)
        self._register_inbound(rule)
        self._restart_inbound()
        self._changed()
        return rule

    @callback
    def async_delete_inbound(self, rule_id: str) -> bool:
        rules = self.prefs["inbound"]
        remaining = [r for r in rules if r["id"] != rule_id]
        if len(remaining) == len(rules):
            return False
        self.prefs["inbound"] = remaining
        self.samples.pop(rule_id, None)
        source = INBOUND_PREFIX + rule_id
        for identity, msg in list(self.messages.items()):
            if msg["source"] == source:
                self._close(identity, "resolved")
        self.sources.pop((source, self.entry.entry_id), None)
        self._seen.discard((source, self.entry.entry_id))
        self._restart_inbound()
        self._changed()
        return True

    @callback
    def _stop_inbound(self) -> None:
        for unsub in self._inbound_unsubs:
            unsub()
        self._inbound_unsubs.clear()

    @callback
    def _restart_inbound(self) -> None:
        self._stop_inbound()
        event_types = sorted({r["event_type"] for r in self.prefs["inbound"] if r.get("trigger") == "event" and r.get("event_type")})
        for event_type in event_types:
            self._inbound_unsubs.append(self.hass.bus.async_listen(event_type, self._on_inbound_event))

    @callback
    def _on_inbound_event(self, event: Event) -> None:
        data = dict(event.data) if isinstance(event.data, dict) else {}
        for rule in self.prefs["inbound"]:
            if rule.get("trigger") == "event" and rule.get("event_type") == event.event_type:
                self._handle_inbound(rule, data, event.event_type)

    @callback
    def async_inbound_service(self, rule_id: str, data: dict[str, Any]) -> bool:
        """Service ``notification_center.inbound``: Aufruf einer anderen Integration einer Regel zuordnen."""
        for rule in self.prefs["inbound"]:
            if rule["id"] == rule_id and rule.get("trigger") == "service":
                self._handle_inbound(rule, dict(data), "service")
                return True
        return False

    @staticmethod
    def _truthy(value: str) -> bool:
        return value.strip().casefold() in ("true", "1", "yes", "on", "ja")

    def _keep_sample(self, rule_id: str, data: dict[str, Any]) -> None:
        try:
            text = json.dumps(data, ensure_ascii=False, default=str, indent=2)
        except (TypeError, ValueError):
            text = str(data)
        self.samples[rule_id] = {"time": _now(), "data": text[:SAMPLE_BYTES]}

    @callback
    def _handle_inbound(self, rule: dict[str, Any], data: dict[str, Any], event_type: str) -> None:
        # Der Inhalt wird nur lokal gespeichert (Beispielanzeige in der Karte), nie ins Log geschrieben.
        self._keep_sample(rule["id"], data)
        variables = {"data": data, "event_type": event_type}
        source = INBOUND_PREFIX + rule["id"]
        key = self._render_template(rule.get("key", ""), "default", variables).strip() or "default"
        base = {"schema": SCHEMA, "source": source, "entry_id": self.entry.entry_id, "type": "event", "key": key}
        resolve = rule.get("resolve_when", "")
        if resolve and self._truthy(self._render_template(resolve, "", variables)):
            self.process_report({**base, "state": "resolved"})
            self._changed()
            return
        severity = rule["severity"]
        field = rule.get("severity_field", "")
        if field:
            value = self._render_template(field, "", variables).strip().casefold()
            mapping = {str(k).strip().casefold(): v for k, v in (rule.get("severity_map") or {}).items()}
            if mapping.get(value) in SEVERITIES:
                severity = mapping[value]
        title = self._render_template(rule.get("title", ""), rule["name"], variables)
        fallback_msg = _text(json.dumps(data, ensure_ascii=False, default=str), MAX_PLACEHOLDER)
        message = self._render_template(rule.get("message", ""), fallback_msg, variables)
        self.process_report(
            {
                **base,
                "state": "active",
                "severity": severity,
                "subject": {"kind": "inbound", "name": rule["name"]},
                "placeholders": {"title": title, "message": message},
            }
        )
        self._changed()

    @callback
    def async_service_report(self, data: dict[str, Any]) -> None:
        """Service ``notification_center.report``: beliebige Integration oder Automation meldet."""
        name = _text(data.get("source") or "Service", 60)
        slug = slugify(name) or "service"
        source = SERVICE_PREFIX + slug
        domain = data.get("domain") or slug
        icon = data.get("icon")
        severity = data.get("severity") if data.get("severity") in SEVERITIES else "info"
        key = _text(data.get("key") or "default", 120)
        entry_id = self.entry.entry_id
        texts = {lang: {"label": name, "title": "{title}", "message": "{message}"} for lang in LANGUAGES}
        self.sources[(source, entry_id)] = {
            "source": source,
            "entry_id": entry_id,
            "name": name,
            "version": "",
            "icon": icon if isinstance(icon, str) and ICON_RE.match(icon) else "mdi:bell-outline",
            "enabled": True,
            "domain": domain if isinstance(domain, str) and DOMAIN_RE.match(domain) else None,
            "card": None,
            "imported": True,
            "types": {
                "report": {
                    "type": "report",
                    "severity": severity,
                    "resolvable": True,
                    "enabled": True,
                    "icon": None,
                    "texts": texts,
                }
            },
            "last_seen": _now(),
        }
        self._seen.add((source, entry_id))
        self.process_report(
            {
                "schema": SCHEMA,
                "source": source,
                "entry_id": entry_id,
                "type": "report",
                "key": key,
                "state": data.get("state", "active"),
                "severity": severity,
                "subject": {"kind": "service", "name": name},
                "placeholders": {
                    "title": _text(data.get("title") or name, MAX_PLACEHOLDER),
                    "message": _text(data.get("message"), MAX_PLACEHOLDER),
                },
            }
        )

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
            "prefs": self.prefs,
            "samples": self.samples,
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
            "source_icon": source.get("icon"),
            "source_domain": source.get("domain") or msg["source"],
            "has_card": self.card_for(msg["source"], source) is not None,
            "created_at": msg["created"],
            "resolvable": bool(catalog.get("resolvable", False)),
        }
        if subject.get("name"):
            item["subject_name"] = subject["name"]
        if msg.get("closed"):
            item["closed_at"] = msg["closed"]
            item["status"] = msg.get("status")
        return item

    def card_for(self, source_id: str, src: dict[str, Any] | None = None) -> dict[str, Any] | None:
        """Karte für das Popup: Wahl des Nutzers vor der Angabe der Quelle."""
        user = self.prefs["cards"].get(source_id)
        if user:
            return user
        return (src or {}).get("card")

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
                    "domain": src.get("domain") or source,
                    "imported": bool(src.get("imported")),
                    "card": self.card_for(source, src),
                    "card_yaml": self.card_to_yaml(self.card_for(source, src)),
                    "card_custom": source in self.prefs["cards"],
                    "types": [
                        {
                            "type": t["type"],
                            "severity": self.effective_severity(source, t["type"], t["severity"]),
                            "default_severity": t["severity"],
                            "overridden": f"{source}|{t['type']}" in self.prefs["severity_map"],
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
                "imports": list(self.prefs["imports"]),
                "inbound": [
                    {**r, "sample": self.samples.get(r["id"], {})} for r in self.prefs["inbound"]
                ],
                "delivery": {s: self.delivery_for(s) for s in SEVERITIES},
            },
            "app": {
                "version": VERSION,
                "card_version": CARD_VERSION,
                **{k: v for k, v in self.update_info.items() if k != "installed"},
            },
            "log": list(self.log),
        }
