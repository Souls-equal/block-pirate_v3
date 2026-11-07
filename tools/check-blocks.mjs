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
import { parseBlock, MARKER, fnv1a, findCensoredPatterns } from "./pack-format.mjs";

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
  check(!text.includes("*****"), `${p.file} : contient "*****" (censure Bloxd.io)`);
  const censorHits = findCensoredPatterns(text);
  check(
    censorHits.length === 0,
    `${p.file} : motif(s) censurable(s) par Bloxd.io : ` +
      censorHits.map((h) => `${h.rule}(${h.match})`).join(", "),
  );
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
      getBlockData: (x, y, z) => ({ persisted: { shared: { text: map.get(z) } } }),
      getEntityType: () => "Player",
      getHealth: () => 20,
      getPlayerIds: () => ["p1", "p2"],
      getPlayerFacingInfo: () => ({ camPos: [0, 65, 0], dir: [0, 0, 1] }),
    },
    { get: (t, k) => (k in t ? t[k] : noop) },
  );
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
      setTimeout: () => ({ stop: noop }),
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
  return { status: loader.status(), logs, loader, api };
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
  env.step(6);
  const s = coldLoader.status();
  check(s.ready === true, `[${label}] jamais prêt après chargement : ${JSON.stringify(s.errors)}`);
  check(s.packCount === manifest.packCount, `[${label}] ${s.packCount}/${manifest.packCount} packs`);
  check(s.missing.length === 0, `[${label}] handlers manquants : ${s.missing.join(", ")}`);
  coldResults.push(`${label}: prêt=${s.ready} (${env.probes()} sondes)`);
}

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
