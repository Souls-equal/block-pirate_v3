# Block Pirate — v3

Code source du jeu (One Piece / voxel) : un « moteur » en modules ES sous `src/`,
et les capacités des fruits empaquetées sous `code-blocks/`.

> **En une phrase** : les sources restent **lisibles** dans `src/`, et le jeu reçoit des
> **copies compactes** (`world-code/`, même arborescence, ~43 % plus petites — voir
> [World Code : la limite des 512 000 caractères](#world-code--la-limite-des-512-000-caractères)) ;
> les 36 modules de capacités des 41 fruits sont regroupés en **8 Code Blocks**
> (`code-blocks/pack-01.js` … `pack-08.js`, sans aucun motif censuré par Bloxd.io).

---

## Démarrage rapide (copier-coller dans Bloxd.io)

> **Où trouver les fichiers à coller ?** Dans **[`world-code/`](world-code/)** :
> même arborescence que `src/`, en version compacte (53 % de la limite au lieu de
> 94 %). `src/` reste la version lisible pour travailler, `dist/` est ignoré par git.
> Détail : [World Code : la limite des 512 000 caractères](#world-code--la-limite-des-512-000-caractères).

Dans ton World Code multi-fichiers sur **Bloxd.io**, tous tes autres fichiers (`index.js`, `core/*`, `gameplay/*`, `utils/*`, `fruit/fruitData.js`) restent tels quels. Tu as seulement à mettre à jour :

1. Dans le **World Code** (dossier `fruit/`) :
   - **`src/fruit/abilities.js`** *(153 binds d'habilités et dotation complète des 41 fruits par rareté : Common = 3, Uncommon = 4, Rare = 4, Legendary = 5, Mythical = 5)*
   - **`src/fruit/func-abilities.js`** *(pont BP3 lisible et autonome avec les 196 shims d'habilités)*
   - **`src/fruit/index.js`** *(priorité au nom de l'attaque `customDisplayName`, remboursement du cooldown si un bloc manque)*
2. Dans le **monde** (les **7 Code Blocks** à `x=100000, y=100000, z=100002 … 100008`) :
   - Si tu avais déjà collé `pack-01.js` … `pack-05.js` (`z=100002 … 100006`), leur code est resté **100 % identique** : tu peux simplement ajouter **`code-blocks/pack-06.js`** en `z=100007` et **`code-blocks/pack-07.js`** en `z=100008` (ou recoller les 7 packs `pack-01.js` … `pack-07.js` de `z=100002` à `z=100008`).
   - Détail dans [`code-blocks/README.md`](code-blocks/README.md).
3. `FA.logStatus()` dans le World Code doit répondre
   `7 pack(s), 197 handlers, 0 manquant(s), 0 erreur(s)`.

*(Si tu modifies les sources de `src/blocks/` plus tard : `npm install && npm run build:blocks && npm run check`.)*

---

## World Code : la limite des 512 000 caractères

Bloxd limite le World Code à **512 000 caractères** **et à 30 fichiers**, et il compte
**le texte brut des fichiers collés**. Les sources de `src/` sont écrites pour être lues (commentaires,
indentation, noms explicites) : ~481 000 caractères à elles seules, donc la limite est
atteinte dès qu'on ajoute un fichier `src/build/*`.

`npm run build:src` produit donc **`world-code/`** (versionné dans git, tu peux le
parcourir directement sur GitHub) : la même arborescence, fichier
par fichier, mais compactée pour le collage — commentaires et espaces retirés
(`minifyWhitespace`), code simplifié (`minifySyntax`), **noms locaux raccourcis**
(`minifyIdentifiers`).

> **Limite de 30 fichiers** : `build-sources.mjs` refuse de produire `world-code/` au-delà
> de **30 fichiers** (`FILE_LIMIT`). C'est pour ça que le mute vit dans `core/team.js`
> (avec `handleChat`) et que le pont des Code Blocks vit dans `index.js` : deux fichiers
> de moins, et la limite est tenue. Avant d'ajouter un module, demande-toi s'il ne peut
> pas rejoindre un fichier existant.

| | Caractères | Limite |
| --- | --- | --- |
| Sources lisibles (`src/`) | ~481 000 | 94 % |
| **`world-code/` (à coller)** | **~273 000** | **53 %** |

Ce qui n'est **jamais** modifié, parce que le jeu s'appuie dessus :

* les **exports** et donc les `import { tick1 as Mt }` entre fichiers ;
* les **affectations de globals** (`onPlayerClick = ...`, `globalThis.FA_*`) ;
* les **noms de propriétés** (`FA.c.damage`, `api.sendMessage`, `{ str, style }`).

Chaque fichier est transformé **isolément** : aucun bundling, l'arborescence et les
imports du jeu restent identiques, seul le texte collé change. `src/build/*.js`
(layer/path/sphere) est compacté aussi **s'il est présent** chez toi : ces fichiers
comptent dans la limite.

> Les commentaires et les noms longs restent donc dans le dépôt (utiles pour
> maintenir le code) : ils ne coûtent **rien** dans le jeu, puisqu'ils ne partent
> jamais tels quels. Le script vérifie à la fin que les points d'entrée
> (`onPlayerClick`, `tick`, `onClose`, …) et les ponts
> `globalThis.FA*` ont survécu.

### Synchronisation `src/` → `world-code/`

`world-code/` est **généré** : ne l'édite pas à la main.

* `npm run build:src` (ou `npm run sync`) le régénère depuis `src/` ;
* `npm run check` échoue si `world-code/` n'est pas à jour (fichiers manquants,
  modifiés ou orphelins) ;
* la CI (`.github/workflows/world-code-sync.yml`) le régénère et le commit
  automatiquement sur `main`, et bloque une PR qui l'aurait laissé périmé.

Le sens inverse n'est pas automatique **par construction** : on ne peut pas
reconstruire du code lisible à partir du code compacté (commentaires et noms
d'origine sont perdus). Modifie donc toujours `src/` : `world-code/` suit tout seul.

---

## Lobby, mers et variations (`src/gameplay/variations.js`)

### ⏸ Les variations sont coupées pour l'instant

En haut du fichier :

```js
export const VARIATIONS_ENABLED = false;
```

À `false`, le monde **n'utilise pas** les variations : pas de lobby, pas de couloir, pas de
matchmaking. Le monde unique **est** la mer 1, donc les îles, les warps admin, les Settings et
les flèches fonctionnent tout de suite — les joueurs et les testeurs n'attendent plus qu'une
variation soit lancée. C'est le réglage livré par défaut tant que les variations ne marchent
pas dans le monde.

Ce que l'interrupteur change, concrètement :

| Élément | Variations coupées | Variations actives |
| --- | --- | --- |
| `currentVariation()` | renvoie `"sea1"` | la variation du moteur (`default`, `sea1`…) |
| `isLobby()` | toujours `false` | vrai dans `default` |
| Connexion | le joueur n'est **pas** déplacé | tp au spawn du lobby |
| `chooseTeam(id, team)` | enregistre la team + tp à son spawn (même monde) | matchmake vers `sea1` |
| `continueJourney(id)` | tp à la position (même monde) | matchmake + tp |
| `enterSea(id, n)` | tp sur place | matchmake |
| `launch(id)` | tp au spawn de la team si elle existe, sinon rappel des recruteurs | hub 1re fois / reprise |
| Zone neutre du lobby | inactive | active |
| Sauvegarde `vp<N>` / `vsea` | aucune écriture | à chaque saut |

Rien d'autre à modifier : `core/admin.js` et `core/UI.js` lisent la **même** fonction, donc
les îles et les Settings suivent automatiquement (`currentIslands()` renvoie la table de
`sea1`, le bouton `Warp to Island` existe, la catégorie `Settings` est créée).

**Pour rallumer plus tard**, deux possibilités :

```js
// 1. definitif : remettre a true dans gameplay/variations.js, puis npm run build
// 2. a chaud, sans recoller le World Code, depuis un Code Block :
BPSea.setVariations(true);   // revient au parcours lobby -> mer
BPSea.setVariations(false);  // re-coupe
```

---

### Le fonctionnement complet (quand les variations sont actives)

Le monde est découpé en **variations** Bloxd : le `default` (la variation de base) sert
de **lobby**, puis une variation **par mer** (`sea1`, `sea2`…). Deux joueurs de mers
différentes ne se croisent jamais, ce qui sépare les puissances sans multiplier les
serveurs. Aucun renommage n'est nécessaire au join : le lobby reste `default`.

**Parcours** (variations actives)

| Moment | Ce qui se passe |
| --- | --- |
| Connexion dans le lobby | tp au spawn `82.5 40 -36.5`, titre « Lobby » |
| `BPSea.launch`, **1re fois** | tp au hub `10 20 10` + message de choix de team |
| `BPSea.launch`, **déjà joué** | tp au hub `166.5 20 12.5` + message de reprise |
| `BPSea.chooseTeam(id, team)` | `setPlayerTeam` puis matchmake vers la mer 1, arrivée au spawn de la team |
| `BPSea.continueJourney(id)` | matchmake vers sa mer + tp à la position sauvegardée |
| Connexion dans une mer | tp à la position sauvegardée (ou au spawn de la team) |

**Aucun bloc, aucun pad.** Il n'y a rien à poser dans le monde : ce sont des fonctions
à appeler depuis tes propres **Code Blocks**.

### ⚠ Règle Bloxd : comment une fonction devient visible depuis un Code Block

En Bloxd, la forme de la déclaration décide de la visibilité :

| Écriture | Visible depuis un autre Code Block ? |
| --- | --- |
| `nom = () => {}` | ✅ oui (affectation globale, sans `const`/`let`) |
| `export function nom() {}` | ✅ oui (export de module) |
| `function nom() {}` | ❌ non, privée au fichier |

`variations.js` étant un module, ses fonctions y sont **privées**. La fin du bloc d'imports
de `src/index.js` les recopie donc sous leur **nom global, sans déclaration**, exactement au
format `nom = () => {}`. C'est ce pont qui rend les appels ci-dessous possibles — **ne jamais**
y écrire `const launch = …`, sinon le nom redevient privé et tes Code Blocks ne le voient plus.

| Fonction (globale) | Effet |
| --- | --- |
| `launch(playerId)` | envoie au hub (1re fois) ou au hub de reprise |
| `chooseTeam(playerId, "PIRATES" \| "MARINES" \| "NONE")` | fixe la team, envoie en mer 1 au spawn de la team |
| `continueJourney(playerId)` | renvoie dans **sa** mer, à **sa** position |
| `enterSea(playerId, 2)` | envoie dans la mer 2 (si elle est déclarée) |

```js
// Code Block du couloir (ou d'un bouton) : rien d'autre à faire.
launch(playerId);
// Puis, dans le hub :
chooseTeam(playerId, "PIRATES");
```

Les mêmes fonctions restent aussi disponibles en objet (`BPSea.launch(...)`,
`BPSea.playerSea(...)`, `BPSea.savePosition(...)`, `BPSea.currentVariation()`) pour le
code interne ; `launch` / `chooseTeam` / `continueJourney` / `enterSea` sont simplement
plus courts à appeler depuis un Code Block.

### Zone neutre : ni capacités, ni dégâts

Dans le lobby, **aucune capacité et aucun dégât** ne sont possibles dans un rayon de
**100 blocs** autour des trois points de passage :

| Point | Coordonnées |
| --- | --- |
| Spawn du lobby | `82.5 40 -36.5` |
| Hub « première sélection de team » | `10 20 10` |
| Hub « reprise » | `166.5 20 12.5` |

Ce qui est bloqué dans la zone :

- le **clic de capacité** (fruit, style de combat, armement, dash d'item) → message
  `Safe zone: no abilities, no damage in this area.` ;
- les **throwables** ;
- **tous les dégâts** : joueur → joueur (corps à corps **et** capacités), mob → joueur,
  joueur → mob, invocations et dégâts de zone. Le test se fait des **deux côtés** : si
  le lanceur *ou* la cible est dans la zone, rien ne passe ;
- le **dialogue PNJ reste possible** (cliquer un PNJ n'est pas une capacité).

Techniquement, trois gardes branchées au démarrage dans `index.js` :

| Garde | Fichier | Couvre |
| --- | --- | --- |
| `setZoneGuard(idInSafeZone)` | `utils/combat.js` | `damage()` : capacités, invocations, dégâts de zone |
| `setSafeZoneCheck(idInSafeZone)` | `core/team.js` | `canDamage()` : corps à corps joueur → joueur |
| `idInSafeZone` / `safeZoneBlocked` | `gameplay/variations.js` | clics, throwables, mob → joueur |

La zone n'existe **que dans la variation `default`** : dans une mer, les coordonnées du
lobby ne veulent rien dire, donc `idInSafeZone` renvoie toujours `false`. Le rayon se
règle avec `LOBBY.safeRadius` (`0` désactive tout).

**Réglages** (en haut du fichier) : `LOBBY` (spawn, les deux hubs) et `SEAS` (une entrée
par mer avec ses positions de team). Ajouter la mer 2 = ajouter une entrée
`2: { id: "sea2", title: "Sea 2", teams: { PIRATES: [...], NONE: [...], MARINES: [...] } }`
puis créer la variation `sea2` dans le Code Editor.

**Données stockées** — trois clés courtes seulement, aucune clé existante touchée :

| Clé | Contenu | Exemple |
| --- | --- | --- |
| `vsea` | numéro de la mer du joueur | `1` |
| `vp<N>` | position sauvegardée dans la mer N (`x,y,z` entiers) | `120,-900,-45` |
| `vtp` | arrivée en attente, consommée au join (saut de variation) | `-15,-911,28` |

La position est écrite toutes les 10 s dans une mer, et à la déconnexion. Les joueurs
d'avant les variations (qui ont déjà une team) sont considérés comme étant en mer 1 :
on ne leur redemande pas de choisir.

---

## Couleurs & icônes (`src/core/theme.js`)

Un seul fichier décide de l'apparence de **tous** les textes du jeu. Chaque message
passe par `say()` / `shout()` (ou par le patch de l'API posé au démarrage), qui :

* remplace toute couleur par une des **7 couleurs** de la palette ;
* remplace tout **emoji** par une **icône Bloxd** (`fa-solid …` ou icône du jeu).

| Élément | Couleur | Valeur |
| --- | --- | --- |
| Pirates | rouge | `#E63946` |
| Marines | bleu clair | `#7DD3FC` |
| Argent | jaune doré | `#FFD700` |
| XP | cyan | `#22D3EE` |
| Succès | vert | `#4ADE80` |
| Danger | rouge | `#EF4444` |
| Information | gris clair | `#CBD5E1` |

Dans le code : `import { C, say, shout } from "./theme"` puis `say(id, [...])`,
`say(id, "texte", { color: C.MONEY })` ou `{ icon: "fa-solid fa-coins" }`.
`themeColor()` est idempotent : une couleur déjà palette revient identique.

### Icônes : une liste blanche, sinon « ? »

Bloxd n'affiche **pas d'erreur** pour une icône inconnue : il montre un **`?`**. La liste des
noms acceptés est fermée (96 icônes du jeu + 209 Font Awesome + 11 marques), donc un nom
inventé ne se voit qu'en jeu — jamais dans les logs.

Tout passe donc par **`safeIcon()`** (`core/theme.js`), appelé par `format()` : c'est le point
unique par lequel passent le chat, les textes de boutique, les descriptions d'items **et** les
Code Blocks (via le patch de l'API).

| Cas | Ce qui se passe |
| --- | --- |
| `fa-solid fa-xmark` (dans `FA_NAMES`) | rendu tel quel |
| `fa-solid fa-brands fa-discord` (dans `FA_BRANDS`) | rendu tel quel |
| `Apple`, `Frozen`, `Compass`, `Boat`… (nom Bloxd : item, bloc, icône du jeu) | **intact** — ces noms ne sont pas validés, ils sont natifs |
| ancien nom (`fa-solid fa-broom`, `fa-gift`, `fa-trash`…) | remplacé par l'équivalent valide (`ICON_ALIAS`) |
| mot nu (`globe`, `flag`) | corrigé (`BARE_ALIAS`) |
| nom inconnu | **`fa-solid fa-circle-info`** (`ICON_FALLBACK`) — jamais de `?` |

**Ajouter une icône** = ajouter son nom dans `FA_NAMES` (ou `FA_BRANDS`), sinon elle sera
remplacée à l'affichage. `npm run check` lance **`tools/check-icons.mjs`**, qui relit la liste
blanche et refuse toute icône du code absente : une faute de frappe casse la CI au lieu de
produire un `?` en jeu.

> **À créer une fois dans le World Code** (dossier `core/`) : `theme.js` est importé par
> `index.js`, `core/team.js`, `core/UI.js`, `fruit/index.js`, `gameplay/*` et `utils/*`.
> Sans lui, aucun de ces fichiers ne se charge.

### Budget de taille (erreur `InternalError: Argument too large`)

Bloxd refuse un `textStyling` trop gros : le moteur lève alors
`InternalError: Argument too large`, qui remonte en `World code tick: …` et peut
couper un handler entier. Un message court peut donc casser si **le stylage**
pèse trop lourd (chaque partie `{str|icon, style}` coûte 40 à 80 caractères de
JSON, et la limite se situe autour de la taille de la sidebar).

`fit()` (dans `theme.js`) est appliqué à **tous** les envois (`say`, `shout`,
`sendMessage`, `broadcastMessage`, boutiques, options client) et dégrade au lieu
de jeter :

1. fusion des parties voisines de même style ;
2. suppression de `fontSize` / `fontWeight` hors titres ;
3. troncature avec `...` en dernier recours.

Budgets : `BUDGET_SIDEBAR` = 1 200 caractères (textes collés à l'écran :
`RightInfoText`, `middleText*`), `BUDGET` = 1 400 (chat, textes flottants),
`BUDGET_SHOP` = 1 500 (panneaux de boutique). `measure()` donne la taille
sérialisée d'un payload.

La sidebar elle-même (`core/UI.js`) est construite pour tenir dans ces 1 200
caractères : une seule couleur par partie, `fontSize` réservé au titre, textes
libres (fruit, style, cible de quête) bornés, et blocs secondaires retirés un à
un si nécessaire — jamais tout le message.

---

## Panneau admin : on ne montre que ce qu'on peut faire

`ACTION_PERMISSIONS` (`src/core/admin.js`) est la **seule** source de vérité, et elle sert
maintenant deux fois : à refuser le clic **et** à décider si le bouton apparaît
(`panelItem()` / `canSeePanelItem()`). Un rang inférieur ne voit donc plus des boutons qui
répondraient « tu n'as pas la permission ».

| Rang | Ce qu'il voit dans le panneau |
| --- | --- |
| **TESTER** (`BASIC`) | `Admin Panel`, `Select Player`, `TP To Player`, `Warp to Island`, `Clear Entities` |
| **MOD** | + `TP Here`, `TP To Position`, `Vanish`, `Freeze Player`, `View Inventory` (+ pages d'inspection), `Mute` / `Unmute` / `Mute List` |
| **DEV** | + `Kick Player` |
| **ADMIN** | + `Announcement` |
| **OWNER** | + `Set Gamemode`, `Ban` / `Unban` / `View Ban List`, `Give Fruit`, `Remove Items`, `Change Money`, `Level / XP Menu` |

Les items d'**affichage** suivent la permission de l'action qu'ils documentent
(`PANEL_ITEM_PERMISSION`) : une page « aucune inspection » n'apparaît pas à qui ne peut pas
inspecter.

**Les TESTER peuvent se téléporter vers un joueur** (`TP To Player` = `BASIC`), et seulement
celui-là : `TP Here`, `TP To Position` et les warps d'île gardent leur niveau (`MOD` / `BASIC`
inchangés), et les TP restent refusés dans le lobby (variation `default`).

---

## Panneau admin : téléportations désactivées dans le lobby

La variation `default` est le **lobby**. Pour qu'un admin ne puisse pas en « sortir »
(ou y faire venir quelqu'un) par erreur, les **quatre boutons de TP** du panneau sont
refusés tant qu'on est dans le lobby :

| Bouton | Dans le lobby |
| --- | --- |
| TP To Player | ❌ refusé |
| TP Here | ❌ refusé |
| TP To Position | ❌ refusé |
| Warp to Island | ❌ refusé |

Le refus est un simple message (`Teleport is disabled in the lobby…`) : rien n'est cassé,
et dès que l'admin est dans une mer, les quatre boutons remarchent normalement.
(`canAdminTp` dans `src/core/admin.js`.)

Le menu **Warp to Island** ne liste que les îles de **la mer où l'on se trouve**
(`currentIslands()`, `src/core/admin.js`) : dans le lobby il n'y a aucune île, donc le bouton
n'est même pas créé (on ne montre que ce qu'on peut faire). Les points de la mer 1
(`ISLAND_WARPS_BY_SEA.sea1`) sont, dans l'ordre du menu :

| Nom | x, y, z |
| --- | --- |
| Starter Pirate | `-12, -910, 24` |
| Middle Town | `635, -900, -206` |
| Starter Marine | `885, -906, -276` |
| Jungle | `1319, -906, 317` |
| Pirate Village | `811, -906, 770` |
| Desert | `650, -913, 1789` |
| Snow Village | `2502, -915, 664` |
| Marine Fortress | `2101, -910, -666` |
| Skylands | `2498, -909, 1247` |

L'ordre du tableau **est** l'ordre du menu : pour ajouter une île, une ligne suffit.

---

## Annonces dans le chat (panneau admin)

Bouton **Announcement** (visible pour **ADMIN+**, `ACTION_PERMISSIONS.announce`), avec une
zone de texte. Le message part **à tous les joueurs en ligne**, préfixé par
`[Announcement]`.

**Syntaxe des couleurs** : une zone = du texte entre deux `*`, suivie juste après par
`<couleur>`.

```
*New update guys*<yellow>, You can now play the *game*<lime> directly from the menu!
```

| Élément | Effet |
| --- | --- |
| `*texte*<yellow>` | `texte` en jaune (gras) |
| `*texte*<#FF00AA>` | couleur hexadécimale exacte |
| texte hors zone | couleur par défaut (blanc) |
| `*texte*` sans `<couleur>` | affiché littéralement (faute de frappe visible) |
| `<n'importe quoi>` | ignoré, le texte reste littéral |

Règles : 400 caractères max, retours à la ligne aplatis, couleur acceptée = nom simple
(`[a-zA-Z]{2,20}`) ou `#rgb` / `#rrggbb`.

**Point technique** : les messages normaux passent par `themeColor()`, qui ramène toute
couleur à la palette de rôle (un `#FF00AA` deviendrait du rouge Pirates, etc.). Une annonce
doit garder *exactement* la couleur demandée : elle part donc par **`shoutRaw()`**
(`src/core/theme.js`), qui utilise l'API d'origine capturée avant le patch du thème. Les
emojis restent convertis en icônes Bloxd et le budget de taille s'applique.

---

## Modération : mute (panneau admin)

Le **mute** est un ban gentil : il empêche **seulement de parler**. Le joueur reste
connecté, joue normalement, garde son stuff, ses coins, sa place — rien n'est supprimé.

**Dans le panneau admin** (visibles pour **MOD+**, sur le joueur ciblé via *Select Player*) :

| Bouton | Effet |
| --- | --- |
| **Mute Player** | liste de durées : `Permanent (until unmuted)`, `10 minutes`, `1 hour`, `1 day` |
| **Unmute Player** | liste des joueurs muets (fonctionne même hors ligne) |
| **Unmute by Name** | on **tape le nom** — filet de sécurité si le nom manque dans la liste |
| **View Mute List** | qui est muet, depuis combien de temps, par qui |

**Règles**

* impossible de se mute soi-même ;
* impossible de mute quelqu'un du **même rang ou au-dessus** (comme pour le kick/ban) ;
* une durée expire **toute seule** : le mute s'efface au premier message suivant, aucun cron ;
* le mute suit le joueur d'une variation à l'autre (lobby → `sea1` → …) ;
* un joueur muet qui essaie d'écrire reçoit un message privé (durée + auteur), rien n'est envoyé aux autres ;
* le tableau **Mute List** se remplit **tout de suite** après un mute (avant, il restait sur son
  instantané d'ouverture du panneau : on venait de muter quelqu'un sans jamais le voir dans la liste).

**Où est-ce stocké** (`src/core/team.js`, à la suite de `handleChat`) — uniquement des clés nouvelles :

| Clé | Où | Contenu |
| --- | --- | --- |
| `mt` | db **joueur** | `Auteur|<fin>` — `0` = permanent, sinon timestamp |
| `admin_muteList` | db **lobby** | `Nom1,Nom2` (liste du panneau, même hors ligne) |
| `admin_mute_<nom>` | db **lobby** | `Auteur|<fin>` |

Le contrôle se fait dans `handleChat` (`src/core/team.js`), avant tout le reste, donc
tous les canaux sont couverts (Global, Team, Crew).

**La liste du lobby n'est qu'un index — la vérité est la db joueur.** Un redémarrage de lobby
efface la db lobby mais **pas** le mute (il est dans la db du joueur) : le joueur restait donc
muet tout en ayant disparu de la liste, impossible à démuter. Trois garde-fous désormais :

1. `getMuteList()` **rajoute** tout joueur muet encore en ligne (lu dans sa db), même si l'index
   l'a perdu — donc il est toujours démutable ;
2. `syncMuteIndex()` est appelé **au join** et depuis `isMuted()` : il recopie la db joueur dans
   l'index, la liste se répare toute seule ;
3. **Unmute by Name** permet de lever un mute dont le nom a disparu de la liste.

Les mutes **expirés** sont nettoyés au passage (plus de nom fantôme qui affiche « expired » ou
qui répond « already muted » à la sanction suivante). Si un nom reste dans l'index sans
enregistrement (db lobby perdue, joueur hors ligne), le tableau l'affiche avec
`(no record — use Unmute by Name)` au lieu de le faire disparaître.

---

## Freeze : figer un joueur (panneau admin)

**Freeze Player** (bouton du panneau admin, **MOD+**, sur le joueur ciblé via *Select Player*)
immobilise complètement la cible. Un second clic la libère ; le bouton affiche en permanence
combien de joueurs sont figés.

**Trois verrous, parce qu'un seul ne suffit pas**

| Verrou | Mécanisme | Ce qu'il bloque |
| --- | --- | --- |
| Effet natif **`Frozen`** | `eff(id, "Frozen", 1500)` rafraîchi chaque seconde | le moteur lui-même : l'icône `Frozen` s'affiche et le déplacement est refusé |
| Vitesse / saut | `setMoveSpeed(id, 0)`, `setJumpAmount(id, 0)`, `setAirJumpCount(id, 0)` | course, saut, **doubles sauts** |
| Re-téléportation | `teleport(id, …)` vers la position verrouillée, toutes les 1 000 ms | dashes, impulsions, grappins, capacités de déplacement : ils ramènent le joueur à sa place |

Le re-téléport n'a lieu **que si la cible s'est réellement écartée** (plus de 0,35 bloc) : un
joueur sage ne reçoit aucun paquet `setPosition` inutile.

**Règles**

* impossible de se figer soi-même ;
* impossible de figer un rang **égal ou supérieur** au sien, ni un rang **immunisé au crowd
  control** (ADMIN, OWNER) : `Frozen` est déclaré dans `CC_EFFECTS`, donc `applyEffect` le
  refuse de lui-même ;
* **changer de cible lève le freeze** de l'ancienne — sinon un joueur restait figé pour
  toujours dès qu'on passait à quelqu'un d'autre ;
* **la déconnexion lève le freeze** (`adminLeave` → `clearFreezeOnLeave`), pour qu'un id
  recyclé plus tard n'hérite pas d'un freeze fantôme ;
* si la cible **meurt**, on ne la téléporte pas : on attend son respawn et on reverrouille
  sur la position d'arrivée (`api.getHealth` passe à 0 pendant l'écran de mort, alors que le
  cache des joueurs listés la compte encore vivante) ;
* expiration de sécurité à **10 minutes**, pour qu'une panne de panneau ne laisse personne
  figé indéfiniment ;
* la **restauration n'est jamais bloquée** : `restoreClientOption` remet la vitesse, le saut
  et les doubles sauts exacts d'avant le freeze (un joueur qui avait un bonus de vitesse le
  retrouve intact), même si son rang a changé entre-temps.

**Où est-ce stocké ?** Nulle part sur disque : `frozenPlayers` est une `Map` en mémoire
(`src/core/admin.js`), vidée à la levée. Un redémarrage de lobby libère donc tout le monde.

---

## Vanish : les faux messages join / leave

Activer Vanish diffuse un faux « X left » (et un faux « X joined » au retour) pour que
l'admin disparaisse des yeux des autres. Ces messages doivent être **indistinguables** d'un
vrai message du moteur : si leur teinte diffère, on repère immédiatement qu'un admin se
cache.

Ils passent donc par **`shoutRaw()`** et non `shout()` — sinon `themeColor()` ramenait
`#cef3ff` à `#7DD3FC` (MARINE), ce qui trahissait le faux message. La teinte est réunie
dans une seule constante, `VANISH_CHAT_COLOR` (`src/core/admin.js`) : c'est le seul
endroit à changer si la couleur réelle du moteur évolue.

---

## Inspection d'inventaire : couleurs

Dans *View Inventory*, chaque item est coloré par **catégorie d'objet** — ce ne sont pas
des couleurs de rôle, elles gardent donc leur teinte exacte (`ITEM_COLOR` dans
`src/core/theme.js`, seule exception assumée à la règle « une couleur par rôle ») :

| Catégorie | Couleur |
| --- | --- |
| Item normal | gris un peu plus foncé `#8B8F98` |
| Item normal renommé (`customDisplayName`) | gris très clair `#E5E7EB` |
| Fruit du démon (mangeable, sneak + click) | rouge-orange `#FF6B35` |
| **Ability** — item d'un fruit | bleu-violet `#8B5CF6` |
| **Capacity** — item d'un style de combat | beige-rose `#E8B4A0` |

Ability et capacity partagent parfois le même item de base (Paintball Explosive Item) :
c'est le **nom affiché** (`customDisplayName`) qui tranche — `isFightingStyleAbilityName()`
d'abord, puis `isAbilityItemName()`.

Un fruit rangé sous son nom de bloc est reconnu (table `fruitItemMap`), et un item de
compétence est détecté par `isAbilityItemName` (`src/fruit/abilities.js`).

---

## Effets : un même effet ne s'empile que si la provenance change

`applyEffect()` (dans `src/utils/combat.js`) gère les effets de statut : Slowness, Speed,
Weakness, Health Regen… Avant, **chaque application s'additionnait** : deux Slowness niveau 2
donnaient un niveau 4, dix donnaient 20 — une même abilité pouvait donc se cumuler avec
elle-même (deux clics, ou un effet de tick qui repasse).

Aujourd'hui chaque effet temporaire est enregistré dans un **registre de provenance** :
`cible → effet → { provenance: niveau }`, avec une date d'expiration. La règle est :

| Situation | Résultat |
| --- | --- |
| **même provenance** (même joueur + même abilité) | la durée se rafraîchit, le **niveau ne monte pas** ; si la même abilité revient plus fort, on garde le plus fort |
| **provenances différentes** (autre joueur, ou autre abilité) | les niveaux **s'additionnent** — vrai cumul de groupe |
| aucune provenance connue | repli sur l'effet lui-même (`fx\|Slowness`) : dans le doute, on **ne cumule pas** |

La provenance est posée par `withEffectSource()` au moment du cast, et il n'y a qu'**un seul
point de passage par famille d'abilité** :

* `src/fruit/abilities.js` — `onClick` / `onPlayerClickUp` des abilités de fruit (`bind.id`) ;
* `src/gameplay/fightingStyles.js` — `handler` des capacities (`matched.id`).

```js
withEffectSource(playerId, abilityId, () => cast(...));   // "joueur|abilité"
```

Un effet appliqué **hors** du cast (timer, boucle de tick, aura au sol) ne connaît pas de
provenance. Pour la rendre explicite, deux options :

```js
withEffectSource(pid, "gas", () => eff(id, "Slowness", 1200, { inbuiltLevel: 3 }));
eff(id, "Slowness", 1200, { inbuiltLevel: 3, source: "gas", casterId: pid });
```

`withEffectSource` est aussi exposé comme **nom global** (voir le pont en tête de
`src/index.js`) pour les Code Blocks.

Détails qui comptent :

* les effets **permanents** (`duration === null`, ex. bonus de fruit) restent le **niveau de
  base**, et les empilements temporaires se posent par-dessus ; à l'expiration on revient
  exactement à ce niveau de base ;
* à l'expiration, on ne remet pas « le niveau de base » à l'aveugle : on **recalcule la somme
  des empilements encore vivants**, donc si A expire avant B, B reste actif ;
* `removeEffect()` oublie les empilements de cet effet (sinon le registre le réappliquerait
  au tick suivant) ; `clearPlayerEffects()` (mort, respawn) vide tout ;
* l'horloge est celle du scheduler (`nowMs()` dans `src/utils/timer.ts`, 1 tick = 50 ms) :
  les effets vieillissent au même rythme que les timers, même si le serveur lag.

---

## Stats : la courbe de Regen

`src/gameplay/stats.js` calcule la régénération à partir des points investis :

```js
const p = 1 - Math.pow(REGEN_DECAY, r);   // 0 -> 1 quand r grandit
amount   = 5%   +  8%   * p;              // part de vie rendue par tick
interval = 5000 -  3500 * p;              // ms entre deux soins
start    = 5000 -  2500 * p;              // ms sans être touché avant reprise
```

`REGEN_DECAY` valait **`1`**, donc `1^r = 1` et `p = 0` **quel que soit le niveau** : tous les
joueurs affichaient `Regen 5% / 5s`, du premier point au dernier, sans jamais rien gagner.
Il vaut désormais `0.97`, avec des plafonds revus à la baisse :

| Points | Affichage | PV/s | Temps sans être touché |
| --- | --- | --- | --- |
| 0 | `Regen 5% / 5s` | 1,0 | 5,0 s |
| 10 | `Regen 7.1% / 4.1s` | 1,7 | 4,3 s |
| 25 | `Regen 9.3% / 3.1s` | 3,0 | 3,7 s |
| 50 | `Regen 11.3% / 2.3s` | 5,0 | 3,0 s |
| 100 | `Regen 12.6% / 1.7s` | 7,6 | 2,6 s |

**Pourquoi ce nerf** : avec 20 % de bonus maximum et un tick plancher à 200 ms, 100 points
donnaient 22,3 % toutes les 0,84 s, soit **27 PV/s** — plus vite que la plupart des dégâts
d'abilité, donc impossible à tuer autrement qu'en un seul burst. Trois leviers ont été
baissés (soin par tick, cadence, délai de reprise) : à 100 points on est à **7,6 PV/s**, soit
3,5× moins, et il faut rester **2,6 s** sans être touché avant que ça reparte.

L'affichage, les valeurs envoyées au moteur (`healthRegenAmount` / `healthRegenInterval` /
`healthRegenStartAfter`) et la courbe sont les mêmes : impossible de voir un chiffre qui ne
correspond à rien. Sous la seconde, le temps s'affiche en `ms`, sinon deux paliers se
ressembleraient.

---

## Settings : les réglages du joueur (boutique)

Une **quatrième catégorie de boutique**, `Settings` (`src/core/UI.js`). On n'y achète rien :
chaque item est un interrupteur, une liste ou une action, coût 0.

**Elle n'existe PAS dans le lobby** (`variation "default"`) : il n'y a ni île ni mer à y
régler. Elle apparaît dès qu'on est dans une mer, et disparaît quand on revient au lobby
(nos flèches sont effacées au passage). Si un saut de variation ne recharge pas le joueur, un
contrôle à chaque tick (`settingsSyncVariation`) s'en aperçoit tout seul.

| Item | Effet |
| --- | --- |
| `Island Arrows` | interrupteur général : **tout** montrer / **tout** cacher |
| `Hide an island` | liste déroulante des îles **affichées** → en cache une |
| `Show an island` | liste déroulante des îles **cachées** → en remontre une |
| `Respawn` | tue le joueur pour le débloquer (coincé dans un bloc, sous la map…) |
| `PvP Protection` | active / désactive le bouclier de 5 min accordé contre son tueur au respawn |

**Les deux listes sont complémentaires, et c'est le code qui le garantit** : `Hide` ne propose
que ce qui est visible, `Show` ne propose que ce qui est caché. Valider **déplace** l'île d'une
liste vers l'autre — une île ne peut donc jamais être dans les deux, ni disparaître des deux.
Cacher trois îles sur neuf donne `Hide` à 6 entrées et `Show` à 3.

**Une couleur par île**, choisie sur son thème (`ISLAND_STYLE`, `src/core/UI.js`) : Jungle en
vert, Snow Village en glace, Marine Fortress en bleu profond, Desert en sable, Pirate Village
en rouge, Skylands en violet, etc. La même couleur sert pour la flèche **et** pour la ligne de
boutique, donc on reconnaît une île à sa couleur avant de lire son nom.

| Île | Code | Couleur |
| --- | --- | --- |
| Starter Pirate | `SP` | `#F0A35E` |
| Middle Town | `MT` | `#9AA7B4` |
| Starter Marine | `SM` | `#5AA9E6` |
| Jungle | `JU` | `#4CAF50` |
| Pirate Village | `PV` | `#C0392B` |
| Desert | `DE` | `#E5C15A` |
| Snow Village | `SV` | `#A8E0F5` |
| Marine Fortress | `MF` | `#2F5FA8` |
| Skylands | `SK` | `#B388E8` |

Le **code** est la clé de réglage d'une île : deux îles ne doivent jamais partager le même,
sinon cacher l'une cacherait l'autre (une île ajoutée sans thème reçoit ses initiales et le
gris neutre, elle ne casse rien). Le nom choisi dans une liste est résolu en **ignorant la
casse** ; une valeur inconnue (ou la ligne `(nothing left)` d'une liste vide) ne fait rien et
le dit.

**Masquer une île ne touche qu'à elle.** Quand tout est caché et qu'on en rallume une seule,
les autres **restent** cachées (pas besoin de huit clics) ; à l'inverse `Show all` efface
toutes les exceptions, l'interrupteur général doit vraiment tout rallumer.

**Les coordonnées des flèches ne sont pas recopiées** : `applyIslandArrows()` boucle sur
`currentIslands()` (`src/core/admin.js`), la même table que les `Warp to Island` du panneau
admin. Une île déplacée se corrige donc à **un seul endroit**, et les deux fonctions ne
peuvent pas se contredire.

**Les îles appartiennent à une mer.** La table s'appelle `ISLAND_WARPS_BY_SEA` et sa clé est
le nom de la variation : aujourd'hui `sea1` seulement. Dans le lobby, `currentIslands()`
renvoie une table vide, donc ni flèche ni `Warp to Island`. Le jour où la mer 2 existe, il
suffit d'ajouter une entrée `sea2` : les deux fonctions (flèches joueur et warp admin)
suivent sans autre changement.

Chaque flèche porte un id stable (`isle-pirate-village`, `isle-snow-village`…) : masquer les
îles ne touche **jamais** la flèche de quête, qui a son propre id (`core/quest.js`), et la
déconnexion n'efface que nos ids (`settingsLeave`).

Trois **clés db joueur**, courtes, créées à la première utilisation :

| Clé | Valeur par défaut | Autre valeur |
| --- | --- | --- |
| `dirArrow` | `1` : flèches d'îles affichées | `0` = plus aucune |
| `arrowOff` | absente : aucune île masquée | codes masqués, ex. `"JU,DE"` |
| `pvpProt` | `1` : protection PvP accordée | `0` = refusée |

`pvpProt` n'est pas décoratif : `isPvPProtectionEnabled()` (`src/utils/combat.js`) est lu au
**moment d'accorder** le bouclier, au **moment de le tester**, et le message de mort ne
promet plus une protection qui n'existe pas. Couper l'option **retire aussi le bouclier en
cours** (un réglage ne doit pas laisser un état fantôme).

**Respawn** n'est pas une sortie de combat gratuite : refusé si un **joueur** a frappé la
cible dans les 10 dernières secondes (`getLastDamager()`, `src/utils/killAttribution.js`) —
un coup de mob ne bloque rien. Il passe par la même confirmation que les achats
(`confirmAction(playerId, "respawn", …)` : deux clics en 3 s), puis `api.killLifeform()`,
avec `api.setHealth(id, 0, …)` en secours.

---

## Achats : une seule confirmation pour tout

Tout achat demande **deux clics dans la même fenêtre** : le premier annonce ce qui va
être acheté, le second valide. Une seule implémentation, dans `src/utils/data.js` :

```js
confirmAction(playerId, cle, message)
// false  = on vient d'afficher le rappel
// true   = achat confirmé (le 2e clic est arrivé à temps)
```

| Réglage | Valeur |
| --- | --- |
| Fenêtre | `CONFIRM_MS` = **3 000 ms** |
| Rappel visuel | effet unique + « Click again to confirm » |
| Message | même phrase de fin partout : « Click again within 3s to confirm. » |

Ce qui utilise cette confirmation :

| Achat | Clé |
| --- | --- |
| objet chez un PNJ (`buyItem`) | `buy\|<item>\|<quantité>\|<prix>` |
| style de combat (`buyFightingStyle`) | `fs\|<style>` |
| Armament Haki (`buyArmamentHaki`) | `haki` |
| machine à fruits (`rollFruit`) | `fruit` |
| recruteur de team (voir plus bas) | `team\|<TEAM>` |

Avant, il y avait trois comportements : un effet `verif` de **2 s** pour les objets, une
`Map` de **5 s** pour les styles de combat, et **rien du tout** pour le haki et la machine
à fruits (achats immédiats, y compris à 14 000 pièces). Le joueur ne pouvait pas savoir
quel clic validait quoi.

Deux achats ont un cas particulier, documenté plus bas :

* **Armament Haki** — si le joueur connaît déjà le haki, le vendeur **redonne l'item**
  (`Small Black Pod`) sans rien facturer : ce n'est pas un achat, donc pas de confirmation ;
* **machine à fruits** — le prix est débité **à la livraison** du fruit, pas au lancement de
  l'animation (voir « Machine à fruits »).

La clé compte : enchaîner deux achats **différents** ne valide jamais le premier par
erreur, et le rappel de l'un ne confirme pas l'autre. La confirmation est remise à zéro
à la déconnexion (`clearConfirm`) et après un paiement refusé (`cancelConfirm`).

Les achats en **points de stat** (`handleShopBuy`) ne sont pas concernés : ils ne coûtent
pas d'argent et se remboursent au reset.

---

## Économie : vol d'argent, prime et anti-fabrication

Un kill entre joueurs ne rapporte **jamais** d'XP (seuls les mobs et les quêtes en donnent) et
ne fait rien tomber : la seule chose qui bouge, c'est l'argent et la prime
(`handleBountyKill`, `src/core/team.js`).

| Kill | Règle | Qui paie |
| --- | --- | --- |
| Pirate (ou `None`) tue quelqu'un | **10 % de l'argent de la victime**, plafonné à **1 000 $** — transféré : la victime est débitée | la victime |
| Pirate tue une cible **≥ 40 niveaux plus faible** | **aucun argent volé** ; **5 %** de l'argent de la victime en **prime**, plafonné à 1 000 $ | personne (montant créé) |
| Marine tue un pirate | encaisse **`min(prime, 10 000 $)`**, la prime repart à 0 | le serveur |

### Le piège : une prime créée est un robinet

La prime « cible trop faible » ne débite **rien** à la victime (c'est tout l'intérêt : on ne
prend rien au petit joueur). Sans limite, on tuait donc le **même alt** en boucle pour gonfler
sa prime sans dépenser un dollar, puis un **Marine** venait l'encaisser en argent frais :

| Étape | Argent du main | Prime du main |
| --- | --- | --- |
| 10 kills de l'alt (écart ≥ 40 niveaux) | inchangé (20 000 $) | 0 → **+10 000 $** |
| un Marine tue le main | inchangé | 10 000 → 0, **+10 000 $ encaissés** |

Le duo pirate + alt (`None`) ne peut pas encaisser seul (une prime ne se convertit qu'en team
**Marine**), mais l'alt devient Marine gratuitement au PNJ recruteur : **deux comptes suffisaient**
à fabriquer 10 000 $ par minute.

### Les deux fenêtres par paire (10 minutes)

`BOUNTY_PAIR_MS = 10 * 60 * 1000`, et deux tables `"tueur|victime"` purgées chaque minute :

* **`WEAK_MINT`** — une seule prime anti-farm par paire et par fenêtre : les kills suivants sur
  la même victime ne donnent rien (message « no bounty (N min left) »), et la victime n'est
  toujours pas débitée ;
* **`MARINE_COLLECT`** — un Marine ne peut pas encaisser deux fois la prime du **même** pirate
  dans la fenêtre : la prime **reste sur la tête du pirate** (elle sera encaissable plus tard, ou
  par un autre Marine), il n'y a simplement pas de second paiement.

Résultat : la boucle « je tue mon alt → mon Marine me tue » ne crée **plus un dollar** (vérifié
par simulation sur 50 kills : total des comptes inchangé), alors qu'un vrai joueur garde la
totalité de la prime anti-farm la première fois qu'il abat un petit joueur, et un Marine garde
sa prime la première fois qu'il abat un pirate.

---

## Machine à fruits : on ne paie qu'un fruit livré

`rollFruit` (`src/fruit/index.js`) lance une animation d'environ 2,4 s (tick par tick) avant de
donner le fruit. Deux défauts corrigés :

**1. L'argent était débité au lancement.** Un joueur qui se déconnectait (ou changeait de
variation) pendant l'animation perdait sa mise : le remboursement tentait d'écrire dans la base
d'un joueur **déjà parti**, ce qui échoue — donc l'argent était perdu *et* une erreur partait
dans les logs (`fruitRoll.refund`). Désormais :

| Moment | Ce qui se passe |
| --- | --- |
| lancement | le solde est **vérifié**, rien n'est retiré |
| livraison du fruit | `fruitPay()` relit le solde et débite **une seule fois** ; si le joueur a dépensé entre-temps : « Not enough money anymore. Nothing was taken from you. » |
| déconnexion en plein tour | `refundRoll()` arrête le minuteur, **aucune écriture en base**, aucune erreur |
| inventaire plein / échec `giveItem` | remboursement du prix déjà débité (seul cas où il y a quelque chose à rendre) |

**2. L'animation continuait sur un fantôme.** Le minuteur appelait `setClientOption`
(`middleTextUpper`) et `playSound` sur un id disparu, d'où des `fruitRoll.middleTextUpper` /
`fruitRoll.playSound` en boucle. Chaque tick vérifie maintenant `fruitOnline(playerId)` et
s'arrête net au premier tick suivant le départ.

**3. `getPlayerIds()` n'est pas une preuve de présence.** Il peut encore lister un joueur qui
vient de partir, alors que `setClientOption`, `setPlayerDbValue` et `playSound` lèvent déjà
« Player … is not in this world ». On ne parie donc pas sur lui : dès que **notre** handler de
départ passe (`clearFruitCallbacks`), le joueur est marqué dans `GONE` — ce drapeau est retiré
à la reconnexion (`handleFruitJoin`). Tant qu'il est posé, plus un seul appel API, plus aucun
message, plus aucun remboursement tenté : la machine s'arrête en silence, et le joueur ne perd
rien.

Le même piège existait dans `onPlayerLeave` : les sorties étaient enchaînées par des virgules,
donc **une** exception dans la première sautait toutes les suivantes (dont la machine à fruits,
qui continuait de tourner). Chaque sortie est maintenant isolée dans un `Gt("leave.…")`.
**Le prix affiché pendant l'animation est donc une promesse, pas un débit** : il est prélevé au
moment où le fruit tombe dans l'inventaire.

---

## Boss Garp : il apparaît à côté du joueur

`startBoss()` (`src/utils/haki.js`, appelé par le Code Block du portail) tirait **deux positions
au hasard** dans un rectangle de 250 × 286 blocs : le joueur d'un côté, le boss de l'autre, donc
un combat qui pouvait commencer à 250 blocs de distance (le boss mettait des secondes à arriver,
ou perdait sa cible en route).

Maintenant :

1. le joueur est téléporté dans l'arène (tirage aléatoire, sol vérifié) ;
2. sa position est **relue après le TP** ;
3. le boss est posé à **8 blocs** (`BOSS_SPAWN_DIST`) autour de lui, angle aléatoire, point borné
   à l'intérieur de l'arène et passé par `getSafePosition` (jamais dans un bloc).

Le combat démarre donc dans la seconde, et les gardes apparaissent autour du boss, donc autour du
joueur.

### En jeu : le PNJ `Garp Summoner`

Garp n'avait **aucun point d'entrée** hors d'un Code Block (le portail appelait `startBoss(playerId)`).
Un PNJ le lance maintenant comme un marchand : premier clic = ce qui va se passer (arène, gardes, ce
qu'il lâche), second clic dans les 3 s = téléportation dans l'arène et combat.

```js
startGarpBoss(playerId)   // le chemin unique, exporté pour le PNJ
startBoss(playerId)       // ancien nom du Code Block : il ne fait que relayer
```

Les deux clics sont gratuits : ce n'est pas un achat mais une mise en garde, on ne téléporte pas
quelqu'un dans une arène de boss sur un clic malheureux. Le refus « quelqu'un se bat déjà » vient du
combat lui-même, pas du PNJ (pas de message en double).

---

## PNJ : ce que vend chaque nom

Le nom du PNJ **est** son script (voir `attackNPC`, `src/gameplay/NPCs.js`). Pour ajouter un
marchand, il suffit de le nommer dans le monde comme dans ce tableau — aucun autre fichier à
toucher.

| PNJ | Objet | Prix | Quantité |
| --- | --- | --- | --- |
| `Apple Seller` | Apple | 75 | 3 |
| `Coconut Seller` | **Cracked Coconut** | 200 | 3 |
| `Steak Seller` | Steak | 180 | 3 |
| `Cornbread Seller` | Cornbread | 140 | 3 |
| `Corn Seller` | Corn | 80 | 3 |
| `Bread Seller` | Bread | 110 | 3 |
| `Chili Seller` | Chili Pepper | 120 | 2 |
| `Mango Seller` | Mango | 120 | 3 |
| `Venison Seller` | Cooked Venison | 180 | 3 |
| `Pork Seller` | Cooked Porkchop | 180 | 3 |
| `Mutton Seller` | Cooked Mutton | 180 | 3 |

Tous passent par `buyItem()` : **la confirmation 3 s s'applique automatiquement**, il n'y a rien
à ajouter pour un nouveau vendeur.

### `Haki Buyer` : il rachète les Haki Fragments

`Haki Buyer` (ou `Haki Fragment Buyer`) achète le butin de Garp à un **prix tiré au hasard entre 100
et 300 Coins** par fragment, avec la même confirmation en deux clics que partout ailleurs.

- le butin de Garp est un `Black Carpet` renommé **« Haki fragment »** (`dropHaki`,
  `src/utils/boss.js`). C'est **le même item** que celui demandé par le `Haki Seller` : c'est voulu.
  Le boss reste donc rentable pour un joueur qui a déjà appris le haki — il refarme Garp et revend
  les fragments — au lieu de n'être qu'une étape obligée ;
- **tous les `Black Carpet` sont vendus** (inventaire **et** Moonstone Chest, via `customItem`), donc
  la confirmation prévient explicitement que ceux gardés pour le `Haki Seller` partent aussi : rien
  n'est vendu sans le second clic, et le total est annoncé avant ;
- le prix est tiré **une fois par offre** et mémorisé 3 s : la clé de confirmation est fixe, donc le
  second clic retrouve exactement le prix annoncé au premier (sans ce cache, le prix changerait à
  chaque clic et la vente ne se confirmerait jamais) ;
- l'inventaire est **relu après confirmation** : on ne paie que ce qui est réellement retiré.

---

## Haki : le vendeur redonne l'item

`Small Black Pod` est l'item **unique** qui sert à armer le haki. S'il est perdu (lâché, filtré
d'inventaire, avalé par un respawn), le joueur savait le haki mais n'avait plus aucun moyen de
l'armer : le vendeur répondait « You already know Armament Haki. » et rien d'autre.

`buyArmamentHaki` (`src/utils/haki.js`) suit maintenant la règle des **fighting styles** :

| État du joueur | Réponse du vendeur |
| --- | --- |
| ne connaît pas le haki | achat normal : **3 s de confirmation** (clé `haki`), 14 000 pièces + 1 Black Carpet |
| connaît le haki, **pod absent** | « You already know Armament Haki. Your Small Black Pod has been given back. » — **gratuit**, sans confirmation |
| connaît le haki, pod présent | « …your Small Black Pod is in your inventory. » — aucun doublon |

`giveHakiPod()` est partagé par l'achat et le refresh : il ne crée jamais un second pod
(`getInventoryItemAmount` avant `giveItem`).

---

## PNJ recruteurs de team

Deux PNJ à placer dans le monde (comme les marchands `Fruit Dealer`, `Haki Seller`…),
nommés exactement :

| Nom du PNJ | Team appliquée |
| --- | --- |
| `Pirate Recruiter` | `PIRATES` |
| `Marine Recruiter` | `MARINES` |

Au **premier clic**, il annonce la team dans laquelle il va te basculer, la team actuelle
et la conversion des armes. Au **second clic** (même fenêtre de 3 s que tous les achats),
le changement est appliqué par `setPlayerTeam()` : base de données, nametag, canaux de
chat, sidebar, armes de team et classement sont mis à jour d'un coup. S'il est déjà dans
cette team, il le dit et ne fait rien.

Le nom est le seul branchement (`TEAM_RECRUITERS` dans `src/gameplay/NPCs.js`) : renommer
le PNJ dans le monde suffit à le désactiver, et en ajouter un troisième pour une future
team ne demande qu'une ligne.

---

## Garde-fous de mouvement : bateau et crowd control

Tous les déplacements « subis » passent par quatre fonctions de `src/utils/combat.js` —
`impulse()`, `setVel()`, `teleport()` et `applyEffect()` (les blocs les reçoivent via
`FA.c`, jamais `api.applyImpulse` en direct). Deux gardes y sont branchées.

### 1. Bateau : plus de dash qui propulse l'embarcation

Un bateau est une **physique de joueur** (`api.getPlayerPhysicsState(id).type`) : quand le
joueur est dedans, la coque suit ses déplacements. Un dash qui posait 18 blocs/s sur le
joueur emportait donc le bateau à une vitesse absurde.

| Type de physique | Sens | Déplacement bloqué |
| --- | --- | --- |
| `0` | à pied | non |
| `1` | bateau (normal / obsidian / speedboat) | **oui** |
| `5` | monture | **oui** |

Le joueur est prévenu (`No movement abilities while you are in a boat.`, un message
toutes les 3 s) — sinon la capacité partait avec son cooldown sans rien faire de visible.
La lecture de la physique est mise en cache le temps d'un tick (50 ms) : `impulse()` sert
à des jets de projectiles qui touchent des dizaines d'entités.

Les deux dashs qui appelaient `api.setVelocity` en direct (Blade Dash, Bomb Dash) et le
blink du portail (`api.setPosition`) passent maintenant par `setVel()` / `teleport()`.

### 2. Crowd control : ADMIN et OWNER intouchables

Chaque rang de `src/core/ranks.js` porte désormais un **flag** :

```js
immuneToCrowdControl: true,   // OWNER et ADMIN ; false partout ailleurs
```

Une ligne suffit pour l'étendre à un autre rang. Quand il est actif, le joueur ne peut être :

| Ce que fait la capacité | Primitive gardée | Bloqué |
| --- | --- | --- |
| pousser / attirer | `impulse()` | Gravity Grab, Shambles, knockbacks |
| figer sur place | `setVel()`, `setMoveSpeed()` | Grapple, Freeze du Dought, cage du Ghost |
| déplacer | `teleport()` | Control Domain, Shambles, Gravity Grab, Grapple |
| braquer la caméra | `forceCameraDir()` | Control Domain |
| ralentir / affaiblir | `applyEffect()` (`CC_EFFECTS`) | `Slowness`, `Weakness`, `Blindness` |
| bloquer le saut | `setClientOption(jumpAmount)` | root du Gas |

`CC_EFFECTS` ne contient que des effets **qui existent réellement** dans Bloxd : un nom
inventé ne bloque rien, il donne juste l'illusion d'une protection.

**Le cas Control Domain.** C'était le trou : la capacité ne poussait pas, elle *repositionnait*
chaque cible en orbite (`api.setPosition`) **et** lui braquait la caméra
(`forcedCameraDirection`), deux appels bruts qui contournaient les gardes. Les deux sont
passés par `teleport()` / `forceCameraDir()`, donc un ADMIN ou un OWNER reste planté au sol,
libre de son regard, pendant que les autres tournent autour du dôme.

Détail important : `setMoveSpeed()` et `forceCameraDir()` ne bloquent que le **sens
contraignant**. Remettre une vitesse normale (`>= 1`) ou relâcher la caméra (`null`) passe
toujours — sinon un sort interrompu laisserait la victime figée.

Ce qui reste : les **dégâts** (on peut frapper un admin) et les **buffs** (Speed,
Health Regen…). Et surtout **son propre déplacement** : un admin garde ses dashes, ses
téléports et ses dashs aériens.

**La provenance, pas un minuteur.** La première version ouvrait une fenêtre de 2,5 s
autour de chaque cast : n'importe quel clic d'item rendait l'admin déplaçable pendant
2,5 s, et Control Domain en profitait à chaque tick. Il suffisait de jouer normalement
pour être contrôlé. Le remplacement est un **acteur** (`utils/timer`) :

* `withEffectSource(joueur, …)` pose l'acteur pendant le cast ;
* `run()` mémorise l'acteur de la coroutine et le restaure à chaque reprise, donc
  `sleep()` ne le perd pas ;
* `call()` (chargeur des Code Blocks) le pose au nom du joueur qui déclenche le handler.

Une primitive de déplacement n'est donc autorisée que si **l'acteur est la cible
elle-même** : le joueur qui se déplace, jamais celui qui a cliqué deux secondes plus tôt.
Un admin qui utilise une capacité pendant le dôme bouge (c'est son cast), et les
téléports du dôme — qui portent l'acteur du lanceur du dôme — sont refusés.

Les **effets** (`Slowness`, `Weakness`…) ignorent totalement l'acteur : ils sont refusés
pour un rang immunisé dans tous les cas, c'est le point le plus simple à tester
(`eff(adminId, "Slowness", 3000, { inbuiltLevel: 3 })` ne fait rien).

---

## Arborescence

```
.
├── src/
│   ├── index.js                  # point d'entrée du World Code
│   ├── core/                     # UI, équipages, grades, admin
│   │   ├── theme.js              # ⭐ palette unique + emojis -> icônes Bloxd (OBLIGATOIRE)
│   │   ├── team.js               # ⭐ équipes + chat + mute (même fichier)
│   │   ├── admin.js              # ⭐ panneau admin (ban, mute, TP, inventaire)
│   │   └── ranks.js              # grades + permissions
│   ├── gameplay/                 # quêtes, mobs, PNJ, stats, endurance, codes
│   │   ├── variations.js         # ⭐ lobby + une variation par mer (vsea / vp<N>)
│   │   ├── saber.js              # ⭐ Saber Quest : boutons, porte, PNJ, 2 boss
│   ├── fruit/
│   │   ├── index.js              # ⭐ équiper / lancer un fruit (lisible, rembourse cooldown)
│   │   ├── abilities.js          # table FRUIT_ABILITIES (cooldowns, items)
│   │   ├── fruitData.js          # données pures
│   │   └── func-abilities.js     # ⭐ pont + chargeur BP3 lisible et autonome (95 shims)
│   ├── blocks/                   # ⭐ 32 sources LISIBLES (1 par capacité / état)
│   ├── utils/                    # timer, combat, fx, world, boss…
│   └── build/                    # ⚠ 3 modules absents (voir plus bas)
├── code-blocks/                  # ⭐ 5 packs GÉNÉRÉS + manifest.json + README
├── tools/
│   ├── pack-format.mjs           # format BP3 pour les outils Node
│   ├── build-blocks.mjs          # ⭐ sources → nombre minimal de Code Blocks
│   ├── build-world.mjs           # bundle optionnel src/index.js → dist/world.js
│   ├── check-imports.mjs
│   ├── check-handlers.mjs        # ⭐ détecte un handler sans shim (cooldown only)
│   └── check-blocks.mjs          # ⭐ intègre les packs + simule le chargeur
└── package.json
```

---

## Pourquoi Control et Gravity ne faisaient « que le cooldown »

Le World Code (`handleAbilityItemClick`) pose le cooldown **avant** d'appeler le
handler, et l'appel est dans un `try/catch` silencieux. Si le handler n'existe
pas, tout semble normal : cooldown, message « ready », mais **aucun effet**.

Quatre causes cumulées, toutes invisibles dans les logs :

| # | Cause | Détail |
| --- | --- | --- |
| 1 | **Le chargeur s'arrêtait au premier trou.** | Il lisait `z = 100002 + 2i` et faisait `break` dès qu'une position n'était pas un Code Block avec du texte. Un seul bloc déplacé/manquant → **tous les suivants étaient ignorés**. Control (4 blocs) et Gravity (4 blocs) étaient justement **les derniers** de la chaîne. |
| 2 | **Ces deux fruits étaient coupés en 4 blocs.** | `Control` partageait `globalThis.__CT__`, `Gravity` partageait `globalThis.__GV__`. Les blocs « état » n'enregistrent aucun handler : s'ils sautaient, les blocs « capacités » levaient une `TypeError` au chargement (Gravity) ou tournaient avec un état vide (Control). |
| 3 | **Attente asynchrone + bug réel dans Control.** | `z100052-control-domain-2.js` attendait `ctCtl` avec 200 retries : au-delà, `onPlayerClickControlDomain` n'était **jamais enregistré**. Et il appelait `point(...)`, une fonction **jamais déstructurée** → `ReferenceError` avalée par le `try/catch` de la coroutine du dôme. |
| 4 | **Limites et cache fragiles.** | 33 blocs max, refus de tout bloc > 16 000 caractères, et hash = longueur + 3 caractères : un bloc modifié pouvait ne jamais être réévalué. |

### Ce qui est corrigé

- ✅ **Un fruit = un pack.** `control-*` (4 fichiers) est entièrement dans
  `pack-05.js`, `gravity-*` (4 fichiers) entièrement dans `pack-04.js`, dans le
  bon ordre. Le build **refuse** de les séparer.
- ✅ **Évaluation déterministe.** Chaque pack est un programme autonome ; le
  chargeur découpe sur `/*BP3M*/` et évalue les modules **les uns après les
  autres** (petits `eval`, jamais > 16 k). L'état `__CT__` / `__GV__` est donc
  toujours créé avant d'être lu.
- ✅ **`point` ajouté** et **inscription synchrone** de `onPlayerClickControlDomain`
  (fini les 200 retries). `npm run check` passe `no-undef` sur les 32 sources.
- ✅ **Plus de silence.** Le chargeur annonce chaque pack manquant/tronqué et
  la liste exacte des handlers absents. `loader.call()` journalise et lève une
  erreur pour les clics ; `handleAbilityItemClick` **rembourse alors le cooldown**
  (`g.delete(d)` dans le `catch`) au lieu de le consommer pour rien.
- ✅ **Trous et blocs déplacés tolérés** : le chargeur scanne 16 positions et
  identifie chaque pack par son en-tête `BP3:<index>/<total>`, pas par sa place.
- ✅ **Chunk froid préchauffé.** Les Code Blocks sont en coordonnées lointaines
  (`100000, 100000`) : tant qu'aucun `api.getBlock` n'y touche, Bloxd.io ne
  charge pas le chunk et `getBlockData` renvoie vide. Le chargeur appelle
  `warmup()` (un `getBlock` sur les 16 positions) **dès sa création**, puis
  décale la première lecture de 2 ticks ; chaque tentative ré-échauffe le chunk
  et les 2 premiers retries ont lieu au bout de 2 ticks (puis 10).

---

## Réduire la taille (sans perdre la lisibilité)

Le principe : **on n'écrit jamais le code compact**. On écrit lisible, et le build
produit le compact.

| Élément | Avant | Après |
| --- | --- | --- |
| Capacités des fruits | 32 fichiers collés tels quels, 272 k car. | **5 packs minifiés, 150 k car.** (−47 %) |
| World Code | ~311 k car. (sources) | `dist/world.js` = **174 k car.** (34 % des 512 k) |
| `func-abilities.js` | 17,8 k en une seule ligne illisible | 11 k, 1 shim = 1 ligne lisible + chargeur séparé |
| Helpers du moteur | `FA.c` reconstruit à la main dans un fichier minifié | `FA.c` construit **une fois** (`Object.assign` des namespaces). Les sources gardent leur destructuration lisible ; le build la minifie (les noms inutilisés sont éliminés). |

Détails techniques :

- `esbuild --minify` avec `charset: "ascii"` : aucun accent/problème d'encodage
  dans le champ texte du jeu.
- Pour le World Code, `minifyIdentifiers: false` est **obligatoire** : le moteur
  appelle `onPlayerClick`, `tick`, `onClose`… **par leur nom**. Le build est en
  `format: "esm"` bundlé (donc un seul script sans `import`/`export`) et non en
  `iife`, qui enfermerait ces handlers dans une closure. `build-world.mjs`
  vérifie la présence des points d'entrée après minification.
- Chaque pack reste **sous 32 000 caractères** (en-tête + marge inclus), mais
  chaque `eval` unitaire reste petit grâce au séparateur `/*BP3M*/`.

> Avec ~174 k (World Code) + ~150 k (packs) = ~324 k caractères, tout le jeu
> tiendrait même en théorie dans les 512 k du World Code. On garde quand même
> les 5 Code Blocks parce qu'ils se rechargent à chaud sans republier le monde.

---

## Travailler au quotidien

1. **Édite `src/blocks/250-control-state.js`** (ou un autre fichier lisible).
   Ne touche jamais à `code-blocks/pack-*.js`.
2. `npm run build:blocks` → le nombre de packs est recalculé automatiquement
   (best-fit decreasing, familles insolables).
3. Le tableau généré dans `code-blocks/README.md` te dit **quel Code Block**
   recopier ; les autres restent valides.
4. `npm run check` valide tout avant de coller.
5. Dans le jeu : `FA.reload()` (ou `FA.reload(true)` pour forcer).

### Ajouter une capacité

1. Nouveau fichier dans `src/blocks/` (préfixe numérique = ordre d'évaluation).
2. Enregistre le handler : `Object.assign(R, { onPlayerClickMonTruc });`.
3. Ajoute son nom dans `src/fruit/handler-names.js` **et** un shim d'une ligne
   dans `src/fruit/func-abilities.js` (`npm run check` te le rappellera).
4. Ajoute l'entrée dans `src/fruit/abilities.js` (`ABILITY_BINDS` +
   `FRUIT_ABILITY_TABLE`).
5. `npm run build && npm run check`.

Si un fruit a besoin de plusieurs fichiers partageant un état, donne-leur le
même préfixe de famille (`control-`, `gravity-`) et ajoute la famille dans
`FAMILY_RE` de `tools/build-blocks.mjs`.

---

## Fruits : nouveaux items (poissons) et migration des inventaires

Les fruits ne sont plus des blocs mais des **poissons**. Seul `itemName` a changé :
le `rpName` (`Rocket`, `Control`, `Dragon`…) reste l'identifiant interne, donc la
base de données, les capacités, les achats et les fruits déjà mangés continuent de
fonctionner sans rien migrer côté joueur.

```
Common     Boulder Bass        Root Flounder       Crystalized Wheatfish   Green Strongfish
           Bombfish            Moon Strongfish     Boomerang Fish
Uncommon   Embermark Wrasse    Frost Wolf Eel      Reedglass Minnow        Coastal Mullet
           Oarfish             Frost Herring
Rare       Polarflash Electron Lavaflow Trout      Pearlescent Moonfish    Cinder Leviathan
Legendary  Sumpback Carp       Pyroscale Grouper   Lavawake Slopefish      Scorched Sunfish
           Basalt Pipefish     Rust Scad           Rainbow Guppy           Nomai Moray
           Deepwater Lanternfish Eviota Vader      Hatchetfish
Mythical   Glacial Silverfish  Iceshelf Skate      Heatwarp Flounder       Mangler Catfish
           Shadow Darter       Pithead             Scored Dace             Rimesnouted Lancetfish
           Volcanic Catfish    Paleice Rockcod     Frozen Grenadier        Tri-Pointed Needlefish
           Seahorse
```

`FRUITS_BY_RARITY` (`src/fruit/fruitData.js`) est la **seule** source de vérité :
`FRUIT_BLOCKS` (`src/fruit/abilities.js`) est maintenant calculé à partir d'elle,
donc impossible d'avoir deux tables désynchronisées.

### Fruits sauvages : un bloc apparaît, on le clique

Un **bloc de fruit** apparaît tout seul dans le monde. Le joueur le clique et reçoit un fruit
**tiré au hasard dans la rareté de ce bloc** — le même tirage que la machine à fruits, mais gratuit.

| Bloc posé | Rareté | Poids (celui du roll) |
| --- | --- | --- |
| `Potato Block` | Common | 41 |
| `Pear Block` | Uncommon | 28 |
| `Plum Block` | Rare | 21 |
| `Banana Block` | Legendary | 8 |
| `Apple Block` | Mythical | 2 |

- **Un seul fruit en vie à la fois.** Un nouveau toutes les **20 minutes** (`WILD_EVERY = 24000`
  ticks), et un fruit que personne ne ramasse **pourrit au bout de 15 minutes** (vérifié chaque
  minute, message discret).
- **Annonce à tout le monde au spawn** : `A Mythical fruit block appeared at Skylands. Click it to
  claim a random Mythical fruit. It rots in 15 minutes.` La couleur est celle de la rareté, donc un
  Mythique se voit dans le chat.
- **Les points de spawn sont une liste écrite en dur**, `WILD_SPOTS`, en tête de
  `src/fruit/index.js` : **trois points par île** (18 en tout), avec le nom de l'île pour le message.
  Trois par île exprès : avec un seul point, il suffisait de s'asseoir dessus pour tout rafler.
  Pas de fonction de configuration : pour en ajouter ou en déplacer un, on change la liste.

| Île | Points |
| --- | --- |
| Jungle | `1273,-915,338` · `1342,-916,226` · `1490,-918,100` |
| Pirate Village | `926,-915,836` · `740,-917,694` · `720,-918,832` |
| Desert | `607,-919,1613` · `487,-916,1818` · `622,-918,1888` |
| Snow Village | `2406,-918,691` · `2536,-911,537` · `2445,-919,413` |
| Marine Fortress | `2049,-917,-653` · `2081,-919,-457` · `2279,-918,-642` |
| Skylands | `2694,-800,1274` · `2958,-673,1662` · `3063,-606,1378` |

  **Starter Pirate, Middle Town et Starter Marine n'ont aucun point** : ce sont les îles de départ,
  les fruits n'y apparaissent pas.
- Un point occupé (quelqu'un a construit dessus) : le bloc essaie **la case juste au-dessus**, puis
  abandonne ce point et le tirage passe au suivant. Jamais de fruit dans un mur, jamais de fruit qui
  flotte. Si aucun point n'est libre, aucun fruit n'apparaît.
- La minuterie démarre au **premier join** et ne tourne qu'une fois : pas de fruit dans un monde vide.
- **Le fruit exact n'est tiré qu'au ramassage** (dans la rareté du bloc), donc le bloc ne dit jamais
  d'avance ce qu'il contient.

> **Piège corrigé au passage.** `api.setBlock` attend `(x, y, z, nom)`. L'ancien code appelait
> `api.setBlock(0, e, o, r)` au ramassage et `api.setBlock(nom, x, y, z)` au spawn : le bloc n'était
> jamais posé (l'appel levait une erreur, loggée en `[fruit][err]`) et jamais retiré (bloc fantôme
> définitif). Les deux appels sont maintenant dans le bon ordre.

### La migration, au join

`migrateFruitItems()` (`src/gameplay/customItem.js`) passe l'inventaire **et** le
Moonstone Chest à chaque connexion (puis une seconde fois 2 s plus tard, le temps
que le chunk soit lisible) et réécrit chaque fruit avec :

* son **nouvel item** (`Bone Block` → `Boulder Bass`) ;
* son **nom affiché** (`Rocket`) ;
* sa **description complète** (`● Common Fruit ●`, la phrase du fruit, l'aide
  « Sneak + Click ») ;
* son **enchant** (`Tier 1` à `Tier 5` selon la rareté), dans
  `customAttributes.enchantmentTier` — c'est là que le moteur le lit ;
* son `uniqueRollId` d'origine, conservé s'il existe.

**Ce qui n'est jamais converti :** un item n'est reconnu comme fruit que s'il porte
`customAttributes.isFruitBlock` / `fruitRpName`. Les anciens noms sont des blocs de
construction ordinaires (`Stone`, `Glass`, `Ice`, `Snow`…) : convertir « au nom »
transformerait un stack de 64 Stone en fruits de Control. Un stack sans attributs
reste donc un stack, et l'ancien nom redevient un bloc normal (ses `setItemStat`
sont remis à zéro au join).

La migration est **idempotente** : repasser dessus ne réécrit rien.

---

## Migration depuis l'ancien système

- Les 32 anciens `code-blocks/z1000XX-*.js` ont été supprimés : leurs sources
  sont désormais dans `src/blocks/` (les fichiers minifiés Control/Gravity ont
  été reformatés pour être lisibles).
- Les anciens Code Blocks déjà placés dans le monde **ne sont pas évalués** par
  le nouveau chargeur (ils n'ont pas d'en-tête `BP3`) ; il log juste
  `N Code Block(s) sans en-tête BP3 ignoré(s)`. Tu peux donc écraser les
  5 premières positions sans risque.
- Pour repartir sur une bande vierge, ajoute au début du World Code :
  ```js
  globalThis.FA_ORIGIN = [100000, 100000, 100102];
  ```
  et colle les 5 packs en `z = 100102 … 100106`. Le chargeur scanne 16 positions
  à partir de cette origine.
- L'ordre des packs est libre (ils portent leur index), et un pack posé à une
  autre `z` de la bande est quand même retrouvé.

---

## Diagnostic dans le jeu

```js
FA.logStatus();     // résumé lisible : packs, modules, handlers, erreurs
FA.status();        // objet : { ready, packCount, missing[], errors[], packs[] }
FA.reload();        // relit les Code Blocks (ré-échauffe le chunk avant)
FA.reload(true);    // idem en forçant la réévaluation
FA.prewarm();       // force le chargement du chunk des Code Blocks (16 getBlock)
```

Messages typiques :

- `pack 3/5 MANQUANT (attendu vers z=100004)` → Code Block absent ou vide.
- `pack 2/5 TRONQUÉ … 29000 car. reçus / 30000 attendus` → copier/coller coupé
  par la limite 32 k : reconstruis ce pack (`npm run build:blocks`).
- `handler 'onPlayerClickGravityGrab' introuvable` → le fruit n'a pas été chargé ;
  le cooldown est remboursé et l'erreur apparaît dans les logs.

---

## Quêtes : ajouter une île

`quests` (`src/gameplay/quest.js`) est la **seule** source de vérité : la courbe d'XP
(`xpToNext`, `src/utils/data.js`) et la liste des îles sont dérivées de ce tableau
(`islandsFromQuests`), triées par `levelMin`. Ajouter une île = ajouter une entrée ici, puis
`npm run build` pour régénérer `world-code/`.

| Île | Niveaux | Quêtes |
| --- | --- | --- |
| Starter Island | 0 – 9 | 3 |
| Jungle | 10 – 30 | 5 |
| Pirate Village | 31 – 60 | 5 |
| Desert | 60 – 90 | 5 |
| Snow Village | 90 – 120 | 5 |
| Marine Fortress | 120 – 150 | 6 |
| **Lower Skylands** | **150 – 190** | **7** (`skyBandit1‑3`, `darkMaster1‑4`) |

Chaque quête porte son `targetMob` (**le nom du mob tel qu'il est posé dans le monde**), son
`realMob` (l'espèce réellement invoquée), son `mob.rank`, son `killAmount` et sa `position`
(l'endroit où le PNJ de quête doit être). `realMob` sert aux messages : le joueur lit
« Sky Bandit 1 », pas « Draugr Zombie ».

---

## La Saber Quest (dernière grande quête de la mer 1)

`src/gameplay/saber.js` porte **toute** la quête : les boutons, les deux structures ouvrables, les
trois PNJ, le Mob Leader et le Saber Expert. Un seul fichier, parce que la limite des 30 fichiers du
World Code ne laisse pas de place à un second.

### Reprendre une quête en cours : l'étape en base, les plaques non

**Une seule clé de base, `s`**, et elle ne contient que le **numéro d'étape** (0 à 8). Rien d'autre :
ni item, ni horodatage, ni joueur secondaire.

- **L'étape est écrite tout de suite.** `setStep()` fait la mémoire *et* la base dans le même appel :
  elle ne peut pas être en retard sur le jeu, même si le monde s'arrête juste après.
- **Les cinq plaques ne sont jamais écrites.** Elles vivent en mémoire seulement, et repartent de zéro
  à chaque connexion : un joueur qui quitte avec **3/5** retrouve **0/5** et doit les recliquer.
  Taper `s = 0` ne sert à rien et ne serait pas plus sûr — la base ne voit que des étapes.
- **Une déconnexion n'efface rien** : au retour, l'étape est relue dans `s`, la flèche de quête est
  reposée si la chasse est en cours, et les plaques sont à refaire.
- **Fin de quête : la clé est supprimée** (`resetQuest` → `deleteStat(playerId, "s")`), quand le Saber
  Expert tombe. La quête est rejouable telle quelle, et il ne reste aucune ligne en base.

**Filet de sécurité.** Si `s` est vide (joueur d'avant cette version, ou étape perdue), l'étape est
déduite des **items portés** (`stepFromItems`) — aucun des items de quête ne peut être lâché, donc
l'inventaire ne ment pas :

| Item porté | Étape déduite | Ce que ça débloque |
| --- | --- | --- |
| `Torch` | la porte de la jungle est ouverte | brûler le rideau |
| `Bucket` | la Cup du rideau a été récupérée | remplir la Cup au point d'eau |
| `Water Bucket` | la Cup est remplie | l'Old Man boit |
| `Gold Grit` | le Mob Leader est tombé | le Rich Man paie |
| `Magmaward Fuel` | le Rich Man a payé | le mur scellé |

Cette étape déduite n'est **pas** écrite : elle sert de point de départ, elle ne fige jamais la quête.
Les deux anciennes clés (`sq`, `sqB`) sont supprimées au join — elles ne sont jamais relues.

| Étape | Zone | Ce qui se passe |
| --- | --- | --- |
| 0 | Jungle | cinq boutons cachés à presser |
| 1 | Jungle | les 5 sont pressés : la porte s'ouvre (Torch derrière, don d'un Code Block) |
| 2 | Désert | la Torch brûle le rideau et **est consommée** (Cup derrière, don d'un Code Block) |
| 3 | Désert | la Cup est remplie au point d'eau |
| 4 | Old Man | il boit et envoie vers son fils |
| 5 | Rich Man | il donne l'objectif, une flèche apparaît vers Secret Island |
| 6 | Mob Leader | il est mort : un **Gold Grit** tombe au sol |
| 7 | Rich Man | il reprend l'or et donne la relique **Magmaward Fuel** |
| 8 | Mur | la relique **est consommée** et ouvre le passage, dans la salle de Shanks |
| 9 | Shanks | le Saber Expert est vaincu : la quête est terminée **et remise à zéro** |

| Objet | Détail |
| --- | --- |
| Boutons | `[1439,-918,300] [1334,-915,261] [1302,-915,382] [1516,-916,165] [1449,-903,128]` |
| Porte | `[1329,-915,318]` → `[1329,-914,318]`, **Stone** (2 blocs) |
| Rideau | `[612,-904,1760]` → `[612,-902,1762]`, **Purple Ceramic** (3 × 3) |
| Point d'eau | `[2534,-897,449]` (cliquable à travers l'eau, rayon 4 blocs) |
| Mur scellé | `[1318…1320,-911…-909,321]` → arrive en `[1319,-912,323]` |

**Les blocs sont réellement retirés** (`api.setBlockRect(pos1, pos2, "Air")`) puis **remis dès qu'il
n'y a plus personne à 15 blocs** (`KEEP_RADIUS`), dans la matière du monde : `Stone` pour la porte,
`Purple Ceramic` pour le rideau.

> **Piège corrigé.** L'ordre des arguments est `api.setBlock(x, y, z, nom)` — pas
> `api.setBlock(nom, x, y, z)`. L'ancien code appelait `api.setBlock(0, x, y, z)` : il posait un bloc
> à l'origine du monde et **la porte ne s'ouvrait jamais physiquement** (seule l'étape changeait).
> `rectBlocks()` perce maintenant le rectangle d'un coup et n'écrit rien ailleurs ; si `setBlockRect`
> manquait, il retombe sur un `api.setBlock(x, y, z, nom)` bloc par bloc, dans le bon ordre. La vérification passe toutes les 220 ticks — les minuteries de
`utils/timer` comptent en ticks de 50 ms, donc 11 s — et ne coûte que deux structures. Un joueur qui
a déjà validé l'étape les voit se rouvrir tout seul quand il revient : le monde reste dans son état
d'origine sans jamais enfermer quelqu'un derrière.

**Délai de grâce de 60 s** (`GRACE_MS`) : une ouverture reste ouverte au moins une minute, même si
le joueur qui l'a déclenchée s'éloigne. Sans ça, les cinq boutons étant dispersés dans la jungle, la
porte se refermait pendant qu'il cherchait ce qui venait de s'ouvrir. En plus, le cinquième bouton
pose une **flèche temporaire** (`saber-door`) vers la porte, qui s'efface dès qu'on est à 6 blocs
d'elle — donc on sait où aller, et on n'a pas une flèche dans le dos pour le reste de la quête.

### Les items

| Objet | Item | Donné par | Consommé à |
| --- | --- | --- | --- |
| **Torch** | `Torch` | Code Block (derrière la porte) | le rideau du désert |
| **Cup** | `Bucket` vide → **`Water Bucket`** (nom affiché `Cup of Water`) | Code Block (derrière le rideau) | l'Old Man |
| **Gold Grit** | `Gold Grit` (vrai item) | le Mob Leader | le Rich Man |
| **Magmaward Fuel** | `Magmaward Fuel` (vrai item) | le Rich Man | le mur scellé |

- **La Cup est un vrai seau du jeu** : vide c'est `Bucket`, pleine c'est `Water Bucket`. **Seul
  l'item d'origine décide** : aucun nom affiché n'entre dans une décision. Un seau renommé par un Code
  Block ou par une ancienne version se remplit donc comme un autre. Le **nom affiché** et la
  **description** restent posés sur la Cup pleine (`Cup of Water`) — c'est du décor, jamais relu par
  une décision.
- **Vide ≠ pleine.** Le code compte les deux items séparément (`countOf(Bucket)` / `countOf(Water Bucket)`).
  Avant, « la Cup est déjà pleine » testait la somme des deux : un joueur qui tenait un seau **vide**
  s'entendait répondre *Your Cup is already full of water* et ne pouvait plus jamais le remplir. Le
  point d'eau remplit maintenant **n'importe quel seau vide**, même si une Cup pleine traîne déjà dans
  l'inventaire, et l'Old Man ne boit qu'une Cup **réellement pleine** (`Water Bucket` présent) : un seau
  vide ne le désaltère pas, et ça ne bloque personne puisque le point d'eau remplit tout seau vide.
- **Le remplissage ne fait pas** `removeItem` puis `giveItem` : `fillCup()` cherche le slot qui contient
  le seau (`scanAllItems`) et réécrit **ce slot-là** avec `setItemSlot`, nom affiché compris. L'item ne
  quitte jamais sa case, donc rien ne peut se dupliquer et un inventaire plein ne peut pas avaler la
  Cup. Si la pile contenait plusieurs seaux, un seul est rempli et le reste est rendu — après la
  réécriture du slot, jamais avant.
- **Un clic muet n'existe plus.** Le point d'eau répond toujours, ce qui sert aussi de test de
  détection de clic :
  - sans `Bucket` ni `Water Bucket` : *You have nothing to collect this water with.* — si un joueur ne
    voit **rien**, c'est que son clic n'arrive pas jusqu'au code (callback, zone, item en main), pas que
    la quête refuse ;
  - avec un seau mais avant d'avoir brûlé le rideau : *The water is clear, but you have no reason to
    fill that yet.* — et son étape n'avance pas ;
  - à côté du point d'eau (jusqu'à 10 blocs) : *You are too far from the water.*
  - viser **l'eau** est accepté jusqu'à 12 blocs du point : la surface ne donne pas la case exacte du
    point de remplissage, et un joueur sur la rive clique forcément un peu à côté.
- **Aucun item de la quête ne peut être lâché** : `saberLockedItem()` répond pour les cinq noms
  (`Torch`, `Bucket`, `Water Bucket`, `Gold Grit`, `Magmaward Fuel`), et il
  est branché sur `onPlayerDropItem`, à côté des items de capacité. Ils ne peuvent donc pas être
  donnés à un autre joueur.
- **Gold Grit** et **Magmaward Fuel** sont de **vrais items du jeu** : ils sont donnés et droppés par
  leur nom d'item, sans attributs. `customItem.js` ne renomme pas d'item, il leur pose à chaque join le
  **nom affiché** et la **description** que le joueur doit lire : `Gold Grit` s'affiche **Gold Dust**
  (un tas de pièces et de trésor volé par le Mob Leader) et `Magmaward Fuel` s'affiche **Ancient
  Relic** — ce n'est pas un carburant, mais une relique marquée par le temps.
- perte d'item (mort, filtre d'inventaire) : **aucun blocage**. Le point d'eau rend la Cup pleine, le
  Rich Man rend la relique, et le retour de la relique ne peut pas en créer une deuxième (la garde est
  l'absence de l'item **et** l'étape). Une fois la relique brûlée dans le mur, le passage reste
  ouvert : sinon le joueur se retrouverait devant un mur qu'il ne peut plus ouvrir.

### Le Mob Leader (niveau 200, mob `Glass Bro`)

Il se lance **depuis un Code Block**, posé là où l'auteur du monde veut le faire apparaître (Secret
Island) :

```js
spawnMobLeader(x, y, z)            // à l'endroit voulu
spawnMobLeader(x, y, z, playerId)  // et il vise ce joueur
```

> **Pourquoi il se battait comme un mob ordinaire.** `thinkLeader()` n'avançait que si
> `leader.aiTarget` était vivant, et cette cible n'était remplie **que** si on passait un `playerId`.
> Lancé par le Code Block de Secret Island (sans joueur), il n'avait donc **aucune cible** : zéro
> capacité, juste des coups de poing. Il **choisit maintenant sa cible lui-même** — le joueur le plus
> proche dans ses 40 blocs (`LEADER.AGGRO`), reprise dès que la cible meurt ou sort de portée — donc
> il attaque même si on l'invoque à côté de personne et qu'un joueur arrive ensuite.

Un second appel est refusé tant que le premier est vivant. Le **Gold Grit** ne tombe que tant que la
quête le demande (étapes 5 et 6) : relancer le boss après avoir été payé ne fabrique pas de l'or à
l'infini.

Ses PV et ses dégâts sont **ceux d'un mob de niveau 200** : mêmes formules que `gameplay/spawning.js`
(`20 + 200^1.6 × 8` = **38 456 PV**, `3 + 200^1.3 × 0.8` = **787 dégâts par coup**). Les deux valeurs
se retouchent en tête de `saber.js` (`LEADER.LEVEL`).

**Ses capacités sont à l'échelle de ce niveau** (`LEADER.HIT`, en multiples d'un coup de corps à
corps) : une capacité à 90 quand le poing en fait 787 ne se sent pas.

| Capacité | Déclencheur | Ce qu'elle fait |
| --- | --- | --- |
| **Gold Ring** | joueur à moins de 9 blocs | un anneau de particules se dessine autour de lui pendant 1,4 s, puis éclate : qui est **dans le rayon** (6,5 blocs) encaisse **un coup de corps à corps complet** (× 1,0) |
| **Gold Slam** | moins de 7 blocs | anneau qui se resserre au sol pendant 0,6 s, puis projection + ralentissement (× 0,7) |
| **Gold Shot** | 5 → 26 blocs | une onde d'or lancée en ligne (× 0,45) |
| **Ruée** | 4 → 20 blocs | il fonce et percute (× 0,55) |

Les quatre se préparent **au sol**, jamais dans le chat. Un second appel est refusé tant que le
premier est vivant, et le monde ne peut pas le despawner en plein combat.

### Le Saber Expert

Shanks lance le duel **dans l'arène du boss Haki** (`[-87,1014,-80]` → `[165,1014,206]`), pas dans
une salle inventée : le joueur y est téléporté, le boss posé à 10 blocs. Refus si quelqu'un d'autre
est déjà dans l'arène.

C'est un **boss de niveau 200** : mêmes formules que le Mob Leader, donc **38 456 PV** et **787** de
corps à corps (mob `Lord Vulcan`, échelle 1,9). Sa difficulté ne vient pas de ses chiffres mais de
ses **neuf attaques**, jouées une seule à la fois.

**Aucune attaque n'est annoncée dans le chat.** Chacune se prépare **dans le terrain** : la zone qui
va être frappée est dessinée avec des particules au sol, puis l'impact tombe exactement dedans. Le
joueur lit le sol, pas les logs.

| Attaque | Portée | Préparation visible | Impact |
| --- | --- | --- | --- |
| **Saber Dash** | 5 → 34 | un **couloir** de particules apparaît de lui vers le sol du joueur, avec une flèche qui progresse | il fonce dedans à 34 blocs/s, coupe tout le **segment parcouru** (on ne le traverse pas entre deux images) |
| **Saber Slam** | < 10 | anneau qui se resserre au sol | projection + ralentissement dans 9 blocs |
| **Shockwave** | < 26 | un anneau part de lui et **grandit** | tout ce qui est dans la bande de l'anneau est frappé une fois — sortir du cercle suffit |
| **Saber Beam** | 5 → 44 | une **marque au sol** à l'endroit où le joueur se trouve, deux anneaux qui se rejoignent | une colonne tombe sur la marque — bouger suffit |
| **Blade Rain** | 4 → 34 | **cinq marques** apparaissent autour du joueur | elles tombent l'une après l'autre, 340 ms d'écart |
| **Blade Storm** | < 10,5 | deux anneaux de lames tournent autour de lui pendant 2,6 s | dégâts par vagues toutes les 0,4 s — on ne reste pas collé |
| **Saber Chain** | < 13 | un **fil rouge** part de sa main vers le joueur, en direct | à la fin du délai, si le joueur est encore à 12 blocs : aspiré, frappé, affaibli. Sortir annule |
| **Air Slash** | 4 → 32 | — | deux ondes qui ne partent pas du même point |
| **Blade Tempest** | < 18 | anneau au sol | six ondes en étoile — **phase 2 uniquement** |

À 50 % de vie, **phase 2** : nametag rouge, vitesse augmentée, délais raccourcis et `BLADE TEMPEST`
débloquée — là encore, uniquement du visuel, aucun message.

La rotation joue **l'attaque qui n'a pas servi depuis le plus longtemps** (`saber.used`) en évitant
de répéter la même deux fois de suite : sans ça, les deux premières de la liste sortaient en boucle
et les autres ne se voyaient jamais. Toutes les valeurs (niveau, dégâts, délais, rayons) sont en tête
de `saber.js`, dans `SABER`. Les dégâts passent par `combat.damage()` (donc gardes d'équipe, de zone
et de protection PvP respectées) et non par un `applyHealthChange` brut.

### Secret Island (`2693,-911,-127`)

La position est une constante du monde, comme les boutons ou le mur : `SABER_ISLAND`,
`src/gameplay/saber.js`. Il n'y a **aucun setter** — pour la déplacer, on change la constante.

`Rich Man` pose la flèche de quête (id `saber-isle`) et l'île apparaît dans `Warp to Island` du
panneau admin (`adminIslands()`) — **et seulement là** : elle ne figure ni dans les flèches d'île des
joueurs, ni dans Settings, puisqu'elle est censée être secrète.

---

## Glitchs fermés : clear admin et quête payée deux fois

### 1. Le clear du panneau ne paie plus les dégâts

Un mob supprimé par `Clear Entities` mourait « normalement » du point de vue du moteur :
`onMobDespawned` / `onEntityDeleted` regardaient le dernier joueur qui l'avait frappé et lui
versaient XP et argent. Il suffisait de taper un mob — sans le tuer — puis de demander un
clear (ou d'attendre qu'un staff en fasse un) pour être payé.

`blockKillCredit(mobId)` (`src/utils/killAttribution.js`) verrouille la cible **avant** le
despawn, exactement comme un mob déjà crédité : `claimKill` refuse, donc plus aucun versement.
Le clear admin (`src/core/admin.js`) l'appelle sur **chaque** id, dans les deux chemins
(`api.getMobIds()` et les entités trouvées dans le rectangle), juste avant `api.despawnMob` —
après, l'événement serait déjà parti.

Le verrou est temporaire (20 s, comme un kill normal) et ne concerne que les mobs visés : un
vrai kill reste payé, y compris juste après un clear.

### 2. Une quête ne paie plus plusieurs fois

`completeQuest()` payait **avant** de nettoyer l'état. Or la récompense contient de l'XP :
si elle faisait gagner plusieurs niveaux, `addXP` appelait `checkQuestValidity`, qui voyait
encore la quête terminée en mémoire, constatait `niveau > levelMax` et la **re-complétait** —
en boucle. Un joueur au niveau 60 terminant sa quête touchait 2 × la récompense (reproduit :
1 068 pièces au lieu de 534).

| Avant | Après |
| --- | --- |
| état supprimé à la fin | état supprimé **avant** de payer |
| `completeQuest` ré-entrant | `questBeingPaid` refuse une seconde entrée |
| `completeQuest` ne renvoyait rien | renvoie `true` seulement s'il a réellement payé, et c'est ce retour qui déclenche `startQuest` |

Résultat : **une seule** récompense, même sur un saut de plusieurs niveaux (ou de 60 à 423),
et la quête suivante est celle du niveau réellement atteint. Les kills en trop après
l'achèvement ne paient rien.

---

## Vérifications

```bash
node tools/check-imports.mjs    # imports relatifs
node tools/check-handlers.mjs   # Code Block → shim → abilities
node tools/check-blocks.mjs     # packs + simulation du chargeur (jeu simulé)
```

`check-blocks.mjs` rejoue le **vrai** `code-block-loader.js` avec une `api`
simulée : scénario nominal, pack manquant et pack déplacé. Il échoue si un seul
des 95 handlers (dont les 8 de Control/Gravity) n'est pas enregistré.

---

## Conventions

- Sources : ESM, `import`/`export`, `api` = global du jeu. Les fichiers de
  `src/blocks/` sont des IIFE autonomes : `(FA => { … })(globalThis.FA)`.
- `FA.c` = helpers du moteur, `FA.r` = handlers enregistrés par les blocs,
  `FA_BOOT` = boot du chargeur. Ne mets plus d'état de fruit ailleurs que dans
  `globalThis.__CT__` / `__GV__` **à l'intérieur d'un seul pack**.
- **Fonction appelable depuis un Code Block** : `nom = () => {}` (affectation
  globale, sans `const`/`let`) ; `export function nom() {}` pour exporter ;
  `function nom() {}` reste privé au fichier. Toute fonction destinée au monde
  passe donc par le pont global en tête de `src/index.js`.
- `dist/`, `build-out/`, `node_modules/` sont ignorés par git. Seuls les packs
  de `code-blocks/` sont versionnés car ce sont les fichiers à coller dans le jeu.

## Points connus

1. `src/build/layer.js`, `path.js`, `plane.js` sont absents du dépôt.
   `build-world.mjs` injecte des stubs vides **le temps du build** et prévient.
   Pose les vrais fichiers dans `src/build/` pour réactiver ces systèmes.
2. `cleanup` / `clearAll` de `src/utils/boss.js` sont maintenant exportés : le
   bundle ne casse plus sur ces deux imports.
3. L'ancien doublon `knockBack` dans `FA.c` a disparu.
