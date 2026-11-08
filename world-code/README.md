# world-code/ - World Code compact (genere, NE PAS EDITER A LA MAIN)

Sources lisibles : `src/`. Regenerer : `npm run build:src`.

**32 fichiers, 372 240 caracteres** (73 % de la limite de 512 000 du World Code, -55 % par rapport aux sources lisibles).

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
| `core/admin.js` | 52 355 | 92 035 |
| `core/ranks.js` | 2 412 | 5 717 |
| `core/team.js` | 16 480 | 48 831 |
| `core/theme.js` | 17 990 | 40 158 |
| `core/UI.js` | 14 838 | 44 016 |
| `fruit/abilities.js` | 38 498 | 54 051 |
| `fruit/fruitData.js` | 5 685 | 8 871 |
| `fruit/func-abilities.js` | 23 532 | 39 745 |
| `fruit/index.js` | 22 178 | 41 901 |
| `gameplay/codes.js` | 3 870 | 7 279 |
| `gameplay/customItem.js` | 7 369 | 19 334 |
| `gameplay/fightingStyles.js` | 19 842 | 43 045 |
| `gameplay/loot.js` | 1 970 | 7 267 |
| `gameplay/NPCs.js` | 7 561 | 18 986 |
| `gameplay/quest.js` | 10 112 | 22 866 |
| `gameplay/saber.js` | 28 931 | 79 595 |
| `gameplay/spawning.js` | 6 006 | 14 759 |
| `gameplay/stamina.js` | 5 607 | 13 619 |
| `gameplay/stats.js` | 5 381 | 12 896 |
| `gameplay/tutorial.js` | 6 772 | 16 191 |
| `gameplay/variations.js` | 6 376 | 20 732 |
| `index.js` | 16 039 | 39 321 |
| `utils/boss.js` | 7 014 | 16 412 |
| `utils/combat.js` | 15 465 | 48 329 |
| `utils/data.js` | 6 530 | 18 087 |
| `utils/fx.js` | 6 076 | 10 662 |
| `utils/haki.js` | 5 347 | 13 658 |
| `utils/killAttribution.js` | 2 138 | 6 816 |
| `utils/killfeed.js` | 834 | 1 159 |
| `utils/lifeform.js` | 6 245 | 13 907 |
| `utils/timer.ts` | 1 432 | 5 761 |
| `utils/world.js` | 1 355 | 2 481 |

## Controle

Le script verifie que les points d'entree (`onPlayerClick`, `onPlayerJoin`,
`tick`, `onClose`, ...) et les ponts `globalThis.FA*` ont survecu.
