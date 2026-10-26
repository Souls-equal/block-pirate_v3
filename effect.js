// utils/effect.js
import { setTimeout } from "./timer";
import { isAliveId, isStillAlive, safeEntityType } from "./lifeform";

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

export function applyEffect(targetId, effectId, duration, opts = {}) {
    // 🩹 plus jamais d'appel API sur une entité morte / despawn :
    // getEntityType et applyEffect THROW comme isAlive sur un id invalide.
    if (!targetId || !isAliveId(targetId)) return false;

    const displayName = opts.displayName;
    const icon = opts.icon;
    const inbuiltLevel = opts.inbuiltLevel !== undefined ? opts.inbuiltLevel : 1;

    // ── Type d'entité (sécurisé) ──
    const type = safeEntityType(targetId);
    if (type === null) return false;
    if (type === "NPC") {
        return false;
    } else {
        const effectOpts = { inbuiltLevel };
        if (displayName) effectOpts.displayName = displayName;
        if (icon) effectOpts.icon = icon;
        try { api.applyEffect(targetId, effectId, duration, effectOpts); } catch (e) {}
        return;
    }

    // ── 1. Récupérer le niveau actuel de l'effet (via l'API Bloxd) ──
    let currentLevel = 0;
    try { currentLevel = api.getEffectLevel(targetId, effectId) || 0; } catch (e0) {}

    // ── 2. Obtenir le niveau de base (effet permanent sous-jacent, ex: fruit) ──
    const baseLevel = getBaseEffectLevel(targetId, effectId);

    // ── 3. Cas : effet INFINI (duration === null) — c'est le niveau de base ──
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

    // ── 4. Cas : effet TEMPORAIRE (duration est un nombre > 0 en ms) ──
    const extraBonus = Math.max(0, currentLevel - baseLevel) + inbuiltLevel;
    const newLevel = baseLevel + extraBonus;

    const effectOpts = { inbuiltLevel: newLevel };
    if (displayName) effectOpts.displayName = displayName;
    if (icon) effectOpts.icon = icon;

    try { api.applyEffect(targetId, effectId, duration, effectOpts); } catch (e2) { return false; }

    // Planifie la restauration automatique à l'expiration
    scheduleEffectRestore(targetId, effectId, duration);
}

// ═══════════════════════════════════════════════════════════════
//  RESTAURATION DIFFÉRÉE — réapplique le niveau de base à l'expiration
// ═══════════════════════════════════════════════════════════════

function scheduleEffectRestore(playerId, effectId, duration) {
    // Dans le moteur Bloxd, 1 tick = 50ms (20 TPS)
    const delayTicks = Math.max(1, Math.round(duration / 50));

    setTimeout(() => {
        try {
            // 🩹 REMPLACE api.isAlive(playerId) qui throw sur une entité morte :
            // c'était la source exacte de "[Timer error] isAlive didn't work".
            // isStillAlive = cache des ids vivants + test de santé.
            if (!isStillAlive(playerId)) return;

            let currentLevel = 0;
            try { currentLevel = api.getEffectLevel(playerId, effectId) || 0; } catch (e0) {}
            const baseLevel = getBaseEffectLevel(playerId, effectId);

            // Si un effet temporaire plus récent a été appliqué par-dessus, ne rien faire
            if (currentLevel > baseLevel) return;

            // Restaure le niveau de base (effet permanent sous-jacent)
            if (baseLevel > 0) {
                try {
                    api.applyEffect(playerId, effectId, null, { inbuiltLevel: baseLevel });
                } catch (e1) {}
            } else {
                try { api.removeEffect(playerId, effectId); } catch (e2) {}
            }
        } catch (e) {
            // 🩹 un throw ici tuait le timer (et logguait à chaque tick).
            // On avale : la restauration d'un effet n'est jamais critique.
        }
    }, delayTicks);
}

// ═══════════════════════════════════════════════════════════════
//  SUPPRESSION D'EFFET — retire proprement un effet temporaire
//  et restaure le niveau de base si applicable
// ═══════════════════════════════════════════════════════════════

export function removeEffect(playerId, effectId) {
    if (!playerId || !isAliveId(playerId)) return;
    const baseLevel = getBaseEffectLevel(playerId, effectId);

    try { api.removeEffect(playerId, effectId); } catch (e) {}

    if (baseLevel > 0) {
        try { api.applyEffect(playerId, effectId, null, { inbuiltLevel: baseLevel }); } catch (e2) {}
    }
}
