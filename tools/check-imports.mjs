// tools/check-imports.mjs — vérifie que tous les imports relatifs du projet pointent
// vers un fichier existant. Aucune dépendance : `node tools/check-imports.mjs`
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");

// Modules référencés par src/index.js mais absents du dépôt (voir src/build/README.md).
const KNOWN_MISSING = new Set(["./build/layer", "./build/path", "./build/plane"]);

const IMPORT_RE = /(?:\bfrom\s*|\bimport\s*)(["'])(\.[^"'\n]*)\1/g;

function walk(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, out);
        else if (/\.(js|ts)$/.test(entry.name)) out.push(full);
    }
    return out;
}

function resolveSpecifier(spec, fromFile) {
    const base = path.resolve(path.dirname(fromFile), spec);
    const candidates = [base, base + ".js", base + ".ts", path.join(base, "index.js"), path.join(base, "index.ts")];
    for (const c of candidates) {
        try {
            if (fs.statSync(c).isFile()) return c;
        } catch {}
    }
    return null;
}

const files = walk(SRC);
const problems = [];
const known = [];
let checked = 0;

for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(IMPORT_RE)) {
        const spec = match[2];
        checked++;
        if (resolveSpecifier(spec, file)) continue;
        const rel = path.relative(ROOT, file);
        if (KNOWN_MISSING.has(spec) && rel === path.join("src", "index.js")) known.push({ rel, spec });
        else problems.push({ rel, spec });
    }
}

console.log(`${files.length} fichiers, ${checked} imports relatifs vérifiés.`);
if (known.length) {
    console.log(`\n${known.length} import(s) vers des modules absents du dépôt (attendu, cf. src/build/README.md) :`);
    for (const k of known) console.log(`  ${k.rel}  ->  ${k.spec}`);
}
if (problems.length) {
    console.log(`\n${problems.length} import(s) cassé(s) :`);
    for (const p of problems) console.log(`  ${p.rel}  ->  ${p.spec}`);
    process.exit(1);
}
console.log("\nAucun import cassé. ✅");
