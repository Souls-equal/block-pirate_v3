// src/blocks/070-quakes.js — QUAKES
// Source lisible. Ce fichier est minifié + empaqueté par `npm run build:blocks`.
// NE PAS coller ce fichier directement dans un Code Block : utiliser code-blocks/pack-XX.js.

(FA=>{/* source : ce fichier est regroupé avec d'autres dans un pack par le build. */const C=FA.c,R=FA.r,F=C.fx,{api,damage,eff,entitiesIn,heal,hitArea,hitSeg,impulse,isAliveId,lifeforms,markUntil,pickTarget,posOf,safeHealth,safePosition,statLevel,unmark,strengthMult,claimSummon,freeSummon,chest,facing,heading,isPlayerAlive,safeEntityName,safeEntityType,targetBlock,boom,box,boxSpan,CAGE,circle,clamp,column,dist2,distH2,frame,GOLDEN,inBox,norm,point,ring,TAU,TEX,run,setInterval,setTimeout,sleep,blockAt,clearIf,freeSpot,isSolid,raycast,setBlock,stuck,knockBack}=C,mesh=F,sound=F,ct_mesh=F.create,ct_to=F.move,ct_off=F.remove,ct_tilt=F.rotate,ct_preset=F.playParticle,soundAt=F.at,tf_create=F.create,tf_move=F.move,tf_remove=F.remove,tf_turn=F.rotate;
const R_MAX = 9, R_MIN = 1.2, seismic_DUR = 900, HALF = 0.85;
const seismic_DMG0 = 32, DMG1 = 18, KB_H = 1.55, KB_V = 0.55;
const seismic_SLOW_MS = 700, seismic_SLOW_LV = 1, seismic_FRAME = 2, seismic_PTS = 28, seismic_HT = 3;

function stomp(c) {
    point([c[0], c[1] + 0.2, c[2]], {
        r: 0.7, tex: TEX.crit, count: 20,
        life: [0.15, 0.4], power: [1.2, 2.8], size: [0.2, 0.45],
        gravity: [0, -8, 0], dir: [0, 1.2, 0], dirSpread: 1.5,
        colors: [[[180, 120, 60], [120, 80, 40]], [[60, 40, 20, 0], [100, 70, 30, 0]]],
    });
}

function drawRing(c, radius, tLife) {
    const size = Math.max(0.18, 0.35 - tLife * 0.1);
    ring([c[0], c[1] + 0.15, c[2]], radius, seismic_PTS, {
        tex: TEX.square, r: 0.1,
        life: [0.2, 0.45], power: [0.25, 0.8], size: [size * 0.8, size * 1.15],
        gravity: [0, -6, 0], dirAt: function (a) { return [Math.cos(a) * 0.7, 0.85, Math.sin(a) * 0.7]; },
        colors: [[[140, 100, 55, 0.95], [90, 65, 35, 0.95]], [[50, 35, 20, 0], [80, 55, 30, 0]]],
    });

    ring([c[0], c[1] + 0.15, c[2]], radius, seismic_PTS / 2, {
        tex: TEX.glint, r: 0.07,
        life: [0.12, 0.3], power: [0.4, 1.1], size: [0.12, 0.26],
        gravity: [0, -4, 0], dirAt: function (a) { return [Math.cos(a) * 0.65, 1.15, Math.sin(a) * 0.65]; },
        colors: [[[255, 200, 90], [255, 120, 40]], [[120, 40, 10, 0], [80, 20, 5, 0]]],
    });
}

function hitRing(w, radius, seen) {
    const ids = lifeforms(w.caster);
    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        if (seen[id]) continue;
        const p = posOf(id);
        if (!p || Math.abs(p[1] - w.c[1]) > seismic_HT) continue;
        const dx = p[0] - w.c[0], dz = p[2] - w.c[2];
        const d = Math.sqrt(dx * dx + dz * dz);
        if (Math.abs(d - radius) > HALF) continue;

        seen[id] = 1;
        const ft = Math.max(0, Math.min(1, (d - R_MIN) / (R_MAX - R_MIN)));
        const dmg = Math.max(DMG1, Math.floor(seismic_DMG0 - (seismic_DMG0 - DMG1) * ft));
        damage(id, dmg, w.caster, w.item);
        eff(id, "Slowness", seismic_SLOW_MS, { inbuiltLevel: seismic_SLOW_LV });
        const dir = d < 0.15 ? [0, 0, 0.01] : [dx / d, 0, dz / d];
        impulse(id, dir[0] * KB_H * 1.5, KB_V * 1.5, dir[2] * KB_H * 1.5);
    }
}

function seismic_co(w) {
    const seen = {};
    const t0 = Date.now();
    return {
        next: function () {
            let t = (Date.now() - t0) / seismic_DUR;
            if (t < 0) t = 0;
            if (t >= 1) {
                try { drawRing(w.c, R_MAX, 1); hitRing(w, R_MAX, seen); } catch (e) {}
                return { done: true };
            }
            const r = R_MIN + (R_MAX - R_MIN) * t;
            try { drawRing(w.c, r, t); hitRing(w, r, seen); } catch (e) {}
            return { value: sleep(seismic_FRAME), done: false };
        }
    };
}

function onPlayerClickSeismic(playerId, itemName) {
    const p = posOf(playerId);
    if (!p) return true;

    sound.at(playerId, "cannonFire3", 0.9, 0.5, 24);
    stomp(p);
    drawRing(p, R_MIN, 0);
    run(seismic_co({ caster: playerId, item: itemName, c: [p[0], p[1], p[2]] }));
    return true;
}

function onPlayerLeaveSeismic(playerId) {}


Object.assign(R,{onPlayerClickSeismic,onPlayerLeaveSeismic});
})(globalThis.FA);
