"""Sensor-Plattform der Benachrichtigungszentrale.

Legt drei Sensoren an. Jeder Sensor zählt seine Kategorie als Zustand und
trägt die Einzeleinträge im Attribut ``items``. Zusätzlich gibt es ein
Attribut ``summary`` - ein einzeiliger, bereits fertig formulierter Text.
Der ist bewusst so kurz gehalten, dass er sich direkt in ein Android-
Template-Widget einsetzen lässt, ohne dass dort erst durch ``items``
iteriert werden müsste, z. B.:

    {{ state_attr('sensor.benachrichtigungszentrale_updates', 'summary') }}

Technischer Hinweis zu den Datenquellen:
- Update-Entities (``update.*``) und Repair-Issues (Issue Registry) sind
  offiziell unterstützte, öffentliche Home-Assistant-APIs.
- Persistent Notifications sind dagegen NICHT Teil der normalen
  State-Machine. Es gibt keine offizielle Python-API, um sie von aussen
  auszulesen - nur den WebSocket-Befehl ``persistent_notification/get``,
  den auch das Frontend benutzt. Diese Integration greift daher defensiv
  (mit try/except) auf die interne Ablage von
  ``homeassistant.components.persistent_notification`` zu. Das kann sich
  mit künftigen Home-Assistant-Versionen ändern - im Zweifel taucht die
  Kategorie „Benachrichtigungen" dann einfach leer auf, es gibt keinen Fehler.
"""
from __future__ import annotations

import logging

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EVENT_STATE_CHANGED
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers import issue_registry as ir
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN, SENSOR_NOTIFICATIONS, SENSOR_REPAIRS, SENSOR_UPDATES

_LOGGER = logging.getLogger(__name__)

# Signal, das persistent_notification bei jeder Änderung selbst aussendet.
PERSISTENT_NOTIFICATION_SIGNAL = "persistent_notifications_updated"

# Event, das die Issue Registry (Repairs) bei jeder Änderung aussendet.
REPAIRS_REGISTRY_EVENT = "repairs_issue_registry_updated"


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    """Die drei Sensoren anlegen."""
    async_add_entities(
        [
            NotificationsSensor(entry),
            UpdatesSensor(entry),
            RepairsSensor(entry),
        ]
    )


class _BaseSummarySensor(SensorEntity):
    """Gemeinsame Basis der drei Kategorie-Sensoren."""

    _attr_has_entity_name = True
    _attr_native_unit_of_measurement = "Einträge"
    _attr_should_poll = False

    def __init__(self, entry: ConfigEntry, key: str, name: str, icon: str) -> None:
        self._entry = entry
        self._attr_unique_id = f"{entry.entry_id}_{key}"
        self._attr_name = name
        self._attr_icon = icon
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name="Notification Center",
            manufacturer="Meine smarte Welt",
            model="Notification Center",
        )
        self._items: list[dict] = []

    @property
    def native_value(self) -> int:
        return len(self._items)

    @property
    def extra_state_attributes(self) -> dict:
        return {
            "items": self._items,
            "summary": self._build_summary(),
        }

    def _build_summary(self) -> str:
        if not self._items:
            return "Keine offenen Einträge"
        first_title = self._items[0].get("title", "")
        if len(self._items) == 1:
            return first_title
        return f"{first_title} (+{len(self._items) - 1} weitere)"


class NotificationsSensor(_BaseSummarySensor):
    """Aktive persistent_notifications."""

    def __init__(self, entry: ConfigEntry) -> None:
        super().__init__(
            entry, SENSOR_NOTIFICATIONS, "Benachrichtigungen", "mdi:bell-outline"
        )

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(
            async_dispatcher_connect(
                self.hass,
                PERSISTENT_NOTIFICATION_SIGNAL,
                self._async_signal_received,
            )
        )
        self._async_refresh()

    @callback
    def _async_signal_received(self, *_args) -> None:
        self._async_refresh()
        self.async_write_ha_state()

    @callback
    def _async_refresh(self) -> None:
        notifications: dict = {}
        try:
            # bewusst defensiv - siehe Hinweis im Modul-Docstring
            from homeassistant.components.persistent_notification import (
                _async_get_or_create_notifications,
            )

            notifications = _async_get_or_create_notifications(self.hass)
        except Exception:  # noqa: BLE001
            _LOGGER.debug(
                "persistent_notification-Speicher nicht lesbar (evtl. HA-Version)",
                exc_info=True,
            )

        self._items = [
            {
                "id": notification_id,
                "title": data.get("title") or "Benachrichtigung",
                "message": data.get("message", ""),
                "created_at": data.get("created_at"),
            }
            for notification_id, data in notifications.items()
        ]


class UpdatesSensor(_BaseSummarySensor):
    """Alle update.*-Entities mit verfügbarem Update."""

    def __init__(self, entry: ConfigEntry) -> None:
        super().__init__(entry, SENSOR_UPDATES, "Updates", "mdi:package-up")

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(
            self.hass.bus.async_listen(EVENT_STATE_CHANGED, self._async_state_changed)
        )
        self._async_refresh()

    @callback
    def _async_state_changed(self, event: Event) -> None:
        entity_id = event.data.get("entity_id", "")
        if not entity_id.startswith("update."):
            return
        self._async_refresh()
        self.async_write_ha_state()

    @callback
    def _async_refresh(self) -> None:
        items = []
        for state in self.hass.states.async_all("update"):
            if state.state != "on":
                continue
            latest = state.attributes.get("latest_version")
            if state.attributes.get("skipped_version") == latest:
                continue
            items.append(
                {
                    "entity_id": state.entity_id,
                    "title": state.attributes.get("friendly_name", state.entity_id),
                    "installed_version": state.attributes.get("installed_version"),
                    "latest_version": latest,
                    "in_progress": bool(state.attributes.get("in_progress")),
                    "release_url": state.attributes.get("release_url"),
                    "message": _format_update_message(state),
                }
            )
        self._items = items


def _format_update_message(state) -> str:
    installed = state.attributes.get("installed_version")
    latest = state.attributes.get("latest_version")
    if installed and latest:
        return f"{installed} → {latest}"
    return "Update verfügbar"


class RepairsSensor(_BaseSummarySensor):
    """Aktive, nicht ignorierte Repair-Issues aus der Issue Registry."""

    def __init__(self, entry: ConfigEntry) -> None:
        super().__init__(entry, SENSOR_REPAIRS, "Reparaturen", "mdi:wrench-outline")

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(
            self.hass.bus.async_listen(REPAIRS_REGISTRY_EVENT, self._async_event)
        )
        self._async_refresh()

    @callback
    def _async_event(self, _event: Event) -> None:
        self._async_refresh()
        self.async_write_ha_state()

    @callback
    def _async_refresh(self) -> None:
        registry = ir.async_get(self.hass)
        items = []
        for issue in registry.issues.values():
            if getattr(issue, "dismissed_version", None):
                continue
            if not getattr(issue, "active", True):
                continue
            severity = getattr(issue, "severity", None)
            items.append(
                {
                    "issue_id": issue.issue_id,
                    "domain": issue.domain,
                    "title": issue.translation_key or issue.issue_id,
                    "message": f"Domain: {issue.domain}",
                    "severity": severity.value if severity else None,
                    "is_fixable": bool(issue.is_fixable),
                    "learn_more_url": issue.learn_more_url,
                }
            )
        self._items = items
