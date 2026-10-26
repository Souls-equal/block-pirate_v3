/* ============================================================
   BLIZZARD (Frostfall + Shatterfrost)
   1 fruit = 1 Code Block. Ne PAS modifier la 1re et la derniere ligne.
   ============================================================ */
(FA=>{/* Code Block fruits — colle ce fichier TEL QUEL dans UN Code Block du monde. */const C=FA.c,R=FA.r,F=C.fx,{api,damage,eff,entitiesIn,heal,hitArea,hitSeg,impulse,isAliveId,lifeforms,markUntil,pickTarget,posOf,safeHealth,safePosition,statLevel,unmark,strengthMult,claimSummon,freeSummon,chest,facing,heading,isPlayerAlive,safeEntityName,safeEntityType,targetBlock,boom,box,boxSpan,CAGE,circle,clamp,column,dist2,distH2,frame,GOLDEN,inBox,norm,point,ring,TAU,TEX,run,setInterval,setTimeout,sleep,blockAt,clearIf,freeSpot,isSolid,raycast,setBlock,stuck,knockBack}=C,mesh=F,sound=F,ct_mesh=F.create,ct_to=F.move,ct_off=F.remove,ct_tilt=F.rotate,ct_preset=F.playParticle,soundAt=F.at,tf_create=F.create,tf_move=F.move,tf_remove=F.remove,tf_turn=F.rotate;
/* BLIZZARD — Frostfall */
const WI_R = 13, WI_R0 = 5, WI_GROW = 12, WI_H = 7, WI_TICKS = 70, WI_REDRAW = 3, WI_PULSE = 8;
const WI_DMG = 5, WI_CHILL = 1, WI_MAX = 4, WI_SLO0 = 2, WI_SLO_MAX = 4, WI_FX = 2000;
const WI_FALL = 8, WI_FLAKES = 14, WI_RING = 24, WI_RING_EVERY = 4, WI_WIND = 6, WI_WIND_EVERY = 2;
const WI_FWD = 12, WI_CLAMP = 12, WI_BODY = 0.9, WI_UNDER = -2.5;
const WI_SNOW = [255, 255, 255], WI_ICE = [175, 220, 255], WI_DEEP = [95, 150, 240];
const blizzStorms = {};

function wi_flat(pid) {
    const d = facing(pid);
    const l = Math.sqrt(d[0] * d[0] + d[2] * d[2]);
    return l < 1e-4 ? [0, 1] : [d[0] / l, d[2] / l];
}

function wi_target(pid) {
    const p = posOf(pid);
    if (!p) return null;
    const t = targetBlock(pid);
    let x, y, z;
    if (t) { x = t[0]; y = t[1]; z = t[2] }
    else {
        const f = wi_flat(pid);
        x = p[0] + f[0] * WI_FWD; y = p[1]; z = p[2] + f[1] * WI_FWD;
    }
    const dx = x - p[0], dz = z - p[2];
    const l = Math.sqrt(dx * dx + dz * dz);
    if (l > WI_CLAMP) { x = p[0] + dx / l * WI_CLAMP; z = p[2] + dz / l * WI_CLAMP }
    return [x, y, z];
}

function wi_in(st, p) {
    const dx = p[0] - st.cx, dz = p[2] - st.cz, dy = p[1] - st.cy;
    return dx * dx + dz * dz <= st.r * st.r && dy >= WI_UNDER && dy <= WI_H;
}

function wi_flake(x, y, z, sway, icy) {
    const col = icy ? WI_ICE : WI_SNOW, other = icy ? WI_SNOW : WI_ICE;
    point([x, y, z], {
        r: 0.1, tex: icy ? TEX.bubble : TEX.square, count: 1,
        life: [2.2, 3.4], power: [0.05, 0.35], size: [0.18, 0.42],
        gravity: [0, -1.1, 0], dir: [sway, -0.05, 0], dirSpread: 0.35,
        colors: [[[col[0], col[1], col[2], 0.95], [255, 255, 255, 1]],
                 [[other[0], other[1], other[2], 0.8], [col[0], col[1], col[2], 0.85]],
                 [[WI_DEEP[0], WI_DEEP[1], WI_DEEP[2], 0], [other[0], other[1], other[2], 0]]],
    });
}

function wi_ring(st) {
    circle(WI_RING, function (i, a) {
        const ang = a - st.t * 0.03;
        const k = 1 + ((i * 11 + st.t) % 6) / 70;
        point([st.cx + Math.cos(ang) * st.r * k, st.cy + 0.28, st.cz + Math.sin(ang) * st.r * k], {
            r: 0.35, tex: (i % 2) ? TEX.glint : TEX.effect, count: 1,
            life: [0.4, 0.9], power: [0.1, 0.5], size: [0.24, 0.56],
            gravity: [0, 0.6, 0], dir: [0, 0.7, 0], dirSpread: 0.25,
            colors: [[[WI_SNOW[0], WI_SNOW[1], WI_SNOW[2], 0.9], [255, 255, 255, 1]],
                     [[WI_ICE[0], WI_ICE[1], WI_ICE[2], 0], [WI_DEEP[0], WI_DEEP[1], WI_DEEP[2], 0]]],
        });
    });
}

function wi_wind(st) {
    for (let i = 0; i < WI_WIND; i++) {
        const a = i * 1.0472 + st.t * 0.16;
        const r = st.r * (0.45 + (i % 3) * 0.26);
        const x = st.cx + Math.cos(a) * r, z = st.cz + Math.sin(a) * r, y = st.cy + 1.2 + (i % 4) * 1.1;
        box([x - 0.7, y - 0.06, z - 0.7], [x + 0.7, y + 0.06, z + 0.7], {
            tex: TEX.glint, count: 2,
            life: [0.3, 0.6], power: [1, 2.4], size: [0.2, 0.5],
            gravity: [0, -0.2, 0],
            dir1: [-Math.sin(a) * 2, 0.1, Math.cos(a) * 2],
            dir2: [-Math.sin(a) * 4.5, 0.5, Math.cos(a) * 4.5],
            colors: [[[WI_SNOW[0], WI_SNOW[1], WI_SNOW[2], 0.6], [255, 255, 255, 0.8]],
                     [[WI_ICE[0], WI_ICE[1], WI_ICE[2], 0], [WI_SNOW[0], WI_SNOW[1], WI_SNOW[2], 0]]],
        });
    }
}

function wi_flakes(st) {
    for (let i = 0; i < WI_FLAKES; i++) {
        const a = i * GOLDEN + st.t * 0.21;
        const k = Math.sqrt(((i * 17 + st.t * 5) % 20) / 20) * st.r;
        const sway = (i % 2 ? 1 : -1) * (0.5 + ((i * 7 + st.t) % 6) / 12);
        wi_flake(st.cx + Math.cos(a) * k, st.cy + WI_FALL, st.cz + Math.sin(a) * k, sway, i % 3 === 0);
    }
}

function wi_frost(x, y, z, n) {
    box([x - 0.5, y - 0.5, z - 0.5], [x + 0.5, y + 0.9, z + 0.5], {
        tex: n > 2 ? TEX.effect : TEX.bubble, count: 4 + n * 2,
        life: [0.25, 0.55 + n * 0.1], power: [0.6, 1.6], size: [0.14, 0.34],
        gravity: [0, -1.6, 0], dir: [0, 0.4, 0], dirSpread: 1,
        colors: [[[WI_SNOW[0], WI_SNOW[1], WI_SNOW[2], 1], [WI_ICE[0], WI_ICE[1], WI_ICE[2], 1]],
                 [[WI_DEEP[0], WI_DEEP[1], WI_DEEP[2], 0], [WI_ICE[0], WI_ICE[1], WI_ICE[2], 0]]],
    });
}

function wi_relief(st) {
    for (const id in st.slo) {
        const p = isAliveId(id) ? posOf(id) : null;
        if (p && wi_in(st, p)) continue;
        delete st.slo[id];
        try { api.removeEffect(id, "Slowness") } catch (e) {}
    }
}

function wi_pulse(st) {
    const ids = entitiesIn([st.cx - st.r, st.cy + WI_UNDER, st.cz - st.r], [st.cx + st.r, st.cy + WI_H, st.cz + st.r]);
    const inStorm = {};
    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        if (id === st.pid || inStorm[id] || !isAliveId(id)) continue;
        const p = posOf(id);
        if (!p || !wi_in(st, p)) continue;
        inStorm[id] = 1;
        let seed = 0;
        const rec = globalThis.__chilled && globalThis.__chilled[id];
        if (rec && api.now() < rec.exp) seed = rec.n;
        let n = ((st.chill[id] || 0) || seed) + 1;
        if (n > WI_MAX) n = WI_MAX;
        st.chill[id] = n; st.slo[id] = 1;
        let lv = WI_SLO0 + n - 1;
        if (lv > WI_SLO_MAX) lv = WI_SLO_MAX;
        eff(id, "Slowness", WI_FX, { inbuiltLevel: lv });
        damage(id, WI_DMG + (n - 1) * WI_CHILL, st.pid);
        try { globalThis.__chilled[id] = { n: n, by: st.pid, exp: api.now() + SF_KEEP }; } catch (e2) {}
        wi_frost(p[0], p[1] + WI_BODY, p[2], n);
    }
    for (const id in st.chill) {
        if (inStorm[id]) continue;
        if (--st.chill[id] <= 0) delete st.chill[id];
        const r = globalThis.__chilled && globalThis.__chilled[id];
        if (!r || r.by !== st.pid) continue;
        if (st.chill[id]) r.n = st.chill[id]; else delete globalThis.__chilled[id];
    }
}

function wi_end(pid, st) {
    if (!st) return false;
    for (const id in st.slo) { try { api.removeEffect(id, "Slowness") } catch (e) {} }
    if (blizzStorms[pid] === st) delete blizzStorms[pid];
    return true;
}

function wi_co(st) {
    return { next: function () {
        if (blizzStorms[st.pid] !== st) return { done: true };
        if (!isAliveId(st.pid)) { wi_end(st.pid, st); return { done: true } }
        st.t++;
        st.r = st.t < WI_GROW ? WI_R0 + (WI_R - WI_R0) * (st.t / WI_GROW) : WI_R;
        try {
            wi_flakes(st);
            if (st.t % WI_RING_EVERY === 0) wi_ring(st);
            if (st.t % WI_WIND_EVERY === 0) wi_wind(st);
            wi_relief(st);
            if (st.t % WI_PULSE === 0) wi_pulse(st);
        } catch (e) {}
        if (st.t >= WI_TICKS) { wi_end(st.pid, st); return { done: true } }
        return { value: sleep(WI_REDRAW), done: false };
    } };
}

function onPlayerClickFrostfall(pid, itemName) {
    if (!isAliveId(pid)) return false;
    if (blizzStorms[pid]) return true;
    const p = posOf(pid);
    if (!p) return true;
    const t = wi_target(pid);
    if (!t) return true;
    const st = { pid: pid, item: itemName, cx: t[0], cy: t[1], cz: t[2], r: WI_R0, t: 0, chill: {}, slo: {} };
    blizzStorms[pid] = st;
    boom([t[0], t[1] + 0.5, t[2]], 3.2, { colors: [[205, 240, 255, 1], [205, 240, 255, 0]] });
    sound.at(pid, "cannonFire3", 0.5, 1.35, 26);
    run(wi_co(st));
    setTimeout(function () { wi_end(pid, st) }, WI_TICKS * WI_REDRAW + 8);
    return true;
}


/* BLIZZARD — Shatterfrost */
const SF_R = 7, SF_SEEK = 24, SF_H = 4.5, SF_DMG = 8, SF_STACK = 7, SF_KEEP = 8000;
const SF_KB0 = 1.9, SF_UP0 = 0.8, SF_KB = 3, SF_UP = 2;
const SF_SLO = 1, SF_SLO_MS = 1500, SF_WEAK_MS = 2500, SF_WEAK_LV = 2;
const SF_FRAMES = 9, SF_REDRAW = 2, SF_RING = 26, SF_SHARDS = 12, SF_APEX = 1.1;
const SF_WHITE = [255, 255, 255], SF_ICE = [185, 225, 255], SF_DEEP = [95, 150, 240];
const blizzShocks = {};

if (typeof globalThis !== "undefined" && !globalThis.__chilled) globalThis.__chilled = {};

function bfs_rec(id) {
    const r = globalThis.__chilled[id];
    return (r && api.now() < r.exp) ? r : null;
}

function bfs_note(id, n, by) {
    if (n < 1) n = 1;
    if (n > WI_MAX) n = WI_MAX;
    globalThis.__chilled[id] = { n: n, by: by, exp: api.now() + SF_KEEP };
}

function bfs_wipe(id) {
    const r = globalThis.__chilled[id];
    delete globalThis.__chilled[id];
    if (!r || !r.by) return;
    const z = blizzStorms[r.by];
    if (z && z.chill) z.chill[id] = 0;
}

function bfs_grad(a, b) {
    return [[a, b], [[SF_DEEP[0], SF_DEEP[1], SF_DEEP[2], 0], [SF_ICE[0], SF_ICE[1], SF_ICE[2], 0]]];
}

function bfs_ringFx(st) {
    const fade = 1 - st.f / SF_FRAMES, rr = SF_R * (1 + st.f * 0.16);
    for (let i = 0; i < SF_RING; i++) {
        const a = (i / SF_RING) * Math.PI * 2;
        const x = st.x + Math.cos(a) * rr, z = st.z + Math.sin(a) * rr;
        const k = 0.6 + (i % 4) * 0.1;
        box([x - 0.3, st.y + 0.05, z - 0.3], [x + 0.3, st.y + 0.75, z + 0.3], {
            tex: (i % 2) ? TEX.glint : TEX.effect, count: 1,
            life: [0.2, 0.45], power: [0.5, 1.6], size: [0.22 * k + 0.1, 0.5 * k + 0.2],
            gravity: [0, -1.2, 0],
            dir1: [Math.cos(a) * 1.4, 0.6, Math.sin(a) * 1.4],
            dir2: [Math.cos(a) * 3.6, 2.4, Math.sin(a) * 3.6],
            colors: bfs_grad([SF_WHITE[0], SF_WHITE[1], SF_WHITE[2], 0.55 + fade * 0.45],
                [SF_ICE[0], SF_ICE[1], SF_ICE[2], 1]),
        });
    }
}

function bfs_burstFx(x, y, z, n) {
    for (let i = 0; i < SF_SHARDS; i++) {
        const a = (i / SF_SHARDS) * Math.PI * 2 + n * 0.4;
        const sp = 2.4 + (i % 3) * 0.9;
        const vx = Math.cos(a) * sp, vz = Math.sin(a) * sp, vy = 2.2 + (i % 4) * 0.7;
        point([x, y, z], {
            r: 0.12, tex: (i % 3) ? TEX.glint : TEX.square, count: 1,
            life: [0.35, 0.6 + n * 0.05], power: [3, 6], size: [0.2, 0.46],
            gravity: [0, -7, 0], drag: 0.35,
            dir1: [vx * 0.7, vy * 0.7, vz * 0.7], dir2: [vx, vy + 1.2, vz],
            colors: bfs_grad([SF_WHITE[0], SF_WHITE[1], SF_WHITE[2], 1], [SF_ICE[0], SF_ICE[1], SF_ICE[2], 1]),
        });
    }
    box([x - 0.7, y - 0.5, z - 0.7], [x + 0.7, y + 1.1, z + 0.7], {
        tex: TEX.bubble, count: 10 + n * 4,
        life: [0.3, 0.7], power: [0.4, 1.4], size: [0.3, 0.8],
        gravity: [0, -2.2, 0], dir: [0, 0.9, 0], dirSpread: 1.4,
        colors: bfs_grad([SF_WHITE[0], SF_WHITE[1], SF_WHITE[2], 0.95], [SF_ICE[0], SF_ICE[1], SF_ICE[2], 0.9]),
    });
}

function bfs_chompFx(x, y, z) {
    box([x - 0.4, y - 0.3, z - 0.4], [x + 0.4, y + 0.8, z + 0.4], {
        tex: TEX.bubble, count: 6,
        life: [0.25, 0.55], power: [0.3, 1], size: [0.2, 0.5],
        gravity: [0, -2, 0], dir: [0, 0.75, 0], dirSpread: 0.5,
        colors: bfs_grad([SF_WHITE[0], SF_WHITE[1], SF_WHITE[2], 0.85], [SF_ICE[0], SF_ICE[1], SF_ICE[2], 0.8]),
    });
}

function bfs_snap(st) {
    const ids = entitiesIn([st.x - SF_SEEK, st.y - 3, st.z - SF_SEEK], [st.x + SF_SEEK, st.y + SF_H + 2, st.z + SF_SEEK]);
    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        if (id === st.pid || st.done[id] || !isAliveId(id)) continue;
        const p = posOf(id);
        if (!p) continue;
        const dx = p[0] - st.x, dz = p[2] - st.z;
        const dh = Math.sqrt(dx * dx + dz * dz);
        if (dh > SF_SEEK) continue;
        st.done[id] = 1;
        const ring = dh <= SF_R && Math.abs(p[1] - st.y) <= SF_H;
        const rec = bfs_rec(id), n = rec ? rec.n : 0;
        const hot = n > 0;
        if (!ring && !hot) continue;
        const amt = hot ? SF_DMG + n * SF_STACK : SF_DMG;
        if (hot) {
            bfs_wipe(id);
            eff(id, "Weakness", SF_WEAK_MS, { inbuiltLevel: SF_WEAK_LV });
        } else {
            bfs_note(id, 1, st.pid);
            eff(id, "Slowness", SF_SLO_MS, { inbuiltLevel: SF_SLO });
        }
        damage(id, amt, st.pid);
        let kb = hot ? SF_KB : SF_KB0;
        if (!ring) kb = 0.4;
        const l = dh < 0.05 ? 1 : dh;
        knockBack(id, (dx / l) * kb, hot ? SF_UP : SF_UP0, (dz / l) * kb);
        if (hot) bfs_burstFx(p[0], p[1] + 1.1, p[2], n); else bfs_chompFx(p[0], p[1] + 1, p[2]);
    }
}

function bfs_end(pid, st) { if (st && blizzShocks[pid] === st) delete blizzShocks[pid]; return !!st }

function bfs_co(st) {
    return { next: function () {
        if (blizzShocks[st.pid] !== st) return { done: true };
        if (!isAliveId(st.pid)) { bfs_end(st.pid, st); return { done: true } }
        st.f++;
        try { bfs_ringFx(st) } catch (e) {}
        if (st.f >= SF_FRAMES) { bfs_end(st.pid, st); return { done: true } }
        return { value: sleep(SF_REDRAW), done: false };
    } };
}

function onPlayerClickShatterfrost(pid, itemName) {
    if (!isAliveId(pid)) return false;
    if (blizzShocks[pid]) return true;
    const p = posOf(pid);
    if (!p) return true;
    const st = { pid: pid, item: itemName, x: p[0], y: p[1], z: p[2], f: 0, done: {} };
    blizzShocks[pid] = st;
    boom([p[0], p[1] + SF_APEX, p[2]], 2.4, { colors: [[190, 230, 255, 1], [190, 230, 255, 0]] });
    sound.at(pid, "cannonFire3", 0.7, 2, 24);
    try { bfs_snap(st) } catch (e) {}
    run(bfs_co(st));
    setTimeout(function () { bfs_end(pid, st) }, SF_FRAMES * SF_REDRAW + 4);
    return true;
}

function onCancelBlizzard(pid) {
    const a = wi_end(pid, blizzStorms[pid]), b = bfs_end(pid, blizzShocks[pid]);
    if (globalThis.__chilled) delete globalThis.__chilled[pid];
    return a || b;
}
function onPlayerLeaveBlizzard(pid) { onCancelBlizzard(pid) }


Object.assign(R,{onPlayerClickFrostfall,onPlayerClickShatterfrost,onCancelBlizzard,onPlayerLeaveBlizzard});
})(globalThis.FA);
