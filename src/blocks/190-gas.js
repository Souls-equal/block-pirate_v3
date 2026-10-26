// src/blocks/190-gas.js — GAS
// Source lisible. Ce fichier est minifié + empaqueté par `npm run build:blocks`.
// NE PAS coller ce fichier directement dans un Code Block : utiliser code-blocks/pack-XX.js.

(FA=>{/* source : ce fichier est regroupé avec d'autres dans un pack par le build. */const C=FA.c,R=FA.r,F=C.fx,{api,damage,eff,entitiesIn,heal,hitArea,hitSeg,impulse,isAliveId,lifeforms,markUntil,pickTarget,posOf,safeHealth,safePosition,statLevel,unmark,strengthMult,claimSummon,freeSummon,chest,facing,heading,isPlayerAlive,safeEntityName,safeEntityType,targetBlock,boom,box,boxSpan,CAGE,circle,clamp,column,dist2,distH2,frame,GOLDEN,inBox,norm,point,ring,TAU,TEX,run,setInterval,setTimeout,sleep,blockAt,clearIf,freeSpot,isSolid,raycast,setBlock,stuck,knockBack}=C,mesh=F,sound=F,ct_mesh=F.create,ct_to=F.move,ct_off=F.remove,ct_tilt=F.rotate,ct_preset=F.playParticle,soundAt=F.at,tf_create=F.create,tf_move=F.move,tf_remove=F.remove,tf_turn=F.rotate;
const ACQ = 4, KEEP = 6, gas_DMG = 10, gas_PULSE = 10, gas_MAX = 100, gas_TICK = 2;
const gas_SLO = 3, SLO_MS = 1200, SLO_EVERY = 10, JUMP = 8;

const tethers = {};

function pick(pid) {
    const p = posOf(pid);
    if (!p) return null;
    const list = entitiesIn([p[0] - ACQ, p[1] - ACQ, p[2] - ACQ], [p[0] + ACQ, p[1] + ACQ, p[2] + ACQ]);
    let best = null, bestD = ACQ * ACQ + 0.001;
    for (let i = 0; i < list.length; i++) {
        const id = list[i];
        if (id === pid || !isAliveId(id)) continue;
        const q = posOf(id);
        if (!q) continue;
        const d2 = dist2(q, p);
        if (d2 < bestD) { bestD = d2; best = id; }
    }
    return best;
}

function gas_fx(p, q) {
    for (let i = 0; i < 8; i++) {
        const t = (i + 0.5) / 8;
        point([p[0] + (q[0] - p[0]) * t, p[1] + 1 + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t], {
            r: 0.1, tex: TEX.square, count: 2,
            life: [0.12, 0.3], power: [0, 0.25], size: [0.1, 0.26],
            dir: [0, 0.115, 0], dirSpread: 0.02,
            colors: [[[200, 0, 0], [255, 110, 80]], [[120, 0, 0, 0], [220, 60, 60, 0]]],
        });
    }

    point([q[0], q[1] + 0.25, q[2]], {
        r: 0.4, tex: TEX.square, count: 8,
        life: [0.3, 0.9], power: [2, 5], size: [0.08, 0.18],
        gravity: [0, -8, 0], dir: [0, 0.5, 0], dirSpread: 1,
        colors: [[[180, 0, 0], [255, 0, 0]], [[100, 0, 0, 0], [180, 0, 0, 0]]],
    });
}

function free(tid) {
    try { api.removeEffect(tid, "Slowness"); } catch (e) {}
    try { api.setClientOption(tid, "jumpAmount", JUMP); } catch (e2) {}
}

function gas_stop(pid, st) {
    if (!st) return false;
    if (tethers[pid] === st) delete tethers[pid];
    if (st.rooted) { st.rooted = 0; free(st.target); }
    return true;
}

function gas_co(st) {
    return {
        next: function () {
            if (tethers[st.pid] !== st) return { done: true };
            st.f++;

            const p = posOf(st.pid);
            const q = isAliveId(st.target) ? posOf(st.target) : null;
            let far = true;
            if (p && q) far = dist2(q, p) > KEEP * KEEP;

            if (far || st.f > gas_MAX) { gas_stop(st.pid, st); return { done: true }; }

            gas_fx(p, q);
            if (isPlayerAlive(st.target)) {
                if (!st.rooted) {
                    st.rooted = 1;
                    try { api.setClientOption(st.target, "jumpAmount", 0); } catch (e) {}
                }
                if (st.f % SLO_EVERY === 1) eff(st.target, "Slowness", SLO_MS, { inbuiltLevel: gas_SLO });
            }
            if (st.f % gas_PULSE === 0) damage(st.target, gas_DMG, st.pid, st.item);

            return { value: sleep(gas_TICK), done: false };
        }
    };
}

function onPlayerClickGasTether(pid, itemName) {
    if (!isAliveId(pid)) return false;
    sound.at(pid, "cannonFire3", 0.65, 1.35, 20);
    if (tethers[pid]) return true;

    const target = pick(pid);
    if (!target) {
        try { api.sendMessage(pid, [{ str: "Nothing close enough to tie.", style: { color: "#FFB3B3" } }]); }
        catch (e) {}
        return false;
    }
    const tp = posOf(target);
    if (!tp) return false;

    const st = { pid: pid, item: itemName, target: target, f: 0, rooted: 0 };
    tethers[pid] = st;
    run(gas_co(st));
    setTimeout(function () { if (tethers[pid] === st) gas_stop(pid, st); }, gas_MAX * gas_TICK + 6);
    return true;
}

function onCancelGas(pid) { gas_stop(pid, tethers[pid]); }
function onPlayerLeaveGas(pid) { onCancelGas(pid); }


Object.assign(R,{onPlayerClickGasTether,onCancelGas,onPlayerLeaveGas});
})(globalThis.FA);
