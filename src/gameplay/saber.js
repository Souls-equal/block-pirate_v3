// gameplay/saber.js
/* ══════════════════════════════════════════════════════════════════════════
   LA SABER QUEST — la derniere grande quete de la Sea 1.

   UN SEUL FICHIER. La quete est UN SUJET, pas un domaine : elle vit donc ici,
   en sections numerotees, et pas en huit modules qui ne serviraient qu'a elle.
   Un nouveau fichier ne se justifie que s'il est GENERIQUE et partage par
   plusieurs domaines — c'est le cas des deux seules choses sorties d'ici :

     utils/boss.js       les paliers anti one-shot, armes par les TROIS boss
                         (Garp, le Mob Leader, le Saber Expert)
     gameplay/loot.js    le butin des mobs, tous rangs et tous mobs confondus

   SOMMAIRE

      1  constantes et points du monde     8  structures ouvrables
      2  outils partages                   9  les trois PNJ
      3  clics dans le monde              10  le Mob Leader (niveau 200)
      4  dessiner une zone                11  le Saber Expert (niveau 200)
      5  ondes communes aux deux boss     12  sa boucle (une decision par tick)
      6  etat de la quete                 13  ses neuf attaques
      7  fleches de la quete              14  morts, despawns, join / leave

   DEROULEMENT (l'etape est un seul nombre en base, cle "s")

     0  rien
     1  JUNGLE   les cinq boutons caches sont tous presses : la porte
                [1329,-915,318] + [1329,-914,318] s'ouvre. Derriere, une
                Torch (donnee par un Code Block) qui ne peut pas etre lachee.
     2  DESERT   avec la Torch, le rideau [612,-904/-902,1760/1762] brule :
                le passage s'ouvre ET la Torch est retiree. Derriere, une Cup
                (item Bucket, donnee par un Code Block).
     3  EAU      cliquer l'eau [2534,-897,449] remplit la Cup.
     4  OLD MAN  sans eau "I'm so thirsty...", avec l'eau il remercie et
                envoie vers son fils.
     5  RICH MAN il donne l'objectif (Mob Leader) et pose une fleche vers
                Secret Island.
     6  MOB LEADER  mob de niveau 200, lance par un Code Block avec
                spawnMobLeader(x, y, z) ; a sa mort il lache un "Gold Grit".
     7  RICH MAN il reprend l'or et donne la relique "Magmaward Fuel".
     8  MUR      avec la relique, cliquer le mur [1318..1320,-911..909,321]
                teleporte derriere, dans la salle de Shanks.
     9  SHANKS   parler au PNJ lance le duel du SABER EXPERT. Le vaincre
                termine la quete.
   ══════════════════════════════════════════════════════════════════════════ */

import { C, say, txt, bold, ic } from "../core/theme";
import { deleteStat, getStat, setStat } from "../utils/data";
import { nowMs, setInterval as every } from "../utils/timer";
import { damage, eff, hitArea, hitSeg, impulse, setVel } from "../utils/combat";
import { aliveNow, dist3, getAlivePlayerIds, isMobEntityType, nameTagInfo, safePosition } from "../utils/lifeform";
import { TEX, at as soundAt, boom, point, rgba, ring, segDist } from "../utils/fx";
import { heldItemName, scanAllItems, writeItem } from "./customItem";
import { markBossMob } from "./loot";
import { armBossGate, disarmBossGate, setupBossMob } from "../utils/boss";

/* ── 1. CONSTANTES ET POINTS DU MONDE ─────────────────────────────────────

   Les items de la quete, les coordonnees (porte, rideau, eau, mur,
   boutons), les etapes `S` et les cles de base. Changer une coordonnee ou un
   nom d'item se fait ICI, et nulle part ailleurs.
 */

const ITEM_TORCH = "Torch";

/* La Cup est un VRAI seau du jeu : `Bucket` quand elle est vide, `Water
   Bucket` quand elle est pleine. Le nom affiche (`Cup of Water`) et la
   description ne sont que DECORATIFS : aucune decision ne les lit, sinon un
   seau renomme par un Code Block ou par une ancienne version deviendrait
   invisible pour la quete. La regle est donc : on decide sur l'item
   d'origine, on habille l'item d'origine. Le remplissage ne retire jamais
   l'item pour le redonner : le slot qui tient le seau est reecrit au meme
   endroit (voir fillCup). */
const ITEM_CUP = "Bucket";

const ITEM_CUP_FULL = "Water Bucket";

/* Nom affiche de la Cup pleine : il vit dans ITEM_LOOKS (gameplay/customItem),
   cle "Water Bucket", avec sa description. On ne le repete donc plus ici, et
   surtout on ne le passe plus au give : un item renomme a la main perd son nom
   des qu'il change de case (drop, reprise, Code Block). */
const CUP_FULL = "Cup of Water";

/* Gold Grit et Magmaward Fuel sont de VRAIS items du jeu (ajoutes
   recemment) : on les donne par leur nom, sans renommage ni attributs. */
const ITEM_GOLD = "Gold Grit";

const ITEM_RELIC = "Magmaward Fuel";


/* TOUS les items de la quete sont verrouilles : ils ne doivent jamais
   pouvoir etre laches (donc donnes a un autre joueur), et chacun est
   consomme a l'usage (Torch au rideau, Cup a l'Old Man, or au Rich Man,
   relique au mur). */
const LOCKED_ITEMS = [ITEM_TORCH, ITEM_CUP, ITEM_CUP_FULL, ITEM_GOLD, ITEM_RELIC];


/* Les cinq boutons caches de la jungle. */
const BUTTONS = [
    [1439, -918, 300],

    [1334, -915, 261],
    [1302, -915, 382],
    [1516, -916, 165],
    [1449, -903, 128],
];

const WATER_POINT = [2534, -897, 449];

const WALL_MIN = [1318, -911, 321];

const WALL_MAX = [1320, -909, 321];

const WALL_BEHIND = [1319, -912, 323];


/* Etapes (une seule cle db par joueur). */
const S = {
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
const DB_STEP = "s";

const DB_STEP_OLD = "sq";

const DB_BUTTONS_OLD = "sqB";


/* L'ile secrete de la quete : sa position est une constante du monde, comme
   les boutons ou le mur. Elle sert a deux choses seulement : la fleche de
   quete posee par le Rich Man, et le warp du panneau admin. */
export const SABER_ISLAND = { name: "Secret Island", pos: [2693, -911, -127], color: "#E5C15A" };


/* Les deux structures ouvrables, decrites comme dans le monde : deux coins
   et la matiere a remettre. `saved` retient ce qu'il y avait avant le
   percement (pour pouvoir le remettre a l'identique si besoin). */
const STRUCTS = {
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


/* CONSTANTES DU SABER EXPERT (arene et table de combat) ───────────────── */

/* Meme arene que le boss Haki (utils/haki.js) : c'est la salle de combat du
   monde, on ne lui en invente pas une seconde. */
const ARENA = { a: [-87, 1014, -80], b: [165, 1014, 206] };

/* L'item est-il interdit au lacher ? (branche dans onPlayerDropItem) */
export function saberLockedItem(itemName) {
    return LOCKED_ITEMS.indexOf(itemName) !== -1;
}

/* ── 2. OUTILS PARTAGES ───────────────────────────────────────────────────

   Ce qu'il faut pour lire le monde et lui parler : distance, vie, blocs,
   inventaire, messages des PNJ, et le dessin des telegraphies avec les ondes
   communes aux deux boss.
 */

function norm3(v) {
    const l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
}


function healthOf(id) {
    let hp = null;
    try { hp = api.getHealth(id); } catch (e) { hp = null; }
    return typeof hp === "number" ? hp : 0;
}


function blockAt(x, y, z) {
    try { return api.getBlock(x, y, z); } catch (e) { return null; }
}


function line(icon, color, text) {
    return [
        ic(icon, color),
        txt(" " + text, C.INFO),
    ];
}


function speech(icon, color, speaker, quote, extra) {
    const parts = [
        ic(icon, color),
        txt(" " + speaker + ": \"", C.INFO),
        txt(quote, "#FFFFFF"),
        txt("\"", C.INFO),
    ];
    if (extra) parts.push(txt("\n" + extra, C.SUCCESS));
    return parts;
}


function hasItem(playerId, itemName) {
    try { return (api.getInventoryItemAmount(playerId, itemName) || 0) > 0; }
    catch (e) { return false; }
}


/* Tous les slots qui contiennent cet item, inventaire ET Moonstone Chest :
   `[{ where, slot, amount }]`. Sert a transformer un item SUR PLACE au lieu
   de le retirer puis de le redonner. */
function slotsOf(playerId, itemName) {
    const out = [];
    try {
        scanAllItems(playerId, function (item, where, slot) {
            if (item && item.name === itemName) out.push({ where: where, slot: slot, amount: item.amount || 1 });
        });
    } catch (e) {}
    return out;
}


function countOf(playerId, itemName) {
    const slots = slotsOf(playerId, itemName);
    let n = 0;
    for (let i = 0; i < slots.length; i++) n += slots[i].amount || 1;
    return n;
}


/* ── 3. CLICS DANS LE MONDE ────────────────────────────────────────────── */

/* Un clic arrive en coordonnees flottantes : la case cliquee est le floor.
   Les deux tolérances ci-dessous evitent de rater un bouton d'une case. */
function hitBlock(x, y, z, target) {
    const bx = Math.floor(x), by = Math.floor(y), bz = Math.floor(z);
    return Math.abs(bx - target[0]) <= 1 && Math.abs(by - target[1]) <= 1 && Math.abs(bz - target[2]) <= 1;
}


function inClickBox(x, y, z, min, max) {
    const bx = Math.floor(x), by = Math.floor(y), bz = Math.floor(z);
    return bx >= min[0] - 1 && bx <= max[0] + 1
        && by >= min[1] - 1 && by <= max[1] + 1
        && bz >= min[2] - 1 && bz <= max[2] + 1;
}


function clearSpot(p) {
    let y = p[1];
    for (let i = 0; i < 48; i++) {
        const b = blockAt(Math.floor(p[0]), Math.floor(y), Math.floor(p[2]));
        if (b === "Air" || b === null) return [p[0], y, p[2]];
        y += 1;
    }
    return [p[0], y, p[2]];
}


function typeOf(id) {
    try { return api.getEntityType(id); } catch (e) { return null; }
}


function despawnIfAlive(id) {
    if (!id) return;
    /* Le garde-fou de degats suit le mob : plus de mob, plus de palier. */
    disarmBossGate(id);
    try { if (aliveNow(id)) api.despawnMob(id); } catch (e) {}
}


/* ── 4. DESSINER UNE ZONE (la telegraphie du boss) ─────────────────────── */

const WARN_A = rgba(232, 180, 160);

const WARN_B = rgba(140, 30, 20, 0);

const HOT_A = rgba(255, 120, 80);

const HOT_B = rgba(90, 0, 0, 0);


/* Un anneau au sol. `count` suit le rayon pour que les points ne s'espacent
   pas quand la zone grandit. */
function groundRing(c, radius, colorA, colorB, spin) {
    const n = Math.max(10, Math.round(radius * 5));
    ring([c[0], c[1] + 0.12, c[2]], radius, n, {
        tex: TEX.crit,
        r: 0.1,
        size: [0.26, 0.46],
        life: [0.18, 0.38],
        colors: [colorA || WARN_A, colorB || WARN_B],
    }, spin || 0);
}


/* Un couloir : les deux bords + des barres transversales. C'est la zone
   exacte que la charge va balayer. */
function groundCorridor(a, b, width, colorA, colorB) {
    const dx = b[0] - a[0], dz = b[2] - a[2];
    const len = Math.sqrt(dx * dx + dz * dz) || 1;
    const px = -dz / len, pz = dx / len;
    const y = a[1] + 0.12;
    const steps = Math.max(4, Math.min(40, Math.round(len / 1.6)));
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = a[0] + dx * t, z = a[2] + dz * t;
        point([x + px * width, y, z + pz * width], { tex: TEX.crit, count: 1, r: 0.1, size: [0.22, 0.4], life: [0.16, 0.32], colors: [colorA || WARN_A, colorB || WARN_B] });
        point([x - px * width, y, z - pz * width], { tex: TEX.crit, count: 1, r: 0.1, size: [0.22, 0.4], life: [0.16, 0.32], colors: [colorA || WARN_A, colorB || WARN_B] });
        if (i % 3 === 0) point([x, y, z], { tex: TEX.glint, count: 1, r: 0.07, size: [0.16, 0.3], life: [0.12, 0.26], colors: [colorA || WARN_A, colorB || WARN_B] });
    }
}


/* Un disque marque au sol : deux anneaux + une croix. */
function groundMark(c, radius, colorA, colorB, spin) {
    groundRing(c, radius, colorA, colorB, spin || 0);
    groundRing(c, radius * 0.55, colorA, colorB, -(spin || 0));
    point([c[0], c[1] + 0.12, c[2]], { tex: TEX.crit, count: 4, r: 0.14, size: [0.3, 0.5], life: [0.2, 0.4], colors: [colorA || WARN_A, colorB || WARN_B] });
}


/* Une colonne verticale, pour l'impact du rayon. */
function pillar(c, height, colorA, colorB) {
    const n = Math.max(6, Math.round(height * 2));
    for (let i = 0; i <= n; i++) {
        const t = i / n;
        const rad = Math.sin(t * Math.PI) * 0.5;
        point([c[0] + Math.cos(i * 2.4) * rad, c[1] + height * t, c[2] + Math.sin(i * 2.4) * rad], {
            tex: TEX.glint, count: 2, r: 0.12, size: [0.3, 0.55], life: [0.16, 0.34],
            colors: [colorA || HOT_A, colorB || HOT_B],
        });
    }
}


/* ── 5. ONDES (communes au Mob Leader et au Saber Expert) ──────────────── */

/* Une onde est une ligne qui avance : on teste le SEGMENT parcouru depuis le
   tick precedent, donc personne ne traverse l'onde entre deux images. */
function spawnWave(list, origin, dir, speed, radius, dmg, item) {
    if (!list || list.length > 12) return;
    list.push({
        p: [origin[0], origin[1], origin[2]],
        d: [dir[0], dir[1], dir[2]],
        speed: speed,
        r: radius,
        dmg: dmg,
        item: item,
        life: 22,
    });
}


const WAVE_STEP_MS = 200;


function advanceWaves(list, caster) {
    if (!list || !list.length || !caster) return;
    for (let i = list.length - 1; i >= 0; i--) {
        const w = list[i];
        const next = [
            w.p[0] + w.d[0] * w.speed * (WAVE_STEP_MS / 1000),
            w.p[1] + w.d[1] * w.speed * (WAVE_STEP_MS / 1000),
            w.p[2] + w.d[2] * w.speed * (WAVE_STEP_MS / 1000),
        ];
        try { hitSeg(w.p, next, w.r, caster, w.item, w.dmg, null); } catch (e) {}
        point(next, { tex: TEX.glint, count: 3, colors: [rgba(255, 240, 200), rgba(255, 160, 60, 0)] });
        w.p = next;
        w.life--;
        if (w.life <= 0) list.splice(i, 1);
    }
}

/* ── 6. ETAT DE LA QUETE ──────────────────────────────────────────────────

   Une seule cle de base, `s` : le numero d'etape. Les cinq plaques de la
   jungle ne sont jamais ecrites, elles repartent de 0/5 a chaque connexion.
   resumeQuest() et parkQuest() sont les deux portes d'entree du join / leave.
 */

/* L'ETAPE EST EN BASE, les PLAQUES NON.
     - cle `s` : le numero d'etape seul (0 a 8). Ecrite a chaque etape, relue
       au join et a la premiere demande. Elle survit a la deconnexion, au
       redemarrage du monde et a tout le reste.
     - les cinq plaques de la jungle ne sont jamais ecrites : elles vivent en
       memoire et repartent de zero a chaque connexion. Un joueur qui quitte a
       3/5 retrouve donc 0/5.
     - fin de quete : la cle est SUPPRIMEE (voir resetQuest), la quete est
       rejouable telle quelle.

   Filet de securite : si `s` est vide (joueur d'avant cette version), l'etape
   est deduite des items portes (stepFromItems) — aucun item de quete ne peut
   etre lache, donc l'inventaire ne ment pas. */
const quests = {}; // playerId -> { step, buttons }


/* L'etape en base, 0 si la cle n'existe pas encore. */
function readStepStat(playerId) {
    let v = 0;
    try { v = getStat(playerId, DB_STEP, 0); } catch (e) { v = 0; }
    v = v | 0;
    return v > S.NONE ? v : S.NONE;
}


function questOf(playerId) {
    if (!playerId) return null;
    return quests[playerId] || null;
}


/* L'etape qu'un inventaire prouve a lui seul. Aucun de ces items ne peut etre
   lache (ils sont dans LOCKED_ITEMS) : les porter signifie forcement etre
   arrive la.
     Torch        -> la porte de la jungle a ete ouverte (don derriere elle)
     Bucket       -> la Cup du rideau (don derriere le rideau)
     Water Bucket -> la Cup a ete remplie au point d'eau
     Gold Grit    -> le Mob Leader est tombe
     Magmaward Fuel -> le Rich Man a paye */
function stepFromItems(playerId) {
    if (hasItem(playerId, ITEM_RELIC)) return S.RELIC;
    if (hasItem(playerId, ITEM_GOLD)) return S.GOLD;
    if (hasItem(playerId, ITEM_CUP_FULL)) return S.WATER;
    if (hasItem(playerId, ITEM_TORCH)) return S.DOOR;
    if (hasItem(playerId, ITEM_CUP)) return S.CURTAIN;
    return S.NONE;
}


function stepOf(playerId) {
    const q = questOf(playerId);
    if (q) return q.step;
    /* Pas encore en memoire (premier appel apres un redemarrage du monde) :
       la base fait foi. On la remet en memoire avec zero plaque. */
    const saved = readStepStat(playerId);
    if (saved > S.NONE) {
        quests[playerId] = { step: saved, buttons: 0 };
        return saved;
    }
    /* Rien en base (joueur d'avant cette version) : les items parlent. On ne
       memorise PAS le resultat, une etape deduite ne doit jamais figer la
       quete — elle sert seulement de point de depart. */
    return stepFromItems(playerId);
}


/* Chaque etape s'ecrit dans la foulee : la base ne peut pas etre en retard sur
   le jeu, meme si le monde s'arrete juste apres. */
function setStep(playerId, step) {
    if (!playerId) return;
    const q = questOf(playerId) || (quests[playerId] = { step: 0, buttons: 0 });
    q.step = step;
    try { setStat(playerId, DB_STEP, step); } catch (e) {}
}


function buttonsOf(playerId) {
    const q = questOf(playerId);
    return q ? q.buttons : 0;
}


/* Les plaques restent EN MEMOIRE : jamais de setStat ici. */
function saveButtons(playerId, mask) {
    if (!playerId) return;
    const q = questOf(playerId) || (quests[playerId] = { step: 0, buttons: 0 });
    q.buttons = mask || 0;
}


/* Remise a zero COMPLETE : la memoire, les plaques, ET la cle en base. C'est
   ce qui rend la quete rejouable apres une victoire. */
function resetQuest(playerId) {
    if (!playerId) return false;
    delete quests[playerId];
    try { deleteStat(playerId, DB_STEP); } catch (e) {}
    return true;
}

/* JOIN : l'etape vient de la base, les plaques repartent de zero. Un joueur
   qui a quitte a 3/5 retrouve donc 0/5 et doit les recliquer. Renvoie
   l'etape relue (0 si la cle est absente). */
function resumeQuest(playerId) {
    if (!playerId) return S.NONE;
    const saved = readStepStat(playerId);
    if (saved > S.NONE) quests[playerId] = { step: saved, buttons: 0 };
    else if (quests[playerId]) quests[playerId].buttons = 0;
    return saved;
}

/* LEAVE : on jette les plaques cliquees et l'entree d'un joueur qui n'a rien
   commence, pour ne pas garder une ligne vide par joueur passe. L'etape, elle,
   est deja en base : elle attend son retour. */
function parkQuest(playerId) {
    if (!playerId) return false;
    const q = questOf(playerId);
    if (!q) return false;
    q.buttons = 0;
    if (q.step <= S.NONE) delete quests[playerId];
    return true;
}

/* ── 7. LES FLECHES DE LA QUETE ───────────────────────────────────────────

   Deux sortes de fleches, et elles ne durent pas : celle de Secret Island
   tant que la chasse est en cours, et celle d'une structure qu'on vient
   d'ouvrir (elle s'efface des qu'on est dessus).
 */

const ARROW_ID = "saber-isle";


function armSecretArrow(playerId) {
    if (!SABER_ISLAND.pos) return false;
    try {
        api.setDirectionArrow(playerId, ARROW_ID, SABER_ISLAND.pos, SABER_ISLAND.name, false, {
            color: SABER_ISLAND.color,
            fontSize: "17px",
            fontWeight: "bold",
        });
        return true;
    } catch (e) { return false; }
}


function clearSecretArrow(playerId) {
    try { api.clearDirectionArrow(playerId, ARROW_ID); } catch (e) {}
}


/* Fleche temporaire vers l'ouverture, pour la meme raison : elle indique ou
   aller, et disparait des qu'on est arrive (ou au bout du delai de grace). */
function armStructArrow(playerId, key) {
    const s = STRUCTS[key];
    if (!s || !playerId) return false;
    try {
        api.setDirectionArrow(playerId, s.arrowId, s.center, s.arrowLabel, true, {
            color: "#4ADE80", fontSize: "16px", fontWeight: "bold",
        });
        return true;
    } catch (e) { return false; }
}


function clearStructArrow(playerId, key) {
    const s = STRUCTS[key];
    if (!s || !playerId) return false;
    try { api.clearDirectionArrow(playerId, s.arrowId); return true; } catch (e) { return false; }
}

/* ── 8. STRUCTURES OUVERTES / REFERMEES ───────────────────────────────────

   La porte de la jungle et le rideau du desert s'ouvrent pour de vrai
   (api.setBlock) et se referment quand plus personne n'est a 15 blocs : un
   monde nettoye ne peut donc pas enfermer quelqu'un derriere un mur.
 */

/* ORDRE DES ARGUMENTS : api.setBlock(x, y, z, nom) et
   api.setBlockRect(pos1, pos2, nom). L'ancien code appelait
   api.setBlock(0, x, y, z) : il posait un bloc a l'origine du monde et la
   porte ne s'ouvrait donc JAMAIS physiquement. On passe maintenant par le
   rectangle, exactement comme dans le monde. */
/* Les six bornes d'un rectangle de blocs, dans l'ordre min/max : deux boucles
   de ce fichier (percage et lecture) les recalculaient a la main. */
function boxCorners(a, b) {
    return [
        Math.min(a[0], b[0]), Math.max(a[0], b[0]),
        Math.min(a[1], b[1]), Math.max(a[1], b[1]),
        Math.min(a[2], b[2]), Math.max(a[2], b[2]),
    ];
}


function rectBlocks(a, b, name) {
    try {
        api.setBlockRect([a[0], a[1], a[2]], [b[0], b[1], b[2]], name);
        return true;
    } catch (e) {}
    /* repli bloc par bloc si setBlockRect n'existe pas dans ce moteur */
    let ok = false;
    const [x1, x2, y1, y2, z1, z2] = boxCorners(a, b);
    for (let x = x1; x <= x2; x++) {
        for (let y = y1; y <= y2; y++) {
            for (let z = z1; z <= z2; z++) {
                try { api.setBlock(x, y, z, name); ok = true; } catch (err) {}
            }
        }
    }
    return ok;
}


/* Ce qu'il y a dans le rectangle avant de le percer. */
function readRect(a, b) {
    const out = [];
    const [x1, x2, y1, y2, z1, z2] = boxCorners(a, b);
    for (let x = x1; x <= x2; x++) {
        for (let y = y1; y <= y2; y++) {
            for (let z = z1; z <= z2; z++) {
                out.push([x, y, z, blockAt(x, y, z)]);
            }
        }
    }
    return out;
}


function openStruct(key) {
    const s = STRUCTS[key];
    if (!s || s.saved) return false;
    startHousekeeping();
    /* On note l'existant, puis on perce le rectangle d'un coup. */
    s.saved = readRect(s.a, s.b);
    if (!rectBlocks(s.a, s.b, "Air")) { s.saved = null; return false; }
    s.openedAt = nowMs();
    return true;
}


function closeStruct(key) {
    const s = STRUCTS[key];
    if (!s || !s.saved) return false;
    /* On remet la matiere declaree (Stone / Purple Ceramic). Si le rectangle
       est refuse, on remet bloc par bloc ce qu'on avait note. */
    let ok = rectBlocks(s.a, s.b, s.material);
    if (!ok) {
        for (let i = 0; i < s.saved.length; i++) {
            const e = s.saved[i];
            if (!e[3] || e[3] === "Air") continue;
            try { api.setBlock(e[0], e[1], e[2], e[3]); ok = true; } catch (err) {}
        }
    }
    s.saved = null;
    return ok;
}


const KEEP_RADIUS = 15;

/* ATTENTION : les minuteries de utils/timer comptent en TICKS (1 tick = 50 ms),
   pas en millisecondes. 220 ticks = 11 s. */
const HOUSEKEEP_TICKS = 220;

let houseTimer = null;


/* DELAI DE GRACE : une fois ouverte, une ouverture reste ouverte au moins ce
   temps-la, meme si le joueur qui l'a declenchee s'eloigne. Sans ca, la porte
   se refermait pendant qu'il cherchait ce qui venait de s'ouvrir (les 5
   boutons sont disperses dans la jungle, on ne voit pas la porte depuis le
   dernier). 60 s : largement le temps de traverser une zone. */
const GRACE_MS = 60000;


/* Verification periodique : on remet les blocs quand il n'y a plus personne
   autour ET que le delai de grace est passe, et on les retire de nouveau pour
   un joueur qui a deja valide l'etape et qui revient. Le monde reste donc
   dans son etat d'origine, sans jamais enfermer quelqu'un ni lui fermer la
   porte au nez. */
function tickStructures() {
    const players = getAlivePlayerIds();
    const now = nowMs();
    for (const key in STRUCTS) {
        const s = STRUCTS[key];
        let near = false, allowed = false;
        for (let i = 0; i < players.length; i++) {
            const p = safePosition(players[i]);
            if (!p) continue;
            const d = dist3(p, s.center);
            /* La fleche a rempli son role des qu'on est devant l'ouverture. */
            if (d <= 6) clearStructArrow(players[i], key);
            if (d > KEEP_RADIUS) continue;
            near = true;
            if (stepOf(players[i]) >= s.step) { allowed = true; }
        }
        if (s.saved && !near && now - s.openedAt >= GRACE_MS) closeStruct(key);
        else if (!s.saved && near && allowed) openStruct(key);
    }
}


function startHousekeeping() {
    if (houseTimer) return;
    houseTimer = every(tickStructures, HOUSEKEEP_TICKS);
}

/* Fermeture du monde : la minuterie s'arrete, les structures restent en
   memoire et seront repeintes a la premiere connexion. */
function stopHousekeeping() {
    if (houseTimer) { houseTimer.stop(); houseTimer = null; }
}


/* Renvoie true quand le clic est consomme (pas de coup de poing derriere). */
export function saberClick(playerId, rightClick, x, y, z, blockName, targetId) {
    if (!playerId) return false;
    if (typeof x !== "number" || typeof y !== "number" || typeof z !== "number") return false;

    /* 1. Les cinq boutons caches de la jungle. */
    for (let i = 0; i < BUTTONS.length; i++) {
        if (hitBlock(x, y, z, BUTTONS[i])) return pressButton(playerId, i);
    }

    /* 2. Le rideau du desert (il faut la Torch). */
    if (inClickBox(x, y, z, [612, -904, 1760], [612, -902, 1762])) return burnCurtain(playerId);

    /* 3. L'eau du point de remplissage. Deux rayons : l'eau elle-meme, et un
       plus large qui ne sert qu'a repondre "trop loin" — sans lui, un joueur
       qui clic a cote ne voyait rien du tout et croyait que son clic etait
       perdu. */
    const toWater = dist3([x, y, z], WATER_POINT);
    /* L'eau elle-meme est acceptee plus loin que le reste : viser la surface
       ne donne pas la case exacte du point de remplissage, et un joueur sur la
       rive clique forcement un peu a cote. */
    const waterBlock = blockName === "Water" || blockName === "Flowing Water";
    if (toWater <= 5 || (waterBlock && toWater <= 12)) return fillCup(playerId);
    if (toWater <= 10) {
        say(playerId, line("fa-solid fa-circle-info", C.INFO, "You are too far from the water."));
        return true;
    }

    /* 4. Le mur scelle de la salle de Shanks. */
    if (inClickBox(x, y, z, WALL_MIN, WALL_MAX)) return passWall(playerId);

    return false;
}


function pressButton(playerId, index) {
    const step = stepOf(playerId);
    if (step >= S.DOOR) {
        say(playerId, line("fa-solid fa-door-open", C.SUCCESS, "The hidden door is already open."));
        return true;
    }
    const mask = buttonsOf(playerId);
    if (mask & (1 << index)) {
        say(playerId, line("fa-solid fa-circle-info", C.INFO, "You already pressed this button."));
        return true;
    }
    const next = mask | (1 << index);
    saveButtons(playerId, next);

    let pressed = 0;
    for (let i = 0; i < BUTTONS.length; i++) if (next & (1 << i)) pressed++;

    if (pressed >= BUTTONS.length) {
        saveButtons(playerId, 0);
        setStep(playerId, S.DOOR);
        openStruct("door");
        armStructArrow(playerId, "door");
        soundAt(playerId, "glass1", 1, 0.8, 40);
        say(playerId, [
            ic("fa-solid fa-door-open", C.SUCCESS),
            txt(" All five hidden buttons are pressed: ", C.SUCCESS),
            txt("a door grinds open deeper in the jungle.", C.INFO),
            txt("\nA marker points at it. It stays open for a minute.", "#94A3B8"),
        ]);
    } else {
        soundAt(playerId, "coin", 0.6, 1.4, 20);
        say(playerId, [
            ic("fa-solid fa-circle-check", C.XP),
            txt(" Hidden button pressed ", C.INFO),
            bold("(" + pressed + "/" + BUTTONS.length + ")", C.SUCCESS),
            txt(".", C.INFO),
        ]);
    }
    return true;
}


function burnCurtain(playerId) {
    const step = stepOf(playerId);
    if (step >= S.CURTAIN) {
        /* Rideau deja brule : on le rouvre pour lui, sans message ni coup. */
        if (!STRUCTS.curtain.saved) openStruct("curtain");
        return false;
    }
    if (step < S.DOOR) return false;

    const held = heldItemName(playerId);
    if (held !== ITEM_TORCH && !hasItem(playerId, ITEM_TORCH)) {
        say(playerId, line("fa-solid fa-fire", C.DANGER, "The curtain will not burn. You need a Torch."));
        return true;
    }

    /* La Torch part dans le feu : c'est la seule facon d'ouvrir le passage. */
    try { api.removeItemName(playerId, ITEM_TORCH, 1); } catch (e) {}
    setStep(playerId, S.CURTAIN);
    openStruct("curtain");
    soundAt(playerId, "bearRoar1", 1, 1.2, 40);
    const p = safePosition(playerId);
    if (p) boom(p, 2.2, { tex: TEX.effect, colors: [rgba(255, 170, 60), rgba(120, 40, 0, 0)] });
    say(playerId, [
        ic("fa-solid fa-fire", C.MONEY),
        txt(" The Torch sets the curtain ablaze ", C.INFO),
        txt("and burns out in your hand: a passage opens behind the smoke.", C.SUCCESS),
    ]);
    return true;
}


/* Rend une Cup pleine la ou il y a de la place (reprise apres une perte :
   mort, filtre d'inventaire). Ce n'est PAS le chemin normal du remplissage. */
function giveFullCup(playerId) {
    try {
        api.giveItem(playerId, ITEM_CUP_FULL, 1);
        return true;
    } catch (e) { return false; }
}


function fillCup(playerId) {
    const step = stepOf(playerId);
    /* Vide et pleine sont DEUX ITEMS D'ORIGINE differents, pas deux noms du
       meme item : `Bucket` et `Water Bucket`. C'est la seule chose qu'on
       regarde, donc un seau renomme (Code Block, ancienne version) se remplit
       comme un autre. Consequence : on ne compte jamais un seau VIDE comme une
       Cup pleine, sinon un joueur qui a les deux ne peut plus rien remplir
       ("Your Cup is already full" alors qu'il tient un seau vide). */
    const empty = countOf(playerId, ITEM_CUP);
    const full = countOf(playerId, ITEM_CUP_FULL);

    if (empty === 0) {
        if (full > 0) {
            /* Deja remplie : l'etape suit l'item, pour ne jamais laisser un
               joueur avec une Cup pleine et un Old Man qui a encore soif. */
            if (step >= S.CURTAIN && step < S.WATER) setStep(playerId, S.WATER);
            say(playerId, line("fa-solid fa-circle-info", C.INFO, "Your Cup is already full of water."));
            return true;
        }
        if (step >= S.WATER) {
            /* Cup perdue en route (mort, filtre d'inventaire) : on la rend
               plutot que d'annoncer une etape que le joueur ne peut plus
               jouer. */
            if (giveFullCup(playerId)) {
                say(playerId, line("Water", C.SUCCESS, "Your Cup is filled again: someone must be thirsty."));
                return true;
            }
            say(playerId, line("fa-solid fa-xmark", C.DANGER, "Your Cup is gone, and you have no room to take it back."));
            return true;
        }
        /* Ni seau vide, ni seau plein : le clic est arrive jusqu'ici, c'est
           donc bien un probleme d'item et pas de detection. On le dit, au lieu
           de laisser le joueur croire que son clic s'est perdu. */
        say(playerId, line("fa-solid fa-circle-info", C.INFO,
            "You have nothing to collect this water with."));
        return true;
    }

    /* Quete pas encore lancee : l'eau reste de l'eau. On ne remplit rien et on
       ne fait pas avancer l'etape, mais on repond quand le joueur tient un
       seau — un clic muet ressemble a un bug. */
    if (step < S.CURTAIN) {
        say(playerId, line("fa-solid fa-circle-info", C.INFO,
            "The water is clear, but you have no reason to fill that yet."));
        return true;
    }

    /* REMPLISSAGE SUR PLACE : le slot qui tient le seau vide est reecrit en
       seau d'eau, au meme endroit. On ecrit l'ITEM D'ORIGINE `Water Bucket`
       (c'est lui qui decide de tout) et on lui pose par-dessus son nom affiche
       et sa description — du decor, jamais relu par une decision.
       Aucun removeItem suivi d'un giveItem : l'item ne quitte jamais sa case,
       donc rien ne peut se dupliquer, et un inventaire plein ne peut pas
       avaler la Cup.
       Un slot peut contenir plusieurs seaux : on n'en remplit qu'un et on
       rend la pile restante (jamais dupliquee : le slot est d'abord reecrit). */
    const holder = slotsOf(playerId, ITEM_CUP)[0];
    const rest = Math.max(0, (holder.amount | 0) - 1);
    /* Aucun attribut de nom : l'item reste "Water Bucket", et c'est
       ITEM_LOOKS qui l'affiche "Cup of Water" pour tout le monde. */
    const ok = writeItem(playerId, holder.where, holder.slot, ITEM_CUP_FULL, 1);
    if (!ok) {
        say(playerId, line("fa-solid fa-xmark", C.DANGER, "Your Cup will not stay in your hands. Try again."));
        return true;
    }
    if (rest > 0) {
        try { api.giveItem(playerId, ITEM_CUP, rest); } catch (e) {}
    }

    if (step < S.WATER) setStep(playerId, S.WATER);
    soundAt(playerId, "coin", 0.5, 1.5, 20);
    say(playerId, [
        ic("Water", C.MARINE),
        txt(" You fill the Cup with water: ", C.INFO),
        bold(CUP_FULL, C.MARINE),
        txt(".", C.INFO),
    ]);
    return true;
}


/* Le mur : la relique y est CONSOMMEE (elle brule dans la roche). Le passage
   reste ensuite ouvert pour ce joueur : sans ca, un joueur qui revient se
   retrouverait devant un mur qu'il ne peut plus ouvrir, puisqu'il n'a plus la
   relique (elle est unique et non lachable). */
function passWall(playerId) {
    const step = stepOf(playerId);
    if (step < S.RELIC) return false;

    const burned = step >= S.WALL;
    if (!burned) {
        if (!hasItem(playerId, ITEM_RELIC)) {
            say(playerId, line("fa-solid fa-lock", C.DANGER, "This wall is sealed. Only the ancient relic can open it."));
            return true;
        }
        try { api.removeItemName(playerId, ITEM_RELIC, 1); } catch (e) {}
    }

    try { api.setPosition(playerId, WALL_BEHIND[0], WALL_BEHIND[1], WALL_BEHIND[2]); }
    catch (e) { return true; }
    if (!burned) setStep(playerId, S.WALL);
    soundAt(playerId, "glass1", 1, 1.3, 25);
    const p = safePosition(playerId);
    if (p) point(p, { tex: TEX.soul, count: 12, colors: [rgba(255, 90, 40), rgba(40, 10, 0, 0)] });
    say(playerId, burned
        ? [
            ic("fa-solid fa-fire", C.MONEY),
            txt(" The hole in the wall is still warm. ", C.INFO),
            txt("You slip through it.", C.SUCCESS),
        ]
        : [
            ic("fa-solid fa-fire", C.MONEY),
            txt(" The " + ITEM_RELIC + " burns through the wall ", C.INFO),
            txt("and is consumed by the rock.", C.SUCCESS),
        ]);
    return true;
}


/* ── 9. LES TROIS PNJ ──────────────────────────────────────────────────── */

export function saberOldMan(playerId) {
    if (!playerId) return false;
    const step = stepOf(playerId);

    if (step >= S.OLD_MAN) {
        say(playerId, speech("fa-solid fa-user-group", C.MARINE, "Old Man",
            "Please meet up with my son, I'm sure he will reward you."));
        return true;
    }
    if (step < S.WATER) {
        say(playerId, speech("Water", C.MARINE, "Old Man", "I'm so thirsty..."));
        return true;
    }

    /* Il ne boit qu'une Cup REELLEMENT pleine : le seul juge est l'item
       d'origine `Water Bucket`, jamais l'etape ni un nom affiche. Un seau
       VIDE ne desaltere personne, et ca ne bloque pas : le point d'eau
       remplit n'importe quel seau vide (voir fillCup). */
    if (!hasItem(playerId, ITEM_CUP_FULL)) {
        say(playerId, speech("Water", C.MARINE, "Old Man", "I'm so thirsty..."));
        return true;
    }

    /* Il boit : la Cup pleine disparait, l'etape est ecrite avant l'annonce. */
    try { api.removeItemName(playerId, ITEM_CUP_FULL, 1); } catch (e) {}
    setStep(playerId, S.OLD_MAN);
    soundAt(playerId, "coin", 0.8, 1.2, 20);
    say(playerId, speech("Water", C.SUCCESS, "Old Man",
        "Thank you so much! Please meet up with my son, I'm sure he will reward you."));
    return true;
}


export function saberRichMan(playerId) {
    if (!playerId) return false;
    const step = stepOf(playerId);

    if (step < S.OLD_MAN) {
        say(playerId, speech("fa-solid fa-user-group", C.MONEY, "Rich Man",
            "Come back when my father is not thirsty anymore."));
        return true;
    }

    if (step === S.OLD_MAN) {
        setStep(playerId, S.HUNT);
        armSecretArrow(playerId);
        soundAt(playerId, "exp_levelup", 0.8, 1.1, 20);
        say(playerId, speech("fa-solid fa-coins", C.MONEY, "Rich Man",
            "Thanks for helping my father, but a mob leader has stolen all my money! "
            + "Please find and take him down as soon possible so I can reward player...",
            "A marker now points at Secret Island."));
        return true;
    }

    if (step < S.RELIC) {
        if (hasItem(playerId, ITEM_GOLD)) {
            payRichard(playerId);
            return true;
        }
        /* L'or a ete perdu (mort, coffre vide...) : on remet la chasse en
           cours pour que le Mob Leader puisse le lacher de nouveau. */
        if (step >= S.GOLD) setStep(playerId, S.HUNT);
        armSecretArrow(playerId);
        say(playerId, speech("fa-solid fa-coins", C.MONEY, "Rich Man",
            "A mob leader still holds my money. Find him first."));
        return true;
    }

    /* Relique perdue (mort) alors que le mur n'est pas encore ouvert : on la
       rend gratuitement, comme le vendeur de haki rend son pod. Il n'y a
       jamais deux reliques : la garde est l'absence de l'item ET l'etape. */
    if (step === S.RELIC && !hasItem(playerId, ITEM_RELIC)) {
        try { api.giveItem(playerId, ITEM_RELIC, 1); } catch (e) {}
        say(playerId, speech("fa-solid fa-circle-info", C.INFO, "Rich Man",
            "You lost the relic? Here it is again. Burn that wall."));
        return true;
    }

    say(playerId, speech("fa-solid fa-circle-info", C.INFO, "Rich Man",
        "The relic is yours. Use it on the sealed wall."));
    return true;
}


/* Il reprend son or et donne la relique. Un seul paiement possible : l'etape
   passe a RELIC avant tout le reste, et sans or il n'y a rien a donner. */
function payRichard(playerId) {
    if (!hasItem(playerId, ITEM_GOLD)) return false;
    try { api.removeItemName(playerId, ITEM_GOLD, 1); } catch (e) {}
    setStep(playerId, S.RELIC);
    clearSecretArrow(playerId);
    try { api.giveItem(playerId, ITEM_RELIC, 1); } catch (e) {}
    soundAt(playerId, "exp_levelup", 1, 0.9, 20);
    say(playerId, speech("fa-solid fa-trophy", C.SUCCESS, "Rich Man",
        "Thank you for getting my money back, you can keep this ancient relic as your reward.",
        "You received " + ITEM_RELIC + "."));
    return true;
}


export function saberShanks(playerId) {
    if (!playerId) return false;
    const step = stepOf(playerId);

    if (step < S.RELIC) {
        say(playerId, speech("fa-solid fa-circle-info", C.INFO, "Shanks",
            "Come back with something worth my time."));
        return true;
    }
    /* La relique est CONSOMMEE au mur : une fois le passage brule (etape WALL),
       Shanks n'a plus a la reclamer. Avant, il la demande encore. */
    if (step < S.WALL && !hasItem(playerId, ITEM_RELIC)) {
        say(playerId, line("fa-solid fa-lock", C.DANGER, "Shanks: \"The relic is the key. Bring it back.\""));
        return true;
    }

    say(playerId, speech("fa-solid fa-swords", "#E8B4A0", "Shanks",
        "So you found the relic. Show me what a real sword can do."));
    startSaberFight(playerId);
    return true;
}

/* ── 10. LE MOB LEADER (niveau 200, mob Glass Bro) ────────────────────────

   Lance par un Code Block : spawnMobLeader(x, y, z[, playerId]). Il choisit
   sa cible tout seul (le joueur le plus proche dans 40 blocs) et il attaque
   vraiment : ruee, volee, frappe au sol et Gold Ring. Il lache le Gold Grit
   de la quete, une seule fois, a l'etape chasse.
 */

const LEADER = {
    LEVEL: 200,
    MOB: "Glass Bro",
    NAME: "MOB LEADER",
    TITLE: "Level 200",
    SCALE: 1.6,
    SPEED: 5,
    CD: { rush: 7000, volley: 5000, shake: 6000, ring: 9000 },
    /* Portee a laquelle il prend quelqu'un en chasse tout seul (son
       hostilityRadius est du meme ordre). */
    AGGRO: 40,
    /* Ses capacites sont a l'echelle de son niveau (multiples d'un coup de
       corps a corps), pas des petits chiffres fixes : une capacite qui fait
       90 quand le poing en fait 787 ne se sent pas. */
    HIT: { rush: 0.55, volley: 0.45, shake: 0.7 },
    /* LE CERCLE D'OR : un anneau de particules se dessine autour du mob (il
       reste visible pendant toute la preparation), puis il eclate. Prendre
       l'eclat quand on est dedans coute UN coup de corps a corps du mob en
       plus des degats normaux : rester colle a un mob de niveau 200 devient
       vraiment puni. Rayon et delais se retouchent ici. */
    RING: { RADIUS: 6.5, WARN: 1400, SCALE: 1 },
};


/* Memes formules que gameplay/spawning.js (mobBaseHp / mobBaseDmg), pour que
   le Mob Leader soit REELLEMENT un mob de niveau 200 et pas un colosse
   arbitraire. Les deux valeurs se retouchent ici si besoin. */
function leaderHp() { return Math.round(20 + Math.pow(LEADER.LEVEL, 1.6) * 8); }

function leaderDmg() { return Math.round(3 + Math.pow(LEADER.LEVEL, 1.3) * 0.8); }

function leaderHit(key) { return Math.round(leaderDmg() * (LEADER.HIT[key] || 0.5)); }


let leader = null; // { id, handle, cds, rushUntil, rushHit, waves }


let leaderTimer = null;


function stopLeader() {
    if (leaderTimer) { leaderTimer.stop(); leaderTimer = null; }
    leader = null;
}


function thinkLeader() {
    if (!leader) { stopLeader(); return; }
    if (!aliveNow(leader.id)) { stopLeader(); return; }
    const p = safePosition(leader.id);
    if (!p) { despawnIfAlive(leader.id); stopLeader(); return; }

    advanceWaves(leader.waves, leader.id);
    advanceLeaderRing(leader.id, p);
    tickLeaderShake(p);

    if (nowMs() < leader.rushUntil) {
        const ids = getAlivePlayerIds();
        for (let i = 0; i < ids.length; i++) {
            const t = ids[i];
            if (leader.rushHit[t]) continue;
            const tp = safePosition(t);
            if (!tp || dist3(tp, p) > 3.2) continue;
            leader.rushHit[t] = 1;
            damage(t, leaderHit("rush"), leader.id, "Mob Leader");
            const dir = norm3([tp[0] - p[0], 0.4, tp[2] - p[2]]);
            impulse(t, dir[0] * 9, 4, dir[2] * 9);
        }
    }

    /* CIBLE : on garde la cible courante si elle est vivante et encore a
       portee, sinon on prend le joueur le plus proche. C'est ce qui fait la
       difference entre "un mob qui marche" et "un boss qui attaque". */
    let target = leader.aiTarget && aliveNow(leader.aiTarget) ? leader.aiTarget : null;
    if (target) {
        const cp = safePosition(target);
        if (!cp || dist3(cp, p) > LEADER.AGGRO) target = null;
    }
    if (!target) target = nearestPlayerTo(p, LEADER.AGGRO);
    if (!target) return;
    leader.aiTarget = target;
    const tp = safePosition(target);
    if (!tp) return;
    const d = dist3(p, tp);
    const now = nowMs();

    if (now >= leader.cds.ring && d < 9) { leaderRing(p); return; }
    if (now >= leader.cds.shake && d < 7) { leaderShake(p); return; }
    if (now >= leader.cds.volley && d > 5 && d < 26) { leaderVolley(p, tp); return; }
    if (now >= leader.cds.rush && d > 4 && d < 20) { leaderRush(p, tp); return; }
    try { api.setMobAiState(leader.id, "chasing", { targetId: target }); } catch (e) {}
}


function leaderRush(p, tp) {
    leader.cds.rush = nowMs() + LEADER.CD.rush;
    leader.rushUntil = nowMs() + 700;
    leader.rushHit = {};
    const dir = norm3([tp[0] - p[0], 0, tp[2] - p[2]]);
    setVel(leader.id, dir[0] * 16, 3, dir[2] * 16);
    soundAt(p, "bearRoar1", 1, 1.3, 35);
}


/* La frappe au sol : meme principe que le boss, un anneau se resserre sur le
   sol pendant 0,6 s, puis tout ce qui est dedans est projete et ralenti. */
function leaderShake(p) {
    leader.cds.shake = nowMs() + LEADER.CD.shake;
    leader.shake = { until: nowMs() + 600, at: [p[0], p[1], p[2]], radius: 6 };
    soundAt(p, "ominousBellHit", 1, 0.7, 35);
}


function tickLeaderShake(p) {
    const sh = leader ? leader.shake : null;
    if (!sh) return;
    const now = nowMs();
    const left = Math.max(0, sh.until - now) / 600;
    ring([sh.at[0], sh.at[1] + 0.12, sh.at[2]], sh.radius * (0.4 + 0.6 * left), 16, {
        tex: TEX.crit, r: 0.11, size: [0.24, 0.42], life: [0.16, 0.34],
        colors: [rgba(255, 210, 80), rgba(120, 60, 0, 0)],
    }, now / 130);
    if (now < sh.until) return;
    leader.shake = null;
    hitArea([sh.at[0], sh.at[1] + 0.4, sh.at[2]], sh.radius, leader.id, "Gold Slam", leaderHit("shake"), {
        knock: 10, lift: 5, slow: [1200, 2],
    });
    boom([sh.at[0], sh.at[1], sh.at[2]], 3.5, { tex: TEX.crit, count: 60, colors: [rgba(255, 200, 60), rgba(90, 60, 0, 0)] });
    soundAt(sh.at, "glass1", 1, 0.7, 40);
}


/* Le cercle : preparation visible, puis eclat. Les degats sont exactement
   ceux d'un coup de corps a corps du mob (leaderDmg()), donc "un coup de
   plus", pas une deuxieme attaque inventee. */
function leaderRing(p) {
    leader.cds.ring = nowMs() + LEADER.CD.ring;
    leader.ring = { until: nowMs() + LEADER.RING.WARN, hit: {} };
    soundAt(p, "ominousBellHit", 1, 1.15, 35);
}


function advanceLeaderRing(id, p) {
    const r = leader ? leader.ring : null;
    if (!r) return;
    const R = LEADER.RING.RADIUS;
    const now = nowMs();

    /* L'anneau se dessine a chaque passage (200 ms) : il tourne, il monte
       legerement, il est impossible a ne pas voir. */
    ring([p[0], p[1] + 0.15, p[2]], R, 20, {
        tex: TEX.crit,
        r: 0.12,
        size: [0.26, 0.44],
        life: [0.22, 0.45],
        colors: [rgba(255, 210, 80), rgba(150, 90, 0, 0)],
    }, now / 240);

    if (now < r.until) return;

    const ids = getAlivePlayerIds();
    let touched = 0;
    for (let i = 0; i < ids.length; i++) {
        const t = ids[i];
        if (r.hit[t]) continue;
        const tp = safePosition(t);
        if (!tp || dist3(tp, p) > R) continue;
        r.hit[t] = 1;
        touched++;
        if (damage(t, Math.round(leaderDmg() * LEADER.RING.SCALE), id, "Gold Ring")) {
            const dir = norm3([tp[0] - p[0], 0.6, tp[2] - p[2]]);
            impulse(t, dir[0] * 8, 5, dir[2] * 8);
        }
    }
    boom([p[0], p[1] + 0.2, p[2]], R * 0.8, {
        tex: TEX.crit,
        count: touched ? 70 : 40,
        colors: [rgba(255, 210, 80), rgba(120, 60, 0, 0)],
    });
    soundAt(p, "glass1", 1, 0.65, 40);
    leader.ring = null;
}


/* Le joueur le plus proche dans un rayon. Indispensable : un Mob Leader lance
   par un Code Block sans joueur (le cas de Secret Island) n'avait AUCUNE
   cible, donc il ne declenchait jamais la moindre attaque et se battait comme
   un mob ordinaire. */
function nearestPlayerTo(p, radius) {
    const ids = getAlivePlayerIds();
    let best = null, bestD = radius * radius;
    for (let i = 0; i < ids.length; i++) {
        const tp = safePosition(ids[i]);
        if (!tp) continue;
        const dx = tp[0] - p[0], dy = tp[1] - p[1], dz = tp[2] - p[2];
        const d2 = dx * dx + dy * dy * 4 + dz * dz;
        if (d2 < bestD) { bestD = d2; best = ids[i]; }
    }
    return best;
}


function leaderVolley(p, tp) {
    leader.cds.volley = nowMs() + LEADER.CD.volley;
    const dir = norm3([tp[0] - p[0], 0.15, tp[2] - p[2]]);
    spawnWave(leader.waves, [p[0], p[1] + 1.1, p[2]], dir, 26, 1.2, leaderHit("volley"), "Gold Shot");
    soundAt(p, "cannonFire3", 0.8, 1.4, 35);
}


/* Lance par un Code Block :
       spawnMobLeader(x, y, z)              -> a l'endroit voulu
       spawnMobLeader(x, y, z, playerId)    -> et il vise ce joueur
   Retourne l'id du mob, ou null. */
export function spawnMobLeader(x, y, z, playerId) {
    const px = Number(x), py = Number(y), pz = Number(z);
    if (!isFinite(px) || !isFinite(py) || !isFinite(pz)) return null;
    if (leader && aliveNow(leader.id)) {
        if (playerId) say(playerId, line("fa-solid fa-circle-info", C.INFO, "The Mob Leader is already on the loose."));
        return null;
    }

    const spot = clearSpot([px, py, pz]);
    let id = null;
    try {
        id = api.attemptSpawnMob(LEADER.MOB, spot[0], spot[1], spot[2], {
            name: LEADER.NAME,
            playSoundOnSpawn: true,
        });
    } catch (e) { id = null; }
    if (!id) {
        if (playerId) say(playerId, line("fa-solid fa-xmark", C.DANGER, "The Mob Leader could not be summoned."));
        return null;
    }
    /* Boss de rang 3 pour le butin : le mob est despawn avant le credit de son
       kill, donc son nom ne sera plus lisible a ce moment-la. */
    markBossMob(id, LEADER.NAME);
    const hp = leaderHp();
    /* Pas de one shot : paliers a 1/2, 1/3, 1/4 et 1/5 de sa vie. */
    armBossGate(id, hp);
    setupBossMob(id, {
        hp: hp,
        dmg: leaderDmg(),
        radius: 40,
        speed: LEADER.SPEED,
        scale: LEADER.SCALE,
        name: LEADER.NAME,
        title: LEADER.TITLE,
        colour: "#FFD166",
        background: "#22130a",
    });
    /* Il se choisit une cible tout seul des le spawn : sans joueur en
       parametre (Code Block de Secret Island), il restait sans cible et
       n'attaquait donc jamais avec ses capacites. */
    const firstTarget = playerId || nearestPlayerTo(spot, LEADER.AGGRO);
    if (firstTarget) {
        try { api.setMobAiState(id, "chasing", { targetId: firstTarget }); } catch (e) {}
    }
    soundAt(spot, "ominousBellHit", 1, 0.8, 40);

    leader = {
        id: id,
        cds: { rush: 0, volley: 0, shake: 0, ring: 0 },
        rushUntil: 0,
        rushHit: {},
        waves: [],
        ring: null,
        shake: null,
        aiTarget: firstTarget || null,
    };
    if (!leaderTimer) leaderTimer = every(thinkLeader, 4);
    return id;
}

/* Id du Mob Leader en course, ou null : c'est tout ce dont l'exterieur a
   besoin (despawn, nettoyage de fin de monde). */
function leaderMobId() {
    return leader ? leader.id : null;
}

/* BRANCHE DE MORT : appelee par onPlayerKilledMob (via saberKilledMob).
   Renvoie true si le mob etait bien le Mob Leader. */
function killLeader(playerId, mobId) {
    if (!mobId || !leader || mobId !== leader.id) return false;

    const p = safePosition(mobId);
    stopLeader();
    despawnIfAlive(mobId);

    /* L'OR NE TOMBE QU'UNE FOIS, a l'etape chasse. Un second Mob Leader lance
       par le Code Block et tue a l'etape "or" ne lache donc plus rien : le
       Gold Grit ne peut pas etre lache, un doublon resterait bloque dans
       l'inventaire pour toujours. S'il a perdu l'or, le Rich Man remet l'etape
       a la chasse (voir world.js) et le prochain kill le rend. */
    const st = playerId ? stepOf(playerId) : S.NONE;
    const wantGold = st === S.HUNT;
    if (p && wantGold) {
        try { api.createItemDrop(p[0], p[1] + 0.5, p[2], ITEM_GOLD, 1, false); } catch (e) {}
        soundAt(p, "coin", 1, 0.9, 40);
    }
    if (playerId) {
        if (st === S.HUNT) setStep(playerId, S.GOLD);
        say(playerId, wantGold
            ? [
                ic("fa-solid fa-coins", C.MONEY),
                txt(" The Mob Leader drops ", C.INFO),
                bold(ITEM_GOLD, C.MONEY),
                txt(". Take it back to the Rich Man.", C.INFO),
            ]
            : [
                ic("fa-solid fa-skull", C.SUCCESS),
                txt(" The Mob Leader is down. ", C.INFO),
                txt("Nothing left to take from him.", "#94A3B8"),
            ]);
    }
    return true;
}

/* ── 11. LE SABER EXPERT (niveau 200, mob Lord Vulcan) ────────────────────

   Le duel : 38 456 PV, neuf attaques telegraphiees, et une phase 2 a 50 %
   de vie ou il accelere. Le vaincre termine la quete et rend le joueur dans
   la salle de Shanks.
 */

/* MEMES FORMULES qu'un mob de niveau 200 (voir gameplay/spawning.js). */
function mobHp(level) { return Math.round(20 + Math.pow(level, 1.6) * 8); }

function mobDmg(level) { return Math.round(3 + Math.pow(level, 1.3) * 0.8); }


/* LE SABER EXPERT EST UN BOSS, PAS UN DUELISTE.
   Il a les statistiques d'un mob de NIVEAU 200 (memes formules que le Mob
   Leader : ~38 500 PV, ~786 de corps a corps), et neuf attaques qui, toutes,
   DESSINENT leur zone avant de frapper.

   Aucune de ses attaques ne previent dans le chat : la preparation est une
   animation au sol (couloir, cercle, anneau, marque), puis l'impact tombe
   exactement dans la zone dessinee. Le joueur lit le terrain, pas les logs. */
const SABER = {
    MOB: "Lord Vulcan",
    NAME: "SABER EXPERT",
    TITLE: "Level 200 - Guardian of the Ancient Blade",
    LEVEL: 200,
    SCALE: 1.9,
    SPEED: 6.2,
    DASH_SPEED: 34,
    BG: "#E8B4A0",
    /* Degats = multiples d'un coup de corps a corps de niveau 200. */
    HIT: {
        dash: 1.0, slam: 0.9, quake: 0.7, beam: 1.3, rain: 0.55,
        storm: 0.12, grab: 1.1, tempest: 0.45, slash: 0.8,
    },
    CD: {
        dash: 7000, slam: 6500, quake: 9000, beam: 5500, rain: 12000,
        storm: 12000, grab: 8000, tempest: 9000, slash: 4500,
    },
    WARN: { dash: 900, slam: 750, beam: 900, grab: 700 },
    DASH: { MS: 800, LEN_MAX: 34, WIDTH: 3.2 },
    STORM: { MS: 2600, TICK: 400, RADIUS: 5.5 },
    QUAKE: { SPEED: 13, MAX: 26, BAND: 1.8 },
    BEAM: { RADIUS: 2.8 },
    RAIN: { COUNT: 5, RADIUS: 2.6, STEP: 340 },
};


function saberHp() { return mobHp(SABER.LEVEL); }

function saberDmg() { return mobDmg(SABER.LEVEL); }

function hitFor(key) { return Math.round(saberDmg() * (SABER.HIT[key] || 0.5)); }


let saber = null; // voir startSaberFight pour la forme exacte
let saberTimer = null;


function arenaSpot() {
    const x = ARENA.a[0] + Math.random() * (ARENA.b[0] - ARENA.a[0]);
    const z = ARENA.a[2] + Math.random() * (ARENA.b[2] - ARENA.a[2]);
    return clearSpot([x, ARENA.a[1], z]);
}


function playersInArena() {
    const ids = getAlivePlayerIds();
    const out = [];
    for (let i = 0; i < ids.length; i++) {
        const p = safePosition(ids[i]);
        if (!p) continue;
        if (p[0] < ARENA.a[0] || p[0] > ARENA.b[0]) continue;
        if (p[2] < ARENA.a[2] || p[2] > ARENA.b[2]) continue;
        if (p[1] < ARENA.a[1] - 40 || p[1] > ARENA.b[1] + 80) continue;
        out.push(ids[i]);
    }
    return out;
}


/* ── 12. LA BOUCLE (une decision par tick, neuf attaques) ──────────────── */

function startSaberFight(playerId) {
    if (saber && aliveNow(saber.id)) {
        say(playerId, line("fa-solid fa-swords", C.DANGER,
            saber.fighter === playerId
                ? "The Saber Expert is already waiting for you."
                : "A duel is already taking place in the arena."));
        return false;
    }
    const inArena = playersInArena();
    for (let i = 0; i < inArena.length; i++) {
        if (inArena[i] !== playerId) {
            say(playerId, line("fa-solid fa-xmark", C.DANGER, "Someone is already fighting in the arena."));
            return false;
        }
    }
    if (inArena.length === 0) clearArenaMobs();

    const landing = arenaSpot();
    try { api.setPosition(playerId, landing[0], landing[1], landing[2]); } catch (e) {}
    const p = safePosition(playerId) || landing;
    const angle = Math.random() * Math.PI * 2;
    const spot = clearSpot([p[0] + Math.cos(angle) * 10, p[1], p[2] + Math.sin(angle) * 10]);

    let id = null;
    try {
        id = api.attemptSpawnMob(SABER.MOB, spot[0], spot[1], spot[2], {
            name: SABER.NAME,
            playSoundOnSpawn: true,
        });
    } catch (e) { id = null; }
    if (!id) {
        say(playerId, line("fa-solid fa-xmark", C.DANGER, "The Saber Expert did not show up."));
        return false;
    }
    /* Meme raison que le Mob Leader : l'arene est rangee avant le credit du
       kill, donc le nom du boss n'est plus lisible a ce moment-la. */
    markBossMob(id, SABER.NAME);
    const hp = saberHp();
    /* Pas de one shot : meme garde-fou que sur le Mob Leader et Garp. */
    armBossGate(id, hp);
    setupBossMob(id, {
        hp: hp,
        dmg: saberDmg(),
        radius: 48,
        speed: SABER.SPEED,
        scale: SABER.SCALE,
        knockback: 0,
        target: playerId,
        name: SABER.NAME,
        title: SABER.TITLE,
        colour: SABER.BG,
        background: "#22130a",
    });

    saber = {
        id: id,
        fighter: playerId,
        hp0: hp,
        enraged: false,
        last: null,
        cds: {
            dash: nowMs() + 2500, slam: nowMs() + 4000, quake: nowMs() + 6000,
            beam: nowMs() + 3000, rain: nowMs() + 9000, storm: nowMs() + 7000,
            grab: nowMs() + 5000, tempest: 0, slash: nowMs() + 1500,
        },
        waves: [],
        cast: null,
        used: {},
        storm: null,
        quake: null,
        rain: null,
        grab: null,
        dashUntil: 0,
        dashFrom: null,
        dashHit: {},
        aiTarget: playerId,
    };
    if (saberTimer) saberTimer.stop();
    saberTimer = every(thinkSaber, 4);

    soundAt(spot, "ominousBellHit", 1, 0.6, 45);
    groundRing(spot, 4, HOT_A, HOT_B);
    say(playerId, [
        ic("fa-solid fa-swords", SABER.BG),
        bold(" SABER EXPERT", SABER.BG),
        txt(": \"Then draw your steel.\"", C.INFO),
    ]);
    return true;
}


function clearArenaMobs() {
    let ids = [];
    try { ids = api.getEntitiesInRect(ARENA.a, ARENA.b) || []; } catch (e) { return; }
    for (let i = 0; i < ids.length; i++) {
        if (!isMobEntityType(typeOf(ids[i]))) continue;
        despawnIfAlive(ids[i]);
    }
}


function thinkSaber() {
    if (!saber) { stopSaber(); return; }
    if (!aliveNow(saber.id)) { saberFallen(); return; }
    const p = safePosition(saber.id);
    if (!p) { despawnIfAlive(saber.id); stopSaber(); return; }

    advanceWaves(saber.waves, saber.id);
    tickSaberDash(p);
    tickSaberCast(p);
    tickSaberStorm(p);
    tickSaberQuake(p);
    tickSaberRain(p);
    tickSaberGrab(p);

    const target = saber.fighter && aliveNow(saber.fighter) ? saber.fighter : null;
    if (!target) { endSaberFight("Your duel ended: the arena is empty."); return; }
    const tp = safePosition(target);
    if (!tp) { endSaberFight("Your duel ended: the arena is empty."); return; }

    if (!saber.enraged && healthOf(saber.id) <= saber.hp0 * 0.5) enrage();

    const d = dist3(p, tp);
    const now = nowMs();
    if (saberBusy(now)) return;

    /* ROTATION : tout ce qui est disponible a cette distance, moins la
       derniere attaque jouee. Les portees sont larges parce que chaque
       attaque se prepare : le boss a le temps de la lancer. */
    const ready = [];
    if (now >= saber.cds.dash && d > 5 && d < SABER.DASH.LEN_MAX) ready.push("dash");
    if (now >= saber.cds.slam && d < 10) ready.push("slam");
    if (now >= saber.cds.quake && d < SABER.QUAKE.MAX) ready.push("quake");
    if (now >= saber.cds.beam && d > 5 && d < 44) ready.push("beam");
    if (now >= saber.cds.rain && d > 4 && d < 34) ready.push("rain");
    if (now >= saber.cds.storm && d < SABER.STORM.RADIUS + 5) ready.push("storm");
    if (now >= saber.cds.grab && d < 13) ready.push("grab");
    if (saber.enraged && now >= saber.cds.tempest && d < 18) ready.push("tempest");
    if (now >= saber.cds.slash && d > 4 && d < 32) ready.push("slash");

    /* On joue celle qui n'a pas servi depuis le plus longtemps : c'est ce qui
       garantit que TOUTES les attaques passent, et pas seulement les deux
       premieres de la liste. `saber.last` evite juste de repeter la meme
       deux fois de suite. */
    let pick = null, pickAge = -1;
    for (let i = 0; i < ready.length; i++) {
        const age = now - (saber.used[ready[i]] || 0);
        if (ready[i] === saber.last) continue;
        if (age > pickAge) { pickAge = age; pick = ready[i]; }
    }
    if (!pick && ready.length) pick = ready[0];
    if (pick) { castSaber(pick, p, tp); return; }

    if (saber.aiTarget !== target) {
        try { api.setMobAiState(saber.id, "chasing", { targetId: target }); } catch (e) {}
        saber.aiTarget = target;
    }
}


function saberBusy(now) {
    if (saber.cast) return true;
    if (saber.storm) return true;
    if (saber.quake) return true;
    if (saber.rain) return true;
    if (saber.grab) return true;
    if (now < saber.dashUntil) return true;
    return false;
}


function castSaber(kind, p, tp) {
    saber.last = kind;
    saber.used[kind] = nowMs();
    if (kind === "dash") saberDash(p, tp);
    else if (kind === "slam") saberSlam(p);
    else if (kind === "quake") saberQuake(p);
    else if (kind === "beam") saberBeam(p, tp);
    else if (kind === "rain") saberRain(p, tp);
    else if (kind === "storm") saberStorm(p);
    else if (kind === "grab") saberGrab(p);
    else if (kind === "tempest") saberTempest(p);
    else saberSlash(p, tp);
}


/* Phase 2 : plus rapide, plus rouge. Uniquement du visuel. */
function enrage() {
    saber.enraged = true;
    for (const k in saber.cds) saber.cds[k] = Math.min(saber.cds[k], nowMs() + 1200);
    try {
        api.setMobSetting(saber.id, "baseRunningSpeed", SABER.SPEED * 1.25);
        api.setMobSetting(saber.id, "baseWalkingSpeed", SABER.SPEED);
        api.setTargetedPlayerSettingForEveryone(saber.id, "nameTagInfo",
            nameTagInfo(SABER.NAME + " [ENRAGED]", SABER.TITLE, "#FF4D4D", "#22130a"), true);
    } catch (e) {}
    const p = safePosition(saber.id);
    if (!p) return;
    boom(p, 5, { tex: TEX.effect, count: 120, colors: [rgba(255, 60, 40), rgba(60, 0, 0, 0)] });
    groundRing(p, 9, HOT_A, HOT_B);
    groundRing(p, 6, HOT_A, HOT_B, 1);
    soundAt(p, "bearRoar1", 1, 0.85, 60);
}


/* ── 13. LES ATTAQUES (telegraphie, degats, phases) ═══════════════════════
   Chacune : une preparation dessinee, puis l'impact dans la zone dessinee. */

/* 1. CHARGE GEANTE. Un couloir de particules apparait de lui jusqu'au sol
   ou se trouve le joueur, avec une fleche qui avance. A la fin de la
   preparation il fonce DANS ce couloir, coupe tout ce qu'il traverse et
   termine par une onde de choc. On esquive sur le cote, jamais en reculant. */
function saberDash(p, tp) {
    saber.cds.dash = nowMs() + SABER.CD.dash * (saber.enraged ? 0.8 : 1);
    const dx = tp[0] - p[0], dz = tp[2] - p[2];
    const len = Math.min(SABER.DASH.LEN_MAX, Math.sqrt(dx * dx + dz * dz) + 4);
    const d = norm3([dx, 0, dz]);
    saber.cast = {
        kind: "dash",
        until: nowMs() + SABER.WARN.dash,
        from: [p[0], p[1], p[2]],
        dir: [d[0], 0, d[2]],
        len: len,
        to: [p[0] + d[0] * len, p[1], p[2] + d[2] * len],
    };
    soundAt(p, "bearRoar1", 1, 1.25, 45);
}


function drawDashCast(c, now) {
    const t = 1 - Math.max(0, c.until - now) / SABER.WARN.dash;
    groundCorridor(c.from, c.to, SABER.DASH.WIDTH, WARN_A, WARN_B);
    /* la fleche qui progresse : elle montre ou il sera dans un instant */
    const lead = [c.from[0] + (c.to[0] - c.from[0]) * Math.min(1, t * 1.15),
        c.from[1], c.from[2] + (c.to[2] - c.from[2]) * Math.min(1, t * 1.15)];
    groundMark(lead, 1.4, HOT_A, HOT_B, now / 120);
}


function startDash(c) {
    saber.dashUntil = nowMs() + SABER.DASH.MS;
    saber.dashHit = {};
    saber.dashFrom = [c.from[0], c.from[1], c.from[2]];
    setVel(saber.id, c.dir[0] * SABER.DASH_SPEED, 2.5, c.dir[2] * SABER.DASH_SPEED);
    try { api.setEntityHeading(saber.id, Math.atan2(c.dir[0], c.dir[2])); } catch (e) {}
    soundAt(c.from, "bearRoar1", 1, 1.4, 55);
}


function tickSaberDash(p) {
    const prev = saber.dashFrom;
    saber.dashFrom = [p[0], p[1], p[2]];
    const now = nowMs();
    if (now >= saber.dashUntil) return;
    if (!prev) return;

    point([p[0], p[1] + 1, p[2]], { tex: TEX.glint, count: 5, r: 0.14, size: [0.32, 0.6], life: [0.14, 0.3], colors: [WARN_A, WARN_B] });

    const ids = getAlivePlayerIds();
    for (let i = 0; i < ids.length; i++) {
        const t = ids[i];
        if (saber.dashHit[t]) continue;
        const tp = safePosition(t);
        if (!tp) continue;
        const near = segDist([tp[0], tp[1] + 0.9, tp[2]], prev, p);
        if (near.d2 > SABER.DASH.WIDTH * SABER.DASH.WIDTH) continue;
        saber.dashHit[t] = 1;
        if (damage(t, hitFor("dash"), saber.id, "Saber Dash")) {
            const dir = norm3([tp[0] - p[0], 0.5, tp[2] - p[2]]);
            impulse(t, dir[0] * 13, 6, dir[2] * 13);
        }
    }
}


/* 2. FRAPPE AU SOL. Un anneau se resserre sur le sol autour de lui : quand il
   atteint le rayon d'impact, tout ce qui est dedans est projete. */
function saberSlam(p) {
    saber.cds.slam = nowMs() + SABER.CD.slam * (saber.enraged ? 0.8 : 1);
    saber.cast = { kind: "slam", until: nowMs() + SABER.WARN.slam, at: [p[0], p[1], p[2]], radius: 9 };
    soundAt(p, "ominousBellHit", 1, 0.9, 45);
}


function drawSlamCast(c, now) {
    const t = 1 - Math.max(0, c.until - now) / SABER.WARN.slam;
    const r = c.radius * (1.6 - 0.6 * t);
    groundRing(c.at, r, WARN_A, WARN_B, now / 160);
    groundRing(c.at, c.radius, WARN_A, WARN_B, -now / 200);
    if (t > 0.6) groundRing(c.at, c.radius * 0.4, HOT_A, HOT_B, now / 90);
}


function resolveSlam(c) {
    hitArea([c.at[0], c.at[1] + 0.5, c.at[2]], c.radius, saber.id, "Saber Slam", hitFor("slam"), {
        knock: 15, lift: 7, slow: [1500, 2],
    });
    boom([c.at[0], c.at[1] + 0.5, c.at[2]], 5, { tex: TEX.crit, count: 90, colors: [rgba(255, 220, 120), rgba(90, 60, 0, 0)] });
    groundRing(c.at, c.radius, HOT_A, HOT_B);
    soundAt(c.at, "glass1", 1, 0.55, 55);
}


/* 3. ONDE DE CHOC. Un anneau part de lui et grandit : il faut sauter
   par-dessus ou sortir du cercle, rester dedans est puni une fois. */
function saberQuake(p) {
    saber.cds.quake = nowMs() + SABER.CD.quake * (saber.enraged ? 0.8 : 1);
    saber.quake = { at: [p[0], p[1], p[2]], r: 1.2, hit: {} };
    soundAt(p, "ominousBellHit", 1, 0.7, 55);
}


function tickSaberQuake(p) {
    const q = saber.quake;
    if (!q) return;
    const now = nowMs();
    const stepR = SABER.QUAKE.SPEED * 0.2; // 200 ms
    q.r += stepR;
    if (q.r > SABER.QUAKE.MAX) { saber.quake = null; return; }

    groundRing(q.at, q.r, HOT_A, HOT_B, now / 100);

    const ids = getAlivePlayerIds();
    for (let i = 0; i < ids.length; i++) {
        const t = ids[i];
        if (q.hit[t]) continue;
        const tp = safePosition(t);
        if (!tp) continue;
        if (Math.abs(dist3(tp, q.at) - q.r) > SABER.QUAKE.BAND) continue;
        q.hit[t] = 1;
        if (damage(t, hitFor("quake"), saber.id, "Shockwave")) {
            const dir = norm3([tp[0] - q.at[0], 0.4, tp[2] - q.at[2]]);
            impulse(t, dir[0] * 7, 8, dir[2] * 7);
        }
    }
}


/* 4. RAYON. Une marque apparait la ou le joueur se trouve, avec un cercle qui
   se resserre : quand les deux anneaux se rejoignent, une colonne tombe.
   Bouger suffit. */
function saberBeam(p, tp) {
    saber.cds.beam = nowMs() + SABER.CD.beam * (saber.enraged ? 0.8 : 1);
    saber.cast = {
        kind: "beam",
        until: nowMs() + SABER.WARN.beam,
        at: [tp[0], tp[1], tp[2]],
        from: [p[0], p[1], p[2]],
        radius: SABER.BEAM.RADIUS,
    };
    soundAt(p, "magicAccent1", 0.85, 0.6, 55);
}


function drawBeamCast(c, now) {
    const t = 1 - Math.max(0, c.until - now) / SABER.WARN.beam;
    groundMark(c.at, c.radius, WARN_A, WARN_B, now / 140);
    groundRing(c.at, c.radius * (3.2 - 2.2 * t), WARN_A, WARN_B, -now / 120);
    groundCorridor(c.from, c.at, 0.5, rgba(255, 200, 180, 0.6), WARN_B);
    if (t > 0.75) pillar(c.at, 6, HOT_A, HOT_B);
}


function resolveBeam(c) {
    hitArea([c.at[0], c.at[1] + 0.5, c.at[2]], c.radius, saber.id, "Saber Beam", hitFor("beam"), {
        knock: 6, lift: 5,
    });
    pillar(c.at, 10, HOT_A, HOT_B);
    boom([c.at[0], c.at[1] + 0.8, c.at[2]], 3.4, { tex: TEX.crit, count: 90, colors: [rgba(255, 220, 200), rgba(150, 20, 20, 0)] });
    soundAt(c.at, "cannonFire3", 0.9, 1.05, 55);
}


/* 5. PLUIE DE LAMES. Cinq marques apparaissent autour de la position du
   joueur, puis chacune tombe a son tour. On peut sortir du cercle marque. */
function saberRain(p, tp) {
    saber.cds.rain = nowMs() + SABER.CD.rain * (saber.enraged ? 0.8 : 1);
    const marks = [{ at: [tp[0], tp[1], tp[2]], due: nowMs() + 700, done: false }];
    const n = SABER.RAIN.COUNT - 1;
    const a0 = Math.random() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * Math.PI * 2;
        const rad = 4 + Math.random() * 5;
        const spot = clearSpot([tp[0] + Math.cos(a) * rad, tp[1], tp[2] + Math.sin(a) * rad]);
        marks.push({ at: spot, due: nowMs() + 700 + (i + 1) * SABER.RAIN.STEP, done: false });
    }
    saber.rain = { marks: marks };
    soundAt(p, "magicAccent1", 0.8, 1.3, 55);
}


function tickSaberRain(p) {
    const r = saber.rain;
    if (!r) return;
    const now = nowMs();
    let left = 0;
    for (let i = 0; i < r.marks.length; i++) {
        const m = r.marks[i];
        if (m.done) continue;
        if (now >= m.due) {
            m.done = true;
            hitArea([m.at[0], m.at[1] + 0.5, m.at[2]], SABER.RAIN.RADIUS, saber.id, "Blade Rain", hitFor("rain"), {
                knock: 5, lift: 6,
            });
            pillar(m.at, 9, HOT_A, HOT_B);
            groundRing(m.at, SABER.RAIN.RADIUS, HOT_A, HOT_B);
            soundAt(m.at, "glass1", 0.9, 0.8, 50);
            continue;
        }
        left++;
        /* marque legere : cinq marques dessinees en meme temps, on ne peut pas
           se permettre deux anneaux + une croix par marque a chaque passage */
        groundRing(m.at, SABER.RAIN.RADIUS, WARN_A, WARN_B, now / 130);
        point([m.at[0], m.at[1] + 0.12, m.at[2]], { tex: TEX.crit, count: 3, r: 0.13, size: [0.26, 0.46], life: [0.16, 0.34], colors: [WARN_A, WARN_B] });
    }
    if (left === 0) saber.rain = null;
}


/* 6. TOURBILLON. Deux anneaux de lames tournent autour de lui et blessent par
   vagues. On ne reste pas colle. */
function saberStorm(p) {
    saber.cds.storm = nowMs() + SABER.CD.storm * (saber.enraged ? 0.8 : 1);
    saber.storm = { until: nowMs() + SABER.STORM.MS, next: nowMs() };
    soundAt(p, "bigDrumSwish1", 1, 0.9, 50);
}


function tickSaberStorm(p) {
    const st = saber.storm;
    if (!st) return;
    const now = nowMs();
    if (now >= st.until) { saber.storm = null; return; }

    groundRing(p, SABER.STORM.RADIUS, WARN_A, WARN_B, now / 120);
    ring([p[0], p[1] + 1.2, p[2]], SABER.STORM.RADIUS * 0.65, 14, {
        tex: TEX.glint, r: 0.1, size: [0.26, 0.46], life: [0.16, 0.32],
        colors: [rgba(255, 255, 255), rgba(200, 120, 90, 0)],
    }, -now / 90);

    if (now < st.next) return;
    st.next = now + SABER.STORM.TICK;
    hitArea([p[0], p[1] + 0.6, p[2]], SABER.STORM.RADIUS, saber.id, "Blade Storm", hitFor("storm"), {});
}


/* 7. CHAINE. Un fil rouge part de sa main vers le joueur, en direct : s'il
   est encore a portee au bout du delai, il l'aspire et frappe. Sortir des
   12 blocs pendant la preparation annule. */
const GRAB_RANGE = 12;


function saberGrab(p) {
    saber.cds.grab = nowMs() + SABER.CD.grab * (saber.enraged ? 0.8 : 1);
    saber.grab = { until: nowMs() + SABER.WARN.grab, target: saber.fighter, from: [p[0], p[1], p[2]] };
    soundAt(p, "magicAccent1", 1, 0.8, 50);
}


function tickSaberGrab(p) {
    const g = saber.grab;
    if (!g) return;
    const now = nowMs();
    const victim = g.target;
    const tp = victim ? safePosition(victim) : null;

    if (tp) {
        const a = [p[0], p[1] + 1.4, p[2]];
        const b = [tp[0], tp[1] + 1.2, tp[2]];
        for (let i = 1; i <= 12; i++) {
            const t = i / 13;
            point([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], {
                tex: TEX.square, count: 1, r: 0.08, size: [0.18, 0.3], life: [0.08, 0.18],
                colors: [rgba(255, 90, 70), rgba(90, 0, 0, 0)],
            });
        }
        groundRing([tp[0], tp[1], tp[2]], 2, HOT_A, HOT_B, now / 100);
    }
    if (now < g.until) return;

    saber.grab = null;
    if (!victim || !tp) return;
    if (dist3(tp, p) > GRAB_RANGE) return;   // il s'est echappe : rien ne se passe
    const dir = norm3([p[0] - tp[0], 0.35, p[2] - tp[2]]);
    try { setVel(victim, dir[0] * 18, 5, dir[2] * 18); } catch (e) {}
    if (damage(victim, hitFor("grab"), saber.id, "Saber Chain")) {
        eff(victim, "Weakness", 3000, { inbuiltLevel: 2 });
    }
    boom([tp[0], tp[1] + 1, tp[2]], 2.5, { tex: TEX.crit, count: 50, colors: [rgba(255, 90, 70), rgba(90, 0, 0, 0)] });
}


/* 8. ENTaille double : deux ondes qui ne partent pas du meme point. */
function saberSlash(p, tp) {
    saber.cds.slash = nowMs() + SABER.CD.slash * (saber.enraged ? 0.75 : 1);
    const dir = norm3([tp[0] - p[0], 0.05, tp[2] - p[2]]);
    const side = [-dir[2], 0, dir[0]];
    spawnWave(saber.waves, [p[0] + side[0] * 2.4, p[1] + 1, p[2] + side[2] * 2.4], dir, 32, 1.6, hitFor("slash"), "Air Slash");
    spawnWave(saber.waves, [p[0] - side[0] * 2.4, p[1] + 1, p[2] - side[2] * 2.4], dir, 32, 1.6, hitFor("slash"), "Air Slash");
    soundAt(p, "magicAccent1", 0.9, 1.2, 45);
}


/* 9. TEMPETE DE LAMES : six ondes en etoile, phase 2 seulement. */
function saberTempest(p) {
    saber.cds.tempest = nowMs() + SABER.CD.tempest;
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        spawnWave(saber.waves, [p[0], p[1] + 0.6, p[2]], [Math.cos(a), 0, Math.sin(a)],
            22, 1.3, hitFor("tempest"), "Blade Tempest");
    }
    groundRing(p, 4, HOT_A, HOT_B);
    soundAt(p, "ominousBellHit", 1, 0.5, 55);
}


/* Le chef d'orchestre de la preparation : dessine, puis frappe. */
function tickSaberCast(p) {
    const c = saber.cast;
    if (!c) return;
    const now = nowMs();
    if (c.kind === "dash") {
        /* Le couloir suit le boss : il reste colle a lui pendant qu'il avance,
           et la charge part donc de la ou il est vraiment. */
        c.from = [p[0], p[1], p[2]];
        c.to = [p[0] + c.dir[0] * c.len, p[1], p[2] + c.dir[2] * c.len];
        drawDashCast(c, now);
    } else if (c.kind === "slam") {
        c.at = [p[0], p[1], p[2]];
        drawSlamCast(c, now);
    } else if (c.kind === "beam") {
        drawBeamCast(c, now);
    }
    if (now < c.until) return;

    saber.cast = null;
    if (c.kind === "dash") startDash(c);
    else if (c.kind === "slam") resolveSlam(c);
    else if (c.kind === "beam") resolveBeam(c);
}


/* ── 14. MORTS, DESPAWNS, JOIN / LEAVE ─────────────────────────────────── */

function saberFallen() {
    const fighter = saber ? saber.fighter : null;
    const id = saber ? saber.id : null;
    const p = saber ? safePosition(saber.id) : null;
    stopSaber();
    despawnIfAlive(id);
    if (p) {
        boom(p, 4, { tex: TEX.soul, colors: [rgba(232, 180, 160), rgba(60, 30, 30, 0)] });
        soundAt(p, "exp_levelup", 1, 0.8, 50);
    }
    if (fighter) {
        say(fighter, [
            ic("fa-solid fa-trophy", C.MONEY),
            bold(" SABER EXPERT defeated. ", C.MONEY),
            txt("The Saber Quest is complete.", C.SUCCESS),
        ]);
        /* LA QUETE EST FINIE : etape ET boutons repartent a zero. Rien n'est
           garde en memoire pour ce joueur, donc rien a nettoyer plus tard. */
        clearSecretArrow(fighter);
        clearStructArrow(fighter, "door");
        clearStructArrow(fighter, "curtain");
        resetQuest(fighter);
        /* Retour dans la salle de Shanks, comme Garp renvoie au spawn. */
        try {
            api.setPosition(fighter, WALL_BEHIND[0], WALL_BEHIND[1], WALL_BEHIND[2]);
        } catch (e) {}
    }
}


function endSaberFight(reason) {
    const fighter = saber ? saber.fighter : null;
    const id = saber ? saber.id : null;
    stopSaber();
    despawnIfAlive(id);
    if (fighter && reason) say(fighter, line("fa-solid fa-circle-info", C.INFO, reason));
}


function stopSaber() {
    if (saberTimer) { saberTimer.stop(); saberTimer = null; }
    saber = null;
}

/* Etat du duel, lu par l'exterieur : qui se bat, quel mob, et la branche de
   mort appelee par onPlayerKilledMob. Rien d'autre ne sort de ce fichier. */
function saberMobId() {
    return saber ? saber.id : null;
}

function saberFighter() {
    return saber ? saber.fighter : null;
}

function killSaber(mobId) {
    if (!mobId || !saber || mobId !== saber.id) return false;
    saberFallen();
    return true;
}

/* Branche dans onPlayerKilledMob : renvoie true si le mob etait a nous.
   L'ordre n'a pas d'importance (les deux tests sont des comparaisons d'id). */
export function saberKilledMob(playerId, mobId) {
    if (!mobId) return false;
    if (killLeader(playerId, mobId)) return true;
    if (killSaber(mobId)) return true;
    return false;
}

/* Branche dans onWorldAttemptDespawnMob : nos boss ne doivent pas etre
   nettoyes par le monde au milieu d'un combat. */
export function saberPreventDespawn(mobId) {
    if (!mobId) return null;
    if (saberMobId() === mobId) return "preventDespawn";
    if (leaderMobId() === mobId) return "preventDespawn";
    return null;
}

export function saberJoin(playerId) {
    if (!playerId) return false;
    startHousekeeping();
    /* Les deux cles des versions precedentes sont effacees : `sq` (etape) et
       `sqB` (plaques) ne servent plus a rien, tout tient maintenant dans `s`. */
    try { deleteStat(playerId, DB_STEP_OLD); } catch (e) {}
    try { deleteStat(playerId, DB_BUTTONS_OLD); } catch (e) {}

    resumeQuest(playerId);

    /* La fleche de quete suit l'etape : elle pointe Secret Island tant que la
       chasse est en cours, et disparait des que le joueur a l'or (il doit
       revenir au Rich Man) ou la relique. */
    if (stepOf(playerId) === S.HUNT) armSecretArrow(playerId);
    else clearSecretArrow(playerId);
    return true;
}

export function saberLeave(playerId) {
    if (!playerId) return false;
    clearSecretArrow(playerId);
    clearStructArrow(playerId, "door");
    clearStructArrow(playerId, "curtain");
    /* Le duel appartient a un joueur : s'il part, on range l'arene. */
    if (saberFighter() === playerId) endSaberFight(null);
    parkQuest(playerId);
    return true;
}

/* Fermeture du monde : on range tout ce qui tourne encore, et on remet les
   deux structures dans leur etat d'origine. */
export function saberClose() {
    stopSaber();
    stopLeader();
    stopHousekeeping();
    closeStruct("door");
    closeStruct("curtain");
    return true;
}
