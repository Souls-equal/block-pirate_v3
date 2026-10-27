// tools/balance-abilities.mjs
//
// Rééquilibrage des 101 habilités ajoutées (Code Blocks 300 → 330).
//
// Problème corrigé : plusieurs de ces habilités faisaient 30 à 130 dégâts BRUTS
// par coup, et `utils/combat.damage()` applique ensuite ×1.5 puis le
// multiplicateur de la statistique Damage. Un joueur niveau 15-30 pouvait donc
// tuer un joueur niveau 150 en 2 ou 3 clics.
//
// Règle appliquée (plafonds par rareté, en dégâts BRUTS, avant ×1.5) :
//
//   rareté      coup max   total max (1 cible, 1 cast)
//   COMMON          12           45
//   UNCOMMON        18           75
//   RARE            25          105
//   LEGENDARY       32          140
//   MYTHICAL        40          175
//
// Le script ne touche QUE les nombres de dégâts (2e argument de `damage()`,
// 5e de `hitArea()`, 6e de `hitSeg()`) : portées, hitbox, particules, sons,
// durées d'effets et vitesses ne changent pas. Le script est idempotent.
//
// Usage : node tools/balance-abilities.mjs [--apply]

import { readFileSync, writeFileSync } from "node:fs";

const FILES = [
  "src/blocks/300-common-uncommon-plus.js",
  "src/blocks/310-rare-legendary-plus.js",
  "src/blocks/320-legendary-mythical-plus.js",
  "src/blocks/330-mythical-apex-plus.js",
];

const CAPS = {
  COMMON:    { hit: 12, total: 45 },
  UNCOMMON:  { hit: 18, total: 75 },
  RARE:      { hit: 25, total: 105 },
  LEGENDARY: { hit: 32, total: 140 },
  MYTHICAL:  { hit: 40, total: 175 },
};
const RARITY_RE = /(COMMON|UNCOMMON|RARE|LEGENDARY|MYTHICAL|APEX)\s*:/;

// Découpe une liste d'arguments au niveau 0 (respecte (), [], {} et les chaînes)
// en conservant la position exacte de chaque argument.
function splitArgs(raw, offset) {
  const out = [];
  let depth = 0;
  let quote = null;
  let start = 0;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { quote = c; continue; }
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth--;
    else if (c === "," && depth === 0) {
      out.push({ text: raw.slice(start, i), start: offset + start });
      start = i + 1;
    }
  }
  out.push({ text: raw.slice(start), start: offset + start });
  return out;
}

// Renvoie les littéraux de dégâts d'une ligne, avec leur position absolue.
function findDamageLiterals(line) {
  const found = [];
  const scan = (re, argIndex) => {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(line))) {
      const argsOffset = m.index + m[0].indexOf(m[1]);
      const args = splitArgs(m[1], argsOffset);
      const arg = args[argIndex];
      if (!arg) continue;
      const text = arg.text.trim();
      if (!/^\d+$/.test(text)) continue;
      const lead = arg.text.length - arg.text.trimStart().length;
      found.push({ start: arg.start + lead, value: Number(text), len: text.length });
    }
  };
  scan(/\bdamage\(([^()]*)\)/g, 1);
  scan(/\bhitArea\(([^()]*)\)/g, 4);
  scan(/\bhitSeg\(([^()]*)\)/g, 5);
  return found;
}

const apply = process.argv.includes("--apply");
const rows = [];

for (const file of FILES) {
  const src = readFileSync(file, "utf8");
  const lines = src.split("\n");
  let rarity = null;
  let fn = null;
  let changedAny = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith("//")) {
      const r = line.match(RARITY_RE);
      if (r) rarity = r[1] === "APEX" ? "MYTHICAL" : r[1];
    }
    const f = line.match(/function\s+(onPlayerClick\w+)/);
    if (f) {
      fn = f[1];
      continue;
    }
    if (!fn || !rarity) continue;

    const lits = findDamageLiterals(line);
    if (!lits.length) continue;

    const caps = CAPS[rarity];
    const maxHit = Math.max(...lits.map((l) => l.value));
    const total = lits.reduce((a, l) => a + l.value, 0);
    const factor = Math.min(1, caps.hit / maxHit, caps.total / total);
    if (factor >= 0.999) continue;

    let next = line;
    for (const lit of lits.slice().sort((a, b) => b.start - a.start)) {
      const scaled = Math.max(1, Math.round(lit.value * factor));
      if (scaled === lit.value) continue;
      next = next.slice(0, lit.start) + String(scaled) + next.slice(lit.start + lit.len);
      rows.push({ fn, rarity, before: lit.value, after: scaled });
    }
    if (next !== line) {
      lines[i] = next;
      changedAny = true;
    }
  }

  if (apply && changedAny) writeFileSync(file, lines.join("\n"));
}

const byFn = new Map();
for (const r of rows) {
  if (!byFn.has(r.fn)) byFn.set(r.fn, { rarity: r.rarity, pairs: [] });
  byFn.get(r.fn).pairs.push(`${r.before}→${r.after}`);
}
console.log(`${apply ? "APPLIQUÉ" : "SIMULATION"} — ${byFn.size} habilité(s), ${rows.length} valeur(s)\n`);
for (const [fn, info] of byFn) {
  console.log(`${info.rarity.padEnd(10)} ${fn.replace("onPlayerClick", "").padEnd(24)} ${info.pairs.join("  ")}`);
}
