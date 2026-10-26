// src/blocks/100-blade.js — BLADE
// Source lisible. Ce fichier est minifié + empaqueté par `npm run build:blocks`.
// NE PAS coller ce fichier directement dans un Code Block : utiliser code-blocks/pack-XX.js.

(FA=>{/* source : ce fichier est regroupé avec d'autres dans un pack par le build. */const C=FA.c,R=FA.r,F=C.fx,{api,damage,eff,entitiesIn,heal,hitArea,hitSeg,impulse,isAliveId,lifeforms,markUntil,pickTarget,posOf,safeHealth,safePosition,statLevel,unmark,strengthMult,claimSummon,freeSummon,chest,facing,heading,isPlayerAlive,safeEntityName,safeEntityType,targetBlock,boom,box,boxSpan,CAGE,circle,clamp,column,dist2,distH2,frame,GOLDEN,inBox,norm,point,ring,TAU,TEX,run,setInterval,setTimeout,sleep,blockAt,clearIf,freeSpot,isSolid,raycast,setBlock,stuck,knockBack}=C,mesh=F,sound=F,ct_mesh=F.create,ct_to=F.move,ct_off=F.remove,ct_tilt=F.rotate,ct_preset=F.playParticle,soundAt=F.at,tf_create=F.create,tf_move=F.move,tf_remove=F.remove,tf_turn=F.rotate;
/* SPIN BLADE — lames noires en orbite */
const S_LEN = 4.4, S_R0 = 0.9, S_ARMS = 2, S_PTS = 7, S_SPEED = 0.3;
const S_SIZE = 0.5, S_BOX = 0.16, S_EMIT = 2;
const S_STR_R = 1.8, S_STR_Y0 = 1.2, S_STR_Y1 = 2.4, S_STR_EVERY = 3, paint_S_DMG = 5, S_RING = 20;
const spins = {};

function castSpin(pid, itemName) {
    if (spins[pid]) return true;
    sound.at(pid, "bigDrumSwish2", 0.85, 1.2, 22);
    const tok = (spins[pid] && spins[pid].tok || 0) + 1;
    spins[pid] = { tok: tok };

    let angle = 0, ticks = 0;
    const maxTicks = 8 * 20;

    run({
        next: function () {
            if (!spins[pid] || spins[pid].tok !== tok) return { done: true };
            if (ticks++ >= maxTicks) { delete spins[pid]; return { done: true }; }
            const p = posOf(pid);
            if (!p) { delete spins[pid]; return { done: true }; }

            angle += S_SPEED;
            const y = p[1] + 1.0;

            for (let arm = 0; arm < S_ARMS; arm++) {
                const off = (arm / S_ARMS) * TAU;
                for (let i = 0; i < S_PTS; i++) {
                    const t = S_R0 + (S_LEN - S_R0) * (i / (S_PTS - 1));
                    const a = angle + off;
                    const px = p[0] + Math.cos(a) * t, pz = p[2] + Math.sin(a) * t;
                    const py = y + (i / (S_PTS - 1)) * 0.35;
                    const core = i > S_PTS - 4;
                    const hot = (ticks + arm + i) % 3 === 0;

                    point([px, py, pz], {
                        r: S_BOX, tex: hot ? TEX.glint : (core ? TEX.crit : TEX.square), count: S_EMIT,
                        life: [0.14, 0.34], power: [0.05, 0.35],
                        size: [S_SIZE * (core ? 0.9 : 0.56), S_SIZE * (core ? 1.85 : 1.25)],
                        gravity: [0, 0.6, 0], dir: [-Math.sin(a) * 0.75, 0.275, Math.cos(a) * 0.75], dirSpread: 0.4,
                        colors: [[core ? [255, 245, 205] : [70, 80, 78], core ? [255, 255, 255] : [175, 175, 190]],
                                 [[15, 15, 22, 0], [90, 90, 110, 0]]],
                    });
                }

                const tipx = p[0] + Math.cos(angle + off) * S_LEN;
                const tipz = p[2] + Math.sin(angle + off) * S_LEN;
                if ((ticks % S_STR_EVERY) === 0) {
                    const list = entitiesIn(
                        [tipx - S_STR_R, p[1] - S_STR_Y0, tipz - S_STR_R],
                        [tipx + S_STR_R, p[1] + S_STR_Y1, tipz + S_STR_R]
                    );
                    for (let j = 0; j < list.length; j++) {
                        const id = list[j];
                        if (id === pid) continue;
                        if (damage(id, paint_S_DMG, pid, itemName)) {
                            boom([tipx, y, tipz], 0.9, { count: 22, colors: [[[255, 235, 170], [255, 255, 255]], [[120, 100, 40, 0], [255, 235, 170, 0]]] });
                        }
                    }
                }
            }

            if ((ticks % 3) === 0) {
                circle(S_RING, function (i, a) {
                    const r = S_LEN + 0.2;
                    point([p[0] + Math.cos(a) * r, y - 0.45, p[2] + Math.sin(a) * r], {
                        r: 0.06, tex: TEX.glint,
                        life: [0.2, 0.4], power: [0.02, 0.1], size: [0.2, 0.38],
                        gravity: [0, 0.2, 0], dir: [0, 0.22, 0], dirSpread: 0.05,
                        colors: [[[190, 190, 205, 0.55], [255, 250, 220, 0.75]], [[30, 30, 45, 0], [120, 120, 140, 0]]],
                    });
                }, angle * 0.25);
            }

            return { value: sleep(1), done: false };
        }
    });
    return true;
}


/* CATACLYSM — grosse explosion centrée sur soi */
function castBoom(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    sound.at(pid, "cannonFire1", 0.95, 0.75, 28);
    boom(p, 5, { count: 190, colors: [[[255, 100, 0], [255, 255, 0]]] });
    hitArea(p, 5, pid, itemName, 25, {});
    return true;
}


/* BOMB DASH — explosion + dash dans la direction du regard */
function castBombDash(pid, itemName) {
    const p = posOf(pid);
    const d = facing(pid);
    if (!p) return true;
    sound.at(pid, "cannonFire2", 0.85, 1.1, 24);
    hitArea(p, 2, pid, itemName, 30, { height: 5 });
    boom(p, 1.2, { count: 60, colors: [[[255, 80, 0], [255, 200, 40]]] });
    try { api.setVelocity(pid, d[0] * 18, d[1] * 18, d[2] * 18); } catch (e) {}
    return true;
}


/* BLADE STORM — lames en orbite, dégâts périodiques (5 s) */
const STORM_MS = 5000, STORM_TICK = 1000, STORM_R = 3, STORM_DMG = 10;
const storms = {};

function castStorm(pid, itemName) {
    if (storms[pid]) return true;
    sound.at(pid, "bigDrumSwish1", 0.85, 1.3, 22);
    storms[pid] = true;
    const t0 = Date.now();
    let lastD = t0 - STORM_TICK, ang = 0;

    run({
        next: function () {
            if (!storms[pid]) return { done: true };
            const now = Date.now();
            const p = posOf(pid);
            if (!p || now >= t0 + STORM_MS) { delete storms[pid]; return { done: true }; }

            const x = p[0], y = p[1] + 1, z = p[2];
            ang += 0.55;

            for (let b = 0; b < 12; b++) {
                const a = ang + (TAU / 12) * b;
                const rad = 0.8 + (b % 4) * 0.7;
                for (let t = 0; t < 3; t++) {
                    const ta = a - t * 0.12, tr = rad - t * 0.08;
                    point([x + Math.cos(ta) * tr, y + Math.sin(ta * 2) * 0.6, z + Math.sin(ta) * tr], {
                        r: 0.07, tex: TEX.square,
                        life: [0.08, 0.22], power: [0, 0.05], size: [0.12, 0.2],
                        colors: [[[0, 0, 0], [20, 20, 20]]],
                    });
                }
                point([x + Math.cos(a) * rad, y + Math.sin(a * 2) * 0.6, z + Math.sin(a) * rad], {
                    r: 0.1, tex: TEX.square,
                    life: [0.12, 0.3], power: [0, 0.1], size: [0.18, 0.28],
                    colors: [[[0, 0, 0], [30, 30, 30]]],
                });
            }

            if (now >= lastD + STORM_TICK) {
                lastD = now;
                hitArea([x, y, z], STORM_R, pid, itemName, STORM_DMG, {});
            }
            return { value: sleep(1), done: false };
        }
    });
    return true;
}


/* BLADE DASH — dash rapide, une frappe par cible */
const DASH_MS = 600, DASH_R = 2.5, DASH_DMG = 20;
const dashes = {};

function castBladeDash(pid, itemName) {
    const d = facing(pid);
    if (dashes[pid]) return true;
    sound.at(pid, "critical_hit", 0.85, 1.35, 22);
    dashes[pid] = true;
    const end = Date.now() + DASH_MS;
    const hit = {};

    try { api.setVelocity(pid, d[0] * 18, d[1] * 18, d[2] * 18); } catch (e) {}

    run({
        next: function () {
            if (!dashes[pid]) return { done: true };
            const p = posOf(pid);
            if (!p || Date.now() >= end) { delete dashes[pid]; return { done: true }; }

            const list = entitiesIn(
                [p[0] - DASH_R, p[1] - DASH_R, p[2] - DASH_R],
                [p[0] + DASH_R, p[1] + DASH_R, p[2] + DASH_R]
            );
            for (let i = 0; i < list.length; i++) {
                const id = list[i];
                if (id === pid || hit[id]) continue;
                hit[id] = 1;
                damage(id, DASH_DMG, pid, itemName);
            }

            point([p[0], p[1] + 0.75, p[2]], {
                r: 0.3, tex: TEX.glint, count: 4,
                life: [0.1, 0.25], power: [0.1, 0.4], size: [0.15, 0.3],
                colors: [[[220, 220, 255], [255, 255, 255]]],
            });
            return { value: sleep(1), done: false };
        }
    });
    return true;
}


/* SPIKE FIELD — pics de béton noir aléatoires */
const SPIKE_N = 10, SPIKE_SPREAD = 10, SPIKE_H = 2, SPIKE_DMG = 25, SPIKE_MS = 1000;

function castSpikes(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    sound.at(pid, "cannonFire3", 0.85, 0.85, 24);

    const baseY = Math.floor(p[1]);
    const blocks = [];
    for (let i = 0; i < SPIKE_N; i++) {
        const x = Math.floor(p[0] + (Math.random() * SPIKE_SPREAD * 2 - SPIKE_SPREAD));
        const z = Math.floor(p[2] + (Math.random() * SPIKE_SPREAD * 2 - SPIKE_SPREAD));
        const h = SPIKE_H + Math.floor(Math.random() * 2);
        for (let k = 0; k < h; k++) {
            if (blockAt(x, baseY + k, z) === "Air") {
                setBlock(x, baseY + k, z, "Black Concrete");
                blocks.push([x, baseY + k, z]);
            }
        }
    }

    hitArea(p, SPIKE_SPREAD, pid, itemName, SPIKE_DMG, {});

    setTimeout(function () {
        for (let j = 0; j < blocks.length; j++) {
            clearIf(blocks[j][0], blocks[j][1], blocks[j][2], "Black Concrete");
        }
    }, Math.ceil(SPIKE_MS / 50));
    return true;
}


/* JUDGMENT BEAM — rayon jaune sur la zone visée */
const JB_RANGE = 80, JB_R = 3, JB_DMG = 50;
const lightStates = {};

function clearGlass(state) {
    if (!state) return;
    for (let i = 0; i < state.blocks.length; i++) {
        clearIf(state.blocks[i][0], state.blocks[i][1], state.blocks[i][2], "Red Glass");
    }
    state.blocks.length = 0;
}

function placeZone(tx, ty, tz, state) {
    clearGlass(state);
    const spots = [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0]];
    for (let i = 0; i < spots.length; i++) {
        const bx = tx + spots[i][0], by = ty + spots[i][1], bz = tz + spots[i][2];
        if (blockAt(bx, by, bz) === "Air" && setBlock(bx, by, bz, "Red Glass")) {
            state.blocks.push([bx, by, bz]);
        }
    }
}

function castJudgment(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    if (!lightStates[pid]) lightStates[pid] = { blocks: [] };
    const state = lightStates[pid];

    const from = [p[0], p[1] + 1.5, p[2]];
    const d = facing(pid);
    const hit = raycast(from, d, JB_RANGE, 0.5) || [
        Math.floor(from[0] + d[0] * 12),
        Math.floor(from[1] + d[1] * 12),
        Math.floor(from[2] + d[2] * 12),
    ];

    const target = [hit[0] + 0.5, hit[1] + 0.5, hit[2] + 0.5];
    sound.at(pid, "magicAccent1", 0.85, 1.4, 24);
    sound.at(target, "cannonFire3", 0.85, 1.1, 26);
    placeZone(hit[0], hit[1], hit[2], state);

    const dx = target[0] - from[0], dy = target[1] - from[1], dz = target[2] - from[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    const steps = clamp(Math.floor(dist / 2), 4, 10);
    for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        point([from[0] + dx * t, from[1] + dy * t, from[2] + dz * t], {
            r: 0.1, tex: TEX.glint,
            life: [0.12, 0.25], power: [0.05, 0.15], size: [0.22, 0.4],
            colors: [[[255, 230, 80], [255, 255, 200]]],
        });
    }

    setTimeout(function () { clearGlass(state); }, 8);
    hitArea(target, JB_R, pid, itemName, JB_DMG, {});
    boom(target, 2, { count: 60, colors: [[[255, 230, 80], [255, 255, 255]], [[180, 160, 20, 0], [255, 230, 80, 0]]] });
    return true;
}


/* QUI A LANCÉ TEL PAINTBALL — exports */
function onPlayerClickSpinBlade(pid, item) { return castSpin(pid, item); }
function onPlayerClickCataclysm(pid, item) { return castBoom(pid, item); }
function onPlayerClickBombDash(pid, item) { return castBombDash(pid, item); }
function onPlayerClickBladeStorm(pid, item) { return castStorm(pid, item); }
function onPlayerClickBladeDash(pid, item) { return castBladeDash(pid, item); }
function onPlayerClickSpikeField(pid, item) { return castSpikes(pid, item); }
function onPlayerClickJudgmentBeam(pid, item) { return castJudgment(pid, item); }


function onPlayerClickPaint() { return false; }

function onPlayerJoinPaint(pid) {
    lightStates[pid] = { blocks: [] };
}

function onPlayerLeavePaint(pid) {
    delete spins[pid];
    delete storms[pid];
    delete dashes[pid];
    if (lightStates[pid]) { clearGlass(lightStates[pid]); delete lightStates[pid]; }
    try { if (R.paintForget) R.paintForget(pid); } catch (e) {}
}


Object.assign(R,{onPlayerClickSpinBlade,onPlayerClickCataclysm,onPlayerClickBombDash,onPlayerClickBladeStorm,onPlayerClickBladeDash,onPlayerClickSpikeField,onPlayerClickJudgmentBeam,onPlayerClickPaint,onPlayerJoinPaint,onPlayerLeavePaint});
})(globalThis.FA);
