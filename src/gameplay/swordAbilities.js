// Abilities custom pour les sabres et katanas.
import { applyEffect, damage, entitiesIn } from "../utils/combat";
import { facing, posOf } from "../utils/lifeform";
import { point, at as soundAt, TEX } from "../utils/fx";
import { nowMs, run, sleep } from "../utils/timer";
import { tryDash } from "./stamina";

/* Les items restent de vraies armes Bloxd : clic gauche = coup natif, donc le
   scaling Damage/Defense et l'attribution du combat restent dans les hooks.
   Clic droit lance le pouvoir; sneak + clic droit utilise le dash de stamina. */
export const CUSTOM_SABERS = {
    "Iron Sword": { range: 10, width: 1.25, damage: 18, cooldown: 1500, color: [170, 230, 255], speed: 0 },
    "Gold Sword": { range: 12, width: 1.65, damage: 22, cooldown: 1900, color: [255, 205, 75], speed: 0 },
    "Diamond Sword": { range: 13, width: 1.4, damage: 26, cooldown: 2200, color: [90, 240, 255], dash: true, speed: 0 },
    "Knight Sword": { range: 9, width: 1.2, damage: 20, cooldown: 1300, color: [220, 225, 245], dash: true, speed: 0 },
    "Moonstone Sword": { range: 16, width: 1.55, damage: 25, cooldown: 2100, color: [170, 130, 255], speed: 1 },
    "Astral Sword": { range: 14, width: 1.35, damage: 24, cooldown: 1700, color: [110, 190, 255], dash: true, speed: 1 },
    "Sanguine Sword": { range: 10, width: 1.1, damage: 30, cooldown: 2400, color: [255, 65, 90], speed: 0 },
    "Nova Blade": { range: 18, width: 1.7, damage: 28, cooldown: 2600, color: [255, 150, 55], speed: 2 },
};

const cooldownUntil = {};
const nextPassiveAt = {};
let nextPlayerScanAt = 0;

function heldName(playerId) {
    try {
        const held = api.getHeldItem(playerId);
        return held && (held.name || held.type) || null;
    } catch (e) { return null; }
}

function launchSlash(playerId, itemName, cfg) {
    const origin = posOf(playerId);
    if (!origin) return;
    const dir = facing(playerId);
    let right = [-dir[2], 0, dir[0]];
    const rightLen = Math.sqrt(right[0] * right[0] + right[2] * right[2]);
    if (rightLen < 0.01) right = [1, 0, 0];
    else right = [right[0] / rightLen, 0, right[2] / rightLen];

    const start = [origin[0] + dir[0] * 1.15, origin[1] + 1.25, origin[2] + dir[2] * 1.15];
    const hit = {};
    const step = 0.8;
    let distance = 0;
    soundAt(playerId, "bigDrumSwish1", 0.85, 1.1 + Math.random() * 0.2, 24);

    run({
        next: function () {
            if (distance > cfg.range) return { done: true };
            const t = Math.min(1, distance / cfg.range);
            const center = [start[0] + dir[0] * distance, start[1] + dir[1] * distance, start[2] + dir[2] * distance];
            const arcWidth = Math.sin(t * Math.PI) * cfg.width;
            for (let n = -2; n <= 2; n++) {
                const side = n / 2;
                const pos = [center[0] + right[0] * side * arcWidth, center[1] + Math.sin((side + 1) * Math.PI / 2) * 0.35, center[2] + right[2] * side * arcWidth];
                point(pos, {
                    r: 0.16, tex: n === 0 ? TEX.crit : TEX.glint, count: 2,
                    life: [0.12, 0.28], power: [0.08, 0.3], size: [0.22, 0.5],
                    dir: [dir[0] * 0.4, 0.08, dir[2] * 0.4], dirSpread: 0.12,
                    colors: [[cfg.color, [255, 255, 255]], [cfg.color, [cfg.color[0], cfg.color[1], cfg.color[2], 0]]],
                });
            }

            const pad = cfg.width + 1.6;
            const near = entitiesIn(
                [center[0] - pad, center[1] - 1.7, center[2] - pad],
                [center[0] + pad, center[1] + 1.7, center[2] + pad]
            );
            for (let i = 0; i < near.length; i++) {
                const target = near[i];
                if (target === playerId || hit[target]) continue;
                const p = posOf(target);
                if (!p) continue;
                const dx = p[0] - center[0], dz = p[2] - center[2];
                const dy = p[1] + 1 - center[1];
                const forward = dx * dir[0] + dz * dir[2];
                const lateral = Math.abs(dx * right[0] + dz * right[2]);
                if (Math.abs(forward) > step + 1.1 || lateral > arcWidth + 0.9 || Math.abs(dy) > 1.9) continue;
                hit[target] = true;
                damage(target, cfg.damage, playerId, itemName);
            }
            distance += step;
            return distance > cfg.range ? { done: true } : { value: sleep(1), done: false };
        }
    });
}

/* Retourne true quand l'arme en main est gérée par ce module. */
export function useCustomSwordAbility(playerId) {
    const itemName = heldName(playerId);
    const cfg = CUSTOM_SABERS[itemName];
    if (!cfg) return false;

    let crouching = false;
    try { crouching = api.isPlayerCrouching(playerId); } catch (e) {}
    if (crouching && cfg.dash) {
        /* Réutilise le dash du jeu: coût de stamina, animation et verrou de
           mêlée compris. */
        try { tryDash(playerId); } catch (e) {}
        return true;
    }

    const now = nowMs();
    if ((cooldownUntil[playerId] || 0) > now) return true;
    cooldownUntil[playerId] = now + cfg.cooldown;
    launchSlash(playerId, itemName, cfg);
    return true;
}

/* Les lames enchantées donnent une accélération courte tant qu'elles restent
   en main. L'effet expire naturellement peu après le changement d'item. */
export function tickSwordAbilities() {
    let players = [];
    try { players = api.getPlayerIds() || []; } catch (e) { return; }
    const now = nowMs();
    if (now < nextPlayerScanAt) return;
    nextPlayerScanAt = now + 250;
    for (let i = 0; i < players.length; i++) {
        const playerId = players[i];
        const cfg = CUSTOM_SABERS[heldName(playerId)];
        if (!cfg || !cfg.speed || (nextPassiveAt[playerId] || 0) > now) continue;
        nextPassiveAt[playerId] = now + 700;
        try {
            applyEffect(playerId, "Speed", 1200, {
                inbuiltLevel: cfg.speed,
                source: "custom-sword-passive",
                casterId: playerId,
                displayName: "Sword Agility",
                icon: "Updraft",
            });
        } catch (e) {}
    }
}

export function clearSwordAbilities(playerId) {
    delete cooldownUntil[playerId];
    delete nextPassiveAt[playerId];
}
