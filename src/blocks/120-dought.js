// src/blocks/120-dought.js — DOUGHT
// Source lisible. Ce fichier est minifié + empaqueté par `npm run build:blocks`.
// NE PAS coller ce fichier directement dans un Code Block : utiliser code-blocks/pack-XX.js.

(FA=>{/* source : ce fichier est regroupé avec d'autres dans un pack par le build. */const C=FA.c,R=FA.r,F=C.fx,{api,damage,eff,entitiesIn,heal,hitArea,hitSeg,impulse,isAliveId,lifeforms,markUntil,pickTarget,posOf,safeHealth,safePosition,statLevel,unmark,strengthMult,claimSummon,freeSummon,chest,facing,heading,isPlayerAlive,safeEntityName,safeEntityType,targetBlock,boom,box,boxSpan,CAGE,circle,clamp,column,dist2,distH2,frame,GOLDEN,inBox,norm,point,ring,TAU,TEX,run,setInterval,setTimeout,sleep,blockAt,clearIf,freeSpot,isSolid,raycast,setBlock,stuck,knockBack}=C,mesh=F,sound=F,ct_mesh=F.create,ct_to=F.move,ct_off=F.remove,ct_tilt=F.rotate,ct_preset=F.playParticle,soundAt=F.at,tf_create=F.create,tf_move=F.move,tf_remove=F.remove,tf_turn=F.rotate;
/* FULL PUNCH — cage de béton noir + dégâts sur la durée */
const FREEZE_MS = 3000, FREEZE_DMG = 10, FREEZE_EVERY = 250, PUNCH_MS = 900, CUBE = 0.28;
const freezeTok = {}, freezeSpeed = {};

function setSpeed(pid, v) {
    try { api.setClientOption(pid, "speedMultiplier", v); } catch (e) {}
}

function clearFreeze(tid) {
    freezeTok[tid] = (freezeTok[tid] || 0) + 1;
    if (isPlayerAlive(tid)) setSpeed(tid, freezeSpeed[tid] === undefined ? 1 : freezeSpeed[tid]);
    delete freezeSpeed[tid];
}

function castFreeze(caster, tid, itemName) {
    if (!tid || !isAliveId(tid)) return;
    clearFreeze(tid);
    sound.at(tid, "cannonFire1", 0.85, 0.9, 24);

    const tok = freezeTok[tid];
    const t0 = Date.now();
    const end = t0 + FREEZE_MS;
    const cubes = [];

    if (isPlayerAlive(tid)) {
        freezeSpeed[tid] = 1;
        setSpeed(tid, 0);
    }

    for (let i = 0; i < CAGE.length; i++) {
        const m = mesh.create("Black Concrete", 0.28, caster);
        if (m) cubes.push({ id: m.id, off: CAGE[i], delay: i * 70 });
    }

    function cleanup() {
        for (let j = 0; j < cubes.length; j++) mesh.remove(cubes[j].id);
        cubes.length = 0;
        if (freezeTok[tid] === tok && isPlayerAlive(tid)) {
            setSpeed(tid, freezeSpeed[tid] === undefined ? 1 : freezeSpeed[tid]);
            delete freezeSpeed[tid];
        }
    }

    const dot = setInterval(function () {
        if (freezeTok[tid] !== tok || Date.now() >= end || !isAliveId(tid)) { dot.stop(); return; }
        damage(tid, FREEZE_DMG, caster, itemName);
    }, Math.max(1, Math.ceil(FREEZE_EVERY / 50)));

    setTimeout(function () { dot.stop(); cleanup(); }, Math.ceil(FREEZE_MS / 50) + 2);

    run({
        next: function () {
            if (freezeTok[tid] !== tok || Date.now() >= end || !isAliveId(tid)) {
                dot.stop(); cleanup(); return { done: true };
            }
            const tp = posOf(tid);
            if (!tp) { dot.stop(); cleanup(); return { done: true }; }

            const now = Date.now();
            for (let j = 0; j < cubes.length; j++) {
                const c = cubes[j];
                const o = c.off;
                const d = Math.sqrt(o[0] * o[0] + o[1] * o[1] + o[2] * o[2]);
                if (d <= 0.01) { mesh.move(c.id, tp[0] + o[0], tp[1] + o[1], tp[2] + o[2]); continue; }

                const atk = now - (t0 + c.delay);
                let punch;
                if (atk < 0) {
                    mesh.move(c.id, tp[0] + o[0], tp[1] + o[1], tp[2] + o[2]);
                    mesh.resize(c.id, "Black Concrete", CUBE);
                    continue;
                }
                const cycle = atk % PUNCH_MS;
                const prog = cycle < 250 ? cycle / 250 : (cycle < 450 ? 1 : 1 - (cycle - 450) / 450);
                punch = 1.25 * prog;
                mesh.move(c.id,
                    tp[0] + o[0] - (o[0] / d) * punch,
                    tp[1] + o[1] - (o[1] / d) * punch,
                    tp[2] + o[2] - (o[2] / d) * punch);
            }
            return { value: sleep(2), done: false };
        }
    });
}


/* CONCRETE WHEEL — roulade qui écrase */
const W_SIZE = 1.8, W_SPEED = 0.5, dought_W_DMG = 5, W_DMG_TICKS = 5, W_MAX_MS = 5000;
const W_FOLLOW = 1, SHOCK_MAX_R = 6, SHOCK_STEP_MS = 300, SHOCK_DMG = 40;

const wheels = {}, wheelOn = {}, wheelRoll = {}, wheelAir = {}, wheelItem = {};

function stopWheel(pid) {
    if (wheelOn[pid]) sound.at(pid, "cannonFire3", 0.75, 1.2, 22);
    wheelOn[pid] = false;
    try { api.setPlayerOpacity(pid, 1); } catch (e) {}
    setSpeed(pid, 1);
    mesh.remove(wheels[pid]);
    wheels[pid] = null;
    delete wheelRoll[pid]; delete wheelAir[pid]; delete wheelItem[pid];
}

function shockwave(owner, cx, cy, cz, item) {
    sound.at([cx, cy, cz], "cannonFire1", 0.9, 0.75, 26);
    let r = 1, prev = [];
    run({
        next: function () {
            for (let i = 0; i < prev.length; i++) clearIf(prev[i][0], prev[i][1], prev[i][2], "Black Glass");

            if (r > SHOCK_MAX_R) return { done: true };
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
                const list = entitiesIn([b[0], b[1], b[2]], [b[0] + 1, b[1] + 2, b[2] + 1]);
                for (let t = 0; t < list.length; t++) {
                    if (list[t] !== owner) damage(list[t], SHOCK_DMG, owner, item);
                }
            }
            prev = nb; r++;
            return { value: sleep(Math.max(1, Math.ceil(SHOCK_STEP_MS / 50))), done: false };
        }
    });
}

function startWheel(pid, itemName) {
    sound.at(pid, "bigDrumSwish2", 0.85, 0.9, 24);
    const w = mesh.create("Gray Concrete", Math.min(W_SIZE, 1.35), pid);
    if (!w) return;

    wheels[pid] = w.id;
    wheelOn[pid] = true;
    wheelRoll[pid] = 0;
    wheelAir[pid] = false;
    wheelItem[pid] = itemName;

    setTimeout(function () { if (wheelOn[pid]) stopWheel(pid); }, Math.ceil(W_MAX_MS / 50));
    try { api.setPlayerOpacity(pid, 0); } catch (e) {}
    setSpeed(pid, W_SPEED);

    let acc = 0;
    run({
        next: function () {
            if (!wheelOn[pid]) return { done: true };
            const p = posOf(pid);
            if (!p || !isAliveId(pid)) { stopWheel(pid); return { done: true }; }

            const wheel = wheels[pid];
            if (!wheel) return { done: true };

            if ((acc % 2) === 0) {
                mesh.move(wheel, p[0], p[1], p[2]);
                wheelRoll[pid] = (wheelRoll[pid] || 0) + 0.15;
                mesh.rotate(wheel, wheelRoll[pid], heading(pid), 0);
            }

            acc++;
            if (acc >= W_DMG_TICKS) {
                acc = 0;
                const list = entitiesIn([p[0] - 1.5, p[1] - 1.5, p[2] - 1.5], [p[0] + 1.5, p[1] + 1.5, p[2] + 1.5]);
                for (let i = 0; i < list.length; i++) {
                    if (list[i] !== pid && isAliveId(list[i])) damage(list[i], dought_W_DMG, pid, wheelItem[pid]);
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
    if (!targetEId) return true;
    castFreeze(playerId, targetEId, itemName);
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
