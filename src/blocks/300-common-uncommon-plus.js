// src/blocks/300-common-uncommon-plus.js — NOUVELLES HABILITÉS (COMMON & UNCOMMON)
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
      boom,
      clamp,
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
    const t = targetBlock(pid);
    const p = posOf(pid);
    if (!p) return null;
    if (t && dist2(p, t) <= maxDist * maxDist) return [t[0], t[1] + 0.5, t[2]];
    const d = facing(pid);
    return [p[0] + d[0] * maxDist, p[1] + 0.6 + d[1] * maxDist * 0.4, p[2] + d[2] * maxDist];
  }

  function pushOut(center, radius, caster, kbH, kbY) {
    const ids = lifeforms(caster);
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const q = posOf(id);
      if (!q || dist2(q, center) > radius * radius) continue;
      const dx = q[0] - center[0],
        dz = q[2] - center[2],
        d = Math.sqrt(dx * dx + dz * dz) || 1;
      impulse(id, (dx / d) * kbH, kbY, (dz / d) * kbH);
    }
  }

  function pullIn(center, radius, caster, pullH, pullY) {
    const ids = lifeforms(caster);
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const q = posOf(id);
      if (!q || dist2(q, center) > radius * radius) continue;
      const dx = center[0] - q[0],
        dz = center[2] - q[2],
        d = Math.sqrt(dx * dx + dz * dz) || 1;
      if (d > 0.4) impulse(id, (dx / d) * pullH, pullY, (dz / d) * pullH);
    }
  }

  // ------------------------------------------------------- COMMON : ROCKET ---
  // Rocket Salvo : 3 mini-roquettes explosives tirées en rafale.
  function onPlayerClickRocketBarrage(pid, itemName) {
    if (!isAliveId(pid)) return false;
    let shot = 0;
    run({
      next: function () {
        const p = posOf(pid);
        if (!p || shot >= 3) return { done: true };
        const fr = frame(facing(pid));
        const side = (shot - 1) * 0.65;
        const start = [
          p[0] + fr.r[0] * side + fr.f[0] * 1.1,
          p[1] + 1.25 + fr.f[1] * 0.6,
          p[2] + fr.r[2] * side + fr.f[2] * 1.1,
        ];
        const dir = fr.f;
        sound.at(pid, "cannonFire3", 0.55, 1.35 + shot * 0.12, 18);
        shot++;
        let stepIdx = 0;
        run({
          next: function () {
            stepIdx++;
            const cur = [
              start[0] + dir[0] * stepIdx * 2.1,
              start[1] + dir[1] * stepIdx * 2.1,
              start[2] + dir[2] * stepIdx * 2.1,
            ];
            point(cur, {
              r: 0.18,
              tex: TEX.crit,
              count: 6,
              life: [0.15, 0.32],
              power: [0.3, 1.1],
              size: [0.22, 0.42],
              colors: [
                [[255, 180, 70], [255, 90, 30]],
                [[120, 120, 120, 0], [60, 60, 60, 0]],
              ],
            });
            const h = hitArea(cur, 1.9, pid, itemName, 14, { height: 2.2 });
            if (h > 0 || stepIdx >= 6) {
              boom(cur, 1.4, {
                count: 16,
                colors: [
                  [[255, 210, 90], [255, 80, 20]],
                  [[90, 90, 90, 0], [40, 40, 40, 0]],
                ],
              });
              hitArea(cur, 2.6, pid, itemName, 20, { height: 2.6 });
              pushOut(cur, 2.8, pid, 1.2, 0.45);
              return { done: true };
            }
            return { value: sleep(1), done: false };
          },
        });
        return { value: sleep(3), done: false };
      },
    });
    return true;
  }

  // --------------------------------------------------------- COMMON : SPIN ---
  // Propeller Flight : envol d'hélicoptère avec anneaux tranchants.
  function onPlayerClickPropellerFlight(pid, itemName) {
    const p0 = posOf(pid);
    if (!p0) return true;
    sound.at(pid, "cannonFire3", 0.55, 1.5, 18);
    let t = 0;
    run({
      next: function () {
        const p = posOf(pid);
        if (!p || !isAliveId(pid) || t >= 8) return { done: true };
        const d = flatDir(pid);
        impulse(pid, d[0] * 0.65, 0.52, d[2] * 0.65);
        ring(
          [p[0], p[1] + 1.8, p[2]],
          2.2,
          7,
          {
            tex: TEX.glint,
            life: [0.14, 0.28],
            power: [0.2, 0.7],
            size: [0.18, 0.36],
            colors: [
              [[220, 245, 255], [150, 220, 255]],
              [[120, 180, 220, 0], [255, 255, 255, 0]],
            ],
          },
          t * 0.9,
        );
        if (t % 2 === 0) {
          hitArea(p, 2.8, pid, itemName, 10, { height: 2.6 });
        }
        t++;
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // Twister Slash : mini-tornade projetée vers l'avant.
  function onPlayerClickTwisterSlash(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = flatDir(pid);
    sound.at(pid, "cannonFire3", 0.55, 1.35, 18);
    const seen = {};
    let stepIdx = 0;
    run({
      next: function () {
        stepIdx++;
        const c = [p[0] + d[0] * stepIdx * 1.6, p[1] + 0.3, p[2] + d[2] * stepIdx * 1.6];
        ring(
          [c[0], c[1] + 0.8, c[2]],
          1.4,
          6,
          {
            tex: TEX.effect,
            life: [0.16, 0.34],
            power: [0.3, 0.9],
            size: [0.2, 0.42],
            gravity: [0, 1.4, 0],
            colors: [
              [[200, 255, 220], [255, 255, 255]],
              [[120, 220, 180, 0], [200, 255, 220, 0]],
            ],
          },
          stepIdx * 0.8,
        );
        const ids = lifeforms(pid);
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          if (seen[id]) continue;
          const q = posOf(id);
          if (q && distH2(q, c) <= 4.5 && Math.abs(q[1] - c[1]) <= 2.8) {
            seen[id] = 1;
            damage(id, 32, pid, itemName);
            impulse(id, d[0] * 1.2, 0.75, d[2] * 1.2);
          }
        }
        if (stepIdx >= 7) return { done: true };
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // ------------------------------------------------------- COMMON : SPRING ---
  // Spring Cannon : bond élastique catapulté + onde de choc à l'atterrissage.
  function onPlayerClickSpringCannon(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = facing(pid);
    sound.at(pid, "cannonFire3", 0.65, 1.25, 20);
    ring([p[0], p[1] + 0.2, p[2]], 1.6, 8, {
      tex: TEX.square,
      life: [0.2, 0.4],
      power: [0.4, 1.1],
      size: [0.22, 0.42],
      colors: [
        [[255, 110, 150], [255, 220, 235]],
        [[200, 60, 100, 0], [255, 160, 190, 0]],
      ],
    });
    impulse(pid, d[0] * 2.5, Math.max(0.75, d[1] * 1.6 + 0.65), d[2] * 2.5);
    let f = 0;
    run({
      next: function () {
        f++;
        const q = posOf(pid);
        if (!q) return { done: true };
        point([q[0], q[1] + 0.5, q[2]], {
          r: 0.25,
          tex: TEX.glint,
          count: 5,
          life: [0.14, 0.28],
          size: [0.2, 0.36],
          colors: [
            [[255, 130, 170], [255, 240, 245]],
            [[255, 90, 130, 0], [255, 200, 220, 0]],
          ],
        });
        if (f >= 6) {
          boom(q, 1.8, {
            count: 20,
            colors: [
              [[255, 120, 165], [255, 230, 240]],
              [[180, 40, 90, 0], [255, 140, 180, 0]],
            ],
          });
          sound.at(q, "cannonFire3", 0.75, 0.85, 20);
          hitArea(q, 3.6, pid, itemName, 36, { height: 2.8 });
          pushOut(q, 3.6, pid, 1.4, 0.6);
          return { done: true };
        }
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // --------------------------------------------------------- COMMON : BOMB ---
  // Landmine Scatter : disperse 4 mines autour du joueur qui explosent après un court délai.
  function onPlayerClickLandmineField(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    sound.at(pid, "cannonFire3", 0.55, 1.1, 18);
    const mines = [
      [p[0] + 2.8, p[1] + 0.2, p[2]],
      [p[0] - 2.8, p[1] + 0.2, p[2]],
      [p[0], p[1] + 0.2, p[2] + 2.8],
      [p[0], p[1] + 0.2, p[2] - 2.8],
    ];
    let pulse = 0;
    run({
      next: function () {
        pulse++;
        for (let i = 0; i < mines.length; i++) {
          const m = mines[i];
          point(m, {
            r: 0.22,
            tex: TEX.glint,
            count: 5,
            life: [0.18, 0.35],
            size: [0.22, 0.42],
            colors: [
              [[255, 80, 40], [255, 220, 80]],
              [[180, 20, 0, 0], [255, 120, 20, 0]],
            ],
          });
        }
        if (pulse >= 5) {
          for (let i = 0; i < mines.length; i++) {
            const m = mines[i];
            boom(m, 1.6, {
              count: 16,
              colors: [
                [[255, 160, 40], [255, 50, 20]],
                [[80, 20, 10, 0], [160, 60, 20, 0]],
              ],
            });
            hitArea(m, 2.8, pid, itemName, 34, { height: 2.6 });
            pushOut(m, 2.8, pid, 1.3, 0.55);
          }
          sound.at(p, "cannonFire3", 0.85, 0.75, 22);
          return { done: true };
        }
        return { value: sleep(3), done: false };
      },
    });
    return true;
  }

  // -------------------------------------------------------- COMMON : SMOKE ---
  // White Launcher : jet de fumée dense qui repousse et ralentit sur 10 blocs.
  function onPlayerClickWhiteBlow(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = facing(pid);
    const from = [p[0], p[1] + 1.1, p[2]];
    const tip = [from[0] + d[0] * 10, from[1] + d[1] * 10, from[2] + d[2] * 10];
    sound.at(pid, "cannonFire3", 0.55, 1.15, 18);
    for (let i = 1; i <= 5; i++) {
      const k = i / 5;
      point([from[0] + (tip[0] - from[0]) * k, from[1] + (tip[1] - from[1]) * k, from[2] + (tip[2] - from[2]) * k], {
        r: 0.45 + k * 0.4,
        tex: TEX.effect,
        count: 8,
        life: [0.35, 0.75],
        power: [0.3, 1.0],
        size: [0.35, 0.75],
        colors: [
          [[235, 240, 245, 0.9], [180, 190, 200, 0.85]],
          [[140, 150, 160, 0], [220, 225, 230, 0]],
        ],
      });
    }
    const res = hitSeg(from, tip, 1.8, pid, itemName, 30, { slow: [2500, 2] });
    for (const id in res.seen) {
      impulse(id, d[0] * 1.85, 0.5, d[2] * 1.85);
    }
    return true;
  }

  // -------------------------------------------------------- COMMON : SPIKE ---
  // Hedgehog Roll : roule en boule d'épines vers l'avant.
  function onPlayerClickSpikeRoll(pid, itemName) {
    const p0 = posOf(pid);
    if (!p0) return true;
    const d = flatDir(pid);
    sound.at(pid, "cannonFire3", 0.6, 1.2, 18);
    const seen = {};
    let t = 0;
    run({
      next: function () {
        const p = posOf(pid);
        if (!p || !isAliveId(pid) || t >= 6) return { done: true };
        impulse(pid, d[0] * 1.45, 0.1, d[2] * 1.45);
        point([p[0], p[1] + 0.8, p[2]], {
          r: 0.75,
          tex: TEX.crit,
          count: 9,
          life: [0.15, 0.3],
          power: [0.5, 1.4],
          size: [0.24, 0.46],
          colors: [
            [[60, 75, 65], [140, 180, 130]],
            [[30, 40, 30, 0], [90, 120, 80, 0]],
          ],
        });
        const ids = lifeforms(pid);
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          if (seen[id]) continue;
          const q = posOf(id);
          if (q && dist2(q, p) <= 5.5) {
            seen[id] = 1;
            damage(id, 35, pid, itemName);
            impulse(id, d[0] * 1.4, 0.55, d[2] * 1.4);
          }
        }
        t++;
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // Thorn Volley : éventail de 5 dards d'épines vers l'avant.
  function onPlayerClickThornVolley(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const fr = frame(facing(pid));
    sound.at(pid, "cannonFire3", 0.55, 1.45, 18);
    const seen = {};
    for (let k = -2; k <= 2; k++) {
      const ang = k * 0.16;
      const ca = Math.cos(ang),
        sa = Math.sin(ang);
      const dir = [fr.f[0] * ca + fr.r[0] * sa, fr.f[1], fr.f[2] * ca + fr.r[2] * sa];
      const a = [p[0] + dir[0] * 1.1, p[1] + 1.15, p[2] + dir[2] * 1.1];
      const b = [p[0] + dir[0] * 9.5, p[1] + 1.15 + dir[1] * 8.4, p[2] + dir[2] * 9.5];
      seg(a, b, {
        r: 0.12,
        tex: TEX.crit,
        count: 7,
        life: [0.16, 0.34],
        power: [0.2, 0.8],
        size: [0.2, 0.38],
        colors: [
          [[90, 160, 80], [40, 60, 40]],
          [[30, 50, 30, 0], [80, 140, 70, 0]],
        ],
      });
      const res = hitSeg(a, b, 1.25, pid, itemName, 0);
      for (const id in res.seen) {
        if (!seen[id]) {
          seen[id] = 1;
          damage(id, 28, pid, itemName);
          impulse(id, dir[0] * 0.95, 0.35, dir[2] * 0.95);
        }
      }
    }
    return true;
  }

  // ----------------------------------------------------- UNCOMMON : FLAME ---
  // Fire Fist : poing géant de flammes ardentes qui file et explose.
  function onPlayerClickFireFist(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = facing(pid);
    const start = [p[0] + d[0] * 1.2, p[1] + 1.2, p[2] + d[2] * 1.2];
    sound.at(pid, "cannonFire3", 0.75, 0.95, 22);
    let stepIdx = 0;
    run({
      next: function () {
        stepIdx++;
        const cur = [start[0] + d[0] * stepIdx * 2.3, start[1] + d[1] * stepIdx * 2.3, start[2] + d[2] * stepIdx * 2.3];
        point(cur, {
          r: 0.55,
          tex: TEX.crit,
          count: 12,
          life: [0.18, 0.42],
          power: [0.5, 1.6],
          size: [0.35, 0.7],
          colors: [
            [[255, 230, 90], [255, 95, 20]],
            [[200, 30, 0, 0], [255, 120, 20, 0]],
          ],
        });
        const hits = hitArea(cur, 2.3, pid, itemName, 24, { height: 2.5 });
        if (hits > 0 || stepIdx >= 6) {
          boom(cur, 2.2, {
            count: 26,
            colors: [
              [[255, 220, 80], [255, 70, 10]],
              [[160, 20, 0, 0], [255, 100, 10, 0]],
            ],
          });
          sound.at(cur, "cannonFire3", 0.85, 0.7, 24);
          hitArea(cur, 3.6, pid, itemName, 28, { height: 3.0 });
          pushOut(cur, 3.6, pid, 1.5, 0.55);
          return { done: true };
        }
        return { value: sleep(1), done: false };
      },
    });
    return true;
  }

  // Flame Pillar : colonne de feu tournoyante autour du joueur.
  function onPlayerClickFlamePillar(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    sound.at(pid, "cannonFire3", 0.8, 0.8, 22);
    let t = 0;
    run({
      next: function () {
        const c = posOf(pid) || p;
        for (let h = 0; h < 4; h++) {
          const a = t * 0.9 + h * 1.57;
          const r = 2.2 - h * 0.25;
          point([c[0] + Math.cos(a) * r, c[1] + 0.4 + h * 1.1, c[2] + Math.sin(a) * r], {
            r: 0.35,
            tex: TEX.crit,
            count: 6,
            life: [0.2, 0.45],
            power: [0.4, 1.3],
            size: [0.32, 0.65],
            gravity: [0, 2.2, 0],
            colors: [
              [[255, 220, 90], [255, 85, 15]],
              [[180, 20, 0, 0], [255, 120, 20, 0]],
            ],
          });
        }
        if (t % 2 === 0) {
          hitArea(c, 3.4, pid, itemName, 18, { height: 4.2 });
          pushOut(c, 3.4, pid, 0.9, 0.45);
        }
        t++;
        if (t >= 6) return { done: true };
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // ------------------------------------------------------- UNCOMMON : ICE ---
  // Ice Partisan : 3 lances de glace cristalline projetées sur la visée.
  function onPlayerClickIceSpears(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const target = aimSpot(pid, 13);
    if (!target) return true;
    sound.at(pid, "cannonFire3", 0.65, 1.55, 20);
    for (let i = -1; i <= 1; i++) {
      const origin = [p[0] + i * 0.9, p[1] + 2.4, p[2] + i * 0.5];
      seg(origin, target, {
        r: 0.14,
        tex: TEX.glint,
        count: 9,
        life: [0.22, 0.45],
        power: [0.2, 0.7],
        size: [0.22, 0.44],
        colors: [
          [[200, 245, 255], [100, 200, 255]],
          [[60, 150, 230, 0], [200, 245, 255, 0]],
        ],
      });
    }
    boom(target, 1.8, {
      tex: TEX.glint,
      count: 22,
      colors: [
        [[210, 250, 255], [90, 190, 255]],
        [[40, 120, 210, 0], [180, 235, 255, 0]],
      ],
    });
    hitArea(target, 3.2, pid, itemName, 46, { height: 2.8, slow: [3500, 3] });
    return true;
  }

  // Glacial Surge : vague de gel au sol devant soi.
  function onPlayerClickGlacialAge(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = flatDir(pid);
    sound.at(pid, "cannonFire3", 0.7, 1.35, 20);
    const seen = {};
    let stepIdx = 0;
    run({
      next: function () {
        stepIdx++;
        const c = [p[0] + d[0] * stepIdx * 2.0, p[1] + 0.25, p[2] + d[2] * stepIdx * 2.0];
        ring(c, 1.2 + stepIdx * 0.35, 6, {
          tex: TEX.glint,
          life: [0.25, 0.5],
          power: [0.2, 0.8],
          size: [0.24, 0.48],
          colors: [
            [[210, 250, 255], [110, 205, 255]],
            [[60, 140, 220, 0], [190, 240, 255, 0]],
          ],
        });
        const ids = lifeforms(pid);
        const r = 1.6 + stepIdx * 0.35;
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          if (seen[id]) continue;
          const q = posOf(id);
          if (q && distH2(q, c) <= r * r && Math.abs(q[1] - c[1]) <= 2.6) {
            seen[id] = 1;
            damage(id, 44, pid, itemName);
            eff(id, "Slowness", 4000, { inbuiltLevel: 3 });
          }
        }
        if (stepIdx >= 5) return { done: true };
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // ------------------------------------------------------ UNCOMMON : SAND ---
  // Desert Spada : lame de sable doré qui tranche le sol sur 14 blocs.
  function onPlayerClickDesertSpada(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = flatDir(pid);
    sound.at(pid, "cannonFire3", 0.75, 0.9, 22);
    const seen = {};
    let stepIdx = 0;
    run({
      next: function () {
        stepIdx++;
        const c = [p[0] + d[0] * stepIdx * 2.3, p[1] + 0.4, p[2] + d[2] * stepIdx * 2.3];
        point(c, {
          r: 0.45,
          tex: TEX.square,
          count: 10,
          life: [0.2, 0.45],
          power: [0.6, 1.8],
          size: [0.26, 0.52],
          gravity: [0, -3.5, 0],
          dir: [0, 1.3, 0],
          dirSpread: 0.9,
          colors: [
            [[240, 205, 120], [195, 155, 75]],
            [[140, 105, 45, 0], [220, 185, 100, 0]],
          ],
        });
        const ids = lifeforms(pid);
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          if (seen[id]) continue;
          const q = posOf(id);
          if (q && distH2(q, c) <= 4.0 && Math.abs(q[1] - c[1]) <= 2.8) {
            seen[id] = 1;
            damage(id, 48, pid, itemName);
            impulse(id, d[0] * 1.1, 0.7, d[2] * 1.1);
          }
        }
        if (stepIdx >= 6) return { done: true };
        return { value: sleep(1), done: false };
      },
    });
    return true;
  }

  // Sables Tornado : tourbillon de sable qui aspire puis projette les ennemis.
  function onPlayerClickSandstorm(pid, itemName) {
    const c = aimSpot(pid, 10);
    if (!c) return true;
    sound.at(c, "cannonFire3", 0.75, 0.75, 22);
    let t = 0;
    run({
      next: function () {
        t++;
        ring(
          [c[0], c[1] + (t % 3) * 0.9, c[2]],
          2.6,
          7,
          {
            tex: TEX.square,
            life: [0.2, 0.42],
            power: [0.4, 1.2],
            size: [0.24, 0.48],
            gravity: [0, 1.8, 0],
            colors: [
              [[235, 200, 115], [185, 145, 65]],
              [[130, 95, 40, 0], [215, 175, 95, 0]],
            ],
          },
          t * 0.85,
        );
        pullIn(c, 4.2, pid, 0.85, 0.25);
        if (t % 2 === 0) hitArea(c, 3.8, pid, itemName, 17, { height: 3.6, slow: [1500, 2] });
        if (t >= 6) {
          pushOut(c, 4.0, pid, 1.4, 0.85);
          return { done: true };
        }
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // Quicksand Pit : fosse de sables mouvants dorés qui ralentit et draine.
  function onPlayerClickQuicksandPit(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const c = [p[0], p[1] + 0.15, p[2]];
    sound.at(c, "cannonFire3", 0.65, 0.6, 20);
    let t = 0;
    run({
      next: function () {
        t++;
        ring(
          c,
          4.2 * (1 - t * 0.08),
          8,
          {
            tex: TEX.square,
            life: [0.22, 0.45],
            power: [0.2, 0.6],
            size: [0.24, 0.46],
            colors: [
              [[225, 185, 95], [165, 125, 55]],
              [[120, 85, 30, 0], [200, 160, 80, 0]],
            ],
          },
          t * 0.6,
        );
        pullIn(c, 4.5, pid, 0.7, -0.1);
        if (t % 2 === 0) hitArea(c, 4.5, pid, itemName, 15, { height: 2.5, slow: [2000, 3] });
        if (t >= 6) return { done: true };
        return { value: sleep(3), done: false };
      },
    });
    return true;
  }

  // ------------------------------------------------------ UNCOMMON : DARK ---
  // Dark Matter : étend un tapis d'ombre qui engloutit puis explose.
  function onPlayerClickBlackHole(pid, itemName) {
    const c = aimSpot(pid, 9);
    if (!c) return true;
    sound.at(c, "cannonFire3", 0.75, 0.55, 22);
    let t = 0;
    run({
      next: function () {
        t++;
        ring(
          c,
          3.8,
          8,
          {
            tex: TEX.soul,
            life: [0.22, 0.48],
            power: [0.2, 0.8],
            size: [0.26, 0.52],
            colors: [
              [[60, 10, 110], [140, 40, 220]],
              [[20, 0, 40, 0], [80, 20, 130, 0]],
            ],
          },
          t * 0.7,
        );
        pullIn(c, 4.2, pid, 0.8, 0.1);
        if (t >= 4) {
          boom(c, 2.2, {
            tex: TEX.soul,
            count: 24,
            colors: [
              [[160, 50, 255], [40, 0, 80]],
              [[20, 0, 40, 0], [110, 30, 180, 0]],
            ],
          });
          hitArea(c, 4.2, pid, itemName, 52, { height: 3.2, slow: [2500, 3] });
          return { done: true };
        }
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // Liberation : pluie d'éclats d'ombre autour du joueur.
  function onPlayerClickDarkLiberation(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    sound.at(pid, "cannonFire3", 0.75, 0.7, 22);
    for (let i = 0; i < 5; i++) {
      const a = i * GOLDEN * 1.3;
      const spot = [p[0] + Math.cos(a) * 3.4, p[1] + 0.4, p[2] + Math.sin(a) * 3.4];
      seg([p[0], p[1] + 3.2, p[2]], spot, {
        r: 0.15,
        tex: TEX.soul,
        count: 6,
        life: [0.2, 0.45],
        size: [0.24, 0.48],
        colors: [
          [[150, 50, 240], [50, 10, 90]],
          [[20, 0, 40, 0], [100, 20, 160, 0]],
        ],
      });
    }
    hitArea(p, 4.8, pid, itemName, 46, { height: 3.2, slow: [2000, 2] });
    pushOut(p, 4.8, pid, 1.3, 0.5);
    return true;
  }

  // ----------------------------------------------------- UNCOMMON : EAGLE ---
  // Raptor Dive : envol doré puis piqué explosif vers la visée.
  function onPlayerClickFalconDive(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = facing(pid);
    sound.at(pid, "cannonFire3", 0.65, 1.4, 20);
    impulse(pid, d[0] * 2.2, 0.9, d[2] * 2.2);
    let t = 0;
    run({
      next: function () {
        t++;
        const q = posOf(pid);
        if (!q) return { done: true };
        point([q[0], q[1] + 0.9, q[2]], {
          r: 0.45,
          tex: TEX.glint,
          count: 7,
          life: [0.16, 0.34],
          size: [0.22, 0.44],
          colors: [
            [[255, 215, 110], [180, 120, 50]],
            [[120, 80, 30, 0], [240, 190, 90, 0]],
          ],
        });
        if (t >= 5) {
          boom(q, 2.0, {
            count: 22,
            colors: [
              [[255, 225, 130], [190, 130, 55]],
              [[110, 70, 25, 0], [235, 185, 85, 0]],
            ],
          });
          hitArea(q, 3.8, pid, itemName, 50, { height: 2.8 });
          pushOut(q, 3.8, pid, 1.4, 0.55);
          return { done: true };
        }
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // Feather Volley : salve de plumes acérées en cône.
  function onPlayerClickFeatherBarrage(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const fr = frame(facing(pid));
    sound.at(pid, "cannonFire3", 0.6, 1.55, 20);
    const seen = {};
    for (let k = -2; k <= 2; k++) {
      const ang = k * 0.14;
      const ca = Math.cos(ang),
        sa = Math.sin(ang);
      const dir = [fr.f[0] * ca + fr.r[0] * sa, fr.f[1], fr.f[2] * ca + fr.r[2] * sa];
      const a = [p[0] + dir[0] * 1.2, p[1] + 1.2, p[2] + dir[2] * 1.2];
      const b = [p[0] + dir[0] * 12, p[1] + 1.2 + dir[1] * 11, p[2] + dir[2] * 12];
      seg(a, b, {
        r: 0.12,
        tex: TEX.glint,
        count: 7,
        life: [0.16, 0.34],
        size: [0.22, 0.42],
        colors: [
          [[255, 225, 140], [200, 140, 65]],
          [[130, 85, 35, 0], [245, 205, 115, 0]],
        ],
      });
      const res = hitSeg(a, b, 1.35, pid, itemName, 0);
      for (const id in res.seen) {
        if (!seen[id]) {
          seen[id] = 1;
          damage(id, 44, pid, itemName);
          impulse(id, dir[0] * 1.2, 0.4, dir[2] * 1.2);
        }
      }
    }
    return true;
  }

  // --------------------------------------------------- UNCOMMON : DIAMOND ---
  // Brilliant Punk : charge d'épaule en diamant turquoise + bouclier.
  function onPlayerClickDiamondTackle(pid, itemName) {
    const p0 = posOf(pid);
    if (!p0) return true;
    const d = flatDir(pid);
    sound.at(pid, "cannonFire3", 0.75, 1.35, 20);
    eff(pid, "Damage Reduction", 5000, { inbuiltLevel: 2 });
    impulse(pid, d[0] * 2.4, 0.3, d[2] * 2.4);
    const seen = {};
    let t = 0;
    run({
      next: function () {
        const p = posOf(pid);
        if (!p || t >= 5) return { done: true };
        point([p[0], p[1] + 1.0, p[2]], {
          r: 0.65,
          tex: TEX.glint,
          count: 10,
          life: [0.18, 0.38],
          size: [0.24, 0.48],
          colors: [
            [[160, 255, 255], [255, 255, 255]],
            [[60, 200, 240, 0], [180, 255, 255, 0]],
          ],
        });
        const ids = lifeforms(pid);
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          if (seen[id]) continue;
          const q = posOf(id);
          if (q && dist2(q, p) <= 6.2) {
            seen[id] = 1;
            damage(id, 52, pid, itemName);
            impulse(id, d[0] * 1.8, 0.65, d[2] * 1.8);
          }
        }
        t++;
        return { value: sleep(1), done: false };
      },
    });
    return true;
  }

  // Prism Nova : éclats de cristal réfractés tout autour du joueur.
  function onPlayerClickPrismReflect(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    sound.at(pid, "cannonFire3", 0.75, 1.6, 22);
    eff(pid, "Damage Reduction", 6000, { inbuiltLevel: 3 });
    ring([p[0], p[1] + 1.0, p[2]], 3.6, 10, {
      tex: TEX.glint,
      life: [0.22, 0.48],
      power: [0.8, 2.2],
      size: [0.26, 0.54],
      colors: [
        [[170, 255, 255], [255, 255, 255]],
        [[80, 210, 255, 0], [200, 255, 255, 0]],
      ],
    });
    hitArea(p, 4.4, pid, itemName, 48, { height: 3.0 });
    pushOut(p, 4.4, pid, 1.5, 0.55);
    return true;
  }

  Object.assign(R, {
    onPlayerClickRocketBarrage,
    onPlayerClickPropellerFlight,
    onPlayerClickTwisterSlash,
    onPlayerClickSpringCannon,
    onPlayerClickLandmineField,
    onPlayerClickWhiteBlow,
    onPlayerClickSpikeRoll,
    onPlayerClickThornVolley,
    onPlayerClickFireFist,
    onPlayerClickFlamePillar,
    onPlayerClickIceSpears,
    onPlayerClickGlacialAge,
    onPlayerClickDesertSpada,
    onPlayerClickSandstorm,
    onPlayerClickQuicksandPit,
    onPlayerClickBlackHole,
    onPlayerClickDarkLiberation,
    onPlayerClickFalconDive,
    onPlayerClickFeatherBarrage,
    onPlayerClickDiamondTackle,
    onPlayerClickPrismReflect,
  });
})(globalThis.FA);
