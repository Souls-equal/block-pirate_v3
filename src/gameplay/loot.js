// gameplay/loot.js
/* Le butin des mobs : un fichier a part depuis que la limite est passee a
   64 fichiers. Il ne connait que des items, des poids et des rangs ; il ne
   sait rien des degats, des quetes ou des boss, qui l'appellent.
   Source unique des bons : utils/data.js (FRUIT_TICKETS). */

import { C, say, txt, bold, ic } from "../core/theme";
import { FRUIT_TICKETS } from "../utils/data";

/* ══════════════════════════════════════════════════════════════════════════
   BUTIN DES MOBS

   Chaque mob tue a UNE chance de lacher un objet : 4 % pour un mob normal,
   6 % pour un tier 2, 9 % pour un boss. S'il y a un roll, on tire UNE
   recompense au poids parmi celles que ce mob a le droit de lacher.

   DEUX FILTRES, dans cet ordre :
     - `ranks` : les rangs autorises (1 normal, 2 tier 2, 3 boss) ;
     - `boss`  : le nom exact du boss, pour les objets RESERVES a un seul
                 boss (Garp, Saber Expert, Mob Leader).

   Les bons de reduction viennent de FRUIT_TICKETS (utils/data) : leur nom
   d'item, leur nom affiche et leur pourcentage ne sont ecrits qu'une fois.
   Les poids ci-dessous disent seulement QUAND ils tombent.

   Les objets de quete (Torch, Cup, Gold Grit, Magmaward Fuel) ne sont
   JAMAIS dans ce tableau : ce sont des dons garantis, et un doublon
   bloquerait la quete (un Gold Grit de trop ne se donne a personne).
   ══════════════════════════════════════════════════════════════════════════ */

/* Chance de roll, par rang. */
const LOOT_CHANCE = { 1: 0.04, 2: 0.06, 3: 0.09 };

/* Poids, rangs et reservation de chaque bon, par pourcentage. */
const LOOT_TICKET_RULE = {
    10: { weight: 130, ranks: [1, 2, 3], boss: null },
    20: { weight: 62, ranks: [1, 2, 3], boss: null },
    30: { weight: 26, ranks: [2, 3], boss: null },
    40: { weight: 14, ranks: [3], boss: "MOB LEADER" },
    50: { weight: 5, ranks: [3], boss: "SABER EXPERT" },
};

/* Objets hors bons. `boss` = reserve a ce boss, par son nom exact. */
const LOOT_EXTRA = [
    /* Le fragment de haki de Garp : il en lache deja un a coup sur, celui-ci
       est un extra. Il se revend au Haki Buyer, donc il ne reste jamais mort
       dans un inventaire. */
    { item: "Black Carpet", label: "Haki Fragment", weight: 10, ranks: [3], boss: "GARP" },
];

/* Les trois boss de la quete, par leur nom exact. */
const BOSS_NAMES = ["GARP", "SABER EXPERT", "MOB LEADER"];

/* Un boss despawn avant le credit de son kill (Garp, Saber Expert, Mob
   Leader) : son nom n'est plus lisible sur l'entite. On le retient donc a
   l'apparition (voir markBossMob), sinon il tomberait dans le rang des mobs
   ordinaires et ne pourrait jamais lacher ses objets reserves. */
const BOSS_MOBS = {};

export function markBossMob(mobId, name) {
    if (!mobId || !name) return false;
    BOSS_MOBS[mobId] = String(name).toUpperCase();
    return true;
}

/* Un mob est-il un boss ? Le World Code s'en sert pour les IMMUNISER au crowd
   control (voir utils/combat : applyEffect / teleport) et le Control Domain
   pour ne pas les aspirer. `loot.js` est le seul fichier qui marque les boss,
   donc le seul qui puisse repondre ; la table est lue a chaque appel (elle
   change a chaque spawn et a chaque kill), aucune copie a maintenir.
   `index.js` branche cette fonction sur combat (setBossGuard) et les Code
   Blocks, qui n'importent rien, la lisent dans globalThis. */
export function isBossMob(mobId) {
    return !!(mobId && BOSS_MOBS[mobId]);
}

try {
    globalThis.__isBossMob = isBossMob;
} catch (e) {}

/* Un mob ne meurt qu'une fois, mais le moteur peut reutiliser un id : on
   oublie le marquage des que le kill est credite (voir killdMob). La table
   appartient a ce fichier, donc c'est ici qu'on la nettoie — spawning.js ne
   doit pas y toucher : `BOSS_MOBS` n'est pas exporte et ne le sera pas. */
export function forgetBossMob(mobId) {
    if (!mobId) return false;
    return delete BOSS_MOBS[mobId];
}


/* Tableau de butin complet, construit a l'appel : FRUIT_TICKETS est lu a ce
   moment-la, donc aucun acces avant initialisation du module de data. */
function lootTable() {
    const table = [];
    for (let i = 0; i < FRUIT_TICKETS.length; i++) {
        const voucher = FRUIT_TICKETS[i];
        const rule = LOOT_TICKET_RULE[voucher.pct];
        if (!rule) continue;
        table.push({
            item: voucher.item,
            label: voucher.label,
            weight: rule.weight,
            ranks: rule.ranks,
            boss: rule.boss,
        });
    }
    for (let i = 0; i < LOOT_EXTRA.length; i++) table.push(LOOT_EXTRA[i]);
    return table;
}

/* Tire un objet au poids parmi ceux que ce rang (et ce boss) autorise. */
function lootPick(rank, bossName) {
    const table = lootTable();
    const pool = [];
    let total = 0;
    for (let i = 0; i < table.length; i++) {
        const row = table[i];
        if (row.ranks.indexOf(rank) < 0) continue;
        if (row.boss && row.boss !== bossName) continue;
        pool.push(row);
        total += row.weight;
    }
    if (!pool.length || !(total > 0)) return null;
    let roll = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
        roll -= pool[i].weight;
        if (roll < 0) return pool[i];
    }
    return pool[pool.length - 1];
}

/* Position du butin : le cadavre si elle est encore lisible, sinon le tueur. */
function lootPos(mobId, playerId) {
    let p = null;
    try { p = api.getPosition(mobId); } catch (e) { p = null; }
    if (!p || p.length < 3 || p[0] !== p[0] || p[1] !== p[1] || p[2] !== p[2]) {
        try { p = api.getPosition(playerId); } catch (e2) { p = null; }
    }
    if (!p || p.length < 3) return null;
    return [p[0], p[1], p[2]];
}

/* Roll de butin d'un kill. Renvoie l'objet lache, ou null. */
export function rollMobLoot(playerId, mobId, data) {
    if (!playerId || !mobId) return null;
    const bossName = BOSS_MOBS[mobId]
        || (data && data.name ? String(data.name).toUpperCase() : "");
    let rank = data && data.rank ? (data.rank | 0) : 1;
    if (BOSS_NAMES.indexOf(bossName) !== -1) rank = 3;
    if (rank < 1) rank = 1;
    if (rank > 3) rank = 3;

    const chance = LOOT_CHANCE[rank];
    if (!chance || Math.random() >= chance) return null;

    const pick = lootPick(rank, bossName);
    if (!pick) return null;

    const at = lootPos(mobId, playerId);
    let placed = false;
    if (at) {
        try {
            api.createItemDrop(at[0], at[1] + 0.4, at[2], pick.item, 1, false);
            placed = true;
        } catch (e) { placed = false; }
    }
    if (!placed) {
        /* Pas de position exploitable : le butin va directement au tueur
           plutot que de disparaitre. */
        try { api.giveItem(playerId, pick.item, 1); placed = true; } catch (e) { placed = false; }
    }
    if (!placed) return null;

    try {
        say(playerId, [
            ic("fa-solid fa-gem", C.MONEY),
            bold(" LOOT  ", C.MONEY),
            bold(pick.label || pick.item, C.MONEY),
            txt(" dropped.", C.INFO),
        ]);
    } catch (e) {}
    return pick.item;
}
