// src/blocks/170-ghost.js — GHOST
// Source lisible. Ce fichier est minifié + empaqueté par `npm run build:blocks`.
// NE PAS coller ce fichier directement dans un Code Block : utiliser code-blocks/pack-XX.js.

(FA=>{/* source : ce fichier est regroupé avec d'autres dans un pack par le build. */const C=FA.c,R=FA.r,F=C.fx,{api,damage,eff,entitiesIn,heal,hitArea,hitSeg,impulse,isAliveId,lifeforms,markUntil,pickTarget,posOf,safeHealth,safePosition,statLevel,unmark,strengthMult,claimSummon,freeSummon,chest,facing,heading,isPlayerAlive,safeEntityName,safeEntityType,targetBlock,boom,box,boxSpan,CAGE,circle,clamp,column,dist2,distH2,frame,GOLDEN,inBox,norm,point,ring,TAU,TEX,run,setInterval,setTimeout,sleep,blockAt,clearIf,freeSpot,isSolid,raycast,setBlock,stuck,knockBack}=C,mesh=F,sound=F,ct_mesh=F.create,ct_to=F.move,ct_off=F.remove,ct_tilt=F.rotate,ct_preset=F.playParticle,soundAt=F.at,tf_create=F.create,tf_move=F.move,tf_remove=F.remove,tf_turn=F.rotate;
/* BOUCLIER D'IMMUNITÉ */
const GUARD_TICK = 3;
const guard = {};

function isImmuneToDamage(pid) {
    const g = pid ? guard[pid] : null;
    if (!g) return false;
    if (Date.now() >= g.until) { delete guard[pid]; return false; }
    return true;
}

function guardFrames(ms) { return Math.ceil(ms / (50 * GUARD_TICK)); }

function shield(pid, ms) {
    const until = Date.now() + ms;
    const g = guard[pid];
    if (g) {
        g.until = until;
        g.left = Math.max(g.left || 0, guardFrames(ms));
        return g;
    }
    const ng = guard[pid] = { pid: pid, until: until, left: guardFrames(ms) + 2, hp: safeHealth(pid) || 0 };

    run({
        next: function () {
            if (guard[pid] !== ng) return { done: true };
            ng.left -= 1;
            if (Date.now() >= ng.until || ng.left <= 0 || !isAliveId(pid)) {
                delete guard[pid];
                return { done: true };
            }
            const hp = safeHealth(pid);
            if (hp === null) { delete guard[pid]; return { done: true }; }
            if (hp > ng.hp) ng.hp = hp;
            else if (hp < ng.hp) heal(pid, ng.hp - hp);
            return { value: sleep(GUARD_TICK), done: false };
        }
    });
    return ng;
}

function unshield(pid) { delete guard[pid]; }


/* PHASING */
const PH_MS = 5000, PH_SIDE = 2, PH_UP = 2, PH_SEE = 0.35;
const PH_SEARCH = 9, PH_R = 3, PH_WALK = 1, PH_UNSET = 2, PH_SLO = 6;
const phases = {};

function rectOf(p, floorY) {
    const x = Math.floor(p[0]), z = Math.floor(p[2]);
    const y = Math.max(Math.floor(p[1]), floorY);
    return [[x - PH_SIDE, y, z - PH_SIDE], [x + PH_SIDE, y + PH_UP, z + PH_SIDE]];
}

function applyRect(pid, st) {
    const p = posOf(pid);
    if (!p) return;
    const r = rectOf(p, st.floor);
    const key = r[0].join(",") + "|" + r[1].join(",");
    if (st.key === key) return;
    if (st.prev) { try { api.setWalkThroughRect(pid, st.prev[0], st.prev[1], PH_UNSET); } catch (e) {} }
    try { api.setWalkThroughRect(pid, r[0], r[1], PH_WALK); } catch (e2) {}
    st.key = key; st.prev = r;
}

function ghost_wisp(pid, t, col) {
    const p = posOf(pid);
    if (!p) return;
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + t * 0.4;
        point([p[0] + Math.cos(a) * 0.95, p[1] + 0.35 + (i % 3) * 0.65, p[2] + Math.sin(a) * 0.95], {
            r: 0.2, tex: TEX.soul,
            life: [0.45, 0.9], power: [0.1, 0.4], size: [0.45, 0.9],
            gravity: [0, 1.5, 0], dir: [0, 0.9, 0], dirSpread: 0.2,
            colors: [[col || [200, 255, 225, 0.9], [255, 255, 255, 0.6]]],
        });
    }
}

function unstick(pid) {
    const p = posOf(pid);
    if (!p || !stuck(p)) return false;
    const s = freeSpot(p, PH_SEARCH, PH_R);
    if (!s) return false;
    try { api.setPosition(pid, s[0], s[1], s[2]); } catch (e) { return false; }
    try { api.setVelocity(pid, 0, 0, 0); } catch (e2) {}
    sound.at(pid, "cannonFire3", 0.35, 1.7, 12);
    try { boom([p[0], p[1] + 0.9, p[2]], 1.2, { count: 26, colors: [[[210, 255, 235, 0.85], [255, 255, 255]], [[120, 200, 170, 0], [210, 255, 235, 0]]] }); } catch (e3) {}
    return true;
}

function scheduleUnstick(pid) {
    setTimeout(function () {
        if (!isAliveId(pid)) return;
        if (unstick(pid)) return;
        setTimeout(function () { if (isAliveId(pid)) unstick(pid); }, 8);
    }, 4);
}

function endPhase(pid, st) {
    st = st || phases[pid];
    if (!st) return false;
    if (st.prev) { try { api.setWalkThroughRect(pid, st.prev[0], st.prev[1], PH_UNSET); } catch (e) {} }
    try { api.setPlayerOpacity(pid, 1); } catch (e2) {}
    if (phases[pid] === st) delete phases[pid];
    if (!st.unstuck) { st.unstuck = 1; scheduleUnstick(pid); }
    return true;
}

function phaseCo(st) {
    return {
        next: function () {
            if (phases[st.pid] !== st) return { done: true };
            if (Date.now() >= st.end || !isAliveId(st.pid)) { endPhase(st.pid, st); return { done: true }; }
            st.t++;
            try {
                applyRect(st.pid, st);
                ghost_wisp(st.pid, st.t, [190, 255, 230, 0.9]);
            } catch (e) {}
            return { value: sleep(2), done: false };
        }
    };
}


/* SPECTRAL PRISON (100% particules, sans mesh) */
const PR_MS = 7000, PR_R = 8, PR_MAX = 4, PR_DMG = 3, PR_PULSE = 1000, PR_SELF = 3000;
const PR_SPD = 3, PR_REG = 2;
const prisons = {};

function unroot(tid) {
    if (isPlayerAlive(tid)) { try { api.setClientOption(tid, "speedMultiplier", 1); } catch (e) {} }
}

function prisonOff(pid, st) {
    st = st || prisons[pid];
    if (!st) return false;
    for (let i = 0; i < st.caged.length; i++) {
        unroot(st.caged[i].id);
    }
    if (st.h) { try { st.h.stop(); } catch (e2) {} }
    if (prisons[pid] === st) delete prisons[pid];
    return true;
}

function cageFor(pid, tid) {
    if (isPlayerAlive(tid)) { try { api.setClientOption(tid, "speedMultiplier", 0); } catch (e) {} }
    eff(tid, "Slowness", PR_MS, { inbuiltLevel: 6 });
    return { id: tid };
}

function drawSpectralCage(tp, tStep) {
    for (let j = 0; j < CAGE.length; j++) {
        const o = CAGE[j];
        const bob = Math.sin(tStep * 0.4 + j) * 0.14;
        point([tp[0] + o[0], tp[1] + 0.9 + o[1] * 0.85 + bob, tp[2] + o[2]], {
            r: 0.16, tex: TEX.square, count: 3,
            life: [0.16, 0.34], power: [0.08, 0.3], size: [0.36, 0.65],
            colors: [[[190, 245, 255, 0.95], [255, 255, 255, 0.85]], [[110, 210, 235, 0], [190, 245, 255, 0]]],
        });
    }
    if (tStep % 2 === 0) {
        ring([tp[0], tp[1] + 0.3, tp[2]], 1.25, 8, {
            tex: TEX.soul, life: [0.22, 0.42], size: [0.32, 0.56], power: [0.1, 0.35],
            colors: [[[180, 255, 235, 0.9], [255, 255, 255, 0.8]], [[100, 200, 220, 0], [180, 255, 235, 0]]],
        }, tStep * 0.3);
    }
}

function prisonTargets(pid) {
    const p = posOf(pid);
    const out = [];
    if (!p) return out;
    const ids = lifeforms(pid);
    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        if (!isAliveId(id)) continue;
        const q = posOf(id);
        if (!q) continue;
        const d2 = dist2(q, p);
        if (d2 <= PR_R * PR_R) out.push({ id: id, d2: d2 });
    }
    out.sort(function (a, b) { return a.d2 - b.d2; });
    if (out.length > PR_MAX) out.length = PR_MAX;
    return out;
}

function prisonCo(st) {
    return {
        next: function () {
            if (prisons[st.pid] !== st) return { done: true };
            if (Date.now() >= st.end || !isAliveId(st.pid)) { prisonOff(st.pid, st); return { done: true }; }
            st.t++;

            const gone = [];
            for (let i = 0; i < st.caged.length; i++) {
                const t = st.caged[i];
                const tp = isAliveId(t.id) ? posOf(t.id) : null;
                if (!tp) { gone.push(i); continue; }

                if (!isPlayerAlive(t.id)) { try { api.setVelocity(t.id, 0, 0, 0); } catch (e1) {} }
                drawSpectralCage(tp, st.t + i);
                ghost_wisp(t.id, st.t + i, [200, 240, 255, 0.8]);
            }

            for (let i = gone.length - 1; i >= 0; i--) {
                const c = st.caged[gone[i]];
                unroot(c.id);
                st.caged.splice(gone[i], 1);
            }

            if (!st.caged.length) { prisonOff(st.pid, st); return { done: true }; }
            return { value: sleep(2), done: false };
        }
    };
}

function onPlayerClickGhostPhase(pid) {
    const p = posOf(pid);
    if (!p || !isAliveId(pid)) return false;
    if (phases[pid]) return true;

    const st = { pid: pid, end: Date.now() + PH_MS, key: null, prev: null, t: 0, floor: Math.floor(p[1]), unstuck: 0 };
    phases[pid] = st;
    applyRect(pid, st);
    try { api.setPlayerOpacity(pid, PH_SEE); } catch (e) {}
    try { eff(pid, "Weakness", PH_MS + 300, { inbuiltLevel: PH_SLO }); } catch (e2) {}
    shield(pid, PH_MS + 300);
    sound.at(pid, "cannonFire3", 0.4, 0.7, 14);
    run(phaseCo(st));
    setTimeout(function () { if (phases[pid] === st) endPhase(pid, st); }, Math.ceil(PH_MS / 50) + 6);
    return true;
}

function onPlayerClickSpectralPrison(pid, itemName) {
    const p = posOf(pid);
    if (!p || !isAliveId(pid)) return false;
    if (prisons[pid]) return true;

    const found = prisonTargets(pid);
    if (!found.length) {
        try { api.sendMessage(pid, [{ str: "Nothing close enough to trap.", style: { color: "#BFF6FF" } }]); }
        catch (e) {}
        return false;
    }

    const st = { pid: pid, item: itemName, end: Date.now() + PR_MS, t: 0, caged: [] };
    for (let i = 0; i < found.length; i++) st.caged.push(cageFor(pid, found[i].id));
    prisons[pid] = st;

    st.h = setInterval(function () {
        if (prisons[pid] !== st || Date.now() >= st.end) { try { st.h.stop(); } catch (e0) {} return; }
        for (let j = 0; j < st.caged.length; j++) damage(st.caged[j].id, PR_DMG, pid, itemName);
    }, Math.ceil(PR_PULSE / 50));

    try { eff(pid, "Speed", PR_SELF, { inbuiltLevel: PR_SPD }); } catch (e2) {}
    try { eff(pid, "Health Regen", PR_SELF, { inbuiltLevel: PR_REG }); } catch (e3) {}
    shield(pid, PR_SELF);
    sound.at(pid, "cannonFire3", 0.55, 1.25, 18);
    boom([p[0], p[1] + 0.9, p[2]], 2.4, { count: 70, colors: [[[190, 240, 255], [255, 255, 255]], [[120, 180, 220, 0], [190, 240, 255, 0]]] });
    run(prisonCo(st));
    setTimeout(function () { if (prisons[pid] === st) prisonOff(pid, st); }, Math.ceil(PR_MS / 50) + 6);
    return true;
}

function onCancelGhost(pid) {
    endPhase(pid);
    prisonOff(pid);
    unshield(pid);
}

function onPlayerLeaveGhost(pid) { onCancelGhost(pid); }


Object.assign(R,{isImmuneToDamage,onPlayerClickGhostPhase,onPlayerClickSpectralPrison,onCancelGhost,onPlayerLeaveGhost});
})(globalThis.FA);
