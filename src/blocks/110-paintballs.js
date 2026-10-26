// src/blocks/110-paintballs.js — PAINTBALLS
// Source lisible. Ce fichier est minifié + empaqueté par `npm run build:blocks`.
// NE PAS coller ce fichier directement dans un Code Block : utiliser code-blocks/pack-XX.js.

(FA=>{/* source : ce fichier est regroupé avec d'autres dans un pack par le build. */const C=FA.c,R=FA.r,F=C.fx,{api,damage,eff,entitiesIn,heal,hitArea,hitSeg,impulse,isAliveId,lifeforms,markUntil,pickTarget,posOf,safeHealth,safePosition,statLevel,unmark,strengthMult,claimSummon,freeSummon,chest,facing,heading,isPlayerAlive,safeEntityName,safeEntityType,targetBlock,boom,box,boxSpan,CAGE,circle,clamp,column,dist2,distH2,frame,GOLDEN,inBox,norm,point,ring,TAU,TEX,run,setInterval,setTimeout,sleep,blockAt,clearIf,freeSpot,isSolid,raycast,setBlock,stuck,knockBack}=C,mesh=F,sound=F,ct_mesh=F.create,ct_to=F.move,ct_off=F.remove,ct_tilt=F.rotate,ct_preset=F.playParticle,soundAt=F.at,tf_create=F.create,tf_move=F.move,tf_remove=F.remove,tf_turn=F.rotate;
/* QUI A LANCÉ TEL PAINTBALL */
const THROW_TTL = 15000;
const throwers = {}, lastThrow = {};
const lastHit = {};

const IMPACT_DMG = 22, IMPACT_R = 2.2, IMPACT_CD = 700;

function isPaintball(name) { return !!name && name.indexOf("Paintball Explosive") !== -1; }

function paintNameOf(eId) {
    let n = null;
    try { n = api.getItemDropName(eId); } catch (e) { n = null; }
    if (n) return n;
    return safeEntityName(eId);
}

function setThrower(eId, playerId, itemName) {
    if (!eId || !isPaintball(itemName || paintNameOf(eId))) return;
    const now = Date.now();
    for (const k in throwers) if (throwers[k].t + THROW_TTL < now) delete throwers[k];
    throwers[eId] = { p: playerId, t: now };
    const key = (itemName || paintNameOf(eId) || "Paintball Explosive Item").replace(" Explosive Item", "");
    lastThrow[key] = { p: playerId, t: now };
}

function getThrower(eId, name) {
    const now = Date.now();
    const e = throwers[eId];
    if (e) {
        if (e.t + THROW_TTL >= now) return e.p;
        delete throwers[eId];
    }
    const key = (name || paintNameOf(eId) || "Paintball Explosive Item").replace(" Explosive Item", "");
    const l = lastThrow[key];
    if (l && l.t + THROW_TTL >= now) return l.p;
    return null;
}

function paint_impact(x, y, z, caster, itemName) {
    sound.at([x, y, z], "cannonFire3", 0.75, 1.2, 22);
    boom([x, y, z], IMPACT_R, { count: 30, colors: [[[255, 170, 40], [255, 255, 255]], [[180, 90, 20, 0], [255, 170, 40, 0]]] });
    if (!caster) return;
    hitArea([x, y, z], IMPACT_R, caster, itemName, IMPACT_DMG, {});
}


function onPlayerUsedThrowablePaint(playerId, throwableName, thrownEId) {
    setThrower(thrownEId, playerId, throwableName);
}

function onPlayerThrowableHitTerrainPaint(playerId, throwableName, thrownEId) {
    setThrower(thrownEId, playerId, throwableName);
}

function onEntityCollisionPaint(eId, otherEId) {
    let name = paintNameOf(eId);
    if (!isPaintball(name)) {
        name = paintNameOf(otherEId);
        if (!isPaintball(name)) return false;
        const swap = eId; eId = otherEId; otherEId = swap;
    }
    const p = posOf(eId);
    if (!p) return false;
    if (!isAliveId(otherEId)) return true;

    const now = Date.now();
    if ((lastHit[otherEId] || 0) > now) return true;
    lastHit[otherEId] = now + IMPACT_CD;

    paint_impact(p[0], p[1], p[2], getThrower(eId, name), name);
    return true;
}



/* oublie les traces d'un joueur qui part (appele par le bloc Blade) */
R.paintForget = function (pid) { delete throwers[pid]; delete lastHit[pid]; };

Object.assign(R,{onPlayerUsedThrowablePaint,onPlayerThrowableHitTerrainPaint,onEntityCollisionPaint});
})(globalThis.FA);
