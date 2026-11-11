# Block Pirate — v3

Code source du jeu (One Piece / voxel) : un « moteur » en modules ES sous `src/`,
et les capacités des fruits empaquetées sous `code-blocks/`.

> **En une phrase** : les sources restent **lisibles** dans `src/`, et le jeu reçoit des
> **copies compactes** (`world-code/`, même arborescence, ~43 % plus petites — voir
> [World Code : la limite des 512 000 caractères](#world-code--la-limite-des-512-000-caractères)) ;
> les 36 modules de capacités des 41 fruits sont regroupés en **8 Code Blocks**
> (`code-blocks/pack-01.js` … `pack-08.js`, sans aucun motif censuré par Bloxd.io).

---

## Documentation du jeu (FR / EN)

Les documents de référence, dans **[`docs/`](docs/)** :

| Document | Contenu |
|---|---|
| [`docs/UPDATES.md`](docs/UPDATES.md) | Toutes les versions, de V3.0.0 à aujourd'hui |
| [`docs/FRUITS.fr.md`](docs/FRUITS.fr.md) · [`docs/FRUITS.en.md`](docs/FRUITS.en.md) | Les 41 fruits, leurs 181 capacités, recharge et description |
| [`docs/ITEMS.fr.md`](docs/ITEMS.fr.md) · [`docs/ITEMS.en.md`](docs/ITEMS.en.md) | Items de commande, de quête, bons, armes, bateaux, fruits |
| [`docs/FIGHTING-STYLES.fr.md`](docs/FIGHTING-STYLES.fr.md) · [`docs/FIGHTING-STYLES.en.md`](docs/FIGHTING-STYLES.en.md) | Les 4 styles de combat et leurs 8 attaques |

La version **française** est la version visuelle ; la version **anglaise** découpe chaque
fruit, item et style dans un bloc de code, à copier-coller tel quel (Discord, par exemple).

---

## Démarrage rapide (copier-coller dans Bloxd.io)

> **Où trouver les fichiers à coller ?** Dans **[`world-code/`](world-code/)** :
> même arborescence que `src/`, en version compacte (73 % de la limite). `src/` reste la version lisible pour travailler, `dist/` est ignoré par git.
> Détail : [World Code : la limite des 512 000 caractères](#world-code--la-limite-des-512-000-caractères).

Dans ton World Code multi-fichiers sur **Bloxd.io**, tous tes autres fichiers (`index.js`, `core/*`, `gameplay/*`, `utils/*`, `fruit/fruitData.js`) restent tels quels. Tu as seulement à mettre à jour :

1. Dans le **World Code** (dossier `fruit/`) :
   - **`src/fruit/abilities.js`** *(153 binds d'habilités et dotation complète des 41 fruits par rareté : Common = 3, Uncommon = 4, Rare = 4, Legendary = 5, Mythical = 5)*
   - **`src/fruit/func-abilities.js`** *(pont BP3 lisible et autonome avec les 196 shims d'habilités)*
   - **`src/fruit/index.js`** *(priorité au nom de l'attaque `customDisplayName`, remboursement du cooldown si un bloc manque)*
2. Dans le **monde** (les **8 Code Blocks** à `x=100000, y=100000, z=100002 … 100009`) :
   - Pour cette version « anti-censure » (le filtre de Bloxd.io cassait le pack 2 :
     `*b,f=` reçu en `******=`, puis « encore de la censure » sur `b , f`),
     **les huit packs changent** : les multiplications par un identifiant d'une lettre
     s'écrivent `* 1 * b` et la virgule reste collée au `f` (`b ,f`). **Recopie les huit blocs.**
   - ⚠ Changement de contenu : `flame` est parti au pack 8 et `song` est venu dans le
     pack 2 (les packs 1 et 3 sont au ras de la marge). Le tableau de
     [`code-blocks/README.md`](code-blocks/README.md) fait foi.
   - Le **découpage est stable** : un module ne change pas de bloc d'un build à l'autre
     (contrôle et gravité restent entiers et groupés). Le tableau de
     [`code-blocks/README.md`](code-blocks/README.md) dit donc toujours **quel** bloc recopier
     (et l'ordre de collage est libre : le chargeur lit l'en-tête `BP3:<n>/<N>`).
   - Détail dans [`code-blocks/README.md`](code-blocks/README.md).
3. `FA.logStatus()` dans le World Code doit répondre
   `8 pack(s), 196 handlers, 0 manquant(s), 0 erreur(s)` — et la version affichée
   (`v=…`) doit être celle du tableau de [`code-blocks/README.md`](code-blocks/README.md).

> **« J'ai peut-être oublié de mettre à jour un fichier en jeu ? »** Chaque Code
> Block porte l'empreinte de sa publication (`/*BP3:3/8:len=…:h=…:v=f0f0c838*/`).
> Si un bloc vient d'une autre version, le chargeur le nomme au démarrage :
> `[FA] 1 Code Block(s) d'une AUTRE version : pack 8 (z=100009) — recopie-le…`,
> et `FA.status().stale` le liste. Voir
> [Un Code Block oublié](#un-code-block-oublié--le-cas-des-4-handlers-de-flame).

*(Si tu modifies les sources de `src/blocks/` plus tard : `npm install && npm run build:blocks && npm run check`.)*

---

## World Code : la limite des 512 000 caractères

Bloxd limite le World Code à **512 000 caractères** **et à 64 fichiers**, et il compte
**le texte brut des fichiers collés**. Les sources de `src/` sont écrites pour être lues (commentaires,
indentation, noms explicites) : ~729 000 caractères à elles seules, donc le texte brut
dépasse largement la limite dès qu'on ajoute un fichier `src/build/*`.

`npm run build:src` produit donc **`world-code/`** (versionné dans git, tu peux le
parcourir directement sur GitHub) : la même arborescence, fichier
par fichier, mais compactée pour le collage — commentaires et espaces retirés
(`minifyWhitespace`), code simplifié (`minifySyntax`), **noms locaux raccourcis**
(`minifyIdentifiers`).

> **Limite de 64 fichiers** : `build-sources.mjs` refuse de produire `world-code/` au-delà
> de **64 fichiers** (`FILE_LIMIT`). La limite a longtemps été de 30, ce qui obligeait à
> entasser des sujets sans rapport dans le même fichier (le mute dans `core/team.js`, le
> pont des Code Blocks dans `index.js`). Elle est haute, mais ce n'est pas un objectif :
> **un nouveau fichier doit être générique** (voir
> [Refactorisation](#refactorisation--un-fichier-par-sujet-mais-jamais-un-fichier-par-feature)).
> On est à **32 fichiers**.

| | Caractères | Limite |
| --- | --- | --- |
| Sources lisibles (`src/`) | ~729 000 | 142 % |
| **`world-code/` (à coller)** | **~341 000** | **67 %** |

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

## Le tutoriel du nouveau joueur (`src/gameplay/tutorial.js`)

Un joueur qui arrive pour la première fois décroche : il ne sait pas quoi faire, ni pourquoi
rester. Le tutoriel répond aux deux questions — **ce qu'est le jeu**, **son but** — et ne lui
donne **qu'une chose à faire à la fois**.

| Étape | Ce qu'on demande | Ce qui la valide (l'état du joueur) |
| --- | --- | --- |
| 1/4 | choisir son camp chez un **recruteur** | `team` ≠ `NONE` |
| 2/4 | prendre le style **gratuit** du `Combat Teacher` | un style de combat est enregistré (`fs`) |
| 3/4 | parler au `Quest Dealer` et tuer les mobs de la quête | `questProgress` ≥ 1 |
| 4/4 | acheter sa première arme au `First Weapon Dealer` | l'achat d'un item d'arme (hook) ou une arme déjà en inventaire |

Puis un dernier message explique **la boucle** : XP et Coins → armes, bateaux, fruits → niveaux →
îles plus dures → les trois boss. Aucune récompense à la fin, et c'est voulu : un tutoriel qui paie
est une raison de le farmer.

**Comment on avance : par l'état, pas par des évènements.** Un sondage toutes les 2 s
(`setInterval` de `utils/timer`) regarde les quatre conditions et fait avancer d'une étape quand
elle est vraie. Conséquence : aucun autre fichier n'a besoin de savoir que le tutoriel existe. La
seule exception est l'achat de l'arme : `utils/data` appelle un hook après un achat réussi (même
style que `setItemLabelLookup`), et si l'arme a été achetée **avant** l'étape 4, l'inventaire est
lu une fois en entrant dans l'étape — l'étape est alors sautée.

**Accueil.** Trois messages espacés de 3,5 s puis du 7 s : ce qu'est le jeu et son but (« devenir le
plus fort »), comment on joue (clic pour frapper, **deux clics** valident un achat, quêtes = XP +
Coins), puis l'étape 1. Le message rassure aussi sur ce qui inquiète un nouveau : *« rien n'est perdu
si tu quittes, ton niveau, ton argent et ta quête sont sauvegardés »*.

**Protection.** Tant que l'étape 1 n'est pas finie (aucune team), les **autres joueurs** ne peuvent
pas le blesser : `tutorialShield()` est posée comme les autres gardes de `utils/combat`
(`setTutorialGuard`) et branchée aussi sur le corps à corps dans `index.js`. Les mobs, eux, le
blessent normalement — un tutoriel n'est pas un mode pacifique.

**Passer.** `skipTutorial(playerId)` demande **deux clics dans la même fenêtre** (la confirmation de
tous les achats) : on ne jette pas une explication sur un clic malheureux. `startTutorial(playerId)`
le relance à l'étape 1, pour tester le parcours depuis un Code Block.

**DB : deux clés courtes, nouvelles, et rien d'autre.** `tut` = étape en cours (1 à 4), `tutd` = 1
quand c'est fini. Un joueur qui a déjà une team, un niveau ou une quête (donc un ancien) est marqué
`tutd = 1` sans rien recevoir : le tutoriel ne s'impose jamais à un vétéran.

**Ce que ça coûte.** Une lecture de db par joueur toutes les 2 s, la ligne d'objectif dans la
sidebar (une lecture de plus dans un dessin qui en fait déjà huit), et rien d'autre. `npm run check`
rejoue tout le parcours avec une `api` simulée : accueil, les quatre étapes, l'achat de l'arme,
l'achat hors étape, la protection, le saut en deux clics et le vétéran exclu.

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

### Un message = des segments : `txt()` / `bold()` / `ic()`

Une partie de message Bloxd n'a que **deux formes** utiles, et le jeu en construisait
**~1 000 à la main**, avec la même ponctuation recopiée dans 20 fichiers :

| Littéral d'avant | Aujourd'hui |
| --- | --- |
| `{ str: " You bought ", style: { color: C.INFO } }` | `txt(" You bought ", C.INFO)` |
| `{ str: "Kick Player", style: { color: c, fontWeight: "bold" } }` | `bold("Kick Player", c)` |
| `{ icon: "fa-solid fa-coins", style: { color: C.MONEY } }` | `ic("fa-solid fa-coins", C.MONEY)` |

| Fabrique | Renvoie | 3ᵉ argument |
| --- | --- | --- |
| `txt(texte, couleur)` | `{ str, style }` | autres propriétés de style (`fontSize`, `fontWeight`) |
| `bold(texte, couleur)` | `{ str, style: { color, fontWeight: "bold" } }` | — |
| `ic(icone, couleur)` | `{ icon, style }` | idem `txt` |
| `bar(ratio, couleurs)` | `{ type: "ProgressBar", progress, colours }` | `width`, `height`, `backgroundColour` |

Elles vivent dans `core/theme.js` (aucun nouveau fichier : c'est déjà le module des
messages), ne touchent ni l'API ni un état global, et renvoient **exactement** l'objet du
littéral — `format()` continue de normaliser couleur, icône et emoji à l'envoi. Une couleur
absente (`txt("x")`) donne `{ str: "x" }`, comme avant, et l'ordre des clés est celui des
littéraux (deux segments identiques restent identiques, donc `mergeNeighbours()` les
fusionne toujours).

`npm run check` vérifie toujours les icônes : `tools/check-icons.mjs` lit **les deux
écritures** (`icon: "…"` historique et `ic("…")`), sinon 200 icônes échapperaient au
contrôle — et, depuis les barres natives, il rend aussi la sidebar pour de vrai (voir
plus bas).

### Barres de progression : c'est Bloxd qui dessine

Depuis novembre 2026, `CustomTextStyling` accepte un `ProgressBar` : le moteur
dessine la barre, on ne fabrique plus une suite de `█`/`▒`. La sidebar s'en sert
pour l'**XP** (verte) et la **stamina** (bleue) :

```js
bar(0.43, ["#4ADE80"], { height: "24px", width: "250px" })
// => { type: "ProgressBar", progress: 0.43, colours: ["#4ADE80"], height: "24px", width: "250px" }
```

La taille est **250 × 24 px**, réglée en jeu (demande 71) : sans `width`, la barre
prenait la largeur de la ligne et restait très fine. En px, sa taille ne dépend
plus de la police du joueur. Coût : ~89 caractères de JSON par barre (contre 79
sans `width`), pris dans la marge du budget — voir « La sidebar : budget ».

* `progress` est un **ratio 0..1** (borné, arrondi à 3 décimales : au-delà on
  paie des caractères pour une différence invisible) ;
* les couleurs sont du **CSS simple** — nom, `#hex`, `rgb()`/`hsl()` ; les
  positions d'arrêt (`"#4ADE80 30%"`) sont permises, les autres fonctions
  (`url()`, gradient) **refusées par Bloxd** avec une erreur ;
* une seule couleur par barre : un dégradé coûterait ~20 caractères de JSON de
  plus pour un écart invisible dans la sidebar.

Ce sont des objets comme les autres dans le tableau de parties : `format()` et
`fit()` les laissent **intacts** (ils n'ont ni `str` ni `icon`), et `measure()`
les compte à leur taille réelle — d'où l'importance du budget ci-dessous.

### La sidebar : budget, et l'ordre de sacrifice

Chaque bloc optionnel est accepté **en s'additionnant aux précédents**
(`chosen`), pas testé seul : sinon plusieurs blocs passaient un par un, leur
somme dépassait, et `fit()` coupait la fin du message — le plus souvent
l'objectif du tutoriel.

Les priorités disent dans quel ordre on sacrifie : `0` tutoriel, `1` quête,
`2` XP, `3` stamina, `4` points de stat, `8` « pas de quête », `12` **titre**.
`0` est une priorité valide : le code écrivait `priority || 9`, donc la priorité
0 devenait 9 et le tutoriel était jeté **en premier** alors qu'il est documenté
comme gardé en premier.

**Le titre part le premier** (priorité 12, la plus sacrifiable). Il coûte
168 caractères à lui seul et le joueur connaît le nom du jeu. Sans ça, agrandir
les barres faisait disparaître la barre de **stamina** chez un nouveau joueur qui
a un objectif de tutoriel **et** une quête — c'est-à-dire exactement celui qui en
a le plus besoin. Les barres, elles, ne sont jamais sacrifiées : `npm run check`
le vérifie sur trois joueurs simulés.

Deux économies qui ne se voient pas : les séparateurs `"\n\n"` n'ont **pas de
style** (une couleur sur des sauts de ligne coûte 29 caractères pour rien), et le
bloc « Stat Points » n'apparaît que s'il y a des points à dépenser.

Une ligne **identité** (priorité 5) affiche l'équipe et l'équipage : drapeau
dans la couleur de l'équipe (`Pirates` / `Marines`), puis l'équipage en or.
Rien n'est affiché **avant** le choix de l'équipe : « No Team » ne dirait rien
et coûterait de la place. `UI.js` importait déjà `team.js` (`getCrewName`) :
ajouter `getTeamData`/`getPlayerTeam` n'ajoute donc aucune arête au cycle
`UI ⇄ team` qui existe depuis le début (les deux fonctions sont déclarées, donc
lisibles à l'appel, pas à l'initialisation du module).

`npm run check` rend la **vraie** sidebar (trois joueurs simulés : nu, chargé avec
objectif de tutoriel, et nouveau joueur avec tutoriel **et** quête) et vérifie :
taille ≤ 1 200, **deux `ProgressBar` dans chaque cas** (jamais une seule), ratio
borné et arrondi, couleurs CSS acceptées, taille `width`/`height` en px,
**teinte verte pour l'XP et bleue pour la stamina**, l'objectif du tutoriel et le
bloc de quête toujours présents.

Mesuré : **1 088** car. (joueur nu), **1 189** (chargé + tutoriel), **1 096**
(nouveau joueur + tutoriel + quête). Vérifié par mutation : rendre le titre
obligatoire fait tomber la barre de stamina dans le dernier cas, et la CI refuse.

### Name tags : une seule porte de sortie

Un `nameTagInfo` hors schéma n'est **pas** corrigé par Bloxd : le moteur répond
`Expected: valid nameTagInfo value` et n'applique **rien** — l'entité garde son
ancien nom, ou aucun. Une seule valeur fautive suffit :

| Ce qui arrivait | Pourquoi c'est refusé |
| --- | --- |
| `border: null` (vanish) — la seule valeur hors schéma qui existait dans le projet | le schéma accepte un objet **ou l'absence**, pas `null` |
| `{ icon: … }` dans un name tag | les icônes sont réservées au chat |
| une clé inventée (`fontSize`, `name`, `colour`…) | le schéma est fermé |
| une partie de texte qui n'est pas une chaîne | `str` doit être un `string` |

Le **nom** n'était pas en cause : un id reste valide du join au leave, donc
`getEntityName()` répond (au tick près : si le joueur part dans le même tick,
l'appel lève et on ne pose simplement rien — pas de faux « Player » à la place
d'un vrai pseudo).

Tout passe donc par **`sanitizeNameTag()`** / **`applyNameTag()`**
(`src/utils/lifeform.js`) : l'objet est reconstruit **clé par clé** à partir du
seul schéma documenté (`ENTITY_SETTINGS.md`), le reste est jeté. Les
`content`/`subtitle` **vides sont conservés** : c'est ainsi qu'on efface un nom
(vanish) ; les supprimer laisserait le pseudo visible.

`npm run check` (via `tools/check-rules.mjs`) rejoue le cas du join — nom
lisible avec et sans équipage, joueur parti dans le même tick, nom vide — et
refuse tout `nameTagInfo` écrit à la main hors de cette porte.

### Icônes : une liste blanche, sinon « ? »

Bloxd n'affiche **pas d'erreur** pour une icône inconnue : il montre un **`?`**. La liste des
noms acceptés est fermée (**96 icônes du jeu + 214 Font Awesome + 11 marques**, d'après
`ICONS.md` du dépôt `Bloxdy/code-api`), donc un nom inventé ne se voit qu'en jeu — jamais dans
les logs. Ces trois listes sont recopiées dans `tools/check-icons.mjs` : la CI refuse tout écart
avec le document officiel, dans **les deux sens** (un nom oublié = un `?`, un nom inventé =
une icône qui n'existe pas).

Tout passe donc par **`safeIcon()`** (`core/theme.js`), appelé par `format()` : c'est le point
unique par lequel passent le chat, les textes de boutique, les descriptions d'items **et** les
Code Blocks (via le patch de l'API).

| Cas | Ce qui se passe |
| --- | --- |
| `fa-solid fa-xmark` (dans `FA_NAMES`) | rendu tel quel |
| `fa-solid fa-brands fa-discord` (dans `FA_BRANDS`) | rendu tel quel |
| `Invisible`, `Jump Boost`, `Trader Piggy`… (icône **du jeu**, dite ingame) | **intact**, casse exacte ; `"jump boost"` est remis en `Jump Boost` |
| `Apple`, `Boat`, `Diamond Sword`… (nom d'item ou de bloc) | **intact** — non validable sans embarquer les 1 400 items, donc passé tel quel |
| ancien nom (`fa-solid fa-broom`, `fa-gift`, `fa-trash`…) | remplacé par l'équivalent valide (`ICON_ALIAS`) |
| mot nu (`globe`, `flag`) | corrigé (`BARE_ALIAS`) |
| nom inconnu | **`fa-solid fa-circle-info`** (`ICON_FALLBACK`) — jamais de `?` |

**Ajouter une icône** = ajouter son nom dans `FA_NAMES` (ou `FA_BRANDS`), sinon elle sera
remplacée à l'affichage — et dans la liste officielle de `tools/check-icons.mjs`, sinon la CI
refuse l'écart.

`npm run check` lance **`tools/check-icons.mjs`**, qui :

1. compare les trois listes du projet au document officiel (les deux sens) ;
2. relit **tout littéral `fa-…` du code**, quel que soit le contexte — pas seulement
   `icon:` et `ic(…)`, car beaucoup d'icônes partent de fonctions maison comme
   `line("fa-solid fa-xmark", …)` et échappaient au contrôle ;
3. vérifie la **casse** des icônes ingame (`invisible` au lieu de `Invisible`) ;
4. charge le vrai `safeIcon()` et exige qu'il rende **l'icône elle-même** pour chaque icône
   du projet — c'est ce qui a attrapé l'alias `fa-solid fa-trash-can-can` (inexistant), qui
   transformait `trash` en icône de secours ;
5. contrôle les icônes des **boutons du PC** (listes blanches, touches uniques, `id` traité).

Trois mutations vérifient que ces garde-fous mordent : une icône inexistante, un nom retiré de
la liste blanche et une icône ingame en minuscules font tous tomber la CI.

Et **`tools/check-rules.mjs`** couvre ce qui ne se voit pas dans une capture : name tags
(schéma Bloxd), prime anti-farm, chat en lecture seule, **boss sans crowd control** et
**zéro emoji**. Sur les couleurs, la règle est volontairement souple : `themeColor()`
ramène l'essentiel sur la palette, mais **quelques teintes hors palette sont un choix
assumé** (un avertissement orange reste orange) et la CI ne les refuse pas. Les signes
typographiques — `✦` des bandeaux, `●` des lignes d'état, les cadres `─`/`═` des
commentaires — ne sont pas des emoji et restent autorisés.

Le même script rend la sidebar avec une `api` simulée pour vérifier
les **barres** (forme, ratio, couleur CSS, teinte verte/bleue) et le **budget** : voir
« Barres de progression » plus bas.

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
libres (fruit, style, cible de quête) bornés, **barres natives 250 × 24 px sans
dégradé** (~89 caractères de JSON chacune), et blocs secondaires retirés **par
ordre de priorité** si nécessaire — jamais tout le message. Mesuré : 1 088
caractères pour un joueur nu, 1 096 pour un nouveau joueur avec tutoriel et
quête, 1 189 pour un joueur chargé.

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

## Chat : le staff lit tout, mais n'écrit que chez lui

Trois canaux : **Global** (`G`), **Team** (le drapeau de l'équipe) et **Crew**
(l'équipage, seulement si on en a un).

Un rang qui a **`readsAllChannels`** (`ranks.js`, MOD/DEV/ADMIN/OWNER) reçoit une
**copie** de chaque message d'équipe et d'équipage, préfixée par son canal
(`[Crew Straw Hats] …`). C'est de la **lecture seule** :

* il ne peut pas écrire dans un équipage dont il n'est pas membre — le canal
  n'existe même pas chez lui, et `handleChat` répond
  « Crew channel is read-only for you » au lieu de laisser croire que le message
  est parti ;
* parler en Global, dans sa Team ou dans son Crew reste normal : le droit de
  lecture n'élargit jamais l'écriture.

Le flag s'appelait `byPassChatRestriction`, ce qui ne disait pas ce qu'il
faisait : il ne contournait aucune restriction d'écriture, il donnait la
**lecture**. Il s'appelle maintenant `readsAllChannels` (`ranks.js`) et ne fait
que ça — voir tous les messages pour pouvoir modérer. Le filtre anti-majuscules,
lui, s'applique à tout le monde, staff compris.

`npm run check` vérifie les quatre règles sur une vraie simulation : un membre
reçoit son message, un autre équipage **non**, le staff reçoit une copie
préfixée, et un staff ne peut pas écrire dans un équipage étranger.

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

## Noms et descriptions d'items : une seule table

Un item Bloxd porte **deux noms**. Le **nom technique** (`Small Black Pod`, `M1911`, `Boat`…) :
c'est le seul que reconnaissent `api.getInventoryItemAmount`, `api.giveItem`, `getHeldItem`,
les drops, les recettes et les quêtes. Et le **nom affiché**, posé par
`api.setItemStat(playerId, item, "customDisplayName", …)` / `"customDescription"`.

Avant, le nom affiché était écrit **au moment du give** (`buyItem(playerId, "Boat", 500, 1,
{customDisplayName: "Normal Boat"})`). Deux conséquences : un item acheté chez un PNJ arrivait
renommé, mais le **même** item obtenu autrement (butin, quête, échange, admin) repartait avec
son nom Bloxd brut ; et chaque nouvel appel était un oubli en puissance.

Désormais les deux tables vivent dans **`src/gameplay/customItem.js`**, et nulle part ailleurs :

| Table | Contenu |
| --- | --- |
| `ITEM_LOOKS` | `nom technique → { name, description }`, indépendant de la team |
| `TEAM_ITEM_LOOKS` | `nom technique → { PIRATES, MARINES, DEFAULT }`, un nom par team |

`applyItemLooks(playerId)` parcourt l'inventaire et écrit ces attributs ; elle est appelée :

* **au join** (`itemJoin`) — les items déjà possédés (inventaire, Moonstone Chest, butin,
  récompense de quête) sont donc corrigés **sans re-give** ;
* **au changement de team** (`replaceTeamWeapons`, `src/core/team.js`) — le `Wood Sword`
  devient « Basic Sword » chez les Pirates et « Rusty Sword » sinon. `LEGACY_TEAM_WEAPON`
  reconnaît les **anciens** noms (« Basic Dagger ») pour convertir une arme déjà portée ; il
  ne contient jamais un nom encore produit par une table, sinon chaque changement de team
  réécrirait l'item pour rien.

`buyItem` (`src/utils/data.js`) ne pose plus aucun nom : il ne transmet que les attributs
réellement demandés par l'appelant (`api.giveItem` est appelé **sans 4e argument** s'il n'y en
a pas), et affiche le libellé dans ses deux messages via `setItemLabelLookup` — un hook branché
sur `itemLabel` de `customItem.js`, comme `setTeamGuard` dans `utils/combat` (importer la table
ici créerait le cycle `customItem → data`).

| Item technique | Nom affiché | Description |
| --- | --- | --- |
| `Small Black Pod` | **Armament Haki** | cliquer pour armer / relâcher, ne peut pas être lâché |
| `Moonstone Dust` | **Dash** | reliquat des anciennes versions (matière inerte) : son clic dashe encore, il n'est plus donné |
| `Swap Orb` | **Fruit Abilities** | ouvre les touches du fruit (mode boutons, **PC seulement**) |
| `Void Net` | **Fighting Style Capacities** | ouvre les touches du style (mode boutons, **PC seulement**) |
| `Gold Grit` | **Gold Dust** | butin de la Saber Quest |
| `Magmaward Fuel` | **Ancient Relic** | butin de la Saber Quest |
| `Black Carpet` | **Haki Fragment** | butin du boss, se revend au Haki Buyer |
| `Water Bucket` | **Cup of Water** | la Cup pleine de la Saber Quest |
| `M1911` | **Flintlock** | armurerie, arme avancée des Marines |
| `Boat` / `Obsidian Boat` / `Speedboat` | **Normal Boat** / **Advanced Boat** / **Luxury Boat** | chantier naval |
| `Stone Dagger` / `Stone Sword` / `Stone Spear` | **Sand Dagger** / **Advanced Sword** / **Advanced Spear** | armurerie |
| `Wood Spear` | **Basic Spear** | armurerie |
| `Wood Sword` | **Basic Sword** (Pirates) / **Rusty Sword** (autres) | arme de team |

**Règle** : un renommage ne s'écrit **jamais** dans un `giveItem` / `buyItem` / `createItemDrop`.
On ajoute une ligne à `ITEM_LOOKS` (ou `TEAM_ITEM_LOOKS`), c'est tout — le nom technique reste
celui du jeu, sinon les `getInventoryItemAmount` et les `removeItemName` cassent.

Trois conséquences, toutes vérifiées par `npm run check` (section « Noms d'items ») :

* chaque entrée porte **un nom et une description** non vides ;
* le nom affiché n'est **jamais** le nom technique (`"Swap Orb"` n'affiche pas « Swap Orb ») ;
* aucun item déclaré dans `ITEM_LOOKS` n'est renommé au moment du give.

Seule exception assumée : les items des **capacités** (fruits et styles de combat). Un même
`Paintball Explosive Item` porte une capacité différente selon le fruit du joueur, donc son nom
ne peut pas vivre dans une table statique — il est posé au give, par capacité (`src/fruit/abilities.js`,
`src/gameplay/fightingStyles.js`).

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
| `Controls` | bascule **items ↔ boutons** ; **PC seulement** (le tactile reste sur les items) |

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

## Remise à zéro d'un joueur (`resetPlayer`)

`resetPlayer(id)` (`src/utils/data.js`) remet un compte à zéro : niveau 1, points de stat
remboursés (`resetStats`), `money` et `sp` à 0, fruit retiré, **style de combat retiré**,
inventaire vidé, et clé `ctl` supprimée pour que les commandes repartent du **défaut de
l'appareil**.

**L'ordre compte, et c'est tout le correctif de la demande 91.** Le style vit dans une clé
db (`fs`) et `clearFightingStyle` y écrivait `null`. L'API n'accepte qu'une chaîne ou un
nombre : la valeur restait donc en base, `restoreFightingStyle` la relisait au respawn, et
le joueur retrouvait son style après un reset. Deux changements :

1. `clearFightingStyle` **supprime la clé** (`deleteStat(playerId, "fs")`) au lieu de
   l'écraser. Elle purge déjà, dans le même appel, l'état mémoire (`activeStyles`,
   cooldowns M1 et capacités) et les items du style
   (`removeFightingStyleItems(…, null)` + `removeVoidNet`).
2. `resetPlayer` retire le fruit **et** le style **avant** `api.clearInventory(id)`. Un
   item de style donné après le vidage reviendrait au respawn suivant.

La clé `ctl` est supprimée **sans** toucher au drapeau d'appareil : un joueur remis à zéro
retombe donc sur « boutons » sur mobile et « items » sur PC, sans se reconnecter
(`applyControls` est rappelé en fin de fonction). Le grade d'un joueur n'est pas concerné :
un reset ne touche jamais aux rangs.

`npm run check` rejoue le reset complet sur une `api` simulée : `fs` et `ctl` doivent
disparaître de la base, l'argent et les points revenir à zéro, l'inventaire être vidé et
les commandes reposées.

**Ce n'est pas la carte `Reset Stats` des Upgrades** (`upg_reset`, `src/gameplay/stats.js`).
Celle-là ne rembourse que les **points de stat** : elle garde le niveau, les items **et le
style de combat**, et sa description le dit désormais noir sur blanc. Deux actions
différentes, deux effets différents : `resetPlayer` remet le personnage à zéro, `Reset
Stats` redistribue des points.

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

Cette règle est rejouée à chaque `npm run check` (`tools/check-rules.mjs`) sur le **vrai**
`handleBountyKill` : 40 niveaux d'écart (victime intacte, 5 % en prime), 39 niveaux (vol de
10 %), plafond de vol, encaissement Marine plafonné **et une seule fois par paire**, Marine
contre Marine, et auto-kill.

---

## Protection des petits niveaux : sous 50 contre plus de 100

Un joueur **sous le niveau 50** ne peut pas être touché par un joueur **au-dessus du niveau 100**
— et il ne peut pas le toucher non plus. La protection est **mutuelle** : sans ça, un niveau 30
pourrait taper un niveau 300 sans que celui-ci puisse riposter.

| Attaquant | Cible | Résultat |
| --- | --- | --- |
| 30 | 150 | refusé (les deux sens) |
| 49 | 101 | refusé |
| 49 | 100 | autorisé |
| 50 | 300 | autorisé |
| 300 | 300 | autorisé |

**Les bornes sont strictes et volontairement larges** : `niveau < 50` est protégé, `niveau > 100`
est « dangereux », et la bande **50 → 100** ne change rien. Un niveau 50 reste donc attaquable par
un niveau 300 — c'est le choix littéral de la règle, pas un oubli.

### Une seule porte pour les deux chemins de dégâts

`canDamage()` (`src/core/team.js`) est déjà le point de passage unique des dégâts entre joueurs :
le corps à corps y arrive par `onPlayerDamagingOtherPlayer`, les capacités des fruits par
`combat.damage` → `setTeamGuard` → `canDamage`. La règle est donc ajoutée **là**, une seule fois —
aucune capacité ne peut la contourner, et il n'y a pas deux versions à garder synchronisées.

Trois précisions :

- **seuls les joueurs sont filtrés** (`isOnlinePlayer`, cache de 80 ms) : un niveau 300 continue de
  taper les mobs, les PNJ, les boss et les structures sans restriction ;
- le message n'arrive qu'**une fois toutes les 4 s par attaquant** : un coup refusé tombe plusieurs
  fois par seconde, inonder le chat ne servirait à rien ;
- le niveau est lu dans la **même clé de base que le reste** (`lvl`), celle qu'utilisent la prime et
  l'anti-farm — aucun état en mémoire à maintenir.

La règle est vérifiée par deux simulations sur le paquet compilé : **15 cas** sur `canDamage`
(bornes 49/50 et 100/101, sens inverse, niveaux égaux, mob, cible inconnue, marine contre marine)
et **8 cas** sur le chemin des capacités (`combat.damage` → `setTeamGuard`) — un niveau 150 ne
retire pas un seul PV à un niveau 30, et inversement, alors que 30 ↔ 30, 300 ↔ 300 et 300 → 60
passent normalement.

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

### Les bons de réduction (Lottery Tickets)

Cinq items **par défaut de Bloxd** — `Common`, `Uncommon`, `Rare`, `Epic` et `Legendary Lottery
Ticket` — sont renommés en **Fruit Vouchers** par `customItem.js` (nom affiché + description posés à
chaque join, comme les autres items custom). Un joueur ne voit jamais « Lottery Ticket ».

Un bon **gardé dans l'inventaire** réduit le prix du tirage chez le **Fruit Dealer** :

| Item d'origine | Nom affiché | Réduction |
| --- | --- | --- |
| `Common Lottery Ticket` | Common Fruit Voucher | **10 %** |
| `Uncommon Lottery Ticket` | Uncommon Fruit Voucher | **20 %** |
| `Rare Lottery Ticket` | Rare Fruit Voucher | **30 %** |
| `Epic Lottery Ticket` | Epic Fruit Voucher | **40 %** |
| `Legendary Lottery Ticket` | Legendary Fruit Voucher | **50 %** |

- **Le meilleur bon du joueur est utilisé**, pas le premier trouvé : avec un commun et un légendaire
  en poche, c'est le légendaire qui part, et **un seul** bon par tirage.
- **Il n'est consommé qu'à la remise du fruit.** L'annonce (`Spin the fruit machine for 1080 (level
  20). (10% off with your Common Fruit Voucher)`) donne exactement le prix qui sera débité ; un
  tirage refusé (pas assez d'argent), échoué ou remboursé **laisse le bon au joueur**.
- Le prix de base ne change pas : `500 + 35 × niveau`, puis la réduction, et jamais moins de 1.
- **Source unique** : `FRUIT_TICKETS` (`src/utils/data.js`) porte le nom d'item, le nom affiché, la
  description et le pourcentage. `customItem.js` les affiche, `fruit/index.js` les applique au prix,
  `utils/spawning.js` les utilise comme butin. Aucune de ces trois listes n'est recopiée.

---

## Butin des mobs : 4 %, 6 %, 9 %

Chaque mob tué a **une** chance de lâcher un objet, et cette chance dépend de son rang :

| Rang | Chance de roll |
| --- | --- |
| mob normal (1) | **4 %** |
| tier 2 (2) | **6 %** |
| boss (3) | **9 %** |

S'il y a un roll, **un** objet est tiré au poids parmi ceux que **ce** mob a le droit de lâcher
(`rollMobLoot`, `src/utils/spawning.js`, appelé par `killdMob`). Un kill n'étant crédité qu'une fois
(`utils/killAttribution`), un mob ne peut pas lâcher deux fois.

| Récompense | Poids | Rangs | Réservé à |
| --- | --- | --- | --- |
| `Common Lottery Ticket` | 130 | 1, 2, 3 | — |
| `Uncommon Lottery Ticket` | 62 | 1, 2, 3 | — |
| `Rare Lottery Ticket` | 26 | 2, 3 | — |
| `Epic Lottery Ticket` | 14 | 3 | **`MOB LEADER`** |
| `Legendary Lottery Ticket` | 5 | 3 | **`SABER EXPERT`** |
| `Black Carpet` (Haki fragment) | 10 | 3 | **`GARP`** |

Autrement dit : un mob normal ne peut donner que les deux premiers bons, un tier 2 ajoute le rare,
et les trois meilleures récompenses sont **réservées à un boss par son nom** — le 40 % au mini-boss
(Mob Leader), le 50 % au Saber Expert, le fragment de haki à Garp. Le tableau est une simple liste
écrite en dur (`LOOT_TICKET_RULE` + `LOOT_EXTRA`) : les bons viennent de `FRUIT_TICKETS`, les poids
disent seulement **quand** ils tombent.

- **Le butin tombe au sol** (`api.createItemDrop`) à l'endroit du cadavre, ou à celui du tueur si la
  position n'est plus lisible ; si lâcher un item est impossible, il va directement au tueur plutôt
  que de disparaître. Le joueur reçoit `Loot! Common Fruit Voucher dropped.` avec le **nom affiché**.
- **Les trois boss sont enregistrés à l'apparition** (`markBossMob`) : Garp, le Saber Expert et le
  Mob Leader sont `despawn` **avant** le crédit de leur kill, donc leur nom n'est plus lisible à ce
  moment-là. Sans cet enregistrement ils retomberaient dans le rang des mobs ordinaires et ne
  pourraient jamais lâcher leurs objets réservés. Un boss nommé est de toute façon forcé au rang 3.
- **Le marquage s'efface après le kill** (`forgetBossMob`, appelé par `killdMob`) : un id de mob
  peut être réutilisé, et un marquage oublié ferait tomber le butin d'un boss sur un mob ordinaire.
  La table `BOSS_MOBS` appartient à `loot.js` : elle n'est **pas** exportée, et `spawning.js` passe
  par la fonction. Écrire `delete BOSS_MOBS[...]` depuis `spawning.js` compilait mais levait un
  `ReferenceError` à chaque kill — **après** le paiement de l'XP, donc sans message de kill ni crédit
  de quête. `npm run check` refuse désormais ce cas (voir « Vérifications »).
- **Aucun objet de quête n'est dans ce tableau** (`Torch`, `Cup`, `Gold Grit`, `Magmaward Fuel`) :
  ce sont des dons garantis, et un doublon bloquerait la quête — un `Gold Grit` de trop ne se donne
  à personne et ne peut pas être lâché.

---

## Les trois boss : pas de one-shot, des paliers à 1/2, 1/3, 1/4 et 1/5

**Garp**, le **Saber Expert** et le **Mob Leader** ne peuvent plus être tués d'un seul coup, même par
une attaque à 38 000 dégâts. `bossDamageGate()` (`src/utils/boss.js`) est la porte unique, armée à
l'apparition de chaque boss (`armBossGate(id, pvMax)`).

**1. Les paliers.** À **1/2, 1/3, 1/4 et 1/5** de sa vie, le boss encaisse : le coup qui
franchirait le palier est **refusé**, et il **bloque tous les dégâts pendant 1,5 s**. Chaque palier ne
tombe **qu'une fois** — quatre moments où il faut attendre avant de continuer.

- Le blocage vaut pour **tout le monde**, pas seulement pour l'attaquant : c'est le boss qui est
  verrouillé, pas le joueur.
- Le message part à tous les joueurs à moins de 48 blocs :
  `[MOB LEADER] endures 50% health left - no damage for a moment.` avec un cri et des particules sur
  le boss.
- Le coup est refusé **juste avant** de franchir la ligne (55 % de vie pour le palier 1/2), donc la
  barre ne descend jamais sous le palier pendant le blocage.

**2. Le plafond.** Un coup ne retire jamais plus de **9 % des PV maximum**. Sans lui, une attaque
énorme sautait les quatre paliers d'un coup et le boss tombait quand même. La **dernière touche**
n'est jamais écourtée : dès que ce qu'il reste tient dans le plafond, le coup passe tel quel — un
boss reste donc **toujours tuable**, et le coup fatal n'est jamais bloqué.

**Les deux chemins de dégâts sont couverts**, sinon le garde-fou aurait un trou :

| Chemin | Où | Comment |
| --- | --- | --- |
| capacités (fruits, armes, invocations) | `utils/combat.js` → `damage()` | hook `setMobDamageHook`, posé par `index.js` |
| corps à corps | `onPlayerDamagingMob` (`index.js`) | même fonction, `preventDamage` quand le coup est refusé |

Le hook n'est appelé **que pour les mobs** : un joueur, un PNJ ou une invocation ne le voient jamais.
Et il ne s'applique qu'aux boss armés : un mob ordinaire reçoit exactement ses dégâts comme avant.

Le garde-fou est désarmé avec le boss (`cleanup()` pour Garp, `despawnIfAlive()` pour les deux autres)
et il s'auto-nettoie si la vie du mob n'est plus lisible : aucune ligne ne traîne après un kill.

---

## Le Gold Grit du Mob Leader : une seule fois

Le butin de quête ne passe **pas** par le tableau de drops ci-dessus : le `Gold Grit` tombe dans
`saberKilledMob()`, sur son propre chemin, quand le Mob Leader meurt **à l'étape « chasse »**.

Il ne tombe qu'**une seule fois** : relancer le Mob Leader par son Code Block et le tuer à l'étape
« or » ne lâche plus rien. Le `Gold Grit` ne peut pas être lâché, donc un doublon resterait bloqué
dans l'inventaire pour toujours. S'il a perdu l'or (mort, coffre vide), le **Rich Man** remet l'étape
à « chasse » et le prochain kill le rend — la quête ne peut pas se bloquer.

Le roll de butin (4 / 6 / 9 %) **s'ajoute** à ce don : il ne le remplace jamais.

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
| connaît le haki, **pod absent** | « Your Armament Haki item has been given back — click with it to arm your fists. » — **gratuit**, sans confirmation |
| connaît le haki, pod présent | « You already know Armament Haki, and the item is in your inventory. » — aucun doublon |

`giveHakiPod()` est partagé par l'achat et le refresh : il ne crée jamais un second pod
(`getInventoryItemAmount` avant `giveItem`).

**Le pod ne peut plus être lâché.** `onPlayerDropItem` (`src/index.js`) refuse le drop (retour
`"preventDrop"`) dès que `isHakiPod()` (`src/utils/haki.js`) reconnaît l'item : le joueur ne
peut plus se séparer de l'unique moyen d'armer son haki. C'est le même verrou que pour les items
de capacité (`C`), les items de style de combat (`fsItemName`) et les items de la Saber Quest
(`spLocked`). S'il le perd malgré tout (filtre d'inventaire, respawn), le vendeur le redonne
gratuitement.

Le nom technique reste `Small Black Pod` — c'est lui que le code interroge ; seul le **nom
affiché** est « Armament Haki », posé au join par `customItem.js` (voir « Noms et descriptions
d'items »). Les messages du vendeur n'exposent donc plus le nom Bloxd.

---

## PNJ recruteurs de team

Deux PNJ à placer dans le monde (comme les marchands `Fruit Dealer`, `Haki Seller`…),
nommés exactement :

| Nom du PNJ | Team appliquée |
| --- | --- |
| `Pirate Recruiter` | `PIRATES` |
| `Marine Recruiter` | `MARINES` |

Au **premier clic**, il annonce la team dans laquelle il va te basculer, la team actuelle,
la conversion des armes et le **déplacement** qui suit. Au **second clic** (même fenêtre de
3 s que tous les achats), le changement est appliqué par `setPlayerTeam()` : base de
données, nametag, canaux de chat, sidebar, armes de team et classement sont mis à jour
d'un coup. S'il est déjà dans cette team, il le dit et ne fait rien.

Deux effets s'ajoutent au changement de team :

- **Téléportation à l'île de départ de la nouvelle team** — `teleportToTeamSpawn()`
  (`gameplay/variations.js`) envoie le joueur au spawn de sa team dans la mer 1
  (`SEAS[1].teams`), variations coupées comprises : un pirate arrive chez les pirates.
- **La quête suit la team, sans perdre les kills** — `refreshQuestTeam()`
  (`gameplay/quest.js`) reprend la **même** quête (même palier, donc même niveau),
  remappe la cible et le marqueur sur la nouvelle team, et **conserve
  `questProgress`**. Un joueur qui a déjà tué 3 des 5 cibles n'a pas à recommencer.
  Sans quête en cours, rien n'est lancé à sa place.

Sur **mobile**, le tactile n'envoie aucune cible d'entité (`targetEId` est nul) : le tap
n'atteignait donc aucun PNJ. `npcNearPoint()` (`gameplay/NPCs.js`) retrouve le PNJ le plus
proche du point touché (rayon de 3 blocs) quand la cible ne peut pas être lui — jamais à la
place d'un coup porté à un joueur ou à un mob. Les recruteurs, comme tous les marchands,
répondent donc aussi sur téléphone.

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

### Le dôme ne pose plus personne dans un mur

Control Domain *repositionne* ses prisonniers sur un anneau en orbite, à 3,5–15,5 blocs du
centre et 2 blocs au-dessus du sol. Rien n'empêchait ce point de tomber dans une colline,
un arbre ou un mur de joueur : la victime était **téléportée dans le solide** et n'en
ressortait plus, même après la fermeture du dôme. C'était le blocage le plus fréquent en jeu.
Trois garde-fous, dans l'état partagé `250-control-state.js` (utilisé par les trois blocs
Control) :

| Fonction | Rôle |
| --- | --- |
| `ct_open(x, y, z)` | deux voxels libres (pieds + tête), testés par `solidVoxel` — la solidité réelle, pas le nom du bloc |
| `ct_spot(p, rad)` | si le point voulu est plein, l'air **le plus proche** par couches de 1 à `rad` (le vertical coûte plus cher qu'un pas de côté) |
| `ct_put(id, p, rad)` | `teleport()` sur ce point ; `null` si toute la zone est solide → **la cible ne bouge pas** |
| `ct_unstick(id)` | sortie de secours au relâchement : si la cible est dans un bloc, elle remonte à l'air le plus proche |

Deux conséquences voulues : on ne **crée** jamais l'enfermement (mieux vaut laisser une
victime sur place que la planter dans la roche), et on le **répare** toujours à la
libération — `ct_unstick` tourne quand le dôme se ferme, quand une cible en sort et quand
le lanceur meurt. Le balayage `ct_spot` ne tourne **que** si le point d'orbite est occupé,
et il est throttlé (1 s) quand la zone entière est solide : aucun coût dans le cas normal.
Shambles utilise `ct_open` de la même façon pour sa traction — la cible s'arrête au ras du
mur au lieu d'entrer dedans.

### La stamina ne loggue jamais un départ

Chaque fonction de l'API qui prend un `playerId` lève une erreur quand le joueur n'est
plus là — `setClientOptions` compris. La stamina appelait donc `setClientOptions` à chaque
changement de valeur (regen, dash, air-jump), sans vérifier que le joueur était encore
connecté : un départ, ou une capacité utilisée juste avant de partir, écrivait
`[stamina] gate error (1): …` dans la console. La sidebar, elle, pouvait échouer une fois
au join (`[stamina] sidebar hook error: …`).

Les deux logs sont **supprimés** :

- la valeur d'`airJumpCount` est **mémorisée par joueur** : l'API n'est appelée que
  lorsqu'elle change vraiment (c'était l'appel le plus fréquent du jeu) ;
- la présence du joueur est vérifiée sur une liste rafraîchie au plus toutes les 250 ms
  (`isOnline`), et un refus de l'API est **ignoré en silence** — il est réessayé au
  prochain changement d'état, pas dans la console ;
- la boucle physique et la régénération parcourent l'état des joueurs suivis au lieu de
  `api.getPlayerIds()` : plus d'appel sur un id périmé ;
- au leave, `staminaLeave` efface l'état, le verrou de dash, la dernière valeur de porte
  et la liste des présents.

`tools/check-rules.mjs` rejoue le départ : `setClientOptions` qui lève et sidebar qui
échoue, puis **zéro** `api.log` attendu (mutation testée : remettre un log fait échouer la
CI).

### Un boss ne prend AUCUN crowd control

Sorti de son arène, un boss ne peut plus poursuivre personne : poser un Control Domain
suffisait à le tuer sans riposte (le butin tombait quand même). Et ce n'était pas qu'une
affaire de dôme : n'importe quel fruit pouvait le ralentir ou le déplacer.

La règle est donc posée **au passage obligé de toutes les capacités**, dans
`utils/combat.js` — pas capacité par capacité :

| Fonction | Sur un boss |
| --- | --- |
| `eff()` / `applyEffect()` | les effets de contrôle (`Slowness`, `Weakness`, `Blindness`, `Frozen`) sont **refusés** ; ses propres buffs (`Speed`…) passent |
| `teleport()` | refusé si le déplacement vient d'un **cast** : Control Domain, Shambles, Gravity Grab ne peuvent plus le déplacer ; ses propres ruées passent |

Le lien se fait par `setBossGuard(isBossMob)` dans `index.js` : `gameplay/loot.js` est le
seul fichier qui marque les boss (`markBossMob`) et publie la réponse dans
`globalThis.__isBossMob`, que les Code Blocks lisent aussi (le Control Domain exclut
carrément les boss de ses victimes : pas d'orbite, pas de caméra, pas d'effet).

Vérifié par régression : un boss dans le dôme reçoit **zéro** placement et **zéro** effet,
un mob ordinaire continue d'être tenu et ralenti, et les quatre règles de `combat.js` sont
rejouées dans `tools/check-rules.mjs` (mutation testée : retirer la garde fait échouer la CI).

### Le dôme tient aussi les mobs

`ct_people()` ne listait que `api.getPlayerIds()` : le dôme ne contrôlait donc **rien** en
PvE. Devenu `ct_victims()`, il ajoute les créatures d'**une seule** requête spatiale
(`entitiesIn`) filtrée par `isMobAlive` — donc jamais un PNJ (marchands, quêteurs). Les
mobs sont tenus comme les joueurs (orbite, `Slowness`, `Weakness`), sans `forceCameraDir`,
qui n'a aucun sens pour une créature. Shambles et Control Slash passaient déjà par
`entitiesIn` : leur contrôle des mobs n'a pas eu à changer.

---

## Refactorisation : un fichier par sujet, mais jamais un fichier par feature

Rien n'a changé pour le joueur : mêmes quêtes, mêmes boss, mêmes récompenses, mêmes
messages. Ce qui a changé, c'est **où** vit le code.

### Fusionner pour faire de la place

Le tutoriel a eu besoin d'un fichier ; la règle dit qu'on en **fusionne deux d'abord**. La victime
était `utils/bossGate.js` : il n'existait que parce que la limite de 64 fichiers avait un jour
obligé à sortir ce code de `boss.js`, et il ne sert qu'aux **trois boss** de ce fichier. Les paliers
anti one-shot sont donc revenus dans `utils/boss.js`, ses deux appelants (`saber.js` et `index.js`)
importent de là, et c'est cette place libérée qui a payé `gameplay/tutorial.js`. **32 fichiers avant,
32 après.**

### La règle

> **Un nouveau fichier doit être générique.** Il n'existe que si plusieurs domaines
> s'en servent, et son nom décrit ce qu'il fait (`utils/bossGate.js`, `gameplay/loot.js`),
> jamais à qui il sert.
>
> Une **fonctionnalité** vit dans le fichier de son domaine, même si elle est grosse. La
> Saber Quest fait 2 200 lignes : elle reste dans **`gameplay/saber.js`**, en sections
> numérotées. Découper une quête en `config` / `kit` / `state` / `world` / `leader` /
> `expert` / `index` a été essayé puis **annulé** : sept fichiers qui n'existent que pour
> une seule quête, qu'il faut ouvrir l'un après l'autre pour suivre un seul parcours.

Deux extractions seulement ont été gardées, parce qu'elles servent **plusieurs** domaines :

* **`utils/bossGate.js`** — les paliers anti one-shot (`GATE`, `armBossGate`,
  `disarmBossGate`, `bossDamageGate`). Armés par les **trois** boss : Garp (`utils/boss.js`),
  le Mob Leader et le Saber Expert (`gameplay/saber.js`). Interrogés par `utils/combat.js`
  et par `onPlayerDamagingMob`.
* **`gameplay/loot.js`** — la table de butin, `rollMobLoot` et `markBossMob`, sortis de
  `spawning.js`. Tous les mobs du jeu, tous rangs confondus.

La limite du World Code est passée de 30 à **64 fichiers** (`FILE_LIMIT`), mais elle n'est
pas un objectif : on est à **32 fichiers**. Une limite haute autorise un découpage propre,
elle ne le réclame pas.

### Mutualiser d'abord, découper ensuite

Avant d'ouvrir un fichier, la question est : **est-ce que ce code existe déjà ailleurs ?**
Le même raisonnement que la règle ci-dessus, appliqué aux *fonctions* : deux copies d'un
même calcul finissent toujours par diverger, et une correction n'atteint qu'une des deux.

Ce qui a été regroupé, sans un seul fichier de plus :

| Doublon | Où il vit maintenant | Ce que ça supprime |
| --- | --- | --- |
| ~1 000 segments `{ str, style }` / `{ icon, style }` | `txt` / `bold` / `ic` (`core/theme.js`) | la ponctuation recopiée dans 20 fichiers |
| 143 entrées d'`ABILITY_BINDS` (`id`, `item`, `name`, `cd`, `desc`, `cast`) | fabrique `A(...)` (`fruit/abilities.js`) | six clés et un lambda par aptitude |
| `posOf`, `dist2d`/`dist3`, `alive` | `posOf`, `dist2`, `dist3`, `aliveNow` (`utils/lifeform.js`) | 3 copies de `posOf`, 3 de la distance, 3 de `alive` |
| `nameTagInfo` d'un boss | `nameTagInfo()` (`utils/lifeform.js`) | 2 constructions identiques, fond/bordure/graisse en paramètres |
| bloc de 10 `setMobSetting` d'un boss | `setupBossMob()` (`utils/boss.js`) | 3 copies (Garp, Mob Leader, Saber Expert) |
| balayage des slots d'inventaire | `eachItemSlot()` (`gameplay/customItem.js`) | 2 boucles de `gameplay/fightingStyles.js` |
| `heldItemName` | `gameplay/customItem.js` | 2 copies (`index.js`, `gameplay/saber.js`) |
| recherche « joueur qui possède ce `ownerDbId` » | `playerIdForDbId()` (`utils/killAttribution.js`) | 2 boucles (`spawning.js`, `killAttribution.js`) |
| bornes d'un rectangle de blocs | `boxCorners()` (`gameplay/saber.js`) | 2 calculs dans le même fichier |
| `tell()` = `say()` dans un `try` | `say()` (déjà protégé) | 1 fonction morte + 40 appels |

Un helper ne se justifie que s'il **remplace du texte existant** : une fabrique n'a pas le
droit d'ajouter un comportement (aucune ne touche l'API, aucune ne garde d'état). Les rares
aptitudes qui lisent plus de deux arguments gardent leur objet écrit à la main — c'est le
prix d'un comportement identique.

**Vérification** : deux paquets esbuild (avant / après), même `api` factice, **40 parcours**
rejoués — panel admin complet (32 items), `itemJoin`, achats, PNJ, Saber Quest, spawn des
trois boss, chat/crew, quêtes, variations, settings. **40/40 rendent exactement les mêmes
messages** (texte, couleur, icône) et les mêmes appels API, arguments compris. Plus
**181 traces** de `cast()` et **41 tables de fruits** identiques au caractère près.

### `gameplay/saber.js` : un seul fichier, quatorze sections

```
  1  constantes et points du monde     8  structures ouvrables
  2  outils partagés                   9  les trois PNJ
  3  clics dans le monde              10  le Mob Leader (niveau 200)
  4  dessiner une zone                11  le Saber Expert (niveau 200)
  5  ondes communes aux deux boss     12  sa boucle (une décision par tick)
  6  état de la quête                 13  ses neuf attaques
  7  flèches de la quête              14  morts, despawns, join / leave
```

Le fichier n'importe **que** du générique : `core/theme`, `utils/{data,timer,combat,
lifeform,fx,bossGate}`, `gameplay/customItem`, `gameplay/loot`. Aucune dépendance vers
la quête elle-même, donc aucune arborescence à suivre.

Deux simplifications de la refactorisation sont conservées (elles ne coûtent pas un
fichier) :

* **la répartition des morts** : `saberKilledMob` demande à `killLeader()` puis à
  `killSaber()` « est-ce toi ? ». Ajouter un troisième boss ne touche pas au cycle de vie ;
* **le cycle de vie du joueur** : `saberJoin` / `saberLeave` ne font que `resumeQuest` /
  `parkQuest` et `startHousekeeping` / `stopHousekeeping`. La règle « l'étape est en base,
  les plaques non » est écrite à **un seul endroit**.

### Comment l'équivalence a été vérifiée

* **154 déclarations sur 154** sont identiques — au préfixe `export` près — entre le
  fichier reconstruit et la version découpée : la fusion est une **réorganisation pure**,
  zéro changement de code (script de comparaison déclaration par déclaration, commentaires
  exclus) ;
* par rapport à l'ancien `saber.js` d'avant la refactorisation : 145 déclarations sur 150
  au caractère près, les 5 autres étant les fonctions de cycle de vie réécrites qui
  délèguent à l'identique. 5 déclarations mortes retirées (`saberColor()` n'était appelée
  nulle part, quatre `*ForTest()` n'étaient référencées ni par `src/` ni par les Code
  Blocks), 8 portes d'entrée ajoutées ;
* **la surface publique ne bouge pas** : exactement les douze mêmes exports qu'avant
  (`saberClick`, `saberOldMan`, `saberRichMan`, `saberShanks`, `spawnMobLeader`,
  `saberLockedItem`, `saberJoin`, `saberLeave`, `saberClose`, `saberKilledMob`,
  `saberPreventDespawn`, `SABER_ISLAND`), donc `index.js`, `NPCs.js` et `admin.js` ne
  changent pas d'un iota ;
* **51 vérifications** sur le paquet compilé avec une `api` factice : items de quête
  impossibles à lâcher, anciennes clés `sq`/`sqB` effacées au join, étape conservée au
  leave, flèche armée seulement à la chasse, Gold Grit lâché **une seule fois** et
  seulement à l'étape chasse, `preventDespawn` sur les deux boss, Shanks qui ne lance
  jamais le duel hors étape, plafond 9 % et blocage de 1 500 ms des paliers ;
* les **11 fonctions publiques** appelées une fois : 0 `ReferenceError`.

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
│   │   ├── saber.js              # ⭐ Saber Quest entière (14 sections, 1 fichier)
│   │   ├── loot.js               # ⭐ butin des mobs (4 / 6 / 9 %), tous rangs
│   │   ├── tutorial.js           # ⭐ nouveau joueur : accueil + 4 étapes guidées
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
│   ├── check-blocks.mjs          # ⭐ intègre les packs + simule le chargeur
│   └── check-tutorial.mjs        # ⭐ rejoue le parcours du nouveau joueur
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

## Un Code Block oublié : le cas des 4 handlers de `flame`

Symptôme, en jeu :

```
[FA] 4 handler(s) absent(s) : onPlayerClickLaser, onPlayerClickMeteorShower,
onPlayerLeaveMeteorShower, onCancelMeteorShower (voir FA.status()).
```

Ces quatre noms sont **exactement** ceux que fournit `src/blocks/020-flame.js` —
un seul module, quatre handlers, rien d'autre. Le module n'était donc pas chargé :
le pack 8 du monde était une **ancienne version** (qui ne contenait que `mythical
apex plus`), alors que `flame` y a été déplacé dans la publication suivante.

Le piège : un bloc périmé est **invisible**. Son en-tête est cohérent (longueur +
hash sont les siens), il se charge sans erreur, et il ne manque que les handlers
dont on ignorait l'origine.

### La parade : une empreinte de publication dans l'en-tête

Chaque bloc annonce la version de la publication dont il vient :

```
/*BP3:8/8:len=30920:h=5493cb73:v=f0f0c838*/
```

`v=` est la même sur les 8 blocs d'une même version (empreinte de l'ensemble des
packs). Le chargeur prend la valeur la plus fréquente comme référence et nomme
les autres, avec leur `z` pour savoir quoi recoller :

```
[FA] 1 Code Block(s) d'une AUTRE version : pack 8 (z=100009) — recopie-les
depuis code-blocks/ (version f0f0c838).
[FA] 4 handler(s) absent(s) : … Un Code Block est d'une ancienne version.
```

`FA.status()` expose `release` et `stale` (`[{ index, z }]`). Les blocs
d'une version antérieure à cette fonctionnalité n'ont pas de `v=` : ils restent
lisibles, et sont simplement signalés comme périmés dès qu'un bloc de la nouvelle
version est présent.

`check-blocks.mjs` rejoue exactement ce scénario (pack 8 réduit à son dernier
module) et exige : bloc périmé nommé, 4 handlers signalés, message renvoyant vers
la piste « ancienne version ».

---

## Censure de Bloxd.io : `*b,f=` reçu en `******=`

Symptôme signalé en jeu : *« Dans le code block 2 il y a une erreur a la ligne 6
"Unexpected token" »*. Le code local était sain — c'est **le filtre de Bloxd.io**
qui a mangé le texte au moment du collage :

```
source                 i=(s.hi-s.lo)*b,f=Math.atan2(c-a,s.hi-s.lo)
reçu par le jeu        i=(s.hi-s.lo)******=Math.atan2(c-a,s.hi-s.lo)
```

Le bloc ne compile plus, donc **tout le pack 2 est perdu** (le chargeur le
déclare `CENSURÉ` et ignore ses handlers).

### Ce qui ne suffisait pas : les espaces seuls

Premier correctif (demande 68) : espacer la ponctuation (`b,f` → `b , f`).
**Les espaces restent** — ils ne gênaient pas — mais le joueur a retrouvé la
censure au même endroit, donc ils ne suffisaient pas.

### Ce qui a marché : les espaces **plus** un `1 *`… et la virgule collée

Trois mesures successives, toutes faites **en jeu** par le joueur (c'est le seul
juge — le filtre n'est pas documenté) :

| Ce qui a été collé | Reçu dans le bloc | Verdict |
| --- | --- | --- |
| `*b,f=` | `******=` | censuré |
| `*b , f=` (espaces autour de la virgule) | `*****=` | censuré |
| `* 1 * b ,f =` | intact | **passe** |

La dernière ligne est la recette : **garder les espaces**, ajouter `1 *` devant
l'identifiant, et **coller la virgule au `f`** (l'espace va *avant* la virgule,
jamais après). Le build génère exactement ça :

```
source         i=(s.hi-s.lo)*b,f=Math.atan2(c-a,s.hi-s.lo)
généré         i=(s.hi-s.lo)* 1 * b ,f=Math.atan2(c-a,s.hi-s.lo)
```

Le build reprend **la même recette**, y compris les espaces autour du `1` :
`*<lettre seule>` → `* 1 * <lettre seule>`. `x * 1 * b` vaut `x * b` :
résultat strictement identique, mais la suite de lettres est cassée par un
chiffre.

`uncensorBlockCode()` (`tools/pack-format.mjs`) applique ça partout où c'est du
code — **jamais dans une chaîne, un gabarit, une regex ou un commentaire**
(sinon un joueur verrait `* 1 *` dans un message du jeu), et laisse tranquilles
`2*b` (le chiffre coupe déjà), `a**b`, `a*=b`, `function*b` et `yield*x` qui ne
sont pas des multiplications. Deuxième passe : **`normalizeCommas`** enlève tout
blanc entre une virgule et une lettre (`b , f` → `b ,f`), et `findRiskyCommas`
fait échouer le build s'il en reste un. En revanche les virgules ordinaires du
code minifié (`f(a,b)`) ne bougent pas : les espacer coûterait des milliers de
caractères pour rien.

La détection est heuristique (`literalMask`) et `check-blocks` vérifie les deux
côtés : code neutralisé, littéraux intacts.

Les règles d'espacement (`x,f`, `f,x`, `x[.,(]bdg`, `t.f`, `b(f`…) restent en
place : elles ne coûtent que des espaces, font partie de la forme validée, et
couvrent les motifs déjà observés.

Quatre garde-fous dans la chaîne :

1. `build-blocks.mjs` **refuse de produire** un pack qui contient encore un motif
   censurable ou un `*<lettre>` non neutralisé (le filtre s'applique à tout le
   champ texte du Code Block : on neutralise partout, sans trier les fichiers).
2. `check-blocks.mjs` rejoue les cas du bug (`*b,f=`, `x=d,f`, `t.f`, `b(f`…),
   vérifie l'idempotence, la validité du JavaScript, le **résultat identique à
   l'exécution** (les mêmes arguments donnent les mêmes valeurs avant/après),
   l'absence d'insertion dans les littéraux, puis scanne **chaque module** des
   8 packs. La ligne du dôme a un test dédié : elle doit valoir exactement
   `i=(s.hi-s.lo)* 1 * b ,f=Math.atan2(c-a,s.hi-s.lo)`.
3. Le découpage en packs est **stable** : le build réutilise le manifeste
   précédent tant que la répartition tient, donc « pack 2 » reste le pack 2. Si
   un module a grossi au point de déborder, un seul module indépendant déménage
   au lieu de tout redistribuer (cette fois `flame` est parti au pack 8 et
   `song` est venu dans le pack 2).
4. `findCensoredPatterns` refuse aussi les mots reconstitués : le scan de
   dictionnaire après suppression de la ponctuation ne sert à rien (faux
   positifs : `shit` = `onPlayerClickControl` + `Slash:It`), mais il a servi à
   comprendre le mécanisme — `s.lo)*b` + `,f=` = « slob ».

Il reste **une** limite assumée : la neutralisation vise les multiplications
`*<lettre>` (le cas observé). On ne **sait pas** expliquer précisément ce que le
filtre de Bloxd.io reconnaît — on sait seulement que `* 1 * b` est passé en jeu
là où `b , f` ne passait pas. Si la censure revient ailleurs, la parade est la
même (`* 1 *`), et les espaces sont gratuits : on les garde.

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

## Commandes : items partout, boutons en option sur PC

Le joueur **choisit** dans **Settings → Controls** — **sur PC seulement** — et son choix
est enregistré (clé `ctl`).

| | Dash | Capacités | Coup de poing |
|---|---|---|---|
| **PC — ITEMS (défaut)** | clic droit | un item par capacité | M1 à main nue |
| **PC — BUTTONS** | `Q` | `Swap Orb` en main → `Z X C V F` | `Void Net` en main → M1 au clic, `Z X` = attaques du style |
| **MOBILE** (aucun choix) | **bouton tactile** | un item par capacité | M1 à main nue |

**Le mobile est verrouillé sur les items, et son dash a un bouton tactile.** Les
`customButtons`, eux, sont des **touches de clavier** : Bloxd ne les déclenche que par
`onPlayerPressedButton`, donc jamais depuis un écran tactile. Un mobile n'en reçoit **aucun**.

- `getControlMode()` **force** `CTL_ITEMS` pour un joueur tactile : un `ctl = "buttons"`
  laissé en base ne ressuscite pas les boutons. `buttonsFor()` renvoie `[]` pour un mobile,
  et `onPlayerPressedButton` refuse de son côté tout appui venu d'un tactile.
- Le dash mobile passe par `touchscreenActionButton` (une icône d'éclair) →
  `onTouchscreenActionButton` → `handleDashButton` → `tryDash`, posé au join et au respawn.
  **C'est la seule entrée du dash sur un écran tactile**, et c'est mesuré en jeu
  (demande 94) : presser ce bouton est le seul cas où le callback arrive. Casser un bloc,
  frapper un mob, parler à un PNJ, sauter, ou toucher le côté de l'écran ne l'appellent pas
  — et ne dashent donc pas.
- `onPlayerAltAction` **ne dashe jamais sur mobile** : l'action secondaire y est déclenchée
  par le tactile aussi, et elle ne doit pas propulser.
- `handleDashItemClick` ne dashe plus sur mobile non plus : un `Moonstone Dust` résiduel y
  est **retiré** au premier clic (et au join), sans propulser personne. Sur PC, son clic
  dashe encore, puis il est retiré.
- La carte `Controls` n'est **pas créée** sur un écran tactile, et `toggleControlMode` lui
  répond que ses capacités passent par les items et que son dash est le bouton sous son
  pouce.
- `Swap Orb` et `Void Net` n'ouvrent que des **touches de clavier** : un mobile ne les
  reçoit jamais. `ensureSwapOrb()` / `ensureVoidNet()` excluent l'appareil, et
  `equipFruit` / `giveFightingStyleItems` donnent les items de capacité à un mobile.
- **Pas de doublon d'item** : le mode « boutons » n'existe que sur PC, donc les items de
  capacité d'un mobile ne peuvent pas cohabiter avec un orb.

Le mode est lu une seule fois par action (`useItemControls()`), donc le fruit et le style
savent toujours quoi donner. Quand l'appareil compte vraiment (dash tactile, détection des
PNJ au doigt, verrou des commandes, texte des boutons), c'est `isMobilePlayer()` : le
drapeau est lu une fois, au join.

### Une icône par type d'attaque

Le joueur voit cinq boutons sans les lire : l'icône doit dire ce que fait le
bouton. Une icône par capacité serait 152 dessins à maintenir, donc chaque
capacité est classée dans **un des 16 types** ci-dessous (`ATTACK_TYPES` et
`ABILITY_TYPE` dans `fruit/abilities.js`), et le bouton porte l'icône de son
type. Le nom de la capacité n'est mis **qu'en description**, donc sur PC : sur
mobile il n'y a pas la place pour un mot.

| # | Type | Icône | # | Type | Icône |
|---|---|---|---|---|---|
| 1 | Projectile | `arrow-up-right-from-square` | 9 | Bouclier | `shield-halved` |
| 2 | Rayon | `sparkle` | 10 | Buff | `boot` |
| 3 | Explosion | `fire` | 11 | Vol | `feather-alt` |
| 4 | Zone au sol | `square-dashed` | 12 | Invocation | `user-plus` |
| 5 | Élan | `person-falling-burst` | 13 | Piège | `skull` |
| 6 | Corps à corps | `hand-fist` | 14 | Téléportation | `arrows-rotate` |
| 7 | Saisie | `hand-point-left` | 15 | Ultime | `crown` |
| 8 | Soin | `hand-holding-medical` | 16 | Malus | `bee` |

Classer une nouvelle capacité = lui donner un type dans `ABILITY_TYPE`. Sans
type, `abilityIconName()` renvoie l'icône de secours — et `npm run check` refuse
la capacité non classée, comme il refuse une icône absente de la liste blanche.

Les `keycode` envoyés sont ceux d'un clavier QWERTY (`KeyQ`, `KeyZ`…) : Bloxd
les remappe seul sur un AZERTY, c'est la même touche physique. `ability` et
`style` partagent `Z`/`X` **à dessein** : une seule main à la fois (`Swap Orb`
**ou** `Void Net`), donc les deux groupes ne sont jamais actifs ensemble. Le
dash, lui, est toujours là et ne partage rien.

Trois détails qui comptent :

1. **Le dash est toujours NOTRE dash.** Le bouton tactile comme l'item
   résiduel (`Moonstone Dust`, une **matière** sans effet propre) passent par
   `tryDash` : coût en stamina, animation, verrou anti-coup de poing. C'était
   tout l'intérêt du changement de matière : `Snowdash` propulsait le joueur
   **de lui-même**, et sur mobile ce dash-là ne peut pas être annulé, d'où un
   second dash gratuit. L'item n'est plus donné : un reliquat d'inventaire ne
   déclenche qu'un dash normal, et il est retiré au join sur PC.
2. **Le `Void Net` fait le coup de poing.** En main, `onPlayerClick` appelle
   directement `handleFightingStyleM1(…, allowHeldItem = true)` : le filet
   n'empêche pas le M1 du style, il le déclenche. Sans lui, la main nue fait le
   M1 habituel.
3. **Une touche ne fournit aucun point de visée.** `clickPoint()` reconstitue ce
   qu'un clic aurait donné (`x, y, z`, nom du bloc, créature devant le joueur)
   depuis `getPosition`, `getPlayerFacingInfo().dir/camPos`, `targetBlock()` et
   `pickTarget(…, 40, 0.6)`, puis appelle `handleAbilitySlot(id, n)` — le même
   dispatcher que le clic.
4. **Le bouton tactile ne se répète pas.** `onTouchscreenActionButton` arrive
   à l'appui **et** au relâchement : seul l'appui dashe, et un même doigt posé
   ne peut pas enchaîner deux dashs (`DASH_BUTTON_MIN_MS`). Il n'existe que sur
   mobile : sur PC le dash reste le clic droit ou `Q`.
5. **Le dash mobile n'a qu'une entrée, et elle est mesurée.** La sonde
   temporaire de la demande 94 (une ligne de chat par rafale d'appels) a montré
   qu'un écran tactile n'envoie `TSd`/`TSu` que pour le bouton : ni un clic, ni
   un coup, ni un tap sur un PNJ n'appellent `onTouchscreenActionButton`. Elle a
   été retirée après mesure, et `npm run check` vérifie qu'elle ne revient pas.

`npm run check` verrouille tout ça : chaque bouton doit avoir une icône de la
liste blanche (`zap`, `fire`, `snowflake`, `crosshairs`, `swords`, `gem`), une
touche unique et valide, un `id` traité par `onPlayerPressedButton`. Une icône
inconnue ne casse rien : elle s'afficherait « ? », d'où la vérification.

---

## Fruits : nouveaux items (poissons)

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

### Aucune migration ne tourne au join

Les fruits sont devenus des poissons **avant** ce nettoyage : plus rien ne
convertit d'ancien item. `migrateFruitItems()` et `LEGACY_FRUIT_ITEMS` ont été
supprimés, comme toutes les autres tables d'anciens noms (armes d'équipe,
paintballs du Fighting Style, ancien format d'îles des Settings).

Concrètement : un fruit est écrit **au moment où il est donné**
(`fruitItemAttributes`), avec son nom, sa description et son enchant. Un item
très ancien encore en inventaire reste tel quel — c'est un objet que le joueur
peut jeter, pas une dette du code.

---

## Rien de temporaire dans le code

Le code ne contient plus rien qui ne serve au jeu tel qu'il tourne aujourd'hui.

| Ce qui a été retiré | Pourquoi |
| --- | --- |
| Pseudos écrits en dur (`K4miNoK4mi`, `Yanick2010`, `EPICOO00000`, `Chillguy45`) | Un pseudo n'est pas une règle : trois exemptions traînaient dans `index.js` (commandes, changement de bloc), une dans `UI.js` (vol rapide), une dans `admin.js` (débannissement automatique). |
| Migration des anciens items au join | Fruits, armes d'équipe, paintballs : plus aucune table d'anciens noms. |
| Exports que personne n'appelait | Une trentaine, dont les helpers de debug (`_getMobDataMap`, `bossGateForTest`, `fruitBlocksStatus`, `reloadFruitBlocks`). |

Ce qui reste, et pourquoi :

- **Le confort du propriétaire** (`UI.js`) est décidé par le **rang** : `isOwner(playerId)`
  donne le vol rapide et les coordonnées visibles. Aucun effet sur le jeu — ni flèche,
  ni avantage en combat — et changer de propriétaire ne touche plus au code.
- **Les trapdoors se posent toujours** (`onPlayerChangeBlock`) : ce ne sont pas des blocs
  de construction, la règle est la même pour tout le monde. Seuls les fruits, les items de
  style et les items de commande sont bloqués.
- **Les commandes d'équipage** (`/crew …`) passent par `crewCommands` pour tout le monde :
  les permissions sont à l'intérieur, pas dans une liste de pseudos.
- **Les rangs** restent dans `RANKS` / `STAFF` (`core/ranks.js`), une seule table. C'est le
  seul endroit où un pseudo apparaît, et c'est une donnée, pas une exception dans une
  condition.
- **L'ancienne UI du panneau Settings est conservée.** Le panneau a déjà eu un item par
  île (`isle_ju`, `isle_pv`…). Ces items ne sont plus créés, mais un client qui les a
  encore en boutique doit pouvoir cliquer dessus : `handleSettingsShop` reconnaît encore
  leurs clés et bascule l'île, exactement comme les items actuels
  (`set_arrows_show` / `set_arrows_hide`). Supprimer cette lecture laissait le clic sans
  réponse — d'où le test de régression dans `check-rules`.

`npm run check-rules` refuse désormais un pseudo de la table `STAFF` recopié ailleurs :
ajouter une exemption par nom fait échouer la CI.

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
FA.status();        // objet COURT : { ready, phase, packCount, registered, missingCount, … }
FA.reload();        // relit les Code Blocks (ré-échauffe le chunk avant)
FA.reload(true);    // idem en forçant la réévaluation
FA.prewarm();       // force le chargement du chunk des Code Blocks (16 getBlock)
```

**`FA.status()` doit rester petit.** Bloxd refuse de renvoyer un objet trop gros
et répond `InternalError: Result too large` — un diagnostic illisible ne sert à
rien. Il ne contient donc que des compteurs, les 12 premiers noms manquants et
les 5 premières erreurs (tronquées) : mesuré à **257 caractères** en marche
normale et **381 en panne** (l'ancien en faisait 5 850). Le détail complet (les
197 handlers, la liste par pack) s'affiche avec `FA.logStatus()`,
qui passe par `api.log` et n'a donc pas cette limite. `FA.status(true)` rend la
liste entière des manquants, pour un test hors jeu.

### Appels pendant le démarrage : « trop tôt » n'est pas une panne

Au lancement du monde, le chunk des Code Blocks arrive avec un tick de retard et
le balayage prend plusieurs ticks : pendant cette fenêtre, un clic de capacité
appelle un handler qui n'existe pas encore. Le chargeur levait alors une erreur
(`InternalError` au lancement).

Il distingue maintenant **deux causes** pour un handler absent :

| `evaluatedOnce` | situation | comportement |
| --- | --- | --- |
| `false` | les packs n'ont pas encore été lus (le chargeur réessaie, `retries < 30`) | appel **ignoré**, une phrase au joueur, **aucune erreur** |
| `true` | les packs ont été lus et le handler n'y est pas | log + **erreur levée** (détecteur de bloc manquant) |

Le message au joueur est envoyé **une seule fois par joueur et par démarrage**
(jamais pour un appel sans identifiant), et `FA.status().ignoredEarly` compte les
appels ignorés. Une fois le chargeur résigné (30 essais, aucun bloc posé), on
repasse par le signalement bruyant : sinon le joueur verrait « still loading »
indéfiniment sans que personne ne comprenne.

`check-blocks.mjs` vérifie les deux côtés : un appel avant chargement **ne lève
pas** d'erreur, prévient le joueur **une seule fois**, et un handler absent
**après** chargement lève **toujours**.

### Un état = une ligne (anti-spam du log)

Quand les Code Blocks ne sont pas posés, le chargeur réessaie **30 fois** (8 ticks
par balayage + 10 entre deux, soit ~4 min) et, à chaque tentative, réémettait les
mêmes lignes ; `tooEarly()` utilisait en plus un compteur **par nom de handler**
(197 tags, donc 197 lignes autorisées toutes les 2 s). Mesuré : **873 lignes de
log en ~200 s** pour un seul état, et le vrai message noyé dedans.

Une **seule** primitive, `sayOnce(clé, msg)` : un constat n'est dit qu'**une
fois par état** (erreurs de balayage, chunk illisible, handler absent, résumé de
chargement, « trop tôt », abandon du chargeur).

L'ancien `warn(tag, msg)` « une fois toutes les 2 s » a été **supprimé** : pour un
état qui ne change pas (chunk froid), il laissait passer une ligne toutes les 2 s
**indéfiniment**, soit 30 lignes par minute à vie. Mesuré en monde complet : 62
lignes en 7 min sans jamais s'arrêter — c'était le spam qui restait.

Un message qui **disparaît puis revient** est redit : c'est un vrai changement
d'état (bloc recollé, puis retiré), pas du bruit. `sayErrors()` retient donc la
liste courante et oublie les erreurs qui ne sont plus là.

Résultat mesuré, **monde sans aucun Code Block**, 900 ticks et 2 700 clics de
capacité : **7 lignes** (une seule « aucun Code Block trouvé », une seule
« N handler(s) absent(s) », une seule « capacités utilisées avant la fin du
chargement »). Avec un **chunk illisible** (`getBlock` qui lève — le cas réel du
démarrage) : **9 lignes** au lieu de 69. En jeu, le dispatcher
(`fruit/index.js`) attrape en plus l'exception et **plafonne à 5 logs par
capacité**, en remboursant le cooldown : c'est pour ça que le `throw` reste, mais
qu'il n'inonde plus le log.

Le chargeur finit aussi par **renoncer** : après 30 essais sans jamais lire un
bloc, `boot()` ne relance plus de balayage (c'était un scan complet toutes les
750 ms pour rien) et une ligne unique l'annonce. `FA.reload()` reste là pour
redemander, et un handler absent lève **toujours** à ce moment-là (sinon le
cooldown serait dépensé pour rien). `FA.status()` expose `phase`, `readErrors`
et `gaveUp`.

`check-blocks.mjs` exige : ≤ 20 lignes pour un monde sans bloc, chaque message
d'état **une seule fois**, le `throw` toujours présent après l'abandon du
chargeur (sinon le cooldown serait dépensé pour rien), un message redit après
disparition puis retour, et un **chunk illisible** (`getBlock` qui lève) qui ne
produit **qu'une** ligne d'état. Vérifié par mutation : revenir à `say()` fait
monter le même scénario à **2 763 lignes** et la CI refuse.

### Chargement par petits lots (mémoire)

Les 8 blocs pèsent ~31 000 caractères chacun. Les lire tous dans le même tick
faisait tenir jusqu'à `SCAN_SLOTS` × 31 000 caractères en mémoire d'un coup — et
un **ancien bloc resté en place à côté des nouveaux suffit à doubler la facture**.
Le bac à sable de Bloxd est étroit : ce pic ressort en
`InternalError: out of memory` **au chargement du monde**.

Le balayage lit donc `SLOTS_PER_LOAD` = 3 cases par tick (24 cases → 8 ticks,
soit ~0,4 s), et :

* un bloc **en double** est signalé (`pack 1 en double (z=100022) ignoré`), non
  retenu et non réévalué ;
* les payloads sont **relâchés** juste après l'évaluation (232 454 caractères
  rendus au moteur) ;
* `FA.packInfo` ne garde plus la liste des handlers de chaque pack (5 000
  caractères), seulement leur nombre.

`check-blocks.mjs` mesure tout ça : au plus **3 lectures de blocs par tick**, un
bloc lu **une seule fois**, `FA.status()` ≤ 1 200 caractères, aucun payload
retenu après évaluation, et un doublon signalé sans faire perdre un handler.
Vérifié par mutation : remettre 24 lectures par tick ou réintroduire `packs` dans
`status()` fait échouer les trois contrôles.

Messages typiques :

- `pack 3/5 MANQUANT (attendu vers z=100004)` → Code Block absent ou vide.
- `pack 2/5 TRONQUÉ … 29000 car. reçus / 30000 attendus` → copier/coller coupé
  par la limite 32 k : reconstruis ce pack (`npm run build:blocks`).
- `handler 'onPlayerClickGravityGrab' introuvable` → les blocs **ont été lus** et
  ce handler n'y est pas (bloc manquant, censuré, ancienne version) : l'erreur
  apparaît dans les logs.
- `'onPlayerClickX' appelé avant la fin du chargement : ignoré` → le monde vient
  de démarrer, le chunk des Code Blocks arrive un tick trop tard. Ce n'était pas
  une panne : l'appel est ignoré et le joueur reçoit **une fois**
  « Abilities are still loading — try again in a moment. » (voir plus bas).

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
trois PNJ, le Mob Leader et le Saber Expert, en quatorze sections numérotées. Une fonctionnalité ne
se découpe pas en modules : seuls les morceaux **génériques** en sortent (voir
[Refactorisation](#refactorisation--un-fichier-par-sujet-mais-jamais-un-fichier-par-feature)).

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
node tools/check-imports.mjs    # imports relatifs + constantes privées d'un autre module
node tools/check-handlers.mjs   # Code Block → shim → abilities
node tools/check-blocks.mjs     # packs + simulation du chargeur (jeu simulé)
node tools/check-tutorial.mjs   # parcours du nouveau joueur (api simulée)
```

`check-imports.mjs` vérifie aussi que **la constante privée d'un module n'est utilisée nulle part
ailleurs** : une constante en MAJUSCULES (`BOSS_MOBS`, `LOOT_CHANCE`…) non exportée n'existe que dans
son fichier, donc l'utiliser depuis un autre fichier devient un global absent. Bloxd ne le signale
pas à la compilation : c'est un `ReferenceError` **à l'exécution**, et le `try/catch` appelant le rend
silencieux. Les 187 constantes de module de `src/` sont contrôlées ; les homonymes déclarés dans
plusieurs fichiers sont ignorés pour éviter le bruit.

`check-blocks.mjs` rejoue le **vrai** `code-block-loader.js` avec une `api`
simulée : scénario nominal, pack manquant, pack déplacé et **bloc d'une ancienne
version** (le cas des 4 handlers de `flame`). Il échoue si un seul
des 196 handlers (dont les 186 de Control/Gravity) n'est pas enregistré.

Il teste aussi l'**anti-censure** : sur `*b,f=`, `x=d,f`, `t.f`, `b(f`… la
correction doit supprimer tout motif censurable, rester idempotente, ne changer
que des espaces et produire du JavaScript valide — puis il scanne chaque module
des 8 packs générés. C'est ce test qui empêche le bug « Unexpected token ligne 6 »
de revenir.

Il rejoue aussi le **dôme sur une falaise**, tick par tick, avec un monde solide :
aucun placement de victime dans un bloc, les mobs du dôme sont tenus, et une cible
enfermée ressort à l'air le plus proche au relâchement. C'est ce test qui attrape
le bug avant le joueur.

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
- **Nouveau fichier = générique uniquement.** Un module ne se crée que si plusieurs
  domaines s'en servent (`utils/bossGate.js`, `gameplay/loot.js`). Une fonctionnalité,
  même grosse, reste dans le fichier de son domaine : la Saber Quest est un fichier de
  2 200 lignes en sections numérotées, pas un dossier.
- `dist/`, `build-out/`, `node_modules/` sont ignorés par git. Seuls les packs
  de `code-blocks/` sont versionnés car ce sont les fichiers à coller dans le jeu.

## Points connus

1. `src/build/layer.js`, `path.js`, `plane.js` sont absents du dépôt.
   `build-world.mjs` injecte des stubs vides **le temps du build** et prévient.
   Pose les vrais fichiers dans `src/build/` pour réactiver ces systèmes.
2. `cleanup` / `clearAll` de `src/utils/boss.js` sont maintenant exportés : le
   bundle ne casse plus sur ces deux imports.
3. L'ancien doublon `knockBack` dans `FA.c` a disparu.
