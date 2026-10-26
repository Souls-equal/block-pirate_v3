// src/blocks/150-rubber.js — RUBBER
// Source lisible. Ce fichier est minifié + empaqueté par `npm run build:blocks`.
// NE PAS coller ce fichier directement dans un Code Block : utiliser code-blocks/pack-XX.js.

(FA=>{/* source : ce fichier est regroupé avec d'autres dans un pack par le build. */const C=FA.c,R=FA.r,F=C.fx,{api,damage,eff,entitiesIn,heal,hitArea,hitSeg,impulse,isAliveId,lifeforms,markUntil,pickTarget,posOf,safeHealth,safePosition,statLevel,unmark,strengthMult,claimSummon,freeSummon,chest,facing,heading,isPlayerAlive,safeEntityName,safeEntityType,targetBlock,boom,box,boxSpan,CAGE,circle,clamp,column,dist2,distH2,frame,GOLDEN,inBox,norm,point,ring,TAU,TEX,run,setInterval,setTimeout,sleep,blockAt,clearIf,freeSpot,isSolid,raycast,setBlock,stuck,knockBack}=C,mesh=F,sound=F,ct_mesh=F.create,ct_to=F.move,ct_off=F.remove,ct_tilt=F.rotate,ct_preset=F.playParticle,soundAt=F.at,tf_create=F.create,tf_move=F.move,tf_remove=F.remove,tf_turn=F.rotate;
/* Rubber — “Elastic Punch” (100% particules, sans mesh) */

const rubber_RANGE = 11, rubber_R = 1.85, rubber_DMG = 30, rubber_KB = 2.4, rubber_UP = 1.0;
const ACCEL = 0.55, SNAP = 0.55, rubber_FRAME = 1, LUNGE = 1.4, OFF = 1.25;

const fists = {};

function clip(from, dir, len) {
    for (let t = 0.6; t <= len; t += 0.6) {
        if (isSolid(from[0] + dir[0] * t, from[1] + dir[1] * t, from[2] + dir[2] * t)) {
            return Math.max(0.5, t - 0.6);
        }
    }
    return len;
}

function drawArm(st, from, len) {
    const dir = st.dir;
    const tip = [from[0] + dir[0] * len, from[1] + dir[1] * len, from[2] + dir[2] * len];
    const n = clamp(Math.round(len / 0.85), 4, 12);
    for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        point([from[0] + (tip[0] - from[0]) * t, from[1] + (tip[1] - from[1]) * t, from[2] + (tip[2] - from[2]) * t], {
            r: 0.14, tex: TEX.square, count: 2,
            life: [0.12, 0.26], power: [0.08, 0.35], size: [0.28, 0.5],
            gravity: [0, 0.2, 0], dir: [0, 0.08, 0], dirSpread: 0.16,
            colors: [[[245, 225, 215, 0.95], [255, 255, 255, 0.9]], [[220, 180, 175, 0], [255, 255, 255, 0]]],
        });
    }
    point(tip, {
        r: 0.28, tex: TEX.square, count: 7,
        life: [0.12, 0.25], power: [0.3, 1.1], size: [0.45, 0.82],
        dir: dir, dirSpread: 0.28,
        colors: [[[255, 240, 230, 1], [255, 190, 180, 0.95]], [[235, 235, 230, 0], [255, 255, 255, 0]]],
    });
    return tip;
}

function rubber_impact(x, y, z) {
    boom([x, y, z], 1.35, { count: 36, colors: [[[255, 240, 230], [255, 255, 255]], [[180, 150, 145, 0], [250, 250, 245, 0]]] });
    sound.at([x, y, z], "cannonFire3", 0.65, 0.85, 18);
}

function rubber_co(st) {
    return {
        next: function () {
            if (fists[st.pid] !== st) return { done: true };
            const p = posOf(st.pid);
            if (!p) { end(st); return { done: true }; }

            const from = [p[0], p[1] + OFF, p[2]];
            if (st.phase === 0) {
                st.prog += (1 - st.prog) * ACCEL;
                if (st.prog > 0.97) { st.prog = 1; st.phase = 1; }
            } else if (st.phase === 1) {
                st.phase = 2;
            } else {
                st.prog -= st.prog * SNAP;
                if (st.prog < 0.05) { end(st); return { done: true }; }
            }

            const want = rubber_RANGE * st.prog;
            if (st.phase === 0 && st.clip === undefined) st.clip = clip(from, st.dir, want);
            const len = st.clip === undefined ? want : Math.min(want, st.clip);

            try {
                const tip = drawArm(st, from, len);
                if (len < want - 0.1 && !st.wallFx) { st.wallFx = 1; rubber_impact(tip[0], tip[1], tip[2]); }
                if (st.phase === 0) {
                    const hit = hitSeg(from, tip, rubber_R, st.pid, st.item, rubber_DMG, {
                        onHit: function (id, pt) { rubber_impact(pt[0], pt[1], pt[2]); },
                    });
                    if (hit.count) {
                        st.phase = 2;
                        const ids = hit.seen;
                        for (const id in ids) {
                            impulse(id, st.dir[0] * rubber_KB, rubber_UP, st.dir[2] * rubber_KB);
                        }
                    }
                }
            } catch (e) {}

            return { value: sleep(rubber_FRAME), done: false };
        }
    };
}

function end(st) {
    if (fists[st.pid] === st) delete fists[st.pid];
}

function onPlayerClickRubberPunch(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;

    const dir = facing(pid);
    const st = {
        pid: pid, item: itemName, dir: dir,
        prog: 0.08, phase: 0, wallFx: 0,
    };
    fists[pid] = st;

    impulse(pid, dir[0] * LUNGE, 0.25, dir[2] * LUNGE);
    sound.at(pid, "cannonFire3", 0.65, 1.5, 18);
    run(rubber_co(st));
    setTimeout(function () { if (fists[pid] === st) end(st); }, 90);
    return true;
}

function onPlayerLeaveRubber(pid) {
    if (fists[pid]) end(fists[pid]);
}


Object.assign(R,{onPlayerClickRubberPunch,onPlayerLeaveRubber});
})(globalThis.FA);
