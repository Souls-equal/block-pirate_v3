// fruit/abilities.js

import { getFruit } from "./index";
import {
    isImmuneToDamage,
    markAggro,
    onEntityCollisionFruit,
    onEntityCollisionPaint,
    onPlayerClickAnchor,
    onPlayerClickBladeDash,
    onPlayerClickBladeStorm,
    onPlayerClickBombDash,
    onPlayerClickCataclysm,
    onPlayerClickConcreteWheel,
    onPlayerClickDiamondRecovery,
    onPlayerClickDissonantWave,
    onPlayerClickFruit,
    onPlayerClickGasTether,
    onPlayerClickGeyser,
    onPlayerClickGhostPhase,
    onPlayerClickGrowingRay,
    onPlayerClickJudgmentBeam,
    onPlayerClickJumpBeacon,
    onPlayerClickLaser,
    onPlayerClickLightning,
    onPlayerClickMark,
    onPlayerClickPainPulse,
    onPlayerClickPetalRefrain,
    onPlayerClickPortal,
    onPlayerClickPortalRift,
    onPlayerClickRocket,
    onPlayerClickRubberPunch,
    onPlayerClickSeismic,
    onPlayerClickSmokeFog,
    onPlayerClickSmokeShroud,
    onPlayerClickSpectralPrison,
    onPlayerClickSpikeField,
    onPlayerClickSpinBlade,
    onPlayerClickSpring,
    onPlayerClickThunderStrike,
    onPlayerClickVortex,
    onPlayerClickWindblade,
    onPlayerClickfullPunch,
    onPlayerJoinPaint,
    onPlayerLeaveDiamond,
    onPlayerLeaveDought,
    onPlayerLeaveFruit,
    onPlayerLeaveGas,
    onPlayerLeaveGhost,
    onPlayerLeaveLightning,
    onPlayerLeaveMark,
    onPlayerLeavePain,
    onPlayerLeavePaint,
    onPlayerLeavePortal,
    onPlayerLeaveRubber,
    onPlayerLeaveSeismic,
    onPlayerLeaveSmoke,
    onPlayerLeaveSong,
    onPlayerLeaveSpring,
    onPlayerLeaveVortex,
    onPlayerReleasePainPulse,
    onPlayerClickManifestGolem,
    onPlayerLeaveCreation,
    onPlayerClickClawRip,
    onPlayerLeaveTiger,
    onPlayerClickFrostfall,
    onPlayerClickShatterfrost,
    onPlayerLeaveBlizzard,
    onPlayerClickMagmaRings,
    onPlayerClickLavaJet,
    onPlayerLeaveLava,
    onPlayerClickMeteorShower,
    onPlayerLeaveMeteorShower,
    onCancelMeteorShower,
    onPlayerClickControlDomain,
    onPlayerClickControlSlash,
    onPlayerClickControlShambles,
    onPlayerLeaveControl,
    onPlayerClickTigerForm,
    onPlayerLeaveTigerForm,
    onPlayerClickGravityBarrage,
    onPlayerClickGravityGrab,
    onPlayerClickGravityDevastation,
    onPlayerLeaveGravity,
} from "./func-abilities";
import { applyEffect } from "../utils/combat";

function P(color, kind) {
    if(kind) return color + " " + kind + " Paintball Explosive Item";
    else return color + " " + "Paintball Explosive Item";
}

const ABILITY_BINDS = [
    {
        id: "gravityBarrage", item: P("Black", "Quick"), name: "Gravity Barrage", cd: 4000,
        desc: "Tear up to 24 blocks out of the ground you are aiming at, hold them over your head, and fire them one by one at what is in front of you: 60 each.",
        cast: (pid, itemName) => onPlayerClickGravityBarrage(pid, itemName)
    },
    {
        id: "gravityGrab", item: P("Gray", "Sticky"), name: "Gravity Grab", cd: 500,
        desc: "Hold the first thing in your aim - a player, a mob, a block - for six seconds. Click again to throw it: 95 for a person, and a block comes back at them as a shard for 133.",
        cast: (pid, itemName) => onPlayerClickGravityGrab(pid, itemName)
    },
    {
        id: "gravityDevastation", item: P("Purple", "Seeking"), name: "Gravity Planet", cd: 18000,
        desc: "Raise a core above you, wrap up to 150 blocks of the ground around you into a small planet, and drop the whole thing where you look: 420 at the middle, less the further out you get thrown.",
        cast: (pid, itemName) => onPlayerClickGravityDevastation(pid, itemName)
    },
    {
        id: "tigerForm", item: P("Yellow", "Quick"), name: "Tiger Form", cd: 3500,
        desc: "Leap onto all fours and wear the tiger: paws on your limbs, a head and a tail at your back, and claws that open on anything in front of the leap. Sixteen seconds, six more with every leap.",
        cast: (pid, itemName) => onPlayerClickTigerForm(pid, itemName)
    },
    {
        id: "controlDomain", item: P("Blue", "Quick"), name: "Control Domain", cd: 15000,
        desc: "Close a room of blue glass around you for 32 seconds: inside it you decide where people look, where they stand, and what their floor is worth.",
        cast: (pid, itemName) => onPlayerClickControlDomain(pid, itemName)
    },
    {
        id: "controlSlash", item: P("Blue", "Seeking"), name: "Control Slash", cd: 900,
        desc: "A thin blade of will flies where you look and cuts the first thing it meets. Inside your own room it is huge, and a wall it bites hands its blocks to your orbit.",
        cast: (pid, itemName) => onPlayerClickControlSlash(pid, itemName)
    },
    {
        id: "controlShambles", item: P("Cyan", "Seeking"), name: "Shambles Disc", cd: 8000,
        desc: "Throw a violet disc: it hovers, drags everyone in, then bursts and throws them out of your room.",
        cast: (pid, itemName) => onPlayerClickControlShambles(pid, itemName)
    },
    {
        id: "meteorShower", item: P("Gray", "Seeking"), name: "Meteor Shower", cd: 18000,
        desc: "Call down six falling rocks around the block you click: one after the other, each one crushes what it lands on.",
        cast: (pid, itemName) => onPlayerClickMeteorShower(pid, itemName)
    },
    {
        id: "magmaRings", item: P("Red", "Sticky"), name: "Magma Rings", cd: 9000,
        desc: "Three pools of lava settle on the ground around you and cook whoever stands in them.",
        cast: (pid, itemName) => onPlayerClickMagmaRings(pid, itemName)
    },
    {
        id: "lavaJet", item: P("Orange", "Quick"), name: "Lava Jet", cd: 5500,
        desc: "Heave a slow arc of molten rock: it burns what it passes through and leaves a puddle where it lands.",
        cast: (pid, itemName) => onPlayerClickLavaJet(pid, itemName)
    },
    {
        id: "manifestGolem", item: P("Gray", "Seeking"), name: "Manifest Golem", cd: 30000,
        desc: "Shape a spirit golem bound to you: it hunts whatever is closest to you for 24 s, then unravels.",
        cast: (pid, itemName) => onPlayerClickManifestGolem(pid, itemName)
    },
    {
        id: "clawRip", item: P("Orange", "Sticky"), name: "Claw Rip", cd: 8000,
        desc: "Launch one huge swipe: three separated claw marks fly out and carve anything they cross.",
        cast: (pid, itemName) => onPlayerClickClawRip(pid, itemName)
    },
    {
        id: "frostfall", item: P("Light Blue", "Sticky"), name: "Frostfall", cd: 20000,
        desc: "Drop a snowstorm where you look: the longer you stand in the falling snow, the deeper the chill.",
        cast: (pid, itemName) => onPlayerClickFrostfall(pid, itemName)
    },
    {
        id: "shatterfrost", item: P("Light Blue", "Quick"), name: "Shatterfrost", cd: 11000,
        desc: "Snap the frost: an ice ring bites, and everyone you have chilled shatters for their stacks.",
        cast: (pid, itemName) => onPlayerClickShatterfrost(pid, itemName)
    },
    {
        id: "petalRefrain", item: P("Magenta", "Sticky"), name: "Petal Refrain", cd: 18000,
        desc: "A circle of falling petals: inside it you regenerate while the bloom cuts your enemies.",
        cast: (pid, itemName) => onPlayerClickPetalRefrain(pid, itemName)
    },
    {
        id: "dissonantWave", item: P("Pink", "Sticky"), name: "Dissonant Wave", cd: 7000,
        desc: "A pink-green cone of sound erupts from you and shreds everything in front of you for 10 blocks.",
        cast: (pid, itemName) => onPlayerClickDissonantWave(pid, itemName)
    },
    {
        id: "thunderStrike", item: P("Yellow", "Sticky"), name: "Thunder Strike", cd: 9000,
        desc: "Call a bolt on the block you look at: it falls after a beat and blasts a big zone.",
        cast: (pid, itemName) => onPlayerClickThunderStrike(pid, itemName)
    },
    {
        id: "tomatoTether", item: P("Red", "Seeking"), name: "Tomato Tether", cd: 12000,
        desc: "Tie the closest enemy in reach: a red thread drains them and kills their jump while you stay close.",
        cast: (pid, itemName) => onPlayerClickGasTether(pid, itemName)
    },
    {
        id: "painPulse", item: P("Red", "Sticky"), name: "Pulse of Pain", cd: 8000,
        desc: "Hold the click to charge a ring of pain: the wider it gets, the more health it takes from you.",
        cast: (pid, itemName) => onPlayerClickPainPulse(pid, itemName),
        up: (pid, itemName, alt) => onPlayerReleasePainPulse(pid, itemName, alt)
    },
    {
        id: "crystalReco", item: P("Cyan", "Quick"), name: "Crystal Recovery", cd: 13000,
        desc: "Stand still, slowed, and regenerate back to full health.",
        cast: (pid) => onPlayerClickDiamondRecovery(pid)
    },
    {
        id: "elasticPunch", item: P("White", "Sticky"), name: "Elastic Punch", cd: 1100,
        desc: "Your fist becomes a stretched clay block, shoots forward and smashes everything on its way.",
        cast: (pid, itemName) => onPlayerClickRubberPunch(pid, itemName)
    },
    {
        id: "speed", item: P("Light Blue"), name: "Speed Upgrade", cd: 15000,
        desc: "Get the speed effect for a certain time.",
        cast: (pid, itemName) => applyEffect(pid, "Speed", 10000, {inbuiltLevel:2})
    },
    {
        id: "damage", item: P("Red"), name: "Damage Upgrade", cd: 15000,
        desc: "Get the damage effect for a certain time.",
        cast: (pid, itemName) => applyEffect(pid, "Damage", 10000, {inbuiltLevel:2})
    },
    {
        id: "damage_reduc", item: P("Gray"), name: "Protection Upgrade", cd: 15000,
        desc: "Get the damage reduction effect for a certain time.",
        cast: (pid, itemName) => applyEffect(pid, "Damage Reduction", 10000, {inbuiltLevel:2})
    },
    {
        id: "regen", item: P("Pink"), name: "Regen Upgrade", cd: 15000,
        desc: "Get the health regen effect for a certain time.",
        cast: (pid, itemName) => applyEffect(pid, "Health Regen", 10000, {inbuiltLevel:3})
    },
    {
        id: "bounce", item: P("Lime"), name: "Bounciness Upgrade", cd: 15000,
        desc: "Get the bouniness effect for a certain time.",
        cast: (pid, itemName) => applyEffect(pid, "Bounciness", 10000, {inbuiltLevel:1})
    },
    {
        id: "wall", item: P("Cyan"), name: "Wall Climbing Upgrade", cd: 15000,
        desc: "Get the wall climbing effect for a certain time.",
        cast: (pid, itemName) => applyEffect(pid, "Wall Climbing", 10000, {inbuiltLevel:1})
    },
    {
        id: "air", item: P("Light Gray"), name: "Air Walk Upgrade", cd: 15000,
        desc: "Get the air walk effect for a certain time.",
        cast: (pid, itemName) => applyEffect(pid, "Air Walk", 10000, {inbuiltLevel:1})
    },
    {
        id: "jump", item: P("Green"), name: "Jump Boost Upgrade", cd: 15000,
        desc: "Get the jump boost effect for a certain time.",
        cast: (pid, itemName) => applyEffect(pid, "Jump Boost", 10000, {inbuiltLevel:2})
    },
    {
        id: "invisible", item: P("White"), name: "Invisible Upgrade", cd: 15000,
        desc: "Get the invisible effect for a certain time.",
        cast: (pid, itemName) => applyEffect(pid, "Invisible", 10000, {inbuiltLevel:2})
    },
    {
        id: "domainOfSpeed", item: P("Blue", "Sticky"), name: "Domain of Speed", cd: 10000,
        desc: "Be faster inside. Enemies take damage and are slowed.",
        cast: (pid, itemName) => onPlayerClickSpring(pid, itemName)
    },
    {
        id: "spinBlade", item: P("Brown", "Quick"), name: "Spin Blade", cd: 10000,
        desc: "A black blade spins around you for several seconds, cutting nearby foes.",
        cast: (pid, itemName) => onPlayerClickSpinBlade(pid, itemName)
    },
    {
        id: "windBlade", item: P("Lime", "Quick"), name: "Wind Blade", cd: 4000,
        desc: "A green crescent slash that travels forward and cuts foes.",
        cast: (pid, itemName) => onPlayerClickWindblade(pid, itemName)
    },
    {
        id: "cataclysm", item: P("Black", "Sticky"), name: "Cataclysm", cd: 6500,
        desc: "Huge explosion centered on you. Heavy AoE damage.",
        cast: (pid, itemName) => onPlayerClickCataclysm(pid, itemName)
    },
    {
        id: "bombDash", item: P("Orange", "Quick"), name: "Bomb Dash", cd: 500,
        desc: "Burst damage around you, then dash hard in your look direction.",
        cast: (pid, itemName) => onPlayerClickBombDash(pid, itemName)
    },
    {
        id: "spikeField", item: P("Green", "Sticky"), name: "Spike Field", cd: 12000,
        desc: "Random black concrete spikes erupt around you, then vanish. AoE damage.",
        cast: (pid, itemName) => onPlayerClickSpikeField(pid, itemName)
    },
    {
        id: "crimsonBeam", item: P("Red", "Quick"), name: "Crimson Beam", cd: 1000,
        desc: "Long-range laser in your look direction. Hits once per target.",
        cast: (pid, itemName) => onPlayerClickLaser(pid, itemName)
    },
    {
        id: "geyserBurst", item: P("Cyan", "Sticky"), name: "Geyser Burst", cd: 10000,
        desc: "Water column erupts under the aimed spot and launches enemies up.",
        cast: (pid, itemName) => onPlayerClickGeyser(pid, itemName)
    },
    { id: "smokeFog", item: P("Light Gray", "Sticky"), name: "Choking Fog", cd: 35000,
      desc: "A huge fog bank (20s) around you: everyone inside slowly loses health and is slowed.",
      cast: (pid, itemName) => onPlayerClickSmokeFog(pid, itemName)
    },
    { id: "smokeShroud", item: P("Gray", "Quick"), name: "Smoke Shroud", cd: 27000,
      desc: "A cloud locks onto the enemy you hit, drains and slows it, then collapses around it.",
      cast: (pid, itemName) => onPlayerClickSmokeShroud(pid, itemName)
    },
    {
        id: "seismicStomp", item: P("Brown", "Sticky"), name: "Seismic Stomp", cd: 5000,
        desc: "Expanding shock ring. Knockback outward when the ring passes.",
        cast: (pid, itemName) => onPlayerClickSeismic(pid, itemName)
    },
    {
        id: "voidVortex", item: P("Purple", "Sticky"), name: "Void Vortex", cd: 10000,
        desc: "Spiral pull in front of you, then a crushing collapse.",
        cast: (pid, itemName) => onPlayerClickVortex(pid, itemName)
    },
    {
        id: "voidAnchor", item: P("Black", "Seeking"), name: "Void Anchor", cd: 7000,
        desc: "Plant a delayed anchor that pulls, then explodes.",
        cast: (pid, itemName) => onPlayerClickAnchor(pid, itemName)
    },
    {
        id: "fruitShot", item: P("Magenta", "Quick"), name: "Shot", cd: 3000,
        desc: "Physical projectile with a particle trail. Explodes on hit.",
        cast: (pid, itemName, alt) => onPlayerClickFruit(pid, itemName, alt)
    },
    {
        id: "judgmentBeam", item: P("Light Blue", "Seeking"), name: "Judgment Beam", cd: 5000,
        desc: "Raycast a glass domain at your crosshair, fire a yellow beam, deal heavy zone damage.",
        cast: (pid, itemName) => onPlayerClickJudgmentBeam(pid, itemName)
    },
    {
        id: "chainLightning", item: P("Yellow", "Seeking"), name: "Chain Lightning", cd: 7000,
        desc: "Lightning jumps between nearby enemies with a falling trail.",
        cast: (pid, itemName) => onPlayerClickLightning(pid, itemName)
    },
    {
        id: "rocketLaunch", item: P("White", "Seeking"), name: "Rocket Launch", cd: 1200,
        desc: "Click a target to blast them upward with rocket smoke under their feet.",
        cast: (pid, itemName, alt, x, y, z, b, t) => onPlayerClickRocket(pid, itemName, alt, x, y, z, b, t)
    },
    {
        id: "portalStep", item: P("Purple", "Sticky"), name: "Portal Step", cd: 1300,
        desc: "Teleport onto the surface you look at. Blocked by walls and unsafe landing spots.",
        cast: (pid, itemName) => onPlayerClickPortal(pid, itemName)
    },
    {
        id: "portalRift", item: P("Purple", "Quick"), name: "Portal Rift", cd: 1100,
        desc: "Tear a 3x4 window of void in front of you. It flies forward and slices everything it passes.",
        cast: (pid, itemName) => onPlayerClickPortalRift(pid, itemName)
    },
    {
        id: "jumpBeacon", item: P("White", "Quick"), name: "Jump Beacon", cd: 2500,
        desc: "Place a temporary Super Jump Pad with a vertical particle line.",
        cast: (pid, itemName) => onPlayerClickJumpBeacon(pid, itemName)
    },
    {
        id: "bladeStorm", item: P("Green", "Quick"), name: "Blade Storm", cd: 12000,
        desc: "Orbiting black blade particles for 5s. Periodic damage in a small radius.",
        cast: (pid, itemName) => onPlayerClickBladeStorm(pid, itemName)
    },
    {
        id: "bladeDash", item: P("Light Gray", "Quick"), name: "Blade Dash", cd: 500,
        desc: "Short high-speed dash that damages each enemy once along the path.",
        cast: (pid, itemName) => onPlayerClickBladeDash(pid, itemName)
    },
    {
        id: "fullPunch", item: P("Black", "Seeking"), name: "Full Punch", cd: 20000,
        desc: "Click a lifeform to cage them in punching black cubes and deal DoT.",
        cast: (pid, itemName, alt, x, y, z, b, t) => onPlayerClickfullPunch(pid, itemName, alt, x, y, z, b, t)
    },
    {
        id: "concreteWheel", item: P("Gray", "Quick"), name: "Concrete Wheel", cd: 16000,
        desc: "Toggle into a rolling wheel. Crush on contact; shockwave on landing.",
        cast: (pid, itemName) => onPlayerClickConcreteWheel(pid, itemName)
    },
    {
        id: "growingRay", item: P("Pink", "Quick"), name: "Growing Ray", cd: 5000,
        desc: "A red concrete beam grows from your hand until it hits or maxes out, then explodes.",
        cast: (pid, itemName) => onPlayerClickGrowingRay(pid, itemName)
    },
    {
        id: "predatorMark", item: P("Orange", "Seeking"), name: "Predator Mark", cd: 4500,
        desc: "Mark a target. They take +30% damage from your abilities for a few seconds.",
        cast: (pid, itemName, alt, x, y, z, b, t) => onPlayerClickMark(pid, itemName, alt, x, y, z, b, t)
    },
    {
        id: "phasing", item: P("Light Gray", "Sticky"), name: "Phasing", cd: 16000,
        desc: "Walk through the blocks around you, immune to damage, but Weakness 6.",
        cast: (pid) => onPlayerClickGhostPhase(pid)
    },
    {
        id: "spectralPrison", item: P("Green", "Seeking"), name: "Spectral Prison", cd: 20000,
        desc: "Trap nearby enemies in glass cubes, then run out with Speed and Regen.",
        cast: (pid, itemName) => onPlayerClickSpectralPrison(pid, itemName)
    },
];

/* FRUIT OWNERSHIP — ability ids granted by each fruit. */
const FRUIT_ABILITY_TABLE = {
    //common
    Rocket:   ["rocketLaunch",  "jumpBeacon", "damage"],
    Spin:     ["domainOfSpeed", "speed"],
    Blade:    ["bladeDash",     "spinBlade", "speed"],
    Spring:   ["windBlade",     "bounce", "jump"],
    Bomb:     ["cataclysm",     "bombDash", "damage"],
    Smoke:    ["smokeFog",      "smokeShroud", "speed"],
    Spike:    ["spikeField",    "damage"],
    //uncommon
    Flame:    ["rocketLaunch",  "crimsonBeam", "meteorShower", "damage"],
    Ice:      ["shatterfrost",  "geyserBurst", "speed", "air"],
    Sand:     ["seismicStomp",  "", "damage_reduc"],
    Dark:     ["voidVortex",    "voidAnchor", "damage", "speed"],
    Eagle:    ["clawRip",       "controlSlash", "speed", "air"],
    Diamond:  ["crystalReco",   "damage_reduc", "speed", "regen"],
    //rare
    Light:    ["fruitShot",     "judgmentBeam", "air"],
    Rubber:   ["elasticPunch",  "growingRay", "damage"],
    Ghost:    ["phasing",       "spectralPrison", "invisible"],
    Magma:    ["magmaRings",    "meteorShower", "lavaJet", "damage"],
    //legendary
    Quakes:   ["seismicStomp",  "chainLightning"],
    Buddha:   ["damage", "damage_reduc"],
    Love:     ["regen"],
    Creation: ["manifestGolem"],
    Spider:   ["wall"],
    Song:     ["regen", "dissonantWave", "petalRefrain"],
    Phoenix:  ["regen", "damage", "air"],
    Portal:   ["portalStep", "portalRift", "speed"],
    Lightning:["chainLightning", "thunderStrike", "speed", "damage"],
    Pain:     ["damage", "air", "painPulse", "tomatoTether"],
    Blizzard: ["frostfall", "shatterfrost", "speed"],
    //mythical
    Gravity: ["jump", "gravityBarrage", "gravityGrab", "gravityDevastation"],
    Mammoth:  ["damage_reduc"],
    "T-Rex":  ["damage"],
    Dought:   ["fullPunch", "concreteWheel", "growingRay"],
    Shadow:   [], 
    Venom:    [], 
    Gas:      ["speed", "tomatoTether"], 
    Spirit:   ["invisible"], 
    Tiger:    ["predatorMark", "clawRip", "tigerForm"], 
    Yeti:     [], 
    Kitsune:  ["speed"],
    Control:  ["controlDomain", "controlSlash", "controlShambles"], 
    Dragon:   ["damage", "predatorMark"],
};

const FRUIT_BLOCKS = {
    Rocket: "Bone Block", Spin: "Leather Block", Blade: "Plum Block", Spring: "Watermelon",
    Bomb: "Beetroot Block", Smoke: "Diorite", Spike: "Fat Cactus", Flame: "Mango Block",
    Ice: "Ice", Sand: "Sand", Dark: "Obsidian", Eagle: "Brown Mushroom Block",
    Diamond: "Block of Diamond", Light: "Pear Block", Rubber: "Engraved Granite", Ghost: "Glass",
    Magma: "Magma", Quakes: "Ice Bricks", Buddha: "Banana Block", Love: "Cherry Block",
    Creation: "Bookshelf", Spider: "Block of Coal", Song: "Potato Block", Phoenix: "Corn Block",
    Portal: "Bread Block", Lightning: "Diamond Ore", Pain: "Pumpkin", Blizzard: "Block of Moonstone",
    Gravity: "Moonstone Ore", Mammoth: "Engraved Andesite", "T-Rex": "Carrot Block", Dought: "Bedrock",
    Shadow: "Red Mushroom Block", Venom: "Block of Iron", Gas: "Apple Block", Spirit: "Chili Pepper Block",
    Tiger: "Snow", Yeti: "Custom Lobby Block", Kitsune: "Snowy Messy Stone", Control: "Stone",
    Dragon: "Pine Cone Block"
};

const BIND_BY_ID = {};
const ITEM_TO_BIND = {};
for (const bind of ABILITY_BINDS) {
    BIND_BY_ID[bind.id] = bind;
    ITEM_TO_BIND[bind.item] = bind;
}

const ABILITY_HOOKS = {
    domainOfSpeed: { leave: onPlayerLeaveSpring },
    voidVortex: { leave: onPlayerLeaveVortex },
    voidAnchor: { leave: onPlayerLeaveVortex },
    seismicStomp: { leave: onPlayerLeaveSeismic },
    predatorMark: { leave: onPlayerLeaveMark },
    fruitShot: { leave: onPlayerLeaveFruit },
    fullPunch: { join: onPlayerJoinPaint, leave: onPlayerLeaveDought },
    concreteWheel: { join: onPlayerJoinPaint, leave: onPlayerLeaveDought },
    growingRay: { join: onPlayerJoinPaint, leave: onPlayerLeaveDought },
    judgmentBeam: { join: onPlayerJoinPaint, leave: onPlayerLeavePaint },
    spinBlade: { join: onPlayerJoinPaint, leave: onPlayerLeavePaint },
    cataclysm: { join: onPlayerJoinPaint, leave: onPlayerLeavePaint },
    bombDash: { join: onPlayerJoinPaint, leave: onPlayerLeavePaint },
    bladeStorm: { join: onPlayerJoinPaint, leave: onPlayerLeavePaint },
    bladeDash: { join: onPlayerJoinPaint, leave: onPlayerLeavePaint },
    spikeField: { join: onPlayerJoinPaint, leave: onPlayerLeavePaint },
    portalStep: { leave: onPlayerLeavePortal },
    portalRift: { leave: onPlayerLeavePortal },
    smokeFog: { leave: onPlayerLeaveSmoke },
    smokeShroud: { leave: onPlayerLeaveSmoke },
    elasticPunch: { leave: onPlayerLeaveRubber },
    crystalReco: { leave: onPlayerLeaveDiamond },
    phasing: { leave: onPlayerLeaveGhost },
    spectralPrison: { leave: onPlayerLeaveGhost },
    painPulse: { leave: onPlayerLeavePain },
    tomatoTether: { leave: onPlayerLeaveGas },
    dissonantWave: { leave: onPlayerLeaveSong },
    petalRefrain: { leave: onPlayerLeaveSong },
    manifestGolem: { leave: onPlayerLeaveCreation },
    clawRip: { leave: onPlayerLeaveTiger },
    frostfall: { leave: onPlayerLeaveBlizzard },
    shatterfrost: { leave: onPlayerLeaveBlizzard },
    magmaRings: { leave: onPlayerLeaveLava },
    lavaJet: { leave: onPlayerLeaveLava },
    meteorShower: { leave: onPlayerLeaveMeteorShower },
    controlDomain: { leave: onPlayerLeaveControl },
    controlSlash: { leave: onPlayerLeaveControl },
    controlShambles: { leave: onPlayerLeaveControl },
    tigerForm: { leave: onPlayerLeaveTigerForm },
    gravityBarrage: { leave: onPlayerLeaveGravity },
    gravityGrab: { leave: onPlayerLeaveGravity },
    gravityDevastation: { leave: onPlayerLeaveGravity },
};

export const FRUIT_ABILITIES = {};

for (const fruitName in FRUIT_ABILITY_TABLE) {
    const binds = (FRUIT_ABILITY_TABLE[fruitName] || []).map(id => BIND_BY_ID[id]).filter(Boolean);
    const entry = {
        baseItem: { type: FRUIT_BLOCKS[fruitName], attributes: { customDisplayName: fruitName } },
        giveditems: binds.map(b => ({
            type: b.item,
            amount: 1,
            attributes: {
                customDisplayName: b.name,
                customDescription: b.desc
            }
        }))
    };
     for (let i = 0; i < binds.length; i++) {
         const bind = binds[i];
         const attack = {
             clicked: bind.item,
             name: bind.name,
             cooldown: bind.cd || 900,
             onClick: (playerId, isAlt, x, y, z, block, target) =>
                 bind.cast(playerId, bind.item, isAlt, x, y, z, block, target)
         };

         if (bind.up) attack.onPlayerClickUp = (playerId, isAlt, x, y, z, block, target) =>
             bind.up(playerId, bind.item, isAlt, x, y, z, block, target);
         entry["attack" + (i + 1)] = attack;
     }
    if (!binds.length) {
        entry.abilities = "none";
    } else {
        let onJoin = null, onLeave = null;
        for (const b of binds) {
            const hooks = ABILITY_HOOKS[b.id];
            if (hooks && hooks.join) onJoin = hooks.join;
            if (hooks && hooks.leave) onLeave = hooks.leave;
        }
        if (onJoin || onLeave) entry.hooks = { onJoin: onJoin, onLeave: onLeave };
    }
    FRUIT_ABILITIES[fruitName] = entry;
}

export function hasFruitAbilities(fruitName) {
    const ability = FRUIT_ABILITIES[fruitName];
    return !!ability && !!ability.giveditems && ability.giveditems.length > 0;
}

export function isAbilityItemName(name) {
    return !!name && !!ITEM_TO_BIND[name];
}

export function isHoldingAbilityItem(playerId) {
    let held = null;
    try { held = api.getHeldItem(playerId) } catch (e) { return false }
    return !!(held && held.name && ITEM_TO_BIND[held.name]);
}

export function abilityJoin(playerId) {
    for (const fruitName in FRUIT_ABILITIES) {
        const onJoin = FRUIT_ABILITIES[fruitName].hooks && FRUIT_ABILITIES[fruitName].hooks.onJoin;
        if (onJoin) { try { onJoin(playerId) } catch (e) { api.log("ability join " + fruitName + ": " + e) } }
    }
}

export function abilityLeave(playerId) {
    for (const fruitName in FRUIT_ABILITIES) {
        const onLeave = FRUIT_ABILITIES[fruitName].hooks && FRUIT_ABILITIES[fruitName].hooks.onLeave;
        if (onLeave) { try { onLeave(playerId) } catch (e) { api.log("ability leave " + fruitName + ": " + e) } }
    }
}

export function abilityThrowable(playerId, throwableName, thrownEId) {
    try { onPlayerUsedThrowablePaint(playerId, throwableName, thrownEId) } catch (e) {}
}

export function abilityThrowableHit(playerId, throwableName, thrownEId) {
    try { onPlayerThrowableHitTerrainPaint(playerId, throwableName, thrownEId) } catch (e) {}
}

export function abilityCollision(eId, otherEId) {
    try { if (onEntityCollisionFruit(eId, otherEId)) return true } catch (e) {}
    try { return onEntityCollisionPaint(eId, otherEId) } catch (e) { return false }
}