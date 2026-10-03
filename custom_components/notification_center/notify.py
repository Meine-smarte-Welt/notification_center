"""Nachrichten-Payloads für den Schnellversand (reine Logik, ohne HA-Abhängigkeit).

Bewusst als eigenes Modul ausgelagert, damit sich der Aufbau der Payloads
ohne laufende Home-Assistant-Instanz testen lässt.

Dringlichkeit bei Smartphone-Empfängern (Companion App):

- ``normal``   - ganz normale Benachrichtigung.
- ``high``     - sofortige Zustellung (Android: ``priority: high``, ``ttl: 0``;
                 iOS: ``time-sensitive``, durchbricht Fokus-Modi).
- ``critical`` - umgeht den Lautlos-Modus (Android: Alarm-Kanal
                 ``alarm_stream``; iOS: Critical Alert). Für iOS muss in der
                 Companion App der Zugriff auf kritische Hinweise erlaubt sein.

Bei E-Mail-Empfängern gibt es kein Äquivalent - die Dringlichkeit wird dort
als Präfix in den Betreff geschrieben.
"""
from __future__ import annotations

from typing import Any

from .const import (
    RECIPIENT_EMAIL,
    URGENCY_CRITICAL,
    URGENCY_HIGH,
)

DEFAULT_EMAIL_SUBJECT = "Notification Center"

_EMAIL_PREFIX = {
    URGENCY_HIGH: "Wichtig: ",
    URGENCY_CRITICAL: "DRINGEND: ",
}


def normalize_target(target: str | None) -> str:
    """``notify.mobile_app_pixel`` und ``mobile_app_pixel`` gleich behandeln."""
    value = (target or "").strip()
    if value.startswith("notify."):
        value = value[len("notify.") :]
    return value


def build_payload(
    recipient_type: str,
    title: str | None,
    message: str,
    urgency: str,
) -> dict[str, Any]:
    """Service-Daten für ``notify.<ziel>`` aufbauen."""
    if recipient_type == RECIPIENT_EMAIL:
        subject = (title or "").strip() or DEFAULT_EMAIL_SUBJECT
        return {
            "title": f"{_EMAIL_PREFIX.get(urgency, '')}{subject}",
            "message": message,
        }

    payload: dict[str, Any] = {"message": message}
    if title and title.strip():
        payload["title"] = title.strip()

    data: dict[str, Any] = {}
    if urgency in (URGENCY_HIGH, URGENCY_CRITICAL):
        data.update({"ttl": 0, "priority": "high", "importance": "high"})
        data["push"] = {"interruption-level": "time-sensitive"}
    if urgency == URGENCY_CRITICAL:
        data["channel"] = "alarm_stream"
        data["push"] = {
            "interruption-level": "critical",
            "sound": {"name": "default", "critical": 1, "volume": 1.0},
        }
    if data:
        payload["data"] = data
    return payload
