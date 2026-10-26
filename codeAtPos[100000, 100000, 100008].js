/* ============================================================
   DARK (Void Vortex + Void Anchor)
   1 fruit = 1 Code Block. Ne PAS modifier la 1re et la derniere ligne.
   ============================================================ */
(FA=>{/* Code Block fruits — colle ce fichier TEL QUEL dans UN Code Block du monde. */const C=FA.c,R=FA.r,F=C.fx,{api,damage,eff,entitiesIn,heal,hitArea,hitSeg,impulse,isAliveId,lifeforms,markUntil,pickTarget,posOf,safeHealth,safePosition,statLevel,unmark,strengthMult,claimSummon,freeSummon,chest,facing,heading,isPlayerAlive,safeEntityName,safeEntityType,targetBlock,boom,box,boxSpan,CAGE,circle,clamp,column,dist2,distH2,frame,GOLDEN,inBox,norm,point,ring,TAU,TEX,run,setInterval,setTimeout,sleep,blockAt,clearIf,freeSpot,isSolid,raycast,setBlock,stuck,knockBack}=C,mesh=F,sound=F,ct_mesh=F.create,ct_to=F.move,ct_off=F.remove,ct_tilt=F.rotate,ct_preset=F.playParticle,soundAt=F.at,tf_create=F.create,tf_move=F.move,tf_remove=F.remove,tf_turn=F.rotate;
/* VOID VORTEX */
const V_DUR = 2500, V_FWD = 4.5, V_H = 1.1, V_R = 6.5, V_HT = 4;
const V_PULL = 1.35, V_LIFT = 0.22, V_NEAR = 0.9, V_SLEEP = 2;
const V_SLOW_MS = 600, V_SLOW_LV = 2;
const V_CRUSH = 28, V_CR_R = 3.2, V_ARMS = 3, V_PTS = 10, V_TURNS = 1.6;

const vToken = {};

function vIn(v, p) {
    return distH2(p, v.c) <= v.r * v.r && Math.abs(p[1] - v.c[1]) <= V_HT;
}

function vSpawn(c) {
    point(c, {
        r: 0.6, tex: TEX.soul, count: 20,
        life: [0.3, 0.7], power: [0.8, 2], size: [0.2, 0.45],
        gravity: [0, 1.5, 0], dir: [0, 1, 0], dirSpread: 1.2,
        colors: [[[160, 60, 255], [80, 20, 180]], [[40, 0, 80, 0], [120, 40, 200, 0]]],
    });
}

function vSpiral(c, radius, ang, scale) {
    const base = Math.max(0.8, radius * scale);
    for (let arm = 0; arm < V_ARMS; arm++) {
        const off = (arm / V_ARMS) * Math.PI * 2;
        for (let i = 0; i < V_PTS; i++) {
            const t = i / (V_PTS - 1 || 1);
            const a = ang + off + t * Math.PI * 2 * V_TURNS;
            const r = base * (1 - t * 0.85);
            const p = [c[0] + Math.cos(a) * r, c[1] + (1 - t) * 0.15 + t * 0.9, c[2] + Math.sin(a) * r];
            const core = t > 0.7;
            point(p, {
                r: 0.05, tex: core ? TEX.glint : TEX.soul,
                life: [0.2, 0.45], power: [0.15, 0.55], size: [0.14, 0.32],
                gravity: [0, 0.4, 0], dir: [-Math.sin(a) * 0.6, 0.3, Math.cos(a) * 0.6], dirSpread: 0.3,
                colors: [[core ? [230, 200, 255] : [140, 40, 255, 0.95], core ? [255, 255, 255] : [90, 20, 200, 0.95]],
                         [[40, 0, 90, 0], [100, 40, 180, 0]]],
            });
        }
    }
}

function vPull(t, v) {
    const p = posOf(t);
    if (!p || !vIn(v, p)) return;
    const dx = v.c[0] - p[0], dy = v.c[1] - (p[1] + 0.9), dz = v.c[2] - p[2];
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    eff(t, "Slowness", V_SLOW_MS, { inbuiltLevel: V_SLOW_LV });
    if (d < 0.35) return;
    const inv = 1 / d;
    const near = Math.max(0, Math.min(1, 1 - d / (v.r + 0.01)));
    const s = V_PULL + V_NEAR * near;
    impulse(t, dx * inv * s, dy * inv * s * 0.45 + V_LIFT, dz * inv * s);
}

function vCrush(v) {
    boom(v.c, 0.5, {
        tex: TEX.crit, count: 24, power: [1.5, 3.5], size: [0.2, 0.5],
        gravity: [0, -3, 0], dir: [0, 1, 0], dirSpread: 2,
        colors: [[[255, 200, 255], [160, 40, 255]], [[40, 0, 60, 0], [100, 20, 140, 0]]],
    });
    sound.at(v.c, "cannonFire3", 0.7, 1.4, 22);
    hitArea(v.c, V_CR_R, v.caster, v.item, V_CRUSH, { height: V_HT });
}

function vCo(v, tok) {
    let ang = 0;
    return {
        next: function () {
            if (vToken[v.caster] !== tok) return { done: true };
            const now = Date.now();
            if (now >= v.end) {
                try { vCrush(v); } catch (e) {}
                return { done: true };
            }
            try {
                const life = Math.max(0, Math.min(1, 1 - (v.end - now) / V_DUR));
                vSpiral(v.c, v.r, ang, 1 - life * 0.55);
                const ids = lifeforms(v.caster);
                for (let i = 0; i < ids.length; i++) vPull(ids[i], v);
            } catch (e) {}
            ang += 0.55;
            return { value: sleep(V_SLEEP), done: false };
        }
    };
}

function onPlayerClickVortex(playerId, itemName) {
    const p = posOf(playerId);
    if (!p) return true;

    const d = facing(playerId);
    const flat = norm([d[0], 0, d[2]]);
    const tok = (vToken[playerId] || 0) + 1;
    vToken[playerId] = tok;

    const v = {
        caster: playerId, item: itemName,
        c: [p[0] + flat[0] * V_FWD, p[1] + V_H, p[2] + flat[2] * V_FWD],
        r: V_R, end: Date.now() + V_DUR,
    };

    sound.at(playerId, "cannonFire3", 0.7, 0.65, 22);
    vSpawn(v.c);
    run(vCo(v, tok));
    setTimeout(function () { if (vToken[playerId] === tok) delete vToken[playerId]; }, Math.ceil(V_DUR / 50) + 15);
    return true;
}

function onPlayerLeaveVortex(playerId) {
    vToken[playerId] = (vToken[playerId] || 0) + 1;
}


/* VOID ANCHOR */
const A_CHARGE = 1500, A_R = 5, A_HT = 4, A_PULL = 0.55, A_FWD = 3.5;
const A_DMG = 36, A_SLOW_MS = 2000, A_SLOW_LV = 2, A_FRAME = 3;

function aPos(pid) {
    const t = targetBlock(pid);
    if (t) return t;
    const p = posOf(pid);
    if (!p) return null;
    const f = norm([facing(pid)[0], 0, facing(pid)[2]]);
    return [p[0] + f[0] * A_FWD, p[1] + 0.2, p[2] + f[2] * A_FWD];
}

function aPulse(c, life) {
    const s = 0.4 + life * 0.5;
    point(c, {
        r: s, tex: TEX.soul, count: 8,
        life: [0.25, 0.5], power: [0.3, 1], size: [0.2, 0.4],
        gravity: [0, 1, 0], dir: [0, 0.7, 0], dirSpread: 0.4,
        colors: [[[30, 0, 50], [90, 20, 120]], [[0, 0, 0, 0], [40, 0, 60, 0]]],
    });

    const r = A_R * (1 - life * 0.7);
    ring(c, r, 16, {
        tex: TEX.glint, life: [0.15, 0.35], power: [0.2, 0.6], size: [0.15, 0.3],
        gravity: [0, 0.5, 0], dirAt: function (a) { return [-Math.cos(a) * 0.8, 0.5, -Math.sin(a) * 0.8]; },
        colors: [[[80, 40, 120], [200, 120, 255]], [[20, 0, 40, 0], [60, 20, 90, 0]]],
    }, life * 6);
}

function aPull(caster, c) {
    const ids = lifeforms(caster);
    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const p = posOf(id);
        if (!p) continue;
        if (Math.abs(p[1] - c[1]) > A_HT) continue;
        if (distH2(p, c) > A_R * A_R) continue;
        const dx = c[0] - p[0], dy = c[1] - (p[1] + 0.5), dz = c[2] - p[2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < 0.4) continue;
        impulse(id, dx / d * A_PULL, dy / d * A_PULL * 0.3, dz / d * A_PULL);
    }
}

function aBoom(caster, c, item) {
    boom(c, 1, { count: 26, colors: [[[120, 40, 200], [60, 10, 120]], [[20, 0, 40, 0], [60, 10, 120, 0]]] });
    sound.at(c, "cannonFire3", 0.9, 0.55, 24);
    hitArea(c, A_R, caster, item, A_DMG, {
        height: A_HT,
        slow: [A_SLOW_MS, A_SLOW_LV],
    });
}

function onPlayerClickAnchor(playerId, itemName) {
    const a = aPos(playerId);
    if (!a) return true;

    const t0 = Date.now();
    const end = t0 + A_CHARGE;
    sound.at(a, "cannonFire3", 0.5, 0.4, 16);

    run({
        next: function () {
            const now = Date.now();
            if (now >= end) {
                try { aBoom(playerId, a, itemName); } catch (e) {}
                return { done: true };
            }
            try {
                aPulse(a, (now - t0) / A_CHARGE);
                aPull(playerId, a);
            } catch (e) {}
            return { value: sleep(A_FRAME), done: false };
        }
    });
    return true;
}


Object.assign(R,{onPlayerClickVortex,onPlayerLeaveVortex,onPlayerClickAnchor});
})(globalThis.FA);
