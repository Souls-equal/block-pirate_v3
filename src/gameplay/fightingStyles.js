// gameplay/fightingStyles.js

import {
    onPlayerClickBreakdance,
    onPlayerClickCombatGrab,
    onPlayerClickCombatM1,
    onPlayerClickCombatSmash,
    onPlayerClickDarkStepM1,
    onPlayerClickDeadlyShower,
    onPlayerClickElectricM1,
    onPlayerClickElectricStomp,
    onPlayerClickElectricTackle,
    onPlayerClickFlyingKick,
    onPlayerClickSteamFist,
    onPlayerClickWaterM1,
} from "../fruit/func-abilities";
import { INVENTORY_SLOT_MAX } from "./customItem";
import { getTotalMoney, payMoney } from "../utils/data";
import { updateSidebarLight } from "../core/UI";
import { setTimeout as sTimeout } from "../utils/timer";

const FS_DB_KEY = "fs";

export const FIGHTING_STYLES = {
    "Combat": {
        name: "Combat",
        npc: "Combat Teacher",
        price: 0,
        color: "#f59e0b",
        m1Cooldown: 380,
        m1Handler: onPlayerClickCombatM1,
        abilities: [
            {
                id: "fs_combat_smash",
                name: "Ground Smash",
                itemType: "Orange Sticky Paintball Explosive Item",
                cooldown: 6500,
                description: "Smash the ground with both fists, blasting and launching all nearby enemies.",
                handler: onPlayerClickCombatSmash,
            },
            {
                id: "fs_combat_grab",
                name: "Grapple Rush",
                itemType: "Red Quick Paintball Explosive Item",
                cooldown: 8500,
                description: "Dash forward, grab an enemy in your path and slam them down with a heavy overhead punch.",
                handler: onPlayerClickCombatGrab,
            },
        ],
    },
    "Dark Step": {
        name: "Dark Step",
        npc: "Dark Step Teacher",
        price: 13000,
        color: "#ef4444",
        m1Cooldown: 360,
        m1Handler: onPlayerClickDarkStepM1,
        abilities: [
            {
                id: "fs_dark_flying_kick",
                name: "Flying Kick",
                itemType: "Black Quick Paintball Explosive Item",
                cooldown: 6500,
                description: "Leap forward in a blazing curved trajectory and unleash a massive kick upon landing.",
                handler: onPlayerClickFlyingKick,
            },
            {
                id: "fs_dark_breakdance",
                name: "Breakdance",
                itemType: "Orange Seeking Paintball Explosive Item",
                cooldown: 9000,
                description: "Spin upside-down on your hands, damaging and knocking back all enemies around you.",
                handler: onPlayerClickBreakdance,
            },
        ],
    },
    "Electric": {
        name: "Electric",
        npc: "Mad Scientist",
        price: 22000,
        color: "#fde047",
        m1Cooldown: 380,
        m1Handler: onPlayerClickElectricM1,
        abilities: [
            {
                id: "fs_electric_stomp",
                name: "Stomp",
                itemType: "Yellow Sticky Paintball Explosive Item",
                cooldown: 8000,
                description: "Launch into the air, slam back into the ground and trigger a large electric explosion.",
                handler: onPlayerClickElectricStomp,
            },
            {
                id: "fs_electric_tackle",
                name: "Electrical Tackle",
                itemType: "Cyan Quick Paintball Explosive Item",
                cooldown: 9500,
                description: "Dash forward leaving a high-voltage electric trail for 6s that shocks foes every 1s.",
                handler: onPlayerClickElectricTackle,
            },
        ],
    },
    "Water Kung-Fu": {
        name: "Water Kung-Fu",
        npc: "Water Kung-Fu Teacher",
        price: 35000,
        color: "#38bdf8",
        m1Cooldown: 380,
        m1Handler: onPlayerClickWaterM1,
        abilities: [
            {
                id: "fs_water_steam_fist",
                name: "Steam-Charged Fist",
                itemType: "Blue Sticky Paintball Explosive Item",
                cooldown: 8000,
                description: "Fire a wide hydro-steam beam that drags foes into a massive knockback explosion at the end.",
                handler: onPlayerClickSteamFist,
            },
            {
                id: "fs_water_deadly_shower",
                name: "Deadly Shower",
                itemType: "Light Blue Seeking Paintball Explosive Item",
                cooldown: 9000,
                description: "Shoot a focused water beam that calls down a rapid torrential barrage on the target zone.",
                handler: onPlayerClickDeadlyShower,
            },
        ],
    },
};

const ALL_FS_ABILITY_NAMES = new Set();
const ALL_FS_ITEM_TYPES = new Set();
for (const k in FIGHTING_STYLES) {
    const s = FIGHTING_STYLES[k];
    for (let i = 0; i < s.abilities.length; i++) {
        ALL_FS_ABILITY_NAMES.add(s.abilities[i].name);
        ALL_FS_ITEM_TYPES.add(s.abilities[i].itemType);
    }
}

const activeStyles = new Map();
const abilityCooldowns = new Map();
const m1Cooldowns = new Map();
const confirmPurchase = new Map();

export function isFightingStyleAbilityName(customName) {
    return typeof customName === "string" && ALL_FS_ABILITY_NAMES.has(customName);
}

export function isFightingStyleItemName(itemName) {
    return typeof itemName === "string" && ALL_FS_ITEM_TYPES.has(itemName);
}

export function getFightingStyle(playerId) {
    if (activeStyles.has(playerId)) return activeStyles.get(playerId);
    try {
        const saved = api.getPlayerDbValue(playerId, FS_DB_KEY);
        if (typeof saved === "string" && FIGHTING_STYLES[saved]) {
            activeStyles.set(playerId, saved);
            return saved;
        }
    } catch (e) {}
    return null;
}

export function getFightingStyleInfo(styleName) {
    return styleName && FIGHTING_STYLES[styleName] ? FIGHTING_STYLES[styleName] : null;
}

function hasAbilityItemByName(playerId, abilityName) {
    for (let slot = 0; slot <= INVENTORY_SLOT_MAX; slot++) {
        let item = null;
        try {
            item = api.getItemSlot(playerId, slot);
        } catch (e) {
            item = null;
        }
        if (!item || !item.name) continue;
        const cName = item.attributes && item.attributes.customDisplayName;
        if (cName === abilityName) return true;
    }
    return false;
}

export function removeFightingStyleItems(playerId, keepStyleName = null) {
    const keepNames = new Set();
    if (keepStyleName && FIGHTING_STYLES[keepStyleName]) {
        const list = FIGHTING_STYLES[keepStyleName].abilities;
        for (let i = 0; i < list.length; i++) keepNames.add(list[i].name);
    }
    for (let slot = 0; slot <= INVENTORY_SLOT_MAX; slot++) {
        let item = null;
        try {
            item = api.getItemSlot(playerId, slot);
        } catch (e) {
            item = null;
        }
        if (!item || !item.name) continue;
        const cName = item.attributes && item.attributes.customDisplayName;
        if (cName && ALL_FS_ABILITY_NAMES.has(cName) && !keepNames.has(cName)) {
            try {
                api.setItemSlot(playerId, slot, "Air");
            } catch (e) {}
        }
    }
}

export function giveFightingStyleItems(playerId, styleName) {
    const style = FIGHTING_STYLES[styleName];
    if (!style) return false;
    removeFightingStyleItems(playerId, styleName);
    for (let i = 0; i < style.abilities.length; i++) {
        const ab = style.abilities[i];
        if (hasAbilityItemByName(playerId, ab.name)) continue;
        try {
            api.giveItem(playerId, ab.itemType, 1, {
                customDisplayName: ab.name,
                customDescription: ab.description,
            });
        } catch (e) {}
    }
    return true;
}

export function equipFightingStyle(playerId, styleName, silent = false) {
    const style = FIGHTING_STYLES[styleName];
    if (!style) return false;
    activeStyles.set(playerId, styleName);
    try {
        api.setPlayerDbValue(playerId, FS_DB_KEY, styleName);
    } catch (e) {}
    giveFightingStyleItems(playerId, styleName);
    try {
        updateSidebarLight(playerId);
    } catch (e) {}
    if (!silent) {
        try {
            api.playSound(playerId, "exp_levelup", 1, 1.15);
        } catch (e) {}
        try {
            api.sendMessage(playerId, [
                { str: "🥋 You learned the ", style: { color: "#e2e8f0", fontWeight: "bold" } },
                { str: style.name, style: { color: style.color, fontWeight: "bold" } },
                { str: " Fighting Style!\n", style: { color: "#e2e8f0", fontWeight: "bold" } },
                { str: "• Empty-hand clicks now use ", style: { color: "#94a3b8" } },
                { str: style.name + " M1", style: { color: style.color, fontWeight: "bold" } },
                { str: "  • Abilities: ", style: { color: "#94a3b8" } },
                { str: style.abilities[0].name + " & " + style.abilities[1].name, style: { color: "#facc15", fontWeight: "bold" } },
            ]);
        } catch (e) {}
    }
    return true;
}

export function restoreFightingStyle(playerId) {
    const styleName = getFightingStyle(playerId);
    if (!styleName || !FIGHTING_STYLES[styleName]) return false;
    giveFightingStyleItems(playerId, styleName);
    return true;
}

export function clearFightingStyle(playerId) {
    activeStyles.delete(playerId);
    abilityCooldowns.delete(playerId);
    m1Cooldowns.delete(playerId);
    confirmPurchase.delete(playerId);
    removeFightingStyleItems(playerId, null);
    try {
        api.setPlayerDbValue(playerId, FS_DB_KEY, null);
    } catch (e) {}
}

export function onPlayerLeaveFightingStyle(playerId) {
    activeStyles.delete(playerId);
    abilityCooldowns.delete(playerId);
    m1Cooldowns.delete(playerId);
    confirmPurchase.delete(playerId);
}

export function buyFightingStyle(playerId, styleName) {
    const style = FIGHTING_STYLES[styleName];
    if (!style) return false;
    const current = getFightingStyle(playerId);
    if (current === styleName) {
        giveFightingStyleItems(playerId, styleName);
        try {
            api.sendMessage(playerId, [
                { str: "🥋 You already use ", style: { color: "#cbd5e1" } },
                { str: style.name, style: { color: style.color, fontWeight: "bold" } },
                { str: "! (Your ability items have been refreshed.)", style: { color: "#cbd5e1" } },
            ]);
        } catch (e) {}
        return true;
    }

    if (style.price <= 0) {
        return equipFightingStyle(playerId, styleName, false);
    }

    const money = getTotalMoney(playerId);
    if (money < style.price) {
        try {
            api.sendMessage(playerId, [
                { str: "💰 Not enough Coins to learn ", style: { color: "#ff5555", fontWeight: "bold" } },
                { str: style.name, style: { color: style.color, fontWeight: "bold" } },
                { str: ": " + money + "/" + style.price, style: { color: "#fbbf24", fontWeight: "bold" } },
            ]);
        } catch (e) {}
        return false;
    }

    const now = Date.now();
    const pending = confirmPurchase.get(playerId);
    if (!pending || pending.style !== styleName || now > pending.until) {
        confirmPurchase.set(playerId, { style: styleName, until: now + 5000 });
        try {
            api.sendMessage(playerId, [
                { str: "🥋 Click ", style: { color: "#e2e8f0" } },
                { str: style.npc, style: { color: style.color, fontWeight: "bold" } },
                { str: " again within 5s to learn ", style: { color: "#e2e8f0" } },
                { str: style.name, style: { color: style.color, fontWeight: "bold" } },
                { str: " for ", style: { color: "#e2e8f0" } },
                { str: style.price + " Coins", style: { color: "#facc15", fontWeight: "bold" } },
                { str: " (replaces your current Fighting Style).", style: { color: "#94a3b8" } },
            ]);
        } catch (e) {}
        return false;
    }

    confirmPurchase.delete(playerId);
    if (!payMoney(playerId, style.price)) return false;
    try {
        api.playSound(playerId, "CashRegister", 1, 1);
    } catch (e) {}
    return equipFightingStyle(playerId, styleName, false);
}

export function isFightingStyleItem(playerId, slotIndex) {
    try {
        const item = api.getItemSlot(playerId, slotIndex);
        if (!item || !item.name) return false;
        const cName = item.attributes && item.attributes.customDisplayName;
        return isFightingStyleAbilityName(cName);
    } catch (e) {
        return false;
    }
}

export function isHoldingFightingStyleItem(playerId) {
    try {
        const held = api.getHeldItem(playerId);
        if (!held || !held.name) return false;
        const cName = held.attributes && held.attributes.customDisplayName;
        return isFightingStyleAbilityName(cName);
    } catch (e) {
        return false;
    }
}

export function handleFightingStyleClick(playerId, rightClick, x, y, z, blockName, targetId) {
    const styleName = getFightingStyle(playerId);
    if (!styleName) return false;
    const style = FIGHTING_STYLES[styleName];
    if (!style) return false;

    let held = null;
    try {
        held = api.getHeldItem(playerId);
    } catch (e) {
        held = null;
    }
    if (!held || !held.name) return false;
    const cName = held.attributes && held.attributes.customDisplayName;
    if (!cName || !ALL_FS_ABILITY_NAMES.has(cName)) return false;

    let matched = null;
    for (let i = 0; i < style.abilities.length; i++) {
        if (style.abilities[i].name === cName) {
            matched = style.abilities[i];
            break;
        }
    }
    if (!matched || typeof matched.handler !== "function") return true;

    const now = Date.now();
    let cdMap = abilityCooldowns.get(playerId);
    if (!cdMap) {
        cdMap = {};
        abilityCooldowns.set(playerId, cdMap);
    }
    const cdEnd = cdMap[matched.id] || 0;
    if (now < cdEnd) {
        const rem = ((cdEnd - now) / 1000).toFixed(1);
        try {
            api.sendFlyingMiddleMessage(playerId, [{ str: "⏳ " + matched.name + " (" + rem + "s)", style: { color: "#f87171" } }], 15);
        } catch (e) {}
        return true;
    }

    const cdMs = matched.cooldown || 6000;
    cdMap[matched.id] = now + cdMs;
    const expectedEnd = cdMap[matched.id];

    let ok = true;
    try {
        const res = matched.handler(playerId, held.name, targetId);
        if (res === false) ok = false;
    } catch (e) {
        ok = false;
    }

    if (!ok) {
        delete cdMap[matched.id];
        return true;
    }

    if (cdMs > 0) {
        const ticks = Math.max(1, Math.ceil(cdMs / 50));
        sTimeout(() => {
            const cur = abilityCooldowns.get(playerId);
            if (!cur || cur[matched.id] !== expectedEnd) return;
            delete cur[matched.id];
            try {
                api.sendFlyingMiddleMessage(
                    playerId,
                    [{ str: "✦ " + matched.name + " is ready! ✦", style: { color: "#ffd700", fontWeight: "bold" } }],
                    20,
                );
            } catch (e) {}
        }, ticks);
    }
    return true;
}

export function handleFightingStyleM1(playerId, targetId) {
    const styleName = getFightingStyle(playerId);
    if (!styleName) return false;
    const style = FIGHTING_STYLES[styleName];
    if (!style || typeof style.m1Handler !== "function") return false;

    let held = null;
    try {
        held = api.getHeldItem(playerId);
    } catch (e) {
        held = null;
    }
    if (held && held.name && held.name !== "Air") return false;

    const now = Date.now();
    const nextAt = m1Cooldowns.get(playerId) || 0;
    if (now < nextAt) return false;
    m1Cooldowns.set(playerId, now + (style.m1Cooldown || 380));

    try {
        style.m1Handler(playerId, style.name, targetId);
        return true;
    } catch (e) {
        return false;
    }
}
