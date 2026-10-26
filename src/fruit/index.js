import { setInterval as t, setTimeout as e } from "../utils/timer";
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
  try {
    const e = api.getEntityName(t);
    if (e) return e;
  } catch (t) {
    f("getEntityName", t);
  }
  return String(t);
}
function p(t, e, o) {
  try {
    api.sendMessage(t, e);
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
    api.setBlock(c, e, o, r);
  } catch (n) {
    f("spawnFruit.setBlock", n, t + " @ " + e + "," + o + "," + r);
  }
  const a = `${e},${o},${r}`;
  (y.set(a, { fruitName: t, blockType: c, x: e, y: o, z: r, spawnedAt: Date.now() }), y.size);
}
export function pickupFruit(t, e, o, r) {
  const i = `${e},${o},${r}`,
    c = y.get(i);
  if (!c) return !1;
  try {
    api.setBlock(0, e, o, r);
  } catch (t) {
    f("pickupFruit.setBlock", t);
  }
  y.delete(i);
  const a = n[c.fruitName];
  if (a && a.baseItem) {
    const e = a.baseItem.type;
    try {
      api.giveItem(t, e, 1, {
        customDisplayName: c.fruitName,
        customDescription: "A mysterious " + c.fruitName + " fruit",
      });
    } catch (t) {
      f("pickupFruit.giveItem", t);
    }
  }
  const l = m(t),
    s = getFruitInfo(c.fruitName),
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
        { str: c.fruitName, style: { color: u || "#ffffff", fontWeight: "700" } },
        { str: "!", style: { color: "#cbd5e1" } },
      ],
      "pickupFruit",
    ),
    c.fruitName,
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
        if (r && !e[r]) {
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
    return (
      (!x[d] || I - x[d] > 2e3) &&
        ((x[d] = I),
        api.sendMessage(t, [
          { str: "[", style: { color: "#94a3b8" } },
          { str: "!", style: { color: "#ef4444", fontWeight: "700" } },
          { str: "] ", style: { color: "#94a3b8" } },
          { str: "Cooldown: ", style: { color: "#fbbf24" } },
          { str: e + "s", style: { color: "#fde68a", fontWeight: "700" } },
        ])),
      !0
    );
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
                  { str: "✦ ", style: { color: "#facc15", fontWeight: "700" } },
                  { str: "Ability ", style: { color: "#cbd5e1", fontWeight: "600" } },
                  { str: e, style: { color: "#67e8f9", fontWeight: "700" } },
                  { str: " is ready!", style: { color: "#86efac", fontWeight: "700" } },
                  { str: " ✦", style: { color: "#facc15", fontWeight: "700" } },
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
  restorePlayerFruit(t);
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
      for (const item of r.giveditems) {
        const itemType = F(item);
        if (!itemType) continue;
        let amt = 0;
        try {
          amt = api.getInventoryItemAmount(t, itemType) || 0;
        } catch (t) {
          amt = 0;
        }
        if (amt < 1) {
          missing = !0;
          break;
        }
      }
    }
    if (missing) {
      k(t);
      if (r.giveditems) for (const item of r.giveditems) I(t, item, r);
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
  M = new Map();
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
  try {
    api.setClientOption(t, "middleTextUpper", "");
  } catch (t) {
    f("fruitRoll.clearMiddleTextUpper", t);
  }
}
function D(t, e, o, r) {
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
      { str: "        ✦  FRUIT MACHINE  ✦\n\n", style: { color: i, fontWeight: "700", fontSize: "26px" } },
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
  if (e)
    try {
      api.setPlayerDbValue(t, e.key, e.balanceBefore);
    } catch (t) {
      f("fruitRoll.refund", t, e.key);
    }
}
function E(t, o, r) {
  const c = {};
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
                  w(t, [r, r, r], "✦ JACKPOT ✦", i.price, i.level, P(r, "#86efac")));
                try {
                  const e = api.giveItem(t, a, 1, {
                    customDisplayName: r,
                    customDescription: "A mysterious " + r + " fruit",
                  });
                  if ("number" == typeof e && e < 1) throw new Error("Inventory is full");
                } catch (e) {
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
                  (A(t),
                    p(
                      t,
                      [
                        { str: "[", style: { color: "#94a3b8" } },
                        { str: "✦", style: { color: "#facc15", fontWeight: "700" } },
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
            { str: "✖", style: { color: "#ef4444", fontWeight: "700" } },
            { str: "] Not enough money. Price: ", style: { color: "#cbd5e1" } },
            { str: String(o), style: { color: "#fbbf24", fontWeight: "700" } },
            { str: ". You have: ", style: { color: "#cbd5e1" } },
            { str: String(r.balance), style: { color: "#f87171", fontWeight: "700" } },
          ],
          "fruitRoll.payment",
        ),
        null
      );
    const n = { level: e, price: o, key: r.key, balanceBefore: r.balance, balanceAfter: r.balance - o };
    try {
      api.setPlayerDbValue(t, n.key, n.balanceAfter);
    } catch (e) {
      return (
        f("fruitRoll.setPlayerDbValue", e, n.key),
        p(t, "The fruit machine is temporarily unavailable.", { color: "#f87171", fontWeight: "700" }),
        null
      );
    }
    return n;
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
