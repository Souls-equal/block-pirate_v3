# Block Pirate — v3

Code source du jeu (One Piece / voxel) : un « moteur » en modules ES sous `src/`,
et les capacités des fruits empaquetées sous `code-blocks/`.

> **En une phrase** : le World Code garde son **format multi-fichiers lisible** dans `src/`
> (seuls `src/fruit/abilities.js`, `src/fruit/func-abilities.js` et `src/fruit/index.js` changent en jeu), et les
> 36 modules de capacités des 41 fruits sont regroupés en **7 Code Blocks** (`code-blocks/pack-01.js` … `pack-07.js`,
> ~200 k au total pour 196 handlers, sans aucun motif censuré par Bloxd.io).

---

## Démarrage rapide (copier-coller dans Bloxd.io)

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

## Couleurs & icônes (`src/core/theme.js`)

Un seul fichier décide de l'apparence de **tous** les textes du jeu. Chaque message
passe par `say()` / `shout()` (ou par le patch de l'API posé au démarrage), qui :

* remplace toute couleur par une des **7 couleurs** de la palette ;
* remplace tout **emoji** par une **icône Bloxd** (`fa-solid …` ou icône du jeu).

| Élément | Couleur | Valeur |
| --- | --- | --- |
| Pirates | rouge corail | `#FF7F50` |
| Marines | bleu clair | `#7DD3FC` |
| Argent | jaune doré | `#FFD700` |
| XP | cyan | `#22D3EE` |
| Succès | vert | `#4ADE80` |
| Danger | rouge | `#EF4444` |
| Information | gris clair | `#CBD5E1` |

Dans le code : `import { C, say, shout } from "./theme"` puis `say(id, [...])`,
`say(id, "texte", { color: C.MONEY })` ou `{ icon: "fa-solid fa-coins" }`.
`themeColor()` est idempotent : une couleur déjà palette revient identique.

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

## Arborescence

```
.
├── src/
│   ├── index.js                  # point d'entrée du World Code
│   ├── core/                     # UI, équipages, grades, admin
│   │   └── theme.js              # ⭐ palette unique + emojis -> icônes Bloxd (OBLIGATOIRE)
│   ├── gameplay/                 # quêtes, mobs, PNJ, stats, endurance, codes
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
- `dist/`, `build-out/`, `node_modules/` sont ignorés par git. Seuls les packs
  de `code-blocks/` sont versionnés car ce sont les fichiers à coller dans le jeu.

## Points connus

1. `src/build/layer.js`, `path.js`, `plane.js` sont absents du dépôt.
   `build-world.mjs` injecte des stubs vides **le temps du build** et prévient.
   Pose les vrais fichiers dans `src/build/` pour réactiver ces systèmes.
2. `cleanup` / `clearAll` de `src/utils/boss.js` sont maintenant exportés : le
   bundle ne casse plus sur ces deux imports.
3. L'ancien doublon `knockBack` dans `FA.c` a disparu.
