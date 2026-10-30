// src/blocks/263-gravity-grab.js — GRAVITY (Grab / Planet / Leave)
// Source lisible. Ce fichier est minifié + empaqueté par `npm run build:blocks`.
// NE PAS coller ce fichier directement dans un Code Block : utiliser code-blocks/pack-XX.js.

((FA) => {
  const C = FA.c,
    R = FA.r,
    F = C.fx,
    V = globalThis.__GV__;
  const { api, damage, entitiesIn, run, sleep, knockBack, facing, teleport } = C;
  if (!V || !V.gvVolley) {
    try {
      api.log("[FA] Gravity commun absent avant Gravity(4)");
    } catch (e) {}
  }
  const { at: soundAt } = F;
  const {
    GV_G_RANGE,
    GV_G_HOLD,
    GV_G_THROW,
    GV_G_DMG,
    GV_G_SHARD,
    GV_G_SPLASH,
    GV_G_CD,
    GV_G_HIGH,
    GV_G_LERP,
    GV_G_SIGHT,
    GV_G_MAXD,
    GV_G_KB,
    GV_P_R,
    GV_P_N,
    GV_P_SHELL,
    GV_P_RISE,
    GV_P_FORM,
    GV_P_BATCH,
    GV_P_CHARGE,
    GV_P_SPD,
    GV_P_IMPACT,
    GV_P_DMG,
    GV_P_KB,
    GV_P_AIM,
    GV_P_LAND,
    GV_P_HITS,
    GV_P_ALT,
    GV_P_FLOOR,
    GV_ROT0,
    GV_ROT1,
    GV_ROT2,
    GV_SND,
  } = V;
  const {
    gvHeld,
    gvPlanet,
    gvLock,
    gvLedger,
    gvVolley,
    gv_now,
    gv_pos,
    gv_alive,
    gv_dist,
    gv_norm,
    gv_lerp,
    gv_blk,
    gv_stand,
    gv_air,
    gv_mine,
    gv_look,
    gv_aim,
    gv_focus,
    gv_room,
    gv_budget,
    gv_keep,
    gv_free,
    gv_sweep,
    gv_new,
    gv_core,
    gv_pick,
    gv_cast,
    gv_lift,
    gv_trail,
    gv_orb,
    gv_pulse,
    gv_vortex,
    gv_beam,
    gv_hold,
    gv_tether,
    gv_burst,
    gv_pose,
    gv_unpose,
    gv_blow,
    gv_slide,
    gv_whisper,
    gv_probe,
    gv_volley_co,
    gv_fly,
    gv_volley_end,
    gv_px,
    gv_stale,
  } = V;

  function gv_release_g(g) {
    const pid = g.pid;
    if (gvHeld[pid] === g) delete gvHeld[pid];
    if (g.mesh) {
      gv_free(g.mesh);
      g.mesh = null;
    }
    gvLock[pid] = gv_now() + GV_G_CD;
    return true;
  }
  function gv_grab_target(pid) {
    const l = gv_look(pid);
    return l
      ? [
          l.c[0] + l.d[0] * GV_G_SIGHT,
          l.c[1] + l.d[1] * GV_G_SIGHT + GV_G_HIGH,
          l.c[2] + l.d[2] * GV_G_SIGHT,
        ]
      : null;
  }
  function gv_hold_co(g) {
    return {
      next: function () {
        if (gvHeld[g.pid] !== g) return { done: true };
        if (!gv_alive(g.pid)) {
          gv_release_g(g);
          return { done: true };
        }
        g.t++;
        g.beat = gv_now();
        const c = gv_grab_target(g.pid);
        if (!c) {
          gv_release_g(g);
          return { done: true };
        }
        if (g.kind === "entity" && !gv_pos(g.id)) {
          gv_release_g(g);
          return { done: true };
        }
        const from = g.at;
        g.at = [
          gv_lerp(from[0], c[0], GV_G_LERP),
          gv_lerp(from[1], c[1], GV_G_LERP),
          gv_lerp(from[2], c[2], GV_G_LERP),
        ];
        g.dir = [c[0] - from[0], 0, c[2] - from[2]];
        if (g.kind === "entity") {
          /* teleport() = gardes bateau + crowd control : un admin immunise
             n'est pas aspire, et personne n'est traine en bateau. */
          teleport(g.id, g.at[0], g.at[1], g.at[2]);
          try {
            api.preventFallDamageNextGrounding(g.id);
          } catch (e2) {}
        } else {
          if (!g.mesh) {
            gv_release_g(g);
            return { done: true };
          }
          gv_slide(g.mesh, g.at[0], g.at[1], g.at[2]);
        }
        gv_hold(g.at);
        const me = gv_pos(g.pid);
        if (me) gv_tether([me[0], me[1] + 1.4, me[2]], g.at);
        if (g.t >= GV_G_HOLD) {
          gv_release_g(g);
          return { done: true };
        }
        return { value: sleep(1), done: false };
      },
    };
  }
  function gv_shard_co(g) {
    return {
      next: function () {
        let left = 0;
        for (const sd of g.shards) {
          if (sd.done) continue;
          left++;
          sd.at = [
            sd.at[0] + sd.d[0] * GV_G_THROW,
            sd.at[1] + sd.d[1] * GV_G_THROW,
            sd.at[2] + sd.d[2] * GV_G_THROW,
          ];
          sd.gone += GV_G_THROW;
          gv_slide(sd.mesh, sd.at[0], sd.at[1], sd.at[2]);
          gv_trail(sd.at, false);
          const foe = entitiesIn(
            [sd.at[0] - 2, sd.at[1] - 2, sd.at[2] - 2],
            [sd.at[0] + 2, sd.at[1] + 2, sd.at[2] + 2],
          );
          let touch = 0;
          for (const id of foe) if (id !== g.pid) touch = id;
          if (
            touch ||
            !gv_air(Math.floor(sd.at[0]), Math.floor(sd.at[1]), Math.floor(sd.at[2])) ||
            sd.gone >= GV_G_MAXD
          ) {
            sd.done = 1;
            if (sd.mesh) {
              gv_free(sd.mesh);
              sd.mesh = null;
            }
            gv_burst(sd.at, false);
            soundAt(g.pid, GV_SND.hit, 1, 1.2, 26);
            const ids = entitiesIn(
              [sd.at[0] - GV_G_SPLASH, sd.at[1] - GV_G_SPLASH, sd.at[2] - GV_G_SPLASH],
              [sd.at[0] + GV_G_SPLASH, sd.at[1] + GV_G_SPLASH, sd.at[2] + GV_G_SPLASH],
            );
            for (const id of ids) {
              if (!id || id === g.pid) continue;
              damage(id, GV_G_SHARD, g.pid);
              const p = gv_pos(id),
                d = gv_norm([sd.d[0], sd.d[1] + 0.35, sd.d[2]]);
              knockBack(id, d[0] * GV_G_KB, 24, d[2] * GV_G_KB);
              if (p) gv_lift(p);
            }
          }
        }
        if (!left) return { done: true };
        return { value: sleep(1), done: false };
      },
    };
  }
  function onPlayerClickGravityGrab(pid, itemName) {
    let g = gvHeld[pid];
    if (g && gv_stale(g)) {
      gv_release_g(g);
      g = null;
    }
    if (g) {
      const d = facing(pid);
      if (g.kind === "entity" && gv_pos(g.id)) {
        knockBack(g.id, d[0] * 20, Math.max(d[1], 0.2) * 20 + 5, d[2] * 20);
        damage(g.id, GV_G_DMG, pid);
        soundAt(pid, GV_SND.toss, 1, 1.1, 26);
        gv_pose(pid, "fire", 450);
      } else if (g.kind === "block" && g.mesh) {
        const dir = gv_norm([d[0], d[1] + 0.04, d[2]]);
        g.shards.push({
          mesh: g.mesh,
          at: [g.at[0] + dir[0] * 0.8, g.at[1] + dir[1] * 0.8, g.at[2] + dir[2] * 0.8],
          d: dir,
          gone: 0,
          done: 0,
        });
        g.mesh = null;
        soundAt(pid, GV_SND.toss, 1, 1.2, 26);
        gv_pose(pid, "fire", 450);
        run(gv_shard_co(g));
      }
      gv_release_g(g);
      return true;
    }
    if (gv_now() < (gvLock[pid] || 0)) {
      gv_whisper(pid, "Wait before using more");
      return false;
    }
    const hit = gv_pick(pid);
    if (!hit) {
      gv_probe(pid);
      gv_whisper(pid, "Nothing to hold enough closer");
      return false;
    }
    const rec = {
      pid,
      item: itemName,
      t: 0,
      beat: gv_now(),
      kind: hit.kind,
      id: null,
      mesh: null,
      at: null,
      dir: [0, 0, 1],
      shards: [],
    };
    if (hit.kind === "entity") {
      rec.id = hit.ent.id;
      rec.at = hit.ent.pos.slice();
      try {
        api.preventFallDamageNextGrounding(rec.id);
      } catch (e) {}
      soundAt(pid, GV_SND.grab, 1, 1, 24);
    } else {
      rec.mesh = gv_px();
      rec.at = hit.block.pos;
      gv_lift(hit.block.pos);
      soundAt(pid, GV_SND.grab, 1, 1.2, 24);
    }
    gvHeld[pid] = rec;
    const me = gv_pos(pid);
    if (me) gv_cast(me, false);
    run(gv_hold_co(rec));
    return true;
  }
  function gv_planet_end(p) {
    const pid = p.pid;
    if (gvPlanet[pid] === p) delete gvPlanet[pid];
    if (p.core) {
      gv_free(p.core);
      p.core = null;
    }
    for (const b of p.rising)
      if (b.mesh) {
        gv_free(b.mesh);
        b.mesh = null;
      }
    for (const b of p.blocks)
      if (b.mesh) {
        gv_free(b.mesh);
        b.mesh = null;
      }
    p.rising = [];
    p.blocks = [];
    gv_unpose(pid);
    return true;
  }
  function gv_extract(p) {
    const c = p.home,
      gx = Math.floor(c[0]),
      gz = Math.floor(c[2]),
      gy = Math.floor(c[1]) - 1,
      out = [],
      seen = {};
    for (let tries = 0; tries < GV_P_N * 24 && out.length < GV_P_N; tries++) {
      const a = Math.random() * Math.PI * 2,
        r = 2.5 + Math.sqrt(Math.random()) * (GV_P_R - 2.5),
        x = Math.floor(gx + r * Math.cos(a)),
        z = Math.floor(gz + r * Math.sin(a));
      let y = null;
      for (let k = 8; k >= -8 && y === null; k--) if (gv_stand(x, gy + k, z)) y = gy + k;
      if (y === null) continue;
      const key = x + "," + y + "," + z;
      if (seen[key]) continue;
      seen[key] = 1;
      const name = gv_blk(x, y - 1, z);
      if (!gv_mine(name)) continue;
      out.push({
        pos: [x + 0.5, y - 0.5, z + 0.5],
        name,
        theta: Math.random() * 6.28,
        phi: Math.acos(2 * Math.random() - 1),
        shell: 0.7 + Math.random() * (GV_P_SHELL - 0.7),
        spd: 0.8 + Math.random() * 0.5,
      });
    }
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)),
        t = out[i];
      out[i] = out[j];
      out[j] = t;
    }
    p.pending = out;
  }
  function gv_orbit(p, b, jitter) {
    const ang = b.theta + p.rot * b.spd;
    return [
      p.pos[0] + b.shell * Math.sin(b.phi) * Math.cos(ang) + jitter,
      p.pos[1] + b.shell * Math.cos(b.phi) + jitter,
      p.pos[2] + b.shell * Math.sin(b.phi) * Math.sin(ang) + jitter,
    ];
  }
  function gv_impact(p) {
    const at = p.pos;
    soundAt(at, GV_SND.land, 1, 0.8, 46);
    soundAt(at, GV_SND.hit, 1, 0.9, 40);
    gv_burst(at, true);
    const ids = entitiesIn(
      [at[0] - GV_P_IMPACT, at[1] - GV_P_IMPACT, at[2] - GV_P_IMPACT],
      [at[0] + GV_P_IMPACT, at[1] + GV_P_IMPACT, at[2] + GV_P_IMPACT],
    );
    for (const id of ids) {
      if (!id || id === p.pid) continue;
      const q = gv_pos(id),
        d = q ? gv_dist([q[0], q[1] + 0.9, q[2]], at) : 0,
        s = Math.max(GV_P_FLOOR, 1 - d / GV_P_IMPACT);
      damage(id, Math.round(GV_P_DMG * s), p.pid);
      if (q) {
        const v = gv_norm([q[0] - at[0], 0.75, q[2] - at[2]]);
        knockBack(id, v[0] * GV_P_KB * s, v[1] * GV_P_KB * s + 8, v[2] * GV_P_KB * s);
      }
    }
    for (const id of api.getPlayerIds() || []) {
      const q = gv_pos(id);
      if (!q) continue;
      const d = gv_dist(q, at);
      if (d <= 60)
        try {
          api.shakePlayerCamera(id, Math.max(0.25, 1 - d / 60), 2500);
        } catch (e) {}
    }
    gv_planet_end(p);
  }
  function gv_planet_co(p) {
    return {
      next: function () {
        if (gvPlanet[p.pid] !== p) return { done: true };
        if (!gv_alive(p.pid)) {
          gv_planet_end(p);
          return { done: true };
        }
        p.t++;
        p.beat = gv_now();
        try {
          if (p.phase === 0) {
            const k = Math.min(1, p.t / GV_P_RISE);
            p.pos = [p.start[0], gv_lerp(p.start[1], p.start[1] + GV_P_ALT, k), p.start[2]];
            gv_slide(p.core, p.pos[0], p.pos[1], p.pos[2]);
            gv_orb(p.pos);
            if (p.t % 3 === 0) gv_pulse(p.pos, 1.8);
            if (p.t >= GV_P_RISE) {
              p.phase = 1;
              p.t = 0;
              soundAt(p.pos, GV_SND.pull, 1, 0.9, 34);
              try {
                api.shakePlayerCamera(p.pid, 0.6, GV_P_FORM * 50);
              } catch (e) {}
              gv_pulse(p.pos, 5.5);
            }
          } else if (p.phase === 1) {
            p.rot += GV_ROT0;
            if (p.t % 2 === 0) gv_orb(p.pos);
            const every = Math.max(
              1,
              Math.round(GV_P_FORM / Math.max(1, p.pending.length / GV_P_BATCH)),
            );
            if (p.t % every === 0 && p.pending.length)
              for (let i = 0; i < GV_P_BATCH && p.pending.length; i++) {
                const e = p.pending.pop();
                if (!e || !gv_budget(p.pid)) break;
                const m = gv_new(e.name, 1.05, p.pid, e.pos);
                if (!m) continue;
                gv_lift(e.pos);
                gv_beam(e.pos, p.pos);
                p.rising.push({
                  mesh: m,
                  from: e.pos,
                  at: e.pos.slice(),
                  theta: e.theta,
                  phi: e.phi,
                  shell: e.shell,
                  spd: e.spd,
                  t: 0,
                  rise: 3 + Math.floor(Math.random() * 4),
                });
              }
            for (let i = p.rising.length - 1; i >= 0; i--) {
              const b = p.rising[i];
              b.t++;
              const k = Math.min(1, b.t / b.rise),
                e = k * k * (3 - 2 * k),
                t0 = gv_orbit(p, b, 0);
              b.at = [
                gv_lerp(b.from[0], t0[0], e),
                gv_lerp(b.from[1], t0[1], e),
                gv_lerp(b.from[2], t0[2], e),
              ];
              gv_slide(b.mesh, b.at[0], b.at[1], b.at[2]);
              if (k >= 1) {
                p.blocks.push({
                  mesh: b.mesh,
                  theta: b.theta,
                  phi: b.phi,
                  shell: b.shell,
                  spd: b.spd,
                });
                b.mesh = null;
                p.rising.splice(i, 1);
              }
            }
            if (p.t % 5 === 0) gv_vortex(p.pos, GV_P_SHELL * 0.85);
            if (p.t >= GV_P_FORM && !p.pending.length && !p.rising.length) {
              p.phase = 2;
              p.t = 0;
              try {
                api.shakePlayerCamera(p.pid, 0.75, GV_P_CHARGE * 50);
              } catch (e) {}
              soundAt(p.pos, GV_SND.toss, 1, 0.6, 34);
              gv_pulse(p.pos, 5.5);
            }
          } else if (p.phase === 2) {
            p.rot += GV_ROT1;
            gv_orb(p.pos);
            if (p.t % 2 === 0) gv_vortex(p.pos, GV_P_SHELL);
            for (const b of p.blocks) {
              const q = gv_orbit(p, b, 0.25 * (Math.random() - 0.5));
              gv_slide(b.mesh, q[0], q[1], q[2]);
            }
            if (p.t >= GV_P_CHARGE) {
              p.phase = 3;
              p.t = 0;
              soundAt(p.pos, GV_SND.launch, 1, 1, 40);
              gv_unpose(p.pid);
            }
          } else {
            p.rot += GV_ROT2;
            const d = gv_norm([p.to[0] - p.pos[0], p.to[1] - p.pos[1], p.to[2] - p.pos[2]]);
            if (gv_dist(p.pos, p.to) <= GV_P_LAND + GV_P_SPD) {
              gv_impact(p);
              return { done: true };
            }
            gv_slide(p.core, p.pos[0], p.pos[1], p.pos[2]);
            for (const b of p.blocks) {
              const q = gv_orbit(p, b, 0);
              gv_slide(b.mesh, q[0], q[1], q[2]);
            }
            gv_trail(p.pos, true);
            if (p.t % 3 === 0) gv_vortex(p.pos, 3.8);
            p.pos = [
              p.pos[0] + d[0] * GV_P_SPD,
              p.pos[1] + d[1] * GV_P_SPD,
              p.pos[2] + d[2] * GV_P_SPD,
            ];
            if (p.t > GV_P_HITS) {
              gv_planet_end(p);
              return { done: true };
            }
          }
          if (p.t % 200 === 0) gv_sweep();
        } catch (e) {}
        return { value: sleep(1), done: false };
      },
    };
  }
  function onPlayerClickGravityDevastation(pid, itemName) {
    if (!gv_alive(pid)) return false;
    const p0 = gvPlanet[pid];
    if (p0 && !gv_stale(p0)) {
      gv_whisper(pid, "Your planet is already here");
      return false;
    }
    if (p0) gv_planet_end(p0);
    const to = gv_aim(pid, GV_P_AIM),
      home = gv_pos(pid);
    if (!to || !home) return true;
    const start = [home[0], home[1] + 1.4, home[2]],
      p = {
        pid,
        item: itemName,
        t: 0,
        phase: 0,
        rot: 0,
        start,
        home,
        core: null,
        pos: start.slice(),
        to,
        pending: [],
        rising: [],
        blocks: [],
      };
    gvPlanet[pid] = p;
    p.core = gv_core(pid, start);
    gv_extract(p);
    gv_pose(pid, "raise", (GV_P_RISE + GV_P_FORM + GV_P_CHARGE) * 50 + 8000);
    gv_cast(home, true);
    soundAt(start, GV_SND.rise, 1, 0.8, 30);
    soundAt(start, GV_SND.far, 0.8, 0.9, 40);
    try {
      api.shakePlayerCamera(pid, 0.35, GV_P_RISE * 50);
    } catch (e) {}
    run(gv_planet_co(p));
    return true;
  }
  function onPlayerLeaveGravity(pid) {
    const v = gvVolley[pid];
    if (v) gv_volley_end(v, true);
    const g = gvHeld[pid];
    if (g) {
      for (const sd of g.shards)
        if (sd.mesh) {
          gv_free(sd.mesh);
          sd.mesh = null;
        }
      gv_release_g(g);
    }
    const p = gvPlanet[pid];
    if (p) gv_planet_end(p);
    gv_unpose(pid);
    for (const [id, m] of Array.from(gvLedger)) if (m.pid === pid) gv_free(id);
    delete gvLock[pid];
    return true;
  }
  Object.assign(R, {
    onPlayerClickGravityGrab,
    onPlayerClickGravityDevastation,
    onPlayerLeaveGravity,
  });
})(globalThis.FA);
