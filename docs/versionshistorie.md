# Versionshistorie

> Neueste Version zuerst. Die Einträge 1.1.1b2, 1.1.1b1 und 1.0.0 stehen auch in den fünf README-Dateien.

### 1.1.1b2 (Vorabversion) - Eingänge: Zuordnung selbst festlegen

- **Eingänge (Zahnrad):** Ein beliebiges Home-Assistant-Ereignis oder der neue Service `notification_center.inbound` (Feld `rule`, beliebige weitere Felder) wird über Vorlagen Titel, Text und Schlüssel zugeordnet
- **Stufe zuordnen:** fest, oder aus einem Feld über eine Wertetabelle (z. B. `error=critical, warning=warning`)
- **Schließbedingung** als Vorlage (z. B. `{{ data.count | int == 0 }}`), gleicher Schlüssel aktualisiert dieselbe Meldung
- **Letzter Inhalt:** Jede Regel zeigt den zuletzt empfangenen Inhalt, damit die echten Feldnamen sichtbar sind (lokal gespeichert, höchstens 1,5 KB, nie im Log)
- Watchman-Vorlage auch für Eingänge; Beispiel `examples/inbound_watchman.yaml`
- **Neue Websocket-Befehle (nur Administratoren):** `set_inbound`, `delete_inbound`
- Nach dem Update Home Assistant neu starten und den Browser-Cache leeren (Strg+F5)

### 1.1.1b1 (Vorabversion) - Herkunft, Stufen-Zuordnung, Import

- **Herkunft:** Jede Meldung zeigt das Logo der Ursprungs-Integration (Brand-Proxy von Home Assistant, sonst das Symbol der Quelle) in der Liste und im Popup
- **Popup mit Integrations-Karte:** Der Klick auf eine Meldung öffnet das Popup. Hat die Quelle eine Karte (Feld `card` in der Anmeldung) oder hast du im Zahnrad eine eingetragen, erscheint sie darin. Dazu der Knopf „Integration öffnen“
- **Stufen-Zuordnung:** Im Zahnrad (Quellen) legst du je Meldungsart fest, ob sie kritisch, Warnung, Info oder in Ordnung ist. Die Wahl gilt für Liste, Sortierung, Chips und Push; „Vorgabe“ stellt die Stufe der Quelle wieder her. Offene Meldungen werden sofort umgestellt
- **Import:** Neuer Bereich **Importe** im Zahnrad. Regeln machen aus beliebigen Entitäten Meldungen (Modus Zahl größer 0 oder Zustand ist einer von …, Titel und Nachricht als Home-Assistant-Vorlage, Stufe, Logo-Domain). Die Watchman-Vorlage füllt das Formular für `sensor.watchman_missing_entities`
- **Neuer Service `notification_center.report`:** meldet Text von Automationen, Scripts und Integrationen, die eine beliebige Aktion aufrufen können (z. B. `watchman.report` mit `action`). Gleicher `key` aktualisiert dieselbe Meldung, `state: resolved` schließt sie
- **Schnittstelle:** Die Anmeldung kennt optional `domain` und `card` (Schema 1 bleibt kompatibel)
- **Neue Websocket-Befehle (nur Administratoren):** `set_severity`, `set_card`, `set_import`, `delete_import`
- Behoben: Texte aus Platzhaltern wurden beim Zusammensetzen auf 200 Zeichen gekürzt (jetzt 2000)
- Die Einstellungen (Stufen, Popup-Karten, Import-Regeln) liegen im Speicher der Integration und überstehen Neustarts
- Nach dem Update Home Assistant neu starten und den Browser-Cache leeren (Strg+F5)

### 1.0.0 - Meldungen der Integrationen, Lautlos-Modus, Zahnrad, fünf Sprachen

- **Meldungen:** Neuer Tab und neuer Sensor `sensor.notification_center_meldungen`. Integrationen melden über den Event-Bus (`notification_center_register`, `_report`, `_sync`, `_ping`, Schema 1). Sortierung nach Dringlichkeit (kritisch, Warnung, Info, in Ordnung), Quittieren, Verlauf (30 Tage, höchstens 200, einstellbar)
- **Lautlos-Modus** (keine Push-Nachrichten, Meldungen bleiben sichtbar) und **„Kritische trotzdem zustellen“**
- **Zustellung je Dringlichkeit** über die Empfänger-Profile; Bündeln ab der 6. gleichartigen Meldung in 10 Sekunden; Testmeldung zum Prüfen
- **Zahnrad-Tab** mit App-Version, Quellenübersicht, Optionen, Wartung (Zwei-Klick-Bestätigung) und Ereignisprotokoll
- **Version und Update-Hinweis:** an drei Stellen (Zahnrad, Editor, Optionen-Dialog), Abfrage von GitHub alle 12 Stunden, bei Beta/RC auch Pre-releases
- **Karte:** Statistik-Chips, Sortierauswahl, Banner, Toast, Popup mit Akkordeon, „Alle löschen“ verlangt jetzt zwei Klicks, Container-Query (nur Symbole unter ca. 480 px), Escape schließt das Popup
- **Neue Karten-Schlüssel:** `default_tab`, `default_sort`, `show_messages`, `show_settings`, `show_filter_bar`, `show_stats`, `max_rows`, `zoom`, `read_only`, `color_message`, `color_error`, `color_warning`, `color_info`, `color_success`, `entities.messages`
- **Fünf Sprachen** (de, en, nl, fr, es) in Karte, Optionen-Dialog, Services und Fehlermeldungen; Editor bleibt deutsch
- Neue Dateien: `brand/logo.png`, `brand/logo@2x.png`, `LICENSE`, `diagnostics.py` (anonymisiert), `update_check.py`, `hub.py`, `examples/`
- Hash-Header in allen `.py`, `.js` und `.yaml`
- Behoben: Die großen Sensor-Attribute (`items` usw.) werden nicht mehr in der Langzeitdatenbank gespeichert
- Geändert: Änderungen an Lautlos-Modus, Zustellung und Verlauf laden die Integration nicht mehr neu (nur Profil-Änderungen tun das)
- Der Tab „Meldungen“ ist jetzt der Standard-Starttab (über `default_tab` änderbar)
- Nach dem Update Home Assistant neu starten und den Browser-Cache leeren (Strg+F5)

### 0.0.8 – Scripts und Blueprints in der Karte bauen

- Neues Accordion **Scripts & Blueprints** unter der Liste mit den Abschnitten
  *Script erstellen*, *Script-Blueprint erstellen* und *Automations-Blueprint
  erstellen*
- Scripts werden über die reguläre Script-Editor-API angelegt (Validierung und
  automatisches Neuladen inklusive); bestehende Scripts werden nie
  überschrieben
- Blueprints schreibt die Integration über die offizielle Blueprint-Schnittstelle
  von Home Assistant nach `blueprints/<script|automation>/notification_center/`;
  vorhandene Blueprints lassen sich bewusst überschreiben
- Optional: Nachricht beim Script-Aufruf übergeben (Feld `message`)
- Neue Websocket-Befehle `notification_center/build_script` und
  `notification_center/create_blueprint` (nur Administratoren)
- Editor: neuer Schalter *Bereich „Scripts & Blueprints“ anzeigen*
- Fehlermeldungen zeigen den eigentlichen Grund (z. B. von der Script-Validierung)
- Nach dem Update Home Assistant neu starten und den Browser-Cache leeren

### 0.0.7 – Senden-Tab und Empfänger-Profile

- Neuer Tab **Senden** in der Karte: Profil wählen, optional Titel, Nachricht,
  Dringlichkeit (Normal / Hoch / Dringend), Senden mit Rückmeldung
  („Gesendet ✓“ bzw. Fehlermeldung)
- **Empfänger-Profile** zentral in der Integration (*Konfigurieren*):
  hinzufügen, bearbeiten, entfernen. Smartphone-Wechsel = eine Änderung am
  Profil
- Neuer Service `notification_center.send` (Empfänger, Nachricht, Titel,
  Dringlichkeit) - nutzbar in Automationen, Scripts und Blueprints
- Neuer Sensor **Profile** (`sensor.notification_center_profile`) liefert die
  Profile für die Karte
- Dringlichkeit „Dringend“ umgeht den Lautlos-Modus (Android Alarm-Kanal,
  iOS Critical Alert); bei E-Mail als Betreff-Präfix
- Editor: neuer Schalter *Tab „Senden“ anzeigen*, Sensor-Zuweisung *Profile*
  und eigene Farbe *Senden*
- Das Formular bleibt beim Tippen unangetastet, auch wenn Home Assistant
  zwischendurch Updates schickt
- Nach dem Update Home Assistant neu starten und den Browser-Cache leeren

### 0.0.6 – Trennlinien in den Widgets

- Hellgraue Trennlinie zwischen den Einträgen, vor „+ n weitere“ und im Widget
  „Alle drei zusammen“ zwischen den Kategorien
- Länge der Linie über die Variable `line` am Anfang des Quelltexts anpassbar

### 0.0.5 – Widgets im Stil einer Mail-Übersicht

- Widget-Quelltexte neu: Kopfzeile „Kategorie (Anzahl)“, darunter die ersten
  drei Einträge (Titel fett, Nachricht klein/grau), „+ n weitere“, grünes
  „✓ Alles erledigt“ bei 0 Einträgen
- *Alle drei zusammen*: je Kategorie Kopfzeile plus die ersten zwei Titel
- Texte werden maskiert (`| e`) und gekürzt, damit Sonderzeichen wie `&` oder
  `<` das Widget nicht stören

### 0.0.4 – Karte erscheint unter „Ressourcen"

- Die Karte wird jetzt wie bei FRITZ!Box Anrufe als **Lovelace-Ressource**
  (Typ `module`) angelegt und ist damit unter *Einstellungen → Dashboards →
  Ressourcen verwalten* sichtbar. Bei einem Update wird der Eintrag mit
  neuer `?v=`-Version aktualisiert, es entstehen keine Duplikate.
- `add_extra_js_url` entfällt (doppeltes Laden kann in der Companion-App dazu
  führen, dass die Karte gar nicht geladen wird).
- Im YAML-Modus muss die Ressource
  `/notification_center_files/notification-center-card.js` (Typ `module`)
  weiterhin von Hand eingetragen werden.
- Nach dem Update Home Assistant neu starten und den Browser-Cache leeren.

### 0.0.3 – Schönere Android-Widgets

- Widget-Quelltexte neu gestaltet: farbige Zahl (Farben aus dem Editor),
  korrekte Einzahl/Mehrzahl statt „(en)/(s)", Kurztext klein darunter, grünes
  „✓ Alles erledigt" bei 0 Einträgen
- Behebt zusammengezogene Zeilen im „Alle drei"-Widget: es werden jetzt
  `<br>`-Umbrüche verwendet
- Quelltext aktualisiert sich live, wenn im Abschnitt *Farben* eine Farbe
  geändert wird

### 0.0.2 – Farbwähler, Suche, Kopieren je Sensor, Widgets zuletzt

- **Bugfix Farbauswahl:** Editor nach dem Vorbild von FRITZ!Box Anrufe neu
  aufgebaut (Light-DOM statt Shadow-DOM, native Abschnitte, unveränderliche
  Konfiguration, `config-changed` mit `bubbles`/`composed`). Swatch und Textfeld
  zeigen den aktuell wirksamen Wert an.
- **Bugfix Suche:** Die Suche baut nicht mehr die ganze Karte neu auf, sondern
  nur die Liste - das Suchfeld behält Fokus und Tastatur, auch bei
  Home-Assistant-Updates während des Tippens.
- **Bugfix Kopieren:** Fallback für die Companion-App (unsicherer Kontext ohne
  Clipboard-API) - das Hilfsfeld liegt jetzt im Editor-Dialog statt in
  `document.body`. Rückmeldung „kopiert" / „nicht möglich", bei Fehlschlag wird
  der Text zum manuellen Kopieren markiert.
- Quelltext kopieren jetzt **je Sensor einzeln** (Anzahl + `summary`) plus
  „Alle drei zusammen"
- Editor-Reihenfolge: Darstellung, Kategorien, Farben, **Widgets als letzter
  Abschnitt**

### 0.0.1b4 – Such-/Farbfeld-Fix, Widgets-Abschnitt, Icon leerbar, README-Icon

- **Bugfix Suche:** Zeichen gingen teilweise verloren, weil jede Eingabe die
  komplette Karte neu aufgebaut hat (`innerHTML`) und dabei das Eingabefeld
  samt Fokus zerstört wurde. Fokus und Cursor-Position werden jetzt vor dem
  Neuaufbau gesichert und danach wiederhergestellt.
- **Bugfix Farbfeld (Editor):** aus demselben Grund - jeder Tastendruck löst
  über `config-changed` einen erneuten `setConfig()`-Aufruf aus, der das
  Textfeld sonst mitten im Tippen auf den letzten bestätigten Wert
  zurückgesetzt hat. Das Feld wird jetzt nicht mehr angefasst, während es den
  Fokus hat.
- **Bugfix Icon leeren:** ein im Editor geleertes Icon-Feld wurde beim
  nächsten Sync sofort wieder mit dem Standard-Icon aufgefüllt. Ein
  ausdrücklich leeres Icon wird jetzt respektiert - die Kopfzeile zeigt dann
  gar kein Icon, nur den Titel.
- Editor-Abschnitt *Sensoren* umbenannt in **Widgets**: enthält weiterhin die
  drei Sensor-Zuweisungen, zusätzlich den fertigen Android-Template-Widget-
  Quelltext mit *Quelltext kopieren*-Button
- Icon im README zeigt nicht mehr auf einen relativen Pfad (den HACS beim
  Rendern nicht auflöst), sondern auf die absolute `raw.githubusercontent.com`-
  URL

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
