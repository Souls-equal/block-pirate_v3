// utils/world.js

const SOFT = { Air: 1, Water: 1, Lava: 1 };

export function blockAt(x, y, z) {
    try { return api.getBlock(Math.floor(x), Math.floor(y), Math.floor(z)); }
    catch (e) { return null; }
}

export function isSolid(x, y, z) {
    const b = blockAt(x, y, z);
    return !!b && !SOFT[b];
}

export function isAir(x, y, z) { return blockAt(x, y, z) === "Air"; }

export function solidVoxel(x, y, z) {
    try { return !!api.getBlockSolidity([x, y, z]); }
    catch (e) { return false; }
}

export function setBlock(x, y, z, name) {
    try { api.setBlock(Math.floor(x), Math.floor(y), Math.floor(z), name); return true; }
    catch (e) { return false; }
}

export function clearIf(x, y, z, name, replacement) {
    if (blockAt(x, y, z) !== name) return false;
    return setBlock(x, y, z, replacement === undefined ? "Air" : replacement);
}

export function standable(x, y, z) {
    return isSolid(x, y - 1, z) && !isSolid(x, y, z) && !isSolid(x, y + 1, z);
}

export function raycast(from, dir, maxDist, step) {
    const s = step || 0.5;
    for (let t = 0.25; t <= (maxDist || 40); t += s) {
        const x = from[0] + dir[0] * t, y = from[1] + dir[1] * t, z = from[2] + dir[2] * t;
        const b = blockAt(x, y, z);
        if (b && !SOFT[b]) return [Math.floor(x), Math.floor(y), Math.floor(z)];
    }
    return null;
}

export function freeSpot(p, up, radius) {
    const x = Math.floor(p[0]), y = Math.floor(p[1]), z = Math.floor(p[2]);
    const u = up === undefined ? 6 : up;
    const R = radius === undefined ? 3 : radius;
    for (let needFloor = 1; needFloor >= 0; needFloor--) {
        for (let k = 0; k <= R; k++) {
            for (let i = -k; i <= k; i++) {
                for (let j = -k; j <= k; j++) {
                    if (Math.abs(i) + Math.abs(j) !== k) continue;
                    const nx = x + i, nz = z + j;
                    for (let ny = y; ny <= y + u; ny++) {
                        if (solidVoxel(nx, ny, nz) || solidVoxel(nx, ny + 1, nz)) continue;
                        if (needFloor && !solidVoxel(nx, ny - 1, nz)) continue;
                        return [nx + 0.5, ny + 0.02, nz + 0.5];
                    }
                }
            }
        }
    }
    return null;
}

export function stuck(p) {
    const x = Math.floor(p[0]), y = Math.floor(p[1]), z = Math.floor(p[2]);
    return solidVoxel(x, y, z) || solidVoxel(x, y + 1, z);
}
