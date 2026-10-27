// fruit/func-abilities.js — pont lisible entre le World Code et les 7 Code Blocks (BP3).
// Remplace directement l'ancien `func-abilities.js` dans Bloxd.io (aucun fichier à ajouter).

import {
  aggro,
  applyEffect,
  claimSummon,
  clearPlayerEffects,
  damage,
  eff,
  entitiesIn,
  freeSummon,
  getBaseEffectDuration,
  getBaseEffectLevel,
  getEffectiveKiller,
  grounded,
  heal,
  hitArea,
  hitSeg,
  impulse,
  inCylinder,
  inSphere,
  lifeforms,
  markAggro,
  markUntil,
  marks,
  nearest,
  pickTarget,
  removeEffect,
  setBaseEffectLevel,
  setVel,
  statLevel,
  strengthMult,
  summonOwner,
  teleport,
  unmark,
} from "../utils/combat";
import {
  chest,
  eye,
  facing,
  facingInfo,
  forgetAliveId,
  getAliveLifeformIds,
  getAliveMobIds,
  getAlivePlayerIds,
  heading,
  isAliveId,
  isAliveIdFresh,
  isLifeform,
  isMobAlive,
  isPlayerAlive,
  isStillAlive,
  posOf,
  refreshAliveCache,
  safeEntityName,
  safeEntityType,
  safeHealth,
  safePosition,
  targetBlock,
} from "../utils/lifeform";
import {
  CAGE,
  GOLDEN,
  TAU,
  TEX,
  add,
  aim,
  at,
  boom,
  box,
  boxSpan,
  circle,
  clamp,
  column,
  create,
  dist,
  dist2,
  distH,
  distH2,
  dot,
  emit,
  floor3,
  frame,
  inBox,
  len,
  lerp,
  manhattan,
  move,
  norm,
  pick,
  playParticle,
  point,
  rand,
  randInt,
  remove,
  resize,
  rgba,
  ring,
  rotate,
  scale,
  seg,
  segDist,
  sub,
  to,
} from "../utils/fx";
import { run, setInterval, setTimeout, sleep, step, until } from "../utils/timer";
import {
  blockAt,
  clearIf,
  freeSpot,
  isAir,
  isSolid,
  raycast,
  setBlock,
  solidVoxel,
  standable,
  stuck,
} from "../utils/world";

export { markAggro };

// --- Format des packs BP3 ----------------------------------------------------

export const MAGIC = "BP3";
export const MARKER = "/*BP3M*/";
export const ORIGIN = [100000, 100000, 100002];
export const SCAN_SLOTS = 24;

const HEADER_RE = /^\s*\/\*BP3:(\d+)\/(\d+):len=(\d+):h=([0-9a-f]{8})\*\/\s*/;

export function fnv1a(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  }
  return ("00000000" + h.toString(16)).slice(-8);
}

export function parseBlock(text) {
  if (typeof text !== "string") return null;
  const clean = text.replace(/\r\n?/g, "\n");
  const m = HEADER_RE.exec(clean);
  if (!m) return null;
  const payload = clean.slice(m[0].length).trim();
  const len = Number(m[3]);
  const hash = m[4];
  const censored = payload.includes("*****");
  return {
    index: Number(m[1]),
    total: Number(m[2]),
    len,
    hash,
    censored,
    ok: !censored && payload.length === len && fnv1a(payload) === hash,
    payload,
  };
}

// --- Helpers FA.c fournis aux Code Blocks ------------------------------------

const getApi = () => globalThis.api;
const log = (msg) => {
  try {
    getApi().log(msg);
  } catch (_) {}
};

function knockBack(id, dir, force, up) {
  /* ATTENTION : les ids Bloxd sont des entiers NEGATIFS sous forme de chaîne
     ("-3", "-810"…). On ne filtre donc JAMAIS un id par son format, sinon
     plus aucune cible n'est repoussée. Les NPCs sont protégés juste en
     dessous par isAliveId() (qui les exclut) et par le test de type. */
  if (!id) return;
  try {
    if (isAliveId(id) && getApi().getEntityType(id) !== "NPC") {
      impulse(id, dir, force, up);
    }
  } catch (e) {
    log("[FA][err] knockBack : " + (e?.message || e));
  }
}

const FX_HELPERS = {
  CAGE,
  GOLDEN,
  TAU,
  TEX,
  add,
  aim,
  at,
  boom,
  box,
  boxSpan,
  circle,
  clamp,
  column,
  create,
  dist,
  dist2,
  distH,
  distH2,
  dot,
  emit,
  floor3,
  frame,
  inBox,
  len,
  lerp,
  manhattan,
  move,
  norm,
  pick,
  playParticle,
  point,
  rand,
  randInt,
  remove,
  resize,
  rgba,
  ring,
  rotate,
  scale,
  seg,
  segDist,
  sub,
  to,
};

const HELPERS = {
  ...FX_HELPERS,
  fx: FX_HELPERS,
  mesh: FX_HELPERS,
  sound: FX_HELPERS,
  knockBack,
  aggro,
  applyEffect,
  claimSummon,
  clearPlayerEffects,
  damage,
  eff,
  entitiesIn,
  freeSummon,
  getBaseEffectDuration,
  getBaseEffectLevel,
  getEffectiveKiller,
  grounded,
  heal,
  hitArea,
  hitSeg,
  impulse,
  inCylinder,
  inSphere,
  lifeforms,
  markAggro,
  markUntil,
  marks,
  nearest,
  pickTarget,
  removeEffect,
  setBaseEffectLevel,
  setVel,
  statLevel,
  strengthMult,
  summonOwner,
  teleport,
  unmark,
  chest,
  eye,
  facing,
  facingInfo,
  forgetAliveId,
  getAliveLifeformIds,
  getAliveMobIds,
  getAlivePlayerIds,
  heading,
  isAliveId,
  isAliveIdFresh,
  isLifeform,
  isMobAlive,
  isPlayerAlive,
  isStillAlive,
  posOf,
  refreshAliveCache,
  safeEntityName,
  safeEntityType,
  safeHealth,
  safePosition,
  targetBlock,
  run,
  setInterval,
  setTimeout,
  sleep,
  step,
  until,
  blockAt,
  clearIf,
  freeSpot,
  isAir,
  isSolid,
  raycast,
  setBlock,
  solidVoxel,
  standable,
  stuck,
};
Object.defineProperty(HELPERS, "api", { get: getApi, enumerable: true });

// --- Chargeur des Code Blocks ------------------------------------------------

export function createBlockLoader({ helpers, expected = [], log: customLog = null }) {
  const say = (msg) => {
    try {
      (customLog || log)(customLog ? msg : "[FA] " + msg);
    } catch (_) {}
  };
  const origin = () => {
    const o = globalThis.FA_ORIGIN;
    return Array.isArray(o) && o.length >= 3 ? o : ORIGIN;
  };

  const FA = globalThis.FA || (globalThis.FA = { r: {} });
  FA.c = helpers;
  FA.r = FA.r || {};

  const generation = (globalThis.__FA_LOADER_GENERATION || 0) + 1;
  globalThis.__FA_LOADER_GENERATION = generation;
  const alive = () => globalThis.__FA_LOADER_GENERATION === generation;

  FA.generation = generation;
  FA.packInfo = [];
  FA.errors = [];
  FA.sourceHash = "";

  const seen = {};
  function warn(tag, msg) {
    const now = Date.now();
    if (!seen[tag] || now - seen[tag] >= 2000) {
      seen[tag] = now;
      say(msg);
    }
  }

  function schedule(fn, ticks) {
    try {
      if (typeof globalThis.S?.wait === "function") return globalThis.S.wait(fn, ticks);
    } catch (_) {}
    try {
      return helpers.setTimeout(fn, ticks);
    } catch (_) {
      return null;
    }
  }

  // Pré-chauffage du chunk distant : tant qu'aucun getBlock ne l'a touché,
  // Bloxd.io ne le charge pas et getBlockData renvoie vide. Le chunk devient
  // lisible ~1 tick APRÈS ce sondage — le boot et les retries sont donc
  // décalés d'au moins un tick par rapport à warmup().
  function warmup() {
    const [x, y, z0] = origin();
    for (let slot = 0; slot < SCAN_SLOTS; slot++) {
      try {
        getApi().getBlock(x, y, z0 + slot);
      } catch (_) {}
    }
  }

  function readSlot(slot) {
    const [x, y, z0] = origin();
    const z = z0 + slot;
    try {
      if (getApi().getBlock(x, y, z) !== "Code Block") return null;
      const d = getApi().getBlockData(x, y, z);
      const text =
        typeof d === "string"
          ? d
          : d?.persisted?.shared?.text || d?.persisted?.text || d?.text || null;
      return typeof text === "string" && text.length ? { z, text } : null;
    } catch (e) {
      warn("slot:" + z, "[FA] lecture bloc z=" + z + " : " + (e?.message || e));
      return null;
    }
  }

  function collect() {
    const byIndex = {};
    const errors = [];
    let total = 0;
    let oldFormat = 0;

    for (let slot = 0; slot < SCAN_SLOTS; slot++) {
      const found = readSlot(slot);
      if (!found) continue; // ne s'arrête pas au premier trou
      const b = parseBlock(found.text);
      if (!b) {
        oldFormat++;
        continue;
      }
      if (b.index < 1 || b.index > SCAN_SLOTS) {
        errors.push(`pack ${b.index} hors bande (z=${found.z})`);
        continue;
      }
      total = Math.max(total, b.total, b.index);
      if (byIndex[b.index]) errors.push(`pack ${b.index} en double (z=${found.z})`);
      if (!b.ok) {
        errors.push(
          b.censored
            ? `pack ${b.index} (z=${found.z}) CENSURÉ par Bloxd.io ("*****" détecté)`
            : `pack ${b.index} (z=${found.z}) TRONQUÉ ou modifié : ${b.payload.length}/${b.len} car. (${b.hash})`,
        );
      }
      byIndex[b.index] = { ...b, z: found.z };
    }

    if (!total) {
      errors.push(`aucun Code Block ${MAGIC} trouvé vers (${origin().join(", ")}).`);
      if (oldFormat) errors.push(`${oldFormat} ancien(s) bloc(s) ignoré(s).`);
    } else {
      for (let i = 1; i <= total; i++) {
        if (!byIndex[i]) errors.push(`pack ${i}/${total} MANQUANT (attendu vers z=${origin()[2] + i - 1})`);
      }
      if (oldFormat) say(`[FA] ${oldFormat} ancien(s) Code Block(s) ignoré(s).`);
    }
    return { byIndex, total, errors };
  }

  function evalPack(pack) {
    const before = new Set(Object.keys(FA.r));
    const parts = pack.payload.split(MARKER);
    let ok = 0;
    for (let i = 0; i < parts.length; i++) {
      const code = parts[i].trim();
      if (!code || code === ";") continue;
      try {
        (0, eval)(code);
        ok++;
      } catch (e) {
        FA.errors.push(`pack ${pack.index} module ${i + 1} : ${e?.message || e}`);
      }
    }
    FA.packInfo.push({
      index: pack.index,
      z: pack.z,
      modules: parts.length,
      evaluated: ok,
      chars: pack.payload.length,
      handlers: Object.keys(FA.r).filter((k) => !before.has(k)),
    });
  }

  let loading = false;
  let booted = false;
  let lastLoad = 0;
  let retries = 0;

  function load(force) {
    if (!alive() || loading) return;
    loading = true;
    try {
      // Sondage du chunk ce tick : si la lecture synchro ci-dessous échoue
      // (chunk froid), le retry du tick suivant lira un chunk déjà chargé.
      warmup();
      const { byIndex, total, errors } = collect();
      FA.errors = errors.slice();
      for (const e of FA.errors) say("[FA] " + e);

      const packs = [];
      for (let i = 1; i <= total; i++) {
        if (byIndex[i] && !byIndex[i].censored && byIndex[i].payload.length > 0) {
          packs.push(byIndex[i]);
        }
      }

      const sourceHash = packs.length ? fnv1a(packs.map((p) => p.payload).join("\n")) : "";
      const cacheKey = generation + ":" + sourceHash;
      const missingNow = expected.filter((n) => typeof FA.r[n] !== "function");

      if ((force || !sourceHash || cacheKey !== FA.sourceHash || missingNow.length > 0) && packs.length) {
        FA.packInfo = [];
        FA.errors = errors.slice();
        for (const pack of packs) if (alive()) evalPack(pack);
        FA.sourceHash = cacheKey;
      }

      const missing = expected.filter((n) => typeof FA.r[n] !== "function");
      if (missing.length) {
        say(`[FA] ${missing.length} handler(s) absent(s) : ${missing.join(", ")} (voir FA.status()).`);
      } else if (packs.length) {
        say(`[FA] ${packs.length}/${total} pack(s) chargé(s), ${Object.keys(FA.r).length} handlers (${sourceHash}).`);
      }

      FA.ready = packs.length === total && missing.length === 0 && FA.errors.length === 0;
      if (!FA.ready && retries < 30) {
        retries++;
        // Les 2 premiers essais sont rapprochés (2 ticks) pour profiter du
        // warmup de ce tick ; ensuite on repasse à 10 ticks pour ne pas spammer.
        const delay = retries <= 2 ? 2 : 10;
        schedule(() => alive() && load(false), delay);
      } else if (FA.ready) {
        retries = 0;
      }
    } catch (e) {
      FA.errors.push("chargeur : " + (e?.message || e));
      say("[FA] erreur du chargeur : " + (e?.message || e));
    } finally {
      lastLoad = Date.now();
      loading = false;
    }
  }

  function boot() {
    if (!alive() || loading || (booted && Date.now() - lastLoad < 750)) return;
    booted = true;
    load(false);
  }

  function reload(force) {
    if (!alive()) return false;
    retries = 0;
    FA.sourceHash = "";
    load(force !== false);
    return true;
  }

  function status() {
    return {
      generation,
      alive: alive(),
      ready: !!FA.ready,
      origin: origin().join(", "),
      packCount: FA.packInfo.length,
      packs: FA.packInfo,
      registered: Object.keys(FA.r).length,
      expected: expected.length,
      missing: expected.filter((n) => typeof FA.r[n] !== "function"),
      errors: FA.errors.slice(),
      sourceHash: FA.sourceHash,
    };
  }

  function logStatus() {
    const s = status();
    say(`[FA] ${s.packCount} pack(s), ${s.registered} handlers, ${s.missing.length} manquant(s), ${s.errors.length} erreur(s)`);
    for (const p of s.packs) say(`[FA]   pack ${p.index} z=${p.z} : ${p.evaluated}/${p.modules} modules, ${p.chars} car.`);
    for (const e of s.errors) say("[FA]   ! " + e);
    if (s.missing.length) say("[FA]   manquants : " + s.missing.join(", "));
    return s;
  }

  function call(name, args) {
    let fn = FA.r?.[name];
    if (typeof fn !== "function") {
      boot();
      fn = FA.r?.[name];
    }
    if (typeof fn !== "function") {
      warn("missing:" + name, `[FA] handler '${name}' introuvable : Code Block non chargé (FA.status()).`);
      if (/^onPlayerClick|^onPlayerRelease|^onPlayerUsed/.test(name)) {
        throw new Error("[FA] handler manquant : " + name);
      }
      return undefined;
    }
    return fn.apply(null, args);
  }

  FA.reload = reload;
  FA.status = status;
  FA.logStatus = logStatus;
  FA.prewarm = warmup;
  globalThis.FA_BOOT = boot;

  // Tick 0 : on demande le chunk tout de suite, pour que la première lecture
  // (boot décalé de 2 ticks) ait déjà au moins un tick de chargement derrière.
  try {
    warmup();
  } catch (_) {}
  try {
    schedule(() => alive() && boot(), 2);
  } catch (_) {
    boot();
  }

  return { call, boot, reload, status, logStatus, alive };
}

// --- Shims (1 ligne = 1 capacité, liste attendue construite automatiquement) -

const EXPECTED = [];
let loader = null;
const shim = (name) => {
  EXPECTED.push(name);
  return (...args) => loader.call(name, args);
};

export const onPlayerClickSpring = shim("onPlayerClickSpring");
export const onPlayerLeaveSpring = shim("onPlayerLeaveSpring");
export const onPlayerClickLaser = shim("onPlayerClickLaser");
export const onPlayerClickLightning = shim("onPlayerClickLightning");
export const onPlayerLeaveLightning = shim("onPlayerLeaveLightning");
export const onPlayerClickVortex = shim("onPlayerClickVortex");
export const onPlayerLeaveVortex = shim("onPlayerLeaveVortex");
export const onPlayerClickAnchor = shim("onPlayerClickAnchor");
export const onPlayerClickSeismic = shim("onPlayerClickSeismic");
export const onPlayerLeaveSeismic = shim("onPlayerLeaveSeismic");
export const onPlayerClickWindblade = shim("onPlayerClickWindblade");
export const onPlayerClickMark = shim("onPlayerClickMark");
export const onPlayerLeaveMark = shim("onPlayerLeaveMark");
export const onPlayerClickGeyser = shim("onPlayerClickGeyser");
export const onPlayerClickFruit = shim("onPlayerClickFruit");
export const onEntityCollisionFruit = shim("onEntityCollisionFruit");
export const onPlayerLeaveFruit = shim("onPlayerLeaveFruit");
export const onPlayerClickRocket = shim("onPlayerClickRocket");
export const onPlayerClickJumpBeacon = shim("onPlayerClickJumpBeacon");
export const onPlayerClickfullPunch = shim("onPlayerClickfullPunch");
export const onPlayerClickConcreteWheel = shim("onPlayerClickConcreteWheel");
export const onPlayerClickGrowingRay = shim("onPlayerClickGrowingRay");
export const onPlayerClickDought = shim("onPlayerClickDought");
export const onPlayerLeaveDought = shim("onPlayerLeaveDought");
export const onPlayerClickSpinBlade = shim("onPlayerClickSpinBlade");
export const onPlayerClickCataclysm = shim("onPlayerClickCataclysm");
export const onPlayerClickBombDash = shim("onPlayerClickBombDash");
export const onPlayerClickBladeStorm = shim("onPlayerClickBladeStorm");
export const onPlayerClickBladeDash = shim("onPlayerClickBladeDash");
export const onPlayerClickSpikeField = shim("onPlayerClickSpikeField");
export const onPlayerClickJudgmentBeam = shim("onPlayerClickJudgmentBeam");
export const onPlayerClickPaint = shim("onPlayerClickPaint");
export const onPlayerJoinPaint = shim("onPlayerJoinPaint");
export const onPlayerLeavePaint = shim("onPlayerLeavePaint");
export const onPlayerUsedThrowablePaint = shim("onPlayerUsedThrowablePaint");
export const onPlayerThrowableHitTerrainPaint = shim("onPlayerThrowableHitTerrainPaint");
export const onEntityCollisionPaint = shim("onEntityCollisionPaint");
export const portalSolid = shim("portalSolid");
export const portalSpot = shim("portalSpot");
export const portalBurst = shim("portalBurst");
export const onPlayerClickPortal = shim("onPlayerClickPortal");
export const onPlayerClickPortalRift = shim("onPlayerClickPortalRift");
export const onPlayerLeavePortal = shim("onPlayerLeavePortal");
export const onPlayerClickSmokeFog = shim("onPlayerClickSmokeFog");
export const onPlayerClickSmokeShroud = shim("onPlayerClickSmokeShroud");
export const onCancelSmoke = shim("onCancelSmoke");
export const onPlayerLeaveSmoke = shim("onPlayerLeaveSmoke");
export const onPlayerClickRubberPunch = shim("onPlayerClickRubberPunch");
export const onPlayerLeaveRubber = shim("onPlayerLeaveRubber");
export const onPlayerClickDiamondRecovery = shim("onPlayerClickDiamondRecovery");
export const onPlayerLeaveDiamond = shim("onPlayerLeaveDiamond");
export const isImmuneToDamage = shim("isImmuneToDamage");
export const onPlayerClickGhostPhase = shim("onPlayerClickGhostPhase");
export const onPlayerClickSpectralPrison = shim("onPlayerClickSpectralPrison");
export const onCancelGhost = shim("onCancelGhost");
export const onPlayerLeaveGhost = shim("onPlayerLeaveGhost");
export const onPlayerClickPainPulse = shim("onPlayerClickPainPulse");
export const onPlayerReleasePainPulse = shim("onPlayerReleasePainPulse");
export const onCancelPain = shim("onCancelPain");
export const onPlayerLeavePain = shim("onPlayerLeavePain");
export const onPlayerClickGasTether = shim("onPlayerClickGasTether");
export const onCancelGas = shim("onCancelGas");
export const onPlayerLeaveGas = shim("onPlayerLeaveGas");
export const onPlayerClickThunderStrike = shim("onPlayerClickThunderStrike");
export const onCancelThunder = shim("onCancelThunder");
export const onPlayerClickDissonantWave = shim("onPlayerClickDissonantWave");
export const onPlayerClickPetalRefrain = shim("onPlayerClickPetalRefrain");
export const onCancelSong = shim("onCancelSong");
export const onPlayerLeaveSong = shim("onPlayerLeaveSong");
export const onPlayerClickClawRip = shim("onPlayerClickClawRip");
export const onCancelTiger = shim("onCancelTiger");
export const onPlayerLeaveTiger = shim("onPlayerLeaveTiger");
export const onPlayerClickFrostfall = shim("onPlayerClickFrostfall");
export const onPlayerClickShatterfrost = shim("onPlayerClickShatterfrost");
export const onCancelBlizzard = shim("onCancelBlizzard");
export const onPlayerLeaveBlizzard = shim("onPlayerLeaveBlizzard");
export const onPlayerClickManifestGolem = shim("onPlayerClickManifestGolem");
export const onCancelCreation = shim("onCancelCreation");
export const onPlayerLeaveCreation = shim("onPlayerLeaveCreation");
export const onPlayerClickMagmaRings = shim("onPlayerClickMagmaRings");
export const onPlayerClickLavaJet = shim("onPlayerClickLavaJet");
export const onPlayerLeaveLava = shim("onPlayerLeaveLava");
export const onPlayerClickMeteorShower = shim("onPlayerClickMeteorShower");
export const onPlayerLeaveMeteorShower = shim("onPlayerLeaveMeteorShower");
export const onCancelMeteorShower = shim("onCancelMeteorShower");
export const onPlayerClickControlDomain = shim("onPlayerClickControlDomain");
export const onPlayerClickControlSlash = shim("onPlayerClickControlSlash");
export const onPlayerClickControlShambles = shim("onPlayerClickControlShambles");
export const onPlayerLeaveControl = shim("onPlayerLeaveControl");
export const onPlayerClickTigerForm = shim("onPlayerClickTigerForm");
export const onPlayerLeaveTigerForm = shim("onPlayerLeaveTigerForm");
export const onPlayerClickGravityBarrage = shim("onPlayerClickGravityBarrage");
export const onPlayerClickGravityGrab = shim("onPlayerClickGravityGrab");
export const onPlayerClickGravityDevastation = shim("onPlayerClickGravityDevastation");
export const onPlayerLeaveGravity = shim("onPlayerLeaveGravity");
export const onPlayerClickRocketBarrage = shim("onPlayerClickRocketBarrage");
export const onPlayerClickPropellerFlight = shim("onPlayerClickPropellerFlight");
export const onPlayerClickTwisterSlash = shim("onPlayerClickTwisterSlash");
export const onPlayerClickSpringCannon = shim("onPlayerClickSpringCannon");
export const onPlayerClickLandmineField = shim("onPlayerClickLandmineField");
export const onPlayerClickWhiteBlow = shim("onPlayerClickWhiteBlow");
export const onPlayerClickSpikeRoll = shim("onPlayerClickSpikeRoll");
export const onPlayerClickThornVolley = shim("onPlayerClickThornVolley");
export const onPlayerClickFireFist = shim("onPlayerClickFireFist");
export const onPlayerClickFlamePillar = shim("onPlayerClickFlamePillar");
export const onPlayerClickIceSpears = shim("onPlayerClickIceSpears");
export const onPlayerClickGlacialAge = shim("onPlayerClickGlacialAge");
export const onPlayerClickDesertSpada = shim("onPlayerClickDesertSpada");
export const onPlayerClickSandstorm = shim("onPlayerClickSandstorm");
export const onPlayerClickQuicksandPit = shim("onPlayerClickQuicksandPit");
export const onPlayerClickBlackHole = shim("onPlayerClickBlackHole");
export const onPlayerClickDarkLiberation = shim("onPlayerClickDarkLiberation");
export const onPlayerClickFalconDive = shim("onPlayerClickFalconDive");
export const onPlayerClickFeatherBarrage = shim("onPlayerClickFeatherBarrage");
export const onPlayerClickDiamondTackle = shim("onPlayerClickDiamondTackle");
export const onPlayerClickPrismReflect = shim("onPlayerClickPrismReflect");
export const onPlayerClickSacredJewel = shim("onPlayerClickSacredJewel");
export const onPlayerClickLightFlashStep = shim("onPlayerClickLightFlashStep");
export const onPlayerClickGatlingBarrage = shim("onPlayerClickGatlingBarrage");
export const onPlayerClickGearWhip = shim("onPlayerClickGearWhip");
export const onPlayerClickHollowBurst = shim("onPlayerClickHollowBurst");
export const onPlayerClickSoulScream = shim("onPlayerClickSoulScream");
export const onPlayerClickMagmaHound = shim("onPlayerClickMagmaHound");
export const onPlayerClickQuakeBubble = shim("onPlayerClickQuakeBubble");
export const onPlayerClickSeaTilt = shim("onPlayerClickSeaTilt");
export const onPlayerClickFissureLine = shim("onPlayerClickFissureLine");
export const onPlayerClickGoldenPalm = shim("onPlayerClickGoldenPalm");
export const onPlayerClickHeavenlyImpact = shim("onPlayerClickHeavenlyImpact");
export const onPlayerClickDharmaSanctuary = shim("onPlayerClickDharmaSanctuary");
export const onPlayerClickTwilightBeams = shim("onPlayerClickTwilightBeams");
export const onPlayerClickMeroArrow = shim("onPlayerClickMeroArrow");
export const onPlayerClickPerfumeFemur = shim("onPlayerClickPerfumeFemur");
export const onPlayerClickSlaveArrowRain = shim("onPlayerClickSlaveArrowRain");
export const onPlayerClickHeartCharm = shim("onPlayerClickHeartCharm");
export const onPlayerClickAnvilDrop = shim("onPlayerClickAnvilDrop");
export const onPlayerClickArcaneTurret = shim("onPlayerClickArcaneTurret");
export const onPlayerClickBastionWall = shim("onPlayerClickBastionWall");
export const onPlayerClickStringSlash = shim("onPlayerClickStringSlash");
export const onPlayerClickWebSnare = shim("onPlayerClickWebSnare");
export const onPlayerClickOverheatWhip = shim("onPlayerClickOverheatWhip");
export const onPlayerClickSkyWalkThread = shim("onPlayerClickSkyWalkThread");
export const onPlayerClickCrescendoFinale = shim("onPlayerClickCrescendoFinale");
export const onPlayerClickSirenHypnosis = shim("onPlayerClickSirenHypnosis");
export const onPlayerClickEncoreBeat = shim("onPlayerClickEncoreBeat");
export const onPlayerClickBlueFlameWings = shim("onPlayerClickBlueFlameWings");
export const onPlayerClickPhoenixTalon = shim("onPlayerClickPhoenixTalon");
export const onPlayerClickRebirthNova = shim("onPlayerClickRebirthNova");
export const onPlayerClickDimensionalGate = shim("onPlayerClickDimensionalGate");
export const onPlayerClickWarpBarrage = shim("onPlayerClickWarpBarrage");
export const onPlayerClickRaigoCloud = shim("onPlayerClickRaigoCloud");
export const onPlayerClickVoltStep = shim("onPlayerClickVoltStep");
export const onPlayerClickThunderGodAura = shim("onPlayerClickThunderGodAura");
export const onPlayerClickPadCannon = shim("onPlayerClickPadCannon");
export const onPlayerClickUrsusShock = shim("onPlayerClickUrsusShock");
export const onPlayerClickRepelStep = shim("onPlayerClickRepelStep");
export const onPlayerClickBlizzardTornado = shim("onPlayerClickBlizzardTornado");
export const onPlayerClickGravityWell = shim("onPlayerClickGravityWell");
export const onPlayerClickMammothStampede = shim("onPlayerClickMammothStampede");
export const onPlayerClickTuskGore = shim("onPlayerClickTuskGore");
export const onPlayerClickTrunkTrumpet = shim("onPlayerClickTrunkTrumpet");
export const onPlayerClickExtinctionQuake = shim("onPlayerClickExtinctionQuake");
export const onPlayerClickTrexBite = shim("onPlayerClickTrexBite");
export const onPlayerClickTailSwipe = shim("onPlayerClickTailSwipe");
export const onPlayerClickPredatorRoar = shim("onPlayerClickPredatorRoar");
export const onPlayerClickMeteoricRampage = shim("onPlayerClickMeteoricRampage");
export const onPlayerClickMochiBuzzsaw = shim("onPlayerClickMochiBuzzsaw");
export const onPlayerClickUnstoppableDonuts = shim("onPlayerClickUnstoppableDonuts");
export const onPlayerClickBrickBat = shim("onPlayerClickBrickBat");
export const onPlayerClickDoppelmanSwap = shim("onPlayerClickDoppelmanSwap");
export const onPlayerClickShadowBox = shim("onPlayerClickShadowBox");
export const onPlayerClickShadowsAsgard = shim("onPlayerClickShadowsAsgard");
export const onPlayerClickHydraSerpent = shim("onPlayerClickHydraSerpent");
export const onPlayerClickToxicCloud = shim("onPlayerClickToxicCloud");
export const onPlayerClickVenomRoad = shim("onPlayerClickVenomRoad");
export const onPlayerClickVenomDemon = shim("onPlayerClickVenomDemon");
export const onPlayerClickGastilleBeam = shim("onPlayerClickGastilleBeam");
export const onPlayerClickGasRobe = shim("onPlayerClickGasRobe");
export const onPlayerClickCombustionNova = shim("onPlayerClickCombustionNova");
export const onPlayerClickSoulPocus = shim("onPlayerClickSoulPocus");
export const onPlayerClickZeusBolt = shim("onPlayerClickZeusBolt");
export const onPlayerClickPrometheusSun = shim("onPlayerClickPrometheusSun");
export const onPlayerClickSovereignDominion = shim("onPlayerClickSovereignDominion");
export const onPlayerClickFingerPistol = shim("onPlayerClickFingerPistol");
export const onPlayerClickFeralMaul = shim("onPlayerClickFeralMaul");
export const onPlayerClickAvalancheBoulder = shim("onPlayerClickAvalancheBoulder");
export const onPlayerClickAbominableRoar = shim("onPlayerClickAbominableRoar");
export const onPlayerClickPermafrostSlam = shim("onPlayerClickPermafrostSlam");
export const onPlayerClickFoxFireOrbs = shim("onPlayerClickFoxFireOrbs");
export const onPlayerClickTailsSweep = shim("onPlayerClickTailsSweep");
export const onPlayerClickMirageDash = shim("onPlayerClickMirageDash");
export const onPlayerClickNineTailsCataclysm = shim("onPlayerClickNineTailsCataclysm");
export const onPlayerClickGammaKnife = shim("onPlayerClickGammaKnife");
export const onPlayerClickCounterShock = shim("onPlayerClickCounterShock");
export const onPlayerClickBoroBreath = shim("onPlayerClickBoroBreath");
export const onPlayerClickDragonTwister = shim("onPlayerClickDragonTwister");
export const onPlayerClickDraconicAscent = shim("onPlayerClickDraconicAscent");

loader = createBlockLoader({ helpers: HELPERS, expected: EXPECTED, log });
export const reloadFruitBlocks = loader.reload;
export const fruitBlocksStatus = loader.status;
export const logFruitBlocksStatus = loader.logStatus;
