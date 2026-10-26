// src/blocks/080-light.js — LIGHT
// Source lisible. Ce fichier est minifié + empaqueté par `npm run build:blocks`.
// NE PAS coller ce fichier directement dans un Code Block : utiliser code-blocks/pack-XX.js.

(FA=>{/* source : ce fichier est regroupé avec d'autres dans un pack par le build. */const C=FA.c,R=FA.r,F=C.fx,{api,damage,eff,entitiesIn,heal,hitArea,hitSeg,impulse,isAliveId,lifeforms,markUntil,pickTarget,posOf,safeHealth,safePosition,statLevel,unmark,strengthMult,claimSummon,freeSummon,chest,facing,heading,isPlayerAlive,safeEntityName,safeEntityType,targetBlock,boom,box,boxSpan,CAGE,circle,clamp,column,dist2,distH2,frame,GOLDEN,inBox,norm,point,ring,TAU,TEX,run,setInterval,setTimeout,sleep,blockAt,clearIf,freeSpot,isSolid,raycast,setBlock,stuck,knockBack}=C,mesh=F,sound=F,ct_mesh=F.create,ct_to=F.move,ct_off=F.remove,ct_tilt=F.rotate,ct_preset=F.playParticle,soundAt=F.at,tf_create=F.create,tf_move=F.move,tf_remove=F.remove,tf_turn=F.rotate;
/* Light — “Shot” */

const shot_DMG = 25, shot_SPEED = 1.8, LIFE = 14, shot_HIT_R = 1.4;

function puff(x, y, z) {
    point([x, y, z], {
        r: 0.12, tex: TEX.glint, count: 2,
        life: [0.1, 0.2], power: [0.05, 0.2], size: [0.25, 0.4],
        colors: [[[255, 255, 255], [255, 210, 100]]],
    });
}

function bang(x, y, z) {
    boom([x, y, z], 0.3, {
        count: 8, power: [0.6, 1.6], size: [0.18, 0.35],
        gravity: [0, -2, 0], dir: [0, 0.3, 0], dirSpread: 0.8,
        colors: [[[255, 180, 60], [255, 80, 20]]],
    });
}

function fire(playerId, itemName) {
    const p = posOf(playerId);
    const d = facing(playerId);
    if (!p) return;

    let x = p[0] + d[0] * 1.5, y = p[1] + 1.4, z = p[2] + d[2] * 1.5;
    const vx = d[0] * shot_SPEED, vy = d[1] * shot_SPEED, vz = d[2] * shot_SPEED;
    let left = LIFE, hit = false;

    puff(x, y, z);

    run({
        next: function () {
            if (hit || left-- <= 0) {
                if (!hit) bang(x, y, z);
                return { done: true };
            }
            x += vx; y += vy; z += vz;
            if ((left % 2) === 0) puff(x, y, z);

            try {
                const list = entitiesIn([x - shot_HIT_R, y - shot_HIT_R, z - shot_HIT_R], [x + shot_HIT_R, y + shot_HIT_R, z + shot_HIT_R]);
                for (let i = 0; i < list.length; i++) {
                    const id = list[i];
                    if (id === playerId) continue;
                    const q = safePosition(id);
                    if (!q) continue;
                    const dx = q[0] - x, dy = (q[1] + 0.9) - y, dz = q[2] - z;
                    if (dx * dx + dy * dy + dz * dz <= shot_HIT_R * shot_HIT_R) {
                        hit = true;
                        damage(id, shot_DMG, playerId, itemName);
                        bang(x, y, z);
                        return { done: true };
                    }
                }
            } catch (e) {}

            return { value: sleep(1), done: false };
        }
    });
}

function onPlayerClickFruit(playerId, itemName, wasAltClick) {
    if (wasAltClick) return false;
    try { fire(playerId, itemName); } catch (e) {}
    return true;
}

function onEntityCollisionFruit(eId, otherEId) { return false; }

function onPlayerLeaveFruit(playerId) {}


Object.assign(R,{onPlayerClickFruit,onEntityCollisionFruit,onPlayerLeaveFruit});
})(globalThis.FA);
