// utils/lifeform.js
import { norm } from "./fx";
import { txt } from "../core/theme";

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

export function isNpcEntity(id) {
    if (!id) return false;
    try {
        const t = api.getEntityType(id);
        if (t === "NPC" || (typeof t === "string" && t.toLowerCase() === "npc")) return true;
    } catch (e) {}
    return false;
}

export function refreshAliveCache(force) {
    const n = nowMs();
    if (!force && state.t && (n - state.t) < ALIVE_TTL_MS) return;
    state.t = n;

    let p = [], m = [];
    try { p = api.getPlayerIds() || []; } catch (e) { p = []; }
    try { m = api.getMobIds() || []; } catch (e2) { m = []; }

    const mobsFiltered = [];
    for (let i = 0; i < m.length; i++) {
        if (!isNpcEntity(m[i])) mobsFiltered.push(m[i]);
    }

    state.playersArr = p;
    state.mobsArr = mobsFiltered;
    state.players = toSet(p);
    state.mobs = toSet(mobsFiltered);
}

/* CHECKS — FIX: fallback sur safeHealth pour éviter faux négatif du cache */

export function isMobEntityType(type) {
    if (!type || typeof type !== "string") return false;
    if (
        type === "Player" ||
        type === "PLAYER" ||
        type === "NPC" ||
        type === "Item" ||
        type === "Mesh"
    ) {
        return false;
    }
    const low = type.toLowerCase();
    if (
        low === "player" ||
        low === "npc" ||
        low === "item" ||
        low === "mesh" ||
        low.indexOf("throw") !== -1 ||
        low.indexOf("proj") !== -1
    ) {
        return false;
    }
    return true;
}

export function isPlayerAlive(id) {
    if (!id || isNpcEntity(id)) return false;
    refreshAliveCache();
    if (state.players.has(id)) return true;
    // fallback: si on peut lire sa vie, c'est qu'il existe
    try {
        const tp = api.getEntityType(id);
        if (tp && tp !== "Player" && tp !== "PLAYER") return false;
        const h = api.getHealth(id);
        if (typeof h === "number" && h > 0) {
            // c'est un joueur vivant mais pas encore dans le cache
            return true;
        }
    } catch (e) {}
    return false;
}

export function isMobAlive(id) {
    if (!id || isNpcEntity(id)) return false;
    refreshAliveCache();
    if (state.mobs.has(id)) return true;
    try {
        const t = api.getEntityType(id);
        if (isMobEntityType(t)) {
            const h = api.getHealth(id);
            if (typeof h === "number" && h > 0) return true;
        }
    } catch (e) {}
    return false;
}

/* Joueur connecte ? Lecture du cache (aucun appel API) : sert aux gardes de
   mouvement, appelees en boucle sur des tas de cibles. */
export function isOnlinePlayer(id) {
    if (!id) return false;
    refreshAliveCache();
    return state.players.has(id);
}

export function isAliveId(id) {
    if (!id || isNpcEntity(id)) return false;
    refreshAliveCache();
    if (state.players.has(id) || state.mobs.has(id)) return true;
    // FIX: cache stale juste après spawn -> on tente lecture directe
    try {
        const tp = api.getEntityType(id);
        if (tp === "NPC" || (typeof tp === "string" && tp.toLowerCase() === "npc")) return false;
        const h = api.getHealth(id);
        if (typeof h === "number" && h > 0) return true;
        // même si vie 0, si type mob ou Player et lisible, on considère vivant pour le hit
        if (tp === "Player" || isMobEntityType(tp)) return true;
    } catch (e) {}
    return false;
}

export function isLifeform(id) {
    return isAliveId(id);
}

export function isAliveIdFresh(id) {
    if (!id || isNpcEntity(id)) return false;
    refreshAliveCache(true);
    if (state.players.has(id) || state.mobs.has(id)) return true;
    try {
        const tp = api.getEntityType(id);
        if (tp === "NPC" || (typeof tp === "string" && tp.toLowerCase() === "npc")) return false;
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

/* Distance au sol (x/z) et distance dans l'espace, entre deux positions
   deja lues. Deux fichiers les reecrivaient a la main (boss,
   saber) : une seule forme ici, donc un seul arrondi a corriger si besoin. */
export function dist2(a, b) {
    const dx = a[0] - b[0], dz = a[2] - b[2];
    return Math.sqrt(dx * dx + dz * dz);
}

export function dist3(a, b) {
    const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/* api.isAlive en version qui ne leve jamais. isAliveId() repond depuis le
   cache (plus rapide) ; celle-ci interroge le moteur, ce que veulent les
   boucles de boss qui ne tournent que toutes les 20 ms. */
export function aliveNow(id) {
    if (!id) return false;
    try { return !!api.isAlive(id); } catch (e) { return false; }
}

/* nameTagInfo d'un mob ou d'un boss. boss.js et saber.js construisaient le
   meme objet avec deux fonds et deux graisses differents : ce qui changeait
   est un parametre (fond, bordure, graisse), le reste est ecrit une fois. */
export function nameTagInfo(title, subtitle, colour, background, border, weight) {
    const info = {
        content: [txt(title, colour, { fontWeight: weight || "bold" })],
        healthbar: {
            display: "always",
            foregroundColour: colour,
            backgroundColour: background || "#2a1210",
        },
        border: { colour: border || colour, style: "solid" },
    };
    if (subtitle) info.subtitle = [txt(subtitle, "#ffb347")];
    return info;
}


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