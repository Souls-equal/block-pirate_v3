// fruit/pack-format.js
// Format des « packs » de Code Blocks. Partagé entre le build (Node) et le
// chargeur (World Code) : les deux doivent parler exactement le même protocole.
//
// Un Code Block contient :
//   /*BP3:<index>/<total>:len=<n>:h=<hash>*/
//   <module 1 minifié>
//   ;
//   /*BP3M*/
//   ;
//   <module 2 minifié>
//   ...
//
// Le chargeur découpe sur /*BP3M*/ et évalue CHAQUE module séparément : aucun
// `eval` ne dépasse la taille d'un fruit (~8 000 caractères), même si le Code
// Block fait 31 500 caractères. Cela évite les « out of memory » de l'ancien
// chargeur (qui refusait tout bloc > 16 000 caractères) tout en gardant très
// peu de Code Blocks.

export const MAGIC = "BP3";
export const MARKER = "/*BP3M*/";
export const SEPARATOR = "\n;\n" + MARKER + "\n;\n";

/** Taille max du payload d'un Code Block. Le jeu autorise 32 000 caractères ;
 *  on garde ~500 de marge pour l'en-tête et les fins de ligne ajoutées par l'UI. */
export const MAX_PACK_CHARS = 31_500;

/** Coordonnées de la « bande » de Code Blocks dans le monde. */
export const ORIGIN = [100_000, 100_000, 100_002];
/** Nombre de positions scannées (pas de « on s'arrête au premier trou »). */
export const SCAN_SLOTS = 16;

// FNV-1a 32 bits sur les unités UTF-16. Identique des deux côtés.
export function fnv1a(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return ("00000000" + h.toString(16)).slice(-8);
}

/** Construit un Code Block complet (en-tête + payload). */
export function makeBlock(index, total, payload) {
  const head = `/*${MAGIC}:${index}/${total}:len=${payload.length}:h=${fnv1a(payload)}*/\n`;
  return head + payload;
}

const HEADER_RE = new RegExp(
  "^\\s*/\\*" + MAGIC + ":(\\d+)/(\\d+):len=(\\d+):h=([0-9a-f]{8})\\*/\\s*",
);

/** Analyse un Code Block. Retourne null si ce n'est pas un pack BP3. */
export function parseBlock(text) {
  if (typeof text !== "string") return null;
  const m = HEADER_RE.exec(text);
  if (!m) return null;
  const payload = text.slice(m[0].length).trim();
  return {
    index: Number(m[1]),
    total: Number(m[2]),
    len: Number(m[3]),
    hash: m[4],
    // Longueur et hash contrôlés par le chargeur : détecte un Code Block
    // tronqué (limite 32 k) ou un copier/coller incomplet.
    ok: payload.length === Number(m[3]) && fnv1a(payload) === m[4],
    payload,
  };
}
