#!/usr/bin/env node
// tools/check-handlers.mjs
// Vérifie la chaîne complète : Code Block -> Object.assign(R, ...) -> shim exporté.
// Un handler manquant = une capacité qui ne déclenche que son cooldown.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC_BLOCKS = path.join(ROOT, "src/blocks");
const read = (p) => fs.readFileSync(p, "utf8");

const namesFile = read(path.join(ROOT, "src/fruit/handler-names.js"));
const expected = [...namesFile.matchAll(/^\s*"([A-Za-z0-9_]+)",/gm)].map((m) => m[1]);

const shimFile = read(path.join(ROOT, "src/fruit/func-abilities.js"));
const shims = new Set([
  ...[...shimFile.matchAll(/export const ([A-Za-z0-9_]+)\s*=/g)].map((m) => m[1]),
  ...[...shimFile.matchAll(/export \{ ([A-Za-z0-9_]+)/g)].map((m) => m[1]),
]);

// Extrait les clés d'un littéral objet en respectant les accolades/chaînes.
function objectKeys(text, start) {
  let depth = 0,
    quote = null,
    esc = false,
    end = -1;
  const parts = [];
  let partStart = start + 1;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    } else if (c === "," && depth === 1) {
      parts.push(text.slice(partStart, i));
      partStart = i + 1;
    }
  }
  if (end < 0) return [];
  parts.push(text.slice(partStart, end));
  const keys = [];
  for (const part of parts) {
    const m = /^\s*(?:\/\*[\s\S]*?\*\/\s*)?(?:([A-Za-z_$][\w$]*)\s*:|([A-Za-z_$][\w$]*)\s*$)/.exec(
      part.trim(),
    );
    if (m) keys.push(m[1] || m[2]);
  }
  return keys;
}

function registeredBy(file) {
  const text = read(file);
  const found = new Set();
  // Seuls R (= FA.r) et n (alias FA.r dans 251-control-domain.js) sont des
  // registres de handlers ; V/C sont des objets d'état internes.
  const re = /Object\.assign\(\s*([A-Za-z_$][\w$]*)\s*,\s*\{/g;
  let m;
  while ((m = re.exec(text))) {
    if (m[1] !== "R" && m[1] !== "n") continue;
    const brace = text.indexOf("{", m.index + "Object.assign(".length);
    for (const k of objectKeys(text, brace)) found.add(k);
  }
  for (const d of text.matchAll(/\bR\.([A-Za-z_$][\w$]*)\s*=/g)) found.add(d[1]);
  return found;
}

const files = fs.readdirSync(SRC_BLOCKS).filter((f) => f.endsWith(".js")).sort();
const provided = new Map();
for (const f of files)
  for (const k of registeredBy(path.join(SRC_BLOCKS, f))) {
    if (!provided.has(k)) provided.set(k, []);
    provided.get(k).push(f);
  }

const problems = [];
for (const n of expected) {
  if (!shims.has(n)) problems.push(`shim manquant dans func-abilities.js : ${n}`);
  if (!provided.has(n)) problems.push(`aucun Code Block n'enregistre : ${n}`);
}
// Helpers internes posés sur FA.r mais sans shim World Code (volontaire).
const INTERNAL = new Set(["paintForget"]);
for (const n of provided.keys())
  if (!expected.includes(n) && !INTERNAL.has(n) && /^(on|is|portal|paint)/.test(n))
    problems.push(`handler enregistré mais absent de handler-names.js : ${n}`);
if (new Set(expected).size !== expected.length)
  problems.push("doublon dans handler-names.js");

const critical = provided;
console.log(`${files.length} sources, ${expected.length} shims, ${critical.size} handlers enregistrés.`);
for (const fruit of ["Control", "Gravity"]) {
  const keys = expected.filter((n) => n.toLowerCase().includes(fruit.toLowerCase()));
  const missing = keys.filter((n) => !provided.has(n));
  console.log(
    `  ${fruit.padEnd(8)} : ${keys.length} handlers, ` +
      (missing.length ? `MANQUANTS ${missing.join(", ")}` : "tous fournis ✅"),
  );
  if (missing.length) problems.push(`${fruit} : ${missing.join(", ")}`);
}
if (problems.length) {
  console.error("\n" + problems.map((p) => "  ✖ " + p).join("\n"));
  process.exit(1);
}
console.log("Chaîne de handlers complète. ✅");
