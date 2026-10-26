//utils/combat.js
import { hakiBoost } from "./haki";
import { getDamageMultiplierForPoints, getStatLevel } from "../gameplay/stats";
import { dist2, distH2, segDist } from "./fx";
import { creditKill, noteMobSeen, recordDamager } from "./killAttribution";
import { noteUncreditedKill } from "./killfeed";
import {
    chest,
    eye,
    facing,
    getAliveMobIds,
    getAlivePlayerIds,
    isAliveId,
    isAliveIdFresh,
    isMobAlive,
    isPlayerAlive,
    isStillAlive,
    posOf,
    safeEntityName,
    safeEntityType,
    safeHealth,
    safePosition,
    targetBlock,
} from "./lifeform";
import { setTimeout } from "./timer";
export const summonOwner = {};
// expose for killAttribution without circular import
try { globalThis.__combatSummonOwner = summonOwner; } catch (e) {}

export function claimSummon(mobId, ownerId) { if (mobId && ownerId) { summonOwner[mobId] = ownerId; try { globalThis.__combatSummonOwner = summonOwner; } catch (e) {} } }
export function freeSummon(mobId) { if (mobId) { delete summonOwner[mobId]; try { globalThis.__combatSummonOwner = summonOwner; } catch (e) {} } }

export function getEffectiveKiller(id) {
    if (!id) return id;
    let cur = id;
    let seen = {};
    // follow summon chain (golem -> player, etc)
    for (let i = 0; i < 5; i++) {
        if (seen[cur]) break;
        seen[cur] = 1;
        const owner = summonOwner[cur];
        if (owner) { cur = owner; continue; }
        // fallback: ownerDbId set by Creation fruit
        try {
            const db = api.getMobSetting(cur, "ownerDbId", false);
            if (db) {
                // find player with this db id
                const players = getAlivePlayerIds();
                for (let j = 0; j < players.length; j++) {
                    try {
                        if (api.getPlayerDbId(players[j]) === db) { cur = players[j]; break; }
                    } catch (e) {}
                }
                // if we resolved via db, stop (avoid loop)
                if (cur !== id && summonOwner[cur] === undefined) {
                    // check if new cur is also a summon (nested)
                    continue;
                }
            }
        } catch (e) {}
        break;
    }
    return cur;
}

const HARD_CAP = 1e6;

/* MULTIPLICATEUR DE FORCE (stat "d") */
export function statLevel(id, key) {
    if (!id) return 0;
    try { const v = getStatLevel(id, key); if (typeof v === "number" && isFinite(v)) return v; }
    catch (e) {}
    return 0;
}

export function strengthMult(id) {
    try { return getDamageMultiplierForPoints(statLevel(id, "d")) || 1; }
    catch (e) { return 1; }
}

/* MARQUE DU PRÉDATEUR (+30 % de dégâts) */
export const marks = {};

export function markUntil(targetId, ms) {
    try { marks[targetId] = api.now() + ms; } catch (e) { marks[targetId] = Date.now() + ms; }
}
export function unmark(targetId) { delete marks[targetId]; }

/* SANTÉ */
function pushHealth(id, amount, who, broadcast) {
    try { return !!api.applyHealthChange(id, amount, who, broadcast); }
    catch (e) { return false; }
}

export function heal(id, amount) {
    const a = Math.floor(amount);
    if (a < 1 || !isAliveId(id)) return false;
    return pushHealth(id, a, undefined, false);
}

/* ─────────────────────────────────────────────────────────────
   DÉGÂTS — point d'entrée unique des fruits
   Fixes:
   - noteMobSeen AVANT le check isAliveId pour garantir mobData
   - isAliveIdFresh + safeHealth fallback pour ne pas rater un mob
     dont le cache est stale
   - résolution du propriétaire pour les invocations (Creation golem)
   - recordDamager AVANT applyHealthChange (déjà présent)
   - détection de mort robuste même si hpAfter null
   ───────────────────────────────────────────────────────────── */
export function damage(target, rawAmount, caster, itemName) {
    try {
        if (!target || !caster || target === caster) return false;

        // Toujours assurer mobData même si le cache alive est en retard
        const tTypeEarly = safeEntityType(target);
        if (tTypeEarly === "MOB") {
            try { noteMobSeen(target); } catch (e) {}
        }

        // Check alive plus tolérant: cache frais OU vie lisible
        let alive = false;
        try { alive = isAliveId(target) || isAliveIdFresh(target); } catch (e) { alive = false; }
        if (!alive) {
            const h = safeHealth(target);
            if (h === null || h <= 0) {
                // si on ne peut même pas lire la vie, on tente quand même si c'est un MOB
                // (le cache peut être vide juste après un spawn)
                if (tTypeEarly !== "MOB") return false;
            }
        }

        const type = safeEntityType(target);
        if (type === "NPC") return false;
        if (type === null) {
            // si on n'arrive pas à lire le type mais qu'on a une vie, on continue
            const h = safeHealth(target);
            if (h === null) return false;
        }

        // Résout le vrai tueur (golem -> owner)
        let effectiveCaster = getEffectiveKiller(caster) || caster;

        // si le caster effectif est invalide, on garde l'original pour ne pas perdre le coup
        if (!isAliveId(effectiveCaster) && !isAliveId(caster)) {
            // le caster peut être un joueur déco entre temps, mais on tente quand même
            // avec l'original si l'effectif est mort
            if (isAliveId(caster)) effectiveCaster = caster;
        }

        let amt = Math.round(Math.abs(rawAmount) * strengthMult(effectiveCaster) * 1.5);
        if (amt < 1) amt = 1;
        if (amt > HARD_CAP) amt = HARD_CAP;
        amt = hakiBoost(effectiveCaster, amt);

        try {
            const until = marks[target];
            if (until && api.now() < until) amt = Math.floor(amt * 1.3);
        } catch (e0) {}

        const item = itemName || "Ability";
        const victimName = safeEntityName(target);
        const casterName = safeEntityName(effectiveCaster);
        const hpBefore = safeHealth(target);

        if (type === "MOB" || tTypeEarly === "MOB") {
            try { noteMobSeen(target); } catch (e) {}
        }

        try { recordDamager(target, effectiveCaster, itemName); } catch (e1) {}

        let credited = false;
        try {
            credited = pushHealth(target, -amt, { lifeformId: effectiveCaster, withItem: item }, true);
        } catch (e) { credited = false; }

        let hpAfter = safeHealth(target);
        let landed = credited;

        if (!credited) {
            const appliedAnyway = (hpBefore !== null && hpAfter !== null && hpAfter < hpBefore)
                               || (hpAfter === null && hpBefore !== null && hpBefore > 0);
            if (appliedAnyway) {
                landed = true;
            } else {
                // second essai sans attribution (toujours mieux que rien)
                try { landed = pushHealth(target, -amt, undefined, false); } catch (e) { landed = false; }
                hpAfter = safeHealth(target);
            }
        }

        try { aggro(target, effectiveCaster); } catch (e) {}

        const enoughToKill = hpBefore !== null && amt >= hpBefore;
        const fatal = (hpAfter !== null && hpAfter <= 0)
                   || (hpAfter === null && hpBefore !== null && hpBefore > 0 && (enoughToKill || !isAliveIdFresh(target)))
                   || (enoughToKill && !isAliveIdFresh(target));

        if (!landed && !fatal) return false;

        if (!credited && fatal) {
            try { noteUncreditedKill(target, effectiveCaster, item, victimName, casterName); } catch (e) {}
        }

        if (fatal && (type === "MOB" || tTypeEarly === "MOB")) {
            try { creditKill(effectiveCaster, target, victimName); } catch (e2) {}
        }
        return true;
    } catch (eTop) {
        return false;
    }
}

/* MOUVEMENT / EFFETS */
export function impulse(id, x, y, z) {
    if (!isAliveId(id)) return false;
    if (safeEntityType(id) === "NPC") return false;
    try { return !!api.applyImpulse(id, x, y, z); }
    catch (e) { return false; }
}

export function setVel(id, x, y, z) {
    if (!isAliveId(id)) return false;
    try { return !!api.setVelocity(id, x, y, z); }
    catch (e) { return false; }
}

export function eff(id, name, duration, opts) {
    return applyEffect(id, name, duration, opts);
}

export function aggro(targetId, casterId) {
    if (!targetId || !casterId || targetId === casterId) return
    if (summonOwner[targetId] === casterId) return
    const effCaster = getEffectiveKiller(casterId) || casterId;
    if (summonOwner[targetId] === effCaster) return
    try {
        var ids = api.getMobIds() || [], i, isMob = false
        for (i = 0; i < ids.length; i++) if (ids[i] === targetId) { isMob = true; break }
        if (!isMob) return
        var st = null
        try { st = api.getMobAiState(targetId) } catch (e0) {}
        if (st && st.state === "chasing" && st.params && st.params.targetId === effCaster) return
        api.setMobAiState(targetId, "chasing", { targetId: effCaster })
    } catch (e) {}
}


export { aggro as markAggro };

/* CIBLES */
export function entitiesIn(min, max) {
    try { return api.getEntitiesInRect(min, max) || []; }
    catch (e) { return []; }
}

export function lifeforms(exclude) {
    const p = getAlivePlayerIds();
    const m = getAliveMobIds();
    const out = [];
    for (let i = 0; i < p.length; i++) if (p[i] !== exclude) out.push(p[i]);
    for (let i = 0; i < m.length; i++) if (m[i] !== exclude) out.push(m[i]);
    return out;
}

const HITBOX_PAD = 1.35;
const BODY_LOW = -0.3;
const BODY_HIGH = 2.0;

function gatherTargets(min, max, exclude) {
    const out = [];
    const seen = new Set();
    if (exclude) seen.add(exclude);
    const all = lifeforms(exclude);
    for (let i = 0; i < all.length; i++) {
        const id = all[i];
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push(id);
    }
    const rect = entitiesIn(min, max);
    for (let i = 0; i < rect.length; i++) {
        const id = rect[i];
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push(id);
    }
    return out;
}

export function inSphere(center, radius, cb) {
    const effR = radius + HITBOX_PAD;
    const r2 = effR * effR;
    const list = gatherTargets(
        [center[0] - effR, center[1] - effR - 2, center[2] - effR],
        [center[0] + effR, center[1] + effR + 2, center[2] + effR]
    );
    for (let i = 0; i < list.length; i++) {
        const id = list[i];
        if (!isAliveId(id) || safeEntityType(id) === "NPC") continue;
        const p = posOf(id);
        if (!p) continue;
        const cy = Math.max(p[1] + BODY_LOW, Math.min(p[1] + BODY_HIGH, center[1]));
        const dx = p[0] - center[0], dy = cy - center[1], dz = p[2] - center[2];
        if (dx * dx + dy * dy + dz * dz <= r2) cb(id, p);
    }
}

export function inCylinder(center, radius, height, cb, floorDrop) {
    const effR = radius + HITBOX_PAD;
    const r2 = effR * effR;
    const drop = (floorDrop === undefined ? 2.5 : floorDrop) + 1.2;
    const top = (height === undefined ? 3.0 : height) + 1.4;
    const list = gatherTargets(
        [center[0] - effR, center[1] - drop - 2, center[2] - effR],
        [center[0] + effR, center[1] + top + 2, center[2] + effR]
    );
    for (let i = 0; i < list.length; i++) {
        const id = list[i];
        if (!isAliveId(id) || safeEntityType(id) === "NPC") continue;
        const p = posOf(id);
        if (!p) continue;
        if (
            distH2(p, center) <= r2 &&
            p[1] + BODY_HIGH >= center[1] - drop &&
            p[1] + BODY_LOW <= center[1] + top
        ) {
            cb(id, p);
        }
    }
}

export function hitArea(center, radius, caster, item, dmg, opts) {
    const o = opts || {};
    let count = 0;
    const run = (id, p) => {
        if (id === caster) return;
        count++;
        if (damage(id, dmg, caster, item)) {
            if (o.knock || o.lift) {
                const dx = p[0] - center[0], dz = p[2] - center[2];
                const h = Math.sqrt(dx * dx + dz * dz) || 1;
                impulse(id, (dx / h) * (o.knock || 0), o.lift || 0, (dz / h) * (o.knock || 0));
            }
            if (o.slow) eff(id, "Slowness", o.slow[0], { inbuiltLevel: o.slow[1] || 1 });
            if (o.effect) eff(id, o.effect[0], o.effect[1], { inbuiltLevel: o.effect[2] || 1 });
            if (o.onHit) o.onHit(id, p);
        }
    };
    if (o.height === undefined) inSphere(center, radius, run);
    else inCylinder(center, radius, o.height, run, o.floorDrop);
    return count;
}

export function hitSeg(a, b, radius, caster, item, dmg, opts) {
    const o = opts || {};
    const effR = radius + HITBOX_PAD;
    const r2 = effR * effR;
    const pad = effR + 2.0;
    const list = gatherTargets(
        [Math.min(a[0], b[0]) - pad, Math.min(a[1], b[1]) - pad, Math.min(a[2], b[2]) - pad],
        [Math.max(a[0], b[0]) + pad, Math.max(a[1], b[1]) + pad, Math.max(a[2], b[2]) + pad],
        caster
    );
    let count = 0;
    let best = { t: 1, c: b };
    const seen = {};
    for (let i = 0; i < list.length; i++) {
        const id = list[i];
        if (id === caster || !isAliveId(id) || safeEntityType(id) === "NPC") continue;
        const p = safePosition(id);
        if (!p) continue;
        const s0 = segDist([p[0], p[1] + 0.25, p[2]], a, b);
        const s1 = segDist([p[0], p[1] + 1.0, p[2]], a, b);
        const s2 = segDist([p[0], p[1] + 1.75, p[2]], a, b);
        let s = s0.d2 <= s1.d2 ? s0 : s1;
        if (s2.d2 < s.d2) s = s2;
        if (s.d2 > r2) continue;
        count++;
        seen[id] = 1;
        if (dmg > 0) damage(id, dmg, caster, item);
        if (o.slow) eff(id, "Slowness", o.slow[0], { inbuiltLevel: o.slow[1] || 1 });
        if (o.effect) eff(id, o.effect[0], o.effect[1], { inbuiltLevel: o.effect[2] || 1 });
        if (o.knock || o.lift) {
            const dir = [b[0] - a[0], 0, b[2] - a[2]];
            const h = Math.sqrt(dir[0] * dir[0] + dir[2] * dir[2]) || 1;
            impulse(id, (dir[0] / h) * (o.knock || 0), o.lift || 0, (dir[2] / h) * (o.knock || 0));
        }
        if (o.onHit) o.onHit(id, s.c);
        if (s.t < best.t) best = { t: s.t, c: s.c };
    }
    return { point: best.c, count: count, seen: seen };
}

export function pickTarget(caster, origin, dir, range, coneCos, filter) {
    const ids = lifeforms(caster);
    let inCone = null, coneD = range * range;
    let any = null, anyD = range * range;
    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        if (!isAliveId(id) || safeEntityType(id) === "NPC") continue;
        if (filter && !filter(id)) continue;
        const p = posOf(id);
        if (!p) continue;
        const dx = p[0] - origin[0], dy = (p[1] + 0.9) - origin[1], dz = p[2] - origin[2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > range * range || d2 < 0.01) continue;
        if (d2 < anyD) { anyD = d2; any = id; }
        const inv = 1 / Math.sqrt(d2);
        if ((dx * dir[0] + dy * dir[1] + dz * dir[2]) * inv >= coneCos && d2 < coneD) {
            coneD = d2; inCone = id;
        }
    }
    return inCone || any;
}

export function nearest(pos, maxDist, caster) {
    const ids = lifeforms(caster);
    let best = null, bestD = maxDist * maxDist;
    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        if (!isAliveId(id) || safeEntityType(id) === "NPC") continue;
        const p = posOf(id);
        if (!p) continue;
        const d2 = dist2(p, pos);
        if (d2 < bestD) { bestD = d2; best = id; }
    }
    return best;
}

/* DIVERS */
export function grounded(id) {
    try { return (api.getBlockCoordinatesPlayerStandingOn(id) || []).length > 0; }
    catch (e) { return false; }
}

export function teleport(id, x, y, z) {
    if (!isAliveId(id)) return false;
    try { api.setPosition(id, x, y, z); return true; }
    catch (e) { return false; }
}

export {
    isAliveId, isStillAlive, isPlayerAlive, isMobAlive,
    posOf, safePosition, safeEntityName, safeEntityType, safeHealth,
    facing, chest, eye, targetBlock,
};

/* utils/effect.js */

/* REGISTRE DES NIVEAUX DE BASE (effets permanents / fruit, etc.) */

const baseEffectLevel = {};

export function setBaseEffectLevel(playerId, effectId, inbuiltLevel) {
    if (!baseEffectLevel[playerId]) baseEffectLevel[playerId] = {};
    baseEffectLevel[playerId][effectId] = {
        level: inbuiltLevel,
        duration: null
    };
}

export function getBaseEffectLevel(playerId, effectId) {
    return baseEffectLevel[playerId]?.[effectId]?.level ?? 0;
}

export function getBaseEffectDuration(playerId, effectId) {
    return baseEffectLevel[playerId]?.[effectId]?.duration ?? null;
}

export function clearPlayerEffects(playerId) {
    delete baseEffectLevel[playerId];
}

/* FONCTION PRINCIPALE — applyEffect custom avec cumul + restauration */

export function applyEffect(targetId, effectId, duration, opts = {}) {

    if (!targetId || !isAliveId(targetId)) return false;

    const displayName = opts.displayName;
    const icon = opts.icon;
    const inbuiltLevel = opts.inbuiltLevel !== undefined ? opts.inbuiltLevel : 1;

    const type = safeEntityType(targetId);
    if (type === null) return false;
    if (type === "NPC") return false;

    if (type === "MOB") {
        const effectOpts = { inbuiltLevel };
        if (displayName) effectOpts.displayName = displayName;
        if (icon) effectOpts.icon = icon;
        try { api.applyEffect(targetId, effectId, duration, effectOpts); } catch (e) {}
        return;
    }

    let currentLevel = 0;
    try { currentLevel = api.getEffectLevel(targetId, effectId) || 0; } catch (e0) {}

    const baseLevel = getBaseEffectLevel(targetId, effectId);

    if (duration === null || duration === undefined) {
        setBaseEffectLevel(targetId, effectId, inbuiltLevel);

        const tempBonus = Math.max(0, currentLevel - baseLevel);
        const newLevel = inbuiltLevel + tempBonus;

        const effectOpts = { inbuiltLevel: newLevel };
        if (displayName) effectOpts.displayName = displayName;
        if (icon) effectOpts.icon = icon;

        try { api.applyEffect(targetId, effectId, null, effectOpts); } catch (e1) {}
        return;
    }

    const extraBonus = Math.max(0, currentLevel - baseLevel) + inbuiltLevel;
    const newLevel = baseLevel + extraBonus;

    const effectOpts = { inbuiltLevel: newLevel };
    if (displayName) effectOpts.displayName = displayName;
    if (icon) effectOpts.icon = icon;

    try { api.applyEffect(targetId, effectId, duration, effectOpts); } catch (e2) { return false; }

    scheduleEffectRestore(targetId, effectId, duration);
}

/* RESTAURATION DIFFÉRÉE — réapplique le niveau de base à l'expiration */

function scheduleEffectRestore(playerId, effectId, duration) {

    const delayTicks = Math.max(1, Math.round(duration / 50));

    setTimeout(() => {
        try {

            if (!isStillAlive(playerId)) return;

            let currentLevel = 0;
            try { currentLevel = api.getEffectLevel(playerId, effectId) || 0; } catch (e0) {}
            const baseLevel = getBaseEffectLevel(playerId, effectId);

            if (currentLevel > baseLevel) return;

            if (baseLevel > 0) {
                try {
                    api.applyEffect(playerId, effectId, null, { inbuiltLevel: baseLevel });
                } catch (e1) {}
            } else {
                try { api.removeEffect(playerId, effectId); } catch (e2) {}
            }
        } catch (e) {

        }
    }, delayTicks);
}

/* SUPPRESSION D'EFFET — retire proprement un effet temporaire */

export function removeEffect(playerId, effectId) {
    if (!playerId || !isAliveId(playerId)) return;
    const baseLevel = getBaseEffectLevel(playerId, effectId);

    try { api.removeEffect(playerId, effectId); } catch (e) {}

    if (baseLevel > 0) {
        try { api.applyEffect(playerId, effectId, null, { inbuiltLevel: baseLevel }); } catch (e2) {}
    }
}
