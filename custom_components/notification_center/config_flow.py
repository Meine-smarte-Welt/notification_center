"""Config Flow für das Notification Center.

Es gibt keine Zugangsdaten zu erfassen - die Integration liest ausschliesslich
Daten, die bereits in dieser Home-Assistant-Instanz vorhanden sind
(persistent_notification, update.*-Entities, Repairs). Der Flow fragt daher
nur einmal nach Bestätigung und lässt genau eine Instanz zu.

Seit 0.0.7 gibt es zusätzlich einen Options-Flow für die Empfänger-Profile
(Einstellungen > Geräte & Dienste > Notification Center > Konfigurieren).
Ein Profil bündelt Name, Art (Smartphone/E-Mail) und das ``notify``-Ziel.
Automationen und die Karte sprechen nur den Profilnamen an - wechselt das
Smartphone, wird das Ziel an genau einer Stelle geändert.
"""
from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers.selector import (
    SelectOptionDict,
    SelectSelector,
    SelectSelectorConfig,
    SelectSelectorMode,
)
from homeassistant.util import slugify

from .const import CONF_RECIPIENTS, DOMAIN, RECIPIENT_PUSH, RECIPIENT_TYPES
from .notify import normalize_target

# Dienste der notify-Domain, die kein Empfänger-Ziel sind.
_NOTIFY_NON_TARGETS = {"send_message", "persistent_notification"}


class NotificationCenterConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Config Flow für notification_center."""

    VERSION = 1

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> config_entries.OptionsFlow:
        """Options-Flow (Empfänger-Profile) bereitstellen."""
        return NotificationCenterOptionsFlow()

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


class NotificationCenterOptionsFlow(config_entries.OptionsFlow):
    """Empfänger-Profile anlegen, ändern und entfernen."""

    def __init__(self) -> None:
        self._edit_id: str | None = None

    # -- Hilfsfunktionen -------------------------------------------------

    @property
    def _recipients(self) -> list[dict[str, Any]]:
        return [dict(r) for r in self.config_entry.options.get(CONF_RECIPIENTS, [])]

    def _save(self, recipients: list[dict[str, Any]]) -> FlowResult:
        return self.async_create_entry(
            title="",
            data={**self.config_entry.options, CONF_RECIPIENTS: recipients},
        )

    def _notify_targets(self) -> list[str]:
        services = self.hass.services.async_services_for_domain("notify")
        return sorted(set(services) - _NOTIFY_NON_TARGETS)

    def _profile_schema(self, defaults: dict[str, Any]) -> vol.Schema:
        return vol.Schema(
            {
                vol.Required("name", default=defaults.get("name", "")): str,
                vol.Required(
                    "type", default=defaults.get("type", RECIPIENT_PUSH)
                ): SelectSelector(
                    SelectSelectorConfig(
                        options=RECIPIENT_TYPES,
                        translation_key="recipient_type",
                        mode=SelectSelectorMode.LIST,
                    )
                ),
                vol.Required(
                    "target", default=defaults.get("target", "")
                ): SelectSelector(
                    SelectSelectorConfig(
                        options=self._notify_targets(),
                        custom_value=True,
                        mode=SelectSelectorMode.DROPDOWN,
                    )
                ),
            }
        )

    def _validate(
        self, user_input: dict[str, Any], own_id: str | None
    ) -> dict[str, str]:
        errors: dict[str, str] = {}
        name = user_input["name"].strip()
        if not name:
            errors["name"] = "name_required"
        elif any(
            r["name"].casefold() == name.casefold() and r["id"] != own_id
            for r in self._recipients
        ):
            errors["name"] = "name_exists"
        if not normalize_target(user_input["target"]):
            errors["target"] = "target_required"
        return errors

    def _unique_id(self, name: str) -> str:
        base = slugify(name) or "profil"
        taken = {r["id"] for r in self._recipients}
        candidate, n = base, 2
        while candidate in taken:
            candidate = f"{base}_{n}"
            n += 1
        return candidate

    def _recipient_options(self) -> list[SelectOptionDict]:
        return [
            SelectOptionDict(value=r["id"], label=r["name"]) for r in self._recipients
        ]

    # -- Schritte --------------------------------------------------------

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Hauptmenü."""
        menu = ["add_recipient"]
        if self._recipients:
            menu += ["edit_recipient", "remove_recipient"]
        return self.async_show_menu(step_id="init", menu_options=menu)

    async def async_step_add_recipient(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            errors = self._validate(user_input, own_id=None)
            if not errors:
                recipients = self._recipients
                recipients.append(
                    {
                        "id": self._unique_id(user_input["name"]),
                        "name": user_input["name"].strip(),
                        "type": user_input["type"],
                        "target": normalize_target(user_input["target"]),
                    }
                )
                return self._save(recipients)
        return self.async_show_form(
            step_id="add_recipient",
            data_schema=self._profile_schema(user_input or {}),
            errors=errors,
        )

    async def async_step_edit_recipient(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Profil zum Bearbeiten auswählen."""
        if user_input is not None:
            self._edit_id = user_input["recipient"]
            return await self.async_step_edit_recipient_form()
        return self.async_show_form(
            step_id="edit_recipient",
            data_schema=vol.Schema(
                {
                    vol.Required("recipient"): SelectSelector(
                        SelectSelectorConfig(
                            options=self._recipient_options(),
                            mode=SelectSelectorMode.LIST,
                        )
                    )
                }
            ),
        )

    async def async_step_edit_recipient_form(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        recipients = self._recipients
        current = next((r for r in recipients if r["id"] == self._edit_id), None)
        if current is None:
            return self.async_abort(reason="unknown_recipient")

        errors: dict[str, str] = {}
        if user_input is not None:
            errors = self._validate(user_input, own_id=current["id"])
            if not errors:
                # Die ID bleibt stabil - Automationen, die das Profil über die
                # ID ansprechen, funktionieren nach einer Umbenennung weiter.
                current.update(
                    name=user_input["name"].strip(),
                    type=user_input["type"],
                    target=normalize_target(user_input["target"]),
                )
                return self._save(recipients)
        return self.async_show_form(
            step_id="edit_recipient_form",
            data_schema=self._profile_schema(user_input or current),
            errors=errors,
            description_placeholders={"name": current["name"]},
        )

    async def async_step_remove_recipient(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        if user_input is not None:
            drop = set(user_input["recipients"])
            return self._save([r for r in self._recipients if r["id"] not in drop])
        return self.async_show_form(
            step_id="remove_recipient",
            data_schema=vol.Schema(
                {
                    vol.Required("recipients"): SelectSelector(
                        SelectSelectorConfig(
                            options=self._recipient_options(),
                            multiple=True,
                            mode=SelectSelectorMode.LIST,
                        )
                    )
                }
            ),
        )
