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
// Le filtre de texte des Code Blocks de Bloxd.io remplace par « ***** » (ou
// « ****** ») certaines séquences d'identifiants et d'opérateurs collés par la
// minification (`o[n]`, `return[n*.7`, `for(const[n,r]`, `a-s`, `a&&`, `g=f`,
// `18+`, `D,f`, `g,f`, `b,f`, `t.f`, `b(f`, `n*de`, `c===3`). L'insertion
// d'espaces aux endroits critiques empêche toute correspondance du filtre sans
// modifier les noms de variables.
//
// VU EN JEU, APRÈS UN PREMIER CORRECTIF QUI N'A PAS SUFFI :
// les espaces ne suffisent pas, parce que le filtre RECOLLE les lettres de part
// et d'autre d'un opérateur. `i=(s.hi-s.lo)*b,f=Math.atan2(...)` se lit alors
// `...slob...` — un mot anglais — et il est censuré même écrit
// `(s.hi-s.lo)*b , f=`. Ce qui marche (corrigé à la main par le joueur) :
// `i=1*(s.hi-s.lo)*b,f=1*)*Math.atan2(...)` — une identité arithmétique qui
// casse la suite de lettres sans changer le résultat.
//
// On applique donc, dans cet ordre :
//   1. `CENSOR_RULES` : espaces autour des motifs connus (historique) ;
//   2. `neutralizeProducts` : `*b` -> `*1*b` quand `b` est un identifiant d'UNE
//      lettre — c'est le seul endroit où le filtre a encore mordu.
// `findRiskyProducts` / `findCensoredPatterns` REFUSENT de produire un pack qui
// en contient encore.

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
  {
    /* « b,f » : deux lettres seules autour d'une virgule. C'est la forme qui a
       casse le pack 2 (`i=(s.hi-s.lo)*b,f=Math.atan2`), et celle des anciennes
       règles `D,f` / `g,f`. On espace la virgule. */
    name: "x,f",
    test: /(?<![A-Za-z0-9_$])[A-Za-z],[fF](?![A-Za-z0-9_$])/g,
    fix: (code) => code.replace(/(?<![A-Za-z0-9_$])([A-Za-z]),([fF])(?![A-Za-z0-9_$])/g, "$1 , $2"),
  },
  {
    /* Même famille, mais c'est le f qui précède : `f,o`, `f.x`, `f(y`. */
    name: "f,x",
    test: /(?<![A-Za-z0-9_$])[fF][.,=(][A-Za-z](?![A-Za-z0-9_$])/g,
    fix: (code) =>
      code.replace(/(?<![A-Za-z0-9_$])([fF])([.,=(])([A-Za-z])(?![A-Za-z0-9_$])/g, "$1 $2 $3"),
  },
  {
    /* Une lettre seule suivie de `b`, `d` ou `g` : `d,f` et `g,f` ont deja ete
       censures, `b,f` aussi. On espace la ponctuation des trois familles. */
    name: "x[.,(]bdg",
    test: /(?<![A-Za-z0-9_$])[A-Za-z][.,(][bdgBDG](?![A-Za-z0-9_$])/g,
    fix: (code) =>
      code.replace(/(?<![A-Za-z0-9_$])([A-Za-z])([.,(])([bdgBDG])(?![A-Za-z0-9_$])/g, "$1 $2 $3"),
  },
];

/* --- Le filtre recolle les lettres : `*b` devient `*1*b` ---------------------
   `code.charCodeAt` ne suffit pas : il faut ignorer le CONTENU des chaînes, des
   gabarits, des regex et des commentaires, où `*b` est du texte que le joueur
   doit voir tel quel. `literalMask` renvoie un tableau : `mask[i] === 1` quand
   le caractère i appartient à un littéral. */
export function literalMask(code) {
  const n = code.length;
  const mask = new Uint8Array(n);
  const mark = (from, to) => {
    for (let i = from; i < to && i < n; i++) mask[i] = 1;
  };
  // pile : "tpl" = gabarit (on ignore jusqu'au backtick), "exp" = code dans ${ }
  const stack = [];
  let prev = ""; // dernier caractère significatif (hors espace)
  for (let i = 0; i < n; i++) {
    const c = code[i];
    const inTpl = stack.length > 0 && stack[stack.length - 1] === "tpl";
    if (inTpl) {
      if (c === "\\") {
        mark(i, i + 2);
        i++;
        continue;
      }
      if (c === "`") {
        mark(i, i + 1);
        stack.pop();
        prev = "x";
        continue;
      }
      if (c === "$" && code[i + 1] === "{") {
        mark(i, i + 2);
        stack.push("exp");
        prev = "{";
        i++;
        continue;
      }
      mark(i, i + 1);
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      let j = i + 1;
      while (j < n) {
        if (code[j] === "\\") {
          j += 2;
          continue;
        }
        if (code[j] === c) break;
        j++;
      }
      mark(i, j + 1);
      if (c === "`") stack.push("tpl");
      else if (!stack.length || stack[stack.length - 1] === "exp") {
        /* rien : une chaîne simple ne crée pas d'état */
      }
      i = j;
      continue;
    }
    if (c === "/" && code[i + 1] === "/") {
      let j = code.indexOf("\n", i);
      if (j < 0) j = n;
      mark(i, j);
      i = j - 1;
      continue;
    }
    if (c === "/" && code[i + 1] === "*") {
      let j = code.indexOf("*/", i + 2);
      j = j < 0 ? n : j + 2;
      mark(i, j);
      i = j - 1;
      continue;
    }
    // regex littérale ? (un `/` après un opérateur ou en début d'expression)
    if (c === "/" && (prev === "" || "(,=:[!&|?{};+-*%~^<>".includes(prev))) {
      let j = i + 1;
      let cls = false;
      let ok = false;
      while (j < n) {
        const d = code[j];
        if (d === "\\") {
          j += 2;
          continue;
        }
        if (d === "\n") break; // pas une regex : division
        if (d === "[") cls = true;
        else if (d === "]") cls = false;
        else if (d === "/" && !cls) {
          ok = true;
          break;
        }
        j++;
      }
      if (ok) {
        mark(i, j + 1);
        i = j;
        prev = "x";
        continue;
      }
    }
    if (c === "{" && stack.length && stack[stack.length - 1] === "exp") {
      stack.push("brace");
      continue;
    }
    if (c === "}" && stack.length && stack[stack.length - 1] === "brace") {
      stack.pop();
      continue;
    }
    if (c === "}" && stack.length && stack[stack.length - 1] === "exp") {
      stack.pop();
      // on ressort du ${ } : on redevient un gabarit
      stack.push("tpl");
      prev = "x";
      continue;
    }
    if (!/\s/.test(c)) prev = c;
  }
  return mask;
}

/* `...*b` (b = identifiant d'UNE lettre) : le filtre recolle `b` avec ce qui
   précède/suit et lit un mot. On insère `1*` : `*b` -> `*1*b`, ce qui ne change
   rien au calcul (multiplication par 1) et casse la suite de lettres.
   On ne touche PAS à `2*b` (`[\d*]` exclu) : un chiffre devant coupe déjà le mot,
   et `a*b` est couvert (le filtre ne s'arrête pas aux frontières de mots).
   Attention aux `*` qui ne sont pas des multiplications : `function*b(){}` et
   `yield*x` — y insérer `1*` casserait le code, d'où les deux lookbehind. */
const SINGLE_LETTER_PRODUCT =
  /(?<![\d*])(?<!function)(?<!yield)\*(\s*)(?=[A-Za-z](?![\w$]))/g;

export function findRiskyProducts(code) {
  const mask = literalMask(code);
  const hits = [];
  for (const m of code.matchAll(SINGLE_LETTER_PRODUCT)) {
    if (mask[m.index]) continue; // dans une chaîne : c'est du texte, on y touche pas
    hits.push({ rule: "*x (identifiant d'une lettre)", match: m[0], index: m.index });
  }
  return hits;
}

function neutralizeProducts(code) {
  const mask = literalMask(code);
  return code.replace(SINGLE_LETTER_PRODUCT, (m, spaces, offset) =>
    mask[offset] ? m : `*1*${spaces}`,
  );
}

export function uncensorBlockCode(code, extraSafe = true) {
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
  /* Une correction peut créer un motif pour une règle déjà passée (par ex.
     `b(f)` corrigé en `b( f)` puis `b( f, x)`) : on reboucle jusqu'au point
     fixe. Trois passes suffisent en pratique, on en garde quatre. */
  for (let pass = 0; pass < 4; pass++) {
    const before = out;
    for (const rule of CENSOR_RULES) out = rule.fix(out);
    if (out === before) break;
  }
  return neutralizeProducts(out);
}

export function findCensoredPatterns(code) {
  const hits = [];
  for (const rule of CENSOR_RULES) {
    for (const m of code.matchAll(rule.test)) {
      hits.push({ rule: rule.name, match: m[0], index: m.index });
    }
  }
  hits.push(...findRiskyProducts(code));
  return hits;
}
