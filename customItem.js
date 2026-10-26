// customItem.js

import { FRUITS_BY_RARITY } from "./fruit"

/* ARMES À FEU */

export const GUN_ITEMS = ["M1911"];

export function isGunItem(itemName) {
    return GUN_ITEMS.indexOf(itemName) !== -1;
}

/* ATTRIBUTS */

export const STORED_ENCHANTS_KEY = "storedEnchantments";

export function convertWeaponAttributes(oldAttributes, newItemName) {
    const src = (oldAttributes && typeof oldAttributes === "object") ? oldAttributes : {};
    const out = {};

    for (const k in src) {
        if (k === "shotsLeft" || k === "shotLeft") continue;
        if (k === "enchantments" || k === STORED_ENCHANTS_KEY) continue;
        out[k] = src[k];
    }

    let enchants;
    if (src.enchantments !== undefined) enchants = src.enchantments;
    else if (src[STORED_ENCHANTS_KEY] !== undefined) enchants = src[STORED_ENCHANTS_KEY];

    if (isGunItem(newItemName)) {
        if (enchants !== undefined) out[STORED_ENCHANTS_KEY] = enchants;
        if (src.shotsLeft !== undefined) out.shotsLeft = src.shotsLeft;
        else if (src.shotLeft !== undefined) out.shotsLeft = src.shotLeft;
    } else if (enchants !== undefined) {
        out.enchantments = enchants;
    }

    return out;
}

/* INVENTAIRE + MOONSTONE CHEST */

export const INVENTORY_SLOT_MAX = 50;

export function scanAllItems(playerId, cb) {
    for (let slot = 0; slot <= INVENTORY_SLOT_MAX; slot++) {
        let item = null;
        try { item = api.getItemSlot(playerId, slot); } catch (e) { item = null; }
        if (!item || !item.name) continue;
        try { cb(item, "inventory", slot); } catch (e) {}
    }

    let chest = null;
    try { chest = api.getMoonstoneChestItems(playerId); } catch (e) { chest = null; }
    if (!chest || !chest.length) return;

    for (let slot = 0; slot < chest.length; slot++) {
        const item = chest[slot];
        if (!item || !item.name) continue;
        try { cb(item, "moonstone", slot); } catch (e) {}
    }
}

export function writeItem(playerId, where, slot, itemName, amount, attributes) {
    try {
        if (where === "moonstone") api.setMoonstoneChestItemSlot(playerId, slot, itemName, amount, attributes);
        else api.setItemSlot(playerId, slot, itemName, amount, attributes);
        return true;
    } catch (e) {
        return false;
    }
}

export function clearItem(playerId, where, slot) {
    try {
        if (where === "moonstone") api.setMoonstoneChestItemSlot(playerId, slot, "Air");
        else api.setItemSlot(playerId, slot, "Air");
        return true;
    } catch (e) {
        return false;
    }
}

/* JOIN */

export function itemJoin(playerId) {
    api.setClientOptions(playerId, {
        canCraft:true,
        autoRespawn:true,
        canCustomiseChar:false,
        hideCoordinates:true,
        maxAuraLevel:99999,
        numClosestPlayersVisible:8,
        secsToRespawn:0,
        showPlayersInUnloadedChunks:false,
        showProgressBar:false,
    })
    api.removeItemCraftingRecipes(playerId, null)
    api.setItemStat(playerId, "M1911", "displayName", "Flintlock")
    api.setItemStat(playerId, "M1911", "gunStats", {
        fireRate:80,
        damage: 30,
        reloadTime:4000,
        reloadBulletsIndividually:false,
    })
    for (const rarity in FRUITS_BY_RARITY) {
        for (const fruit of FRUITS_BY_RARITY[rarity]) {
            api.setItemStat(playerId, fruit.itemName, "displayName", fruit.rpName);
            api.setItemStat(playerId, fruit.itemName, "description", fruit.rpDesc);
        }
    }
}
