// src/blocks/310-rare-legendary-plus.js — NOUVELLES HABILITÉS (RARE & LEGENDARY I)
// Source lisible. Ce fichier est minifié + empaqueté par `npm run build:blocks`.
// NE PAS coller ce fichier directement dans un Code Block : utiliser code-blocks/pack-XX.js.

(FA => {
  const C = FA.c,
    R = FA.r,
    F = C.fx,
    {
      damage,
      eff,
      heal,
      hitArea,
      hitSeg,
      impulse,
      isAliveId,
      lifeforms,
      posOf,
      facing,
      targetBlock,
      teleport,
      boom,
      dist2,
      distH2,
      frame,
      GOLDEN,
      norm,
      point,
      ring,
      seg,
      TEX,
      run,
      sleep,
    } = C,
    sound = F;

  function flatDir(pid) {
    const d = facing(pid);
    return norm([d[0], 0, d[2]]);
  }

  function aimSpot(pid, maxDist) {
    const p = posOf(pid);
    if (!p) return null;
    const d = facing(pid);
    const ids = lifeforms(pid);
    let best = null,
      bestD2 = (maxDist + 2) * (maxDist + 2);
    for (let i = 0; i < ids.length; i++) {
      const q = posOf(ids[i]);
      if (!q) continue;
      const dx = q[0] - p[0],
        dy = q[1] + 0.9 - (p[1] + 1.2),
        dz = q[2] - p[2],
        d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > bestD2 || d2 < 0.04) continue;
      if ((dx * d[0] + dy * d[1] + dz * d[2]) / Math.sqrt(d2) >= 0.65) {
        bestD2 = d2;
        best = [q[0], q[1] + 0.5, q[2]];
      }
    }
    if (best) return best;
    const t = targetBlock(pid);
    if (t && dist2(p, t) <= maxDist * maxDist) return [t[0], t[1] + 0.5, t[2]];
    return [p[0] + d[0] * maxDist, p[1] + 0.5 + d[1] * maxDist * 0.35, p[2] + d[2] * maxDist];
  }

  function pushOut(center, radius, caster, kbH, kbY) {
    const r = radius + 1.5;
    const ids = lifeforms(caster);
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const q = posOf(id);
      if (!q || dist2(q, center) > r * r) continue;
      const dx = q[0] - center[0],
        dz = q[2] - center[2],
        d = Math.sqrt(dx * dx + dz * dz) || 1;
      impulse(id, (dx / d) * kbH, kbY, (dz / d) * kbH);
    }
  }

  // --------------------------------------------------------- RARE : LIGHT ---
  // Sacred Jewel Volley : couronne d'étoiles dorées qui bombarde la visée.
  function onPlayerClickSacredJewel(pid, itemName) {
    if (!isAliveId(pid)) return false;
    let volley = 0;
    run({
      next: function () {
        const p = posOf(pid);
        const tgt = aimSpot(pid, 15);
        if (!p || !tgt || volley >= 4) return { done: true };
        const a = volley * 1.57;
        const from = [p[0] + Math.cos(a) * 1.4, p[1] + 2.4, p[2] + Math.sin(a) * 1.4];
        const spot = [tgt[0] + Math.cos(a * 2) * 1.1, tgt[1], tgt[2] + Math.sin(a * 2) * 1.1];
        sound.at(pid, "magicAccent1", 0.7, 1.55 + volley * 0.08, 22);
        seg(from, spot, {
          r: 0.14,
          tex: TEX.glint,
          count: 8,
          life: [0.16, 0.34],
          size: [0.22, 0.44],
          colors: [
            [[255, 250, 140], [255, 215, 60]],
            [[255, 190, 20, 0], [255, 255, 200, 0]],
          ],
        });
        point(spot, {
          r: 0.45,
          tex: TEX.glint,
          count: 10,
          life: [0.18, 0.36],
          size: [0.26, 0.52],
          colors: [
            [[255, 255, 180], [255, 210, 50]],
            [[255, 180, 20, 0], [255, 255, 220, 0]],
          ],
        });
        hitArea(spot, 2.8, pid, itemName, 17, { height: 2.8 });
        volley++;
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // Mirror Kick : téléportation lumineuse suivie d'un coup de pied explosif.
  function onPlayerClickLightFlashStep(pid, itemName) {
    const p = posOf(pid);
    const dst = aimSpot(pid, 11);
    if (!p || !dst) return true;
    sound.at(p, "magicAccent3", 0.8, 1.65, 22);
    seg([p[0], p[1] + 1.0, p[2]], [dst[0], dst[1] + 1.0, dst[2]], {
      r: 0.18,
      tex: TEX.glint,
      count: 12,
      life: [0.2, 0.42],
      size: [0.25, 0.5],
      colors: [
        [[255, 250, 140], [255, 215, 50]],
        [[255, 190, 20, 0], [255, 255, 220, 0]],
      ],
    });
    teleport(pid, dst[0], dst[1] + 0.5, dst[2]);
    boom(dst, 2.0, {
      tex: TEX.glint,
      count: 22,
      colors: [
        [[255, 255, 180], [255, 210, 40]],
        [[255, 180, 10, 0], [255, 255, 220, 0]],
      ],
    });
    hitArea(dst, 3.8, pid, itemName, 60, { height: 3.0 });
    pushOut(dst, 3.8, pid, 1.6, 0.65);
    return true;
  }

  // -------------------------------------------------------- RARE : RUBBER ---
  // Jet Gatling : rafale d'impacts élastiques et vapeur rose devant soi.
  function onPlayerClickGatlingBarrage(pid, itemName) {
    if (!isAliveId(pid)) return false;
    let f = 0;
    run({
      next: function () {
        const p = posOf(pid);
        if (!p || f >= 5) return { done: true };
        const fr = frame(facing(pid));
        sound.at(pid, "cannonFire3", 0.5, 1.5 + (f % 2) * 0.2, 18);
        for (let k = -1; k <= 1; k++) {
          const tip = [
            p[0] + fr.f[0] * 5.2 + fr.r[0] * k * 1.1,
            p[1] + 1.1 + fr.f[1] * 4.5,
            p[2] + fr.f[2] * 5.2 + fr.r[2] * k * 1.1,
          ];
          point(tip, {
            r: 0.4,
            tex: TEX.crit,
            count: 6,
            life: [0.14, 0.28],
            size: [0.24, 0.46],
            colors: [
              [[255, 190, 210], [255, 255, 255]],
              [[255, 120, 160, 0], [255, 220, 230, 0]],
            ],
          });
        }
        const center = [p[0] + fr.f[0] * 3.8, p[1] + 1.0, p[2] + fr.f[2] * 3.8];
        hitArea(center, 3.2, pid, itemName, 14, { height: 2.8 });
        if (f === 4) pushOut(center, 3.5, pid, 1.6, 0.55);
        f++;
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // Elastomer Whip : grand balayage circulaire devant le joueur.
  function onPlayerClickGearWhip(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const fr = frame(facing(pid));
    sound.at(pid, "bigDrumSwish1", 0.8, 1.25, 22);
    const seen = {};
    for (let k = -3; k <= 3; k++) {
      const ang = k * 0.28;
      const ca = Math.cos(ang),
        sa = Math.sin(ang);
      const dir = [fr.f[0] * ca + fr.r[0] * sa, 0, fr.f[2] * ca + fr.r[2] * sa];
      const pt = [p[0] + dir[0] * 5.8, p[1] + 1.0, p[2] + dir[2] * 5.8];
      point(pt, {
        r: 0.35,
        tex: TEX.square,
        count: 6,
        life: [0.16, 0.34],
        size: [0.24, 0.46],
        colors: [
          [[255, 210, 220], [240, 240, 235]],
          [[220, 150, 170, 0], [255, 255, 255, 0]],
        ],
      });
      const res = hitSeg([p[0], p[1] + 1.0, p[2]], pt, 1.4, pid, itemName, 0);
      for (const id in res.seen) {
        if (!seen[id]) {
          seen[id] = 1;
          damage(id, 58, pid, itemName);
          impulse(id, dir[0] * 1.8, 0.55, dir[2] * 1.8);
        }
      }
    }
    return true;
  }

  // --------------------------------------------------------- RARE : GHOST ---
  // Negative Hollow : 2 fantômes spectraux qui traversent et affaiblissent les ennemis.
  function onPlayerClickHollowBurst(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const fr = frame(facing(pid));
    sound.at(pid, "pulseFromTheDark", 0.8, 1.35, 22);
    const seen = {};
    let stepIdx = 0;
    run({
      next: function () {
        stepIdx++;
        for (let s = -1; s <= 1; s += 2) {
          const sway = Math.sin(stepIdx * 0.9) * 0.8 * s;
          const cur = [
            p[0] + fr.f[0] * stepIdx * 2.0 + fr.r[0] * sway,
            p[1] + 1.2 + fr.f[1] * stepIdx * 1.8,
            p[2] + fr.f[2] * stepIdx * 2.0 + fr.r[2] * sway,
          ];
          point(cur, {
            r: 0.35,
            tex: TEX.soul,
            count: 7,
            life: [0.2, 0.42],
            size: [0.28, 0.54],
            colors: [
              [[210, 255, 255], [130, 220, 245]],
              [[80, 160, 200, 0], [220, 255, 255, 0]],
            ],
          });
          const ids = lifeforms(pid);
          for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            if (seen[id]) continue;
            const q = posOf(id);
            if (q && dist2(q, cur) <= 18.0) {
              seen[id] = 1;
              damage(id, 58, pid, itemName);
              eff(id, "Slowness", 3500, { inbuiltLevel: 3 });
              eff(id, "Weakness", 4000, { inbuiltLevel: 2 });
            }
          }
        }
        if (stepIdx >= 6) return { done: true };
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // Banshee Wail : cri spectral qui draine la vie autour du joueur.
  function onPlayerClickSoulScream(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    sound.at(pid, "futureStrangePulse", 0.85, 1.5, 24);
    ring([p[0], p[1] + 1.1, p[2]], 4.2, 10, {
      tex: TEX.soul,
      life: [0.25, 0.55],
      power: [0.6, 1.8],
      size: [0.28, 0.56],
      colors: [
        [[180, 255, 250], [255, 255, 255]],
        [[70, 170, 190, 0], [180, 255, 250, 0]],
      ],
    });
    const hits = hitArea(p, 4.6, pid, itemName, 62, { height: 3.0, slow: [2500, 2] });
    if (hits > 0) heal(pid, Math.min(35, hits * 14));
    pushOut(p, 4.6, pid, 1.4, 0.5);
    return true;
  }

  // --------------------------------------------------------- RARE : MAGMA ---
  // Hellhound Maw : mâchoire de magma qui file et explose violemment.
  function onPlayerClickMagmaHound(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = facing(pid);
    sound.at(pid, "cannonFire2", 0.9, 0.65, 24);
    let stepIdx = 0;
    run({
      next: function () {
        stepIdx++;
        const cur = [
          p[0] + d[0] * stepIdx * 2.2,
          p[1] + 1.15 + d[1] * stepIdx * 2.0,
          p[2] + d[2] * stepIdx * 2.2,
        ];
        point(cur, {
          r: 0.6,
          tex: TEX.crit,
          count: 12,
          life: [0.2, 0.45],
          power: [0.5, 1.6],
          size: [0.35, 0.7],
          colors: [
            [[255, 140, 30], [180, 25, 5]],
            [[80, 10, 0, 0], [220, 60, 10, 0]],
          ],
        });
        const hits = hitArea(cur, 2.5, pid, itemName, 32, { height: 2.6 });
        if (hits > 0 || stepIdx >= 6) {
          boom(cur, 2.4, {
            count: 26,
            colors: [
              [[255, 170, 40], [200, 30, 5]],
              [[70, 10, 0, 0], [190, 40, 5, 0]],
            ],
          });
          hitArea(cur, 3.8, pid, itemName, 38, { height: 3.0 });
          pushOut(cur, 3.8, pid, 1.6, 0.6);
          return { done: true };
        }
        return { value: sleep(1), done: false };
      },
    });
    return true;
  }

  // --------------------------------------------------- LEGENDARY : QUAKES ---
  // Air Crack : sphère blanche d'onde de choc qui fissure l'air devant soi.
  function onPlayerClickQuakeBubble(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = facing(pid);
    const c = [p[0] + d[0] * 3.2, p[1] + 1.2 + d[1] * 2.0, p[2] + d[2] * 3.2];
    sound.at(c, "cannonFire1", 0.95, 0.55, 26);
    boom(c, 2.6, {
      tex: TEX.glint,
      count: 28,
      colors: [
        [[255, 255, 255], [185, 235, 255]],
        [[120, 190, 230, 0], [255, 255, 255, 0]],
      ],
    });
    hitArea(c, 5.2, pid, itemName, 78, { height: 3.8, slow: [2000, 2] });
    pushOut(c, 5.4, pid, 2.2, 0.8);
    return true;
  }

  // Tectonic Cataclysm : 4 ondes sismiques concentriques autour du joueur.
  function onPlayerClickSeaTilt(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    sound.at(p, "cannonFire3", 0.95, 0.45, 26);
    let wave = 0;
    run({
      next: function () {
        wave++;
        const r = wave * 2.4;
        ring([p[0], p[1] + 0.25, p[2]], r, 10, {
          tex: TEX.crit,
          life: [0.22, 0.48],
          power: [0.5, 1.6],
          size: [0.28, 0.56],
          colors: [
            [[240, 250, 255], [160, 210, 240]],
            [[90, 130, 160, 0], [220, 245, 255, 0]],
          ],
        });
        hitArea(p, r + 1.2, pid, itemName, 22, { height: 3.4 });
        if (wave >= 4) {
          pushOut(p, 9.5, pid, 1.9, 0.85);
          return { done: true };
        }
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // Fault Line : faille tellurique en ligne droite sur 16 blocs.
  function onPlayerClickFissureLine(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = flatDir(pid);
    sound.at(pid, "cannonFire3", 0.85, 0.55, 24);
    const seen = {};
    let stepIdx = 0;
    run({
      next: function () {
        stepIdx++;
        const c = [p[0] + d[0] * stepIdx * 2.6, p[1] + 0.3, p[2] + d[2] * stepIdx * 2.6];
        boom(c, 1.4, {
          count: 14,
          colors: [
            [[230, 245, 255], [150, 130, 100]],
            [[90, 75, 55, 0], [210, 235, 255, 0]],
          ],
        });
        const ids = lifeforms(pid);
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          if (seen[id]) continue;
          const q = posOf(id);
          if (q && distH2(q, c) <= 18.0 && Math.abs(q[1] - c[1]) <= 3.8) {
            seen[id] = 1;
            damage(id, 74, pid, itemName);
            impulse(id, d[0] * 1.4, 0.9, d[2] * 1.4);
          }
        }
        if (stepIdx >= 6) return { done: true };
        return { value: sleep(1), done: false };
      },
    });
    return true;
  }

  // --------------------------------------------------- LEGENDARY : BUDDHA ---
  // Enlightened Palm : onde de choc dorée en cône devant soi.
  function onPlayerClickGoldenPalm(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = facing(pid);
    const c = [p[0] + d[0] * 4.0, p[1] + 1.2 + d[1] * 2.2, p[2] + d[2] * 4.0];
    sound.at(pid, "ominousBellHit", 0.9, 1.0, 26);
    ring(c, 3.2, 10, {
      tex: TEX.glint,
      life: [0.22, 0.45],
      power: [0.7, 2.0],
      size: [0.3, 0.6],
      colors: [
        [[255, 235, 90], [255, 185, 20]],
        [[220, 140, 0, 0], [255, 245, 160, 0]],
      ],
    });
    hitArea(c, 4.8, pid, itemName, 78, { height: 3.5 });
    pushOut(c, 4.8, pid, 2.0, 0.7);
    return true;
  }

  // Heavenly Descent : saut divin suivi d'un impact doré massif.
  function onPlayerClickHeavenlyImpact(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = flatDir(pid);
    sound.at(pid, "cannonFire3", 0.85, 1.15, 24);
    impulse(pid, d[0] * 1.8, 1.05, d[2] * 1.8);
    let t = 0;
    run({
      next: function () {
        t++;
        const q = posOf(pid);
        if (!q) return { done: true };
        point([q[0], q[1] + 1.0, q[2]], {
          r: 0.6,
          tex: TEX.glint,
          count: 8,
          life: [0.16, 0.34],
          size: [0.26, 0.5],
          colors: [
            [[255, 240, 110], [255, 190, 30]],
            [[220, 150, 10, 0], [255, 250, 180, 0]],
          ],
        });
        if (t >= 6) {
          boom(q, 2.8, {
            tex: TEX.glint,
            count: 28,
            colors: [
              [[255, 245, 130], [255, 180, 20]],
              [[200, 120, 0, 0], [255, 240, 150, 0]],
            ],
          });
          sound.at(q, "cannonFire3", 0.95, 0.65, 26);
          hitArea(q, 5.2, pid, itemName, 86, { height: 3.5 });
          pushOut(q, 5.2, pid, 1.8, 0.75);
          return { done: true };
        }
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // Golden Halo Aura : mandala doré qui protège le lanceur et brûle les ennemis.
  function onPlayerClickDharmaSanctuary(pid, itemName) {
    if (!isAliveId(pid)) return false;
    eff(pid, "Damage Reduction", 8000, { inbuiltLevel: 3 });
    eff(pid, "Health Regen", 8000, { inbuiltLevel: 2 });
    sound.at(pid, "ominousBellHit", 0.85, 1.15, 24);
    let t = 0;
    run({
      next: function () {
        const p = posOf(pid);
        if (!p || !isAliveId(pid) || t >= 5) return { done: true };
        ring(
          [p[0], p[1] + 0.3, p[2]],
          4.2,
          9,
          {
            tex: TEX.glint,
            life: [0.22, 0.45],
            power: [0.3, 0.9],
            size: [0.26, 0.52],
            colors: [
              [[255, 240, 110], [255, 190, 30]],
              [[220, 150, 10, 0], [255, 250, 180, 0]],
            ],
          },
          t * 0.5,
        );
        hitArea(p, 4.4, pid, itemName, 16, { height: 3.0 });
        t++;
        return { value: sleep(3), done: false };
      },
    });
    return true;
  }

  // Retribution Pillars : 4 piliers de lumière dorée tombent autour de la visée.
  function onPlayerClickTwilightBeams(pid, itemName) {
    const c = aimSpot(pid, 13);
    if (!c) return true;
    sound.at(c, "cannonFire3", 0.85, 1.35, 24);
    for (let i = 0; i < 4; i++) {
      const a = i * 1.57;
      const spot = [c[0] + Math.cos(a) * 2.2, c[1], c[2] + Math.sin(a) * 2.2];
      seg([spot[0], spot[1] + 8, spot[2]], spot, {
        r: 0.25,
        tex: TEX.glint,
        count: 10,
        life: [0.25, 0.55],
        size: [0.3, 0.6],
        colors: [
          [[255, 245, 130], [255, 190, 30]],
          [[220, 140, 10, 0], [255, 255, 200, 0]],
        ],
      });
    }
    hitArea(c, 4.8, pid, itemName, 84, { height: 4.5 });
    return true;
  }

  // ----------------------------------------------------- LEGENDARY : LOVE ---
  // Love-Love Beam : rayon rose qui pétrifie (Slowness 5 + Weakness) les cibles.
  function onPlayerClickMeroArrow(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = facing(pid);
    const a = [p[0] + d[0] * 1.2, p[1] + 1.2, p[2] + d[2] * 1.2];
    const b = [p[0] + d[0] * 13, p[1] + 1.2 + d[1] * 12, p[2] + d[2] * 13];
    sound.at(pid, "magicAccent4", 0.85, 1.35, 22);
    seg(a, b, {
      r: 0.22,
      tex: TEX.effect,
      count: 14,
      life: [0.25, 0.55],
      size: [0.28, 0.55],
      colors: [
        [[255, 120, 210], [255, 210, 245]],
        [[220, 60, 160, 0], [255, 170, 225, 0]],
      ],
    });
    const res = hitSeg(a, b, 1.8, pid, itemName, 70, { slow: [4500, 5] });
    for (const id in res.seen) {
      eff(id, "Weakness", 4500, { inbuiltLevel: 3 });
    }
    return true;
  }

  // Perfume Kick : ruée entourée de pétales roses qui pétrifie et projette.
  function onPlayerClickPerfumeFemur(pid, itemName) {
    const p0 = posOf(pid);
    if (!p0) return true;
    const d = flatDir(pid);
    sound.at(pid, "cannonFire3", 0.7, 1.45, 20);
    impulse(pid, d[0] * 2.5, 0.35, d[2] * 2.5);
    const seen = {};
    let t = 0;
    run({
      next: function () {
        const p = posOf(pid);
        if (!p || t >= 5) return { done: true };
        point([p[0], p[1] + 1.0, p[2]], {
          r: 0.55,
          tex: TEX.effect,
          count: 8,
          life: [0.2, 0.42],
          size: [0.25, 0.5],
          colors: [
            [[255, 110, 200], [255, 220, 245]],
            [[200, 50, 150, 0], [255, 160, 220, 0]],
          ],
        });
        const ids = lifeforms(pid);
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          if (seen[id]) continue;
          const q = posOf(id);
          if (q && dist2(q, p) <= 20.0) {
            seen[id] = 1;
            damage(id, 74, pid, itemName);
            eff(id, "Slowness", 3500, { inbuiltLevel: 4 });
            impulse(id, d[0] * 1.6, 0.65, d[2] * 1.6);
          }
        }
        t++;
        return { value: sleep(1), done: false };
      },
    });
    return true;
  }

  // Cupid Arrow Storm : pluie de flèches roses sur la zone visée.
  function onPlayerClickSlaveArrowRain(pid, itemName) {
    const c = aimSpot(pid, 13);
    if (!c) return true;
    sound.at(c, "cannonFire3", 0.75, 1.5, 22);
    let w = 0;
    run({
      next: function () {
        w++;
        for (let i = 0; i < 3; i++) {
          const a = (w * 3 + i) * GOLDEN;
          const r = ((i + 1) / 3) * 3.5;
          const pt = [c[0] + Math.cos(a) * r, c[1], c[2] + Math.sin(a) * r];
          seg([pt[0], pt[1] + 6.5, pt[2]], pt, {
            r: 0.12,
            tex: TEX.glint,
            count: 6,
            life: [0.18, 0.36],
            size: [0.22, 0.44],
            colors: [
              [[255, 110, 205], [255, 225, 245]],
              [[210, 40, 150, 0], [255, 160, 220, 0]],
            ],
          });
        }
        hitArea(c, 4.2, pid, itemName, 29, { height: 3.5, slow: [2000, 2] });
        if (w >= 3) return { done: true };
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // Heart Sanctuary : explosion de charme qui soigne le lanceur et affaiblit les ennemis.
  function onPlayerClickHeartCharm(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    sound.at(pid, "magicAccent4", 0.85, 1.2, 22);
    heal(pid, 35);
    eff(pid, "Health Regen", 6000, { inbuiltLevel: 3 });
    ring([p[0], p[1] + 1.0, p[2]], 4.0, 10, {
      tex: TEX.effect,
      life: [0.25, 0.55],
      power: [0.5, 1.5],
      size: [0.28, 0.56],
      colors: [
        [[255, 105, 195], [255, 220, 245]],
        [[210, 40, 140, 0], [255, 170, 220, 0]],
      ],
    });
    hitArea(p, 4.5, pid, itemName, 68, { height: 3.0, slow: [3000, 3] });
    return true;
  }

  // ------------------------------------------------- LEGENDARY : CREATION ---
  // Sacred Anvil : matérialise un bloc massif au-dessus de la visée qui écrase tout.
  function onPlayerClickAnvilDrop(pid, itemName) {
    const c = aimSpot(pid, 12);
    if (!c) return true;
    sound.at(c, "cannonFire3", 0.85, 0.65, 24);
    seg([c[0], c[1] + 7, c[2]], c, {
      r: 0.45,
      tex: TEX.square,
      count: 14,
      life: [0.22, 0.48],
      size: [0.35, 0.7],
      colors: [
        [[180, 220, 255], [110, 140, 180]],
        [[70, 90, 120, 0], [180, 220, 255, 0]],
      ],
    });
    boom(c, 2.4, {
      tex: TEX.square,
      count: 24,
      colors: [
        [[200, 235, 255], [120, 150, 190]],
        [[60, 80, 110, 0], [190, 225, 255, 0]],
      ],
    });
    hitArea(c, 4.4, pid, itemName, 82, { height: 3.4, slow: [2500, 3] });
    pushOut(c, 4.4, pid, 1.7, 0.7);
    return true;
  }

  // Rune Orbs : 3 orbes arcaniques flottants qui bombardent les ennemis proches.
  function onPlayerClickArcaneTurret(pid, itemName) {
    if (!isAliveId(pid)) return false;
    sound.at(pid, "cannonFire3", 0.65, 1.4, 20);
    let t = 0;
    run({
      next: function () {
        const p = posOf(pid);
        if (!p || !isAliveId(pid) || t >= 6) return { done: true };
        for (let i = 0; i < 3; i++) {
          const a = t * 0.8 + i * 2.09;
          const orb = [p[0] + Math.cos(a) * 2.0, p[1] + 2.2, p[2] + Math.sin(a) * 2.0];
          point(orb, {
            r: 0.2,
            tex: TEX.glint,
            count: 4,
            life: [0.18, 0.35],
            size: [0.24, 0.45],
            colors: [
              [[140, 220, 255], [255, 255, 255]],
              [[70, 150, 230, 0], [160, 230, 255, 0]],
            ],
          });
        }
        const ids = lifeforms(pid);
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          const q = posOf(id);
          if (q && dist2(q, p) <= 121) {
            seg([p[0], p[1] + 2.2, p[2]], [q[0], q[1] + 1.0, q[2]], {
              r: 0.1,
              tex: TEX.glint,
              count: 5,
              life: [0.14, 0.28],
              size: [0.2, 0.38],
              colors: [
                [[140, 225, 255], [255, 255, 255]],
                [[60, 140, 220, 0], [160, 230, 255, 0]],
              ],
            });
            damage(id, 16, pid, itemName);
            break;
          }
        }
        t++;
        return { value: sleep(3), done: false };
      },
    });
    return true;
  }

  // Aegis Bastion : rempart runique protecteur + onde de recul.
  function onPlayerClickBastionWall(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    sound.at(pid, "cannonFire3", 0.75, 0.85, 22);
    eff(pid, "Damage Reduction", 8000, { inbuiltLevel: 3 });
    ring([p[0], p[1] + 1.0, p[2]], 3.6, 10, {
      tex: TEX.square,
      life: [0.3, 0.6],
      power: [0.4, 1.2],
      size: [0.3, 0.58],
      colors: [
        [[150, 220, 255], [240, 250, 255]],
        [[70, 130, 190, 0], [170, 230, 255, 0]],
      ],
    });
    hitArea(p, 4.4, pid, itemName, 68, { height: 3.0 });
    pushOut(p, 4.4, pid, 1.8, 0.6);
    return true;
  }

  // --------------------------------------------------- LEGENDARY : SPIDER ---
  // Five-Color Strings : 5 fils chromatiques ultra-tranchants en éventail.
  function onPlayerClickStringSlash(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const fr = frame(facing(pid));
    sound.at(pid, "critical_hit", 0.8, 1.45, 22);
    const seen = {};
    for (let k = -2; k <= 2; k++) {
      const ang = k * 0.13;
      const ca = Math.cos(ang),
        sa = Math.sin(ang);
      const dir = [fr.f[0] * ca + fr.r[0] * sa, fr.f[1], fr.f[2] * ca + fr.r[2] * sa];
      const a = [p[0] + dir[0] * 1.1, p[1] + 1.15, p[2] + dir[2] * 1.1];
      const b = [p[0] + dir[0] * 11, p[1] + 1.15 + dir[1] * 10, p[2] + dir[2] * 11];
      seg(a, b, {
        r: 0.08,
        tex: TEX.glint,
        count: 7,
        life: [0.16, 0.34],
        size: [0.18, 0.34],
        colors: [
          [[245, 245, 255], [255, 120, 220]],
          [[200, 200, 255, 0], [255, 255, 255, 0]],
        ],
      });
      const res = hitSeg(a, b, 1.35, pid, itemName, 0);
      for (const id in res.seen) {
        if (!seen[id]) {
          seen[id] = 1;
          damage(id, 74, pid, itemName);
          eff(id, "Slowness", 2500, { inbuiltLevel: 2 });
        }
      }
    }
    return true;
  }

  // Spider Web Cage : grande toile blanche qui immobilise et lacère.
  function onPlayerClickWebSnare(pid, itemName) {
    const c = aimSpot(pid, 11);
    if (!c) return true;
    sound.at(c, "cannonFire3", 0.7, 1.35, 22);
    ring(c, 4.0, 10, {
      tex: TEX.glint,
      life: [0.35, 0.7],
      power: [0.2, 0.6],
      size: [0.24, 0.48],
      colors: [
        [[245, 245, 250], [200, 210, 225]],
        [[160, 170, 185, 0], [255, 255, 255, 0]],
      ],
    });
    hitArea(c, 4.4, pid, itemName, 78, { height: 3.2, slow: [4500, 5] });
    return true;
  }

  // Overheat Thread : fouet de fil incandescent rouge-blanc à longue portée.
  function onPlayerClickOverheatWhip(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = facing(pid);
    const a = [p[0] + d[0] * 1.2, p[1] + 1.2, p[2] + d[2] * 1.2];
    const b = [p[0] + d[0] * 15, p[1] + 1.2 + d[1] * 14, p[2] + d[2] * 15];
    sound.at(pid, "cannonFire3", 0.85, 1.25, 24);
    seg(a, b, {
      r: 0.14,
      tex: TEX.crit,
      count: 14,
      life: [0.2, 0.42],
      size: [0.24, 0.48],
      colors: [
        [[255, 240, 220], [255, 70, 30]],
        [[200, 20, 0, 0], [255, 160, 80, 0]],
      ],
    });
    boom(b, 1.8, {
      count: 18,
      colors: [
        [[255, 220, 180], [255, 60, 20]],
        [[180, 20, 0, 0], [255, 140, 60, 0]],
      ],
    });
    hitSeg(a, b, 1.6, pid, itemName, 86);
    return true;
  }

  // Sky String Leap : bond aérien sur fil d'araignée + coupe en dessous.
  function onPlayerClickSkyWalkThread(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = facing(pid);
    sound.at(pid, "cannonFire3", 0.6, 1.6, 20);
    eff(pid, "Wall Climbing", 8000, { inbuiltLevel: 1 });
    eff(pid, "Speed", 6000, { inbuiltLevel: 2 });
    impulse(pid, d[0] * 2.1, Math.max(0.85, d[1] * 1.4 + 0.7), d[2] * 2.1);
    seg(p, [p[0] + d[0] * 5, p[1] + 3.5, p[2] + d[2] * 5], {
      r: 0.1,
      tex: TEX.glint,
      count: 10,
      life: [0.2, 0.45],
      size: [0.2, 0.38],
      colors: [
        [[245, 245, 255], [200, 215, 235]],
        [[180, 190, 210, 0], [255, 255, 255, 0]],
      ],
    });
    hitArea(p, 3.8, pid, itemName, 66, { height: 3.0 });
    return true;
  }

  Object.assign(R, {
    onPlayerClickSacredJewel,
    onPlayerClickLightFlashStep,
    onPlayerClickGatlingBarrage,
    onPlayerClickGearWhip,
    onPlayerClickHollowBurst,
    onPlayerClickSoulScream,
    onPlayerClickMagmaHound,
    onPlayerClickQuakeBubble,
    onPlayerClickSeaTilt,
    onPlayerClickFissureLine,
    onPlayerClickGoldenPalm,
    onPlayerClickHeavenlyImpact,
    onPlayerClickDharmaSanctuary,
    onPlayerClickTwilightBeams,
    onPlayerClickMeroArrow,
    onPlayerClickPerfumeFemur,
    onPlayerClickSlaveArrowRain,
    onPlayerClickHeartCharm,
    onPlayerClickAnvilDrop,
    onPlayerClickArcaneTurret,
    onPlayerClickBastionWall,
    onPlayerClickStringSlash,
    onPlayerClickWebSnare,
    onPlayerClickOverheatWhip,
    onPlayerClickSkyWalkThread,
  });
})(globalThis.FA);
