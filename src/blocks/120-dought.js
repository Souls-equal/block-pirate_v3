// src/blocks/120-dought.js — DOUGHT
// Source lisible. Ce fichier est minifié + empaqueté par `npm run build:blocks`.
// NE PAS coller ce fichier directement dans un Code Block : utiliser code-blocks/pack-XX.js.

(FA=>{/* source : ce fichier est regroupé avec d'autres dans un pack par le build. */const C=FA.c,R=FA.r,F=C.fx,{api,damage,eff,entitiesIn,heal,hitArea,hitSeg,impulse,setMoveSpeed,isAliveId,lifeforms,markUntil,pickTarget,posOf,safeHealth,safePosition,statLevel,unmark,strengthMult,claimSummon,freeSummon,chest,facing,heading,isPlayerAlive,safeEntityName,safeEntityType,targetBlock,boom,box,boxSpan,CAGE,circle,clamp,column,dist2,distH2,frame,GOLDEN,inBox,norm,point,ring,TAU,TEX,run,setInterval,setTimeout,sleep,blockAt,clearIf,freeSpot,isSolid,raycast,setBlock,stuck,knockBack}=C,mesh=F,sound=F,ct_mesh=F.create,ct_to=F.move,ct_off=F.remove,ct_tilt=F.rotate,ct_preset=F.playParticle,soundAt=F.at,tf_create=F.create,tf_move=F.move,tf_remove=F.remove,tf_turn=F.rotate;
/* FULL PUNCH — cage de poings de mochi/béton noir en particules + dégâts sur la durée */
const FREEZE_MS = 3000, FREEZE_DMG = 12, FREEZE_EVERY = 250, PUNCH_MS = 700;
const freezeTok = {}, freezeSpeed = {};

const COL_BLACK = [28, 28, 36, 1];
const COL_DARK = [65, 65, 78, 0.95];
const COL_MOCHI = [248, 236, 208, 0.95];
const COL_GOLD = [255, 195, 75, 0.9];

function setSpeed(pid, v) {
    /* setMoveSpeed : 0 (root) est refuse a un rang immunise, la remise a une
       vitesse normale passe toujours. */
    setMoveSpeed(pid, v);
}

function clearFreeze(tid) {
    freezeTok[tid] = (freezeTok[tid] || 0) + 1;
    if (isPlayerAlive(tid)) setSpeed(tid, freezeSpeed[tid] === undefined ? 1 : freezeSpeed[tid]);
    delete freezeSpeed[tid];
}

function drawCagePunches(center, now, t0, step) {
    const cx = center[0], cy = center[1] + 0.95, cz = center[2];
    for (let j = 0; j < CAGE.length; j++) {
        const o = CAGE[j];
        const d = Math.sqrt(o[0] * o[0] + o[1] * o[1] + o[2] * o[2]) || 1;
        const atk = Math.max(0, now - (t0 + j * 65));
        const cycle = atk % PUNCH_MS;
        const prog = cycle < 220 ? cycle / 220 : (cycle < 380 ? 1 : 1 - (cycle - 380) / 320);
        const punch = 0.95 * prog;
        const fx = cx + o[0] * 1.35 - (o[0] / d) * punch;
        const fy = cy + o[1] * 1.05 - (o[1] / d) * punch;
        const fz = cz + o[2] * 1.35 - (o[2] / d) * punch;

        point([fx, fy, fz], {
            r: 0.16, tex: TEX.square, count: 4,
            life: [0.12, 0.24], power: [0.25, 0.95], size: [0.3, 0.56],
            dir: [-o[0] / d, -o[1] / d, -o[2] / d], dirSpread: 0.18,
            colors: [[COL_BLACK, COL_DARK], [COL_MOCHI, [20, 20, 28, 0]]],
        });

        if (prog > 0.78 && ((step + j) % 2 === 0)) {
            point([cx - (o[0] / d) * 0.15, cy - (o[1] / d) * 0.15, cz - (o[2] / d) * 0.15], {
                r: 0.22, tex: TEX.crit, count: 3,
                life: [0.1, 0.22], power: [0.6, 1.8], size: [0.26, 0.48],
                colors: [[COL_MOCHI, COL_GOLD], [COL_BLACK, [0, 0, 0, 0]]],
            });
        }
    }
    if (step % 3 === 0) {
        ring([cx, center[1] + 0.25, cz], 1.45, 10, {
            tex: TEX.soul, life: [0.18, 0.34], size: [0.24, 0.44], power: [0.1, 0.4],
            colors: [[COL_BLACK, COL_MOCHI], [COL_DARK, [0, 0, 0, 0]]],
        }, step * 0.35);
    }
}

function castFreeze(caster, tid, itemName) {
    if (!tid || !isAliveId(tid)) return;
    clearFreeze(tid);
    sound.at(tid, "cannonFire1", 0.85, 0.9, 24);

    const tok = freezeTok[tid];
    const t0 = Date.now();
    const end = t0 + FREEZE_MS;

    if (isPlayerAlive(tid)) {
        freezeSpeed[tid] = 1;
        setSpeed(tid, 0);
    }
    eff(tid, "Slowness", FREEZE_MS, { inbuiltLevel: 6 });

    const tp0 = posOf(tid);
    if (tp0) {
        boom([tp0[0], tp0[1] + 0.95, tp0[2]], 1.8, {
            count: 28, tex: TEX.square,
            colors: [[COL_BLACK, COL_MOCHI], [COL_DARK, [0, 0, 0, 0]]],
        });
    }

    function cleanup() {
        if (freezeTok[tid] === tok && isPlayerAlive(tid)) {
            setSpeed(tid, freezeSpeed[tid] === undefined ? 1 : freezeSpeed[tid]);
            delete freezeSpeed[tid];
        }
    }

    const dot = setInterval(function () {
        if (freezeTok[tid] !== tok || Date.now() >= end || !isAliveId(tid)) { dot.stop(); return; }
        damage(tid, FREEZE_DMG, caster, itemName);
        sound.at(tid, "critical_hit", 0.65, 1.15, 18);
    }, Math.max(1, Math.ceil(FREEZE_EVERY / 50)));

    setTimeout(function () { dot.stop(); cleanup(); }, Math.ceil(FREEZE_MS / 50) + 2);

    let step = 0;
    run({
        next: function () {
            if (freezeTok[tid] !== tok || Date.now() >= end || !isAliveId(tid)) {
                dot.stop(); cleanup(); return { done: true };
            }
            const tp = posOf(tid);
            if (!tp) { dot.stop(); cleanup(); return { done: true }; }
            if (!isPlayerAlive(tid)) {
                try { api.setVelocity(tid, 0, 0, 0); } catch (e) {}
            }

            step++;
            drawCagePunches(tp, Date.now(), t0, step);
            return { value: sleep(2), done: false };
        }
    });
}

function castForwardPunchBarrage(caster, itemName) {
    const p0 = posOf(caster);
    if (!p0) return;
    sound.at(caster, "cannonFire1", 0.85, 0.95, 24);
    const t0 = Date.now();
    let step = 0;
    run({
        next: function () {
            if (step >= 12 || !isAliveId(caster)) return { done: true };
            const p = posOf(caster);
            if (!p) return { done: true };
            const d = facing(caster);
            const center = [p[0] + d[0] * 3.2, p[1] + d[1] * 1.5, p[2] + d[2] * 3.2];
            step++;
            drawCagePunches(center, Date.now(), t0, step);
            if (step % 2 === 1) {
                hitArea(center, 2.8, caster, itemName, FREEZE_DMG * 2, { kb: 8, up: 0.25 });
            }
            return { value: sleep(2), done: false };
        }
    });
}


/* CONCRETE WHEEL — roue de mochi/béton en particules qui écrase tout sur son passage */
const W_SPEED = 1.45, dought_W_DMG = 14, W_DMG_TICKS = 3, W_MAX_MS = 10000;
const W_FOLLOW = 2, SHOCK_MAX_R = 6, SHOCK_STEP_MS = 220, SHOCK_DMG = 40;

const wheelOn = {}, wheelRoll = {}, wheelAir = {}, wheelItem = {};

function stopWheel(pid) {
    if (wheelOn[pid]) {
        sound.at(pid, "cannonFire3", 0.75, 1.2, 22);
        const p = posOf(pid);
        if (p) {
            boom([p[0], p[1] + 0.9, p[2]], 1.8, {
                count: 22, tex: TEX.square,
                colors: [[COL_DARK, COL_MOCHI], [COL_BLACK, [0, 0, 0, 0]]],
            });
        }
    }
    wheelOn[pid] = false;
    try { api.setPlayerOpacity(pid, 1); } catch (e) {}
    setSpeed(pid, 1);
    delete wheelRoll[pid]; delete wheelAir[pid]; delete wheelItem[pid];
}

function shockwave(owner, cx, cy, cz, item) {
    sound.at([cx, cy, cz], "cannonFire1", 0.9, 0.75, 26);
    boom([cx + 0.5, cy + 0.5, cz + 0.5], 2.4, {
        count: 30, tex: TEX.crit,
        colors: [[COL_MOCHI, COL_GOLD], [COL_BLACK, [0, 0, 0, 0]]],
    });
    let r = 1, prev = [];
    const hitSeen = {};
    run({
        next: function () {
            for (let i = 0; i < prev.length; i++) clearIf(prev[i][0], prev[i][1], prev[i][2], "Black Glass");

            if (r > SHOCK_MAX_R) return { done: true };
            ring([cx + 0.5, cy + 0.35, cz + 0.5], r, Math.min(20, 6 + r * 2), {
                tex: TEX.square, life: [0.18, 0.38], size: [0.32, 0.62], power: [0.3, 1.2],
                dir: [0, 0.35, 0], dirSpread: 0.25,
                colors: [[COL_BLACK, COL_MOCHI], [COL_DARK, [0, 0, 0, 0]]],
            });

            const list = entitiesIn([cx - r - 1, cy - 1.5, cz - r - 1], [cx + r + 1, cy + 2.5, cz + r + 1]);
            for (let t = 0; t < list.length; t++) {
                const tid = list[t];
                if (tid !== owner && !hitSeen[tid] && isAliveId(tid)) {
                    const tp = posOf(tid);
                    if (tp) {
                        const dx = tp[0] - (cx + 0.5), dz = tp[2] - (cz + 0.5);
                        const dist = Math.sqrt(dx * dx + dz * dz);
                        if (dist >= r - 1.2 && dist <= r + 1.2) {
                            hitSeen[tid] = 1;
                            damage(tid, SHOCK_DMG, owner, item);
                            knockBack(tid, (dx / (dist || 1)) * 12, 4.5, (dz / (dist || 1)) * 12);
                        }
                    }
                }
            }

            const nb = [];
            for (let ix = -r; ix <= r; ix++) {
                for (let iz = -r; iz <= r; iz++) {
                    const d = Math.sqrt(ix * ix + iz * iz);
                    if (d > r - 0.5 && d < r + 0.5) nb.push([cx + ix, cy, cz + iz]);
                }
            }
            for (let i = 0; i < nb.length; i++) {
                const b = nb[i];
                if (blockAt(b[0], b[1], b[2]) !== "Air") continue;
                setBlock(b[0], b[1], b[2], "Black Glass");
            }
            prev = nb; r++;
            return { value: sleep(Math.max(1, Math.ceil(SHOCK_STEP_MS / 50))), done: false };
        }
    });
}

function drawWheelParticles(p, d, rollAngle) {
    const hl = Math.sqrt(d[0] * d[0] + d[2] * d[2]) || 1;
    const fx = d[0] / hl, fz = d[2] / hl;
    const rx = -fz, rz = fx;
    const R_WHEEL = 1.35;

    for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU + rollAngle;
        const ca = Math.cos(a), sa = Math.sin(a);
        const wx = p[0] + fx * ca * R_WHEEL;
        const wy = p[1] + 1.05 + sa * R_WHEEL;
        const wz = p[2] + fz * ca * R_WHEEL;

        point([wx + rx * 0.34, wy, wz + rz * 0.34], {
            r: 0.14, tex: TEX.square, count: 2,
            life: [0.12, 0.24], power: [0.1, 0.45], size: [0.34, 0.6],
            colors: [[COL_DARK, COL_MOCHI], [COL_BLACK, [0, 0, 0, 0]]],
        });
        point([wx - rx * 0.34, wy, wz - rz * 0.34], {
            r: 0.14, tex: TEX.square, count: 2,
            life: [0.12, 0.24], power: [0.1, 0.45], size: [0.34, 0.6],
            colors: [[COL_DARK, COL_MOCHI], [COL_BLACK, [0, 0, 0, 0]]],
        });
    }

    point([p[0] - fx * 0.55, p[1] + 0.15, p[2] - fz * 0.55], {
        r: 0.24, tex: TEX.crit, count: 3,
        life: [0.14, 0.28], power: [0.6, 1.8], size: [0.24, 0.46],
        dir: [-fx, 0.35, -fz], dirSpread: 0.35,
        colors: [[COL_MOCHI, COL_GOLD], [COL_DARK, [0, 0, 0, 0]]],
    });
}

function startWheel(pid, itemName) {
    sound.at(pid, "bigDrumSwish2", 0.85, 0.9, 24);

    wheelOn[pid] = true;
    wheelRoll[pid] = 0;
    wheelAir[pid] = false;
    wheelItem[pid] = itemName;

    setTimeout(function () { if (wheelOn[pid]) stopWheel(pid); }, Math.ceil(W_MAX_MS / 50));
    setSpeed(pid, W_SPEED);
    eff(pid, "Speed", W_MAX_MS, { inbuiltLevel: 2 });

    const d0 = facing(pid);
    impulse(pid, d0[0] * 5.5, 0.2, d0[2] * 5.5);

    let acc = 0;
    run({
        next: function () {
            if (!wheelOn[pid]) return { done: true };
            const p = posOf(pid);
            if (!p || !isAliveId(pid)) { stopWheel(pid); return { done: true }; }

            const d = facing(pid);
            wheelRoll[pid] = (wheelRoll[pid] || 0) + 0.55;
            drawWheelParticles(p, d, wheelRoll[pid]);

            acc++;
            if (acc >= W_DMG_TICKS) {
                acc = 0;
                const list = entitiesIn([p[0] - 2.3, p[1] - 1.5, p[2] - 2.3], [p[0] + 2.3, p[1] + 2.2, p[2] + 2.3]);
                for (let i = 0; i < list.length; i++) {
                    const tid = list[i];
                    if (tid !== pid && isAliveId(tid)) {
                        damage(tid, dought_W_DMG, pid, wheelItem[pid]);
                        knockBack(tid, d[0] * 8, 2.5, d[2] * 8);
                    }
                }
            }

            let vy = 0;
            try { const v = api.getVelocity(pid); vy = (v && v[1]) || 0; } catch (e) { vy = 0; }
            if (vy > 0.1) wheelAir[pid] = true;
            if (wheelAir[pid] && vy <= 0.05) {
                wheelAir[pid] = false;
                shockwave(pid, Math.floor(p[0]), Math.floor(p[1]), Math.floor(p[2]), wheelItem[pid]);
            }

            return { value: sleep(W_FOLLOW), done: false };
        }
    });
}


/* GROWING RAY — rayon de béton rouge qui explose */
const B_GROW = 0.2, B_MAX = 6, B_GROW_MS = 250, B_DMG = 40, B_BOOM_R = 4;
const beams = {}, beamItem = {};

function explodeBeam(pid, ep, itemName) {
    beams[pid] = null;
    sound.at(ep, "cannonFire2", 0.9, 0.85, 26);
    try { boom(ep, 1, { count: 80, colors: [[[255, 40, 0], [255, 180, 0]], [[255, 0, 0, 0], [255, 80, 0, 0]]] }); }
    catch (e) {}

    const list = entitiesIn(
        [ep[0] - B_BOOM_R, ep[1] - B_BOOM_R, ep[2] - B_BOOM_R],
        [ep[0] + B_BOOM_R, ep[1] + B_BOOM_R, ep[2] + B_BOOM_R]
    );
    for (let i = 0; i < list.length; i++) {
        if (list[i] !== pid) damage(list[i], B_DMG, pid, itemName || beamItem[pid]);
    }
}

function startBeam(pid, itemName) {
    if (wheelOn[pid]) stopWheel(pid);
    if (beams[pid]) return;
    sound.at(pid, "magicAccent3", 0.85, 1.15, 22);
    beams[pid] = true;
    beamItem[pid] = itemName;
    let length = 1;

    run({
        next: function () {
            if (!beams[pid]) return { done: true };
            const p = posOf(pid);
            if (!p || !isAliveId(pid)) { beams[pid] = null; return { done: true }; }

            const d = facing(pid);
            const hx = p[0] + d[0] * 0.55, hy = p[1] + 0.75 + d[1] * 0.15, hz = p[2] + d[2] * 0.55;
            const ex = hx + d[0] * length, ey = hy + d[1] * length, ez = hz + d[2] * length;

            const steps = clamp(Math.floor(length), 2, 6);
            for (let s = 0; s <= steps; s++) {
                const t = s / steps;
                point([hx + (ex - hx) * t, hy + (ey - hy) * t, hz + (ez - hz) * t], {
                    r: 0.08, tex: TEX.glint,
                    life: [0.08, 0.16], power: [0.02, 0.1], size: [0.2, 0.32],
                    colors: [[[255, 60, 40], [255, 180, 80]]],
                });
            }

            if (length >= B_MAX) {
                explodeBeam(pid, [ex, ey, ez], itemName);
                beams[pid] = null;
                return { done: true };
            }

            let hb = null;
            try { const r = api.raycastForBlock([hx, hy, hz], d); hb = r && r.position; } catch (e) { hb = null; }
            if (hb) {
                const dx = hb[0] - hx, dy = hb[1] - hy, dz = hb[2] - hz;
                if (Math.sqrt(dx * dx + dy * dy + dz * dz) <= length + 0.5) {
                    explodeBeam(pid, hb, itemName);
                    beams[pid] = null;
                    return { done: true };
                }
            }

            length += B_GROW * 1.5;
            return { value: sleep(Math.max(2, Math.ceil(B_GROW_MS / 50))), done: false };
        }
    });
}


/* EXPORTS */
function onPlayerClickfullPunch(playerId, itemName, wasAlt, x, y, z, block, targetEId) {
    const tid = (targetEId && isAliveId(targetEId) && targetEId !== playerId)
        ? targetEId
        : pickTarget(playerId, 16, 0.72);
    if (tid) castFreeze(playerId, tid, itemName);
    else castForwardPunchBarrage(playerId, itemName);
    return true;
}

function onPlayerClickConcreteWheel(playerId, itemName) {
    if (wheelOn[playerId]) stopWheel(playerId);
    else startWheel(playerId, itemName);
    return true;
}

function onPlayerClickGrowingRay(playerId, itemName) {
    startBeam(playerId, itemName);
    return true;
}

function onPlayerClickDought(playerId, itemName) { return false; }

function onPlayerLeaveDought(playerId) {
    stopWheel(playerId);
    beams[playerId] = null;
    clearFreeze(playerId);
}


Object.assign(R,{onPlayerClickfullPunch,onPlayerClickConcreteWheel,onPlayerClickGrowingRay,onPlayerClickDought,onPlayerLeaveDought});
})(globalThis.FA);
