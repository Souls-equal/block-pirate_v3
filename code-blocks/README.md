# code-blocks/ — packs générés (NE PAS ÉDITER À LA MAIN)

Généré par `npm run build:blocks`. Sources lisibles : `src/blocks/`.

**36 fichiers sources → 8 Code Blocks** (451 056 → 232 366 caractères, -48 %).

Colle **le contenu entier** de chaque `pack-XX.js` dans UN Code Block du monde,
à x=100000, y=100000, z indiqué ci-dessous (blocs consécutifs).
L'ordre est libre : le chargeur lit l'en-tête `BP3:<n>/<N>` de chaque bloc.

| Pack | z | Caractères | Fruits / modules |
| --- | --- | --- | --- |
| `pack-01.js` | `100002` | 31 493 | spring, ice, quakes, light, rocket, paintballs, portal, rubber, diamond, pain, gas |
| `pack-02.js` | `100003` | 31 100 | song, control state, control domain, control slash, control shambles |
| `pack-03.js` | `100004` | 31 147 | lightning, dark, smoke, ghost, tiger mark, creation |
| `pack-04.js` | `100005` | 30 869 | blizzard, gravity state, gravity fx, gravity barrage, gravity grab |
| `pack-05.js` | `100006` | 26 663 | blade, dought, tiger form, magma |
| `pack-06.js` | `100007` | 26 930 | common uncommon plus, rare legendary plus |
| `pack-07.js` | `100008` | 23 211 | legendary mythical plus |
| `pack-08.js` | `100009` | 30 953 | flame, mythical apex plus |

## Anti-censure Bloxd.io

Bloxd.io filtre le texte collé dans un Code Block. Vu en jeu : la séquence
`(s.hi-s.lo)*b,f=` est arrivée sous la forme `(s.hi-s.lo)******=`, le bloc ne
compilait plus (« Unexpected token ») et **tout le pack 2 était perdu**.
Espacer la ponctuation (`b,f` → `b , f`) ne suffisait pas. Ce qui a marché
en jeu, et que le joueur a trouvé à la main : garder les espaces, ajouter un
`1 *` devant l'identifiant d'une lettre, et **coller la virgule au `f`**
(`b , f` a été censuré, `b ,f` est passé). `uncensorBlockCode()` génère donc
`*b` → `* 1 * b` et ramène `b , f` à `b ,f` (multiplication par 1 : même
résultat). Jamais dans une chaîne, un gabarit, une regex ou un commentaire.
`npm run check` **refuse** un pack qui contiendrait encore un motif
censurable et vérifie que le résultat des calculs est identique.

Le découpage est stable d'un build à l'autre : un fruit ne change pas de pack,
donc un pack déjà collé dans le monde ne doit être recopié que si son contenu
change (compare le tableau ci-dessus avec ton monde).

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
