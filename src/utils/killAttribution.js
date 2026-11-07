// utils/killAttribution.js
import { posOf } from "./lifeform";


const HITS = {};
const KILL_TTL_MS = 120000;
const CLAIM_TTL_MS = 20000;
/* Un kill déjà crédité reste verrouillé quelques secondes : le moteur envoie
   plusieurs events pour une même mort (kill + despawn + onEntityDeleted, et
   parfois les deux chemins de crédit côté script). Sans ce verrou, on paie
   deux fois. */
const CREDIT_HOLD_MS = 15000;

const CLAIMED = {};

/* Anti-exploit : un mob qui despawn parce que le joueur a quitte la zone (chunks
   decharges) ne doit JAMAIS payer. Seul un kill confirme par le moteur
   (onPlayerKilledMob) est paye sans verification ; sinon le tueur doit etre a
   portee de la cible. 64 blocs = 2 chunks, la zone que le joueur garde
   toujours chargee. */
const CREDIT_MAX_DIST = 64;
const CREDIT_MAX_DIST_SQ = CREDIT_MAX_DIST * CREDIT_MAX_DIST;

/* Position de la cible : vivante si lisible, sinon celle memorisee au dernier
   coup recu (le mob a disparu avec le chunk, api.getPosition leve). */
function targetPos(targetId) {
    const live = posOf(targetId);
    if (live) return live;
    const h = HITS[targetId];
    return h && h.pos ? h.pos : null;
}

/* true si le tueur peut legitimement encaisser la mort de cette cible. */
export function killerInRange(killerId, targetId) {
    const k = posOf(killerId);
    if (!k) return false;   // tueur deconnecte : impossible de verifier, on ne paie pas
    const t = targetPos(targetId);
    if (!t) return false;   // position de la cible inconnue : on ne paie pas
    const dx = k[0] - t[0], dy = k[1] - t[1], dz = k[2] - t[2];
    return dx * dx + dy * dy + dz * dz <= CREDIT_MAX_DIST_SQ;
}

let lastPrune = 0;

let creditHook = null;
let mobSeenHook = null;

export function setKillCreditHook(fn) {
    creditHook = typeof fn === "function" ? fn : null;
}

export function setMobSeenHook(fn) {
    mobSeenHook = typeof fn === "function" ? fn : null;
}

export function noteMobSeen(mobId) {
    if (!mobId || !mobSeenHook) return;
    try { mobSeenHook(mobId); } catch (e) {}
}

/* Joueur qui possede ce dbId, ou null. Un mob invoque (Creation, etc.) porte
   le dbId de son proprietaire dans son reglage `ownerDbId` ; deux modules
   balayaient les joueurs pour le retrouver, c'est fait ici une seule fois. */
export function playerIdForDbId(dbId) {
    if (!dbId) return null;
    let pids = [];
    try { pids = api.getPlayerIds() || []; } catch (e) { return null; }
    for (let i = 0; i < pids.length; i++) {
        try {
            if (api.getPlayerDbId(pids[i]) === dbId) return pids[i];
        } catch (e2) {}
    }
    return null;
}

function resolveOwnerId(id) {
    if (!id) return id;
    /* 1) table des invocations (Creation golem, etc) */
    try {
        const mod = globalThis.__combatSummonOwner || null;
        if (mod && mod[id]) return resolveOwnerId(mod[id]);
    } catch (e) {}
    /* 2) le mob invoque porte le dbId de son proprietaire */
    try {
        const db = api.getMobSetting(id, "ownerDbId", false);
        if (db) {
            const owner = playerIdForDbId(db);
            if (owner) return owner;
        }
    } catch (e) {}
    return id;
}

// expose pour combat.js
globalThis.__resolveKillOwner = resolveOwnerId;

export function claimKill(targetId, killerId) {
    if (!targetId) return false;
    const realKiller = resolveOwnerId(killerId) || killerId;
    const prev = CLAIMED[targetId];
    /* Un mob ne meurt qu'une fois : tant que le crédit est frais, on refuse
       tout nouveau claim, quel que soit le tueur annoncé. */
    if (prev && prev.credited && (Date.now() - prev.at) < CREDIT_HOLD_MS) return false;
    CLAIMED[targetId] = { id: realKiller || null, at: Date.now(), credited: true };
    return true;
}

/* Suppression volontaire (clear du panneau admin) : ce mob ne doit JAMAIS
   payer. On le verrouille AVANT le despawn, exactement comme s'il avait deja
   ete credite : `claimKill` refusera, donc `onMobDespawned` /
   `onEntityDeleted` ne verseront ni XP ni argent au dernier joueur qui l'a
   frappe. Appeler AVANT api.despawnMob : apres, l'event est deja parti. */
export function blockKillCredit(targetId) {
    if (!targetId) return false;
    CLAIMED[targetId] = { id: null, at: Date.now(), credited: true };
    delete HITS[targetId];
    return true;
}

/* Meme chose pour une liste d'ids (le clear ramasse mobs et entites d'un
   coup). Renvoie le nombre de cibles verrouillees. */
export function blockKillCreditAll(ids) {
    if (!ids || !ids.length) return 0;
    let n = 0;
    for (let i = 0; i < ids.length; i++) if (blockKillCredit(ids[i])) n++;
    return n;
}

export function releaseKill(targetId) {
    const e = CLAIMED[targetId];
    if (e && e.credited) return;
    delete CLAIMED[targetId];
}

export function creditKill(killerId, targetId, targetName, confirmed) {
    if (!killerId || !targetId) return false;
    const realKiller = resolveOwnerId(killerId) || killerId;
    /* Mort confirmee par le moteur (onPlayerKilledMob) ou simple despawn :
       dans le second cas on exige que le tueur soit encore a portee. */
    if (!confirmed && !killerInRange(realKiller, targetId)) return false;
    if (!claimKill(targetId, realKiller)) return false;
    if (creditHook) {
        try { creditHook(realKiller, targetId, targetName || null); }
        catch (e) {}
    }
    return true;
}

export function recordDamager(targetId, killerId, itemName) {
    if (!targetId || !killerId) return;
    if (targetId === killerId) return;
    const realKiller = resolveOwnerId(killerId) || killerId;
    if (realKiller === targetId) return;
    HITS[targetId] = {
        killerId: realKiller,
        itemName: itemName || null,
        at: Date.now(),
        /* memorisee ici : au despawn, la cible n'a plus de position lisible */
        pos: posOf(targetId)
    };
}

export function getLastDamager(targetId) {
    const e = HITS[targetId];
    if (!e) return null;
    if (Date.now() - e.at > KILL_TTL_MS) {
        delete HITS[targetId];
        return null;
    }
    // re-resolve au cas où le damager était une invocation
    const rk = resolveOwnerId(e.killerId) || e.killerId;
    if (rk !== e.killerId) {
        return { killerId: rk, itemName: e.itemName, at: e.at };
    }
    return e;
}

export function forgetDamager(targetId) {
    delete HITS[targetId];
}

export function pruneDamagers() {
    const now = Date.now();
    if (now - lastPrune < 60000) return;
    lastPrune = now;
    for (const k in HITS) {
        if (now - HITS[k].at > KILL_TTL_MS) delete HITS[k];
    }
    for (const k in CLAIMED) {
        if (now - CLAIMED[k].at > CLAIM_TTL_MS) delete CLAIMED[k];
    }
}
