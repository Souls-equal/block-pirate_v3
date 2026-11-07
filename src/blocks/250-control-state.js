// src/blocks/250-control-state.js — CONTROL (état partagé 1/2)
// Source lisible. Ce fichier est minifié + empaqueté par `npm run build:blocks`.
// NE PAS coller ce fichier directement dans un Code Block : utiliser code-blocks/pack-XX.js.

((t) => {
  const o = t.c,
    n = (t.r, o.fx),
    {
      api: e,
      damage: r,
      entitiesIn: s,
      impulse: c,
      isAliveId: a,
      posOf: i,
      isSolid: l,
      solidVoxel: sv,
      isMobAlive: mo,
      teleport: tp,
      eff: h,
    } = o,
    { box: u, point: f, create: _, move: M, remove: p, rotate: d, at: T } = n,
    C =
      globalThis.__CT__ ||
      (globalThis.__CT__ = {
        ctl: {},
        cd: {},
        ang: {},
        mesh: new Map(),
        blades: [],
      }),
    m = C.ctl,
    g = C.cd,
    b = C.ang,
    x = C.mesh,
    w = C.blades,
    A = 0.05,
    I = "Glass",
    P = 0.06,
    E = 1.08,
    B = {
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
    },
    F = [60, 220, 255],
    S = [255, 255, 255],
    k = [240, 248, 255];
  function D() {
    try {
      return e.now();
    } catch (t) {
      return Date.now();
    }
  }
  function y(t, o, n, e) {
    if (t)
      try {
        c(t, o[0] * n, e * n, o[2] * n);
      } catch (t) {}
  }
  function L(t, o) {
    const n = t[0] - o[0],
      e = t[1] - o[1],
      r = t[2] - o[2];
    return Math.sqrt(n * n + e * e + r * r);
  }
  function R(t) {
    const o = Math.sqrt(t[0] * t[0] + t[1] * t[1] + t[2] * t[2]);
    return o < 1e-4 ? [0, 1, 0] : [t[0] / o, t[1] / o, t[2] / o];
  }
  function z(t) {
    if (!t || "Air" === t) return !1;
    const o = String(t).toLowerCase();
    return o.indexOf("bedrock") < 0 && o.indexOf("barrier") < 0 && o.indexOf("spawner") < 0;
  }
  function q(t, o, n) {
    try {
      return e.getBlock(t, o, n);
    } catch (t) {
      return null;
    }
  }
  function O(t, o) {
    const n = [],
      e = s([t[0] - o, t[1] - o, t[2] - o], [t[0] + o, t[1] + o, t[2] + o]);
    for (const t of e) a(t) && n.push(t);
    return n;
  }
  function N(t, o) {
    return (
      x.set(t, {
        pid: o,
        at: D(),
      }),
      t
    );
  }
  function v(t) {
    if (t) {
      x.delete(t);
      try {
        p(t);
      } catch (t) {}
    }
  }
  function H(t, o, n, e, r) {
    if (x.size >= 220) return null;
    let s = null;
    try {
      s = _(t, o, n, I);
    } catch (t) {}
    return s ? (M(s.id, e[0], e[1], e[2]), r && d(s.id, r[0], r[1], r[2]), N(s.id, n)) : null;
  }
  function U(t, o, n) {
    for (let e = 3; e >= -6; e--) {
      const r = n + e,
        s = q(t, r, o);
      if (z(s) && l(t, r, o) && !l(t, r + 1, o))
        return {
          x: t,
          y: r,
          z: o,
          name: s,
        };
    }
    return null;
  }
  function G(t, o, n, e) {
    if (t.blocks.length >= 28) return !1;
    const r = [o.x + 0.5, o.y + 1, o.z + 0.5],
      s = H(o.name, e && e.debris ? 0.85 : 1.15, t.pid, r);
    if (!s) return !1;
    u([r[0] - 0.5, r[1], r[2] - 0.5], [r[0] + 0.5, r[1] + 1.2, r[2] + 0.5], {
      tex: "bubble",
      count: 4,
      life: [0.5, 1],
      power: [0.25, 0.6],
      size: [0.6, 1.2],
      dir: [0, 0.4, 0],
      dirSpread: 0.3,
      colors: [
        [...S, 0.9],
        [...F, 0],
      ],
    });
    const c = n || r;
    return (
      t.blocks.push({
        mesh: s,
        pid: t.pid,
        at: r,
        pos: r.slice(),
        top: r[1] + 3.8,
        state: 0,
        t: 0,
        r: (e && e.r) || 4.2 + 8.5 * Math.random(),
        spd: (Math.random() > 0.5 ? 1 : -1) * (0.5 + 0.45 * Math.random()),
        high: (e && e.high) || c[1] + 2.2 + 4.5 * Math.random(),
        ang: Math.random() * Math.PI * 2,
        next: t.t + ((e && e.next) || 24 + Math.floor(40 * Math.random())),
        foe: null,
        until: 0,
        rot: [0, 0, 0],
        spin: [2 * (Math.random() - 0.5), 2.5 * (Math.random() - 0.5), 2 * (Math.random() - 0.5)],
        dmg: (e && e.dmg) || 48,
        born: D(),
        short: e && e.short ? 100 : 440,
      }),
      !0
    );
  }
  function K(t, o, n) {
    const e = i(n);
    if (!e) return;
    r(n, o.dmg, t.pid, {
      crit: !0,
      broadcast: !0,
    });
    const s = e[0] - o.pos[0],
      c = e[2] - o.pos[2],
      a = Math.sqrt(s * s + c * c) || 1;
    (y(n, [s / a, 0, c / a], 24, 0.52), T(o.pos, B.ram, 0.9, 1.2, 22));
  }
  /* ---- PLACEMENTS SURS --------------------------------------------------
     Control Domain pose ses prisonniers en orbite avec setPosition. Rien
     n'empeche un point d'orbite de tomber dans une colline, un arbre ou un
     mur : la victime est alors ENFERMEE dans le bloc, et elle y reste apres la
     fin du dome (impossible de bouger, il faut mourir pour s'en sortir).
     Regle : on ne pose JAMAIS une cible dans un solide. Si le point voulu est
     plein, on cherche l'air le plus proche autour ; si toute la zone est
     solide, on ne bouge pas (rester sur place vaut mieux que finir au mur).
     `ct_unstick` est la sortie de secours a la liberation. */
  function ct_hard(t, o, n) {
    try {
      return !!sv(t, o, n);
    } catch (e) {}
    return !!l(t, o, n);
  }
  function ct_open(t, o, n) {
    return !ct_hard(t, o, n) && !ct_hard(t, o + 1, n);
  }
  /* Position de pieds libre la plus proche de `p` (rayon en couches, le
     vertical coute plus cher qu'un pas de cote). `null` = rien de libre. */
  function ct_spot(p, rad) {
    const R = rad === undefined ? 2 : rad,
      bx = Math.floor(p[0]),
      by = Math.floor(p[1]),
      bz = Math.floor(p[2]);
    if (ct_open(bx, by, bz)) return [p[0], p[1], p[2]];
    for (let r = 1; r <= R; r++) {
      let best = null,
        bestD = 1e9;
      for (let dx = -r; dx <= r; dx++)
        for (let dy = -r; dy <= r; dy++)
          for (let dz = -r; dz <= r; dz++) {
            if (Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) !== r) continue;
            const x = bx + dx,
              y = by + dy,
              z = bz + dz;
            if (!ct_open(x, y, z)) continue;
            const d = dx * dx + 2 * dy * dy + dz * dz;
            if (d < bestD) {
              bestD = d;
              best = [x + 0.5, y + 0.04, z + 0.5];
            }
          }
      if (best) return best;
    }
    return null;
  }
  /* Pose `id` pres de `p` sans jamais entrer dans un bloc. Rend le point
     reellement utilise, ou null si rien n'est libre (la cible ne bouge pas). */
  function ct_put(id, p, rad) {
    if (!id || !p) return null;
    const spot = ct_spot(p, rad);
    if (!spot) return null;
    return tp(id, spot[0], spot[1], spot[2]) === false ? null : spot;
  }
  /* Sortie de secours : si la cible est dans un bloc, on la remonte a l'air le
     plus proche. Cas normal = 2 lectures de bloc, donc appelable a chaque
     liberation sans cout. */
  function ct_unstick(id) {
    if (!id) return false;
    const p = i(id);
    if (!p) return false;
    if (ct_open(Math.floor(p[0]), Math.floor(p[1]), Math.floor(p[2]))) return false;
    const spot = ct_spot(p, 3);
    if (!spot) return false;
    return tp(id, spot[0], spot[1], spot[2]);
  }
  Object.assign(C, {
    ctCtl: m,
    ctCd: g,
    ctAng: b,
    ctMesh: x,
    ctBlades: w,
    CT_DT: A,
    CT_R: 18,
    CT_LIFE: 640,
    CT_CD: 15e3,
    CT_DOME: "Patterned Light Blue Glass",
    CT_FAKE: I,
    CT_TH: P,
    CT_ARC: E,
    CT_BUILD: 4,
    CT_MESH_MAX: 220,
    CT_SWEEP: 900,
    CT_TRAP_MS: 2e3,
    CT_TRAP_SPD: 0.45,
    CT_TRAP_MIN: 3.5,
    CT_DUST: 5,
    CT_CLOUD: 25,
    CT_LIFT_N: 12,
    CT_LIFT_MAX: 28,
    CT_LIFT_H: 3.8,
    CT_LIFT_T: 18,
    CT_HOVER: 440,
    CT_B_DMG: 48,
    CT_B_R: 2.4,
    CT_B_KB: 24,
    CT_B_UP: 0.52,
    CT_B_RAM: 11.5,
    CT_B_NEXT: 24,
    CT_B_SEEK: 30,
    CT_B_RAND: 40,
    CT_B_REARM: 60,
    CT_SND: B,
    CT_CYAN: F,
    CT_ICE: [220, 255, 255],
    CT_DEEP: [0, 100, 255],
    CT_PLUM: [140, 60, 255],
    CT_LILAC: [200, 120, 255],
    CT_NIGHT: [30, 0, 90],
    CT_CLEAR: S,
    CT_STEAM: k,
    ct_now: D,
    ct_kick: y,
    ct_alive: function (t) {
      if (!a(t)) return !1;
      try {
        const o = e.getHealth(t);
        if ("number" == typeof o && o <= 0) return !1;
      } catch (t) {}
      return !0;
    },
    ct_dist: L,
    ct_norm: R,
    ct_cross: function (t, o) {
      return [t[1] * o[2] - t[2] * o[1], t[2] * o[0] - t[0] * o[2], t[0] * o[1] - t[1] * o[0]];
    },
    ct_mine: z,
    ct_at: q,
    ct_victims: function (t, o) {
      const n = [];
      let r = [];
      try {
        r = e.getPlayerIds() || [];
      } catch (t) {}
      for (const e of r) {
        if (!a(e)) continue;
        const r = i(e);
        r && L(r, t) <= o && n.push(e);
      }
      /* Les mobs comptent aussi : un dome qui ne tient que les joueurs ne
         controle rien en PvE. `O` (ct_in) fait UNE requete spatiale puis filtre
         les vivants ; isMobAlive ecarte les PNJ (marchands, queteurs). */
      let box = [];
      try {
        box = O(t, o);
      } catch (t) {
        box = [];
      }
      for (const e of box) {
        if (n.indexOf(e) >= 0 || !mo(e)) continue;
        const r = i(e);
        r && L(r, t) <= o && n.push(e);
      }
      return n;
    },
    ct_in: O,
    ct_keep: N,
    ct_free: v,
    ct_sweep: function () {
      const t = D();
      for (const [o, n] of x) t - n.at > 45e3 && v(o);
    },
    ct_new: H,
    ct_new_box: function (t, o, n) {
      if (x.size >= 220) return null;
      let r = null;
      try {
        r = e.attemptCreateMeshEntity("Box", t, null, null, o);
      } catch (t) {}
      return r ? (M(r, n[0], n[1], n[2]), N(r, o)) : null;
    },
    ct_dome: function (t, o) {
      const n = [],
        e = [
          {
            lo: 0.35 * o,
            hi: o,
            up: 0.35 * o + 1.2,
            seg: 10,
            off: 0,
          },
          {
            lo: 0.33 * o,
            hi: 0.74 * o,
            up: (0.33 * o + 0.74 * o) / 2,
            seg: 8,
            off: Math.PI / 8,
          },
          {
            lo: 0.71 * o,
            hi: 0.96 * o,
            up: (0.71 * o + 0.96 * o) / 2,
            seg: 6,
            off: 0,
          },
        ];
      for (const r of e) {
        const e = Math.sqrt(Math.max(0, o * o - r.lo * r.lo)),
          s = Math.sqrt(Math.max(0, o * o - r.hi * r.hi)),
          c = (e + s) / 2,
          a = (r.hi - r.lo) * E,
          i = Math.atan2(e - s, r.hi - r.lo),
          l = ((2 * Math.PI * c) / r.seg) * E;
        for (let o = 0; o < r.seg; o++) {
          const e = (o / r.seg) * Math.PI * 2 + r.off;
          n.push({
            pos: [t[0] + c * Math.sin(e), t[1] + r.up, t[2] + c * Math.cos(e)],
            size: [+l.toFixed(2), +a.toFixed(2), P],
            rot: [i, e, 0],
          });
        }
      }
      const r = 2 * Math.sqrt(Math.max(0, o * o - Math.pow(0.96 * o, 2))) * E;
      return (
        n.push({
          pos: [t[0], t[1] + 0.98 * o, t[2]],
          size: [+r.toFixed(2), P, +r.toFixed(2)],
          rot: [0, 0, 0],
        }),
        n
      );
    },
    ct_open: ct_open,
    ct_spot: ct_spot,
    ct_put: ct_put,
    ct_unstick: ct_unstick,
    ct_pick: U,
    ct_catch: G,
    ct_lift_ring: function (t) {
      const o = t.center,
        n = Math.min(12, 28 - t.blocks.length);
      if (n <= 0) return;
      const e = Math.floor(o[0]),
        r = Math.floor(o[1]),
        s = Math.floor(o[2]);
      let c = 0;
      for (let a = 0; a < 12 && c < n; a++) {
        const n = (a / 12) * Math.PI * 2 + (0.4 * Math.random() - 0.2),
          i = 3.5 + (a % 4) * 2.8,
          l = U(Math.floor(e + i * Math.cos(n)), Math.floor(s + i * Math.sin(n)), r);
        l && G(t, l, o) && c++;
      }
      T(o, B.lift, 1, 1.1, 26);
    },
    ct_pound: K,
    ct_blocks: function (t) {
      const o = t.center;
      for (let n = t.blocks.length - 1; n >= 0; n--) {
        const e = t.blocks[n];
        if (D() - e.born > 50 * e.short) (v(e.mesh), t.blocks.splice(n, 1));
        else {
          if (0 === e.state) {
            e.t++;
            const t = Math.min(1, e.t / 18);
            ((e.pos[1] = e.at[1] + (e.top - e.at[1]) * t), t >= 1 && (e.state = 1));
          } else if (1 === e.state) {
            e.ang += e.spd * A;
            const n = o[0] + e.r * Math.cos(e.ang),
              r = e.high + 0.8 * Math.sin(2 * e.ang),
              s = o[2] + e.r * Math.sin(e.ang),
              c = Math.min(1, 0.125);
            if (
              ((e.pos[0] += (n - e.pos[0]) * c),
              (e.pos[1] += (r - e.pos[1]) * c),
              (e.pos[2] += (s - e.pos[2]) * c),
              t.t > e.next)
            ) {
              const n = O(o, t.r);
              ((e.foe = n.find((o) => o !== t.pid) || null),
                e.foe ? ((e.state = 2), (e.until = D() + 3500)) : (e.next = t.t + 30));
            }
          } else {
            const n = e.foe && a(e.foe) ? i(e.foe) : null;
            if (!n || L(n, o) > t.r + 1.5 || D() > e.until)
              ((e.state = 1), (e.foe = null), (e.next = t.t + 30));
            else {
              const o = [n[0] - e.pos[0], n[1] + 0.9 - e.pos[1], n[2] - e.pos[2]];
              if (Math.sqrt(o[0] * o[0] + o[1] * o[1] + o[2] * o[2]) <= 2.4)
                (K(t, e, e.foe),
                  (e.state = 1),
                  (e.foe = null),
                  (e.ang = Math.random() * Math.PI * 2),
                  (e.next = t.t + 60));
              else {
                const t = R(o),
                  n = 11.5 * A;
                ((e.pos[0] += t[0] * n), (e.pos[1] += t[1] * n), (e.pos[2] += t[2] * n));
              }
            }
          }
          ((e.rot[0] += e.spin[0] * A),
            (e.rot[1] += e.spin[1] * A),
            (e.rot[2] += e.spin[2] * A),
            M(e.mesh, e.pos[0], e.pos[1], e.pos[2]),
            d(e.mesh, e.rot[0], e.rot[1], e.rot[2]));
        }
      }
    },
    ct_clouds: function (t) {
      const o = t.center,
        n = t.r,
        e = (n + Math.sqrt(Math.max(0, n * n - Math.pow(0.35 * n, 2)))) / 2,
        r = ((2 * Math.PI * e) / 10) * E;
      for (let t = 0; t < 10; t++) {
        const n = (t / 10) * Math.PI * 2,
          s = o[0] + e * Math.sin(n),
          c = o[2] + e * Math.cos(n),
          a = Math.cos(n),
          i = -Math.sin(n);
        for (const t of [-0.36, -0.12, 0.12, 0.36]) {
          const n = s + t * r * a,
            e = c + t * r * i;
          u([n - 0.7, o[1] - 0.05, e - 0.7], [n + 0.7, o[1] + 1.1, e + 0.7], {
            tex: "bubble",
            count: 2,
            life: [2, 3.2],
            power: [0.03, 0.3],
            size: [5.4, 9.6],
            dir: [-0.03, 0.12, -0.03],
            dirSpread: 0.06,
            colors: [
              [...S, 0.95],
              [...k, 0.85],
              [...k, 0],
            ],
          });
        }
      }
    },
    ct_dust: function (t) {
      const o = t.center,
        n = t.r;
      for (let t = 0; t < 2; t++) {
        const t = Math.random() * Math.PI * 2,
          e = Math.random() * n * 0.85;
        f([o[0] + Math.cos(t) * e, o[1] + 0.6 + Math.random() * n * 0.7, o[2] + Math.sin(t) * e], {
          tex: "bubble",
          count: 1,
          life: [2.2, 3.8],
          size: [0.4, 0.85],
          power: [0.03, 0.1],
          dir: [0, 0.05, 0],
          dirSpread: 0.03,
          colors: [
            [...S, 0.9],
            [...k, 0],
          ],
        });
      }
    },
  });
})(globalThis.FA);
