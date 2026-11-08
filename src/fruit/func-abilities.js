// fruit/func-abilities.js — pont lisible entre le World Code et les 7 Code Blocks (BP3).
// Remplace directement l'ancien `func-abilities.js` dans Bloxd.io (aucun fichier à ajouter).

import {
  aggro,
  applyEffect,
  ccLocked,
  claimSummon,
  clearPlayerEffects,
  damage,
  forceCameraDir,
  inVehicle,
  isCrowdControlEffect,
  setMoveSpeed,
  vehicleTypeOf,
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
import { getActor, run, setInterval, setTimeout, sleep, step, until, withActor } from "../utils/timer";
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

// L'empreinte `v=` (même valeur sur les 8 blocs d'une version) est optionnelle :
// les blocs d'une version antérieure n'en ont pas et restent lisibles.
const HEADER_RE = /^\s*\/\*BP3:(\d+)\/(\d+):len=(\d+):h=([0-9a-f]{8})(?::v=([0-9a-f]{8}))?\*\/\s*/;

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
    release: m[5] || "",
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
  ccLocked,
  claimSummon,
  clearPlayerEffects,
  damage,
  forceCameraDir,
  inVehicle,
  isCrowdControlEffect,
  setMoveSpeed,
  vehicleTypeOf,
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
  FA.stale = [];
  FA.release = "";
  FA.sourceHash = "";

  const seen = {};
  function warn(tag, msg) {
    const now = Date.now();
    if (!seen[tag] || now - seen[tag] >= 2000) {
      seen[tag] = now;
      say(msg);
    }
  }

  /* --- Anti-spam ---------------------------------------------------------
     `load()` se rejoue jusqu'a 30 fois (chunk froid, blocs pas encore poses) et
     reemet a chaque tentative les MEMES lignes : « aucun Code Block trouve »,
     « N handler(s) absent(s) »… Un monde ou les blocs manquent produisait des
     centaines de lignes de log pour un seul etat, et noyait le vrai message.

     Regle : un message identique n'est dit qu'UNE fois. S'il disparait puis
     revient (bloc recolle, puis retire), il est redit : c'est un vrai
     changement d'etat, pas du bruit. `warn()` (limite a 2 s par tag) reste pour
     le bruit transitoire, `sayOnce()` pour les constats durables. */
  const said = {};
  function sayOnce(key, msg) {
    if (said[key]) return;
    said[key] = true;
    say(msg);
  }
  function sayErrors(errors) {
    const still = {};
    for (const e of errors) {
      still[e] = true;
      sayOnce("err:" + e, "[FA] " + e);
    }
    for (const k in said) if (k.indexOf("err:") === 0 && !still[k.slice(4)]) delete said[k];
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
      /* UN tag pour toutes les cases : avec un tag par `z`, 24 cases en echec
         autorisaient 24 lignes toutes les 2 s. */
      warn("slot", "[FA] lecture d'un Code Block z=" + z + " : " + (e?.message || e));
      return null;
    }
  }

  /* Lecture des blocs PAR PETITS LOTS, un lot par tick.

     Les 8 blocs pèsent ~31 000 caractères chacun. Tout lire dans le même tick
     fait tenir d'un coup en mémoire jusqu'à SCAN_SLOTS textes de 31 000
     caractères (un ancien bloc resté en place suffit à doubler la facture), et
     le bac à sable de Bloxd est étroit : c'est le genre de pic qui ressort en
     « InternalError: out of memory » au chargement du monde. On ne lit donc que
     SLOTS_PER_LOAD cases par passage, et un bloc en double n'est pas retenu. */
  const SLOTS_PER_LOAD = 3;

  function newScan() {
    return { cursor: 0, byIndex: {}, errors: [], total: 0, oldFormat: 0 };
  }

  function collectStep(st) {
    const end = Math.min(SCAN_SLOTS, st.cursor + SLOTS_PER_LOAD);
    for (; st.cursor < end; st.cursor++) {
      const found = readSlot(st.cursor);
      if (!found) continue; // ne s'arrête pas au premier trou
      const b = parseBlock(found.text);
      if (!b) {
        st.oldFormat++;
        continue;
      }
      if (b.index < 1 || b.index > SCAN_SLOTS) {
        st.errors.push(`pack ${b.index} hors bande (z=${found.z})`);
        continue;
      }
      st.total = Math.max(st.total, b.total, b.index);
      if (st.byIndex[b.index]) {
        /* Le premier trouvé gagne ; le texte du doublon est abandonné ici pour
           ne pas le garder en mémoire jusqu'à l'évaluation. */
        st.errors.push(`pack ${b.index} en double (z=${found.z}) ignoré`);
        continue;
      }
      parseInto(st, b, found.z);
    }
    return st.cursor >= SCAN_SLOTS;
  }

  function parseInto(st, b, z) {
    if (!b.ok) {
      st.errors.push(
        b.censored
          ? `pack ${b.index} (z=${z}) CENSURÉ par Bloxd.io ("*****" détecté)`
          : `pack ${b.index} (z=${z}) TRONQUÉ ou modifié : ${b.payload.length}/${b.len} car. (${b.hash})`,
      );
    }
    st.byIndex[b.index] = { ...b, z: z };
  }

  function finishScan(st) {
    const { byIndex, total, errors, oldFormat } = st;
    if (!total) {
      errors.push(`aucun Code Block ${MAGIC} trouvé vers (${origin().join(", ")}).`);
      if (oldFormat) errors.push(`${oldFormat} ancien(s) bloc(s) ignoré(s).`);
    } else {
      for (let i = 1; i <= total; i++) {
        if (!byIndex[i]) errors.push(`pack ${i}/${total} MANQUANT (attendu vers z=${origin()[2] + i - 1})`);
      }
      if (oldFormat) sayOnce("old:" + oldFormat, `[FA] ${oldFormat} ancien(s) Code Block(s) ignoré(s).`);
    }
    return { byIndex, total, errors };
  }

  function evalPack(pack) {
    const before = new Set(Object.keys(FA.r));
    const chars = pack.payload.length; // le payload est relâché juste après
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
    /* Pas la LISTE des handlers de chaque pack (197 noms = 5 000 caractères) :
       `status()` doit rester assez petit pour que Bloxd accepte de le renvoyer
       (« InternalError: Result too large » sinon). Le total est déjà dans
       `status().registered`, le détail se lit avec FA.logStatus(). */
    FA.packInfo.push({
      index: pack.index,
      z: pack.z,
      modules: parts.length,
      evaluated: ok,
      chars: chars,
      handlers: Object.keys(FA.r).filter((k) => !before.has(k)).length,
    });
  }

  let loading = false;
  let booted = false;
  let lastLoad = 0;
  let retries = 0;
  /* `evaluatedOnce` separe les deux causes d'un handler absent :
       - FAUX  : les packs n'ont pas encore ete lus. Le chunk des Code Blocks
                 arrive avec un tick de retard et le balayage prend plusieurs
                 ticks : un appel qui tombe la est NORMAL, pas une panne ;
       - VRAI  : on a lu les blocs et le handler n'y est pas (bloc manquant,
                 censure, ancienne version) : la c'est un vrai bug, et le
                 signaler bruyamment est utile. */
  let evaluatedOnce = false;
  /* Balayage en cours : il survit d'un tick à l'autre (cf. SLOTS_PER_LOAD). */
  let scan = null;

  function load(force) {
    if (!alive() || loading) return;
    loading = true;
    try {
      // Sondage du chunk au début d'un balayage : si la lecture synchro
      // échoue (chunk froid), le retry du tick suivant lira un chunk chargé.
      if (!scan) warmup();
      if (!scan) scan = newScan();
      if (!collectStep(scan)) {
        // Lot suivant au prochain tick : le pic mémoire reste borné.
        schedule(() => alive() && load(false), 1);
        return;
      }
      const { byIndex, total, errors } = finishScan(scan);
      scan = null;
      FA.errors = errors.slice();
      sayErrors(FA.errors);

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
        evaluatedOnce = true;
        /* Les payloads ne servent plus : on les relâche (8 x ~31 000
           caractères) pour rendre la mémoire au bac à sable. */
        for (const pack of packs) pack.payload = "";
        for (const k in byIndex) byIndex[k].payload = "";
        FA.sourceHash = cacheKey;
        sayErrors(FA.errors); // erreurs levees par l'evaluation des modules
      }

      /* Un Code Block recopié d'une ancienne version est invisible autrement :
         son en-tête est cohérent, il se charge, mais il ne fournit pas les bons
         handlers (c'est ce qui a coûté 4 handlers de `flame` à la demande 69).
         L'empreinte `v=` est la même sur tous les blocs d'une même version : on
         prend la plus fréquente comme référence et on nomme les autres. */
      /* Un Code Block recopié d'une ancienne version est invisible autrement :
         son en-tête est cohérent, il se charge, mais il ne fournit pas les bons
         handlers (c'est exactement ce qui a coûté les 4 handlers de `flame` à la
         demande 69). L'empreinte `v=` est la même sur tous les blocs d'une même
         version : on prend la plus fréquente comme référence, et on nomme les
         autres — avec leur z, pour savoir quel bloc recoller. */
      const versions = {};
      for (const p of packs) if (p.release) versions[p.release] = (versions[p.release] || 0) + 1;
      let release = "";
      let best = 0;
      for (const v in versions)
        if (versions[v] > best) {
          best = versions[v];
          release = v;
        }
      FA.release = release;
      FA.stale = release
        ? packs
            .filter((p) => (p.release || "") !== release)
            .map((p) => ({ index: p.index, z: p.z, release: p.release || "" }))
        : [];
      if (FA.stale.length)
        sayOnce(
          "stale:" + FA.stale.map((s) => s.index).join(",") + ":" + release,
          `[FA] ${FA.stale.length} Code Block(s) d'une AUTRE version : ` +
            FA.stale.map((s) => `pack ${s.index} (z=${s.z})`).join(", ") +
            ` — recopie-les depuis code-blocks/ (version ${release}).`,
        );

      const missing = expected.filter((n) => typeof FA.r[n] !== "function");
      if (missing.length) {
        /* Une ligne par ETAT, pas par tentative : la liste des manquants ne
           change pas d'un essai a l'autre, il n'y a rien a repeter. On en cite
           huit, le reste est dans `FA.status().missingCount` / logStatus(). */
        sayOnce(
          "missing:" + missing.join(",") + ":" + FA.stale.length,
          `[FA] ${missing.length} handler(s) absent(s) : ${missing.slice(0, 8).join(", ")}` +
            (missing.length > 8 ? "…" : "") +
            ` (voir FA.status()).` +
            (FA.stale.length ? " Un Code Block est d'une ancienne version (voir la ligne ci-dessus)." : ""),
        );
      } else if (packs.length) {
        sayOnce(
          "ok:" + sourceHash,
          `[FA] ${packs.length}/${total} pack(s) chargé(s), ${Object.keys(FA.r).length} handlers ` +
            `(v=${release || "?"}, ${sourceHash}).`,
        );
      }

      FA.ready = packs.length === total && missing.length === 0 && FA.errors.length === 0;
      if (!FA.ready && retries < 30) {
        retries++;
        // Les 2 premiers essais sont rapprochés (2 ticks) pour profiter du
        // warmup de ce tick ; ensuite on repasse à 10 ticks pour ne pas spammer.
        const delay = retries <= 2 ? 2 : 10;
        scan = null; // un chunk froid a pu rendre des cases illisibles : on relit
        schedule(() => alive() && load(false), delay);
      } else if (FA.ready) {
        retries = 0;
      }
    } catch (e) {
      FA.errors.push("chargeur : " + (e?.message || e));
      sayOnce("loader:" + (e?.message || e), "[FA] erreur du chargeur : " + (e?.message || e));
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

  /* `status()` doit être PETIT : Bloxd refuse de renvoyer un objet trop gros
     (« InternalError: Result too large »), et un diagnostic qu'on ne peut pas
     lire ne sert à rien. On garde donc des compteurs, le détail des manquants
     est plafonné — `status(true)` le donne en entier pour un test hors jeu — et
     les longues listes s'affichent par `logStatus()`, qui passe par api.log. */
  const MAX_NAMES = 12;
  const MAX_ERRORS = 5;
  const MAX_CHARS = 90;
  const cut = (s) => (String(s).length > MAX_CHARS ? String(s).slice(0, MAX_CHARS - 1) + "~" : String(s));

  function status(detail) {
    const missing = expected.filter((n) => typeof FA.r[n] !== "function");
    return {
      generation,
      alive: alive(),
      ready: !!FA.ready,
      origin: origin().join(", "),
      packCount: FA.packInfo.length,
      release: FA.release,
      /* Le z suffit à retrouver le bloc à recoller : on ne renvoie que lui
         (la chaîne `release` ferait doublon avec `status().release`). */
      stale: FA.stale.slice(0, 4).map((s) => ({ index: s.index, z: s.z })),
      registered: Object.keys(FA.r).length,
      expected: expected.length,
      /* "boot" = les packs ne sont pas encore lus : un handler absent est
         normal. "ok" = lus. C'est ce qui explique un message « still loading ». */
      phase: evaluatedOnce ? "ok" : "boot",
      ignoredEarly: earlyCalls,
      missingCount: missing.length,
      missing: detail ? missing : missing.slice(0, MAX_NAMES),
      errors: FA.errors.slice(0, MAX_ERRORS).map(cut),
      errorCount: FA.errors.length,
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

  /* Appel arrive AVANT que les packs soient lus (demarrage du monde, chunk des
     Code Blocks encore froid, balayage en cours). Rien n'est casse : l'evenement
     tombe juste trop tot. On ne LEVE PAS d'erreur — c'etait elle qui remontait
     en « InternalError » au lancement — et on previent le joueur UNE fois, pour
     qu'il ne croie pas que son clic n'a rien fait par hasard. */
  const toldPending = {};
  let earlyCalls = 0;
  function tooEarly(name, args) {
    /* UNE seule ligne pour tous les handlers. `warn()` est limite a 2 s mais son
       compteur est par `tag`, et le tag contenait le nom du handler : avec 197
       capacites, cela faisait 197 lignes autorisees toutes les 2 s. On veut
       savoir qu'on est dans la fenetre de demarrage, pas la liste des clics. */
    sayOnce(
      "early",
      "[FA] capacités utilisées avant la fin du chargement : ignorées (le monde démarre). " +
        "Le detail est dans FA.status().ignoredEarly.",
    );
    const pid = args && typeof args[0] === "string" ? args[0] : null;
    if (!pid || toldPending[pid]) return;
    toldPending[pid] = true;
    try {
      getApi().sendMessage(pid, [
        { str: "Abilities are still loading — ", style: { color: "#CBD5E1" } },
        { str: "try again", style: { color: "#4ADE80", fontWeight: "bold" } },
        { str: " in a moment.", style: { color: "#CBD5E1" } },
      ]);
    } catch (e) {
      /* un joueur deconnecte entre-temps : rien a faire, et surtout pas jeter */
    }
  }

  function call(name, args) {
    let fn = FA.r?.[name];
    if (typeof fn !== "function") {
      boot();
      fn = FA.r?.[name];
    }
    if (typeof fn !== "function") {
      /* « Trop tot » seulement tant que le chargeur garde un espoir : il
         reessaie (retries < 30). Une fois qu'il a abandonne (aucun bloc pose,
         blocs tous censures…), un handler absent EST une panne : on repasse par
         le signalement bruyant, sinon le joueur verrait « still loading »
         indefiniment et personne ne comprendrait. */
      if (!evaluatedOnce && retries < 30) {
        earlyCalls++;
        tooEarly(name, args);
        return undefined;
      }
      /* Une fois par handler : le rappel toutes les 2 s redevenait du spam des
         que plusieurs capacites etaient cliquées. */
      sayOnce("miss:" + name, `[FA] handler '${name}' introuvable : Code Block non chargé (FA.status()).`);
      if (/^onPlayerClick|^onPlayerRelease|^onPlayerUsed/.test(name)) {
        throw new Error("[FA] handler manquant : " + name);
      }
      return undefined;
    }
    /* Ceinture de securite : un handler `onPlayer*(joueur, ...)` est execute
       au nom de ce joueur. Si l'appelant n'a pas deja pose l'acteur (cast
       d'une capacite), on le pose ici, pour que ses propres deplacements
       restent autorises et que ceux des autres restent bloques. */
    if (getActor() || !args || !args[0]) return fn.apply(null, args);
    return withActor(args[0], () => fn.apply(null, args));
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
