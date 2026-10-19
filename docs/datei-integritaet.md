# Datei-Integrität (JSON-Dateien)

JSON-Dateien haben keine Kommentare, daher stehen ihre SHA256-Prüfsummen (über die komplette Datei) hier. Prüfen: `sha256sum <datei>`.

| Datei | SHA256 |
|---|---|
| `custom_components/notification_center/manifest.json` | `469fc68b8c6b764488c743dc121502d4a79b18d2a746ce474a2831bf72d32ff9` |
| `custom_components/notification_center/strings.json` | `3b0a336e0526d5d3abecbe77dcb018a5d72b937c25e2894a5f632e8c24d7f4d0` |
| `custom_components/notification_center/translations/de.json` | `f7851a21119125d2c101d0353bc99982f56a11b555bfa61b1389a6d3a21b850b` |
| `custom_components/notification_center/translations/en.json` | `3b0a336e0526d5d3abecbe77dcb018a5d72b937c25e2894a5f632e8c24d7f4d0` |
| `custom_components/notification_center/translations/es.json` | `8c278a7bd17062fb41983d250d217f0a806c8c3b536567e1234ef6570c359a37` |
| `custom_components/notification_center/translations/fr.json` | `736a30e06c68e33193c78cdde0f360725ab1fc45e1dfcb52de9bd664c00433ce` |
| `custom_components/notification_center/translations/nl.json` | `5f4e4817e01c1d4ec45ba1b00ac750e466d9f8f64c2f8e34d0a1c40d117a69ee` |
| `hacs.json` | `a0cfb91e3538f5e1c8c07957acb30c43379f66cac8269621205b38d4dd7d624d` |

`.py`, `.js` und `.yaml` tragen ihren Hash in Zeile 1: `tail -n +2 datei.py | sha256sum`.
