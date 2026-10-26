// utils/killAttribution.js

const HITS = {};
const KILL_TTL_MS = 120000;
const CLAIM_TTL_MS = 20000;
/* Un kill déjà crédité reste verrouillé quelques secondes : le moteur envoie
   plusieurs events pour une même mort (kill + despawn, et parfois les deux
   chemins de crédit côté script). Sans ce verrou, on paie deux fois. */
const CREDIT_HOLD_MS = 5000;

const CLAIMED = {};

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

function resolveOwnerId(id) {
    if (!id) return id;
    // 1) table des invocations (Creation golem, etc)
    try {
        // import dynamique évite cycle, mais on tente via global si dispo
        const mod = globalThis.__combatSummonOwner || null;
        if (mod && mod[id]) return resolveOwnerId(mod[id]);
    } catch (e) {}
    try {
        // direct require via api? on tente lecture ownerDbId
        const db = api.getMobSetting(id, "ownerDbId", false);
        if (db) {
            // cherche joueur avec ce dbId
            let pids = [];
            try { pids = api.getPlayerIds() || []; } catch (e) {}
            for (let i = 0; i < pids.length; i++) {
                try {
                    if (api.getPlayerDbId(pids[i]) === db) return pids[i];
                } catch (e2) {}
            }
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

export function releaseKill(targetId) {
    const e = CLAIMED[targetId];
    if (e && e.credited) return;
    delete CLAIMED[targetId];
}

export function creditKill(killerId, targetId, targetName) {
    if (!killerId || !targetId) return false;
    const realKiller = resolveOwnerId(killerId) || killerId;
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
        at: Date.now()
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
