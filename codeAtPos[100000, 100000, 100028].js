/* ============================================================
   SMOKE (Choking Fog + Smoke Shroud)
   1 fruit = 1 Code Block. Ne PAS modifier la 1re et la derniere ligne.
   ============================================================ */
(FA=>{/* Code Block fruits — colle ce fichier TEL QUEL dans UN Code Block du monde. */const C=FA.c,R=FA.r,F=C.fx,{api,damage,eff,entitiesIn,heal,hitArea,hitSeg,impulse,isAliveId,lifeforms,markUntil,pickTarget,posOf,safeHealth,safePosition,statLevel,unmark,strengthMult,claimSummon,freeSummon,chest,facing,heading,isPlayerAlive,safeEntityName,safeEntityType,targetBlock,boom,box,boxSpan,CAGE,circle,clamp,column,dist2,distH2,frame,GOLDEN,inBox,norm,point,ring,TAU,TEX,run,setInterval,setTimeout,sleep,blockAt,clearIf,freeSpot,isSolid,raycast,setBlock,stuck,knockBack}=C,mesh=F,sound=F,ct_mesh=F.create,ct_to=F.move,ct_off=F.remove,ct_tilt=F.rotate,ct_preset=F.playParticle,soundAt=F.at,tf_create=F.create,tf_move=F.move,tf_remove=F.remove,tf_turn=F.rotate;
/* CHOKING FOG */
const F_R = 7, F_H = 7.5, F_TICKS = 44, F_PULSE = 2, F_DMG = 2, F_PTS = 30, F_REDRAW = 8;
const fogs = {};

function fogRadius(pid) { return F_R + Math.min(6, statLevel(pid, "d") * 0.3); }

function smoke_wisp(x, y, z, s, p) {
    point([x, y, z], {
        r: s * 0.5, tex: TEX.square, count: 2,
        life: [0.9, 1.6], power: [p * 0.3, p], size: [s * 0.5, s],
        gravity: [0, 0.35, 0], dir: [0, 0.45, 0], dirSpread: 0.3,
        colors: [[[70, 70, 76, 0.5], [185, 185, 195, 0.85]], [[60, 60, 66, 0], [170, 170, 180, 0]]],
    });
}

function inFog(z, p) {
    return distH2(p, z.c) <= z.r * z.r && p[1] - z.c[1] >= -1.5 && p[1] - z.c[1] <= F_H;
}

function fogList(z) {
    const out = [];
    const list = entitiesIn([z.c[0] - z.r, z.c[1] - 2, z.c[2] - z.r], [z.c[0] + z.r, z.c[1] + F_H, z.c[2] + z.r]);
    for (let i = 0; i < list.length; i++) {
        const id = list[i];
        if (id === z.caster || !isAliveId(id)) continue;
        const p = posOf(id);
        if (p && inFog(z, p)) out.push(id);
    }
    return out;
}

function fogDraw(z) {
    for (let i = 0; i < F_PTS; i++) {
        const a = (i / F_PTS) * Math.PI * 2 + z.t * 0.05;
        const k = 0.75 + ((i * 7 + z.t) % 10) / 20;
        smoke_wisp(z.c[0] + Math.cos(a) * z.r * k, z.c[1] + 0.2, z.c[2] + Math.sin(a) * z.r * k, 2.6, 1.4);
    }
    for (let i = 0; i < 10; i++) {
        const a = i * 2.399 + z.t * 0.04;
        const k = ((i * 13 + z.t * 3) % 12) / 12 * z.r;
        smoke_wisp(z.c[0] + Math.cos(a) * k, z.c[1] + 0.1, z.c[2] + Math.sin(a) * k, 3.4, 0.6);
    }
    const inside = fogList(z);
    for (let i = 0; i < inside.length; i++) {
        const p = posOf(inside[i]);
        if (p) smoke_wisp(p[0], p[1] + 1.2, p[2], 0.9, 1.8);
    }
}

function fogPulse(z) {
    const ids = fogList(z);
    for (let i = 0; i < ids.length; i++) {
        eff(ids[i], "Slowness", 900, { inbuiltLevel: 1 });
        damage(ids[i], F_DMG, z.caster, z.item);
    }
}

function fogCo(z, tok) {
    return {
        next: function () {
            const st = fogs[z.caster];
            if (!st || st.tok !== tok) return { done: true };
            if (z.t++ >= F_TICKS) { fogDraw(z); delete fogs[z.caster]; return { done: true }; }
            try {
                fogDraw(z);
                if (z.t % F_PULSE === 0) fogPulse(z);
            } catch (e) {}
            return { value: sleep(F_REDRAW), done: false };
        }
    };
}


/* SMOKE SHROUD */
const S_TICKS = 21, S_PULSE = 2, smoke_S_DMG = 3, S_RANGE = 14, S_MAXD = 16;
const S_BURST_R = 3, S_BURST_PTS = 16;
const shrouds = {};

function shroudTarget(pid) {
    const p = posOf(pid);
    if (!p) return null;
    const d = facing(pid);
    const list = entitiesIn([p[0] - S_RANGE, p[1] - 3, p[2] - S_RANGE], [p[0] + S_RANGE, p[1] + 5, p[2] + S_RANGE]);
    let best = null, bestS = 1e9;
    for (let i = 0; i < list.length; i++) {
        const id = list[i];
        if (id === pid || !isAliveId(id)) continue;
        const q = posOf(id);
        if (!q) continue;
        const dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist > S_RANGE) continue;
        const dotv = dist < 1e-3 ? 1 : (dx * d[0] + dy * d[1] + dz * d[2]) / dist;
        const score = dist * (dotv > 0.5 ? 1 : 2.5);
        if (score < bestS) { bestS = score; best = id; }
    }
    return best;
}

function shroudDraw(s) {
    for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + s.t * 0.5;
        const k = 1.1 + ((i + s.t) % 3) * 0.15;
        smoke_wisp(s.px + Math.cos(a) * k, s.y + 1.6 + ((i * 5 + s.t) % 6) * 0.14, s.z + Math.sin(a) * k, 1.3, 0.9);
    }
    smoke_wisp(s.px, s.y + 1.2, s.z, 2.2, 1.2);
    smoke_wisp(s.px, s.y + 0.2, s.z, 1.6, 0.8);
}

function shroudBurst(s, hitTarget) {
    for (let i = 0; i < S_BURST_PTS; i++) {
        const a = (i / S_BURST_PTS) * Math.PI * 2;
        const k = S_BURST_R * (0.35 + (i % 4) * 0.22);
        smoke_wisp(s.px + Math.cos(a) * k, s.y + 0.4 + (i % 3) * 0.5, s.z + Math.sin(a) * k, 2.2, 3.2);
    }
    hitArea([s.px, s.y, s.z], S_BURST_R, s.pid, s.item, S_MAXD, {
        height: 3,
        effect: ["Weakness", 4000, 1],
        onHit: function (id, p) {
            if (id === s.target && hitTarget) damage(id, smoke_S_DMG, s.pid, s.item);
        },
    });
}

function shroudCo(s, tok) {
    return {
        next: function () {
            const st = shrouds[s.pid];
            if (!st || st.tok !== tok) return { done: true };

            const alive = isAliveId(s.target);
            const p = alive ? posOf(s.target) : null;
            if (p) { s.px = p[0]; s.y = p[1]; s.z = p[2]; }

            if (!p || s.t++ >= S_TICKS) {
                shroudBurst(s, !!p);
                delete shrouds[s.pid];
                return { done: true };
            }

            try {
                shroudDraw(s);
                if (s.t % S_PULSE === 0) {
                    eff(s.target, "Slowness", 450, { inbuiltLevel: 2 });
                    damage(s.target, smoke_S_DMG, s.pid, s.item);
                }
            } catch (e) {}
            return { value: sleep(4), done: false };
        }
    };
}

function onPlayerClickSmokeFog(pid, itemName) {
    if (fogs[pid]) return true;
    const p = posOf(pid);
    if (!p) return false;
    const tok = ((fogs[pid] && fogs[pid].tok) || 0) + 1;
    fogs[pid] = { tok: tok };
    run(fogCo({ caster: pid, item: itemName, c: [p[0], p[1], p[2]], r: fogRadius(pid), t: 0 }, tok));
    return true;
}

function onPlayerClickSmokeShroud(pid, itemName) {
    if (shrouds[pid]) return true;
    const target = shroudTarget(pid);
    if (!target) return false;
    const tp = posOf(target);
    if (!tp) return false;

    const tok = ((shrouds[pid] && shrouds[pid].tok) || 0) + 1;
    shrouds[pid] = { tok: tok };
    run(shroudCo({ pid: pid, item: itemName, target: target, px: tp[0], y: tp[1], z: tp[2], t: 0 }, tok));
    return true;
}

function onCancelSmoke(pid) {
    delete fogs[pid];
    delete shrouds[pid];
}

function onPlayerLeaveSmoke(pid) {
    if (fogs[pid]) fogs[pid].tok = -1;
    if (shrouds[pid]) shrouds[pid].tok = -1;
    delete fogs[pid];
    delete shrouds[pid];
}


Object.assign(R,{onPlayerClickSmokeFog,onPlayerClickSmokeShroud,onCancelSmoke,onPlayerLeaveSmoke});
})(globalThis.FA);
