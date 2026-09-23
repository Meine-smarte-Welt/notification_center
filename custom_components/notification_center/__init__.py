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

try:
    from homeassistant.components.lovelace.const import LOVELACE_DATA
except ImportError:  # pragma: no cover - sehr alte/neue HA-Versionen
    LOVELACE_DATA = "lovelace"

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
    try:
        await hass.http.async_register_static_paths(
            [
                StaticPathConfig(
                    CARD_URL_PATH, str(www_dir / CARD_FILENAME), cache_headers=False
                )
            ]
        )
    except RuntimeError:
        # Pfad ist bereits registriert (Integration ohne HA-Neustart neu geladen).
        _LOGGER.debug("Statischer Pfad %s bereits registriert", CARD_URL_PATH)

    # Die Karte wird als persistierter Lovelace-Ressourceneintrag registriert
    # (sichtbar unter Einstellungen > Dashboards > Ressourcen) - genau wie bei
    # FRITZ!Box Anrufe. Bewusst NICHT zusätzlich per add_extra_js_url: ein
    # Modul-URL wird vom Browser höchstens einmal ausgeführt; schlägt der
    # Ladeversuch über index.html fehl (z. B. Companion-App/Cache), gilt die
    # URL als "erledigt" und der Ressourcen-Loader kann sie nie nachladen.
    await _async_ensure_lovelace_resource(hass)

    domain_data["card_registered"] = True


async def _async_ensure_lovelace_resource(hass: HomeAssistant) -> None:
    """Karte als Lovelace-Ressource (Typ "module") anlegen bzw. aktualisieren.

    Die URL trägt ``?v=<Version>``, damit Browser nach einem Update nicht die
    alte Datei aus dem Cache laden. Ein vorhandener Eintrag wird anhand der
    URL ohne Query-String gefunden und an Ort und Stelle aktualisiert - es
    entstehen keine Duplikate. Im YAML-Modus (Ressourcen schreibgeschützt)
    oder ohne Lovelace passiert nichts; die Ressource muss dann von Hand
    eingetragen werden. Wirft nie eine Exception.
    """
    lovelace_data = hass.data.get(LOVELACE_DATA)
    if lovelace_data is None:
        _LOGGER.warning(
            "Lovelace nicht gefunden - bitte %s manuell als Ressource (Typ "
            "'module') unter Einstellungen > Dashboards > Ressourcen eintragen.",
            CARD_URL_PATH,
        )
        return

    resources = getattr(lovelace_data, "resources", None)
    if resources is None or not hasattr(resources, "async_create_item"):
        _LOGGER.info(
            "Lovelace läuft im YAML-Modus - bitte %s manuell als Ressource "
            "(Typ 'module') in der configuration.yaml eintragen.",
            CARD_URL_PATH,
        )
        return

    try:
        if not getattr(resources, "loaded", True):
            await resources.async_load()

        target_url = f"{CARD_URL_PATH}?v={CARD_VERSION}"
        existing = next(
            (
                item
                for item in resources.async_items()
                if item.get("url", "").split("?", 1)[0] == CARD_URL_PATH
            ),
            None,
        )

        if existing is None:
            await resources.async_create_item({"res_type": "module", "url": target_url})
            _LOGGER.debug("Lovelace-Ressource %s angelegt.", target_url)
        elif existing.get("url") != target_url:
            await resources.async_update_item(
                existing["id"], {"res_type": "module", "url": target_url}
            )
            _LOGGER.debug("Lovelace-Ressource auf %s aktualisiert.", target_url)
    except Exception as ex:  # noqa: BLE001 - best effort, darf das Setup nicht stören
        _LOGGER.warning(
            "Konnte %s nicht automatisch als Lovelace-Ressource eintragen (%s) - "
            "bitte manuell unter Einstellungen > Dashboards > Ressourcen "
            "hinzufügen (Typ 'module').",
            CARD_URL_PATH,
            ex,
        )
