// fruit/code-block-loader.js
//
// Chargeur des Code Blocks « packs » (format BP3, voir pack-format.js).
//
// Différences avec l'ancien chargeur (l'ancien `func-abilities.js` minifié) :
//   * il s'arrêtait au PREMIER emplacement vide : un seul Code Block mal placé
//     et tous les suivants (Control, Gravity = les derniers) étaient ignorés ;
//   * il plafonnait à 33 blocs et refusait tout bloc > 16 000 caractères ;
//   * son cache de hash (longueur + 3 caractères) pouvait sauter un bloc modifié ;
//   * ses erreurs étaient avalées : aucun log, d'où « cooldown uniquement ».
//
// Ici : on scanne une bande fixe, on identifie chaque pack par son en-tête
// (index/total + longueur + hash), on continue même s'il y a un trou, on vérifie
// les handlers attendus, et on journalise TOUT ce qui manque.

import {
  MAGIC,
  MARKER,
  ORIGIN,
  SCAN_SLOTS,
  fnv1a,
  parseBlock,
} from "./pack-format.js";

export function createBlockLoader({ helpers, expected = [], log = null }) {
  const api = () => globalThis.api;
  const say = (msg) => {
    try {
      if (log) log(msg);
      else api().log("[FA] " + msg);
    } catch (_) {}
  };

  // Bande de Code Blocks. Surcharge possible depuis le World Code :
  //   globalThis.FA_ORIGIN = [100000, 100000, 100102];
  // pratique pour installer les packs sur une bande vierge sans écraser les
  // anciens blocs (qui sont ignorés : ils n'ont pas d'en-tête BP3).
  const origin = () => {
    const o = globalThis.FA_ORIGIN;
    return Array.isArray(o) && o.length >= 3 ? o : ORIGIN;
  };

  const FA = globalThis.FA || (globalThis.FA = { r: {} });
  FA.c = helpers; // toujours rafraîchi : un reload du World Code repart propre
  FA.r = FA.r || {};

  const generation = (globalThis.__FA_LOADER_GENERATION || 0) + 1;
  globalThis.__FA_LOADER_GENERATION = generation;
  const alive = () => globalThis.__FA_LOADER_GENERATION === generation;

  FA.generation = generation;
  FA.packInfo = [];
  FA.errors = [];
  FA.sourceHash = "";

  const seen = {};
  function warn(tag, msg) {
    const now = Date.now();
    if (seen[tag] && now - seen[tag] < 2000) return;
    seen[tag] = now;
    say(msg);
  }

  // Le scheduler du jeu d'abord (S.wait), sinon celui de src/utils/timer.
  function schedule(fn, ticks) {
    try {
      const S = globalThis.S;
      if (S && typeof S.wait === "function") return S.wait(fn, ticks);
    } catch (_) {}
    try {
      return helpers.setTimeout(fn, ticks);
    } catch (_) {
      return null;
    }
  }

  function extractText(data) {
    if (typeof data === "string") return data;
    try {
      const t = data && data.persisted && data.persisted.shared && data.persisted.shared.text;
      if (typeof t === "string" && t.length) return t;
    } catch (_) {}
    try {
      const t = data && data.persisted && data.persisted.text;
      if (typeof t === "string" && t.length) return t;
    } catch (_) {}
    try {
      const t = data && data.text;
      if (typeof t === "string" && t.length) return t;
    } catch (_) {}
    return null;
  }

  function readSlot(slot) {
    const o = origin();
    const x = o[0],
      y = o[1],
      z = o[2] + slot;
    let name = null;
    try {
      name = api().getBlock(x, y, z);
    } catch (e) {
      warn("getBlock", "[FA] api.getBlock(" + z + ") : " + (e && e.message ? e.message : e));
      return null;
    }
    if (name !== "Code Block") return null;
    let data = null;
    try {
      data = api().getBlockData(x, y, z);
    } catch (e) {
      warn("getData", "[FA] api.getBlockData(" + z + ") : " + (e && e.message ? e.message : e));
    }
    const text = extractText(data);
    return text ? { z, text } : null;
  }

  function collect() {
    const byIndex = {};
    const errors = [];
    let total = 0;
    let oldFormat = 0;
    let empty = 0;

    for (let slot = 0; slot < SCAN_SLOTS; slot++) {
      const found = readSlot(slot);
      if (!found) {
        empty++;
        continue; // IMPORTANT : on continue, on ne s'arrête pas au premier trou
      }
      const block = parseBlock(found.text);
      if (!block) {
        oldFormat++;
        continue;
      }
      if (block.index < 1 || block.index > SCAN_SLOTS) {
        errors.push(`pack ${block.index} hors bande (z=${found.z})`);
        continue;
      }
      if (!total) total = block.total;
      if (block.total !== total)
        errors.push(`pack ${block.index} annonce ${block.total} packs au lieu de ${total}`);
      if (byIndex[block.index])
        errors.push(`pack ${block.index} en double (z=${found.z})`);
      if (!block.ok)
        errors.push(
          `pack ${block.index} (z=${found.z}) TRONQUÉ ou corrompu : ` +
            `${block.payload.length} car. reçus / ${block.len} attendus, hash ${block.hash}`,
        );
      byIndex[block.index] = { ...block, z: found.z };
    }

    if (!total) {
      errors.push(
        `aucun Code Block ${MAGIC} trouvé à (${origin().join(", ")})..` +
          `${origin()[2] + SCAN_SLOTS - 1}. Lance \`npm run build:blocks\` et colle les packs.`,
      );
      if (oldFormat)
        errors.push(`${oldFormat} bloc(s) d'ancien format ignoré(s) (1 fruit = 1 bloc).`);
    } else {
      for (let i = 1; i <= total; i++)
        if (!byIndex[i])
          errors.push(`pack ${i}/${total} MANQUANT (attendu vers z=${origin()[2] + i - 1})`);
      if (oldFormat)
        say(`[FA] ${oldFormat} Code Block(s) sans en-tête ${MAGIC} ignoré(s) (ancien format).`);
    }
    return { byIndex, total, errors };
  }

  function evalPack(pack) {
    const before = {};
    for (const k of Object.keys(FA.r)) before[k] = 1;
    const parts = pack.payload.split(MARKER);
    let ok = 0;
    for (let i = 0; i < parts.length; i++) {
      const code = parts[i].trim();
      if (!code || code === ";") continue;
      try {
        (0, eval)(code); // eval indirect : même portée globale que les anciens blocs
        ok++;
      } catch (e) {
        FA.errors.push(`pack ${pack.index} module ${i + 1} : ${e && e.message ? e.message : e}`);
      }
    }
    FA.packInfo.push({
      index: pack.index,
      z: pack.z,
      modules: parts.length,
      evaluated: ok,
      chars: pack.payload.length,
      handlers: Object.keys(FA.r).filter((k) => !before[k]),
    });
  }

  let loading = false;
  let booted = false;
  let lastLoad = 0;
  let retries = 0;

  function load(force) {
    if (!alive() || loading) return;
    loading = true;
    try {
      const { byIndex, total, errors } = collect();
      FA.errors = errors.slice();
      for (const e of FA.errors) say("[FA] " + e);

      const packs = [];
      for (let i = 1; i <= total; i++) if (byIndex[i] && byIndex[i].ok) packs.push(byIndex[i]);

      const sourceHash = packs.length ? fnv1a(packs.map((p) => p.payload).join("\n")) : "";
      const cacheKey = generation + ":" + sourceHash;
      const missingNow = expected.filter((n) => typeof FA.r[n] !== "function");
      const mustEval =
        force || !sourceHash || cacheKey !== FA.sourceHash || missingNow.length > 0;

      if (mustEval && packs.length) {
        FA.packInfo = [];
        FA.errors = errors.slice();
        for (const pack of packs) {
          if (alive()) evalPack(pack);
        }
        FA.sourceHash = cacheKey;
      }

      const missing = expected.filter((n) => typeof FA.r[n] !== "function");
      if (missing.length)
        say(
          `[FA] ${missing.length} handler(s) absent(s) : ${missing.join(", ")} — ` +
            `leurs capacités ne feront que le cooldown. Voir FA.status().`,
        );
      else if (mustEval)
        say(
          `[FA] ${packs.length}/${total} pack(s) chargé(s), ${Object.keys(FA.r).length} handlers ` +
            `(${sourceHash}) — Control et Gravity inclus.`,
        );

      FA.ready = packs.length === total && missing.length === 0 && FA.errors.length === 0;
      if (!FA.ready && retries < 30) {
        retries++;
        schedule(() => {
          if (alive()) load(false);
        }, 10);
      } else if (FA.ready) retries = 0;
    } catch (e) {
      FA.errors.push("chargeur : " + (e && e.message ? e.message : e));
      say("[FA] erreur du chargeur : " + (e && e.message ? e.message : e));
    } finally {
      lastLoad = Date.now();
      loading = false;
    }
  }

  /** Appelé au démarrage et par les shims quand un handler manque. */
  function boot() {
    if (!alive() || loading) return;
    if (booted && Date.now() - lastLoad < 750) return; // anti-tempête de reloads
    booted = true;
    load(false);
  }

  function reload(force) {
    if (!alive()) return false;
    retries = 0;
    FA.sourceHash = "";
    load(force !== false);
    return true;
  }

  function status() {
    return {
      generation,
      alive: alive(),
      ready: !!FA.ready,
      origin: origin().join(", "),
      packCount: FA.packInfo.length,
      packs: FA.packInfo,
      registered: Object.keys(FA.r).length,
      expected: expected.length,
      missing: expected.filter((n) => typeof FA.r[n] !== "function"),
      errors: FA.errors.slice(),
      sourceHash: FA.sourceHash,
    };
  }

  function logStatus() {
    const s = status();
    say(
      `[FA] génération ${s.generation}, ${s.packCount} pack(s), ` +
        `${s.registered} handlers, ${s.missing.length} manquant(s), ${s.errors.length} erreur(s)`,
    );
    for (const p of s.packs)
      say(`[FA]   pack ${p.index} z=${p.z} : ${p.evaluated}/${p.modules} modules, ${p.chars} car.`);
    for (const e of s.errors) say("[FA]   ! " + e);
    if (s.missing.length) say("[FA]   manquants : " + s.missing.join(", "));
    return s;
  }

  /**
   * Appelle un handler enregistré par les Code Blocks.
   * Si le handler manque encore après un rechargement : on le dit (log + erreur
   * pour les clics, afin que le World Code rembourse le cooldown).
   */
  function call(name, args) {
    let fn = FA.r && FA.r[name];
    if (typeof fn !== "function") {
      boot();
      fn = FA.r && FA.r[name];
    }
    if (typeof fn !== "function") {
      warn(
        "missing:" + name,
        "[FA] handler '" + name + "' introuvable : Code Block non chargé (FA.status()).",
      );
      if (/^onPlayerClick|^onPlayerRelease|^onPlayerUsed/.test(name))
        throw new Error("[FA] handler manquant : " + name);
      return undefined;
    }
    return fn.apply(null, args);
  }

  FA.reload = reload;
  FA.status = status;
  FA.logStatus = logStatus;
  globalThis.FA_BOOT = boot;

  // Démarrage différé d'un tick : laisse le monde finir son init.
  try {
    schedule(() => {
      if (alive()) boot();
    }, 1);
  } catch (_) {
    boot();
  }

  return { call, boot, reload, status, logStatus, alive };
}
