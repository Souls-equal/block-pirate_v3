// src/blocks/253-control-shambles.js — CONTROL (Shambles + leave)
// Source lisible. Ce fichier est minifié + empaqueté par `npm run build:blocks`.
// NE PAS coller ce fichier directement dans un Code Block : utiliser code-blocks/pack-XX.js.

((FA) => {
  /* source : ce fichier est regroupé avec d'autres dans un pack par le build. */ const C = FA.c,
    R = FA.r,
    F = C.fx,
    {
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
    } = C,
    mesh = F,
    sound = F,
    ct_mesh = F.create,
    ct_to = F.move,
    ct_off = F.remove,
    ct_tilt = F.rotate,
    ct_preset = F.playParticle,
    soundAt = F.at,
    tf_create = F.create,
    tf_move = F.move,
    tf_remove = F.remove,
    tf_turn = F.rotate;
  /* état Control partagé entre les blocs Control */
  const CT =
    globalThis.__CT__ ||
    (globalThis.__CT__ = { ctl: {}, cd: {}, ang: {}, mesh: new Map(), blades: [] });
  const ctCtl = CT.ctl,
    ctCd = CT.cd,
    ctAng = CT.ang,
    ctMesh = CT.mesh,
    ctBlades = CT.blades;
  const CT_DT = 0.05;
  const CT_R = 30,
    CT_LIFE = 640,
    CT_CD = 15000;
  const CT_DOME = "Patterned Light Blue Glass",
    CT_FAKE = "Glass",
    CT_TH = 0.06,
    CT_ARC = 1.08;
  const CT_BUILD = 4,
    CT_MESH_MAX = 220,
    CT_SWEEP = 900;
  const CT_TRAP_MS = 2000,
    CT_TRAP_SPD = 0.45,
    CT_TRAP_MIN = 3.5,
    CT_DUST = 5,
    CT_CLOUD = 25;
  const CT_LIFT_N = 12,
    CT_LIFT_MAX = 28,
    CT_LIFT_H = 3.8,
    CT_LIFT_T = 18,
    CT_HOVER = 440;
  const CT_B_DMG = 48,
    CT_B_R = 2.4,
    CT_B_KB = 24,
    CT_B_UP = 0.52,
    CT_B_RAM = 11.5;
  const CT_B_NEXT = 24,
    CT_B_SEEK = 30,
    CT_B_RAND = 40,
    CT_B_REARM = 60;
  const CT_S_DMG = 42,
    CT_S_DMG_R = 85,
    CT_S_SPD = 30,
    CT_S_SPD_R = 26,
    CT_S_RNG = 32,
    CT_S_RNG_R = 48;
  const CT_S_LIFE = 26,
    CT_S_SIZE = 2.6,
    CT_S_SIZE_R = 8.5,
    CT_S_KB = 16,
    CT_S_KB_R = 28,
    CT_S_UP = 0.25;
  const CT_S_DEB = 60,
    CT_S_B_DMG = 28;
  const CT_ANG = [-35, 35, -20, 20, 0];
  const CT_D_FLY = 100,
    CT_D_TOT = 140,
    CT_D_SPD = 9,
    CT_D_DMG = 55,
    CT_D_DMG_R = 85;
  const CT_D_PULL = 13,
    CT_D_BLK = 15,
    CT_D_R = 16,
    CT_D_R_R = 18,
    CT_D_KB = 24,
    CT_D_UP = 0.75;
  const CT_SND = {
    open: "futureStrangePulse",
    pulse: "magicAccent4",
    close: "pulseFromTheDark",
    lift: "magicAccent1",
    ram: "cannonFire1",
    swing: "bigDrumSwish1",
    swingRoom: "cannonFire2",
    cut: "critical_hit",
    launch: "magicAccent3",
    burst: "cannonFire2",
    arrive: "magicAccent4",
  };
  const CT_CYAN = [60, 220, 255],
    CT_ICE = [220, 255, 255],
    CT_DEEP = [0, 100, 255];
  const CT_PLUM = [140, 60, 255],
    CT_LILAC = [200, 120, 255],
    CT_NIGHT = [30, 0, 90];
  const CT_CLEAR = [255, 255, 255],
    CT_STEAM = [240, 248, 255];

  function ct_now() {
    try {
      return api.now();
    } catch (e) {
      return Date.now();
    }
  }

  function ct_kick(id, dir, power, up) {
    if (!id) return;
    try {
      impulse(id, dir[0] * power, up * power, dir[2] * power);
    } catch (e) {}
  }

  function ct_alive(pid) {
    if (!isAliveId(pid)) return false;
    try {
      const h = api.getHealth(pid);
      if (typeof h === "number" && h <= 0) return false;
    } catch (e) {}
    return true;
  }

  function ct_dist(a, b) {
    const x = a[0] - b[0],
      y = a[1] - b[1],
      z = a[2] - b[2];
    return Math.sqrt(x * x + y * y + z * z);
  }

  function ct_norm(v) {
    const l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return l < 1e-4 ? [0, 1, 0] : [v[0] / l, v[1] / l, v[2] / l];
  }

  function ct_in(c, r) {
    const out = [];
    const ids = entitiesIn([c[0] - r, c[1] - r, c[2] - r], [c[0] + r, c[1] + r, c[2] + r]);
    for (let i = 0; i < ids.length; i++) if (isAliveId(ids[i])) out.push(ids[i]);
    return out;
  }

  function ct_keep(id, pid) {
    ctMesh.set(id, { pid: pid, at: ct_now() });
    return id;
  }

  function ct_free(id) {
    if (!id) return;
    ctMesh.delete(id);
    ct_off(id);
  }

  function ct_new_box(o, pid, pos) {
    if (ctMesh.size >= CT_MESH_MAX) return null;
    let id = null;
    try {
      id = api.attemptCreateMeshEntity("Box", o, null, null, pid);
    } catch (e) {
      id = null;
    }
    if (!id) return null;
    ct_to(id, pos[0], pos[1], pos[2]);
    return ct_keep(id, pid);
  }

  function ct_letgo(id) {
    try {
      api.setClientOption(id, "forcedCameraDirection", null);
    } catch (e) {}
    try {
      api.removeEffect(id, "Slowness");
    } catch (e) {}
    try {
      api.removeEffect(id, "Weakness");
    } catch (e) {}
  }
  function ct_burst(st, pos, room) {
    const ids = ct_in(pos, room ? CT_D_R_R : CT_D_R);
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      if (id === st.pid) continue;
      const p = posOf(id);
      if (!p) continue;
      damage(id, room ? CT_D_DMG_R : CT_D_DMG, st.pid, { crit: true, broadcast: true });
      const dx = p[0] - pos[0],
        dz = p[2] - pos[2];
      const l = Math.sqrt(dx * dx + dz * dz) || 1;
      ct_kick(id, [dx / l, 0, dz / l], CT_D_KB, CT_D_UP);
    }
    boom(pos, 3, {
      count: 26,
      power: [3, 9],
      size: [0.6, 1.6],
      life: [0.35, 0.9],
      colors: [
        [CT_LILAC[0], CT_LILAC[1], CT_LILAC[2], 1],
        [CT_NIGHT[0], CT_NIGHT[1], CT_NIGHT[2], 0],
      ],
    });
    ct_preset(pos, "purpleFirecrackerLarge", 2.5);
    ct_preset(pos, "cyanFirecrackerLarge", 2);
    sound.at(pos, CT_SND.burst, 1, 1, 34);
    try {
      api.shakePlayerCamera(st.pid, 0.6, 650);
    } catch (e) {}
    if (room) {
      for (let i = 0; i < st.blocks.length; i++) {
        const b = st.blocks[i];
        b.pos[1] += 4 + Math.random() * 2;
        b.state = 1;
        b.foe = null;
        b.ang = Math.random() * Math.PI * 2;
        b.next = st.t + 30;
        b.spin = [(Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6];
      }
    }
  }

  function ct_disc_off(st) {
    if (!st.disc) return;
    ct_free(st.disc.mesh);
    st.disc = null;
    if (!st.active) delete ctCtl[st.pid];
  }

  function ct_disc_co(st) {
    const d = st.disc;
    return {
      next: function () {
        if (st.disc !== d) return { done: true };
        if (!ct_alive(st.pid)) {
          ct_disc_off(st);
          return { done: true };
        }
        d.t++;
        try {
          if (d.t <= CT_D_FLY) {
            if (d.homing && st.active) {
              const to = [
                st.center[0] - d.pos[0],
                st.center[1] + 2.5 - d.pos[1],
                st.center[2] - d.pos[2],
              ];
              const l = ct_dist(to, [0, 0, 0]);
              if (l > 0.8) {
                const n = ct_norm(to),
                  step = Math.min(l, CT_D_SPD * CT_DT);
                d.pos[0] += n[0] * step;
                d.pos[1] += n[1] * step;
                d.pos[2] += n[2] * step;
              } else d.pos[1] = st.center[1] + 2.5 + Math.sin(d.t * 0.3) * 0.4;
            } else if (!d.wall) {
              const step = CT_D_SPD * CT_DT;
              const nx = d.pos[0] + d.dir[0] * step,
                ny = d.pos[1] + d.dir[1] * step,
                nz = d.pos[2] + d.dir[2] * step;
              if (isSolid(Math.floor(nx), Math.floor(ny), Math.floor(nz))) d.wall = 1;
              else {
                d.pos[0] = nx;
                d.pos[1] = ny;
                d.pos[2] = nz;
              }
            }
            ct_to(d.mesh, d.pos[0], d.pos[1], d.pos[2]);
            const a = (d.t * CT_DT) % (Math.PI * 2);
            for (let i = 0; i < 2; i++) {
              const t2 = a + i * Math.PI;
              point([d.pos[0] + 0.75 * Math.cos(t2), d.pos[1], d.pos[2] + 0.75 * Math.sin(t2)], {
                r: 0.1,
                tex: TEX.soul,
                count: 1,
                life: [0.35, 0.55],
                size: [0.7, 1.1],
                power: [0.02, 0.06],
                dir: [0, 0, 0],
                dirSpread: 0.02,
                colors: [[0, 240, 255, 1], CT_ICE, [0, 80, 220, 0]],
              });
            }
          } else if (d.t <= CT_D_TOT) {
            if (!d.pulled) {
              d.pulled = 1;
              sound.at(d.pos, CT_SND.arrive, 1, 1.2, 30);
            }
            ct_to(d.mesh, d.pos[0], d.pos[1], d.pos[2]);
            const near = ct_in(d.pos, d.homing ? CT_R : CT_D_R);
            for (let i = 0; i < near.length; i++) {
              const id = near[i];
              if (id === st.pid) continue;
              const p = posOf(id);
              if (!p) continue;
              const to = [d.pos[0] - p[0], d.pos[1] + 0.3 - p[1], d.pos[2] - p[2]];
              if (ct_dist(to, [0, 0, 0]) <= 0.6) continue;
              const n = ct_norm(to),
                step = CT_D_PULL * CT_DT;
              try {
                api.setPosition(id, p[0] + n[0] * step, p[1] + n[1] * step, p[2] + n[2] * step);
              } catch (e) {}
            }
            if (d.homing && st.active) {
              for (let i = 0; i < st.blocks.length; i++) {
                const b = st.blocks[i];
                const to = [d.pos[0] - b.pos[0], d.pos[1] - b.pos[1], d.pos[2] - b.pos[2]];
                if (ct_dist(to, [0, 0, 0]) <= 0.8) continue;
                const n = ct_norm(to),
                  step = CT_D_BLK * CT_DT;
                b.pos[0] += n[0] * step;
                b.pos[1] += n[1] * step;
                b.pos[2] += n[2] * step;
                b.state = 1;
                b.foe = null;
              }
              if (d.t % 4 === 0) ct_preset(d.pos, "aura", 1.2);
            }
          } else {
            const at = [d.pos[0], d.pos[1], d.pos[2]];
            const room = !!(d.homing && st.active);
            ct_disc_off(st);
            ct_burst(st, at, room);
            return { done: true };
          }
        } catch (e) {}
        return { value: sleep(1), done: false };
      },
    };
  }

  function onPlayerClickControlShambles(pid, itemName) {
    if (!isAliveId(pid)) return false;
    let f = null;
    try {
      f = api.getPlayerFacingInfo(pid);
    } catch (e) {
      f = null;
    }
    if (!f || !f.camPos || !f.dir) return true;
    let st = ctCtl[pid];
    if (!st) {
      st = {
        pid: pid,
        t: 0,
        active: false,
        center: [f.camPos[0], f.camPos[1], f.camPos[2]],
        r: CT_R,
        want: [],
        meshes: [],
        blocks: [],
        trapped: new Map(),
        disc: null,
        born: ct_now(),
        lifted: 1,
        item: itemName,
      };
      ctCtl[pid] = st;
    }
    if (st.disc) ct_disc_off(st);
    st = ctCtl[pid] || st;
    const dir = ct_norm(f.dir);
    const start = [
      f.camPos[0] + dir[0] * 1.5,
      f.camPos[1] + dir[1] * 1.5,
      f.camPos[2] + dir[2] * 1.5,
    ];
    const room = !!(st.active && ct_dist(f.camPos, st.center) <= st.r);
    const mesh = ct_new_box(
      {
        width: room ? 2.4 : 1.8,
        height: 0.15,
        depth: room ? 2.4 : 1.8,
        diffuseColor: room ? [120, 40, 255] : [0, 230, 255],
        emissiveColor: room ? [200, 100, 255] : [100, 255, 255],
        autoRotate: true,
        texture: room ? "Blue Portal" : undefined,
      },
      pid,
      start,
    );
    st.disc = { mesh: mesh, pos: start, dir: dir, t: 0, homing: room, wall: 0, pulled: 0 };
    sound.at(start, CT_SND.launch, 1, 1, 26);
    try {
      api.shakePlayerCamera(pid, 0.25, 300);
    } catch (e) {}
    run(ct_disc_co(st));
    return true;
  }

  function onPlayerLeaveControl(pid) {
    const st = ctCtl[pid];
    if (st) {
      for (const id of st.trapped.keys()) ct_letgo(id);
      st.trapped.clear();
      for (let i = 0; i < st.meshes.length; i++) ct_free(st.meshes[i]);
      for (let i = 0; i < st.blocks.length; i++) ct_free(st.blocks[i].mesh);
      if (st.disc) ct_free(st.disc.mesh);
      st.blocks = [];
      st.meshes = [];
      st.want = [];
      st.disc = null;
      st.active = false;
      delete ctCtl[pid];
    }
    for (let i = ctBlades.length - 1; i >= 0; i--) {
      const s = ctBlades[i];
      if (s.pid !== pid) continue;
      s.dead = 1;
      ct_free(s.mesh);
      s.mesh = null;
      for (let j = 0; j < s.deb.length; j++) ct_free(s.deb[j].mesh);
      s.deb = [];
      ctBlades.splice(i, 1);
    }
    delete ctCd[pid];
    delete ctAng[pid];
    for (const [id, m] of Array.from(ctMesh)) if (m.pid === pid) ct_free(id);
    return true;
  }

  Object.assign(R, { onPlayerClickControlShambles, onPlayerLeaveControl });
})(globalThis.FA);
