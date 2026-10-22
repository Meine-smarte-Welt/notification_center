# Datei-Integrität (JSON-Dateien)

JSON-Dateien haben keine Kommentare, daher stehen ihre SHA256-Prüfsummen (über die komplette Datei) hier. Prüfen: `sha256sum <datei>`.

| Datei | SHA256 |
|---|---|
| `custom_components/notification_center/manifest.json` | `a6ab076706a499b0a735fe576b3548eb0aaf2d16c85d166d984aca0f9e893eca` |
| `custom_components/notification_center/strings.json` | `b2d5e644a94aa1aba85926b83ec1beffba66158f5fa5bf44674875bc83341ede` |
| `custom_components/notification_center/translations/de.json` | `3796514779ec22d81fe7bafe88f94e50ed3916210a12d8810ff71515ad70126a` |
| `custom_components/notification_center/translations/en.json` | `b2d5e644a94aa1aba85926b83ec1beffba66158f5fa5bf44674875bc83341ede` |
| `custom_components/notification_center/translations/es.json` | `727d109106d1c5bc9877f72ce0a75a64126d31ab9793def78b964ef71d84a1e3` |
| `custom_components/notification_center/translations/fr.json` | `26dcbc6f17b739c84c8f07d1d61ee62cda95156a7fdd8ae3e928bcf314162751` |
| `custom_components/notification_center/translations/nl.json` | `f35cb4363618b03568c503001e1e4644c55e19512ce64f47037349a95f4e98e6` |
| `hacs.json` | `a0cfb91e3538f5e1c8c07957acb30c43379f66cac8269621205b38d4dd7d624d` |

`.py`, `.js` und `.yaml` tragen ihren Hash in Zeile 1: `tail -n +2 datei.py | sha256sum`.
