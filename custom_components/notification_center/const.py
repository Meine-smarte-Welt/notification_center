# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): 0163186efa2e038694eb10698f6ababce58c27afa268dbf617ffa3cbefa59958
"""Konstanten für das Notification Center."""

DOMAIN = "notification_center"
VERSION = "1.0.0"
GITHUB_OWNER = "Meine-smarte-Welt"
GITHUB_REPO = "notification_center"
GITHUB_URL = f"https://github.com/{GITHUB_OWNER}/{GITHUB_REPO}"
RELEASES_URL = f"{GITHUB_URL}/releases"

SENSOR_MESSAGES = "meldungen"
SENSOR_NOTIFICATIONS = "benachrichtigungen"
SENSOR_UPDATES = "updates"
SENSOR_REPAIRS = "reparaturen"
SENSOR_PROFILES = "profile"

# Empfänger-Profile (liegen in den Optionen des Config Entries)
CONF_RECIPIENTS = "recipients"
RECIPIENT_PUSH = "push"
RECIPIENT_EMAIL = "email"
RECIPIENT_TYPES = [RECIPIENT_PUSH, RECIPIENT_EMAIL]

# Schnellversand
SERVICE_SEND = "send"
URGENCY_NORMAL = "normal"
URGENCY_HIGH = "high"
URGENCY_CRITICAL = "critical"
URGENCIES = [URGENCY_NORMAL, URGENCY_HIGH, URGENCY_CRITICAL]

# Schnittstelle (Schema 1) - Meldungen der Integrationen
SCHEMA = 1
EVENT_REGISTER = "notification_center_register"
EVENT_REPORT = "notification_center_report"
EVENT_SYNC = "notification_center_sync"
EVENT_PING = "notification_center_ping"
SEVERITIES = ["critical", "warning", "info", "ok"]
LANGUAGES = ["de", "en", "nl", "fr", "es"]
SELF_SOURCE = "notification_center"

# Optionen (Meldungen, Zustellung, Verlauf)
CONF_SILENT = "silent_mode"
CONF_CRITICAL_BYPASS = "critical_bypass"
CONF_DELIVERY = "delivery"
CONF_HISTORY_DAYS = "history_days"
CONF_HISTORY_MAX = "history_max"
DEFAULT_HISTORY_DAYS = 30
DEFAULT_HISTORY_MAX = 200

# Bündeln: mehr als BUNDLE_LIMIT gleichartige Meldungen in BUNDLE_WINDOW s
BUNDLE_LIMIT = 5
BUNDLE_WINDOW = 10

# Update-Prüfung
UPDATE_CHECK_HOURS = 12

SIGNAL_UPDATED = f"{DOMAIN}_updated"

CARD_FILENAME = "notification-center-card.js"
CARD_URL_PATH = f"/notification_center_files/{CARD_FILENAME}"
CARD_VERSION = VERSION
