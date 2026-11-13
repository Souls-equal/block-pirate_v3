// stats.js

import { addStat, confirmAction, getStat, reconcileSP, setStat } from "../utils/data";
import { getMaxAirJumps, setStaminaBonus } from "./stamina";
import { C, say, txt, bold, ic } from "../core/theme";
import { trackAnalyticsEvent } from "../utils/analytics";
import { getDamageBonusForPoints, getDefenseReductionForPoints } from "./combat-stats";

/* BASE VALUES */
const BASE_HP = 100;

const HP_TIER1_BONUS = 20;   const HP_TIER1_MAX = 50;
const HP_TIER2_BONUS = 15;   const HP_TIER2_MAX = 50;
const HP_TIER3_BONUS = 10;



/* REGEN — nerfee : a 100 points on soignait 22% toutes les 0,84 s, soit
   27 PV/s, plus vite que la plupart des degats d'abilite. Trois leviers :
   - moins de soin par tick  : 20% -> 8% de bonus maximum ;
   - un tick plus lent       : plancher 200 ms -> 1500 ms ;
   - on remonte moins vite   : 1 s -> 2,5 s sans avoir ete touche.
   Resultat a 100 points : 12,6% / 1,7 s = 7,6 PV/s (3,5x moins). */
const REGEN_BASE_AMOUNT   = 0.05;
const REGEN_MAX_BONUS     = 0.08;
/* La courbe est exponentielle : chaque point rapproche du maximum sans
   jamais l'atteindre. REGEN_DECAY = 1 annulait tout (1^r = 1 -> p = 0), donc
   la regen restait bloquee a 5% / 5s pour TOUS les niveaux. */
const REGEN_DECAY         = 0.97;
const REGEN_BASE_INTERVAL = 5000;
const REGEN_MIN_INTERVAL  = 1500;
const REGEN_BASE_START    = 5000;
const REGEN_MIN_START     = 2500;

/* CINQ STATS, CINQ ROLES DE LA PALETTE.
   Une statistique a UNE couleur, partout : la carte de la boutique, son icone,
   son compteur de monnaie et le message d'amelioration. Avant, Health et
   Damage etaient deux rouges presque identiques, et Stamina/Defense deux bleus
   presque identiques : impossible de reconnaitre une carte au premier coup
   d'oeil. Les icones, elles, sont des icones INGAME de Bloxd (regle du projet :
   natives d'abord), donc les cinq cartes se ressemblent sans se confondre.
   `perPoint` est une phrase, pas un fragment : elle est lue telle quelle sous
   le titre de la carte. */
export const STAT_CONFIG = {
    h:  { name: "Health",  color: C.SUCCESS, icon: "Health",         imageColour: "#FEE6E6", perPoint: "+20 HP up to 50 points, then +15, then +10." },
    d:  { name: "Damage",  color: C.DANGER,  icon: "Diamond Sword",  imageColour: "white",   perPoint: "Adds flat damage to every hit; the bonus grows with points spent." },
    s:  { name: "Stamina", color: C.MARINE,  icon: "Updraft",        imageColour: "white",   perPoint: "+10 max stamina, so more dashes and air jumps." },
    r:  { name: "Regen",   color: C.XP,      icon: "Health Regen",   imageColour: C.SUCCESS, perPoint: "Heal more, and sooner after a hit." },
    df: { name: "Defense", color: C.MONEY,   icon: "Iron Chestplate", imageColour: "white",  perPoint: "Subtracts flat damage from every hit; the reduction grows with points spent." },
};

const STAT_ORDER = ["h", "d", "s", "r", "df"];

function statCurrencyId(key) { return "stat_" + key; }

/* EFFECT FORMULAS */
export function getHealthForPoints(h) {
    let hp = BASE_HP;
    hp += HP_TIER1_BONUS * Math.min(h, HP_TIER1_MAX);
    hp += HP_TIER2_BONUS * Math.min(Math.max(h - HP_TIER1_MAX, 0), HP_TIER2_MAX);
    hp += HP_TIER3_BONUS * Math.max(h - HP_TIER1_MAX - HP_TIER2_MAX, 0);
    return hp;
}

export function getRegenInfoForPoints(r) {
    const p = 1 - Math.pow(REGEN_DECAY, r);
    return {
        amount:     REGEN_BASE_AMOUNT + REGEN_MAX_BONUS * p,
        interval:   REGEN_BASE_INTERVAL - (REGEN_BASE_INTERVAL - REGEN_MIN_INTERVAL) * p,
        startAfter: REGEN_BASE_START   - (REGEN_BASE_START   - REGEN_MIN_START)   * p
    };
}

function statEffectText(key, lvl) {
    switch (key) {
        case "h":  return "Max HP: " + round(getHealthForPoints(lvl));
        case "d":  return "Damage bonus: +" + round(getDamageBonusForPoints(lvl)) + " / hit";
        case "s":  return "Air jumps: " + lvl;
        case "r":  {
            const rg = getRegenInfoForPoints(lvl);
            return "Regen " + pct(rg.amount) + " / " + timeText(rg.interval);
        }
        case "df": return "Damage reduced: " + round(getDefenseReductionForPoints(lvl)) + " / hit";
    }
    return "";
}

function round(value) {
    return Math.round(value * 100) / 100;
}

/* "5%" / "12.9%" : une decimale suffit, et 5 reste "5" (pas "5.0"). */
function pct(fraction) {
    const v = Math.round(fraction * 1000) / 10;
    return v + "%";
}

/* "4.8s" / "820ms" : sous la seconde on affiche les ms, sinon on ne verrait
   aucune difference entre deux paliers de regen. Une seule decimale en
   secondes : "2.3s", pas "2.26s" (illisible dans le shop). */
function timeText(ms) {
    if (ms < 1000) return Math.round(ms) + "ms";
    return Math.round(ms / 100) / 10 + "s";
}

/* STAT LEVELS */
export function getStatLevel(playerId, key) {
    return api.getCurrencyAmount(playerId, statCurrencyId(key)) || 0;
}

export function getAllLevels(playerId) {
    const o = {};
    for (const k of STAT_ORDER) o[k] = getStatLevel(playerId, k);
    return o;
}

export function totalSpent(playerId) {
    const u = getAllLevels(playerId);
    let sum = 0;
    for (const k of STAT_ORDER) sum += u[k];
    return sum;
}

function ensureStatCurrency(playerId, key) {
    const id = statCurrencyId(key);
    if (api.getCurrencyAmount(playerId, id)) return;
    api.setCurrency(playerId, id, {
        amount: 0,
        icon: STAT_CONFIG[key].icon,
        iconColour: STAT_CONFIG[key].imageColour,
        persistent: true
    });
}

/* STAT POINTS */
export function getSP(playerId) {
    return getStat(playerId, "sp", 0);
}

function spendSP(playerId, amount) {
    const have = getSP(playerId);
    if (have < amount) return false;
    setStat(playerId, "sp", have - amount);
    return true;
}

/* APPLY EFFECTS */
export function applyStatEffects(playerId) {
    if (!playerId) return;
    const h  = getStatLevel(playerId, "h");
    const s  = getStatLevel(playerId, "s");
    const r  = getStatLevel(playerId, "r");

    const regen = getRegenInfoForPoints(r);

    setStaminaBonus(playerId, s);

    /* Un joueur qui vient de partir fait lever une ApiError : on l'ignore,
       l'important est que les autres joueurs ne soient jamais bloqués. */
    try {
        api.setClientOptions(playerId, {
            maxHealth:                 getHealthForPoints(h),
            initialHealth:             getHealthForPoints(h),
            // Damage/Defense are applied as flat values in combat callbacks.
            // Keep engine multipliers neutral to prevent double application.
            dealingDamageMultiplier:   1,
            receivingDamageMultiplier: 1,
            airJumpCount:              getMaxAirJumps(playerId),
            healthRegenAmount:         regen.amount,
            healthRegenInterval:       regen.interval,
            healthRegenStartAfter:     regen.startAfter,
        });
    } catch (e) {}
}

export function fullHeal(playerId) {
    if (!playerId) return;
    try {
        const max = Number(api.getClientOption(playerId, "maxHealth")) || BASE_HP;
        api.setHealth(playerId, max);
    } catch (e) {}
}

/* UPGRADE / RESET */
export function upgStat(playerId, key, amount) {
    if (!STAT_CONFIG[key]) return false;

    amount = Math.max(1, Math.floor(amount) || 1);
    if (!spendSP(playerId, amount)) return false;

    ensureStatCurrency(playerId, key);
    api.giveCurrencyAmount(playerId, statCurrencyId(key), amount);

    applyStatEffects(playerId);
    updateUpgradePanel(playerId);
    return true;
}

export function resetStats(playerId) {
    let refund = 0;
    for (const k of STAT_ORDER) {
        const lvl = getStatLevel(playerId, k);
        refund += lvl;
        if (lvl > 0) api.setCurrencyAmount(playerId, statCurrencyId(k), 0);
    }
    if (refund > 0) addStat(playerId, "sp", refund);

    applyStatEffects(playerId);
    updateUpgradePanel(playerId);

    reconcileSP(playerId);

    return refund;
}

/* SHOP UI */
/* Une seule anatomie pour les cinq cartes ET pour la carte de reset :
   icone + nom, la phrase « par point », l'effet actuel, puis les compteurs.
   L'init et la mise a jour ecrivent la MEME chose (niveau 0 au depart) : plus de
   « Current: — » provisoire qui n'a jamais ressemble a l'affichage final. */
function statCardLines(key, level, sp) {
    const c = STAT_CONFIG[key];
    return [
        ic(c.icon, c.color),
        txt(" " + c.name + "\n", c.color),
        txt(c.perPoint + "\n\n", C.INFO),
        bold("\u25cf " + statEffectText(key, level), c.color),
        txt("\nPoints: " + level + "   Stat Points available: " + sp, C.INFO),
    ];
}

export function initUpgradeShop() {
    api.configureShopCategory("upgrade", { customTitle: "Upgrades" });

    const order = [["h", 5], ["d", 4], ["s", 3], ["r", 2], ["df", 1]];
    for (const [key, prio] of order) {
        const c = STAT_CONFIG[key];
        api.createShopItem("upgrade", "upg_" + key, {
            image: c.icon,
            imageColour: c.imageColour,
            customTitle: [bold(c.name, c.color)],
            description: statCardLines(key, 0, 0),
            sortPriority: prio,
            buyButtonText: [txt("Upgrade", c.color)],
            userInput: { type: "text", placeholderText: "Amount (default: 1)" }
        });
    }

    api.createShopItem("upgrade", "upg_reset", {
        image: "Moonstone Orb",
        imageColour: C.DANGER,
        customTitle: [bold("Reset Stats", C.DANGER)],
        description: [
            ic("fa-solid fa-clock-rotate-left", C.DANGER),
            txt(" Refund every Stat Point you spent.", C.INFO),
            /* Le style de combat n'est PAS concerne : il s'achete, et un
               remboursement de points de stat ne doit pas le retirer. La carte
               le dit, pour qu'on ne confonde pas avec la remise a zero
               complete (data.resetPlayer, demande 91). */
            bold("\n\u25cf Your level, items and Fighting Style are kept.", C.SUCCESS),
            txt("\nClick twice to confirm.", C.INFO),
        ],
        sortPriority: 0,
        buyButtonText: [txt("Reset", C.DANGER)]
    });
}

export function updateUpgradePanel(playerId) {
    const u = getAllLevels(playerId);
    const sp = getStat(playerId, "sp", 0);

    for (const k of STAT_ORDER) {
        api.updateShopItemForPlayer(playerId, "upgrade", "upg_" + k, {
            description: statCardLines(k, u[k], sp)
        });
    }
}

/* SHOP BUY HANDLER (upgrade category) */
const STAT_BY_ITEM = { upg_h: "h", upg_d: "d", upg_s: "s", upg_r: "r", upg_df: "df" };

export function handleShopBuy(playerId, categoryKey, itemKey, item, input) {
    if (categoryKey !== "upgrade") return false;

    /* Le reset etait la SEULE action de la boutique sans second clic : un
       clic malheureux rendait toutes les stats du joueur. Il passe donc par la
       meme confirmation (3 s) que tous les achats du jeu. */
    if (itemKey === "upg_reset") {
        const spent = totalSpent(playerId);
        if (!spent) {
            say(playerId, [
                ic("fa-solid fa-circle-info", C.INFO),
                txt(" You have no Stat Point to reset.", C.INFO),
            ]);
            return true;
        }
        if (!confirmAction(playerId, "statsReset", [
            ic("fa-solid fa-clock-rotate-left", C.DANGER),
            txt(" Reset every stat? ", C.INFO),
            bold(spent + " Stat Point" + (spent > 1 ? "s" : "") + " come back", C.MONEY),
            txt(", your level, items and Fighting Style stay.", C.INFO),
        ])) return true;
        const refund = resetStats(playerId);
        say(playerId, [
            ic("fa-solid fa-clock-rotate-left", C.SUCCESS),
            bold(" Stats reset: ", C.SUCCESS),
            txt("+" + refund + " Stat Point" + (refund > 1 ? "s" : "") + " back.", C.INFO),
        ]);
        return true;
    }

    const stat = STAT_BY_ITEM[itemKey];
    if (!stat) return false;

    const amt = Math.max(1, parseInt(input) || 1);

    if (!upgStat(playerId, stat, amt)) {
        say(playerId, [
            ic("fa-solid fa-xmark", C.DANGER),
            txt(" You need ", C.DANGER),
            bold(amt + " Stat Point" + (amt > 1 ? "s" : ""), C.DANGER),
            txt(", you have " + getStat(playerId, "sp", 0) + ".", C.INFO),
        ]);
    } else {
        trackAnalyticsEvent(playerId, "upgrade", stat, amt, false);
        say(playerId, [
            ic("fa-solid fa-circle-check", C.SUCCESS),
            txt(" " + STAT_CONFIG[stat].name + " ", C.INFO),
            bold("+" + amt, C.SUCCESS),
            txt(" point" + (amt > 1 ? "s" : "") + ".", C.INFO),
        ]);
    }

    updateUpgradePanel(playerId);
    return true;
}

/* JOIN INIT */
export function initStats(playerId) {
    applyStatEffects(playerId);
    updateUpgradePanel(playerId);
}
