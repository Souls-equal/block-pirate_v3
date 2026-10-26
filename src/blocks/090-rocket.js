// src/blocks/090-rocket.js — ROCKET
// Source lisible. Ce fichier est minifié + empaqueté par `npm run build:blocks`.
// NE PAS coller ce fichier directement dans un Code Block : utiliser code-blocks/pack-XX.js.

(FA=>{/* source : ce fichier est regroupé avec d'autres dans un pack par le build. */const C=FA.c,R=FA.r,F=C.fx,{api,damage,eff,entitiesIn,heal,hitArea,hitSeg,impulse,isAliveId,lifeforms,markUntil,pickTarget,posOf,safeHealth,safePosition,statLevel,unmark,strengthMult,claimSummon,freeSummon,chest,facing,heading,isPlayerAlive,safeEntityName,safeEntityType,targetBlock,boom,box,boxSpan,CAGE,circle,clamp,column,dist2,distH2,frame,GOLDEN,inBox,norm,point,ring,TAU,TEX,run,setInterval,setTimeout,sleep,blockAt,clearIf,freeSpot,isSolid,raycast,setBlock,stuck,knockBack}=C,mesh=F,sound=F,ct_mesh=F.create,ct_to=F.move,ct_off=F.remove,ct_tilt=F.rotate,ct_preset=F.playParticle,soundAt=F.at,tf_create=F.create,tf_move=F.move,tf_remove=F.remove,tf_turn=F.rotate;
/* Rocket — “Rocket Launch” */

const IMP = 15, SMOKE_DUR = 28, SMOKE_STEP = 2, SMOKE_Y = -0.15;

function smokeRing(cx, cy, cz, r, n) {
    ring([cx, cy, cz], r, n, {
        tex: TEX.glint, r: 0.08,
        life: [0.5, 1], power: [0.15, 0.45], size: [0.3, 0.48],
        gravity: [0, -1.2, 0], dir: [0, -0.85, 0], dirSpread: 0.25,
        colors: [[[120, 120, 125, 0.8], [70, 70, 75, 0.85]], [[40, 40, 45, 0], [90, 90, 95, 0]]],
    });
}

function ignite(cx, cy, cz) {
    smokeRing(cx, cy, cz, 0.55, 10);
    point([cx, cy, cz], {
        r: 0.25, tex: TEX.effect, count: 18,
        life: [0.25, 0.55], power: [1.2, 2.4], size: [0.22, 0.4],
        gravity: [0, -6, 0], dir: [0, -2.35, 0], dirSpread: 0.4,
        colors: [[[255, 220, 80], [255, 120, 30]], [[180, 40, 10, 0], [80, 20, 10, 0]]],
    });
}

function smoke(cx, cy, cz) {
    point([cx, cy, cz], {
        r: 0.2, tex: TEX.square, count: 6,
        life: [0.45, 0.9], power: [0.4, 1.1], size: [0.28, 0.5],
        gravity: [0, -1.5, 0], drag: 0.4, dir: [0, -1.4, 0], dirSpread: 0.35,
        colors: [[[90, 90, 95, 0.85], [160, 160, 165, 0.9]], [[50, 50, 55, 0], [110, 110, 115, 0]]],
    });
    smokeRing(cx, cy - 0.05, cz, 0.35, 5);
}

function flame(cx, cy, cz) {
    point([cx, cy, cz], {
        r: 0.12, tex: TEX.glint, count: 5,
        life: [0.15, 0.35], power: [0.8, 1.6], size: [0.12, 0.26],
        gravity: [0, -4, 0], dir: [0, -1.9, 0], dirSpread: 0.2,
        colors: [[[255, 240, 120], [255, 140, 40]], [[40, 20, 20, 0], [80, 30, 10, 0]]],
    });
}

function rocket_co(tid) {
    let left = SMOKE_DUR, first = true;
    return {
        next: function () {
            const p = posOf(tid);
            if (!p) return { done: true };
            const x = p[0], y = p[1] + SMOKE_Y, z = p[2];
            smoke(x, y, z);
            if (first || left % 4 === 0) flame(x, y, z);
            first = false;
            left -= SMOKE_STEP;
            return left <= 0 ? { done: true } : { value: sleep(SMOKE_STEP), done: false };
        }
    };
}

function onPlayerClickRocket(playerId, itemName, alt, x, y, z, block, target) {
    if (!target) {
        sound.at(playerId, "cannonFire2", 0.75, 1.15, 22);
        return true;
    }
    sound.at(target, "cannonFire2", 0.85, 0.95, 24);
    impulse(target, 0, IMP, 0);
    const p = posOf(target);
    if (p) ignite(p[0], p[1] + SMOKE_Y, p[2]);
    run(rocket_co(target));
    return true;
}


/* Rocket — “Jump Beacon” */

const PAD = "Super Jump Pad", PAD_LIFE = 40;
const BEAM_H = 8, BEAM_SP = 0.45, BEAM_PULSES = 5, BEAM_TICK = 8;

function beam(cx, baseY, cz) {
    column([cx, baseY, cz], BEAM_H, {
        r: 0.06, tex: TEX.glint, count: 2, steps: Math.floor(BEAM_H / BEAM_SP),
        life: [0.35, 0.7], power: [0.05, 0.25], gravity: [0, 0.8, 0],
        dir: [0, 0.8, 0], dirSpread: 0.05,
        sizeAt: function (t) { const s = 0.28 - t * 0.12; return [s * 0.85, s]; },
        colors: [[[160, 160, 170, 1], [255, 255, 255, 1]], [[160, 160, 170, 0], [220, 220, 255, 0]]],
    });

    point([cx, baseY + BEAM_H, cz], {
        r: 0.15, tex: TEX.effect, count: 6,
        life: [0.3, 0.6], power: [0.2, 0.6], size: [0.15, 0.28],
        gravity: [0, 1.5, 0], dir: [0, 0.6, 0], dirSpread: 0.2,
        colors: [[[200, 210, 255], [255, 255, 255]], [[120, 140, 220, 0], [200, 200, 255, 0]]],
    });
}

function padBurst(cx, cy, cz) {
    point([cx, cy + 0.2, cz], {
        r: 0.45, tex: TEX.glint, count: 14,
        life: [0.3, 0.65], power: [0.5, 1.4], size: [0.18, 0.35],
        gravity: [0, -2, 0], dir: [0, 1.25, 0], dirSpread: 0.6,
        colors: [[[140, 140, 150], [230, 230, 240]], [[80, 80, 90, 0], [160, 160, 170, 0]]],
    });
}

function beamCo(cx, cy, cz) {
    let left = BEAM_PULSES - 1;
    return {
        next: function () {
            if (left <= 0) return { done: true };
            beam(cx, cy, cz);
            left--;
            return left <= 0 ? { done: true } : { value: sleep(BEAM_TICK), done: false };
        }
    };
}

function onPlayerClickJumpBeacon(playerId, itemName) {

    let info = null;
    try { info = api.getPlayerTargetBlock(playerId); } catch (e) { info = null; }
    if (!info || !info.adjacent) {
        try { info = api.getPlayerTargetInfo(playerId); } catch (e2) { info = null; }
    }
    if (!info || !info.adjacent) return true;

    const px = info.adjacent[0], py = info.adjacent[1], pz = info.adjacent[2];
    if (blockAt(px, py, pz) !== "Air") return true;

    setBlock(px, py, pz, PAD);
    const cx = px + 0.5, cy = py + 1.05, cz = pz + 0.5;
    sound.at([cx, cy, cz], "futureStrangePulse", 0.8, 1.25, 22);
    padBurst(cx, py + 0.2, cz);
    beam(cx, cy, cz);
    run(beamCo(cx, cy, cz));

    setTimeout(function () {
        if (!clearIf(px, py, pz, PAD, "Air")) return;
        point([cx, py + 0.5, cz], {
            r: 0.35, tex: TEX.square, count: 10,
            life: [0.25, 0.5], power: [0.3, 0.9], size: [0.15, 0.3],
            gravity: [0, 1, 0], dir: [0, 0.7, 0], dirSpread: 0.3,
            colors: [[[100, 100, 110, 0.8], [180, 180, 190, 0.9]], [[60, 60, 70, 0], [120, 120, 130, 0]]],
        });
    }, PAD_LIFE);

    return true;
}


Object.assign(R,{onPlayerClickRocket,onPlayerClickJumpBeacon});
})(globalThis.FA);
