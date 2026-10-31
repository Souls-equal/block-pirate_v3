// fruit/fruitData.js — données pures, aucune dépendance

export const FRUIT_RARITIES = [
    { name: "Common",    chance: 41, color: "#9E9E9E", display: "\u25cf Common",    enchantmentTier: "Tier 1" },
    { name: "Uncommon",  chance: 28, color: "#37D576", display: "\u25cf Uncommon",  enchantmentTier: "Tier 2" },
    { name: "Rare",      chance: 21, color: "#54E8E8", display: "\u25cf Rare",      enchantmentTier: "Tier 3" },
    { name: "Legendary", chance: 8,  color: "#EC62E8", display: "\u25cf Legendary", enchantmentTier: "Tier 4" },
    { name: "Mythical",  chance: 2,  color: "#F0EC5C", display: "\u25cf Mythical", enchantmentTier: "Tier 5" }
];

/* Noms d'items RÉELS (ceux que le joueur tient en main). Le nom Roleplay
   (rpName) est l'identifiant interne : c'est lui qui relie un fruit à ses
   capacités (FRUIT_ABILITIES), et lui qui est enregistré en base. Changer
   un itemName est donc sans risque pour les joueurs — voir la migration
   dans gameplay/customItem.js (migrateFruitItems). */
export const FRUITS_BY_RARITY = {
    Common: [
        { itemName: "Boulder Bass",            rpName: "Rocket",  rpDesc: "Propel yourself with explosive force." },
        { itemName: "Root Flounder",           rpName: "Spin",    rpDesc: "Rotate at incredible speeds." },
        { itemName: "Crystalized Wheatfish",   rpName: "Blade",   rpDesc: "Transform you into sharp weapons." },
        { itemName: "Green Strongfish",        rpName: "Spring",  rpDesc: "Bounce and compress with elastic power." },
        { itemName: "Bombfish",                rpName: "Bomb",    rpDesc: "Create devastating explosions at will." },
        { itemName: "Moon Strongfish",         rpName: "Smoke",   rpDesc: "Become intangible like mist." },
        { itemName: "Boomerang Fish",          rpName: "Spike",   rpDesc: "Grow deadly spikes." },
    ],
    Uncommon: [
        { itemName: "Embermark Wrasse",        rpName: "Flame",   rpDesc: "Command the fury of fire." },
        { itemName: "Frost Wolf Eel",          rpName: "Ice",     rpDesc: "Freeze everything you touch." },
        { itemName: "Reedglass Minnow",        rpName: "Sand",    rpDesc: "Transform into shifting grains." },
        { itemName: "Coastal Mullet",          rpName: "Dark",    rpDesc: "Manipulate shadows and darkness." },
        { itemName: "Oarfish",                 rpName: "Eagle",   rpDesc: "Soar with the grace of a predator." },
        { itemName: "Frost Herring",           rpName: "Diamond", rpDesc: "Coming to the crystal perfection." },
    ],
    Rare: [
        { itemName: "Polarflash Electron",     rpName: "Light",   rpDesc: "Move at the speed of photons." },
        { itemName: "Lavaflow Trout",          rpName: "Rubber",  rpDesc: "Stretch and bend without limits." },
        { itemName: "Pearlescent Moonfish",    rpName: "Ghost",   rpDesc: "Phase through solid matter." },
        { itemName: "Cinder Leviathan",        rpName: "Magma",   rpDesc: "Become molten destruction incarnate." },
    ],
    Legendary: [
        { itemName: "Sumpback Carp",           rpName: "Quakes",  rpDesc: "Shatter the earth with tremors." },
        { itemName: "Pyroscale Grouper",       rpName: "Buddha",  rpDesc: "Transform into an enlightened giant." },
        { itemName: "Lavawake Slopefish",      rpName: "Love",    rpDesc: "Petrify enemies with desire." },
        { itemName: "Scorched Sunfish",        rpName: "Creation", rpDesc: "Manifest objects from imagination." },
        { itemName: "Basalt Pipefish",         rpName: "Spider",  rpDesc: "Weave webs and climb any surface." },
        { itemName: "Rust Scad",               rpName: "Song",    rpDesc: "Control minds through melody." },
        { itemName: "Rainbow Guppy",           rpName: "Phoenix", rpDesc: "Rise from ashes with regeneration." },
        { itemName: "Nomai Moray",             rpName: "Portal",  rpDesc: "Travel instantly through dimensions." },
        { itemName: "Deepwater Lanternfish",   rpName: "Lightning", rpDesc: "Become a living thunderstorm." },
        { itemName: "Eviota Vader",            rpName: "Pain",    rpDesc: "Inflict agony with a mere touch." },
        { itemName: "Hatchetfish",             rpName: "Blizzard", rpDesc: "Summon catastrophic ice storms." },
    ],
    Mythical: [
        { itemName: "Glacial Silverfish",      rpName: "Gravity", rpDesc: "Bend space and crush your foes." },
        { itemName: "Iceshelf Skate",          rpName: "Mammoth", rpDesc: "Transform into a colossal beast." },
        { itemName: "Heatwarp Flounder",       rpName: "T-Rex",   rpDesc: "Become a prehistoric apex predator." },
        { itemName: "Mangler Catfish",         rpName: "Dought",  rpDesc: "Create and control living dough." },
        { itemName: "Shadow Darter",           rpName: "Shadow",  rpDesc: "Master the void between worlds." },
        { itemName: "Pithead",                 rpName: "Venom",   rpDesc: "Produce lethal toxins at will." },
        { itemName: "Scored Dace",             rpName: "Gas",     rpDesc: "Transform into deadly chemical clouds." },
        { itemName: "Rimesnouted Lancetfish",  rpName: "Spirit",  rpDesc: "Separate soul from body." },
        { itemName: "Volcanic Catfish",        rpName: "Tiger",   rpDesc: "Channel the power of an ancient beast." },
        { itemName: "Paleice Rockcod",         rpName: "Yeti",    rpDesc: "Command the frozen mountain fury." },
        { itemName: "Frozen Grenadier",        rpName: "Kitsune", rpDesc: "Wield illusions and trickery." },
        { itemName: "Tri-Pointed Needlefish",  rpName: "Control", rpDesc: "Dominate the will of others." },
        { itemName: "Seahorse",                rpName: "Dragon",  rpDesc: "Ascend as the ultimate legendary creature." },
    ],
};

/* ANCIENS items de fruits (blocks). Ils ne servent plus qu'à la migration
   des inventaires : au join, un fruit encore stocké sous son ancien nom
   est réécrit avec son nouvel item, son enchant et sa description.
   Volontairement SÉPARÉ de FRUITS_BY_RARITY : ces noms sont des blocs
   de construction ordinaires (Stone, Glass, Ice...), on ne les convertit
   donc QUE si l'item porte les attributs d'un fruit. */
export const LEGACY_FRUIT_ITEMS = {
    "Bone Block": "Rocket", "Leather Block": "Spin", "Plum Block": "Blade",
    "Watermelon": "Spring", "Beetroot Block": "Bomb", "Diorite": "Smoke",
    "Fat Cactus": "Spike", "Mango Block": "Flame", "Ice": "Ice", "Sand": "Sand",
    "Obsidian": "Dark", "Brown Mushroom Block": "Eagle", "Block of Diamond": "Diamond",
    "Pear Block": "Light", "Engraved Granite": "Rubber", "Glass": "Ghost",
    "Magma": "Magma", "Ice Bricks": "Quakes", "Banana Block": "Buddha",
    "Cherry Block": "Love", "Bookshelf": "Creation", "Block of Coal": "Spider",
    "Potato Block": "Song", "Corn Block": "Phoenix", "Bread Block": "Portal",
    "Diamond Ore": "Lightning", "Pumpkin": "Pain", "Block of Moonstone": "Blizzard",
    "Moonstone Ore": "Gravity", "Engraved Andesite": "Mammoth", "Carrot Block": "T-Rex",
    "Bedrock": "Dought", "Red Mushroom Block": "Shadow", "Block of Iron": "Venom",
    "Apple Block": "Gas", "Chili Pepper Block": "Spirit", "Snow": "Tiger",
    "Custom Lobby Block": "Yeti", "Snowy Messy Stone": "Kitsune", "Stone": "Control",
    "Pine Cone Block": "Dragon",
};

/* item -> fruit (noms actuels ET anciens) */
export function getFruitItemName(rpName) {
    for (const rarity in FRUITS_BY_RARITY) {
        for (const fruit of FRUITS_BY_RARITY[rarity]) {
            if (fruit.rpName === rpName) return fruit.itemName;
        }
    }
    return null;
}

export function getFruitRpNameForItem(itemName) {
    if (!itemName) return null;
    for (const rarity in FRUITS_BY_RARITY) {
        for (const fruit of FRUITS_BY_RARITY[rarity]) {
            if (fruit.itemName === itemName) return fruit.rpName;
        }
    }
    return LEGACY_FRUIT_ITEMS[itemName] || null;
}

export function getRarityColor(rarityName) {
    const rarity = FRUIT_RARITIES.find(function(r) { return r.name === rarityName; });
    return rarity ? rarity.color : "#FFFFFF";
}

export function getRarityEnchantTier(rarityName) {
    const rarity = FRUIT_RARITIES.find(function(r) { return r.name === rarityName; });
    return rarity ? rarity.enchantmentTier : "Tier 1";
}

/* Accepte un nom Roleplay OU un nom d'item (actuel) : sert à l'admin
   « Give Fruit » et à la recherche de fruit. */
export function getFruitInfo(fruitName) {
    for (const rarity in FRUITS_BY_RARITY) {
        const fruits = FRUITS_BY_RARITY[rarity];
        for (const fruit of fruits) {
            if (fruit.rpName === fruitName || fruit.itemName === fruitName) {
                return { ...fruit, rarity: rarity };
            }
        }
    }
    return null;
}
