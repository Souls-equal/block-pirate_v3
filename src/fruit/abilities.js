// fruit/abilities.js

import { getFruit } from "./index";
import { FRUITS_BY_RARITY as FRUIT_TABLE } from "./fruitData";
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
    onPlayerClickRocketBarrage,
    onPlayerClickPropellerFlight,
    onPlayerClickTwisterSlash,
    onPlayerClickSpringCannon,
    onPlayerClickLandmineField,
    onPlayerClickWhiteBlow,
    onPlayerClickSpikeRoll,
    onPlayerClickThornVolley,
    onPlayerClickFireFist,
    onPlayerClickFlamePillar,
    onPlayerClickIceSpears,
    onPlayerClickGlacialAge,
    onPlayerClickDesertSpada,
    onPlayerClickSandstorm,
    onPlayerClickQuicksandPit,
    onPlayerClickBlackHole,
    onPlayerClickDarkLiberation,
    onPlayerClickFalconDive,
    onPlayerClickFeatherBarrage,
    onPlayerClickDiamondTackle,
    onPlayerClickPrismReflect,
    onPlayerClickSacredJewel,
    onPlayerClickLightFlashStep,
    onPlayerClickGatlingBarrage,
    onPlayerClickGearWhip,
    onPlayerClickHollowBurst,
    onPlayerClickSoulScream,
    onPlayerClickMagmaHound,
    onPlayerClickQuakeBubble,
    onPlayerClickSeaTilt,
    onPlayerClickFissureLine,
    onPlayerClickGoldenPalm,
    onPlayerClickHeavenlyImpact,
    onPlayerClickDharmaSanctuary,
    onPlayerClickTwilightBeams,
    onPlayerClickMeroArrow,
    onPlayerClickPerfumeFemur,
    onPlayerClickSlaveArrowRain,
    onPlayerClickHeartCharm,
    onPlayerClickAnvilDrop,
    onPlayerClickArcaneTurret,
    onPlayerClickBastionWall,
    onPlayerClickStringSlash,
    onPlayerClickWebSnare,
    onPlayerClickOverheatWhip,
    onPlayerClickSkyWalkThread,
    onPlayerClickCrescendoFinale,
    onPlayerClickSirenHypnosis,
    onPlayerClickEncoreBeat,
    onPlayerClickBlueFlameWings,
    onPlayerClickPhoenixTalon,
    onPlayerClickRebirthNova,
    onPlayerClickDimensionalGate,
    onPlayerClickWarpBarrage,
    onPlayerClickRaigoCloud,
    onPlayerClickVoltStep,
    onPlayerClickThunderGodAura,
    onPlayerClickPadCannon,
    onPlayerClickUrsusShock,
    onPlayerClickRepelStep,
    onPlayerClickBlizzardTornado,
    onPlayerClickGravityWell,
    onPlayerClickMammothStampede,
    onPlayerClickTuskGore,
    onPlayerClickTrunkTrumpet,
    onPlayerClickExtinctionQuake,
    onPlayerClickTrexBite,
    onPlayerClickTailSwipe,
    onPlayerClickPredatorRoar,
    onPlayerClickMeteoricRampage,
    onPlayerClickMochiBuzzsaw,
    onPlayerClickUnstoppableDonuts,
    onPlayerClickBrickBat,
    onPlayerClickDoppelmanSwap,
    onPlayerClickShadowBox,
    onPlayerClickShadowsAsgard,
    onPlayerClickHydraSerpent,
    onPlayerClickToxicCloud,
    onPlayerClickVenomRoad,
    onPlayerClickVenomDemon,
    onPlayerClickGastilleBeam,
    onPlayerClickGasRobe,
    onPlayerClickCombustionNova,
    onPlayerClickSoulPocus,
    onPlayerClickZeusBolt,
    onPlayerClickPrometheusSun,
    onPlayerClickSovereignDominion,
    onPlayerClickFingerPistol,
    onPlayerClickFeralMaul,
    onPlayerClickAvalancheBoulder,
    onPlayerClickAbominableRoar,
    onPlayerClickPermafrostSlam,
    onPlayerClickFoxFireOrbs,
    onPlayerClickTailsSweep,
    onPlayerClickMirageDash,
    onPlayerClickNineTailsCataclysm,
    onPlayerClickGammaKnife,
    onPlayerClickCounterShock,
    onPlayerClickBoroBreath,
    onPlayerClickDragonTwister,
    onPlayerClickDraconicAscent,
    onPlayerUsedThrowablePaint,
    onPlayerThrowableHitTerrainPaint,
} from "./func-abilities";
import { applyEffect, withEffectSource } from "../utils/combat";

function P(color, kind) {
    if (kind) return color + " " + kind + " Paintball Explosive Item";
    else return color + " Paintball Explosive Item";
}

function castUpgrade(pid, effectName, duration, level, soundName, rate) {
    applyEffect(pid, effectName, duration, { inbuiltLevel: level });
    try {
        const p = api.getPosition(pid);
        if (p) {
            api.broadcastSound(soundName || "exp_levelup", 0.85, rate || 1.15, {
                playerIdOrPos: p,
                maxHearDist: 22,
            });
        }
    } catch (e) {}
    try {
        api.animateEntity(pid, {
            animationDurationMs: 420,
            loop: false,
            nodeAnimations: {
                ArmLeftMesh: {
                    timeline: [
                        { timeFraction: 0, rotation: { point: [0, 0, 0] } },
                        { timeFraction: 0.45, rotation: { point: [-2.2, 0, -0.35] } },
                        { timeFraction: 1, rotation: { point: [0, 0, 0] } },
                    ],
                },
                ArmRightMesh: {
                    timeline: [
                        { timeFraction: 0, rotation: { point: [0, 0, 0] } },
                        { timeFraction: 0.45, rotation: { point: [-2.2, 0, 0.35] } },
                        { timeFraction: 1, rotation: { point: [0, 0, 0] } },
                    ],
                },
            },
        });
    } catch (e) {}
    return true;
}

/* UNE ENTREE D'ABILITY_BINDS — les six cles de la table, posees une fois.

   Chaque entree etait ecrite a la main :

       {
           id: "gravityBarrage", item: P("Black", "Quick"), name: "Gravity Barrage", cd: 4000,
           desc: "…",
           cast: (pid, itemName) => onPlayerClickGravityBarrage(pid, itemName)
       },

   143 entrees repetaient exactement ca, `cast` compris. La fabrique prend les
   six valeurs DANS L'ORDRE de la table :

       A(id, item, name, cooldown, handler, description)

   `cast` est appele avec huit arguments (playerId, item, isAlt, x, y, z, block,
   target) : la fabrique ne transmet que les deux premiers, comme le faisait
   chaque lambda. Les 16 aptitudes qui lisent les autres arguments (castUpgrade,
   Rocket, Fruit) gardent leur objet ecrit a la main. */
function A(id, item, name, cd, handler, desc) {
    return {
        id: id, item: item, name: name, cd: cd, desc: desc,
        cast: function (pid, itemName) { return handler(pid, itemName); },
    };
}

const ABILITY_BINDS = [
    // --- Existing abilities ---
    A("gravityBarrage", P("Black", "Quick"), "Gravity Barrage", 4000, onPlayerClickGravityBarrage, "Tear up to 24 blocks out of the ground you are aiming at, hold them over your head, and fire them one by one at what is in front of you: 60 each."),
    A("gravityGrab", P("Gray", "Sticky"), "Gravity Grab", 500, onPlayerClickGravityGrab, "Hold the first thing in your aim - a player, a mob, a block - for six seconds. Click again to throw it: 95 for a person, and a block comes back at them as a shard for 133."),
    A("gravityDevastation", P("Purple", "Seeking"), "Gravity Planet", 18000, onPlayerClickGravityDevastation, "Raise a core above you, wrap up to 150 blocks of the ground around you into a small planet, and drop the whole thing where you look: 420 at the middle, less the further out you get thrown."),
    A("tigerForm", P("Yellow", "Quick"), "Tiger Form", 3500, onPlayerClickTigerForm, "Leap onto all fours and wear the tiger: paws on your limbs, a head and a tail at your back, and claws that open on anything in front of the leap. Sixteen seconds, six more with every leap."),
    A("controlDomain", P("Blue", "Quick"), "Control Domain", 15000, onPlayerClickControlDomain, "Close a room of blue glass around you for 32 seconds: inside it you decide where players and mobs stand, where players look, and what their floor is worth."),
    A("controlSlash", P("Blue", "Seeking"), "Control Slash", 900, onPlayerClickControlSlash, "A thin blade of will flies where you look and cuts the first thing it meets. Inside your own room it is huge, and a wall it bites hands its blocks to your orbit."),
    A("controlShambles", P("Cyan", "Seeking"), "Shambles Disc", 8000, onPlayerClickControlShambles, "Throw a violet disc: it hovers, drags everyone in, then bursts and throws them out of your room."),
    A("meteorShower", P("Gray", "Seeking"), "Meteor Shower", 18000, onPlayerClickMeteorShower, "Call down six falling rocks around the block you click: one after the other, each one crushes what it lands on."),
    A("magmaRings", P("Red", "Sticky"), "Magma Rings", 9000, onPlayerClickMagmaRings, "Three pools of lava settle on the ground around you and cook whoever stands in them."),
    A("lavaJet", P("Orange", "Quick"), "Lava Jet", 5500, onPlayerClickLavaJet, "Heave a slow arc of molten rock: it burns what it passes through and leaves a puddle where it lands."),
    A("manifestGolem", P("Gray", "Seeking"), "Manifest Golem", 30000, onPlayerClickManifestGolem, "Shape a spirit golem bound to you: it hunts whatever is closest to you for 24 s, then unravels."),
    A("clawRip", P("Orange", "Sticky"), "Claw Rip", 8000, onPlayerClickClawRip, "Launch one huge swipe: three separated claw marks fly out and carve anything they cross."),
    A("frostfall", P("Light Blue", "Sticky"), "Frostfall", 20000, onPlayerClickFrostfall, "Drop a snowstorm where you look: the longer you stand in the falling snow, the deeper the chill."),
    A("shatterfrost", P("Light Blue", "Quick"), "Shatterfrost", 11000, onPlayerClickShatterfrost, "Snap the frost: an ice ring bites, and everyone you have chilled shatters for their stacks."),
    A("petalRefrain", P("Magenta", "Sticky"), "Petal Refrain", 18000, onPlayerClickPetalRefrain, "A circle of falling petals: inside it you regenerate while the bloom cuts your enemies."),
    A("dissonantWave", P("Pink", "Sticky"), "Dissonant Wave", 7000, onPlayerClickDissonantWave, "A pink-green cone of sound erupts from you and shreds everything in front of you for 10 blocks."),
    A("thunderStrike", P("Yellow", "Sticky"), "Thunder Strike", 9000, onPlayerClickThunderStrike, "Call a bolt on the block you look at: it falls after a beat and blasts a big zone."),
    A("tomatoTether", P("Red", "Seeking"), "Crimson Tether", 12000, onPlayerClickGasTether, "Tie the closest enemy in reach: a crimson thread drains them and kills their jump while you stay close."),
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
    A("elasticPunch", P("White", "Sticky"), "Elastic Punch", 1100, onPlayerClickRubberPunch, "Your fist becomes a stretched clay block, shoots forward and smashes everything on its way."),
    {
        id: "speed", item: P("Light Blue"), name: "Speed Upgrade", cd: 15000,
        desc: "Get the speed effect for a certain time.",
        cast: (pid) => castUpgrade(pid, "Speed", 10000, 2, "magicAccent3", 1.35)
    },
    {
        id: "damage", item: P("Red"), name: "Damage Upgrade", cd: 15000,
        desc: "Get the damage effect for a certain time.",
        cast: (pid) => castUpgrade(pid, "Damage", 10000, 2, "ominousBellHit", 1.2)
    },
    {
        id: "damage_reduc", item: P("Gray"), name: "Protection Upgrade", cd: 15000,
        desc: "Get the damage reduction effect for a certain time.",
        cast: (pid) => castUpgrade(pid, "Damage Reduction", 10000, 2, "ominousBellHit", 0.9)
    },
    {
        id: "regen", item: P("Pink"), name: "Regen Upgrade", cd: 15000,
        desc: "Get the health regen effect for a certain time.",
        cast: (pid) => castUpgrade(pid, "Health Regen", 10000, 3, "magicAccent4", 1.25)
    },
    {
        id: "bounce", item: P("Lime"), name: "Bounciness Upgrade", cd: 15000,
        desc: "Get the bounciness effect for a certain time.",
        cast: (pid) => castUpgrade(pid, "Bounciness", 10000, 1, "exp_levelup", 1.35)
    },
    {
        id: "wall", item: P("Cyan"), name: "Wall Climbing Upgrade", cd: 15000,
        desc: "Get the wall climbing effect for a certain time.",
        cast: (pid) => castUpgrade(pid, "Wall Climbing", 10000, 1, "magicAccent1", 1.2)
    },
    {
        id: "air", item: P("Light Gray"), name: "Air Walk Upgrade", cd: 15000,
        desc: "Get the air walk effect for a certain time.",
        cast: (pid) => castUpgrade(pid, "Air Walk", 10000, 1, "magicAccent3", 1.45)
    },
    {
        id: "jump", item: P("Green"), name: "Jump Boost Upgrade", cd: 15000,
        desc: "Get the jump boost effect for a certain time.",
        cast: (pid) => castUpgrade(pid, "Jump Boost", 10000, 2, "bigDrumSwish1", 1.25)
    },
    {
        id: "invisible", item: P("White"), name: "Invisible Upgrade", cd: 15000,
        desc: "Get the invisible effect for a certain time.",
        cast: (pid) => castUpgrade(pid, "Invisible", 10000, 2, "futureStrangePulse", 1.35)
    },
    A("domainOfSpeed", P("Blue", "Sticky"), "Domain of Speed", 10000, onPlayerClickSpring, "Be faster inside. Enemies take damage and are slowed."),
    A("spinBlade", P("Brown", "Quick"), "Spin Blade", 10000, onPlayerClickSpinBlade, "A black blade spins around you for several seconds, cutting nearby foes."),
    A("windBlade", P("Lime", "Quick"), "Wind Blade", 4000, onPlayerClickWindblade, "A green crescent slash that travels forward and cuts foes."),
    A("cataclysm", P("Black", "Sticky"), "Cataclysm", 6500, onPlayerClickCataclysm, "Huge explosion centered on you. Heavy AoE damage."),
    A("bombDash", P("Orange", "Quick"), "Bomb Dash", 1500, onPlayerClickBombDash, "Burst damage around you, then dash hard in your look direction."),
    A("spikeField", P("Green", "Sticky"), "Spike Field", 10000, onPlayerClickSpikeField, "Random black concrete spikes erupt around you, then vanish. AoE damage."),
    A("crimsonBeam", P("Red", "Quick"), "Crimson Beam", 2000, onPlayerClickLaser, "Long-range laser in your look direction. Hits once per target."),
    A("geyserBurst", P("Cyan", "Sticky"), "Geyser Burst", 9000, onPlayerClickGeyser, "Water column erupts under the aimed spot and launches enemies up."),
    A("smokeFog", P("Light Gray", "Sticky"), "Choking Fog", 25000, onPlayerClickSmokeFog, "A huge fog bank (20s) around you: everyone inside slowly loses health and is slowed."),
    A("smokeShroud", P("Gray", "Quick"), "Smoke Shroud", 18000, onPlayerClickSmokeShroud, "A cloud locks onto the enemy you hit, drains and slows it, then collapses around it."),
    A("seismicStomp", P("Brown", "Sticky"), "Seismic Stomp", 5000, onPlayerClickSeismic, "Expanding shock ring. Knockback outward when the ring passes."),
    A("voidVortex", P("Purple", "Sticky"), "Void Vortex", 10000, onPlayerClickVortex, "Spiral pull in front of you, then a crushing collapse."),
    A("voidAnchor", P("Black", "Seeking"), "Void Anchor", 7000, onPlayerClickAnchor, "Plant a delayed anchor that pulls, then explodes."),
    {
        id: "fruitShot", item: P("Magenta", "Quick"), name: "Light Shot", cd: 3000,
        desc: "Physical projectile with a particle trail. Explodes on hit.",
        cast: (pid, itemName, alt) => onPlayerClickFruit(pid, itemName, alt)
    },
    A("judgmentBeam", P("Light Blue", "Seeking"), "Judgment Beam", 5000, onPlayerClickJudgmentBeam, "Raycast a glass domain at your crosshair, fire a yellow beam, deal heavy zone damage."),
    A("chainLightning", P("Yellow", "Seeking"), "Chain Lightning", 7000, onPlayerClickLightning, "Lightning jumps between nearby enemies with a falling trail."),
    {
        id: "rocketLaunch", item: P("White", "Seeking"), name: "Rocket Launch", cd: 2000,
        desc: "Click a target to blast them upward with rocket smoke under their feet.",
        cast: (pid, itemName, alt, x, y, z, b, t) => onPlayerClickRocket(pid, itemName, alt, x, y, z, b, t)
    },
    A("portalStep", P("Purple", "Sticky"), "Portal Step", 1800, onPlayerClickPortal, "Teleport onto the surface you look at. Blocked by walls and unsafe landing spots."),
    A("portalRift", P("Purple", "Quick"), "Portal Rift", 2500, onPlayerClickPortalRift, "Tear a 3x4 window of void in front of you. It flies forward and slices everything it passes."),
    A("jumpBeacon", P("White", "Quick"), "Jump Beacon", 3500, onPlayerClickJumpBeacon, "Place a temporary Super Jump Pad with a vertical particle line."),
    A("bladeStorm", P("Green", "Quick"), "Blade Storm", 9000, onPlayerClickBladeStorm, "Orbiting black blade particles for 5s. Periodic damage in a small radius."),
    A("bladeDash", P("Light Gray", "Quick"), "Blade Dash", 1500, onPlayerClickBladeDash, "Short high-speed dash that damages each enemy once along the path."),
    {
        id: "fullPunch", item: P("Black", "Seeking"), name: "Full Punch", cd: 16000,
        desc: "Click a lifeform to cage them in punching black cubes and deal DoT.",
        cast: (pid, itemName, alt, x, y, z, b, t) => onPlayerClickfullPunch(pid, itemName, alt, x, y, z, b, t)
    },
    A("concreteWheel", P("Gray", "Quick"), "Concrete Wheel", 14000, onPlayerClickConcreteWheel, "Toggle into a rolling wheel. Crush on contact; shockwave on landing."),
    A("growingRay", P("Pink", "Quick"), "Growing Ray", 5000, onPlayerClickGrowingRay, "A red concrete beam grows from your hand until it hits or maxes out, then explodes."),
    {
        id: "predatorMark", item: P("Orange", "Seeking"), name: "Predator Mark", cd: 4500,
        desc: "Mark a target. They take +30% damage from your abilities for a few seconds.",
        cast: (pid, itemName, alt, x, y, z, b, t) => onPlayerClickMark(pid, itemName, alt, x, y, z, b, t)
    },
    {
        id: "phasing", item: P("Light Gray", "Sticky"), name: "Phasing", cd: 15000,
        desc: "Walk through the blocks around you, immune to damage, but Weakness 6.",
        cast: (pid) => onPlayerClickGhostPhase(pid)
    },
    A("spectralPrison", P("Green", "Seeking"), "Spectral Prison", 16000, onPlayerClickSpectralPrison, "Trap nearby enemies in glass cubes, then run out with Speed and Regen."),

    // --- New Common & Uncommon abilities (300-common-uncommon-plus.js) ---
    A("rocketBarrage", P("Orange", "Seeking"), "Rocket Salvo", 5500, onPlayerClickRocketBarrage, "Fire three explosive micro-rockets in rapid succession toward your crosshair."),
    A("propellerFlight", P("Cyan", "Quick"), "Propeller Flight", 7000, onPlayerClickPropellerFlight, "Spin like a helicopter blade to lift into the air while slicing nearby foes."),
    A("twisterSlash", P("Green", "Sticky"), "Twister Slash", 5000, onPlayerClickTwisterSlash, "Send a spinning mini-whirlwind forward that knocks enemies into the air."),
    A("springCannon", P("Pink", "Sticky"), "Spring Cannon", 6500, onPlayerClickSpringCannon, "Coil elastic rings beneath your feet and catapult forward into a shockwave slam."),
    A("landmineField", P("Red", "Seeking"), "Landmine Scatter", 8500, onPlayerClickLandmineField, "Scatter four glowing mines around you that detonate in a chain of blasts."),
    A("whiteBlow", P("White", "Sticky"), "White Launcher", 5500, onPlayerClickWhiteBlow, "Blast a dense jet of white smoke forward that slows and knocks back enemies."),
    A("spikeRoll", P("Black", "Quick"), "Hedgehog Roll", 6000, onPlayerClickSpikeRoll, "Curl into a spiked ball and charge forward, impaling enemies in your path."),
    A("thornVolley", P("Brown", "Seeking"), "Thorn Volley", 4000, onPlayerClickThornVolley, "Fire a fan of five hardened thorn darts in front of you."),
    A("fireFist", P("Orange", "Sticky"), "Fire Fist", 5500, onPlayerClickFireFist, "Launch a giant blazing fist forward that explodes in a fiery shockwave."),
    A("flamePillar", P("Yellow", "Seeking"), "Flame Pillar", 9500, onPlayerClickFlamePillar, "Erupt a swirling column of fire around yourself that burns and knocks back foes."),
    A("iceSpears", P("Blue", "Seeking"), "Ice Partisan", 5500, onPlayerClickIceSpears, "Conjure three crystalline spears of ice and hurl them at your target to freeze them."),
    A("glacialAge", P("White", "Quick"), "Glacial Surge", 8000, onPlayerClickGlacialAge, "Send a wave of subzero frost along the ground that deeply chills enemies."),
    A("desertSpada", P("Yellow", "Quick"), "Desert Spada", 5000, onPlayerClickDesertSpada, "Slice the ground with a razor-sharp blade of golden sand for 14 blocks."),
    A("sandstorm", P("Orange", "Seeking"), "Sables Tornado", 8500, onPlayerClickSandstorm, "Summon a raging sandstorm at your crosshair that pulls foes in and launches them."),
    A("quicksandPit", P("Brown", "Quick"), "Quicksand Pit", 9500, onPlayerClickQuicksandPit, "Open a swirling pit of golden quicksand that drags and slows everyone inside."),
    A("blackHole", P("Purple", "Quick"), "Dark Matter", 8500, onPlayerClickBlackHole, "Spread a pool of abyssal darkness that swallows enemies before erupting."),
    A("darkLiberation", P("Gray", "Sticky"), "Liberation", 7000, onPlayerClickDarkLiberation, "Expel compressed dark debris from the sky around you in a crushing barrage."),
    A("falconDive", P("Yellow", "Sticky"), "Raptor Dive", 6500, onPlayerClickFalconDive, "Soar upward on golden wings and dive-bomb your target with a shockwave."),
    A("featherBarrage", P("Brown", "Seeking"), "Feather Volley", 4500, onPlayerClickFeatherBarrage, "Unleash a high-speed cone of razor-sharp feathers in front of you."),
    A("diamondTackle", P("Light Blue", "Seeking"), "Brilliant Punk", 6500, onPlayerClickDiamondTackle, "Harden into solid diamond and shoulder-tackle forward with heavy knockback."),
    A("prismReflect", P("White", "Sticky"), "Prism Nova", 9000, onPlayerClickPrismReflect, "Shatter a diamond prism aura around you, granting protection and blasting foes."),

    // --- New Rare & Legendary I abilities (310-rare-legendary-plus.js) ---
    A("sacredJewel", P("Yellow", "Quick"), "Sacred Jewel Volley", 7500, onPlayerClickSacredJewel, "Rain a barrage of golden light bolts onto the area you are aiming at."),
    A("lightFlashStep", P("Orange", "Sticky"), "Mirror Kick", 6000, onPlayerClickLightFlashStep, "Flash-step at light speed to your target and unleash a blinding kick."),
    A("gatlingBarrage", P("Red", "Seeking"), "Jet Gatling", 6500, onPlayerClickGatlingBarrage, "Unleash a high-speed flurry of elastic steam punches in front of you."),
    A("gearWhip", P("Orange", "Sticky"), "Elastomer Whip", 5500, onPlayerClickGearWhip, "Sweep a stretched leg in a wide arc that sends every nearby enemy flying."),
    A("hollowBurst", P("Cyan", "Seeking"), "Negative Hollow", 6500, onPlayerClickHollowBurst, "Send two wailing phantoms forward that pass through foes, sapping their speed and strength."),
    A("soulScream", P("Blue", "Quick"), "Banshee Wail", 9500, onPlayerClickSoulScream, "Release a chilling spectral scream that damages nearby foes and heals you."),
    A("magmaHound", P("Brown", "Seeking"), "Hellhound Maw", 7000, onPlayerClickMagmaHound, "Fire a surging hound of molten magma that bites and explodes on impact."),
    A("quakeBubble", P("White", "Quick"), "Air Crack", 6500, onPlayerClickQuakeBubble, "Shatter the air in front of you with a white tremor sphere that blasts enemies away."),
    A("seaTilt", P("Cyan", "Seeking"), "Tectonic Cataclysm", 12000, onPlayerClickSeaTilt, "Unleash four concentric seismic rings that tilt the battlefield and launch foes."),
    A("fissureLine", P("Gray", "Quick"), "Fault Line", 7500, onPlayerClickFissureLine, "Split the ground forward for 16 blocks in a chain of seismic eruptions."),
    A("goldenPalm", P("Yellow", "Quick"), "Enlightened Palm", 5500, onPlayerClickGoldenPalm, "Project a giant golden shockwave palm in front of you."),
    A("heavenlyImpact", P("Orange", "Sticky"), "Heavenly Descent", 9000, onPlayerClickHeavenlyImpact, "Leap skyward in a golden halo and crash down with a divine shockwave."),
    A("dharmaSanctuary", P("White", "Sticky"), "Golden Halo Aura", 13000, onPlayerClickDharmaSanctuary, "Unfold a golden mandala that grants you Damage Reduction + Regen while searing foes."),
    A("twilightBeams", P("Yellow", "Seeking"), "Retribution Pillars", 10000, onPlayerClickTwilightBeams, "Call down four pillars of golden light from the heavens around your target."),
    A("meroArrow", P("Pink", "Seeking"), "Love-Love Beam", 6000, onPlayerClickMeroArrow, "Fire a heart beam that petrifies enemies with extreme slowness and weakness."),
    A("perfumeFemur", P("Magenta", "Quick"), "Perfume Kick", 5500, onPlayerClickPerfumeFemur, "Dash forward in a whirl of pink petals, petrifying and launching foes."),
    A("slaveArrowRain", P("Red", "Quick"), "Cupid Arrow Storm", 9500, onPlayerClickSlaveArrowRain, "Rain a volley of glowing pink arrows over the target area."),
    A("heartCharm", P("White", "Seeking"), "Heart Sanctuary", 11000, onPlayerClickHeartCharm, "Release a burst of charm that heals you and weakens nearby enemies."),
    A("anvilDrop", P("Blue", "Sticky"), "Sacred Anvil", 7500, onPlayerClickAnvilDrop, "Manifest a massive runic anvil above your target that crushes the ground."),
    A("arcaneTurret", P("Cyan", "Seeking"), "Rune Orbs", 11000, onPlayerClickArcaneTurret, "Conjure three floating arcane orbs that automatically zap nearby enemies."),
    A("bastionWall", P("White", "Quick"), "Aegis Bastion", 10000, onPlayerClickBastionWall, "Materialize a runic bastion around yourself that grants protection and repels foes."),
    A("stringSlash", P("White", "Quick"), "Five-Color Strings", 4500, onPlayerClickStringSlash, "Lash five razor-thin chromatic strings forward in a wide fan."),
    A("webSnare", P("Light Gray", "Sticky"), "Spider Web Cage", 8500, onPlayerClickWebSnare, "Spin a dense web at your target location that snares and slices enemies."),
    A("overheatWhip", P("Orange", "Quick"), "Overheat Thread", 7500, onPlayerClickOverheatWhip, "Crack a superheated whip of fiery thread across 15 blocks that explodes on impact."),
    A("skyWalkThread", P("Cyan", "Quick"), "Sky String Leap", 6500, onPlayerClickSkyWalkThread, "Sling yourself through the air on a sky string while cutting foes below."),

    // --- New Legendary II & Mythical I abilities (320-legendary-mythical-plus.js) ---
    A("crescendoFinale", P("Cyan", "Quick"), "Requiem Crescendo", 9500, onPlayerClickCrescendoFinale, "Expand three concentric sonic rings around you that burst in a final chord."),
    A("sirenHypnosis", P("Purple", "Seeking"), "Siren Lullaby", 8500, onPlayerClickSirenHypnosis, "Allure nearby enemies with a hypnotic melody that pulls them in and drains health."),
    A("encoreBeat", P("Lime", "Seeking"), "Bass Drop", 6500, onPlayerClickEncoreBeat, "Drop a heavy sonic beat at your crosshair that launches enemies high into the air."),
    A("blueFlameWings", P("Cyan", "Quick"), "Immortal Blue Wings", 8000, onPlayerClickBlueFlameWings, "Soar on blue-gold phoenix flames, healing yourself and scorching nearby foes."),
    A("phoenixTalon", P("Light Blue", "Seeking"), "Bluebird Blitz", 5500, onPlayerClickPhoenixTalon, "Blitz forward wreathed in blue fire, tearing through enemies in your path."),
    A("rebirthNova", P("Orange", "Sticky"), "Ashes of Rebirth", 14000, onPlayerClickRebirthNova, "Detonate a massive nova of blue and golden phoenix fire that heals you and blasts foes."),
    A("dimensionalGate", P("Blue", "Seeking"), "Dimensional Loop", 8500, onPlayerClickDimensionalGate, "Open a rift beneath enemies in the target area and drop them from the sky."),
    A("warpBarrage", P("Cyan", "Quick"), "Rift Salvo", 7000, onPlayerClickWarpBarrage, "Open four mini-portals around you that fire dimensional blades at your target."),
    A("raigoCloud", P("Black", "Sticky"), "Raigo Stormcloud", 13000, onPlayerClickRaigoCloud, "Form a massive thundercloud above your target that rains lightning before detonating."),
    A("voltStep", P("Cyan", "Quick"), "Lightning Flash", 5000, onPlayerClickVoltStep, "Flash-step in an electric bolt through enemies in front of you, shocking them."),
    A("thunderGodAura", P("Blue", "Sticky"), "Discharge Nova", 8500, onPlayerClickThunderGodAura, "Release a high-voltage spherical discharge that paralyzes and blasts nearby foes."),
    A("padCannon", P("Pink", "Quick"), "Pressure Cannon", 5000, onPlayerClickPadCannon, "Fire compressed paw-shaped air shockwaves at blinding speed."),
    A("ursusShock", P("Black", "Seeking"), "Ursus Shock", 13000, onPlayerClickUrsusShock, "Compress a giant crimson air bomb that implodes in a catastrophic shockwave."),
    A("repelStep", P("White", "Sticky"), "Pain Repel", 7000, onPlayerClickRepelStep, "Repel all nearby enemies violently while shielding yourself from harm."),
    A("blizzardTornado", P("Cyan", "Seeking"), "Whiteout Cyclone", 9500, onPlayerClickBlizzardTornado, "Summon a howling polar cyclone that pulls in and freezes every enemy nearby."),
    A("gravityWell", P("Blue", "Sticky"), "Singularity Well", 10000, onPlayerClickGravityWell, "Crush a target zone under intense purple gravity, pinning enemies to the ground."),
    A("mammothStampede", P("Brown", "Quick"), "Prehistoric Stampede", 8000, onPlayerClickMammothStampede, "Charge forward as an unstoppable mammoth, trampling enemies with Damage Reduction."),
    A("tuskGore", P("White", "Quick"), "Ivory Tusk Launch", 5500, onPlayerClickTuskGore, "Swing giant ivory tusks upward to launch enemies high into the sky."),
    A("trunkTrumpet", P("Orange", "Seeking"), "Ancient Roar", 7500, onPlayerClickTrunkTrumpet, "Blast a prehistoric sonic roar in a cone that slows and knocks back enemies."),
    A("extinctionQuake", P("Black", "Sticky"), "Continental Crush", 13000, onPlayerClickExtinctionQuake, "Slam the earth with prehistoric force, triggering a massive continental tremor."),
    A("trexBite", P("Red", "Quick"), "Tyrant Jaws", 5000, onPlayerClickTrexBite, "Lunge forward and snap giant crimson jaws shut on your prey."),
    A("tailSwipe", P("Brown", "Sticky"), "Saurian Tail Whip", 6500, onPlayerClickTailSwipe, "Sweep a colossal tail around yourself that sends nearby enemies flying."),
    A("predatorRoar", P("Purple", "Seeking"), "King's Roar", 9000, onPlayerClickPredatorRoar, "Unleash an apex roar that marks all nearby enemies (+30% damage) and slows them."),
    A("meteoricRampage", P("Black", "Quick"), "Extinction Rampage", 12000, onPlayerClickMeteoricRampage, "Chain a ferociousfour-step rampage of bites and slashes in front of you."),
    A("mochiBuzzsaw", P("Yellow", "Sticky"), "Mochi Thrust", 6500, onPlayerClickMochiBuzzsaw, "Corkscrew forward in a spiral of sticky dough, battering and slowing foes."),
    A("unstoppableDonuts", P("Orange", "Seeking"), "Peerless Donuts", 11000, onPlayerClickUnstoppableDonuts, "Open three floating dough rings around your target that pummel the area."),
    A("brickBat", P("Black", "Quick"), "Brick Bat Swarm", 5000, onPlayerClickBrickBat, "Unleash a swarm of shadow bats that tear through enemies in front of you."),
    A("doppelmanSwap", P("Cyan", "Seeking"), "Shadow Swap", 6500, onPlayerClickDoppelmanSwap, "Project your shadow double forward and swap places in an umbral burst."),
    A("shadowBox", P("Blue", "Sticky"), "Black Box", 9000, onPlayerClickShadowBox, "Trap your target in a cube of dark shadows that violently implodes."),
    A("shadowsAsgard", P("Magenta", "Seeking"), "Night Sovereign", 14000, onPlayerClickShadowsAsgard, "Absorb surrounding shadows to buff your power and detonate an abyssal nova."),

    // --- New Mythical II abilities (330-mythical-apex-plus.js) ---
    A("hydraSerpent", P("Purple", "Quick"), "Venom Hydra", 6000, onPlayerClickHydraSerpent, "Launch three surging heads of toxic venom that poison and slow everything ahead."),
    A("toxicCloud", P("Green", "Sticky"), "Chloro Ball", 8500, onPlayerClickToxicCloud, "Spit a globe of concentrated venom that bursts into a lingering acid cloud."),
    A("venomRoad", P("Lime", "Quick"), "Serpent Slither", 6500, onPlayerClickVenomRoad, "Slither instantly through a tunnel of purple venom, poisoning foes along the way."),
    A("venomDemon", P("Black", "Sticky"), "Hell's Judgment", 14000, onPlayerClickVenomDemon, "Cloak yourself in a crimson venom demon aura that melts nearby enemies."),
    A("gastilleBeam", P("Cyan", "Quick"), "Gastille Laser", 5500, onPlayerClickGastilleBeam, "Fire a high-pressure beam of incandescent blue gas that explodes on impact."),
    A("gasRobe", P("Purple", "Sticky"), "Karakuni Vacuum", 9500, onPlayerClickGasRobe, "Strip the oxygen from a sphere around you, suffocating and paralyzing foes."),
    A("combustionNova", P("Orange", "Seeking"), "Miokiss Combustion", 13000, onPlayerClickCombustionNova, "Ignite volatile gas at your target in a massive thermobaric explosion."),
    A("soulPocus", P("Pink", "Sticky"), "Soul Pocus", 8000, onPlayerClickSoulPocus, "Project a wave of soul energy that drains life from nearby enemies to heal you."),
    A("zeusBolt", P("Yellow", "Quick"), "Hera Storm", 7000, onPlayerClickZeusBolt, "Call a storm spirit to strike nearby enemies with bolts of heavenly lightning."),
    A("prometheusSun", P("Orange", "Seeking"), "Prometheus Sun", 9500, onPlayerClickPrometheusSun, "Hurl a miniature blazing sun that detonates in a huge solar fireball."),
    A("sovereignDominion", P("Purple", "Quick"), "Combined Conquest", 14000, onPlayerClickSovereignDominion, "Fuse solar fire and storm lightning into a devastating cataclysmic spear."),
    A("fingerPistol", P("White", "Quick"), "Tempest Barrage", 5000, onPlayerClickFingerPistol, "Unleash a rapid volley of compressed golden air bullets."),
    A("feralMaul", P("Red", "Sticky"), "White Tiger Finisher", 11000, onPlayerClickFeralMaul, "Pounce at blinding speed onto your target and shred the area with a claw storm."),
    A("avalancheBoulder", P("Blue", "Seeking"), "Glacier Throw", 6500, onPlayerClickAvalancheBoulder, "Hurl a colossal chunk of glacier ice that shatters on impact."),
    A("abominableRoar", P("White", "Sticky"), "Subzero Roar", 8000, onPlayerClickAbominableRoar, "Bellow a freezing roar that locks nearby enemies in ice and blasts them back."),
    A("permafrostSlam", P("Cyan", "Quick"), "Permafrost Earthshatter", 12000, onPlayerClickPermafrostSlam, "Smash the ground with both fists, erupting jagged spires of permafrost."),
    A("foxFireOrbs", P("Cyan", "Seeking"), "Nine-Tails Foxfire", 5500, onPlayerClickFoxFireOrbs, "Conjure five azure foxfire orbs that streak toward your target and explode."),
    A("tailsSweep", P("Blue", "Sticky"), "Celestial Tails Lash", 6500, onPlayerClickTailsSweep, "Lash the area ahead with burning tails of azure and magenta spirit fire."),
    A("mirageDash", P("Pink", "Quick"), "Kitsune Illusion Step", 7000, onPlayerClickMirageDash, "Vanish in a burst of foxfire and reappear ahead with Speed and a spirit blast."),
    A("nineTailsCataclysm", P("Purple", "Seeking"), "Shrine Bomb", 13500, onPlayerClickNineTailsCataclysm, "Condense a massive sphere of nine-tails spirit fire and obliterate the target zone."),
    A("gammaKnife", P("Lime", "Quick"), "Gamma Knife", 7500, onPlayerClickGammaKnife, "Blink to your target and plunge a surgical blade of green radiation into them."),
    A("counterShock", P("Yellow", "Sticky"), "Counter Shock", 6500, onPlayerClickCounterShock, "Release a high-voltage defibrillator blast at point-blank range."),
    A("boroBreath", P("Orange", "Quick"), "Blast Breath", 12000, onPlayerClickBoroBreath, "Unleash a colossal torrent of golden-crimson dragon fire across 18 blocks."),
    A("dragonTwister", P("Green", "Sticky"), "Demolition Gust", 8500, onPlayerClickDragonTwister, "Whip up a draconic vortex that lifts enemies and slices them with wind blades."),
    A("draconicAscent", P("Red", "Sticky"), "Rising Dragon", 9500, onPlayerClickDraconicAscent, "Ascend in a spiral of crimson flames and lightning, blasting all nearby foes."),
];

/* FRUIT OWNERSHIP — ability ids granted by each fruit.
 * Progression par rareté :
 *   - Common    : 3 habilités
 *   - Uncommon  : 4 habilités
 *   - Rare      : 4 habilités puissantes
 *   - Legendary : 5 habilités
 *   - Mythical  : 5 habilités (avec compétences ultimes)
 */
const FRUIT_ABILITY_TABLE = {
    // Common (3 habilités)
    Rocket:   ["rocketLaunch", "rocketBarrage", "jumpBeacon"],
    Spin:     ["domainOfSpeed", "propellerFlight", "twisterSlash"],
    Blade:    ["bladeDash", "spinBlade", "bladeStorm"],
    Spring:   ["windBlade", "springCannon", "bounce"],
    Bomb:     ["bombDash", "cataclysm", "landmineField"],
    Smoke:    ["smokeFog", "smokeShroud", "whiteBlow"],
    Spike:    ["spikeField", "spikeRoll", "thornVolley"],

    // Uncommon (4 habilités)
    Flame:    ["crimsonBeam", "fireFist", "flamePillar", "rocketLaunch"],
    Ice:      ["shatterfrost", "geyserBurst", "iceSpears", "glacialAge"],
    Sand:     ["desertSpada", "sandstorm", "quicksandPit", "seismicStomp"],
    Dark:     ["voidVortex", "voidAnchor", "blackHole", "darkLiberation"],
    Eagle:    ["clawRip", "falconDive", "featherBarrage", "windBlade"],
    Diamond:  ["crystalReco", "diamondTackle", "prismReflect", "damage_reduc"],

    // Rare (4 habilités)
    Light:    ["fruitShot", "judgmentBeam", "sacredJewel", "lightFlashStep"],
    Rubber:   ["elasticPunch", "growingRay", "gatlingBarrage", "gearWhip"],
    Ghost:    ["phasing", "spectralPrison", "hollowBurst", "soulScream"],
    Magma:    ["magmaRings", "lavaJet", "meteorShower", "magmaHound"],

    // Legendary (5 habilités)
    Quakes:   ["seismicStomp", "quakeBubble", "seaTilt", "fissureLine", "cataclysm"],
    Buddha:   ["goldenPalm", "heavenlyImpact", "dharmaSanctuary", "twilightBeams", "judgmentBeam"],
    Love:     ["meroArrow", "perfumeFemur", "slaveArrowRain", "heartCharm", "petalRefrain"],
    Creation: ["manifestGolem", "anvilDrop", "arcaneTurret", "bastionWall", "growingRay"],
    Spider:   ["stringSlash", "webSnare", "overheatWhip", "skyWalkThread", "tomatoTether"],
    Song:     ["dissonantWave", "petalRefrain", "crescendoFinale", "sirenHypnosis", "encoreBeat"],
    Phoenix:  ["blueFlameWings", "phoenixTalon", "rebirthNova", "flamePillar", "meteorShower"],
    Portal:   ["portalStep", "portalRift", "dimensionalGate", "warpBarrage", "voidAnchor"],
    Lightning:["chainLightning", "thunderStrike", "raigoCloud", "voltStep", "thunderGodAura"],
    Pain:     ["painPulse", "tomatoTether", "padCannon", "ursusShock", "repelStep"],
    Blizzard: ["frostfall", "shatterfrost", "blizzardTornado", "iceSpears", "glacialAge"],

    // Mythical (5 habilités)
    Gravity:  ["gravityBarrage", "gravityGrab", "gravityDevastation", "gravityWell", "meteorShower"],
    Mammoth:  ["mammothStampede", "tuskGore", "trunkTrumpet", "extinctionQuake", "seismicStomp"],
    "T-Rex":  ["trexBite", "tailSwipe", "predatorRoar", "meteoricRampage", "clawRip"],
    Dought:   ["fullPunch", "concreteWheel", "growingRay", "mochiBuzzsaw", "unstoppableDonuts"],
    Shadow:   ["brickBat", "doppelmanSwap", "shadowBox", "shadowsAsgard", "voidVortex"],
    Venom:    ["hydraSerpent", "toxicCloud", "venomRoad", "venomDemon", "tomatoTether"],
    Gas:      ["gastilleBeam", "gasRobe", "combustionNova", "tomatoTether", "smokeFog"],
    Spirit:   ["soulPocus", "zeusBolt", "prometheusSun", "sovereignDominion", "spectralPrison"],
    Tiger:    ["predatorMark", "clawRip", "tigerForm", "fingerPistol", "feralMaul"],
    Yeti:     ["avalancheBoulder", "abominableRoar", "permafrostSlam", "frostfall", "shatterfrost"],
    Kitsune:  ["foxFireOrbs", "tailsSweep", "mirageDash", "nineTailsCataclysm", "clawRip"],
    Control:  ["controlDomain", "controlSlash", "controlShambles", "gammaKnife", "counterShock"],
    Dragon:   ["boroBreath", "dragonTwister", "draconicAscent", "meteorShower", "predatorMark"],
};

/* L'item réel d'un fruit vient de fruitData : une seule source de vérité pour
   le nom tenu en main, donc impossible de désynchroniser les deux tables. */
const FRUIT_BLOCKS = {};
for (const rarity in FRUIT_TABLE) {
    for (const fruit of FRUIT_TABLE[rarity]) {
        FRUIT_BLOCKS[fruit.rpName] = fruit.itemName;
    }
}

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
            /* withEffectSource : les effets appliqués par l'abilité
               héritent de la provenance "joueur|abilité", donc une même
               abilité ne s'empile pas elle-même (voir utils/combat). */
            onClick: (playerId, isAlt, x, y, z, block, target) =>
                withEffectSource(playerId, bind.id, () =>
                    bind.cast(playerId, bind.item, isAlt, x, y, z, block, target))
        };

        if (bind.up) attack.onPlayerClickUp = (playerId, isAlt, x, y, z, block, target) =>
            withEffectSource(playerId, bind.id, () =>
                bind.up(playerId, bind.item, isAlt, x, y, z, block, target));
        entry["attack" + (i + 1)] = attack;
    }
    if (!binds.length) {
        entry.abilities = "none";
    } else {
        const joinFns = [], leaveFns = [];
        for (const b of binds) {
            const hooks = ABILITY_HOOKS[b.id];
            if (hooks && hooks.join && !joinFns.includes(hooks.join)) joinFns.push(hooks.join);
            if (hooks && hooks.leave && !leaveFns.includes(hooks.leave)) leaveFns.push(hooks.leave);
        }
        if (joinFns.length || leaveFns.length) {
            entry.hooks = {
                onJoin: joinFns.length
                    ? (pid) => { for (const fn of joinFns) { try { fn(pid); } catch (e) {} } }
                    : null,
                onLeave: leaveFns.length
                    ? (pid) => { for (const fn of leaveFns) { try { fn(pid); } catch (e) {} } }
                    : null,
            };
        }
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
    try { held = api.getHeldItem(playerId); } catch (e) { return false; }
    return !!(held && held.name && ITEM_TO_BIND[held.name]);
}

export function abilityJoin(playerId) {
    for (const fruitName in FRUIT_ABILITIES) {
        const onJoin = FRUIT_ABILITIES[fruitName].hooks && FRUIT_ABILITIES[fruitName].hooks.onJoin;
        if (onJoin) { try { onJoin(playerId); } catch (e) { api.log("ability join " + fruitName + ": " + e); } }
    }
}

export function abilityLeave(playerId) {
    try {
        if (globalThis.FA && globalThis.FA.clearMythic) {
            globalThis.FA.clearMythic(playerId);
        }
    } catch (e) {}
    for (const fruitName in FRUIT_ABILITIES) {
        const onLeave = FRUIT_ABILITIES[fruitName].hooks && FRUIT_ABILITIES[fruitName].hooks.onLeave;
        if (onLeave) { try { onLeave(playerId); } catch (e) { api.log("ability leave " + fruitName + ": " + e); } }
    }
}

export function abilityThrowable(playerId, throwableName, thrownEId) {
    try { onPlayerUsedThrowablePaint(playerId, throwableName, thrownEId); } catch (e) {}
}

export function abilityThrowableHit(playerId, throwableName, thrownEId) {
    try { onPlayerThrowableHitTerrainPaint(playerId, throwableName, thrownEId); } catch (e) {}
}

export function abilityCollision(eId, otherEId) {
    try { if (onEntityCollisionFruit(eId, otherEId)) return true; } catch (e) {}
    try { return onEntityCollisionPaint(eId, otherEId); } catch (e) { return false; }
}
