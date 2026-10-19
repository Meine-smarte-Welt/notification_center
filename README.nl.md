[🇩🇪 Deutsch](README.md) · [🇬🇧 English](README.en.md) · 🇳🇱 Nederlands · [🇫🇷 Français](README.fr.md) · [🇪🇸 Español](README.es.md)

# Notification Center

<p align="center">
  <img src="https://raw.githubusercontent.com/Meine-smarte-Welt/notification_center/main/custom_components/notification_center/brand/icon.png" width="96" alt="Notification Center">
</p>

Een Home Assistant-integratie die **meldingen van je integraties**, **notificaties**, **updates** en **reparaties** samenbrengt in één dashboardkaart - met stille modus, pushbezorging via ontvangersprofielen, Android-widget en snel verzenden.

## Functies

- **Meldingen:** integraties (bijv. Fritz!Box, Zigbee2MQTT Manager, Matter Manager) melden gebeurtenissen aan het Notification Center, gesorteerd op urgentie: kritiek, waarschuwing, info, in orde
- **Stille modus:** houdt pushberichten tegen; meldingen blijven zichtbaar in kaart en widget; kritieke meldingen kunnen dit omzeilen
- **Bezorging per urgentie:** push via je ontvangersprofielen (nieuwe telefoon = één wijziging)
- **Bronnenoverzicht:** welke integratie is aangemeld, welke versie ze heeft en welke soorten meldingen ze uitzet
- **Geschiedenis:** opgeloste en bevestigde meldingen (standaard 30 dagen, maximaal 200)
- Vier lijstsensoren plus een profielsensor, Android-templatewidget, snel verzenden, scripts en blueprints
- Kaart met tabs, statistiekchips, zoeken, sorteren, detailpopup, banner, bevestiging met twee klikken en vrij kiesbare kleuren
- Alles in **vijf talen**: Duits, Engels, Nederlands, Frans, Spaans

## Vereisten

- Home Assistant 2025.6 of nieuwer
- HACS (aanbevolen) of handmatige installatie
- Optioneel: de zusterintegraties in versie 1.0.0, zodat meldingen aankomen

## Installatie

**HACS:** voeg de aangepaste repository `https://github.com/Meine-smarte-Welt/notification_center` toe (categorie *Integratie*), installeer „Notification Center” en herstart Home Assistant. Voorlopige versies (bèta/RC) zie je alleen als je in HACS „Bètaversies tonen” inschakelt.

**Handmatig:** kopieer de map `custom_components/notification_center` naar je `config`-map en herstart.

## Instellen

Instellingen → Apparaten en diensten → **Integratie toevoegen** → „Notification Center”. Er zijn geen inloggegevens nodig, er is maar één instantie.

**Ontvangersprofielen:** *Configureren* → *Profiel toevoegen* (naam, soort telefoon/e-mail, `notify`-doel). Wissel je van telefoon, dan verander je alleen het doel van het profiel.

**Stille modus, bezorging, geschiedenis:** ook onder *Configureren* of direct in de kaart (tandwiel → Opties).

## De kaart

De tabs (vaste volgorde, het tandwiel-tabblad is altijd het laatste):

- **Meldingen:** meldingen van integraties, chips met teller (Kritiek/Waarschuwing/Info), geschiedenis, bevestigen
- **Notificaties:** blijvende notificaties van Home Assistant
- **Updates:** beschikbare updates, installeren in de popup
- **Reparaties:** openstaande reparaties
- **Versturen:** snel verzenden naar een profiel
- **Tandwiel:** app-versie, bronnen, opties, onderhoud, gebeurtenissen

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

| Sleutel | Betekenis |
|---|---|
| `title / show_title / icon` | Titel, titel tonen/verbergen, kopicoon |
| `default_tab` | Starttab (`messages`, `notifications`, `updates`, `repairs`, `send`, `settings`) |
| `default_sort` | Standaardsortering (`default`, `newest`, `oldest`, `title`) |
| `show_messages … show_settings` | Elke categorie apart aan/uit (minstens één blijft zichtbaar) |
| `show_search / show_filter_bar / show_stats` | Zoekveld, sorteerkeuze, statistiek-/filterchips |
| `max_rows` | Maximaal aantal rijen (0 = alle) |
| `zoom` | Schaling van de kaart in procenten (50-150) |
| `read_only` | verbergt alle bedieningselementen die iets wijzigen |
| `show_builder` | Gebied „Scripts & Blueprints” |
| `entities.*` | Sensoren (`messages` is nieuw, standaard-ID `sensor.notification_center_meldungen`) |

## Kleuren

Alle kleuren zijn per kaart instelbaar (editorsectie *Kleuren*). Leeg = themastandaard. Toegestaan: hex, `rgb()`, `hsl()` en `var(--…)`.

| Sleutel | Standaard |
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

`notification_center.send` verstuurt een bericht naar een ontvangersprofiel. „Dringend” omzeilt op telefoons de stille modus (Android: alarmkanaal, iOS: Critical Alert); bij e-mail komt een voorvoegsel in het onderwerp.

```yaml
action: notification_center.send
data:
  recipient: Thorsten Handy
  title: Waschmaschine
  message: Die Wäsche ist fertig.
  urgency: normal               # normal | high | critical
```

## Gebeurtenissen (interface voor integraties)

Integraties spreken het Notification Center aan via de Home Assistant-eventbus (geen MQTT). Alle payloads bevatten `schema: 1`. Het Notification Center is voor integraties **optioneel**: is het niet geïnstalleerd, dan gebeurt daar niets.

| Gebeurtenis | Richting | Doel |
|---|---|---|
| `notification_center_register` | Integratie → NC | catalogus van meldingssoorten (urgentie, icoon, teksten in vijf talen, schakelstand) |
| `notification_center_report` | Integratie → NC | één melding: `state` = `active` of `resolved`, stabiele `key`, `subject`, `placeholders`, `initial` |
| `notification_center_sync` | Integratie → NC | welke keys van een oplosbare soort actief zijn; alle andere open meldingen worden stil gesloten |
| `notification_center_ping` | NC → integraties | bij het starten van het NC; elke integratie antwoordt met register en sync |

- Meldingen bevatten alleen sleutels en plaatshouders. De teksten komen uit de catalogus van de bron en verschijnen in de taal van Home Assistant (terugval Engels).
- `initial: true` (beginstatus na start/sync) verschijnt in de kaart, maar veroorzaakt **geen** push.
- Niet-oplosbare soorten (bijv. gemist gesprek) blijven staan tot je ze bevestigt; sync sluit ze nooit.
- Telefoonnummers, namen en teksten worden nooit in het log geschreven.

Voorbeeld van een melding:

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

| Sensor | Status | Attributen |
|---|---|---|
| **Meldingen** | aantal open meldingen | `items`, `summary`, `by_severity`, `history`, `sources`, `settings`, `app`, `log` |
| **Notificaties** | aantal | `items`, `summary` |
| **Updates** | aantal | `items`, `summary` |
| **Reparaties** | aantal | `items`, `summary` |
| **Profielen** | aantal profielen | `items`, `summary` |

De grote attributen worden niet in de langetermijndatabase opgeslagen.

## Stille modus en bezorging

- **Stille modus aan:** geen pushberichten. Meldingen blijven zichtbaar in kaart en widget. Een banner in de kaart wijst hierop.
- **Kritieke toch bezorgen** (standaard aan): `critical` omzeilt de stille modus via de urgentiefunctie van de telefoonnotificatie.
- **Bezorging per urgentie:** zonder eigen keuze krijgen kritieke meldingen en waarschuwingen push op alle telefoonprofielen; info en in orde alleen kaart en widget.
- **Bundelen:** de eerste 5 gelijksoortige meldingen binnen 10 seconden gaan afzonderlijk uit, verdere worden samengevoegd tot **één** push („N meldingen meer”). Alle afzonderlijke meldingen blijven in de lijst.

## Versieweergave en updatemelding

De versie staat op drie plaatsen: in het tandwiel (App-versie), bovenaan in de kaarteditor (`Kaart 1.0.0 · Integratie 1.0.0`) en in het optiesdialoog. De integratie vraagt bij het starten en daarna elke 12 uur `api.github.com` (bij bèta/RC ook voorlopige versies). Nieuwe versie → oranje melding, „↑” bij het tandwiel; kaart en integratie met verschillende versie (browsercache) → ook oranje; GitHub onbereikbaar → „Controle niet mogelijk”, de kaart blijft gewoon werken.

## Instellingen (tandwiel)

Vaste volgorde van de accordeons: **App-versie** · **Bronnen** · **Opties** (stille modus, bezorging) · **Onderhoud** (testmelding, alles bevestigen, geschiedenis wissen, telkens met bevestiging met twee klikken) · **Gebeurtenissen** (log sinds de start, zonder inhoud). Alleen beheerders mogen wijzigen.

## Android-widget

In de kaarteditor (sectie *Widgets*) staat de kant-en-klare brontekst voor een templatewidget van de Companion-app, per sensor of alles samen. De Companion-app toont alleen eenvoudige HTML; scheidingslijnen bestaan uit „─”-tekens (lengte via de variabele `line`). Schakel meldingstoegang voor de Companion-app in, anders ververst het widget maar om de 30 minuten.

## Scripts & Blueprints

Onder de lijst kun je scripts, script-blueprints en automatiserings-blueprints samenklikken (beheerder nodig). Bestaande scripts worden nooit overschreven, blueprints alleen na bevestiging.

## Beveiliging

- Schrijvende acties (bevestigen, schakelaars, onderhoud, testmelding, scripts/blueprints) alleen voor beheerders; invoer wordt in de backend gecontroleerd.
- Alle teksten in de kaart worden geëscaped, kleurwaarden lopen via een toegestane lijst.
- Meldingen bevatten geen inloggegevens; teksten, namen en telefoonnummers komen niet in het log of de diagnose.
- Riskante acties vragen twee klikken in plaats van een browserdialoog.
- De releaselink wordt alleen getoond als hij met `https://github.com/` begint.

## Bekende beperkingen

- **Niet getest op een echte Home Assistant-instantie of met echte telefoons.** Gecontroleerd: de hublogica tegen een gesimuleerde eventbus (14 tests), de kaart in een headless browser met testdata (alle tabs, popup, tandwiel, vijf talen, editor) en syntaxis/JSON. Het gedrag in de echte Home Assistant-interface is **niet getest**.
- **Samenspel met de zusterintegraties niet getest:** alleen gesimuleerde gebeurtenissen, geen echte Fritz!Box-, Zigbee2MQTT- of Matter-data.
- Of „Dringend” op jouw toestel echt de stille modus omzeilt, hangt af van Android-/iOS-instellingen (kanaalrechten, Niet storen, kritieke meldingen). Probeer het met de testmelding.
- E-mailprofielen kunnen technisch voor bezorging gekozen worden, maar e-mail hoort niet bij het geteste bereik van 1.0.0.
- Niet inbegrepen: afzonderlijke apparaten dempen, schema voor de stille modus.
- Blijvende notificaties leest de integratie defensief uit een interne opslag van Home Assistant; verandert dat, dan blijft de categorie leeg.
- De Nederlandse, Franse en Spaanse vertalingen zijn machinaal gemaakt en niet door moedertaalsprekers gecontroleerd - correcties welkom.
- Scripts en blueprints worden alleen aangemaakt; bewerken en verwijderen gebeurt in Home Assistant.

## Probleemoplossing

| Probleem | Oplossing |
|---|---|
| Kaart toont „Custom element doesn’t exist” | Browsercache wissen (Ctrl+F5); in YAML-modus de resource `/notification_center_files/notification-center-card.js` (type `module`) handmatig toevoegen. |
| Tab „Meldingen” ontbreekt | De sensor `sensor.notification_center_meldungen` bestaat pas na de herstart met 1.0.0. Controleer de invoer `entities.messages`. |
| Geen meldingen van een integratie | Tandwiel → Bronnen: is de bron aangemeld? De integratie moet versie 1.0.0 zijn en „meldingen versturen” aan hebben. |
| Geen push | Staat de stille modus aan? Is voor die urgentie een profiel gekozen (tandwiel → Opties)? Controleer met de testmelding. |
| Updatecontrole mislukt | Home Assistant heeft internettoegang tot `api.github.com` nodig; de kaart werkt gewoon door. |

## Bestandsintegriteit

Elke `.py`, `.js` en `.yaml` begint met een SHA256-header (inhoud vanaf regel 2). Controleren met `tail -n +2 bestand.py | sha256sum`. De controlesommen van de JSON-bestanden staan in [docs/datei-integritaet.md](docs/datei-integritaet.md).

## Versiegeschiedenis

### 1.0.0

- Nieuw: **meldingen** van integraties (interface schema 1: register, report, sync, ping), urgentie, geschiedenis, bevestigen, bronnenoverzicht
- Nieuw: **stille modus**, „kritieke toch bezorgen”, **bezorging per urgentie**, bundelen, testmelding
- Nieuw: tandwieltab met app-versie, bronnen, opties, onderhoud, gebeurtenissen; updatemelding via GitHub
- Nieuw: statistiekchips, sorteren, banner, toast, popup met accordeon, `default_tab`, `zoom`, `read_only`, `max_rows`
- Nieuw: **vijf talen** in kaart, opties en services; logo (`logo.png`), diagnose-download, `LICENSE`
- Gewijzigd: het tabblad „Meldingen” is de standaard-starttab (aanpasbaar met `default_tab`)
- Herstart na de update Home Assistant en wis de browsercache (Ctrl+F5)

Alle versies: [docs/versionshistorie.md](docs/versionshistorie.md)

## Licentie

MIT
