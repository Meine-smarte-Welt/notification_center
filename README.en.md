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
- **Origin:** every message shows the logo of the originating integration (otherwise the source's icon). Clicking opens the popup with the integration's card (if any) and “Open integration”
- **Assign levels yourself:** in the cog you decide per message type whether it is critical, warning, info or OK. **Import:** rules and the service `notification_center.report` turn integrations without their own interface into sources, e.g. Watchman
- **Inbound (mapping):** you decide which field of another integration becomes title, text, key and level. This connects any integration that fires an event or calls an action
- **Grouping:** besides sorting, lists can be grouped, e.g. messages by integration, urgency or message type. Groups can be collapsed
- **Popup card as YAML:** just paste the code from the card editor, no JSON needed

## Requirements

- Home Assistant 2025.6 or newer
- HACS (recommended) or manual installation
- Optional: the sister integrations in version 1.0.0 so messages arrive

## Installation

**HACS:** add the custom repository `https://github.com/Meine-smarte-Welt/notification_center` (category *Integration*), install “Notification Center”, restart Home Assistant.

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
| `show_group_by` / `default_group_by` | Show the grouping selection; default grouping (`none`, `integration`, `severity`, `type`, available depending on the list) |
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

`notification_center.report` creates or updates a message (same `key` = same message); `state: resolved` closes it. Any automation, script or integration that can call an “action” can report this way.

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
- The registration may optionally contain `domain` (the integration's domain for the logo) and `card` (Lovelace card configuration for the popup, max. 4 KB). A card you enter in the cog takes precedence.

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

## Import: connect any integration (e.g. Watchman)

Integrations that do not talk to the Notification Center themselves can be connected in three ways. All of them create normal messages with level, history, acknowledge and push.

1. **Import rule (cog → Imports):** turns any entity into a message. Mode *number above 0* (counter) or *state is one of …*. Title and message are optional templates as in Home Assistant (`{{ state }}`, `{{ name }}`, `{{ attrs.xyz }}`). When the condition is false again the message closes itself. A message that already exists at start does not trigger a push.
2. **Service `notification_center.report`:** for text an integration sends itself. Many integrations can call any action as their target; enter `notification_center.report` there and the text arrives as a message in the Notification Center.
3. **Events (schema 1):** the clean way for integrations that want to support the Notification Center (see above). The registration may optionally carry `domain` (for the logo) and `card` (Lovelace card for the popup).

**Watchman example:** in the cog under *Imports* → *New rule* → *Watchman template*. It watches `sensor.watchman_missing_entities` (number of missing entities) and creates or closes the message. Add the same rule again for `sensor.watchman_missing_actions`. You get the detailed text report like this:

```yaml
action: watchman.report
data:
  create_file: false
  action: notification_center.report
  data:
    source: Watchman
    title: Watchman
    severity: warning
    key: report
```

According to the Watchman documentation, `watchman.report` accepts any notification action (`action`) with extra data (`data`). Whether Watchman passes `message` and `title` the way `notification_center.report` expects is **not tested against a real Watchman installation**. If it does not work for you, the import rule for the counter remains the safe way. You can split long reports in Watchman with `chunk_size`.

```yaml
action: notification_center.report
data:
  source: My script            # shown as the source; also decides the logo
  title: Backup
  message: The backup failed.
  severity: critical           # critical | warning | info | ok
  key: backup                  # same key = the same message is updated
  # state: resolved            # closes the message again
```

## Inbound: map title, text and level yourself

If you do not know, or are not sure, which fields an integration sends, map them yourself: cog → **Inbound** → *New rule*.

1. **Choose the trigger:** any Home Assistant **event** (enter its name) or a **service call** to `notification_center.inbound` with the field `rule`.
2. **Look at the last content:** as soon as something arrives, the rule shows the last received content (“Last content”). There you see the real field names.
3. **Map the fields:** title, text and key are templates on the received fields, e.g. `{{ data.message }}`. Without an entry the rule name or the raw content is shown.
4. **Map the level:** either fixed, or from a field through a value table, e.g. field `{{ data.level }}` and table `error=critical, warning=warning`. Other values get the fixed level.
5. **Close:** optionally a condition like `{{ data.count | int == 0 }}`; if true, the message is closed. Same key = the same message is updated.

**Watchman example:** in the rule choose the *Watchman template* (trigger service, text `{{ data.message }}`), save, and call `watchman.report` like this:

```yaml
action: watchman.report
data:
  create_file: false
  action: notification_center.inbound
  data:
    rule: watchman        # ID of the inbound rule (shown in the list after saving)
```

The received content is stored locally in `.storage` (at most 1.5 KB per rule) and never written to the log. Which fields Watchman actually passes you see after the first report under “Last content”. This is **not tested with a real Watchman installation**.

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
- **Hold back push after a planned restart** (default on, grace period 180 seconds, adjustable 30 to 900): integrations often report “offline” for a moment while starting (e.g. Zigbee2MQTT not reachable). If Home Assistant shuts down in a controlled way (restart from the UI, Supervisor, host reboot), the Notification Center remembers that and sends no push during the grace period after start. If a problem still exists after the grace period, the push is delivered then; anything that resolved by then is never sent. After a **crash or power loss** (no clean shutdown detected) messages arrive immediately as before. Everything stays visible in the card. Switch: cog → Options or Configure; set the grace period under Configure → Silent mode and history

## Version display and update notice

The version appears in three places: in the cog (App version), at the top of the card editor (`Card 1.2.1 · Integration 1.2.1`) and in the options dialog. The integration asks `api.github.com` at start and every 12 hours. New version → orange notice, “↑” at the cog; card and integration with different versions (browser cache) → also orange; GitHub unreachable → “Check not possible”, the card keeps working.

## Settings (cog)

Fixed order of the accordions: **App version** · **Sources** · **Options** (silent mode, delivery) · **Maintenance** (test message, acknowledge all, clear history, each with two-click confirmation) · **Events** (log since start, without contents). Only administrators can change things. Also **Imports** (create, edit, delete rules) and, per source, the **level choice** per message type and the **popup card** (Lovelace card as YAML, just paste the code from the card editor).

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

- **Not tested on a real Home Assistant instance or with real phones.** Checked: the hub logic against a simulated event bus (27 tests), the card in a headless browser with test data (all tabs, popup, cog, five languages, editor) and syntax/JSON. Behavior in the real Home Assistant UI is **untested**.
- **Interplay with the sister integrations is untested:** only simulated events were used, no real Fritz!Box, Zigbee2MQTT or Matter data.
- Whether “Urgent” really bypasses silent mode on your device depends on Android/iOS settings (channel permissions, Do Not Disturb, critical alerts). Please try it with the test message.
- Email profiles can technically be chosen for message delivery, but email is not part of the tested scope of 1.0.0.
- Not included: muting single devices, a schedule for silent mode.
- Persistent notifications are read defensively from an internal Home Assistant store; if that changes, the category stays empty.
- The Dutch, French and Spanish translations are machine-made and not checked by native speakers - corrections welcome.
- Scripts and blueprints are only created; editing and deleting happen in Home Assistant.
- **Origin logo, imports and popup card are only tested with simulated data** (hub against the Home Assistant core, card in a headless browser). The logo comes from Home Assistant's brand proxy (`/api/brands/integration/<domain>/icon.png`); if there is none, the source's icon is shown. Neither was seen on a real instance.
- The popup card is created through Home Assistant's card helper. Cards that need their own resource must be loaded on your dashboard.
- Importing the Watchman report as text through `notification_center.report` is not tested with a real Watchman installation. Imports are limited to 30 rules; templates run with administrator rights.
- **Inbound rules tested with simulated data only.** An inbound rule needs an integration that fires an event or calls an action. Integrations that work only internally can only be connected through their entities (Imports). Limited to 30 rules; templates run with administrator rights.
- **Grouping, YAML input of the popup card and the scroll fix (new in 1.2.0) are only tested with simulated data.** Whether the scrollbars really stay put in your browser and dashboard is untested. The popup card needs a `type` field and may be at most 4 KB; YAML anchors (`&`, `*`) are not accepted. The hub tests against the Home Assistant core were not run again for 1.2.0; the backend is only syntax-checked, the YAML parser tested on its own.
- **Push hold-back after a restart (new in 1.2.1) is only tested in a simulated environment,** not on a real Home Assistant instance. Whether Home Assistant reports the shutdown cleanly on your way of restarting (UI, Supervisor, Docker stop) is untested; when in doubt the push simply arrives as before. The test message is not held back.

## Troubleshooting

| Problem | Solution |
|---|---|
| Card shows “Custom element doesn’t exist” | Clear the browser cache (Ctrl+F5); in YAML mode add the resource `/notification_center_files/notification-center-card.js` (type `module`) by hand. |
| “Messages” tab is missing | The sensor `sensor.notification_center_meldungen` only exists after restarting with 1.0.0. Check the `entities.messages` entry. |
| No messages from an integration | Cog → Sources: is the source registered? The integration must be version 1.0.0 with “send messages” switched on. |
| No push | Is silent mode on? Is the grace period after a restart still running (cog → Options)? Is a profile selected for that urgency (cog → Options)? Check with the test message. |
| Update check fails | Home Assistant needs internet access to `api.github.com`; the card keeps working anyway. |

## File integrity

Every `.py`, `.js` and `.yaml` starts with a SHA256 header (content from line 2). Verify with `tail -n +2 file.py | sha256sum`. Checksums of the JSON files are in [docs/datei-integritaet.md](docs/datei-integritaet.md).

## Version history

### 1.2.1

- Fixed: the options dialog (“Configure”) caused the log error `Failed to format translation for key 'component.notification_center.options.step.init.title'` (missing placeholder `version`). The title is now just “Notification Center”; the version stays in the dialog description
- New: **hold back push after a planned restart** (option, default on, grace period 180 seconds). After a controlled shutdown no push messages are sent while integrations briefly report “offline” at start; whatever still exists afterwards is delivered. After a crash or power loss the push arrives immediately. Switch in the card (cog → Options) and under Configure, grace period under Configure
- After the update restart Home Assistant and clear the browser cache (Ctrl+F5)

### 1.2.0

- New: **grouping** besides sorting: messages by integration, urgency or message type, updates by integration, repairs by integration or urgency; groups can be collapsed. Card keys `show_group_by` and `default_group_by`
- New: **popup card as YAML:** just paste the code from the card editor (JSON still works). The field also shows the saved card as YAML
- Fixed: the **scrollbars** of the category bar and the popup, and the scroll position of the page, no longer jump back. The card only redraws when its own sensors change
- New: **origin** of every message (integration logo), popup with the **integration's card** and “Open integration”
- New: **level assignment** per message type in the cog (also applies to push and sorting)
- New: **import** through rules (cog → Imports, with a Watchman template) and the service `notification_center.report`
- New: **Inbound** (cog): an event or the service `notification_center.inbound` is mapped through templates to title, text, key and level, with a value table for the level, a close condition and a view of the last received content
- New: optional fields `domain` and `card` in the registration (schema 1 stays compatible); example `examples/inbound_watchman.yaml`
- Fixed: long texts were cut to 200 characters when assembled (now 2000)
- After the update restart Home Assistant and clear the browser cache (Ctrl+F5)

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
