// gameplay/saber/state.js
/* state.js — l'etape de la quete (une cle de base, les plaques en memoire)

   Une seule cle, `s`, et elle ne contient que le numero d'etape. Les cinq
   plaques de la jungle ne sont jamais ecrites : elles repartent de zero a
   chaque connexion.
   
   resumeQuest() et parkQuest() sont les deux seules portes d'entree du
   join / leave ; le reste du jeu ne lit l'etape que par stepOf().
 */

import { deleteStat, getStat, setStat } from "../../utils/data";
import { DB_STEP, ITEM_CUP, ITEM_CUP_FULL, ITEM_GOLD, ITEM_RELIC, ITEM_TORCH, LOCKED_ITEMS, S } from "./config";
import { hasItem } from "./kit";


/* L'item est-il interdit au lacher ? (branche dans onPlayerDropItem) */
export function saberLockedItem(itemName) {
    return LOCKED_ITEMS.indexOf(itemName) !== -1;
}


/* ── 3. ETAT DE LA QUETE ───────────────────────────────────────────────── */

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
export function readStepStat(playerId) {
    let v = 0;
    try { v = getStat(playerId, DB_STEP, 0); } catch (e) { v = 0; }
    v = v | 0;
    return v > S.NONE ? v : S.NONE;
}


export function questOf(playerId) {
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
export function stepFromItems(playerId) {
    if (hasItem(playerId, ITEM_RELIC)) return S.RELIC;
    if (hasItem(playerId, ITEM_GOLD)) return S.GOLD;
    if (hasItem(playerId, ITEM_CUP_FULL)) return S.WATER;
    if (hasItem(playerId, ITEM_TORCH)) return S.DOOR;
    if (hasItem(playerId, ITEM_CUP)) return S.CURTAIN;
    return S.NONE;
}


export function stepOf(playerId) {
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
export function setStep(playerId, step) {
    if (!playerId) return;
    const q = questOf(playerId) || (quests[playerId] = { step: 0, buttons: 0 });
    q.step = step;
    try { setStat(playerId, DB_STEP, step); } catch (e) {}
}


export function buttonsOf(playerId) {
    const q = questOf(playerId);
    return q ? q.buttons : 0;
}


/* Les plaques restent EN MEMOIRE : jamais de setStat ici. */
export function saveButtons(playerId, mask) {
    if (!playerId) return;
    const q = questOf(playerId) || (quests[playerId] = { step: 0, buttons: 0 });
    q.buttons = mask || 0;
}


/* Remise a zero COMPLETE : la memoire, les plaques, ET la cle en base. C'est
   ce qui rend la quete rejouable apres une victoire. */
export function resetQuest(playerId) {
    if (!playerId) return false;
    delete quests[playerId];
    try { deleteStat(playerId, DB_STEP); } catch (e) {}
    return true;
}

/* JOIN : l'etape vient de la base, les plaques repartent de zero. Un joueur
   qui a quitte a 3/5 retrouve donc 0/5 et doit les recliquer. Renvoie
   l'etape relue (0 si la cle est absente). */
export function resumeQuest(playerId) {
    if (!playerId) return S.NONE;
    const saved = readStepStat(playerId);
    if (saved > S.NONE) quests[playerId] = { step: saved, buttons: 0 };
    else if (quests[playerId]) quests[playerId].buttons = 0;
    return saved;
}

/* LEAVE : on jette les plaques cliquees et l'entree d'un joueur qui n'a rien
   commence, pour ne pas garder une ligne vide par joueur passe. L'etape, elle,
   est deja en base : elle attend son retour. */
export function parkQuest(playerId) {
    if (!playerId) return false;
    const q = questOf(playerId);
    if (!q) return false;
    q.buttons = 0;
    if (q.step <= S.NONE) delete quests[playerId];
    return true;
}
