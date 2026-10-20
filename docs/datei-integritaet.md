# Datei-Integrität (JSON-Dateien)

JSON-Dateien haben keine Kommentare, daher stehen ihre SHA256-Prüfsummen (über die komplette Datei) hier. Prüfen: `sha256sum <datei>`.

| Datei | SHA256 |
|---|---|
| `custom_components/notification_center/manifest.json` | `95f5b5541ea6637e66232be31708276d5ffc608be8f123230d8d8afbe25385b9` |
| `custom_components/notification_center/strings.json` | `f82277f2dd1c347620d74460fdf87ccf74cc18a8698ef19981df89dd02c56966` |
| `custom_components/notification_center/translations/de.json` | `f330d16de9f8a906fea98a38c713c7884274abbe76613dd96a627aca7c57c113` |
| `custom_components/notification_center/translations/en.json` | `f82277f2dd1c347620d74460fdf87ccf74cc18a8698ef19981df89dd02c56966` |
| `custom_components/notification_center/translations/es.json` | `eba99e5fd8aa00874c4719a5fa0b12e2bcc6d87ae4f357752dbb2cf6a94837f9` |
| `custom_components/notification_center/translations/fr.json` | `7963aee9314eea88e276017febe391567b6613c6d306337edf18ffbd1549c406` |
| `custom_components/notification_center/translations/nl.json` | `4387b5082cdf92fed7cc1bc198dee46260fc5057acfed2e12a8c11496789055b` |
| `hacs.json` | `a0cfb91e3538f5e1c8c07957acb30c43379f66cac8269621205b38d4dd7d624d` |

`.py`, `.js` und `.yaml` tragen ihren Hash in Zeile 1: `tail -n +2 datei.py | sha256sum`.
