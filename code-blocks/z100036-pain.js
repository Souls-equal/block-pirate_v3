/* ============================================================
   PAIN (Pulse of Pain)
   1 fruit = 1 Code Block. Ne PAS modifier la 1re et la derniere ligne.
   ============================================================ */
(FA=>{/* Code Block fruits — colle ce fichier TEL QUEL dans UN Code Block du monde. */const C=FA.c,R=FA.r,F=C.fx,{api,damage,eff,entitiesIn,heal,hitArea,hitSeg,impulse,isAliveId,lifeforms,markUntil,pickTarget,posOf,safeHealth,safePosition,statLevel,unmark,strengthMult,claimSummon,freeSummon,chest,facing,heading,isPlayerAlive,safeEntityName,safeEntityType,targetBlock,boom,box,boxSpan,CAGE,circle,clamp,column,dist2,distH2,frame,GOLDEN,inBox,norm,point,ring,TAU,TEX,run,setInterval,setTimeout,sleep,blockAt,clearIf,freeSpot,isSolid,raycast,setBlock,stuck,knockBack}=C,mesh=F,sound=F,ct_mesh=F.create,ct_to=F.move,ct_off=F.remove,ct_tilt=F.rotate,ct_preset=F.playParticle,soundAt=F.at,tf_create=F.create,tf_move=F.move,tf_remove=F.remove,tf_turn=F.rotate;
/* Pain — “Pulse of Pain” */

const R0 = 3.5, pain_R1 = 28, FRAMES = 66, GRACE = 30, pain_H = 5;
const pain_DMG = 30, pain_KB = 2.6, pain_UP = 1.5, COST0 = 4, COST1 = 16;
const WAVE = 14, pain_PTS = 12;

const charges = {};

function frac(st) { return st.t >= FRAMES ? 1 : st.t / FRAMES; }
function radius(st) { return R0 + (pain_R1 - R0) * frac(st); }
function costOf(st) { return Math.round(COST0 + (COST1 - COST0) * frac(st)); }

function drop(pid, st) {
    st.done = 1;
    if (charges[pid] === st) delete charges[pid];
}

function chargeFx(pid, st) {
    const p = posOf(pid);
    if (!p) return;
    const f = frac(st), r = radius(st);
    circle(pain_PTS, function (i, a) {
        const x = p[0] + Math.cos(a) * r, z = p[2] + Math.sin(a) * r;
        point([x, p[1] + 0.25, z], {
            r: 0.14, tex: (i % 2) ? TEX.glint : TEX.square,
            life: [0.2, 0.5], power: [0.3, 1.1],
            size: [0.22 + f * 0.3, 0.46 + f * 0.55],
            gravity: [0, 0.6, 0],
            dir: [(p[0] - x) * (0.95 + f * 0.45), 1.25, (p[2] - z) * (0.95 + f * 0.45)], dirSpread: 0.45,
            colors: [[[255, 80 + f * 110, 80 + f * 90, 0.95], [150, 15, 25]], [[40, 0, 0, 0], [130, 25, 25, 0]]],
        });
    }, st.t * 0.35);
}

function wave(p, r) {
    let i = 0;
    run({
        next: function () {
            if (i >= WAVE) return { done: true };
            i++;
            const f = i / WAVE, rad = r * (0.35 + 0.65 * f);
            circle(pain_PTS, function (k, a) {
                point([p[0] + Math.cos(a) * rad, p[1] + 0.6, p[2] + Math.sin(a) * rad], {
                    r: 0.25, tex: (k % 3) ? TEX.square : TEX.glint, count: 2,
                    life: [0.18, 0.42], power: [0.6, 2.2], size: [0.3, 0.7 + f * 0.5],
                    gravity: [0, -1.4, 0], dir: [Math.cos(a) * 2.75, 2.3, Math.sin(a) * 2.75], dirSpread: 1.25,
                    colors: [[[255, 200, 190], [225, 40, 45]], [[90, 10, 15, 0], [140, 20, 25, 0]]],
                });
            });
            return { value: sleep(1), done: false };
        }
    });
}

function release(pid, st) {
    st = st || charges[pid];
    if (!st || st.done) return false;
    drop(pid, st);

    const p = posOf(pid);
    if (!p) return false;

    const r = radius(st), cost = costOf(st);
    const hp = safeHealth(pid) || 0;

    const pay = Math.max(0, Math.min(cost, Math.max(0, hp - 1)));
    if (pay > 0) { try { damage(pid, -pay, pid, api.getHeldItem(pid).name); } catch (e) {} }

    const ids = lifeforms(pid);
    let hits = 0;
    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const q = posOf(id);
        if (!q) continue;
        const dx = q[0] - p[0], dz = q[2] - p[2];
        const dh = Math.sqrt(dx * dx + dz * dz);
        if (dh > r || Math.abs((q[1] || 0) - p[1]) > pain_H) continue;

        hits++;
        damage(id, pain_DMG, pid, st.item);
        const nl = dh || 1;
        impulse(id, (dx / nl) * pain_KB, pain_UP, (dz / nl) * pain_KB);
    }

    sound.at(pid, "cannonFire3", 0.85, 0.8 + 0.25 * (1 - frac(st)), 26);
    boom([p[0], p[1] + 0.8, p[2]], 0.7 + r * 0.4, { count: 60, colors: [[[255, 60, 60], [255, 200, 120]], [[90, 10, 15, 0], [255, 60, 60, 0]]] });
    wave(p, r);

    if (pay < cost) {
        try { api.sendMessage(pid, [{ str: "You had nothing left to give it.", style: { color: "#FF8C8C" } }]); } catch (e) {}
    }
    return hits > 0;
}

function chargeCo(st) {
    return {
        next: function () {
            if (charges[st.pid] !== st) return { done: true };
            if (!isAliveId(st.pid)) { drop(st.pid, st); return { done: true }; }
            st.t++;
            if (st.t >= FRAMES + GRACE) { release(st.pid, st); return { done: true }; }
            chargeFx(st.pid, st);
            return { value: sleep(2), done: false };
        }
    };
}

function onPlayerClickPainPulse(pid, itemName) {
    if (!isAliveId(pid) || !posOf(pid)) return false;
    if (charges[pid]) return true;

    const st = { pid: pid, item: itemName, t: 0, done: 0 };
    charges[pid] = st;
    chargeFx(pid, st);
    sound.at(pid, "cannonFire3", 0.4, 1.4, 14);
    run(chargeCo(st));
    return true;
}

function onPlayerReleasePainPulse(pid) {
    const st = charges[pid];
    if (!st) return false;
    return release(pid, st);
}

function onCancelPain(pid) {
    const st = charges[pid];
    if (st) drop(pid, st);
}

function onPlayerLeavePain(pid) { onCancelPain(pid); }


Object.assign(R,{onPlayerClickPainPulse,onPlayerReleasePainPulse,onCancelPain,onPlayerLeavePain});
})(globalThis.FA);
