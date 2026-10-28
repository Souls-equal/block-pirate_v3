// gameplay/fightingStyles.js

import {
    damage,
    eff,
    hitArea,
    hitSeg,
    impulse,
    lifeforms,
    setVel,
} from "../utils/combat";
import {
    facing,
    isAliveId,
    isPlayerAlive,
    posOf,
    safeEntityType,
    targetBlock,
} from "../utils/lifeform";
import {
    TEX,
    at as soundAt,
    boom,
    column,
    dist2,
    frame,
    norm,
    point,
    ring,
    seg,
} from "../utils/fx";
import { run, setTimeout as sTimeout, sleep } from "../utils/timer";
import { INVENTORY_SLOT_MAX } from "./customItem";
import { getTotalMoney, payMoney } from "../utils/data";
import { updateSidebarLight } from "../core/UI";

const FS_DB_KEY = "fs";

const m1Combo = {};
const freezeTok = {};

const COL_COMBAT = [
    [[255, 220, 110], [255, 130, 40]],
    [[175, 65, 20, 0], [255, 240, 185, 0]],
];
const COL_DARK = [
    [[255, 125, 30], [25, 20, 25]],
    [[15, 10, 15, 0], [255, 210, 75, 0]],
];
const COL_ELEC = [
    [[120, 245, 255], [255, 240, 95]],
    [[40, 150, 255, 0], [255, 220, 60, 0]],
];
const COL_WATER = [
    [[70, 200, 255], [220, 250, 255]],
    [[25, 110, 220, 0], [180, 240, 255, 0]],
];

function flatDir(pid) {
    const d = facing(pid);
    return norm([d[0], 0, d[2]]);
}

function shake(pid, intensity, ms) {
    try {
        api.shakePlayerCamera(pid, intensity || 0.38, ms || 320);
    } catch (e) {}
}

function isTargetable(id, caster) {
    return !!id && id !== caster && isAliveId(id) && safeEntityType(id) !== "NPC";
}

function burst(pos, r, tex, count, life, size, colors, power) {
    point(pos, { r, tex, count, life, size, colors, power: power || [0.5, 1.7] });
}

function halo(pos, r, n, tex, life, size, colors, power, phase) {
    ring(pos, r, n, { tex, life, size, colors, power: power || [0.6, 1.9] }, phase);
}

function lineFx(a, b, r, tex, count, life, size, colors) {
    seg(a, b, { r, tex, count, life, size, colors });
}

function kf(p0, pMid, p1) {
    return {
        timeline: [
            { timeFraction: 0, rotation: { point: p0 } },
            { timeFraction: 0.42, rotation: { point: pMid } },
            { timeFraction: 1, rotation: { point: p1 || [0, 0, 0] } },
        ],
    };
}

function anim(pid, dur, nodes) {
    try {
        api.animateEntity(pid, { animationDurationMs: dur, loop: false, nodeAnimations: nodes });
    } catch (e) {}
}

function posePunch(pid, rightHand, dur) {
    const yaw = rightHand ? 0.38 : -0.38;
    const nodes = { TorsoNode: kf([0, -yaw * 0.6, 0], [0.15, yaw, 0]) };
    nodes[rightHand ? "ArmRightMesh" : "ArmLeftMesh"] = kf([-0.6, 0, 0], [-1.65, yaw * 0.5, 0]);
    anim(pid, dur || 270, nodes);
}

function poseSlam(pid, dur) {
    anim(pid, dur || 460, {
        TorsoNode: kf([-0.35, 0, 0], [0.48, 0, 0]),
        ArmLeftMesh: kf([-2.6, 0, -0.25], [-0.35, 0, 0.2]),
        ArmRightMesh: kf([-2.6, 0, 0.25], [-0.35, 0, -0.2]),
    });
}

function poseKick(pid, rightLeg, dur) {
    const turn = rightLeg ? 0.45 : -0.45;
    const nodes = { TorsoNode: kf([-0.15, -turn, 0], [-0.35, turn, 0]) };
    nodes[rightLeg ? "LegRightMesh" : "LegLeftMesh"] = kf([0.4, 0, 0], [-1.75, 0, turn * 0.4]);
    anim(pid, dur || 300, nodes);
}

function pushOut(center, radius, caster, kbH, kbY) {
    const r2 = (radius + 1.4) * (radius + 1.4);
    const ids = lifeforms(caster);
    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        if (!isTargetable(id, caster)) continue;
        const q = posOf(id);
        if (!q || dist2(q, center) > r2) continue;
        const dx = q[0] - center[0];
        const dz = q[2] - center[2];
        const d = Math.sqrt(dx * dx + dz * dz) || 1;
        impulse(id, (dx / d) * kbH, kbY, (dz / d) * kbH);
    }
}

function pickMeleeTargets(pid, range, radius, clickedTarget) {
    const p = posOf(pid);
    if (!p) return null;
    const d = facing(pid);
    const c = [p[0] + d[0] * (range * 0.65), p[1] + 1.05 + d[1] * 0.9, p[2] + d[2] * (range * 0.65)];
    const out = [];
    const seen = {};
    if (isTargetable(clickedTarget, pid)) {
        const tPos = posOf(clickedTarget);
        if (tPos && dist2(tPos, p) <= (range + 2.5) * (range + 2.5)) {
            seen[clickedTarget] = 1;
            out.push(clickedTarget);
        }
    }
    const ids = lifeforms(pid);
    const r2 = (radius + 1.4) * (radius + 1.4);
    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        if (seen[id] || !isTargetable(id, pid)) continue;
        const q = posOf(id);
        if (q && (dist2(q, c) <= r2 || dist2(q, p) <= 6.25)) {
            seen[id] = 1;
            out.push(id);
        }
    }
    return { p, d, center: c, list: out };
}

function freezeEntity(tid, ms) {
    if (!isTargetable(tid, null)) return;
    const tok = (freezeTok[tid] = (freezeTok[tid] || 0) + 1);
    eff(tid, "Slowness", ms, { inbuiltLevel: 6 });
    const isPl = isPlayerAlive(tid);
    if (isPl) {
        try {
            api.setClientOption(tid, "speedMultiplier", 0);
        } catch (e) {}
    } else {
        setVel(tid, 0, 0, 0);
    }
    const ticks = Math.max(1, Math.ceil(ms / 50));
    sTimeout(function () {
        if (freezeTok[tid] === tok && isPl) {
            try {
                api.setClientOption(tid, "speedMultiplier", 1);
            } catch (e) {}
        }
    }, ticks);
    let step = 0;
    const maxSteps = Math.max(1, Math.floor(ticks / 2));
    run({
        next: function () {
            if (freezeTok[tid] !== tok || step >= maxSteps || !isAliveId(tid)) return { done: true };
            step++;
            if (!isPl) setVel(tid, 0, 0, 0);
            const q = posOf(tid);
            if (q) burst([q[0], q[1] + 1.0, q[2]], 0.45, TEX.glint, 5, [0.14, 0.28], [0.22, 0.44], COL_ELEC);
            return { value: sleep(2), done: false };
        },
    });
}

// ============================================================================
// 1. COMBAT (Combat Teacher — Gratuit / 0 Coins)
// ============================================================================

export function onPlayerClickCombatM1(pid, itemName, targetId) {
    const swing = (m1Combo[pid] = ((m1Combo[pid] || 0) + 1) & 1);
    posePunch(pid, swing === 1, 260);
    const m = pickMeleeTargets(pid, 4.0, 2.2, targetId);
    if (!m) return false;
    soundAt(pid, "bigDrumSwish1", 0.7, 1.25 + swing * 0.12, 18);
    burst(m.center, 0.35, TEX.crit, 12, [0.16, 0.32], [0.24, 0.48], COL_COMBAT);
    if (m.list.length > 0) {
        soundAt(m.center, "critical_hit", 0.8, 1.15, 20);
        for (let i = 0; i < m.list.length; i++) {
            const id = m.list[i];
            damage(id, 6, pid, "Combat Fist");
            impulse(id, m.d[0] * 3.8, 1.2, m.d[2] * 3.8);
        }
    }
    return true;
}

export function onPlayerClickCombatSmash(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    poseSlam(pid, 480);
    shake(pid, 0.48, 380);
    soundAt(pid, "cannonFire1", 0.95, 0.72, 26);
    soundAt(pid, "stoneBreak", 1.0, 0.7, 24);
    const c = [p[0], p[1] + 0.35, p[2]];
    boom(c, 3.0, { tex: TEX.crit, count: 30, colors: COL_COMBAT });
    halo(c, 2.6, 12, TEX.square, [0.24, 0.5], [0.3, 0.6], COL_COMBAT);
    halo(c, 5.2, 12, TEX.square, [0.24, 0.5], [0.3, 0.6], COL_COMBAT);
    hitArea(p, 5.6, pid, itemName, 13, { height: 3.4, slow: [2000, 2] });
    pushOut(p, 5.6, pid, 2.1, 0.85);
    return true;
}

export function onPlayerClickCombatGrab(pid, itemName) {
    if (!posOf(pid)) return true;
    const d = flatDir(pid);
    soundAt(pid, "bigDrumSwish2", 0.9, 1.1, 24);
    let grabbed = null;
    let step = 0;
    run({
        next: function () {
            const p = posOf(pid);
            if (!p || !isAliveId(pid)) return { done: true };
            step++;
            if (step <= 5) {
                impulse(pid, d[0] * 8.5, 0.25, d[2] * 8.5);
                const front = [p[0] + d[0] * 1.65, p[1] + 0.9, p[2] + d[2] * 1.65];
                burst(front, 0.4, TEX.crit, 8, [0.16, 0.32], [0.26, 0.5], COL_COMBAT);
                if (!grabbed || !isAliveId(grabbed)) {
                    const ids = lifeforms(pid);
                    let bestD2 = 12.25;
                    for (let i = 0; i < ids.length; i++) {
                        const id = ids[i];
                        if (!isTargetable(id, pid)) continue;
                        const q = posOf(id);
                        if (q && dist2(q, front) < bestD2) {
                            bestD2 = dist2(q, front);
                            grabbed = id;
                        }
                    }
                    if (grabbed) soundAt(front, "critical_hit", 0.85, 0.95, 22);
                }
                if (grabbed && isTargetable(grabbed, pid)) {
                    try {
                        api.setPosition(grabbed, front[0], p[1] + 0.35, front[2]);
                        setVel(grabbed, 0, 0, 0);
                    } catch (e) {}
                }
                return { value: sleep(1), done: false };
            }
            poseSlam(pid, 460);
            shake(pid, 0.52, 400);
            const slamPos = [p[0] + d[0] * 1.8, p[1] + 0.3, p[2] + d[2] * 1.8];
            soundAt(slamPos, "cannonFire1", 1.0, 0.65, 28);
            soundAt(slamPos, "critical_hit", 0.95, 0.8, 26);
            column(slamPos, 3.4, { steps: 6, tex: TEX.crit, life: [0.22, 0.45], size: [0.34, 0.66], colors: COL_COMBAT });
            boom(slamPos, 2.8, { tex: TEX.crit, count: 28, colors: COL_COMBAT });
            if (grabbed && isTargetable(grabbed, pid)) {
                try {
                    api.setPosition(grabbed, slamPos[0], p[1], slamPos[2]);
                } catch (e) {}
                damage(grabbed, 16, pid, itemName);
                impulse(grabbed, d[0] * 4.5, -10.0, d[2] * 4.5);
                eff(grabbed, "Slowness", 2500, { inbuiltLevel: 3 });
            } else {
                hitArea(slamPos, 4.2, pid, itemName, 14, { height: 3.4, slow: [2200, 3] });
            }
            return { done: true };
        },
    });
    return true;
}

// ============================================================================
// 2. DARK STEP (Dark Step Teacher — 13 000 Coins)
// ============================================================================

export function onPlayerClickDarkStepM1(pid, itemName, targetId) {
    const leg = (m1Combo[pid] = ((m1Combo[pid] || 0) + 1) & 1);
    poseKick(pid, leg === 1, 300);
    const m = pickMeleeTargets(pid, 4.6, 2.5, targetId);
    if (!m) return false;
    const fr = frame(m.d);
    const d = fr.f;
    soundAt(pid, "bigDrumSwish1", 0.8, 1.35, 20);
    soundAt(pid, "fireball", 0.65, 1.25, 20);
    for (let k = -2; k <= 2; k++) {
        const ang = k * 0.28 * (leg ? 1 : -1);
        const ca = Math.cos(ang);
        const sa = Math.sin(ang);
        burst(
            [m.p[0] + (d[0] * ca + fr.r[0] * sa) * 2.6, m.p[1] + 1.0 + k * 0.12, m.p[2] + (d[2] * ca + fr.r[2] * sa) * 2.6],
            0.28,
            TEX.crit,
            5,
            [0.18, 0.36],
            [0.28, 0.54],
            COL_DARK,
        );
    }
    for (let i = 0; i < m.list.length; i++) {
        const id = m.list[i];
        damage(id, 8, pid, "Dark Step Kick");
        impulse(id, d[0] * 5.2, 1.8, d[2] * 5.2);
    }
    return true;
}

export function onPlayerClickFlyingKick(pid, itemName) {
    if (!posOf(pid)) return true;
    const d = flatDir(pid);
    soundAt(pid, "fireball", 0.9, 1.1, 26);
    soundAt(pid, "bigDrumSwish2", 0.9, 1.15, 26);
    let step = 0;
    run({
        next: function () {
            const p = posOf(pid);
            if (!p || !isAliveId(pid)) return { done: true };
            step++;
            if (step <= 6) {
                const vy = step <= 3 ? 6.8 - step * 1.1 : -4.8 * (step - 3);
                impulse(pid, d[0] * 8.2, vy, d[2] * 8.2);
                poseKick(pid, step % 2 === 0, 240);
                burst([p[0], p[1] + 0.7, p[2]], 0.45, TEX.crit, 9, [0.2, 0.42], [0.3, 0.58], COL_DARK);
                return { value: sleep(1), done: false };
            }
            poseKick(pid, true, 420);
            shake(pid, 0.5, 400);
            const land = [p[0] + d[0] * 1.6, p[1] + 0.4, p[2] + d[2] * 1.6];
            soundAt(land, "cannonFire1", 1.0, 0.78, 28);
            soundAt(land, "fireball", 0.95, 0.85, 28);
            boom(land, 3.2, { tex: TEX.crit, count: 32, colors: COL_DARK });
            halo(land, 4.6, 12, TEX.soul, [0.24, 0.5], [0.32, 0.62], COL_DARK);
            hitArea(land, 5.4, pid, itemName, 18, { height: 3.6, slow: [2200, 2] });
            pushOut(land, 5.4, pid, 2.3, 0.95);
            return { done: true };
        },
    });
    return true;
}

export function onPlayerClickBreakdance(pid, itemName) {
    if (!isAliveId(pid)) return false;
    soundAt(pid, "bigDrumSwish2", 0.9, 1.05, 26);
    let spin = 0;
    run({
        next: function () {
            const p = posOf(pid);
            if (!p || !isAliveId(pid) || spin >= 8) return { done: true };
            spin++;
            const endPose = spin === 8 ? [0, 0, 0] : null;
            anim(pid, 250, {
                TorsoNode: kf([2.95, spin * 1.57, 0], [2.95, (spin + 0.5) * 1.57, 0], endPose || [2.95, (spin + 1) * 1.57, 0]),
                LegLeftMesh: kf([0, 0, -1.25], [0, 0, -1.25], endPose || [0, 0, -1.25]),
                LegRightMesh: kf([0, 0, 1.25], [0, 0, 1.25], endPose || [0, 0, 1.25]),
            });
            soundAt(pid, "fireball", 0.7, 1.15 + (spin % 3) * 0.1, 22);
            halo([p[0], p[1] + 0.55, p[2]], 3.8, 10, TEX.crit, [0.2, 0.42], [0.28, 0.56], COL_DARK, null, spin * 0.85);
            hitArea(p, 4.6, pid, itemName, 3, { height: 3.0 });
            pushOut(p, 4.6, pid, 1.65, 0.45);
            return { value: sleep(2), done: false };
        },
    });
    return true;
}

// ============================================================================
// 3. ELECTRIC (Mad Scientist — 22 000 Coins)
// ============================================================================

export function onPlayerClickElectricM1(pid, itemName, targetId) {
    const swing = (m1Combo[pid] = ((m1Combo[pid] || 0) + 1) & 1);
    posePunch(pid, swing === 1, 250);
    const m = pickMeleeTargets(pid, 4.4, 2.4, targetId);
    if (!m) return false;
    soundAt(pid, "magicAccent3", 0.8, 1.45, 20);
    burst(m.center, 0.4, TEX.glint, 14, [0.16, 0.34], [0.26, 0.52], COL_ELEC);
    for (let i = 0; i < m.list.length; i++) {
        const id = m.list[i];
        damage(id, 10, pid, "Electric Claw");
        freezeEntity(id, isPlayerAlive(id) ? 500 : 2000);
    }
    return true;
}

export function onPlayerClickElectricStomp(pid, itemName) {
    const p0 = posOf(pid);
    if (!p0) return true;
    const d = flatDir(pid);
    soundAt(pid, "futureStrangePulse", 0.9, 1.25, 26);
    impulse(pid, d[0] * 2.5, 11.5, d[2] * 2.5);
    column(p0, 3.2, { steps: 6, tex: TEX.glint, life: [0.2, 0.42], size: [0.3, 0.58], colors: COL_ELEC });
    let phase = 0;
    run({
        next: function () {
            const p = posOf(pid);
            if (!p || !isAliveId(pid)) return { done: true };
            phase++;
            if (phase <= 3) {
                burst([p[0], p[1] + 1.0, p[2]], 0.5, TEX.glint, 8, [0.16, 0.32], [0.26, 0.5], COL_ELEC);
                return { value: sleep(2), done: false };
            }
            if (phase === 4) {
                poseSlam(pid, 460);
                soundAt(pid, "bigDrumSwish2", 0.95, 0.85, 26);
                impulse(pid, d[0] * 3.8, -19.0, d[2] * 3.8);
                return { value: sleep(3), done: false };
            }
            shake(pid, 0.55, 450);
            soundAt(p, "cannonFire1", 1.0, 0.65, 32);
            soundAt(p, "futureStrangePulse", 1.0, 0.8, 32);
            boom([p[0], p[1] + 0.5, p[2]], 4.0, { tex: TEX.glint, count: 38, colors: COL_ELEC });
            halo([p[0], p[1] + 0.35, p[2]], 3.5, 14, TEX.glint, [0.26, 0.54], [0.32, 0.64], COL_ELEC);
            halo([p[0], p[1] + 0.35, p[2]], 6.8, 16, TEX.glint, [0.26, 0.54], [0.32, 0.64], COL_ELEC);
            const ids = lifeforms(pid);
            for (let i = 0; i < ids.length; i++) {
                const id = ids[i];
                if (!isTargetable(id, pid)) continue;
                const q = posOf(id);
                if (q && dist2(q, p) <= 60.0) {
                    damage(id, 22, pid, itemName);
                    freezeEntity(id, isPlayerAlive(id) ? 500 : 2000);
                }
            }
            pushOut(p, 7.4, pid, 2.2, 0.9);
            return { done: true };
        },
    });
    return true;
}

export function onPlayerClickElectricTackle(pid, itemName) {
    const p0 = posOf(pid);
    if (!p0) return true;
    const d = flatDir(pid);
    const end = [p0[0] + d[0] * 10.5, p0[1], p0[2] + d[2] * 10.5];
    posePunch(pid, true, 360);
    shake(pid, 0.4, 300);
    soundAt(pid, "futureStrangePulse", 0.95, 1.35, 28);
    soundAt(pid, "magicAccent3", 0.9, 1.25, 28);
    impulse(pid, d[0] * 15.0, 0.45, d[2] * 15.0);
    lineFx([p0[0], p0[1] + 1.0, p0[2]], [end[0], end[1] + 1.0, end[2]], 0.45, TEX.glint, 18, [0.25, 0.55], [0.32, 0.62], COL_ELEC);
    hitSeg([p0[0], p0[1] + 1.0, p0[2]], [end[0], end[1] + 1.0, end[2]], 2.4, pid, itemName, 14, { slow: [1500, 3] });
    let tick = 0;
    run({
        next: function () {
            tick++;
            lineFx([p0[0], p0[1] + 0.45, p0[2]], [end[0], end[1] + 0.45, end[2]], 0.55, TEX.glint, 14, [0.24, 0.5], [0.28, 0.54], COL_ELEC);
            if (tick % 2 === 0) {
                soundAt(end, "magicAccent3", 0.65, 1.4, 22);
                hitSeg([p0[0], p0[1] + 0.8, p0[2]], [end[0], end[1] + 0.8, end[2]], 2.5, pid, itemName, 3, { slow: [1200, 2] });
            }
            if (tick >= 12) return { done: true };
            return { value: sleep(10), done: false };
        },
    });
    return true;
}

// ============================================================================
// 4. WATER KUNG-FU (Water Kung-Fu Teacher — 35 000 Coins)
// ============================================================================

export function onPlayerClickWaterM1(pid, itemName, targetId) {
    const swing = (m1Combo[pid] = ((m1Combo[pid] || 0) + 1) & 1);
    posePunch(pid, swing === 1, 270);
    const m = pickMeleeTargets(pid, 4.6, 2.5, targetId);
    if (!m) return false;
    soundAt(pid, "bigDrumSwish2", 0.78, 1.2, 20);
    burst(m.center, 0.42, TEX.bubble, 14, [0.2, 0.42], [0.28, 0.54], COL_WATER);
    for (let i = 0; i < m.list.length; i++) {
        const id = m.list[i];
        damage(id, 12, pid, "Water Palm");
        eff(id, "Slowness", 2600, { inbuiltLevel: 2 });
        impulse(id, m.d[0] * 6.8, 2.0, m.d[2] * 6.8);
    }
    return true;
}

export function onPlayerClickSteamFist(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const fr = frame(facing(pid));
    const d = fr.f;
    poseSlam(pid, 500);
    shake(pid, 0.48, 380);
    const a = [p[0] + d[0] * 1.4, p[1] + 1.15, p[2] + d[2] * 1.4];
    const b = [p[0] + d[0] * 13.5, p[1] + 1.15 + d[1] * 11.0, p[2] + d[2] * 13.5];
    soundAt(pid, "cannonFire2", 0.95, 1.05, 28);
    for (let k = -1; k <= 1; k++) {
        lineFx(
            [a[0] + fr.r[0] * k * 1.15, a[1], a[2] + fr.r[2] * k * 1.15],
            [b[0] + fr.r[0] * k * 1.35, b[1], b[2] + fr.r[2] * k * 1.35],
            0.45,
            TEX.bubble,
            14,
            [0.26, 0.55],
            [0.34, 0.68],
            COL_WATER,
        );
    }
    hitSeg(a, b, 3.4, pid, itemName, 14, {
        slow: [2500, 2],
        onHit: function (id, hitPt) {
            const q = posOf(id) || hitPt;
            if (!q) return;
            const dx = b[0] - q[0];
            const dz = b[2] - q[2];
            const dist = Math.sqrt(dx * dx + dz * dz) || 1;
            impulse(id, (dx / dist) * 10.5, 2.2, (dz / dist) * 10.5);
        },
    });
    sTimeout(function () {
        soundAt(b, "cannonFire1", 1.0, 0.72, 32);
        boom(b, 3.8, { tex: TEX.bubble, count: 38, colors: COL_WATER });
        halo(b, 5.2, 14, TEX.glint, [0.26, 0.54], [0.34, 0.68], COL_WATER);
        hitArea(b, 5.8, pid, itemName, 16, { height: 4.0, slow: [3000, 2] });
        pushOut(b, 6.0, pid, 3.1, 1.25);
    }, 5);
    return true;
}

export function onPlayerClickDeadlyShower(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = facing(pid);
    const tb = targetBlock(pid);
    const c =
        tb && dist2(p, tb) <= 225
            ? [tb[0], tb[1] + 0.5, tb[2]]
            : [p[0] + d[0] * 14, p[1] + 0.5 + d[1] * 4, p[2] + d[2] * 14];
    posePunch(pid, true, 360);
    soundAt(pid, "magicAccent1", 0.9, 1.35, 26);
    lineFx([p[0], p[1] + 1.35, p[2]], c, 0.16, TEX.glint, 14, [0.2, 0.42], [0.24, 0.46], COL_WATER);
    lineFx(c, [c[0], c[1] + 7.5, c[2]], 0.18, TEX.bubble, 10, [0.22, 0.45], [0.26, 0.5], COL_WATER);
    let wave = 0;
    run({
        next: function () {
            wave++;
            soundAt(c, "bigDrumSwish1", 0.75, 1.3 + (wave % 3) * 0.1, 24);
            for (let i = 0; i < 4; i++) {
                const ang = wave * 1.3 + i * 1.57;
                const rad = (i % 2 === 0 ? 1.4 : 3.1) * (0.7 + (wave % 2) * 0.3);
                const drop = [c[0] + Math.cos(ang) * rad, c[1], c[2] + Math.sin(ang) * rad];
                lineFx([drop[0], drop[1] + 7.0, drop[2]], drop, 0.18, TEX.bubble, 6, [0.16, 0.34], [0.24, 0.48], COL_WATER);
                burst(drop, 0.4, TEX.glint, 5, [0.16, 0.32], [0.24, 0.46], COL_WATER);
            }
            hitArea(c, 4.8, pid, itemName, 5, { height: 3.8, slow: [2200, 2] });
            if (wave >= 7) return { done: true };
            return { value: sleep(2), done: false };
        },
    });
    return true;
}

// ============================================================================
// REGISTRE & GESTION DES 4 FIGHTING STYLES
// ============================================================================

export const FIGHTING_STYLES = {
    "Combat": {
        name: "Combat",
        npc: "Combat Teacher",
        price: 0,
        color: "#f59e0b",
        m1Cooldown: 380,
        m1Handler: onPlayerClickCombatM1,
        abilities: [
            {
                id: "fs_combat_smash",
                name: "Ground Smash",
                itemType: "Orange Paintball Explosive Item",
                legacyItemType: "Orange Sticky Paintball Explosive Item",
                cooldown: 6500,
                description: "Smash the ground with both fists, blasting and launching all nearby enemies.",
                handler: onPlayerClickCombatSmash,
            },
            {
                id: "fs_combat_grab",
                name: "Grapple Rush",
                itemType: "Brown Paintball Explosive Item",
                legacyItemType: "Red Quick Paintball Explosive Item",
                cooldown: 8500,
                description: "Dash forward, grab an enemy in your path and slam them down with a heavy overhead punch.",
                handler: onPlayerClickCombatGrab,
            },
        ],
    },
    "Dark Step": {
        name: "Dark Step",
        npc: "Dark Step Teacher",
        price: 13000,
        color: "#ef4444",
        m1Cooldown: 360,
        m1Handler: onPlayerClickDarkStepM1,
        abilities: [
            {
                id: "fs_dark_flying_kick",
                name: "Flying Kick",
                itemType: "Black Paintball Explosive Item",
                legacyItemType: "Black Quick Paintball Explosive Item",
                cooldown: 6500,
                description: "Leap forward in a blazing curved trajectory and unleash a massive kick upon landing.",
                handler: onPlayerClickFlyingKick,
            },
            {
                id: "fs_dark_breakdance",
                name: "Breakdance",
                itemType: "Purple Paintball Explosive Item",
                legacyItemType: "Orange Seeking Paintball Explosive Item",
                cooldown: 9000,
                description: "Spin upside-down on your hands, damaging and knocking back all enemies around you.",
                handler: onPlayerClickBreakdance,
            },
        ],
    },
    "Electric": {
        name: "Electric",
        npc: "Mad Scientist",
        price: 22000,
        color: "#fde047",
        m1Cooldown: 380,
        m1Handler: onPlayerClickElectricM1,
        abilities: [
            {
                id: "fs_electric_stomp",
                name: "Stomp",
                itemType: "Yellow Paintball Explosive Item",
                legacyItemType: "Yellow Sticky Paintball Explosive Item",
                cooldown: 8000,
                description: "Launch into the air, slam back into the ground and trigger a large electric explosion.",
                handler: onPlayerClickElectricStomp,
            },
            {
                id: "fs_electric_tackle",
                name: "Electrical Tackle",
                itemType: "Lime Sticky Paintball Explosive Item",
                legacyItemType: "Cyan Quick Paintball Explosive Item",
                cooldown: 9500,
                description: "Dash forward leaving a high-voltage electric trail for 6s that shocks foes every 1s.",
                handler: onPlayerClickElectricTackle,
            },
        ],
    },
    "Water Kung-Fu": {
        name: "Water Kung-Fu",
        npc: "Water Kung-Fu Teacher",
        price: 35000,
        color: "#38bdf8",
        m1Cooldown: 380,
        m1Handler: onPlayerClickWaterM1,
        abilities: [
            {
                id: "fs_water_steam_fist",
                name: "Steam-Charged Fist",
                itemType: "Blue Paintball Explosive Item",
                legacyItemType: "Blue Sticky Paintball Explosive Item",
                cooldown: 8000,
                description: "Fire a wide hydro-steam beam that drags foes into a massive knockback explosion at the end.",
                handler: onPlayerClickSteamFist,
            },
            {
                id: "fs_water_deadly_shower",
                name: "Deadly Shower",
                itemType: "Light Gray Seeking Paintball Explosive Item",
                legacyItemType: "Light Blue Seeking Paintball Explosive Item",
                cooldown: 9000,
                description: "Shoot a focused water beam that calls down a rapid torrential barrage on the target zone.",
                handler: onPlayerClickDeadlyShower,
            },
        ],
    },
};

const ALL_FS_ABILITY_NAMES = new Set();
const ALL_FS_ITEM_TYPES = new Set();
for (const k in FIGHTING_STYLES) {
    const s = FIGHTING_STYLES[k];
    for (let i = 0; i < s.abilities.length; i++) {
        ALL_FS_ABILITY_NAMES.add(s.abilities[i].name);
        ALL_FS_ITEM_TYPES.add(s.abilities[i].itemType);
    }
}

const activeStyles = new Map();
const abilityCooldowns = new Map();
const m1Cooldowns = new Map();
const confirmPurchase = new Map();

export function isFightingStyleAbilityName(customName) {
    return typeof customName === "string" && ALL_FS_ABILITY_NAMES.has(customName);
}

export function isFightingStyleItemName(itemName) {
    return typeof itemName === "string" && ALL_FS_ITEM_TYPES.has(itemName);
}

export function getFightingStyle(playerId) {
    if (activeStyles.has(playerId)) return activeStyles.get(playerId);
    try {
        const saved = api.getPlayerDbValue(playerId, FS_DB_KEY);
        if (typeof saved === "string" && FIGHTING_STYLES[saved]) {
            activeStyles.set(playerId, saved);
            return saved;
        }
    } catch (e) {}
    return null;
}

export function getFightingStyleInfo(styleName) {
    return styleName && FIGHTING_STYLES[styleName] ? FIGHTING_STYLES[styleName] : null;
}

function hasAbilityItem(playerId, ab) {
    try {
        const amt = api.getInventoryItemAmount(playerId, ab.itemType);
        if (typeof amt === "number" && amt > 0) return true;
    } catch (e) {}
    for (let slot = 0; slot <= INVENTORY_SLOT_MAX; slot++) {
        let item = null;
        try {
            item = api.getItemSlot(playerId, slot);
        } catch (e) {
            item = null;
        }
        if (!item || !item.name) continue;
        const cName = item.attributes && item.attributes.customDisplayName;
        if (cName === ab.name || item.name === ab.itemType) return true;
    }
    return false;
}

export function removeFightingStyleItems(playerId, keepStyleName = null) {
    const keepNames = new Set();
    const keepTypes = new Set();
    if (keepStyleName && FIGHTING_STYLES[keepStyleName]) {
        const list = FIGHTING_STYLES[keepStyleName].abilities;
        for (let i = 0; i < list.length; i++) {
            keepNames.add(list[i].name);
            keepTypes.add(list[i].itemType);
        }
    }
    for (const itemType of ALL_FS_ITEM_TYPES) {
        if (keepTypes.has(itemType)) continue;
        try {
            const amt = api.getInventoryItemAmount(playerId, itemType);
            if (typeof amt === "number" && amt > 0) api.removeItemName(playerId, itemType, amt);
        } catch (e) {}
    }
    for (let slot = 0; slot <= INVENTORY_SLOT_MAX; slot++) {
        let item = null;
        try {
            item = api.getItemSlot(playerId, slot);
        } catch (e) {
            item = null;
        }
        if (!item || !item.name) continue;
        const cName = item.attributes && item.attributes.customDisplayName;
        if (
            (cName && ALL_FS_ABILITY_NAMES.has(cName) && !keepNames.has(cName)) ||
            (ALL_FS_ITEM_TYPES.has(item.name) && !keepTypes.has(item.name))
        ) {
            try {
                api.setItemSlot(playerId, slot, "Air");
            } catch (e) {}
        }
    }
}

export function giveFightingStyleItems(playerId, styleName) {
    const style = FIGHTING_STYLES[styleName];
    if (!style) return false;
    removeFightingStyleItems(playerId, styleName);
    for (let i = 0; i < style.abilities.length; i++) {
        const ab = style.abilities[i];
        if (hasAbilityItem(playerId, ab)) continue;
        try {
            api.giveItem(playerId, ab.itemType, 1, {
                customDisplayName: ab.name,
                customDescription: ab.description,
            });
        } catch (e) {}
    }
    return true;
}

export function equipFightingStyle(playerId, styleName, silent = false) {
    const style = FIGHTING_STYLES[styleName];
    if (!style) return false;
    activeStyles.set(playerId, styleName);
    try {
        api.setPlayerDbValue(playerId, FS_DB_KEY, styleName);
    } catch (e) {}
    giveFightingStyleItems(playerId, styleName);
    try {
        updateSidebarLight(playerId);
    } catch (e) {}
    if (!silent) {
        try {
            api.playSound(playerId, "exp_levelup", 1, 1.15);
        } catch (e) {}
        try {
            api.sendMessage(playerId, [
                { str: "🥋 You learned the ", style: { color: "#e2e8f0", fontWeight: "bold" } },
                { str: style.name, style: { color: style.color, fontWeight: "bold" } },
                { str: " Fighting Style!\n", style: { color: "#e2e8f0", fontWeight: "bold" } },
                { str: "• Empty-hand clicks now use ", style: { color: "#94a3b8" } },
                { str: style.name + " M1", style: { color: style.color, fontWeight: "bold" } },
                { str: "  • Abilities: ", style: { color: "#94a3b8" } },
                { str: style.abilities[0].name + " & " + style.abilities[1].name, style: { color: "#facc15", fontWeight: "bold" } },
            ]);
        } catch (e) {}
    }
    return true;
}

export function restoreFightingStyle(playerId) {
    const styleName = getFightingStyle(playerId);
    if (!styleName || !FIGHTING_STYLES[styleName]) return false;
    giveFightingStyleItems(playerId, styleName);
    return true;
}

export function clearFightingStyle(playerId) {
    activeStyles.delete(playerId);
    abilityCooldowns.delete(playerId);
    m1Cooldowns.delete(playerId);
    confirmPurchase.delete(playerId);
    removeFightingStyleItems(playerId, null);
    try {
        api.setPlayerDbValue(playerId, FS_DB_KEY, null);
    } catch (e) {}
}

export function onPlayerLeaveFightingStyle(playerId) {
    activeStyles.delete(playerId);
    abilityCooldowns.delete(playerId);
    m1Cooldowns.delete(playerId);
    confirmPurchase.delete(playerId);
}

export function buyFightingStyle(playerId, styleName) {
    const style = FIGHTING_STYLES[styleName];
    if (!style) return false;
    const current = getFightingStyle(playerId);
    if (current === styleName) {
        removeFightingStyleItems(playerId, null);
        giveFightingStyleItems(playerId, styleName);
        try {
            api.sendMessage(playerId, [
                { str: "🥋 You already use ", style: { color: "#cbd5e1" } },
                { str: style.name, style: { color: style.color, fontWeight: "bold" } },
                { str: "! (Your ability items have been refreshed.)", style: { color: "#cbd5e1" } },
            ]);
        } catch (e) {}
        return true;
    }

    if (style.price <= 0) {
        return equipFightingStyle(playerId, styleName, false);
    }

    const money = getTotalMoney(playerId);
    if (money < style.price) {
        try {
            api.sendMessage(playerId, [
                { str: "💰 Not enough Coins to learn ", style: { color: "#ff5555", fontWeight: "bold" } },
                { str: style.name, style: { color: style.color, fontWeight: "bold" } },
                { str: ": " + money + "/" + style.price, style: { color: "#fbbf24", fontWeight: "bold" } },
            ]);
        } catch (e) {}
        return false;
    }

    const now = Date.now();
    const pending = confirmPurchase.get(playerId);
    if (!pending || pending.style !== styleName || now > pending.until) {
        confirmPurchase.set(playerId, { style: styleName, until: now + 5000 });
        try {
            api.sendMessage(playerId, [
                { str: "🥋 Click ", style: { color: "#e2e8f0" } },
                { str: style.npc, style: { color: style.color, fontWeight: "bold" } },
                { str: " again within 5s to learn ", style: { color: "#e2e8f0" } },
                { str: style.name, style: { color: style.color, fontWeight: "bold" } },
                { str: " for ", style: { color: "#e2e8f0" } },
                { str: style.price + " Coins", style: { color: "#facc15", fontWeight: "bold" } },
                { str: " (replaces your current Fighting Style).", style: { color: "#94a3b8" } },
            ]);
        } catch (e) {}
        return false;
    }

    confirmPurchase.delete(playerId);
    if (!payMoney(playerId, style.price)) return false;
    try {
        api.playSound(playerId, "CashRegister", 1, 1);
    } catch (e) {}
    return equipFightingStyle(playerId, styleName, false);
}

function getHeldItemAndCustomName(playerId) {
    let held = null;
    try {
        held = api.getHeldItem(playerId);
    } catch (e) {
        held = null;
    }
    if (!held) return { itemName: null, customName: null };
    const itemName = typeof held === "string" ? held : held.name || held.type || null;
    let customName = (held.attributes && held.attributes.customDisplayName) || held.customDisplayName || null;
    if (!customName) {
        try {
            if (typeof api.getSelectedInventorySlotI === "function") {
                const idx = api.getSelectedInventorySlotI(playerId);
                const slotItem = typeof idx === "number" ? api.getItemSlot(playerId, idx) : null;
                if (slotItem && slotItem.attributes && slotItem.attributes.customDisplayName) {
                    customName = slotItem.attributes.customDisplayName;
                }
            }
        } catch (e) {}
    }
    return { itemName, customName };
}

export function isHoldingFightingStyleItem(playerId) {
    const { itemName, customName } = getHeldItemAndCustomName(playerId);
    if (customName && isFightingStyleAbilityName(customName)) return true;
    if (itemName && isFightingStyleItemName(itemName)) return true;
    return false;
}

export function handleFightingStyleClick(playerId, rightClick, x, y, z, blockName, targetId) {
    const styleName = getFightingStyle(playerId);
    if (!styleName) return false;
    const style = FIGHTING_STYLES[styleName];
    if (!style) return false;

    const { itemName, customName } = getHeldItemAndCustomName(playerId);
    if (!itemName && !customName) return false;

    let matched = null;
    if (customName) {
        for (let i = 0; i < style.abilities.length; i++) {
            if (style.abilities[i].name === customName) {
                matched = style.abilities[i];
                break;
            }
        }
    }
    /* Le NOM de l'item est la seule source fiable. Plusieurs items de style
       partageaient leur ancien type de base avec une capacite de fruit (ex.
       "Red Quick Paintball Explosive Item" = Crimson Beam du Flame ET ancien
       Grapple Rush de Combat) : un clic sur le Crimson Beam lançait le dash de
       Combat. Un item qui porte un AUTRE nom n'appartient donc pas au style et
       on rend la main au fruit. Le repli par type ne sert plus qu'aux vieux
       items sans nom personnalise. */
    if (!matched && !customName && itemName) {
        for (let i = 0; i < style.abilities.length; i++) {
            if (style.abilities[i].itemType === itemName) {
                matched = style.abilities[i];
                break;
            }
        }
        if (!matched) {
            for (let i = 0; i < style.abilities.length; i++) {
                const ab = style.abilities[i];
                if (ab.legacyItemType && ab.legacyItemType === itemName) {
                    matched = ab;
                    break;
                }
            }
        }
    }
    if (!matched || typeof matched.handler !== "function") return false;

    const now = Date.now();
    let cdMap = abilityCooldowns.get(playerId);
    if (!cdMap) {
        cdMap = {};
        abilityCooldowns.set(playerId, cdMap);
    }
    const cdEnd = cdMap[matched.id] || 0;
    if (now < cdEnd) {
        const rem = Math.max(1, Math.ceil((cdEnd - now) / 1000));
        try {
            api.sendMessage(playerId, [
                { str: "[", style: { color: "#94a3b8" } },
                { str: "!", style: { color: "#ef4444", fontWeight: "700" } },
                { str: "] ", style: { color: "#94a3b8" } },
                { str: matched.name + " Cooldown: ", style: { color: "#fbbf24" } },
                { str: rem + "s", style: { color: "#fde68a", fontWeight: "700" } },
            ]);
        } catch (e) {}
        /* Renvoie un marqueur : le clic ne lance rien, mais src/index.js
           enchaîne sur le coup de poing du Fighting Style. */
        return "cooldown";
    }

    const cdMs = matched.cooldown || 6000;
    cdMap[matched.id] = now + cdMs;
    const expectedEnd = cdMap[matched.id];

    try {
        api.playSound(playerId, "magicAccent1", 0.35, 1.3);
    } catch (e) {}

    let ok = true;
    try {
        const res = matched.handler(playerId, matched.name, targetId);
        if (res === false) ok = false;
    } catch (e) {
        ok = false;
        try {
            api.log("[fightingStyles][err] " + matched.name + " : " + (e && e.message ? e.message : e));
        } catch (e2) {}
    }

    if (!ok) {
        delete cdMap[matched.id];
        return true;
    }

    if (cdMs > 0) {
        const ticks = Math.max(1, Math.ceil(cdMs / 50));
        sTimeout(() => {
            const cur = abilityCooldowns.get(playerId);
            if (!cur || cur[matched.id] !== expectedEnd) return;
            delete cur[matched.id];
            try {
                api.sendFlyingMiddleMessage(
                    playerId,
                    [
                        { str: "✦ ", style: { color: "#facc15", fontWeight: "700" } },
                        { str: "Ability ", style: { color: "#cbd5e1", fontWeight: "600" } },
                        { str: matched.name, style: { color: "#67e8f9", fontWeight: "700" } },
                        { str: " is ready!", style: { color: "#86efac", fontWeight: "700" } },
                        { str: " ✦", style: { color: "#facc15", fontWeight: "700" } },
                    ],
                    100,
                );
            } catch (e) {}
        }, ticks);
    }
    return true;
}

export function handleFightingStyleM1(playerId, targetId, allowHeldItem) {
    const styleName = getFightingStyle(playerId);
    if (!styleName) return false;
    const style = FIGHTING_STYLES[styleName];
    if (!style || typeof style.m1Handler !== "function") return false;

    const now = Date.now();
    const nextAt = m1Cooldowns.get(playerId) || 0;
    /* Coup déjà parti : on renvoie true pour que le coup "vanilla" du client
       ne vienne pas ajouter des dégâts par-dessus ceux du style. */
    if (now < nextAt) return true;

    /* Normalement le M1 se fait à main vide. allowHeldItem = true est utilisé
       quand une capacité est en cooldown : le clic devient un coup de poing. */
    if (!allowHeldItem) {
        const { itemName } = getHeldItemAndCustomName(playerId);
        if (itemName && itemName !== "Air") return false;
    }

    m1Cooldowns.set(playerId, now + (style.m1Cooldown || 380));

    try {
        style.m1Handler(playerId, style.name, targetId);
        return true;
    } catch (e) {
        try {
            api.log("[fightingStyles][err] M1 " + style.name + " : " + (e && e.message ? e.message : e));
        } catch (e2) {}
        return false;
    }
}
