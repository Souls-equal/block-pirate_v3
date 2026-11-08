#!/usr/bin/env node
// tools/check-blocks.mjs
//
// 1) Vérifie l'intégrité des packs générés (en-tête, hash, taille, syntaxe).
// 2) Joue le VRAI chargeur (src/fruit/code-block-loader.js) sur les packs avec
//    une api simulée, et vérifie que les 95 handlers — dont Control/Gravity —
//    sont bien enregistrés. C'est le test qui reproduisait le bug « cooldown only ».
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import {
  parseBlock,
  makeBlock,
  MARKER,
  fnv1a,
  findCensoredPatterns,
  findRiskyProducts,
  findRiskyCommas,
  uncensorBlockCode,
} from "./pack-format.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const funcAbilitiesCode = fs.readFileSync(path.join(ROOT, "src/fruit/func-abilities.js"), "utf8");
const HANDLER_NAMES = [...funcAbilitiesCode.matchAll(/=\s*shim\("([A-Za-z0-9_]+)"\)/g)].map(
  (m) => m[1],
);
const OUT = path.join(ROOT, "code-blocks");
const SRC = path.join(ROOT, "src/blocks");
const read = (p) => fs.readFileSync(p, "utf8");
const problems = [];
const check = (cond, msg) => {
  if (!cond) problems.push(msg);
};

// --- Anti-censure : le bug qui a cassé le pack 2 en jeu -----------------------
// Deux passes, deux symptômes :
//  - 1re tentative (demande 68) : le filtre avait remplacé `*b,f=` par `******=`
//    (« Unexpected token » ligne 6). On avait espacé la ponctuation.
//  - 2e tentative : le joueur signale « encore de la censure au même endroit ».
//    Les espaces sont CONSERVÉS (ils ne gênaient pas), mais ils ne suffisaient
//    pas : c'est en AJOUTANT un `1 *` devant l'identifiant que le bloc est
//    passé. Forme validée en jeu, espaces compris :
//        i= (s.hi- s.lo ) * 1 * b ,f =Math.atan2(c-a,s.hi-s.lo)
//    On génère donc `*b` -> `* 1 * b` (multiplication par 1 : résultat
//    identique) en gardant tous les espaces, y compris ceux des règles `x,f`.
//
// On vérifie donc, pour chaque cas : plus aucun motif censurable, correction
// idempotente, JavaScript valide, et surtout RÉSULTAT IDENTIQUE à l'exécution.
const SEMANTIC_CASES = [
  // [paramètres, corps, jeux d'arguments] — le `f` de `ct_dome`, en plus court
  [
    ["s", "b", "c", "a"],
    "const i=(s.hi-s.lo)*b,f=Math.atan2(c-a,s.hi-s.lo);return [i,f];",
    [
      [{ hi: 3, lo: 1 }, 2.5, 4, 1],
      [{ hi: 0.5, lo: -2 }, -3, 0, 7],
    ],
  ],
  [["d", "f"], "const x=d*f;return x;", [[2, 3], [-1.5, 4]]],
  [["t"], "const q=t.f*2;return q;", [[{ f: 3.5 }], [{ f: -2 }]]],
  [
    ["b2", "f0"],
    "const z=b2(f0)*1;return z;",
    [[(v) => v * 3, 2], [(v) => v - 1, 5]],
  ],
  [["f0"], "const n=f0.b+1;return n;", [[{ b: 41 }], [{ b: -1 }]]],
];
const run = (src, params, args) => new Function(...params, src)(...args);
for (const [params, body, argsList] of SEMANTIC_CASES) {
  const fixed = uncensorBlockCode(body);
  const hits = findCensoredPatterns(fixed);
  check(
    hits.length === 0,
    `anti-censure : « ${body} » devient « ${fixed} » qui reste censurable : ` +
      hits.map((h) => `${h.rule}(${h.match})`).join(", "),
  );
  check(uncensorBlockCode(fixed) === fixed, `anti-censure : correction non idempotente sur « ${body} »`);
  check(
    findRiskyProducts(fixed).length === 0,
    `anti-censure : « ${fixed} » contient encore une multiplication suivie d'une lettre seule`,
  );
  try {
    esbuild.transformSync(fixed, { loader: "js", target: "es2019" });
  } catch (e) {
    problems.push(`anti-censure : « ${body} » corrigé en « ${fixed} » = JS invalide : ${e.message}`);
  }
  for (const args of argsList) {
    let before, after;
    try {
      before = run(body, params, args);
      after = run(fixed, params, args);
    } catch (e) {
      problems.push(`anti-censure : « ${fixed} » ne s'exécute plus : ${e.message}`);
      continue;
    }
    check(
      JSON.stringify(before) === JSON.stringify(after),
      `anti-censure : « ${body} » change de résultat (${JSON.stringify(before)} -> ${JSON.stringify(after)})`,
    );
  }
}

// Le contenu des chaînes, gabarits, regex et commentaires est du TEXTE : on
// n'y touche jamais (sinon un joueur verrait `*1*` dans un message du jeu).
const LITERAL_CASES = [
  ["const s2=\"*b, f et *c\";return s2;", "const s2=\"*b, f et *c\";return s2;"],
  ["const s2='x*y';return s2;", "const s2='x*y';return s2;"],
  ["const s2=`*b ${1} *c`;return s2;", "const s2=`*b ${1} *c`;return s2;"],
  ["// *b dans un commentaire\nconst n=1;return n;", "// *b dans un commentaire\nconst n=1;return n;"],
  ["const re=/\\*b/;return re.source;", "const re=/\\*b/;return re.source;"],
  [
    "const s2=\"*b\";const n=s[0]*b;return s2+n.length;",
    "const s2=\"*b\";const n=s[0]* 1 * b;return s2+n.length;",
  ],
];
for (const [body, expected] of LITERAL_CASES) {
  const fixed = uncensorBlockCode(body);
  check(
    fixed === expected,
    `anti-censure : littéral mal traité : « ${body} » -> « ${fixed} » (attendu « ${expected} »)`,
  );
  check(
    run(fixed, ["s", "b"], [[[7], 3]]) === run(body, ["s", "b"], [[[7], 3]]),
    `anti-censure : littéral : le résultat change sur « ${body} »`,
  );
}

// --- La ligne exacte du bug, forme validée en jeu ----------------------------
// Le joueur a relu le bloc APRÈS correction : `i=(s.hi-s.lo)* 1 * *****=`.
// Les cinq astérisques remplacent `b , f` (espaces comprises) : c'est l'espace
// APRÈS la virgule qui déclenche. Sa correction manuelle, qui compilait :
//     i= (s.hi- s.lo ) * 1 * b ,f =Math.atan2(c-a,s.hi-s.lo)
// On exige donc exactement `* 1 * b ,f=` — le `1 *` ET les espaces, avec la
// virgule collée au `f`.
const CT_DOME_LINE = "i=(s.hi-s.lo)*b,f=Math.atan2(c-a,s.hi-s.lo)";
const CT_DOME_FIXED = "i=(s.hi-s.lo)* 1 * b ,f=Math.atan2(c-a,s.hi-s.lo)";
const ctFixed = uncensorBlockCode(CT_DOME_LINE);
check(
  ctFixed === CT_DOME_FIXED,
  `anti-censure : la ligne du dôme doit devenir « ${CT_DOME_FIXED} », obtenu « ${ctFixed} »`,
);
check(
  findRiskyCommas(ctFixed).length === 0,
  `anti-censure : « ${ctFixed} » contient encore « , » + espace + lettre`,
);
// La forme déjà espacée (`b , f`, celle qui a été censurée) doit être ramenée
// à la forme validée, et les virgules normales du code minifié ne bougent pas.
check(
  uncensorBlockCode("x=b , f=1;") === "x=b ,f=1;",
  `anti-censure : « b , f » doit devenir « b ,f » (obtenu « ${uncensorBlockCode("x=b , f=1;")} »)`,
);
// Les virgules ordinaires du code minifié ne sont pas touchées (sinon le code
// grossirait de plusieurs milliers de caractères pour rien) : seules les
// familles à risque (`x,f`, `x,b/d/g`) reçoivent un espace.
check(
  uncensorBlockCode("h1(q,z,w)") === "h1(q,z,w)",
  `anti-censure : les virgules ordinaires ne doivent pas bouger ` +
    `(obtenu « ${uncensorBlockCode("h1(q,z,w)")} »)`,
);

// Les `*` qui ne sont PAS des multiplications, et ceux déjà neutralisés par un
// chiffre, doivent rester tels quels : y insérer `1*` casserait le code.
const UNTOUCHED_CASES = [
  "function*b(){return 1}",
  "const g=function*(){yield*x};",
  "const y=e*9*b;",
  "const p=a**b;",
  "const q=a*=b;",
];
for (const body of UNTOUCHED_CASES) {
  const fixed = uncensorBlockCode(body);
  check(fixed === body, `anti-censure : « ${body} » ne doit pas changer (obtenu « ${fixed} »)`);
  try {
    esbuild.transformSync(fixed, { loader: "js", target: "es2019" });
  } catch (e) {
    problems.push(`anti-censure : « ${fixed} » n'est plus du JavaScript valide : ${e.message}`);
  }
}

const manifest = JSON.parse(read(path.join(OUT, "manifest.json")));

const sources = fs.readdirSync(SRC).filter((f) => f.endsWith(".js")).sort();
const listed = manifest.packs.flatMap((p) => p.sources);
check(listed.length === sources.length, `${listed.length} sources listées / ${sources.length} fichiers`);
check(new Set(listed).size === listed.length, "une source apparaît dans plusieurs packs");
for (const s of sources) check(listed.includes(s), `source non empaquetée : ${s}`);

const texts = new Map();
for (const p of manifest.packs) {
  const file = path.join(OUT, p.file);
  check(fs.existsSync(file), `${p.file} absent`);
  if (!fs.existsSync(file)) continue;
  const text = read(file);
  texts.set(p.z, text);
  const b = parseBlock(text);
  check(!!b, `${p.file} : en-tête BP3 illisible`);
  if (!b) continue;
  check(b.ok, `${p.file} : longueur/hash invalide (bloc tronqué ?)`);
  check(b.index === p.index && b.total === manifest.packCount, `${p.file} : index/total incohérent`);
  check(b.hash === p.hash && fnv1a(b.payload) === p.hash, `${p.file} : hash manifest différent`);
  check(text.length <= 32_000, `${p.file} : ${text.length} car. > limite 32 000 du jeu`);
  check(text.length === p.chars, `${p.file} : taille manifest différente`);
  /* Tous les blocs d'une publication portent la même empreinte : c'est ce qui
     permet au chargeur de repérer un bloc resté à une ancienne version. */
  check(
    b.release === manifest.release,
    `${p.file} : empreinte de version ${b.release || "(absente)"} != ${manifest.release}`,
  );
  check(!text.includes("*****"), `${p.file} : contient "*****" (censure Bloxd.io)`);
  /* On scanne le bloc entier ET chaque module séparément : le texte est
     identique, mais un module isolé permet de nommer le coupable. */
  const censorHits = findCensoredPatterns(text);
  check(
    censorHits.length === 0,
    `${p.file} : motif(s) censurable(s) par Bloxd.io : ` +
      censorHits.map((h) => `${h.rule}(${h.match})`).join(", "),
  );
  for (const [k, part] of b.payload.split(MARKER).entries()) {
    const partHits = findCensoredPatterns(part);
    check(
      partHits.length === 0,
      `${p.file} module ${k + 1} : motif(s) censurable(s) : ` +
        partHits.map((h) => `${h.rule}(${h.match})`).join(", "),
    );
  }
  const parts = b.payload.split(MARKER).map((s) => s.trim()).filter((s) => s && s !== ";");
  check(parts.length === p.modules, `${p.file} : ${parts.length} modules / ${p.modules} annoncés`);
  for (const part of parts) {
    try {
      esbuild.transformSync(part, { loader: "js", target: "es2019" }); // parse seulement
    } catch (e) {
      problems.push(`${p.file} : module invalide : ${e.message}`);
    }
  }
  const mutated = text.slice(0, 200) + "X" + text.slice(201);
  check(parseBlock(mutated).ok === false, `${p.file} : la corruption n'est pas détectée !`);
}

// Un fruit multi-fichiers ne doit jamais être coupé entre deux packs.
for (const family of ["control", "gravity"]) {
  const packs = manifest.packs.filter((p) => p.sources.some((s) => s.includes(`-${family}-`)));
  check(packs.length === 1, `${family} réparti sur ${packs.length} packs (bug de l'état partagé !)`);
  if (packs.length === 1) {
    const expected = sources.filter((s) => s.includes(`-${family}-`));
    const got = packs[0].sources.filter((s) => s.includes(`-${family}-`));
    check(
      JSON.stringify(expected) === JSON.stringify(got),
      `${family} : ordre des fichiers non respecté dans le pack`,
    );
  }
}

// ------------------------------------------------------ simulation du jeu ---
const noop = () => {};
const fxMock = new Proxy({}, { get: (t, k) => (k in t ? t[k] : noop) });
function makeApi(map, logs) {
  return new Proxy(
    {
      log: (m) => logs.push(String(m)),
      now: () => Date.now(),
      getBlock: (x, y, z) => (map.has(z) ? "Code Block" : "Air"),
      getBlockData: (x, y, z) => {
        const t = clock.now();
        readStats.perTick[t] = (readStats.perTick[t] || 0) + 1;
        readStats.total++;
        return { persisted: { shared: { text: map.get(z) } } };
      },
      getEntityType: () => "Player",
      getHealth: () => 20,
      getPlayerIds: () => ["p1", "p2"],
      getPlayerFacingInfo: () => ({ camPos: [0, 65, 0], dir: [0, 0, 1] }),
    },
    { get: (t, k) => (k in t ? t[k] : noop) },
  );
}
/* Horloge À FIL: le chargeur lit les blocs par petits lots (SLOTS_PER_LOAD,
   cf. func-abilities.js) et se rappelle au tick suivant. Un `setTimeout`
   noop ne le laisserait donc jamais finir : on tient une vraie file et on la
   vide dans `runScenario`. */
function makeClock() {
  let time = 0;
  const queue = [];
  return {
    queue,
    now: () => time,
    setTimeout(fn, ticks) {
      const entry = { at: time + Math.max(0, ticks | 0), fn };
      queue.push(entry);
      return { stop: () => { const i = queue.indexOf(entry); if (i >= 0) queue.splice(i, 1); } };
    },
    step(n = 1) {
      for (let i = 0; i < n; i++) {
        time++;
        const due = queue.filter((e) => e.at <= time);
        for (const e of due) {
          const j = queue.indexOf(e);
          if (j >= 0) queue.splice(j, 1);
          try { e.fn(); } catch (_) {}
        }
      }
    },
    /* Vide la file jusqu'à ce que le chargeur soit pret (ou max ticks). */
    drain(isDone, max = 400) {
      let n = 0;
      while (queue.length && n++ < max) {
        this.step(1);
        if (isDone && isDone()) break;
      }
      return n;
    },
  };
}

const clock = makeClock();

/* Combien de blocs on LIT vraiment (getBlockData), et a quel tick : c'est la
   mesure du pic memoire du chargement. `warmup()` ne compte pas (il ne lit que
   le TYPE des cases, une chaine vide). */
const readStats = { total: 0, perTick: {} };
let STATUS_SIZE = 0;
let STATUS_SIZE_BROKEN = 0;
function resetReads() {
  readStats.total = 0;
  readStats.perTick = {};
}

function makeHelpers(api) {
  return new Proxy(
    {
      fx: fxMock,
      mesh: fxMock,
      sound: fxMock,
      api,
      posOf: () => [0, 64, 0],
      safePosition: () => [0, 64, 0],
      isAliveId: () => true,
      isPlayerAlive: () => true,
      facing: () => [0, 0, 1],
      heading: () => [0, 0, 1],
      norm: (v) => v || [0, 0, 1],
      frame: () => ({ f: [0, 0, 1], r: [1, 0, 0], u: [0, 1, 0] }),
      hitSeg: () => ({ count: 0, seen: {} }),
      hitArea: () => 0,
      dist2: () => 4,
      distH2: () => 4,
      clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
      raycast: () => ({ hit: false, pos: [0, 64, 10], dist: 10 }),
      entitiesIn: () => [],
      lifeforms: () => ["p1"],
      safeHealth: () => 20,
      TEX: {},
      TAU: 6.28,
      run: noop,
      sleep: () => ({}),
      setInterval: () => ({ stop: noop }),
      setTimeout: (fn, ticks) => clock.setTimeout(fn, ticks),
    },
    { get: (t, k) => (k in t ? t[k] : noop) },
  );
}

const standaloneLoaderSrc = funcAbilitiesCode.replace(
  /^import\s+\{([\s\S]*?)\}\s+from\s+"[^"]+";/gm,
  (_, names) =>
    "const {" +
    names
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => `${s} = () => {}`)
      .join(", ") +
    "} = {};",
);
const { createBlockLoader } = await import(
  "data:text/javascript;base64," + Buffer.from(standaloneLoaderSrc, "utf8").toString("base64")
);

function runScenario(map, label, tune = () => {}) {
  resetReads();
  for (const k of ["FA", "FA_BOOT", "S", "__CT__", "__GV__", "__FA_LOADER_GENERATION"])
    delete globalThis[k];
  const logs = [];
  const api = makeApi(map, logs);
  globalThis.api = api;
  const helpers = makeHelpers(api);
  tune(helpers, api);
  const loader = createBlockLoader({
    helpers,
    expected: HANDLER_NAMES,
    log: (m) => logs.push(String(m)),
  });
  loader.boot();
  const ticks = clock.drain(() => loader.status().ready || clock.queue.length === 0);
  /* Les timers des packs (capacites programmees) ne doivent pas deborder sur
     le scenario suivant : on repart d'une file vide, mais on GARDE l'horloge
     pour que ses ticks s'additionnent d'un scenario a l'autre. */
  clock.queue.length = 0;
  const status = loader.status();
  status.ticks = ticks;
  status.reads = 0;
  return { status, logs, loader, api, ticks };
}

const base = runScenario(texts, "tous les packs", (helpers) => {
  helpers.run = (co) => {
    for (let i = 0; i < 8 && co && typeof co.next === "function"; i++) {
      const r = co.next();
      if (!r || r.done) break;
    }
  };
});
check(base.status.ready === true, `chargeur non prêt : ${JSON.stringify(base.status.errors)}`);
check(base.status.packCount === manifest.packCount, `packs chargés ${base.status.packCount}`);
check(base.status.missing.length === 0, `handlers manquants : ${base.status.missing.join(", ")}`);
check(base.status.errors.length === 0, `erreurs : ${base.status.errors.join(" | ")}`);

// --- Chargement borné : ce qui évite « InternalError: out of memory » -------
// Les blocs pèsent ~31 000 caractères chacun. Si le chargeur lisait les 24
// cases d'un coup, il tiendrait jusqu'à 750 000 caractères en mémoire dans un
// seul tick, et le bac à sable de Bloxd rend la main par une erreur mémoire.
// Il lit donc SLOTS_PER_LOAD cases par tick : on vérifie la borne ici.
const SLOTS_PER_LOAD = 3;
const readsPerTick = Object.values(readStats.perTick);
const peakReads = readsPerTick.length ? Math.max(...readsPerTick) : 0;
check(
  peakReads <= SLOTS_PER_LOAD,
  `le chargeur lit ${peakReads} blocs dans le même tick (max ${SLOTS_PER_LOAD})`,
);
check(
  readStats.total === manifest.packCount,
  `${readStats.total} lectures de blocs pour ${manifest.packCount} packs (un bloc lu une seule fois)`,
);
check(base.status.ticks > 1, `chargement en un seul tick : le découpage ne sert à rien`);

// Le diagnostic doit être RENVOYABLE par le moteur : au-delà de ~1 200
// caractères, Bloxd répond « InternalError: Result too large » et le joueur ne
// peut plus rien nous dire de son état.
const statusSize = JSON.stringify(base.status).length;
STATUS_SIZE = statusSize;
check(statusSize <= 1200, `FA.status() pèse ${statusSize} caractères : le moteur refusera de le renvoyer`);
check(
  typeof base.status.packs === "undefined",
  "FA.status() renvoie encore le détail complet des packs",
);
check(
  globalThis.FA.packInfo.every((p) => typeof p.handlers === "number"),
  "FA.packInfo garde la liste des handlers de chaque pack (5 000 caractères inutiles)",
);
const payloadKept = globalThis.FA.packInfo.reduce((n, p) => n + (p.payload ? p.payload.length : 0), 0);
check(payloadKept === 0, `${payloadKept} caractères de payload encore retenus après évaluation`);

// --- Un ancien bloc resté en place à côté des nouveaux ----------------------
// Cas réel : le joueur recolle les 8 blocs sans enlever les précédents. Le
// doublon doit être signalé, NON retenu et NON réévalué.
const dupMap = new Map(texts);
const DUP_Z = manifest.origin.z + 20;
dupMap.set(DUP_Z, texts.get(manifest.origin.z));
const dup = runScenario(dupMap, "bloc en double");
check(dup.status.packCount === manifest.packCount, `doublon compté comme pack : ${dup.status.packCount}`);
check(
  dup.logs.some((l) => /en double/.test(l) && /ignor/.test(l)),
  `doublon non signalé (logs : ${dup.logs.join(" | ")})`,
);
check(dup.status.missing.length === 0, `handlers perdus à cause du doublon : ${dup.status.missing.join(", ")}`);

const FRUIT_HANDLERS = HANDLER_NAMES.filter((n) => /^onPlayerClick|^onPlayerLeave|^onCancel/.test(n));
for (const name of FRUIT_HANDLERS) {
  const fn = globalThis.FA.r[name];
  check(typeof fn === "function", `${name} non enregistré`);
  if (typeof fn === "function") {
    try {
      fn("p1", "Black Quick Paintball Explosive Item", false, 0, 0, 0, "Air", null);
    } catch (e) {
      problems.push(`${name} lève une erreur à l'appel : ${e.message}`);
    }
  }
}

// --- « J'ai oublié de mettre à jour un Code Block en jeu » --------------------
// Cas réel (demande 69) : le pack 8 resté à l'ancienne version ne fournissait
// plus les 4 handlers de `flame` (onPlayerClickLaser, MeteorShower x2,
// onCancelMeteorShower) et le chargeur se contentait de dire « 4 handler(s)
// absent(s) ». Avec l'empreinte `v=`, il doit nommer le bloc coupable.
const STALE_Z = manifest.packs[manifest.packs.length - 1].z;
const stalePacks = new Map(texts);
{
  // On reconstitue le pack 8 « d'avant » : uniquement le dernier module
  // (mythical apex) — `flame` n'y était pas, d'où les 4 handlers absents.
  const text = stalePacks.get(STALE_Z);
  const b = parseBlock(text);
  const parts = b.payload.split(MARKER);
  const payload = parts[parts.length - 1];
  stalePacks.set(STALE_Z, makeBlock(b.index, b.total, payload, "deadbeef"));
}
const stale = runScenario(stalePacks, "un bloc d'une autre version");
/* Le pire cas : 4 handlers manquants + 1 bloc périmé + des erreurs. C'est
   CELUI-LÀ qui doit rester renvoyable — un status() court en marche normale ne
   prouve rien. */
const staleSize = JSON.stringify(stale.status).length;
check(staleSize <= 1200, `FA.status() en panne pèse ${staleSize} caractères (moteur : « Result too large »)`);
STATUS_SIZE_BROKEN = staleSize;
check(
  stale.status.stale.length === 1 && stale.status.stale[0].z === STALE_Z,
  `bloc d'une autre version non détecté : ${JSON.stringify(stale.status.stale)}`,
);
check(
  stale.logs.some((l) => /AUTRE version/.test(l) && l.includes(`z=${STALE_Z}`)),
  `aucun message nommant le bloc périmé (logs : ${stale.logs.join(" | ")})`,
);
// Les 4 handlers de `flame` (le module disparu) doivent être signalés, et le
// message doit renvoyer vers la piste « ancienne version ».
const FROZEN = [
  "onPlayerClickLaser",
  "onPlayerClickMeteorShower",
  "onPlayerLeaveMeteorShower",
  "onCancelMeteorShower",
];
for (const name of FROZEN)
  check(stale.status.missing.includes(name), `handler ${name} non signalé comme absent`);
check(
  stale.logs.some((l) => /handler\(s\) absent\(s\)/.test(l) && /ancienne version/.test(l)),
  `le message d'handlers absents ne parle pas d'ancienne version (logs : ${stale.logs.join(" | ")})`,
);

// Régression du vrai bug Control : la coroutine du dôme appelait `point()`
// sans l'avoir déstructuré -> ReferenceError avalée, aucun effet visible.
let pointCalls = 0;
const domain = runScenario(texts, "control domain", (helpers) => {
  const fxSpy = new Proxy(
    { point: () => { pointCalls++; } },
    { get: (t, k) => (k in t ? t[k] : noop) },
  );
  helpers.fx = fxSpy;
  helpers.mesh = fxSpy;
  helpers.sound = fxSpy;
  helpers.entitiesIn = () => ["p2"];
  helpers.run = (co) => {
    for (let i = 0; i < 4 && co && typeof co.next === "function"; i++) {
      const r = co.next();
      if (!r || r.done) break;
    }
  };
});
try {
  globalThis.FA.r.onPlayerClickControlDomain("p1", "item", false, 0, 0, 0, "Air", null);
} catch (e) {
  problems.push(`Control Domain lève une erreur : ${e.message}`);
}
check(pointCalls > 0, "Control Domain : point() n'est jamais appelé (ReferenceError masquée ?)");
void domain;

// Régression du joueur enfermé dans un mur : le dôme posait ses prisonniers en
// orbite à l'aveugle. Sur une falaise, 19 placements sur 40 tombaient DANS le
// solide, et la victime y restait après la fermeture. On rejoue le vrai pack
// tick par tick sur une arête rocheuse (x 10..12 solide).
function runDomainOnCliff(actors, ticks) {
  const pos = { ...actors };
  const teleports = [];
  let co = null;
  const res = runScenario(texts, "dôme sur une falaise", (helpers, api) => {
    const wall = (x) => x >= 10 && x <= 12;
    const at = (id) => (pos[id] ? pos[id].slice() : null);
    api.getPlayerIds = () => Object.keys(pos).filter((id) => id[0] === "p");
    api.getMobIds = () => Object.keys(pos).filter((id) => id[0] === "m");
    api.getPosition = at;
    api.getEntityType = (id) => (id[0] === "p" ? "Player" : "Mob");
    api.getBlockSolidity = (q) => wall(q[0]);
    api.setPosition = (id, x, y, z) => {
      teleports.push({ id, at: [x, y, z] });
      pos[id] = [x, y, z];
      return true;
    };
    helpers.posOf = at;
    helpers.safePosition = at;
    helpers.isAliveId = (id) => !!pos[id];
    helpers.isPlayerAlive = (id) => !!pos[id] && id[0] === "p";
    helpers.isMobAlive = (id) => !!pos[id] && id[0] === "m";
    helpers.solidVoxel = (x) => wall(x);
    helpers.isSolid = (x) => wall(x);
    helpers.teleport = api.setPosition;
    helpers.entitiesIn = (lo, hi) =>
      Object.keys(pos).filter((id) => {
        const q = pos[id];
        return q[0] >= lo[0] && q[0] <= hi[0] && q[1] >= lo[1] && q[1] <= hi[1] &&
          q[2] >= lo[2] && q[2] <= hi[2];
      });
    helpers.run = (c) => { co = c; };
  });
  const cast = () =>
    globalThis.FA.r.onPlayerClickControlDomain("p1", "item", false, 0, 0, 0, "Air", null);
  cast();
  for (let i = 0; i < ticks && co && !co.next().done; i++);
  return { res, pos, teleports, cast };
}
{
  const inWall = (q) => q[0] >= 10 && q[0] <= 12;
  const a = runDomainOnCliff({ p1: [0, 64, 0], p2: [11, 64, 0], m1: [4, 64, 2] }, 60);
  const held = a.teleports.filter((t) => t.id === "p2");
  check(held.length > 10, `dôme : la victime n'est pas tenue (${held.length} placements)`);
  check(
    held.every((t) => !inWall(t.at) && !inWall([t.at[0], t.at[1] + 1, t.at[2]])),
    "dôme : une victime est posée DANS le mur",
  );
  check(
    a.teleports.filter((t) => t.id === "m1").length > 5,
    "dôme : les mobs ne sont pas contrôlés",
  );
  // Au relâchement, une cible dans le bloc doit ressortir à l'air le plus proche.
  const b = runDomainOnCliff({ p1: [0, 64, 0], p2: [5, 64, 0] }, 20);
  b.pos.p2 = [11, 64, 0];
  b.cast();
  check(!inWall(b.pos.p2), `dôme : la victime reste enfermée au relâchement (${b.pos.p2[0]})`);
}

// Un trou au milieu NE DOIT PLUS faire tomber tous les packs suivants.
const withHole = new Map(texts);
withHole.delete(manifest.packs[1].z);
const hole = runScenario(withHole, "un pack manquant");
check(hole.status.packCount === manifest.packCount - 1, "le chargeur s'est arrêté au premier trou");
check(
  hole.logs.some((l) => l.includes("MANQUANT")),
  "pack manquant non signalé dans les logs",
);
// ...et un pack déplacé reste trouvé (identifié par son en-tête, pas par sa z).
const moved = new Map(texts);
const firstZ = manifest.packs[0].z;
const spareZ = manifest.origin.z + 12;
moved.set(spareZ, moved.get(firstZ));
moved.delete(firstZ);
const displaced = runScenario(moved, "pack déplacé");
check(displaced.status.packCount === manifest.packCount, "pack déplacé non retrouvé");

// --------------------------------------------- chunk froid (non chargé) ----
// Bloxd.io ne stream le chunk qu'APRÈS un premier getBlock : la lecture du
// tick 0 échoue, puis le chunk devient lisible un tick plus tard. Le chargeur
// doit préchauffer (warmup) et réessayer au tick suivant.
function makeColdEnv(texts, { typeKnown = false } = {}) {
  for (const k of ["FA", "FA_BOOT", "S", "__CT__", "__GV__", "__FA_LOADER_GENERATION"])
    delete globalThis[k];
  const logs = [];
  let loaded = false;
  let probes = 0;
  let tick = 0;
  const queue = []; // { at, fn?, _load? }
  const api = new Proxy(
    {
      log: (m) => logs.push(String(m)),
      now: () => Date.now(),
      getBlock: (x, y, z) => {
        probes++;
        if (!loaded && !queue.some((q) => q._load)) queue.push({ at: tick + 1, _load: true });
        if (texts.has(z)) return loaded || typeKnown ? "Code Block" : "Air";
        return "Air";
      },
      getBlockData: (x, y, z) =>
        loaded ? { persisted: { shared: { text: texts.get(z) } } } : { persisted: { shared: {} } },
      getEntityType: () => "Player",
      getHealth: () => 20,
      getPlayerIds: () => ["p1"],
      getPlayerFacingInfo: () => ({ camPos: [0, 65, 0], dir: [0, 0, 1] }),
    },
    { get: (t, k) => (k in t ? t[k] : noop) },
  );
  const helpers = makeHelpers(api);
  helpers.setTimeout = (fn, ticks) => {
    queue.push({ at: tick + ticks, fn });
    return { stop: noop };
  };
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) {
      tick++;
      const due = queue.filter((q) => q.at <= tick);
      due.sort((a, b) => (a._load ? -1 : 1) - (b._load ? -1 : 1)); // chunk avant timers
      for (const q of due) {
        queue.splice(queue.indexOf(q), 1);
        if (q._load) loaded = true;
        else q.fn();
      }
    }
  };
  return { api, helpers, step, logs, probes: () => probes, loaded: () => loaded };
}

const coldResults = [];
for (const typeKnown of [false, true]) {
  const label = typeKnown ? "type connu/données froides" : "chunk totalement froid";
  const env = makeColdEnv(texts, { typeKnown });
  globalThis.api = env.api;
  const coldLoader = createBlockLoader({
    helpers: env.helpers,
    expected: HANDLER_NAMES,
    log: (m) => env.logs.push(String(m)),
  });
  check(env.probes() >= 16, `[${label}] warmup absent à la création (${env.probes()} sondes)`);
  coldLoader.boot();
  check(coldLoader.status().ready === false, `[${label}] prêt à tort sur chunk froid`);
  env.step(20); // 24 cases lues par lots de 3, plus le boot
  const s = coldLoader.status();
  check(s.ready === true, `[${label}] jamais prêt après chargement : ${JSON.stringify(s.errors)}`);
  check(s.packCount === manifest.packCount, `[${label}] ${s.packCount}/${manifest.packCount} packs`);
  check(s.missing.length === 0, `[${label}] handlers manquants : ${s.missing.join(", ")}`);
  coldResults.push(`${label}: prêt=${s.ready} (${env.probes()} sondes)`);
}

console.log(
  `FA.status() : ${STATUS_SIZE} car. (${STATUS_SIZE_BROKEN} en panne ; le moteur ` +
    `refuse les gros objets), au plus ${SLOTS_PER_LOAD} blocs lus par tick.`,
);
console.log(
  `${manifest.packCount} packs, ${manifest.packedChars} car., ` +
    `${HANDLER_NAMES.length} handlers vérifiés (dont ${FRUIT_HANDLERS.length} Control/Gravity).`,
);
console.log(`  scénario nominal : ${base.status.packCount} packs, prêt=${base.status.ready}`);
console.log(`  pack manquant    : ${hole.status.packCount} packs, erreur journalisée`);
console.log(`  pack déplacé     : ${displaced.status.packCount} packs retrouvés`);
for (const r of coldResults) console.log(`  chunk froid      : ${r}`);
console.log(`  Control Domain   : ${pointCalls} appel(s) de point() (bug du dôme corrigé)`);
if (problems.length) {
  console.error("\n" + problems.map((p) => "  ✖ " + p).join("\n"));
  process.exit(1);
}
console.log("Intégrité + chargement de bout en bout. ✅");
