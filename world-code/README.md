# world-code/ - World Code compact (genere, NE PAS EDITER A LA MAIN)

Sources lisibles : `src/`. Regenerer : `npm run build:src`.

**29 fichiers, 300 924 caracteres** (59 % de la limite de 512 000 du World Code, -47 % par rapport aux sources lisibles).

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
| `core/admin.js` | 56 865 | 84 688 |
| `core/ranks.js` | 2 422 | 5 195 |
| `core/team.js` | 17 975 | 41 574 |
| `core/theme.js` | 11 100 | 26 091 |
| `core/UI.js` | 5 799 | 12 441 |
| `fruit/abilities.js` | 40 596 | 61 145 |
| `fruit/fruitData.js` | 5 685 | 8 871 |
| `fruit/func-abilities.js` | 21 150 | 28 739 |
| `fruit/index.js` | 18 731 | 29 197 |
| `gameplay/codes.js` | 4 375 | 7 139 |
| `gameplay/customItem.js` | 4 141 | 10 289 |
| `gameplay/fightingStyles.js` | 19 919 | 41 594 |
| `gameplay/NPCs.js` | 7 033 | 13 876 |
| `gameplay/quest.js` | 9 357 | 19 974 |
| `gameplay/spawning.js` | 6 145 | 14 262 |
| `gameplay/stamina.js` | 4 493 | 10 048 |
| `gameplay/stats.js` | 4 776 | 10 726 |
| `gameplay/variations.js` | 5 818 | 16 889 |
| `index.js` | 10 752 | 20 830 |
| `utils/boss.js` | 4 932 | 9 086 |
| `utils/combat.js` | 13 816 | 41 557 |
| `utils/data.js` | 4 628 | 10 418 |
| `utils/fx.js` | 6 076 | 10 662 |
| `utils/haki.js` | 4 905 | 10 102 |
| `utils/killAttribution.js` | 1 972 | 6 020 |
| `utils/killfeed.js` | 834 | 1 159 |
| `utils/lifeform.js` | 3 842 | 7 058 |
| `utils/timer.ts` | 1 432 | 5 761 |
| `utils/world.js` | 1 355 | 2 481 |

## Controle

Le script verifie que les points d'entree (`onPlayerClick`, `onPlayerJoin`,
`tick`, `onClose`, ...) et les ponts `globalThis.FA*` ont survecu.
