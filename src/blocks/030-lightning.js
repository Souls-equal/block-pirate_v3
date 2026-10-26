// src/blocks/030-lightning.js — LIGHTNING
// Source lisible. Ce fichier est minifié + empaqueté par `npm run build:blocks`.
// NE PAS coller ce fichier directement dans un Code Block : utiliser code-blocks/pack-XX.js.

(FA=>{/* source : ce fichier est regroupé avec d'autres dans un pack par le build. */const C=FA.c,R=FA.r,F=C.fx,{api,damage,eff,entitiesIn,heal,hitArea,hitSeg,impulse,isAliveId,lifeforms,markUntil,pickTarget,posOf,safeHealth,safePosition,statLevel,unmark,strengthMult,claimSummon,freeSummon,chest,facing,heading,isPlayerAlive,safeEntityName,safeEntityType,targetBlock,boom,box,boxSpan,CAGE,circle,clamp,column,dist2,distH2,frame,GOLDEN,inBox,norm,point,ring,TAU,TEX,run,setInterval,setTimeout,sleep,blockAt,clearIf,freeSpot,isSolid,raycast,setBlock,stuck,knockBack}=C,mesh=F,sound=F,ct_mesh=F.create,ct_to=F.move,ct_off=F.remove,ct_tilt=F.rotate,ct_preset=F.playParticle,soundAt=F.at,tf_create=F.create,tf_move=F.move,tf_remove=F.remove,tf_turn=F.rotate;
const lightning_MAX = 4, lightning_R1 = 14, lightning_CONE = 0.55, RB = 7;
const lightning_DMG0 = 34, lightning_FALL = 0.72, lightning_DMIN = 10, lightning_BODY = 1, lightning_EYE = 1.45;
const PAUSE = 3, WEAK_MS = 2500, WEAK_LV = 1;
const TRAIL_H = 3.2, TRAIL_STEPS = 8;

function descendingTrail(x, y, z) {
    for (let i = 0; i <= TRAIL_STEPS; i++) {
        const t = i / TRAIL_STEPS;
        const py = y - t * TRAIL_H;
        const size = 0.55 - t * 0.25;
        const alpha = 1 - t * 0.55;
        const spread = 0.08 + t * 0.22;

        point([x, py, z], {
            r: spread, tex: TEX.glint, count: 4,
            life: [0.35 + t * 0.25, 0.65 + t * 0.35], power: [0.35, 1.1],
            size: [size * 0.7, size], gravity: [0, -10, 0], drag: 0.35,
            dir: [0, -1.7, 0], dirSpread: 0.15,
            colors: [[[255, 255, 220, alpha], [255, 230, 80, alpha]],
                     [[120, 180, 255, alpha * 0.7], [255, 180, 40, alpha * 0.7]],
                     [[40, 80, 180, 0], [100, 60, 10, 0]]],
        });

        if (i % 2 === 0) {
            point([x, py, z], {
                r: spread * 1.4, tex: TEX.effect, count: 3,
                life: [0.4, 0.8], power: [0.2, 0.7], size: [size * 0.9, size * 1.35],
                gravity: [0, -7, 0], dir: [0, -1.3, 0], dirSpread: 0.25,
                colors: [[[140, 190, 255, alpha * 0.9], [255, 240, 120, alpha]],
                         [[30, 50, 140, 0], [80, 40, 0, 0]]],
            });
        }
    }

    point([x, y - TRAIL_H, z], {
        r: 0.55, tex: TEX.crit, count: 16,
        life: [0.25, 0.55], power: [0.6, 1.8], size: [0.16, 0.38],
        gravity: [0, -5, 0], dir: [0, 0.8, 0], dirSpread: 0.8,
        colors: [[[255, 255, 255], [255, 220, 90]], [[60, 100, 220, 0], [120, 60, 0, 0]]],
    });
}

function bolt(a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 0.05) return;

    const steps = Math.max(4, Math.min(14, Math.floor(len * 2.2)));
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const j = (i % 2 === 0 ? 1 : -1) * 0.25 * Math.sin(t * Math.PI);
        const p = [a[0] + dx * t + j, a[1] + dy * t + j * 0.4, a[2] + dz * t + j * 0.35];

        point(p, {
            r: 0.06, tex: TEX.glint, count: 2,
            life: [0.1, 0.2], power: [0.02, 0.12], size: [0.26, 0.42],
            colors: [[[255, 255, 255], [255, 250, 180]], [[180, 210, 255, 0], [255, 220, 80, 0]]],
        });

        if (i % 2 === 0) {
            point(p, {
                r: 0.1, tex: TEX.effect, count: 2,
                life: [0.25, 0.5], power: [0.2, 0.7], size: [0.2, 0.4],
                gravity: [0, -8, 0], dir: [0, -1, 0], dirSpread: 0.2,
                colors: [[[200, 230, 255, 0.95], [255, 220, 100]], [[40, 70, 160, 0], [120, 80, 20, 0]]],
            });
        }
    }

    point(b, {
        r: 0.35, tex: TEX.crit, count: 14,
        life: [0.15, 0.35], power: [1.2, 2.6], size: [0.2, 0.45],
        gravity: [0, -4, 0], dir: [0, 0.6, 0], dirSpread: 1,
        colors: [[[255, 255, 255], [255, 230, 100]], [[80, 140, 255, 0], [40, 60, 180, 0]]],
    });
    descendingTrail(b[0], b[1], b[2]);
}

function buildChain(caster, origin, dir) {
    const first = pickTarget(caster, origin, dir, lightning_R1, lightning_CONE);
    if (!first) return [];
    const chain = [first];
    const seen = {};
    seen[first] = 1;

    let from = first;
    for (let i = 1; i < lightning_MAX; i++) {
        const fp = chest(from, lightning_BODY);
        if (!fp) break;
        let best = null, bestD = RB * RB;
        const ids = lifeforms(caster);
        for (let k = 0; k < ids.length; k++) {
            const id = ids[k];
            if (seen[id]) continue;
            const p = chest(id, lightning_BODY);
            if (!p) continue;
            const d = dist2(fp, p);
            if (d < bestD) { bestD = d; best = id; }
        }
        if (!best) break;
        chain.push(best);
        seen[best] = 1;
        from = best;
    }
    return chain;
}

function lightning_co(caster, item, origin, chain) {
    let i = 0, dmg = lightning_DMG0, prev = origin;
    return {
        next: function () {
            if (i >= chain.length) return { done: true };
            const tp = chest(chain[i], lightning_BODY);
            if (tp) {
                const last = (i === chain.length - 1);
                bolt(prev, tp);
                damage(chain[i], dmg < lightning_DMIN ? lightning_DMIN : dmg, caster, item);
                if (last) eff(chain[i], "Weakness", WEAK_MS, { inbuiltLevel: WEAK_LV });
                prev = tp;
            }
            i++;
            dmg *= lightning_FALL;
            return i >= chain.length ? { done: true } : { value: sleep(PAUSE || 1), done: false };
        }
    };
}

function onPlayerClickLightning(playerId, itemName) {
    const p = posOf(playerId);
    if (!p) return true;

    const dir = facing(playerId);
    const o = [p[0] + dir[0] * 0.5, p[1] + lightning_EYE, p[2] + dir[2] * 0.5];
    const chain = buildChain(playerId, o, dir);
    if (!chain.length) return true;

    sound.at(playerId, "cannonFire3", 0.85, 1.8, 20);
    run(lightning_co(playerId, itemName, o, chain));
    return true;
}

function onPlayerLeaveLightning(playerId) {}


const thunder_FWD = 10, thunder_R = 6.5, thunder_DMG = 44, thunder_DMIN = 20, thunder_H = 5;
const WARN = 8, thunder_FALL = 5, FROM = 16, thunder_KB = 2.4, LIFT = 4.4;
const MARK_PTS = 12, BOLTSTEPS = 11;

const strikes = {};

function targetPoint(pid) {
    const t = targetBlock(pid);
    if (t) return t;
    const p = posOf(pid);
    if (!p) return null;
    const d = facing(pid);
    const hl = Math.sqrt(d[0] * d[0] + d[2] * d[2]);
    if (hl < 1e-4) return [p[0], p[1], p[2] + thunder_FWD];
    return [p[0] + (d[0] / hl) * thunder_FWD, p[1], p[2] + (d[2] / hl) * thunder_FWD];
}

function markFx(st, t) {
    const s = 0.9 + Math.sin(st.f * 1.1) * 0.25, al = 0.35 + t * 0.65;
    circle(MARK_PTS, function (i, a) {
        point([st.x + Math.cos(a) * thunder_R, st.y + 0.17, st.z + Math.sin(a) * thunder_R], {
            r: 0.2, tex: (i % 3) ? TEX.glint : TEX.effect,
            life: [0.15, 0.35], power: [0.2, 0.9], size: [0.2 * s, 0.42 * s],
            gravity: [0, 1.6, 0], dir: [0, 0.95, 0], dirSpread: 0.3,
            colors: [[[120, 190, 255, al], [255, 250, 170, al]], [[30, 60, 160, 0], [120, 100, 20, 0]]],
        });
    });
}

function boltFx(st, t) {
    const bottom = st.y + FROM * (1 - t), top = st.y + FROM;
    for (let i = 0; i <= BOLTSTEPS; i++) {
        const f = i / BOLTSTEPS;
        const y = bottom + (top - bottom) * f;
        const jx = Math.sin(i * 12.9 + st.f * 3.7) * 0.5 * (0.3 + f);
        const jz = Math.cos(i * 7.3 - st.f * 2.9) * 0.5 * (0.3 + f);
        const w = 0.34 - f * 0.14;
        point([st.x + jx, y + 0.12, st.z + jz], {
            r: w, tex: (i % 2) ? TEX.glint : TEX.square, count: 2,
            life: [0.12, 0.3], power: [0.4, 1.6], size: [w * 1.4, w * 2.6],
            gravity: [0, 2.2, 0], dir: [0, 1.5, 0], dirSpread: 0.4,
            colors: [[[255, 255, 255], [255, 235, 120]], [[70, 130, 255, 0], [30, 50, 150, 0]]],
        });
    }
}

function boomFx(st) {
    circle(16, function (i, a) {
        const r = thunder_R * (0.55 + (i % 3) * 0.22);
        point([st.x + Math.cos(a) * r, st.y + 0.45, st.z + Math.sin(a) * r], {
            r: 0.3, tex: (i % 2) ? TEX.glint : TEX.effect, count: 2,
            life: [0.2, 0.55], power: [1.5, 5], size: [0.3, 0.8],
            gravity: [0, -4, 0], dir: [Math.cos(a) * 5.5, 5.25, Math.sin(a) * 5.5], dirSpread: 2.5, drag: 0.4,
            colors: [[[255, 255, 240], [255, 240, 140]], [[60, 110, 220, 0], [140, 90, 20, 0]]],
        });
    });
    boom([st.x, st.y + 0.7, st.z], thunder_R * 0.5, { count: 60, colors: [[[200, 230, 255], [255, 255, 255]], [[120, 160, 240, 0], [200, 230, 255, 0]]] });
}

function thunder_blast(st) {
    const ids = lifeforms(st.pid);
    boomFx(st);
    sound.at([st.x, st.y, st.z], "cannonFire3", 0.95, 0.55, 34);

    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        if (!isAliveId(id)) continue;
        const q = posOf(id);
        if (!q) continue;
        const dx = q[0] - st.x, dz = q[2] - st.z;
        const dh = Math.sqrt(dx * dx + dz * dz);
        if (dh > thunder_R || Math.abs(q[1] - st.y) > thunder_H) continue;

        damage(id, Math.round(thunder_DMG - (thunder_DMG - thunder_DMIN) * (dh / thunder_R)), st.pid, st.item);
        const nl = dh || 1;
        impulse(id, (dx / nl) * thunder_KB + dx * 0.15, LIFT, (dz / nl) * thunder_KB + dz * 0.15);
    }
}

function thunder_co(st) {
    return {
        next: function () {
            if (strikes[st.pid] !== st) return { done: true };
            st.f++;

            if (st.f <= WARN) { markFx(st, st.f / WARN); return { value: sleep(2), done: false }; }

            const t = (st.f - WARN) / thunder_FALL;
            boltFx(st, t > 1 ? 1 : t);

            if (st.f >= WARN + thunder_FALL) {
                if (strikes[st.pid] === st) delete strikes[st.pid];
                if (isAliveId(st.pid)) {
                    try { thunder_blast(st); } catch (e) {}
                }
                return { done: true };
            }
            return { value: sleep(2), done: false };
        }
    };
}

function onPlayerClickThunderStrike(pid, itemName) {
    if (!isAliveId(pid)) return false;
    if (strikes[pid]) return true;

    const pt = targetPoint(pid);
    if (!pt) return true;

    const st = { pid: pid, item: itemName, x: pt[0], y: pt[1], z: pt[2], f: 0 };
    strikes[pid] = st;
    try { markFx(st, 0.2); } catch (e) {}
    sound.at(pid, "cannonFire3", 0.4, 1.7, 20);
    run(thunder_co(st));
    return true;
}

function onCancelThunder(pid) { delete strikes[pid]; }


Object.assign(R,{onPlayerClickLightning,onPlayerLeaveLightning,onPlayerClickThunderStrike,onCancelThunder});
})(globalThis.FA);
