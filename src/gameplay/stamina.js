// stamina.js

import { setInterval } from "../utils/timer";

/* PARAMÈTRES — modifiez tout ici */
export const STAMINA_CONFIG = {
    enabled:              true,
    max:                  100,
    staminaPerStatPoint:  10,
    regenPerSecPercent:   5,
    regenDelayMs:         2000,
    airJumpCost:          8,
    dashCost:             13,
    airJumpHeadroom:      10,

    loopTicks:            1,
    dvySpike:             1.2,
    vyJumpMin:            4,
    tickMs:               500,
};

/* ÉTAT PAR JOUEUR */
const players = {};

let lastTickAt = 0;
let loopTimer = null;
let displayHook = null;

/* HELPERS */
function getMaxFor(p) {
    return STAMINA_CONFIG.max + (p ? (p.bonusMax || 0) : 0);
}

function safeInt(v, lo, hi) {
    v = Math.floor(Number(v) || 0);
    return Math.max(lo, Math.min(hi, v));
}

function dispKey(p) {
    const max = getMaxFor(p);
    return Math.round(p.st) + "|" + Math.floor((p.st / max) * 100);
}

function notify(playerId, force) {
    const p = players[playerId];
    if (!p || !displayHook) return;
    if (!Number.isFinite(p.st)) p.st = 0;
    const key = dispKey(p);
    if (!force && key === p.lastDisp) return;
    p.lastDisp = key;
    try { displayHook(playerId); }
    catch (e) { try { api.log("[stamina] sidebar hook error: " + e); } catch (e2) {} }
}

function airJumpsForMax(max) {
    max = Number(max);
    if (!Number.isFinite(max) || max <= 0) max = STAMINA_CONFIG.max;
    const cost = Number(STAMINA_CONFIG.airJumpCost) || 20;
    return safeInt(Math.ceil(max / cost) + (STAMINA_CONFIG.airJumpHeadroom || 0), 0, 50);
}

function syncAirJumpGate(playerId) {
    const p = players[playerId];
    let allow = (!p || p.st > 0) ? airJumpsForMax(getMaxFor(p)) : 0;
    allow = safeInt(allow, 0, 50);
    try { api.setClientOptions(playerId, { airJumpCount: allow }); }
    catch (e) { try { api.log("[stamina] gate error (" + allow + "): " + e); } catch (e2) {} }
}

function ensureState(playerId) {
    let p = players[playerId];
    if (!p) { staminaJoin(playerId); p = players[playerId]; }
    return p;
}

function chargeAirJump(playerId) {
    const p = players[playerId];
    if (!p || p.st <= 0) { syncAirJumpGate(playerId); return; }
    p.st = Math.max(0, (p.st || 0) - STAMINA_CONFIG.airJumpCost);
    if (!Number.isFinite(p.st)) p.st = 0;
    p.lastSpend = Date.now();
    syncAirJumpGate(playerId);
    notify(playerId);
}

/* LOOP PHYSIQUE (à chaque tick) */
function startImpulseLoop() {
    if (loopTimer) return;
    loopTimer = setInterval(() => {
        if (!STAMINA_CONFIG.enabled) return;
        let ids = [];
        try { ids = api.getPlayerIds() || []; } catch (e) { return; }

        for (const pid of ids) {
            if (!players[pid]) continue;
            const p = players[pid];

            let vy = null;
            try { const v = api.getVelocity(pid); vy = Array.isArray(v) ? v[1] : null; }
            catch (e) {}
            if (vy === null || !Number.isFinite(vy)) { p.prevAir = false; continue; }

            let grounded = false;
            try { grounded = ((api.getBlockCoordinatesPlayerStandingOn(pid)).length || 0) > 0; }
            catch (e) {}

            const air = !grounded;
            const dvy = (p.prevVy !== null && Number.isFinite(p.prevVy)) ? (vy - p.prevVy) : 0;

            if (!air) {

                p.armed = true;
            } else if (p.armed && p.prevAir && dvy >= STAMINA_CONFIG.dvySpike && vy >= STAMINA_CONFIG.vyJumpMin) {

                p.armed = false;

                let water = false;
                try {
                    const pos = api.getPosition(pid);
                    const [x, y, z] = Array.isArray(pos) ? pos : [0, 0, 0];
                    water = api.getBlock(x, y, z) === "Water" || api.getBlock(x, y - 1, z) === "Water";
                } catch (e) {}
                if (!water) chargeAirJump(pid);
            } else if (dvy <= 0) {

                p.armed = true;
            }

            p.prevVy = grounded ? 0 : vy;
            p.prevAir = air;
        }
    }, Math.max(1, Math.floor(STAMINA_CONFIG.loopTicks)));
}

/* API POUR LES AUTRES FICHIERS */
export function getMaxStamina(playerId) {
    return getMaxFor(players[playerId]);
}

export function getStamina(playerId) {
    const p = players[playerId];
    const v = p ? p.st : getMaxFor(null);
    return Number.isFinite(v) ? v : 0;
}

export function getMaxAirJumps(playerId) {
    const p = players[playerId];
    if (!p || p.st > 0) return airJumpsForMax(getMaxFor(p));
    return 0;
}

export function setStaminaUpdateHook(fn) {
    displayHook = typeof fn === "function" ? fn : null;
}

export function setStaminaBonus(playerId, statLevel) {
    const p = ensureState(playerId);
    p.bonusMax = (statLevel || 0) * STAMINA_CONFIG.staminaPerStatPoint;
    if (p.st > getMaxFor(p)) p.st = getMaxFor(p);
    notify(playerId, true);
}

export function trySpendStamina(playerId, amount) {
    if (!STAMINA_CONFIG.enabled) return true;
    const p = ensureState(playerId);
    if (p.st < amount) {
        syncAirJumpGate(playerId);
        return false;
    }
    p.st = Math.max(0, (p.st || 0) - amount);
    if (!Number.isFinite(p.st)) p.st = 0;
    p.lastSpend = Date.now();
    syncAirJumpGate(playerId);
    notify(playerId);
    return true;
}

export function addStamina(playerId, amount) {
    const p = ensureState(playerId);
    p.st = Math.min(getMaxFor(p), p.st + amount);
    syncAirJumpGate(playerId);
    notify(playerId);
}

/* HOOKS (appelés depuis index.js) */
export function staminaJoin(playerId) {
    players[playerId] = { st: STAMINA_CONFIG.max, lastSpend: 0, bonusMax: 0, lastDisp: null,
                          prevVy: null, prevAir: false, armed: true };
    startImpulseLoop();
    syncAirJumpGate(playerId);
    notify(playerId, true);
}

export function staminaLeave(playerId) {
    delete players[playerId];
}

export function tickStamina() {
    if (!STAMINA_CONFIG.enabled) return;
    const now = Date.now();
    if (now - lastTickAt < STAMINA_CONFIG.tickMs) return;
    lastTickAt = now;

    for (const playerId of api.getPlayerIds()) {
        const p = players[playerId];
        if (!p) continue;
        const max = getMaxFor(p);
        if (p.st >= max) continue;
        if (now - p.lastSpend < STAMINA_CONFIG.regenDelayMs) continue;

        const regenPerTick = max * (STAMINA_CONFIG.regenPerSecPercent / 100)
                           * (STAMINA_CONFIG.tickMs / 1000);

        const wasEmpty = p.st <= 0;
        p.st = Math.min(max, (Number.isFinite(p.st) ? p.st : 0) + regenPerTick);
        if (wasEmpty && p.st > 0) syncAirJumpGate(playerId);
        notify(playerId);
    }
}

export function tryDash(id) {
    if (trySpendStamina(id, STAMINA_CONFIG.dashCost)) {
        let info = api.getPlayerFacingInfo(id);
        if (!info || !info.dir) return;
        dashAnim(id)
        api.applyImpulse(id, info.dir[0] * 30, 4, info.dir[2] * 30);
    }
}


function dashAnim(playerId) {
api.animateEntity(playerId, {
    animationDurationMs: 1200,
    loop: false,
    nodeAnimations: {

        TorsoNode: { 
            timeline: [
                { timeFraction: 0,    rotation: { point: [-0.2, 0, 0] } }, // prépa
                { timeFraction: 0.1,  rotation: { point: [0.5, 0, 0] } },  // impulsion
                { timeFraction: 0.5,  rotation: { point: [0.45, 0, 0] } }, // maintien
                { timeFraction: 0.85, rotation: { point: [0.4, 0, 0] } },  // léger relâchement
                { timeFraction: 1,    rotation: { point: [0, 0, 0] } }     // fin
            ] 
        },

        HeadMesh: {
            timeline: [
                { timeFraction: 0,   rotation: { point: [-0.1, 0, 0] } },
                { timeFraction: 0.1, rotation: { point: [0.3, 0, 0] } },
                { timeFraction: 0.6, rotation: { point: [0.25, 0, 0] } },
                { timeFraction: 1,   rotation: { point: [0, 0, 0] } }
            ]
        },

        ArmRightMesh: {
            timeline: [
                { timeFraction: 0,    rotation: { point: [0, 0, 1.2] } },
                { timeFraction: 0.1,  rotation: { point: [0, 0, -0.8] } },
                { timeFraction: 0.4,  rotation: { point: [0, 0, -0.6] } }, // micro mouvement
                { timeFraction: 0.7,  rotation: { point: [0, 0, -0.8] } },
                { timeFraction: 1,    rotation: { point: [0, 0, 0] } }
            ]
        },

        ArmLeftMesh: {
            timeline: [
                { timeFraction: 0,    rotation: { point: [0, 0, -1.2] } },
                { timeFraction: 0.1,  rotation: { point: [0, 0, 0.8] } },
                { timeFraction: 0.4,  rotation: { point: [0, 0, 0.6] } },
                { timeFraction: 0.7,  rotation: { point: [0, 0, 0.8] } },
                { timeFraction: 1,    rotation: { point: [0, 0, 0] } }
            ]
        },
        LegRightMesh: {
            timeline: [
                { timeFraction: 0,    rotation: { point: [-0.5, 0, 0] } },
                { timeFraction: 0.1,  rotation: { point: [1.4, 0, 0] } },
                { timeFraction: 0.5,  rotation: { point: [1.2, 0, 0] } },
                { timeFraction: 1,    rotation: { point: [0, 0, 0] } }
            ]
        },

        LegLeftMesh: {
            timeline: [
                { timeFraction: 0,    rotation: { point: [0.5, 0, 0] } },
                { timeFraction: 0.1,  rotation: { point: [-1.4, 0, 0] } },
                { timeFraction: 0.5,  rotation: { point: [-1.2, 0, 0] } },
                { timeFraction: 1,    rotation: { point: [0, 0, 0] } }
            ]
        }
    }
});
}