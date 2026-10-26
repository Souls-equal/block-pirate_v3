// utils/lifeform.js
import { norm } from "./fx";

const ALIVE_TTL_MS = 80;

const state = {
    t: 0,
    players: new Set(),
    mobs: new Set(),
    playersArr: [],
    mobsArr: [],
};

function nowMs() {
    try { const n = api.now(); if (typeof n === "number" && n > 0) return n; } catch (e) {}
    return Date.now();
}

function toSet(ids) {
    const s = new Set();
    for (let i = 0; i < ids.length; i++) s.add(ids[i]);
    return s;
}

export function refreshAliveCache(force) {
    const n = nowMs();
    if (!force && state.t && (n - state.t) < ALIVE_TTL_MS) return;
    state.t = n;

    let p = [], m = [];
    try { p = api.getPlayerIds() || []; } catch (e) { p = []; }
    try { m = api.getMobIds() || []; } catch (e2) { m = []; }

    state.playersArr = p;
    state.mobsArr = m;
    state.players = toSet(p);
    state.mobs = toSet(m);
}

/* CHECKS — FIX: fallback sur safeHealth pour éviter faux négatif du cache */

export function isPlayerAlive(id) {
    if (!id) return false;
    refreshAliveCache();
    if (state.players.has(id)) return true;
    // fallback: si on peut lire sa vie, c'est qu'il existe
    try {
        const h = api.getHealth(id);
        if (typeof h === "number" && h > 0) {
            // c'est un joueur vivant mais pas encore dans le cache
            return true;
        }
    } catch (e) {}
    return false;
}

export function isMobAlive(id) {
    if (!id) return false;
    refreshAliveCache();
    if (state.mobs.has(id)) return true;
    try {
        const t = api.getEntityType(id);
        if (t === "MOB") {
            const h = api.getHealth(id);
            if (typeof h === "number" && h > 0) return true;
        }
    } catch (e) {}
    return false;
}

export function isAliveId(id) {
    if (!id) return false;
    refreshAliveCache();
    if (state.players.has(id) || state.mobs.has(id)) return true;
    // FIX: cache stale juste après spawn -> on tente lecture directe
    try {
        const h = api.getHealth(id);
        if (typeof h === "number" && h > 0) return true;
        // même si vie 0, si type MOB/PLAYER et lisible, on considère vivant pour le hit
        const tp = api.getEntityType(id);
        if (tp === "MOB" || tp === "PLAYER") return true;
    } catch (e) {}
    return false;
}

export function isLifeform(id) {
    return isAliveId(id);
}

export function isAliveIdFresh(id) {
    if (!id) return false;
    refreshAliveCache(true);
    if (state.players.has(id) || state.mobs.has(id)) return true;
    try {
        const h = api.getHealth(id);
        if (typeof h === "number" && h > 0) return true;
    } catch (e) {}
    return false;
}

export function isStillAlive(id) {
    if (!isAliveId(id)) return false;
    if (isMobAlive(id)) return true;
    try {
        const h = api.getHealth(id);
        if (typeof h === "number" && h <= 0) return false;
    } catch (e) {}
    return true;
}

/* LISTES CACHÉES */

export function getAlivePlayerIds() { refreshAliveCache(); return state.playersArr; }
export function getAliveMobIds() { refreshAliveCache(); return state.mobsArr; }
export function getAliveLifeformIds() { refreshAliveCache(); return state.playersArr.concat(state.mobsArr); }

export function forgetAliveId(id) {
    if (!id) return;
    state.players.delete(id);
    state.mobs.delete(id);
}

/* ACCÈS SÉCURISÉS (ne throw JAMAIS) */

export function safeEntityName(id) {
    if (!id) return null;
    try { return api.getEntityName(id) || null; } catch (e) { return null; }
}

export function safeEntityType(id) {
    if (!id) return null;
    try { return api.getEntityType(id) || null; } catch (e) { return null; }
}

export function safeHealth(id) {
    if (!id) return null;
    try { const h = api.getHealth(id); return (typeof h === "number" && isFinite(h)) ? h : null; } catch (e) { return null; }
}

export function safePosition(id) {
    if (!id) return null;
    try { return api.getPosition(id) || null; } catch (e) { return null; }
}

/* POSITIONS & VISEE */

export function posOf(id) { return safePosition(id); }

export function facing(id) {
    try {
        const i = api.getPlayerFacingInfo(id);
        if (i && i.dir) return norm(i.dir);
    } catch (e) {}
    return [0, 0, 1];
}

export function facingInfo(id) {
    try { return api.getPlayerFacingInfo(id) || null; } catch (e) { return null; }
}

export function heading(id) {
    const i = facingInfo(id);
    return (i && typeof i.moveHeading === "number") ? i.moveHeading : 0;
}

export function chest(id, off) {
    const p = safePosition(id);
    return p ? [p[0], p[1] + (off === undefined ? 0.9 : off), p[2]] : null;
}

export function eye(id, off) {
    const p = safePosition(id);
    return p ? [p[0], p[1] + (off === undefined ? 1.45 : off), p[2]] : null;
}

export function targetBlock(id) {
    let info = null;
    try { info = api.getPlayerTargetBlock(id); } catch (e) { info = null; }
    if (!info || !(info.adjacent || info.position)) {
        try { info = api.getPlayerTargetInfo(id); } catch (e2) { info = null; }
    }
    if (!info) return null;
    if (info.adjacent) return [info.adjacent[0] + 0.5, info.adjacent[1] + 0.1, info.adjacent[2] + 0.5];
    if (info.position) return [info.position[0] + 0.5, info.position[1] + 1.05, info.position[2] + 0.5];
    return null;
}