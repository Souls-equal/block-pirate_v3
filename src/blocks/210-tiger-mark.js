// src/blocks/210-tiger-mark.js — TIGER (mark)
// Source lisible. Ce fichier est minifié + empaqueté par `npm run build:blocks`.
// NE PAS coller ce fichier directement dans un Code Block : utiliser code-blocks/pack-XX.js.

(FA=>{/* source : ce fichier est regroupé avec d'autres dans un pack par le build. */const C=FA.c,R=FA.r,F=C.fx,{api,damage,eff,entitiesIn,heal,hitArea,hitSeg,impulse,isAliveId,lifeforms,markUntil,pickTarget,posOf,safeHealth,safePosition,statLevel,unmark,strengthMult,claimSummon,freeSummon,chest,facing,heading,isPlayerAlive,safeEntityName,safeEntityType,targetBlock,boom,box,boxSpan,CAGE,circle,clamp,column,dist2,distH2,frame,GOLDEN,inBox,norm,point,ring,TAU,TEX,run,setInterval,setTimeout,sleep,blockAt,clearIf,freeSpot,isSolid,raycast,setBlock,stuck,knockBack}=C,mesh=F,sound=F,ct_mesh=F.create,ct_to=F.move,ct_off=F.remove,ct_tilt=F.rotate,ct_preset=F.playParticle,soundAt=F.at,tf_create=F.create,tf_move=F.move,tf_remove=F.remove,tf_turn=F.rotate;
const mark_DUR = 4000, mark_RANGE = 16, mark_CONE = 0.45, mark_BODY = 1, mark_FRAME = 4;

function ringOn(x, y, z) {
    ring([x, y, z], 0.7, 12, {
        tex: TEX.glint, r: 0.06,
        life: [0.2, 0.4], power: [0.1, 0.4], size: [0.18, 0.32],
        gravity: [0, 0.5, 0], dir: [0, 0.5, 0], dirSpread: 0.1,
        colors: [[[255, 140, 40], [255, 60, 0]], [[120, 30, 0, 0], [80, 10, 0, 0]]],
    });

    point([x, y + 0.5, z], {
        r: 0.25, tex: TEX.effect, count: 5,
        life: [0.3, 0.6], power: [0.2, 0.7], size: [0.12, 0.28],
        gravity: [0, -8, 0], dir: [0, -0.9, 0], dirSpread: 0.15,
        colors: [[[255, 80, 20], [180, 20, 0]], [[60, 0, 0, 0], [40, 0, 0, 0]]],
    });
}

function endBurst(x, y, z) {
    point([x, y + 0.3, z], {
        r: 0.4, tex: TEX.crit, count: 16,
        life: [0.2, 0.45], power: [1, 2.2], size: [0.18, 0.4],
        gravity: [0, -3, 0], dir: [0, 1, 0], dirSpread: 1,
        colors: [[[255, 180, 60], [255, 40, 0]], [[80, 10, 0, 0], [40, 0, 0, 0]]],
    });
}

function onPlayerClickMark(playerId, itemName, wasAlt, x, y, z, block, targetEId) {
    const me = posOf(playerId);
    if (!me) return true;
    const origin = [me[0], me[1] + 1.4, me[2]];

    let target = null;
    if (targetEId && targetEId !== playerId && isAliveId(targetEId)) {
        const tp = posOf(targetEId);
        if (tp && dist2([tp[0], tp[1] + 0.9, tp[2]], origin) <= mark_RANGE * mark_RANGE) target = targetEId;
    }
    if (!target) target = pickTarget(playerId, origin, facing(playerId), mark_RANGE, mark_CONE);
    if (!target) return true;

    markUntil(target, mark_DUR);
    sound.at(playerId, "cannonFire3", 0.55, 2.0, 14);

    const end = Date.now() + mark_DUR;
    run({
        next: function () {
            if (!isAliveId(target) || Date.now() >= end) {
                const bp = posOf(target);
                if (bp) endBurst(bp[0], bp[1], bp[2]);
                unmark(target);
                return { done: true };
            }
            const p = posOf(target);
            if (p) ringOn(p[0], p[1] + mark_BODY, p[2]);
            return { value: sleep(mark_FRAME), done: false };
        }
    });
    return true;
}

function onPlayerLeaveMark(playerId) { unmark(playerId); }


/* TIGER — "Claw Rip" */
const CL_RANGE = 14, CL_STEP = 1.25, CL_FRAME = 1, CL_DMG = 12, CL_KB = 2.1, CL_LIFT = 1.2;
const CL_GAP0 = 0.45, CL_GAP1 = 1.9, CL_CURVE = 0.45, CL_LEN = 3.4, CL_HALF = 0.62, CL_THICK = 1.3;
const CL_PTS = 9, CL_APEX = 1.35, CL_BODY = 0.9, CL_REACH = 0.9;
const CL_GOLD = [255, 205, 95], CL_EMBER = [255, 110, 25], CL_WHITE = [255, 255, 235];
const tigerRips = {};

function cl_axes(pid) {
    const d = facing(pid);
    const l = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]) || 1;
    const fx = d[0] / l, fy = d[1] / l, fz = d[2] / l;
    const hl = Math.sqrt(fx * fx + fz * fz);
    let rx, rz;
    if (hl > 0.05) { rx = -fz / hl; rz = fx / hl } else { rx = 1; rz = 0 }
    const ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy;
    const ul = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1;
    return { fx: fx, fy: fy, fz: fz, rx: rx, rz: rz, ux: ux / ul, uy: uy / ul, uz: uz / ul };
}

function cl_bow(vert) {
    let v = vert / (CL_LEN / 2);
    if (v > 1) v = 1; else if (v < -1) v = -1;
    return CL_CURVE * (1 - v * v);
}

function cl_targets(c) {
    const out = [], seen = {};
    const lists = [];
    try { lists.push(api.getPlayerIds() || []) } catch (e) {}
    try { lists.push(api.getMobIds() || []) } catch (e2) {}
    for (let L = 0; L < lists.length; L++) {
        for (let i = 0; i < lists[L].length; i++) {
            const id = lists[L][i];
            if (id === c || seen[id] || !isAliveId(id)) continue;
            try { if (api.getEntityType(id) === "NPC") continue } catch (e3) {}
            seen[id] = 1; out.push(id);
        }
    }
    return out;
}

function cl_front(st, dist) {
    const a = st.a;
    return [st.px + a.fx * dist, st.py + a.fy * dist, st.pz + a.fz * dist];
}

function cl_fx(st, dist) {
    const a = st.a, f = cl_front(st, dist);
    for (let L = -1; L <= 1; L++) {
        for (let i = 0; i < CL_PTS; i++) {
            const vert = -CL_LEN / 2 + CL_LEN * (i / (CL_PTS - 1));
            const bow = cl_bow(vert);
            const hot = 1 - Math.abs(vert) / (CL_LEN / 2);
            const off = L * st.g;
            const x = f[0] + a.rx * off + a.ux * vert + a.fx * bow;
            const y = f[1] + a.uy * vert + a.fy * bow;
            const z = f[2] + a.rz * off + a.uz * vert + a.fz * bow;
            const col = hot > 0.55 ? CL_WHITE : CL_GOLD;
            const other = hot > 0.55 ? CL_GOLD : CL_EMBER;
            box([x - 0.1, y - 0.2 - hot * 0.12, z - 0.1], [x + 0.1, y + 0.2 + hot * 0.12, z + 0.1], {
                tex: (i % 2) ? TEX.glint : TEX.square, count: 1,
                life: [0.14, 0.3 + hot * 0.14], power: [0.2, 1.1],
                size: [0.16 + hot * 0.16, 0.36 + hot * 0.34],
                gravity: [0, -0.5, 0],
                dir1: [a.fx * 0.5 - 0.2, a.fy * 0.5 - 0.1, a.fz * 0.5 - 0.2],
                dir2: [a.fx * 1.6 + 0.2, a.fy * 1.6 + 0.25, a.fz * 1.6 + 0.2],
                colors: [[[col[0], col[1], col[2], 1], [255, 255, 255, 1]],
                         [[other[0], other[1], other[2], 0], [col[0], col[1], col[2], 0]]],
            });
        }
    }
}

function cl_hits(st, dist) {
    const a = st.a, f = cl_front(st, dist), ids = cl_targets(st.pid);
    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const q = posOf(id);
        if (!q) continue;
        const dx = q[0] - f[0], dy = q[1] + CL_BODY - f[1], dz = q[2] - f[2];
        const vert = dx * a.ux + dy * a.uy + dz * a.uz;
        if (Math.abs(vert) > CL_LEN / 2) continue;
        const bow = cl_bow(vert);
        const along = dx * a.fx + dy * a.fy + dz * a.fz;
        if (along < bow - 0.4 || along > bow + CL_THICK) continue;
        const side = dx * a.rx + dz * a.rz;
        for (let L = -1; L <= 1; L++) {
            if (Math.abs(side - L * st.g) > CL_HALF) continue;
            if (st.seen[id + "|" + L]) continue;
            st.seen[id + "|" + L] = 1;
            damage(id, CL_DMG, st.pid);
            if (!st.kb[id]) {
                st.kb[id] = 1;
                knockBack(id, a.fx * CL_KB, a.fy * CL_KB + CL_LIFT, a.fz * CL_KB);
            }
        }
    }
}

function cl_end(pid, st) { if (st && tigerRips[pid] === st) delete tigerRips[pid]; return !!st }

function cl_co(st) {
    return { next: function () {
        if (tigerRips[st.pid] !== st) return { done: true };
        if (!isAliveId(st.pid)) { cl_end(st.pid, st); return { done: true } };
        st.g = CL_GAP0 + (CL_GAP1 - CL_GAP0) * (st.dist / CL_RANGE);
        try { cl_fx(st, st.dist); cl_hits(st, st.dist) } catch (e) {}
        st.dist += CL_STEP;
        if (st.dist > CL_RANGE) { cl_end(st.pid, st); return { done: true } }
        return { value: sleep(CL_FRAME), done: false };
    } };
}

function onPlayerClickClawRip(pid, itemName) {
    if (!isAliveId(pid)) return false;
    if (tigerRips[pid]) return true;
    const p = posOf(pid);
    if (!p) return true;
    const a = cl_axes(pid);
    const st = {
        pid: pid, item: itemName, a: a, dist: 0, g: CL_GAP0, seen: {}, kb: {},
        px: p[0] + a.fx * CL_REACH, py: p[1] + CL_APEX, pz: p[2] + a.fz * CL_REACH
    };
    tigerRips[pid] = st;
    boom([st.px, st.py, st.pz], 1.8, { colors: [CL_GOLD, [CL_GOLD[0], CL_GOLD[1], CL_GOLD[2], 0]] });
    sound.at(pid, "cannonFire3", 0.65, 0.8, 20);
    run(cl_co(st));
    setTimeout(function () { cl_end(pid, st) }, Math.ceil(CL_RANGE / CL_STEP) * (CL_FRAME + 1) + 8);
    return true;
}

function onCancelTiger(pid) { return cl_end(pid, tigerRips[pid]) }
function onPlayerLeaveTiger(pid) {
    onCancelTiger(pid);
    try { onPlayerLeaveMark(pid) } catch (e) {}
}


Object.assign(R,{onPlayerClickMark,onPlayerLeaveMark,onPlayerClickClawRip,onCancelTiger,onPlayerLeaveTiger});
})(globalThis.FA);
