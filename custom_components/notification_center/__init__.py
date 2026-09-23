"""Die Benachrichtigungszentrale-Integration.

Bündelt drei zusammenfassende Sensoren (Benachrichtigungen, Updates,
Reparaturen) und liefert die passende Dashboard-Karte gleich mit aus -
analog zu den Schwester-Integrationen FRITZ!Box Anrufe und FRITZ!Box
Netzwerk. Eine separate Installation der Karte über HACS oder eine manuell
eingetragene Lovelace-Ressource ist nicht nötig.
"""
from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import CARD_FILENAME, CARD_URL_PATH, CARD_VERSION, DOMAIN

_LOGGER = logging.getLogger(__name__)

PLATFORMS = ["sensor"]


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up der Integration aus einem Config Entry."""
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {}

    await _async_register_card(hass)

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Config Entry wieder entladen."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        hass.data[DOMAIN].pop(entry.entry_id, None)
    return unload_ok


async def _async_register_card(hass: HomeAssistant) -> None:
    """Karte einmalig als statischen Pfad + Lovelace-Ressource registrieren."""
    domain_data = hass.data.setdefault(DOMAIN, {})
    if domain_data.get("card_registered"):
        return

    www_dir = Path(__file__).parent / "www"
    await hass.http.async_register_static_paths(
        [
            StaticPathConfig(
                CARD_URL_PATH, str(www_dir / CARD_FILENAME), cache_headers=False
            )
        ]
    )

    # add_extra_js_url trägt das Modul beim Frontend-Start ein, ohne dass die
    # Ressource manuell unter Einstellungen > Dashboards > Ressourcen
    # angelegt werden muss. Die Versionsnummer im Query-String sorgt dafür,
    # dass Browser nach einem Update der Karte nicht die alte Datei aus dem
    # Cache laden.
    try:
        from homeassistant.components.frontend import add_extra_js_url

        add_extra_js_url(hass, f"{CARD_URL_PATH}?v={CARD_VERSION}")
    except ImportError:
        _LOGGER.warning(
            "add_extra_js_url nicht verfügbar - Karte bitte manuell als "
            "Lovelace-Ressource unter %s eintragen.",
            CARD_URL_PATH,
        )

    domain_data["card_registered"] = True
