/* ============================================================
   SONG (Dissonant Wave + Petal Refrain)
   1 fruit = 1 Code Block. Ne PAS modifier la 1re et la derniere ligne.
   ============================================================ */
(FA=>{/* Code Block fruits — colle ce fichier TEL QUEL dans UN Code Block du monde. */const C=FA.c,R=FA.r,F=C.fx,{api,damage,eff,entitiesIn,heal,hitArea,hitSeg,impulse,isAliveId,lifeforms,markUntil,pickTarget,posOf,safeHealth,safePosition,statLevel,unmark,strengthMult,claimSummon,freeSummon,chest,facing,heading,isPlayerAlive,safeEntityName,safeEntityType,targetBlock,boom,box,boxSpan,CAGE,circle,clamp,column,dist2,distH2,frame,GOLDEN,inBox,norm,point,ring,TAU,TEX,run,setInterval,setTimeout,sleep,blockAt,clearIf,freeSpot,isSolid,raycast,setBlock,stuck,knockBack}=C,mesh=F,sound=F,ct_mesh=F.create,ct_to=F.move,ct_off=F.remove,ct_tilt=F.rotate,ct_preset=F.playParticle,soundAt=F.at,tf_create=F.create,tf_move=F.move,tf_remove=F.remove,tf_turn=F.rotate;
const PINK = [255, 120, 225], MINT = [120, 255, 175];

/* DISSONANT WAVE */
const W_RANGE = 10, W_HALF = 0.62, song_W_DMG = 30, W_FRAMES = 12, W_RAYS = 10;
const W_KB = 2.2, W_LIFT = 0.9, W_APEX = 1.1, W_BODY = 0.9;
const W_COS = Math.cos(W_HALF);
const waves = {};

function coneDir(fr, u, phi) {
    const s = Math.sin(W_HALF * u), c = Math.cos(W_HALF * u);
    const cx = Math.cos(phi), sz = Math.sin(phi);
    const x = fr.f[0] * c + (fr.r[0] * cx + fr.u[0] * sz) * s;
    const y = fr.f[1] * c + fr.u[1] * sz * s;
    const z = fr.f[2] * c + (fr.r[2] * cx + fr.u[2] * sz) * s;
    const l = Math.sqrt(x * x + y * y + z * z) || 1;
    return [x / l, y / l, z / l];
}

function waveFx(st, r0, r1) {
    for (let i = 0; i < W_RAYS; i++) {
        const u = 0.3 + ((i * 5) % W_RAYS) / W_RAYS * 0.7;
        const phi = i * GOLDEN + st.f * 0.55;
        const d = coneDir(st.fr, u, phi);
        const rad = r0 + (r1 - r0) * (0.35 + (i % 3) * 0.32);
        const col = (i % 2) ? MINT : PINK;
        const other = (i % 2) ? PINK : MINT;

        point([st.p[0] + d[0] * rad, st.p[1] + d[1] * rad, st.p[2] + d[2] * rad], {
            r: 0.16, tex: (i % 3) ? TEX.glint : TEX.square,
            life: [0.16, 0.4], power: [0.5, 2], size: [0.2 + u * 0.12, 0.46 + u * 0.3],
            gravity: [0, -0.6, 0], dir: [d[0] * 2.7, d[1] * 2.7 + 0.6, d[2] * 2.7], dirSpread: 1.25,
            colors: [[col, [255, 255, 255]], [[other[0], other[1], other[2], 0], [col[0], col[1], col[2], 0]]],
        });
    }
}

function waveHits(st, r1) {
    const ids = lifeforms(st.pid);
    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        if (st.seen[id] || !isAliveId(id)) continue;
        const q = posOf(id);
        if (!q) continue;
        const dx = q[0] - st.p[0], dy = (q[1] + W_BODY) - st.p[1], dz = q[2] - st.p[2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < 0.05 || d > r1) continue;
        if ((dx * st.fr.f[0] + dy * st.fr.f[1] + dz * st.fr.f[2]) / d < W_COS) continue;

        st.seen[id] = 1;
        damage(id, song_W_DMG, st.pid, st.item);
        const hl = Math.sqrt(dx * dx + dz * dz) || 1;
        impulse(id, (dx / hl) * W_KB, W_LIFT, (dz / hl) * W_KB);
    }
}

function waveEnd(pid, st) {
    if (st && waves[pid] === st) delete waves[pid];
    return !!st;
}

function waveCo(st) {
    return {
        next: function () {
            if (waves[st.pid] !== st) return { done: true };
            const p = posOf(st.pid);
            if (!p || !isAliveId(st.pid)) { waveEnd(st.pid, st); return { done: true }; }

            st.p = [p[0], p[1] + W_APEX, p[2]];
            st.f++;
            const r0 = W_RANGE * ((st.f - 1) / W_FRAMES);
            const r1 = W_RANGE * (st.f / W_FRAMES);
            try { waveFx(st, r0, r1); waveHits(st, r1); } catch (e) {}

            if (st.f >= W_FRAMES) { waveEnd(st.pid, st); return { done: true }; }
            return { value: sleep(1), done: false };
        }
    };
}


/* PETAL RAIN */
const P_R = 7, P_H = 5, P_TICKS = 100, P_REDRAW = 2, P_PULSE = 10;
const P_DMG = 7, P_REG_LV = 2, P_REG_MS = 6600;
const P_FALL = 5, P_PETALS = 7, P_RING = 18, P_RING_EVERY = 8, P_REFRESH = 5;
const fields = {};

function inField(st, p) {
    const dx = p[0] - st.c[0], dz = p[2] - st.c[2];
    return dx * dx + dz * dz <= P_R * P_R && p[1] - st.c[1] >= -2 && p[1] - st.c[1] <= P_H;
}

function petal(x, y, z, sway, pink) {
    const col = pink ? PINK : MINT;
    const other = pink ? MINT : PINK;
    point([x, y, z], {
        r: 0.14, tex: TEX.square,
        life: [1.3, 2.2], power: [0.05, 0.4], size: [0.26, 0.5],
        gravity: [0, -2.2, 0], dir: [sway * 0.75, -0.025, 0], dirSpread: 0.3,
        colors: [[col, [255, 255, 255]],
                 [[col[0], col[1], col[2], 0.9], [other[0], other[1], other[2], 0.9]],
                 [[other[0], other[1], other[2], 0], [col[0], col[1], col[2], 0]]],
    });
}

function fieldRing(st) {
    circle(P_RING, function (i, a) {
        const k = 1 + ((i * 11 + st.t) % 6) / 60;
        point([st.c[0] + Math.cos(a) * P_R * k, st.c[1] + 0.27, st.c[2] + Math.sin(a) * P_R * k], {
            r: 0.3, tex: (i % 2) ? TEX.glint : TEX.effect,
            life: [0.3, 0.7], power: [0.1, 0.6], size: [0.25, 0.6],
            gravity: [0, 0.8, 0], dir: [0, 0.9, 0], dirSpread: 0.2,
            colors: [[[MINT[0], MINT[1], MINT[2], 0.85], [255, 255, 255, 0.9]],
                     [[PINK[0], PINK[1], PINK[2], 0], [255, 255, 255, 0]]],
        });
    }, st.t * 0.02);
}

function fieldDraw(st) {
    for (let i = 0; i < P_PETALS; i++) {
        const a = i * GOLDEN + st.t * 0.31;
        const k = Math.sqrt(((i * 17 + st.t * 5) % 20) / 20) * P_R;
        petal(st.c[0] + Math.cos(a) * k, st.c[1] + P_FALL, st.c[2] + Math.sin(a) * k,
            (i % 2 ? 1 : -1) * (0.4 + ((i * 7 + st.t) % 5) / 10), i % 2 === 0);
    }
    if (st.t % P_RING_EVERY === 0) fieldRing(st);

    const p = posOf(st.pid);
    if (p && inField(st, p)) {
        for (let i = 0; i < 3; i++) {
            petal(p[0] + Math.cos(st.t + i * 2.1) * 0.7, p[1] + 0.4 + i * 0.7, p[2] + Math.sin(st.t + i * 2.1) * 0.7, 0.2, i === 1);
        }
    }
}

function fieldBuff(st, on) {
    if (on) {
        if (st.buffed && st.t - st.last < P_REFRESH) return;
        st.buffed = 1; st.last = st.t;
        eff(st.pid, "Health Regen", P_REG_MS, { inbuiltLevel: P_REG_LV });
        return;
    }
    if (!st.buffed) return;
    st.buffed = 0;
    try { api.removeEffect(st.pid, "Health Regen"); } catch (e2) {}
}

function fieldPulse(st) {
    const list = entitiesIn([st.c[0] - P_R, st.c[1] - 2, st.c[2] - P_R], [st.c[0] + P_R, st.c[1] + P_H, st.c[2] + P_R]);
    for (let i = 0; i < list.length; i++) {
        const id = list[i];
        if (id === st.pid || !isAliveId(id)) continue;
        const p = posOf(id);
        if (p && inField(st, p)) damage(id, P_DMG, st.pid, st.item);
    }
}

function fieldStop(pid, st) {
    if (!st) return false;
    fieldBuff(st, false);
    if (fields[pid] === st) delete fields[pid];
    return true;
}

function fieldCo(st) {
    return {
        next: function () {
            if (fields[st.pid] !== st) return { done: true };
            if (!isAliveId(st.pid)) { fieldStop(st.pid, st); return { done: true }; }
            st.t++;
            const p = posOf(st.pid);
            try {
                fieldDraw(st);
                fieldBuff(st, !!(p && inField(st, p)));
                if (st.t % P_PULSE === 0) fieldPulse(st);
            } catch (e) {}
            if (st.t >= P_TICKS) { fieldStop(st.pid, st); return { done: true }; }
            return { value: sleep(P_REDRAW), done: false };
        }
    };
}

function onPlayerClickDissonantWave(pid, itemName) {
    if (!isAliveId(pid)) return false;
    const p = posOf(pid);
    if (!p) return true;
    if (waves[pid]) return true;

    const st = { pid: pid, item: itemName, f: 0, seen: {}, fr: frame(facing(pid)), p: [p[0], p[1] + W_APEX, p[2]] };
    waves[pid] = st;
    sound.at(pid, "cannonFire3", 0.6, 1.3, 22);
    run(waveCo(st));
    setTimeout(function () { waveEnd(pid, st); }, W_FRAMES + 8);
    return true;
}

function onPlayerClickPetalRefrain(pid, itemName) {
    if (!isAliveId(pid)) return false;
    if (fields[pid]) return true;
    const p = posOf(pid);
    if (!p) return true;

    const st = { pid: pid, item: itemName, c: [p[0], p[1], p[2]], t: 0, buffed: 0, last: -9 };
    fields[pid] = st;
    boom([p[0], p[1] + 0.6, p[2]], 2.6, { count: 70, colors: [[[255, 150, 220], [255, 255, 255]], [[255, 150, 220, 0], [150, 255, 190, 0]]] });
    sound.at(pid, "cannonFire3", 0.5, 1.15, 22);
    fieldBuff(st, true);
    run(fieldCo(st));
    setTimeout(function () { fieldStop(pid, st); }, P_TICKS * P_REDRAW + 8);
    return true;
}

function onCancelSong(pid) {
    waveEnd(pid, waves[pid]);
    fieldStop(pid, fields[pid]);
}

function onPlayerLeaveSong(pid) { onCancelSong(pid); }


Object.assign(R,{onPlayerClickDissonantWave,onPlayerClickPetalRefrain,onCancelSong,onPlayerLeaveSong});
})(globalThis.FA);
