# code-blocks/ — packs générés (NE PAS ÉDITER À LA MAIN)

Généré par `npm run build:blocks`. Sources lisibles : `src/blocks/`.

**36 fichiers sources → 8 Code Blocks** (437 580 → 220 796 caractères, -50 %).

Colle **le contenu entier** de chaque `pack-XX.js` dans UN Code Block du monde,
à x=100000, y=100000, z indiqué ci-dessous (blocs consécutifs).
L'ordre est libre : le chargeur lit l'en-tête `BP3:<n>/<N>` de chaque bloc.

| Pack | z | Caractères | Fruits / modules |
| --- | --- | --- | --- |
| `pack-01.js` | `100002` | 28 749 | spring, quakes, light, rocket, paintballs, portal, rubber, diamond, pain, gas |
| `pack-02.js` | `100003` | 30 579 | flame, blade, ghost, creation, magma |
| `pack-03.js` | `100004` | 31 027 | lightning, dark, ice, smoke, song, tiger mark, tiger form |
| `pack-04.js` | `100005` | 30 253 | blizzard, gravity state, gravity fx, gravity barrage, gravity grab |
| `pack-05.js` | `100006` | 31 180 | dought, control state, control domain, control slash, control shambles |
| `pack-06.js` | `100007` | 26 252 | common uncommon plus, rare legendary plus |
| `pack-07.js` | `100008` | 21 088 | legendary mythical plus |
| `pack-08.js` | `100009` | 21 668 | mythical apex plus |

## Modifier un fruit

1. Édite le fichier lisible dans `src/blocks/` (jamais le pack).
2. `npm run build:blocks` — le nombre de packs et leur contenu sont recalculés.
3. Regarde le tableau ci-dessus : il te dit **exactement** quel Code Block
   recopier (les autres n'ont pas besoin d'être touchés).
4. Dans le jeu, `FA.reload()` (ou un redémarrage) recharge tout.

## Migration depuis les 32 anciens blocs

- Les anciens blocs (`z1000XX-*.js`) ne sont plus lus : le chargeur ignore
  tout Code Block sans en-tête `BP3`. Tu peux écraser les 5 positions ci-dessus.
- Pour utiliser une bande vierge, mets au début du World Code :
  `globalThis.FA_ORIGIN = [100000, 100000, 100102];` puis colle les packs
  en z=100102..100106.
- Control est entièrement dans un seul pack, Gravity dans un seul pack : c'est
  ce qui corrige les deux fruits (plus d'état partagé entre Code Blocks).

## Contrôle

`npm run check` vérifie imports, handlers, intégrité des packs et simule le
chargeur de bout en bout.
`FA.logStatus()` / `FA.status()` dans le World Code affichent les packs chargés,
les handlers manquants et les erreurs. `FA.reload(true)` force le rechargement.
