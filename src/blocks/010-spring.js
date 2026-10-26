// src/blocks/010-spring.js — SPRING
// Source lisible. Ce fichier est minifié + empaqueté par `npm run build:blocks`.
// NE PAS coller ce fichier directement dans un Code Block : utiliser code-blocks/pack-XX.js.

(FA=>{/* source : ce fichier est regroupé avec d'autres dans un pack par le build. */const C=FA.c,R=FA.r,F=C.fx,{api,damage,eff,entitiesIn,heal,hitArea,hitSeg,impulse,isAliveId,lifeforms,markUntil,pickTarget,posOf,safeHealth,safePosition,statLevel,unmark,strengthMult,claimSummon,freeSummon,chest,facing,heading,isPlayerAlive,safeEntityName,safeEntityType,targetBlock,boom,box,boxSpan,CAGE,circle,clamp,column,dist2,distH2,frame,GOLDEN,inBox,norm,point,ring,TAU,TEX,run,setInterval,setTimeout,sleep,blockAt,clearIf,freeSpot,isSolid,raycast,setBlock,stuck,knockBack}=C,mesh=F,sound=F,ct_mesh=F.create,ct_to=F.move,ct_off=F.remove,ct_tilt=F.rotate,ct_preset=F.playParticle,soundAt=F.at,tf_create=F.create,tf_move=F.move,tf_remove=F.remove,tf_turn=F.rotate;
const spring_R = 7, spring_DUR = 15000, spring_PULSE = 1500, FX = 5200, LVL = 2;
const spring_DMG = 25, spring_PTS = 48, REDRAW = 16, spring_H = 4, YOFF = 0.3;

const token = {};

function inZone(z, p) {
    return distH2(p, z.c) <= spring_R * spring_R && Math.abs(p[1] - z.c[1]) <= spring_H;
}

function draw(z) {
    ring([z.c[0], z.c[1] + YOFF, z.c[2]], spring_R, spring_PTS, {
        tex: TEX.glint, r: 0.08,
        life: [0.7, 1.1], power: [0.05, 0.2], size: [0.38, 0.52],
        gravity: [0, 2.4, 0], dir: [0, 1, 0], dirSpread: 0.15,
        colors: [[[80, 180, 255, 1], [180, 240, 255, 1]],
                 [[40, 100, 220, 0], [120, 180, 255, 0]]],
    }, z.t * 0.05);

    point([z.c[0], z.c[1] + YOFF, z.c[2]], {
        r: 0.4, tex: TEX.effect, count: 10,
        life: [0.4, 0.8], power: [0.3, 0.8], size: [0.2, 0.35],
        gravity: [0, 1, 0], dir: [0, 0.5, 0], dirSpread: 0.3,
        colors: [[[100, 200, 255], [255, 255, 255]]],
    });
}

function pulse(z) {
    const ids = lifeforms(z.caster);
    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const p = posOf(id);
        if (!p || !inZone(z, p)) continue;
        if (id === z.caster) {
            eff(id, "Speed", FX, { inbuiltLevel: LVL });
        } else {
            eff(id, "Slowness", FX, { inbuiltLevel: LVL });
            damage(id, spring_DMG, z.caster, z.item);
        }
    }
}

function spring_co(z, tok) {
    return {
        next: function () {
            if (token[z.caster] !== tok) return { done: true };
            const now = Date.now();
            if (now >= z.end) return { done: true };
            try {
                z.t++;
                draw(z);
                if (now >= z.nextP) { pulse(z); z.nextP = now + spring_PULSE; }
            } catch (e) {}
            return { value: sleep(REDRAW), done: false };
        }
    };
}

function onPlayerClickSpring(playerId, itemName) {
    const p = posOf(playerId);
    if (!p) return true;

    const tok = (token[playerId] || 0) + 1;
    token[playerId] = tok;

    const now = Date.now();
    run(spring_co({
        caster: playerId, item: itemName,
        c: [p[0], p[1], p[2]],
        end: now + spring_DUR, nextP: now, t: 0,
    }, tok));

    setTimeout(function () { if (token[playerId] === tok) delete token[playerId]; }, Math.ceil(spring_DUR / 50) + REDRAW + 5);
    return true;
}

function onPlayerLeaveSpring(playerId) {
    token[playerId] = (token[playerId] || 0) + 1;
}


/* Spring — “Wind Blade” */

const windblade_RANGE = 12, windblade_STEP = 0.7, ARC = 1.15, windblade_THICK = 1.1, windblade_HT = 2.5;
const windblade_DMG = 28, windblade_KB = 1.1, windblade_FRAME = 1, windblade_PTS = 14, windblade_EYE = 1.2;

function slash(c, fr, t) {
    for (let i = 0; i < windblade_PTS; i++) {
        const k = -ARC + (2 * ARC) * (i / (windblade_PTS - 1 || 1));
        const side = Math.sin(k) * (1.6 + t * 0.4);
        const arc = Math.cos(k) * 0.15;
        const p = [
            c[0] + fr.f[0] * 0.1 + fr.r[0] * side + fr.u[0] * arc,
            c[1] + 0.2 + fr.f[1] * 0.1 + fr.u[1] * arc,
            c[2] + fr.f[2] * 0.1 + fr.r[2] * side + fr.u[2] * arc,
        ];
        point(p, {
            r: 0.08, tex: (i % 2) ? TEX.glint : TEX.effect, count: 2,
            life: [0.12, 0.28], power: [0.3, 0.9], size: [0.22, 0.42],
            gravity: [0, -1, 0], dir: [fr.f[0] * 0.85, fr.f[1] * 0.85 + 0.45, fr.f[2] * 0.85], dirSpread: 0.2,
            colors: [[[220, 255, 180], [120, 255, 80]], [[40, 120, 40, 0], [180, 255, 200, 0]]],
        });
    }
}

function hitAt(caster, c, fr, seen, item) {
    const ids = lifeforms(caster);
    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        if (seen[id]) continue;
        const p = posOf(id);
        if (!p) continue;
        const a = [p[0] - c[0], (p[1] + 0.9) - c[1], p[2] - c[2]];
        const along = a[0] * fr.f[0] + a[1] * fr.f[1] + a[2] * fr.f[2];
        if (along < -0.3 || along > windblade_THICK) continue;
        const side = a[0] * fr.r[0] + a[2] * fr.r[2];
        if (Math.abs(side) > 1.85) continue;
        const vert = a[0] * fr.u[0] + a[1] * fr.u[1] + a[2] * fr.u[2];
        if (Math.abs(vert) > windblade_HT) continue;

        seen[id] = 1;
        damage(id, windblade_DMG, caster, item);
        impulse(id, fr.f[0] * windblade_KB * 2, 0.4 + Math.max(0, fr.f[1]) * 1.1, fr.f[2] * windblade_KB * 2);
    }
}

function onPlayerClickWindblade(playerId, itemName) {
    const p = posOf(playerId);
    if (!p) return true;

    const fr = frame(facing(playerId));
    const o = [p[0] + fr.f[0] * 1.2, p[1] + windblade_EYE, p[2] + fr.f[2] * 1.2];
    const seen = {};
    let dist = 0;

    sound.at(playerId, "cannonFire3", 0.7, 1.6, 18);

    run({
        next: function () {
            if (dist > windblade_RANGE) return { done: true };
            const t = dist / windblade_RANGE;
            const c = [o[0] + fr.f[0] * dist, o[1] + fr.f[1] * dist, o[2] + fr.f[2] * dist];
            try {
                slash(c, fr, t);
                hitAt(playerId, c, fr, seen, itemName);
            } catch (e) {}
            dist += windblade_STEP;
            return dist > windblade_RANGE ? { done: true } : { value: sleep(windblade_FRAME), done: false };
        }
    });
    return true;
}


Object.assign(R,{onPlayerClickSpring,onPlayerLeaveSpring,onPlayerClickWindblade});
})(globalThis.FA);
