// src/blocks/130-portal.js — PORTAL
// Source lisible. Ce fichier est minifié + empaqueté par `npm run build:blocks`.
// NE PAS coller ce fichier directement dans un Code Block : utiliser code-blocks/pack-XX.js.

(FA=>{/* source : ce fichier est regroupé avec d'autres dans un pack par le build. */const C=FA.c,R=FA.r,F=C.fx,{api,damage,eff,entitiesIn,heal,hitArea,hitSeg,impulse,setVel,teleport,isAliveId,lifeforms,markUntil,pickTarget,posOf,safeHealth,safePosition,statLevel,unmark,strengthMult,claimSummon,freeSummon,chest,facing,heading,isPlayerAlive,safeEntityName,safeEntityType,targetBlock,boom,box,boxSpan,CAGE,circle,clamp,column,dist2,distH2,frame,GOLDEN,inBox,norm,point,ring,TAU,TEX,run,setInterval,setTimeout,sleep,blockAt,clearIf,freeSpot,isSolid,raycast,setBlock,stuck,knockBack}=C,mesh=F,sound=F,ct_mesh=F.create,ct_to=F.move,ct_off=F.remove,ct_tilt=F.rotate,ct_preset=F.playParticle,soundAt=F.at,tf_create=F.create,tf_move=F.move,tf_remove=F.remove,tf_turn=F.rotate;
/* Portal — “Portal Step” */

const portal_RANGE = 45, MIN = 3, portal_EYE = 1.62;
const WALK = 1, UNSET = 2;

function portalSolid(x, y, z) {
    const b = blockName(x, y, z);
    return !!b && b !== "Air" && b !== "Water" && b !== "Lava";
}

function blockName(x, y, z) {
    try { return api.getBlock(Math.floor(x), Math.floor(y), Math.floor(z)); }
    catch (e) { return null; }
}

function safe(x, y, z) {
    return portalSolid(x, y - 1, z) && !portalSolid(x, y, z) && !portalSolid(x, y + 1, z);
}

function clear(p, to) {
    const baseX = p[0], baseY = p[1] + 1.1, baseZ = p[2];
    const dx = to[0] - baseX, dy = to[1] + 1.2 - baseY, dz = to[2] - baseZ;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const steps = Math.max(2, Math.ceil(len * 2));
    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        if (portalSolid(Math.floor(baseX + dx * t), Math.floor(baseY + dy * t), Math.floor(baseZ + dz * t))) return false;
    }
    return true;
}

function portalSpot(pid) {
    const p = posOf(pid);
    const d = facing(pid);
    if (!p) return null;

    const baseX = p[0], baseY = p[1] + portal_EYE, baseZ = p[2];
    let hitT = -1;
    for (let t = 0.25; t <= portal_RANGE; t += 0.25) {
        if (portalSolid(baseX + d[0] * t, baseY + d[1] * t, baseZ + d[2] * t)) { hitT = t; break; }
    }
    if (hitT < 0) return null;

    const cx = Math.floor(baseX + d[0] * hitT) + 0.5;
    const cz = Math.floor(baseZ + d[2] * hitT) + 0.5;
    const dx = cx - p[0], dz = cz - p[2];
    if (dx * dx + dz * dz < 0.5) return null;

    const by = Math.floor(baseY + d[1] * hitT);
    for (let k = 2; k >= -3; k--) {
        const cy = by + k + 0.02;
        const dy = cy - p[1];
        if (dx * dx + dy * dy + dz * dz < MIN * MIN) continue;
        if (!safe(cx, cy, cz)) continue;
        if (clear(p, [cx, cy, cz])) return [cx, cy, cz];
    }
    return null;
}

function portalBurst(x, y, z, tex) {
    point([x, y, z], {
        r: 0.6, tex: tex || TEX.soul, count: 33,
        life: [1.3, 1.7], power: [1.8, 3], size: [0.2, 0.45],
        gravity: [0, 1.5, 0], dir: [0, 1.4, 0], dirSpread: 1.2,
        colors: [[[160, 60, 255], [80, 20, 180]], [[40, 0, 80, 0], [120, 40, 200, 0]]],
    });
}

function onPlayerClickPortal(pid, itemName) {
    const to = portalSpot(pid);
    if (!to) return false;
    const p = posOf(pid);
    if (!p || !isAliveId(pid)) return false;

    sound.at(p, "futureStrangePulse", 0.8, 1.3, 24);
    portalBurst(p[0], p[1] + 0.8, p[2]);
    if (!teleport(pid, to[0], to[1], to[2])) return false;
    sound.at(to, "magicAccent3", 0.8, 1.4, 24);
    portalBurst(to[0], to[1] + 0.8, to[2]);
    return true;
}


/* Portal — “Portal Rift” */

const W = 3, rift_H = 4, D = 1;
const rift_SPEED = 0.55, rift_RANGE = 16, rift_DMG = 29;

const rifts = {};

function span(r, axis) {
    return boxSpan(r.fr, axis, W / 2, rift_H / 2, D / 2) + 0.35;
}

function riftBox(r, pad) {
    const mn = [r.c[0], r.c[1], r.c[2]], mx = [r.c[0], r.c[1], r.c[2]];
    for (let a = 0; a < 3; a++) {
        const s = span(r, a) + (pad || 0);
        mn[a] -= s; mx[a] += s;
    }
    return [mn, mx];
}

function sheet(r) {
    const b = riftBox(r, 0);
    point([r.c[0], r.c[1], r.c[2]], {
        pos1: b[0], pos2: b[1],
        tex: TEX.effect, count: 30,
        life: [0.2, 0.45], power: [0.2, 1], size: [0.3, 0.62],
        gravity: [0, 0.3, 0], dir1: [-0.5, -0.5, -0.5], dir2: [0.5, 0.5, 0.5],
        colors: [[[24, 4, 60], [120, 40, 210]], [[16, 0, 40, 0], [80, 16, 150, 0]]],
    });

    box([r.c[0] - W / 2, r.c[1] - rift_H / 2, r.c[2] - D / 2],
        [r.c[0] + W / 2, r.c[1] + rift_H / 2, r.c[2] + D / 2], {
        tex: TEX.glint, count: 20,
        life: [0.14, 0.3], power: [0.4, 2.4], size: [0.26, 0.5],
        gravity: [0, 0.5, 0],
        dir1: [r.d[0] * -0.8, -0.3, r.d[2] * -0.8],
        dir2: [r.d[0] * 0.8 + 0.3, 0.3, r.d[2] * 0.8 + 0.3],
        colors: [[[200, 150, 255], [110, 30, 220]], [[50, 0, 110, 0], [110, 40, 200, 0]]],
    });
}

function sweep(r) {
    const b = riftBox(r, 0.6);
    const list = entitiesIn(b[0], b[1]);
    for (let i = 0; i < list.length; i++) {
        const id = list[i];
        if (id === r.pid || r.hit[id] || !isAliveId(id)) continue;
        const p = safePosition(id);
        if (!p) continue;
        if (!inBox(r.fr, r.c, [p[0], p[1] + 0.9, p[2]], W / 2, rift_H / 2, D / 2 + 0.25)) continue;

        r.hit[id] = 1;
        if (damage(id, rift_DMG, r.pid, r.item)) {
            impulse(id, r.d[0] * 3.2, 2.3, r.d[2] * 3.2);
            portalBurst(p[0], p[1] + 0.9, p[2], TEX.crit);
        }
    }
}

function blocked(r, from) {
    for (let t = 0.3; t <= 1.001; t += 0.35) {
        if (portalSolid(from[0] + (r.c[0] - from[0]) * t,
                        from[1] + (r.c[1] - from[1]) * t,
                        from[2] + (r.c[2] - from[2]) * t)) return true;
    }
    return false;
}

function onPlayerClickPortalRift(pid, itemName) {
    if (rifts[pid]) return true;
    const p = posOf(pid);
    const d = facing(pid);
    if (!p) return false;

    const c = [p[0] + d[0] * 1.1, p[1] + 1.55 + d[1] * 1.1, p[2] + d[2] * 1.1];
    rifts[pid] = { pid: pid, item: itemName, d: d, fr: frame(d), hit: {}, trav: 0, c: c };
    sound.at(c, "futureStrangePulse", 0.85, 0.95, 26);
    portalBurst(c[0], c[1], c[2]);

    run({
        next: function () {
            const r = rifts[pid];
            if (!r || !posOf(pid)) { delete rifts[pid]; return { done: true }; }

            const from = [r.c[0], r.c[1], r.c[2]];
            r.c = [from[0] + r.d[0] * rift_SPEED, from[1] + r.d[1] * rift_SPEED, from[2] + r.d[2] * rift_SPEED];
            r.trav += rift_SPEED;

            if (r.trav >= rift_RANGE || blocked(r, from)) {
                portalBurst(r.c[0], r.c[1], r.c[2], TEX.crit);
                delete rifts[pid];
                return { done: true };
            }

            sheet(r);
            sweep(r);
            return { value: { t: 1 } };
        }
    });
    return true;
}

function onPlayerLeavePortal(pid) { delete rifts[pid]; }


Object.assign(R,{portalSolid,portalSpot,portalBurst,onPlayerClickPortal,onPlayerClickPortalRift,onPlayerLeavePortal});
})(globalThis.FA);
