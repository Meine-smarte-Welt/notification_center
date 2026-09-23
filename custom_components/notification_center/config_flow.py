"""Config Flow für die Benachrichtigungszentrale.

Es gibt keine Zugangsdaten zu erfassen - die Integration liest ausschliesslich
Daten, die bereits in dieser Home-Assistant-Instanz vorhanden sind
(persistent_notification, update.*-Entities, Repairs). Der Flow fragt daher
nur einmal nach Bestätigung und lässt genau eine Instanz zu.
"""
from __future__ import annotations

from homeassistant import config_entries
from homeassistant.data_entry_flow import FlowResult

from .const import DOMAIN


class NotificationCenterConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Config Flow für notification_center."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict | None = None
    ) -> FlowResult:
        """Einzelner Bestätigungsschritt."""
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")

        if user_input is not None:
            return self.async_create_entry(
                title="Notification Center", data={}
            )

        return self.async_show_form(step_id="user")
