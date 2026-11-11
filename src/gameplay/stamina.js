// stamina.js

import { setInterval } from "../utils/timer";
import { C, ic } from "../core/theme";
import { isMobilePlayer } from "../utils/data";

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

/* UN JOUEUR PEUT PARTIR AU MILIEU D'UN TICK. Toute fonction de l'API qui prend
   un playerId leve alors une ApiError (« player not found »), y compris
   setClientOptions sur un joueur deconnecte. C'est un evenement NORMAL, pas un
   bug : on ne le loggue pas (sinon un depart, ou une capacite utilisee juste
   avant de partir, remplit la console). On verifie donc la presence avec une
   liste rafraichie au plus toutes les 250 ms, et on ignore en silence.

   `isOnline()` renvoie true si la liste n'est pas lisible : mieux vaut tenter
   l'appel que bloquer un joueur vivant. */
let onlineIds = null;
let onlineAt = 0;

function isOnline(playerId) {
    if (!playerId) return false;
    const now = Date.now();
    if (!onlineIds || now - onlineAt > 250) {
        try {
            const ids = api.getPlayerIds() || [];
            const set = {};
            for (const id of ids) set[id] = true;
            onlineIds = set;
            onlineAt = now;
        } catch (e) {
            onlineIds = null;
        }
    }
    if (!onlineIds) return true;
    return onlineIds[playerId] === true;
}

/* Derniere valeur d'airJumpCount envoyee a chaque joueur : on n'appelle
   setClientOptions que si elle change vraiment (un appel par tick et par
   joueur pour rien etait la principale source d'erreurs). */
const gateValue = {};

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
    if (!isOnline(playerId)) return;
    /* La sidebar peut echouer une fois (chunk pas encore charge au join) : on
       reessaie, mais on n'ecrit rien dans la console — le tick suivant suffit. */
    try { displayHook(playerId); }
    catch (e) {}
}

function airJumpsForMax(max) {
    max = Number(max);
    if (!Number.isFinite(max) || max <= 0) max = STAMINA_CONFIG.max;
    const cost = Number(STAMINA_CONFIG.airJumpCost) || 20;
    return safeInt(Math.ceil(max / cost) + (STAMINA_CONFIG.airJumpHeadroom || 0), 0, 50);
}

function syncAirJumpGate(playerId) {
    if (!playerId) return;
    const p = players[playerId];
    let allow = (!p || p.st > 0) ? airJumpsForMax(getMaxFor(p)) : 0;
    allow = safeInt(allow, 0, 50);
    if (gateValue[playerId] === allow) return;
    if (!isOnline(playerId)) return;
    try {
        api.setClientOptions(playerId, { airJumpCount: allow });
        gateValue[playerId] = allow;
    } catch (e) {
        /* Joueur parti, ou client pas encore pret : on reessaiera au prochain
           changement de stamina. Aucun log. */
        delete gateValue[playerId];
    }
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

        /* On parcourt NOTRE etat, pas api.getPlayerIds() : un joueur qui vient
           de partir est encore dans la liste du moteur pendant un tick, et
           chaque appel le concernant leverait une ApiError. */
        for (const pid in players) {
            if (!isOnline(pid)) { delete players[pid]; continue; }
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

/* HOOKS (appelés depuis index.js) */
export function staminaJoin(playerId) {
    players[playerId] = { st: STAMINA_CONFIG.max, lastSpend: 0, bonusMax: 0, lastDisp: null,
                          prevVy: null, prevAir: false, armed: true };
    delete gateValue[playerId];
    /* Le joueur vient d'arriver : la liste des presents en cache ne le connait
       peut-etre pas encore (elle vit 250 ms). */
    onlineIds = null;
    onlineAt = 0;
    startImpulseLoop();
    syncAirJumpGate(playerId);
    notify(playerId, true);
}

export function staminaLeave(playerId) {
    delete players[playerId];
    delete dashUntil[playerId];
    delete gateValue[playerId];
    /* La liste des joueurs en ligne est perimee : on la relit au prochain
       appel plutot que de garder un partant dedans. */
    onlineIds = null;
    onlineAt = 0;
}

export function tickStamina() {
    if (!STAMINA_CONFIG.enabled) return;
    const now = Date.now();
    if (now - lastTickAt < STAMINA_CONFIG.tickMs) return;
    lastTickAt = now;

    for (const playerId in players) {
        const p = players[playerId];
        if (!isOnline(playerId)) { delete players[playerId]; continue; }
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

/* ── DASH : une touche sur PC, un BOUTON TACTILE sur mobile ─────────────────
   PC     : bouton personnalise « dash » (api.setClientOption customButtons,
            KeyQ) -> onPlayerPressedButton -> tryDash.
   MOBILE : un bouton tactile dedie (client option touchscreenActionButton)
            -> onTouchscreenActionButton -> handleDashButton -> tryDash.
            Aucun item a sortir, aucun slot perdu : le dash ne depend plus de
            ce que le joueur tient en main (demande 90).

   L'item « Moonstone Dust » n'est donc PLUS donne : il servait de dash mobile
   en occupant un slot, et son clic sur un PNJ partait en dash au lieu de
   parler. Un inventaire d'une version d'avant peut encore en contenir : son
   clic dash toujours (handleDashItemClick), et il est retire au join sur PC.
   Il est INERTE a dessein (voir la demande 75 : « Snowdash » propulsait tout
   seul, donc un second dash impossible a annuler sur mobile).

   Son nom et sa description viennent de ITEM_LOOKS, dans gameplay/customItem.js
   (regle de la demande 63 : jamais un nom d'item au moment du give). */

export const DASH_ITEM = "Moonstone Dust";

/* Nettoie un item de dash residuel : le dash mobile a maintenant son bouton,
   l'item ne doit plus occuper de slot. */
export function removeDashItem(playerId) {
    try { api.removeItemName(playerId, DASH_ITEM, 64); } catch (e) { return false; }
    return true;
}

/* ── BOUTON TACTILE « DASH » (mobile) ────────────────────────────────────────
   Le dash mobile ne passe plus par un item. Sortir « Moonstone Dust » pour
   dasher obligeait a le tenir en main : ce slot etait perdu, et le tap qui
   sert a parler aux PNJ ou a frapper partait en dash. Bloxd expose un bouton
   tactile dedie :
       api.setClientOption(id, "touchscreenActionButton", <texte style>)
       -> onTouchscreenActionButton(id, touchDown)
   On y met une ICONE (un eclat) et rien d'autre : les boutons du mobile sont
   petits, le texte n'y tient pas (demande 91). Le dash ne depend donc plus de
   ce que le joueur a en main, et l'item n'est plus donne (les inventaires
   d'avant en contiennent encore : son clic marche toujours, voir
   handleDashItemClick). Sur PC le bouton est retire : le dash reste le clic
   droit / la touche Q. */
const DASH_BUTTON_MIN_MS = 250;
const dashButtonAt = {};

function dashButtonParts() {
    return [ic("fa-solid fa-bolt", C.MARINE)];
}

/* Pose (ou retire) le bouton tactile selon l'appareil. Appele au join et a
   chaque changement de mode de commandes : un client ne doit jamais garder un
   bouton qui ne correspond plus a l'appareil. */
export function setupDashButton(playerId) {
    if (!playerId) return false;
    if (!isMobilePlayer(playerId)) {
        try { api.setClientOption(playerId, "touchscreenActionButton", null); } catch (e) {}
        return false;
    }
    try {
        api.setClientOption(playerId, "touchscreenActionButton", dashButtonParts());
        return true;
    } catch (e) {
        return false;
    }
}

/* Appui sur le bouton tactile. `touchDown` arrive aussi au relachement : on ne
   dash qu'a l'appui. Un doigt pose peut repeter l'appui : un dash par
   DASH_BUTTON_MIN_MS au maximum, sinon un seul appui viderait la stamina. */
export function handleDashButton(playerId, touchDown) {
    if (!playerId || !touchDown) return false;
    if (!isMobilePlayer(playerId)) return false;
    const now = Date.now();
    if (dashButtonAt[playerId] && now - dashButtonAt[playerId] < DASH_BUTTON_MIN_MS) return true;
    dashButtonAt[playerId] = now;
    tryDash(playerId);
    return true;
}

/* Clic sur un item de dash RESIDUEL (les inventaires d'avant en contiennent).
   Le dash mobile ne passe plus par la : un item retrouve ne rend pas le
   suivant, il declenche juste un dash comme les autres. Renvoie true s'il
   s'agit bien de lui, pour que l'appelant arrete de traiter le clic. */
export function handleDashItemClick(playerId, itemName) {
    if (itemName !== DASH_ITEM) return false;
    tryDash(playerId);
    return true;
}

export function clearDashState(playerId) {
    delete dashButtonAt[playerId];
}
