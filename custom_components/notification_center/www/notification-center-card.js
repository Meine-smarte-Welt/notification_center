// SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): 31feba26b7be340f4aad10c10c6fec03fe310153e94275278f3c3cef649be211
/**
 * notification-center-card
 *
 * Tabs: Meldungen (Integrationen melden ans Notification Center), Benachrichtigungen,
 * Updates, Reparaturen, Senden und - als letzter Tab - das Zahnrad mit App-Version,
 * Quellen, Optionen (Lautlos-Modus, Zustellung), Wartung und Ereignissen.
 * Aufbau nach dem Design-Master der Schwester-Karten (FRITZ!Box Anrufe/Netzwerk,
 * Matter Manager, Zigbee2MQTT Manager): Banner, Tabs, Statistik-Chips, Suche und
 * Sortierung, Zeilenliste, Detail-Popup mit Akkordeon, Toast.
 *
 * Alle Texte der Karte gibt es in Deutsch, Englisch, Niederländisch, Französisch
 * und Spanisch (Sprache aus hass.language, Rückfall Englisch). Der Karten-Editor
 * bleibt Deutsch (Home Assistant übersetzt Editoren nicht).
 *
 * Erwartete Sensoren (siehe custom_components/notification_center/sensor.py):
 *   state              -> Anzahl offener Einträge
 *   attributes.items   -> Liste der Einzeleinträge
 *   attributes.summary -> ein fertiger Kurztext (fürs Android-Widget)
 * Der Meldungen-Sensor trägt zusätzlich history, sources, settings, app und log.
 * Der Profil-Sensor (entities.recipients) liefert die Empfänger-Profile.
 */

const CARD_VERSION = "1.0.0";
const DEFAULT_TITLE = "Notification Center";
const DEFAULT_ICON = "mdi:bell-badge-outline";
const DEFAULT_MESSAGES_ENTITY = "sensor.notification_center_meldungen";

const I18N = {
  "de": {
    "tab_messages": "Meldungen",
    "tab_notifications": "Benachrichtigungen",
    "tab_updates": "Updates",
    "tab_repairs": "Reparaturen",
    "tab_send": "Senden",
    "tab_settings": "Einstellungen",
    "all_hidden": "Alle Kategorien sind ausgeblendet",
    "none_open": "Keine offenen Einträge",
    "search": "Suchen …",
    "delete": "Löschen",
    "delete_all": "Alle löschen",
    "confirm": "Wirklich?",
    "saved": "Gespeichert",
    "admin_only": "Nur Administratoren können das ändern.",
    "err_unknown": "Unbekannter Fehler",
    "error_prefix": "Fehler: {reason}",
    "just_now": "Gerade eben",
    "ago_minute_1": "Vor 1 Minute",
    "ago_minute_n": "Vor {n} Minuten",
    "ago_hour_1": "Vor 1 Stunde",
    "ago_hour_n": "Vor {n} Stunden",
    "ago_day_1": "Vor 1 Tag",
    "ago_day_n": "Vor {n} Tagen",
    "f_all": "Alle",
    "f_running": "Läuft",
    "f_fixable": "Behebbar",
    "f_critical": "Kritisch",
    "f_history": "Verlauf",
    "sev_critical": "Kritisch",
    "sev_warning": "Warnung",
    "sev_info": "Info",
    "sev_ok": "In Ordnung",
    "sort_default": "Standard",
    "sort_newest": "Neueste zuerst",
    "sort_oldest": "Älteste zuerst",
    "sort_title": "Name A–Z",
    "banner_offline": "Meldungen nicht verfügbar – der Sensor „Meldungen“ ist nicht erreichbar.",
    "banner_silent": "Lautlos-Modus aktiv – es gehen keine Push-Nachrichten raus.",
    "banner_update": "Neue Version {v} verfügbar.",
    "msg_none": "Keine Meldungen",
    "msg_no_history": "Noch kein Verlauf",
    "ack": "Quittieren",
    "ack_all": "Alle quittieren",
    "acked_n": "{n} Meldungen quittiert",
    "acked": "Quittiert ✓",
    "status_resolved": "Erledigt",
    "status_ack": "Quittiert",
    "pop_info": "Informationen",
    "pop_source": "Quelle",
    "pop_technical": "Technische Details",
    "k_severity": "Dringlichkeit",
    "k_time": "Zeit",
    "k_status": "Status",
    "k_source": "Quelle",
    "k_object": "Objekt",
    "k_type": "Art",
    "install_now": "Jetzt installieren",
    "installing": "Update läuft",
    "installing_dots": "Update läuft …",
    "release_notes": "Update-Notizen öffnen",
    "goto_repairs": "Zu den Reparaturen",
    "close": "Schließen",
    "send_recipient": "Empfänger",
    "send_title_opt": "Titel (optional)",
    "send_message": "Nachricht",
    "send_urgency": "Dringlichkeit",
    "send_submit": "Senden",
    "sending": "Wird gesendet …",
    "sent_ok": "Gesendet ✓",
    "no_profiles": "Noch keine Empfänger-Profile angelegt",
    "no_profiles_hint": "Einstellungen → Geräte & Dienste → Notification Center → Konfigurieren",
    "urg_normal": "Normal",
    "urg_high": "Hoch",
    "urg_critical": "Dringend",
    "hint_high": "Sofortige Zustellung, bricht Fokus-Modi (iOS) durch.",
    "hint_critical": "Umgeht den Lautlos-Modus (Android: Alarm-Kanal, iOS: Critical Alert).",
    "builder_title": "Scripts & Blueprints",
    "sec_script": "Script erstellen",
    "sec_script_desc": "Legt ein dauerhaftes Script an, das eine Nachricht an ein Profil sendet. Es lässt sich in jeder Automation wiederverwenden.",
    "sec_script_submit": "Script erstellen",
    "sec_bps": "Script-Blueprint erstellen",
    "sec_bps_desc": "Vorlage für Scripts: Profil, Titel, Nachricht und Dringlichkeit sind Vorgaben, die du beim Anlegen eines Scripts aus dem Blueprint änderst.",
    "sec_bp_submit": "Blueprint speichern",
    "sec_bpa": "Automations-Blueprint erstellen",
    "sec_bpa_desc": "Vorlage für Automationen: Erreicht eine Entität einen Zustand, wird die Nachricht gesendet. Entität und Zustand wählst du erst beim Verwenden.",
    "b_name_bp": "Name des Blueprints",
    "b_name_script": "Name des Scripts",
    "b_ph_bp": "z. B. Tür offen melden",
    "b_ph_script": "z. B. Waschmaschine fertig",
    "b_desc_opt": "Beschreibung (optional)",
    "b_default_profile": "Vorgabe-Profil",
    "b_default_message": "Vorgabe-Nachricht",
    "b_message_at_call": "Nachricht erst beim Aufruf übergeben (der Text oben ist dann nur der Rückfall)",
    "b_profile_placeholder": "Name des Profils",
    "b_profile_tip": "Tipp: Weise der Karte den Profil-Sensor zu, dann kannst du Profile hier antippen.",
    "b_overwrite": "Überschreiben",
    "b_open": "Öffnen",
    "b_creating": "Wird angelegt …",
    "b_need_name": "Bitte einen Namen eingeben.",
    "b_need_profile": "Bitte ein Profil wählen.",
    "b_need_message": "Bitte eine Nachricht eingeben.",
    "b_script_exists": "Das Script „{id}“ existiert bereits - bitte einen anderen Namen wählen.",
    "b_script_created": "Script angelegt: script.{id} ✓",
    "b_script_open": "Script öffnen",
    "b_bp_updated": "Blueprint aktualisiert ✓",
    "b_bp_saved": "Blueprint gespeichert ✓",
    "b_bp_open": "Blueprints öffnen",
    "set_version": "App-Version",
    "v_integration": "Integration",
    "v_card": "Karte",
    "v_latest": "Neueste Version",
    "v_checked": "Zuletzt geprüft",
    "v_check_now": "Jetzt prüfen",
    "v_checking": "Prüfe …",
    "v_release": "Release ansehen",
    "v_new": "Neue Version verfügbar. Aktualisiere über HACS und starte Home Assistant neu. Danach Browser neu laden (Strg+F5).",
    "v_mismatch": "Karte und Integration haben unterschiedliche Versionen (Browser-Cache). Browser neu laden (Strg+F5).",
    "v_failed": "Prüfung nicht möglich",
    "v_ok": "Aktuell",
    "v_unknown": "Noch nicht geprüft",
    "set_sources": "Quellen",
    "src_none": "Noch keine Integration angemeldet. Integrationen melden sich selbst an, sobald sie die Schnittstelle nutzen.",
    "src_seen": "angemeldet",
    "src_unseen": "seit dem Start nicht gemeldet",
    "src_off": "Quelle sendet nicht",
    "src_open": "{n} offen",
    "set_options": "Optionen",
    "opt_silent": "Lautlos-Modus",
    "opt_silent_hint": "Keine Push-Nachrichten. Meldungen bleiben in Karte und Widget sichtbar.",
    "opt_bypass": "Kritische trotzdem zustellen",
    "opt_delivery": "Push-Zustellung je Dringlichkeit",
    "opt_no_profiles": "Lege zuerst Empfänger-Profile an (Konfigurieren).",
    "set_maint": "Wartung",
    "m_test": "Testmeldung senden",
    "m_test_hint": "Prüft Zustellung und Lautlos-Modus mit der gewählten Dringlichkeit.",
    "m_test_sent": "Testmeldung gesendet",
    "m_clear_history": "Verlauf leeren",
    "m_cleared": "Verlauf geleert",
    "set_events": "Ereignisse",
    "ev_none": "Noch keine Ereignisse seit dem Start.",
    "ev_register": "Quelle angemeldet",
    "ev_report": "Meldung",
    "ev_sync": "Abgleich",
    "ev_ack": "Quittiert",
    "ev_push": "Push",
    "ev_push_silent": "Push zurückgehalten (Lautlos-Modus)",
    "w_more": "weitere",
    "w_done": "Alles erledigt",
    "w_all": "Alle zusammen",
    "w_none_messages": "Keine Meldungen"
  },
  "en": {
    "tab_messages": "Messages",
    "tab_notifications": "Notifications",
    "tab_updates": "Updates",
    "tab_repairs": "Repairs",
    "tab_send": "Send",
    "tab_settings": "Settings",
    "all_hidden": "All categories are hidden",
    "none_open": "No open entries",
    "search": "Search …",
    "delete": "Delete",
    "delete_all": "Delete all",
    "confirm": "Sure?",
    "saved": "Saved",
    "admin_only": "Only administrators can change this.",
    "err_unknown": "Unknown error",
    "error_prefix": "Error: {reason}",
    "just_now": "Just now",
    "ago_minute_1": "1 minute ago",
    "ago_minute_n": "{n} minutes ago",
    "ago_hour_1": "1 hour ago",
    "ago_hour_n": "{n} hours ago",
    "ago_day_1": "1 day ago",
    "ago_day_n": "{n} days ago",
    "f_all": "All",
    "f_running": "Running",
    "f_fixable": "Fixable",
    "f_critical": "Critical",
    "f_history": "History",
    "sev_critical": "Critical",
    "sev_warning": "Warning",
    "sev_info": "Info",
    "sev_ok": "OK",
    "sort_default": "Default",
    "sort_newest": "Newest first",
    "sort_oldest": "Oldest first",
    "sort_title": "Name A–Z",
    "banner_offline": "Messages unavailable – the “Messages” sensor is not reachable.",
    "banner_silent": "Silent mode is on – no push messages are sent.",
    "banner_update": "New version {v} available.",
    "msg_none": "No messages",
    "msg_no_history": "No history yet",
    "ack": "Acknowledge",
    "ack_all": "Acknowledge all",
    "acked_n": "{n} messages acknowledged",
    "acked": "Acknowledged ✓",
    "status_resolved": "Resolved",
    "status_ack": "Acknowledged",
    "pop_info": "Information",
    "pop_source": "Source",
    "pop_technical": "Technical details",
    "k_severity": "Urgency",
    "k_time": "Time",
    "k_status": "Status",
    "k_source": "Source",
    "k_object": "Object",
    "k_type": "Type",
    "install_now": "Install now",
    "installing": "Update running",
    "installing_dots": "Update running …",
    "release_notes": "Open release notes",
    "goto_repairs": "Go to repairs",
    "close": "Close",
    "send_recipient": "Recipient",
    "send_title_opt": "Title (optional)",
    "send_message": "Message",
    "send_urgency": "Urgency",
    "send_submit": "Send",
    "sending": "Sending …",
    "sent_ok": "Sent ✓",
    "no_profiles": "No recipient profiles yet",
    "no_profiles_hint": "Settings → Devices & services → Notification Center → Configure",
    "urg_normal": "Normal",
    "urg_high": "High",
    "urg_critical": "Urgent",
    "hint_high": "Immediate delivery, breaks through Focus modes (iOS).",
    "hint_critical": "Bypasses silent mode (Android: alarm channel, iOS: Critical Alert).",
    "builder_title": "Scripts & Blueprints",
    "sec_script": "Create script",
    "sec_script_desc": "Creates a permanent script that sends a message to a profile. It can be reused in any automation.",
    "sec_script_submit": "Create script",
    "sec_bps": "Create script blueprint",
    "sec_bps_desc": "Template for scripts: profile, title, message and urgency are defaults you change when creating a script from the blueprint.",
    "sec_bp_submit": "Save blueprint",
    "sec_bpa": "Create automation blueprint",
    "sec_bpa_desc": "Template for automations: when an entity reaches a state, the message is sent. You pick entity and state when using it.",
    "b_name_bp": "Blueprint name",
    "b_name_script": "Script name",
    "b_ph_bp": "e.g. Report door open",
    "b_ph_script": "e.g. Washing machine done",
    "b_desc_opt": "Description (optional)",
    "b_default_profile": "Default profile",
    "b_default_message": "Default message",
    "b_message_at_call": "Pass the message when calling (the text above is then only the fallback)",
    "b_profile_placeholder": "Profile name",
    "b_profile_tip": "Tip: assign the profile sensor to the card, then you can tap profiles here.",
    "b_overwrite": "Overwrite",
    "b_open": "Open",
    "b_creating": "Creating …",
    "b_need_name": "Please enter a name.",
    "b_need_profile": "Please choose a profile.",
    "b_need_message": "Please enter a message.",
    "b_script_exists": "The script “{id}” already exists - please choose another name.",
    "b_script_created": "Script created: script.{id} ✓",
    "b_script_open": "Open script",
    "b_bp_updated": "Blueprint updated ✓",
    "b_bp_saved": "Blueprint saved ✓",
    "b_bp_open": "Open blueprints",
    "set_version": "App version",
    "v_integration": "Integration",
    "v_card": "Card",
    "v_latest": "Latest version",
    "v_checked": "Last checked",
    "v_check_now": "Check now",
    "v_checking": "Checking …",
    "v_release": "View release",
    "v_new": "New version available. Update via HACS and restart Home Assistant. Then reload the browser (Ctrl+F5).",
    "v_mismatch": "Card and integration have different versions (browser cache). Reload the browser (Ctrl+F5).",
    "v_failed": "Check not possible",
    "v_ok": "Up to date",
    "v_unknown": "Not checked yet",
    "set_sources": "Sources",
    "src_none": "No integration registered yet. Integrations register themselves once they use the interface.",
    "src_seen": "registered",
    "src_unseen": "not seen since start",
    "src_off": "Source is not sending",
    "src_open": "{n} open",
    "set_options": "Options",
    "opt_silent": "Silent mode",
    "opt_silent_hint": "No push messages. Messages stay visible in the card and widget.",
    "opt_bypass": "Still deliver critical messages",
    "opt_delivery": "Push delivery by urgency",
    "opt_no_profiles": "Add recipient profiles first (Configure).",
    "set_maint": "Maintenance",
    "m_test": "Send test message",
    "m_test_hint": "Tests delivery and silent mode with the chosen urgency.",
    "m_test_sent": "Test message sent",
    "m_clear_history": "Clear history",
    "m_cleared": "History cleared",
    "set_events": "Events",
    "ev_none": "No events since start.",
    "ev_register": "Source registered",
    "ev_report": "Message",
    "ev_sync": "Sync",
    "ev_ack": "Acknowledged",
    "ev_push": "Push",
    "ev_push_silent": "Push held back (silent mode)",
    "w_more": "more",
    "w_done": "All done",
    "w_all": "All together",
    "w_none_messages": "No messages"
  },
  "nl": {
    "tab_messages": "Meldingen",
    "tab_notifications": "Notificaties",
    "tab_updates": "Updates",
    "tab_repairs": "Reparaties",
    "tab_send": "Versturen",
    "tab_settings": "Instellingen",
    "all_hidden": "Alle categorieën zijn verborgen",
    "none_open": "Geen openstaande items",
    "search": "Zoeken …",
    "delete": "Verwijderen",
    "delete_all": "Alles verwijderen",
    "confirm": "Zeker?",
    "saved": "Opgeslagen",
    "admin_only": "Alleen beheerders kunnen dit wijzigen.",
    "err_unknown": "Onbekende fout",
    "error_prefix": "Fout: {reason}",
    "just_now": "Zojuist",
    "ago_minute_1": "1 minuut geleden",
    "ago_minute_n": "{n} minuten geleden",
    "ago_hour_1": "1 uur geleden",
    "ago_hour_n": "{n} uur geleden",
    "ago_day_1": "1 dag geleden",
    "ago_day_n": "{n} dagen geleden",
    "f_all": "Alle",
    "f_running": "Bezig",
    "f_fixable": "Oplosbaar",
    "f_critical": "Kritiek",
    "f_history": "Geschiedenis",
    "sev_critical": "Kritiek",
    "sev_warning": "Waarschuwing",
    "sev_info": "Info",
    "sev_ok": "In orde",
    "sort_default": "Standaard",
    "sort_newest": "Nieuwste eerst",
    "sort_oldest": "Oudste eerst",
    "sort_title": "Naam A–Z",
    "banner_offline": "Meldingen niet beschikbaar – de sensor „Meldingen” is niet bereikbaar.",
    "banner_silent": "Stille modus actief – er worden geen pushberichten verstuurd.",
    "banner_update": "Nieuwe versie {v} beschikbaar.",
    "msg_none": "Geen meldingen",
    "msg_no_history": "Nog geen geschiedenis",
    "ack": "Bevestigen",
    "ack_all": "Alles bevestigen",
    "acked_n": "{n} meldingen bevestigd",
    "acked": "Bevestigd ✓",
    "status_resolved": "Opgelost",
    "status_ack": "Bevestigd",
    "pop_info": "Informatie",
    "pop_source": "Bron",
    "pop_technical": "Technische details",
    "k_severity": "Urgentie",
    "k_time": "Tijd",
    "k_status": "Status",
    "k_source": "Bron",
    "k_object": "Object",
    "k_type": "Soort",
    "install_now": "Nu installeren",
    "installing": "Update bezig",
    "installing_dots": "Update bezig …",
    "release_notes": "Releasenotes openen",
    "goto_repairs": "Naar de reparaties",
    "close": "Sluiten",
    "send_recipient": "Ontvanger",
    "send_title_opt": "Titel (optioneel)",
    "send_message": "Bericht",
    "send_urgency": "Urgentie",
    "send_submit": "Versturen",
    "sending": "Wordt verstuurd …",
    "sent_ok": "Verstuurd ✓",
    "no_profiles": "Nog geen ontvangersprofielen",
    "no_profiles_hint": "Instellingen → Apparaten en diensten → Notification Center → Configureren",
    "urg_normal": "Normaal",
    "urg_high": "Hoog",
    "urg_critical": "Dringend",
    "hint_high": "Directe bezorging, doorbreekt focusmodi (iOS).",
    "hint_critical": "Omzeilt de stille modus (Android: alarmkanaal, iOS: Critical Alert).",
    "builder_title": "Scripts & Blueprints",
    "sec_script": "Script maken",
    "sec_script_desc": "Maakt een blijvend script dat een bericht naar een profiel stuurt. Het is in elke automatisering te hergebruiken.",
    "sec_script_submit": "Script maken",
    "sec_bps": "Script-blueprint maken",
    "sec_bps_desc": "Sjabloon voor scripts: profiel, titel, bericht en urgentie zijn standaardwaarden die je wijzigt bij het maken van een script uit de blueprint.",
    "sec_bp_submit": "Blueprint opslaan",
    "sec_bpa": "Automatiserings-blueprint maken",
    "sec_bpa_desc": "Sjabloon voor automatiseringen: bereikt een entiteit een status, dan wordt het bericht verstuurd. Entiteit en status kies je bij gebruik.",
    "b_name_bp": "Naam van de blueprint",
    "b_name_script": "Naam van het script",
    "b_ph_bp": "bijv. Deur open melden",
    "b_ph_script": "bijv. Wasmachine klaar",
    "b_desc_opt": "Beschrijving (optioneel)",
    "b_default_profile": "Standaardprofiel",
    "b_default_message": "Standaardbericht",
    "b_message_at_call": "Bericht pas bij het aanroepen meegeven (de tekst hierboven is dan alleen de terugval)",
    "b_profile_placeholder": "Naam van het profiel",
    "b_profile_tip": "Tip: wijs de profielsensor aan de kaart toe, dan kun je hier profielen aantikken.",
    "b_overwrite": "Overschrijven",
    "b_open": "Openen",
    "b_creating": "Wordt aangemaakt …",
    "b_need_name": "Voer een naam in.",
    "b_need_profile": "Kies een profiel.",
    "b_need_message": "Voer een bericht in.",
    "b_script_exists": "Het script „{id}” bestaat al - kies een andere naam.",
    "b_script_created": "Script aangemaakt: script.{id} ✓",
    "b_script_open": "Script openen",
    "b_bp_updated": "Blueprint bijgewerkt ✓",
    "b_bp_saved": "Blueprint opgeslagen ✓",
    "b_bp_open": "Blueprints openen",
    "set_version": "App-versie",
    "v_integration": "Integratie",
    "v_card": "Kaart",
    "v_latest": "Nieuwste versie",
    "v_checked": "Laatst gecontroleerd",
    "v_check_now": "Nu controleren",
    "v_checking": "Controleren …",
    "v_release": "Release bekijken",
    "v_new": "Nieuwe versie beschikbaar. Update via HACS en herstart Home Assistant. Laad daarna de browser opnieuw (Ctrl+F5).",
    "v_mismatch": "Kaart en integratie hebben verschillende versies (browsercache). Laad de browser opnieuw (Ctrl+F5).",
    "v_failed": "Controle niet mogelijk",
    "v_ok": "Up-to-date",
    "v_unknown": "Nog niet gecontroleerd",
    "set_sources": "Bronnen",
    "src_none": "Nog geen integratie aangemeld. Integraties melden zichzelf aan zodra ze de interface gebruiken.",
    "src_seen": "aangemeld",
    "src_unseen": "sinds de start niet gemeld",
    "src_off": "Bron verstuurt niet",
    "src_open": "{n} open",
    "set_options": "Opties",
    "opt_silent": "Stille modus",
    "opt_silent_hint": "Geen pushberichten. Meldingen blijven zichtbaar in kaart en widget.",
    "opt_bypass": "Kritieke toch bezorgen",
    "opt_delivery": "Pushbezorging per urgentie",
    "opt_no_profiles": "Maak eerst ontvangersprofielen aan (Configureren).",
    "set_maint": "Onderhoud",
    "m_test": "Testmelding versturen",
    "m_test_hint": "Test bezorging en stille modus met de gekozen urgentie.",
    "m_test_sent": "Testmelding verstuurd",
    "m_clear_history": "Geschiedenis wissen",
    "m_cleared": "Geschiedenis gewist",
    "set_events": "Gebeurtenissen",
    "ev_none": "Nog geen gebeurtenissen sinds de start.",
    "ev_register": "Bron aangemeld",
    "ev_report": "Melding",
    "ev_sync": "Synchronisatie",
    "ev_ack": "Bevestigd",
    "ev_push": "Push",
    "ev_push_silent": "Push tegengehouden (stille modus)",
    "w_more": "meer",
    "w_done": "Alles gedaan",
    "w_all": "Alles samen",
    "w_none_messages": "Geen meldingen"
  },
  "fr": {
    "tab_messages": "Messages",
    "tab_notifications": "Notifications",
    "tab_updates": "Mises à jour",
    "tab_repairs": "Réparations",
    "tab_send": "Envoyer",
    "tab_settings": "Paramètres",
    "all_hidden": "Toutes les catégories sont masquées",
    "none_open": "Aucune entrée ouverte",
    "search": "Rechercher …",
    "delete": "Supprimer",
    "delete_all": "Tout supprimer",
    "confirm": "Sûr ?",
    "saved": "Enregistré",
    "admin_only": "Seuls les administrateurs peuvent modifier ceci.",
    "err_unknown": "Erreur inconnue",
    "error_prefix": "Erreur : {reason}",
    "just_now": "À l’instant",
    "ago_minute_1": "Il y a 1 minute",
    "ago_minute_n": "Il y a {n} minutes",
    "ago_hour_1": "Il y a 1 heure",
    "ago_hour_n": "Il y a {n} heures",
    "ago_day_1": "Il y a 1 jour",
    "ago_day_n": "Il y a {n} jours",
    "f_all": "Tous",
    "f_running": "En cours",
    "f_fixable": "Réparable",
    "f_critical": "Critique",
    "f_history": "Historique",
    "sev_critical": "Critique",
    "sev_warning": "Avertissement",
    "sev_info": "Info",
    "sev_ok": "OK",
    "sort_default": "Par défaut",
    "sort_newest": "Plus récent d’abord",
    "sort_oldest": "Plus ancien d’abord",
    "sort_title": "Nom A–Z",
    "banner_offline": "Messages indisponibles – le capteur « Messages » est inaccessible.",
    "banner_silent": "Mode silencieux actif – aucune notification push n’est envoyée.",
    "banner_update": "Nouvelle version {v} disponible.",
    "msg_none": "Aucun message",
    "msg_no_history": "Pas encore d’historique",
    "ack": "Acquitter",
    "ack_all": "Tout acquitter",
    "acked_n": "{n} messages acquittés",
    "acked": "Acquitté ✓",
    "status_resolved": "Résolu",
    "status_ack": "Acquitté",
    "pop_info": "Informations",
    "pop_source": "Source",
    "pop_technical": "Détails techniques",
    "k_severity": "Urgence",
    "k_time": "Heure",
    "k_status": "Statut",
    "k_source": "Source",
    "k_object": "Objet",
    "k_type": "Type",
    "install_now": "Installer maintenant",
    "installing": "Mise à jour en cours",
    "installing_dots": "Mise à jour en cours …",
    "release_notes": "Ouvrir les notes de version",
    "goto_repairs": "Aller aux réparations",
    "close": "Fermer",
    "send_recipient": "Destinataire",
    "send_title_opt": "Titre (facultatif)",
    "send_message": "Message",
    "send_urgency": "Urgence",
    "send_submit": "Envoyer",
    "sending": "Envoi en cours …",
    "sent_ok": "Envoyé ✓",
    "no_profiles": "Aucun profil de destinataire",
    "no_profiles_hint": "Paramètres → Appareils et services → Notification Center → Configurer",
    "urg_normal": "Normal",
    "urg_high": "Élevée",
    "urg_critical": "Urgent",
    "hint_high": "Distribution immédiate, traverse les modes Concentration (iOS).",
    "hint_critical": "Contourne le mode silencieux (Android : canal d’alarme, iOS : Critical Alert).",
    "builder_title": "Scripts & Blueprints",
    "sec_script": "Créer un script",
    "sec_script_desc": "Crée un script permanent qui envoie un message à un profil. Il est réutilisable dans toute automatisation.",
    "sec_script_submit": "Créer le script",
    "sec_bps": "Créer un blueprint de script",
    "sec_bps_desc": "Modèle de scripts : profil, titre, message et urgence sont des valeurs par défaut modifiables lors de la création d’un script depuis le blueprint.",
    "sec_bp_submit": "Enregistrer le blueprint",
    "sec_bpa": "Créer un blueprint d’automatisation",
    "sec_bpa_desc": "Modèle d’automatisations : quand une entité atteint un état, le message est envoyé. Entité et état se choisissent à l’utilisation.",
    "b_name_bp": "Nom du blueprint",
    "b_name_script": "Nom du script",
    "b_ph_bp": "p. ex. Signaler porte ouverte",
    "b_ph_script": "p. ex. Lave-linge terminé",
    "b_desc_opt": "Description (facultatif)",
    "b_default_profile": "Profil par défaut",
    "b_default_message": "Message par défaut",
    "b_message_at_call": "Transmettre le message lors de l’appel (le texte ci-dessus n’est alors que le repli)",
    "b_profile_placeholder": "Nom du profil",
    "b_profile_tip": "Astuce : assigne le capteur de profils à la carte, tu pourras alors toucher les profils ici.",
    "b_overwrite": "Écraser",
    "b_open": "Ouvrir",
    "b_creating": "Création en cours …",
    "b_need_name": "Saisis un nom.",
    "b_need_profile": "Choisis un profil.",
    "b_need_message": "Saisis un message.",
    "b_script_exists": "Le script « {id} » existe déjà - choisis un autre nom.",
    "b_script_created": "Script créé : script.{id} ✓",
    "b_script_open": "Ouvrir le script",
    "b_bp_updated": "Blueprint mis à jour ✓",
    "b_bp_saved": "Blueprint enregistré ✓",
    "b_bp_open": "Ouvrir les blueprints",
    "set_version": "Version de l’application",
    "v_integration": "Intégration",
    "v_card": "Carte",
    "v_latest": "Dernière version",
    "v_checked": "Dernière vérification",
    "v_check_now": "Vérifier maintenant",
    "v_checking": "Vérification …",
    "v_release": "Voir la version",
    "v_new": "Nouvelle version disponible. Mets à jour via HACS et redémarre Home Assistant. Recharge ensuite le navigateur (Ctrl+F5).",
    "v_mismatch": "La carte et l’intégration ont des versions différentes (cache du navigateur). Recharge le navigateur (Ctrl+F5).",
    "v_failed": "Vérification impossible",
    "v_ok": "À jour",
    "v_unknown": "Pas encore vérifié",
    "set_sources": "Sources",
    "src_none": "Aucune intégration enregistrée. Les intégrations s’enregistrent dès qu’elles utilisent l’interface.",
    "src_seen": "enregistrée",
    "src_unseen": "non vue depuis le démarrage",
    "src_off": "La source n’envoie pas",
    "src_open": "{n} ouvert(s)",
    "set_options": "Options",
    "opt_silent": "Mode silencieux",
    "opt_silent_hint": "Pas de notifications push. Les messages restent visibles dans la carte et le widget.",
    "opt_bypass": "Distribuer quand même les critiques",
    "opt_delivery": "Distribution push par urgence",
    "opt_no_profiles": "Crée d’abord des profils de destinataires (Configurer).",
    "set_maint": "Maintenance",
    "m_test": "Envoyer un message de test",
    "m_test_hint": "Teste la distribution et le mode silencieux avec l’urgence choisie.",
    "m_test_sent": "Message de test envoyé",
    "m_clear_history": "Vider l’historique",
    "m_cleared": "Historique vidé",
    "set_events": "Événements",
    "ev_none": "Aucun événement depuis le démarrage.",
    "ev_register": "Source enregistrée",
    "ev_report": "Message",
    "ev_sync": "Synchronisation",
    "ev_ack": "Acquitté",
    "ev_push": "Push",
    "ev_push_silent": "Push retenu (mode silencieux)",
    "w_more": "de plus",
    "w_done": "Tout est fait",
    "w_all": "Tous ensemble",
    "w_none_messages": "Aucun message"
  },
  "es": {
    "tab_messages": "Mensajes",
    "tab_notifications": "Notificaciones",
    "tab_updates": "Actualizaciones",
    "tab_repairs": "Reparaciones",
    "tab_send": "Enviar",
    "tab_settings": "Ajustes",
    "all_hidden": "Todas las categorías están ocultas",
    "none_open": "Sin entradas abiertas",
    "search": "Buscar …",
    "delete": "Eliminar",
    "delete_all": "Eliminar todo",
    "confirm": "¿Seguro?",
    "saved": "Guardado",
    "admin_only": "Solo los administradores pueden cambiar esto.",
    "err_unknown": "Error desconocido",
    "error_prefix": "Error: {reason}",
    "just_now": "Ahora mismo",
    "ago_minute_1": "Hace 1 minuto",
    "ago_minute_n": "Hace {n} minutos",
    "ago_hour_1": "Hace 1 hora",
    "ago_hour_n": "Hace {n} horas",
    "ago_day_1": "Hace 1 día",
    "ago_day_n": "Hace {n} días",
    "f_all": "Todos",
    "f_running": "En curso",
    "f_fixable": "Reparable",
    "f_critical": "Crítico",
    "f_history": "Historial",
    "sev_critical": "Crítico",
    "sev_warning": "Advertencia",
    "sev_info": "Info",
    "sev_ok": "Correcto",
    "sort_default": "Predeterminado",
    "sort_newest": "Más recientes primero",
    "sort_oldest": "Más antiguos primero",
    "sort_title": "Nombre A–Z",
    "banner_offline": "Mensajes no disponibles: el sensor «Mensajes» no responde.",
    "banner_silent": "Modo silencioso activo: no se envían notificaciones push.",
    "banner_update": "Nueva versión {v} disponible.",
    "msg_none": "Sin mensajes",
    "msg_no_history": "Aún sin historial",
    "ack": "Confirmar",
    "ack_all": "Confirmar todo",
    "acked_n": "{n} mensajes confirmados",
    "acked": "Confirmado ✓",
    "status_resolved": "Resuelto",
    "status_ack": "Confirmado",
    "pop_info": "Información",
    "pop_source": "Origen",
    "pop_technical": "Detalles técnicos",
    "k_severity": "Urgencia",
    "k_time": "Hora",
    "k_status": "Estado",
    "k_source": "Origen",
    "k_object": "Objeto",
    "k_type": "Tipo",
    "install_now": "Instalar ahora",
    "installing": "Actualización en curso",
    "installing_dots": "Actualización en curso …",
    "release_notes": "Abrir notas de la versión",
    "goto_repairs": "Ir a las reparaciones",
    "close": "Cerrar",
    "send_recipient": "Destinatario",
    "send_title_opt": "Título (opcional)",
    "send_message": "Mensaje",
    "send_urgency": "Urgencia",
    "send_submit": "Enviar",
    "sending": "Enviando …",
    "sent_ok": "Enviado ✓",
    "no_profiles": "Aún no hay perfiles de destinatario",
    "no_profiles_hint": "Ajustes → Dispositivos y servicios → Notification Center → Configurar",
    "urg_normal": "Normal",
    "urg_high": "Alta",
    "urg_critical": "Urgente",
    "hint_high": "Entrega inmediata, atraviesa los modos de concentración (iOS).",
    "hint_critical": "Salta el modo silencioso (Android: canal de alarma, iOS: Critical Alert).",
    "builder_title": "Scripts y Blueprints",
    "sec_script": "Crear script",
    "sec_script_desc": "Crea un script permanente que envía un mensaje a un perfil. Se puede reutilizar en cualquier automatización.",
    "sec_script_submit": "Crear script",
    "sec_bps": "Crear blueprint de script",
    "sec_bps_desc": "Plantilla de scripts: perfil, título, mensaje y urgencia son valores por defecto que cambias al crear un script desde el blueprint.",
    "sec_bp_submit": "Guardar blueprint",
    "sec_bpa": "Crear blueprint de automatización",
    "sec_bpa_desc": "Plantilla de automatizaciones: cuando una entidad alcanza un estado se envía el mensaje. Eliges entidad y estado al usarla.",
    "b_name_bp": "Nombre del blueprint",
    "b_name_script": "Nombre del script",
    "b_ph_bp": "p. ej. Avisar puerta abierta",
    "b_ph_script": "p. ej. Lavadora terminada",
    "b_desc_opt": "Descripción (opcional)",
    "b_default_profile": "Perfil por defecto",
    "b_default_message": "Mensaje por defecto",
    "b_message_at_call": "Pasar el mensaje al llamar (el texto de arriba es solo el valor de reserva)",
    "b_profile_placeholder": "Nombre del perfil",
    "b_profile_tip": "Consejo: asigna el sensor de perfiles a la tarjeta y podrás pulsar los perfiles aquí.",
    "b_overwrite": "Sobrescribir",
    "b_open": "Abrir",
    "b_creating": "Creando …",
    "b_need_name": "Introduce un nombre.",
    "b_need_profile": "Elige un perfil.",
    "b_need_message": "Introduce un mensaje.",
    "b_script_exists": "El script «{id}» ya existe: elige otro nombre.",
    "b_script_created": "Script creado: script.{id} ✓",
    "b_script_open": "Abrir script",
    "b_bp_updated": "Blueprint actualizado ✓",
    "b_bp_saved": "Blueprint guardado ✓",
    "b_bp_open": "Abrir blueprints",
    "set_version": "Versión de la aplicación",
    "v_integration": "Integración",
    "v_card": "Tarjeta",
    "v_latest": "Última versión",
    "v_checked": "Última comprobación",
    "v_check_now": "Comprobar ahora",
    "v_checking": "Comprobando …",
    "v_release": "Ver versión",
    "v_new": "Nueva versión disponible. Actualiza con HACS y reinicia Home Assistant. Luego recarga el navegador (Ctrl+F5).",
    "v_mismatch": "La tarjeta y la integración tienen versiones distintas (caché del navegador). Recarga el navegador (Ctrl+F5).",
    "v_failed": "Comprobación no posible",
    "v_ok": "Actualizado",
    "v_unknown": "Aún sin comprobar",
    "set_sources": "Orígenes",
    "src_none": "Aún no hay integraciones registradas. Se registran solas cuando usan la interfaz.",
    "src_seen": "registrada",
    "src_unseen": "sin señal desde el inicio",
    "src_off": "El origen no envía",
    "src_open": "{n} abierto(s)",
    "set_options": "Opciones",
    "opt_silent": "Modo silencioso",
    "opt_silent_hint": "Sin notificaciones push. Los mensajes siguen visibles en la tarjeta y el widget.",
    "opt_bypass": "Entregar igualmente los críticos",
    "opt_delivery": "Entrega push por urgencia",
    "opt_no_profiles": "Primero crea perfiles de destinatario (Configurar).",
    "set_maint": "Mantenimiento",
    "m_test": "Enviar mensaje de prueba",
    "m_test_hint": "Prueba la entrega y el modo silencioso con la urgencia elegida.",
    "m_test_sent": "Mensaje de prueba enviado",
    "m_clear_history": "Vaciar historial",
    "m_cleared": "Historial vaciado",
    "set_events": "Eventos",
    "ev_none": "Aún no hay eventos desde el inicio.",
    "ev_register": "Origen registrado",
    "ev_report": "Mensaje",
    "ev_sync": "Sincronización",
    "ev_ack": "Confirmado",
    "ev_push": "Push",
    "ev_push_silent": "Push retenido (modo silencioso)",
    "w_more": "más",
    "w_done": "Todo listo",
    "w_all": "Todos juntos",
    "w_none_messages": "Sin mensajes"
  }
};


function langOf(hass) {
  const raw = (hass && (hass.language || (hass.locale && hass.locale.language))) || "en";
  const code = String(raw).toLowerCase().split("-")[0];
  return I18N[code] ? code : "en";
}

function tr(lang, key, vars) {
  let text = (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
  if (vars) text = text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return text;
}

const SEVERITY_ORDER = ["critical", "warning", "info", "ok"];
const SEVERITY_DEFS = {
  critical: { icon: "mdi:alert-octagon-outline", colorKey: "color_error", fallback: "var(--error-color, #db4437)" },
  warning: { icon: "mdi:alert-outline", colorKey: "color_warning", fallback: "var(--warning-color, #ff9800)" },
  info: { icon: "mdi:information-outline", colorKey: "color_info", fallback: "var(--info-color, #039be5)" },
  ok: { icon: "mdi:check-circle-outline", colorKey: "color_success", fallback: "var(--success-color, #43a047)" },
};

// Registry der Tabs - an EINER Stelle gepflegt. Der letzte Tab ist immer das Zahnrad.
const TAB_ORDER = ["messages", "notifications", "updates", "repairs", "send", "settings"];
const TAB_META = {
  messages: { icon: "mdi:message-badge-outline", colorKey: "color_message", colorFallback: "var(--primary-color, #03a9f4)" },
  notifications: { icon: "mdi:bell-outline", colorKey: "color_notification", colorFallback: "var(--info-color, #0288d1)" },
  updates: { icon: "mdi:package-up", colorKey: "color_update", colorFallback: "var(--warning-color, #fb8c00)" },
  repairs: { icon: "mdi:wrench-outline", colorKey: "color_repair", colorFallback: "var(--error-color, #e53935)" },
  send: { icon: "mdi:send-outline", colorKey: "color_send", colorFallback: "var(--primary-color, #03a9f4)" },
  settings: { icon: "mdi:cog", colorKey: "color_settings", colorFallback: "var(--secondary-text-color, #727272)" },
};
const DEF = {};
TAB_ORDER.forEach((key) => (DEF[key] = { key, ...TAB_META[key] }));
// Listen-Kategorien (haben Zähler und Widgets). Senden und Zahnrad gehören bewusst nicht dazu.
const CATEGORY_DEFS = ["messages", "notifications", "updates", "repairs"].map((key) => DEF[key]);
const SEND_DEF = DEF.send;
const SETTINGS_DEF = DEF.settings;

const URGENCY_DEFS = [
  { id: "normal", icon: "mdi:bell-outline", labelKey: "urg_normal", hintKey: "" },
  { id: "high", icon: "mdi:bell-alert-outline", labelKey: "urg_high", hintKey: "hint_high" },
  { id: "critical", icon: "mdi:alarm-light-outline", labelKey: "urg_critical", hintKey: "hint_critical" },
];

// Abschnitte des Accordions "Scripts & Blueprints" (nur einer ist gleichzeitig offen).
const BUILDER_SECTIONS = [
  { key: "script", labelKey: "sec_script", icon: "mdi:script-text-outline", descKey: "sec_script_desc", submitKey: "sec_script_submit" },
  { key: "bp_script", labelKey: "sec_bps", icon: "mdi:file-document-outline", descKey: "sec_bps_desc", submitKey: "sec_bp_submit", blueprintKind: "script" },
  { key: "bp_automation", labelKey: "sec_bpa", icon: "mdi:robot-outline", descKey: "sec_bpa_desc", submitKey: "sec_bp_submit", blueprintKind: "automation" },
];

function newBuilderForm() {
  return { name: "", description: "", recipient: "", title: "", message: "", urgency: "normal", message_at_call: false, busy: false, status: null };
}

const SORT_DEFS = [
  { id: "default", labelKey: "sort_default" },
  { id: "newest", labelKey: "sort_newest" },
  { id: "oldest", labelKey: "sort_oldest" },
  { id: "title", labelKey: "sort_title" },
];

// Filter = zugleich Statistik-Chips (bei "count" mit Zähler). "history" liest den Verlauf.
const FILTER_DEFS = {
  messages: [
    { id: "all", labelKey: "f_all", test: () => true, count: true },
    { id: "critical", labelKey: "sev_critical", test: (i) => i.severity === "critical", count: true, sev: "critical" },
    { id: "warning", labelKey: "sev_warning", test: (i) => i.severity === "warning", count: true, sev: "warning" },
    { id: "info", labelKey: "sev_info", test: (i) => i.severity === "info" || i.severity === "ok", count: true, sev: "info" },
    { id: "history", labelKey: "f_history", test: () => true, history: true },
  ],
  notifications: [{ id: "all", labelKey: "f_all", test: () => true }],
  updates: [
    { id: "all", labelKey: "f_all", test: () => true },
    { id: "in_progress", labelKey: "f_running", test: (item) => !!item.in_progress },
  ],
  repairs: [
    { id: "all", labelKey: "f_all", test: () => true },
    { id: "fixable", labelKey: "f_fixable", test: (item) => !!item.is_fixable },
    { id: "critical", labelKey: "f_critical", test: (item) => item.severity === "critical" || item.severity === "error" },
  ],
};

const HEX_RE = /^#([0-9a-f]{6})$/i;

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatTimeAgo(isoString, t) {
  if (!isoString) return "";
  const then = new Date(isoString).getTime();
  if (Number.isNaN(then)) return "";
  const diffSeconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSeconds < 60) return t("just_now");
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return diffMinutes === 1 ? t("ago_minute_1") : t("ago_minute_n", { n: diffMinutes });
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return diffHours === 1 ? t("ago_hour_1") : t("ago_hour_n", { n: diffHours });
  const diffDays = Math.floor(diffHours / 24);
  return diffDays === 1 ? t("ago_day_1") : t("ago_day_n", { n: diffDays });
}

// Fehlertext aus den verschiedenen Formen, in denen Home Assistant Fehler liefert:
// Websocket ({code, message}), REST ({error, status_code, body}) oder ein Error.
function errorText(err, fallback) {
  if (!err) return fallback || "Unknown error";
  if (typeof err === "string") return err;
  if (err.message) return err.message;
  const body = err.body;
  if (body) {
    if (typeof body === "string") return body;
    if (body.message) return body.message;
  }
  if (err.error) return err.error;
  try {
    return JSON.stringify(err);
  } catch (e) {
    return String(err);
  }
}

function navigate(path) {
  history.pushState(null, "", path);
  window.dispatchEvent(new Event("location-changed", { bubbles: true, composed: true }));
}

function isCategoryVisible(config, def) {
  return config[`show_${def.key}`] !== false;
}

// Release-Link nur anzeigen, wenn er mit https://github.com/ beginnt.
function safeReleaseUrl(url) {
  return typeof url === "string" && url.startsWith("https://github.com/")
    ? url
    : "https://github.com/Meine-smarte-Welt/notification_center/releases";
}

// Verhindert, dass Home Assistants globale Tastenkürzel (Quick-Bar: "e", "c", "m", …)
// auslösen, während im Such- oder Textfeld getippt wird (Shadow-DOM-Retargeting).
function stopKeyPropagation(el) {
  ["keydown", "keypress", "keyup"].forEach((type) => {
    el.addEventListener(type, (ev) => ev.stopPropagation());
  });
}

class NotificationCenterCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("notification-center-card-editor");
  }

  static getStubConfig() {
    return {
      type: "custom:notification-center-card",
      title: DEFAULT_TITLE,
      icon: DEFAULT_ICON,
      show_title: true,
      show_search: true,
      show_messages: true,
      show_notifications: true,
      show_updates: true,
      show_repairs: true,
      show_send: true,
      show_settings: true,
      show_builder: true,
      entities: {
        messages: DEFAULT_MESSAGES_ENTITY,
        notifications: "sensor.notification_center_benachrichtigungen",
        updates: "sensor.notification_center_updates",
        repairs: "sensor.notification_center_reparaturen",
        recipients: "sensor.notification_center_profile",
      },
    };
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._activeTab = null;
    this._search = "";
    this._sort = null;
    this._activeFilter = { messages: "all", notifications: "all", updates: "all", repairs: "all" };
    this._detailItem = null;
    this._acc = { ver: true, src: true };
    this._popAcc = { pop_info: true };
    this._confirmId = null;
    this._confirmTimer = null;
    this._toast = null;
    this._toastTimer = null;
    this._testSeverity = "info";
    this._checking = false;
    this._send = { recipient: "", title: "", message: "", urgency: "normal", busy: false, status: null };
    this._statusTimer = null;
    this._builder = {
      open: false,
      section: null,
      forms: { script: newBuilderForm(), bp_script: newBuilderForm(), bp_automation: newBuilderForm() },
    };
  }

  disconnectedCallback() {
    [this._statusTimer, this._toastTimer, this._confirmTimer].forEach((timer) => timer && clearTimeout(timer));
    this._statusTimer = this._toastTimer = this._confirmTimer = null;
  }

  setConfig(config) {
    if (!config || !config.entities) {
      throw new Error("notification-center-card: 'entities' fehlt in der Konfiguration");
    }
    this._config = config;
    this._sort = null;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    // Tippt der Nutzer gerade im Suchfeld, darf das Feld NICHT neu aufgebaut werden.
    if (this._isSearchFocused()) {
      this._updateList();
      return;
    }
    // Gleiches gilt fürs Senden-Formular und die Builder-Formulare.
    if (this._isFormFieldFocused()) return;
    this._render();
  }

  _t(key, vars) {
    return tr(langOf(this._hass), key, vars);
  }

  _isFormFieldFocused() {
    const root = this.shadowRoot;
    const active = root && root.activeElement;
    const role = active && active.getAttribute && active.getAttribute("data-role");
    return !!(role && (role.startsWith("send-") || role.startsWith("build-")));
  }

  _isSearchFocused() {
    const root = this.shadowRoot;
    const active = root && root.activeElement;
    return !!(active && active.getAttribute && active.getAttribute("data-role") === "search");
  }

  getCardSize() {
    return 5;
  }

  // --- Konfiguration und Daten -------------------------------------------

  _ro() {
    return this._config.read_only === true;
  }

  _isAdmin() {
    return !!(this._hass && this._hass.user && this._hass.user.is_admin);
  }

  _messagesEntityId() {
    return this._config.entities.messages || DEFAULT_MESSAGES_ENTITY;
  }

  _msgState() {
    return this._hass && this._hass.states[this._messagesEntityId()];
  }

  // Der Meldungen-Sensor ist verfügbar, wenn er existiert (Karten aus 0.0.8 ohne
  // eingetragenen Sensor finden ihn über die Standard-ID).
  _messagesAvailable() {
    return !!this._msgState() || !!this._config.entities.messages;
  }

  _msgAttr(name, fallback) {
    const state = this._msgState();
    const value = state && state.attributes ? state.attributes[name] : undefined;
    return value === undefined || value === null ? fallback : value;
  }

  _sendEnabled() {
    // Der Tab erscheint nur, wenn ein Profil-Sensor zugewiesen ist und die Karte nicht read_only ist.
    return this._config.show_send !== false && !!this._config.entities.recipients && !this._ro();
  }

  _tabAvailable(key) {
    if (key === "send") return this._sendEnabled();
    if (key === "messages" || key === "settings") {
      return this._messagesAvailable() && this._config[`show_${key}`] !== false;
    }
    return isCategoryVisible(this._config, DEF[key]);
  }

  _visibleCategories() {
    const list = TAB_ORDER.filter((key) => this._tabAvailable(key)).map((key) => DEF[key]);
    // Mindestens eine Kategorie bleibt immer sichtbar.
    if (!list.length) list.push(DEF.notifications);
    return list;
  }

  _entityIdFor(key) {
    if (key === "send") return this._config.entities.recipients;
    if (key === "messages" || key === "settings") return this._messagesEntityId();
    return this._config.entities[key];
  }

  _stateFor(key) {
    const entityId = this._entityIdFor(key);
    return entityId ? this._hass.states[entityId] : undefined;
  }

  _itemsFor(key) {
    const state = this._stateFor(key);
    return (state && state.attributes && state.attributes.items) || [];
  }

  _historyItems() {
    return this._msgAttr("history", []);
  }

  _colorFor(def) {
    const configured = this._config[def.colorKey];
    const value = configured && String(configured).trim();
    return value && SAFE_COLOR_RE.test(value) ? value : def.colorFallback;
  }

  _sevColor(severity) {
    const def = SEVERITY_DEFS[severity] || SEVERITY_DEFS.info;
    const configured = this._config[def.colorKey];
    const value = configured && String(configured).trim();
    return value && SAFE_COLOR_RE.test(value) ? value : def.fallback;
  }

  _sevLabel(severity) {
    return this._t(`sev_${SEVERITY_DEFS[severity] ? severity : "info"}`);
  }

  _callService(domain, service, data) {
    if (!this._hass) return;
    this._hass.callService(domain, service, data);
  }

  // Websocket-Aktion der Integration (nur Administratoren) mit Toast als Rückmeldung.
  async _ws(type, extra, okText) {
    if (!this._hass) return null;
    try {
      const result = await this._hass.callWS({ type: `notification_center/${type}`, ...(extra || {}) });
      if (okText) this._showToast(okText, "ok");
      return result || {};
    } catch (err) {
      this._showToast(this._t("error_prefix", { reason: errorText(err, this._t("err_unknown")) }), "error");
      return null;
    }
  }

  _showToast(text, kind) {
    this._toast = { text, kind: kind || "ok" };
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this._toast = null;
      this._toastTimer = null;
      const el = this.shadowRoot && this.shadowRoot.querySelector(".toast");
      if (el) el.remove();
    }, 5000);
    if (!this._isFormFieldFocused()) this._render();
  }

  // Zwei-Klick-Bestätigung statt Browser-Dialog: erster Klick "Wirklich?", zweiter führt aus.
  _confirmClick(id, run) {
    if (this._confirmId === id) {
      clearTimeout(this._confirmTimer);
      this._confirmId = null;
      run();
      return;
    }
    this._confirmId = id;
    if (this._confirmTimer) clearTimeout(this._confirmTimer);
    this._confirmTimer = setTimeout(() => {
      this._confirmId = null;
      if (!this._isFormFieldFocused()) this._render();
    }, 4000);
    this._render();
  }

  _handleAction(category, item, ev) {
    ev.stopPropagation();
    if (category === "messages") {
      if (item.status) return; // Verlauf
      this._ws("ack", { message: item.id }, this._t("acked"));
    } else if (category === "notifications") {
      this._callService("persistent_notification", "dismiss", { notification_id: item.id });
    } else if (category === "updates") {
      if (!item.in_progress) {
        this._callService("update", "install", { entity_id: item.entity_id });
      }
    } else if (category === "repairs") {
      navigate("/config/repairs");
    }
  }

  _handleDismissAll() {
    this._callService("persistent_notification", "dismiss_all", {});
  }

  _handleAckAll() {
    this._ws("ack_all", {}, null).then((result) => {
      if (result) this._showToast(this._t("acked_n", { n: result.count || 0 }), "ok");
    });
  }

  _captureFocus() {
    const root = this.shadowRoot;
    const active = root && root.activeElement;
    if (!active || !active.hasAttribute("data-role")) return null;
    return {
      role: active.getAttribute("data-role"),
      selectionStart: typeof active.selectionStart === "number" ? active.selectionStart : null,
      selectionEnd: typeof active.selectionEnd === "number" ? active.selectionEnd : null,
    };
  }

  _restoreFocus(saved) {
    if (!saved) return;
    const el = this.shadowRoot.querySelector(`[data-role="${saved.role}"]`);
    if (!el) return;
    el.focus();
    if (saved.selectionStart !== null && typeof el.setSelectionRange === "function") {
      try {
        el.setSelectionRange(saved.selectionStart, saved.selectionEnd);
      } catch (err) {
        /* manche Input-Typen erlauben keine Selection-Range - ignorieren */
      }
    }
  }

  // --- Darstellung ---------------------------------------------------------

  _bannerHtml() {
    const banners = [];
    const configured = !!this._config.entities.messages;
    const state = this._msgState();
    if (configured && (!state || state.state === "unavailable" || state.state === "unknown")) {
      banners.push({ kind: "error", icon: "mdi:alert-circle-outline", text: this._t("banner_offline") });
    } else if (state && (this._msgAttr("settings", {}) || {}).silent_mode) {
      banners.push({ kind: "warn", icon: "mdi:bell-off-outline", text: this._t("banner_silent") });
    }
    return banners
      .map((b) => `<div class="banner ${b.kind}"><ha-icon icon="${b.icon}"></ha-icon><span>${escapeHtml(b.text)}</span></div>`)
      .join("");
  }

  _updateBadge() {
    const app = this._msgAttr("app", null);
    if (!app) return false;
    return !!app.update_available || (!!app.version && app.version !== CARD_VERSION);
  }

  _render() {
    if (!this._config || !this._hass || !this.shadowRoot) return;

    const savedFocus = this._captureFocus();
    const t = (key, vars) => this._t(key, vars);

    const visibleCategories = this._visibleCategories();
    const showTitle = this._config.show_title !== false;
    const title = this._config.title || DEFAULT_TITLE;
    const headerIcon = typeof this._config.icon === "undefined" ? DEFAULT_ICON : this._config.icon;
    const zoom = Number(this._config.zoom);
    const zoomStyle = zoom >= 50 && zoom <= 150 && zoom !== 100 ? ` style="zoom:${zoom / 100}"` : "";

    const headerHtml = showTitle
      ? `<div class="header">${headerIcon ? `<ha-icon icon="${headerIcon}"></ha-icon>` : ""}<span>${escapeHtml(title)}</span></div>`
      : "";

    if (!this._activeTab || !visibleCategories.some((def) => def.key === this._activeTab)) {
      const wanted = this._config.default_tab;
      const first = visibleCategories.find((def) => def.key === wanted) || visibleCategories[0];
      this._activeTab = first.key;
    }
    if (!this._sort) this._sort = this._config.default_sort || "default";

    // Mit nur einem sichtbaren Tab entfällt die Leiste.
    const tabsHtml =
      visibleCategories.length > 1
        ? `<div class="tabs">${visibleCategories
            .map((def) => {
              const label = t(`tab_${def.key}`);
              let badge = "";
              if (def.key === "settings") {
                if (this._updateBadge()) badge = `<span class="badge warn">↑</span>`;
              } else if (def.key !== "send") {
                const count = this._itemsFor(def.key).length;
                if (count > 0) badge = `<span class="badge">${count}</span>`;
              }
              return `
        <button class="tab ${this._activeTab === def.key ? "active" : ""}" data-tab="${def.key}" title="${escapeHtml(label)}" style="--tab-color:${this._colorFor(def)}">
          <ha-icon icon="${def.icon}"></ha-icon>
          <span class="lbl">${escapeHtml(label)}</span>
          ${badge}
        </button>`;
            })
            .join("")}</div>`
        : "";

    const activeDef = visibleCategories.find((d) => d.key === this._activeTab);
    const key = this._activeTab;
    const isSend = key === "send";
    const isSettings = key === "settings";
    const isList = !isSend && !isSettings;
    const filters = FILTER_DEFS[key] || [];
    const activeFilterId = this._activeFilter[key] || "all";
    const inHistory = key === "messages" && activeFilterId === "history";

    const showSearch = isList && this._config.show_search !== false;
    const showSort = isList && this._config.show_filter_bar !== false;
    const allItems = isList ? this._itemsFor(key) : [];
    const showDismissAll = !this._ro() && key === "notifications" && allItems.length > 0;
    const showAckAll = !this._ro() && key === "messages" && !inHistory && allItems.length > 0;

    const confirmBtn = (id, icon, label) =>
      `<button class="dismiss-all ${this._confirmId === id ? "armed" : ""}" data-confirm="${id}"><ha-icon icon="${icon}"></ha-icon><span>${escapeHtml(this._confirmId === id ? t("confirm") : label)}</span></button>`;

    const toolbarHtml =
      showSearch || showSort || showDismissAll || showAckAll
        ? `<div class="toolbar-row">
             ${
               showSearch
                 ? `<div class="toolbar">
                      <ha-icon icon="mdi:magnify"></ha-icon>
                      <input type="text" data-role="search" autocomplete="off" placeholder="${escapeHtml(t("search"))}" value="${escapeHtml(this._search)}" />
                    </div>`
                 : ""
             }
             ${
               showSort
                 ? `<select class="sort" data-sort aria-label="${escapeHtml(t("sort_default"))}">${SORT_DEFS.map(
                     (s) => `<option value="${s.id}" ${s.id === this._sort ? "selected" : ""}>${escapeHtml(t(s.labelKey))}</option>`
                   ).join("")}</select>`
                 : ""
             }
             ${showDismissAll ? confirmBtn("dismiss_all", "mdi:notification-clear-all", t("delete_all")) : ""}
             ${showAckAll ? confirmBtn("ack_all", "mdi:check-all", t("ack_all")) : ""}
           </div>`
        : "";

    const showChips = isList && this._config.show_stats !== false && filters.length > 1;
    const filterChipsHtml = showChips
      ? `<div class="filters">
          ${filters
            .map((f) => {
              const n = f.count ? allItems.filter((i) => f.test(i)).length : null;
              const dot = f.sev ? `<span class="chip-dot" style="background:${this._sevColor(f.sev)}"></span>` : "";
              return `<button class="chip ${f.id === activeFilterId ? "active" : ""}" data-filter="${f.id}">${dot}${escapeHtml(t(f.labelKey))}${n !== null ? ` <b>${n}</b>` : ""}</button>`;
            })
            .join("")}
        </div>`
      : "";

    let body;
    if (isSend) body = this._sendHtml();
    else if (isSettings) body = this._settingsHtml();
    else body = this._listHtml(activeDef);

    this.shadowRoot.innerHTML = `
      <style>${this._css()}</style>
      <ha-card${zoomStyle}>
        ${headerHtml}
        ${this._bannerHtml()}
        ${tabsHtml}
        ${toolbarHtml}
        ${filterChipsHtml}
        <div class="list ${isSend ? "send" : ""} ${isSettings ? "settings" : ""}">${body}</div>
        ${this._builderEnabled() ? this._builderHtml() : ""}
        ${this._toast ? `<div class="toast ${this._toast.kind}">${escapeHtml(this._toast.text)}</div>` : ""}
      </ha-card>
      ${this._detailItem && isList ? this._renderPopup(activeDef, this._detailItem) : ""}
    `;

    this._attachListeners();
    this._restoreFocus(savedFocus);
  }

  _sortItems(items) {
    if (this._sort === "newest" || this._sort === "oldest") {
      const dir = this._sort === "newest" ? -1 : 1;
      const stamp = (i) => new Date(i.created_at || i.closed_at || 0).getTime() || 0;
      return [...items].sort((a, b) => dir * (stamp(a) - stamp(b)));
    }
    if (this._sort === "title") {
      return [...items].sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), langOf(this._hass)));
    }
    return items;
  }

  _visibleItems() {
    const key = this._activeTab;
    const filters = FILTER_DEFS[key] || [];
    const activeFilterId = this._activeFilter[key] || "all";
    const activeFilterDef = filters.find((f) => f.id === activeFilterId) || filters[0];
    const source = activeFilterDef && activeFilterDef.history ? this._historyItems() : this._itemsFor(key);
    const searchTerm = this._search.trim().toLowerCase();
    const filtered = source.filter((item) => {
      if (activeFilterDef && !activeFilterDef.test(item)) return false;
      if (!searchTerm) return true;
      const haystack = `${item.title || ""} ${item.message || ""} ${item.source_name || ""} ${item.subject_name || ""}`.toLowerCase();
      return haystack.includes(searchTerm);
    });
    const sorted = this._sortItems(filtered);
    const maxRows = Number(this._config.max_rows);
    return maxRows > 0 ? sorted.slice(0, maxRows) : sorted;
  }

  _listHtml(activeDef) {
    const items = this._visibleItems();
    if (items.length) return items.map((item) => this._renderRow(this._activeTab, activeDef, item)).join("");
    const inHistory = this._activeTab === "messages" && this._activeFilter.messages === "history";
    const text = this._activeTab === "messages" ? this._t(inHistory ? "msg_no_history" : "msg_none") : this._t("none_open");
    return `<div class="empty">
           <ha-icon icon="mdi:check-circle-outline"></ha-icon>
           <span>${escapeHtml(text)}</span>
         </div>`;
  }

  // Erneuert NUR die Liste (Suche/hass-Update während des Tippens).
  _updateList() {
    if (!this._config || !this._hass || !this.shadowRoot) return;
    const listEl = this.shadowRoot.querySelector(".list");
    const activeDef = CATEGORY_DEFS.find((d) => d.key === this._activeTab);
    if (!listEl || !activeDef) {
      this._render();
      return;
    }
    listEl.innerHTML = this._listHtml(activeDef);
    this._attachRowListeners();
  }

  _renderRow(category, def, item) {
    const t = (key, vars) => this._t(key, vars);
    const timeLabel = formatTimeAgo(item.closed_at || item.created_at, t);
    let actionIcon = "mdi:close";
    let actionTitle = t("delete");
    let actionDisabled = "";
    let actionHidden = this._ro();
    let lead = "";
    let metaLine = "";
    let pill = "";

    if (category === "messages") {
      const color = this._sevColor(item.severity);
      const icon = item.icon || (SEVERITY_DEFS[item.severity] || SEVERITY_DEFS.info).icon;
      lead = `<ha-icon class="row-icon" icon="${escapeHtml(icon)}" style="color:${color}"></ha-icon>`;
      pill = `<span class="pill" style="--c:${color}">${escapeHtml(this._sevLabel(item.severity))}</span>`;
      const parts = [item.source_name, item.subject_name].filter(Boolean);
      if (item.status) parts.push(t(item.status === "resolved" ? "status_resolved" : "status_ack"));
      metaLine = parts.length ? `<div class="row-meta">${escapeHtml(parts.join(" · "))}</div>` : "";
      actionIcon = "mdi:check";
      actionTitle = t("ack");
      if (item.status) actionHidden = true;
    } else {
      lead = `<div class="row-dot" style="background:${this._colorFor(def)}"></div>`;
      if (category === "updates") {
        actionIcon = item.in_progress ? "mdi:progress-clock" : "mdi:check";
        actionTitle = item.in_progress ? t("installing") : t("install_now");
        actionDisabled = item.in_progress ? "disabled" : "";
      } else if (category === "repairs") {
        actionIcon = "mdi:chevron-right";
        actionTitle = t("goto_repairs");
        actionHidden = false;
      }
    }

    return `
      <div class="row" data-item-id="${escapeHtml(item.id || item.entity_id || item.issue_id)}" data-category="${category}">
        ${lead}
        <div class="row-body">
          <div class="row-title">${escapeHtml(item.title)}${pill}</div>
          ${item.message ? `<div class="row-message">${escapeHtml(item.message)}</div>` : ""}
          ${metaLine}
          ${timeLabel ? `<div class="row-time">${timeLabel}</div>` : ""}
        </div>
        ${actionHidden ? "" : `<button class="row-action" title="${escapeHtml(actionTitle)}" data-action="1" ${actionDisabled}><ha-icon icon="${actionIcon}"></ha-icon></button>`}
      </div>`;
  }

  _accordion(map, key, icon, title, bodyHtml, opts = {}) {
    const open = map[key] !== undefined ? map[key] : !!opts.open;
    return `
      <details class="acc ${opts.variant || ""}" data-k="${key}" ${open ? "open" : ""}>
        <summary class="acc-summary">
          <ha-icon icon="${icon}"></ha-icon>
          <span class="grow">${escapeHtml(title)}</span>
          ${opts.meta ? `<span class="meta">${escapeHtml(opts.meta)}</span>` : ""}
        </summary>
        <div class="acc-body">${bodyHtml}</div>
      </details>`;
  }

  _line(label, value) {
    return `<div class="detail-row"><span class="detail-key">${escapeHtml(label)}</span><span class="detail-value">${escapeHtml(value)}</span></div>`;
  }

  _renderPopup(def, item) {
    const t = (key, vars) => this._t(key, vars);
    const isMessage = def.key === "messages";
    let sections;
    if (isMessage) {
      const info = [
        item.message ? this._line(t("send_message"), item.message) : "",
        this._line(t("k_severity"), this._sevLabel(item.severity)),
        this._line(t("k_time"), formatTimeAgo(item.created_at, t)),
        item.status ? this._line(t("k_status"), t(item.status === "resolved" ? "status_resolved" : "status_ack")) : "",
      ].join("");
      const source = [
        this._line(t("k_source"), item.source_name || item.source),
        item.subject_name ? this._line(t("k_object"), item.subject_name) : "",
        this._line(t("k_type"), item.type),
      ].join("");
      sections =
        this._accordion(this._popAcc, "pop_info", "mdi:information-outline", t("pop_info"), info, { open: true }) +
        this._accordion(this._popAcc, "pop_source", "mdi:source-branch", t("pop_source"), source);
    } else {
      const fields = Object.entries(item)
        .filter(([key]) => key !== "title")
        .map(([key, value]) => this._line(key, value))
        .join("");
      sections = this._accordion(this._popAcc, "pop_info", "mdi:information-outline", t("pop_info"), fields, { open: true });
    }

    const footerButtons = [];
    if (isMessage) {
      if (!item.status && !this._ro()) footerButtons.push(`<button class="popup-primary" data-popup-ack>${escapeHtml(t("ack"))}</button>`);
    } else if (def.key === "notifications") {
      if (!this._ro()) footerButtons.push(`<button class="popup-primary" data-popup-delete>${escapeHtml(t("delete"))}</button>`);
    } else if (def.key === "updates") {
      if (!this._ro()) {
        footerButtons.push(
          item.in_progress
            ? `<button class="popup-primary" disabled>${escapeHtml(t("installing_dots"))}</button>`
            : `<button class="popup-primary" data-popup-install>${escapeHtml(t("install_now"))}</button>`
        );
      }
      if (item.release_url) {
        footerButtons.push(
          `<button class="popup-secondary" data-popup-release-url="${escapeHtml(item.release_url)}">${escapeHtml(t("release_notes"))}</button>`
        );
      }
    } else if (def.key === "repairs") {
      footerButtons.push(`<button class="popup-primary" data-popup-goto-repairs>${escapeHtml(t("goto_repairs"))}</button>`);
    }

    const iconColor = isMessage ? this._sevColor(item.severity) : this._colorFor(def);
    return `
      <div class="popup-overlay" data-popup-overlay>
        <div class="popup">
          <div class="popup-header">
            <ha-icon icon="${isMessage && item.icon ? escapeHtml(item.icon) : def.icon}" style="color:${iconColor}"></ha-icon>
            <span>${escapeHtml(item.title)}</span>
            <button class="popup-close" data-popup-close title="${escapeHtml(t("close"))}"><ha-icon icon="mdi:close"></ha-icon></button>
          </div>
          <div class="popup-body">${sections}</div>
          ${footerButtons.length ? `<div class="popup-footer">${footerButtons.join("")}</div>` : ""}
        </div>
      </div>`;
  }

  _attachListeners() {
    const root = this.shadowRoot;

    root.querySelectorAll("[data-tab]").forEach((el) => {
      el.addEventListener("click", () => {
        this._activeTab = el.getAttribute("data-tab");
        this._search = "";
        this._detailItem = null;
        this._render();
      });
    });

    root.querySelectorAll("[data-filter]").forEach((el) => {
      el.addEventListener("click", () => {
        this._activeFilter[this._activeTab] = el.getAttribute("data-filter");
        this._render();
      });
    });

    const sortSelect = root.querySelector("[data-sort]");
    if (sortSelect) {
      sortSelect.addEventListener("change", (ev) => {
        this._sort = ev.target.value;
        this._render();
      });
    }

    const searchInput = root.querySelector(".toolbar input");
    if (searchInput) {
      stopKeyPropagation(searchInput);
      searchInput.addEventListener("input", (ev) => {
        this._search = ev.target.value;
        this._updateList();
      });
    }

    root.querySelectorAll("[data-confirm]").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.getAttribute("data-confirm");
        this._confirmClick(id, () => (id === "ack_all" ? this._handleAckAll() : this._handleDismissAll()));
      });
    });

    // Akkordeon: Zustand merken, NICHT neu zeichnen (sonst Endlosschleife).
    root.querySelectorAll("details.acc").forEach((el) => {
      el.addEventListener("toggle", () => {
        const map = el.closest(".popup") ? this._popAcc : this._acc;
        map[el.getAttribute("data-k")] = el.open;
      });
    });

    this._attachRowListeners();
    this._attachPopupListeners();
    this._attachSettingsListeners();
    this._attachSendListeners();
    this._attachBuilderListeners();
  }

  _attachRowListeners() {
    const root = this.shadowRoot;
    root.querySelectorAll(".row").forEach((rowEl) => {
      const category = rowEl.getAttribute("data-category");
      const itemId = rowEl.getAttribute("data-item-id");
      const pool = category === "messages" ? this._itemsFor(category).concat(this._historyItems()) : this._itemsFor(category);
      const item = pool.find((candidate) => (candidate.id || candidate.entity_id || candidate.issue_id) === itemId);
      if (!item) return;

      rowEl.addEventListener("click", (ev) => {
        if (ev.target.closest("[data-action]")) return;
        this._detailItem = item;
        this._render();
      });

      const actionButton = rowEl.querySelector("[data-action]");
      if (actionButton) {
        actionButton.addEventListener("click", (ev) => this._handleAction(category, item, ev));
      }
    });
  }

  _attachPopupListeners() {
    const root = this.shadowRoot;
    const overlay = root.querySelector("[data-popup-overlay]");
    if (!overlay) return;
    const closePopup = () => {
      this._detailItem = null;
      this._render();
    };
    overlay.addEventListener("click", (ev) => {
      if (ev.target === overlay) closePopup();
    });
    // Escape schließt das Popup (einmal pro Popup registriert).
    if (!this._escHandler) {
      this._escHandler = (ev) => {
        if (ev.key === "Escape" && this._detailItem) {
          this._detailItem = null;
          this._render();
        }
      };
      document.addEventListener("keydown", this._escHandler);
    }
    const closeBtn = root.querySelector("[data-popup-close]");
    if (closeBtn) closeBtn.addEventListener("click", closePopup);
    const ackBtn = root.querySelector("[data-popup-ack]");
    if (ackBtn) {
      ackBtn.addEventListener("click", () => {
        if (this._detailItem) this._ws("ack", { message: this._detailItem.id }, this._t("acked"));
        closePopup();
      });
    }
    const deleteBtn = root.querySelector("[data-popup-delete]");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        if (this._detailItem) {
          this._callService("persistent_notification", "dismiss", { notification_id: this._detailItem.id });
        }
        closePopup();
      });
    }
    const repairsBtn = root.querySelector("[data-popup-goto-repairs]");
    if (repairsBtn) repairsBtn.addEventListener("click", () => navigate("/config/repairs"));
    const releaseBtn = root.querySelector("[data-popup-release-url]");
    if (releaseBtn) {
      releaseBtn.addEventListener("click", () => {
        window.open(safeReleaseUrl(releaseBtn.getAttribute("data-popup-release-url")), "_blank", "noopener");
      });
    }
    const installBtn = root.querySelector("[data-popup-install]");
    if (installBtn) {
      installBtn.addEventListener("click", () => {
        if (this._detailItem) this._callService("update", "install", { entity_id: this._detailItem.entity_id });
        closePopup();
      });
    }
  }

  // --- Zahnrad: Einstellungen ----------------------------------------------

  _versionBlockHtml() {
    const t = (key, vars) => this._t(key, vars);
    const app = this._msgAttr("app", {}) || {};
    const mismatch = !!app.version && app.version !== CARD_VERSION;
    const available = !!app.update_available;
    let status;
    if (app.check_failed) status = `<div class="send-status error">${escapeHtml(t("v_failed"))}</div>`;
    else if (available) status = `<div class="send-status warn">${escapeHtml(t("v_new"))}</div>`;
    else if (mismatch) status = `<div class="send-status warn">${escapeHtml(t("v_mismatch"))}</div>`;
    else if (app.latest_version) status = `<div class="send-status ok">${escapeHtml(t("v_ok"))}</div>`;
    else status = `<div class="send-status info">${escapeHtml(t("v_unknown"))}</div>`;
    const checked = app.checked_at ? formatTimeAgo(app.checked_at, t) : "–";
    const buttons = [
      this._isAdmin() && !this._ro()
        ? `<button class="popup-secondary" data-check-update ${this._checking ? "disabled" : ""}>${escapeHtml(t(this._checking ? "v_checking" : "v_check_now"))}</button>`
        : "",
      `<a class="popup-secondary link" href="${escapeHtml(safeReleaseUrl(app.release_url))}" target="_blank" rel="noopener">${escapeHtml(t("v_release"))}</a>`,
    ].join("");
    return `
      ${this._line(t("v_integration"), app.version || "–")}
      ${this._line(t("v_card"), CARD_VERSION)}
      ${this._line(t("v_latest"), app.latest_version || "–")}
      ${this._line(t("v_checked"), checked)}
      ${status}
      <div class="send-actions wrap">${buttons}</div>`;
  }

  _sourcesHtml() {
    const t = (key, vars) => this._t(key, vars);
    const sources = this._msgAttr("sources", []);
    if (!sources.length) return `<div class="send-hint">${escapeHtml(t("src_none"))}</div>`;
    return sources
      .map((src) => {
        const statusColor = src.seen ? this._sevColor("ok") : this._sevColor("warning");
        const types = (src.types || [])
          .map(
            (ty) => `<div class="src-type ${ty.enabled ? "" : "off"}">
              <span class="chip-dot" style="background:${this._sevColor(ty.severity)}"></span>
              ${ty.icon ? `<ha-icon icon="${escapeHtml(ty.icon)}"></ha-icon>` : ""}
              <span class="grow">${escapeHtml(ty.label)}</span>
              <span class="send-hint">${escapeHtml(ty.enabled ? (ty.open ? t("src_open", { n: ty.open }) : "") : t("src_off"))}</span>
            </div>`
          )
          .join("");
        return `
          <div class="src">
            <div class="src-head">
              <ha-icon icon="${escapeHtml(src.icon || "mdi:bell-outline")}"></ha-icon>
              <span class="grow"><b>${escapeHtml(src.name)}</b> ${src.version ? `<span class="send-hint">${escapeHtml(src.version)}</span>` : ""}</span>
              <span class="pill" style="--c:${statusColor}">${escapeHtml(t(src.seen ? "src_seen" : "src_unseen"))}</span>
            </div>
            ${src.enabled ? "" : `<div class="send-hint">${escapeHtml(t("src_off"))}</div>`}
            ${types}
          </div>`;
      })
      .join("");
  }

  _switchHtml(role, checked, disabled) {
    return `<label class="switch"><input type="checkbox" data-switch="${role}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""} /><span class="slider"></span></label>`;
  }

  _optionsHtml() {
    const t = (key, vars) => this._t(key, vars);
    const settings = this._msgAttr("settings", {}) || {};
    const editable = this._isAdmin() && !this._ro();
    const profiles = settings.profiles || [];
    const delivery = settings.delivery || {};
    const rows = SEVERITY_ORDER.map((sev) => {
      const chosen = delivery[sev] || [];
      const chips = profiles.length
        ? profiles
            .map(
              (p) => `<button class="chip ${chosen.includes(p.id) ? "active" : ""}" data-delivery="${sev}" data-profile="${escapeHtml(p.id)}" ${editable ? "" : "disabled"}>
                <ha-icon icon="${p.type === "email" ? "mdi:email-outline" : "mdi:cellphone"}"></ha-icon><span>${escapeHtml(p.name)}</span></button>`
            )
            .join("")
        : `<span class="send-hint">${escapeHtml(t("opt_no_profiles"))}</span>`;
      return `<div class="send-label"><span class="chip-dot" style="background:${this._sevColor(sev)}"></span> ${escapeHtml(this._sevLabel(sev))}</div><div class="send-chips">${chips}</div>`;
    }).join("");
    return `
      <div class="setting-row"><span class="grow">${escapeHtml(t("opt_silent"))}</span>${this._switchHtml("silent_mode", settings.silent_mode, !editable)}</div>
      <div class="send-hint">${escapeHtml(t("opt_silent_hint"))}</div>
      <div class="setting-row"><span class="grow">${escapeHtml(t("opt_bypass"))}</span>${this._switchHtml("critical_bypass", settings.critical_bypass !== false, !editable)}</div>
      <div class="send-label strong">${escapeHtml(t("opt_delivery"))}</div>
      ${rows}`;
  }

  _maintenanceHtml() {
    const t = (key, vars) => this._t(key, vars);
    if (!this._isAdmin() || this._ro()) return `<div class="send-hint">${escapeHtml(t("admin_only"))}</div>`;
    const open = this._itemsFor("messages").length;
    const history = this._historyItems().length;
    const sevChips = SEVERITY_ORDER.map(
      (sev) => `<button class="chip ${this._testSeverity === sev ? "active" : ""}" data-test-severity="${sev}"><span class="chip-dot" style="background:${this._sevColor(sev)}"></span>${escapeHtml(this._sevLabel(sev))}</button>`
    ).join("");
    const confirmBtn = (id, icon, label, disabled) =>
      `<button class="popup-secondary ${this._confirmId === id ? "armed" : ""}" data-confirm-maint="${id}" ${disabled ? "disabled" : ""}><ha-icon icon="${icon}"></ha-icon> ${escapeHtml(this._confirmId === id ? t("confirm") : label)}</button>`;
    return `
      <div class="send-chips">${sevChips}</div>
      <div class="send-hint">${escapeHtml(t("m_test_hint"))}</div>
      <div class="send-actions wrap">
        <button class="popup-primary" data-send-test><ha-icon icon="mdi:bell-check-outline"></ha-icon><span>${escapeHtml(t("m_test"))}</span></button>
        ${confirmBtn("m_ack_all", "mdi:check-all", t("ack_all"), !open)}
        ${confirmBtn("m_clear", "mdi:delete-sweep-outline", t("m_clear_history"), !history)}
      </div>`;
  }

  _eventsHtml() {
    const t = (key, vars) => this._t(key, vars);
    const log = this._msgAttr("log", []);
    if (!log.length) return `<div class="send-hint">${escapeHtml(t("ev_none"))}</div>`;
    return log
      .slice(0, 25)
      .map((entry) => {
        const label = t(entry.kind === "push" && entry.state === "error" ? "ev_push" : `ev_${entry.kind}`);
        const detail = [entry.source, entry.type, entry.state && entry.kind === "report" ? entry.state : ""].filter(Boolean).join(" · ");
        return `<div class="detail-row"><span class="detail-key">${escapeHtml(formatTimeAgo(entry.time, t))}</span><span class="detail-value">${escapeHtml(label)}${entry.kind === "push" && entry.state === "error" ? " ✗" : ""}${detail ? ` · ${escapeHtml(detail)}` : ""}</span></div>`;
      })
      .join("");
  }

  // Feste Reihenfolge der Akkordeons (Design-Master): Version, Status/Quellen, Optionen, Wartung, Ereignisse.
  _settingsHtml() {
    const t = (key, vars) => this._t(key, vars);
    const app = this._msgAttr("app", {}) || {};
    const warn = !!app.update_available || (!!app.version && app.version !== CARD_VERSION);
    const sources = this._msgAttr("sources", []);
    return [
      this._accordion(this._acc, "ver", "mdi:tag-outline", t("set_version"), this._versionBlockHtml(), {
        open: true,
        variant: warn ? "update" : "",
        meta: app.version || "",
      }),
      this._accordion(this._acc, "src", "mdi:lan-connect", t("set_sources"), this._sourcesHtml(), { open: true, meta: String(sources.length) }),
      this._accordion(this._acc, "opt", "mdi:tune", t("set_options"), this._optionsHtml()),
      this._accordion(this._acc, "maint", "mdi:wrench-cog-outline", t("set_maint"), this._maintenanceHtml()),
      this._accordion(this._acc, "events", "mdi:format-list-bulleted", t("set_events"), this._eventsHtml()),
    ].join("");
  }

  _attachSettingsListeners() {
    const root = this.shadowRoot;
    root.querySelectorAll("[data-switch]").forEach((el) => {
      el.addEventListener("change", () => {
        this._ws("set_setting", { setting: el.getAttribute("data-switch"), enabled: el.checked }, this._t("saved"));
      });
    });
    root.querySelectorAll("[data-delivery]").forEach((el) => {
      el.addEventListener("click", () => {
        const sev = el.getAttribute("data-delivery");
        const id = el.getAttribute("data-profile");
        const settings = this._msgAttr("settings", {}) || {};
        const current = new Set((settings.delivery || {})[sev] || []);
        if (current.has(id)) current.delete(id);
        else current.add(id);
        this._ws("set_delivery", { severity: sev, recipients: [...current] }, this._t("saved"));
      });
    });
    root.querySelectorAll("[data-test-severity]").forEach((el) => {
      el.addEventListener("click", () => {
        this._testSeverity = el.getAttribute("data-test-severity");
        this._render();
      });
    });
    const test = root.querySelector("[data-send-test]");
    if (test) test.addEventListener("click", () => this._ws("send_test", { severity: this._testSeverity }, this._t("m_test_sent")));
    root.querySelectorAll("[data-confirm-maint]").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.getAttribute("data-confirm-maint");
        this._confirmClick(id, () => {
          if (id === "m_ack_all") this._handleAckAll();
          else this._ws("clear_history", {}, this._t("m_cleared"));
        });
      });
    });
    const check = root.querySelector("[data-check-update]");
    if (check) {
      check.addEventListener("click", async () => {
        this._checking = true;
        this._render();
        await this._ws("check_update", {}, null);
        this._checking = false;
        this._render();
      });
    }
  }

  // --- Senden ----------------------------------------------------------------

  _sendHtml() {
    const t = (key, vars) => this._t(key, vars);
    const recipients = this._itemsFor("send");
    if (!recipients.length) {
      return `<div class="empty">
          <ha-icon icon="mdi:account-off-outline" style="color:var(--secondary-text-color)"></ha-icon>
          <span>${escapeHtml(t("no_profiles"))}</span>
          <span class="send-hint">${escapeHtml(t("no_profiles_hint"))}</span>
        </div>`;
    }
    const send = this._send;
    if (!recipients.some((r) => r.id === send.recipient)) send.recipient = recipients[0].id;

    const recipientChips = recipients
      .map(
        (r) => `<button class="chip ${r.id === send.recipient ? "active" : ""}" data-send-recipient="${escapeHtml(r.id)}">
          <ha-icon icon="${r.type === "email" ? "mdi:email-outline" : "mdi:cellphone"}"></ha-icon>
          <span>${escapeHtml(r.title)}</span>
        </button>`
      )
      .join("");

    const urgencyChips = URGENCY_DEFS.map(
      (u) => `<button class="chip ${u.id === send.urgency ? "active" : ""}" data-send-urgency="${u.id}">
          <ha-icon icon="${u.icon}"></ha-icon><span>${escapeHtml(t(u.labelKey))}</span>
        </button>`
    ).join("");
    const hintKey = (URGENCY_DEFS.find((u) => u.id === send.urgency) || {}).hintKey || "";

    const status = send.status ? `<div class="send-status ${send.status.kind}">${escapeHtml(send.status.text)}</div>` : "";
    const canSend = !send.busy && send.message.trim().length > 0;

    return `
      <div class="send-label">${escapeHtml(t("send_recipient"))}</div>
      <div class="send-chips">${recipientChips}</div>
      <div class="send-label">${escapeHtml(t("send_title_opt"))}</div>
      <input class="send-input" type="text" data-role="send-title" autocomplete="off" value="${escapeHtml(send.title)}" />
      <div class="send-label">${escapeHtml(t("send_message"))}</div>
      <textarea class="send-input" rows="3" data-role="send-message">${escapeHtml(send.message)}</textarea>
      <div class="send-label">${escapeHtml(t("send_urgency"))}</div>
      <div class="send-chips">${urgencyChips}</div>
      ${hintKey ? `<div class="send-hint">${escapeHtml(t(hintKey))}</div>` : ""}
      <div class="send-actions">
        ${status}
        <button class="popup-primary" data-send-submit ${canSend ? "" : "disabled"}>
          <ha-icon icon="mdi:send"></ha-icon><span>${escapeHtml(t("send_submit"))}</span>
        </button>
      </div>`;
  }

  _attachSendListeners() {
    const root = this.shadowRoot;
    root.querySelectorAll("[data-send-recipient]").forEach((el) => {
      el.addEventListener("click", () => {
        this._send.recipient = el.getAttribute("data-send-recipient");
        this._render();
      });
    });
    root.querySelectorAll("[data-send-urgency]").forEach((el) => {
      el.addEventListener("click", () => {
        this._send.urgency = el.getAttribute("data-send-urgency");
        this._render();
      });
    });

    const title = root.querySelector('[data-role="send-title"]');
    if (title) {
      stopKeyPropagation(title);
      title.addEventListener("input", (ev) => {
        this._send.title = ev.target.value;
      });
    }
    const message = root.querySelector('[data-role="send-message"]');
    if (message) {
      stopKeyPropagation(message);
      message.addEventListener("input", (ev) => {
        this._send.message = ev.target.value;
        this._syncSendButton();
      });
    }
    const submit = root.querySelector("[data-send-submit]");
    if (submit) submit.addEventListener("click", () => this._submitSend());
  }

  // Nur den Button nachziehen - das Textfeld darf beim Tippen nicht neu
  // aufgebaut werden.
  _syncSendButton() {
    const btn = this.shadowRoot.querySelector("[data-send-submit]");
    if (!btn) return;
    const canSend = !this._send.busy && this._send.message.trim().length > 0;
    if (canSend) btn.removeAttribute("disabled");
    else btn.setAttribute("disabled", "");
  }

  _setSendStatus(kind, text, autoClearMs) {
    this._send.status = text ? { kind, text } : null;
    if (this._statusTimer) clearTimeout(this._statusTimer);
    this._statusTimer = null;
    if (autoClearMs) {
      this._statusTimer = setTimeout(() => {
        this._send.status = null;
        this._statusTimer = null;
        if (!this._isFormFieldFocused()) this._render();
      }, autoClearMs);
    }
  }

  _submitSend() {
    const send = this._send;
    const message = send.message.trim();
    if (!this._hass || send.busy || !send.recipient || !message) return;

    send.busy = true;
    this._setSendStatus("info", this._t("sending"));
    this._render();

    const data = { recipient: send.recipient, message, urgency: send.urgency };
    if (send.title.trim()) data.title = send.title.trim();

    Promise.resolve(this._hass.callService("notification_center", "send", data))
      .then(() => {
        send.busy = false;
        send.title = "";
        send.message = "";
        this._setSendStatus("ok", this._t("sent_ok"), 4000);
        this._render();
      })
      .catch((err) => {
        send.busy = false;
        const reason = (err && err.message) || String(err);
        this._setSendStatus("error", this._t("error_prefix", { reason }));
        this._render();
      });
  }

  // ---------------------------------------------------------------------
  // Accordion "Scripts & Blueprints" (0.0.8)
  // ---------------------------------------------------------------------

  _builderEnabled() {
    return this._config.show_builder !== false && !this._ro();
  }

  _builderHtml() {
    const b = this._builder;
    const bodyHtml = b.open
      ? `<div class="acc-body">${BUILDER_SECTIONS.map((sec) => this._builderSectionHtml(sec)).join("")}</div>`
      : "";
    return `
      <div class="builder">
        <button class="acc-head main" data-builder-toggle aria-expanded="${b.open}">
          <ha-icon icon="mdi:hammer-wrench"></ha-icon>
          <span>${escapeHtml(this._t("builder_title"))}</span>
          <ha-icon class="chev ${b.open ? "open" : ""}" icon="mdi:chevron-down"></ha-icon>
        </button>
        ${bodyHtml}
      </div>`;
  }

  _builderSectionHtml(sec) {
    const open = this._builder.section === sec.key;
    return `
      <div class="acc-item">
        <button class="acc-head" data-builder-section="${sec.key}" aria-expanded="${open}">
          <ha-icon icon="${sec.icon}"></ha-icon>
          <span>${escapeHtml(this._t(sec.labelKey))}</span>
          <ha-icon class="chev ${open ? "open" : ""}" icon="mdi:chevron-down"></ha-icon>
        </button>
        ${open ? `<div class="acc-panel">${this._builderFormHtml(sec)}</div>` : ""}
      </div>`;
  }

  _builderFormHtml(sec) {
    const f = this._builder.forms[sec.key];
    const k = sec.key;
    const isScript = k === "script";
    const isBlueprint = !!sec.blueprintKind;
    const recipients = this._itemsFor("send");

    if (recipients.length && !recipients.some((r) => r.title === f.recipient)) {
      f.recipient = recipients[0].title;
    }

    const recipientHtml = recipients.length
      ? `<div class="send-chips">${recipients
          .map(
            (r) => `<button class="chip ${r.title === f.recipient ? "active" : ""}" data-build-recipient="${escapeHtml(r.title)}" data-bf="${k}">
              <ha-icon icon="${r.type === "email" ? "mdi:email-outline" : "mdi:cellphone"}"></ha-icon>
              <span>${escapeHtml(r.title)}</span>
            </button>`
          )
          .join("")}</div>`
      : `<input class="send-input" type="text" data-role="build-recipient-${k}" data-bf="${k}" data-field="recipient" autocomplete="off" placeholder="${escapeHtml(this._t("b_profile_placeholder"))}" value="${escapeHtml(f.recipient)}" />
         <div class="send-hint">${escapeHtml(this._t("b_profile_tip"))}</div>`;

    const urgencyHtml = URGENCY_DEFS.map(
      (u) => `<button class="chip ${u.id === f.urgency ? "active" : ""}" data-build-urgency="${u.id}" data-bf="${k}">
          <ha-icon icon="${u.icon}"></ha-icon><span>${escapeHtml(this._t(u.labelKey))}</span>
        </button>`
    ).join("");
    const urgencyHintKey = (URGENCY_DEFS.find((u) => u.id === f.urgency) || {}).hintKey || "";

    const field = (label, name, opts = {}) => `
      <div class="send-label">${label}</div>
      ${
        opts.multiline
          ? `<textarea class="send-input" rows="3" data-role="build-${name}-${k}" data-bf="${k}" data-field="${name}">${escapeHtml(f[name])}</textarea>`
          : `<input class="send-input" type="text" data-role="build-${name}-${k}" data-bf="${k}" data-field="${name}" autocomplete="off" placeholder="${escapeHtml(opts.placeholder || "")}" value="${escapeHtml(f[name])}" />`
      }`;

    const messageAtCall = isScript
      ? `<label class="build-check">
           <input type="checkbox" data-build-check="message_at_call" data-bf="${k}" ${f.message_at_call ? "checked" : ""} />
           <span>${escapeHtml(this._t("b_message_at_call"))}</span>
         </label>`
      : "";

    const status = f.status
      ? `<div class="send-status ${f.status.kind}">${escapeHtml(f.status.text)}</div>`
      : "";
    const extraButtons = [];
    if (f.status && f.status.code === "file_exists") {
      extraButtons.push(`<button class="popup-secondary" data-build-overwrite data-bf="${k}">${escapeHtml(this._t("b_overwrite"))}</button>`);
    }
    if (f.status && f.status.kind === "ok" && f.status.open) {
      extraButtons.push(
        `<button class="popup-secondary" data-build-open="${escapeHtml(f.status.open)}">${escapeHtml(f.status.openLabel || this._t("b_open"))}</button>`
      );
    }

    return `
      <p class="send-hint desc">${escapeHtml(this._t(sec.descKey))}</p>
      ${field(this._t(isBlueprint ? "b_name_bp" : "b_name_script"), "name", { placeholder: this._t(isBlueprint ? "b_ph_bp" : "b_ph_script") })}
      ${isBlueprint ? field(this._t("b_desc_opt"), "description") : ""}
      <div class="send-label">${escapeHtml(this._t(isBlueprint ? "b_default_profile" : "send_recipient"))}</div>
      ${recipientHtml}
      ${field(this._t("send_title_opt"), "title")}
      ${field(this._t(isBlueprint ? "b_default_message" : "send_message"), "message", { multiline: true })}
      ${messageAtCall}
      <div class="send-label">${escapeHtml(this._t("send_urgency"))}</div>
      <div class="send-chips">${urgencyHtml}</div>
      ${urgencyHintKey ? `<div class="send-hint">${escapeHtml(this._t(urgencyHintKey))}</div>` : ""}
      <div class="send-actions wrap">
        ${status}
        ${extraButtons.join("")}
        <button class="popup-primary" data-build-submit data-bf="${k}" ${f.busy ? "disabled" : ""}>
          <ha-icon icon="mdi:hammer-wrench"></ha-icon><span>${escapeHtml(this._t(sec.submitKey))}</span>
        </button>
      </div>`;
  }

  _attachBuilderListeners() {
    const root = this.shadowRoot;
    const b = this._builder;

    const toggle = root.querySelector("[data-builder-toggle]");
    if (toggle) {
      toggle.addEventListener("click", () => {
        b.open = !b.open;
        this._render();
      });
    }
    root.querySelectorAll("[data-builder-section]").forEach((el) => {
      el.addEventListener("click", () => {
        const key = el.getAttribute("data-builder-section");
        b.section = b.section === key ? null : key;
        this._render();
      });
    });

    root.querySelectorAll("[data-build-recipient]").forEach((el) => {
      el.addEventListener("click", () => {
        b.forms[el.getAttribute("data-bf")].recipient = el.getAttribute("data-build-recipient");
        this._render();
      });
    });
    root.querySelectorAll("[data-build-urgency]").forEach((el) => {
      el.addEventListener("click", () => {
        b.forms[el.getAttribute("data-bf")].urgency = el.getAttribute("data-build-urgency");
        this._render();
      });
    });
    root.querySelectorAll("[data-build-check]").forEach((el) => {
      el.addEventListener("change", () => {
        b.forms[el.getAttribute("data-bf")][el.getAttribute("data-build-check")] = el.checked;
      });
    });
    root.querySelectorAll("[data-field]").forEach((el) => {
      stopKeyPropagation(el);
      el.addEventListener("input", (ev) => {
        const form = b.forms[el.getAttribute("data-bf")];
        form[el.getAttribute("data-field")] = ev.target.value;
        // Eine alte Rückmeldung passt nach einer Änderung nicht mehr - nur
        // die betroffenen Elemente entfernen, das Eingabefeld bleibt stehen.
        if (form.status && !form.busy) {
          form.status = null;
          const panel = el.closest(".acc-panel");
          ["[data-build-overwrite]", "[data-build-open]", ".send-status"].forEach((sel) => {
            const node = panel && panel.querySelector(sel);
            if (node) node.remove();
          });
        }
      });
    });

    root.querySelectorAll("[data-build-submit]").forEach((el) => {
      el.addEventListener("click", () => this._submitBuilder(el.getAttribute("data-bf"), false));
    });
    root.querySelectorAll("[data-build-overwrite]").forEach((el) => {
      el.addEventListener("click", () => this._submitBuilder(el.getAttribute("data-bf"), true));
    });
    root.querySelectorAll("[data-build-open]").forEach((el) => {
      el.addEventListener("click", () => navigate(el.getAttribute("data-build-open")));
    });
  }

  _setBuilderStatus(form, kind, text, extra = {}) {
    form.status = { kind, text, ...extra };
  }

  _builderFail(form, text) {
    this._setBuilderStatus(form, "error", text);
    this._render();
  }

  async _submitBuilder(key, overwrite) {
    const sec = BUILDER_SECTIONS.find((s) => s.key === key);
    const form = this._builder.forms[key];
    if (!sec || !form || form.busy || !this._hass) return;

    const name = form.name.trim();
    const recipient = form.recipient.trim();
    const message = form.message.trim();
    if (!name) return this._builderFail(form, this._t("b_need_name"));
    if (!recipient) return this._builderFail(form, this._t("b_need_profile"));
    if (!message && !(key === "script" && form.message_at_call)) {
      return this._builderFail(form, this._t("b_need_message"));
    }

    form.busy = true;
    this._setBuilderStatus(form, "info", this._t("b_creating"));
    this._render();

    try {
      if (key === "script") await this._createScript(form, name, recipient, message);
      else await this._createBlueprint(sec, form, name, recipient, message, overwrite);
    } catch (err) {
      const code = err && err.code;
      const text = errorText(err, this._t("err_unknown"));
      this._setBuilderStatus(form, "error", code === "file_exists" || code === "script_exists" ? text : this._t("error_prefix", { reason: text }), { code });
    }
    form.busy = false;
    this._render();
  }

  async _createScript(form, name, recipient, message) {
    // Die Konfiguration baut die Integration (ein getesteter Generator);
    // angelegt wird über die reguläre Script-Editor-API, die validiert und
    // die Scripts neu lädt.
    const built = await this._hass.callWS({
      type: "notification_center/build_script",
      name,
      recipient,
      message,
      title: form.title.trim(),
      urgency: form.urgency,
      message_at_call: !!form.message_at_call,
    });

    let exists = true;
    try {
      await this._hass.callApi("GET", `config/script/config/${built.id}`);
    } catch (err) {
      if (err && err.status_code === 404) exists = false;
      else throw err;
    }
    if (exists) {
      const err = new Error(this._t("b_script_exists", { id: built.id }));
      err.code = "script_exists";
      throw err;
    }

    await this._hass.callApi("POST", `config/script/config/${built.id}`, built.config);
    this._setBuilderStatus(form, "ok", this._t("b_script_created", { id: built.id }), {
      open: `/config/script/edit/${built.id}`,
      openLabel: this._t("b_script_open"),
    });
    form.name = "";
    form.title = "";
    form.message = "";
  }

  async _createBlueprint(sec, form, name, recipient, message, overwrite) {
    const result = await this._hass.callWS({
      type: "notification_center/create_blueprint",
      kind: sec.blueprintKind,
      name,
      description: form.description.trim(),
      recipient,
      title: form.title.trim(),
      message,
      urgency: form.urgency,
      overwrite: !!overwrite,
    });
    this._setBuilderStatus(
      form,
      "ok",
      this._t(result.overwritten ? "b_bp_updated" : "b_bp_saved"),
      { open: "/config/blueprint/dashboard", openLabel: this._t("b_bp_open") }
    );
    form.name = "";
    form.description = "";
    form.title = "";
    form.message = "";
  }

  _css() {
    return `
      .builder { border-top: 1px solid var(--divider-color, #e0e0e0); margin: 4px 8px 0; padding-top: 4px; }
      .acc-head {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        border: none;
        background: none;
        font: inherit;
        color: var(--primary-text-color);
        padding: 10px 8px;
        border-radius: 8px;
        cursor: pointer;
        text-align: left;
      }
      .acc-head:hover { background: var(--secondary-background-color, rgba(0,0,0,0.04)); }
      .acc-head.main { font-weight: 500; }
      .acc-head > span { flex: 1; }
      .acc-head ha-icon { --mdc-icon-size: 20px; color: var(--secondary-text-color); }
      .acc-head .chev { transition: transform 0.2s; }
      .acc-head .chev.open { transform: rotate(180deg); }
      .acc-body { padding: 0 0 4px 12px; }
      .acc-item { border-left: 2px solid var(--divider-color, #e0e0e0); padding-left: 4px; margin: 2px 0; }
      .acc-panel { display: flex; flex-direction: column; gap: 6px; padding: 2px 8px 12px 8px; }
      .send-hint.desc { margin: 0 0 4px; }
      .build-check { display: flex; align-items: flex-start; gap: 8px; font-size: 0.85rem; margin-top: 6px; cursor: pointer; }
      .build-check input { margin-top: 2px; }
      .send-actions.wrap { flex-wrap: wrap; }
      .send-actions.wrap .send-status { flex-basis: 100%; }
      .send-actions .popup-secondary { display: inline-flex; align-items: center; }
      .send { display: flex; flex-direction: column; gap: 6px; padding: 4px 16px 12px; }
      .send-label {
        font-size: 0.78rem;
        color: var(--secondary-text-color);
        margin-top: 6px;
      }
      .send-chips { display: flex; flex-wrap: wrap; gap: 6px; }
      .send .chip { display: inline-flex; align-items: center; gap: 4px; }
      .send .chip ha-icon { --mdc-icon-size: 16px; }
      .send-input {
        font: inherit;
        color: var(--primary-text-color);
        background: var(--secondary-background-color, rgba(0,0,0,0.04));
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: 8px;
        padding: 8px 10px;
        outline: none;
        resize: vertical;
        width: 100%;
        box-sizing: border-box;
      }
      .send-input:focus { border-color: var(--primary-color); }
      .send-hint { font-size: 0.78rem; color: var(--secondary-text-color); }
      .send-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 8px;
      }
      .send-actions .popup-primary { display: inline-flex; align-items: center; gap: 6px; }
      .send-actions ha-icon { --mdc-icon-size: 18px; }
      .send-status { flex: 1; font-size: 0.85rem; }
      .send-status.ok { color: var(--success-color, #43a047); }
      .send-status.error { color: var(--error-color, #e53935); }
      .send-status.info { color: var(--secondary-text-color); }
      ha-card { padding: 8px 0 4px; container-type: inline-size; container-name: nc; position: relative; }
      .header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 1.1rem;
        font-weight: 500;
        padding: 8px 16px 4px;
      }
      .header ha-icon { --mdc-icon-size: 22px; color: var(--primary-color); }
      .tabs {
        display: flex;
        gap: 4px;
        padding: 4px 8px;
        overflow-x: auto;
      }
      .tab {
        display: flex;
        align-items: center;
        gap: 6px;
        border: none;
        background: none;
        font: inherit;
        color: var(--secondary-text-color);
        padding: 6px 10px;
        border-radius: 16px;
        cursor: pointer;
        white-space: nowrap;
      }
      .tab.active {
        color: var(--primary-text-color);
        background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.12);
      }
      .tab ha-icon { color: var(--tab-color); --mdc-icon-size: 20px; }
      .badge {
        background: var(--tab-color);
        color: white;
        border-radius: 10px;
        font-size: 0.72rem;
        padding: 1px 6px;
        min-width: 16px;
        text-align: center;
      }
      .toolbar-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 4px 16px;
      }
      .toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        padding: 6px 10px;
        border-radius: 8px;
        background: var(--secondary-background-color, rgba(0,0,0,0.04));
      }
      .toolbar ha-icon { color: var(--secondary-text-color); --mdc-icon-size: 18px; }
      .toolbar input {
        border: none;
        background: none;
        outline: none;
        font: inherit;
        color: var(--primary-text-color);
        flex: 1;
      }
      .dismiss-all {
        display: flex;
        align-items: center;
        gap: 4px;
        border: none;
        background: none;
        color: var(--primary-color);
        font: inherit;
        font-size: 0.85rem;
        cursor: pointer;
        padding: 6px 8px;
        white-space: nowrap;
      }
      .dismiss-all ha-icon { --mdc-icon-size: 18px; }
      .filters {
        display: flex;
        gap: 6px;
        padding: 4px 16px 4px;
        flex-wrap: wrap;
      }
      .chip {
        border: 1px solid var(--divider-color, #e0e0e0);
        background: none;
        border-radius: 14px;
        padding: 3px 10px;
        font-size: 0.8rem;
        color: var(--secondary-text-color);
        cursor: pointer;
      }
      .chip.active {
        background: var(--primary-color);
        color: var(--text-primary-color, white);
        border-color: var(--primary-color);
      }
      .list { padding: 4px 8px 8px; }
      .row {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 10px 8px;
        border-radius: 8px;
        cursor: pointer;
      }
      .row:hover { background: var(--secondary-background-color, rgba(0,0,0,0.04)); }
      .row-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-top: 6px;
        flex-shrink: 0;
      }
      .row-body { flex: 1; min-width: 0; }
      .row-title { font-weight: 500; color: var(--primary-text-color); }
      .row-message {
        color: var(--secondary-text-color);
        font-size: 0.9rem;
        margin-top: 2px;
      }
      .row-time {
        color: var(--secondary-text-color);
        font-size: 0.78rem;
        margin-top: 4px;
      }
      .row-action {
        border: none;
        background: none;
        color: var(--secondary-text-color);
        cursor: pointer;
        padding: 4px;
        border-radius: 50%;
      }
      .row-action:hover { background: rgba(0,0,0,0.06); }
      .row-action[disabled] { opacity: 0.4; cursor: default; }
      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 24px 0;
        color: var(--secondary-text-color);
      }
      .empty ha-icon { --mdc-icon-size: 32px; color: var(--success-color, #43a047); }
      .popup-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
      }
      .popup {
        background: var(--card-background-color, white);
        border-radius: 12px;
        width: min(420px, 90vw);
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      }
      .popup-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
        font-weight: 500;
      }
      .popup-header span { flex: 1; }
      .popup-close { border: none; background: none; cursor: pointer; color: var(--secondary-text-color); }
      .popup-body { padding: 12px 16px; }
      .detail-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 4px 0;
        border-bottom: 1px solid var(--divider-color, #f0f0f0);
        font-size: 0.9rem;
      }
      .detail-key { color: var(--secondary-text-color); }
      .detail-value { text-align: right; word-break: break-word; }
      .popup-footer {
        padding: 8px 16px 16px;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        flex-wrap: wrap;
      }
      .popup-primary {
        border: none;
        background: var(--primary-color);
        color: var(--text-primary-color, white);
        border-radius: 8px;
        padding: 8px 14px;
        cursor: pointer;
        font: inherit;
      }
      .popup-primary[disabled] { opacity: 0.5; cursor: default; }
      .popup-secondary {
        border: 1px solid var(--divider-color, #e0e0e0);
        background: none;
        color: var(--primary-color);
        border-radius: 8px;
        padding: 8px 14px;
        cursor: pointer;
        font: inherit;
      }

      .grow { flex: 1; min-width: 0; }
      .banner {
        display: flex; align-items: center; gap: 8px; margin: 4px 16px; padding: 8px 12px;
        border-radius: 8px; font-size: 0.85rem; border: 1px solid var(--c);
        background: color-mix(in srgb, var(--c) 12%, transparent);
      }
      .banner.error { --c: var(--error-color, #db4437); }
      .banner.warn { --c: var(--warning-color, #ff9800); }
      .banner ha-icon { --mdc-icon-size: 20px; color: var(--c); }
      .badge.warn { background: var(--warning-color, #ff9800); }
      .pill {
        display: inline-block; margin-left: 8px; padding: 0 8px; border-radius: 10px; font-size: 0.7rem;
        font-weight: 400; line-height: 1.5; border: 1px solid var(--c); color: var(--c); vertical-align: middle;
        white-space: nowrap;
      }
      .row-icon { --mdc-icon-size: 22px; margin-top: 2px; flex-shrink: 0; }
      .row-meta { color: var(--secondary-text-color); font-size: 0.8rem; margin-top: 2px; }
      .sort {
        font: inherit; font-size: 0.85rem; color: var(--primary-text-color); max-width: 40%;
        background: var(--secondary-background-color, rgba(0,0,0,0.04)); border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: 8px; padding: 6px 8px;
      }
      .chip b { font-weight: 600; margin-left: 2px; }
      .chip[disabled] { opacity: 0.5; cursor: default; }
      .chip-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; flex-shrink: 0; }
      .dismiss-all.armed, .popup-secondary.armed { color: var(--error-color, #db4437); border-color: var(--error-color, #db4437); }
      .popup-secondary ha-icon { --mdc-icon-size: 16px; }
      .popup-secondary[disabled] { opacity: 0.5; cursor: default; }
      a.popup-secondary.link { text-decoration: none; display: inline-flex; align-items: center; }
      .toast {
        position: absolute; left: 50%; bottom: 12px; transform: translateX(-50%); z-index: 50;
        padding: 8px 16px; border-radius: 8px; font-size: 0.9rem; max-width: 90%;
        background: var(--primary-text-color, #212121); color: var(--card-background-color, #fff);
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      }
      .toast.error { background: var(--error-color, #db4437); color: #fff; }
      .list.settings { padding: 4px 16px 12px; display: flex; flex-direction: column; gap: 8px; }
      .acc { border: 1px solid var(--divider-color, #e0e0e0); border-radius: 8px; }
      .acc.update { border-color: var(--warning-color, #ff9800); }
      .acc.danger { border-color: var(--error-color, #db4437); }
      .acc-summary {
        display: flex; align-items: center; gap: 8px; padding: 10px 12px; cursor: pointer; list-style: none; font-weight: 500;
      }
      .acc-summary::-webkit-details-marker { display: none; }
      .acc-summary ha-icon { --mdc-icon-size: 20px; color: var(--secondary-text-color); }
      .acc-summary .meta { color: var(--secondary-text-color); font-size: 0.8rem; font-weight: 400; }
      .acc-summary::after {
        content: ""; width: 7px; height: 7px; border-right: 2px solid var(--secondary-text-color);
        border-bottom: 2px solid var(--secondary-text-color); transform: rotate(45deg); transition: transform 0.2s; margin: 0 4px 3px 4px;
      }
      .acc[open] > .acc-summary::after { transform: rotate(-135deg); margin-top: 6px; }
      .acc-body { padding: 0 12px 12px; display: flex; flex-direction: column; gap: 6px; }
      .popup .acc { margin-bottom: 8px; }
      .setting-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
      .send-label.strong { font-weight: 500; color: var(--primary-text-color); margin-top: 12px; }
      .send-status.warn { color: var(--warning-color, #ff9800); }
      .switch { position: relative; display: inline-block; width: 40px; height: 22px; flex-shrink: 0; }
      .switch input { opacity: 0; width: 0; height: 0; }
      .slider {
        position: absolute; inset: 0; border-radius: 22px; background: var(--disabled-text-color, #bdbdbd);
        transition: background 0.2s; cursor: pointer;
      }
      .slider::before {
        content: ""; position: absolute; width: 18px; height: 18px; left: 2px; top: 2px; border-radius: 50%;
        background: #fff; transition: transform 0.2s;
      }
      .switch input:checked + .slider { background: var(--primary-color, #03a9f4); }
      .switch input:checked + .slider::before { transform: translateX(18px); }
      .switch input:disabled + .slider { opacity: 0.5; cursor: default; }
      .src { border-top: 1px solid var(--divider-color, #f0f0f0); padding: 8px 0; display: flex; flex-direction: column; gap: 4px; }
      .src:first-child { border-top: none; }
      .src-head, .src-type { display: flex; align-items: center; gap: 8px; }
      .src-head ha-icon { --mdc-icon-size: 20px; color: var(--secondary-text-color); }
      .src-type { padding-left: 28px; font-size: 0.9rem; }
      .src-type ha-icon { --mdc-icon-size: 16px; color: var(--secondary-text-color); }
      .src-type.off { opacity: 0.5; }
      @container nc (max-width: 480px) {
        .tab .lbl { display: none; }
        .tab { padding: 6px 12px; }
      }
    `;
  }
}


/**
 * Editor (seit 0.0.2 nach dem Vorbild von FRITZ!Box Anrufe): kein eigener
 * Shadow-DOM, sondern direkt im Light-DOM des Editor-Elements, mit nativen
 * <details>-Abschnitten - Darstellung / Kategorien / Farben / Widgets
 * (Widgets zuletzt). Die Farben-Sektion hat je Kategorie ein grafisches
 * <input type="color">-Swatch plus ein Textfeld für beliebige CSS-Werte und
 * zeigt den aktuell wirksamen Wert an. Die Konfiguration wird immer
 * unveränderlich (neues Objekt) aktualisiert und per config-changed-Event mit
 * bubbles+composed gemeldet.
 */
const COLOR_EDITOR_FIELDS = [
  { key: "color_message", label: "Meldungen", fallbackHex: "#03a9f4" },
  { key: "color_notification", label: "Benachrichtigungen", fallbackHex: "#0288d1" },
  { key: "color_update", label: "Updates", fallbackHex: "#fb8c00" },
  { key: "color_repair", label: "Reparaturen", fallbackHex: "#e53935" },
  { key: "color_send", label: "Senden", fallbackHex: "#03a9f4" },
  { key: "color_critical_sep", label: "", fallbackHex: "", separator: true },
  { key: "color_error", label: "Status: Kritisch / Fehler (rot)", fallbackHex: "#db4437" },
  { key: "color_warning", label: "Status: Warnung (orange)", fallbackHex: "#ff9800" },
  { key: "color_info", label: "Status: Info (blau)", fallbackHex: "#039be5" },
  { key: "color_success", label: "Status: In Ordnung (grün)", fallbackHex: "#43a047" },
];

const HEX_COLOR_RE = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

// <input type="color"> akzeptiert nur #rrggbb - 3-stellige Kurzform aufweiten.
function normalizeHex(hex) {
  const h = String(hex || "").replace("#", "");
  if (h.length === 3) return "#" + h.split("").map((c) => c + c).join("");
  return "#" + h;
}

const SAFE_COLOR_RE = /^[a-zA-Z0-9#(),.%\-\s]+$/;

const EDITOR_STYLES = `
  .nc-editor { display: flex; flex-direction: column; gap: 8px; }
  .nc-section {
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 8px;
    padding: 0 12px;
  }
  .nc-section summary {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 0;
    cursor: pointer;
    font-weight: 500;
    list-style: none;
  }
  .nc-section summary::-webkit-details-marker { display: none; }
  .nc-section summary ha-icon { --mdc-icon-size: 20px; color: var(--secondary-text-color, #727272); }
  .nc-section summary .nc-chevron { margin-left: auto; transition: transform 0.2s; }
  .nc-section[open] summary .nc-chevron { transform: rotate(180deg); }
  .nc-body { padding: 4px 0 12px; display: flex; flex-direction: column; gap: 12px; }
  .nc-reset-row { display: flex; justify-content: flex-end; }
  .nc-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 6px;
    padding: 6px 10px;
    background: none;
    color: var(--primary-text-color, #212121);
    font: inherit;
    font-size: 0.85em;
    cursor: pointer;
  }
  .nc-btn:hover { background: var(--secondary-background-color, rgba(0, 0, 0, 0.04)); }
  .nc-btn.primary {
    background: var(--primary-color, #03a9f4);
    color: var(--text-primary-color, #fff);
    border-color: var(--primary-color, #03a9f4);
  }
  .nc-btn ha-icon { --mdc-icon-size: 16px; }
  .nc-color-row { display: flex; flex-direction: column; gap: 4px; }
  .nc-color-label { font-size: 0.9em; color: var(--primary-text-color, #212121); }
  .nc-color-controls { display: flex; align-items: center; gap: 8px; }
  .nc-color-controls input[type="color"] {
    width: 36px;
    height: 36px;
    padding: 0;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 6px;
    cursor: pointer;
    background: none;
  }
  .nc-color-controls input[type="text"] {
    flex: 1 1 auto;
    min-width: 0;
    padding: 8px;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 6px;
    font: inherit;
    color: var(--primary-text-color, #212121);
    background: var(--card-background-color, #fff);
    box-sizing: border-box;
  }
  .nc-color-helper { font-size: 0.75em; color: var(--secondary-text-color, #727272); }
  .nc-version { border: 1px solid var(--divider-color, #e0e0e0); border-radius: 8px; padding: 10px 12px; }
  .nc-version-status { font-size: 0.85rem; margin-top: 4px; }
  .nc-version-status.ok { color: var(--success-color, #43a047); }
  .nc-version-status.warn { color: var(--warning-color, #ff9800); }
  .nc-version-status.error { color: var(--error-color, #db4437); }
  .nc-version-status.info { color: var(--secondary-text-color, #727272); }
  .nc-hint { margin: 0; font-size: 0.85rem; color: var(--secondary-text-color, #727272); }
  .nc-widget-block { display: flex; flex-direction: column; gap: 6px; }
  .nc-widget-title { font-size: 0.9em; font-weight: 500; }
  .nc-snippet {
    margin: 0;
    padding: 8px 10px;
    border-radius: 6px;
    background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    font-family: var(--code-font-family, monospace);
    font-size: 0.82rem;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--primary-text-color, #212121);
    -webkit-user-select: all;
    user-select: all;
  }
  .nc-copy-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .nc-copy-status { font-size: 0.8em; color: var(--secondary-text-color, #727272); }
  .nc-copy-status.ok { color: var(--success-color, #43a047); }
  .nc-copy-status.fail { color: var(--error-color, #e53935); }
`;

// Android-Template-Widgets verstehen kein CSS, nur einfaches HTML
// (<b>, <font color>, <small>, <br>) - deshalb hier feste Hex-Farben. Die
// Kategorie-Farben aus dem Abschnitt "Farben" werden übernommen, sofern sie
// als Hex vorliegen (sonst Standardfarbe der Karte).
const WIDGET_SENSORS = [
  {
    key: "messages",
    labelKey: "tab_messages",
    colorKey: "color_message",
    fallbackHex: "#03a9f4",
  },
  {
    key: "notifications",
    labelKey: "tab_notifications",
    colorKey: "color_notification",
    fallbackHex: "#0288d1",
  },
  {
    key: "updates",
    labelKey: "tab_updates",
    colorKey: "color_update",
    fallbackHex: "#fb8c00",
  },
  {
    key: "repairs",
    labelKey: "tab_repairs",
    colorKey: "color_repair",
    fallbackHex: "#e53935",
  },
];
const WIDGET_OK_HEX = "#43a047";
const WIDGET_MUTED_HEX = "#9e9e9e";
// Trennlinie: Android-Widgets kennen kein <hr>, deshalb eine Reihe von
// "─"-Zeichen in Hellgrau. Die Länge steht als Variable `line` am Anfang des
// Quelltexts und lässt sich dort einfach kürzen/verlängern, falls das Widget
// schmaler oder breiter ist.
const WIDGET_LINE_HEX = "#bdbdbd";
const WIDGET_LINE_TEXT = "─".repeat(24);
const WIDGET_LINE_SET = `{%- set line = '${WIDGET_LINE_TEXT}' -%}`;
const WIDGET_LINE_HTML = `<small><font color="${WIDGET_LINE_HEX}">{{ line }}</font></small><br>`;

class NotificationCenterCardEditor extends HTMLElement {
  constructor() {
    super();
    this._built = false;
    this._forms = [];
    this._config = {};
  }

  _t(key, vars) {
    return tr(langOf(this._hass), key, vars);
  }

  _wl(def) {
    return this._t(def.labelKey);
  }

  setConfig(config) {
    this._config = { ...config };
    if (!this._built) {
      this._buildEditor();
      this._built = true;
    }
    this._syncFromConfig();
  }

  set hass(hass) {
    this._hass = hass;
    this._forms.forEach((form) => (form.hass = hass));
    this._updateVersionBlock();
  }

  _section(title, icon, expanded) {
    const details = document.createElement("details");
    details.className = "nc-section";
    if (expanded) details.open = true;
    const summary = document.createElement("summary");
    summary.innerHTML = `<ha-icon icon="${icon}"></ha-icon><span>${title}</span><ha-icon class="nc-chevron" icon="mdi:chevron-down"></ha-icon>`;
    details.appendChild(summary);
    const body = document.createElement("div");
    body.className = "nc-body";
    details.appendChild(body);
    return { details, body };
  }

  _makeForm(schema) {
    const form = document.createElement("ha-form");
    form.schema = schema;
    form.computeLabel = (item) => this._labelFor(item.name);
    if (this._hass) form.hass = this._hass;
    form.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      this._config = this._unflatten(ev.detail.value, this._config);
      this._emit();
    });
    this._forms.push(form);
    return form;
  }

  _buildEditor() {
    const style = document.createElement("style");
    style.textContent = EDITOR_STYLES;
    this.appendChild(style);

    const list = document.createElement("div");
    list.className = "nc-editor";
    this.appendChild(list);
    this._forms = [];

    // Versionsblock (Pflicht: Version an drei Stellen, hier oben im Editor)
    this._versionBlock = document.createElement("div");
    this._versionBlock.className = "nc-version";
    list.appendChild(this._versionBlock);

    // --- Darstellung ---
    const display = this._section("Darstellung", "mdi:view-dashboard-outline", true);
    display.body.appendChild(
      this._makeForm([
        { name: "title", selector: { text: {} } },
        { name: "show_title", selector: { boolean: {} } },
        { name: "icon", selector: { icon: {} } },
        { name: "show_search", selector: { boolean: {} } },
        { name: "show_filter_bar", selector: { boolean: {} } },
        { name: "show_stats", selector: { boolean: {} } },
        { name: "default_sort", selector: { select: { mode: "dropdown", options: [
          { value: "default", label: "Standard" }, { value: "newest", label: "Neueste zuerst" },
          { value: "oldest", label: "Älteste zuerst" }, { value: "title", label: "Name A–Z" } ] } } },
        { name: "max_rows", selector: { number: { min: 0, max: 200, step: 1, mode: "box" } } },
        { name: "zoom", selector: { number: { min: 50, max: 150, step: 5, mode: "box", unit_of_measurement: "%" } } },
        { name: "read_only", selector: { boolean: {} } },
        { name: "show_builder", selector: { boolean: {} } },
      ])
    );
    list.appendChild(display.details);

    // --- Kategorien ---
    const categories = this._section("Kategorien", "mdi:eye-outline", false);
    categories.body.appendChild(
      this._makeForm([
        { name: "show_messages", selector: { boolean: {} } },
        { name: "show_notifications", selector: { boolean: {} } },
        { name: "show_updates", selector: { boolean: {} } },
        { name: "show_repairs", selector: { boolean: {} } },
        { name: "show_send", selector: { boolean: {} } },
        { name: "show_settings", selector: { boolean: {} } },
        { name: "default_tab", selector: { select: { mode: "dropdown", options: [
          { value: "messages", label: "Meldungen" }, { value: "notifications", label: "Benachrichtigungen" },
          { value: "updates", label: "Updates" }, { value: "repairs", label: "Reparaturen" },
          { value: "send", label: "Senden" }, { value: "settings", label: "Einstellungen (Zahnrad)" } ] } } },
      ])
    );
    list.appendChild(categories.details);

    // --- Farben ---
    const colors = this._section("Farben", "mdi:palette-outline", false);
    this._buildColorSection(colors.body);
    list.appendChild(colors.details);

    // --- Widgets (bewusst als letzter Abschnitt) ---
    const widgets = this._section("Widgets", "mdi:widgets-outline", false);
    this._buildWidgetSection(widgets.body);
    list.appendChild(widgets.details);
  }

  _buildColorSection(body) {
    const resetRow = document.createElement("div");
    resetRow.className = "nc-reset-row";
    resetRow.innerHTML = `<button type="button" class="nc-btn"><ha-icon icon="mdi:restore"></ha-icon><span>Alle Farben zurücksetzen</span></button>`;
    resetRow.querySelector("button").addEventListener("click", () => this._resetAllColors());
    body.appendChild(resetRow);

    this._colorInputs = {};
    this._focusedColorKey = null;

    COLOR_EDITOR_FIELDS.forEach((field) => {
      if (field.separator) {
        const sep = document.createElement("div");
        sep.className = "nc-hint";
        sep.textContent = "Statusfarben (Dringlichkeit der Meldungen):";
        body.appendChild(sep);
        return;
      }
      const row = document.createElement("div");
      row.className = "nc-color-row";
      row.innerHTML = `
        <div class="nc-color-label">${escapeHtml(field.label)}</div>
        <div class="nc-color-controls">
          <input type="color" aria-label="${escapeHtml(field.label)} (grafische Auswahl)" />
          <input type="text" placeholder="${escapeHtml(field.fallbackHex)}" />
        </div>
        <div class="nc-color-helper"></div>`;
      const swatch = row.querySelector('input[type="color"]');
      const text = row.querySelector('input[type="text"]');
      stopKeyPropagation(text);

      // Swatch liefert immer ein gültiges #rrggbb.
      swatch.addEventListener("input", () => {
        text.value = swatch.value;
        this._onColorChange(field.key, swatch.value);
      });
      swatch.addEventListener("change", () => {
        text.value = swatch.value;
        this._onColorChange(field.key, swatch.value);
      });
      // Textfeld: erst bei "change" (Verlassen/Enter), nicht pro Tastendruck.
      text.addEventListener("change", () => this._onColorChange(field.key, text.value));
      text.addEventListener("focus", () => (this._focusedColorKey = field.key));
      text.addEventListener("blur", () => {
        if (this._focusedColorKey === field.key) this._focusedColorKey = null;
      });

      body.appendChild(row);
      this._colorInputs[field.key] = { row, swatch, text };
    });
  }

  _onColorChange(key, rawValue) {
    const value = String(rawValue || "").trim();
    if (value && !SAFE_COLOR_RE.test(value)) return;
    this._config = { ...this._config, [key]: value };
    this._updateColorSection();
    this._emit();
  }

  _resetAllColors() {
    const cleared = {};
    COLOR_EDITOR_FIELDS.forEach((field) => {
      if (!field.separator) cleared[field.key] = "";
    });
    this._config = { ...this._config, ...cleared };
    this._focusedColorKey = null;
    this._updateColorSection();
    this._emit();
  }

  _updateColorSection() {
    if (!this._colorInputs) return;
    COLOR_EDITOR_FIELDS.forEach((field) => {
      if (field.separator) return;
      const inputs = this._colorInputs[field.key];
      if (!inputs) return;
      const raw = String(this._config[field.key] || "").trim();
      inputs.swatch.value = HEX_COLOR_RE.test(raw) ? normalizeHex(raw) : field.fallbackHex;
      if (this._focusedColorKey !== field.key) inputs.text.value = raw;
      inputs.row.querySelector(".nc-color-helper").textContent = raw
        ? `Aktuell verwendet: ${raw}`
        : `Aktuell verwendet (Standard): ${field.fallbackHex}`;
    });
    this._refreshWidgetSnippets();
  }

  _refreshWidgetSnippets() {
    if (!this._widgetBlocks) return;
    Object.entries(this._widgetBlocks).forEach(([key, block]) => {
      block.pre.textContent = this._widgetSnippetText(key) || "Bitte zuerst den Sensor zuweisen.";
    });
  }

  _buildWidgetSection(body) {
    body.appendChild(
      this._makeForm([
        { name: "entity_messages", selector: { entity: { domain: "sensor" } } },
        { name: "entity_notifications", selector: { entity: { domain: "sensor" } } },
        { name: "entity_updates", selector: { entity: { domain: "sensor" } } },
        { name: "entity_repairs", selector: { entity: { domain: "sensor" } } },
        { name: "entity_recipients", selector: { entity: { domain: "sensor" } } },
      ])
    );

    const hint = document.createElement("p");
    hint.className = "nc-hint";
    hint.textContent =
      "Für ein Android-Template-Widget der Home-Assistant-App: pro Sensor einzeln oder alle zusammen kopieren. Farben folgen dem Abschnitt „Farben“ (nur Hex-Werte). Die Texte im Widget folgen der Sprache von Home Assistant.";
    body.appendChild(hint);

    this._widgetBlocks = {};
    [...WIDGET_SENSORS, { key: "all", labelKey: "w_all" }].forEach((def) => {
      const block = document.createElement("div");
      block.className = "nc-widget-block";
      block.innerHTML = `
        <div class="nc-widget-title">${escapeHtml(this._wl(def))}</div>
        <pre class="nc-snippet"></pre>
        <div class="nc-copy-row">
          <button type="button" class="nc-btn primary"><ha-icon icon="mdi:content-copy"></ha-icon><span>Quelltext kopieren</span></button>
          <span class="nc-copy-status"></span>
        </div>`;
      const pre = block.querySelector("pre");
      const status = block.querySelector(".nc-copy-status");
      block.querySelector("button").addEventListener("click", async () => {
        const text = this._widgetSnippetText(def.key);
        if (!text) {
          this._setCopyStatus(status, "Bitte zuerst den Sensor zuweisen.", "fail");
          return;
        }
        const ok = await this._copyText(text);
        if (ok) {
          this._setCopyStatus(status, "In die Zwischenablage kopiert", "ok");
        } else {
          // Letzter Ausweg: Text markieren, damit der Nutzer ihn von Hand
          // (lange drücken -> Kopieren) übernehmen kann.
          this._selectNode(pre);
          this._setCopyStatus(status, "Automatisch nicht möglich - Text ist markiert, bitte manuell kopieren", "fail");
        }
      });
      body.appendChild(block);
      this._widgetBlocks[def.key] = { pre, status };
    });
  }

  _setCopyStatus(el, message, kind) {
    el.textContent = message;
    el.className = `nc-copy-status ${kind}`;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => {
      el.textContent = "";
      el.className = "nc-copy-status";
    }, 4000);
  }

  _selectNode(node) {
    try {
      const range = document.createRange();
      range.selectNodeContents(node);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (err) {
      /* Markieren nicht möglich - ignorieren */
    }
  }

  // Kopiert Text in die Zwischenablage. Die moderne Clipboard-API gibt es nur
  // in sicheren Kontexten (HTTPS) - in der Companion-App über http:// fehlt
  // sie, dann greift der execCommand-Weg. Das Hilfs-Textfeld wird bewusst im
  // Editor selbst (innerhalb des Dialogs) eingehängt: Ein Feld in document.body
  // scheitert im modalen HA-Dialog am Fokus-Trap.
  async _copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        /* weiter mit Fallback */
      }
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;";
    this.appendChild(textarea);
    let ok = false;
    try {
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, text.length);
      ok = document.execCommand("copy");
    } catch (err) {
      ok = false;
    }
    this.removeChild(textarea);
    return ok;
  }

  _widgetColor(def) {
    const raw = String((this._config && this._config[def.colorKey]) || "").trim();
    return HEX_COLOR_RE.test(raw) ? normalizeHex(raw).toLowerCase() : def.fallbackHex;
  }

  // Erzeugt den Template-Quelltext für das Android-Widget im Stil einer
  // Mail-Übersicht: Kopfzeile "Kategorie (Anzahl)" in der Kategorie-Farbe,
  // darunter die ersten Einträge - Titel fett, Nachricht klein und grau -
  // sowie "+ n weitere". Bei 0 Einträgen ein grünes "✓ Alles erledigt".
  // Android-Template-Widgets verstehen nur einfaches HTML (<b>, <big>,
  // <small>, <font color>, <br>), keine Karten, Icons oder Buttons. Die
  // Ausgabe nutzt <br> statt Zeilenumbrüchen und {%- -%}, damit keine
  // Leerzeilen entstehen; Texte werden mit | e maskiert.
  _widgetBlock(def, entityId, maxItems, withHeaderSize) {
    const color = this._widgetColor(def);
    const head = withHeaderSize
      ? `<big><b><font color="${color}">${this._wl(def)}</font> ({{ n }})</b></big>`
      : `<b><font color="${color}">${this._wl(def)}</font> ({{ n }})</b>`;
    return [
      WIDGET_LINE_SET,
      `{%- set n = states('${entityId}') | int(0) -%}`,
      `{%- set items = state_attr('${entityId}', 'items') or [] -%}`,
      `${head}<br>`,
      `{%- if n == 0 -%}`,
      `<font color="${WIDGET_OK_HEX}">✓ ${this._t("w_done")}</font>`,
      `{%- else -%}`,
      `{%- for i in items[:${maxItems}] -%}`,
      `<b>{{ i.title | e }}</b><br>`,
      `{%- if i.message -%}<small><font color="${WIDGET_MUTED_HEX}">{{ i.message | truncate(70) | e }}</font></small><br>{%- endif -%}`,
      `{%- if not loop.last -%}${WIDGET_LINE_HTML}{%- endif -%}`,
      `{%- endfor -%}`,
      `{%- if n > ${maxItems} -%}${WIDGET_LINE_HTML}<small><font color="${WIDGET_MUTED_HEX}">+ {{ n - ${maxItems} }} ${this._t("w_more")}</font></small>{%- endif -%}`,
      `{%- endif -%}`,
    ].join("\n");
  }

  _widgetSnippetText(which) {
    const entities = { ...((this._config && this._config.entities) || {}) };
    if (!entities.messages) entities.messages = DEFAULT_MESSAGES_ENTITY;

    if (which === "all") {
      const defs = WIDGET_SENSORS.filter((d) => entities[d.key]);
      if (!defs.length) return "";
      // Alle Kategorien untereinander: je Kategorie eine Kopfzeile mit den
      // ersten zwei Einträgen. {% macro %} vermeidet dreifach kopierten Code.
      const macro = [
        WIDGET_LINE_SET,
        `{%- macro block(label, color, n, items) -%}`,
        `<b><font color="{{ color if n else '${WIDGET_MUTED_HEX}' }}">{{ label }}</font> ({{ n }})</b><br>`,
        `{%- for i in items[:2] -%}<small>{{ i.title | e }}</small><br>{%- endfor -%}`,
        `{%- endmacro -%}`,
      ].join("\n");
      const sets = defs
        .map(
          (d, i) =>
            `{%- set n${i} = states('${entities[d.key]}') | int(0) -%}\n` +
            `{%- set i${i} = state_attr('${entities[d.key]}', 'items') or [] -%}`
        )
        .join("\n");
      const total = defs.map((_, i) => `n${i}`).join(" + ");
      const calls = defs
        .map(
          (d, i) =>
            `{{ block('${this._wl(d)}', '${this._widgetColor(d)}', n${i}, i${i}) }}` +
            (i < defs.length - 1 ? WIDGET_LINE_HTML : "")
        )
        .join("\n");
      return [
        macro,
        sets,
        `{%- if ${total} == 0 -%}`,
        `<big><b><font color="${WIDGET_OK_HEX}">✓ ${this._t("w_done")}</font></b></big>`,
        `{%- else -%}`,
        calls,
        `{%- endif -%}`,
      ].join("\n");
    }

    const def = WIDGET_SENSORS.find((d) => d.key === which);
    const entityId = def && entities[def.key];
    if (!entityId) return "";
    return this._widgetBlock(def, entityId, 3, true);
  }

  _syncFromConfig() {
    const flat = this._flatten(this._config);
    this._forms.forEach((form) => (form.data = flat));
    this._updateColorSection();
    this._updateVersionBlock();
  }

  // Infoblock oben im Editor: "Karte 1.0.0 · Integration 1.0.0" plus Status.
  _updateVersionBlock() {
    if (!this._versionBlock) return;
    const entityId = (this._config.entities && this._config.entities.messages) || DEFAULT_MESSAGES_ENTITY;
    const state = this._hass && this._hass.states && this._hass.states[entityId];
    const app = state && state.attributes ? state.attributes.app : null;
    const integration = app && app.version ? app.version : "–";
    let kind = "ok";
    let text = this._t("v_ok");
    if (!app) {
      kind = "info";
      text = this._t("v_unknown");
    } else if (app.check_failed) {
      kind = "error";
      text = this._t("v_failed");
    } else if (app.update_available) {
      kind = "warn";
      text = this._t("v_new");
    } else if (app.version !== CARD_VERSION) {
      kind = "warn";
      text = this._t("v_mismatch");
    } else if (!app.latest_version) {
      kind = "info";
      text = this._t("v_unknown");
    }
    this._versionBlock.innerHTML = `<div class="nc-version-line"><b>${escapeHtml(this._t("v_card"))} ${CARD_VERSION}</b> · ${escapeHtml(this._t("v_integration"))} ${escapeHtml(integration)}</div><div class="nc-version-status ${kind}">${escapeHtml(text)}</div>`;
  }

  _emit() {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );
  }

  _labelFor(name) {
    const labels = {
      title: "Titel",
      show_title: "Titel anzeigen",
      icon: "Icon (Kartenkopf)",
      entity_messages: "Sensor: Meldungen",
      entity_notifications: "Sensor: Benachrichtigungen",
      entity_updates: "Sensor: Updates",
      entity_repairs: "Sensor: Reparaturen",
      entity_recipients: "Sensor: Profile (Senden-Tab)",
      show_search: "Suchfeld anzeigen",
      show_filter_bar: "Sortierauswahl anzeigen",
      show_stats: "Statistik-/Filter-Chips anzeigen",
      default_sort: "Standard-Sortierung",
      max_rows: "Höchstens Zeilen (0 = alle)",
      zoom: "Zoom der Karte",
      read_only: "Nur lesen (alle Bedienelemente ausblenden)",
      default_tab: "Start-Tab",
      show_messages: "Kategorie „Meldungen“ anzeigen",
      show_settings: "Zahnrad „Einstellungen“ anzeigen",
      show_notifications: "Kategorie „Benachrichtigungen“ anzeigen",
      show_updates: "Kategorie „Updates“ anzeigen",
      show_repairs: "Kategorie „Reparaturen“ anzeigen",
      show_send: "Tab „Senden“ anzeigen",
      show_builder: "Bereich „Scripts & Blueprints“ anzeigen",
    };
    return labels[name] || name;
  }

  _flatten(config) {
    const entities = config.entities || {};
    return {
      title: config.title || "",
      show_title: config.show_title !== false,
      icon: typeof config.icon === "undefined" ? DEFAULT_ICON : config.icon,
      entity_messages: entities.messages || "",
      entity_notifications: entities.notifications || "",
      entity_updates: entities.updates || "",
      entity_repairs: entities.repairs || "",
      entity_recipients: entities.recipients || "",
      show_search: config.show_search !== false,
      show_filter_bar: config.show_filter_bar !== false,
      show_stats: config.show_stats !== false,
      default_sort: config.default_sort || "default",
      max_rows: Number(config.max_rows) || 0,
      zoom: Number(config.zoom) || 100,
      read_only: config.read_only === true,
      default_tab: config.default_tab || "messages",
      show_messages: config.show_messages !== false,
      show_settings: config.show_settings !== false,
      show_notifications: config.show_notifications !== false,
      show_updates: config.show_updates !== false,
      show_repairs: config.show_repairs !== false,
      show_send: config.show_send !== false,
      show_builder: config.show_builder !== false,
    };
  }

  _unflatten(flat, previousConfig) {
    return {
      ...previousConfig,
      type: "custom:notification-center-card",
      title: flat.title,
      show_title: flat.show_title,
      icon: flat.icon,
      show_search: flat.show_search,
      show_filter_bar: flat.show_filter_bar,
      show_stats: flat.show_stats,
      default_sort: flat.default_sort,
      max_rows: flat.max_rows,
      zoom: flat.zoom,
      read_only: flat.read_only,
      default_tab: flat.default_tab,
      show_messages: flat.show_messages,
      show_settings: flat.show_settings,
      show_notifications: flat.show_notifications,
      show_updates: flat.show_updates,
      show_repairs: flat.show_repairs,
      show_send: flat.show_send,
      show_builder: flat.show_builder,
      entities: {
        messages: flat.entity_messages,
        notifications: flat.entity_notifications,
        updates: flat.entity_updates,
        repairs: flat.entity_repairs,
        recipients: flat.entity_recipients,
      },
    };
  }
}

customElements.define("notification-center-card", NotificationCenterCard);
customElements.define("notification-center-card-editor", NotificationCenterCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "notification-center-card",
  name: "Notification Center",
  description:
    "Meldungen der Integrationen, Benachrichtigungen, Updates und Reparaturen in einer Karte - mit Tabs, Suche, Filtern, Lautlos-Modus, Zustellung, Quellenübersicht, Schnellversand und Scripts/Blueprints.",
  preview: false,
});

console.info(
  `%c NOTIFICATION-CENTER-CARD %c ${CARD_VERSION} `,
  "color:white;background:#3d6b45;font-weight:700;",
  "color:#3d6b45;background:white;font-weight:700;"
);
