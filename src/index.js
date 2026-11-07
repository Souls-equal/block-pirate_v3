import { canDamage as t, crewCommands as r, handleBountyKill as bKill, handleChat as a, reconcileTeamWeapons as i, setSafeZoneCheck as setSafeZoneCheck, setupChatChannels as e, syncCrewFromDB as o, syncMuteIndex as syncMuteIndex, updateNameTag as m } from "./core/team";
import { activateFruit as l, clearFruitCallbacks as s, getFruit as n, handleAbilityItemClick as p, handleAbilityItemRelease as f, handleFruitClickUp as u, handleFruitItemClick as c, handleFruitJoin as y, handleFruitJump as d, onPlayerDeathFruit as df, restorePlayerFruit as g } from "./fruit/index";
import { abilityCollision as b, abilityJoin as P, abilityLeave as k, isAbilityItemName as C, isHoldingAbilityItem as D } from "./fruit/abilities";
import { isImmuneToDamage as A, onPlayerThrowableHitTerrainPaint as I, onPlayerUsedThrowablePaint as v } from "./fruit/func-abilities";
import { dCode as w, joinUI as M, onPlayerJoinLeaderboard as S, refreshLeaderboardAll as N, updateSidebar as K, updateSidebarLight as H, handleSettingsShop as bpSettingsShop, settingsLeave as bpSettingsLeave, settingsSyncVariation as bpSettingsSync, setTutorialLineLookup as bpSetTutorialLine } from "./core/UI"; 
import { clearQuestMemory as J, onQuestKill as L, restorePlayerQuest as T } from "./gameplay/quest";
import { attackNPC as U, forgetNPC as B, isProtectedNPC as F } from "./gameplay/NPCs";
import { ensureMobData as E, forgetMob as O, killdMob as j } from "./gameplay/spawning";
import { setInterval as R, setTimeout as sTimeout, step as W } from "./utils/timer";
import { handleShopBuy as q, initStats as Q, initUpgradeShop as x } from "./gameplay/stats";
import { handleFightingStyleClick as fsClick, handleFightingStyleM1 as fsM1, isFightingStyleItemName as fsItemName, isHoldingFightingStyleItem as fsHolding, onPlayerLeaveFightingStyle as fsLeave, restoreFightingStyle as fsRestore } from "./gameplay/fightingStyles";
import { assignRank as G, clearRankCache as Y } from "./core/ranks";
import { clearConfirm as bpClearConfirm, reconcileSP as _, setPurchaseHook as bpSetPurchaseHook } from "./utils/data";
import { heldItemName as heldName, itemJoin as z } from "./gameplay/customItem";
import { setMobDamageHook as bpSetMobDamageHook, clearPlayerEffects as V, notePvPDeath as pvDeath, grantPvPShield as pvShield, pvpGuard as pvGuard, tickPvPShield as pvTick, clearPvPFor as pvClear, setTeamGuard as setTeamGuard, setZoneGuard as setZoneGuard, setTutorialGuard as bpSetTutorialGuard, withEffectSource as bpWithEffectSource } from "./utils/combat";
import { codeJoin as X, handleShopCode as Z, setupCodeShop as $ } from "./gameplay/codes";
import { STAMINA_CONFIG as tt, isDashing as isDash, setStaminaUpdateHook as rt, staminaJoin as at, staminaLeave as it, tickStamina as et, tryDash as ot } from "./gameplay/stamina";
import { claimKill as mt, creditKill as CtKill, forgetDamager as lt, getLastDamager as st, noteMobSeen as nt, pruneDamagers as pt, recordDamager as ft, releaseKill as ut, setKillCreditHook as ct, setMobSeenHook as yt } from "./utils/killAttribution";
import { forgetAliveId as dt, getAlivePlayerIds as gt, isMobEntityType as isMobType, refreshAliveCache as ht } from "./utils/lifeform";
import { cancelKill as bt, flushKill as Pt, pruneKills as kt } from "./utils/killfeed";
import { tickPath as It, onPlayerJoinPath as vt, onPlayerClickPath as wt } from "./build/path";
import { tick1 as Mt, onPlayerJoin1 as St, onPlayerClick1 as Nt } from "./build/sphere";
import { isHakiPod as hkPod, onPlayerClickArmamentHaki as Kt, onPlayerJoinArmamentHaki as Ht, onPlayerLeaveArmamentHaki as Jt, onPlayerRespawnArmamentHaki as Lt } from "./utils/haki";
import { cleanup as Tt, clearAll as Ut, onCloseBoss as Bt, onPlayerKilledMobBoss as Ft, onPlayerDamagingMobBoss as Et, onWorldAttemptDespawnMobBoss as Ot } from "./utils/boss";
import { bossDamageGate as bpBossGate } from "./utils/boss";
import { handleAdminShop as jt, adminJoin as Rt, adminLeave as Wt, checkBanOnJoin as qt, registerRecentPlayer as Qt } from "./core/admin";
import { saberClick as spClick, saberClose as spClose, saberJoin as spJoin, saberKilledMob as spKill, saberLeave as spLeave, saberLockedItem as spLocked, saberOldMan as spOldMan, saberPreventDespawn as spDespawn, saberRichMan as spRichMan, saberShanks as spShanks, spawnMobLeader as spLeader } from "./gameplay/saber";
import { installTheme as installTheme, shout, txt } from "./core/theme";
import { notePurchase as tutPurchase, skipTutorial as tutSkip, startTutorial as tutStart, startTutorialLoop as startTutorialLoop, tutorialJoin as tutorialJoin, tutorialLeave as tutorialLeave, tutorialObjective as tutorialObjective, tutorialShield as tutorialShield } from "./gameplay/tutorial";
import { variationJoin as variationJoin, variationLeave as variationLeave, startVariationLoop as startVariationLoop, launch as bpLaunch, chooseTeam as bpChooseTeam, continueJourney as bpContinue, enterSea as bpEnterSea, idInSafeZone as idInSafeZone, safeZoneBlocked as safeZoneBlocked } from "./gameplay/variations";

/* PONT VERS LES CODE BLOCKS
   En Bloxd, une fonction n'est visible depuis un autre Code Block que si elle
   est affectee SANS declaration (format `nom = () => {}`) :
       launch = (playerId) => {}      -> utilisable dans les autres Code Blocks
       export function launch() {}    -> exportee (module)
       function launch() {}           -> privee au fichier
   variations.js est un module : ses fonctions y sont locales, donc invisibles
   depuis un Code Block. On les recopie ici sous leur nom GLOBAL, sans
   declaration. NE JAMAIS ecrire `const launch = ...` : le nom redeviendrait
   prive et les Code Blocks ne le verraient plus. */
launch = (playerId) => bpLaunch(playerId);
/* Provenance des effets : "which player, which ability". Les effets poses
   hors du cast (timer, tick, aura) perdent le contexte ; un Code Block peut
   le rendre explicite :
       withEffectSource(pid, "gas", () => eff(id, "Slowness", 1200, { inbuiltLevel: 3 }))
   ou, plus direct encore : eff(id, "Slowness", 1200, {
       inbuiltLevel: 3, source: "gas", casterId: pid }). */
withEffectSource = (casterId, abilityId, fn) => bpWithEffectSource(casterId, abilityId, fn);
chooseTeam = (playerId, teamId) => bpChooseTeam(playerId, teamId);
continueJourney = (playerId) => bpContinue(playerId);
enterSea = (playerId, seaNumber) => bpEnterSea(playerId, seaNumber);
/* Saber Quest : le Mob Leader se lance depuis un Code Block (comme les quetes
   normales, mais avec ses propres capacites). En jeu, c'est le PNJ
   "Mob Leader Summoner" qui fait le travail :
       spawnMobLeader(x, y, z)            -> a l'endroit voulu
       spawnMobLeader(x, y, z, playerId)  -> et il vise ce joueur */
spawnMobLeader = (x, y, z, playerId) => spLeader(x, y, z, playerId);
/* Tutoriel : le passer, ou le rejouer. Le premier sert au joueur qui ne veut
   pas des explications (double clic de confirmation, comme un achat), le
   second a tester le parcours depuis un Code Block :
       skipTutorial(playerId)                 -> plus jamais de tutoriel
       startTutorial(playerId)                -> le relance a l'etape 1      */
startTutorial = (playerId) => tutStart(playerId, true);
skipTutorial = (playerId) => tutSkip(playerId);

/* Palette unique + emojis remplaces par des icones Bloxd : on branche le
   normalisateur de textes avant tout le reste. */
installTheme();

/* Les capacites (fruit, armes d'habilete) passent par combat.damage() et non
   par le handler du moteur : sans ce branchement un marine pouvait toucher un
   autre marine. */
try {
    setTeamGuard(t);
} catch (e) {}

/* Zone neutre du lobby (rayon de 100 blocs autour du spawn et des deux hubs) :
   ni capacites, ni degats. On branche les trois gardes sur la meme fonction. */
try {
    setZoneGuard(idInSafeZone);
    setSafeZoneCheck(idInSafeZone);
} catch (e) {}

/* Variations : lobby (defaut) + une par mer. Branche la sauvegarde de position
   periodique ; le reste est pilote par les handlers ci-dessous. */
try {
    startVariationLoop();
} catch (e) {}

/* Tutoriel : trois branchements seulement.
   - la garde PvP de l'etape 1 (utils/combat, comme la garde de zone) ;
   - le hook d'achat (utils/data) pour l'etape "premiere arme" ;
   - la ligne d'objectif dans la sidebar (core/UI). */
try {
    bpSetTutorialGuard(tutorialShield);
    bpSetPurchaseHook(tutPurchase);
    bpSetTutorialLine(tutorialObjective);
    startTutorialLoop();
} catch (e) {}

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

/* Pendant un dash, le coup de poing (main vide) est bloqué.
   Les dégâts venant d'une habileté (withItem = item d'habileté) passent. */
function meleeLocked(t, withItem) {
    try {
        if (!isDash(t)) return !1;
    } catch (e) {
        return !1;
    }
    const held = heldName(t);
    if (held && "Air" !== held) return !1;
    const src = Vt(withItem);
    if (src && "Air" !== src && (C(src) || fsItemName(src))) return !1;
    return !0;
}

$(), x(), rt(H), yt(E),
/* PALIERS DE DEGATS DES BOSS : utils/combat.js passe TOUS les degats de
   capacite par ce hook, donc Garp, le Saber Expert et le Mob Leader ne
   peuvent pas etre tues d'un seul coup (voir bossDamageGate). */
bpSetMobDamageHook((mobId, amount) => bpBossGate(mobId, amount));
ct((t, r, a) => {
    /* Le kill peut être crédité après la déconnexion du tueur : toutes les
       fonctions appelées ici sont protégées (try/catch), on ne filtre rien. */
    Gt("bossKill", () => Ft(t, r));
    let i = a || null;
    Gt("kill", () => {
        i = j(t, r) || i;
    }), i && Gt("quest", () => L(t, i)), Gt("sidebar", () => K(t));
    try {
        lt(r);
    } catch (t) {
        _t("killCredit.forgetDamager", t);
    }
    dt(r);
}), onPlayerJoin = t => {St(t) //sphere
    if (qt(t)) return;
    /* Chaque étape est isolée : si l'une échoue, les suivantes s'appliquent
       quand même. La sidebar, le nametag et le leaderboard ne doivent JAMAIS
       être sautés à cause d'une erreur survenue plus tôt dans le join. */
    /* Reconstruit l'index des mutes (db lobby) depuis la db du joueur : un
       redemarrage de lobby efface l'index, pas le mute. Sans ca un joueur
       reste muet sans apparaitre dans la liste, donc sans pouvoir etre demute. */
    try { syncMuteIndex(t); } catch (e) {}
    Qt(t), Gt("fruit", () => y(t)), Gt("codes", () => X(t)), Gt("admin", () => Rt(t)),
    Gt("haki", () => Ht(t)), Gt("items", () => z(t)), Gt("joinUI", () => M(t)),
    Gt("nametag", () => m(t)), Gt("weapons", () => i(t)), Gt("chat", () => e(t)),
    Gt("leaderboard", () => S(t)), Gt("sidebar", () => K(t)), Gt("quest", () => T(t)), Gt("saber", () => spJoin(t)),
    Gt("crew", () => o(t)), Gt("stamina", () => at(t)), Gt("initStats", () => Q(t)),
    Gt("rank", () => G(t)), Gt("sp", () => _(t)), Gt("restoreFruit", () => g(t)),
    Gt("restoreStyle", () => fsRestore(t)), Gt("abilities", () => P(t)),
    /* Dernier : la variation decide de la position d'arrivee (spawn du lobby,
       position sauvegardee dans la mer, ou arrivee en attente). */
    Gt("variation", () => variationJoin(t)),
    /* Dernier, et volontairement APRES la variation : le tutoriel parle une
       fois que le joueur est a sa place (spawn du lobby ou de la mer). */
    Gt("tutorial", () => tutorialJoin(t));
}, onPlayerLeave = t => {
    Gt("variation.leave", () => variationLeave(t));
    bpClearConfirm(t);
    /* Chaque sortie est isolee : avant, une exception dans la premiere
       fonction sautait toutes les suivantes — la machine a fruits continuait
       alors de tourner pour un joueur deconnecte (et loguait des erreurs). */
    Gt("leave.ui", () => k(t)), Gt("leave.style", () => fsLeave(t)),
    Gt("leave.fruit", () => Y(t)), Gt("leave.codes", () => J(t)),
    Gt("leave.fruitCallbacks", () => s(t)), Gt("leave.haki", () => V(t)),
    Gt("leave.items", () => it(t)), Gt("leave.admin", () => Wt(t)),
    Gt("leave.pvp", () => pvClear(t)), Gt("leave.settings", () => bpSettingsLeave(t)),
    Gt("leave.saber", () => spLeave(t)), Gt("leave.tutorial", () => tutorialLeave(t));
    try {
        lt(t);
    } catch (t) {
        _t("onPlayerLeave.forgetDamager", t);
    }
    bt(t), dt(t), Jt(t);
    for (const r of Xt.keys()) if (r.startsWith(String(t) + ":")) Xt.delete(r);
}, onRespawnRequest = t => {
    /* Protection PvP : 5 min contre le joueur qui vient de la tuer. */
    Gt("pvpShield", () => pvShield(t)), Gt("hakiRespawn", () => Lt(t)), Gt("restoreFruit", () => g(t)),
    Gt("restoreStyle", () => fsRestore(t)), Gt("abilities", () => P(t)),
    Gt("sidebar", () => K(t));
    try {
        sTimeout(() => {
            Gt("restoreFruit", () => g(t)), Gt("restoreStyle", () => fsRestore(t)),
            Gt("abilities", () => P(t)), Gt("sidebar", () => K(t));
        }, 5);
    } catch (t) {}
}, onPlayerClick = (t, r, a, i, e, o, m) => { Nt(t, r, a, i, e, o, m)
    /* Zone neutre du lobby : aucune capacite (armement, fruit, style de
       combat, clic d'attaque). Le dialogue PNJ reste possible. */
    if (idInSafeZone(t) && !(m && isNPCEntity(m))) return void safeZoneBlocked(t);
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
    /* Saber Quest : boutons caches, rideau, eau, mur scelle. Le clic est
       consomme seulement quand la quete fait quelque chose : le reste du
       temps, la main reste une main. */
    if (Gt("saber", () => spClick(t, r, a, i, e, o, m))) return;
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
    } catch (e) {
        m = null;
    }
    return !m || 1 === m.type || api.getHeldItem(t) || api.isPlayerCrouching(t) || ot(t) ? void 0 : (D(t) || fsHolding(t)) ? "preventAction" : void 0;
}, onMobDamagingPlayer = (t, r) => {
    if (A(r)) return "preventDamage";
    if (idInSafeZone(r)) return "preventDamage";
}, onPlayerDamagingOtherPlayer = (r, a, i, e) => {
    if (A(a)) return "preventDamage";
    /* Protection PvP : le tueur ne peut pas toucher sa victime juste apres son
       respawn ; si c'est la victime qui attaque, pvpGuard retire la protection. */
    try {
        if (pvGuard(r, a)) return "preventDamage";
    } catch (t) {
        _t("onPlayerDamagingOtherPlayer.pvpGuard", t);
    }
    /* Tutoriel, etape 1 : un joueur qui n'a pas encore choisi sa team ne peut
       pas etre frappe. Les mobs, eux, le blessent normalement. */
    try {
        if (tutorialShield(r, a)) return "preventDamage";
    } catch (t) {
        _t("onPlayerDamagingOtherPlayer.tutorial", t);
    }
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
    if (idInSafeZone(t) || idInSafeZone(r)) return "preventDamage";
    /* MEMES PALIERS POUR LE CORPS A CORPS : les capacites passent par le hook
       de utils/combat, les coups d'epee passent par ici. Les deux chemins
       interrogent donc le meme garde-fou, et un boss bloque pareil. */
    try {
        if (bpBossGate(r, a) === false) return "preventDamage";
    } catch (e) {
        _t("onPlayerDamagingMob.bossGate", e);
    }
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
}, onAttemptKillPlayer = (t, r) => {
    if (A(t)) return bt(t), "preventDeath";
    k(t), df(t), Pt(t);
    /* Bounty : le moteur fournit le tueur (r), sinon on reprend le dernier
       attaquant — a lire AVANT de l'oublier. Le tueur doit etre un joueur en
       vie (les mobs et l'environnement ne volent rien). */
    let bKiller = r || null;
    /* Une invocation (golem...) appartient a un joueur : c'est lui le tueur,
       et c'est lui qui se verra opposer la protection PvP au respawn. */
    if (bKiller) try {
        const owner = globalThis.__resolveKillOwner ? globalThis.__resolveKillOwner(bKiller) : null;
        if (owner) bKiller = owner;
    } catch (e) {
        _t("onAttemptKillPlayer.resolveOwner", e);
    }
    if (!bKiller) try {
        const d = st(t);
        bKiller = d && d.killerId || null;
    } catch (e) {
        _t("onAttemptKillPlayer.lastDamager", e);
    }
    if (bKiller) Gt("bounty", () => {
        let isPlayer = !1;
        try {
            isPlayer = gt().indexOf(bKiller) !== -1;
        } catch (e) {}
        isPlayer && (Gt("pvpDeath", () => pvDeath(t, bKiller)), bKill(bKiller, t));
    });
    try {
        lt(t);
    } catch (t) {
        _t("onAttemptKillPlayer.forgetDamager", t);
    }
    dt(t);
}, onPlayerKilledOtherPlayer = (t, r, a, i) => {
    /* Selon le chemin de mort, le moteur peut passer par ici plutot que par
       onAttemptKillPlayer : on memorise le tueur dans les deux cas, sinon la
       protection PvP ne serait jamais armee. */
    try {
        if (t && r && t !== r) Gt("pvpDeath", () => pvDeath(r, t));
    } catch (e) {
        _t("onPlayerKilledOtherPlayer.pvpDeath", e);
    }
}, onPlayerKilledMob = (t, r, a, i) => {
    let e = t;
    if (!e) try {
        const d = st(r);
        e = d && d.killerId || null;
    } catch (t) {
        e = null, _t("getLastDamager", t);
    }
    Ft(e || t, r, a, i);
    Gt("saberKill", () => spKill(e || t, r));
    if (!e || !r) {
        try {
            lt(r);
        } catch (t) {
            _t("onPlayerKilledMob.forgetDamager", t);
        }
        return void dt(r);
    }
    /* Mort confirmee par le moteur : credit garanti, sans test de distance
       (contrairement aux despawns, voir killAttribution). */
    CtKill(e, r, null, !0);
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
    /* Seuls les items uniques sont bloqués : perdus, ils ne reviennent pas
       tout seuls. Tout le reste peut tomber, y compris un fruit ramassé
       (customAttributes.isFruitBlock) — c'est le seul moyen de le donner à un
       autre joueur — et un bloc de construction qui partage son nom avec le
       fruit équipé (Stone, Ice, Sand, Glass...).
       hkPod : le pod du Haki, affiché "Armament Haki". Perdu, il laisserait un
       joueur qui CONNAÎT le haki sans aucun moyen de l'armer. */
    const l = "string" == typeof e ? e : e?.name || e?.type;
    return l && (C(l) || fsItemName(l) || spLocked(l) || hkPod(l)) ? "preventDrop" : void 0;
}, onPlayerAttemptOpenChest = (t, r, a, i, e, o) => {
    if (!e) return "preventOpen";
}, onPlayerBoughtShopItem = (t, r, a, i, e) => {
    q(t, r, a, i, e), Z(t, r, a, i, e), jt(t, r, a, i, e), Gt("settings", () => bpSettingsShop(t, r, a, i, e));
}, onPlayerUsedThrowable = (t, r, a) => {
    if (idInSafeZone(t)) return void safeZoneBlocked(t);
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
}, onWorldAttemptDespawnMob = t => F(t) ? "preventDespawn" : (spDespawn(t) || Ot(t)), onEntityCollision = (t, r) => b(t, r);

let $t = 0;

doPeriodicSave = () => {
    $t++, $t % 2 == 0 && shout([ txt("if you have any problems, bugs or glitch, report it on the discord!", "orange"), txt("> " + [ "discord.", "gg", "/", w ].join(""), "lightblue") ]);
}, tick = t => {Mt(t);//sphere
    ht(), W(), Gt("stamina", () => et()), Gt("pvp", () => pvTick()), Gt("settingsVar", () => bpSettingsSync(t)), Gt("prune", () => {
        kt(), pt();
    });
}, R(() => {
    /* gt() est un cache (80 ms) : un joueur peut avoir quitte entre-temps.
       Sans ce filtre, getPlayerPhysicsState(getPosition) jettent sur un id
       mort et l'erreur remontait dans la console du monde. */
    let online = null;
    try { online = api.getPlayerIds(); } catch (e) { online = null; }
    for (const t of gt()) try {
        if (online && online.indexOf(t) === -1) {
            try { dt(t); } catch (e) {}
            continue;
        }
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
        /* id disparu en cours de route : on l'oublie, sans bruit. */
        try { dt(t); } catch (e) {}
    }
}, 20), onClose = () => {
    Bt();
    Gt("saberClose", () => spClose());
};
