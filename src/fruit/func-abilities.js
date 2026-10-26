// fruit/func-abilities.js — pont entre le World Code et les Code Blocks.
//
// Ancienne version : un fichier minifié d'un seul tenant (17,8 ko) qui
//   - répétait 95 fois le même shim,
//   - embarquait un chargeur illisible,
//   - ne journalisait rien quand un fruit n'était pas chargé.
// Ici : helpers construits une fois, 1 shim = 1 ligne lisible, et le chargeur
// est dans code-block-loader.js. Le bundle final est minifié par build:world.

import * as combat from "../utils/combat.js";
import * as lifeform from "../utils/lifeform.js";
import * as fx from "../utils/fx.js";
import * as timer from "../utils/timer.ts";
import * as world from "../utils/world.js";
import { HANDLER_NAMES } from "./handler-names.js";
import { createBlockLoader } from "./code-block-loader.js";

export { markAggro } from "../utils/combat.js";

// `api` est un global fourni par le jeu. On le lit à l'usage (getter) pour
// rester valable après un reload du World Code.
const getApi = () => globalThis.api;
function log(msg) {
  try { getApi().log(msg); } catch (_) {}
}

// Ancien comportement du helper knockBack : jamais sur un PNJ ni un id mort.
function knockBack(id, dir, force, up) {
  if (!id || (typeof id === "number" && id < 0) ||
      (typeof id === "string" && /^-\d+$/.test(id))) return;
  try {
    if (!lifeform.isAliveId(id)) return;
    if (getApi().getEntityType(id) === "NPC") return;
    combat.impulse(id, dir, force, up);
  } catch (e) {
    log("[FA][err] knockBack : " + (e && e.message ? e.message : e));
  }
}

// FA.c : TOUS les helpers attendus par les Code Blocks. Les namespaces sont
// étalés une seule fois (plus de ligne de 700 caractères recopiée 32 fois).
const HELPERS = Object.assign({}, combat, lifeform, fx, timer, world, {
  fx, mesh: fx, sound: fx, knockBack,
});
Object.defineProperty(HELPERS, "api", { get: getApi, enumerable: true });

const loader = createBlockLoader({ helpers: HELPERS, expected: HANDLER_NAMES, log });

export const reloadFruitBlocks = loader.reload;   // FA.reload() depuis le jeu
export const fruitBlocksStatus = loader.status;   // FA.status()
export const logFruitBlocksStatus = loader.logStatus;

// --- Shims (générés depuis handler-names.js ; 1 ligne = 1 capacité) ---------
// Si le Code Block n'a pas fourni le handler, loader.call() journalise et
// lève une erreur pour les clics : le World Code rembourse alors le cooldown.

export const onPlayerClickSpring = (...args) => loader.call("onPlayerClickSpring", args);
export const onPlayerLeaveSpring = (...args) => loader.call("onPlayerLeaveSpring", args);
export const onPlayerClickLaser = (...args) => loader.call("onPlayerClickLaser", args);
export const onPlayerClickLightning = (...args) => loader.call("onPlayerClickLightning", args);
export const onPlayerLeaveLightning = (...args) => loader.call("onPlayerLeaveLightning", args);
export const onPlayerClickVortex = (...args) => loader.call("onPlayerClickVortex", args);
export const onPlayerLeaveVortex = (...args) => loader.call("onPlayerLeaveVortex", args);
export const onPlayerClickAnchor = (...args) => loader.call("onPlayerClickAnchor", args);
export const onPlayerClickSeismic = (...args) => loader.call("onPlayerClickSeismic", args);
export const onPlayerLeaveSeismic = (...args) => loader.call("onPlayerLeaveSeismic", args);
export const onPlayerClickWindblade = (...args) => loader.call("onPlayerClickWindblade", args);
export const onPlayerClickMark = (...args) => loader.call("onPlayerClickMark", args);
export const onPlayerLeaveMark = (...args) => loader.call("onPlayerLeaveMark", args);
export const onPlayerClickGeyser = (...args) => loader.call("onPlayerClickGeyser", args);
export const onPlayerClickFruit = (...args) => loader.call("onPlayerClickFruit", args);
export const onEntityCollisionFruit = (...args) => loader.call("onEntityCollisionFruit", args);
export const onPlayerLeaveFruit = (...args) => loader.call("onPlayerLeaveFruit", args);
export const onPlayerClickRocket = (...args) => loader.call("onPlayerClickRocket", args);
export const onPlayerClickJumpBeacon = (...args) => loader.call("onPlayerClickJumpBeacon", args);
export const onPlayerClickfullPunch = (...args) => loader.call("onPlayerClickfullPunch", args);
export const onPlayerClickConcreteWheel = (...args) => loader.call("onPlayerClickConcreteWheel", args);
export const onPlayerClickGrowingRay = (...args) => loader.call("onPlayerClickGrowingRay", args);
export const onPlayerClickDought = (...args) => loader.call("onPlayerClickDought", args);
export const onPlayerLeaveDought = (...args) => loader.call("onPlayerLeaveDought", args);
export const onPlayerClickSpinBlade = (...args) => loader.call("onPlayerClickSpinBlade", args);
export const onPlayerClickCataclysm = (...args) => loader.call("onPlayerClickCataclysm", args);
export const onPlayerClickBombDash = (...args) => loader.call("onPlayerClickBombDash", args);
export const onPlayerClickBladeStorm = (...args) => loader.call("onPlayerClickBladeStorm", args);
export const onPlayerClickBladeDash = (...args) => loader.call("onPlayerClickBladeDash", args);
export const onPlayerClickSpikeField = (...args) => loader.call("onPlayerClickSpikeField", args);
export const onPlayerClickJudgmentBeam = (...args) => loader.call("onPlayerClickJudgmentBeam", args);
export const onPlayerClickPaint = (...args) => loader.call("onPlayerClickPaint", args);
export const onPlayerJoinPaint = (...args) => loader.call("onPlayerJoinPaint", args);
export const onPlayerLeavePaint = (...args) => loader.call("onPlayerLeavePaint", args);
export const onPlayerUsedThrowablePaint = (...args) => loader.call("onPlayerUsedThrowablePaint", args);
export const onPlayerThrowableHitTerrainPaint = (...args) => loader.call("onPlayerThrowableHitTerrainPaint", args);
export const onEntityCollisionPaint = (...args) => loader.call("onEntityCollisionPaint", args);
export const portalSolid = (...args) => loader.call("portalSolid", args);
export const portalSpot = (...args) => loader.call("portalSpot", args);
export const portalBurst = (...args) => loader.call("portalBurst", args);
export const onPlayerClickPortal = (...args) => loader.call("onPlayerClickPortal", args);
export const onPlayerClickPortalRift = (...args) => loader.call("onPlayerClickPortalRift", args);
export const onPlayerLeavePortal = (...args) => loader.call("onPlayerLeavePortal", args);
export const onPlayerClickSmokeFog = (...args) => loader.call("onPlayerClickSmokeFog", args);
export const onPlayerClickSmokeShroud = (...args) => loader.call("onPlayerClickSmokeShroud", args);
export const onCancelSmoke = (...args) => loader.call("onCancelSmoke", args);
export const onPlayerLeaveSmoke = (...args) => loader.call("onPlayerLeaveSmoke", args);
export const onPlayerClickRubberPunch = (...args) => loader.call("onPlayerClickRubberPunch", args);
export const onPlayerLeaveRubber = (...args) => loader.call("onPlayerLeaveRubber", args);
export const onPlayerClickDiamondRecovery = (...args) => loader.call("onPlayerClickDiamondRecovery", args);
export const onPlayerLeaveDiamond = (...args) => loader.call("onPlayerLeaveDiamond", args);
export const isImmuneToDamage = (...args) => loader.call("isImmuneToDamage", args);
export const onPlayerClickGhostPhase = (...args) => loader.call("onPlayerClickGhostPhase", args);
export const onPlayerClickSpectralPrison = (...args) => loader.call("onPlayerClickSpectralPrison", args);
export const onCancelGhost = (...args) => loader.call("onCancelGhost", args);
export const onPlayerLeaveGhost = (...args) => loader.call("onPlayerLeaveGhost", args);
export const onPlayerClickPainPulse = (...args) => loader.call("onPlayerClickPainPulse", args);
export const onPlayerReleasePainPulse = (...args) => loader.call("onPlayerReleasePainPulse", args);
export const onCancelPain = (...args) => loader.call("onCancelPain", args);
export const onPlayerLeavePain = (...args) => loader.call("onPlayerLeavePain", args);
export const onPlayerClickGasTether = (...args) => loader.call("onPlayerClickGasTether", args);
export const onCancelGas = (...args) => loader.call("onCancelGas", args);
export const onPlayerLeaveGas = (...args) => loader.call("onPlayerLeaveGas", args);
export const onPlayerClickThunderStrike = (...args) => loader.call("onPlayerClickThunderStrike", args);
export const onCancelThunder = (...args) => loader.call("onCancelThunder", args);
export const onPlayerClickDissonantWave = (...args) => loader.call("onPlayerClickDissonantWave", args);
export const onPlayerClickPetalRefrain = (...args) => loader.call("onPlayerClickPetalRefrain", args);
export const onCancelSong = (...args) => loader.call("onCancelSong", args);
export const onPlayerLeaveSong = (...args) => loader.call("onPlayerLeaveSong", args);
export const onPlayerClickClawRip = (...args) => loader.call("onPlayerClickClawRip", args);
export const onCancelTiger = (...args) => loader.call("onCancelTiger", args);
export const onPlayerLeaveTiger = (...args) => loader.call("onPlayerLeaveTiger", args);
export const onPlayerClickFrostfall = (...args) => loader.call("onPlayerClickFrostfall", args);
export const onPlayerClickShatterfrost = (...args) => loader.call("onPlayerClickShatterfrost", args);
export const onCancelBlizzard = (...args) => loader.call("onCancelBlizzard", args);
export const onPlayerLeaveBlizzard = (...args) => loader.call("onPlayerLeaveBlizzard", args);
export const onPlayerClickManifestGolem = (...args) => loader.call("onPlayerClickManifestGolem", args);
export const onCancelCreation = (...args) => loader.call("onCancelCreation", args);
export const onPlayerLeaveCreation = (...args) => loader.call("onPlayerLeaveCreation", args);
export const onPlayerClickMagmaRings = (...args) => loader.call("onPlayerClickMagmaRings", args);
export const onPlayerClickLavaJet = (...args) => loader.call("onPlayerClickLavaJet", args);
export const onPlayerLeaveLava = (...args) => loader.call("onPlayerLeaveLava", args);
export const onPlayerClickMeteorShower = (...args) => loader.call("onPlayerClickMeteorShower", args);
export const onPlayerLeaveMeteorShower = (...args) => loader.call("onPlayerLeaveMeteorShower", args);
export const onCancelMeteorShower = (...args) => loader.call("onCancelMeteorShower", args);
export const onPlayerClickControlDomain = (...args) => loader.call("onPlayerClickControlDomain", args);
export const onPlayerClickControlSlash = (...args) => loader.call("onPlayerClickControlSlash", args);
export const onPlayerClickControlShambles = (...args) => loader.call("onPlayerClickControlShambles", args);
export const onPlayerLeaveControl = (...args) => loader.call("onPlayerLeaveControl", args);
export const onPlayerClickTigerForm = (...args) => loader.call("onPlayerClickTigerForm", args);
export const onPlayerLeaveTigerForm = (...args) => loader.call("onPlayerLeaveTigerForm", args);
export const onPlayerClickGravityBarrage = (...args) => loader.call("onPlayerClickGravityBarrage", args);
export const onPlayerClickGravityGrab = (...args) => loader.call("onPlayerClickGravityGrab", args);
export const onPlayerClickGravityDevastation = (...args) => loader.call("onPlayerClickGravityDevastation", args);
export const onPlayerLeaveGravity = (...args) => loader.call("onPlayerLeaveGravity", args);
