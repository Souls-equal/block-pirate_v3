#!/usr/bin/env node
// tools/build-world.mjs
//
// Bundle + minifie le World Code (src/index.js) pour le coller dans le monde.
// Les sources RESTENT lisibles : seule la sortie dist/world.js est compacte.
//
// Les 3 modules src/build/{layer,path,sphere}.js sont absents du dépôt. S'ils
// manquent, on injecte des stubs vides (uniquement pour ce build) avec un
// avertissement : mettre les vrais fichiers dans src/build/ pour les activer.
//
// Usage : npm run build:world
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORLD_LIMIT = 512_000;

const STUB_EXPORTS = {
  layer: ["tickLayer", "onPlayerJoinLayer", "onPlayerClickLayer"],
  path: ["tickPath", "onPlayerJoinPath", "onPlayerClickPath"],
  sphere: ["tick1", "onPlayerJoin1", "onPlayerClick1"],
};
const missing = new Set();

const stubPlugin = {
  name: "build-modules-optionnels",
  setup(build) {
    build.onResolve({ filter: /\.\/build\/(layer|path|sphere|plane)$/ }, (args) => {
      const real = path.resolve(args.resolveDir, args.path + ".js");
      if (fs.existsSync(real)) return null; // laisser esbuild résoudre le vrai module
      const name = path.basename(args.path);
      missing.add(name);
      return { path: name, namespace: "bp-stub" };
    });
    build.onLoad({ filter: /.*/, namespace: "bp-stub" }, (args) => ({
      contents: (STUB_EXPORTS[args.path] || [])
        .map((n) => `export function ${n}() {}`)
        .join("\n"),
      loader: "js",
    }));
  },
};

async function bundle(minify) {
  return esbuild.build({
    entryPoints: [path.join(ROOT, "src/index.js")],
    bundle: true,
    write: false,
    // `esm` + bundle => un SEUL script, sans import/export (src/index.js
    // n'exporte rien : le jeu lit ses `const onPlayerClick = ...` globaux).
    // Surtout PAS de `iife` : ça enfermerait ces handlers dans une closure et
    // le monde ne les verrait plus.
    format: "esm",
    platform: "browser",
    target: "es2020",
    minify,
    // Indispensable : le moteur du jeu appelle les points d'entrée PAR LEUR NOM.
    // On minifie la syntaxe/les espaces mais on garde les identifiants du haut.
    minifyIdentifiers: false,
    legalComments: "none",
    charset: "ascii",
    plugins: [stubPlugin],
    logLevel: "warning",
  });
}

const [min, full] = await Promise.all([bundle(true), bundle(false)]);
const code = min.outputFiles[0].text;
const minChars = code.length;
const fullChars = full.outputFiles[0].text.length;

const outDir = path.join(ROOT, "dist");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "world.js");
fs.writeFileSync(outFile, code, "utf8");

if (/(^|\n)\s*(import|export)\b/.test(code))
  throw new Error("Le bundle contient encore des import/export : le jeu ne le lira pas.");
for (const entry of ["onPlayerClick", "onPlayerJoin", "onEntityDeleted", "tick", "onClose"]) {
  if (!new RegExp("(^|[,;{}\n])" + entry + "\\s*=").test(code))
    throw new Error(`Point d'entree ${entry} perdu par la minification !`);
}

let blockChars = 0;
try {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "code-blocks/manifest.json"), "utf8"));
  blockChars = manifest.packedChars;
} catch (_) {}

console.log(`World Code lisible (bundle) : ${fullChars.toLocaleString("fr-FR")} car.`);
console.log(`World Code minifié          : ${minChars.toLocaleString("fr-FR")} car. ` +
  `(${Math.round((minChars / WORLD_LIMIT) * 100)} % des ${WORLD_LIMIT.toLocaleString("fr-FR")} autorisés)`);
console.log(`→ dist/world.js (optionnel, ignoré par git)`);
if (blockChars)
  console.log(`Code Blocks (packs)         : ${blockChars.toLocaleString("fr-FR")} car.`);
if (missing.size)
  console.log(
    `\n⚠  Stubs vides utilisés pour : ${[...missing].sort().join(", ")}.\n` +
      `   Ajoute les vrais fichiers dans src/build/ puis relance le build.`,
  );
if (minChars > WORLD_LIMIT)
  throw new Error(`World Code trop grand : ${minChars} > ${WORLD_LIMIT}`);
