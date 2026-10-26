/* ============================================================
   CONTROL (Control Slash)
   1 fruit = 1 Code Block. Ne PAS modifier la 1re et la derniere ligne.
   ============================================================ */
(FA=>{/* Code Block fruits — colle ce fichier TEL QUEL dans UN Code Block du monde. */const C=FA.c,R=FA.r,F=C.fx,{api,damage,eff,entitiesIn,heal,hitArea,hitSeg,impulse,isAliveId,lifeforms,markUntil,pickTarget,posOf,safeHealth,safePosition,statLevel,unmark,strengthMult,claimSummon,freeSummon,chest,facing,heading,isPlayerAlive,safeEntityName,safeEntityType,targetBlock,boom,box,boxSpan,CAGE,circle,clamp,column,dist2,distH2,frame,GOLDEN,inBox,norm,point,ring,TAU,TEX,run,setInterval,setTimeout,sleep,blockAt,clearIf,freeSpot,isSolid,raycast,setBlock,stuck,knockBack}=C,mesh=F,sound=F,ct_mesh=F.create,ct_to=F.move,ct_off=F.remove,ct_tilt=F.rotate,ct_preset=F.playParticle,soundAt=F.at,tf_create=F.create,tf_move=F.move,tf_remove=F.remove,tf_turn=F.rotate;
/* état Control partagé entre les blocs Control */
const CT=globalThis.__CT__||(globalThis.__CT__={ctl:{},cd:{},ang:{},mesh:new Map(),blades:[]});
const ctCtl=CT.ctl,ctCd=CT.cd,ctAng=CT.ang,ctMesh=CT.mesh,ctBlades=CT.blades;
const CT_DT = 0.05;
const CT_R = 30, CT_LIFE = 640, CT_CD = 15000;
const CT_DOME = "Patterned Light Blue Glass", CT_FAKE = "Glass", CT_TH = 0.06, CT_ARC = 1.08;
const CT_BUILD = 4, CT_MESH_MAX = 220, CT_SWEEP = 900;
const CT_TRAP_MS = 2000, CT_TRAP_SPD = 0.45, CT_TRAP_MIN = 3.5, CT_DUST = 5, CT_CLOUD = 25;
const CT_LIFT_N = 12, CT_LIFT_MAX = 28, CT_LIFT_H = 3.8, CT_LIFT_T = 18, CT_HOVER = 440;
const CT_B_DMG = 48, CT_B_R = 2.4, CT_B_KB = 24, CT_B_UP = 0.52, CT_B_RAM = 11.5;
const CT_B_NEXT = 24, CT_B_SEEK = 30, CT_B_RAND = 40, CT_B_REARM = 60;
const CT_S_DMG = 42, CT_S_DMG_R = 85, CT_S_SPD = 30, CT_S_SPD_R = 26, CT_S_RNG = 32, CT_S_RNG_R = 48;
const CT_S_LIFE = 26, CT_S_SIZE = 2.6, CT_S_SIZE_R = 8.5, CT_S_KB = 16, CT_S_KB_R = 28, CT_S_UP = 0.25;
const CT_S_DEB = 60, CT_S_B_DMG = 28;
const CT_ANG = [-35, 35, -20, 20, 0];
const CT_D_FLY = 100, CT_D_TOT = 140, CT_D_SPD = 9, CT_D_DMG = 55, CT_D_DMG_R = 85;
const CT_D_PULL = 13, CT_D_BLK = 15, CT_D_R = 16, CT_D_R_R = 18, CT_D_KB = 24, CT_D_UP = 0.75;
const CT_SND = {
    open: "futureStrangePulse", pulse: "magicAccent4", close: "pulseFromTheDark",
    lift: "magicAccent1", ram: "cannonFire1", swing: "bigDrumSwish1", swingRoom: "cannonFire2",
    cut: "critical_hit", launch: "magicAccent3", burst: "cannonFire2", arrive: "magicAccent4",
};
const CT_CYAN = [60, 220, 255], CT_ICE = [220, 255, 255], CT_DEEP = [0, 100, 255];
const CT_PLUM = [140, 60, 255], CT_LILAC = [200, 120, 255], CT_NIGHT = [30, 0, 90];
const CT_CLEAR = [255, 255, 255], CT_STEAM = [240, 248, 255];


function ct_now() { try { return api.now() } catch (e) { return Date.now() } }

function ct_kick(id, dir, power, up) {
    if (!id) return;
    try { impulse(id, dir[0] * power, up * power, dir[2] * power) } catch (e) {}
}

function ct_dist(a, b) {
    const x = a[0] - b[0], y = a[1] - b[1], z = a[2] - b[2];
    return Math.sqrt(x * x + y * y + z * z);
}

function ct_norm(v) {
    const l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return l < 1e-4 ? [0, 1, 0] : [v[0] / l, v[1] / l, v[2] / l];
}

function ct_cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function ct_mine(name) {
    if (!name || name === "Air") return false;
    const s = String(name).toLowerCase();
    return !(s.indexOf("bedrock") >= 0 || s.indexOf("barrier") >= 0 || s.indexOf("spawner") >= 0);
}

function ct_at(x, y, z) { try { return api.getBlock(x, y, z) } catch (e) { return null } }

function ct_in(c, r) {
    const out = [];
    const ids = entitiesIn([c[0] - r, c[1] - r, c[2] - r], [c[0] + r, c[1] + r, c[2] + r]);
    for (let i = 0; i < ids.length; i++) if (isAliveId(ids[i])) out.push(ids[i]);
    return out;
}

function ct_keep(id, pid) { ctMesh.set(id, { pid: pid, at: ct_now() }); return id }

function ct_free(id) {
    if (!id) return;
    ctMesh.delete(id);
    ct_off(id);
}

function ct_new(block, size, pid, pos, rot) {
    if (ctMesh.size >= CT_MESH_MAX) return null;
    const m = ct_mesh(block, size, pid, CT_FAKE);
    if (!m) return null;
    ct_to(m.id, pos[0], pos[1], pos[2]);
    if (rot) ct_tilt(m.id, rot[0], rot[1], rot[2]);
    return ct_keep(m.id, pid);
}

function ct_new_box(o, pid, pos) {
    if (ctMesh.size >= CT_MESH_MAX) return null;
    let id = null;
    try { id = api.attemptCreateMeshEntity("Box", o, null, null, pid) } catch (e) { id = null }
    if (!id) return null;
    ct_to(id, pos[0], pos[1], pos[2]);
    return ct_keep(id, pid);
}

function ct_catch(st, at, center, opts) {
    if (st.blocks.length >= CT_LIFT_MAX) return false;
    const p = [at.x + 0.5, at.y + 1, at.z + 0.5];
    const mesh = ct_new(at.name, opts && opts.debris ? 0.85 : 1.15, st.pid, p);
    if (!mesh) return false;
    box([p[0] - 0.5, p[1], p[2] - 0.5], [p[0] + 0.5, p[1] + 1.2, p[2] + 0.5], {
        tex: TEX.bubble, count: 4, life: [0.5, 1], power: [0.25, 0.6], size: [0.6, 1.2],
        dir: [0, 0.4, 0], dirSpread: 0.3, colors: [[CT_CLEAR[0], CT_CLEAR[1], CT_CLEAR[2], 0.9], [CT_CYAN[0], CT_CYAN[1], CT_CYAN[2], 0]],
    });
    const c = center || p;
    st.blocks.push({
        mesh: mesh, pid: st.pid, at: p, pos: [p[0], p[1], p[2]], top: p[1] + CT_LIFT_H, state: 0, t: 0,
        r: (opts && opts.r) || 4.2 + Math.random() * 8.5,
        spd: (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.45),
        high: (opts && opts.high) || c[1] + 2.2 + Math.random() * 4.5,
        ang: Math.random() * Math.PI * 2,
        next: st.t + ((opts && opts.next) || CT_B_NEXT + Math.floor(Math.random() * CT_B_RAND)),
        foe: null, until: 0, rot: [0, 0, 0],
        spin: [(Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2.5, (Math.random() - 0.5) * 2],
        dmg: (opts && opts.dmg) || CT_B_DMG, born: ct_now(), short: (opts && opts.short) ? 100 : CT_HOVER,
    });
    return true;
}
function ct_edge(s) {
    for (let i = 0; i < 5; i++) {
        const k = -1 + (i / 4) * 2, half = s.size * 0.5;
        const bow = (s.room ? -0.55 : -0.32) * (k * k);
        const p = [s.pos[0] + s.axis[0] * (k * half) + s.dir[0] * bow,
                   s.pos[1] + s.axis[1] * (k * half) + s.dir[1] * bow,
                   s.pos[2] + s.axis[2] * (k * half) + s.dir[2] * bow];
        point(p, {
            r: 0.2, tex: TEX.soul, count: 1, life: s.room ? [0.35, 0.55] : [0.25, 0.4],
            size: s.room ? [1.5, 2.4] : [1, 1.5], power: [0.02, 0.06], dir: [0, 0, 0], dirSpread: 0.02,
            colors: s.room ? [[120, 240, 255, 1], CT_ICE, [CT_DEEP[0], CT_DEEP[1], CT_DEEP[2], 0]]
                           : [[90, 230, 255, 1], CT_ICE, [0, 120, 255, 0]],
        });
    }
    point(s.pos, {
        r: 0.25, tex: TEX.glint, count: 1, life: [0.25, 0.45], size: s.room ? [1.5, 2.3] : [0.9, 1.4],
        power: [0.02, 0.06], dir: [0, 0, 0], dirSpread: 0.02,
        colors: [[CT_ICE[0], CT_ICE[1], CT_ICE[2], 1], [CT_DEEP[0], CT_DEEP[1], CT_DEEP[2], 0]],
    });
}

function ct_chip(s) {
    const side = ct_norm(ct_cross(s.lat, s.dir));
    const offs = s.room ? [-2.4, -1.2, 0, 1.2, 2.4] : [-1.2, -0.6, 0, 0.6, 1.2];
    for (let i = 0; i < offs.length; i++) {
        const x = Math.floor(s.pos[0] + side[0] * offs[i]);
        const y = Math.floor(s.pos[1] + (Math.random() - 0.5) * 0.8);
        const z = Math.floor(s.pos[2] + side[2] * offs[i]);
        const name = ct_at(x, y, z);
        if (!ct_mine(name) || !isSolid(x, y, z)) continue;
        const st = s.st;
        if (s.room && st && st.active) {
            ct_catch(st, { x: x, y: y, z: z, name: name }, st.center,
                { dmg: CT_S_B_DMG, r: 4.5 + Math.random() * (st.r * 0.55), high: st.center[1] + 2 + Math.random() * 4.5, next: 20, short: 100 });
        } else if (s.deb.length < 5) {
            const at = [x + 0.5, y + 0.5, z + 0.5];
            const mesh = ct_new(name, 0.85, s.pid, at);
            if (mesh) s.deb.push({
                mesh: mesh, pos: at, t: 0, pid: s.pid,
                vel: [s.dir[0] * 3.5 + (Math.random() - 0.5) * 4, 6.5 + Math.random() * 3.5, s.dir[2] * 3.5 + (Math.random() - 0.5) * 4],
                rot: [0, 0, 0], spin: [(Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5],
            });
        }
    }
}

function ct_slash_co(s) {
    return { next: function () {
        if (s.dead) { ct_free(s.mesh); s.mesh = null; return { done: true } }
        try {
            if (!s.over) {
                const step = s.speed * CT_DT;
                s.pos[0] += s.dir[0] * step; s.pos[1] += s.dir[1] * step; s.pos[2] += s.dir[2] * step;
                s.gone += step;
                s.t++;
                if (s.mesh) ct_to(s.mesh, s.pos[0], s.pos[1], s.pos[2]);
                ct_edge(s);
                const near = ct_in(s.pos, s.size * 0.55 + 0.6);
                for (let i = 0; i < near.length; i++) {
                    const id = near[i];
                    if (id === s.pid || s.struck[id]) continue;
                    s.struck[id] = 1;
                    damage(id, s.dmg, s.pid, { crit: true, broadcast: true });
                    ct_kick(id, [s.dir[0], 0, s.dir[2]], s.room ? CT_S_KB_R : CT_S_KB, CT_S_UP);
                    sound.at(s.pos, CT_SND.cut, 0.9, 1.1, 20);
                }
                const wall = isSolid(Math.floor(s.pos[0]), Math.floor(s.pos[1]), Math.floor(s.pos[2]));
                if (wall || s.gone >= s.range || s.t >= CT_S_LIFE || !isAliveId(s.pid)) {
                    s.over = 1;
                    boom(s.pos, 1.2, {
                        count: 8, power: [1.5, 3], size: [0.6, 1.1], life: [0.3, 0.6],
                        colors: [[CT_ICE[0], CT_ICE[1], CT_ICE[2], 1], [CT_DEEP[0], CT_DEEP[1], CT_DEEP[2], 0]],
                    });
                    ct_free(s.mesh);
                    s.mesh = null;
                    if (wall) ct_chip(s);
                }
            }
            for (let i = s.deb.length - 1; i >= 0; i--) {
                const d = s.deb[i];
                d.t++;
                d.vel[1] -= 16 * CT_DT;
                d.pos[0] += d.vel[0] * CT_DT; d.pos[1] += d.vel[1] * CT_DT; d.pos[2] += d.vel[2] * CT_DT;
                d.rot[0] += d.spin[0] * CT_DT; d.rot[1] += d.spin[1] * CT_DT; d.rot[2] += d.spin[2] * CT_DT;
                ct_to(d.mesh, d.pos[0], d.pos[1], d.pos[2]);
                ct_tilt(d.mesh, d.rot[0], d.rot[1], d.rot[2]);
                if (Math.random() < 0.25) {
                    point(d.pos, {
                        r: 0.2, tex: TEX.square, count: 1, life: [0.2, 0.4], size: [0.4, 0.8],
                        colors: [[CT_STEAM[0], CT_STEAM[1], CT_STEAM[2], 0.6], [CT_STEAM[0], CT_STEAM[1], CT_STEAM[2], 0]],
                    });
                }
                if (d.t >= CT_S_DEB) { ct_free(d.mesh); s.deb.splice(i, 1) }
            }
        } catch (e) {}
        if (s.over && !s.deb.length) {
            const k = ctBlades.indexOf(s);
            if (k >= 0) ctBlades.splice(k, 1);
            return { done: true };
        }
        return { value: sleep(1), done: false };
    } };
}

function onPlayerClickControlSlash(pid, itemName) {
    if (!isAliveId(pid)) return false;
    let f = null;
    try { f = api.getPlayerFacingInfo(pid) } catch (e) { f = null }
    if (!f || !f.camPos || !f.dir) return true;
    const st = ctCtl[pid];
    const room = !!(st && st.active && ct_dist(f.camPos, st.center) <= st.r);
    const dir = ct_norm(f.dir);
    const out = room ? 2.2 : 1.2;
    const start = [f.camPos[0] + dir[0] * out, f.camPos[1] + dir[1] * out, f.camPos[2] + dir[2] * out];
    const size = room ? CT_S_SIZE_R : CT_S_SIZE;
    const lat = ct_norm([-dir[2], 0, dir[0]]);
    const rad = (CT_ANG[ctAng[pid] || 0] || 0) * Math.PI / 180;
    const mix = ct_cross(lat, dir);
    const axis = ct_norm([lat[0] * Math.cos(rad) + mix[0] * Math.sin(rad),
                          lat[1] * Math.cos(rad) + mix[1] * Math.sin(rad),
                          lat[2] * Math.cos(rad) + mix[2] * Math.sin(rad)]);
    ctAng[pid] = ((ctAng[pid] || 0) + 1) % CT_ANG.length;
    const mesh = ct_new_box({
        width: size, height: room ? 0.35 : 0.12, depth: room ? 0.75 : 0.35,
        diffuseColor: room ? [0, 240, 255] : CT_CYAN, emissiveColor: room ? [180, 255, 255] : [140, 250, 255],
    }, pid, start);
    if (mesh) ct_tilt(mesh, 0, 0, rad);
    sound.at(start, room ? CT_SND.swingRoom : CT_SND.swing, 1, room ? 0.85 : 1.2, 26);
    if (room) { try { api.shakePlayerCamera(pid, 0.5, 500) } catch (e) {} }
    const s = {
        pid: pid, mesh: mesh, pos: start, dir: dir, lat: lat, axis: axis, size: size, st: st,
        speed: room ? CT_S_SPD_R : CT_S_SPD, range: room ? CT_S_RNG_R : CT_S_RNG,
        dmg: room ? CT_S_DMG_R : CT_S_DMG, room: room, gone: 0, t: 0, struck: {}, deb: [], over: 0, dead: 0,
    };
    ctBlades.push(s);
    run(ct_slash_co(s));
    return true;
}


Object.assign(R,{onPlayerClickControlSlash});
})(globalThis.FA);
