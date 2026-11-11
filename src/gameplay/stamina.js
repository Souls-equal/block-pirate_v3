// stamina.js

import { setInterval } from "../utils/timer";
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

/* ── DASH : un bouton, sur les deux appareils ───────────────────────────────
   Le dash n'est plus un item, et il n'est plus le bouton d'action du tactile.
   Bloxd affiche NOS boutons personnalises (customButtons) a l'ecran des
   joueurs tactiles, avec le meme fonctionnement qu'une touche : le seul que
   nous y mettons est « dash » (voir src/index.js, buttonsFor). Sur mobile cet
   ecran n'a donc qu'UN bouton de plus, et il ne fait que dasher.

   L'item « Moonstone Dust » n'est PLUS donne : il servait de dash mobile en
   occupant un slot, et son clic sur un PNJ partait en dash au lieu de parler.
   Un inventaire d'une version d'avant peut encore en contenir : sur PC son
   clic dashe encore, sur mobile il est retire au join et ne dashe JAMAIS.
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

/* ── LE BOUTON DU DASH ──────────────────────────────────────────────────────
   PC     : bouton personnalise « dash » (customButtons, KeyQ)
            -> onPlayerPressedButton -> tryDash.
   MOBILE : LE MEME bouton personnalise, et c'est le SEUL que Bloxd affiche en
            plus de la barre d'items (demande 92). Il ne depend d'aucun item et
            ne touche a rien d'autre : le pouce le presse, le joueur dashe.

   POURQUOI PAS touchscreenActionButton (demande 90, retiree en 93)
   -----------------------------------------------------------------
   `touchscreenActionButton` ne cree pas un bouton : il change le CONTENU du
   bouton d'action principal, celui qui sert a frapper et a casser des blocs.
   `onTouchscreenActionButton` se declenche donc a CHAQUE appui d'action : le
   joueur dashait en frappant, en parlant a un PNJ, en minerant. Aucune garde
   cote code ne peut reparer ca, puisque le callback ne distingue pas un appui
   « bouton » d'un appui normal. La client option est donc remise a `null`
   (contenu par defaut du bouton d'action) et le dash passe par customButtons.
   ────────────────────────────────────────────────────────────────────────── */

/* Retire notre ancien contenu du bouton d'action. Pose au join et au respawn :
   un client qui aurait garde l'option d'une session d'avant retrouve son bouton
   d'action normal. */
export function clearActionButton(playerId) {
    if (!playerId) return false;
    try { api.setClientOption(playerId, "touchscreenActionButton", null); } catch (e) { return false; }
    return true;
}

/* Clic sur un item de dash RESIDUEL (les inventaires d'avant en contiennent).
   Sur PC, ce clic dashe encore : c'est un raccourci comme un autre.
   Sur MOBILE, il ne dashe PAS : le dash n'a qu'une entree, le bouton « dash »
   (demandes 92 et 93). L'item est retire au passage, donc le clic suivant est
   un clic normal.
   Renvoie true s'il s'agit bien de cet item, pour que l'appelant arrete de
   traiter le clic. */
export function handleDashItemClick(playerId, itemName) {
    if (itemName !== DASH_ITEM) return false;
    if (isMobilePlayer(playerId)) {
        removeDashItem(playerId);
        return true;
    }
    tryDash(playerId);
    return true;
}
