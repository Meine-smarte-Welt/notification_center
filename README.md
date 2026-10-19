🇩🇪 Deutsch · [🇬🇧 English](README.en.md) · [🇳🇱 Nederlands](README.nl.md) · [🇫🇷 Français](README.fr.md) · [🇪🇸 Español](README.es.md)

# Notification Center

<p align="center">
  <img src="https://raw.githubusercontent.com/Meine-smarte-Welt/notification_center/main/custom_components/notification_center/brand/icon.png" width="96" alt="Notification Center">
</p>

Eine Home-Assistant-Integration, die **Meldungen deiner Integrationen**, **Benachrichtigungen**, **Updates** und **Reparaturen** als eine Dashboard-Karte zusammenfasst - mit Lautlos-Modus, Push-Zustellung über Empfänger-Profile, Android-Widget und Schnellversand.

## Funktionsumfang

- **Meldungen:** Integrationen (z. B. Fritz!Box, Zigbee2MQTT Manager, Matter Manager) melden Ereignisse ans Notification Center. Sortiert nach Dringlichkeit: kritisch, Warnung, Info, in Ordnung
- **Lautlos-Modus:** hält Push-Nachrichten zurück, die Meldungen bleiben in Karte und Widget sichtbar; kritische Meldungen können ihn umgehen
- **Zustellung je Dringlichkeit:** Push über deine Empfänger-Profile (Smartphone-Wechsel = eine Änderung)
- **Quellenübersicht:** welche Integration angemeldet ist, welche Version sie hat und welche Meldungsarten sie abschaltet
- **Verlauf:** erledigte und quittierte Meldungen (Standard 30 Tage, höchstens 200)
- Vier Sensoren für Listen plus Profil-Sensor, Android-Template-Widget, Schnellversand, Scripts und Blueprints
- Karte mit Tabs, Statistik-Chips, Suche, Sortierung, Detail-Popup, Banner, Zwei-Klick-Bestätigung und frei wählbaren Farben
- Alles in **fünf Sprachen**: Deutsch, Englisch, Niederländisch, Französisch, Spanisch

## Voraussetzungen

- Home Assistant ab 2025.6
- HACS (empfohlen) oder manuelle Installation
- Optional: die Schwester-Integrationen in Version 1.0.0, damit Meldungen ankommen

## Installation

**HACS:** Benutzerdefiniertes Repository `https://github.com/Meine-smarte-Welt/notification_center` (Kategorie *Integration*) hinzufügen, „Notification Center“ installieren, Home Assistant neu starten. Vorabversionen (Beta/RC) siehst du nur, wenn du in HACS „Beta-Versionen anzeigen“ aktivierst.

**Manuell:** Ordner `custom_components/notification_center` in das `config`-Verzeichnis kopieren und neu starten.

## Einrichtung

Einstellungen → Geräte & Dienste → **Integration hinzufügen** → „Notification Center“. Es sind keine Zugangsdaten nötig, es gibt nur eine Instanz.

**Empfänger-Profile:** *Konfigurieren* → *Profil hinzufügen* (Name, Art Smartphone/E-Mail, `notify`-Ziel). Wechselst du das Smartphone, änderst du nur das Ziel des Profils.

**Lautlos-Modus, Zustellung, Verlauf:** ebenfalls unter *Konfigurieren* oder direkt in der Karte (Zahnrad → Optionen).

## Die Karte

Die Tabs (Reihenfolge fest, der Zahnrad-Tab ist immer der letzte):

- **Meldungen:** Meldungen der Integrationen, Chips mit Zähler (Kritisch/Warnung/Info), Verlauf, Quittieren
- **Benachrichtigungen:** persistente Benachrichtigungen von Home Assistant
- **Updates:** verfügbare Updates, Installieren im Popup
- **Reparaturen:** offene Reparaturen
- **Senden:** Schnellversand an ein Profil
- **Zahnrad:** App-Version, Quellen, Optionen, Wartung, Ereignisse

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

| Schlüssel | Bedeutung |
|---|---|
| `title / show_title / icon` | Titel, Titel ein-/ausblenden, Kopf-Icon |
| `default_tab` | Starttab (`messages`, `notifications`, `updates`, `repairs`, `send`, `settings`) |
| `default_sort` | Standard-Sortierung (`default`, `newest`, `oldest`, `title`) |
| `show_messages … show_settings` | Jede Kategorie einzeln ein-/ausschaltbar (mindestens eine bleibt sichtbar) |
| `show_search / show_filter_bar / show_stats` | Suchfeld, Sortierauswahl, Statistik-/Filter-Chips |
| `max_rows` | Höchstzahl der Zeilen (0 = alle) |
| `zoom` | Skalierung der Karte in Prozent (50-150) |
| `read_only` | blendet alle Bedienelemente zum Ändern aus |
| `show_builder` | Bereich „Scripts & Blueprints“ |
| `entities.*` | Sensoren (`messages` ist neu und hat die Standard-ID `sensor.notification_center_meldungen`) |

## Farben

Alle Farben sind pro Karte einstellbar (Editor-Abschnitt *Farben*). Leer = Theme-Standard. Erlaubt sind Hex, `rgb()`, `hsl()` und `var(--…)`.

| Schlüssel | Standard |
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

`notification_center.send` sendet eine Nachricht an ein Empfänger-Profil. „Dringend“ umgeht bei Smartphones den Lautlos-Modus (Android: Alarm-Kanal, iOS: Critical Alert), bei E-Mail steht ein Präfix im Betreff.

```yaml
action: notification_center.send
data:
  recipient: Thorsten Handy
  title: Waschmaschine
  message: Die Wäsche ist fertig.
  urgency: normal               # normal | high | critical
```

## Ereignisse (Schnittstelle für Integrationen)

Integrationen sprechen das Notification Center über den Home-Assistant-Event-Bus an (kein MQTT). Alle Nutzdaten enthalten `schema: 1`. Das Notification Center ist für die Integrationen **optional**: ist es nicht installiert, passiert dort nichts.

| Ereignis | Richtung | Zweck |
|---|---|---|
| `notification_center_register` | Integration → NC | Katalog der Meldungsarten (Dringlichkeit, Symbol, Texte in fünf Sprachen, Schalterstand) |
| `notification_center_report` | Integration → NC | eine Meldung: `state` = `active` oder `resolved`, stabiler `key`, `subject`, `placeholders`, `initial` |
| `notification_center_sync` | Integration → NC | welche Keys einer auflösbaren Art aktiv sind; alle anderen offenen Meldungen werden still geschlossen |
| `notification_center_ping` | NC → Integrationen | beim Start des NC; jede Integration antwortet mit register und sync |

- Meldungen enthalten nur Schlüssel und Platzhalter. Die Texte kommen aus dem Katalog der Quelle und erscheinen in der Sprache von Home Assistant (Rückfall Englisch).
- `initial: true` (Ausgangszustand nach Start/Sync) erscheint in der Karte, löst aber **keinen** Push aus.
- Nicht auflösbare Arten (z. B. verpasster Anruf) bleiben, bis du sie quittierst; sie werden nie per Sync geschlossen.
- Rufnummern, Namen und Texte werden nie ins Log geschrieben.

Beispiel einer Meldung:

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

## Sensoren

| Sensor | Zustand | Attribute |
|---|---|---|
| **Meldungen** | Anzahl offener Meldungen | `items`, `summary`, `by_severity`, `history`, `sources`, `settings`, `app`, `log` |
| **Benachrichtigungen** | Anzahl | `items`, `summary` |
| **Updates** | Anzahl | `items`, `summary` |
| **Reparaturen** | Anzahl | `items`, `summary` |
| **Profile** | Anzahl Profile | `items`, `summary` |

Die großen Attribute werden nicht in der Langzeitdatenbank gespeichert.

## Lautlos-Modus und Zustellung

- **Lautlos-Modus an:** keine Push-Nachrichten. Meldungen bleiben in Karte und Widget sichtbar. Ein Banner in der Karte weist darauf hin.
- **Kritische trotzdem zustellen** (Standard an): `critical` umgeht den Lautlos-Modus über die Dringlichkeits-Funktion der Smartphone-Benachrichtigung.
- **Zustellung je Dringlichkeit:** ohne eigene Auswahl erhalten kritische Meldungen und Warnungen Push auf allen Smartphone-Profilen, Info und „in Ordnung“ nur Karte und Widget.
- **Bündeln:** Die ersten 5 gleichartigen Meldungen innerhalb von 10 Sekunden gehen einzeln raus, weitere werden zu **einem** Push zusammengefasst („N weitere Meldungen“). Alle Einzelmeldungen bleiben in der Liste.

## Versionsanzeige und Update-Hinweis

Die Version steht an drei Stellen: im Zahnrad (App-Version), oben im Karten-Editor (`Karte 1.0.0 · Integration 1.0.0`) und im Optionen-Dialog. Die Integration fragt beim Start und danach alle 12 Stunden `api.github.com` ab (bei Beta/RC auch Pre-releases). Neue Version → orange Hinweis, „↑“ am Zahnrad; Karte und Integration mit unterschiedlicher Version (Browser-Cache) → ebenfalls orange; GitHub nicht erreichbar → „Prüfung nicht möglich“, die Karte läuft normal weiter.

## Einstellungen (Zahnrad)

Feste Reihenfolge der Akkordeons: **App-Version** · **Quellen** · **Optionen** (Lautlos-Modus, Zustellung) · **Wartung** (Testmeldung, alle quittieren, Verlauf leeren, jeweils mit Zwei-Klick-Bestätigung) · **Ereignisse** (Protokoll seit Start, ohne Inhalte). Ändern dürfen nur Administratoren.

## Android-Widget

Im Karten-Editor (Abschnitt *Widgets*) steht der fertige Quelltext für ein Template-Widget der Companion-App, je Sensor oder für alle zusammen. Die Companion-App rendert nur einfaches HTML; Trennlinien bestehen aus „─“-Zeichen (Länge über die Variable `line`). Benachrichtigungszugriff für die Companion-App aktivieren, sonst aktualisiert das Widget nur alle 30 Minuten.

## Scripts & Blueprints

Unter der Liste lassen sich Scripts, Script-Blueprints und Automations-Blueprints zusammenklicken (Administrator nötig). Bestehende Scripts werden nie überschrieben, Blueprints nur nach Rückfrage.

## Sicherheit

- Schreibende Aktionen (Quittieren, Schalter, Wartung, Testmeldung, Scripts/Blueprints) nur für Administratoren; Eingaben werden im Backend geprüft.
- Alle Texte in der Karte werden maskiert, Farbwerte laufen über eine Allowlist.
- Meldungen enthalten keine Zugangsdaten; Texte, Namen und Rufnummern landen nicht im Log und nicht in der Diagnose.
- Riskante Aktionen verlangen zwei Klicks statt eines Browser-Dialogs.
- Der Release-Link wird nur angezeigt, wenn er mit `https://github.com/` beginnt.

## Bekannte Einschränkungen

- **Nicht an einer echten Home-Assistant-Instanz und nicht mit echten Smartphones getestet.** Geprüft sind: die Hub-Logik gegen einen simulierten Event-Bus (14 Tests), die Karte im Headless-Browser mit Testdaten (alle Tabs, Popup, Zahnrad, fünf Sprachen, Editor) sowie Syntax und JSON. Das Zusammenspiel mit der echten Home-Assistant-Oberfläche ist **ungeprüft**.
- **Zusammenspiel mit den Schwester-Integrationen ungeprüft:** Es wurde nur gegen simulierte Ereignisse getestet, nicht gegen echte Fritz!Box-, Zigbee2MQTT- oder Matter-Daten.
- Ob „Dringend“ auf deinem Gerät den Lautlos-Modus wirklich umgeht, hängt von Android-/iOS-Einstellungen ab (Kanal-Berechtigungen, Nicht stören, kritische Hinweise). Bitte mit der Testmeldung ausprobieren.
- E-Mail-Profile lassen sich für die Zustellung von Meldungen technisch wählen, E-Mail gehört aber nicht zum geprüften Umfang von 1.0.0.
- Nicht enthalten: Stummschalten einzelner Geräte, Zeitplan für den Lautlos-Modus.
- Persistente Benachrichtigungen liest die Integration defensiv aus einem internen Speicher von Home Assistant; ändert sich das, bleibt die Kategorie leer.
- Die Übersetzungen (Niederländisch, Französisch, Spanisch) sind maschinell erstellt und nicht von Muttersprachlern geprüft - Korrekturen willkommen.
- Scripts und Blueprints werden nur angelegt; bearbeiten und löschen geschieht in Home Assistant.

## Fehlerbehebung

| Problem | Lösung |
|---|---|
| Karte zeigt „Custom element doesn’t exist“ | Browser-Cache leeren (Strg+F5); im YAML-Modus die Ressource `/notification_center_files/notification-center-card.js` (Typ `module`) von Hand eintragen. |
| Tab „Meldungen“ fehlt | Der Sensor `sensor.notification_center_meldungen` existiert erst nach dem Neustart mit 1.0.0. Eintrag `entities.messages` prüfen. |
| Keine Meldungen aus einer Integration | Zahnrad → Quellen: ist die Quelle angemeldet? Die Integration muss in Version 1.0.0 vorliegen und „Meldungen senden“ eingeschaltet haben. |
| Kein Push | Ist der Lautlos-Modus an? Ist für die Dringlichkeit ein Profil gewählt (Zahnrad → Optionen)? Mit der Testmeldung prüfen. |
| Update-Prüfung schlägt fehl | Home Assistant braucht Internetzugang zu `api.github.com`; die Karte läuft trotzdem normal. |

## Datei-Integrität

Jede `.py`, `.js` und `.yaml` beginnt mit einem SHA256-Header (Inhalt ab Zeile 2). Prüfen mit `tail -n +2 datei.py | sha256sum`. Die Prüfsummen der JSON-Dateien stehen in [docs/datei-integritaet.md](docs/datei-integritaet.md).

## Versionshistorie

### 1.0.0

- Neu: **Meldungen** der Integrationen (Schnittstelle Schema 1: register, report, sync, ping), Dringlichkeit, Verlauf, Quittieren, Quellenübersicht
- Neu: **Lautlos-Modus**, „Kritische trotzdem zustellen“, **Zustellung je Dringlichkeit**, Bündeln, Testmeldung
- Neu: Zahnrad-Tab mit App-Version, Quellen, Optionen, Wartung, Ereignissen; Update-Hinweis über GitHub
- Neu: Statistik-Chips, Sortierung, Banner, Toast, Popup mit Akkordeon, `default_tab`, `zoom`, `read_only`, `max_rows`
- Neu: **fünf Sprachen** in Karte, Optionen und Services; Logo (`logo.png`), Diagnose-Download, `LICENSE`
- Geändert: Der Tab „Meldungen“ ist der Standard-Starttab (über `default_tab` änderbar)
- Nach dem Update Home Assistant neu starten und den Browser-Cache leeren (Strg+F5)

Alle Versionen: [docs/versionshistorie.md](docs/versionshistorie.md)

## Lizenz

MIT
