// tools/pack-format.mjs
// Constantes et fonctions du format BP3 partagées par les scripts de build/check.
// (Les mêmes fonctions sont intégrées dans src/fruit/func-abilities.js pour que
// l'utilisateur n'ait qu'un seul fichier à copier-coller dans Bloxd.io.)

export const MAGIC = "BP3";
export const MARKER = "/*BP3M*/";
export const SEPARATOR = "\n;\n" + MARKER + "\n;\n";
export const MAX_PACK_CHARS = 31_500;
export const ORIGIN = [100_000, 100_000, 100_002];
export const SCAN_SLOTS = 24;

export function fnv1a(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return ("00000000" + h.toString(16)).slice(-8);
}

export function makeBlock(index, total, payload) {
  const cleanPayload = payload.replace(/\r\n?/g, "\n").trim();
  const head = `/*${MAGIC}:${index}/${total}:len=${cleanPayload.length}:h=${fnv1a(cleanPayload)}*/\n`;
  return head + cleanPayload;
}

const HEADER_RE = new RegExp(
  "^\\s*/\\*" + MAGIC + ":(\\d+)/(\\d+):len=(\\d+):h=([0-9a-f]{8})\\*/\\s*",
);

export function parseBlock(text) {
  if (typeof text !== "string") return null;
  const clean = text.replace(/\r\n?/g, "\n");
  const m = HEADER_RE.exec(clean);
  if (!m) return null;
  const payload = clean.slice(m[0].length).trim();
  return {
    index: Number(m[1]),
    total: Number(m[2]),
    len: Number(m[3]),
    hash: m[4],
    ok: payload.length === Number(m[3]) && fnv1a(payload) === m[4],
    payload,
  };
}

// --- Protection anti-censure Bloxd.io ---------------------------------------
// Le filtre de texte des Code Blocks de Bloxd.io remplace par « ***** »
// certaines séquences d'identifiants et d'opérateurs collés par la minification
// (`o[n]`, `return[n*.7`, `for(const[n,r]`, `a-s`, `a&&`, `g=f`, `18+`, `D,f`,
// `t.f`, `b(f`, `n*de`, `c===3`). L'insertion d'espaces aux endroits critiques
// empêche toute correspondance du filtre sans modifier les noms de variables.

export const CENSOR_RULES = [
  {
    name: "keyword[n",
    test: /\b(?:return|const|let|var)\[n(?![A-Za-z0-9_$])/gi,
    fix: (code) =>
      code
        .replace(/\b(return|const|let|var)\[n\*/gi, "$1 [ n * ")
        .replace(/\b(return|const|let|var)\[n,/gi, "$1 [ n, ")
        .replace(/\b(return|const|let|var)\[n(?![A-Za-z0-9_$])/gi, "$1 [ n "),
  },
  {
    name: "ident[n",
    test: /(?<=[A-Za-z0-9_$])\[n(?![A-Za-z0-9_$])/gi,
    fix: (code) =>
      code
        .replace(/(?<=[A-Za-z0-9_$])\[n\]/gi, "[ n ]")
        .replace(/(?<=[A-Za-z0-9_$])\[n\./gi, "[ n .")
        .replace(/(?<=[A-Za-z0-9_$])\[n(?![A-Za-z0-9_$])/gi, "[ n "),
  },
  {
    name: "a-s",
    test: /\ba-s\b/gi,
    fix: (code) => code.replace(/\b([aA])-([sS])\b/g, "$1 - $2"),
  },
  {
    name: "a&&",
    test: /a&&/gi,
    fix: (code) =>
      code
        .replace(/===([aA])&&/g, "=== $1 && ")
        .replace(/([aA])&&/g, "$1 && "),
  },
  {
    name: "g=f",
    test: /\b[gG]=[fF]\b/g,
    fix: (code) =>
      code
        .replace(/,([gG])=([fF]),/g, ", $1 = $2, ")
        .replace(/\b([gG])=([fF])\b/g, "$1 = $2"),
  },
  {
    name: "g,f",
    test: /\b[gG]\s*,\s*[fF]\b/g,
    fix: (code) =>
      code
        .replace(/=([gG])\s*,\s*([fF])=/g, "=$1;const $2=")
        .replace(/\b([gG])\s*,\s*([fF])\b/g, "($1),($2)"),
  },
  {
    name: "g(f",
    test: /\b[gG]\s*\(\s*[fF]\b/g,
    fix: (code) =>
      code.replace(/\b([gG])\s*\(\s*([fF])\b/g, "$1(0||$2"),
  },
  {
    name: "D,f",
    test: /\b[dD],[fF]\b/g,
    fix: (code) =>
      code
        .replace(/\*([dD]),([fF])=/g, " * $1, $2 = ")
        .replace(/([dD]),([fF])\b/g, "$1, $2"),
  },
  {
    name: "t.f",
    test: /\b[tT]\.[fF]\b/g,
    fix: (code) =>
      code
        .replace(/([+\-,])\b([tT])\.([fF])\*/g, "$1 $2 . $3 * ")
        .replace(/\b([tT])\.([fF])\*/g, "$1 . $2 * ")
        .replace(/\b([tT])\.([fF])\+\+,([tT])\.([fF])<=/g, "$1 . $2 ++, $3 . $4 <= ")
        .replace(/,([tT])\.([fF])\//g, ", $1 . $2 / ")
        .replace(/\(([tT])\.([fF])-/g, "($1 . $2 - ")
        .replace(/,([tT])\.([fF])>=/g, ", $1 . $2 >= ")
        .replace(/\b([tT])\.([fF])\b/g, "$1 . $2"),
  },
  {
    name: "b(f",
    test: /\b[bB]\([fF]\b/g,
    fix: (code) =>
      code
        .replace(/&&([bB])\(([fF])\b/g, " && $1( $2")
        .replace(/\b([bB])\(([fF])\b/g, "$1( $2"),
  },
  {
    name: "18+",
    test: /18\+/g,
    fix: (code) => code.replace(/18\+/g, "18 + "),
  },
  {
    name: "n*de",
    test: /\b[nN]\*[dD][eE]\b/g,
    fix: (code) =>
      code
        .replace(/=([nN])\*([dD][eE])\+/g, " = $1 * $2 + ")
        .replace(/\b([nN])\*([dD][eE])\b/g, "$1 * $2"),
  },
  {
    name: "c===3",
    test: /\b[cC]===?3\b/g,
    fix: (code) =>
      code
        .replace(/\|\|([cC])===3\)/g, "|| $1 === 3 )")
        .replace(/\b([cC])===3\b/g, "$1 === 3")
        .replace(/\b([cC])==3\b/g, "$1 == 3"),
  },
];

export function uncensorBlockCode(code, extraSafe = false) {
  let out = code;
  if (extraSafe) {
    out = out
      .replace(/([A-Za-z0-9_$])\[([A-Za-z_$][A-Za-z0-9_$]*)\]/g, "$1[ $2 ]")
      .replace(/\b([A-Za-z])([.,=])([fF])\b/g, "$1 $2 $3")
      .replace(/\b([A-Za-z])([(\[])([fF])\b/g, "$1$2 $3")
      .replace(/(\]|&&|\|\|)=?([fF])\(/g, (m) => m.replace(/([fF])\(/, " $1("))
      .replace(/\b([fF])([.,=*+\-/])([uUkKcCfF])\b/g, "$1 $2 $3")
      .replace(/\b([fF])([(\[])([uUkKcCfF])\b/g, "$1$2 $3")
      .replace(/\b([sSkKpP])\*(\1)\b/gi, "$1 * $2");
  }
  for (const rule of CENSOR_RULES) {
    out = rule.fix(out);
  }
  return out;
}

export function findCensoredPatterns(code) {
  const hits = [];
  for (const rule of CENSOR_RULES) {
    for (const m of code.matchAll(rule.test)) {
      hits.push({ rule: rule.name, match: m[0], index: m.index });
    }
  }
  return hits;
}
