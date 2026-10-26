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
} from "./func-abilities";
import { applyEffect } from "../utils/combat";

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

const ABILITY_BINDS = [
    // --- Existing abilities ---
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
        id: "tomatoTether", item: P("Red", "Seeking"), name: "Crimson Tether", cd: 12000,
        desc: "Tie the closest enemy in reach: a crimson thread drains them and kills their jump while you stay close.",
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
        id: "bombDash", item: P("Orange", "Quick"), name: "Bomb Dash", cd: 1500,
        desc: "Burst damage around you, then dash hard in your look direction.",
        cast: (pid, itemName) => onPlayerClickBombDash(pid, itemName)
    },
    {
        id: "spikeField", item: P("Green", "Sticky"), name: "Spike Field", cd: 10000,
        desc: "Random black concrete spikes erupt around you, then vanish. AoE damage.",
        cast: (pid, itemName) => onPlayerClickSpikeField(pid, itemName)
    },
    {
        id: "crimsonBeam", item: P("Red", "Quick"), name: "Crimson Beam", cd: 2000,
        desc: "Long-range laser in your look direction. Hits once per target.",
        cast: (pid, itemName) => onPlayerClickLaser(pid, itemName)
    },
    {
        id: "geyserBurst", item: P("Cyan", "Sticky"), name: "Geyser Burst", cd: 9000,
        desc: "Water column erupts under the aimed spot and launches enemies up.",
        cast: (pid, itemName) => onPlayerClickGeyser(pid, itemName)
    },
    {
        id: "smokeFog", item: P("Light Gray", "Sticky"), name: "Choking Fog", cd: 25000,
        desc: "A huge fog bank (20s) around you: everyone inside slowly loses health and is slowed.",
        cast: (pid, itemName) => onPlayerClickSmokeFog(pid, itemName)
    },
    {
        id: "smokeShroud", item: P("Gray", "Quick"), name: "Smoke Shroud", cd: 18000,
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
        id: "fruitShot", item: P("Magenta", "Quick"), name: "Light Shot", cd: 3000,
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
        id: "rocketLaunch", item: P("White", "Seeking"), name: "Rocket Launch", cd: 2000,
        desc: "Click a target to blast them upward with rocket smoke under their feet.",
        cast: (pid, itemName, alt, x, y, z, b, t) => onPlayerClickRocket(pid, itemName, alt, x, y, z, b, t)
    },
    {
        id: "portalStep", item: P("Purple", "Sticky"), name: "Portal Step", cd: 1800,
        desc: "Teleport onto the surface you look at. Blocked by walls and unsafe landing spots.",
        cast: (pid, itemName) => onPlayerClickPortal(pid, itemName)
    },
    {
        id: "portalRift", item: P("Purple", "Quick"), name: "Portal Rift", cd: 2500,
        desc: "Tear a 3x4 window of void in front of you. It flies forward and slices everything it passes.",
        cast: (pid, itemName) => onPlayerClickPortalRift(pid, itemName)
    },
    {
        id: "jumpBeacon", item: P("White", "Quick"), name: "Jump Beacon", cd: 3500,
        desc: "Place a temporary Super Jump Pad with a vertical particle line.",
        cast: (pid, itemName) => onPlayerClickJumpBeacon(pid, itemName)
    },
    {
        id: "bladeStorm", item: P("Green", "Quick"), name: "Blade Storm", cd: 9000,
        desc: "Orbiting black blade particles for 5s. Periodic damage in a small radius.",
        cast: (pid, itemName) => onPlayerClickBladeStorm(pid, itemName)
    },
    {
        id: "bladeDash", item: P("Light Gray", "Quick"), name: "Blade Dash", cd: 1500,
        desc: "Short high-speed dash that damages each enemy once along the path.",
        cast: (pid, itemName) => onPlayerClickBladeDash(pid, itemName)
    },
    {
        id: "fullPunch", item: P("Black", "Seeking"), name: "Full Punch", cd: 16000,
        desc: "Click a lifeform to cage them in punching black cubes and deal DoT.",
        cast: (pid, itemName, alt, x, y, z, b, t) => onPlayerClickfullPunch(pid, itemName, alt, x, y, z, b, t)
    },
    {
        id: "concreteWheel", item: P("Gray", "Quick"), name: "Concrete Wheel", cd: 14000,
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
        id: "phasing", item: P("Light Gray", "Sticky"), name: "Phasing", cd: 15000,
        desc: "Walk through the blocks around you, immune to damage, but Weakness 6.",
        cast: (pid) => onPlayerClickGhostPhase(pid)
    },
    {
        id: "spectralPrison", item: P("Green", "Seeking"), name: "Spectral Prison", cd: 16000,
        desc: "Trap nearby enemies in glass cubes, then run out with Speed and Regen.",
        cast: (pid, itemName) => onPlayerClickSpectralPrison(pid, itemName)
    },

    // --- New Common & Uncommon abilities (300-common-uncommon-plus.js) ---
    {
        id: "rocketBarrage", item: P("Orange", "Seeking"), name: "Rocket Salvo", cd: 5500,
        desc: "Fire three explosive micro-rockets in rapid succession toward your crosshair.",
        cast: (pid, itemName) => onPlayerClickRocketBarrage(pid, itemName)
    },
    {
        id: "propellerFlight", item: P("Cyan", "Quick"), name: "Propeller Flight", cd: 7000,
        desc: "Spin like a helicopter blade to lift into the air while slicing nearby foes.",
        cast: (pid, itemName) => onPlayerClickPropellerFlight(pid, itemName)
    },
    {
        id: "twisterSlash", item: P("Green", "Sticky"), name: "Twister Slash", cd: 5000,
        desc: "Send a spinning mini-whirlwind forward that knocks enemies into the air.",
        cast: (pid, itemName) => onPlayerClickTwisterSlash(pid, itemName)
    },
    {
        id: "springCannon", item: P("Pink", "Sticky"), name: "Spring Cannon", cd: 6500,
        desc: "Coil elastic rings beneath your feet and catapult forward into a shockwave slam.",
        cast: (pid, itemName) => onPlayerClickSpringCannon(pid, itemName)
    },
    {
        id: "landmineField", item: P("Red", "Seeking"), name: "Landmine Scatter", cd: 8500,
        desc: "Scatter four glowing mines around you that detonate in a chain of blasts.",
        cast: (pid, itemName) => onPlayerClickLandmineField(pid, itemName)
    },
    {
        id: "whiteBlow", item: P("White", "Sticky"), name: "White Launcher", cd: 5500,
        desc: "Blast a dense jet of white smoke forward that slows and knocks back enemies.",
        cast: (pid, itemName) => onPlayerClickWhiteBlow(pid, itemName)
    },
    {
        id: "spikeRoll", item: P("Black", "Quick"), name: "Hedgehog Roll", cd: 6000,
        desc: "Curl into a spiked ball and charge forward, impaling enemies in your path.",
        cast: (pid, itemName) => onPlayerClickSpikeRoll(pid, itemName)
    },
    {
        id: "thornVolley", item: P("Brown", "Seeking"), name: "Thorn Volley", cd: 4000,
        desc: "Fire a fan of five hardened thorn darts in front of you.",
        cast: (pid, itemName) => onPlayerClickThornVolley(pid, itemName)
    },
    {
        id: "fireFist", item: P("Orange", "Sticky"), name: "Fire Fist", cd: 5500,
        desc: "Launch a giant blazing fist forward that explodes in a fiery shockwave.",
        cast: (pid, itemName) => onPlayerClickFireFist(pid, itemName)
    },
    {
        id: "flamePillar", item: P("Yellow", "Seeking"), name: "Flame Pillar", cd: 9500,
        desc: "Erupt a swirling column of fire around yourself that burns and knocks back foes.",
        cast: (pid, itemName) => onPlayerClickFlamePillar(pid, itemName)
    },
    {
        id: "iceSpears", item: P("Blue", "Seeking"), name: "Ice Partisan", cd: 5500,
        desc: "Conjure three crystalline spears of ice and hurl them at your target to freeze them.",
        cast: (pid, itemName) => onPlayerClickIceSpears(pid, itemName)
    },
    {
        id: "glacialAge", item: P("White", "Quick"), name: "Glacial Surge", cd: 8000,
        desc: "Send a wave of subzero frost along the ground that deeply chills enemies.",
        cast: (pid, itemName) => onPlayerClickGlacialAge(pid, itemName)
    },
    {
        id: "desertSpada", item: P("Yellow", "Quick"), name: "Desert Spada", cd: 5000,
        desc: "Slice the ground with a razor-sharp blade of golden sand for 14 blocks.",
        cast: (pid, itemName) => onPlayerClickDesertSpada(pid, itemName)
    },
    {
        id: "sandstorm", item: P("Orange", "Seeking"), name: "Sables Tornado", cd: 8500,
        desc: "Summon a raging sandstorm at your crosshair that pulls foes in and launches them.",
        cast: (pid, itemName) => onPlayerClickSandstorm(pid, itemName)
    },
    {
        id: "quicksandPit", item: P("Brown", "Quick"), name: "Quicksand Pit", cd: 9500,
        desc: "Open a swirling pit of golden quicksand that drags and slows everyone inside.",
        cast: (pid, itemName) => onPlayerClickQuicksandPit(pid, itemName)
    },
    {
        id: "blackHole", item: P("Purple", "Quick"), name: "Dark Matter", cd: 8500,
        desc: "Spread a pool of abyssal darkness that swallows enemies before erupting.",
        cast: (pid, itemName) => onPlayerClickBlackHole(pid, itemName)
    },
    {
        id: "darkLiberation", item: P("Gray", "Sticky"), name: "Liberation", cd: 7000,
        desc: "Expel compressed dark debris from the sky around you in a crushing barrage.",
        cast: (pid, itemName) => onPlayerClickDarkLiberation(pid, itemName)
    },
    {
        id: "falconDive", item: P("Yellow", "Sticky"), name: "Raptor Dive", cd: 6500,
        desc: "Soar upward on golden wings and dive-bomb your target with a shockwave.",
        cast: (pid, itemName) => onPlayerClickFalconDive(pid, itemName)
    },
    {
        id: "featherBarrage", item: P("Brown", "Seeking"), name: "Feather Volley", cd: 4500,
        desc: "Unleash a high-speed cone of razor-sharp feathers in front of you.",
        cast: (pid, itemName) => onPlayerClickFeatherBarrage(pid, itemName)
    },
    {
        id: "diamondTackle", item: P("Light Blue", "Seeking"), name: "Brilliant Punk", cd: 6500,
        desc: "Harden into solid diamond and shoulder-tackle forward with heavy knockback.",
        cast: (pid, itemName) => onPlayerClickDiamondTackle(pid, itemName)
    },
    {
        id: "prismReflect", item: P("White", "Sticky"), name: "Prism Nova", cd: 9000,
        desc: "Shatter a diamond prism aura around you, granting protection and blasting foes.",
        cast: (pid, itemName) => onPlayerClickPrismReflect(pid, itemName)
    },

    // --- New Rare & Legendary I abilities (310-rare-legendary-plus.js) ---
    {
        id: "sacredJewel", item: P("Yellow", "Quick"), name: "Sacred Jewel Volley", cd: 7500,
        desc: "Rain a barrage of golden light bolts onto the area you are aiming at.",
        cast: (pid, itemName) => onPlayerClickSacredJewel(pid, itemName)
    },
    {
        id: "lightFlashStep", item: P("Orange", "Sticky"), name: "Mirror Kick", cd: 6000,
        desc: "Flash-step at light speed to your target and unleash a blinding kick.",
        cast: (pid, itemName) => onPlayerClickLightFlashStep(pid, itemName)
    },
    {
        id: "gatlingBarrage", item: P("Red", "Seeking"), name: "Jet Gatling", cd: 6500,
        desc: "Unleash a high-speed flurry of elastic steam punches in front of you.",
        cast: (pid, itemName) => onPlayerClickGatlingBarrage(pid, itemName)
    },
    {
        id: "gearWhip", item: P("Orange", "Sticky"), name: "Elastomer Whip", cd: 5500,
        desc: "Sweep a stretched leg in a wide arc that sends every nearby enemy flying.",
        cast: (pid, itemName) => onPlayerClickGearWhip(pid, itemName)
    },
    {
        id: "hollowBurst", item: P("Cyan", "Seeking"), name: "Negative Hollow", cd: 6500,
        desc: "Send two wailing phantoms forward that pass through foes, sapping their speed and strength.",
        cast: (pid, itemName) => onPlayerClickHollowBurst(pid, itemName)
    },
    {
        id: "soulScream", item: P("Blue", "Quick"), name: "Banshee Wail", cd: 9500,
        desc: "Release a chilling spectral scream that damages nearby foes and heals you.",
        cast: (pid, itemName) => onPlayerClickSoulScream(pid, itemName)
    },
    {
        id: "magmaHound", item: P("Brown", "Seeking"), name: "Hellhound Maw", cd: 7000,
        desc: "Fire a surging hound of molten magma that bites and explodes on impact.",
        cast: (pid, itemName) => onPlayerClickMagmaHound(pid, itemName)
    },
    {
        id: "quakeBubble", item: P("White", "Quick"), name: "Air Crack", cd: 6500,
        desc: "Shatter the air in front of you with a white tremor sphere that blasts enemies away.",
        cast: (pid, itemName) => onPlayerClickQuakeBubble(pid, itemName)
    },
    {
        id: "seaTilt", item: P("Cyan", "Seeking"), name: "Tectonic Cataclysm", cd: 12000,
        desc: "Unleash four concentric seismic rings that tilt the battlefield and launch foes.",
        cast: (pid, itemName) => onPlayerClickSeaTilt(pid, itemName)
    },
    {
        id: "fissureLine", item: P("Gray", "Quick"), name: "Fault Line", cd: 7500,
        desc: "Split the ground forward for 16 blocks in a chain of seismic eruptions.",
        cast: (pid, itemName) => onPlayerClickFissureLine(pid, itemName)
    },
    {
        id: "goldenPalm", item: P("Yellow", "Quick"), name: "Enlightened Palm", cd: 5500,
        desc: "Project a giant golden shockwave palm in front of you.",
        cast: (pid, itemName) => onPlayerClickGoldenPalm(pid, itemName)
    },
    {
        id: "heavenlyImpact", item: P("Orange", "Sticky"), name: "Heavenly Descent", cd: 9000,
        desc: "Leap skyward in a golden halo and crash down with a divine shockwave.",
        cast: (pid, itemName) => onPlayerClickHeavenlyImpact(pid, itemName)
    },
    {
        id: "dharmaSanctuary", item: P("White", "Sticky"), name: "Golden Halo Aura", cd: 13000,
        desc: "Unfold a golden mandala that grants you Damage Reduction + Regen while searing foes.",
        cast: (pid, itemName) => onPlayerClickDharmaSanctuary(pid, itemName)
    },
    {
        id: "twilightBeams", item: P("Yellow", "Seeking"), name: "Retribution Pillars", cd: 10000,
        desc: "Call down four pillars of golden light from the heavens around your target.",
        cast: (pid, itemName) => onPlayerClickTwilightBeams(pid, itemName)
    },
    {
        id: "meroArrow", item: P("Pink", "Seeking"), name: "Love-Love Beam", cd: 6000,
        desc: "Fire a heart beam that petrifies enemies with extreme slowness and weakness.",
        cast: (pid, itemName) => onPlayerClickMeroArrow(pid, itemName)
    },
    {
        id: "perfumeFemur", item: P("Magenta", "Quick"), name: "Perfume Kick", cd: 5500,
        desc: "Dash forward in a whirl of pink petals, petrifying and launching foes.",
        cast: (pid, itemName) => onPlayerClickPerfumeFemur(pid, itemName)
    },
    {
        id: "slaveArrowRain", item: P("Red", "Quick"), name: "Cupid Arrow Storm", cd: 9500,
        desc: "Rain a volley of glowing pink arrows over the target area.",
        cast: (pid, itemName) => onPlayerClickSlaveArrowRain(pid, itemName)
    },
    {
        id: "heartCharm", item: P("White", "Seeking"), name: "Heart Sanctuary", cd: 11000,
        desc: "Release a burst of charm that heals you and weakens nearby enemies.",
        cast: (pid, itemName) => onPlayerClickHeartCharm(pid, itemName)
    },
    {
        id: "anvilDrop", item: P("Blue", "Sticky"), name: "Sacred Anvil", cd: 7500,
        desc: "Manifest a massive runic anvil above your target that crushes the ground.",
        cast: (pid, itemName) => onPlayerClickAnvilDrop(pid, itemName)
    },
    {
        id: "arcaneTurret", item: P("Cyan", "Seeking"), name: "Rune Orbs", cd: 11000,
        desc: "Conjure three floating arcane orbs that automatically zap nearby enemies.",
        cast: (pid, itemName) => onPlayerClickArcaneTurret(pid, itemName)
    },
    {
        id: "bastionWall", item: P("White", "Quick"), name: "Aegis Bastion", cd: 10000,
        desc: "Materialize a runic bastion around yourself that grants protection and repels foes.",
        cast: (pid, itemName) => onPlayerClickBastionWall(pid, itemName)
    },
    {
        id: "stringSlash", item: P("White", "Quick"), name: "Five-Color Strings", cd: 4500,
        desc: "Lash five razor-thin chromatic strings forward in a wide fan.",
        cast: (pid, itemName) => onPlayerClickStringSlash(pid, itemName)
    },
    {
        id: "webSnare", item: P("Light Gray", "Sticky"), name: "Spider Web Cage", cd: 8500,
        desc: "Spin a dense web at your target location that snares and slices enemies.",
        cast: (pid, itemName) => onPlayerClickWebSnare(pid, itemName)
    },
    {
        id: "overheatWhip", item: P("Orange", "Quick"), name: "Overheat Thread", cd: 7500,
        desc: "Crack a superheated whip of fiery thread across 15 blocks that explodes on impact.",
        cast: (pid, itemName) => onPlayerClickOverheatWhip(pid, itemName)
    },
    {
        id: "skyWalkThread", item: P("Cyan", "Quick"), name: "Sky String Leap", cd: 6500,
        desc: "Sling yourself through the air on a sky string while cutting foes below.",
        cast: (pid, itemName) => onPlayerClickSkyWalkThread(pid, itemName)
    },

    // --- New Legendary II & Mythical I abilities (320-legendary-mythical-plus.js) ---
    {
        id: "crescendoFinale", item: P("Cyan", "Quick"), name: "Requiem Crescendo", cd: 9500,
        desc: "Expand three concentric sonic rings around you that burst in a final chord.",
        cast: (pid, itemName) => onPlayerClickCrescendoFinale(pid, itemName)
    },
    {
        id: "sirenHypnosis", item: P("Purple", "Seeking"), name: "Siren Lullaby", cd: 8500,
        desc: "Allure nearby enemies with a hypnotic melody that pulls them in and drains health.",
        cast: (pid, itemName) => onPlayerClickSirenHypnosis(pid, itemName)
    },
    {
        id: "encoreBeat", item: P("Lime", "Seeking"), name: "Bass Drop", cd: 6500,
        desc: "Drop a heavy sonic beat at your crosshair that launches enemies high into the air.",
        cast: (pid, itemName) => onPlayerClickEncoreBeat(pid, itemName)
    },
    {
        id: "blueFlameWings", item: P("Cyan", "Quick"), name: "Immortal Blue Wings", cd: 8000,
        desc: "Soar on blue-gold phoenix flames, healing yourself and scorching nearby foes.",
        cast: (pid, itemName) => onPlayerClickBlueFlameWings(pid, itemName)
    },
    {
        id: "phoenixTalon", item: P("Light Blue", "Seeking"), name: "Bluebird Blitz", cd: 5500,
        desc: "Blitz forward wreathed in blue fire, tearing through enemies in your path.",
        cast: (pid, itemName) => onPlayerClickPhoenixTalon(pid, itemName)
    },
    {
        id: "rebirthNova", item: P("Orange", "Sticky"), name: "Ashes of Rebirth", cd: 14000,
        desc: "Detonate a massive nova of blue and golden phoenix fire that heals you and blasts foes.",
        cast: (pid, itemName) => onPlayerClickRebirthNova(pid, itemName)
    },
    {
        id: "dimensionalGate", item: P("Blue", "Seeking"), name: "Dimensional Loop", cd: 8500,
        desc: "Open a rift beneath enemies in the target area and drop them from the sky.",
        cast: (pid, itemName) => onPlayerClickDimensionalGate(pid, itemName)
    },
    {
        id: "warpBarrage", item: P("Cyan", "Quick"), name: "Rift Salvo", cd: 7000,
        desc: "Open four mini-portals around you that fire dimensional blades at your target.",
        cast: (pid, itemName) => onPlayerClickWarpBarrage(pid, itemName)
    },
    {
        id: "raigoCloud", item: P("Black", "Sticky"), name: "Raigo Stormcloud", cd: 13000,
        desc: "Form a massive thundercloud above your target that rains lightning before detonating.",
        cast: (pid, itemName) => onPlayerClickRaigoCloud(pid, itemName)
    },
    {
        id: "voltStep", item: P("Cyan", "Quick"), name: "Lightning Flash", cd: 5000,
        desc: "Flash-step in an electric bolt through enemies in front of you, shocking them.",
        cast: (pid, itemName) => onPlayerClickVoltStep(pid, itemName)
    },
    {
        id: "thunderGodAura", item: P("Blue", "Sticky"), name: "Discharge Nova", cd: 8500,
        desc: "Release a high-voltage spherical discharge that paralyzes and blasts nearby foes.",
        cast: (pid, itemName) => onPlayerClickThunderGodAura(pid, itemName)
    },
    {
        id: "padCannon", item: P("Pink", "Quick"), name: "Pressure Cannon", cd: 5000,
        desc: "Fire compressed paw-shaped air shockwaves at blinding speed.",
        cast: (pid, itemName) => onPlayerClickPadCannon(pid, itemName)
    },
    {
        id: "ursusShock", item: P("Black", "Seeking"), name: "Ursus Shock", cd: 13000,
        desc: "Compress a giant crimson air bomb that implodes in a catastrophic shockwave.",
        cast: (pid, itemName) => onPlayerClickUrsusShock(pid, itemName)
    },
    {
        id: "repelStep", item: P("White", "Sticky"), name: "Pain Repel", cd: 7000,
        desc: "Repel all nearby enemies violently while shielding yourself from harm.",
        cast: (pid, itemName) => onPlayerClickRepelStep(pid, itemName)
    },
    {
        id: "blizzardTornado", item: P("Cyan", "Seeking"), name: "Whiteout Cyclone", cd: 9500,
        desc: "Summon a howling polar cyclone that pulls in and freezes every enemy nearby.",
        cast: (pid, itemName) => onPlayerClickBlizzardTornado(pid, itemName)
    },
    {
        id: "gravityWell", item: P("Blue", "Sticky"), name: "Singularity Well", cd: 10000,
        desc: "Crush a target zone under intense purple gravity, pinning enemies to the ground.",
        cast: (pid, itemName) => onPlayerClickGravityWell(pid, itemName)
    },
    {
        id: "mammothStampede", item: P("Brown", "Quick"), name: "Prehistoric Stampede", cd: 8000,
        desc: "Charge forward as an unstoppable mammoth, trampling enemies with Damage Reduction.",
        cast: (pid, itemName) => onPlayerClickMammothStampede(pid, itemName)
    },
    {
        id: "tuskGore", item: P("White", "Quick"), name: "Ivory Tusk Launch", cd: 5500,
        desc: "Swing giant ivory tusks upward to launch enemies high into the sky.",
        cast: (pid, itemName) => onPlayerClickTuskGore(pid, itemName)
    },
    {
        id: "trunkTrumpet", item: P("Orange", "Seeking"), name: "Ancient Roar", cd: 7500,
        desc: "Blast a prehistoric sonic roar in a cone that slows and knocks back enemies.",
        cast: (pid, itemName) => onPlayerClickTrunkTrumpet(pid, itemName)
    },
    {
        id: "extinctionQuake", item: P("Black", "Sticky"), name: "Continental Crush", cd: 13000,
        desc: "Slam the earth with prehistoric force, triggering a massive continental tremor.",
        cast: (pid, itemName) => onPlayerClickExtinctionQuake(pid, itemName)
    },
    {
        id: "trexBite", item: P("Red", "Quick"), name: "Tyrant Jaws", cd: 5000,
        desc: "Lunge forward and snap giant crimson jaws shut on your prey.",
        cast: (pid, itemName) => onPlayerClickTrexBite(pid, itemName)
    },
    {
        id: "tailSwipe", item: P("Brown", "Sticky"), name: "Saurian Tail Whip", cd: 6500,
        desc: "Sweep a colossal tail around yourself that sends nearby enemies flying.",
        cast: (pid, itemName) => onPlayerClickTailSwipe(pid, itemName)
    },
    {
        id: "predatorRoar", item: P("Purple", "Seeking"), name: "King's Roar", cd: 9000,
        desc: "Unleash an apex roar that marks all nearby enemies (+30% damage) and slows them.",
        cast: (pid, itemName) => onPlayerClickPredatorRoar(pid, itemName)
    },
    {
        id: "meteoricRampage", item: P("Black", "Quick"), name: "Extinction Rampage", cd: 12000,
        desc: "Chain a ferociousfour-step rampage of bites and slashes in front of you.",
        cast: (pid, itemName) => onPlayerClickMeteoricRampage(pid, itemName)
    },
    {
        id: "mochiBuzzsaw", item: P("Yellow", "Sticky"), name: "Mochi Thrust", cd: 6500,
        desc: "Corkscrew forward in a spiral of sticky dough, battering and slowing foes.",
        cast: (pid, itemName) => onPlayerClickMochiBuzzsaw(pid, itemName)
    },
    {
        id: "unstoppableDonuts", item: P("Orange", "Seeking"), name: "Peerless Donuts", cd: 11000,
        desc: "Open three floating dough rings around your target that pummel the area.",
        cast: (pid, itemName) => onPlayerClickUnstoppableDonuts(pid, itemName)
    },
    {
        id: "brickBat", item: P("Black", "Quick"), name: "Brick Bat Swarm", cd: 5000,
        desc: "Unleash a swarm of shadow bats that tear through enemies in front of you.",
        cast: (pid, itemName) => onPlayerClickBrickBat(pid, itemName)
    },
    {
        id: "doppelmanSwap", item: P("Cyan", "Seeking"), name: "Shadow Swap", cd: 6500,
        desc: "Project your shadow double forward and swap places in an umbral burst.",
        cast: (pid, itemName) => onPlayerClickDoppelmanSwap(pid, itemName)
    },
    {
        id: "shadowBox", item: P("Blue", "Sticky"), name: "Black Box", cd: 9000,
        desc: "Trap your target in a cube of dark shadows that violently implodes.",
        cast: (pid, itemName) => onPlayerClickShadowBox(pid, itemName)
    },
    {
        id: "shadowsAsgard", item: P("Magenta", "Seeking"), name: "Night Sovereign", cd: 14000,
        desc: "Absorb surrounding shadows to buff your power and detonate an abyssal nova.",
        cast: (pid, itemName) => onPlayerClickShadowsAsgard(pid, itemName)
    },

    // --- New Mythical II abilities (330-mythical-apex-plus.js) ---
    {
        id: "hydraSerpent", item: P("Purple", "Quick"), name: "Venom Hydra", cd: 6000,
        desc: "Launch three surging heads of toxic venom that poison and slow everything ahead.",
        cast: (pid, itemName) => onPlayerClickHydraSerpent(pid, itemName)
    },
    {
        id: "toxicCloud", item: P("Green", "Sticky"), name: "Chloro Ball", cd: 8500,
        desc: "Spit a globe of concentrated venom that bursts into a lingering acid cloud.",
        cast: (pid, itemName) => onPlayerClickToxicCloud(pid, itemName)
    },
    {
        id: "venomRoad", item: P("Lime", "Quick"), name: "Serpent Slither", cd: 6500,
        desc: "Slither instantly through a tunnel of purple venom, poisoning foes along the way.",
        cast: (pid, itemName) => onPlayerClickVenomRoad(pid, itemName)
    },
    {
        id: "venomDemon", item: P("Black", "Sticky"), name: "Hell's Judgment", cd: 14000,
        desc: "Cloak yourself in a crimson venom demon aura that melts nearby enemies.",
        cast: (pid, itemName) => onPlayerClickVenomDemon(pid, itemName)
    },
    {
        id: "gastilleBeam", item: P("Cyan", "Quick"), name: "Gastille Laser", cd: 5500,
        desc: "Fire a high-pressure beam of incandescent blue gas that explodes on impact.",
        cast: (pid, itemName) => onPlayerClickGastilleBeam(pid, itemName)
    },
    {
        id: "gasRobe", item: P("Purple", "Sticky"), name: "Karakuni Vacuum", cd: 9500,
        desc: "Strip the oxygen from a sphere around you, suffocating and paralyzing foes.",
        cast: (pid, itemName) => onPlayerClickGasRobe(pid, itemName)
    },
    {
        id: "combustionNova", item: P("Orange", "Seeking"), name: "Miokiss Combustion", cd: 13000,
        desc: "Ignite volatile gas at your target in a massive thermobaric explosion.",
        cast: (pid, itemName) => onPlayerClickCombustionNova(pid, itemName)
    },
    {
        id: "soulPocus", item: P("Pink", "Sticky"), name: "Soul Pocus", cd: 8000,
        desc: "Project a wave of soul energy that drains life from nearby enemies to heal you.",
        cast: (pid, itemName) => onPlayerClickSoulPocus(pid, itemName)
    },
    {
        id: "zeusBolt", item: P("Yellow", "Quick"), name: "Hera Storm", cd: 7000,
        desc: "Call a storm spirit to strike nearby enemies with bolts of heavenly lightning.",
        cast: (pid, itemName) => onPlayerClickZeusBolt(pid, itemName)
    },
    {
        id: "prometheusSun", item: P("Orange", "Seeking"), name: "Prometheus Sun", cd: 9500,
        desc: "Hurl a miniature blazing sun that detonates in a huge solar fireball.",
        cast: (pid, itemName) => onPlayerClickPrometheusSun(pid, itemName)
    },
    {
        id: "sovereignDominion", item: P("Purple", "Quick"), name: "Combined Conquest", cd: 14000,
        desc: "Fuse solar fire and storm lightning into a devastating cataclysmic spear.",
        cast: (pid, itemName) => onPlayerClickSovereignDominion(pid, itemName)
    },
    {
        id: "fingerPistol", item: P("White", "Quick"), name: "Tempest Barrage", cd: 5000,
        desc: "Unleash a rapid volley of compressed golden air bullets.",
        cast: (pid, itemName) => onPlayerClickFingerPistol(pid, itemName)
    },
    {
        id: "feralMaul", item: P("Red", "Sticky"), name: "White Tiger Finisher", cd: 11000,
        desc: "Pounce at blinding speed onto your target and shred the area with a claw storm.",
        cast: (pid, itemName) => onPlayerClickFeralMaul(pid, itemName)
    },
    {
        id: "avalancheBoulder", item: P("Blue", "Seeking"), name: "Glacier Throw", cd: 6500,
        desc: "Hurl a colossal chunk of glacier ice that shatters on impact.",
        cast: (pid, itemName) => onPlayerClickAvalancheBoulder(pid, itemName)
    },
    {
        id: "abominableRoar", item: P("White", "Sticky"), name: "Subzero Roar", cd: 8000,
        desc: "Bellow a freezing roar that locks nearby enemies in ice and blasts them back.",
        cast: (pid, itemName) => onPlayerClickAbominableRoar(pid, itemName)
    },
    {
        id: "permafrostSlam", item: P("Cyan", "Quick"), name: "Permafrost Earthshatter", cd: 12000,
        desc: "Smash the ground with both fists, erupting jagged spires of permafrost.",
        cast: (pid, itemName) => onPlayerClickPermafrostSlam(pid, itemName)
    },
    {
        id: "foxFireOrbs", item: P("Cyan", "Seeking"), name: "Nine-Tails Foxfire", cd: 5500,
        desc: "Conjure five azure foxfire orbs that streak toward your target and explode.",
        cast: (pid, itemName) => onPlayerClickFoxFireOrbs(pid, itemName)
    },
    {
        id: "tailsSweep", item: P("Blue", "Sticky"), name: "Celestial Tails Lash", cd: 6500,
        desc: "Lash the area ahead with burning tails of azure and magenta spirit fire.",
        cast: (pid, itemName) => onPlayerClickTailsSweep(pid, itemName)
    },
    {
        id: "mirageDash", item: P("Pink", "Quick"), name: "Kitsune Illusion Step", cd: 7000,
        desc: "Vanish in a burst of foxfire and reappear ahead with Speed and a spirit blast.",
        cast: (pid, itemName) => onPlayerClickMirageDash(pid, itemName)
    },
    {
        id: "nineTailsCataclysm", item: P("Purple", "Seeking"), name: "Shrine Bomb", cd: 13500,
        desc: "Condense a massive sphere of nine-tails spirit fire and obliterate the target zone.",
        cast: (pid, itemName) => onPlayerClickNineTailsCataclysm(pid, itemName)
    },
    {
        id: "gammaKnife", item: P("Lime", "Quick"), name: "Gamma Knife", cd: 7500,
        desc: "Blink to your target and plunge a surgical blade of green radiation into them.",
        cast: (pid, itemName) => onPlayerClickGammaKnife(pid, itemName)
    },
    {
        id: "counterShock", item: P("Yellow", "Sticky"), name: "Counter Shock", cd: 6500,
        desc: "Release a high-voltage defibrillator blast at point-blank range.",
        cast: (pid, itemName) => onPlayerClickCounterShock(pid, itemName)
    },
    {
        id: "boroBreath", item: P("Orange", "Quick"), name: "Blast Breath", cd: 12000,
        desc: "Unleash a colossal torrent of golden-crimson dragon fire across 18 blocks.",
        cast: (pid, itemName) => onPlayerClickBoroBreath(pid, itemName)
    },
    {
        id: "dragonTwister", item: P("Green", "Sticky"), name: "Demolition Gust", cd: 8500,
        desc: "Whip up a draconic vortex that lifts enemies and slices them with wind blades.",
        cast: (pid, itemName) => onPlayerClickDragonTwister(pid, itemName)
    },
    {
        id: "draconicAscent", item: P("Red", "Sticky"), name: "Rising Dragon", cd: 9500,
        desc: "Ascend in a spiral of crimson flames and lightning, blasting all nearby foes.",
        cast: (pid, itemName) => onPlayerClickDraconicAscent(pid, itemName)
    },
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
