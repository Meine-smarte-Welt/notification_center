# Notification Center

<p align="center">
  <img src="custom_components/notification_center/brand/icon.png" width="96" alt="Notification Center Icon">
</p>

Eine Home-Assistant-Integration, die **Benachrichtigungen**, **Updates** und
**Reparaturen** als eine Dashboard-Karte mit drei Tabs zusammenfasst - inklusive
Suche, Filterleiste, Detail-Popup und frei wählbaren Farben. Optisch und in der
Bedienung angelehnt an die Schwester-Integrationen *FRITZ!Box Anrufe* und
*FRITZ!Box Netzwerk*.

---

## Was die Integration kann

- Drei zusammenfassende Sensoren: Benachrichtigungen, Updates, Reparaturen
- Jeder Sensor zählt seine Kategorie als Zustand und trägt die Einzeleinträge
  im Attribut `items`
- Ein Attribut `summary` pro Sensor - ein fertiger Kurztext, gedacht für ein
  **Android-Template-Widget** auf dem Homescreen (siehe unten)
- Dashboard-Karte mit drei Tabs, Suchfeld, Filterchips je Kategorie und
  Detail-Popup pro Eintrag
- Aktionen direkt aus der Karte: Benachrichtigung schliessen, Update
  installieren, zu den Reparaturen springen
- Farben pro Kategorie frei einstellbar, leer = aktives Theme
- Karte wird mitgeliefert und automatisch als Lovelace-Ressource eingetragen

---

## Installation

### Manuell

Den Ordner `custom_components/notification_center` in das `config`-Verzeichnis
von Home Assistant kopieren und neu starten.

### Über HACS

Als benutzerdefiniertes Repository (Kategorie *Integration*) hinzufügen und
„Notification Center" installieren.

## Einrichtung

Einstellungen → Geräte & Dienste → **Integration hinzufügen** →
„Notification Center". Es sind keine Zugangsdaten nötig, es kann nur
eine Instanz eingerichtet werden.

## Dashboard-Karte

Karte hinzufügen → **Notification Center** → die drei Sensoren
zuweisen. Beispiel-YAML:

```yaml
type: custom:notification-center-card
title: Notification Center
show_title: true
icon: mdi:bell-badge-outline
show_search: true
show_notifications: true
show_updates: true
show_repairs: true
entities:
  notifications: sensor.notification_center_benachrichtigungen
  updates: sensor.notification_center_updates
  repairs: sensor.notification_center_reparaturen

# Farben (leer = aktives Theme)
color_notification: ""
color_update: ""
color_repair: ""
```

### Kategorien als Tabs

Die drei Kategorien liegen als Tabs nebeneinander (Icon, Name und
Zähler-Badge je Tab) - passend zum Look der anderen Karten. Suchfeld und
Filterchips gehören zum gerade aktiven Tab.

### Titel ein-/ausblenden

`show_title: false` blendet Kopfzeile (Titel + Icon) komplett aus, wenn nur
die Kategorien selbst auf einem Dashboard stehen sollen.

### Kategorien ein-/ausblenden

`show_notifications`, `show_updates` und `show_repairs` blenden die jeweilige
Kategorie komplett aus - Tab, Zähler und Inhalt verschwinden. Ist keine
Kategorie mehr aktiv, zeigt die Karte einen entsprechenden Hinweis.

### Benachrichtigungen löschen

Jede einzelne Benachrichtigung hat ein Löschen-Icon in der Zeile sowie im
Detail-Popup (`persistent_notification.dismiss`). Oberhalb der Liste steht
zusätzlich *Alle löschen*, sobald die Kategorie „Benachrichtigungen" aktiv
ist und mindestens ein Eintrag vorhanden ist - ruft
`persistent_notification.dismiss_all` auf.

### Farben

Im grafischen Editor, Abschnitt *Farben*: eine Farbauswahl (Swatch) zum
Klicken plus ein Textfeld für Hex, `rgb()`, `hsl()`, CSS-Farbnamen oder
`var(--…)` - genau wie bei FRITZ!Box Netzwerk. Ein Klick auf *Alle Farben
zurücksetzen* leert alle drei Felder auf einmal, die Karte folgt dann wieder
dem aktiven Theme.

### Editor in Abschnitten

Der grafische Editor ist in aufklappbare Abschnitte gegliedert - Sensoren,
Darstellung, Kategorien, Farben - ebenfalls wie bei den anderen
Integrationen.

## Android-Widget

Die Sensoren sind bewusst so aufgebaut, dass sie sich direkt in ein
**Template-Widget** der Home-Assistant-Companion-App einsetzen lassen, ohne
zusätzliche Helper oder Automationen:

```
{{ state_attr('sensor.notification_center_updates', 'summary') }}
```

Für alle drei Kategorien auf einen Blick, z. B. als mehrzeiliges
Template-Widget:

```
{{ states('sensor.notification_center_benachrichtigungen') }} Benachrichtigung(en)
{{ states('sensor.notification_center_updates') }} Update(s)
{{ states('sensor.notification_center_reparaturen') }} Reparatur(en)
```

Nicht vergessen: Benachrichtigungszugriff für die Companion App aktivieren
(Android-Einstellungen → Benachrichtigungen → Benachrichtigungszugriff →
Home Assistant → Real-time), sonst aktualisiert das Widget nur alle 30 Minuten.

## Versionshistorie

### 0.0.1b3 – Bugfix: Editor-Absturz "Cannot read properties of undefined"

- Home Assistant setzt beim Öffnen des Karten-Editors `hass` und ruft
  `setConfig()` in keiner garantierten Reihenfolge auf. Traf `hass` zuerst
  ein, existierte `this._forms` noch nicht, und der Editor stürzte mit
  „Cannot read properties of undefined (reading 'forEach')" ab. `_forms`
  wird jetzt im Konstruktor angelegt, zusätzlich zur Absicherung im
  `hass`-Setter.

### 0.0.1b2 – Tabs zurück, Editor als Akkordeon, Löschen, Such-Fix

- Kategorien wieder als **Tabs nebeneinander** (die Akkordeon-Darstellung aus
  0.0.1b1 war ein Missverständnis - gemeint war der Editor, nicht die Karte)
- Grafischer Editor jetzt in aufklappbare Abschnitte gegliedert: *Sensoren*,
  *Darstellung*, *Kategorien*, *Farben*
- **Löschen** je einzelner Benachrichtigung jetzt auch im Detail-Popup (rief
  vorher nur das Popup zu, ohne die Benachrichtigung tatsächlich zu
  entfernen), zusätzlich **„Alle löschen"** oberhalb der Liste
  (`persistent_notification.dismiss_all`)
- **Bugfix Suche:** Zeichen wie „e" im Suchfeld öffneten Home Assistants
  globale Quick-Bar, weil Home Assistant bei Tastaturkürzeln nur das
  Zielelement prüft und das durch das Shadow DOM der Karte auf das
  Karten-Element zurückgesetzt wurde, statt das tatsächliche Eingabefeld zu
  sehen. Tastatur-Events aus Such- und Farbfeldern werden jetzt nicht mehr
  nach aussen weitergegeben.

### 0.0.1b1 – Umbenennung, Bugfix Reparaturen, Update-Installation im Popup

- Integration und Karte umbenannt in **Notification Center** (Domain bleibt
  `notification_center`, entsprechend auch neue Entity-IDs) sowie
  Integrations-Icon lokal unter `custom_components/notification_center/brand/`
  ergänzt (`icon.png` 256×256, `icon@2x.png` 512×512) über die seit Home
  Assistant 2026.3 unterstützten lokalen Brand-Images
- **Bugfix Reparaturen-Sensor:** zählte bisher auch längst erledigte,
  archivierte Issues mit (falsches Attribut geprüft). Home Assistant markiert
  nicht-persistente Issues nach einem Neustart zunächst als inaktiv (`active:
  False`) und aktiviert sie nur neu, wenn die verantwortliche Integration das
  Problem in dieser Session erneut feststellt - genau dieses Feld wird jetzt
  korrekt ausgewertet, daher stimmt die Anzahl jetzt mit Einstellungen →
  System → Reparaturen überein
- Update-Popup zeigt jetzt zusätzlich zu „Update-Notizen öffnen" auch einen
  „Jetzt installieren"-Button
- Kopfzeile (Titel + Icon) über `show_title` ein-/ausblendbar

### 0.0.1b0 – Vorabversion (Pre-Release)

- Erste veröffentlichte Version, als Beta gekennzeichnet
- Drei Sensoren (Benachrichtigungen, Updates, Reparaturen) mit `items`- und
  `summary`-Attribut
- Dashboard-Karte mit Tabs, Suche, Filterchips, Detail-Popup
- Kategorien einzeln ein-/ausblendbar (`show_notifications`, `show_updates`,
  `show_repairs`)
- Farben je Kategorie frei wählbar (Swatch + Texteingabe, „Alle Farben
  zurücksetzen")
- Frei wählbares Kopf-Icon (Standard: `mdi:bell-badge-outline`)

## Bekannte Einschränkungen

- **Persistent Notifications** sind in Home Assistant kein regulärer Entity-Typ
  und haben keine offizielle Python-API. Diese Integration liest sie defensiv
  über einen internen Speicherort von `persistent_notification` aus (mit
  Try/Except). Ändert sich das in einer künftigen HA-Version, bleibt die
  Kategorie „Benachrichtigungen" schlicht leer - es gibt keinen Fehler, aber
  ggf. muss `sensor.py` angepasst werden.
- Updates und Reparaturen nutzen ausschliesslich offizielle, öffentliche
  Home-Assistant-APIs (`update.*`-Entities bzw. die Issue Registry) und sind
  entsprechend stabiler.
- Die Karte kommt ohne grafischen Spalten-Editor wie bei FRITZ!Box Netzwerk,
  da es sich um eine Listen- statt Tabellenansicht handelt - passend zum
  Inhalt (Titel + Beschreibung statt vieler kurzer Spaltenwerte).
- Ungetestet gegen eine echte Home-Assistant-Instanz - vor dem produktiven
  Einsatz bitte einmal gegenprüfen, insbesondere die persistent_notification-
  Anbindung.

## Icon

Das Icon liegt unter `custom_components/notification_center/brand/` (`icon.png`
256×256, `icon@2x.png` 512×512). Seit Home Assistant 2026.3 reicht das aus -
ein lokaler `brand/`-Ordner direkt in der Integration wird automatisch erkannt
und hat Vorrang vor der zentralen `home-assistant/brands`-Datenbank. Eine
separate Einreichung per Pull Request ist damit nicht mehr nötig; einzig auf
älteren Home-Assistant-Versionen (vor 2026.3) greift das Icon nicht und es
erscheint stattdessen ein Platzhalter.

## Lizenz

MIT
