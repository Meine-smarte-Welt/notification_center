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
from .const import URGENCIES, URGENCY_NORMAL

_LOGGER = logging.getLogger(__name__)

WS_CREATE_BLUEPRINT = "notification_center/create_blueprint"
WS_BUILD_SCRIPT = "notification_center/build_script"


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


def async_register_websocket(hass: HomeAssistant) -> None:
    """Befehle registrieren (einmalig)."""
    websocket_api.async_register_command(hass, ws_create_blueprint)
    websocket_api.async_register_command(hass, ws_build_script)
