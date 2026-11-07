// tools/check-imports.mjs — vérifie tous les imports et exports relatifs de ./src
// comme si ./src était exécuté directement dans Bloxd.io :
//   1. Chaque import/export/require pointe vers un fichier précis (pas de dossier nu type "../fruit").
//   2. Aucune extension (.js / .ts) dans les chemins d'import.
//   3. Chaque symbole nommé importé (`import { x } from "..."`) est bien exporté par la cible.
//   4. Tous les `import` sont en tête de module (pas d'import au milieu d'un fichier).
//   5. Aucun fichier n'utilise la constante PRIVÉE d'un autre module (voir plus bas :
//      c'est exactement le bug « ReferenceError: BOSS_MOBS is not defined »).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");

// Modules référencés par src/index.js mais absents du dépôt (voir src/build/README.md).
const KNOWN_MISSING = new Set(["./build/layer", "./build/path", "./build/plane", "./build/sphere"]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "blocks") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(js|ts)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function stripCommentsAndStrings(code) {
  return code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");
}

/* Remplace le CONTENU des chaînes par une espace : un nom d'item ou un message
   ne doit jamais être pris pour un identifiant du code. */
function blankStrings(code) {
  return code
    .replace(/"(?:[^"\\\n]|\\.)*"/g, " ")
    .replace(/'(?:[^'\\\n]|\\.)*'/g, " ")
    .replace(/`(?:[^`\\]|\\.)*`/g, " ");
}

/* Noms exportés ET importés d'un fichier (alias `x as y` compris). */
function getImports(file) {
  const txt = stripCommentsAndStrings(fs.readFileSync(file, "utf8"));
  const names = new Set();
  for (const m of txt.matchAll(/^\s*import\s*\{([^}]*)\}\s*from/gm)) {
    for (const part of m[1].split(",")) {
      const p = part.trim();
      if (!p) continue;
      const alias = p.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
      names.add(alias ? alias[2] : p);
    }
  }
  return names;
}

/* Constantes de module en MAJUSCULES (`BOSS_MOBS`, `LOOT_CHANCE`…) : la
   convention du projet pour les tables. Une constante NON exportée n'existe
   que dans son fichier ; l'utiliser ailleurs ne compile pas côté Bloxd (le nom
   devient un global absent) et lève un ReferenceError À L'EXÉCUTION, au pire
   moment. C'est ainsi que `delete BOSS_MOBS[mobId]` dans spawning.js cassait
   chaque kill APRÈS avoir payé l'XP : 186 constantes vérifiées, zéro faux
   positif attendu (les majuscules ne servent jamais de variable locale). */
function getPrivateConstants(file) {
  const txt = blankStrings(stripCommentsAndStrings(fs.readFileSync(file, "utf8")));
  const names = new Set();
  for (const m of txt.matchAll(/^\s*(export\s+)?(?:const|let|var)\s+([A-Z][A-Z0-9_]{2,})/gm)) {
    if (!m[1]) names.add(m[2]);
  }
  return names;
}

function getExports(file) {
  const txt = stripCommentsAndStrings(fs.readFileSync(file, "utf8"));
  const ex = new Set();
  for (const m of txt.matchAll(/\bexport\s+(?:async\s+)?function\*?\s+([A-Za-z_$][\w$]*)/g)) {
    ex.add(m[1]);
  }
  for (const m of txt.matchAll(/\bexport\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) {
    ex.add(m[1]);
  }
  for (const m of txt.matchAll(/\bexport\s*\{([^}]+)\}/g)) {
    for (const part of m[1].split(",")) {
      const p = part.trim();
      if (!p) continue;
      const asMatch = p.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
      ex.add(asMatch ? asMatch[2] : p);
    }
  }
  if (/\bexport\s+default\b/.test(txt)) ex.add("default");
  return ex;
}

function resolveSpecifier(spec, fromFile) {
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const ext of [".js", ".ts"]) {
    const cand = base + ext;
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
      return { file: cand, kind: "file" };
    }
  }
  if (fs.existsSync(base) && fs.statSync(base).isFile()) {
    return { file: base, kind: "with-ext" };
  }
  for (const idx of ["index.js", "index.ts"]) {
    const cand = path.join(base, idx);
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
      return { file: cand, kind: "dir-index" };
    }
  }
  return null;
}

const files = walk(SRC).sort();
const exportsByFile = new Map(files.map((f) => [f, getExports(f)]));
const importsByFile = new Map(files.map((f) => [f, getImports(f)]));
const privateByFile = new Map(files.map((f) => [f, getPrivateConstants(f)]));
const problems = [];
const known = [];
let checked = 0;
let checkedSymbols = 0;

const STMT_RE = /(?:^|[\r\n;])\s*(import|export)\s+([\s\S]*?)\s+from\s*(["'])(\.[^"'\n]+)\3/g;
const REQUIRE_RE = /\brequire\(\s*(["'])(\.[^"'\n]+)\1\s*\)/g;

for (const file of files) {
  const rel = path.relative(SRC, file);
  const raw = fs.readFileSync(file, "utf8");
  const clean = stripCommentsAndStrings(raw);

  for (const m of clean.matchAll(STMT_RE)) {
    const kw = m[1];
    const clause = (m[2] || "").trim();
    const spec = m[4];
    checked++;

    const resolved = resolveSpecifier(spec, file);
    if (!resolved) {
      if (KNOWN_MISSING.has(spec) && rel === "index.js") known.push({ rel, spec });
      else problems.push(`${rel} : cible introuvable "${spec}"`);
      continue;
    }
    if (resolved.kind === "with-ext") {
      problems.push(`${rel} : "${spec}" contient une extension de fichier (attendu sans extension dans Bloxd.io)`);
    }
    if (resolved.kind === "dir-index") {
      problems.push(`${rel} : "${spec}" pointe vers un dossier (utiliser "${spec}/index" pour Bloxd.io)`);
    }
    if (clause.includes("* as")) {
      problems.push(`${rel} : "${clause}" utilise import * as (préférer les imports nommés explicites)`);
    }

    const targetExports = exportsByFile.get(resolved.file) || new Set();
    const targetRel = path.relative(SRC, resolved.file);
    const brace = clause.match(/^\{([\s\S]*)\}$/);
    if (brace) {
      for (const part of brace[1].split(",")) {
        const p = part.trim();
        if (!p) continue;
        const asMatch = p.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
        const importedName = asMatch ? asMatch[1] : p;
        checkedSymbols++;
        if (!targetExports.has(importedName)) {
          problems.push(`${rel} : "${importedName}" n'est pas exporté par ${targetRel} (via "${spec}")`);
        }
      }
    } else if (kw === "import") {
      problems.push(`${rel} : clause d'import non standard : ${clause} from "${spec}"`);
    }
  }

  for (const rm of clean.matchAll(REQUIRE_RE)) {
    const spec = rm[2];
    checked++;
    const resolved = resolveSpecifier(spec, file);
    if (!resolved) {
      problems.push(`${rel} : require("${spec}") introuvable`);
    } else if (resolved.kind !== "file") {
      problems.push(`${rel} : require("${spec}") doit pointer vers un fichier sans extension`);
    }
  }
}

/* ── 5. Constante privée utilisée depuis un autre module ─────────────────── */
const owners = new Map();
for (const [file, names] of privateByFile) {
  for (const name of names) {
    if (!owners.has(name)) owners.set(name, []);
    owners.get(name).push(file);
  }
}
let checkedConstants = 0;
for (const file of files) {
  const rel = path.relative(SRC, file);
  const body = blankStrings(stripCommentsAndStrings(fs.readFileSync(file, "utf8")));
  const own = privateByFile.get(file);
  const imported = importsByFile.get(file);
  for (const [name, where] of owners) {
    if (own.has(name) || imported.has(name)) continue;
    if (where.some((w) => exportsByFile.get(w).has(name))) continue;
    if (where.length > 1) continue; // homonyme dans plusieurs fichiers : bruit
    checkedConstants++;
    const use = new RegExp(`(?<![\\w$.])${name}(?![\\w$:])`);
    if (!use.test(body)) continue;
    problems.push(
      `${rel} : utilise « ${name} », une constante PRIVÉE de ${path.relative(SRC, where[0])} ` +
        `(non exportée : ReferenceError à l'exécution — l'exporter, ou passer par une fonction)`,
    );
  }
}

console.log(
  `${files.length} fichiers dans ./src, ${checked} imports/requires, ${checkedSymbols} symboles exportés ` +
    `et ${owners.size} constantes de module vérifiés.`,
);
if (known.length) {
  console.log(
    `\n${known.length} import(s) vers des modules absents du dépôt (attendu, cf. src/build/README.md) :`,
  );
  for (const k of known) console.log(`  src/${k.rel}  ->  ${k.spec}`);
}
if (problems.length) {
  console.error(`\n${problems.length} problème(s) d'import/export :`);
  for (const p of problems) console.error(`  ✖ ${p}`);
  process.exit(1);
}
console.log("\nTous les imports et exports de ./src sont valides pour Bloxd.io. ✅");
