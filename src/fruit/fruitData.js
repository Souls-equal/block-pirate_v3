// fruit/fruitData.js — données pures, aucune dépendance

export const FRUIT_RARITIES = [
    { name: "Common",    chance: 41, color: "#9E9E9E", display: "\u25cf Common",    enchantmentTier: "Tier 1" },
    { name: "Uncommon",  chance: 28, color: "#37D576", display: "\u25cf Uncommon",  enchantmentTier: "Tier 2" },
    { name: "Rare",      chance: 21, color: "#54E8E8", display: "\u25cf Rare",      enchantmentTier: "Tier 3" },
    { name: "Legendary", chance: 8,  color: "#EC62E8", display: "\u25cf Legendary", enchantmentTier: "Tier 4" },
    { name: "Mythical",  chance: 2,  color: "#F0EC5C", display: "\u25cf Mythical",  enchantmentTier: "Tier 5" }
];

export const FRUITS_BY_RARITY = {
    Common: [
        { itemName: "Bone Block",     rpName: "Rocket", rpDesc: "Propel yourself with explosive force." },
        { itemName: "Leather Block",  rpName: "Spin",   rpDesc: "Rotate at incredible speeds." },
        { itemName: "Plum Block",     rpName: "Blade",  rpDesc: "Transform you into sharp weapons." },
        { itemName: "Watermelon",     rpName: "Spring", rpDesc: "Bounce and compress with elastic power." },
        { itemName: "Beetroot Block", rpName: "Bomb",   rpDesc: "Create devastating explosions at will." },
        { itemName: "Diorite",        rpName: "Smoke",  rpDesc: "Become intangible like mist." },
        { itemName: "Fat Cactus",     rpName: "Spike",  rpDesc: "Grow deadly spikes." },
    ],
    Uncommon: [
        { itemName: "Mango Block",    rpName: "Flame",  rpDesc: "Command the fury of fire." },
        { itemName: "Ice",            rpName: "Ice",    rpDesc: "Freeze everything you touch." },
        { itemName: "Sand",           rpName: "Sand",   rpDesc: "Transform into shifting grains." },
        { itemName: "Obsidian",       rpName: "Dark",   rpDesc: "Manipulate shadows and darkness." },
        { itemName: "Brown Mushroom Block", rpName: "Eagle",   rpDesc: "Soar with the grace of a predator." },
        { itemName: "Block of Diamond",     rpName: "Diamond", rpDesc: "Coming to the crystal perfection." },
    ],
    Rare: [
        { itemName: "Pear Block",     rpName: "Light",  rpDesc: "Move at the speed of photons." },
        { itemName: "Engraved Granite", rpName: "Rubber", rpDesc: "Stretch and bend without limits." },
        { itemName: "Glass",          rpName: "Ghost",  rpDesc: "Phase through solid matter." },
        { itemName: "Magma",          rpName: "Magma",  rpDesc: "Become molten destruction incarnate." },
    ],
    Legendary: [
        { itemName: "Ice Bricks",    rpName: "Quakes",   rpDesc: "Shatter the earth with tremors." },
        { itemName: "Banana Block",  rpName: "Buddha",   rpDesc: "Transform into an enlightened giant." },
        { itemName: "Cherry Block",  rpName: "Love",     rpDesc: "Petrify enemies with desire." },
        { itemName: "Bookshelf",     rpName: "Creation", rpDesc: "Manifest objects from imagination." },
        { itemName: "Block of Coal", rpName: "Spider",   rpDesc: "Weave webs and climb any surface." },
        { itemName: "Potato Block",  rpName: "Song",     rpDesc: "Control minds through melody." },
        { itemName: "Corn Block",    rpName: "Phoenix",  rpDesc: "Rise from ashes with regeneration." },
        { itemName: "Bread Block",        rpName: "Portal",    rpDesc: "Travel instantly through dimensions." },
        { itemName: "Diamond Ore",        rpName: "Lightning", rpDesc: "Become a living thunderstorm." },
        { itemName: "Pumpkin",            rpName: "Pain",      rpDesc: "Inflict agony with a mere touch." },
        { itemName: "Block of Moonstone", rpName: "Blizzard",  rpDesc: "Summon catastrophic ice storms." },
    ],
    Mythical: [
        { itemName: "Moonstone Ore",     rpName: "Gravity",  rpDesc: "Bend space and crush your foes." },
        { itemName: "Engraved Andesite", rpName: "Mammoth",  rpDesc: "Transform into a colossal beast." },
        { itemName: "Carrot Block",      rpName: "T-Rex",    rpDesc: "Become a prehistoric apex predator." },
        { itemName: "Bedrock",           rpName: "Dought",   rpDesc: "Create and control living dough." },
        { itemName: "Red Mushroom Block", rpName: "Shadow",  rpDesc: "Master the void between worlds." },
        { itemName: "Block of Iron",      rpName: "Venom",   rpDesc: "Produce lethal toxins at will." },
        { itemName: "Apple Block",        rpName: "Gas",     rpDesc: "Transform into deadly chemical clouds." },
        { itemName: "Chili Pepper Block", rpName: "Spirit",  rpDesc: "Separate soul from body." },
        { itemName: "Snow",               rpName: "Tiger",   rpDesc: "Channel the power of an ancient beast." },
        { itemName: "Custom Lobby Block", rpName: "Yeti",    rpDesc: "Command the frozen mountain fury." },
        { itemName: "Snowy Messy Stone",  rpName: "Kitsune", rpDesc: "Wield illusions and trickery." },
        { itemName: "Stone",              rpName: "Control", rpDesc: "Dominate the will of others." },
        { itemName: "Pine Cone Block",    rpName: "Dragon",  rpDesc: "Ascend as the ultimate legendary creature." },
    ],
};

export function getRarityColor(rarityName) {
    const rarity = FRUIT_RARITIES.find(function(r) { return r.name === rarityName; });
    return rarity ? rarity.color : "#FFFFFF";
}

export function getRarityEnchantTier(rarityName) {
    const rarity = FRUIT_RARITIES.find(function(r) { return r.name === rarityName; });
    return rarity ? rarity.enchantmentTier : "Tier 1";
}

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
