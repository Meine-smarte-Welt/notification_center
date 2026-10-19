# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): b838b870cf31cc512cfc8ce362a17358986cb0cb207b3e847350e762cde854dd
"""Websocket-Befehle des Notification Center (nur für Administratoren).

``notification_center/create_blueprint`` schreibt einen aus der Karte
gebauten Blueprint nach ``<config>/blueprints/<script|automation>/
notification_center/<name>.yaml``. Dafür gibt es in Home Assistant keine
Frontend-API, deshalb übernimmt das die Integration über die offizielle
``DomainBlueprints``-Schnittstelle (dieselbe, die der Blueprint-Import nutzt).

Scripts dagegen legt die Karte direkt über die reguläre Script-Editor-API
(``config/script/config/<id>``) an - dort wird ohnehin validiert und neu
geladen.
"""
from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.components.blueprint import BLUEPRINT_SCHEMA, Blueprint
from homeassistant.components.blueprint.errors import (
    BlueprintException,
    FileAlreadyExists,
)
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.util import slugify
from homeassistant.util.yaml import Input

from .builders import (
    BLUEPRINT_KINDS,
    BLUEPRINT_SUBFOLDER,
    KIND_AUTOMATION,
    build_blueprint,
    build_script,
)
from .const import (
    CONF_CRITICAL_BYPASS,
    CONF_DELIVERY,
    CONF_RECIPIENTS,
    CONF_SILENT,
    DOMAIN,
    SEVERITIES,
    URGENCIES,
    URGENCY_NORMAL,
)

_LOGGER = logging.getLogger(__name__)

WS_CREATE_BLUEPRINT = "notification_center/create_blueprint"
WS_BUILD_SCRIPT = "notification_center/build_script"
WS_ACK = "notification_center/ack"
WS_ACK_ALL = "notification_center/ack_all"
WS_CLEAR_HISTORY = "notification_center/clear_history"
WS_SET_SETTING = "notification_center/set_setting"
WS_SET_DELIVERY = "notification_center/set_delivery"
WS_SEND_TEST = "notification_center/send_test"
WS_CHECK_UPDATE = "notification_center/check_update"

_SETTING_KEYS = {"silent_mode": CONF_SILENT, "critical_bypass": CONF_CRITICAL_BYPASS}


def _get_hub(hass: HomeAssistant):
    """Hub des geladenen Config Entries oder ``None``."""
    for entry in hass.config_entries.async_entries(DOMAIN):
        if getattr(entry, "runtime_data", None) is not None:
            return entry, entry.runtime_data
    return None, None


def _to_ha_inputs(value: Any) -> Any:
    """``"!input name"``-Platzhalter in echte ``Input``-Objekte umwandeln."""
    if isinstance(value, str) and value.startswith("!input "):
        return Input(value[len("!input ") :])
    if isinstance(value, dict):
        return {key: _to_ha_inputs(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_to_ha_inputs(item) for item in value]
    return value


def _get_domain_blueprints(hass: HomeAssistant, kind: str):
    if kind == KIND_AUTOMATION:
        from homeassistant.components.automation.helpers import async_get_blueprints
    else:
        from homeassistant.components.script.helpers import async_get_blueprints
    return async_get_blueprints(hass)


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_CREATE_BLUEPRINT,
        vol.Required("kind"): vol.In(BLUEPRINT_KINDS),
        vol.Required("name"): vol.All(str, vol.Length(min=1, max=80)),
        vol.Optional("description", default=""): str,
        vol.Optional("recipient", default=""): str,
        vol.Optional("urgency", default=URGENCY_NORMAL): vol.In(URGENCIES),
        vol.Optional("title", default=""): str,
        vol.Optional("message", default=""): str,
        vol.Optional("overwrite", default=False): bool,
    }
)
@websocket_api.async_response
async def ws_create_blueprint(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Blueprint aus den Karten-Eingaben anlegen."""
    # slugify() liefert für Namen ohne Buchstaben/Ziffern "unknown" statt eines
    # leeren Werts - deshalb vorher selbst prüfen.
    slug = slugify(msg["name"])
    if not any(ch.isalnum() for ch in msg["name"]) or not slug:
        connection.send_error(msg["id"], "invalid_name", "Der Name ergibt keinen gültigen Dateinamen.")
        return

    try:
        data = build_blueprint(
            kind=msg["kind"],
            name=msg["name"],
            description=msg["description"],
            recipient=msg["recipient"],
            urgency=msg["urgency"],
            title=msg["title"],
            message=msg["message"],
        )
        blueprint = Blueprint(
            _to_ha_inputs(data),
            expected_domain=msg["kind"],
            schema=BLUEPRINT_SCHEMA,
        )
    except (ValueError, BlueprintException) as err:
        connection.send_error(msg["id"], "invalid_blueprint", str(err))
        return

    path = f"{BLUEPRINT_SUBFOLDER}/{slug}.yaml"
    domain_blueprints = _get_domain_blueprints(hass, msg["kind"])
    try:
        overwritten = await domain_blueprints.async_add_blueprint(
            blueprint, path, allow_override=msg["overwrite"]
        )
    except FileAlreadyExists:
        connection.send_error(
            msg["id"], "file_exists", f"Der Blueprint „{slug}“ existiert bereits."
        )
        return
    except OSError as err:
        _LOGGER.warning("Blueprint %s konnte nicht geschrieben werden: %s", path, err)
        connection.send_error(msg["id"], "write_failed", str(err))
        return
    except HomeAssistantError as err:
        # Beim Überschreiben lädt Home Assistant nach dem Schreiben die
        # Scripts/Automationen neu, die den Blueprint nutzen. Scheitert nur
        # dieser Reload, ist die Datei trotzdem geschrieben.
        _LOGGER.warning("Blueprint %s geschrieben, Neuladen fehlgeschlagen: %s", path, err)
        overwritten = True

    # Cache leeren, damit der neue Blueprint sofort in der Blueprint-Liste
    # und in "Script/Automation aus Blueprint erstellen" auftaucht.
    await domain_blueprints.async_reset_cache()

    connection.send_result(
        msg["id"],
        {"path": path, "kind": msg["kind"], "overwritten": bool(overwritten)},
    )


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_BUILD_SCRIPT,
        vol.Required("name"): vol.All(str, vol.Length(min=1, max=80)),
        vol.Required("recipient"): str,
        vol.Optional("message", default=""): str,
        vol.Optional("title", default=""): str,
        vol.Optional("urgency", default=URGENCY_NORMAL): vol.In(URGENCIES),
        vol.Optional("message_at_call", default=False): bool,
    }
)
@callback
def ws_build_script(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Script-ID und -Konfiguration aus den Karten-Eingaben erzeugen.

    Geschrieben wird hier nichts: Die Karte legt das Script anschließend über
    die reguläre Script-Editor-API an (Validierung + Neuladen inklusive).
    """
    if not any(ch.isalnum() for ch in msg["name"]):
        connection.send_error(msg["id"], "invalid_name", "Der Name ergibt keine gültige Script-ID.")
        return
    script_id = slugify(msg["name"])
    try:
        config = build_script(
            name=msg["name"],
            recipient=msg["recipient"],
            message=msg["message"],
            title=msg["title"],
            urgency=msg["urgency"],
            message_at_call=msg["message_at_call"],
        )
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_script", str(err))
        return
    connection.send_result(msg["id"], {"id": script_id, "config": config})


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): WS_ACK, vol.Required("message"): str})
@callback
def ws_ack(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Eine Meldung quittieren (wandert in den Verlauf)."""
    _entry, hub = _get_hub(hass)
    if hub is None:
        connection.send_error(msg["id"], "not_loaded", "Notification Center ist nicht geladen.")
        return
    connection.send_result(msg["id"], {"acknowledged": hub.async_ack(msg["message"])})


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): WS_ACK_ALL})
@callback
def ws_ack_all(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    _entry, hub = _get_hub(hass)
    if hub is None:
        connection.send_error(msg["id"], "not_loaded", "Notification Center ist nicht geladen.")
        return
    connection.send_result(msg["id"], {"count": hub.async_ack_all()})


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): WS_CLEAR_HISTORY})
@callback
def ws_clear_history(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    _entry, hub = _get_hub(hass)
    if hub is None:
        connection.send_error(msg["id"], "not_loaded", "Notification Center ist nicht geladen.")
        return
    hub.async_clear_history()
    connection.send_result(msg["id"], {})


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_SET_SETTING,
        vol.Required("setting"): vol.In(list(_SETTING_KEYS)),
        vol.Required("enabled"): bool,
    }
)
@callback
def ws_set_setting(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Lautlos-Modus bzw. „Kritische trotzdem zustellen“ umschalten."""
    entry, hub = _get_hub(hass)
    if hub is None:
        connection.send_error(msg["id"], "not_loaded", "Notification Center ist nicht geladen.")
        return
    hass.config_entries.async_update_entry(
        entry, options={**entry.options, _SETTING_KEYS[msg["setting"]]: msg["enabled"]}
    )
    connection.send_result(msg["id"], {})


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_SET_DELIVERY,
        vol.Required("severity"): vol.In(SEVERITIES),
        vol.Required("recipients"): [str],
    }
)
@callback
def ws_set_delivery(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Push-Empfänger je Dringlichkeit festlegen."""
    entry, hub = _get_hub(hass)
    if hub is None:
        connection.send_error(msg["id"], "not_loaded", "Notification Center ist nicht geladen.")
        return
    known = {r["id"] for r in entry.options.get(CONF_RECIPIENTS, [])}
    chosen = [rid for rid in msg["recipients"] if rid in known]
    # Bisherige Auswahl aller Stufen festschreiben, damit nur die geänderte Stufe abweicht.
    delivery = {sev: hub.delivery_for(sev) for sev in SEVERITIES}
    delivery[msg["severity"]] = chosen
    hass.config_entries.async_update_entry(
        entry, options={**entry.options, CONF_DELIVERY: delivery}
    )
    connection.send_result(msg["id"], {})


@websocket_api.require_admin
@websocket_api.websocket_command(
    {vol.Required("type"): WS_SEND_TEST, vol.Optional("severity", default="info"): vol.In(SEVERITIES)}
)
@callback
def ws_send_test(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    _entry, hub = _get_hub(hass)
    if hub is None:
        connection.send_error(msg["id"], "not_loaded", "Notification Center ist nicht geladen.")
        return
    hub.async_send_test(msg["severity"])
    connection.send_result(msg["id"], {})


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): WS_CHECK_UPDATE})
@websocket_api.async_response
async def ws_check_update(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Jetzt auf GitHub nach einer neuen Version suchen."""
    _entry, hub = _get_hub(hass)
    if hub is None:
        connection.send_error(msg["id"], "not_loaded", "Notification Center ist nicht geladen.")
        return
    connection.send_result(msg["id"], await hub.async_check_update())


def async_register_websocket(hass: HomeAssistant) -> None:
    """Befehle registrieren (einmalig)."""
    for command in (
        ws_create_blueprint,
        ws_build_script,
        ws_ack,
        ws_ack_all,
        ws_clear_history,
        ws_set_setting,
        ws_set_delivery,
        ws_send_test,
        ws_check_update,
    ):
        websocket_api.async_register_command(hass, command)
