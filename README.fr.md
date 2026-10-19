[🇩🇪 Deutsch](README.md) · [🇬🇧 English](README.en.md) · [🇳🇱 Nederlands](README.nl.md) · 🇫🇷 Français · [🇪🇸 Español](README.es.md)

# Notification Center

<p align="center">
  <img src="https://raw.githubusercontent.com/Meine-smarte-Welt/notification_center/main/custom_components/notification_center/brand/icon.png" width="96" alt="Notification Center">
</p>

Une intégration Home Assistant qui réunit les **messages de tes intégrations**, les **notifications**, les **mises à jour** et les **réparations** dans une seule carte de tableau de bord - avec mode silencieux, distribution push via des profils de destinataires, widget Android et envoi rapide.

## Fonctionnalités

- **Messages :** les intégrations (p. ex. Fritz!Box, Zigbee2MQTT Manager, Matter Manager) signalent des événements au Notification Center, triés par urgence : critique, avertissement, info, OK
- **Mode silencieux :** retient les notifications push ; les messages restent visibles dans la carte et le widget ; les messages critiques peuvent le contourner
- **Distribution par urgence :** push via tes profils de destinataires (changer de téléphone = une seule modification)
- **Aperçu des sources :** quelle intégration est enregistrée, sa version et les types de messages qu’elle désactive
- **Historique :** messages résolus et acquittés (30 jours par défaut, 200 au maximum)
- Quatre capteurs de liste plus un capteur de profils, widget modèle Android, envoi rapide, scripts et blueprints
- Carte avec onglets, pastilles statistiques, recherche, tri, popup de détail, bandeau, confirmation en deux clics et couleurs libres
- Tout en **cinq langues** : allemand, anglais, néerlandais, français, espagnol

## Prérequis

- Home Assistant 2025.6 ou plus récent
- HACS (recommandé) ou installation manuelle
- Facultatif : les intégrations sœurs en version 1.0.0 pour que les messages arrivent

## Installation

**HACS :** ajoute le dépôt personnalisé `https://github.com/Meine-smarte-Welt/notification_center` (catégorie *Intégration*), installe « Notification Center », redémarre Home Assistant. Tu ne vois les préversions (bêta/RC) que si tu actives « Afficher les versions bêta » dans HACS.

**Manuel :** copie le dossier `custom_components/notification_center` dans ton répertoire `config` et redémarre.

## Configuration

Paramètres → Appareils et services → **Ajouter une intégration** → « Notification Center ». Aucun identifiant n’est nécessaire, il n’y a qu’une seule instance.

**Profils de destinataires :** *Configurer* → *Ajouter un profil* (nom, type téléphone/e-mail, cible `notify`). Si tu changes de téléphone, seule la cible du profil change.

**Mode silencieux, distribution, historique :** aussi sous *Configurer* ou directement dans la carte (roue dentée → Options).

## La carte

Les onglets (ordre fixe, l’onglet roue dentée est toujours le dernier) :

- **Messages:** messages des intégrations, pastilles avec compteur (Critique/Avertissement/Info), historique, acquitter
- **Notifications:** notifications persistantes de Home Assistant
- **Mises à jour:** mises à jour disponibles, installation depuis le popup
- **Réparations:** réparations ouvertes
- **Envoyer:** envoi rapide à un profil
- **Roue dentée:** version de l’application, sources, options, maintenance, événements

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

| Clé | Signification |
|---|---|
| `title / show_title / icon` | Titre, afficher/masquer le titre, icône d’en-tête |
| `default_tab` | Onglet de départ (`messages`, `notifications`, `updates`, `repairs`, `send`, `settings`) |
| `default_sort` | Tri par défaut (`default`, `newest`, `oldest`, `title`) |
| `show_messages … show_settings` | Chaque catégorie s’active/désactive séparément (au moins une reste visible) |
| `show_search / show_filter_bar / show_stats` | Champ de recherche, choix du tri, pastilles statistiques/filtres |
| `max_rows` | Nombre maximal de lignes (0 = toutes) |
| `zoom` | Mise à l’échelle de la carte en pourcentage (50-150) |
| `read_only` | masque tous les éléments qui modifient quelque chose |
| `show_builder` | Zone « Scripts & Blueprints » |
| `entities.*` | Capteurs (`messages` est nouveau, ID par défaut `sensor.notification_center_meldungen`) |

## Couleurs

Toutes les couleurs se règlent par carte (section *Couleurs* de l’éditeur). Vide = thème par défaut. Autorisés : hex, `rgb()`, `hsl()` et `var(--…)`.

| Clé | Par défaut |
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

`notification_center.send` envoie un message à un profil de destinataire. « Urgent » contourne le mode silencieux sur les téléphones (Android : canal d’alarme, iOS : Critical Alert) ; pour l’e-mail, un préfixe est ajouté à l’objet.

```yaml
action: notification_center.send
data:
  recipient: Thorsten Handy
  title: Waschmaschine
  message: Die Wäsche ist fertig.
  urgency: normal               # normal | high | critical
```

## Événements (interface pour les intégrations)

Les intégrations s’adressent au Notification Center via le bus d’événements de Home Assistant (pas de MQTT). Toutes les données contiennent `schema: 1`. Le Notification Center est **facultatif** pour les intégrations : s’il n’est pas installé, rien ne se passe de leur côté.

| Événement | Sens | Rôle |
|---|---|---|
| `notification_center_register` | Intégration → NC | catalogue des types de messages (urgence, icône, textes en cinq langues, état de l’interrupteur) |
| `notification_center_report` | Intégration → NC | un message : `state` = `active` ou `resolved`, `key` stable, `subject`, `placeholders`, `initial` |
| `notification_center_sync` | Intégration → NC | quelles clés d’un type résoluble sont actives ; tous les autres messages ouverts sont fermés silencieusement |
| `notification_center_ping` | NC → intégrations | envoyé au démarrage du NC ; chaque intégration répond par register et sync |

- Les messages ne contiennent que des clés et des variables. Les textes viennent du catalogue de la source et s’affichent dans la langue de Home Assistant (repli : anglais).
- `initial: true` (état initial après démarrage/sync) apparaît dans la carte mais ne déclenche **aucun** push.
- Les types non résolubles (p. ex. appel manqué) restent jusqu’à ce que tu les acquittes ; la sync ne les ferme jamais.
- Les numéros de téléphone, noms et textes ne sont jamais écrits dans le journal.

Exemple de message :

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

## Capteurs

| Capteur | État | Attributs |
|---|---|---|
| **Messages** | nombre de messages ouverts | `items`, `summary`, `by_severity`, `history`, `sources`, `settings`, `app`, `log` |
| **Notifications** | nombre | `items`, `summary` |
| **Mises à jour** | nombre | `items`, `summary` |
| **Réparations** | nombre | `items`, `summary` |
| **Profils** | nombre de profils | `items`, `summary` |

Les grands attributs ne sont pas stockés dans la base de données à long terme.

## Mode silencieux et distribution

- **Mode silencieux activé :** pas de notifications push. Les messages restent visibles dans la carte et le widget. Un bandeau dans la carte le signale.
- **Distribuer quand même les critiques** (activé par défaut) : `critical` contourne le mode silencieux grâce à la fonction d’urgence de la notification du téléphone.
- **Distribution par urgence :** sans choix personnel, les messages critiques et avertissements sont envoyés en push à tous les profils de téléphone ; info et OK n’apparaissent que dans la carte et le widget.
- **Regroupement :** les 5 premiers messages de même type en 10 secondes partent individuellement, les suivants sont fusionnés en **un seul** push (« N messages de plus »). Tous les messages individuels restent dans la liste.

## Affichage de la version et avis de mise à jour

La version apparaît à trois endroits : dans la roue dentée (Version de l’application), en haut de l’éditeur de la carte (`Carte 1.0.0 · Intégration 1.0.0`) et dans la boîte de dialogue des options. L’intégration interroge `api.github.com` au démarrage puis toutes les 12 heures (préversions incluses pour bêta/RC). Nouvelle version → avis orange, « ↑ » sur la roue dentée ; carte et intégration de versions différentes (cache du navigateur) → orange aussi ; GitHub inaccessible → « Vérification impossible », la carte continue de fonctionner.

## Paramètres (roue dentée)

Ordre fixe des accordéons : **Version de l’application** · **Sources** · **Options** (mode silencieux, distribution) · **Maintenance** (message de test, tout acquitter, vider l’historique, chacun avec confirmation en deux clics) · **Événements** (journal depuis le démarrage, sans contenu). Seuls les administrateurs peuvent modifier.

## Widget Android

Dans l’éditeur de la carte (section *Widgets*) se trouve le texte source prêt à l’emploi pour un widget modèle de l’application Companion, par capteur ou pour tous ensemble. L’application Companion n’affiche que du HTML simple ; les lignes de séparation sont faites de caractères « ─ » (longueur via la variable `line`). Active l’accès aux notifications pour l’application Companion, sinon le widget ne se rafraîchit que toutes les 30 minutes.

## Scripts & Blueprints

Sous la liste, tu peux assembler des scripts, des blueprints de script et des blueprints d’automatisation (administrateur requis). Les scripts existants ne sont jamais écrasés, les blueprints seulement après confirmation.

## Sécurité

- Les actions d’écriture (acquitter, interrupteurs, maintenance, message de test, scripts/blueprints) sont réservées aux administrateurs ; les saisies sont vérifiées côté serveur.
- Tous les textes de la carte sont échappés, les valeurs de couleur passent par une liste autorisée.
- Les messages ne contiennent aucun identifiant ; textes, noms et numéros de téléphone n’arrivent ni dans le journal ni dans le diagnostic.
- Les actions risquées demandent deux clics au lieu d’une boîte de dialogue du navigateur.
- Le lien de version n’est affiché que s’il commence par `https://github.com/`.

## Limitations connues

- **Non testé sur une vraie instance Home Assistant ni avec de vrais téléphones.** Vérifiés : la logique du hub sur un bus d’événements simulé (14 tests), la carte dans un navigateur sans interface avec des données de test (tous les onglets, popup, roue dentée, cinq langues, éditeur) ainsi que syntaxe/JSON. Le comportement dans la vraie interface de Home Assistant est **non vérifié**.
- **Interaction avec les intégrations sœurs non vérifiée :** seuls des événements simulés ont été utilisés, pas de vraies données Fritz!Box, Zigbee2MQTT ou Matter.
- Que « Urgent » contourne réellement le mode silencieux sur ton appareil dépend des réglages Android/iOS (autorisations de canal, Ne pas déranger, alertes critiques). Essaie avec le message de test.
- Les profils e-mail peuvent techniquement être choisis pour la distribution, mais l’e-mail ne fait pas partie du périmètre testé de la 1.0.0.
- Non inclus : couper le son d’un appareil précis, planning du mode silencieux.
- Les notifications persistantes sont lues de façon défensive depuis un stockage interne de Home Assistant ; si cela change, la catégorie reste vide.
- Les traductions néerlandaise, française et espagnole sont automatiques et non vérifiées par des locuteurs natifs - corrections bienvenues.
- Les scripts et blueprints sont seulement créés ; modifier et supprimer se fait dans Home Assistant.

## Dépannage

| Problème | Solution |
|---|---|
| La carte affiche « Custom element doesn’t exist » | Vider le cache du navigateur (Ctrl+F5) ; en mode YAML, ajouter à la main la ressource `/notification_center_files/notification-center-card.js` (type `module`). |
| L’onglet « Messages » manque | Le capteur `sensor.notification_center_meldungen` n’existe qu’après le redémarrage avec la 1.0.0. Vérifier l’entrée `entities.messages`. |
| Aucun message d’une intégration | Roue dentée → Sources : la source est-elle enregistrée ? L’intégration doit être en version 1.0.0 avec « envoyer les messages » activé. |
| Pas de push | Le mode silencieux est-il activé ? Un profil est-il choisi pour cette urgence (roue dentée → Options) ? Vérifier avec le message de test. |
| La vérification de mise à jour échoue | Home Assistant a besoin d’un accès Internet à `api.github.com` ; la carte fonctionne quand même. |

## Intégrité des fichiers

Chaque `.py`, `.js` et `.yaml` commence par un en-tête SHA256 (contenu à partir de la ligne 2). Vérifier avec `tail -n +2 fichier.py | sha256sum`. Les sommes de contrôle des fichiers JSON sont dans [docs/datei-integritaet.md](docs/datei-integritaet.md).

## Historique des versions

### 1.0.0

- Nouveau : **messages** des intégrations (interface schéma 1 : register, report, sync, ping), urgence, historique, acquittement, aperçu des sources
- Nouveau : **mode silencieux**, « distribuer quand même les critiques », **distribution par urgence**, regroupement, message de test
- Nouveau : onglet roue dentée avec version de l’application, sources, options, maintenance, événements ; avis de mise à jour via GitHub
- Nouveau : pastilles statistiques, tri, bandeau, toast, popup avec accordéon, `default_tab`, `zoom`, `read_only`, `max_rows`
- Nouveau : **cinq langues** dans la carte, les options et les services ; logo (`logo.png`), téléchargement de diagnostic, `LICENSE`
- Modifié : l’onglet « Messages » est l’onglet de départ par défaut (modifiable via `default_tab`)
- Après la mise à jour, redémarre Home Assistant et vide le cache du navigateur (Ctrl+F5)

Toutes les versions : [docs/versionshistorie.md](docs/versionshistorie.md)

## Licence

MIT
