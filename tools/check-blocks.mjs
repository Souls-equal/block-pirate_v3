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
import { parseBlock, MARKER, fnv1a } from "./pack-format.mjs";

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

const standaloneLoaderSrc = funcAbilitiesCode
  .replace(/^import \* as (\w+) from "[^"]+";$/gm, "const $1 = {};")
  .replace(/^export \{ markAggro \} from "[^"]+";$/gm, "export const markAggro = () => {};");
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

const base = runScenario(texts, "tous les packs");
check(base.status.ready === true, `chargeur non prêt : ${JSON.stringify(base.status.errors)}`);
check(base.status.packCount === manifest.packCount, `packs chargés ${base.status.packCount}`);
check(base.status.missing.length === 0, `handlers manquants : ${base.status.missing.join(", ")}`);
check(base.status.errors.length === 0, `erreurs : ${base.status.errors.join(" | ")}`);

const FRUIT_HANDLERS = HANDLER_NAMES.filter((n) => /Control|Gravity/.test(n));
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

console.log(
  `${manifest.packCount} packs, ${manifest.packedChars} car., ` +
    `${HANDLER_NAMES.length} handlers vérifiés (dont ${FRUIT_HANDLERS.length} Control/Gravity).`,
);
console.log(`  scénario nominal : ${base.status.packCount} packs, prêt=${base.status.ready}`);
console.log(`  pack manquant    : ${hole.status.packCount} packs, erreur journalisée`);
console.log(`  pack déplacé     : ${displaced.status.packCount} packs retrouvés`);
console.log(`  Control Domain   : ${pointCalls} appel(s) de point() (bug du dôme corrigé)`);
if (problems.length) {
  console.error("\n" + problems.map((p) => "  ✖ " + p).join("\n"));
  process.exit(1);
}
console.log("Intégrité + chargement de bout en bout. ✅");
