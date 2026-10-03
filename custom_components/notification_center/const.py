"""Konstanten für die Benachrichtigungszentrale."""

DOMAIN = "notification_center"

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

CARD_FILENAME = "notification-center-card.js"
CARD_URL_PATH = f"/notification_center_files/{CARD_FILENAME}"
CARD_VERSION = "0.0.7"
