import { canDamage as t, crewCommands as r, handleChat as a, reconcileTeamWeapons as i, setupChatChannels as e, syncCrewFromDB as o, updateNameTag as m } from "./core/team";
import { activateFruit as l, clearFruitCallbacks as s, getFruit as n, handleAbilityItemClick as p, handleAbilityItemRelease as f, handleFruitClickUp as u, handleFruitItemClick as c, handleFruitJoin as y, handleFruitJump as d, onPlayerDeathFruit as df, restorePlayerFruit as g } from "./fruit/index";
import { FRUIT_ABILITIES as h, abilityCollision as b, abilityJoin as P, abilityLeave as k, isAbilityItemName as C, isHoldingAbilityItem as D } from "./fruit/abilities";
import { isImmuneToDamage as A, onPlayerThrowableHitTerrainPaint as I, onPlayerUsedThrowablePaint as v } from "./fruit/func-abilities";
import { dCode as w, joinUI as M, onPlayerJoinLeaderboard as S, refreshLeaderboardAll as N, updateSidebar as K, updateSidebarLight as H } from "./core/UI"; 
import { clearQuestMemory as J, onQuestKill as L, restorePlayerQuest as T } from "./gameplay/quest";
import { attackNPC as U, forgetNPC as B, isProtectedNPC as F } from "./gameplay/NPCs";
import { ensureMobData as E, forgetMob as O, killdMob as j } from "./gameplay/spawning";
import { setInterval as R, setTimeout as sTimeout, step as W } from "./utils/timer";
import { handleShopBuy as q, initStats as Q, initUpgradeShop as x } from "./gameplay/stats";
import { handleFightingStyleClick as fsClick, handleFightingStyleM1 as fsM1, isFightingStyleItemName as fsItemName, isHoldingFightingStyleItem as fsHolding, onPlayerLeaveFightingStyle as fsLeave, restoreFightingStyle as fsRestore } from "./gameplay/fightingStyles";
import { assignRank as G, clearRankCache as Y } from "./core/ranks";
import { reconcileSP as _ } from "./utils/data";
import { itemJoin as z } from "./gameplay/customItem";
import { clearPlayerEffects as V } from "./utils/combat";
import { codeJoin as X, handleShopCode as Z, setupCodeShop as $ } from "./gameplay/codes";
import { STAMINA_CONFIG as tt, isDashing as isDash, setStaminaUpdateHook as rt, staminaJoin as at, staminaLeave as it, tickStamina as et, tryDash as ot } from "./gameplay/stamina";
import { claimKill as mt, creditKill as CtKill, forgetDamager as lt, getLastDamager as st, noteMobSeen as nt, pruneDamagers as pt, recordDamager as ft, releaseKill as ut, setKillCreditHook as ct, setMobSeenHook as yt } from "./utils/killAttribution";
import { forgetAliveId as dt, getAlivePlayerIds as gt, isMobEntityType as isMobType, refreshAliveCache as ht } from "./utils/lifeform";
import { cancelKill as bt, flushKill as Pt, pruneKills as kt } from "./utils/killfeed";
import { tickLayer as Ct, onPlayerJoinLayer as Dt, onPlayerClickLayer as At } from "./build/layer";
import { tickPath as It, onPlayerJoinPath as vt, onPlayerClickPath as wt } from "./build/path";
import { tick1 as Mt, onPlayerJoin1 as St, onPlayerClick1 as Nt } from "./build/plane";
import { onPlayerClickArmamentHaki as Kt, onPlayerJoinArmamentHaki as Ht, onPlayerLeaveArmamentHaki as Jt, onPlayerRespawnArmamentHaki as Lt } from "./utils/haki";
import { cleanup as Tt, clearAll as Ut, onCloseBoss as Bt, onPlayerKilledMobBoss as Ft, onPlayerDamagingMobBoss as Et, onWorldAttemptDespawnMobBoss as Ot } from "./utils/boss";
import { handleAdminShop as jt, adminJoin as Rt, adminLeave as Wt, checkBanOnJoin as qt, registerRecentPlayer as Qt } from "./core/admin";

const xt = {};

function Gt(t, r) {
    try {
        r();
    } catch (r) {
        if (xt[t] = (xt[t] || 0) + 1, xt[t] <= 5) try {
            api.log("[" + t + "] " + r);
        } catch (t) {}
    }
}

const Yt = {};

function _t(t, r, a) {
    const i = t + (a ? "|" + a : "");
    if (Yt[i] = (Yt[i] || 0) + 1, Yt[i] <= 5) try {
        api.log("[" + t + "][err] " + (a ? a + " : " : "") + (r && r.message ? r.message : r));
    } catch (t) {}
}

function zt(t) {
    try {
        const r = api.getEntityName(t);
        if (r) return r;
    } catch (t) {
        _t("getEntityName", t);
    }
    return String(t);
}

function Vt(t) {
    return t ? "string" == typeof t ? t : "object" == typeof t && (t.name || t.type) || null : null;
}

const Xt = new Map;
const NPC_ATTACK_DEBOUNCE_MS = 100;

function Zt(t, r) {
    if (!r) return !1;
    const a = Date.now(), i = String(t) + ":" + String(r), n = Xt.get(i);
    if (n && a - n < NPC_ATTACK_DEBOUNCE_MS) return !1;
    Xt.set(i, a);
    return U(t, r);
}

function isNPCEntity(t) {
    try {
        return !!t && "NPC" === api.getEntityType(t);
    } catch (t) {
        return !1;
    }
}

/* Id refusé par les API Bloxd : "-1" = joueur qui n'existe plus. */
function validId(t) {
    if (null === t || void 0 === t) return !1;
    const r = String(t);
    return !!r && "-1" !== r && "0" !== r && "undefined" !== r && "null" !== r;
}

/* Nom de l'item tenu (null si inconnu). */
function heldItemName(t) {
    try {
        const h = api.getHeldItem(t);
        if (!h) return null;
        if ("string" == typeof h) return h;
        return h.name || h.type || null;
    } catch (t) {
        _t("getHeldItem", t);
        return null;
    }
}

/* Pendant un dash, le coup de poing (main vide) est bloqué.
   Les dégâts venant d'une habileté (withItem = item d'habileté) passent. */
function meleeLocked(t, withItem) {
    try {
        if (!isDash(t)) return !1;
    } catch (e) {
        return !1;
    }
    const held = heldItemName(t);
    if (held && "Air" !== held) return !1;
    const src = Vt(withItem);
    if (src && "Air" !== src && (C(src) || fsItemName(src))) return !1;
    return !0;
}

$(), x(), rt(H), yt(E), ct((t, r, a) => {
    /* Le kill peut être crédité après la déconnexion du tueur (id "-1").
       Les fonctions appelées en dessous sont déjà protégées (try/catch), donc
       on ne bloque que la sentinelle : le reste doit continuer à fonctionner. */
    const alive = validId(t);
    Gt("bossKill", () => Ft(t, r));
    let i = a || null;
    Gt("kill", () => {
        i = j(t, r) || i;
    }), i && Gt("quest", () => L(t, i)), alive && Gt("sidebar", () => K(t));
    try {
        lt(r);
    } catch (t) {
        _t("killCredit.forgetDamager", t);
    }
    dt(r);
}), onPlayerJoin = t => {
    if (qt(t)) return;
    /* Chaque étape est isolée : si l'une échoue, les suivantes s'appliquent
       quand même. La sidebar, le nametag et le leaderboard ne doivent JAMAIS
       être sautés à cause d'une erreur survenue plus tôt dans le join. */
    Qt(t), Gt("fruit", () => y(t)), Gt("codes", () => X(t)), Gt("admin", () => Rt(t)),
    Gt("haki", () => Ht(t)), Gt("items", () => z(t)), Gt("joinUI", () => M(t)),
    Gt("nametag", () => m(t)), Gt("weapons", () => i(t)), Gt("chat", () => e(t)),
    Gt("leaderboard", () => S(t)), Gt("sidebar", () => K(t)), Gt("quest", () => T(t)),
    Gt("crew", () => o(t)), Gt("stamina", () => at(t)), Gt("initStats", () => Q(t)),
    Gt("rank", () => G(t)), Gt("sp", () => _(t)), Gt("restoreFruit", () => g(t)),
    Gt("restoreStyle", () => fsRestore(t)), Gt("abilities", () => P(t));
}, onPlayerLeave = t => {
    k(t), fsLeave(t), Y(t), J(t), s(t), V(t), it(t), Wt(t);
    try {
        lt(t);
    } catch (t) {
        _t("onPlayerLeave.forgetDamager", t);
    }
    bt(t), dt(t), Jt(t);
    for (const r of Xt.keys()) if (r.startsWith(String(t) + ":")) Xt.delete(r);
}, onRespawnRequest = t => {
    Gt("hakiRespawn", () => Lt(t)), Gt("restoreFruit", () => g(t)),
    Gt("restoreStyle", () => fsRestore(t)), Gt("abilities", () => P(t)),
    Gt("sidebar", () => K(t));
    try {
        sTimeout(() => {
            Gt("restoreFruit", () => g(t)), Gt("restoreStyle", () => fsRestore(t)),
            Gt("abilities", () => P(t)), Gt("sidebar", () => K(t));
        }, 5);
    } catch (t) {}
}, onPlayerClick = (t, r, a, i, e, o, m) => {
    if (Kt(t)) return;
    if (api.isPlayerCrouching(t) && l(t)) return K(t), void N();
    if (m && isNPCEntity(m)) {
        try {
            Zt(t, m);
        } catch (t) {
            _t("onPlayerClick.attackNPC", t);
        }
        return;
    }
    /* Pendant un dash, aucun coup de poing (style ou capacité en cooldown). */
    const canPunch = !isDash(t);
    let s = !1;
    try {
        s = fsClick(t, r, a, i, e, o, m) || p(t, r, a, i, e, o, m);
    } catch (t) {
        _t("onPlayerClick.handleAbility", t), s = !0;
    }
    /* Capacité en cooldown : le clic devient un coup de poing du style. */
    if ("cooldown" === s) {
        if (canPunch) try {
            fsM1(t, m, !0);
        } catch (t) {
            _t("onPlayerClick.fightingStyleM1", t);
        }
        return;
    }
    if (!s) {
        try {
            c(t, r, a, i, e, o, m);
        } catch (t) {
            _t("onPlayerClick.handleFruit", t);
        }
        if (canPunch) try {
            fsM1(t, m);
        } catch (t) {
            _t("onPlayerClick.fightingStyleM1", t);
        }
    }
}, onPlayerClickUp = (t, r, a, i, e, o, m) => {
    u(t, r, a, i, e, o, m), f(t, r, a, i, e, o, m);
}, onPlayerJump = t => {
    Gt("jump", () => d(t));
}, onPlayerAltAction = (t, r, a, i, e, o) => {
    if (o && isNPCEntity(o)) return Zt(t, o);
    let m = null;
    try {
        m = api.getPlayerPhysicsState(t);
    } catch (t) {
        m = null, _t("getPlayerPhysicsState", t);
    }
    return !m || 1 === m.type || api.getHeldItem(t) || api.isPlayerCrouching(t) || ot(t) ? void 0 : (D(t) || fsHolding(t)) ? "preventAction" : void 0;
}, onMobDamagingPlayer = (t, r) => {
    if (A(r)) return "preventDamage";
}, onPlayerDamagingOtherPlayer = (r, a, i, e) => {
    if (A(a)) return "preventDamage";
    try {
        ft(a, r, Vt(e));
    } catch (t) {
        _t("onPlayerDamagingOtherPlayer.recordDamager", t);
    }
    const res = t(r, a);
    if (res !== "preventDamage") {
        if (meleeLocked(r, e)) return "preventDamage";
        try {
            if (fsM1(r, a)) return "preventDamage";
        } catch (t) {
            _t("onPlayerDamagingOtherPlayer.fsM1", t);
        }
    }
    return res;
}, onPlayerDamagingMob = (t, r, a, i) => {
    if (Et(t, r, a, i) || isNPCEntity(r)) return "preventDamage";
    nt(r);
    try {
        ft(r, t, Vt(i));
    } catch (t) {
        _t("onPlayerDamagingMob.recordDamager", t);
    }
    if (meleeLocked(t, i)) return "preventDamage";
    try {
        if (fsM1(t, r)) return "preventDamage";
    } catch (t) {
        _t("onPlayerDamagingMob.fsM1", t);
    }
}, onAttemptKillPlayer = t => {
    if (A(t)) return bt(t), "preventDeath";
    k(t), df(t), Pt(t);
    try {
        lt(t);
    } catch (t) {
        _t("onAttemptKillPlayer.forgetDamager", t);
    }
    dt(t);
}, onPlayerKilledMob = (t, r, a, i) => {
    let e = t;
    if (!e) try {
        const d = st(r);
        e = d && d.killerId || null;
    } catch (t) {
        e = null, _t("getLastDamager", t);
    }
    Ft(e || t, r, a, i);
    if (!e || !r) {
        try {
            lt(r);
        } catch (t) {
            _t("onPlayerKilledMob.forgetDamager", t);
        }
        return void dt(r);
    }
    CtKill(e, r);
}, onPlayerChat = (t, r, i) => a(t, r, i), playerCommand = (t, a) => {
    let i = null;
    try {
        i = api.getEntityName(t);
    } catch (t) {
        return void _t("playerCommand.getEntityName", t);
    }
    "EPICOO00000" !== i && "K4miNoK4mi" !== i && "Yanick2010" !== i && Gt("crew", () => r(t, a));
}, onPlayerChangeBlock = (t, r, a, i, e, o, m, l, s) => {
    const n = api.getEntityName(t);
    if ("K4miNoK4mi" !== n && "Yanick2010" !== n) return e.includes("Trap") || C(o) || fsItemName(o) ? "preventChange" : void 0;
}, onPlayerDropItem = (t, r, a, i, e, o, m) => {
    const l = "string" == typeof e ? e : e?.name || e?.type;
    if (C(l) || fsItemName(l)) return "preventDrop";
    const s = h[n(t)];
    return s?.baseItem && s.baseItem.type === l ? "preventDrop" : void 0;
}, onPlayerAttemptOpenChest = (t, r, a, i, e, o) => {
    if (!e) return "preventOpen";
}, onPlayerBoughtShopItem = (t, r, a, i, e) => {
    q(t, r, a, i, e), Z(t, r, a, i, e), jt(t, r, a, i, e);
}, onPlayerUsedThrowable = (t, r, a) => {
    Gt("throwable", () => v(t, r, a));
}, onPlayerThrowableHitTerrain = (t, r, a) => {
    Gt("throwable", () => I(t, r, a));
}, onWorldAttemptSpawnMob = (t, r, a, i) => {
    if ([ "Pig", "Sheep", "Cow", "Stag", "Deer", "Wolf", "Horse", "Bear", "Gold Watermelon Stag" ].includes(t)) return "preventSpawn";
}, onMobDespawned = t => {
    try {
        const last = st(t);
        if (last && last.killerId && Date.now() - last.at <= 30000) {
            CtKill(last.killerId, t);
        }
    } catch (e) {
        _t("onMobDespawned.creditKill", e);
    }
    O(t), B(t);
    try {
        lt(t);
    } catch (t) {
        _t("onMobDespawned.forgetDamager", t);
    }
    try {
        ut(t);
    } catch (t) {
        _t("onMobDespawned.releaseKill", t);
    }
    dt(t);
}, onEntityDeleted = (t, r) => {
    if (!t) return;
    if (r && !isMobType(r)) return;
    try {
        const last = st(t);
        if (last && last.killerId && Date.now() - last.at <= 30000) {
            CtKill(last.killerId, t);
        }
    } catch (e) {
        _t("onEntityDeleted.creditKill", e);
    }
    O(t), B(t);
    try {
        lt(t);
    } catch (e) {
        _t("onEntityDeleted.forgetDamager", e);
    }
    try {
        ut(t);
    } catch (e) {
        _t("onEntityDeleted.releaseKill", e);
    }
    dt(t);
}, onWorldAttemptDespawnMob = t => F(t) ? "preventDespawn" : Ot(t), onEntityCollision = (t, r) => b(t, r);

let $t = 0;

doPeriodicSave = () => {
    $t++, $t % 2 == 0 && api.broadcastMessage([ {
        str: "if you have any problems, bugs or glitch, report it on the discord!",
        style: {
            color: "orange"
        }
    }, {
        str: "> " + [ "discord.", "gg", "/", w ].join(""),
        style: {
            color: "lightblue"
        }
    } ]);
}, tick = t => {
    ht(), W(), Gt("stamina", () => et()), Gt("prune", () => {
        kt(), pt();
    });
}, R(() => {
    for (const t of gt()) try {
        if (1 === api.getPlayerPhysicsState(t).type) continue;
        let [r, a, i] = api.getPosition(t), e = "Water";
        if (api.getBlock(r, a, i) === e || api.getBlock(r, a - 1, i) === e) {
            if (api.applyEffect(t, "water", 1200, {
                icon: "Iceball",
                displayName: "Fruit Malediction (Drowning)"
            }), !n(t)) continue;
            if (api.getHealth(t) > 0) {
                const r = Number(api.getClientOption(t, "maxHealth")) || 100, a = Math.max(1, Math.round(r / 10));
                api.applyHealthChange(t, -a, {
                    lifeformId: t,
                    withItem: "Iceball"
                }, !0);
            }
        }
    } catch (r) {
        _t("water.tick", r, zt(t));
    }
}, 20), onClose = () => {
    Bt();
};