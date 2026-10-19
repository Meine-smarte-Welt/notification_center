[🇩🇪 Deutsch](README.md) · 🇬🇧 English · [🇳🇱 Nederlands](README.nl.md) · [🇫🇷 Français](README.fr.md) · [🇪🇸 Español](README.es.md)

# Notification Center

<p align="center">
  <img src="https://raw.githubusercontent.com/Meine-smarte-Welt/notification_center/main/custom_components/notification_center/brand/icon.png" width="96" alt="Notification Center">
</p>

A Home Assistant integration that combines **messages from your integrations**, **notifications**, **updates** and **repairs** in one dashboard card - with silent mode, push delivery through recipient profiles, an Android widget and quick send.

## Features

- **Messages:** integrations (e.g. Fritz!Box, Zigbee2MQTT Manager, Matter Manager) report events to the Notification Center, sorted by urgency: critical, warning, info, OK
- **Silent mode:** holds back push messages; messages stay visible in the card and widget; critical messages can bypass it
- **Delivery by urgency:** push through your recipient profiles (switching phones = one change)
- **Source overview:** which integration is registered, its version and which message types it has switched off
- **History:** resolved and acknowledged messages (default 30 days, at most 200)
- Four list sensors plus a profile sensor, Android template widget, quick send, scripts and blueprints
- Card with tabs, statistic chips, search, sorting, detail popup, banner, two-click confirmation and free colors
- Everything in **five languages**: German, English, Dutch, French, Spanish

## Requirements

- Home Assistant 2025.6 or newer
- HACS (recommended) or manual installation
- Optional: the sister integrations in version 1.0.0 so messages arrive

## Installation

**HACS:** add the custom repository `https://github.com/Meine-smarte-Welt/notification_center` (category *Integration*), install “Notification Center”, restart Home Assistant. You only see pre-releases (beta/RC) if you enable “Show beta versions” in HACS.

**Manual:** copy the folder `custom_components/notification_center` into your `config` directory and restart.

## Setup

Settings → Devices & services → **Add integration** → “Notification Center”. No credentials are needed, only one instance exists.

**Recipient profiles:** *Configure* → *Add profile* (name, type phone/email, `notify` target). When you switch phones, only the profile's target changes.

**Silent mode, delivery, history:** also under *Configure* or directly in the card (cog → Options).

## The card

The tabs (fixed order, the cog tab is always last):

- **Messages:** messages from integrations, chips with counters (Critical/Warning/Info), history, acknowledge
- **Notifications:** persistent notifications of Home Assistant
- **Updates:** available updates, install from the popup
- **Repairs:** open repairs
- **Send:** quick send to a profile
- **Cog:** app version, sources, options, maintenance, events

```yaml
type: custom:notification-center-card
title: Notification Center
default_tab: messages
entities:
  messages: sensor.notification_center_meldungen
  notifications: sensor.notification_center_benachrichtigungen
  updates: sensor.notification_center_updates
  repairs: sensor.notification_center_reparaturen
  recipients: sensor.notification_center_profile
```

| Key | Meaning |
|---|---|
| `title / show_title / icon` | Title, show/hide title, header icon |
| `default_tab` | Start tab (`messages`, `notifications`, `updates`, `repairs`, `send`, `settings`) |
| `default_sort` | Default sorting (`default`, `newest`, `oldest`, `title`) |
| `show_messages … show_settings` | Every category can be switched on/off (at least one stays visible) |
| `show_search / show_filter_bar / show_stats` | Search field, sort selection, statistic/filter chips |
| `max_rows` | Maximum rows (0 = all) |
| `zoom` | Card scaling in percent (50-150) |
| `read_only` | hides every control that changes something |
| `show_builder` | “Scripts & Blueprints” area |
| `entities.*` | Sensors (`messages` is new, default ID `sensor.notification_center_meldungen`) |

## Colors

All colors are set per card (editor section *Colors*). Empty = theme default. Allowed: hex, `rgb()`, `hsl()` and `var(--…)`.

| Key | Default |
|---|---|
| `color_message` | `#03a9f4` |
| `color_notification` | `#0288d1` |
| `color_update` | `#fb8c00` |
| `color_repair` | `#e53935` |
| `color_send` | `#03a9f4` |
| `color_error` | `#db4437` |
| `color_warning` | `#ff9800` |
| `color_info` | `#039be5` |
| `color_success` | `#43a047` |

## Services

`notification_center.send` sends a message to a recipient profile. “Urgent” bypasses silent mode on phones (Android: alarm channel, iOS: Critical Alert); for email a prefix is added to the subject.

```yaml
action: notification_center.send
data:
  recipient: Thorsten Handy
  title: Waschmaschine
  message: Die Wäsche ist fertig.
  urgency: normal               # normal | high | critical
```

## Events (interface for integrations)

Integrations talk to the Notification Center over the Home Assistant event bus (no MQTT). All payloads carry `schema: 1`. The Notification Center is **optional** for integrations: if it is not installed, nothing happens there.

| Event | Direction | Purpose |
|---|---|---|
| `notification_center_register` | Integration → NC | catalog of message types (urgency, icon, texts in five languages, switch state) |
| `notification_center_report` | Integration → NC | one message: `state` = `active` or `resolved`, stable `key`, `subject`, `placeholders`, `initial` |
| `notification_center_sync` | Integration → NC | which keys of a resolvable type are active; all other open messages are closed silently |
| `notification_center_ping` | NC → integrations | sent when the NC starts; every integration answers with register and sync |

- Messages carry only keys and placeholders. Texts come from the source's catalog and appear in the Home Assistant language (fallback English).
- `initial: true` (initial state after start/sync) shows up in the card but triggers **no** push.
- Non-resolvable types (e.g. missed call) stay until you acknowledge them; sync never closes them.
- Phone numbers, names and texts are never written to the log.

Example of a message:

```yaml
event: notification_center_report
event_data:
  schema: 1
  source: meine_integration
  entry_id: beispiel
  type: door_open
  key: haustuer
  state: active
  subject: { id: haustuer, name: Haustür, kind: device }
  placeholders: { name: Haustür }
```

## Sensors

| Sensor | State | Attributes |
|---|---|---|
| **Messages** | number of open messages | `items`, `summary`, `by_severity`, `history`, `sources`, `settings`, `app`, `log` |
| **Notifications** | count | `items`, `summary` |
| **Updates** | count | `items`, `summary` |
| **Repairs** | count | `items`, `summary` |
| **Profiles** | number of profiles | `items`, `summary` |

The large attributes are not stored in the long-term database.

## Silent mode and delivery

- **Silent mode on:** no push messages. Messages stay visible in the card and widget. A banner in the card points this out.
- **Still deliver critical messages** (default on): `critical` bypasses silent mode through the urgency feature of the phone notification.
- **Delivery by urgency:** without your own choice, critical messages and warnings are pushed to all phone profiles; info and OK only appear in card and widget.
- **Bundling:** the first 5 messages of the same kind within 10 seconds are sent individually, further ones are merged into **one** push (“N more messages”). All individual messages stay in the list.

## Version display and update notice

The version appears in three places: in the cog (App version), at the top of the card editor (`Card 1.0.0 · Integration 1.0.0`) and in the options dialog. The integration asks `api.github.com` at start and every 12 hours (including pre-releases for beta/RC). New version → orange notice, “↑” at the cog; card and integration with different versions (browser cache) → also orange; GitHub unreachable → “Check not possible”, the card keeps working.

## Settings (cog)

Fixed order of the accordions: **App version** · **Sources** · **Options** (silent mode, delivery) · **Maintenance** (test message, acknowledge all, clear history, each with two-click confirmation) · **Events** (log since start, without contents). Only administrators can change things.

## Android widget

In the card editor (section *Widgets*) you find ready-made source text for a Companion App template widget, per sensor or all together. The Companion App renders only simple HTML; separator lines are made of “─” characters (length via the variable `line`). Enable notification access for the Companion App, otherwise the widget only refreshes every 30 minutes.

## Scripts & Blueprints

Below the list you can click together scripts, script blueprints and automation blueprints (administrator required). Existing scripts are never overwritten, blueprints only after confirmation.

## Security

- Writing actions (acknowledge, switches, maintenance, test message, scripts/blueprints) are administrator-only; input is validated in the backend.
- All texts in the card are escaped, color values go through an allowlist.
- Messages contain no credentials; texts, names and phone numbers do not end up in the log or diagnostics.
- Risky actions need two clicks instead of a browser dialog.
- The release link is only shown if it starts with `https://github.com/`.

## Known limitations

- **Not tested on a real Home Assistant instance or with real phones.** Checked: the hub logic against a simulated event bus (14 tests), the card in a headless browser with test data (all tabs, popup, cog, five languages, editor) and syntax/JSON. Behavior in the real Home Assistant UI is **untested**.
- **Interplay with the sister integrations is untested:** only simulated events were used, no real Fritz!Box, Zigbee2MQTT or Matter data.
- Whether “Urgent” really bypasses silent mode on your device depends on Android/iOS settings (channel permissions, Do Not Disturb, critical alerts). Please try it with the test message.
- Email profiles can technically be chosen for message delivery, but email is not part of the tested scope of 1.0.0.
- Not included: muting single devices, a schedule for silent mode.
- Persistent notifications are read defensively from an internal Home Assistant store; if that changes, the category stays empty.
- The Dutch, French and Spanish translations are machine-made and not checked by native speakers - corrections welcome.
- Scripts and blueprints are only created; editing and deleting happen in Home Assistant.

## Troubleshooting

| Problem | Solution |
|---|---|
| Card shows “Custom element doesn’t exist” | Clear the browser cache (Ctrl+F5); in YAML mode add the resource `/notification_center_files/notification-center-card.js` (type `module`) by hand. |
| “Messages” tab is missing | The sensor `sensor.notification_center_meldungen` only exists after restarting with 1.0.0. Check the `entities.messages` entry. |
| No messages from an integration | Cog → Sources: is the source registered? The integration must be version 1.0.0 with “send messages” switched on. |
| No push | Is silent mode on? Is a profile selected for that urgency (cog → Options)? Check with the test message. |
| Update check fails | Home Assistant needs internet access to `api.github.com`; the card keeps working anyway. |

## File integrity

Every `.py`, `.js` and `.yaml` starts with a SHA256 header (content from line 2). Verify with `tail -n +2 file.py | sha256sum`. Checksums of the JSON files are in [docs/datei-integritaet.md](docs/datei-integritaet.md).

## Version history

### 1.0.0

- New: **messages** from integrations (interface schema 1: register, report, sync, ping), urgency, history, acknowledge, source overview
- New: **silent mode**, “still deliver critical messages”, **delivery by urgency**, bundling, test message
- New: cog tab with app version, sources, options, maintenance, events; update notice via GitHub
- New: statistic chips, sorting, banner, toast, popup with accordion, `default_tab`, `zoom`, `read_only`, `max_rows`
- New: **five languages** in card, options and services; logo (`logo.png`), diagnostics download, `LICENSE`
- Changed: the “Messages” tab is the default start tab (changeable via `default_tab`)
- After the update restart Home Assistant and clear the browser cache (Ctrl+F5)

All versions: [docs/versionshistorie.md](docs/versionshistorie.md)

## License

MIT
