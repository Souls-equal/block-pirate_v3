#!/usr/bin/env node
// tools/build-sources.mjs
//
// Le World Code de Bloxd se colle en PLUSIEURS fichiers lisibles (index.js,
// core/*, gameplay/*, utils/*, fruit/*) : c'est la somme de ces fichiers qui
// est limitee a 512 000 caracteres. Les sources du depot, elles, sont faites
// pour etre lues (commentaires, indentation, noms explicites) : ~475 000
// caracteres a elles seules, donc la limite est atteinte des qu'on ajoute
// deux fichiers de build.
//
// Ce script produit donc `dist/world-src/` : la MEME arborescence, fichier par
// fichier, mais compactee pour le collage dans le jeu :
//   - commentaires et espaces supprimes (minifyWhitespace) ;
//   - code simplifie (minifySyntax : ternaires, constantes, blocs) ;
//   - noms LOCAUX raccourcis (minifyIdentifiers).
//
// Ce qui n'est jamais touche, parce que le jeu s'appuie dessus :
//   - les noms exportes (imports entre fichiers : `import { tick1 as Mt }`) ;
//   - les affectations de globals (`onPlayerClick = ...`, `globalThis.FA_*`) ;
//   - les noms de proprietes (`FA.c.damage`, `api.sendMessage`, `{ str, style }`).
// Chaque fichier est transforme isolement : aucun bundling, donc l'arborescence
// et les imports du jeu restent identiques, seul le texte collé change.
//
// Usage : npm run build:src
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const OUT = path.join(ROOT, "dist", "world-src");
const WORLD_LIMIT = 512_000;
/* Seul `blocks/` ne part pas dans le World Code : ce sont les Code Blocks
   (voir build-blocks.mjs). `build/` est compacté s'il existe chez toi
   (layer/path/sphere) : ces fichiers comptent aussi dans la limite. */
const SKIP_DIRS = new Set(["blocks"]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full, out);
      continue;
    }
    if (/\.(js|ts)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = walk(SRC).sort();
if (!files.length) throw new Error(`Aucun fichier source dans ${SRC}`);

fs.rmSync(OUT, { recursive: true, force: true });

let sourceChars = 0;
const rows = [];
for (const file of files) {
  const rel = path.relative(SRC, file).replace(/\\/g, "/");
  const source = fs.readFileSync(file, "utf8");
  sourceChars += source.length;

  let code;
  try {
    code = esbuild.transformSync(source, {
      // Tout sauf rien : espaces, syntaxe et noms locaux. Pas de `minify: true`
      // d'un bloc pour garder la main sur chaque etape.
      minifyWhitespace: true,
      minifySyntax: true,
      minifyIdentifiers: true,
      format: "esm",
      charset: "ascii",
      legalComments: "none",
      target: "es2020",
      loader: rel.endsWith(".ts") ? "ts" : "js",
    }).code;
  } catch (err) {
    throw new Error(`${rel} : ${err.message || err}`);
  }
  code = code.trim();
  if (!code.endsWith(";") && !code.endsWith("}")) code += ";";

  const target = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, code, "utf8");
  rows.push({ rel, before: source.length, after: code.length });
}

/* Contrôles : le jeu appelle ces points d'entrée par leur nom et les Code
   Blocks lisent ces globals. S'ils disparaissent, tout le monde est muet. */
const entry = fs.readFileSync(path.join(OUT, "index.js"), "utf8");
const ENTRY_POINTS = [
  "onPlayerClick", "onPlayerClickUp", "onPlayerJoin", "onPlayerLeave", "onRespawnRequest",
  "onPlayerChat", "onEntityDeleted", "onEntityCollision", "onWorldAttemptSpawnMob",
  "onWorldAttemptDespawnMob", "onPlayerDamagingOtherPlayer", "onPlayerDamagingMob",
  "onAttemptKillPlayer", "onPlayerKilledOtherPlayer", "onPlayerKilledMob", "onMobDamagingPlayer",
  "onPlayerDropItem", "onPlayerBoughtShopItem", "onPlayerUsedThrowable", "tick", "onClose",
];
for (const name of ENTRY_POINTS) {
  if (!new RegExp("(^|[,;{}\\n])" + name + "\\s*=").test(entry))
    throw new Error(`Point d'entree perdu dans index.js : ${name}`);
}
const bridge = fs.readFileSync(path.join(OUT, "fruit", "func-abilities.js"), "utf8");
for (const name of ["globalThis.FA", "globalThis.FA_BOOT"])
  if (!bridge.includes(name)) throw new Error(`Pont global perdu dans fruit/func-abilities.js : ${name}`);

const total = rows.reduce((sum, r) => sum + r.after, 0);
const compact = fs.readFileSync(path.join(OUT, "index.js"), "utf8");
if (/[ \t]{2,}|\n\s*\n/.test(compact)) throw new Error("index.js compact contient encore des blancs inutiles");

const pct = Math.round((total / WORLD_LIMIT) * 100);
const saved = Math.round((1 - total / sourceChars) * 100);

console.log(`World Code compact  : ${total.toLocaleString("fr-FR")} car. ` +
  `(${pct} % des ${WORLD_LIMIT.toLocaleString("fr-FR")} autorisés, -${saved} % vs sources)`);
console.log(`Sources lisibles    : ${sourceChars.toLocaleString("fr-FR")} car.`);
console.log(`→ ${path.relative(ROOT, OUT)}/${rows.length} fichiers, même arborescence que src/`);
const buildMods = rows.filter((r) => r.rel.startsWith("build/")).map((r) => r.rel);
if (buildMods.length)
  console.log(`   modules build/ compactés : ${buildMods.join(", ")}`);
else
  console.log("   build/ absent : rien à compacter (stubs utilisés par build-world)");
for (const r of rows.sort((a, b) => b.after - a.after).slice(0, 8))
  console.log(`   ${String(r.after).padStart(6)} car.  ${r.rel}  (était ${r.before.toLocaleString("fr-FR")})`);
if (total > WORLD_LIMIT)
  throw new Error(`World Code compact trop grand : ${total} > ${WORLD_LIMIT}`);
