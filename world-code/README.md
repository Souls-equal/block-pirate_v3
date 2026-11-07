# world-code/ - World Code compact (genere, NE PAS EDITER A LA MAIN)

Sources lisibles : `src/`. Regenerer : `npm run build:src`.

**32 fichiers, 367 094 caracteres** (72 % de la limite de 512 000 du World Code, -52 % par rapport aux sources lisibles).

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
| `core/admin.js` | 60 854 | 100 206 |
| `core/ranks.js` | 2 457 | 5 245 |
| `core/team.js` | 17 652 | 46 827 |
| `core/theme.js` | 14 922 | 32 455 |
| `core/UI.js` | 14 701 | 37 083 |
| `fruit/abilities.js` | 40 596 | 61 145 |
| `fruit/fruitData.js` | 5 685 | 8 871 |
| `fruit/func-abilities.js` | 21 150 | 28 739 |
| `fruit/index.js` | 22 315 | 40 208 |
| `gameplay/codes.js` | 4 382 | 7 146 |
| `gameplay/customItem.js` | 6 440 | 16 851 |
| `gameplay/fightingStyles.js` | 19 919 | 41 594 |
| `gameplay/loot.js` | 1 937 | 6 318 |
| `gameplay/NPCs.js` | 8 508 | 19 941 |
| `gameplay/quest.js` | 10 557 | 23 366 |
| `gameplay/saber.js` | 31 391 | 82 490 |
| `gameplay/spawning.js` | 6 225 | 14 613 |
| `gameplay/stamina.js` | 4 493 | 10 048 |
| `gameplay/stats.js` | 4 776 | 10 726 |
| `gameplay/variations.js` | 7 125 | 21 692 |
| `index.js` | 11 693 | 23 618 |
| `utils/boss.js` | 5 070 | 9 507 |
| `utils/bossGate.js` | 1 997 | 6 579 |
| `utils/combat.js` | 14 802 | 45 357 |
| `utils/data.js` | 5 973 | 14 240 |
| `utils/fx.js` | 6 076 | 10 662 |
| `utils/haki.js` | 5 737 | 13 809 |
| `utils/killAttribution.js` | 2 198 | 6 920 |
| `utils/killfeed.js` | 834 | 1 159 |
| `utils/lifeform.js` | 3 842 | 7 058 |
| `utils/timer.ts` | 1 432 | 5 761 |
| `utils/world.js` | 1 355 | 2 481 |

## Controle

Le script verifie que les points d'entree (`onPlayerClick`, `onPlayerJoin`,
`tick`, `onClose`, ...) et les ponts `globalThis.FA*` ont survecu.
