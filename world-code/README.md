# world-code/ - World Code compact (genere, NE PAS EDITER A LA MAIN)

Sources lisibles : `src/`. Regenerer : `npm run build:src`.

**32 fichiers, 367 459 caracteres** (72 % de la limite de 512 000 du World Code, -56 % par rapport aux sources lisibles).

## Comment coller

Recopie **chaque fichier dans le fichier de meme nom** de ton World Code
(l'arborescence est identique a `src/`) : `index.js`, `core/*`, `gameplay/*`,
`utils/*`, `fruit/fruitData.js`, et - si tu les utilises - tes
`build/layer.js`, `build/path.js`, `build/sphere.js`.

`blocks/` n'est PAS ici : ses modules partent dans les Code Blocks
(`code-blocks/pack-XX.js`).

## Ce qui change (et ce qui ne change pas)

- Supprimes : commentaires, indentation, espaces inutiles, parentheses et
  code redondant (memes regles qu'un minifieur).
- Raccourcis : les noms **locaux** (variables de fonction, parametres).
- **Intacts** : les noms exportes (donc les `import { ... }` entre
  fichiers), les affectations de globals (`onPlayerClick = ...`,
  `globalThis.FA_*`) et les noms de proprietes (`api.sendMessage`,
  `FA.c.damage`, `{ str, style }`). Le jeu s'appuie dessus.
- Chaque fichier est transforme **isolement** : aucun bundling, les imports
  et l'arborescence restent ceux du jeu.

## Fichiers

| Fichier | Caracteres | Source lisible |
| --- | --- | --- |
| `core/admin.js` | 52 083 | 91 664 |
| `core/ranks.js` | 2 276 | 5 392 |
| `core/team.js` | 16 261 | 48 087 |
| `core/theme.js` | 18 069 | 40 765 |
| `core/UI.js` | 14 715 | 45 736 |
| `fruit/abilities.js` | 38 178 | 52 633 |
| `fruit/fruitData.js` | 4 331 | 6 209 |
| `fruit/func-abilities.js` | 23 412 | 39 595 |
| `fruit/index.js` | 22 287 | 44 114 |
| `gameplay/codes.js` | 3 870 | 7 279 |
| `gameplay/customItem.js` | 5 246 | 14 105 |
| `gameplay/fightingStyles.js` | 19 337 | 42 818 |
| `gameplay/loot.js` | 1 970 | 7 267 |
| `gameplay/NPCs.js` | 8 610 | 21 876 |
| `gameplay/quest.js` | 10 158 | 23 440 |
| `gameplay/saber.js` | 28 931 | 79 595 |
| `gameplay/spawning.js` | 5 937 | 14 602 |
| `gameplay/stamina.js` | 4 940 | 15 845 |
| `gameplay/stats.js` | 5 403 | 13 203 |
| `gameplay/tutorial.js` | 6 795 | 16 214 |
| `gameplay/variations.js` | 6 343 | 20 896 |
| `index.js` | 16 243 | 43 204 |
| `utils/boss.js` | 6 895 | 16 246 |
| `utils/combat.js` | 15 465 | 48 329 |
| `utils/data.js` | 6 538 | 19 289 |
| `utils/fx.js` | 6 076 | 10 662 |
| `utils/haki.js` | 5 207 | 13 434 |
| `utils/killAttribution.js` | 2 017 | 6 490 |
| `utils/killfeed.js` | 834 | 1 159 |
| `utils/lifeform.js` | 6 245 | 13 907 |
| `utils/timer.ts` | 1 432 | 5 761 |
| `utils/world.js` | 1 355 | 2 481 |

## Controle

Le script verifie que les points d'entree (`onPlayerClick`, `onPlayerJoin`,
`tick`, `onClose`, ...) et les ponts `globalThis.FA*` ont survecu.
