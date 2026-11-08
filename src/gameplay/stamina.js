// stamina.js

import { setInterval, setTimeout } from "../utils/timer";
import { say, txt } from "../core/theme";

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
    delete dashUntil[playerId];
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

/* DASH ---------------------------------------------------------------- */

/* Verrou anti-coup de poing : après un dash réussi, les dégâts de mêlée
   (coup de poing / M1 du Fighting Style) sont ignorés pendant quelques ms,
   pour éviter de dash et frapper en même temps. */
const dashUntil = {};

export const DASH_MELEE_LOCK_MS = 320;

export function isDashing(playerId) {
    const until = dashUntil[playerId];
    if (!until) return false;
    if (Date.now() >= until) {
        delete dashUntil[playerId];
        return false;
    }
    return true;
}

export function tryDash(id) {
    if (!STAMINA_CONFIG.enabled) return false;

    let info = null;
    try { info = api.getPlayerFacingInfo(id); } catch (e) { info = null; }
    if (!info || !info.dir) return false;

    /* Pas assez de stamina => pas de dash (le coup de poing reste possible). */
    if (!trySpendStamina(id, STAMINA_CONFIG.dashCost)) return false;

    dashUntil[id] = Date.now() + DASH_MELEE_LOCK_MS;
    dashAnim(id);
    try { api.applyImpulse(id, info.dir[0] * 30, 4, info.dir[2] * 30); } catch (e) {}
    return true;
}

/* Petite animation : les mains partent en arrière puis reviennent. */
function dashAnim(playerId) {
    try {
        api.animateEntity(playerId, {
            animationDurationMs: 400,
            loop: false,
            nodeAnimations: {
                TorsoNode: {
                    timeline: [
                        { timeFraction: 0,    rotation: { point: [0, 0, 0] } },
                        { timeFraction: 0.22, rotation: { point: [0.40, 0, 0] } },
                        { timeFraction: 0.62, rotation: { point: [0.30, 0, 0] } },
                        { timeFraction: 1,    rotation: { point: [0, 0, 0] } }
                    ]
                },
                HeadMesh: {
                    timeline: [
                        { timeFraction: 0,    rotation: { point: [0, 0, 0] } },
                        { timeFraction: 0.22, rotation: { point: [-0.26, 0, 0] } },
                        { timeFraction: 0.62, rotation: { point: [-0.16, 0, 0] } },
                        { timeFraction: 1,    rotation: { point: [0, 0, 0] } }
                    ]
                },
                ArmRightMesh: {
                    timeline: [
                        { timeFraction: 0,    rotation: { point: [0, 0, 0] } },
                        { timeFraction: 0.20, rotation: { point: [2.45, 0, -0.35] } },
                        { timeFraction: 0.60, rotation: { point: [2.15, 0, -0.28] } },
                        { timeFraction: 1,    rotation: { point: [0, 0, 0] } }
                    ]
                },
                ArmLeftMesh: {
                    timeline: [
                        { timeFraction: 0,    rotation: { point: [0, 0, 0] } },
                        { timeFraction: 0.20, rotation: { point: [2.45, 0, 0.35] } },
                        { timeFraction: 0.60, rotation: { point: [2.15, 0, 0.28] } },
                        { timeFraction: 1,    rotation: { point: [0, 0, 0] } }
                    ]
                }
            }
        });
    } catch (e) {}
}

/* ── DASH : une touche sur PC, un item sur mobile (demande 75) ───────────────
   PC     : bouton personnalise « dash » (api.setClientOption customButtons,
            KeyQ) -> onPlayerPressedButton -> tryDash.
   MOBILE : l'item Bloxd « Snowdash » propulse deja le joueur vers l'avant. On
            garde NOTRE dash (cout en stamina, animation, verrou anti-coup de
            poing) et on annule l'effet par defaut de l'item en renvoyant
            « preventAction » depuis onPlayerAltAction (voir index.js).
   L'item n'est jamais nomme au moment du give : son nom et sa description
   viennent de ITEM_LOOKS, dans gameplay/customItem.js (regle de la demande 63). */

export const DASH_ITEM = "Snowdash";

const DASH_RETRY_TICKS = 100; // ~5 s
const DASH_RETRY_MAX = 60;    // ~5 min
const dashGrant = {};

export function dashItemAmount(playerId) {
    let n = 0;
    try { n = api.getInventoryItemAmount(playerId, DASH_ITEM); } catch (e) { n = 0; }
    return typeof n === "number" && n > 0 ? n : 0;
}

export function hasDashItem(playerId) {
    return dashItemAmount(playerId) > 0;
}

/* Bloxd ne signale pas un inventaire plein : on verifie donc la presence. */
function giveDashItem(playerId) {
    try { api.giveItem(playerId, DASH_ITEM, 1); } catch (e) { return false; }
    return hasDashItem(playerId);
}

export function removeDashItem(playerId) {
    const n = dashItemAmount(playerId);
    if (!n) return false;
    try { api.removeItemName(playerId, DASH_ITEM, n); } catch (e) { return false; }
    return true;
}

/* Donne l'item de dash, et REESSAIE tant que l'inventaire est plein : le joueur
   est prevenu UNE fois, on ne le harcele pas, et on s'arrete au bout de
   DASH_RETRY_MAX essais (ou si le joueur est parti : le give echoue). */
export function ensureDashItem(playerId, attempt) {
    if (!playerId) return false;
    if (hasDashItem(playerId)) { delete dashGrant[playerId]; return true; }
    if (giveDashItem(playerId)) { delete dashGrant[playerId]; return true; }
    const st = dashGrant[playerId] || (dashGrant[playerId] = { told: false });
    if (!st.told) {
        st.told = true;
        try {
            say(playerId, [
                txt("[", "#94a3b8"),
                txt("!", "#ef4444", { fontWeight: "700" }),
                txt("] ", "#94a3b8"),
                txt("Your inventory is full: free a slot and you will get your ", "#cbd5e1"),
                txt("Dash", "#7dd3fc", { fontWeight: "700" }),
                txt(" item.", "#cbd5e1"),
            ]);
        } catch (e) {}
    }
    if ((attempt || 0) >= DASH_RETRY_MAX) { delete dashGrant[playerId]; return false; }
    /* On garde de quoi arreter la chaine : sans cela, un joueur qui quitte
       pendant les essais continuerait d'etre sonde pendant cinq minutes. */
    try {
        st.timer = setTimeout(() => ensureDashItem(playerId, (attempt || 0) + 1), DASH_RETRY_TICKS);
    } catch (e) {
        st.timer = null;
    }
    return false;
}

/* Utilisation de l'item de dash (mobile). Renvoie true s'il s'agit bien de lui,
   pour que l'appelant arrete de traiter le clic. */
export function handleDashItemClick(playerId, itemName) {
    if (itemName !== DASH_ITEM) return false;
    if (!hasDashItem(playerId)) { ensureDashItem(playerId); return true; }
    tryDash(playerId);
    return true;
}

export function clearDashState(playerId) {
    const st = dashGrant[playerId];
    if (st && st.timer) {
        try { st.timer.stop(); } catch (e) {}
    }
    delete dashGrant[playerId];
}
