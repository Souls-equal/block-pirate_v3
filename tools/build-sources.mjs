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
// Ce script produit donc `world-code/` (versionne dans git, comme
// `code-blocks/`, pour que tu puisses le copier depuis GitHub) : la MEME
// arborescence, fichier par fichier, mais compactee pour le collage :
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
/* Versionne (pas dans dist/, ignore par git) : c'est le dossier que tu
   ouvres sur GitHub pour copier chaque fichier dans le World Code. */
const OUT = path.join(ROOT, "world-code");
const WORLD_LIMIT = 512_000;
/* Le World Code de Bloxd est limite en NOMBRE DE FICHIERS (64) en plus des
   caracteres. On bloque le build plutot que de le decouvrir en collant.
   Le plafond a double : on peut enfin decouper les gros fichiers par sujet
   (saber/ est passe de 1 fichier de 2000 lignes a 8 fichiers lisibles). */
const FILE_LIMIT = 64;
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

/* --check : ne rien ecrire, juste verifier que world-code/ est a jour.
   Utilise par `npm run check` et par la CI (voir .github/workflows). */
const CHECK_ONLY = process.argv.includes("--check");

let sourceChars = 0;
const rows = [];
const outputs = [];
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

  outputs.push({ rel, code });
  rows.push({ rel, before: source.length, after: code.length });
}

/* Contrôles : le jeu appelle ces points d'entrée par leur nom et les Code
   Blocks lisent ces globals. S'ils disparaissent, tout le monde est muet. */
/* Le fichier COMPILE a l'instant, pas celui du disque : `world-code/` peut etre
   en retard (c'est justement ce que ce script sert a corriger), et un point
   d'entree tout neuf ferait alors echouer toutes les executions. */
const fresh = outputs.find((o) => o.rel === "index.js");
const entry = fresh ? fresh.code : fs.readFileSync(path.join(OUT, "index.js"), "utf8");
const ENTRY_POINTS = [
  "onPlayerClick", "onPlayerClickUp", "onPlayerJoin", "onPlayerLeave", "onRespawnRequest",
  "onPlayerChat", "onEntityDeleted", "onEntityCollision", "onWorldAttemptSpawnMob",
  "onWorldAttemptDespawnMob", "onPlayerDamagingOtherPlayer", "onPlayerDamagingMob",
  "onAttemptKillPlayer", "onPlayerKilledOtherPlayer", "onPlayerKilledMob", "onMobDamagingPlayer",
  "onPlayerDropItem", "onPlayerBoughtShopItem", "onPlayerUsedThrowable",
  /* Ajoutes par la demande 76 : ils bloquent les actions des deux items de
     commande. S'ils disparaissent, les items redeviennent lancables. */
  "onPlayerAttemptAltAction", "onPlayerStartChargingItem", "onPlayerPressedButton",
  /* La demande 90 avait ajoute `onTouchscreenActionButton` ici ; la 93 l'a
     retire : ce callback appartient au bouton d'ACTION (frapper, casser des
     blocs), pas a nous. S'il revenait, chaque coup dasherait. */
  "onPlayerSelectInventorySlot",
  "tick", "onClose",
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
/* Ecriture (ou verification en mode --check). */
if (CHECK_ONLY) {
  const stale = [];
  const extra = [];
  for (const out of outputs) {
    const target = path.join(OUT, out.rel);
    if (!fs.existsSync(target)) { stale.push(out.rel + " (manquant)"); continue; }
    if (fs.readFileSync(target, "utf8") !== out.code) stale.push(out.rel);
  }
  const expected = new Set(outputs.map((o) => o.rel).concat(["README.md"]));
  if (fs.existsSync(OUT)) {
    for (const rel of walk(OUT).map((f) => path.relative(OUT, f).replace(/\\/g, "/")))
      if (!expected.has(rel)) extra.push(rel);
  }
  if (stale.length || extra.length) {
    console.error("world-code/ n'est pas a jour par rapport a src/ :");
    for (const f of stale.slice(0, 12)) console.error("  - " + f);
    if (stale.length > 12) console.error(`  ... ${stale.length - 12} autre(s)`);
    for (const f of extra) console.error("  + " + f + " (n'existe plus dans src/)");
    console.error("Lance `npm run build:src` puis commit world-code/.");
    process.exit(1);
  }
  console.log(`world-code/ a jour (${outputs.length} fichiers, ${total.toLocaleString("fr-FR")} car.)`);
  process.exit(0);
}

fs.rmSync(OUT, { recursive: true, force: true });
for (const out of outputs) {
  const target = path.join(OUT, out.rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, out.code, "utf8");
}

/* README du dossier : dit quoi copier, où, et ce qui change. */
const readme = [
  "# world-code/ - World Code compact (genere, NE PAS EDITER A LA MAIN)",
  "",
  "Sources lisibles : `src/`. Regenerer : `npm run build:src`.",
  "",
  `**${rows.length} fichiers, ${total.toLocaleString("fr-FR")} caracteres** ` +
    `(${pct} % de la limite de ${WORLD_LIMIT.toLocaleString("fr-FR")} du World Code, ` +
    `-${saved} % par rapport aux sources lisibles).`,
  "",
  "## Comment coller",
  "",
  "Recopie **chaque fichier dans le fichier de meme nom** de ton World Code",
  "(l'arborescence est identique a `src/`) : `index.js`, `core/*`, `gameplay/*`,",
  "`utils/*`, `fruit/fruitData.js`, et - si tu les utilises - tes",
  "`build/layer.js`, `build/path.js`, `build/sphere.js`.",
  "",
  "`blocks/` n'est PAS ici : ses modules partent dans les Code Blocks",
  "(`code-blocks/pack-XX.js`).",
  "",
  "## Ce qui change (et ce qui ne change pas)",
  "",
  "- Supprimes : commentaires, indentation, espaces inutiles, parentheses et",
  "  code redondant (memes regles qu'un minifieur).",
  "- Raccourcis : les noms **locaux** (variables de fonction, parametres).",
  "- **Intacts** : les noms exportes (donc les `import { ... }` entre",
  "  fichiers), les affectations de globals (`onPlayerClick = ...`,",
  "  `globalThis.FA_*`) et les noms de proprietes (`api.sendMessage`,",
  "  `FA.c.damage`, `{ str, style }`). Le jeu s'appuie dessus.",
  "- Chaque fichier est transforme **isolement** : aucun bundling, les imports",
  "  et l'arborescence restent ceux du jeu.",
  "",
  "## Fichiers",
  "",
  "| Fichier | Caracteres | Source lisible |",
  "| --- | --- | --- |",
];
for (const r of rows.slice().sort((a, b) => a.rel.localeCompare(b.rel)))
  readme.push(`| \`${r.rel}\` | ${r.after.toLocaleString("fr-FR")} | ${r.before.toLocaleString("fr-FR")} |`);
readme.push("", "## Controle", "",
  "Le script verifie que les points d'entree (`onPlayerClick`, `onPlayerJoin`,",
  "`tick`, `onClose`, ...) et les ponts `globalThis.FA*` ont survecu.", "");
fs.writeFileSync(path.join(OUT, "README.md"), readme.join("\n"), "utf8");

console.log(`-> ${path.relative(ROOT, OUT)}/ : ${rows.length} fichiers, meme arborescence que src/`);
const buildMods = rows.filter((r) => r.rel.startsWith("build/")).map((r) => r.rel);
if (buildMods.length)
  console.log(`   modules build/ compactés : ${buildMods.join(", ")}`);
else
  console.log("   build/ absent : rien à compacter (stubs utilisés par build-world)");
for (const r of rows.sort((a, b) => b.after - a.after).slice(0, 8))
  console.log(`   ${String(r.after).padStart(6)} car.  ${r.rel}  (était ${r.before.toLocaleString("fr-FR")})`);
if (total > WORLD_LIMIT)
  throw new Error(`World Code compact trop grand : ${total} > ${WORLD_LIMIT}`);
if (rows.length > FILE_LIMIT)
  throw new Error(
    `Trop de fichiers pour le World Code : ${rows.length} > ${FILE_LIMIT}. ` +
      `Fusionne deux modules (ex. core/mute.js dans core/team.js).`,
  );
