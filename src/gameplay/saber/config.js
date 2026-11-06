// gameplay/saber/config.js
/* config.js — le socle : items, points du monde, etapes, cle de base

   Toutes les constantes de la Saber Quest, et rien d'autre. Aucun import :
   ce fichier ne depend de personne, tout le reste depend de lui.
   
   Changer une coordonnee, un nom d'item ou un numero d'etape se fait ICI,
   et nulle part ailleurs.
 */

export const ITEM_TORCH = "Torch";

/* La Cup est un VRAI seau du jeu : `Bucket` quand elle est vide, `Water
   Bucket` quand elle est pleine. Le nom affiche (`Cup of Water`) et la
   description ne sont que DECORATIFS : aucune decision ne les lit, sinon un
   seau renomme par un Code Block ou par une ancienne version deviendrait
   invisible pour la quete. La regle est donc : on decide sur l'item
   d'origine, on habille l'item d'origine. Le remplissage ne retire jamais
   l'item pour le redonner : le slot qui tient le seau est reecrit au meme
   endroit (voir fillCup). */
export const ITEM_CUP = "Bucket";

export const ITEM_CUP_FULL = "Water Bucket";

export const CUP_FULL = "Cup of Water";

export const CUP_FULL_ATTRS = {
    customDisplayName: CUP_FULL,
    customDescription: "A cup full of fresh water. Someone must be thirsty.",
};

/* Gold Grit et Magmaward Fuel sont de VRAIS items du jeu (ajoutes
   recemment) : on les donne par leur nom, sans renommage ni attributs. */
export const ITEM_GOLD = "Gold Grit";

export const ITEM_RELIC = "Magmaward Fuel";


/* TOUS les items de la quete sont verrouilles : ils ne doivent jamais
   pouvoir etre laches (donc donnes a un autre joueur), et chacun est
   consomme a l'usage (Torch au rideau, Cup a l'Old Man, or au Rich Man,
   relique au mur). */
export const LOCKED_ITEMS = [ITEM_TORCH, ITEM_CUP, ITEM_CUP_FULL, ITEM_GOLD, ITEM_RELIC];


/* Les cinq boutons caches de la jungle. */
export const BUTTONS = [
    [1439, -918, 300],

    [1334, -915, 261],
    [1302, -915, 382],
    [1516, -916, 165],
    [1449, -903, 128],
];

export const WATER_POINT = [2534, -897, 449];

export const WALL_MIN = [1318, -911, 321];

export const WALL_MAX = [1320, -909, 321];

export const WALL_BEHIND = [1319, -912, 323];


/* Etapes (une seule cle db par joueur). */
export const S = {
    NONE: 0,
    DOOR: 1,
    CURTAIN: 2,
    WATER: 3,
    OLD_MAN: 4,
    HUNT: 5,
    GOLD: 6,
    RELIC: 7,
    WALL: 8,
    /* Pas d'etape "termine" : finir la quete la remet a zero et SUPPRIME la
       cle `s` (voir saberFallen). L'etape survit a la deconnexion, pas la fin
       de la quete. */
};


/* UNE seule cle, courte : le numero d'etape. Les plaques cliquees ne sont
   JAMAIS ecrites (voir saveButtons) : un joueur qui quitte a 3/5 recommence a
   0/5. Les deux cles des versions precedentes sont supprimees au join. */
export const DB_STEP = "s";

export const DB_STEP_OLD = "sq";

export const DB_BUTTONS_OLD = "sqB";


/* L'ile secrete de la quete : sa position est une constante du monde, comme
   les boutons ou le mur. Elle sert a deux choses seulement : la fleche de
   quete posee par le Rich Man, et le warp du panneau admin. */
export const SABER_ISLAND = { name: "Secret Island", pos: [2693, -911, -127], color: "#E5C15A" };


/* Les deux structures ouvrables, decrites comme dans le monde : deux coins
   et la matiere a remettre. `saved` retient ce qu'il y avait avant le
   percement (pour pouvoir le remettre a l'identique si besoin). */
export const STRUCTS = {
    door: {
        step: S.DOOR,
        center: [1329, -914.5, 318],
        /* porte de la jungle : 2 blocs de haut */
        a: [1329, -915, 318],
        b: [1329, -914, 318],
        material: "Stone",
        saved: null,
        openedAt: 0,
        arrowId: "saber-door",
        arrowLabel: "Hidden door",
    },
    curtain: {
        step: S.CURTAIN,
        center: [612, -903, 1761],
        /* rideau du desert : 3 x 3 en Purple Ceramic */
        a: [612, -904, 1760],
        b: [612, -902, 1762],
        material: "Purple Ceramic",
        saved: null,
        openedAt: 0,
        arrowId: "saber-curtain",
        arrowLabel: "Burnt curtain",
    },
};


/* ── 9. LE SABER EXPERT ────────────────────────────────────────────────── */

/* Meme arene que le boss Haki (utils/haki.js) : c'est la salle de combat du
   monde, on ne lui en invente pas une seconde. */
export const ARENA = { a: [-87, 1014, -80], b: [165, 1014, 206] };
