/* ============================================================
   DIAMOND (Crystal Recovery)
   1 fruit = 1 Code Block. Ne PAS modifier la 1re et la derniere ligne.
   ============================================================ */
(FA=>{/* Code Block fruits — colle ce fichier TEL QUEL dans UN Code Block du monde. */const C=FA.c,R=FA.r,F=C.fx,{api,damage,eff,entitiesIn,heal,hitArea,hitSeg,impulse,isAliveId,lifeforms,markUntil,pickTarget,posOf,safeHealth,safePosition,statLevel,unmark,strengthMult,claimSummon,freeSummon,chest,facing,heading,isPlayerAlive,safeEntityName,safeEntityType,targetBlock,boom,box,boxSpan,CAGE,circle,clamp,column,dist2,distH2,frame,GOLDEN,inBox,norm,point,ring,TAU,TEX,run,setInterval,setTimeout,sleep,blockAt,clearIf,freeSpot,isSolid,raycast,setBlock,stuck,knockBack}=C,mesh=F,sound=F,ct_mesh=F.create,ct_to=F.move,ct_off=F.remove,ct_tilt=F.rotate,ct_preset=F.playParticle,soundAt=F.at,tf_create=F.create,tf_move=F.move,tf_remove=F.remove,tf_turn=F.rotate;
const diamond_TICK = 4, RATE = 6, MAXT = 80;
const diamond_SLO = 3, diamond_PTS = 10, RAD = 2.1, SIZE = 1.15, FULL = 100;
const rec = {};

function maxHp(id) {
    let m = 0;
    try { if (api.getMaxHealth) m = api.getMaxHealth(id); } catch (e) { m = 0; }
    if (!(m > 0)) {
        try { m = api.getClientOption("maxHealth"); } catch (e2) { m = 0; }
    }
    return (typeof m === "number" && m >= 20) ? m : FULL;
}

function diamond_fx(x, y, z, t, done) {
    const r = RAD + Math.sin(t * 0.55) * 0.35;
    for (let i = 0; i < diamond_PTS; i++) {
        const a = (i / diamond_PTS) * Math.PI * 2 + t * 0.25;
        point([x + Math.cos(a) * r, y + (i % 3) * 0.75, z + Math.sin(a) * r], {
            r: 0.3, tex: TEX.square,
            life: [0.5, 0.95], power: [0.15, 0.5], size: [SIZE, SIZE * 1.55],
            gravity: [0, 1.1, 0], dir: [0, 0.7, 0], dirSpread: 0.25,
            colors: [[[150, 240, 255], [255, 255, 255]], [[90, 200, 235, 0], [200, 245, 255, 0]]],
        });
    }
    point([x, y + 0.65, z], {
        r: 0.7, tex: TEX.bubble, count: 2,
        life: [0.6, 1.1], power: [0.2, 0.6], size: [0.55, 1.1],
        gravity: [0, 1.6, 0], dir: [0, 1.4, 0], dirSpread: 0.1,
        colors: [[[220, 255, 255, 0.9], [255, 255, 255, 0.5]]],
    });

    if (done) {
        boom([x, y + 0.9, z], 2, { count: 60, colors: [[[170, 245, 255], [255, 255, 255]], [[120, 200, 240, 0], [200, 245, 255, 0]]] });
        sound.at([x, y, z], "cannonFire3", 0.5, 2, 16);
    }
}

function diamond_stop(pid, done) {
    const st = rec[pid];
    if (!st) return;
    try { if (api.removeEffect) api.removeEffect(pid, "Slowness"); } catch (e) {}
    const p = posOf(pid);
    if (done && p) diamond_fx(p[0], p[1], p[2], st.t, true);
    delete rec[pid];
}

function diamond_co(st) {
    return {
        next: function () {
            if (rec[st.pid] !== st) return { done: true };
            const p = posOf(st.pid);
            if (!p || !isAliveId(st.pid)) { diamond_stop(st.pid, false); return { done: true }; }

            st.t++;
            const hp = safeHealth(st.pid);
            if (hp === null) { diamond_stop(st.pid, false); return { done: true }; }
            if (hp >= st.cap || st.t >= MAXT) { diamond_stop(st.pid, hp >= st.cap); return { done: true }; }

            try {
                diamond_fx(p[0], p[1], p[2], st.t, false);
                heal(st.pid, Math.min(RATE, st.cap - hp));
            } catch (e) {}
            return { value: sleep(diamond_TICK), done: false };
        }
    };
}

function onPlayerClickDiamondRecovery(pid) {
    if (rec[pid]) return true;
    const p = posOf(pid);
    if (!p || !isAliveId(pid)) return false;

    const cap = maxHp(pid);
    const hp = safeHealth(pid);
    if (hp === null || hp >= cap) {
        try { api.sendMessage(pid, [{ str: "Nothing to recover — you are already at full health.", style: { color: "#8FE9FF" } }]); }
        catch (e) {}
        return false;
    }

    const st = { pid: pid, cap: cap, t: 0 };
    rec[pid] = st;

    try { eff(pid, "Slowness", MAXT * diamond_TICK * 50 + 600, { inbuiltLevel: diamond_SLO }); } catch (e) {}
    diamond_fx(p[0], p[1], p[2], 0, false);
    sound.at(pid, "cannonFire3", 0.45, 1.15, 16);
    run(diamond_co(st));
    setTimeout(function () { if (rec[pid] === st) diamond_stop(pid, (safeHealth(pid) || 0) >= cap); }, MAXT * diamond_TICK + 20);
    return true;
}

function onPlayerLeaveDiamond(pid) { diamond_stop(pid, false); }


Object.assign(R,{onPlayerClickDiamondRecovery,onPlayerLeaveDiamond});
})(globalThis.FA);
