import { safeEntityName as e } from "./lifeform";
import { C } from "../core/theme";
const t = {},
  l = { PIRATES: C.PIRATE, MARINES: C.MARINE };
let i = !1;
function n(e) {
  let t = null;
  try {
    t = api.getPlayerDbValue(e, "team") || null;
  } catch (e) {
    t = null;
  }
  return l[t] || C.MONEY;
}
export function noteUncreditedKill(l, i, r, o, c) {
  if (!l || !i || l === i) return;
  const f = o || e(l),
    a = c || e(i);
  f &&
    a &&
    (t[l] = {
      killer: { name: a, colour: n(i) },
      victim: { name: f, colour: n(l) },
      item: "string" == typeof r && r ? r : "Ability",
      at: Date.now(),
    });
}
export function flushKill(e) {
  const l = t[e];
  if (!l) return !1;
  delete t[e];
  try {
    return (api.addCustomKillfeedMessage(l.killer, l.victim, l.item), !0);
  } catch (e) {
    if (!i) {
      i = !0;
      try {
        api.log("[killfeed] " + e);
      } catch (e) {}
    }
    return !1;
  }
}
export function cancelKill(e) {
  delete t[e];
}
let r = 0;
export function pruneKills() {
  const e = Date.now();
  if (!(e - r < 5e3)) {
    r = e;
    for (const l in t) e - t[l].at > 5e3 && delete t[l];
  }
}
