/* ============================================================
   MAGMA (Magma Rings + Lava Jet + poches de lave)
   1 fruit = 1 Code Block. Ne PAS modifier la 1re et la derniere ligne.
   ============================================================ */
(FA=>{/* Code Block fruits — colle ce fichier TEL QUEL dans UN Code Block du monde. */const C=FA.c,R=FA.r,F=C.fx,{api,damage,eff,entitiesIn,heal,hitArea,hitSeg,impulse,isAliveId,lifeforms,markUntil,pickTarget,posOf,safeHealth,safePosition,statLevel,unmark,strengthMult,claimSummon,freeSummon,chest,facing,heading,isPlayerAlive,safeEntityName,safeEntityType,targetBlock,boom,box,boxSpan,CAGE,circle,clamp,column,dist2,distH2,frame,GOLDEN,inBox,norm,point,ring,TAU,TEX,run,setInterval,setTimeout,sleep,blockAt,clearIf,freeSpot,isSolid,raycast,setBlock,stuck,knockBack}=C,mesh=F,sound=F,ct_mesh=F.create,ct_to=F.move,ct_off=F.remove,ct_tilt=F.rotate,ct_preset=F.playParticle,soundAt=F.at,tf_create=F.create,tf_move=F.move,tf_remove=F.remove,tf_turn=F.rotate;
const LG_HEAT = 2, LG_MAXH = 3, LG_BEAT = 3, LG_PULSE = 8;
const LG_RIM = 14, LG_BUB = 5, LG_EDGE = 1.9;
const LG_HOT = [255, 138, 30], LG_CORE = [255, 232, 130], LG_ROCK = [78, 44, 34], LG_ASH = [150, 92, 62];

const lavaGround = {};

function lg_flat(pid) {
    const d = facing(pid);
    const l = Math.sqrt(d[0] * d[0] + d[2] * d[2]);
    return (l > 0.05) ? [d[0] / l, d[2] / l] : [0, 1];
}

function lg_floor(x, y, z) {
    for (let k = 0; k <= 6; k++) {
        const fy = Math.floor(y) + 1 - k;
        if (isSolid(x, fy - 1, z) && !isSolid(x, fy, z)) return fy + 0.02;
    }
    return Math.floor(y) + 0.02;
}

function lg_book(pid, itemName) {
    let st = lavaGround[pid];
    if (st) { st.item = itemName; return st; }
    st = { pid: pid, item: itemName, t: 0, pools: [], heat: {} };
    lavaGround[pid] = st;
    run(lg_co(st));
    return st;
}

function lg_add(pid, itemName, x, y, z, r, life, dmg, kind) {
    const st = lg_book(pid, itemName);
    const pl = { x: x, y: y, z: z, r: r, t: 0, life: life, dmg: dmg, k: kind, seed: st.pools.length * 1.7 };
    st.pools.push(pl);
    return pl;
}

function lg_take(pid, kind) {
    const st = lavaGround[pid];
    if (!st) return;
    for (let i = st.pools.length - 1; i >= 0; i--) if (st.pools[i].k === kind) st.pools.splice(i, 1);
    if (!st.pools.length) lg_end(pid);
}

function lg_in(p, q, r) {
    const dx = p[0] - q[0], dz = p[2] - q[2];
    return dx * dx + dz * dz <= r * r;
}

function lg_grain(p, rr, col, n) {
    box([p[0] - rr, p[1] - 0.05, p[2] - rr], [p[0] + rr, p[1] + rr + 0.1, p[2] + rr], {
        tex: (n % 2) ? TEX.glint : TEX.square, count: 1,
        life: [0.32, 0.55], power: [0.35, 1.1], size: [rr * 0.9, rr * 1.9],
        gravity: [0, 1.5, 0], dir1: [-0.5, 0.4, -0.5], dir2: [0.5, 1.7, 0.5],
        colors: [[[col[0], col[1], col[2], 1], [LG_CORE[0], LG_CORE[1], LG_CORE[2], 0.85]],
                 [[LG_ROCK[0], LG_ROCK[1], LG_ROCK[2], 0], [col[0], col[1], col[2], 0]]],
    });
}

function lg_draw(pl) {
    const fade = pl.t / pl.life, cold = fade > 0.65;
    for (let i = 0; i < LG_BUB; i++) {
        const a = pl.seed + i * GOLDEN + pl.t * 0.06;
        const k = 0.18 + (i % 3) * 0.24;
        lg_grain([pl.x + Math.cos(a) * pl.r * k, pl.y + 0.05, pl.z + Math.sin(a) * pl.r * k],
            0.2 + k * 0.2, cold ? LG_ASH : LG_HOT, i);
    }
    for (let i = 0; i < LG_RIM; i++) {
        const a = (i / LG_RIM) * Math.PI * 2 + pl.seed;
        const cx = pl.x + Math.cos(a) * pl.r, cz = pl.z + Math.sin(a) * pl.r;
        box([cx - 0.16, pl.y - 0.06, cz - 0.16], [cx + 0.16, pl.y + 0.16, cz + 0.16], {
            tex: TEX.square, count: 1, life: [0.2, 0.42], power: [0.15, 0.5],
            size: [0.16, 0.3], gravity: [0, 0.4, 0], dir: [0, 0.5, 0], dirSpread: 0.3,
            colors: [[[(cold ? LG_ROCK[0] : LG_HOT[0]), (cold ? LG_ROCK[1] : LG_HOT[1]),
                      (cold ? LG_ROCK[2] : LG_HOT[2]), 0.9], [LG_ASH[0], LG_ASH[1], LG_ASH[2], 0]]],
        });
    }
}

function lg_pulse(st) {
    const touched = {};
    for (let i = 0; i < st.pools.length; i++) {
        const pl = st.pools[i];
        const ids = entitiesIn([pl.x - pl.r, pl.y - 0.4, pl.z - pl.r], [pl.x + pl.r, pl.y + LG_EDGE, pl.z + pl.r]);
        for (let j = 0; j < ids.length; j++) {
            const id = ids[j];
            if (id === st.pid || touched[id] || !isAliveId(id)) continue;
            const p = posOf(id);
            if (!p || !lg_in(p, [pl.x, pl.y, pl.z], pl.r)) continue;
            touched[id] = 1;
            const h = st.heat[id] || 0;
            if (h < LG_MAXH) st.heat[id] = h + 1;
            damage(id, pl.dmg + h * LG_HEAT, st.pid);
        }
    }
    for (const id in st.heat) {
        if (touched[id]) continue;
        if (--st.heat[id] <= 0) delete st.heat[id];
    }
}

function lg_co(st) {
    return { next: function () {
        if (lavaGround[st.pid] !== st) return { done: true };
        if (!isAliveId(st.pid)) { lg_end(st.pid); return { done: true } }
        st.t++;
        try {
            for (let i = st.pools.length - 1; i >= 0; i--) {
                const pl = st.pools[i];
                pl.t++;
                lg_draw(pl);
                if (pl.t >= pl.life) {
                    box([pl.x - pl.r, pl.y, pl.z - pl.r], [pl.x + pl.r, pl.y + 0.3, pl.z + pl.r], {
                        tex: TEX.bubble, count: 8, life: [0.4, 0.9], power: [0.2, 0.7],
                        size: [0.3, 0.7], gravity: [0, 1.4, 0], dir: [0, 0.6, 0], dirSpread: 1.1,
                        colors: [[[LG_ASH[0], LG_ASH[1], LG_ASH[2], 0.7], [LG_ROCK[0], LG_ROCK[1], LG_ROCK[2], 0]]],
                    });
                    st.pools.splice(i, 1);
                }
            }
            if (st.t % LG_PULSE === 0) lg_pulse(st);
        } catch (e) {}
        if (!st.pools.length) { lg_end(st.pid); return { done: true } }
        return { value: sleep(LG_BEAT), done: false };
    } }
}

function lg_end(pid) {
    const st = lavaGround[pid];
    if (!st) return false;
    delete lavaGround[pid];
    return true;
}


const MR_N = 3, MR_OUT = 4.4, MR_R = 4.6, MR_LIFE = 90, MR_DMG = 6, MR_STEPA = 2.0944;

function onPlayerClickMagmaRings(pid, itemName) {
    if (!isAliveId(pid)) return false;
    const p = posOf(pid);
    if (!p) return true;
    lg_take(pid, "rings");
    const f = lg_flat(pid);
    const base = Math.atan2(f[0], f[1]);
    const st = lg_book(pid, itemName);
    for (let i = 0; i < MR_N; i++) {
        const a = base + i * MR_STEPA;
        const x = p[0] + Math.sin(a) * MR_OUT, z = p[2] + Math.cos(a) * MR_OUT;
        const y = lg_floor(x, p[1], z);
        lg_add(pid, itemName, x, y, z, MR_R, MR_LIFE, MR_DMG, "rings");
        boom([x, y + 0.3, z], MR_R * 1.1, {
            colors: [[LG_CORE[0], LG_CORE[1], LG_CORE[2], 1], [LG_HOT[0], LG_HOT[1], LG_HOT[2], 0]],
        });
    }
    sound.at(pid, "cannonFire3", 0.85, 0.6, 24);
    return true;
}


const LJ_FWD = 0.275, LJ_UP = 0.31, LJ_GRAV = 0.0195, LJ_LIFE = 46, LJ_CHEST = 1.0;
const LJ_DMG = 7, LJ_AGAIN = 8, LJ_HITR = 1.15, LJ_PASS = 1.6, LJ_SLO = 1200, LJ_TR = 3, LJ_DROP = 9;
const LJ_POOL_R = 2.2, LJ_POOL_LIFE = 60, LJ_POOL_DMG = 7;
const lavaJets = {};

function lavaShove(id, vx, vy, vz) {
    if (!id) return;
    try { if (api.getEntityType(id) === "NPC") return } catch (e) {}
    try { impulse(id, vx, vy, vz) } catch (e2) {}
}

function lj_launch(pid, itemName) {
    if (lavaJets[pid]) return lavaJets[pid];
    const d = facing(pid), p = posOf(pid);
    if (!p) return null;
    const st = {
        pid: pid, item: itemName, t: 0, dead: 0, hit: {},
        x: p[0] + d[0] * 0.8, y: p[1] + LJ_CHEST, z: p[2] + d[2] * 0.8,
        vx: d[0] * LJ_FWD, vz: d[2] * LJ_FWD, vy: LJ_UP,
    };
    const hl = Math.sqrt(st.vx * st.vx + st.vz * st.vz);
    if (hl < 0.02) { st.vx = 0; st.vz = LJ_FWD }
    st.oy = st.y - LJ_UP * LJ_UP / (2 * LJ_GRAV);
    lavaJets[pid] = st;
    sound.at(pid, "cannonFire3", 0.7, 0.85, 22);
    run(lj_co(st));
    setTimeout(function () { lj_splat(st) }, LJ_LIFE + 8);
    return st;
}

function lj_draw(st) {
    point([st.x, st.y, st.z], {
        r: 0.3, tex: TEX.glint, count: 3, life: [0.16, 0.3], power: [0.4, 1.2],
        size: [0.4, 0.72], gravity: [0, -0.4, 0], dir: [st.vx, st.vy, st.vz], dirSpread: 0.5,
        colors: [[[LG_CORE[0], LG_CORE[1], LG_CORE[2], 1], [LG_HOT[0], LG_HOT[1], LG_HOT[2], 0.95]],
                 [[LG_HOT[0], LG_HOT[1], LG_HOT[2], 0.6], [LG_ROCK[0], LG_ROCK[1], LG_ROCK[2], 0]]],
    });
    box([st.x - 0.22, st.y - 0.22, st.z - 0.22], [st.x + 0.22, st.y + 0.22, st.z + 0.22], {
        tex: TEX.square, count: 2, life: [0.1, 0.26], power: [0.05, 0.3], size: [0.26, 0.5],
        gravity: [0, -1.2, 0], dir: [-st.vx, -0.2, -st.vz], dirSpread: 0.3,
        colors: [[[LG_HOT[0], LG_HOT[1], LG_HOT[2], 0.9], [LG_ASH[0], LG_ASH[1], LG_ASH[2], 0]]],
    });
    if (st.t % LJ_TR === 0) {
        for (let i = 0; i < 2; i++) {
            point([st.x + (i ? 0.12 : -0.12), st.y - 0.1, st.z + (i ? -0.1 : 0.12)], {
                r: 0.06, tex: TEX.glint, count: 1, life: [0.3, 0.55], power: [0.1, 0.4],
                size: [0.16, 0.3], gravity: [0, -3.2, 0], dir: [0, -0.3, 0], dirSpread: 0.2,
                colors: [[[LG_CORE[0], LG_CORE[1], LG_CORE[2], 0.95], [LG_HOT[0], LG_HOT[1], LG_HOT[2], 0]]],
            });
        }
    }
}

function lj_hit(st) {
    const ids = entitiesIn([st.x - 1.4, st.y - 1.4, st.z - 1.4], [st.x + 1.4, st.y + 1.4, st.z + 1.4]);
    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        if (id === st.pid || !isAliveId(id)) continue;
        if (st.hit[id] && st.t - st.hit[id] < LJ_AGAIN) continue;
        const p = posOf(id);
        if (!p) continue;
        if (!lg_in([p[0], p[1] + 0.9, p[2]], [st.x, st.y, st.z], LJ_HITR)) continue;
        if (Math.abs(p[1] + 0.9 - st.y) > LJ_PASS) continue;
        st.hit[id] = st.t;
        damage(id, LJ_DMG, st.pid);
        eff(id, "Slowness", LJ_SLO, { inbuiltLevel: 1 });
        const dx = p[0] - st.x, dz = p[2] - st.z;
        const l = Math.sqrt(dx * dx + dz * dz) || 1;
        lavaShove(id, (dx / l) * 1.1, 0.5, (dz / l) * 1.1);
        box([p[0] - 0.4, p[1] + 0.2, p[2] - 0.4], [p[0] + 0.4, p[1] + 1.1, p[2] + 0.4], {
            tex: TEX.bubble, count: 6, life: [0.2, 0.5], power: [0.4, 1.2], size: [0.22, 0.5],
            gravity: [0, -2.4, 0], dir: [0, 1, 0], dirSpread: 1,
            colors: [[[LG_CORE[0], LG_CORE[1], LG_CORE[2], 0.9], [LG_HOT[0], LG_HOT[1], LG_HOT[2], 0]]],
        });
    }
}

function lj_splat(st) {
    if (!st || st.dead) return;
    st.dead = 1;
    if (lavaJets[st.pid] === st) delete lavaJets[st.pid];
    const y = lg_floor(st.x, st.y, st.z);
    boom([st.x, y + 0.4, st.z], LJ_POOL_R * 1.3, {
        colors: [[LG_CORE[0], LG_CORE[1], LG_CORE[2], 1], [LG_HOT[0], LG_HOT[1], LG_HOT[2], 0]],
    });
    sound.at([st.x, y, st.z], "cannonFire3", 0.9, 0.5, 26);
    lg_add(st.pid, st.item, st.x, y, st.z, LJ_POOL_R, LJ_POOL_LIFE, LJ_POOL_DMG, "jet");
}

function lj_co(st) {
    return { next: function () {
        if (lavaJets[st.pid] !== st) return { done: true };
        if (!isAliveId(st.pid)) { st.dead = 1; if (lavaJets[st.pid] === st) delete lavaJets[st.pid]; return { done: true } }
        st.t++;
        if (st.t > LJ_LIFE) { lj_splat(st); return { done: true } }
        st.vy -= LJ_GRAV;
        st.x += st.vx; st.y += st.vy; st.z += st.vz;
        try { lj_draw(st); lj_hit(st) } catch (e) {}
        if (st.vy < 0 && isSolid(st.x, st.y - 0.15, st.z)) { lj_splat(st); return { done: true } }
        if (isSolid(st.x, st.y, st.z)) {
            st.x -= st.vx; st.y -= st.vy; st.z -= st.vz;
            lj_splat(st);
            return { done: true };
        }
        if (st.y < st.oy - LJ_DROP) { lj_splat(st); return { done: true } }
        return { value: sleep(1), done: false };
    } }
}

function onPlayerClickLavaJet(pid, itemName) {
    if (!isAliveId(pid)) return false;
    lj_launch(pid, itemName);
    return true;
}

function onPlayerLeaveLava(pid) {
    const j = lavaJets[pid];
    if (j) { j.dead = 1; delete lavaJets[pid] }
    return lg_end(pid);
}


Object.assign(R,{onPlayerClickMagmaRings,onPlayerClickLavaJet,onPlayerLeaveLava});
})(globalThis.FA);
