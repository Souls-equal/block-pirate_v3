#!/usr/bin/env node
// tools/build-blocks.mjs
//
// Transforme les sources LISIBLES de src/blocks/ en aussi peu de Code Blocks que
// possible (limite 32 000 caractères du jeu). Chaque pack est autonome :
//   - en-tête BP3 (index/total/longueur/hash) => le chargeur sait ce qu'il attend ;
//   - modules minifiés séparés par /*BP3M*/ => aucun eval géant ;
//   - un fruit réparti sur plusieurs fichiers (Control, Gravity) reste ENTIER
//     dans un seul pack, dans le bon ordre : plus de dépendance entre Code Blocks.
//
// Usage : npm run build:blocks [-- --max=31500]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import {
  MARKER,
  SEPARATOR,
  MAX_PACK_CHARS,
  ORIGIN,
  makeBlock,
  parseBlock,
  fnv1a,
  uncensorBlockCode,
  findCensoredPatterns,
} from "./pack-format.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src", "blocks");
const OUT = path.join(ROOT, "code-blocks");

const argMax = process.argv.find((a) => a.startsWith("--max="));
const MAX = Number(argMax ? argMax.slice(6) : MAX_PACK_CHARS);
if (!Number.isFinite(MAX) || MAX < 4000 || MAX > 31_800)
  throw new Error(`--max invalide (${MAX}) : doit rester sous la limite de 32 000 du jeu.`);

// ---------------------------------------------------------------- sources ---
const files = fs
  .readdirSync(SRC)
  .filter((f) => f.endsWith(".js"))
  .sort();

if (!files.length) throw new Error(`Aucune source dans ${SRC}`);

let sourceChars = 0;
const fragments = files.map((file, order) => {
  const source = fs.readFileSync(path.join(SRC, file), "utf8");
  sourceChars += source.length;
  let code;
  try {
    code = esbuild.transformSync(source, {
      minify: true,
      legalComments: "none",
      charset: "ascii", // évite tout problème d'encodage dans le champ texte du jeu
      target: "es2019",
      loader: "js",
    }).code.trim();
  } catch (err) {
    throw new Error(`${file} : ${err.message || err}`);
  }
  if (code.includes(MARKER))
    throw new Error(`${file} : contient le séparateur réservé ${MARKER}`);
  if (!code.endsWith(";") && !code.endsWith("}")) code += ";";
  code = uncensorBlockCode(code, !/^0|^[12]/.test(file));
  return { file, order, code, size: code.length };
});

// ------------------------------------------------------------- familles -----
// Ces fruits partagent un état via globalThis et DOIVENT rester groupés,
// dans l'ordre des numéros de fichiers, dans un seul et même Code Block.
const FAMILY_RE = /^\d+-(control|gravity)-/;
const familyOf = (file) => (FAMILY_RE.exec(file) || [])[1] || null;

const units = [];
for (let i = 0; i < fragments.length; ) {
  const family = familyOf(fragments[i].file);
  if (!family) {
    units.push({ family: null, items: [fragments[i]], order: fragments[i].order });
    i++;
    continue;
  }
  const items = [];
  while (i < fragments.length && familyOf(fragments[i].file) === family)
    items.push(fragments[i++]);
  units.push({ family, items, order: items[0].order });
}
for (const unit of units)
  unit.size =
    unit.items.reduce((sum, it) => sum + it.code.length, 0) +
    SEPARATOR.length * (unit.items.length - 1);

for (const unit of units)
  if (unit.size > MAX)
    throw new Error(
      `L'unité « ${unit.family || unit.items[0].file} » fait ${unit.size} caractères > ${MAX}. ` +
        `Découpe ce fruit en deux familles ou baisse la taille de son code.`,
    );

// ------------------------------------------------- empaquetage best-fit ------
// Best-fit decreasing par palier (000..299 puis 300+) :
// conserve `pack-01..05` identiques et ajoute les nouvelles extensions dans `pack-06+`.
function packUnits(unitList) {
  const localBins = [];
  for (const unit of [...unitList].sort((a, b) => b.size - a.size || a.order - b.order)) {
    let best = null;
    for (const bin of localBins) {
      const extra = bin.units.length ? SEPARATOR.length : 0;
      if (bin.size + extra + unit.size <= MAX && (!best || bin.size > best.size)) best = bin;
    }
    if (!best) {
      best = { size: 0, units: [] };
      localBins.push(best);
    }
    best.size += (best.units.length ? SEPARATOR.length : 0) + unit.size;
    best.units.push(unit);
  }
  for (const bin of localBins) bin.units.sort((a, b) => a.order - b.order);
  localBins.sort(
    (a, b) =>
      Math.min(...a.units.map((u) => u.order)) - Math.min(...b.units.map((u) => u.order)),
  );
  return localBins;
}

const baseUnits = units.filter((u) => /^0|^[12]/.test(u.items[0].file));
const extraUnits = units.filter((u) => !/^0|^[12]/.test(u.items[0].file));
const bins = [...packUnits(baseUnits), ...packUnits(extraUnits)];

// --------------------------------------------------------------- sortie -----
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT))
  if (/^pack-\d+\.js$/.test(f)) fs.rmSync(path.join(OUT, f));

const total = bins.length;
let totalChars = 0;
const packs = bins.map((bin, i) => {
  const index = i + 1;
  const items = bin.units.flatMap((u) => u.items).sort((a, b) => a.order - b.order);
  const payload = uncensorBlockCode(items.map((it) => it.code).join(SEPARATOR));
  const block = makeBlock(index, total, payload);
  // Vérification croisée : le parseur utilisé par le jeu doit accepter notre bloc.
  const check = parseBlock(block);
  if (!check || !check.ok || check.index !== index || check.total !== total)
    throw new Error(`Bloc ${index} : en-tête/hash incohérent`);
  const censorHits = findCensoredPatterns(block);
  if (censorHits.length)
    throw new Error(
      `Bloc ${index} : motif(s) censurable(s) par Bloxd.io : ` +
        censorHits.map((h) => `${h.rule}(${h.match})`).join(", "),
    );
  if (block.length > MAX + 120)
    throw new Error(`Bloc ${index} : ${block.length} caractères, trop grand`);

  const name = `pack-${String(index).padStart(2, "0")}.js`;
  fs.writeFileSync(path.join(OUT, name), block, "utf8");
  totalChars += block.length;
  return {
    index,
    file: name,
    z: ORIGIN[2] + index - 1,
    chars: block.length,
    payloadChars: payload.length,
    hash: fnv1a(payload),
    modules: items.length,
    sources: items.map((it) => it.file),
  };
});

const manifest = {
  format: "BP3",
  generatedAt: new Date().toISOString(),
  maxPackChars: MAX,
  origin: { x: ORIGIN[0], y: ORIGIN[1], z: ORIGIN[2] },
  sourceFiles: files.length,
  sourceChars,
  packedChars: totalChars,
  compression: `${Math.round((1 - totalChars / sourceChars) * 100)} %`,
  packCount: total,
  packs,
};
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

// README généré : « où est mon fruit ? » répondu d'un coup d'œil.
const fruitOf = (f) => {
  const m = /^\d+-(.+)\.js$/.exec(f);
  return m ? m[1].replace(/-/g, " ") : f;
};
const lines = [
  "# code-blocks/ — packs générés (NE PAS ÉDITER À LA MAIN)",
  "",
  "Généré par `npm run build:blocks`. Sources lisibles : `src/blocks/`.",
  "",
  `**${files.length} fichiers sources → ${total} Code Blocks** ` +
    `(${sourceChars.toLocaleString("fr-FR")} → ${totalChars.toLocaleString("fr-FR")} caractères, ` +
    `-${manifest.compression}).`,
  "",
  "Colle **le contenu entier** de chaque `pack-XX.js` dans UN Code Block du monde,",
  `à x=${ORIGIN[0]}, y=${ORIGIN[1]}, z indiqué ci-dessous (blocs consécutifs).`,
  "L'ordre est libre : le chargeur lit l'en-tête `BP3:<n>/<N>` de chaque bloc.",
  "",
  "| Pack | z | Caractères | Fruits / modules |",
  "| --- | --- | --- | --- |",
];
for (const p of packs)
  lines.push(
    `| \`${p.file}\` | \`${p.z}\` | ${p.chars.toLocaleString("fr-FR")} | ` +
      p.sources.map(fruitOf).join(", ") +
      " |",
  );
lines.push(
  "",
  "## Modifier un fruit",
  "",
  "1. Édite le fichier lisible dans `src/blocks/` (jamais le pack).",
  "2. `npm run build:blocks` — le nombre de packs et leur contenu sont recalculés.",
  "3. Regarde le tableau ci-dessus : il te dit **exactement** quel Code Block",
  "   recopier (les autres n'ont pas besoin d'être touchés).",
  "4. Dans le jeu, `FA.reload()` (ou un redémarrage) recharge tout.",
  "",
  "## Migration depuis les 32 anciens blocs",
  "",
  "- Les anciens blocs (`z1000XX-*.js`) ne sont plus lus : le chargeur ignore",
  "  tout Code Block sans en-tête `BP3`. Tu peux écraser les 5 positions ci-dessus.",
  "- Pour utiliser une bande vierge, mets au début du World Code :",
  "  `globalThis.FA_ORIGIN = [100000, 100000, 100102];` puis colle les packs",
  "  en z=100102..100106.",
  "- Control est entièrement dans un seul pack, Gravity dans un seul pack : c'est",
  "  ce qui corrige les deux fruits (plus d'état partagé entre Code Blocks).",
  "",
  "## Contrôle",
  "",
  "`npm run check` vérifie imports, handlers, intégrité des packs et simule le",
  "chargeur de bout en bout.",
  "`FA.logStatus()` / `FA.status()` dans le World Code affichent les packs chargés,",
  "les handlers manquants et les erreurs. `FA.reload(true)` force le rechargement.",
  "",
);
fs.writeFileSync(path.join(OUT, "README.md"), lines.join("\n"), "utf8");

console.log(
  `${files.length} sources (${sourceChars} car.) → ${total} packs (${totalChars} car.), ` +
    `-${manifest.compression}`,
);
for (const p of packs)
  console.log(
    `  ${p.file}  z=${p.z}  ${String(p.chars).padStart(6)} car.  ` +
      `${p.modules} modules  ${p.sources.map((f) => f.replace(/^\d+-/, "")).join(", ")}`,
  );
