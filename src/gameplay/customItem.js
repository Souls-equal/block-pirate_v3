// customItem.js

import { FRUITS_BY_RARITY, fruitDescription, fruitItemAttributes, getRarityEnchantTier } from "../fruit/index";
import { FRUIT_TICKETS, getStat, setItemLabelLookup } from "../utils/data";

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

    /* COMMANDES (demandes 76 et 77). Trois items dont le nom Bloxd ne dit rien
       au joueur. Le code les reconnait par leur nom d'item ("Moonstone Dust",
       "Swap Orb", "Void Net") et JAMAIS par ce qui est ecrit ici : renommer
       une entree ne casse donc aucun test ni aucun choix de commande.
         - Moonstone Dust : le dash du mobile, seul moyen de dasher a l'ecran.
           C'est une MATIERE (aucun effet propre) : un item qui propulse tout
           seul ferait un second dash impossible a annuler sur mobile ;
         - Swap Orb / Void Net : ouvrent les touches du mode « boutons ». */
    "Moonstone Dust": {
        displayName: "Dash",
        description: "Click to dash forward. It costs stamina and cannot be dropped.",
    },
    "Swap Orb": {
        displayName: "Fruit Abilities",
        description: "Hold it in your hand to use the powers of your Devil Fruit. It cannot be dropped.",
    },
    "Void Net": {
        displayName: "Fighting Style Capacities",
        description: "Hold it in your hand to punch and to use your Fighting Style attacks. It cannot be dropped.",
    },

    /* Saber Quest : le butin du Mob Leader, la relique du mur et la Cup. Ce sont
       de VRAIS items du jeu, on ne fait que changer ce que le joueur lit.
         - Gold Grit : un tas de pieces et de tresor, pas une ressource.
         - Magmaward Fuel : une relique ancienne qui ouvre ce qu'aucune lame ne
           coupe, pas un carburant.
         - Black Carpet : la toile que lache le boss, pas une moquette.
         - Water Bucket : la Cup pleine de la quete. */
    "Gold Grit": {
        displayName: "Gold Dust",
        description: "A heap of stolen coins and treasure, all that the Mob Leader could carry. The Rich Man wants it back.",
    },
    "Magmaward Fuel": {
        displayName: "Ancient Relic",
        description: "An ancient Relic bearing the marks of time. It opens what no blade can cut, right where it's marked",
    },
    "Black Carpet": {
        displayName: "Haki Fragment",
        description: "A shard of Armament Haki, torn from a boss. Pick it up to grow stronger.",
    },
    "Water Bucket": {
        displayName: "Cup of Water",
        description: "A cup full of fresh water. Someone must be thirsty.",
    },

    /* Armurerie et bateaux des PNJ. Trois familles, une par marchand :
       les bateaux, les lames du desert et les armes des deux camps. Le nom
       lu par le joueur ne dit jamais de quel item Bloxd il s'agit. */
    "Boat": { displayName: "Normal Boat", description: "A classic boat, made to sail every sea." },
    "Obsidian Boat": { displayName: "Advanced Boat", description: "A sturdier boat, made to sail every sea." },
    "Speedboat": { displayName: "Luxury Boat", description: "The fastest boat of the three, made to sail every sea." },
    "Stone Dagger": { displayName: "Sand Dagger", description: "A short blade cut from the rock of the desert." },
    "Stone Sword": { displayName: "Advanced Sword", description: "The blade of a Pirate who has already drawn blood." },
    "Stone Spear": { displayName: "Advanced Spear", description: "A long spear for a fighter with no side to swear to." },
    "Wood Spear": { displayName: "Basic Spear", description: "The first spear every Marine is handed." },
    "M1911": { displayName: "Flintlock", description: "A slow hand cannon that hits hard from a distance." },
};

/* Le seul item dont le NOM depend de la team : la premiere arme, que le
   First Weapon Dealer ne vend pas au meme prix a un Pirate et a un joueur
   sans camp. Le nom suit ce que le joueur est, pas ce que l'item est. */
export const TEAM_ITEM_LOOKS = {
    "Wood Sword": {
        PIRATES: { displayName: "Basic Sword", description: "The first sword every Pirate is handed." },
        DEFAULT: { displayName: "Rusty Sword", description: "A rusted sword, the first blade of a fighter with no side to swear to." },
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
}
