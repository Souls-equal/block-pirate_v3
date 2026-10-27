// src/blocks/220-tiger-form.js — TIGER (form)
// Source lisible. Ce fichier est minifié + empaqueté par `npm run build:blocks`.
// NE PAS coller ce fichier directement dans un Code Block : utiliser code-blocks/pack-XX.js.

(FA=>{/* source : ce fichier est regroupé avec d'autres dans un pack par le build. */const C=FA.c,R=FA.r,F=C.fx,{api,damage,eff,entitiesIn,heal,hitArea,hitSeg,impulse,isAliveId,lifeforms,markUntil,pickTarget,posOf,safeHealth,safePosition,statLevel,unmark,strengthMult,claimSummon,freeSummon,chest,facing,heading,isPlayerAlive,safeEntityName,safeEntityType,targetBlock,boom,box,boxSpan,CAGE,circle,clamp,column,dist2,distH2,frame,GOLDEN,inBox,norm,point,ring,TAU,TEX,run,setInterval,setTimeout,sleep,blockAt,clearIf,freeSpot,isSolid,raycast,setBlock,stuck,knockBack}=C,mesh=F,sound=F,ct_mesh=F.create,ct_to=F.move,ct_off=F.remove,ct_tilt=F.rotate,ct_preset=F.playParticle,soundAt=F.at,tf_create=F.create,tf_move=F.move,tf_remove=F.remove,tf_turn=F.rotate;
/* TIGRE — tu sautes a quatre pattes sur ce que tu regardes, et pendant 16 s
   tu as l'aura, la queue et la vitesse du tigre en particules. Un bond par clic : chaque
   bond rallonge la forme de 6 s, jusqu'a 26 s. */

const TF_LIFE = 30000, TF_STEP = 10000, TF_MAX = 50000, TF_LOCK = 8000, TF_GAP = 3500;
const TF_DMG = 30, TF_R = 2.7, TF_LUNGE = 9.5, TF_LIFT = 3.4, TF_KB = 22;
const TF_TEETH = 8, TF_SEG = 0.66, TF_TAIL = 4, TF_SPEED = 1100, TF_TICK = 20;
const TF_FUR = "Orange Concrete", TF_PAW = "Black Concrete";
const TF_ORANGE = [236, 142, 42], TF_DARK = [46, 30, 18], TF_BONE = [252, 248, 238];
const TF_SND = { form: "pulseFromTheDark", leap: "bigDrumSwish1", land: "cannonFire1", off: "magicAccent4", cut: "critical_hit" };

const TF_NODES = [
    ["TorsoNode", TF_FUR, 1.44, [0, 0.05, -0.05]],
    ["HeadMesh", TF_FUR, 0.72, [0, 0.08, 0.08]],
    ["ArmLeftMesh", TF_FUR, 0.68, [0.07, -0.48, 0]],
    ["ArmRightMesh", TF_FUR, 0.68, [-0.07, -0.48, 0]],
    ["LegLeftMesh", TF_PAW, 0.62, [0.02, -0.46, 0.03]],
    ["LegRightMesh", TF_PAW, 0.62, [-0.02, -0.46, 0.03]],
];

const tfOn = {};                                  /* pid -> la forme en cours */
const tfLock = {};                                /* pid -> fin du verrou */

function tf_suit(pid) {
    for (let i = 0; i < TF_NODES.length; i++) {
        const n = TF_NODES[i];
        try {
            api.updateEntityNodeMeshAttachment(pid, n[0], "BloxdBlock",
                { blockName: n[1], size: n[2], meshOffset: [0, 0, 0] }, n[3], [0, 0, 0]);
        } catch (e) {}
    }
}
function tf_bare(pid) {
    for (let i = 0; i < TF_NODES.length; i++) {
        try { api.updateEntityNodeMeshAttachment(pid, TF_NODES[i][0], null, null, null, null) } catch (e) {}
    }
}

function tf_now() { try { return api.now() } catch (e) { return Date.now() } }
function tf_pos(pid) { let p = null; try { p = posOf(pid) } catch (e) {} return p }
function tf_alive(pid) {
    if (!isAliveId(pid)) return false;
    try { const h = api.getHealth(pid); if (typeof h === "number" && h <= 0) return false } catch (e) {}
    return true;
}
/* l'avant et le cote, a l'horizontale seulement */
function tf_axes(pid) {
    const d = facing(pid) || [0, 0, 1];
    const l = Math.sqrt(d[0] * d[0] + d[2] * d[2]);
    const fx = l > 0.02 ? d[0] / l : 0, fz = l > 0.02 ? d[2] / l : 1;
    return { fx: fx, fz: fz, rx: -fz, rz: fx, yaw: Math.atan2(fx, fz) };
}

/* la fumee qui dit "la peau est prise", et celle qui dit "elle retombe" */
function tf_puff(st, on) {
    const p = tf_pos(st.pid);
    if (!p) return;
    const c = [p[0], p[1] + 1.05, p[2]];
    box([c[0] - 0.9, c[1] - 1.05, c[2] - 0.9], [c[0] + 0.9, c[1] + 1.15, c[2] + 0.9], {
        tex: TEX.square, count: on ? 34 : 20, size: [0.16, 0.5], life: [0.3, on ? 0.85 : 0.6],
        power: [0.5, on ? 2.6 : 1.8], dir: [0, on ? 1.1 : 1.6, 0], dirSpread: 1.5, gravity: [0, -3.2, 0],
        colors: on ? [[TF_ORANGE[0], TF_ORANGE[1], TF_ORANGE[2], 0.95], [TF_DARK[0], TF_DARK[1], TF_DARK[2], 0]]
                   : [[TF_BONE[0], TF_BONE[1], TF_BONE[2], 0.8], [TF_ORANGE[0], TF_ORANGE[1], TF_ORANGE[2], 0]],
    });
    try { api.broadcastSound(on ? TF_SND.form : TF_SND.off, on ? 0.7 : 0.45, on ? 0.85 : 1.5, { playerIdOrPos: c, maxHearDist: 30 }) } catch (e) {}
}
function tf_paws(st) {
    const p = tf_pos(st.pid);
    if (!p) return;
    const a = st.a;
    for (let i = 0; i < 4; i++) {
        const fx = i < 2 ? a.fx : a.fx * 0.55, fz = i < 2 ? a.fz : a.fz * 0.55;
        const sideX = i % 2 ? a.rx : -a.rx, sz = i % 2 ? a.rz : -a.rz;
        point([p[0] + fx * 0.95 + sideX * 0.4, p[1] + 0.14, p[2] + fz * 0.95 + sz * 0.4], {
            tex: TEX.square, count: 3, size: [0.12, 0.3], life: [0.16, 0.36], power: [0.3, 1.2],
            dir: [sideX * 0.4, 0.9, sz * 0.4], dirSpread: 0.2, gravity: [0, -4, 0],
            colors: [[TF_BONE[0], TF_BONE[1], TF_BONE[2], 0.75], [TF_DARK[0], TF_DARK[1], TF_DARK[2], 0]],
        });
    }
}
/* le bond : l'impulsion est pour toi, les griffes pour ce qui est devant */
function tf_leap(st) {
    const a = st.a = tf_axes(st.pid), p = tf_pos(st.pid);
    if (!p) return;
    knockBack(st.pid, a.fx * TF_LUNGE, TF_LIFT, a.fz * TF_LUNGE);
    st.teeth = TF_TEETH;
    st.hit = {};
    st.land = 7;
    point([p[0] + a.fx * 0.9, p[1] + 0.9, p[2] + a.fz * 0.9], {
        tex: TEX.square, count: 16, size: [0.2, 0.62], life: [0.24, 0.5], power: [1.4, 3.2],
        dir: [a.fx, 0.35, a.fz], dirSpread: 0.5, gravity: [0, -4, 0],
        colors: [[TF_BONE[0], TF_BONE[1], TF_BONE[2], 0.95], [TF_ORANGE[0], TF_ORANGE[1], TF_ORANGE[2], 0]],
    });
    try { api.broadcastSound(TF_SND.leap, 0.6, 1.15, { playerIdOrPos: p, maxHearDist: 26 }) } catch (e) {}
}
function tf_chomp(st) {
    const p = tf_pos(st.pid);
    if (!p) return;
    const a = st.a || tf_axes(st.pid);
    const c = [p[0] + a.fx * 1.15, p[1] + 1.05, p[2] + a.fz * 1.15];
    const ids = entitiesIn([c[0] - TF_R, c[1] - 1.8, c[2] - TF_R], [c[0] + TF_R, c[1] + 1.8, c[2] + TF_R]);
    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        if (!id || id === st.pid || st.hit[id] || !isAliveId(id) || safeEntityType(id) === "NPC") continue;
        const q = tf_pos(id);
        if (!q) continue;
        const dx = q[0] - p[0], dz = q[2] - p[2];
        const along = dx * a.fx + dz * a.fz;
        if (along < -0.5 || along > TF_R + 1.6) continue;
        st.hit[id] = 1;
        damage(id, TF_DMG, st.pid, { crit: true });
        knockBack(id, a.fx * TF_KB, 5.6, a.fz * TF_KB);
        const lat = Math.abs(dx * a.rx + dz * a.rz);
        point([q[0], q[1] + 1.05, q[2]], {
            tex: TEX.square, count: 10, size: [0.24, 0.7], life: [0.18, 0.42], power: [1.6, 3.4],
            dir: [a.fx * (lat > 0.6 ? 0.4 : 1), 0.5, a.fz * (lat > 0.6 ? 0.4 : 1)], dirSpread: 0.7,
            gravity: [0, -5, 0], colors: [[TF_BONE[0], TF_BONE[1], TF_BONE[2], 1], [TF_ORANGE[0], TF_ORANGE[1], TF_ORANGE[2], 0]],
        });
        try { api.broadcastSound(TF_SND.cut, 0.5, 1.25, { playerIdOrPos: q, maxHearDist: 20 }) } catch (e) {}
    }
}
function tf_draw(st) {
    if (st.t % 2 !== 0) return;
    const p = tf_pos(st.pid);
    if (!p) return;
    const a = st.a = tf_axes(st.pid);
    const hx = p[0] + a.fx * 0.2, hy = p[1] + 1.35, hz = p[2] + a.fz * 0.2;

    /* Manteau & oreilles de tigre en particules */
    point([hx + a.rx * 0.45, hy + 0.4, hz + a.rz * 0.45], {
        r: 0.14, tex: TEX.square, count: 2, size: [0.24, 0.42], life: [0.14, 0.28], power: [0.1, 0.35],
        colors: [[TF_ORANGE[0], TF_ORANGE[1], TF_ORANGE[2], 0.95], [TF_DARK[0], TF_DARK[1], TF_DARK[2], 0]],
    });
    point([hx - a.rx * 0.45, hy + 0.4, hz - a.rz * 0.45], {
        r: 0.14, tex: TEX.square, count: 2, size: [0.24, 0.42], life: [0.14, 0.28], power: [0.1, 0.35],
        colors: [[TF_ORANGE[0], TF_ORANGE[1], TF_ORANGE[2], 0.95], [TF_DARK[0], TF_DARK[1], TF_DARK[2], 0]],
    });

    /* Queue ondoyante en particules */
    let px = p[0] - a.fx * 0.55, py = p[1] + 1.1, pz = p[2] - a.fz * 0.55;
    const sway = Math.sin(st.t * 0.22) * 0.36;
    for (let i = 0; i < TF_TAIL; i++) {
        const tx = px - a.fx * TF_SEG + a.rx * sway * (i + 1) * 0.28;
        const tz = pz - a.fz * TF_SEG + a.rz * sway * (i + 1) * 0.28;
        const ty = py - 0.08 * (i + 1) + Math.sin(st.t * 0.22 + i * 0.9) * 0.06;
        const col = (i % 2 === 0)
            ? [[TF_ORANGE[0], TF_ORANGE[1], TF_ORANGE[2], 0.95], [TF_BONE[0], TF_BONE[1], TF_BONE[2], 0]]
            : [[TF_DARK[0], TF_DARK[1], TF_DARK[2], 0.95], [TF_ORANGE[0], TF_ORANGE[1], TF_ORANGE[2], 0]];
        point([tx, ty, tz], {
            r: 0.12, tex: TEX.square, count: 2,
            size: [0.26 - i * 0.03, 0.44 - i * 0.04], life: [0.14, 0.28], power: [0.06, 0.25],
            colors: col,
        });
        px = tx; py = ty; pz = tz;
    }
}
function tf_co(st) {
    return { next: function () {
        if (tfOn[st.pid] !== st) return { done: true };
        if (!tf_alive(st.pid)) { tf_off(st.pid, false); return { done: true } }
        st.t++;
        st.ms += 50;
        try {
            if (st.teeth > 0) { st.teeth--; tf_chomp(st) }
            if (st.land > 0) {
                st.land--;
                if (!st.land) {
                    const p = tf_pos(st.pid);
                    if (p) {
                        for (let i = 0; i < 12; i++) {
                            const b = (i / 12) * Math.PI * 2;
                            point([p[0] + Math.cos(b) * 1.5, p[1] + 0.1, p[2] + Math.sin(b) * 1.5], {
                                tex: TEX.square, count: 3, size: [0.18, 0.4], life: [0.2, 0.5], power: [0.6, 2],
                                dir: [Math.cos(b), 0.8, Math.sin(b)], dirSpread: 0.3, gravity: [0, -5, 0],
                                colors: [[TF_DARK[0], TF_DARK[1], TF_DARK[2], 0.8], [TF_DARK[0], TF_DARK[1], TF_DARK[2], 0]],
                            });
                        }
                        try { api.broadcastSound(TF_SND.land, 0.75, 0.9, { playerIdOrPos: p, maxHearDist: 30 }) } catch (e) {}
                        try { api.shakePlayerCamera(st.pid, 0.35, 550) } catch (e) {}
                    }
                }
            }
            if (st.t % 4 === 0) tf_paws(st);   /* une trace de patte toutes les 200 ms, pas plus */
            if (st.t % TF_TICK === 0) eff(st.pid, "Speed", TF_SPEED, 1);
            tf_draw(st);
        } catch (e) {}
        if (st.ms >= st.until) { tf_off(st.pid, true); return { done: true } }
        return { value: sleep(1), done: false };
    } };
}

function tf_off(pid, expire) {
    const st = tfOn[pid];
    if (!st) return false;
    delete tfOn[pid];
    tf_bare(pid);
    tf_puff(st, false);
    tfLock[pid] = tf_now() + TF_LOCK;
    if (expire) try { api.sendMessage(pid, "Your fur settles back into skin.") } catch (e) {}
    return true;
}

function onPlayerClickTigerForm(pid, itemName) {
    if (!tf_alive(pid)) return false;
    const now = tf_now();
    const st = tfOn[pid];
    if (st) {
        if (now < st.next) return true;
        st.next = now + TF_GAP;
        st.until = Math.min(TF_MAX, st.until + TF_STEP);
        tf_leap(st);
        return true;
    }
    if (now < (tfLock[pid] || 0)) return true;
    const p = posOf(pid);
    if (!p) return true;
    const rec = {
        pid: pid, item: itemName, t: 0, ms: 0, until: TF_LIFE, next: now + TF_GAP,
        teeth: 0, land: 0, hit: {}, a: tf_axes(pid),
    };
    tfOn[pid] = rec;
    tf_suit(pid);
    tf_puff(rec, true);
    tf_leap(rec);
    eff(pid, "Speed", TF_SPEED, 1);
    run(tf_co(rec));
    return true;
}

function onPlayerLeaveTigerForm(pid) {
    const had = tf_off(pid, false);
    try { if (R.onPlayerLeaveTiger) R.onPlayerLeaveTiger(pid); } catch (e) {}
    delete tfLock[pid];
    return had;
}

Object.assign(R,{onPlayerClickTigerForm,onPlayerLeaveTigerForm});
})(globalThis.FA);
