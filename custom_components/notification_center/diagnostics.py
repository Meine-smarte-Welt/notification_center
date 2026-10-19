# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): 7276449bddd7c47022b7c93cd2079158f27a21b6d53ad882522025af8150f220
"""Anonymisierter Diagnose-Download.

Enthält nur Zähler, Versionen und Schalterstände - keine Meldungstexte, Namen,
Rufnummern, Schlüssel oder Ziele der Empfänger-Profile.
"""
from __future__ import annotations

from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import CARD_VERSION, SEVERITIES, VERSION


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant, entry: ConfigEntry
) -> dict[str, Any]:
    hub = entry.runtime_data
    counts = {s: 0 for s in SEVERITIES}
    for msg in hub.messages.values():
        counts[msg["severity"]] = counts.get(msg["severity"], 0) + 1
    return {
        "version": VERSION,
        "card_version": CARD_VERSION,
        "open_messages": counts,
        "history_entries": len(hub.history),
        "acknowledged_active": len(hub.acked),
        "sources": [
            {
                "source": src["source"],
                "version": src["version"],
                "enabled": src["enabled"],
                "types": {
                    t["type"]: {"severity": t["severity"], "enabled": t["enabled"], "resolvable": t["resolvable"]}
                    for t in src["types"].values()
                },
            }
            for src in hub.sources.values()
        ],
        "settings": {
            "silent_mode": hub.silent,
            "critical_bypass": hub.critical_bypass,
            "profiles": len(hub.options.get("recipients", [])),
            "delivery_counts": {s: len(hub.delivery_for(s)) for s in SEVERITIES},
        },
        "events_since_start": {
            kind: sum(1 for e in hub.log if e["kind"] == kind)
            for kind in sorted({e["kind"] for e in hub.log})
        },
        "update_check": {
            k: v for k, v in hub.update_info.items() if k in ("latest_version", "update_available", "check_failed")
        },
    }
