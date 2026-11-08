// customItem.js

import { FRUITS_BY_RARITY, fruitDescription, fruitItemAttributes, getRarityEnchantTier } from "../fruit/index";
import { LEGACY_FRUIT_ITEMS, getFruitItemName, getFruitInfo } from "../fruit/fruitData";
import { setTimeout as scheduleTick } from "../utils/timer";
import { FRUIT_TICKETS, getStat, setItemLabelLookup } from "../utils/data";
import { say, txt } from "../core/theme";

/* Le tier d'enchantement n'est peut-etre pas modifiable via setItemStat :
   on tente une fois, et si le moteur refuse on ne reessaie plus jamais. */
let tierStatUnsupported = false;

/* ══════════════════════════════════════════════════════════════════════════
   NOMS ET DESCRIPTIONS DES ITEMS CUSTOM — SOURCE UNIQUE

   Un item n'est plus habille au moment du give (customDisplayName /
   customDescription dans les attributs) : son nom et sa description sont
   poses UNE fois pour toutes par setItemStat, au join. Trois consequences :

     - un item deja en banque, ramasse au sol, rendu par un Code Block ou
       vendu par un PNJ affiche le bon nom sans que l'appelant y pense ;
     - un nom ne peut plus etre OUBLIE au moment du give (c'est comme ca que
       le vendeur de haki rendait un "Small Black Pod" brut) ;
     - les attributs redeviennent ce qu'ils auraient toujours du etre : ce qui
       est PROPRE a une instance (enchantements, uniqueRollId, isFruitBlock).

   Seul le Wood Sword a deux noms : un pirate et un joueur sans team n'ont pas
   la meme arme de depart, mais c'est le meme item. applyItemLooks() est donc
   rappele a chaque changement de team (voir replaceTeamWeapons, core/team).
   ══════════════════════════════════════════════════════════════════════════ */

export const ITEM_LOOKS = {
    /* Haki : l'item UNIQUE qui arme le poing. Il ne peut pas etre lache (voir
       onPlayerDropItem) ; le nom d'item, lui, reste "Small Black Pod". */
    "Small Black Pod": {
        displayName: "Armament Haki",
        description: "Click to arm or release your Armament Haki. It cannot be dropped.",
    },
    /* Les deux items qui remplacent les items de capacite sur PC (demande 76).
       Ce sont de VRAIS items Bloxd, on ne change que ce que le joueur lit.
       Le nom reste « Swap Orb » / « Void Net » dans le code : c'est par lui que
       fruit/index et fightingStyles les reconnaissent, jamais par l'affichage. */
    /* Mobile : l'item de dash. Son nom Bloxd (« Snowdash ») ne dit rien au
       joueur, et il est le SEUL moyen de dasher sur un ecran tactile. */
    "Snowdash": {
        displayName: "Dash",
        description: "Click to dash forward. It costs stamina and cannot be dropped.",
    },
    "Swap Orb": {
        displayName: "Devil Fruit Abilities",
        description: "Hold it in your hand to use your Devil Fruit abilities. It cannot be dropped.",
    },
    "Void Net": {
        displayName: "Fighting Style Capacities",
        description: "Hold it in your hand to punch and to use your Fighting Style attacks. It cannot be dropped.",
    },
    /* Saber Quest : le butin du Mob Leader et la relique du mur. Ce sont de
       VRAIS items du jeu, on ne fait que changer ce que le joueur lit.
         - Gold Grit : un tas de pieces et de tresor, pas une ressource.
         - Magmaward Fuel : une relique ancienne qui ouvre ce qu'aucune lame
           ne coupe, pas un carburant. */
    "Gold Grit": {
        displayName: "Gold Dust",
        description: "A heap of stolen coins and treasure, all that the Mob Leader could carry. The Rich Man wants it back.",
    },
    "Magmaward Fuel": {
        displayName: "Ancient Relic",
        description: "An ancient Relic bearing the marks of time. It opens what no blade can cut, right where it's marked",
    },
    /* Armurerie et bateaux des PNJ. Les noms vivaient dans les appels
       buyItem() de gameplay/NPCs : ils sont ici, une fois. */
    "M1911": { displayName: "Flintlock", description: "A slow Flintlock to kill enemies from the distance!" },
    "Boat": { displayName: "Normal Boat", description: "A classic boat made to travel all seas." },
    "Obsidian Boat": { displayName: "Advanced Boat", description: "A stronger boat made to travel all seas." },
    "Speedboat": { displayName: "Luxury Boat", description: "A super fast boat made to travel all seas." },
    "Stone Dagger": { displayName: "Sand Dagger", description: "A dagger made of the rock of the desert." },
    "Stone Sword": { displayName: "Advanced Sword", description: "The sword of a strong Pirates." },
    "Stone Spear": { displayName: "Advanced Spear", description: "Just a sword for a normal people..." },
    "Wood Spear": { displayName: "Basic Spear", description: "The spear of the Justice!" },
};

/* Le seul item dont le NOM depend de la team. */
export const TEAM_ITEM_LOOKS = {
    "Wood Sword": {
        PIRATES: { displayName: "Basic Dagger", description: "The first weapon of every Pirates." },
        DEFAULT: { displayName: "Basic Sword", description: "Just a sword for a normal people..." },
    },
};

/* Nom + description d'un item pour CE joueur, ou null si l'item n'est pas
   custom. Le nom d'un Wood Sword depend de la team du joueur. */
export function itemLook(playerId, itemName) {
    if (!itemName) return null;
    const fixed = ITEM_LOOKS[itemName];
    if (fixed) return fixed;
    const byTeam = TEAM_ITEM_LOOKS[itemName];
    if (!byTeam) return null;
    let team = "DEFAULT";
    try { team = getStat(playerId, "team", "DEFAULT") || "DEFAULT"; } catch (e) { team = "DEFAULT"; }
    return byTeam[team] || byTeam.DEFAULT;
}

/* Nom affiche seul : c'est ce dont les messages d'achat ont besoin (voir
   buyItem dans utils/data). */
export function itemLabel(playerId, itemName) {
    const look = itemLook(playerId, itemName);
    return look ? look.displayName : null;
}

/* Pose TOUS les noms et descriptions de ce joueur. Appele au join, et apres
   chaque changement de team. Renvoie le nombre d'items nommes. */
export function applyItemLooks(playerId) {
    if (!playerId) return 0;
    let done = 0;
    for (const itemName in ITEM_LOOKS) {
        const look = ITEM_LOOKS[itemName];
        try { api.setItemStat(playerId, itemName, "displayName", look.displayName); done++; } catch (e) {}
        try { api.setItemStat(playerId, itemName, "description", look.description); } catch (e) {}
    }
    for (const itemName in TEAM_ITEM_LOOKS) {
        const look = itemLook(playerId, itemName);
        if (!look) continue;
        try { api.setItemStat(playerId, itemName, "displayName", look.displayName); done++; } catch (e) {}
        try { api.setItemStat(playerId, itemName, "description", look.description); } catch (e) {}
    }
    return done;
}

/* Les messages d'achat (utils/data) affichent le nom de la table ci-dessus
   sans importer ce fichier : data -> customItem serait un cycle (customItem
   lui prend FRUIT_TICKETS). C'est le meme principe que setTeamGuard. */
try { setItemLabelLookup(itemLabel); } catch (e) {}

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

/* Parcours des SEULS slots d'inventaire. scanAllItems() ajoute le Moonstone
   Chest par-dessus. Deux boucles identiques vivaient ici et dans
   gameplay/fightingStyles (hasAbilityItem, removeFightingStyleItems) : une
   seule forme pour les trois. */
export function eachItemSlot(playerId, cb) {
    for (let slot = 0; slot <= INVENTORY_SLOT_MAX; slot++) {
        let item = null;
        try { item = api.getItemSlot(playerId, slot); } catch (e) { item = null; }
        if (!item || !item.name) continue;
        try { cb(item, slot); } catch (e) {}
    }
}

/* Nom de l'item en main, ou null. Indexe sur le nom (pas sur l'objet) : c'est
   ce que comparent les quêtes et les verrous de drop. */
export function heldItemName(playerId) {
    try {
        const h = api.getHeldItem(playerId);
        if (!h) return null;
        if (typeof h === "string") return h;
        return h.name || h.type || null;
    } catch (e) { return null; }
}

export function scanAllItems(playerId, cb) {
    eachItemSlot(playerId, function (item, slot) { cb(item, "inventory", slot); });

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
            txt("[Fruit] ", "#E8B4A0"),
            txt(result.item
                    ? result.item + (result.item > 1 ? " fruits ont ete" : " fruit a ete") + " mis a jour vers les nouveaux items."
                    : "Tes fruits ont ete remis a neuf (enchant + description).", "#CBD5E1"),
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
    /* TOUS LES NOMS ET DESCRIPTIONS, D'UN SEUL COUP : haki, butins de la Saber
       Quest, armurerie et bateaux des PNJ (table ITEM_LOOKS ci-dessus). Un
       item deja en banque, achete, ramasse ou rendu par un Code Block les
       retrouve tout seul — rien n'est ecrit au moment du give. */
    applyItemLooks(playerId)
    /* BONS DE REDUCTION DE LA MACHINE A FRUITS : cinq items PAR DEFAUT de
       Bloxd (Lottery Tickets), qu'on renomme et qu'on decrit. La liste vit
       dans utils/data (FRUIT_TICKETS), avec la reduction de chacun, parce que
       c'est le meme tableau qui sert au prix (fruit/index) et au butin des
       mobs (utils/spawning). Un joueur ne voit jamais "Lottery Ticket". */
    for (let i = 0; i < FRUIT_TICKETS.length; i++) {
        const voucher = FRUIT_TICKETS[i];
        try { api.setItemStat(playerId, voucher.item, "displayName", voucher.label); } catch (e) {}
        try { api.setItemStat(playerId, voucher.item, "description", voucher.desc); } catch (e) {}
    }
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
