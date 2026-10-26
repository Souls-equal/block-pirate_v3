// src/blocks/260-gravity-state.js — GRAVITY (état partagé 1/2)
// Source lisible. Ce fichier est minifié + empaqueté par `npm run build:blocks`.
// NE PAS coller ce fichier directement dans un Code Block : utiliser code-blocks/pack-XX.js.

((FA) => {
  const C = FA.c,
    R = FA.r,
    F = C.fx;
  const {
    api,
    damage,
    eff,
    entitiesIn,
    heal,
    hitArea,
    hitSeg,
    impulse,
    isAliveId,
    lifeforms,
    markUntil,
    pickTarget,
    posOf,
    safeHealth,
    safePosition,
    statLevel,
    unmark,
    strengthMult,
    claimSummon,
    freeSummon,
    chest,
    facing,
    heading,
    isPlayerAlive,
    safeEntityName,
    safeEntityType,
    targetBlock,
    boom,
    box,
    boxSpan,
    CAGE,
    circle,
    clamp,
    column,
    dist2,
    distH2,
    frame,
    GOLDEN,
    inBox,
    norm,
    point,
    ring,
    TAU,
    TEX,
    run,
    setInterval,
    setTimeout,
    sleep,
    blockAt,
    clearIf,
    freeSpot,
    isSolid,
    raycast,
    setBlock,
    stuck,
    knockBack,
  } = C;
  const { create: ct_mesh, remove: ct_off } = F;

  const V = globalThis.__GV__ || (globalThis.__GV__ = {});
  const gvVolley = V.gvVolley || {};
  const gvHeld = V.gvHeld || {};
  const gvPlanet = V.gvPlanet || {};
  const gvLock = V.gvLock || {};
  const gvLedger = V.gvLedger || new Map();
  const gvNum = V.gvNum || {};

  const K = {
    GV_B_N: 8,
    GV_B_R: 10,
    GV_B_SPD: 1.7,
    GV_B_GAP: 2,
    GV_B_DMG: 60,
    GV_B_KB: 24,
    GV_B_LIFT: 3.5,
    GV_B_RISE: 15,
    GV_B_HIT: 1.8,
    GV_B_FUSE: 80,
    GV_B_RANGE: 60,
    GV_B_AIM: 0.88,
    GV_G_RANGE: 22,
    GV_G_HOLD: 120,
    GV_G_THROW: 1,
    GV_G_DMG: 95,
    GV_G_SHARD: 133,
    GV_G_SPLASH: 4,
    GV_G_CD: 3000,
    GV_G_HIGH: 1.2,
    GV_G_LERP: 0.22,
    GV_G_SIGHT: 5,
    GV_G_MAXD: 65,
    GV_G_KB: 38,
    GV_P_R: 24,
    GV_P_N: 150,
    GV_P_SHELL: 6.5,
    GV_P_RISE: 56,
    GV_P_FORM: 32,
    GV_P_BATCH: 24,
    GV_P_CHARGE: 15,
    GV_P_SPD: 2.25,
    GV_P_IMPACT: 24,
    GV_P_DMG: 420,
    GV_P_KB: 75,
    GV_P_AIM: 75,
    GV_P_LAND: 2.5,
    GV_P_HITS: 400,
    GV_P_ALT: 18,
    GV_P_FLOOR: 0.1,
    GV_ROT0: 0.15,
    GV_ROT1: 0.6,
    GV_ROT2: 0.3,
    GV_MESH_MAX: 1000,
    GV_MESH_ALL: 5000,
    GV_SWEEP: 900,
    GV_STEP: 0.25,
    GV_CORE: [15, 0, 30],
    GV_VIOLET: [140, 20, 220],
    GV_LILAC: [220, 100, 255],
    GV_NIGHT: [30, 0, 60],
    GV_EARTH: [130, 100, 85],
    GV_DUST: [210, 180, 150],
    GV_ASH: [170, 170, 170],
    GV_SND: {
      volley: "magicAccent1",
      fire: "bigDrumSwish1",
      hit: "cannonFire1",
      grab: "magicAccent3",
      toss: "bigDrumSwish2",
      pull: "pulseFromTheDark",
      rise: "magicAccent4",
      launch: "cannonFire2",
      land: "cannonFire3",
      far: "futureStrangePulse",
    },
  };

  function gv_now() {
    try {
      return api.now();
    } catch (e) {
      return Date.now();
    }
  }
  function gv_pos(id) {
    return posOf(id);
  }
  function gv_alive(pid) {
    if (!isAliveId(pid)) return false;
    try {
      const h = api.getHealth(pid);
      if (typeof h === "number" && h <= 0) return false;
    } catch (e) {}
    return true;
  }
  const gvSay = {};
  function gv_whisper(pid, msg) {
    const t = gv_now();
    if (gvSay[pid] && t - gvSay[pid] < 3000) return;
    gvSay[pid] = t;
    try {
      api.sendMessage(pid, msg);
    } catch (e) {}
  }
  function gv_stale(r) {
    return !r.beat || gv_now() - r.beat > 4000;
  }
  function gv_dist(a, b) {
    const x = a[0] - b[0],
      y = a[1] - b[1],
      z = a[2] - b[2];
    return Math.sqrt(x * x + y * y + z * z);
  }
  function gv_norm(v) {
    const l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return l < 1e-4 ? [0, 1, 0] : [v[0] / l, v[1] / l, v[2] / l];
  }
  function gv_lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function gv_blk(x, y, z) {
    try {
      return api.getBlock(x, y, z);
    } catch (e) {
      return null;
    }
  }
  function gv_air(x, y, z) {
    const n = gv_blk(x, y, z);
    return !n || n === "Air" || n === "Water" || n === "Lava";
  }
  function gv_mine(name) {
    if (!name || name === "Air") return false;
    const s = String(name).toLowerCase();
    return s.indexOf("bedrock") < 0 && s.indexOf("barrier") < 0 && s.indexOf("spawner") < 0;
  }
  function gv_stand(x, y, z) {
    return !!gv_mine(gv_blk(x, y - 1, z)) && gv_air(x, y, z) && gv_air(x, y + 1, z);
  }
  function gv_look(pid) {
    let f = null;
    try {
      f = api.getPlayerFacingInfo(pid);
    } catch (e) {}
    const p = gv_pos(pid);
    if (f && f.camPos) return { c: f.camPos, d: f.dir ? gv_norm(f.dir) : facing(pid) };
    return p ? { c: [p[0], p[1] + 1.45, p[2]], d: facing(pid) } : null;
  }
  function gv_aim(pid, range) {
    const l = gv_look(pid);
    if (!l) return null;
    for (let t = 1; t <= range; t++) {
      const x = Math.floor(l.c[0] + l.d[0] * t),
        y = Math.floor(l.c[1] + l.d[1] * t),
        z = Math.floor(l.c[2] + l.d[2] * t);
      if (!gv_air(x, y, z)) return [x + 0.5, y + 1, z + 0.5];
    }
    return [l.c[0] + l.d[0] * range, l.c[1] + l.d[1] * range, l.c[2] + l.d[2] * range];
  }
  function gv_focus(pid, range) {
    const l = gv_look(pid);
    if (!l) return null;
    const ids = entitiesIn(
      [l.c[0] - range, l.c[1] - range, l.c[2] - range],
      [l.c[0] + range, l.c[1] + range, l.c[2] + range],
    );
    for (const id of ids) {
      if (!id || id === pid) continue;
      const p = gv_pos(id);
      if (!p) continue;
      const v = [p[0] - l.c[0], p[1] + 0.9 - l.c[1], p[2] - l.c[2]],
        len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
      if ((v[0] * l.d[0] + v[1] * l.d[1] + v[2] * l.d[2]) / len > 0.88) return { id, pos: p };
    }
    return null;
  }
  function gv_pick(pid) {
    const l = gv_look(pid);
    if (!l) return null;
    let block = null;
    for (let t = 2 * 0.25; t <= 22; t += 0.25) {
      const x = Math.floor(l.c[0] + l.d[0] * t),
        y = Math.floor(l.c[1] + l.d[1] * t),
        z = Math.floor(l.c[2] + l.d[2] * t);
      if (gv_air(x, y, z)) continue;
      const name = gv_blk(x, y, z);
      if (name && gv_mine(name)) block = { name, pos: [x + 0.5, y + 0.5, z + 0.5], dist: t };
      break;
    }
    let ent = null,
      eDist = 1e9;
    const ids = entitiesIn(
      [l.c[0] - 22, l.c[1] - 22, l.c[2] - 22],
      [l.c[0] + 22, l.c[1] + 22, l.c[2] + 22],
    );
    for (const id of ids) {
      if (!id || id === pid) continue;
      const p = gv_pos(id);
      if (!p) continue;
      const v = [p[0] - l.c[0], p[1] + 0.9 - l.c[1], p[2] - l.c[2]],
        along = v[0] * l.d[0] + v[1] * l.d[1] + v[2] * l.d[2];
      if (along < 0.6 || along > 22) continue;
      const off = gv_dist(
        [l.c[0] + l.d[0] * along, l.c[1] + l.d[1] * along, l.c[2] + l.d[2] * along],
        [p[0], p[1] + 0.9, p[2]],
      );
      if (off > 0.9) continue;
      if (along < eDist) ((eDist = along), (ent = { id, pos: p, dist: along }));
    }
    if (block && ent)
      return ent.dist < block.dist ? { kind: "entity", ent } : { kind: "block", block };
    if (ent) return { kind: "entity", ent };
    if (block) return { kind: "block", block };
    return null;
  }
  function gv_room(pid) {
    return gvNum[pid] || 0;
  }
  function gv_budget(pid) {
    return gvLedger.size < 5000 && gv_room(pid) < 1000;
  }
  function gv_keep(id, pid) {
    gvLedger.set(id, { pid, at: gv_now() });
    gvNum[pid] = (gvNum[pid] || 0) + 1;
    return id;
  }
  function gv_free(id) {
    if (!id || id.gvpx) return;
    const m = gvLedger.get(id);
    gvLedger.delete(id);
    if (m && m.pid) gvNum[m.pid] = Math.max(0, (gvNum[m.pid] || 1) - 1);
    try {
      ct_off(id);
    } catch (e) {}
  }
  function gv_sweep() {
    const t = gv_now();
    for (const [id, m] of gvLedger) if (t - m.at > 900 * 50) gv_free(id);
  }
  function gv_probe(pid) {
    try {
      const p = gv_pos(pid);
      if (!p) return;
      const q = [Math.floor(p[0]), Math.floor(p[1]) - 1, Math.floor(p[2])];
      api.getBlock(q[0], q[1], q[2]);
      api.getPlayerFacingInfo(pid);
    } catch (e) {}
  }

  Object.assign(V, K, {
    gvVolley,
    gvHeld,
    gvPlanet,
    gvLock,
    gvLedger,
    gvNum,
    gv_now,
    gv_pos,
    gv_alive,
    gv_whisper,
    gv_stale,
    gv_dist,
    gv_norm,
    gv_lerp,
    gv_blk,
    gv_air,
    gv_mine,
    gv_stand,
    gv_look,
    gv_aim,
    gv_focus,
    gv_pick,
    gv_room,
    gv_budget,
    gv_keep,
    gv_free,
    gv_sweep,
    gv_probe,
  });
})(globalThis.FA);
