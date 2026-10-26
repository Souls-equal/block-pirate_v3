// utils/fx.js

/* utils/math.js */

export const TAU = Math.PI * 2;
export const GOLDEN = 2.399963229728653;

/* scalaires */
export function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function rand(a, b) { return a + Math.random() * (b - a); }
export function randInt(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); }
export function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/* vecteurs */
export function len(v) { return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]); }

export function norm(v) {
    const m = len(v);
    return (!m || m < 1e-4) ? [0, 0, 1] : [v[0] / m, v[1] / m, v[2] / m];
}

export function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
export function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
export function scale(v, s) { return [v[0] * s, v[1] * s, v[2] * s]; }
export function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

export function dist2(a, b) {
    const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
    return dx * dx + dy * dy + dz * dz;
}
export function dist(a, b) { return Math.sqrt(dist2(a, b)); }

export function distH2(a, b) {
    const dx = a[0] - b[0], dz = a[2] - b[2];
    return dx * dx + dz * dz;
}
export function distH(a, b) { return Math.sqrt(distH2(a, b)); }

export function manhattan(a, b) {
    return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
}

export function floor3(p) { return [Math.floor(p[0]), Math.floor(p[1]), Math.floor(p[2])]; }

/* repère / frames */

export function frame(d) {
    const f = norm(d);
    const hl = Math.sqrt(f[0] * f[0] + f[2] * f[2]);
    let rx, rz;
    if (hl > 0.05) { rx = -f[2] / hl; rz = f[0] / hl; }
    else { rx = 1; rz = 0; }
    let ux = -rz * f[1], uy = rz * f[0] - rx * f[2], uz = rx * f[1];
    const ul = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1;
    return { f: f, r: [rx, 0, rz], u: [ux / ul, uy / ul, uz / ul] };
}

/* segments & boîtes */

export function segDist(p, a, b) {
    const abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2];
    const apx = p[0] - a[0], apy = p[1] - a[1], apz = p[2] - a[2];
    const ab2 = abx * abx + aby * aby + abz * abz;
    let t = 0;
    if (ab2 > 1e-4) t = clamp((apx * abx + apy * aby + apz * abz) / ab2, 0, 1);
    const c = [a[0] + abx * t, a[1] + aby * t, a[2] + abz * t];
    return { d2: dist2(p, c), t: t, c: c };
}

export function inBox(fr, center, p, wr, wu, wd) {
    const a = [p[0] - center[0], p[1] - center[1], p[2] - center[2]];
    const dr = a[0] * fr.r[0] + a[1] * fr.r[1] + a[2] * fr.r[2];
    if (Math.abs(dr) > wr) return false;
    const du = a[0] * fr.u[0] + a[1] * fr.u[1] + a[2] * fr.u[2];
    if (Math.abs(du) > wu) return false;
    const df = a[0] * fr.f[0] + a[1] * fr.f[1] + a[2] * fr.f[2];
    return Math.abs(df) <= wd;
}

export function boxSpan(fr, axis, wr, wu, wd) {
    return Math.abs(fr.r[axis]) * wr + Math.abs(fr.u[axis]) * wu + Math.abs(fr.f[axis]) * wd;
}

/* helpers de boucle */

export function circle(n, cb, spin) {
    const s = spin || 0;
    for (let i = 0; i < n; i++) cb(i, (i / n) * TAU + s);
}

export const CAGE = [
    [0, 1.2, 0], [0, -1.2, 0],
    [1.1, 0, 0], [-1.1, 0, 0],
    [0, 0, 1.1], [0, 0, -1.1]
];

/* utils/mesh.js */

export function create(blockName, size, owner, fallbackBlock) {
    let m = null;
    try { m = api.attemptCreateMeshEntity("BloxdBlock", { blockName: blockName, size: size }, null, null, owner || null); }
    catch (e) { m = null; }
    if (!m && fallbackBlock) {
        try { m = api.attemptCreateMeshEntity("BloxdBlock", { blockName: fallbackBlock, size: size }, null, null, owner || null); }
        catch (e2) { m = null; }
        if (m) return { id: m, block: fallbackBlock };
    }
    return m ? { id: m, block: blockName } : null;
}

export function remove(id) {
    if (!id) return;
    try { api.removeMeshEntity(id); }
    catch (e) { try { api.deleteMeshEntity(id); } catch (e2) {} }
}

export function move(id, x, y, z) {
    if (!id) return;
    try { api.setPosition(id, x, y, z); } catch (e) {}
}

export function aim(id, from, dir, length, block, thickness) {
    if (!id) return;
    try {
        const dx = dir[0] * length, dy = dir[1] * length, dz = dir[2] * length;
        api.setPosition(id, from[0] + dx / 2, from[1] + dy / 2, from[2] + dz / 2);
        const horiz = Math.sqrt(dx * dx + dz * dz);
        const yaw = Math.atan2(dx, dz);
        const pitch = horiz > 0.001 ? -Math.atan2(dy, horiz) : (dy > 0 ? -Math.PI / 2 : Math.PI / 2);
        api.setEntityRotation(id, pitch, yaw, 0);
        if (block) {
            const th = thickness === undefined ? 0.12 : thickness;
            api.updateMeshEntity(id, "BloxdBlock", { blockName: block, size: [th, th, length] });
        }
    } catch (e) {}
}

export function rotate(id, pitch, yaw, roll) {
    if (!id) return;
    try { api.setEntityRotation(id, pitch, yaw === undefined ? 0 : yaw, roll === undefined ? 0 : roll); }
    catch (e) {}
}

export function resize(id, blockName, size) {
    if (!id) return;
    try { api.updateMeshEntity(id, "BloxdBlock", { blockName: blockName, size: size }); }
    catch (e) {}
}

/* utils/sound.js */

export function at(target, name, volume, pitch, maxDist) {
    try {
        api.broadcastSound(name || "cannonFire3", volume === undefined ? 1 : volume,
            pitch === undefined ? 1 : pitch,
            { playerIdOrPos: target, maxHearDist: maxDist === undefined ? 20 : maxDist, refDistance: 6 });
    } catch (e) {}
}

export function to(playerId, name, volume, pitch) {
    try { api.playSound(playerId, name, volume === undefined ? 1 : volume, pitch === undefined ? 1 : pitch); }
    catch (e) {}
}

/* utils/particles.js */

export const TEX = {
    glint: "glint",
    square: "square_particle",
    crit: "critical_hit",
    effect: "effect_5",
    soul: "soul_0",
    bubble: "bubble",
};

export function rgba(r, g, b, a) { return [r, g, b, a === undefined ? 1 : a]; }

const DEF = {
    tex: TEX.glint,
    life: [0.2, 0.4],
    power: [0.05, 0.2],
    size: [0.2, 0.4],
    dir: [0, 0, 0],
    dirSpread: 0.05,
    count: 1,
    gravity: [0, 0, 0],
    colors: [rgba(255, 255, 255), rgba(255, 255, 255, 0)],
    blend: 1,
    drag: 1,
};

function toGradients(colors) {
    const n = colors.length;
    const out = [];
    for (let i = 0; i < n; i++) {
        const stop = colors[i];
        const pair = Array.isArray(stop[0]) ? stop : [stop, stop];
        out.push({
            timeFraction: n <= 1 ? 0 : i / (n - 1),
            minColor: pair[0],
            maxColor: pair[1],
        });
    }
    return out;
}

export function emit(o) {
    if (!o) return;
    const life = o.life || DEF.life;
    const power = o.power || DEF.power;
    const size = o.size || DEF.size;
    const gravity = o.gravity || DEF.gravity;
    const colors = o.colors || DEF.colors;
    const blend = o.blend === undefined ? DEF.blend : o.blend;
    const drag = o.drag === undefined ? DEF.drag : o.drag;
    const count = o.count === undefined ? DEF.count : o.count;

    let dir1 = o.dir1, dir2 = o.dir2;
    if (!dir1 || !dir2) {
        const d = o.dir || DEF.dir;
        const s = o.dirSpread === undefined ? DEF.dirSpread : o.dirSpread;
        dir1 = [d[0] - s, d[1] - s, d[2] - s];
        dir2 = [d[0] + s, d[1] + s, d[2] + s];
    }

    try {
        api.playParticleEffect({
            pos1: o.pos1, pos2: o.pos2,
            dir1: dir1, dir2: dir2,
            texture: o.tex || DEF.tex,
            minLifeTime: life[0], maxLifeTime: life[1],
            minEmitPower: power[0], maxEmitPower: power[1],
            minSize: size[0], maxSize: size[1],
            manualEmitCount: count,
            gravity: gravity,
            colorGradients: toGradients(colors),
            velocityGradients: [{ timeFraction: 0, factor: 1, factor2: drag }],
            blendMode: blend,
        });
    } catch (e) {}
}

export function box(min, max, o) {
    o = o || {};
    o.pos1 = min; o.pos2 = max;
    emit(o);
    return o;
}

export function point(p, o) {
    o = o || {};
    const r = o.r === undefined ? 0.08 : o.r;
    o.pos1 = [p[0] - r, p[1] - r, p[2] - r];
    o.pos2 = [p[0] + r, p[1] + r, p[2] + r];
    emit(o);
    return o;
}

export function seg(a, b, o) {
    o = o || {};
    const r = o.r === undefined ? 0.05 : o.r;
    o.pos1 = [Math.min(a[0], b[0]) - r, Math.min(a[1], b[1]) - r, Math.min(a[2], b[2]) - r];
    o.pos2 = [Math.max(a[0], b[0]) + r, Math.max(a[1], b[1]) + r, Math.max(a[2], b[2]) + r];
    emit(o);
    return o;
}

export function ring(c, radius, count, o, spin) {
    o = o || {};
    const s = spin || 0;
    for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + s;
        const p = [c[0] + Math.cos(a) * radius, c[1], c[2] + Math.sin(a) * radius];
        if (o.dirAt) { o.dir = o.dirAt(a, i); }
        point(p, o);
    }
}

export function boom(p, radius, o) {
    o = o || {};
    const r = radius;
    o.pos1 = [p[0] - r, p[1] - r, p[2] - r];
    o.pos2 = [p[0] + r, p[1] + r, p[2] + r];
    o.count = o.count === undefined ? Math.floor(30 + r * 22) : o.count;
    o.power = o.power || [3, 8];
    o.size = o.size || [0.4, 1.2];
    o.gravity = o.gravity || [0, -2, 0];
    o.tex = o.tex || TEX.crit;
    emit(o);
    return o;
}

export function column(c, height, o) {
    o = o || {};
    const steps = o.steps === undefined ? Math.max(4, Math.floor(height * 2)) : o.steps;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        o.size = o.sizeAt ? o.sizeAt(t) : o.size;
        point([c[0], c[1] + t * height, c[2]], o);
    }
}

/* Compat avec l'ancien utils/particle.js (utilisé par fruit.js) */
export function playParticle(posOrEntityId, presetId = "aura", radius = 1) {
    try {
        let pos = posOrEntityId;
        if (typeof posOrEntityId === "string" || typeof posOrEntityId === "number") {
            pos = api.getPosition(posOrEntityId);
        }
        if (!pos) return;
        const r = Math.max(0.5, radius);
        api.playParticleEffect({
            presetId: presetId,
            pos1: [pos[0] - r, pos[1], pos[2] - r],
            pos2: [pos[0] + r, pos[1] + r * 2, pos[2] + r],
        });
    } catch (e) {}
}
