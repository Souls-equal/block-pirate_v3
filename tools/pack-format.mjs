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

/* `release` = empreinte de la version complète (tous les packs). Elle est
   identique sur les 8 blocs d'une même version : c'est ce qui permet au
   chargeur de dire « ce Code Block est une ancienne version » au lieu de
   laisser l'utilisateur deviner (demande 69). */
export function makeBlock(index, total, payload, release = "") {
  const cleanPayload = payload.replace(/\r\n?/g, "\n").trim();
  const v = release ? `:v=${release}` : "";
  const head = `/*${MAGIC}:${index}/${total}:len=${cleanPayload.length}:h=${fnv1a(cleanPayload)}${v}*/\n`;
  return head + cleanPayload;
}

const HEADER_RE = new RegExp(
  "^\\s*/\\*" +
    MAGIC +
    ":(\\d+)/(\\d+):len=(\\d+):h=([0-9a-f]{8})(?::v=([0-9a-f]{8}))?\\*/\\s*",
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
    release: m[5] || "",
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
// espacer `b,f` en `b , f` ne suffisait pas — le joueur a retrouvé la censure au
// même endroit. Ce qui est passé, c'est la MÊME ligne avec, en plus, un `1 *`
// devant l'identifiant :
//     i= (s.hi- s.lo ) * 1 * b ,f =Math.atan2(c-a,s.hi-s.lo)
// Autrement dit : espaces (conservés) + un chiffre qui casse la suite de
// lettres. On ne prétend pas savoir exactement ce que le filtre reconnaît ; on
// reproduit la recette validée en jeu.
//
// On applique donc, dans cet ordre :
//   1. `CENSOR_RULES` : espaces autour des motifs connus (historique, conservé) ;
//   2. `neutralizeProducts` : `*b` -> `* 1 * b` quand `b` est un identifiant
//      d'UNE lettre — le seul endroit où le filtre a encore mordu.
// `findRiskyProducts` / `findCensoredPatterns` REFUSENT de produire un pack qui
// en contient encore.

export const CENSOR_RULES = [
  {
    name: "keyword[n",
    test: /\b(?:return|const|let|var)\[n(?![A-Za-z0-9_$])/gi,
    fix: (code) =>
      code
        .replace(/\b(return|const|let|var)\[n\*/gi, "$1 [ n * ")
        .replace(/\b(return|const|let|var)\[n,/gi, "$1 [ n ,")
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
        .replace(/([dD]),([fF])\b/g, "$1 ,$2"),
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
       règles `D,f` / `g,f`.
       ATTENTION : l'espace se met AVANT la virgule, jamais après. En jeu,
       `b , f` a été remplacé par `*****` (5 caractères, espaces comprises),
       alors que `b ,f` — la forme écrite à la main par le joueur — passe. */
    name: "x,f",
    test: /(?<![A-Za-z0-9_$])[A-Za-z],[fF](?![A-Za-z0-9_$])/g,
    fix: (code) => code.replace(/(?<![A-Za-z0-9_$])([A-Za-z]),([fF])(?![A-Za-z0-9_$])/g, "$1 ,$2"),
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

/* --- `...*b` (b = identifiant d'UNE lettre) : on écrit `* 1 * b` -------------
   Le joueur a débloqué le pack 2 en écrivant à la main :
     i= (s.hi- s.lo ) * 1 * b ,f =Math.atan2(c-a,s.hi-s.lo)
   autrement dit : les ESPACES (qu'on garde) **plus** un `1 *` inséré devant
   l'identifiant. Les deux ensemble, tels quels : c'est cette forme-là qui a été
   validée en jeu, donc c'est celle qu'on génère — y compris les espaces autour
   du `1`.
   Sémantiquement, `x * 1 * b` vaut `x * b` : rien ne change au calcul.
   On ne touche ni à `2*b` (le chiffre coupe déjà la suite de lettres), ni à
   `a**b` / `a*=b`, ni aux `*` de `function*` et `yield*` qui ne sont pas des
   multiplications. Rien de tout ça dans une chaîne, un gabarit, une regex ou
   un commentaire : là, c'est du texte affiché au joueur. */
const RISKY_PRODUCT = /\*\s*(?=[A-Za-z](?![\w$]))/g;

/* Le `*` est-il une multiplication dangereuse ? On regarde ce qui le précède en
   sautant les espaces (pour reconnaître un `* 1 *` déjà corrigé). */
function productIsRisky(code, index) {
  let i = index - 1;
  while (i >= 0 && /\s/.test(code[i])) i--;
  if (i < 0) return false;
  const c = code[i];
  if (c === "*" || (c >= "0" && c <= "9")) return false; // 2*b, a**b, * 1 *
  const before = code.slice(Math.max(0, i - 7), i + 1);
  if (/function$/.test(before) || /yield$/.test(before)) return false;
  return true;
}

export function findRiskyProducts(code) {
  const mask = literalMask(code);
  const hits = [];
  for (const m of code.matchAll(RISKY_PRODUCT)) {
    if (mask[m.index]) continue; // dans une chaîne : c'est du texte, on y touche pas
    if (!productIsRisky(code, m.index)) continue;
    hits.push({ rule: "*x (identifiant d'une lettre)", match: m[0], index: m.index });
  }
  return hits;
}

function neutralizeProducts(code) {
  const mask = literalMask(code);
  return code.replace(RISKY_PRODUCT, (m, offset) =>
    mask[offset] || !productIsRisky(code, offset) ? m : "* 1 * ",
  );
}

export function uncensorBlockCode(code, extraSafe = true) {
  let out = code;
  if (extraSafe) {
    out = out
      .replace(/([A-Za-z0-9_$])\[([A-Za-z_$][A-Za-z0-9_$]*)\]/g, "$1[ $2 ]")
      .replace(/\b([A-Za-z])([.,=])([fF])\b/g, (m, a, p, f) => (p === "," ? `${a} ,${f}` : `${a} ${p} ${f}`))
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
    out = normalizeCommas(out);
    if (out === before) break;
  }
  return normalizeCommas(neutralizeProducts(out));
}

/* --- `, ` + lettre : la forme censurée ------------------------------------
   Relevé en jeu (le joueur a collé le bloc et lu le résultat) :
     i=(s.hi-s.lo)* 1 * *****=
   Les cinq astérisques remplacent exactement `b , f` : le filtre a mangé
   l'espace APRÈS la virgule. Sa correction manuelle, qui compilait, disait
   `b ,f =` — espace avant la virgule, aucun après.
   Donc : jamais `,` + blanc + lettre. `normalizeCommas` déplace ce blanc avant
   la virgule (`b , f` devient `b ,f`). On ne rajoute PAS d'espace devant toutes
   les virgules du code minifié : `,f` tout seul n'est pas censuré, et ça
   coûterait des milliers de caractères. */
const COMMA_THEN_SPACE = /,\s+(?=[A-Za-z])/g;
const SPACE_BEFORE_COMMA = /[ \t]*,\s+(?=[A-Za-z])/g;

export function findRiskyCommas(code) {
  const mask = literalMask(code);
  const hits = [];
  for (const m of code.matchAll(COMMA_THEN_SPACE)) {
    if (mask[m.index]) continue; // dans une chaîne : code valide, texte juste censuré
    hits.push({ rule: "« , » + espace + lettre", match: m[0], index: m.index });
  }
  return hits;
}

function normalizeCommas(code) {
  const mask = literalMask(code);
  return code.replace(SPACE_BEFORE_COMMA, (m, offset) => (mask[offset] ? m : " ,"));
}

export function findCensoredPatterns(code) {
  const hits = [];
  for (const rule of CENSOR_RULES) {
    for (const m of code.matchAll(rule.test)) {
      hits.push({ rule: rule.name, match: m[0], index: m.index });
    }
  }
  hits.push(...findRiskyProducts(code));
  hits.push(...findRiskyCommas(code));
  return hits;
}
