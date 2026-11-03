// customItem.js

import { FRUITS_BY_RARITY, fruitDescription, fruitItemAttributes, getRarityEnchantTier } from "../fruit/index";
import { LEGACY_FRUIT_ITEMS, getFruitItemName, getFruitInfo } from "../fruit/fruitData";
import { setTimeout as scheduleTick } from "../utils/timer";
import { say } from "../core/theme";

/* Le tier d'enchantement n'est peut-etre pas modifiable via setItemStat :
   on tente une fois, et si le moteur refuse on ne reessaie plus jamais. */
let tierStatUnsupported = false;

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

/* MIGRATION DES ITEMS DE FRUITS

   Les fruits ont change de noms d'items (blocks -> poissons). Le nom Roleplay
   ne bouge pas, donc un fruit deja mange, la capacite en cours, la base de
   donnees et les achats restent valides. Seul l'item tenu en main doit etre
   remplace : c'est ce que fait migrateFruitItems() a chaque join.

   On ne convertit QUE ce qui porte les attributs d'un fruit
   (customAttributes.isFruitBlock / fruitRpName). Les anciens noms sont des
   blocs de construction ordinaires (Stone, Glass, Ice, Snow...) : convertir
   par le nom seul transformerait un stack de Stone en fruits de Control. */

/* Un item -> nom Roleplay du fruit, ou null si ce n'est pas un fruit. */
function fruitRpNameOfItem(item) {
    if (!item || !item.name || item.name === "Air") return null;
    const attrs = item.attributes && typeof item.attributes === "object" ? item.attributes : null;
    const ca = attrs && attrs.customAttributes && typeof attrs.customAttributes === "object"
        ? attrs.customAttributes
        : null;
    const byAttr = ca && ca.fruitRpName ? ca.fruitRpName : null;
    if (byAttr && getFruitInfo(byAttr)) return byAttr;
    /* attributs partiels : displayName d'un fruit + ancien nom d'item */
    const shown = attrs && attrs.customDisplayName ? attrs.customDisplayName : null;
    if (shown && getFruitInfo(shown) && LEGACY_FRUIT_ITEMS[item.name]) return shown;
    return null;
}

/* Attributs complets d'un fruit : on garde ce qui existait (uniqueRollId,
   attributs custom eventuels) et on remet nom, description, tier a jour. */
function fruitAttrsFor(rpName, previous) {
    const fresh = fruitItemAttributes(rpName);
    const oldAttrs = previous && typeof previous === "object" ? previous : {};
    const oldCa = oldAttrs.customAttributes && typeof oldAttrs.customAttributes === "object"
        ? oldAttrs.customAttributes
        : {};

    const out = {};
    for (const k in oldAttrs) out[k] = oldAttrs[k];

    const ca = {};
    for (const k in oldCa) ca[k] = oldCa[k];
    ca.enchantmentTier = fresh.customAttributes.enchantmentTier;
    ca.isFruitBlock = true;
    ca.fruitRpName = rpName;
    if (!ca.uniqueRollId) {
        ca.uniqueRollId = "m" + Date.now().toString(36) + Math.floor(Math.random() * 1e5).toString(36);
    }

    out.customAttributes = ca;
    out.customDisplayName = fresh.customDisplayName;
    out.customDescription = fresh.customDescription;
    return out;
}

function sameFruitLook(attrs, expected) {
    const ca = attrs && attrs.customAttributes ? attrs.customAttributes : {};
    return attrs
        && attrs.customDisplayName === expected.customDisplayName
        && attrs.customDescription === expected.customDescription
        && ca.enchantmentTier === expected.customAttributes.enchantmentTier
        && ca.isFruitBlock === true;
}

export function migrateFruitItems(playerId) {
    const result = { item: 0, attrs: 0 };

    scanAllItems(playerId, function (item, where, slot) {
        const rpName = fruitRpNameOfItem(item);
        if (!rpName) return;
        const targetName = getFruitItemName(rpName);
        if (!targetName) return;

        const amount = typeof item.amount === "number" && item.amount > 0 ? item.amount : 1;
        const attrs = fruitAttrsFor(rpName, item.attributes);
        const renaming = item.name !== targetName;
        if (!renaming && sameFruitLook(item.attributes, attrs)) return;

        if (writeItem(playerId, where, slot, targetName, amount, attrs)) {
            if (renaming) result.item++;
            else result.attrs++;
        }
    });

    return result;
}

/* Un joueur qui revient doit voir ses anciens blocs redevenir des blocs. */
function resetLegacyFruitStats(playerId) {
    for (const legacyName in LEGACY_FRUIT_ITEMS) {
        try { api.setItemStat(playerId, legacyName, "displayName", legacyName); } catch (e) {}
        try { api.setItemStat(playerId, legacyName, "description", ""); } catch (e) {}
        if (!tierStatUnsupported) {
            try { api.setItemStat(playerId, legacyName, "enchantmentTier", "Tier 1"); } catch (e) {}
        }
    }
}

function announceFruitMigration(playerId, result) {
    if (!result || (!result.item && !result.attrs)) return;
    try {
        say(playerId, [
            { str: "[Fruit] ", style: { color: "#E8B4A0" } },
            {
                str: result.item
                    ? result.item + (result.item > 1 ? " fruits ont ete" : " fruit a ete") + " mis a jour vers les nouveaux items."
                    : "Tes fruits ont ete remis a neuf (enchant + description).",
                style: { color: "#CBD5E1" },
            },
        ]);
    } catch (e) {}
}

const FRUIT_MIGRATE_RETRY = 40;

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
    /* SABER QUEST : les deux butins de la quete. Ce sont de VRAIS items :
       on ne renomme donc pas un bloc existant, on pose seulement le nom et
       la description que le joueur doit lire.
         - "Gold Grit" est un TAS DE PIECES / DE TRESOR vole par le Mob
           Leader : la description doit se lire comme de l'or, pas comme
           une ressource de construction.
         - "Magmaward Fuel" n'est pas un carburant : c'est une RELIQUE
           ancienne qui ouvre ce qu'aucune lame ne coupe. Le nom reste tel
           quel (c'est l'item du jeu), la description dit ce qu'il est.
       Les textes sont poses a chaque join, comme les autres items custom :
       un item deja en banque les retrouve tout seul. */
    api.setItemStat(playerId, "Gold Grit", "displayName", "Gold Grit")
    api.setItemStat(playerId, "Gold Grit", "description", "A heap of stolen coins and treasure, all that the Mob Leader could carry. The Rich Man wants it back.")
    api.setItemStat(playerId, "Magmaward Fuel", "displayName", "Magmaward Fuel")
    api.setItemStat(playerId, "Magmaward Fuel", "description", "Not fuel at all: an ancient relic still warm from the volcano. It opens what no blade can cut.")
    api.setItemStat(playerId, "M1911", "gunStats", {
        fireRate:80,
        damage: 30,
        reloadTime:4000,
        reloadBulletsIndividually:false,
    })
    /* Description par defaut des fruits : c'est le filet de securite pour les
       items donnes SANS attributs (give manuel, codes, items deja en banque).
       Le tier, lui, doit etre pose a chaque giveItem (customAttributes), voir
       fruitItemAttributes() dans fruit/index.js. */
    for (const rarity in FRUITS_BY_RARITY) {
        for (const fruit of FRUITS_BY_RARITY[rarity]) {
            try {
                api.setItemStat(playerId, fruit.itemName, "displayName", fruit.rpName);
                api.setItemStat(playerId, fruit.itemName, "description", fruitDescription(fruit.rpName));
            } catch (e) {}
            if (!tierStatUnsupported) {
                try {
                    api.setItemStat(playerId, fruit.itemName, "enchantmentTier", getRarityEnchantTier(rarity));
                } catch (e) {
                    tierStatUnsupported = true;
                }
            }
        }
    }
    /* Les anciens noms d'items de fruits redeviennent de simples blocs :
       sans ce nettoyage, un joueur verrait encore "Control" sur ses Stone. */
    resetLegacyFruitStats(playerId);

    /* Les fruits deja possedes (inventaire + Moonstone Chest) sont réécrits
       avec leur nouvel item, leur enchant et leur description. */
    announceFruitMigration(playerId, migrateFruitItems(playerId));

    /* Certains inventaires ne sont pas encore lisibles au tick 0 : on repasse
       une fois, tardif, pour les fruits qui apparaissent avec le chunk. */
    try {
        scheduleTick(function () {
            announceFruitMigration(playerId, migrateFruitItems(playerId));
        }, FRUIT_MIGRATE_RETRY);
    } catch (e) {}
}
