# world-code/ - World Code compact (genere, NE PAS EDITER A LA MAIN)

Sources lisibles : `src/`. Regenerer : `npm run build:src`.

**32 fichiers, 348 738 caracteres** (68 % de la limite de 512 000 du World Code, -53 % par rapport aux sources lisibles).

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
| `core/admin.js` | 50 939 | 90 503 |
| `core/ranks.js` | 2 457 | 5 245 |
| `core/team.js` | 15 715 | 44 138 |
| `core/theme.js` | 15 146 | 34 271 |
| `core/UI.js` | 13 200 | 35 505 |
| `fruit/abilities.js` | 35 435 | 48 660 |
| `fruit/fruitData.js` | 5 685 | 8 871 |
| `fruit/func-abilities.js` | 21 150 | 28 739 |
| `fruit/index.js` | 21 254 | 38 791 |
| `gameplay/codes.js` | 3 861 | 6 479 |
| `gameplay/customItem.js` | 6 615 | 17 539 |
| `gameplay/fightingStyles.js` | 19 087 | 40 341 |
| `gameplay/loot.js` | 1 889 | 6 593 |
| `gameplay/NPCs.js` | 7 656 | 18 764 |
| `gameplay/quest.js` | 10 068 | 22 718 |
| `gameplay/saber.js` | 29 251 | 79 633 |
| `gameplay/spawning.js` | 6 084 | 14 733 |
| `gameplay/stamina.js` | 4 493 | 10 048 |
| `gameplay/stats.js` | 4 605 | 10 486 |
| `gameplay/tutorial.js` | 6 744 | 15 953 |
| `gameplay/variations.js` | 6 376 | 20 732 |
| `index.js` | 12 042 | 25 021 |
| `utils/boss.js` | 7 135 | 16 382 |
| `utils/combat.js` | 14 910 | 45 831 |
| `utils/data.js` | 5 500 | 13 959 |
| `utils/fx.js` | 6 076 | 10 662 |
| `utils/haki.js` | 5 214 | 13 122 |
| `utils/killAttribution.js` | 2 138 | 6 816 |
| `utils/killfeed.js` | 834 | 1 159 |
| `utils/lifeform.js` | 4 392 | 8 666 |
| `utils/timer.ts` | 1 432 | 5 761 |
| `utils/world.js` | 1 355 | 2 481 |

## Controle

Le script verifie que les points d'entree (`onPlayerClick`, `onPlayerJoin`,
`tick`, `onClose`, ...) et les ponts `globalThis.FA*` ont survecu.
