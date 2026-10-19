# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): 564caf64ac329d4bab278cfbfb35b963a0f12cde8ea73c5ee1391bcfa97644f8
"""Generatoren für Scripts und Blueprints (reine Logik, ohne HA-Abhängigkeit).

Die Karte baut aus ein paar Eingaben eine fertige Konfiguration:

- ``build_script``      -> Eintrag für ``scripts.yaml`` (Aufruf von
                           ``notification_center.send``), dauerhaft in anderen
                           Automationen nutzbar.
- ``build_blueprint``   -> Blueprint-Dictionary (Script- oder Automations-
                           Blueprint), das als YAML unter
                           ``blueprints/<domain>/notification_center/`` landet.

Alles hier ist bewusst frei von Home-Assistant-Importen, damit es sich ohne
laufende Instanz testen lässt.
"""
from __future__ import annotations

import json
from typing import Any

from .const import URGENCIES, URGENCY_NORMAL

BLUEPRINT_SUBFOLDER = "notification_center"

KIND_SCRIPT = "script"
KIND_AUTOMATION = "automation"
BLUEPRINT_KINDS = [KIND_SCRIPT, KIND_AUTOMATION]

_URGENCY_LABELS = {
    "normal": "Normal",
    "high": "Hoch",
    "critical": "Dringend (umgeht Lautlos-Modus)",
}


def _clean(value: Any) -> str:
    return str(value or "").strip()


def _urgency(value: Any) -> str:
    return value if value in URGENCIES else URGENCY_NORMAL


def build_script(
    *,
    name: str,
    recipient: str,
    message: str,
    title: str = "",
    urgency: str = URGENCY_NORMAL,
    message_at_call: bool = False,
) -> dict[str, Any]:
    """Script-Konfiguration für ``scripts.yaml`` erzeugen.

    ``message_at_call=True``: Die Nachricht wird beim Aufruf als Feld
    ``message`` übergeben (``message`` aus dem Formular dient als Vorgabe).
    """
    name = _clean(name)
    recipient = _clean(recipient)
    message = _clean(message)
    title = _clean(title)
    if not name or not recipient:
        raise ValueError("name und recipient sind Pflicht")
    if not message and not message_at_call:
        raise ValueError("message ist Pflicht")

    data: dict[str, Any] = {"recipient": recipient, "urgency": _urgency(urgency)}
    if title:
        data["title"] = title

    config: dict[str, Any] = {
        "alias": name,
        "description": "Erstellt mit dem Notification Center.",
        "mode": "queued",
        "sequence": [],
    }

    if message_at_call:
        # Vorgabe-Text nur als Rückfall, falls das Feld nicht übergeben wird.
        # json.dumps liefert ein gültiges Jinja-Stringliteral in doppelten
        # Anführungszeichen (escaped \\, ", Zeilenumbrüche); Apostrophe im Text
        # sind darin unkritisch.
        template = "{{ message | default(" + json.dumps(message, ensure_ascii=False) + ", true) }}"
        data["message"] = template
        config["fields"] = {
            "message": {
                "name": "Nachricht",
                "description": "Text, der gesendet wird.",
                "required": not bool(message),
                "selector": {"text": {"multiline": True}},
            }
        }
    else:
        data["message"] = message

    config["sequence"].append({"action": "notification_center.send", "data": data})
    return config


def _send_action(inputs: dict[str, str]) -> dict[str, Any]:
    return {
        "action": "notification_center.send",
        "data": {
            "recipient": inputs["recipient"],
            "title": inputs["title"],
            "message": inputs["message"],
            "urgency": inputs["urgency"],
        },
    }


def build_blueprint(
    *,
    kind: str,
    name: str,
    description: str = "",
    recipient: str = "",
    urgency: str = URGENCY_NORMAL,
    title: str = "",
    message: str = "",
) -> dict[str, Any]:
    """Blueprint-Dictionary erzeugen.

    Die Formularwerte werden zu *Vorgabewerten* der Blueprint-Eingaben; wer
    den Blueprint später verwendet, kann sie pro Script bzw. Automation
    überschreiben.
    """
    if kind not in BLUEPRINT_KINDS:
        raise ValueError(f"unbekannter Blueprint-Typ: {kind}")
    name = _clean(name)
    if not name:
        raise ValueError("name ist Pflicht")

    send_inputs = {
        "recipient": "!input recipient",
        "title": "!input title",
        "message": "!input message",
        "urgency": "!input urgency",
    }

    inputs: dict[str, Any] = {}
    if kind == KIND_AUTOMATION:
        inputs["trigger_entity"] = {
            "name": "Auslösende Entität",
            "description": "Wenn sich diese Entität ändert, wird die Nachricht gesendet.",
            "selector": {"entity": {}},
        }
        inputs["to_state"] = {
            "name": "Zustand",
            "description": "Gesendet wird, wenn die Entität diesen Zustand erreicht (z. B. on, off, unavailable).",
            "default": "on",
            "selector": {"text": {}},
        }

    inputs["recipient"] = {
        "name": "Empfänger-Profil",
        "description": "Name oder ID eines Profils aus dem Notification Center.",
        "default": _clean(recipient),
        "selector": {"text": {}},
    }
    inputs["title"] = {
        "name": "Titel",
        "default": _clean(title),
        "selector": {"text": {}},
    }
    inputs["message"] = {
        "name": "Nachricht",
        "default": _clean(message),
        "selector": {"text": {"multiline": True}},
    }
    inputs["urgency"] = {
        "name": "Dringlichkeit",
        "default": _urgency(urgency),
        "selector": {
            "select": {
                "options": [
                    {"value": u, "label": _URGENCY_LABELS[u]} for u in URGENCIES
                ]
            }
        },
    }

    blueprint: dict[str, Any] = {
        "name": name,
        "description": _clean(description)
        or "Erstellt mit dem Notification Center.",
        "domain": kind,
        "input": inputs,
    }

    if kind == KIND_SCRIPT:
        return {
            "blueprint": blueprint,
            "sequence": [_send_action(send_inputs)],
        }

    return {
        "blueprint": blueprint,
        "mode": "single",
        "trigger": [
            {
                "platform": "state",
                "entity_id": "!input trigger_entity",
                "to": "!input to_state",
            }
        ],
        "action": [_send_action(send_inputs)],
    }

