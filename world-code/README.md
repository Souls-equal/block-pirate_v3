# world-code/ - World Code compact (genere, NE PAS EDITER A LA MAIN)

Sources lisibles : `src/`. Regenerer : `npm run build:src`.

**30 fichiers, 290 901 caracteres** (57 % de la limite de 512 000 du World Code, -45 % par rapport aux sources lisibles).

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
| `core/admin.js` | 55 829 | 81 797 |
| `core/ranks.js` | 2 099 | 3 951 |
| `core/team.js` | 17 313 | 38 380 |
| `core/theme.js` | 11 100 | 26 091 |
| `core/UI.js` | 5 799 | 12 441 |
| `fruit/abilities.js` | 41 285 | 61 409 |
| `fruit/fruitData.js` | 4 344 | 5 913 |
| `fruit/func-abilities.js` | 20 856 | 28 127 |
| `fruit/index.js` | 18 231 | 28 172 |
| `gameplay/codes.js` | 4 375 | 7 139 |
| `gameplay/customItem.js` | 1 985 | 4 505 |
| `gameplay/fightingStyles.js` | 20 206 | 41 842 |
| `gameplay/NPCs.js` | 5 415 | 10 158 |
| `gameplay/quest.js` | 9 357 | 19 974 |
| `gameplay/spawning.js` | 6 145 | 14 262 |
| `gameplay/stamina.js` | 4 493 | 10 048 |
| `gameplay/stats.js` | 4 667 | 9 596 |
| `gameplay/variations.js` | 5 818 | 16 889 |
| `index.js` | 10 651 | 20 050 |
| `utils/boss.js` | 4 932 | 9 086 |
| `utils/combat.js` | 10 992 | 29 149 |
| `utils/data.js` | 3 754 | 7 056 |
| `utils/effect.js` | 1 475 | 5 441 |
| `utils/fx.js` | 6 076 | 10 662 |
| `utils/haki.js` | 4 605 | 9 581 |
| `utils/killAttribution.js` | 1 972 | 6 020 |
| `utils/killfeed.js` | 834 | 1 159 |
| `utils/lifeform.js` | 3 773 | 6 796 |
| `utils/timer.ts` | 1 165 | 4 416 |
| `utils/world.js` | 1 355 | 2 481 |

## Controle

Le script verifie que les points d'entree (`onPlayerClick`, `onPlayerJoin`,
`tick`, `onClose`, ...) et les ponts `globalThis.FA*` ont survecu.
