# Block Pirate — v3

Code source du jeu (One Piece / voxel) : un « moteur » en modules ES sous `src/` et les
blocs de fruits à coller dans le monde sous `code-blocks/`.

## Arborescence

```
.
├── src/
│   ├── index.js              # point d'entrée : enregistrement de tous les handlers du monde
│   ├── core/                 # socle joueur : identité, rôles, chat, interface
│   │   ├── UI.js             # sidebar, leaderboard
│   │   ├── team.js           # équipages, chat, nametags
│   │   ├── ranks.js          # grades / permissions
│   │   └── admin.js          # boutique admin, ban, vanish, warps
│   ├── gameplay/             # boucle de jeu
│   │   ├── quest.js          # quêtes
│   │   ├── spawning.js       # apparition des mobs
│   │   ├── NPCs.js           # PNJ marchands / quêtes
│   │   ├── stats.js          # stats, boutique d'améliorations
│   │   ├── stamina.js        # endurance, dash
│   │   ├── codes.js          # codes cadeaux
│   │   └── customItem.js     # items custom
│   ├── fruit/                # fruits du démon
│   │   ├── index.js          # (ancien fruit.js) équiper / lancer un fruit
│   │   ├── abilities.js      # table des capacités (FRUIT_ABILITIES)
│   │   ├── func-abilities.js # (ancien func-abilities.txt) shim des handlers de blocs
│   │   └── fruitData.js      # données pures des fruits
│   ├── utils/                # briques techniques
│   │   ├── timer.ts          # scheduler par ticks (setTimeout/setInterval/coroutines)
│   │   ├── data.js           # accès DB joueur, XP, argent
│   │   ├── combat.js         # dégâts, effets, ciblage
│   │   ├── fx.js             # particules, meshes, sons
│   │   ├── lifeform.js       # lecture sûre des entités
│   │   ├── world.js          # blocs, raycast, spots libres
│   │   ├── haki.js           # haki d'armement
│   │   ├── boss.js           # boss (GARP)
│   │   ├── killAttribution.js
│   │   ├── killfeed.js
│   │   └── effect.js
│   └── build/                # ⚠️ voir src/build/README.md (3 modules absents du dépôt)
├── code-blocks/              # 1 fichier = 1 Code Block du monde (voir son README)
├── tools/
│   └── check-imports.mjs     # vérifie que tous les imports relatifs existent
└── LICENSE
```

Chaque fichier commence par un commentaire indiquant son chemin logique
(`// utils/boss.js`, `// fruit/abilities.js`, …) : c'est cette convention qui a servi
de référence pour le rangement.

## Vérifier après une modification

```bash
node tools/check-imports.mjs
```

Le script parcourt `src/`, résout chaque import relatif et liste les imports cassés.
Les trois modules `build/layer`, `build/path`, `build/plane` sont signalés à part :
ils ne sont pas dans le dépôt (ce n'est pas une régression du rangement).

## Conventions

- Modules **ESM** (`import` / `export`), imports relatifs **sans extension** et sans
  alias (`@/`) ; le projet est prévu pour être bundlé (esbuild & co.) avant d'être
  chargé dans le monde.
- `api` est le global fourni par le jeu ; les blocs de fruits communiquent avec le
  moteur via `globalThis.FA` (`FA.c` = helpers, `FA.r` = handlers enregistrés),
  `globalThis.__CT__` (état Control) et `globalThis.__GV__` (état Gravity).
- Ne pas modifier la première ni la dernière ligne des fichiers de `code-blocks/` :
  ils sont collés tels quels dans le monde.

## Changements de noms (ancien → nouveau)

| Avant | Après |
| --- | --- |
| `index.js` | `src/index.js` |
| `UI.js`, `team.js`, `ranks.js`, `admin.js` | `src/core/…` |
| `quest.js`, `spawning.js`, `NPCs.js`, `stats.js`, `stamina.js`, `codes.js`, `customItem.js` | `src/gameplay/…` |
| `fruit.js` | `src/fruit/index.js` |
| `abilities.js` | `src/fruit/abilities.js` |
| `fruitData.js` | `src/fruit/fruitData.js` |
| `func-abilities.txt` | `src/fruit/func-abilities.js` |
| `boss.js`, `combat.js`, `data.js`, `effect.js`, `fx.js`, `haki.js`, `killAttribution.js`, `killfeed.js`, `lifeform.js`, `timer.ts`, `world.js` | `src/utils/…` |
| `codeAtPos[100000, 100000, 1000XX].js` | `code-blocks/z1000XX-<fruit>.js` |

Le contenu des fichiers est inchangé : seules les lignes `import …` ont été réécrites
pour suivre les nouveaux chemins. Les renommages sont enregistrés par `git mv`
(l'historique est conservé, `git log --follow` fonctionne).

## Points connus (indépendants du rangement)

1. `src/build/layer.js`, `path.js` et `plane.js` sont référencés par `src/index.js`
   mais absents du dépôt — voir `src/build/README.md`.
2. `src/index.js` importe `cleanup` et `clearAll` depuis `src/utils/boss.js` :
   `cleanup()` existe mais n'est pas exporté, et `clearAll` n'existe pas du tout.
   Un bundle échouera donc sur ces deux symboles tant qu'ils ne sont pas corrigés.
3. `src/fruit/func-abilities.js` déclare deux fois la clé `knockBack` dans un objet
   (avertissement esbuild, sans effet à l'exécution).
4. `src/utils/effect.js` n'est importé par personne (module conservé tel quel).
