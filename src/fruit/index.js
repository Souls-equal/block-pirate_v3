import { setInterval as t, setTimeout as e } from "../utils/timer";
import { C as THEME, say, shout } from "../core/theme";
import { confirmAction } from "../utils/data";
let o = function () {},
  r = function () {};
try {
  const L = require("../gameplay/customItem");
  (L.registerCustomBlock && (o = L.registerCustomBlock), L.registerCustomItem && (r = L.registerCustomItem));
} catch (U) {
  try {
    api.log("[fruit][err] require(customItem) : " + U);
  } catch (O) {}
}
import { FRUIT_ABILITIES as n } from "./abilities";
import { isFightingStyleAbilityName, isFightingStyleItemName, restoreFightingStyle } from "../gameplay/fightingStyles";
import {
  FRUITS_BY_RARITY as i,
  FRUIT_RARITIES as c,
  getRarityColor as a,
  getRarityEnchantTier as l,
} from "./fruitData";
export { FRUITS_BY_RARITY, FRUIT_RARITIES, getRarityColor, getRarityEnchantTier } from "./fruitData";
function s(t, e) {}
const u = {};
function f(t, e, o) {
  const r = t + (o ? "|" + o : "");
  if (((u[r] = (u[r] || 0) + 1), u[r] <= 5))
    try {
      api.log("[fruit][err] " + t + (o ? " (" + o + ")" : "") + " : " + (e && e.message ? e.message : e));
    } catch (t) {}
}
function m(t) {
  /* Un id deja parti n'est pas une erreur : pas de log. */
  try {
    const e = api.getEntityName(t);
    if (e) return e;
  } catch (e) {}
  return String(t);
}
function p(t, e, o) {
  if (!t || GONE[t]) return;
  try {
    say(t, e);
  } catch (t) {
    f("sendMessage", t, o);
  }
}
!(function () {
  let t = 0,
    e = [];
  for (const o in n) {
    const r = n[o];
    (r && r.baseItem && r.baseItem.type) || e.push(o + " : baseItem manquant");
    let i = 0;
    if (r) for (const t in r) "string" == typeof t && 0 === t.indexOf("attack") && i++;
    ((t += i), r && 0 === i && "none" !== r.abilities && e.push(o + " : 0 habilités"));
  }
  e.length && e.join(" | ");
})();
const y = new Map(),
  h = new Map(),
  g = new Map(),
  b = {},
  d = new Map();
export function getFruitInfo(t) {
  for (const [e, o] of Object.entries(i))
    for (const r of o)
      if (r.rpName.toLowerCase() === t.toLowerCase())
        return {
          name: r.rpName,
          rpName: r.rpName,
          itemName: r.itemName,
          desc: r.rpDesc,
          rarity: e,
          color: a(e),
          enchantTier: l(e),
        };
  return null;
}
export function getRarityFromFruitName(t) {
  const e = getFruitInfo(t);
  return e ? e.rarity : null;
}

/* Description "par defaut" d'un fruit : c'est elle qui s'affiche dans le
   tooltip de l'item, et celle que l'on enregistre comme description de base
   (voir itemJoin dans gameplay/customItem.js). */
export function fruitDescription(fruitName) {
  const info = getFruitInfo(fruitName);
  if (!info) return "A mysterious " + fruitName + " fruit";
  const desc = info.desc ? String(info.desc) : "";
  /* Le fruit se donne en le lachant : on le dit dans la description. */
  return "\u25cf " + info.rarity + " Fruit \u25cf\n" + desc + "\n[Sneak + Click to consume | Drop to give away]";
}

/* Attributs complets a passer a api.giveItem() pour un fruit : nom, description
   et surtout le TIER d'enchantement (c'est lui qui colore le nom et le glint).
   Le moteur ne lit le tier que dans customAttributes.enchantmentTier : un tier
   place a la racine des attributs est ignore. */
export function fruitItemAttributes(fruitName) {
  const info = getFruitInfo(fruitName);
  const name = (info && info.name) || fruitName;
  const tier = (info && info.enchantTier) || "Tier 1";
  return {
    customDisplayName: name,
    customDescription: fruitDescription(name),
    customAttributes: {
      enchantmentTier: tier,
      isFruitBlock: true,
      fruitRpName: name,
    },
  };
}
!(function () {
  for (const t in n) {
    const e = n[t];
    if (!e || !e.baseItem) continue;
    const i = e.baseItem.type,
      c = getFruitInfo(t),
      a = c ? c.color : "#FFFFFF",
      l = c ? c.enchantTier : "Tier 1";
    try {
      o(i, t, t, `A mysterious ${t} fruit`, a, null, null);
    } catch (e) {
      f("registerCustomBlock", e, t);
    }
    try {
      r(i, t, t, `A mysterious ${t} fruit`, a, null, null, l);
    } catch (e) {
      f("registerCustomItem", e, t);
    }
  }
})();
export function spawnFruit(t, e, o, r) {
  const i = n[t];
  if (!i || !i.baseItem) return;
  try {
    api.getBlock(e, o, r);
  } catch (e) {
    f("spawnFruit.getBlock", e, t);
  }
  const c = i.baseItem.type;
  try {
    /* api.setBlock attend (x, y, z, nom) : l'ancien appel (nom, x, y, z)
       posait un bloc a l'origine du monde et laissait la case vide. */
    api.setBlock(e, o, r, c);
  } catch (n) {
    f("spawnFruit.setBlock", n, t + " @ " + e + "," + o + "," + r);
  }
  const a = `${e},${o},${r}`;
  (y.set(a, { fruitName: t, blockType: c, x: e, y: o, z: r, spawnedAt: Date.now() }), y.size);
}
/* ══ FRUITS SAUVAGES ═══════════════════════════════════════════════════════

   Un bloc de fruit apparait tout seul dans le monde. Le joueur le clique et
   recoit un fruit AU HASARD de la rareté de ce bloc — exactement le meme
   tirage que la machine a fruits, mais gratuit et sans animation.

   | bloc            | rareté    | poids (celui du roll) |
   | Potato Block    | Common    | 41 |
   | Pear Block      | Uncommon  | 28 |
   | Plum Block      | Rare      | 21 |
   | Banana Block    | Legendary |  8 |
   | Apple Block     | Mythical  |  2 |

   UN SEUL fruit en vie a la fois : un nouveau toutes les 20 minutes, et un
   fruit que personne ne ramasse pourrit au bout de 15 minutes.
   ══════════════════════════════════════════════════════════════════════════ */

const WILD_BLOCKS = [
  { block: "Potato Block", rarity: "Common" },
  { block: "Pear Block", rarity: "Uncommon" },
  { block: "Plum Block", rarity: "Rare" },
  { block: "Banana Block", rarity: "Legendary" },
  { block: "Apple Block", rarity: "Mythical" },
];

/* POINTS DE SPAWN : TROIS par ile, pour qu'on ne campe pas un seul point.
   Starter Pirate, Middle Town et Starter Marine n'en ont aucun : ce sont les
   iles de depart, les fruits n'y apparaissent pas.

   Le bloc est pose sur le point donne. Si cette case est occupee (quelqu'un a
   construit dessus), on essaie la case juste au-dessus, puis on abandonne ce
   point : jamais de fruit dans un mur, et jamais de fruit qui flotte.
   Pour en ajouter ou en deplacer un, c'est ici et nulle part ailleurs. */
const WILD_SPOTS = [
  { pos: [1273, -915, 338], where: "Jungle" },
  { pos: [1342, -916, 226], where: "Jungle" },
  { pos: [1490, -918, 100], where: "Jungle" },

  { pos: [926, -915, 836], where: "Pirate Village" },
  { pos: [740, -917, 694], where: "Pirate Village" },
  { pos: [720, -918, 832], where: "Pirate Village" },

  { pos: [607, -919, 1613], where: "Desert" },
  { pos: [487, -916, 1818], where: "Desert" },
  { pos: [622, -918, 1888], where: "Desert" },

  { pos: [2406, -918, 691], where: "Snow Village" },
  { pos: [2536, -911, 537], where: "Snow Village" },
  { pos: [2445, -919, 413], where: "Snow Village" },

  { pos: [2049, -917, -653], where: "Marine Fortress" },
  { pos: [2081, -919, -457], where: "Marine Fortress" },
  { pos: [2279, -918, -642], where: "Marine Fortress" },

  { pos: [2694, -800, 1274], where: "Skylands" },
  { pos: [2958, -673, 1662], where: "Skylands" },
  { pos: [3063, -606, 1378], where: "Skylands" },
];

/* ATTENTION : les minuteries de utils/timer comptent en TICKS (1 tick = 50 ms). */
const WILD_EVERY = 24000;        // 20 min entre deux spawns
const WILD_CHECK = 1200;         // verification de la pourriture : 1 min
const WILD_LIFE_MS = 900000;     // un fruit vit 15 min (Date.now(), en ms)
let wildTimer = null;

function wildRarity() {
  let total = 0;
  for (const r of c) total += r.chance;
  let roll = Math.random() * total;
  for (const r of c) {
    roll -= r.chance;
    if (roll < 0) return r.name;
  }
  return c[0].name;
}

function wildFruitOf(rarity) {
  const list = i[rarity];
  if (!list || !list.length) return null;
  return list[Math.floor(Math.random() * list.length)].rpName;
}

function spawnWildFruit() {
  if (y.size > 0) return !1;
  const rarity = wildRarity();
  let def = null;
  for (const b of WILD_BLOCKS) if (b.rarity === rarity) def = b;
  if (!def) return !1;

  const free = [];
  for (const spot of WILD_SPOTS) {
    let y = null;
    try {
      for (let up = 0; up < 2; up++) {
        const cy = spot.pos[1] + up;
        if (api.getBlock(spot.pos[0], cy, spot.pos[2]) === "Air"
          && api.getBlock(spot.pos[0], cy + 1, spot.pos[2]) === "Air") { y = cy; break; }
      }
    } catch (e) { y = null; }
    if (y !== null) free.push({ where: spot.where, pos: [spot.pos[0], y, spot.pos[2]] });
  }
  if (!free.length) return !1;
  const spot = free[Math.floor(Math.random() * free.length)];
  const pos = spot.pos;

  try {
    api.setBlock(pos[0], pos[1], pos[2], def.block);
  } catch (e) {
    f("spawnWildFruit.setBlock", e);
    return !1;
  }
  y.set(pos[0] + "," + pos[1] + "," + pos[2], {
    rarity: rarity, blockType: def.block, x: pos[0], y: pos[1], z: pos[2], spawnedAt: Date.now(),
  });

  const color = a(rarity);
  try {
    shout([
      { icon: "fa-solid fa-star", style: { color: color } },
      { str: " A ", style: { color: "#cbd5e1" } },
      { str: rarity, style: { color: color, fontWeight: "700" } },
      { str: " fruit block appeared at ", style: { color: "#cbd5e1" } },
      { str: spot.where, style: { color: "#f8fafc", fontWeight: "700" } },
      { str: ". Click it to claim a random " + rarity + " fruit. It rots in 15 minutes.", style: { color: "#94a3b8" } },
    ]);
  } catch (e) {}
  return !0;
}

function rotWildFruits() {
  const now = Date.now();
  for (const [key, f0] of y) {
    if (now - f0.spawnedAt < WILD_LIFE_MS) continue;
    try { api.setBlock(f0.x, f0.y, f0.z, "Air"); } catch (e) {}
    y.delete(key);
    try {
      shout([
        { icon: "fa-solid fa-hourglass", style: { color: "#94a3b8" } },
        { str: " The fruit block nobody claimed rotted away.", style: { color: "#94a3b8" } },
      ]);
    } catch (e) {}
  }
}

function startWildSpawn() {
  if (wildTimer) return;
  spawnWildFruit();
  wildTimer = t(spawnWildFruit, WILD_EVERY);
  t(rotWildFruits, WILD_CHECK);
}

export function pickupFruit(t, e, o, r) {
  const i2 = `${e},${o},${r}`,
    c2 = y.get(i2);
  if (!c2) return !1;
  try {
    /* api.setBlock attend (x, y, z, nom) : c'est bien la case cliquee. */
    api.setBlock(e, o, r, "Air");
  } catch (t2) {
    f("pickupFruit.setBlock", t2);
  }
  y.delete(i2);
  /* Le fruit recu est TIRE au moment du ramassage, dans la rareté du bloc. */
  const info = c2.fruitName ? getFruitInfo(c2.fruitName) : null,
    rarity = c2.rarity || (info && info.rarity) || "Common",
    fruitName = c2.rarity ? wildFruitOf(rarity) : c2.fruitName;
  if (!fruitName) return !1;
  const a2 = n[fruitName];
  if (a2 && a2.baseItem) {
    const e2 = a2.baseItem.type;
    try {
      api.giveItem(t, e2, 1, fruitItemAttributes(fruitName));
    } catch (t3) {
      f("pickupFruit.giveItem", t3);
    }
  }
  const l = m(t),
    s = getFruitInfo(fruitName),
    u = s ? s.color : "#FFFFFF";
  return (
    p(
      t,
      [
        { str: "[", style: { color: "#94a3b8" } },
        { str: "!", style: { color: "#ef4444", fontWeight: "700" } },
        { str: "] ", style: { color: "#94a3b8" } },
        { str: l, style: { color: "#f8fafc", fontWeight: "600" } },
        { str: " picked up ", style: { color: "#cbd5e1" } },
        { str: fruitName, style: { color: u || "#ffffff", fontWeight: "700" } },
        { str: "!", style: { color: "#cbd5e1" } },
      ],
      "pickupFruit",
    ),
    fruitName,
    !0
  );
}
export function activateFruit(t) {
  if (d.has(t)) return !0;
  let o = null;
  try {
    o = api.getHeldItem(t)?.name || null;
  } catch (t) {
    return (f("activateFruit.getHeldItem", t), !1);
  }
  if (!o) return !1;
  let r = null,
    i = null;
  for (const t in n) {
    const e = n[t];
    if (!e || !e.baseItem || !e.baseItem.type) continue;
    const c = e.baseItem.type;
    if (c === o) {
      ((r = t), (i = c));
      break;
    }
  }
  if (!r) return !1;
  if (h.get(t) === r)
    return (
      p(
        t,
        [
          { str: "[", style: { color: "#94a3b8" } },
          { str: "!", style: { color: "#ef4444", fontWeight: "700" } },
          { str: "] ", style: { color: "#94a3b8" } },
          { str: "This fruit is already equipped: ", style: { color: "#cbd5e1" } },
          { str: r, style: { color: "#67e8f9", fontWeight: "700" } },
          { str: ".", style: { color: "#cbd5e1" } },
        ],
        "activateFruit",
      ),
      !0
    );
  (h.has(t) && clearFruit(t), k(t));
  try {
    api.removeItemName(t, i, 1);
  } catch (t) {
    return (f("consumeFruitItem.removeItemName", t, i), !1);
  }
  try {
    api.setPlayerDbValue(t, "fruit", r);
  } catch (t) {
    f("activateFruit.setPlayerDbValue", t);
  }
  try {
    api.playSound(t, "exp_levelup", 0.7, 1.15);
  } catch (t) {}
  (d.set(t, r),
    (function (t) {
      try {
        api.animateEntity(t, {
          animationDurationMs: 1155,
          loop: !1,
          nodeAnimations: {
            TorsoNode: { timeline: [{ timeFraction: 0, rotation: { point: [0.15, 0, 0] } }] },
            HeadMesh: {
              timeline: [
                { timeFraction: 0, rotation: { point: [0.3, 0, 0] } },
                { timeFraction: 1 / 9, rotation: { point: [0.45, 0, 0] } },
                { timeFraction: 2 / 9, rotation: { point: [0.3, 0, 0] } },
                { timeFraction: 3 / 9, rotation: { point: [0.3, 0, 0] } },
                { timeFraction: 4 / 9, rotation: { point: [0.45, 0, 0] } },
                { timeFraction: 5 / 9, rotation: { point: [0.3, 0, 0] } },
                { timeFraction: 6 / 9, rotation: { point: [0.3, 0, 0] } },
                { timeFraction: 7 / 9, rotation: { point: [0.45, 0, 0] } },
                { timeFraction: 8 / 9, rotation: { point: [0.3, 0, 0] } },
                { timeFraction: 1, rotation: { point: [0.3, 0, 0] } },
              ],
            },
            ArmRightMesh: {
              timeline: [
                { timeFraction: 0, rotation: { point: [-1.4, 0, 0.7] } },
                { timeFraction: 1 / 9, rotation: { point: [-1.6, 0, 0.9] } },
                { timeFraction: 2 / 9, rotation: { point: [-1.4, 0, 0.7] } },
                { timeFraction: 3 / 9, rotation: { point: [-1.4, 0, 0.7] } },
                { timeFraction: 4 / 9, rotation: { point: [-1.6, 0, 0.9] } },
                { timeFraction: 5 / 9, rotation: { point: [-1.4, 0, 0.7] } },
                { timeFraction: 6 / 9, rotation: { point: [-1.4, 0, 0.7] } },
                { timeFraction: 7 / 9, rotation: { point: [-1.6, 0, 0.9] } },
                { timeFraction: 8 / 9, rotation: { point: [-1.4, 0, 0.7] } },
                { timeFraction: 1, rotation: { point: [-1.4, 0, 0.7] } },
              ],
            },
          },
        });
      } catch (t) {
        f("activateFruit.animateEntity", t);
      }
    })(t));
  try {
    e(() => {
      d.get(t) === r && (d.delete(t), N(t, r, !1));
    }, 24);
  } catch (e) {
    (d.delete(t), f("activateFruit.setTimeout", e), N(t, r, !1));
  }
  return !0;
}
function F(t) {
  return "string" == typeof t ? t : (t && (t.type || t.itemName || t.item || t.name)) || null;
}
function I(t, e, o) {
  const r = F(e);
  if (!r) return;
  const n = (function (t, e) {
    const o = {};
    (t && t.attributes && "object" == typeof t.attributes && Object.assign(o, t.attributes),
      t && t.customAttributes && (o.customAttributes = t.customAttributes));
    const r = F(t),
      n = (function (t, e) {
        if (!t || !e) return null;
        for (const o in t) {
          if (!o.startsWith("attack")) continue;
          const r = t[o];
          if (r && r.clicked === e) return r;
        }
        return null;
      })(e, r),
      i =
        (t && (t.customDisplayName || t.displayName || t.label)) ||
        (t && t.name && t.name !== r ? t.name : null) ||
        (n && (n.displayName || n.name)),
      c = t && (t.customDescription || t.description || t.desc);
    return (
      i && (o.customDisplayName = String(i)),
      c && (o.customDescription = String(c)),
      Object.keys(o).length ? o : void 0
    );
  })(e, o);
  try {
    api.giveItem(t, r, e.amount || 1, n);
  } catch (t) {
    f("equipFruit.giveItem", t, r);
  }
}
function k(t) {
  const e = {};
  for (const o in n) {
    const r = n[o];
    if (r && r.giveditems)
      for (const o of r.giveditems) {
        const r = F(o);
        if (r && !e[r] && !isFightingStyleItemName(r)) {
          e[r] = !0;
          try {
            const e = api.getInventoryItemAmount(t, r);
            "number" == typeof e && e > 0 && api.removeItemName(t, r, e);
          } catch (t) {
            f("clearFruitCallbacks.removeAll", t, r);
          }
        }
      }
  }
}
function N(t, e, o) {
  h.set(t, e);
  const r = n[e];
  if (r) {
    if ((k(t), r.giveditems)) for (const e of r.giveditems) I(t, e, r);
    try {
      restoreFightingStyle(t);
    } catch (t) {}
    if (r.hooks && r.hooks.onJoin)
      try {
        r.hooks.onJoin(t);
      } catch (t) {
        f("equipFruit.onJoin", t, e);
      }
    try {
      api.setPlayerDbValue(t, "fruit", e);
    } catch (t) {
      f("equipFruit.setPlayerDbValue", t);
    }
    if (!o) {
      const o = getFruitInfo(e);
      p(
        t,
        [
          { str: "[", style: { color: "#94a3b8" } },
          { str: "!", style: { color: "#ef4444", fontWeight: "700" } },
          { str: "] ", style: { color: "#94a3b8" } },
          { str: "You ate ", style: { color: "#cbd5e1" } },
          { str: e, style: { color: (o ? o.color : "#FFFFFF") || "#ffffff", fontWeight: "700" } },
          { str: " fruit!", style: { color: "#cbd5e1" } },
        ],
        "equipFruit",
      );
    }
  }
}
const v = {},
  x = {};
let W = {};
export function handleAbilityItemClick(t, o, r, i, c, a, l) {
  const s = h.get(t);
  if (!s) return !1;
  let u = null;
  try {
    u = api.getHeldItem(t);
  } catch (t) {
    return (f("dispatch.getHeldItem", t), !1);
  }
  if (!u || !u.name) return !1;
  const p = n[s];
  if (!p) return !1;
  const customName = u.attributes && u.attributes.customDisplayName;
  if (isFightingStyleAbilityName(customName) || isFightingStyleItemName(u.name)) return !1;
  const y = (function (t, e, cName) {
    if (cName) {
      for (const o in t) {
        if ("string" != typeof o || 0 !== o.indexOf("attack")) continue;
        const r = t[o];
        if (r && r.name === cName && r.clicked === e) return r;
      }
    }
    for (const o in t) {
      if ("string" != typeof o || 0 !== o.indexOf("attack")) continue;
      const r = t[o];
      if (r && r.clicked === e) return r;
    }
    return null;
  })(p, u.name, customName);
  if (!y) {
    const e = t + ":" + u.name,
      o = Date.now();
    return ((!v[e] || o - v[e] > 1e4) && ((v[e] = o), m(t), u.name), !1);
  }
  try {
    if (l && "NPC" === api.getEntityType(l)) return !1;
  } catch (t) {
    f("dispatch.getEntityType", t);
  }
  const d = t + ":" + (y.name || y.clicked),
    F = y.cooldown || 900,
    I = Date.now(),
    k = g.get(d);
  if (k && I - k < F) {
    const e = Math.max(1, Math.ceil((k + F - I) / 1e3));
    (!x[d] || I - x[d] > 2e3) &&
      ((x[d] = I),
      say(t, [
        { str: "[", style: { color: "#94a3b8" } },
        { str: "!", style: { color: "#ef4444", fontWeight: "700" } },
        { str: "] ", style: { color: "#94a3b8" } },
        { str: "Cooldown: ", style: { color: "#fbbf24" } },
        { str: e + "s", style: { color: "#fde68a", fontWeight: "700" } },
      ]));
    /* "cooldown" => src/index.js enchaîne sur le coup de poing du style. */
    return "cooldown";
  }
  const N = y.name || y.clicked,
    C = y.displayName || N;
  (g.set(d, I),
    e(
      () => {
        g.get(d) === I &&
          (function (t, e) {
            try {
              api.sendFlyingMiddleMessage(
                t,
                [
                  { icon: "fa-solid fa-sparkle", style: { color: THEME.MONEY } },
                  { str: "Ability ", style: { color: "#cbd5e1", fontWeight: "600" } },
                  { str: e, style: { color: "#67e8f9", fontWeight: "700" } },
                  { str: " is ready!", style: { color: "#86efac", fontWeight: "700" } },
                  { icon: "fa-solid fa-sparkle", style: { color: THEME.MONEY } },
                ],
                100,
              );
            } catch (t) {
              f("abilityReady", t, e);
            }
          })(t, C);
      },
      Math.max(1, Math.ceil(F / 50)),
    ),
    (b[t] = N),
    m(t),
    y.clicked);
  try {
    api.playSound(t, "magicAccent1", 0.35, 1.3);
  } catch (t) {}
  try {
    y.onClick(t, o, r, i, c, a, l);
  } catch (t) {
    (f("dispatch.onClick", t, C), g.delete(d));
  }
  return (W[d] || (W[d] = 1), !0);
}
export function handleAbilityItemRelease(t, e, o, r, i, c, a) {
  const l = b[t];
  if (!l) return !1;
  delete b[t];
  const u = h.get(t);
  if (!u) return !1;
  const p = n[u];
  if (!p) return !1;
  for (const n in p) {
    if ("string" != typeof n || 0 !== n.indexOf("attack")) continue;
    const u = p[n];
    if (u && u.onPlayerClickUp && (u.name || u.clicked) === l) {
      s(0, (m(t), u.name || u.clicked));
      try {
        u.onPlayerClickUp(t, e, o, r, i, c, a);
      } catch (t) {
        f("dispatch.onPlayerClickUp", t, u.name || u.clicked);
      }
      return !0;
    }
  }
  return !1;
}
export function getFruit(t) {
  return h.get(t) || null;
}
export function handleFruitJoin(t) {
  if (t) delete GONE[t];
  restorePlayerFruit(t);
  /* Les fruits sauvages n'existent que s'il y a quelqu'un pour les ramasser :
     la minuterie demarre au premier join et ne demarre qu'une fois. */
  startWildSpawn();
}
export function restorePlayerFruit(t) {
  try {
    const pending = d.get(t);
    if (pending && n[pending]) {
      d.delete(t);
      N(t, pending, !0);
      return;
    }
    let dbFruit = null;
    try {
      dbFruit = api.getPlayerDbValue(t, "fruit");
    } catch (t) {}
    if (dbFruit && n[dbFruit] && h.get(t) && h.get(t) !== dbFruit) {
      N(t, dbFruit, !0);
      return;
    }
    const e = (dbFruit && n[dbFruit] ? dbFruit : null) || h.get(t);
    if (!e || !n[e]) return;
    h.set(t, e);
    const r = n[e];
    let missing = !1;
    if (r.giveditems && r.giveditems.length) {
      let fruitItemCount = 0;
      for (let slot = 0; slot <= 50; slot++) {
        let it = null;
        try {
          it = api.getItemSlot(t, slot);
        } catch (t) {
          it = null;
        }
        if (!it || !it.name) continue;
        const cName = it.attributes && it.attributes.customDisplayName;
        if (isFightingStyleAbilityName(cName)) continue;
        for (const item of r.giveditems) {
          if (F(item) === it.name) {
            fruitItemCount++;
            break;
          }
        }
      }
      if (fruitItemCount < r.giveditems.length) missing = !0;
    }
    if (missing) {
      k(t);
      if (r.giveditems) for (const item of r.giveditems) I(t, item, r);
      try {
        restoreFightingStyle(t);
      } catch (t) {}
    }
    if (r.hooks && r.hooks.onJoin) {
      try {
        r.hooks.onJoin(t);
      } catch (t) {
        f("restorePlayerFruit.onJoin", t, e);
      }
    }
  } catch (t) {
    f("restorePlayerFruit", t);
  }
}
export function onPlayerDeathFruit(t) {
  const pending = d.get(t);
  if (pending && n[pending]) {
    d.delete(t);
    N(t, pending, !0);
  }
  const e = h.get(t),
    o = e ? n[e] : null;
  if (o && o.hooks && o.hooks.onLeave)
    try {
      o.hooks.onLeave(t);
    } catch (t) {
      f("onPlayerDeathFruit.onLeave", t, e);
    }
  delete b[t];
}
export function clearFruitCallbacks(t) {
  /* Marque tout de suite : a partir d'ici, plus aucun appel API pour ce
     joueur (le reste de la deconnexion peut prendre plusieurs ticks et
     getPlayerIds peut encore le lister). */
  if (t) GONE[t] = true;
  /* Deconnexion en pleine animation : la machine avait deja encaisse le
     prix. On rend l'argent (et on arrete le minuteur) avant de toucher au
     reste, sinon le joueur perdait sa mise pour un fruit jamais livre. */
  try {
    refundRoll(t);
  } catch (t) {
    f("clearFruitCallbacks.refundRoll", t);
  }
  const pending = d.get(t);
  if (pending && n[pending]) {
    try {
      api.setPlayerDbValue(t, "fruit", pending);
    } catch (t) {}
  }
  d.delete(t);
  const e = h.get(t),
    o = e ? n[e] : null;
  if (o && o.hooks && o.hooks.onLeave)
    try {
      o.hooks.onLeave(t);
    } catch (t) {
      f("clearFruitCallbacks.onLeave", t, e);
    }
  (o
    ? (function (t, e) {
        const o = {};
        if (e && e.giveditems)
          for (const r of e.giveditems) {
            const e = F(r);
            if (e && !o[e]) {
              o[e] = !0;
              try {
                const o = api.getInventoryItemAmount(t, e);
                "number" == typeof o && o > 0 && api.removeItemName(t, e, o);
              } catch (t) {
                f("clearFruitCallbacks.removeItemName", t, e);
              }
            }
          }
      })(t, o)
    : k(t),
    h.delete(t),
    delete b[t]);
  const r = [];
  for (const e of g.keys()) e.startsWith(t + ":") && r.push(e);
  for (const t of r) g.delete(t);
  e && m(t);
}
export function clearFruit(t) {
  clearFruitCallbacks(t);
  try {
    api.deletePlayerDbValue(t, "fruit");
  } catch (t) {
    f("clearFruit.deletePlayerDbValue", t);
  }
}
export function handleFruitItemClick(t, e, o, r, n, i, c) {
  const a = `${o},${r},${n}`;
  y.get(a) && pickupFruit(t, o, r, n);
}
export function handleFruitClickUp(t, e, o, r, n, i, c) {}
export function handleFruitJump(t) {}
const C = ["money", "coins", "beli", "currency", "gold", "cash", "balance"],
  R = ["level", "lvl", "Level"],
  M = new Map(),
  /* Joueurs dont on a RECU le depart. api.getPlayerIds() peut encore les
     lister une fraction de seconde alors que tout appel sur eux leve deja
     (setClientOption, setPlayerDbValue, playSound...). Notre propre handler
     de depart est la seule source fiable : des qu'il passe, on n'appelle
     plus rien pour ce joueur pendant le roll. */
  GONE = {};
function T(t, e) {
  try {
    return "number" == typeof (o = api.getPlayerDbValue(t, e)) && Number.isFinite(o)
      ? o
      : "string" == typeof o && o.trim() && Number.isFinite(Number(o))
        ? Number(o)
        : null;
  } catch (t) {
    return (f("fruitRoll.getPlayerDbValue", t, e), null);
  }
  var o;
}
function A(t) {
  if (!t || GONE[t]) return;
  try {
    api.setClientOption(t, "middleTextUpper", "");
  } catch (t) {
    f("fruitRoll.clearMiddleTextUpper", t);
  }
}
function D(t, e, o, r) {
  if (!t || GONE[t]) return;
  try {
    "function" == typeof api.playSound && api.playSound(t, e, o, r);
  } catch (t) {
    f("fruitRoll.playSound", t, e);
  }
}
function S(t) {
  const e = String(t || "???"),
    o = e.length > 12 ? e.slice(0, 11) + "…" : e,
    r = 14 - o.length;
  return " ".repeat(Math.floor(r / 2)) + o + " ".repeat(Math.ceil(r / 2));
}
function P(t, e = "#f8fafc") {
  const o = getFruitInfo(t);
  return (o && o.color) || e;
}
function w(t, e, o, r, n, i = "#facc15") {
  const c = [
      { str: "╔════════════════════════════════╗\n", style: { color: "#facc15", fontWeight: "700", fontSize: "20px" } },
      { str: "        FRUIT MACHINE\n\n", style: { color: i, fontWeight: "700", fontSize: "26px" } },
      { str: "      ║  ", style: { color: "#94a3b8", fontWeight: "700", fontSize: "20px" } },
    ],
    a = e.map((t) => ({ str: "  " + S(t) + "  ", style: { color: P(t), fontWeight: "700", fontSize: "24px" } }));
  (c.push(
    a[0],
    { str: "  ║  ", style: { color: "#94a3b8", fontWeight: "700", fontSize: "20px" } },
    a[1],
    { str: "  ║  ", style: { color: "#94a3b8", fontWeight: "700", fontSize: "20px" } },
    a[2],
    { str: "  ║\n\n", style: { color: "#94a3b8", fontWeight: "700", fontSize: "20px" } },
    { str: "        " + o + "\n", style: { color: i, fontWeight: "700", fontSize: "20px" } },
    { str: "        PRICE: " + r + "  •  LEVEL: " + n + "\n", style: { color: "#cbd5e1", fontWeight: "600", fontSize: "16px" } },
    { str: "╚════════════════════════════════╝", style: { color: "#facc15", fontWeight: "700", fontSize: "20px" } },
  ),
    (function (t, e) {
      try {
        api.setClientOption(t, "middleTextUpper", e);
      } catch (t) {
        f("fruitRoll.middleTextUpper", t);
      }
    })(t, c));
}
function $(t) {
  return t[Math.floor(Math.random() * t.length)];
}
function B(t, e) {
  if (!t || GONE[t]) return;
  if (e && e.paid)
    try {
      api.setPlayerDbValue(t, e.key, e.balanceBefore);
      e.paid = false;
    } catch (t) {
      f("fruitRoll.refund", t, e.key);
    }
}
/* Encaisse le prix AU MOMENT DE LA LIVRAISON. Relit le solde : le joueur a pu
   depenser entre-temps (autre achat, autre PNJ). Renvoie false si l'argent
   n'y est plus — dans ce cas rien n'est debite et rien n'est donne. */
function fruitPay(t, e) {
  if (!e) return false;
  if (e.paid) return true;
  /* Parti juste avant l'encaissement : on ne touche pas a sa base. */
  if (!fruitOnline(t)) return false;
  const cur = T(t, e.key);
  if (null === cur || cur < e.price) return false;
  e.balanceBefore = cur;
  e.balanceAfter = cur - e.price;
  try {
    api.setPlayerDbValue(t, e.key, e.balanceAfter);
    e.paid = true;
    return true;
  } catch (r) {
    f("fruitRoll.pay", r, e.key);
    return false;
  }
}
/* Le joueur est-il encore dans CE monde ? Pendant l'animation (2 s), il peut
   deconnecter ou changer de variation : l'entite disparait, et le moindre
   api.setClientOption / playSound sur cet id leve une erreur. */
function fruitOnline(t) {
  if (!t || GONE[t]) return false;
  try {
    const e = api.getPlayerIds() || [];
    return -1 !== e.indexOf(t);
  } catch (e) {
    return false;
  }
}
/* Rembourse le roll en cours du joueur, s'il y en a un, et l'arrete.
   La piece est rendue telle quelle (balanceBefore) : le joueur ne perd rien
   parce qu'il a quitte pendant l'animation. */
function refundRoll(t) {
  const e = M.get(t);
  if (!e) return false;
  M.delete(t);
  /* Si rien n'a encore ete debite (cas normal), il n'y a rien a rendre :
     aucun appel a la base, donc aucune erreur sur un joueur deja parti. */
  B(t, e);
  if (fruitOnline(t)) A(t);
  return true;
}
function E(t, o, r) {
  const c = r;
  M.set(t, c);
  const a = (function () {
    const t = [];
    for (const e of Object.keys(i)) {
      const o = i[e];
      if (Array.isArray(o)) for (const e of o) e && e.rpName && t.push(e.rpName);
    }
    return t.length ? t : ["Common Fruit"];
  })();
  let l = 0,
    s = -1;
  (D(t, "reel", 0.7, 1),
    w(t, ["???", "???", "???"], "ROLLING...", r.price, r.level, "#facc15"),
    e(function i() {
      if (M.get(t) !== c) return;
      /* Parti en plein tour : plus rien a afficher, plus rien a jouer. */
      if (!fruitOnline(t)) return void refundRoll(t);
      const u = Math.min(1, l / 120);
      if (u >= 1)
        return (
          D(t, "lowDrum", 0.8, 0.9),
          w(t, [o, o, o], "LOCKING IN...", r.price, r.level, P(o, "#86efac")),
          void e(
            () =>
              (function (t, o, r, i) {
                if (M.get(t) !== o) return;
                M.delete(t);
                /* Parti pendant l'animation : rien n'a ete debite, on s'arrete. */
                if (!fruitOnline(t)) return;
                /* Encaisse maintenant : le solde peut avoir baisse pendant les 2 s. */
                if (!fruitPay(t, i))
                  return void (
                    A(t),
                    p(t, "Not enough money anymore. Nothing was taken from you.", {
                      color: "#f87171",
                      fontWeight: "700",
                    })
                  );
                const c = n[r],
                  a = c && c.baseItem && c.baseItem.type;
                if (!a)
                  return (
                    B(t, i),
                    A(t),
                    void p(t, "The fruit machine failed. Your money was refunded.", {
                      color: "#f87171",
                      fontWeight: "700",
                    })
                  );
                (D(t, "cashRegister", 0.9, 1),
                  D(t, "exp_levelup", 0.75, 1),
                  w(t, [r, r, r], "JACKPOT", i.price, i.level, P(r, "#86efac")));
                try {
                  const e = api.giveItem(t, a, 1, fruitItemAttributes(r));
                  if ("number" == typeof e && e < 1) throw new Error("Inventory is full");
                } catch (e) {
                  /* Parti entre l'encaissement et la remise : il n'y a plus
                     personne a rembourser ni a prevenir, et loguer une erreur
                     ici ne servirait a rien (rien n'est recuperable). */
                  if (!fruitOnline(t)) return void f("fruitRoll.giveItem", e, r);
                  return (
                    B(t, i),
                    A(t),
                    f("fruitRoll.giveItem", e, r),
                    void p(t, "The fruit machine failed. Your money was refunded.", {
                      color: "#f87171",
                      fontWeight: "700",
                    })
                  );
                }
                const l = getFruitInfo(r);
                e(() => {
                  if (!fruitOnline(t)) return;
                  (A(t),
                    p(
                      t,
                      [
                        { str: "[", style: { color: "#94a3b8" } },
                        { icon: "fa-solid fa-sparkle", style: { color: THEME.MONEY } },
                        { str: "] You received ", style: { color: "#cbd5e1" } },
                        { str: r, style: { color: (l && l.color) || "#ffffff", fontWeight: "700" } },
                        { str: " fruit for ", style: { color: "#cbd5e1" } },
                        { str: String(i.price), style: { color: "#facc15", fontWeight: "700" } },
                        { str: "!", style: { color: "#cbd5e1" } },
                      ],
                      "fruitRoll.reward",
                    ));
                }, 50);
              })(t, c, o, r),
            18,
          )
        );
      const m = u > 0.86 ? o : $(a),
        y = u > 0.93 ? o : $(a),
        h = u > 0.97 ? o : $(a),
        g = u < 0.72 ? "#facc15" : u < 0.92 ? "#fb923c" : "#86efac",
        b = Math.floor(l / 6);
      (b !== s && ((s = b), D(t, "reel", 0.28, 0.8 + Math.min(0.7, u))),
        w(
          t,
          [m, y, h],
          u < 0.35 ? "SPINNING..." : u < 0.72 ? "BUILDING LUCK..." : u < 0.92 ? "SLOWING DOWN..." : "FINAL SPIN...",
          r.price,
          r.level,
          g,
        ));
      const d = u < 0.35 ? 2 : u < 0.7 ? 3 : u < 0.9 ? 4 : u < 0.98 ? 6 : 8;
      ((l += d), e(i, d));
    }, 1));
}
export function rollFruit(t, e = 1) {
  const o = (function (t) {
    const e = Number(t) > 0 ? Number(t) : 1;
    let o = 0;
    for (const t of c) o += t.chance * ("Common" === t.name ? 1 : e);
    let r = Math.random() * o,
      n = "Common";
    for (const t of c)
      if (((r -= t.chance * ("Common" === t.name ? 1 : e)), r < 0)) {
        n = t.name;
        break;
      }
    const a = i[n];
    return a && a.length ? a[Math.floor(Math.random() * a.length)].rpName : null;
  })(e);
  if (!o) return null;
  if (null == t) return o;
  if (M.has(t)) return (p(t, "The fruit machine is already spinning.", { color: "#fbbf24", fontWeight: "700" }), null);

  /* Meme confirmation que tous les autres achats (voir utils/data) : le
     premier clic annonce le prix, le second lance la machine. Le controle
     d'argent reste fait plus bas, donc on ne demande pas de confirmer un
     achat impossible. */
  const rollLevel = (function () {
    for (const key of R) {
      const v = T(t, key);
      if (null !== v) return Math.max(0, Math.floor(v));
    }
    return 0;
  })();
  const rollPrice = 500 + 35 * rollLevel;
  let rollBalance = 0;
  for (const key of C) {
    const v = T(t, key);
    if (null !== v) { rollBalance = Math.max(0, v); break; }
  }
  if (rollBalance >= rollPrice && !confirmAction(t, "fruit", [
    { icon: "fa-solid fa-dice", style: { color: THEME.MONEY } },
    { str: " Spin the fruit machine for ", style: { color: "#cbd5e1" } },
    { str: String(rollPrice), style: { color: "#facc15", fontWeight: "700" } },
    { str: " (level " + rollLevel + ").", style: { color: "#cbd5e1" } },
  ])) return null;

  const r = (function (t) {
    const e = (function (t) {
        for (const e of R) {
          const o = T(t, e);
          if (null !== o) return Math.max(0, Math.floor(o));
        }
        return 0;
      })(t),
      o = (function (t) {
        return 500 + 35 * t;
      })(e),
      r = (function (t) {
        for (const e of C) {
          const o = T(t, e);
          if (null !== o) return { key: e, balance: Math.max(0, o) };
        }
        return { key: "money", balance: 0 };
      })(t);
    if (r.balance < o)
      return (
        p(
          t,
          [
            { str: "[", style: { color: "#94a3b8" } },
            { icon: "fa-solid fa-xmark", style: { color: "#ef4444", fontWeight: "700" } },
            { str: "] Not enough money. Price: ", style: { color: "#cbd5e1" } },
            { str: String(o), style: { color: "#fbbf24", fontWeight: "700" } },
            { str: ". You have: ", style: { color: "#cbd5e1" } },
            { str: String(r.balance), style: { color: "#f87171", fontWeight: "700" } },
          ],
          "fruitRoll.payment",
        ),
        null
      );
    /* ATTENTION : on ne debite PAS ici. Le prix est retire au moment ou le
       fruit est livre (voir fruitPay). Payer d'avance obligeait a rembourser
       quand le joueur quittait pendant l'animation — or on ne peut plus
       ecrire dans la base d'un joueur deconnecte, donc l'argent etait perdu
       ET une erreur partait dans les logs. */
    return { level: e, price: o, key: r.key, balanceBefore: r.balance, balanceAfter: r.balance - o, paid: false };
  })(t);
  return r ? (E(t, o, r), o) : null;
}
export function onBlockBreak(t, e, o, r, n) {
  const i = `${e},${o},${r}`;
  y.has(i) && pickupFruit(t, e, o, r);
}
export function onBlockInteract(t, e, o, r, n) {
  const i = `${e},${o},${r}`;
  y.has(i) && pickupFruit(t, e, o, r);
}
export function getAllFruits() {
  return Array.from(y.values());
}
export function getFruitAtPosition(t, e, o) {
  const r = `${t},${e},${o}`;
  return y.get(r);
}
export function hasFruit(t, e) {
  return h.get(t) === e;
}
export { getFruitDataFromItem as getItemData };
export function getFruitDataFromItem(t) {
  if (!t || !t.name) return null;
  for (const e in n) {
    const o = n[e];
    if (o && o.baseItem && o.baseItem.type === t.name) return { fruitName: e };
  }
  return null;
}
