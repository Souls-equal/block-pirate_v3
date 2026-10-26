// src/blocks/220-tiger-form.js — TIGER (form)
// Source lisible. Ce fichier est minifié + empaqueté par `npm run build:blocks`.
// NE PAS coller ce fichier directement dans un Code Block : utiliser code-blocks/pack-XX.js.

(FA=>{/* source : ce fichier est regroupé avec d'autres dans un pack par le build. */const C=FA.c,R=FA.r,F=C.fx,{api,damage,eff,entitiesIn,heal,hitArea,hitSeg,impulse,isAliveId,lifeforms,markUntil,pickTarget,posOf,safeHealth,safePosition,statLevel,unmark,strengthMult,claimSummon,freeSummon,chest,facing,heading,isPlayerAlive,safeEntityName,safeEntityType,targetBlock,boom,box,boxSpan,CAGE,circle,clamp,column,dist2,distH2,frame,GOLDEN,inBox,norm,point,ring,TAU,TEX,run,setInterval,setTimeout,sleep,blockAt,clearIf,freeSpot,isSolid,raycast,setBlock,stuck,knockBack}=C,mesh=F,sound=F,ct_mesh=F.create,ct_to=F.move,ct_off=F.remove,ct_tilt=F.rotate,ct_preset=F.playParticle,soundAt=F.at,tf_create=F.create,tf_move=F.move,tf_remove=F.remove,tf_turn=F.rotate;
/* TIGRE — tu sautes a quatre pattes sur ce que tu regardes, et pendant 16 s
   tu as la peau, la queue et la vitesse du chat. Un bond par clic : chaque
   bond rallonge la forme de 6 s, jusqu'a 26 s. */

const TF_LIFE = 16000, TF_STEP = 6000, TF_MAX = 26000, TF_LOCK = 8000, TF_GAP = 3500;
const TF_DMG = 30, TF_R = 2.7, TF_LUNGE = 9.5, TF_LIFT = 3.4, TF_KB = 22;
const TF_TEETH = 8, TF_SEG = 0.66, TF_TAIL = 4, TF_SPEED = 1100, TF_TICK = 20;
const TF_FUR = "Orange Concrete", TF_PAW = "Black Concrete", TF_BELLY = "Snow", TF_ALT = "Concrete";
const TF_ORANGE = [236, 142, 42], TF_DARK = [46, 30, 18], TF_BONE = [252, 248, 238];
const TF_SND = { form: "pulseFromTheDark", leap: "bigDrumSwish1", land: "cannonFire1", off: "magicAccent4", cut: "critical_hit" };

/* ce qui suit l'animation du joueur : noeud, peau, taille, decalage. Les noms
   de noeuds sont ceux de la reference (TorsoNode, ArmLeftMesh, LegRightMesh). */
const TF_NODES = [
    ["TorsoNode", TF_FUR, 1.44, [0, 0.05, -0.05]],
    ["ArmLeftMesh", TF_FUR, 0.68, [0.07, -0.48, 0]],
    ["ArmRightMesh", TF_FUR, 0.68, [-0.07, -0.48, 0]],
    ["LegLeftMesh", TF_PAW, 0.62, [0.02, -0.46, 0.03]],
    ["LegRightMesh", TF_PAW, 0.62, [-0.02, -0.46, 0.03]],
];

const tfOn = {};                                  /* pid -> la forme en cours */
const tfLock = {};                                /* pid -> fin du verrou */
const tfSkin = { fur: TF_FUR, paw: TF_PAW, belly: TF_BELLY };   /* les noms qui passent */

function tf_now() { try { return api.now() } catch (e) { return Date.now() } }
function tf_pos(pid) { let p = null; try { p = posOf(pid) } catch (e) {} return p }
function tf_alive(pid) {
    if (!isAliveId(pid)) return false;
    try { const h = api.getHealth(pid); if (typeof h === "number" && h <= 0) return false } catch (e) {}
    return true;
}
/* l'avant et le cote, a l'horizontale seulement : une peau ne se cambre pas */
function tf_axes(pid) {
    const d = facing(pid) || [0, 0, 1];
    const l = Math.sqrt(d[0] * d[0] + d[2] * d[2]);
    const fx = l > 0.02 ? d[0] / l : 0, fz = l > 0.02 ? d[2] / l : 1;
    return { fx: fx, fz: fz, rx: -fz, rz: fx, yaw: Math.atan2(fx, fz) };
}
/* tf_create rend le NOM QUI A PASSE : si "Orange Concrete" n'existe pas chez
   ton serveur, le fallback a pris le relais et on retient celui-la. */
function tf_mesh(at, size, pid, want, key) {
    let m = null;
    try { m = tf_create(want, size, pid, TF_ALT) } catch (e) { m = null }
    if (!m || !m.id) return null;
    if (key && m.block) tfSkin[key] = m.block;
    tf_move(m.id, at[0], at[1], at[2]);
    return m.id;
}
/* le premier maillon decide si le tigre a une peau ou seulement des griffes */
function tf_suit(pid, go) {
    if (!go) return;
    for (let i = 0; i < TF_NODES.length; i++) {
        const n = TF_NODES[i];
        try {
            api.updateEntityNodeMeshAttachment(pid, n[0], "BloxdBlock",
                { blockName: n[1] === TF_PAW ? tfSkin.paw : tfSkin.fur, size: n[2], meshOffset: [0, 0, 0] }, n[3], [0, 0, 0]);
        } catch (e) {}
    }
}
function tf_bare(pid) {
    for (let i = 0; i < TF_NODES.length; i++) {
        try { api.updateEntityNodeMeshAttachment(pid, TF_NODES[i][0], null, null, null, null) } catch (e) {}
    }
}
function tf_free(st) {
    for (let i = 0; i < st.parts.length; i++) if (st.parts[i]) { tf_remove(st.parts[i]); st.parts[i] = null }
    for (let i = 0; i < st.tail.length; i++) if (st.tail[i]) { tf_remove(st.tail[i]); st.tail[i] = null }
    st.parts = [];
    st.tail = [];
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
        if (!id || id === st.pid || st.hit[id] || !isAliveId(id)) continue;
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
    const p = tf_pos(st.pid);
    if (!p) return;
    const a = st.a = tf_axes(st.pid);
    const hx = p[0] + a.fx * 0.14, hy = p[1] + 1.76, hz = p[2] + a.fz * 0.14;
    if (st.parts[0]) { tf_move(st.parts[0], hx, hy, hz); tf_turn(st.parts[0], 0, a.yaw, 0) }
    if (st.parts[1]) tf_move(st.parts[1], hx + a.rx * 0.42 - a.fx * 0.06, hy + 0.5, hz + a.rz * 0.42 - a.fz * 0.06);
    if (st.parts[2]) tf_move(st.parts[2], hx - a.rx * 0.42 - a.fx * 0.06, hy + 0.5, hz - a.rz * 0.42 - a.fz * 0.06);
    if (st.parts[3]) { tf_move(st.parts[3], hx + a.fx * 0.6, hy - 0.16, hz + a.fz * 0.6); tf_turn(st.parts[3], 0, a.yaw, 0) }
    let px = p[0] - a.fx * 0.66, py = p[1] + 1.16, pz = p[2] - a.fz * 0.66;
    const sway = Math.sin(st.t * 0.19) * 0.34;
    for (let i = 0; i < st.tail.length; i++) {
        const m = st.tail[i];
        if (!m) continue;
        const tx = px - a.fx * TF_SEG + a.rx * sway * (i + 1) * 0.28;
        const tz = pz - a.fz * TF_SEG + a.rz * sway * (i + 1) * 0.28;
        const ty = py - 0.1 * (i + 1) + Math.sin(st.t * 0.19 + i * 0.9) * 0.06;
        tf_move(m, tx, ty, tz);
        tf_turn(m, 0, a.yaw + sway * 0.4, 0);
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
    tf_free(st);
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
        teeth: 0, land: 0, hit: {}, a: tf_axes(pid), parts: [], tail: [],
    };
    tfOn[pid] = rec;
    const a = rec.a;
    const hx = p[0] + a.fx * 0.14, hy = p[1] + 1.76, hz = p[2] + a.fz * 0.14;
    rec.parts[0] = tf_mesh([hx, hy, hz], 1.12, pid, TF_FUR, "fur");
    rec.parts[1] = tf_mesh([hx + a.rx * 0.42, hy + 0.5, hz + a.rz * 0.42], 0.42, pid, TF_PAW, "paw");
    rec.parts[2] = tf_mesh([hx - a.rx * 0.42, hy + 0.5, hz - a.rz * 0.42], 0.42, pid, tfSkin.paw, null);
    rec.parts[3] = tf_mesh([hx + a.fx * 0.6, hy - 0.16, hz + a.fz * 0.6], 0.6, pid, TF_BELLY, "belly");
    for (let i = 0; i < TF_TAIL; i++) rec.tail[i] = tf_mesh([p[0] - a.fx * (0.66 + TF_SEG * i), p[1] + 1.06 - i * 0.1, p[2] - a.fz * (0.66 + TF_SEG * i)], 0.44 - i * 0.05, pid, i % 2 ? tfSkin.paw : tfSkin.fur, null);
    tf_suit(pid, !!rec.parts[0]);
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
