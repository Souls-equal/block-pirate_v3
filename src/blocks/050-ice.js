// src/blocks/050-ice.js — ICE
// Source lisible. Ce fichier est minifié + empaqueté par `npm run build:blocks`.
// NE PAS coller ce fichier directement dans un Code Block : utiliser code-blocks/pack-XX.js.

(FA=>{/* source : ce fichier est regroupé avec d'autres dans un pack par le build. */const C=FA.c,R=FA.r,F=C.fx,{api,damage,eff,entitiesIn,heal,hitArea,hitSeg,impulse,isAliveId,lifeforms,markUntil,pickTarget,posOf,safeHealth,safePosition,statLevel,unmark,strengthMult,claimSummon,freeSummon,chest,facing,heading,isPlayerAlive,safeEntityName,safeEntityType,targetBlock,boom,box,boxSpan,CAGE,circle,clamp,column,dist2,distH2,frame,GOLDEN,inBox,norm,point,ring,TAU,TEX,run,setInterval,setTimeout,sleep,blockAt,clearIf,freeSpot,isSolid,raycast,setBlock,stuck,knockBack}=C,mesh=F,sound=F,ct_mesh=F.create,ct_to=F.move,ct_off=F.remove,ct_tilt=F.rotate,ct_preset=F.playParticle,soundAt=F.at,tf_create=F.create,tf_move=F.move,tf_remove=F.remove,tf_turn=F.rotate;
/* Ice — “Geyser Burst” */

const geyser_R = 3.2, geyser_HT = 3, geyser_DMG = 18, IMP_Y = 14, geyser_SLOW_MS = 900, geyser_SLOW_LV = 1;
const geyser_FWD = 4, COL_H = 6, geyser_FRAME = 2, TICKS = 8;

function geyserPos(pid) {
    const t = targetBlock(pid);
    if (t) return t;
    const p = posOf(pid);
    if (!p) return null;
    const f = norm([facing(pid)[0], 0, facing(pid)[2]]);
    return [p[0] + f[0] * geyser_FWD, p[1], p[2] + f[2] * geyser_FWD];
}

function columnFx(c, hFrac) {
    column(c, COL_H * hFrac, {
        tex: TEX.glint, r: 0.2,
        life: [0.2, 0.45], power: [0.5, 1.4], gravity: [0, 2, 0],
        dir: [0, 2.75, 0], dirSpread: 0.25,
        sizeAt: function (t) { const s = 0.45 - t * 0.2; return [s * 0.7, s]; },
        colors: [[[120, 230, 255], [200, 255, 255]], [[40, 120, 200, 0], [100, 200, 255, 0]]],
    });

    point([c[0], c[1] + COL_H * hFrac, c[2]], {
        r: 0.6, tex: TEX.bubble, count: 14,
        life: [0.3, 0.7], power: [0.8, 2], size: [0.2, 0.45],
        gravity: [0, -6, 0], dir: [0, 0.85, 0], dirSpread: 1.2,
        colors: [[[180, 240, 255], [255, 255, 255]], [[40, 100, 180, 0], [100, 180, 220, 0]]],
    });
}

function geyser_blast(caster, c, item) {
    hitArea(c, geyser_R, caster, item, geyser_DMG, {
        height: geyser_HT,
        slow: [geyser_SLOW_MS, geyser_SLOW_LV],
        onHit: function (id) { impulse(id, 0, IMP_Y, 0); },
    });
}

function onPlayerClickGeyser(playerId, itemName) {
    const g = geyserPos(playerId);
    if (!g) return true;

    sound.at(g, "cannonFire3", 0.75, 1.25, 20);

    point([g[0], g[1] + 0.2, g[2]], {
        r: geyser_R * 0.5, tex: TEX.glint, count: 18,
        life: [0.2, 0.45], power: [0.6, 1.6], size: [0.2, 0.4],
        gravity: [0, -2, 0], dir: [0, 1.25, 0], dirSpread: 0.8,
        colors: [[[100, 200, 255], [220, 250, 255]], [[40, 100, 180, 0], [120, 180, 220, 0]]],
    });
    try { geyser_blast(playerId, g, itemName); } catch (e) {}

    let step = 0;
    run({
        next: function () {
            step++;
            try { columnFx(g, Math.min(1, step / TICKS)); } catch (e) {}
            return step >= TICKS ? { done: true } : { value: sleep(geyser_FRAME), done: false };
        }
    });
    return true;
}


Object.assign(R,{onPlayerClickGeyser});
})(globalThis.FA);
