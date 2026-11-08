import { canDamage as t, crewCommands as r, handleBountyKill as bKill, handleChat as a, reconcileTeamWeapons as i, setSafeZoneCheck as setSafeZoneCheck, setupChatChannels as e, syncCrewFromDB as o, syncMuteIndex as syncMuteIndex, updateNameTag as m } from "./core/team";
import { activateFruit as l, clearFruitCallbacks as s, fruitAbilityCount as fruitAbilityCount, getFruit as n, handleAbilitySlot as slotAbility, removeAbilityItems as dropAbilityItems, ensureSwapOrb as ensureSwap, removeSwapOrb as dropSwap, SWAP_ORB as SWAP_ORB_Name, handleAbilityItemClick as p, handleAbilityItemRelease as f, handleFruitClickUp as u, handleFruitItemClick as c, handleFruitJoin as y, handleFruitJump as d, onPlayerDeathFruit as df, restorePlayerFruit as g } from "./fruit/index";
import { abilityCollision as b, abilityJoin as P, abilityLeave as k, fruitButtons as fruitButtonInfo, isAbilityItemName as C, isHoldingAbilityItem as D } from "./fruit/abilities";
import { isImmuneToDamage as A, onPlayerThrowableHitTerrainPaint as I, onPlayerUsedThrowablePaint as v } from "./fruit/func-abilities";
import { dCode as w, joinUI as M, onPlayerJoinLeaderboard as S, refreshLeaderboardAll as N, updateSidebar as K, updateSidebarLight as H, handleSettingsShop as bpSettingsShop, settingsLeave as bpSettingsLeave, settingsSyncVariation as bpSettingsSync, setTutorialLineLookup as bpSetTutorialLine } from "./core/UI"; 
import { clearQuestMemory as J, onQuestKill as L, restorePlayerQuest as T } from "./gameplay/quest";
import { attackNPC as U, forgetNPC as B, isProtectedNPC as F } from "./gameplay/NPCs";
import { ensureMobData as E, forgetMob as O, killdMob as j } from "./gameplay/spawning";
import { setInterval as R, setTimeout as sTimeout, step as W } from "./utils/timer";
import { handleShopBuy as q, initStats as Q, initUpgradeShop as x } from "./gameplay/stats";
import { ensureVoidNet as ensureNet, handleFightingStyleClick as fsClick, removeFightingStyleItems as dropFightingStyleItems, removeVoidNet as dropNet, handleFightingStyleM1 as fsM1, isFightingStyleItemName as fsItemName, isHoldingFightingStyleItem as fsHolding, isHoldingVoidNet as fsHoldingNet, onPlayerLeaveFightingStyle as fsLeave, restoreFightingStyle as fsRestore, useFightingStyleAbility as styleAbility, VOID_NET as VOID_NET_Name } from "./gameplay/fightingStyles";
import { assignRank as G, clearRankCache as Y } from "./core/ranks";
import { clearConfirm as bpClearConfirm, clearDevice as clearPlayerDevice, isMobilePlayer as isMobilePlayer, reconcileSP as _, setControlsHook as bpSetControlsHook, setDevice as setPlayerDevice, setPurchaseHook as bpSetPurchaseHook, useItemControls as useItemControls } from "./utils/data";
import { heldItemName as heldName, itemJoin as z } from "./gameplay/customItem";
import { pickTarget as bpPickTarget, setMobDamageHook as bpSetMobDamageHook, clearPlayerEffects as V, notePvPDeath as pvDeath, grantPvPShield as pvShield, pvpGuard as pvGuard, tickPvPShield as pvTick, clearPvPFor as pvClear, setTeamGuard as setTeamGuard, setZoneGuard as setZoneGuard, setTutorialGuard as bpSetTutorialGuard, withEffectSource as bpWithEffectSource } from "./utils/combat";
import { codeJoin as X, handleShopCode as Z, setupCodeShop as $ } from "./gameplay/codes";
import { STAMINA_CONFIG as tt, DASH_ITEM as DASH_ITEM_Name, clearDashState as clearDash, ensureDashItem as ensureDash, handleDashItemClick as dashItemClick, hasDashItem as hasDash, isDashing as isDash, removeDashItem as dropDash, setStaminaUpdateHook as rt, staminaJoin as at, staminaLeave as it, tickStamina as et, tryDash as ot } from "./gameplay/stamina";
import { claimKill as mt, creditKill as CtKill, forgetDamager as lt, getLastDamager as st, noteMobSeen as nt, pruneDamagers as pt, recordDamager as ft, releaseKill as ut, setKillCreditHook as ct, setMobSeenHook as yt } from "./utils/killAttribution";
import { facingInfo as facingInfoOf, forgetAliveId as dt, getAlivePlayerIds as gt, isMobEntityType as isMobType, refreshAliveCache as ht, targetBlock as aimBlockOf } from "./utils/lifeform";
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

/* Settings -> Controls : c'est setupControls qui sait retirer les items d'un
   mode et donner ceux de l'autre. Enregistre ici parce que data -> index
   serait un cycle (index importe deja data). */
try { bpSetControlsHook(setupControls); } catch (e) {}

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
});

/* ══════════════════════════════════════════════════════════════════════════
   COMMANDES : clavier sur PC, items sur mobile (demande 75)

   Un joueur ne peut pas passer de PC a mobile sans quitter le monde : on lit
   donc api.isMobile UNE fois, au join, et on ne relit plus.

   PC     : 6 boutons personnalises (customButtons). Q = dash, puis une touche
            par capacite de fruit (Z X C V F). Les items de capacites sont
            RETIRES de l'inventaire : ils ne servent plus a rien et
            encombraient 5 slots.
   MOBILE : pas de clavier, donc pas de boutons. Les items de capacites
            restent, et un item « Snowdash » sert de dash (son effet par
            defaut est annule dans onPlayerAltAction, voir plus bas).

   Les keycodes sont ceux du clavier QWERTY ; Bloxd remappe tout seul pour un
   AZERTY (c'est la meme touche physique).
   ══════════════════════════════════════════════════════════════════════════ */
/* Trois groupes de boutons, jamais melanges dans la meme main :
     dash    : toujours la (Q) ;
     ability : capacites du fruit, autant que le fruit en a (3 a 5) ;
     style   : les deux attaques du style de combat.
   `ability` et `style` partagent Z/X a dessein : on ne peut tenir qu'un item a
   la fois (Swap Orb ou Void Net), donc ils ne sont jamais actifs ensemble. */
const CONTROLS = {
    dash: [{ id: "dash", icon: "zap", keycode: "KeyQ", description: "Dash" }],
    ability: [
        { id: "ability1", icon: "fire", keycode: "KeyZ", description: "Devil Fruit ability 1" },
        { id: "ability2", icon: "snowflake", keycode: "KeyX", description: "Devil Fruit ability 2" },
        { id: "ability3", icon: "crosshairs", keycode: "KeyC", description: "Devil Fruit ability 3" },
        { id: "ability4", icon: "swords", keycode: "KeyV", description: "Devil Fruit ability 4" },
        { id: "ability5", icon: "gem", keycode: "KeyF", description: "Devil Fruit ability 5" },
    ],
    style: [
        { id: "style1", icon: "hand-fist", keycode: "KeyZ", description: "Fighting Style attack 1" },
        { id: "style2", icon: "hand-back-point-up", keycode: "KeyX", description: "Fighting Style attack 2" },
    ],
};

/* Boutons envoyes au client, en fonction de ce que le joueur a EN MAIN.
   Regle (demande 76) : pas d'item en main, pas de touches. */
function buttonsFor(playerId) {
    /* Mode « items » (le defaut) : aucun bouton, tout passe par les items. */
    if (useItemControls(playerId)) return [];
    const list = CONTROLS.dash.slice();
    const held = heldName(playerId);
    if (held === SWAP_ORB_Name) {
        /* Une touche par capacite REELLE du fruit, avec l'icone de son type
           d'attaque (fruit/abilities, ATTACK_TYPES) et son nom en description :
           le joueur lit « Rocket Salvo » sur le bouton, pas « Ability 2 ». */
        const info = fruitButtonInfo(n(playerId)).slice(0, fruitAbilityCount(playerId));
        for (let i = 0; i < info.length && i < CONTROLS.ability.length; i++) {
            list.push({
                id: "ability" + (i + 1),
                icon: info[i].icon || CONTROLS.ability[i].icon,
                keycode: CONTROLS.ability[i].keycode,
                description: info[i].name || CONTROLS.ability[i].description,
            });
        }
    } else if (held === VOID_NET_Name) {
        for (let i = 0; i < CONTROLS.style.length; i++) list.push(CONTROLS.style[i]);
    }
    return list;
}

/* Un seul envoi par changement : setClientOption est un aller-retour client.
   On garde donc la derniere liste par joueur et on compare avant d'envoyer. */
const lastButtons = {};
function applyButtons(playerId) {
    if (!playerId) return;
    const list = buttonsFor(playerId);
    const key = JSON.stringify(list);
    if (lastButtons[playerId] === key) return;
    lastButtons[playerId] = key;
    try { api.setClientOption(playerId, "customButtons", list); } catch (e) { _t("buttons", e); }
}

/* Les deux items de commande (PC). Ils ne SERVENT a rien d'autre qu'a ouvrir
   des touches : tout ce que le jeu ferait d'eux (lancer, poser, manger,
   echanger, charger, lacher) est donc bloque. Sans ca, un clic droit lance la
   « Devil Fruit Orb » et la consomme. */
function isCommandItemName(name) {
    return name === SWAP_ORB_Name || name === VOID_NET_Name;
}

function heldCommandItem(playerId) {
    const name = heldName(playerId);
    return isCommandItemName(name) ? name : null;
}

/* L'appareil ne change qu'en quittant le monde : on le lit UNE fois, au tout
   debut du join (avant le fruit, qui donne des items differents selon lui). */
function setupDevice(playerId) {
    let mobile = false;
    try { mobile = api.isMobile(playerId) === true; } catch (e) { mobile = false; }
    setPlayerDevice(playerId, mobile);
    return mobile;
}

/* Pose les commandes du mode courant, et RIEN de l'autre :
     « items »   : items de capacite + items de style, dash a l'action
                   secondaire (mobile : l'item Dash, puisqu'il n'a pas de
                   clic droit) ;
     « buttons » : Swap Orb / Void Net, touches, aucun item de capacite.
   Appele au join ET a chaque bascule des Settings (data.applyControls). */
function setupControls(playerId) {
    if (useItemControls(playerId)) {
        lastButtons[playerId] = null;
        try { api.setClientOption(playerId, "customButtons", []); } catch (e) {}
        dropSwap(playerId), dropNet(playerId);
        /* Le dash par item n'existe que sur mobile : sur PC c'est le clic droit. */
        if (isMobilePlayer(playerId)) ensureDash(playerId);
        else dropDash(playerId);
        /* Les items du fruit et du style reviennent (restore ne redonne que ce
           qui manque, donc un joueur deja equipe ne recoit rien en double). */
        Gt("controls.fruit", () => g(playerId));
        Gt("controls.style", () => fsRestore(playerId));
        return true;
    }
    dropDash(playerId);
    dropAbilityItems(playerId);
    dropFightingStyleItems(playerId);
    ensureSwap(playerId);
    ensureNet(playerId);
    applyButtons(playerId);
    return true;
}

/* Ce qu'un CLIC aurait donne : le bloc vise, le bloc a cet endroit, et la
   creature devant le joueur. Une touche ne fournit aucune de ces valeurs, on
   les reconstitue donc ici, une fois, pour les touches de capacite. */
function clickPoint(playerId) {
    let pos = null, info = null;
    try { pos = api.getPosition(playerId); } catch (e) { pos = null; }
    try { info = facingInfoOf(playerId); } catch (e) { info = null; }
    const dir = (info && info.dir) || [0, 0, 1];
    const cam = (info && info.camPos) || (pos ? [pos[0], pos[1] + 1.45, pos[2]] : [0, 64, 0]);
    let hit = null;
    try { hit = aimBlockOf(playerId); } catch (e) { hit = null; }
    const x = hit ? hit[0] : cam[0] + dir[0] * 8;
    const y = hit ? hit[1] : cam[1] + dir[1] * 8;
    const z = hit ? hit[2] : cam[2] + dir[2] * 8;
    let block = "Air";
    try { block = api.getBlock(Math.floor(x), Math.floor(y), Math.floor(z)) || "Air"; } catch (e) {}
    let target = null;
    try { target = bpPickTarget(playerId, cam, dir, 40, 0.6); } catch (e) { target = null; }
    return { x: x, y: y, z: z, block: block, target: target };
}

/* Bouton personnalise presse (PC). Le bouton n'existe que si le bon item est en
   main, mais on revérifie ici : un client peut garder un bouton residuel. */
onPlayerPressedButton = (playerId, buttonId) => {
    if (!playerId || !buttonId) return;
    if (buttonId === "dash") {
        try { ot(playerId); } catch (e) { _t("button.dash", e); }
        return;
    }
    const held = heldName(playerId);
    if (held === SWAP_ORB_Name) {
        const m = /^ability([1-5])$/.exec(buttonId);
        if (!m) return;
        const aim = clickPoint(playerId);
        try {
            slotAbility(playerId, Number(m[1]) - 1, false, aim.x, aim.y, aim.z, aim.block, aim.target);
        } catch (e) {
            _t("button.ability", e);
        }
        return;
    }
    if (held === VOID_NET_Name) {
        const index = buttonId === "style1" ? 0 : buttonId === "style2" ? 1 : -1;
        if (index < 0) return;
        const aim = clickPoint(playerId);
        try {
            styleAbility(playerId, index, aim.target);
        } catch (e) {
            _t("button.style", e);
        }
    }
};

/* Les touches dependent de l'item EN MAIN : on les recalcule quand le joueur
   change de slot (le cas normal) et quand son inventaire bouge (item donne,
   ramasse, perdu). applyButtons ne renvoie rien si la liste n'a pas change. */
onPlayerSelectInventorySlot = (t, slot) => {
    applyButtons(t);
}, onInventoryUpdated = t => {
    applyButtons(t);
}, onPlayerJoin = t => {St(t) //sphere
    if (qt(t)) return;
    /* Chaque étape est isolée : si l'une échoue, les suivantes s'appliquent
       quand même. La sidebar, le nametag et le leaderboard ne doivent JAMAIS
       être sautés à cause d'une erreur survenue plus tôt dans le join. */
    /* Reconstruit l'index des mutes (db lobby) depuis la db du joueur : un
       redemarrage de lobby efface l'index, pas le mute. Sans ca un joueur
       reste muet sans apparaitre dans la liste, donc sans pouvoir etre demute. */
    try { syncMuteIndex(t); } catch (e) {}
    /* L'appareil AVANT tout le reste : le fruit et le style donnent des items
       differents sur PC (Swap Orb / Void Net) et sur mobile (items de
       capacite). Lire api.isMobile plus tard donnerait « PC » a tout le monde. */
    Gt("device", () => setupDevice(t)),
    Qt(t), Gt("fruit", () => y(t)), Gt("codes", () => X(t)), Gt("admin", () => Rt(t)),
    Gt("haki", () => Ht(t)), Gt("items", () => z(t)), Gt("joinUI", () => M(t)),
    Gt("nametag", () => m(t)), Gt("weapons", () => i(t)), Gt("chat", () => e(t)),
    Gt("leaderboard", () => S(t)), Gt("sidebar", () => K(t)), Gt("quest", () => T(t)), Gt("saber", () => spJoin(t)),
    Gt("crew", () => o(t)), Gt("stamina", () => at(t)), Gt("initStats", () => Q(t)),
    Gt("rank", () => G(t)), Gt("sp", () => _(t)), Gt("restoreFruit", () => g(t)),
    Gt("restoreStyle", () => fsRestore(t)), Gt("abilities", () => P(t)),
    /* Apres les capacites : sur PC, on retire justement leurs items, et on pose
       les touches (ou l'item de dash sur mobile). */
    Gt("controls", () => setupControls(t)),
    /* Dernier : la variation decide de la position d'arrivee (spawn du lobby,
       position sauvegardee dans la mer, ou arrivee en attente). */
    Gt("variation", () => variationJoin(t)),
    /* Dernier, et volontairement APRES la variation : le tutoriel parle une
       fois que le joueur est a sa place (spawn du lobby ou de la mer). */
    Gt("tutorial", () => tutorialJoin(t));
}, onPlayerLeave = t => {
    /* L'appareil et les essais de donne d'item de dash ne survivent pas a la
       session : le prochain join relit api.isMobile. */
    try { clearPlayerDevice(t), clearDash(t), delete lastButtons[t]; } catch (e) {}
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
    /* Item de dash (mobile) : un clic suffit, et il ne fait rien d'autre (pas
       de coup de poing a travers). */
    let heldDash = null;
    try { heldDash = api.getHeldItem(t); } catch (e) { heldDash = null; }
    if (heldDash && heldDash.name === DASH_ITEM_Name) return void dashItemClick(t, heldDash.name);
    /* Void Net (PC) : en main, le clic EST le coup de poing du style. Le filet
       n'est pas un item de capacite, donc aucun clic ne part ailleurs. */
    /* Devil Fruit Orb : un clic ne doit RIEN lancer. On sort ici, avant le
       style et les capacites, pour qu'il ne serve qu'a ouvrir les touches. */
    if (heldCommandItem(t) === SWAP_ORB_Name) return;
    if (fsHoldingNet(t)) {
        if (!isDash(t)) try {
            fsM1(t, m, !0);
        } catch (e) {
            _t("onPlayerClick.netM1", e);
        }
        return;
    }
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
    /* Relachement d'un clic charge : un item de commande ne declenche rien. */
    if (heldCommandItem(t)) return;
    u(t, r, a, i, e, o, m), f(t, r, a, i, e, o, m);
}, onPlayerJump = t => {
    Gt("jump", () => d(t));
}, /* Refus AVANT que le client ne predise l'action (clic droit, lancer, poser).
     onPlayerAltAction arrive apres ; les deux sont la pour que l'ordre des
     callbacks de Bloxd ne puisse pas rouvrir la porte. */
onPlayerAttemptAltAction = (t, r, a, i, e, o) => {
    if (heldCommandItem(t)) return "preventAction";
}, /* Items a chargement (lancer long) : jamais charges. */
onPlayerStartChargingItem = (t, itemName) => {
    if (isCommandItemName(itemName)) return "preventCharge";
}, onPlayerAltAction = (t, r, a, i, e, o) => {
    if (o && isNPCEntity(o)) return Zt(t, o);
    let m = null;
    try {
        m = api.getPlayerPhysicsState(t);
    } catch (e) {
        m = null;
    }
    /* L'item de dash (mobile). « Snowdash » propulse deja le joueur : on annule
       cet effet par defaut avec preventAction, et on fait NOTRE dash (cout en
       stamina, animation, verrou anti-coup de poing). Sur PC cet item est
       retire ; un item residuel ne doit pas propulser non plus. */
    let held = null;
    try { held = api.getHeldItem(t); } catch (e) { held = null; }
    const heldItem = held && held.name;
    if (heldItem === DASH_ITEM_Name) {
        if (isMobilePlayer(t)) dashItemClick(t, heldItem);
        else dropDash(t);
        return "preventAction";
    }
    /* Clic droit sur un item de commande : rien du tout. */
    if (isCommandItemName(heldItem)) return "preventAction";
    /* Mode « items » (le defaut) : l'action secondaire EST le dash, comme
       avant la demande 76. En mode « buttons » le dash est sur Q, donc on ne
       l'appelle pas ici (sinon un clic droit ferait deux dashs). */
    if (useItemControls(t) && !heldItem && m && 1 !== m.type && !api.isPlayerCrouching(t)) {
        try { if (ot(t)) return; } catch (e) { _t("onPlayerAltAction.dash", e); }
    }
    return !m || 1 === m.type || heldItem || api.isPlayerCrouching(t) ? void 0 : (D(t) || fsHolding(t)) ? "preventAction" : void 0;
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
    if ("K4miNoK4mi" !== n && "Yanick2010" !== n) return e.includes("Trap") || C(o) || fsItemName(o) || isCommandItemName(o) ? "preventChange" : void 0;
}, onPlayerDropItem = (t, r, a, i, e, o, m) => {
    /* Seuls les items uniques sont bloqués : perdus, ils ne reviennent pas
       tout seuls. Tout le reste peut tomber, y compris un fruit ramassé
       (customAttributes.isFruitBlock) — c'est le seul moyen de le donner à un
       autre joueur — et un bloc de construction qui partage son nom avec le
       fruit équipé (Stone, Ice, Sand, Glass...).
       hkPod : le pod du Haki, affiché "Armament Haki". Perdu, il laisserait un
       joueur qui CONNAÎT le haki sans aucun moyen de l'armer. */
    const l = "string" == typeof e ? e : e?.name || e?.type;
    /* Les deux items de commande en font partie : perdus, le joueur n'a plus ni
       touches de capacite ni attaques de style. */
    return l && (C(l) || fsItemName(l) || spLocked(l) || hkPod(l) || isCommandItemName(l) || l === DASH_ITEM_Name) ? "preventDrop" : void 0;
}, onPlayerAttemptOpenChest = (t, r, a, i, e, o) => {
    if (!e) return "preventOpen";
}, onPlayerBoughtShopItem = (t, r, a, i, e) => {
    q(t, r, a, i, e), Z(t, r, a, i, e), jt(t, r, a, i, e), Gt("settings", () => bpSettingsShop(t, r, a, i, e));
}, onPlayerUsedThrowable = (t, r, a) => {
    if (idInSafeZone(t)) return void safeZoneBlocked(t);
    /* Filet de securite : l'API ne permet pas de refuser un lancer (le retour
       de ce callback n'est pas lu). Si un item de commande part quand meme, on
       detruit le projectile et on rend l'item — il ne doit jamais pouvoir
       s'utiliser ni disparaitre. */
    if (isCommandItemName(r)) {
        try { api.killLifeform(a); } catch (e) {}
        try { if (r === SWAP_ORB_Name) ensureSwap(t); else ensureNet(t); } catch (e) {}
        return;
    }
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
