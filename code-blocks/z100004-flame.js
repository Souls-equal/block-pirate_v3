/* ============================================================
   FLAME (Crimson Beam + Meteor Shower)
   1 fruit = 1 Code Block. Ne PAS modifier la 1re et la derniere ligne.
   ============================================================ */
(FA=>{/* Code Block fruits — colle ce fichier TEL QUEL dans UN Code Block du monde. */const C=FA.c,R=FA.r,F=C.fx,{api,damage,eff,entitiesIn,heal,hitArea,hitSeg,impulse,isAliveId,lifeforms,markUntil,pickTarget,posOf,safeHealth,safePosition,statLevel,unmark,strengthMult,claimSummon,freeSummon,chest,facing,heading,isPlayerAlive,safeEntityName,safeEntityType,targetBlock,boom,box,boxSpan,CAGE,circle,clamp,column,dist2,distH2,frame,GOLDEN,inBox,norm,point,ring,TAU,TEX,run,setInterval,setTimeout,sleep,blockAt,clearIf,freeSpot,isSolid,raycast,setBlock,stuck,knockBack}=C,mesh=F,sound=F,ct_mesh=F.create,ct_to=F.move,ct_off=F.remove,ct_tilt=F.rotate,ct_preset=F.playParticle,soundAt=F.at,tf_create=F.create,tf_move=F.move,tf_remove=F.remove,tf_turn=F.rotate;
/* Flame — “Crimson Beam” */

const LEN = 18, laser_STEP = 0.55, laser_HIT_R = 1.15, laser_DMG = 35, laser_EYE = 1.45;

function muzzle(o, d) {
    point(o, {
        r: 0.15, tex: TEX.effect, count: 16,
        life: [0.08, 0.2], power: [1.5, 3.5], size: [0.25, 0.55],
        dir: [d[0] * 1.5, d[1] * 1.5, d[2] * 1.5], dirSpread: 0.4,
        colors: [[[255, 255, 180], [255, 120, 40]], [[255, 120, 40, 0], [255, 60, 0, 0]]],
    });
}

function core(p, d, t) {
    point(p, {
        r: 0.08, tex: TEX.glint, count: 4,
        life: [0.12, 0.2], power: [0.02, 0.12], size: [(0.55 - t * 0.2) * 0.7, 0.55 - t * 0.2],
        dir: d, dirSpread: 0.05,
        colors: [[[255, 240, 200], [255, 180, 80]], [[255, 180, 80, 0], [255, 120, 40, 0]]],
    });
}

function glow(p, d, t) {
    point(p, {
        r: 0.08, tex: TEX.effect, count: 3,
        life: [0.18, 0.26], power: [0.02, 0.12], size: [(0.9 - t * 0.35) * 0.7, 0.9 - t * 0.35],
        dir: d, dirSpread: 0.05,
        colors: [[[255, 60, 20, 0.95], [255, 20, 0, 0.95]]],
    });
}

function laser_impact(p) {
    point(p, {
        r: 0.35, tex: TEX.crit, count: 18,
        life: [0.15, 0.4], power: [1.2, 2.8], size: [0.2, 0.45],
        gravity: [0, -6, 0], dir: [0, 0.7, 0], dirSpread: 1.2,
        colors: [[[255, 200, 80], [255, 60, 0]], [[255, 60, 0, 0], [255, 20, 0, 0]]],
    });
}

function onPlayerClickLaser(playerId, itemName) {
    const p = posOf(playerId);
    if (!p) return true;

    const d = facing(playerId);
    const o = [p[0] + d[0] * 0.4, p[1] + laser_EYE + d[1] * 0.2, p[2] + d[2] * 0.4];

    sound.at(playerId, "cannonFire3", 1, 1.35, 22);
    muzzle(o, d);

    const steps = Math.floor(LEN / laser_STEP);
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const pt = [o[0] + d[0] * i * laser_STEP, o[1] + d[1] * i * laser_STEP, o[2] + d[2] * i * laser_STEP];
        core(pt, d, t);
        if (i % 2 === 0) glow(pt, d, t);
    }

    const end = [o[0] + d[0] * LEN, o[1] + d[1] * LEN, o[2] + d[2] * LEN];
    const hit = hitSeg(o, end, laser_HIT_R, playerId, itemName, laser_DMG);
    laser_impact(hit.point);
    return true;
}


const MS_N = 6, MS_SPREAD = 3.6, MS_GAP = 5, MS_FALL = 0.9, MS_HIGH = 22;
const MS_AIM = 14, MS_REACH = 24, MS_R = 2.2, MS_DMG = 12;
const MS_FUSE = 5, MS_RING = 12, MS_SHARD = 8, MS_EMBER = 10, MS_KB = 2.4, MS_UP = 2.2, MS_CRATER = 22;
const MS_TICKS = 25, MS_BACK = 1 + MS_N * MS_GAP + MS_FUSE + MS_TICKS + 20;
const MS_SKY = [255, 190, 90], MS_FIRE = [255, 110, 24], MS_EMB = [255, 232, 140], MS_ROCK = [72, 46, 40], MS_ASH = [160, 110, 80];

const meteorShowers = {};

function ms_aim(pid) {
    const p = posOf(pid);
    if (!p) return null;
    const t = targetBlock(pid);
    if (t) {
        let dx = t[0] - p[0], dz = t[2] - p[2];
        const l = Math.sqrt(dx * dx + dz * dz);
        if (l > MS_REACH) { dx = dx / l * MS_REACH; dz = dz / l * MS_REACH }
        return [p[0] + dx, t[1], p[2] + dz];
    }
    const d = facing(pid);
    const l = Math.sqrt(d[0] * d[0] + d[2] * d[2]);
    const k = MS_AIM / (l > 0.05 ? l : 1);
    return [p[0] + d[0] * k, p[1], p[2] + d[2] * k];
}

function ms_spots(c) {
    const out = [];
    for (let i = 0; i < MS_N; i++) {
        const a = i * GOLDEN + 0.7;
        const r = MS_SPREAD * Math.sqrt((i + 0.5) / MS_N);
        out.push({ dx: Math.cos(a) * r, dz: Math.sin(a) * r });
    }
    return out;
}

function ms_top(x, z, y) {
    const fy = Math.floor(y);
    for (let k = 0; k <= 6; k++) {
        if (isSolid(x, fy - k, z)) return fy - k + 1.02;
    }
    return y;
}

function ms_shard(p, s, dir, n) {
    point(p, {
        r: 0.1, tex: (n % 2) ? TEX.glint : TEX.square, count: s > 1 ? 2 : 1,
        life: [0.12, 0.3], power: [0.4, 1.4], size: [s * 0.26, s * 0.5],
        gravity: [0, -3, 0], dir: dir, dirSpread: 0.55,
        colors: [[[(n % 3) ? MS_SKY[0] : MS_EMB[0], (n % 3) ? MS_SKY[1] : MS_EMB[1], (n % 3) ? MS_SKY[2] : MS_EMB[2], 1], [MS_FIRE[0], MS_FIRE[1], MS_FIRE[2], 0.9]],
                 [[MS_FIRE[0], MS_FIRE[1], MS_FIRE[2], 0.7], [MS_ROCK[0], MS_ROCK[1], MS_ROCK[2], 0]]],
    });
}

function ms_fall(m) {
    const s = 1 + m.k * 0.35;
    ms_shard([m.x, m.y, m.z], s, [0, 1, 0], m.i);
    for (let i = 0; i < 3; i++) {
        ms_shard([m.x + (i - 1) * 0.18, m.y + 0.5 + i * 0.42, m.z + (i % 2 ? 0.16 : -0.16)], s * 0.7, [0, 1.1, 0], m.i + i);
    }
    box([m.x - 0.4 * s, m.y - 0.4 * s, m.z - 0.4 * s], [m.x + 0.4 * s, m.y + 0.3, m.z + 0.4 * s], {
        tex: TEX.square, count: 2, life: [0.1, 0.22], power: [0.05, 0.35], size: [0.3 * s, 0.6 * s],
        gravity: [0, -1.4, 0], dir: [0, 0.6, 0], dirSpread: 0.4,
        colors: [[[MS_FIRE[0], MS_FIRE[1], MS_FIRE[2], 0.85], [MS_ASH[0], MS_ASH[1], MS_ASH[2], 0]]],
    });
}

function ms_tel(m, k) {
    const r = MS_R * (0.55 + 0.45 * k);
    circle(MS_RING, (i, a) => {
        const x = m.x + Math.cos(a) * r, z = m.z + Math.sin(a) * r;
        box([x - 0.14, m.fy, z - 0.14], [x + 0.14, m.fy + 0.12, z + 0.14], {
            tex: TEX.glint, count: 1, life: [0.1, 0.22], power: [0.05, 0.3], size: [0.16, 0.3],
            gravity: [0, 0.6, 0], dir: [0, 0.4, 0], dirSpread: 0.2,
            colors: [[[MS_FIRE[0], MS_FIRE[1], MS_FIRE[2], 0.5 + k * 0.45], [MS_ROCK[0], MS_ROCK[1], MS_ROCK[2], 0]]],
        });
    }, m.i);
}

function ms_bang(st, m) {
    const c = [m.x, m.fy, m.z];
    m.done = 1;
    boom(c, MS_R * 1.2, {
        count: MS_CRATER, power: [2.5, 6.5], size: [0.4, 1.2], life: [0.3, 0.75],
        colors: [[MS_EMB[0], MS_EMB[1], MS_EMB[2], 1], [MS_FIRE[0], MS_FIRE[1], MS_FIRE[2], 0]],
    });
    circle(MS_SHARD, (i, a) => {
        point([c[0] + Math.cos(a) * MS_R * 0.8, c[1] + 0.2, c[2] + Math.sin(a) * MS_R * 0.8], {
            r: 0.14, tex: TEX.glint, count: 2, life: [0.25, 0.6], power: [2.2, 4.4], size: [0.24, 0.6],
            gravity: [0, -6, 0], drag: 0.4,
            dir1: [Math.cos(a) * 2.2, 3.4, Math.sin(a) * 2.2], dir2: [Math.cos(a) * 4.6, 6.2, Math.sin(a) * 4.6],
            colors: [[[MS_EMB[0], MS_EMB[1], MS_EMB[2], 1], [MS_FIRE[0], MS_FIRE[1], MS_FIRE[2], 1]],
                     [[MS_FIRE[0], MS_FIRE[1], MS_FIRE[2], 0.8], [MS_ASH[0], MS_ASH[1], MS_ASH[2], 0]]],
        });
    }, m.i * 1.1);
    box([c[0] - MS_R, c[1], c[2] - MS_R], [c[0] + MS_R, c[1] + 0.5, c[2] + MS_R], {
        tex: TEX.bubble, count: MS_EMBER, life: [0.4, 1.1], power: [0.3, 1.1], size: [0.4, 1],
        gravity: [0, 1.8, 0], dir: [0, 0.8, 0], dirSpread: 1.6,
        colors: [[[MS_ASH[0], MS_ASH[1], MS_ASH[2], 0.8], [MS_ROCK[0], MS_ROCK[1], MS_ROCK[2], 0]]],
    });
    sound.at(c, "cannonFire3", 0.9, 0.45 + m.i * 0.05, 30);
    const ids = entitiesIn([c[0] - MS_R, c[1] - 1.2, c[2] - MS_R], [c[0] + MS_R, c[1] + 2.2, c[2] + MS_R]);
    for (let j = 0; j < ids.length; j++) {
        const id = ids[j];
        if (id === st.pid || m.hit[id] || !isAliveId(id)) continue;
        const p = posOf(id);
        if (!p || !ms_in(p, c, MS_R)) continue;
        m.hit[id] = 1;
        damage(id, MS_DMG, st.pid);
        const dx = p[0] - c[0], dz = p[2] - c[2];
        const l = Math.sqrt(dx * dx + dz * dz) || 1;
        ms_push(id, (dx / l) * MS_KB, MS_UP, (dz / l) * MS_KB);
    }
}

function ms_in(p, c, r) {
    const dx = p[0] - c[0], dz = p[2] - c[2];
    return dx * dx + dz * dz <= r * r && Math.abs(p[1] + 0.9 - c[1]) <= 2.2;
}

function ms_push(id, vx, vy, vz) {
    if (!id) return;
    try { impulse(id, vx, vy, vz) } catch (e) {}
}

function ms_co(st) {
    return { next: function () {
        if (meteorShowers[st.pid] !== st) return { done: true };
        if (!isAliveId(st.pid)) { ms_end(st.pid, st); return { done: true } }
        st.t++;
        let left = 0;
        try {
            for (let i = 0; i < st.rocks.length; i++) {
                const m = st.rocks[i];
                if (m.done) continue;
                left++;
                if (st.t < m.start) continue;
                if (st.t < m.start + MS_FUSE) { ms_tel(m, (st.t - m.start) / MS_FUSE); continue }
                m.k = Math.min(1, (st.t - m.start - MS_FUSE) / m.ticks);
                m.y = m.y0 + (m.fy - m.y0) * ms_ease(m.k);
                ms_fall(m);
                if (st.t >= m.start + MS_FUSE + m.ticks) { ms_bang(st, m); left-- }
            }
        } catch (e) {}
        if (!left) { ms_end(st.pid, st); return { done: true } }
        return { value: sleep(1), done: false };
    } }
}

function ms_ease(k) { return k * k * 0.7 + k * 0.3 }

function ms_end(pid, st) {
    const cur = meteorShowers[pid];
    if (!cur || (st && cur !== st)) return false;
    delete meteorShowers[pid];
    return true;
}

function onPlayerClickMeteorShower(pid, itemName) {
    if (!isAliveId(pid)) return false;
    if (meteorShowers[pid]) return true;
    const c = ms_aim(pid);
    if (!c) return true;
    const spots = ms_spots(c);
    const rocks = [];
    for (let i = 0; i < spots.length; i++) {
        const x = c[0] + spots[i].dx, z = c[2] + spots[i].dz;
        const fy = ms_top(x, z, c[1]);
        const y0 = fy + MS_HIGH;
        const ticks = Math.max(6, Math.ceil((y0 - fy) / MS_FALL));
        rocks.push({ i: i, x: x, z: z, fy: fy, y: y0, y0: y0, k: 0, start: 1 + i * MS_GAP, ticks: ticks, done: 0, hit: {} });
    }
    const st = { pid: pid, item: itemName, t: 0, rocks: rocks };
    meteorShowers[pid] = st;
    sound.at(pid, "cannonFire3", 0.6, 1.7, 24);
    run(ms_co(st));
    setTimeout(function () { ms_end(pid, st) }, MS_BACK);
    return true;
}

function onPlayerLeaveMeteorShower(pid) {
    ms_end(pid);
    try { if (R.onPlayerLeaveLava) R.onPlayerLeaveLava(pid) } catch (e) {}
    try { if (R.onPlayerLeaveMagma) R.onPlayerLeaveMagma(pid) } catch (e2) {}
    return true;
}

function onCancelMeteorShower(pid) { return ms_end(pid) }


Object.assign(R,{onPlayerClickLaser,onPlayerClickMeteorShower,onPlayerLeaveMeteorShower,onCancelMeteorShower});
})(globalThis.FA);
