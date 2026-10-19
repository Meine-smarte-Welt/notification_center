# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): 82bcb408f52c81527a8fe3ce5237061e42a2cf395a5fc81bbf20b8f845895e59
"""Prüft auf GitHub, ob es eine neuere Version gibt (alle 12 Stunden).

Fragt ``releases/latest`` ab, ersatzweise das höchste Versions-Tag. Ist die
installierte Version eine Beta oder ein Release Candidate (``b``/``rc``),
wird zusätzlich ``releases?per_page=5`` geprüft, weil ``latest`` keine
Pre-releases liefert. Schlägt die Abfrage fehl, läuft alles normal weiter.
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import GITHUB_OWNER, GITHUB_REPO, RELEASES_URL, VERSION

_LOGGER = logging.getLogger(__name__)

_API = f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}"
_VERSION_RE = re.compile(r"^v?(\d+)\.(\d+)\.(\d+)(?:(a|b|rc)(\d+))?$")
_STAGE = {"a": 0, "b": 1, "rc": 2, None: 3}


def parse_version(value: str | None) -> tuple | None:
    """``1.0.0b2`` -> sortierbarer Tupel (Release > rc > b > a)."""
    match = _VERSION_RE.match((value or "").strip())
    if not match:
        return None
    major, minor, patch, stage, num = match.groups()
    return (int(major), int(minor), int(patch), _STAGE[stage], int(num or 0))


def is_prerelease(value: str | None) -> bool:
    parsed = parse_version(value)
    return bool(parsed and parsed[3] < 3)


def safe_release_url(url: str | None) -> str:
    """Nur GitHub-Links anzeigen, sonst die feste Releases-Seite."""
    if isinstance(url, str) and url.startswith("https://github.com/"):
        return url
    return RELEASES_URL


def pick_latest(releases: list[dict[str, Any]], include_pre: bool) -> dict[str, Any] | None:
    """Höchste gültige Version aus einer Release-/Tag-Liste wählen."""
    best: tuple[tuple, dict[str, Any]] | None = None
    for item in releases:
        if item.get("draft"):
            continue
        name = item.get("tag_name") or item.get("name")
        parsed = parse_version(name)
        if parsed is None:
            continue
        if parsed[3] < 3 and not include_pre:
            continue
        if best is None or parsed > best[0]:
            best = (parsed, item)
    return best[1] if best else None


def build_result(current: str, latest_item: dict[str, Any] | None, failed: bool) -> dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    if failed or latest_item is None:
        return {
            "installed": current,
            "latest_version": None,
            "release_url": RELEASES_URL,
            "update_available": False,
            "checked_at": now,
            "check_failed": failed,
        }
    tag = (latest_item.get("tag_name") or latest_item.get("name") or "").lstrip("v")
    newer = (parse_version(tag) or (0,)) > (parse_version(current) or (0,))
    return {
        "installed": current,
        "latest_version": tag,
        "release_url": safe_release_url(latest_item.get("html_url")),
        "update_available": newer,
        "checked_at": now,
        "check_failed": False,
    }


async def async_check_update(hass: HomeAssistant) -> dict[str, Any]:
    """GitHub abfragen. Wirft nie eine Exception."""
    session = async_get_clientsession(hass)
    headers = {"Accept": "application/vnd.github+json"}
    include_pre = is_prerelease(VERSION)
    try:
        candidates: list[dict[str, Any]] = []
        async with session.get(f"{_API}/releases/latest", headers=headers, timeout=15) as resp:
            if resp.status == 200:
                candidates.append(await resp.json())
        if include_pre or not candidates:
            async with session.get(f"{_API}/releases?per_page=5", headers=headers, timeout=15) as resp:
                if resp.status == 200:
                    candidates.extend(await resp.json())
        if not candidates:
            async with session.get(f"{_API}/tags?per_page=20", headers=headers, timeout=15) as resp:
                if resp.status == 200:
                    candidates.extend(
                        {"tag_name": t.get("name"), "html_url": f"{RELEASES_URL}/tag/{t.get('name')}"}
                        for t in await resp.json()
                    )
        return build_result(VERSION, pick_latest(candidates, include_pre), failed=False)
    except Exception:  # noqa: BLE001 - Prüfung ist Nebensache
        _LOGGER.debug("Update-Prüfung nicht möglich", exc_info=True)
        return build_result(VERSION, None, failed=True)


_INFO = {
    "de": ("Neue Version {v} verfügbar. Aktualisiere über HACS und starte Home Assistant neu.", "Aktuell, neueste Version ist {v}.", "Prüfung nicht möglich.", "Noch nicht geprüft."),
    "en": ("New version {v} available. Update via HACS and restart Home Assistant.", "Up to date, latest version is {v}.", "Check not possible.", "Not checked yet."),
    "nl": ("Nieuwe versie {v} beschikbaar. Update via HACS en herstart Home Assistant.", "Up-to-date, nieuwste versie is {v}.", "Controle niet mogelijk.", "Nog niet gecontroleerd."),
    "fr": ("Nouvelle version {v} disponible. Mets à jour via HACS et redémarre Home Assistant.", "À jour, la dernière version est {v}.", "Vérification impossible.", "Pas encore vérifié."),
    "es": ("Nueva versión {v} disponible. Actualiza con HACS y reinicia Home Assistant.", "Actualizado, la última versión es {v}.", "Comprobación no posible.", "Aún sin comprobar."),
}


def describe(info: dict[str, Any], lang: str) -> str:
    """Kurztext für den Optionen-Dialog (``{update_info}``)."""
    available, current, failed, unknown = _INFO.get(lang, _INFO["en"])
    if info.get("check_failed"):
        return failed
    latest = info.get("latest_version")
    if not latest:
        return unknown
    return (available if info.get("update_available") else current).format(v=latest)
