// tools/pack-format.mjs
// Constantes et fonctions du format BP3 partagées par les scripts de build/check.
// (Les mêmes fonctions sont intégrées dans src/fruit/func-abilities.js pour que
// l'utilisateur n'ait qu'un seul fichier à copier-coller dans Bloxd.io.)

export const MAGIC = "BP3";
export const MARKER = "/*BP3M*/";
export const SEPARATOR = "\n;\n" + MARKER + "\n;\n";
export const MAX_PACK_CHARS = 31_500;
export const ORIGIN = [100_000, 100_000, 100_002];
export const SCAN_SLOTS = 16;

export function fnv1a(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return ("00000000" + h.toString(16)).slice(-8);
}

export function makeBlock(index, total, payload) {
  const head = `/*${MAGIC}:${index}/${total}:len=${payload.length}:h=${fnv1a(payload)}*/\n`;
  return head + payload;
}

const HEADER_RE = new RegExp(
  "^\\s*/\\*" + MAGIC + ":(\\d+)/(\\d+):len=(\\d+):h=([0-9a-f]{8})\\*/\\s*",
);

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
    ok: payload.length === Number(m[3]) && fnv1a(payload) === m[4],
    payload,
  };
}
