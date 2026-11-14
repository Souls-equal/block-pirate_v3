import assert from "node:assert/strict";
import {
    applyDamageBonus,
    applyDefenseReduction,
    getDamageBonusForPoints,
    getPvPDamageBonusForPoints,
    getDefenseReductionForPoints,
    getPvPDefenseReductionForPoints,
} from "../src/gameplay/combat-stats.js";

const SP_PER_LEVEL = 3;
const BASE_HIT = 20;
const PLAYER_HIT_INTERVAL = 0.8;
const MOB_HIT_INTERVAL = 1.5;

function healthForPoints(points) {
    return 100
        + 20 * Math.min(points, 50)
        + 15 * Math.min(Math.max(points - 50, 0), 50)
        + 10 * Math.max(points - 100, 0);
}

function mobHealth(level) {
    return Math.round(20 + Math.pow(level, 1.6) * 8);
}

function mobDamage(level) {
    return Math.round(3 + Math.pow(level, 1.3) * 0.8);
}

function simulate(playerLevel, mobLevel) {
    // Expected whole-career allocation from the requested distribution.
    const earned = SP_PER_LEVEL * (playerLevel - 1);
    const allocation = {
        stamina: earned * 0.03,
        regen: earned * 0.07,
        damage: earned * 0.40,
        defense: earned * 0.25,
        health: earned * 0.25,
    };
    assert.ok(Math.abs(Object.values(allocation).reduce((sum, points) => sum + points, 0) - earned) < 1e-8);
    const damagePoints = allocation.damage;
    const defensePoints = allocation.defense;
    const healthPoints = allocation.health;
    const player = {
        hp: healthForPoints(healthPoints),
        damage: applyDamageBonus(BASE_HIT, getDamageBonusForPoints(damagePoints)),
        defense: getDefenseReductionForPoints(defensePoints),
    };
    const mob = { hp: mobHealth(mobLevel), damage: mobDamage(mobLevel) };

    let elapsed = 0;
    let nextPlayerHit = 0;
    let nextMobHit = MOB_HIT_INTERVAL;
    let playerHits = 0;
    let mobHits = 0;
    while (player.hp > 0 && mob.hp > 0 && elapsed < 120) {
        elapsed = Math.min(nextPlayerHit, nextMobHit);
        if (nextPlayerHit === elapsed) {
            mob.hp = Math.max(0, mob.hp - player.damage);
            playerHits++;
            nextPlayerHit += PLAYER_HIT_INTERVAL;
        }
        if (mob.hp > 0 && nextMobHit === elapsed) {
            player.hp -= applyDefenseReduction(mob.damage, player.defense);
            mobHits++;
            nextMobHit += MOB_HIT_INTERVAL;
        }
    }
    return { playerLevel, mobLevel, won: mob.hp <= 0, elapsed, playerHits, mobHits,
        remainingPlayerHp: Math.max(0, player.hp), playerDamage: player.damage,
        mobHp: mobHealth(mobLevel), mobHitDamage: applyDefenseReduction(mob.damage, player.defense) };
}

function simulateEqualLevelDuel(level) {
    const earned = SP_PER_LEVEL * (level - 1);
    const damagePoints = earned * 0.40;
    const defensePoints = earned * 0.25;
    const healthPoints = earned * 0.25;
    const maxHp = healthForPoints(healthPoints);
    const hit = applyDefenseReduction(
        applyDamageBonus(BASE_HIT, getPvPDamageBonusForPoints(damagePoints)),
        getPvPDefenseReductionForPoints(defensePoints),
    );
    let aHp = maxHp;
    let bHp = maxHp;
    let hits = 0;
    while (aHp > 0 && bHp > 0 && hits < 1000) {
        bHp -= hit;
        hits++;
        if (bHp <= 0) break;
        aHp -= hit;
        hits++;
    }
    return { level, hits, hit, elapsed: Math.max(0, hits - 1) * PLAYER_HIT_INTERVAL,
        remainingHp: Math.max(aHp, bHp, 0) };
}

const duel = simulateEqualLevelDuel(165);
assert.ok(duel.hits <= 30, "equal-level PvP should finish promptly under the requested stat allocation");
console.log(`165 vs 165 PvP: decisive in ${duel.hits} hits / ${duel.elapsed.toFixed(1)}s; ${duel.hit} damage per hit`);
assert.ok(getPvPDefenseReductionForPoints(1000) > getPvPDefenseReductionForPoints(492),
    "PvP Defense reduction must keep increasing as more points are invested");
assert.ok(getPvPDefenseReductionForPoints(1000) > 8,
    "PvP Defense reduction must not stop at the previous 8-point cap");
assert.ok(applyDefenseReduction(20, getPvPDefenseReductionForPoints(492)) >= 10,
    "even a defense-heavy build should take meaningful damage from a 20-damage hit");

const battles = [simulate(10, 15), simulate(1500, 1505)];
for (const battle of battles) {
    assert.equal(battle.won, true, `level ${battle.playerLevel} should beat level ${battle.mobLevel}`);
    assert.ok(battle.remainingPlayerHp > 0, "player should survive the simulated fight");
    console.log(`${battle.playerLevel} vs ${battle.mobLevel}: win in ${battle.playerHits} hits / ${battle.elapsed.toFixed(1)}s; `
        + `player hit ${battle.playerDamage}, mob hit ${battle.mobHitDamage}, HP left ${battle.remainingPlayerHp.toFixed(1)}`);
}

assert.equal(applyDamageBonus(20, 0), 20);
assert.equal(applyDefenseReduction(20, 0), 20);
assert.equal(applyDefenseReduction(20, 100), 1, "a mob hit always deals at least one damage");
