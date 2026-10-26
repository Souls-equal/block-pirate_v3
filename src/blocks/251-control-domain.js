// src/blocks/251-control-domain.js — CONTROL (Control Domain)
// Source lisible. Ce fichier est minifié + empaqueté par `npm run build:blocks`.
// NE PAS coller ce fichier directement dans un Code Block : utiliser code-blocks/pack-XX.js.

((t) => {
  const e = t.c,
    n = t.r,
    {
      api: c,
      damage: r,
      entitiesIn: o,
      run: s,
      sleep: i,
      eff: a,
      posOf: _,
      isAliveId: f,
      isSolid: l,
    } = (e.fx, e),
    { at: soundAt, point } = e.fx;
  // L'état partagé (__CT__) est créé par 250-control-state.js, évalué juste AVANT
  // dans le même pack. L'ancienne version attendait ce state avec 200 retries
  // asynchrones : si le bloc d'état n'était pas chargé, le handler n'était jamais
  // enregistré (d'où « cooldown only »). Ici l'ordre est garanti par le pack.
  !(function () {
    const r = globalThis.__CT__;
    if (!r || !r.ctCtl) {
      try {
        c.log("[FA][Control] __CT__.ctCtl absent : 250-control-state.js doit être évalué avant ce fichier");
      } catch (t) {}
      return;
    }
    const {
      ctCtl: o,
      ctCd: l,
      ctMesh: u,
      CT_R: C,
      CT_LIFE: p,
      CT_CD: T,
      CT_DOME: h,
      CT_BUILD: m,
      CT_TRAP_MS: A,
      CT_TRAP_SPD: M,
      CT_TRAP_MIN: y,
      CT_DUST: w,
      CT_CLOUD: E,
      CT_B_NEXT: D,
      CT_B_SEEK: v,
      CT_B_RAND: S,
      CT_B_REARM: k,
      CT_LIFT_N: b,
      CT_LIFT_MAX: I,
      CT_SND: P,
      CT_CYAN: R,
      CT_ICE: g,
      CT_DEEP: L,
      CT_PLUM: N,
      CT_NIGHT: O,
      CT_CLEAR: B,
      CT_STEAM: x,
      ct_now: F,
      ct_alive: U,
      ct_dist: z,
      ct_norm: W,
      ct_at: X,
      ct_people: j,
      ct_in: q,
      ct_free: G,
      ct_sweep: H,
      ct_new: K,
      ct_dome: Y,
      ct_lift_ring: J,
      ct_blocks: Q,
      ct_clouds: V,
      ct_dust: Z,
    } = r;
    function $(t) {
      try {
        c.setClientOption(t, "forcedCameraDirection", null);
      } catch (t) {}
      try {
        c.removeEffect(t, "Slowness");
      } catch (t) {}
      try {
        c.removeEffect(t, "Weakness");
      } catch (t) {}
    }
    function tt(t, e) {
      const n = o[t];
      if (!n || (e && n !== e) || !n.active) return !1;
      for (const t of n.meshes) G(t);
      for (const t of n.blocks) G(t.mesh);
      for (const t of n.trapped.keys()) $(t);
      return (
        n.trapped.clear(),
        (n.blocks = []),
        (n.meshes = []),
        (n.want = []),
        (n.active = !1),
        soundAt(n.center, P.close, 0.9, 0.9, 30),
        (l[t] = F() + T),
        n.disc || delete o[t],
        !0
      );
    }
    function et(t) {
      return {
        next: function () {
          if (o[t.pid] !== t || !t.active)
            return {
              done: !0,
            };
          if (!U(t.pid))
            return (
              tt(t.pid, t),
              {
                done: !0,
              }
            );
          t.t++;
          try {
            for (let e = 0; e < m && t.want.length; e++) {
              const e = t.want.shift(),
                n = K(h, e.size, t.pid, e.pos, e.rot);
              n && t.meshes.push(n);
            }
            (t.lifted || ((t.lifted = 1), J(t)),
              Q(t),
              (function (t) {
                const e = new Set();
                for (const n of j(t.center, t.r)) {
                  if (n === t.pid) continue;
                  const r = _(n);
                  if (!r) continue;
                  e.add(n);
                  let o = t.trapped.get(n);
                  if (!o) {
                    o = {
                      a: Math.atan2(r[2] - t.center[2], r[0] - t.center[0]),
                      r: Math.max(y, Math.min(t.r - 2.5, Math.hypot(r[0] - t.center[0], r[2] - t.center[2]))),
                      hold: 1,
                      until: t.t + 40,
                      nextEff: 0,
                    };
                    t.trapped.set(n, o);
                  } else if (o.hold && t.t >= o.until) {
                    o.hold = 0;
                    o.until = t.t + 60;
                    $(n);
                  } else if (!o.hold && t.t >= o.until) {
                    o.a = Math.atan2(r[2] - t.center[2], r[0] - t.center[0]);
                    o.r = Math.max(y, Math.min(t.r - 2.5, Math.hypot(r[0] - t.center[0], r[2] - t.center[2])));
                    o.hold = 1;
                    o.until = t.t + 32;
                  }
                  if (!o.hold) continue;
                  if (t.t >= o.nextEff) {
                    o.nextEff = t.t + 36;
                    a(n, "Slowness", 1600, { inbuiltLevel: 1 });
                    a(n, "Weakness", 1600, { inbuiltLevel: 1 });
                  }
                  if (t.t % 3 === 0) {
                    try {
                      c.setClientOption(
                        n,
                        "forcedCameraDirection",
                        W([t.center[0] - r[0], t.center[1] + 1.5 - r[1], t.center[2] - r[2]]),
                      );
                    } catch (t) {}
                  }
                  o.a += 0.05 * M;
                  const s = t.center[0] + o.r * Math.cos(o.a),
                    i = t.center[2] + o.r * Math.sin(o.a),
                    f = t.center[1] + 2 + 0.7 * Math.sin(2 * o.a);
                  try {
                    c.setPosition(n, s, f, i);
                  } catch (t) {}
                  if (t.t % 2 === 0) {
                    point([s, f, i], {
                      tex: "soul_0",
                      count: 2,
                      life: [0.3, 0.6],
                      size: [0.8, 1.4],
                      power: [0.05, 0.2],
                      dir: [0, 0.1, 0],
                      dirSpread: 0.05,
                      colors: [
                        [...N, 1],
                        [...O, 0],
                      ],
                    });
                  }
                }
                for (const n of Array.from(t.trapped.keys()))
                  e.has(n) || ($(n), t.trapped.delete(n));
              })(t),
              t.t % w < 1 && Z(t),
              t.t % E < 1 && V(t),
              t.t % 200 < 1 && H());
          } catch (t) {}
          return t.t >= p
            ? (tt(t.pid, t),
              {
                done: !0,
              })
            : {
                value: i(1),
                done: !1,
              };
        },
      };
    }
    Object.assign(n, {
      onPlayerClickControlDomain: function (t, e) {
        if (!f(t)) return !1;
        const n = o[t];
        if (n && n.active) return (tt(t, n), !0);
        if (l[t] && F() < l[t]) return (soundAt(t, P.launch, 0.6, 0.5, 20), !0);
        const r = _(t);
        if (!r) return !0;
        const i = n || {
          pid: t,
          t: 0,
          active: !1,
          center: r.slice(),
          r: C,
          want: [],
          meshes: [],
          blocks: [],
          trapped: new Map(),
          disc: null,
          born: F(),
          lifted: 0,
          item: e,
        };
        ((i.center = r.slice()),
          (i.r = C),
          (i.t = 0),
          (i.lifted = 0),
          (i.born = F()),
          (i.want = Y(i.center, C)),
          (i.active = !0),
          (o[t] = i),
          soundAt(i.center, P.open, 1, 1, 40),
          soundAt(i.center, P.pulse, 0.8, 1.1, 34));
        try {
          c.shakePlayerCamera(t, 0.4, 900);
        } catch (t) {}
        return (V(i), Z(i), s(et(i)), !0);
      },
    });
  })();
})(globalThis.FA);
