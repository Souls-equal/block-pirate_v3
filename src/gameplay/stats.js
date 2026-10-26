// stats.js

import { addStat, getStat, reconcileSP, setStat } from "../utils/data";
import { getMaxAirJumps, setStaminaBonus } from "./stamina";

/* BASE VALUES */
const BASE_HP = 100;

const HP_TIER1_BONUS = 20;   const HP_TIER1_MAX = 50;
const HP_TIER2_BONUS = 15;   const HP_TIER2_MAX = 50;
const HP_TIER3_BONUS = 10;

const DMG_FIRST_POINT = 0.20;
const DMG_EXPONENT    = 0.65;

const DEF_FACTOR = 0.96;
const DEF_FLOOR  = 0.2;

const REGEN_BASE_AMOUNT   = 0.05;
const REGEN_MAX_BONUS     = 0.20;
const REGEN_DECAY         = 1;
const REGEN_BASE_INTERVAL = 5000;
const REGEN_MIN_INTERVAL  = 200;
const REGEN_BASE_START    = 5000;
const REGEN_MIN_START     = 1000;

export const STAT_CONFIG = {
    h:  { name: "Health",  color: "#ff8888", icon: "fa-solid fa-heart", imageColour: "#Ffe6e6", perPoint: "+20/15/10 HP (diminishing every 50 point)" },
    d:  { name: "Damage",  color: "#ffaaaa", icon: "Diamond Sword",     imageColour: "white",   perPoint: "+20% then diminishing" },
    s:  { name: "Stamina", color: "#aaddff", icon: "Updraft",           imageColour: "white",   perPoint: "+10 max stamina" },
    r:  { name: "Regen",   color: "#88ff88", icon: "fa-solid fa-plus",  imageColour: "#32cd32", perPoint: "more heal and more often" },
    df: { name: "Defense", color: "#aaaaff", icon: "Iron Chestplate",   imageColour: "white",   perPoint: "-4% then diminishing" }
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

export function getDamageMultiplierForPoints(d) {
    return 1 + DMG_FIRST_POINT * Math.pow(d, DMG_EXPONENT);
}

export function getDefenseMultiplierForPoints(df) {
    return Math.max(DEF_FLOOR, Math.pow(DEF_FACTOR, df));
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
        case "d":  return "Damage x" + round(getDamageMultiplierForPoints(lvl).toFixed(2));
        case "s":  return "Air jumps: " + lvl;
        case "r":  {
            const rg = getRegenInfoForPoints(lvl);
            return "Regen " + round(rg.amount * 100) + "% / " + round(rg.interval / 1000) + "s";
        }
        case "df": return "Damage taken: " + round(getDefenseMultiplierForPoints(lvl) * 100) + "%";
    }
    return "";
}

function round(value) {
    return Math.round(value * 100) / 100;
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
    const h  = getStatLevel(playerId, "h");
    const d  = getStatLevel(playerId, "d");
    const s  = getStatLevel(playerId, "s");
    const r  = getStatLevel(playerId, "r");
    const df = getStatLevel(playerId, "df");

    const regen = getRegenInfoForPoints(r);

    setStaminaBonus(playerId, s);

    api.setClientOptions(playerId, {
        maxHealth:                 getHealthForPoints(h),
        initialHealth:             getHealthForPoints(h),
        dealingDamageMultiplier:   getDamageMultiplierForPoints(d),
        receivingDamageMultiplier: getDefenseMultiplierForPoints(df),
        airJumpCount:              getMaxAirJumps(playerId),
        healthRegenAmount:         regen.amount,
        healthRegenInterval:       regen.interval,
        healthRegenStartAfter:     regen.startAfter,
    });
}

export function fullHeal(playerId) {
    const max = api.getClientOption(playerId, "maxHealth") || BASE_HP;
    api.setHealth(playerId, max);
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
export function initUpgradeShop() {
    api.configureShopCategory("upgrade", { customTitle: "Upgrades" });

    const order = [["h", 5], ["d", 4], ["s", 3], ["r", 2], ["df", 1]];
    for (const [key, prio] of order) {
        const c = STAT_CONFIG[key];
        api.createShopItem("upgrade", "upg_" + key, {
            image: c.icon,
            imageColour: c.imageColour,
            customTitle: c.name,
            description: [
                { str: "Each point " },
                { str: c.perPoint + "\n\n", style: { color: c.color } },
                { str: "Current: — | Stat Points available: 0" }
            ],
            sortPriority: prio,
            buyButtonText: "Upgrade",
            userInput: { type: "text", placeholderText: "Amount (default: 1)" }
        });
    }

    api.createShopItem("upgrade", "upg_reset", {
        image: "Moonstone Orb",
        imageColour: "white",
        customTitle: "Reset Stats",
        description: [
            { str: "Refund all spent SP.\n\n" },
            { str: "Your level is kept.", style: { color: "orange" } }
        ],
        sortPriority: 0,
        buyButtonText: "Reset"
    });
}

export function updateUpgradePanel(playerId) {
    const u = getAllLevels(playerId);
    const sp = getStat(playerId, "sp", 0);

    for (const k of STAT_ORDER) {
        const c = STAT_CONFIG[k];
        api.updateShopItemForPlayer(playerId, "upgrade", "upg_" + k, {
            description: [
                { str: "Each point " },
                { str: c.perPoint + "\n\n", style: { color: c.color } },
                { str: statEffectText(k, u[k]) + "\n", style: { color: c.color, fontWeight: "bold" } },
                { str: "Points: " + u[k] + " | Stat Points available: " + sp }
            ]
        });
    }
}

/* SHOP BUY HANDLER (upgrade category) */
const STAT_BY_ITEM = { upg_h: "h", upg_d: "d", upg_s: "s", upg_r: "r", upg_df: "df" };

export function handleShopBuy(playerId, categoryKey, itemKey, item, input) {
    if (categoryKey !== "upgrade") return false;

    if (itemKey === "upg_reset") {
        const refund = resetStats(playerId);
        api.sendMessage(playerId, [
            { str: "Stats reset! (" + refund + " Stat Points recovered)", style: { color: "lime", fontWeight: "bold" } }
        ]);
        return true;
    }

    const stat = STAT_BY_ITEM[itemKey];
    if (!stat) return false;

    const amt = Math.max(1, parseInt(input) || 1);

    if (!upgStat(playerId, stat, amt)) {
        api.sendMessage(playerId, [
            { str: "Not enough Stat Points! (Have: " + getStat(playerId, "sp", 0) + ", Need: " + amt + ")", style: { color: "red" } }
        ]);
    } else {
        api.sendMessage(playerId, [
            { str: "✅ " + STAT_CONFIG[stat].name + " +" + amt, style: { color: "lime", fontWeight: "bold" } }
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
