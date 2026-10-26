// src/blocks/320-legendary-mythical-plus.js — NOUVELLES HABILITÉS (LEGENDARY II & MYTHICAL I)
// Source lisible. Ce fichier est minifié + empaqueté par `npm run build:blocks`.
// NE PAS coller ce fichier directement dans un Code Block : utiliser code-blocks/pack-XX.js.

(FA => {
  const C = FA.c,
    R = FA.r,
    F = C.fx,
    {
      api,
      damage,
      eff,
      heal,
      hitArea,
      hitSeg,
      impulse,
      isAliveId,
      lifeforms,
      markUntil,
      posOf,
      facing,
      targetBlock,
      teleport,
      boom,
      column,
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

  const mythicForms = FA.m || (FA.m = {});

  function flatDir(pid) {
    const d = facing(pid);
    return norm([d[0], 0, d[2]]);
  }

  function shake(pid, intensity, ms) {
    try {
      api.shakePlayerCamera(pid, intensity || 0.38, ms || 340);
    } catch (e) {}
  }

  function banner(pid, title, color) {
    try {
      api.sendFlyingMiddleMessage(
        pid,
        [{ str: "✦ " + title + " ✦", style: { color: color || "#facc15", fontWeight: "700" } }],
        90,
      );
    } catch (e) {}
  }

  function setScale(pid, s) {
    try {
      api.setLifeformScale(pid, s);
    } catch (e) {}
  }

  function clearMythicForm(pid) {
    const prev = mythicForms[pid];
    if (prev) prev.tok = -1;
    delete mythicForms[pid];
    setScale(pid, 1);
  }

  function startMythicForm(pid, cfg) {
    if (!isAliveId(pid)) return;
    clearMythicForm(pid);
    const tok = ((mythicForms[pid] && mythicForms[pid].tok) || 0) + 1;
    const state = { tok: tok };
    mythicForms[pid] = state;
    if (cfg.scale) setScale(pid, cfg.scale);
    if (cfg.title) banner(pid, cfg.title, cfg.bannerColor);
    shake(pid, cfg.shake || 0.42, 380);
    const cols = cfg.colors || [
      [[255, 215, 80], [255, 120, 40]],
      [[180, 70, 20, 0], [255, 240, 150, 0]],
    ];
    const p0 = posOf(pid);
    if (p0) {
      boom([p0[0], p0[1] + 1.1, p0[2]], 2.2, {
        tex: TEX.soul,
        count: 24,
        colors: cols,
      });
      column(p0, 3.2, {
        steps: 6,
        tex: TEX.glint,
        life: [0.22, 0.45],
        size: [0.32, 0.64],
        colors: cols,
      });
    }
    let step = 0;
    const maxSteps = cfg.steps || 14;
    run({
      next: function () {
        if (mythicForms[pid] !== state || state.tok !== tok) return { done: true };
        const p = posOf(pid);
        if (!p || !isAliveId(pid) || step >= maxSteps) {
          clearMythicForm(pid);
          return { done: true };
        }
        step++;
        point([p[0], p[1] + 1.15, p[2]], {
          r: 0.65,
          tex: TEX.soul,
          count: 4,
          life: [0.2, 0.42],
          power: [0.2, 0.85],
          size: [0.28, 0.54],
          gravity: [0, 1.2, 0],
          colors: cols,
        });
        if (cfg.onAura) {
          try {
            cfg.onAura(p, step);
          } catch (e) {}
        }
        return { value: sleep(cfg.interval || 3), done: false };
      },
    });
  }

  function poseSlam(pid, dur) {
    try {
      api.animateEntity(pid, {
        animationDurationMs: dur || 480,
        loop: false,
        nodeAnimations: {
          TorsoNode: {
            timeline: [
              { timeFraction: 0, rotation: { point: [-0.35, 0, 0] } },
              { timeFraction: 0.45, rotation: { point: [0.45, 0, 0] } },
              { timeFraction: 1, rotation: { point: [0, 0, 0] } },
            ],
          },
          ArmLeftMesh: {
            timeline: [
              { timeFraction: 0, rotation: { point: [-2.5, 0, -0.25] } },
              { timeFraction: 0.45, rotation: { point: [-0.4, 0, 0.2] } },
              { timeFraction: 1, rotation: { point: [0, 0, 0] } },
            ],
          },
          ArmRightMesh: {
            timeline: [
              { timeFraction: 0, rotation: { point: [-2.5, 0, 0.25] } },
              { timeFraction: 0.45, rotation: { point: [-0.4, 0, -0.2] } },
              { timeFraction: 1, rotation: { point: [0, 0, 0] } },
            ],
          },
        },
      });
    } catch (e) {}
  }

  function poseSlash(pid, dur) {
    try {
      api.animateEntity(pid, {
        animationDurationMs: dur || 420,
        loop: false,
        nodeAnimations: {
          TorsoNode: {
            timeline: [
              { timeFraction: 0, rotation: { point: [0, -0.8, 0] } },
              { timeFraction: 0.5, rotation: { point: [0.2, 0.9, 0] } },
              { timeFraction: 1, rotation: { point: [0, 0, 0] } },
            ],
          },
          ArmRightMesh: {
            timeline: [
              { timeFraction: 0, rotation: { point: [-1.8, -0.6, 0.6] } },
              { timeFraction: 0.5, rotation: { point: [-1.1, 0.8, -0.5] } },
              { timeFraction: 1, rotation: { point: [0, 0, 0] } },
            ],
          },
          ArmLeftMesh: {
            timeline: [
              { timeFraction: 0, rotation: { point: [-1.2, 0.5, -0.5] } },
              { timeFraction: 0.5, rotation: { point: [-1.7, -0.7, 0.4] } },
              { timeFraction: 1, rotation: { point: [0, 0, 0] } },
            ],
          },
        },
      });
    } catch (e) {}
  }

  function poseRoar(pid, dur) {
    try {
      api.animateEntity(pid, {
        animationDurationMs: dur || 600,
        loop: false,
        nodeAnimations: {
          TorsoNode: {
            timeline: [
              { timeFraction: 0, rotation: { point: [0.25, 0, 0] } },
              { timeFraction: 0.35, rotation: { point: [-0.35, 0, 0] } },
              { timeFraction: 1, rotation: { point: [0, 0, 0] } },
            ],
          },
          HeadMesh: {
            timeline: [
              { timeFraction: 0, rotation: { point: [0.3, 0, 0] } },
              { timeFraction: 0.35, rotation: { point: [-0.55, 0, 0] } },
              { timeFraction: 1, rotation: { point: [0, 0, 0] } },
            ],
          },
          ArmLeftMesh: {
            timeline: [
              { timeFraction: 0, rotation: { point: [-0.8, 0, 0.2] } },
              { timeFraction: 0.35, rotation: { point: [-2.1, 0, -0.75] } },
              { timeFraction: 1, rotation: { point: [0, 0, 0] } },
            ],
          },
          ArmRightMesh: {
            timeline: [
              { timeFraction: 0, rotation: { point: [-0.8, 0, -0.2] } },
              { timeFraction: 0.35, rotation: { point: [-2.1, 0, 0.75] } },
              { timeFraction: 1, rotation: { point: [0, 0, 0] } },
            ],
          },
        },
      });
    } catch (e) {}
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

  function pullIn(center, radius, caster, pullH, pullY) {
    const r = radius + 1.5;
    const ids = lifeforms(caster);
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const q = posOf(id);
      if (!q || dist2(q, center) > r * r) continue;
      const dx = center[0] - q[0],
        dz = center[2] - q[2],
        d = Math.sqrt(dx * dx + dz * dz) || 1;
      if (d > 0.4) impulse(id, (dx / d) * pullH, pullY, (dz / d) * pullH);
    }
  }

  // ----------------------------------------------------- LEGENDARY : SONG ---
  // Requiem Crescendo : 3 anneaux sonores concentriques qui explosent en accord final.
  function onPlayerClickCrescendoFinale(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    sound.at(pid, "magicAccent4", 0.85, 1.35, 24);
    let beat = 0;
    run({
      next: function () {
        beat++;
        const c = posOf(pid) || p;
        const r = beat * 2.2;
        sound.at(c, "magicAccent1", 0.7, 1.2 + beat * 0.15, 22);
        ring([c[0], c[1] + 0.9, c[2]], r, 9, {
          tex: TEX.glint,
          life: [0.2, 0.45],
          power: [0.4, 1.2],
          size: [0.26, 0.52],
          colors: [
            [[255, 120, 225], [120, 255, 185]],
            [[120, 255, 185, 0], [255, 120, 225, 0]],
          ],
        });
        hitArea(c, r + 1.0, pid, itemName, 28, { height: 3.2 });
        if (beat >= 3) {
          pushOut(c, 7.0, pid, 1.7, 0.65);
          return { done: true };
        }
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // Siren Lullaby : onde mélodique qui attire, ralentit et draine les ennemis proches.
  function onPlayerClickSirenHypnosis(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    sound.at(pid, "magicAccent4", 0.85, 1.5, 22);
    ring([p[0], p[1] + 1.1, p[2]], 5.0, 10, {
      tex: TEX.effect,
      life: [0.3, 0.65],
      power: [0.2, 0.7],
      size: [0.28, 0.56],
      colors: [
        [[130, 255, 195], [255, 130, 225]],
        [[255, 130, 225, 0], [130, 255, 195, 0]],
      ],
    });
    pullIn(p, 5.5, pid, 1.1, 0.25);
    const hits = hitArea(p, 5.5, pid, itemName, 72, { height: 3.2, slow: [3500, 3] });
    if (hits > 0) heal(pid, Math.min(35, hits * 14));
    return true;
  }

  // Bass Drop : onde de basse explosive au point visé qui projette en l'air.
  function onPlayerClickEncoreBeat(pid, itemName) {
    const c = aimSpot(pid, 12);
    if (!c) return true;
    sound.at(c, "cannonFire1", 0.9, 0.75, 24);
    boom(c, 2.3, {
      tex: TEX.glint,
      count: 24,
      colors: [
        [[255, 120, 225], [120, 255, 185]],
        [[255, 120, 225, 0], [120, 255, 185, 0]],
      ],
    });
    hitArea(c, 4.4, pid, itemName, 76, { height: 3.4 });
    pushOut(c, 4.4, pid, 1.4, 1.0);
    return true;
  }

  // -------------------------------------------------- LEGENDARY : PHOENIX ---
  // Immortal Blue Wings : envol dans des flammes bleues/dorées + soin + dégâts autour.
  function onPlayerClickBlueFlameWings(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = facing(pid);
    sound.at(pid, "magicAccent4", 0.85, 1.35, 24);
    heal(pid, 40);
    eff(pid, "Health Regen", 7000, { inbuiltLevel: 3 });
    impulse(pid, d[0] * 1.9, 0.95, d[2] * 1.9);
    ring([p[0], p[1] + 1.0, p[2]], 3.8, 10, {
      tex: TEX.soul,
      life: [0.25, 0.55],
      power: [0.5, 1.6],
      size: [0.3, 0.6],
      colors: [
        [[80, 220, 255], [255, 220, 90]],
        [[30, 140, 240, 0], [255, 190, 40, 0]],
      ],
    });
    hitArea(p, 4.4, pid, itemName, 72, { height: 3.4 });
    return true;
  }

  // Bluebird Blitz : ruée de feu bleu-cyan qui traverse et explose.
  function onPlayerClickPhoenixTalon(pid, itemName) {
    const p0 = posOf(pid);
    if (!p0) return true;
    const d = facing(pid);
    sound.at(pid, "bigDrumSwish1", 0.85, 1.4, 22);
    impulse(pid, d[0] * 2.6, Math.max(0.35, d[1] * 1.4), d[2] * 2.6);
    const seen = {};
    let t = 0;
    run({
      next: function () {
        const p = posOf(pid);
        if (!p || t >= 5) return { done: true };
        point([p[0], p[1] + 1.0, p[2]], {
          r: 0.6,
          tex: TEX.soul,
          count: 9,
          life: [0.18, 0.38],
          size: [0.28, 0.56],
          colors: [
            [[70, 225, 255], [255, 230, 100]],
            [[20, 130, 230, 0], [255, 180, 40, 0]],
          ],
        });
        const ids = lifeforms(pid);
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          if (seen[id]) continue;
          const q = posOf(id);
          if (q && dist2(q, p) <= 20.0) {
            seen[id] = 1;
            damage(id, 80, pid, itemName);
            impulse(id, d[0] * 1.5, 0.65, d[2] * 1.5);
          }
        }
        t++;
        return { value: sleep(1), done: false };
      },
    });
    return true;
  }

  // Ashes of Rebirth : immense nova de renaissance bleue et dorée.
  function onPlayerClickRebirthNova(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    sound.at(pid, "ominousBellHit", 0.9, 1.2, 26);
    sound.at(pid, "cannonFire2", 0.85, 1.1, 26);
    heal(pid, 45);
    boom(p, 3.0, {
      tex: TEX.soul,
      count: 30,
      colors: [
        [[80, 230, 255], [255, 225, 90]],
        [[30, 130, 240, 0], [255, 180, 30, 0]],
      ],
    });
    hitArea(p, 5.4, pid, itemName, 92, { height: 3.8 });
    pushOut(p, 5.4, pid, 1.8, 0.75);
    return true;
  }

  // --------------------------------------------------- LEGENDARY : PORTAL ---
  // Dimensional Loop : ouvre un portail sous les ennemis de la zone et les fait tomber de haut.
  function onPlayerClickDimensionalGate(pid, itemName) {
    const c = aimSpot(pid, 12);
    if (!c) return true;
    sound.at(c, "futureStrangePulse", 0.85, 1.2, 24);
    ring(c, 3.6, 10, {
      tex: TEX.soul,
      life: [0.25, 0.55],
      size: [0.28, 0.56],
      colors: [
        [[180, 80, 255], [90, 220, 255]],
        [[90, 20, 180, 0], [70, 180, 240, 0]],
      ],
    });
    const ids = lifeforms(pid);
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const q = posOf(id);
      if (q && dist2(q, c) <= 28.0) {
        teleport(id, c[0], c[1] + 5.5, c[2]);
        damage(id, 82, pid, itemName);
        eff(id, "Slowness", 2500, { inbuiltLevel: 3 });
      }
    }
    return true;
  }

  // Rift Salvo : 4 mini-portails violets autour du joueur qui tirent des lames dimensionnelles.
  function onPlayerClickWarpBarrage(pid, itemName) {
    const p = posOf(pid);
    const tgt = aimSpot(pid, 14);
    if (!p || !tgt) return true;
    sound.at(pid, "futureStrangePulse", 0.85, 1.45, 24);
    for (let i = 0; i < 4; i++) {
      const a = i * 1.57;
      const portal = [p[0] + Math.cos(a) * 1.8, p[1] + 2.0, p[2] + Math.sin(a) * 1.8];
      seg(portal, tgt, {
        r: 0.14,
        tex: TEX.soul,
        count: 8,
        life: [0.2, 0.42],
        size: [0.24, 0.48],
        colors: [
          [[190, 90, 255], [100, 230, 255]],
          [[90, 20, 180, 0], [80, 190, 240, 0]],
        ],
      });
    }
    boom(tgt, 2.0, {
      tex: TEX.soul,
      count: 20,
      colors: [
        [[190, 90, 255], [100, 230, 255]],
        [[80, 20, 170, 0], [70, 180, 230, 0]],
      ],
    });
    hitArea(tgt, 4.0, pid, itemName, 86, { height: 3.4 });
    return true;
  }

  // ------------------------------------------------ LEGENDARY : LIGHTNING ---
  // Raigo Stormcloud : nuage d'orage au-dessus de la visée qui bombarde d'éclairs.
  function onPlayerClickRaigoCloud(pid, itemName) {
    const c = aimSpot(pid, 14);
    if (!c) return true;
    sound.at(c, "cannonFire1", 0.9, 0.75, 26);
    let strike = 0;
    run({
      next: function () {
        strike++;
        const cloud = [c[0], c[1] + 7.5, c[2]];
        point(cloud, {
          r: 2.2,
          tex: TEX.effect,
          count: 10,
          life: [0.25, 0.5],
          size: [0.4, 0.8],
          colors: [
            [[50, 55, 80], [255, 240, 90]],
            [[30, 35, 50, 0], [255, 220, 60, 0]],
          ],
        });
        const a = strike * GOLDEN;
        const spot = [c[0] + Math.cos(a) * 1.8, c[1], c[2] + Math.sin(a) * 1.8];
        sound.at(spot, "cannonFire3", 0.8, 1.35, 24);
        seg(cloud, spot, {
          r: 0.2,
          tex: TEX.glint,
          count: 9,
          life: [0.16, 0.34],
          size: [0.26, 0.52],
          colors: [
            [[255, 250, 120], [130, 220, 255]],
            [[255, 210, 40, 0], [100, 190, 255, 0]],
          ],
        });
        hitArea(c, 4.5, pid, itemName, 32, { height: 4.0, slow: [1800, 3] });
        if (strike >= 3) {
          boom(c, 2.6, {
            tex: TEX.glint,
            count: 24,
            colors: [
              [[255, 250, 120], [120, 215, 255]],
              [[255, 200, 30, 0], [90, 180, 255, 0]],
            ],
          });
          return { done: true };
        }
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // Lightning Flash : dash en zigzag électrique à travers les ennemis devant soi.
  function onPlayerClickVoltStep(pid, itemName) {
    const p = posOf(pid);
    const dst = aimSpot(pid, 11);
    if (!p || !dst) return true;
    sound.at(p, "magicAccent3", 0.85, 1.65, 22);
    seg([p[0], p[1] + 1.0, p[2]], [dst[0], dst[1] + 1.0, dst[2]], {
      r: 0.2,
      tex: TEX.glint,
      count: 14,
      life: [0.2, 0.42],
      size: [0.26, 0.52],
      colors: [
        [[255, 250, 120], [130, 225, 255]],
        [[255, 210, 40, 0], [100, 190, 255, 0]],
      ],
    });
    hitSeg([p[0], p[1] + 1.0, p[2]], [dst[0], dst[1] + 1.0, dst[2]], 2.0, pid, itemName, 76, {
      slow: [2500, 3],
    });
    teleport(pid, dst[0], dst[1] + 0.5, dst[2]);
    return true;
  }

  // Discharge Nova : décharge sphérique haute tension autour du joueur.
  function onPlayerClickThunderGodAura(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    sound.at(pid, "cannonFire2", 0.9, 1.35, 24);
    boom(p, 2.8, {
      tex: TEX.glint,
      count: 26,
      colors: [
        [[255, 250, 120], [120, 220, 255]],
        [[255, 200, 30, 0], [80, 180, 255, 0]],
      ],
    });
    hitArea(p, 5.0, pid, itemName, 82, { height: 3.4, slow: [3000, 4] });
    pushOut(p, 5.0, pid, 1.6, 0.6);
    return true;
  }

  // ----------------------------------------------------- LEGENDARY : PAIN ---
  // Pressure Cannon : rafale d'ondes de choc roses/rouges à haute vitesse.
  function onPlayerClickPadCannon(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = facing(pid);
    const a = [p[0] + d[0] * 1.2, p[1] + 1.2, p[2] + d[2] * 1.2];
    const b = [p[0] + d[0] * 14, p[1] + 1.2 + d[1] * 13, p[2] + d[2] * 14];
    sound.at(pid, "bigDrumSwish1", 0.85, 1.45, 22);
    for (let i = 1; i <= 4; i++) {
      const k = i / 4;
      ring([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k], 1.1, 6, {
        tex: TEX.glint,
        life: [0.18, 0.36],
        size: [0.24, 0.48],
        colors: [
          [[255, 90, 130], [255, 220, 230]],
          [[200, 30, 70, 0], [255, 160, 190, 0]],
        ],
      });
    }
    const res = hitSeg(a, b, 1.9, pid, itemName, 78);
    for (const id in res.seen) {
      impulse(id, d[0] * 2.0, 0.65, d[2] * 2.0);
    }
    return true;
  }

  // Ursus Shock : bulle d'air comprimé rouge qui implose en déflagration colossale.
  function onPlayerClickUrsusShock(pid, itemName) {
    const c = aimSpot(pid, 11);
    if (!c) return true;
    sound.at(c, "pulseFromTheDark", 0.85, 0.75, 24);
    let stepIdx = 0;
    run({
      next: function () {
        stepIdx++;
        ring(c, Math.max(0.8, 3.8 - stepIdx * 0.9), 8, {
          tex: TEX.soul,
          life: [0.18, 0.36],
          size: [0.28, 0.56],
          colors: [
            [[255, 70, 110], [255, 200, 215]],
            [[180, 20, 50, 0], [255, 130, 160, 0]],
          ],
        });
        if (stepIdx >= 3) {
          boom(c, 3.2, {
            tex: TEX.crit,
            count: 30,
            colors: [
              [[255, 80, 120], [255, 220, 230]],
              [[180, 15, 45, 0], [255, 120, 150, 0]],
            ],
          });
          sound.at(c, "cannonFire1", 1.0, 0.55, 28);
          hitArea(c, 6.0, pid, itemName, 95, { height: 4.0 });
          pushOut(c, 6.0, pid, 2.4, 0.9);
          return { done: true };
        }
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // Pain Repel : repousse violemment tous les ennemis autour de soi + bouclier.
  function onPlayerClickRepelStep(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    sound.at(pid, "futureStrangePulse", 0.85, 1.35, 22);
    eff(pid, "Damage Reduction", 5000, { inbuiltLevel: 3 });
    ring([p[0], p[1] + 1.0, p[2]], 3.8, 9, {
      tex: TEX.glint,
      life: [0.2, 0.42],
      power: [0.8, 2.2],
      size: [0.26, 0.52],
      colors: [
        [[255, 85, 125], [255, 230, 235]],
        [[200, 25, 65, 0], [255, 150, 180, 0]],
      ],
    });
    hitArea(p, 4.4, pid, itemName, 72, { height: 3.0 });
    pushOut(p, 4.6, pid, 2.3, 0.75);
    return true;
  }

  // ------------------------------------------------- LEGENDARY : BLIZZARD ---
  // Whiteout Cyclone : cyclone polaire qui aspire et gèle les ennemis proches.
  function onPlayerClickBlizzardTornado(pid, itemName) {
    const c = aimSpot(pid, 11);
    if (!c) return true;
    sound.at(c, "bigDrumSwish2", 0.85, 1.15, 24);
    let t = 0;
    run({
      next: function () {
        t++;
        ring(
          [c[0], c[1] + (t % 3) * 1.1, c[2]],
          3.4,
          8,
          {
            tex: TEX.glint,
            life: [0.22, 0.48],
            power: [0.4, 1.2],
            size: [0.26, 0.52],
            gravity: [0, 1.6, 0],
            colors: [
              [[210, 248, 255], [110, 200, 255]],
              [[70, 150, 230, 0], [220, 250, 255, 0]],
            ],
          },
          t * 0.85,
        );
        pullIn(c, 4.6, pid, 0.9, 0.25);
        if (t % 2 === 0) hitArea(c, 4.4, pid, itemName, 29, { height: 4.0, slow: [3500, 4] });
        if (t >= 6) return { done: true };
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // --------------------------------------------------- MYTHICAL : GRAVITY ---
  // Singularity Well : puits gravitationnel violet qui écrase les ennemis au sol.
  function onPlayerClickGravityWell(pid, itemName) {
    const c = aimSpot(pid, 12);
    if (!c) return true;
    sound.at(c, "pulseFromTheDark", 0.9, 0.55, 26);
    let t = 0;
    run({
      next: function () {
        t++;
        ring(
          c,
          4.6,
          10,
          {
            tex: TEX.soul,
            life: [0.22, 0.48],
            power: [0.3, 0.9],
            size: [0.28, 0.56],
            gravity: [0, -5, 0],
            colors: [
              [[175, 70, 255], [90, 20, 160]],
              [[40, 0, 80, 0], [150, 50, 230, 0]],
            ],
          },
          t * 0.65,
        );
        pullIn(c, 5.0, pid, 0.95, -0.6);
        if (t % 2 === 0) hitArea(c, 4.8, pid, itemName, 32, { height: 3.4, slow: [3000, 4] });
        if (t >= 6) return { done: true };
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // --------------------------------------------------- MYTHICAL : MAMMOTH ---
  // Prehistoric Stampede : transformation en Mammouth Titan + charge sismique colossale.
  function onPlayerClickMammothStampede(pid, itemName) {
    const p0 = posOf(pid);
    if (!p0) return true;
    const d = flatDir(pid);
    eff(pid, "Damage Reduction", 8000, { inbuiltLevel: 3 });
    eff(pid, "Speed", 7000, { inbuiltLevel: 2 });
    sound.at(pid, "bearRoar1", 1.0, 0.55, 28);
    sound.at(pid, "cannonFire1", 0.9, 0.6, 26);
    poseSlam(pid, 600);
    startMythicForm(pid, {
      scale: 1.45,
      title: "ANCIENT MAMMOTH TITAN",
      bannerColor: "#d97706",
      colors: [
        [[210, 175, 120], [135, 95, 55]],
        [[90, 60, 35, 0], [245, 235, 210, 0]],
      ],
      steps: 14,
      onAura: function (ap, st) {
        ring(
          [ap[0], ap[1] + 0.25, ap[2]],
          2.8,
          8,
          {
            tex: TEX.square,
            life: [0.22, 0.45],
            power: [0.3, 1.1],
            size: [0.28, 0.55],
            colors: [
              [[210, 175, 120], [135, 95, 55]],
              [[90, 60, 35, 0], [245, 235, 210, 0]],
            ],
          },
          st * 0.6,
        );
      },
    });
    const seen = {};
    let t = 0;
    run({
      next: function () {
        const p = posOf(pid);
        if (!p || !isAliveId(pid) || t >= 7) return { done: true };
        impulse(pid, d[0] * 1.95, 0.18, d[2] * 1.95);
        if (t % 2 === 0) sound.at(p, "cannonFire1", 0.75, 0.55 + t * 0.05, 24);
        ring([p[0], p[1] + 0.25, p[2]], 3.0, 9, {
          tex: TEX.square,
          life: [0.2, 0.42],
          power: [0.6, 1.7],
          size: [0.32, 0.62],
          colors: [
            [[190, 145, 90], [250, 245, 225]],
            [[80, 55, 30, 0], [160, 120, 75, 0]],
          ],
        });
        const ids = lifeforms(pid);
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          if (seen[id]) continue;
          const q = posOf(id);
          if (q && dist2(q, p) <= 25.0) {
            seen[id] = 1;
            damage(id, 98, pid, itemName);
            impulse(id, d[0] * 2.1, 0.95, d[2] * 2.1);
          }
        }
        t++;
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // Ivory Tusk Launch : double défense d'ivoire géante + geyser de roche qui projette très haut.
  function onPlayerClickTuskGore(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const fr = frame(facing(pid));
    const c = [p[0] + fr.f[0] * 3.2, p[1] + 1.0, p[2] + fr.f[2] * 3.2];
    poseSlam(pid, 460);
    shake(pid, 0.36, 300);
    sound.at(pid, "critical_hit", 0.9, 0.7, 24);
    sound.at(c, "cannonFire2", 0.9, 0.65, 24);
    for (let s = -1; s <= 1; s += 2) {
      const base = [p[0] + fr.r[0] * s * 1.0, p[1] + 0.7, p[2] + fr.r[2] * s * 1.0];
      const mid = [p[0] + fr.f[0] * 1.8 + fr.r[0] * s * 1.2, p[1] + 1.5, p[2] + fr.f[2] * 1.8 + fr.r[2] * s * 1.2];
      const tip = [c[0] + fr.r[0] * s * 0.55, c[1] + 3.4, c[2] + fr.r[2] * s * 0.55];
      seg(base, mid, {
        r: 0.22,
        tex: TEX.square,
        count: 7,
        life: [0.25, 0.5],
        size: [0.32, 0.6],
        colors: [
          [[255, 250, 235], [210, 190, 155]],
          [[160, 145, 115, 0], [255, 250, 235, 0]],
        ],
      });
      seg(mid, tip, {
        r: 0.2,
        tex: TEX.glint,
        count: 7,
        life: [0.25, 0.5],
        size: [0.3, 0.58],
        colors: [
          [[255, 252, 240], [220, 195, 150]],
          [[170, 150, 115, 0], [255, 252, 240, 0]],
        ],
      });
    }
    column([c[0], c[1] - 0.5, c[2]], 4.2, {
      tex: TEX.square,
      r: 0.4,
      count: 2,
      steps: 6,
      life: [0.22, 0.45],
      colors: [
        [[185, 140, 85], [250, 245, 225]],
        [[95, 65, 35, 0], [210, 175, 120, 0]],
      ],
    });
    hitArea(c, 4.2, pid, itemName, 92, { height: 3.8 });
    pushOut(c, 4.2, pid, 1.4, 1.35);
    return true;
  }

  // Ancient Roar : rugissement sonique préhistorique à 3 anneaux d'onde de choc.
  function onPlayerClickTrunkTrumpet(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = facing(pid);
    poseRoar(pid, 620);
    shake(pid, 0.45, 420);
    sound.at(pid, "bearRoar1", 1.0, 0.5, 28);
    sound.at(pid, "ominousBellHit", 0.85, 0.65, 28);
    for (let k = 1; k <= 3; k++) {
      const c = [p[0] + d[0] * k * 2.2, p[1] + 1.2 + d[1] * k * 1.4, p[2] + d[2] * k * 2.2];
      ring(c, 1.8 + k * 0.9, 9, {
        tex: TEX.crit,
        life: [0.24, 0.52],
        power: [0.8, 2.2],
        size: [0.3, 0.6],
        colors: [
          [[235, 195, 120], [150, 105, 55]],
          [[90, 60, 30, 0], [250, 235, 195, 0]],
        ],
      });
    }
    const center = [p[0] + d[0] * 4.4, p[1] + 1.2 + d[1] * 2.0, p[2] + d[2] * 4.4];
    hitArea(center, 5.4, pid, itemName, 90, { height: 3.8, slow: [3500, 3] });
    pushOut(center, 5.4, pid, 2.2, 0.75);
    return true;
  }

  // Continental Crush : bond colossal puis impact cataclysmique à 3 ondes telluriques.
  function onPlayerClickExtinctionQuake(pid, itemName) {
    const p0 = posOf(pid);
    if (!p0) return true;
    const d = flatDir(pid);
    sound.at(pid, "bearRoar1", 0.95, 0.5, 28);
    impulse(pid, d[0] * 1.4, 1.05, d[2] * 1.4);
    poseSlam(pid, 650);
    let step = 0;
    run({
      next: function () {
        step++;
        const p = posOf(pid) || p0;
        if (step === 1) {
          shake(pid, 0.52, 480);
          sound.at(p, "cannonFire1", 1.0, 0.45, 30);
          sound.at(p, "ominousBellHit", 0.9, 0.55, 30);
          boom(p, 3.6, {
            tex: TEX.square,
            count: 32,
            colors: [
              [[210, 165, 100], [115, 80, 45]],
              [[70, 50, 25, 0], [245, 225, 185, 0]],
            ],
          });
          hitArea(p, 6.4, pid, itemName, 118, { height: 4.0, slow: [3500, 3] });
          pushOut(p, 6.4, pid, 2.3, 1.0);
        }
        const r = step * 2.3;
        ring([p[0], p[1] + 0.25, p[2]], r, 10, {
          tex: TEX.square,
          life: [0.24, 0.5],
          power: [0.5, 1.6],
          size: [0.32, 0.64],
          colors: [
            [[220, 175, 110], [130, 90, 50]],
            [[80, 55, 30, 0], [250, 235, 200, 0]],
          ],
        });
        if (step >= 3) return { done: true };
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // ----------------------------------------------------- MYTHICAL : T-REX ---
  // Tyrant Jaws : bond prédateur + double mâchoire d'énergie écarlate/noire qui se referme.
  function onPlayerClickTrexBite(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const fr = frame(facing(pid));
    const d = fr.f;
    poseSlam(pid, 420);
    shake(pid, 0.38, 300);
    sound.at(pid, "bearRoar1", 0.9, 0.75, 26);
    sound.at(pid, "critical_hit", 0.95, 0.75, 26);
    impulse(pid, d[0] * 2.2, 0.42, d[2] * 2.2);
    const c = [p[0] + d[0] * 3.6, p[1] + 1.15 + d[1] * 1.8, p[2] + d[2] * 3.6];
    for (let jaw = -1; jaw <= 1; jaw += 2) {
      for (let i = -2; i <= 2; i++) {
        const fangBase = [
          c[0] + fr.r[0] * i * 0.45 - d[0] * 0.8,
          c[1] + jaw * 1.15,
          c[2] + fr.r[2] * i * 0.45 - d[2] * 0.8,
        ];
        seg(fangBase, c, {
          r: 0.15,
          tex: TEX.crit,
          count: 5,
          life: [0.2, 0.42],
          size: [0.28, 0.54],
          colors: [
            [[255, 45, 45], [25, 5, 10]],
            [[20, 0, 0, 0], [255, 80, 50, 0]],
          ],
        });
      }
    }
    boom(c, 2.4, {
      tex: TEX.crit,
      count: 26,
      colors: [
        [[255, 50, 50], [40, 10, 15]],
        [[30, 0, 0, 0], [220, 30, 30, 0]],
      ],
    });
    hitArea(c, 4.4, pid, itemName, 102, { height: 3.4, slow: [2500, 3] });
    return true;
  }

  // Saurian Tail Whip : rotation complète et double anneau d'onde de choc écarlate.
  function onPlayerClickTailSwipe(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    poseSlash(pid, 440);
    sound.at(pid, "bigDrumSwish1", 0.95, 0.75, 24);
    sound.at(pid, "cannonFire2", 0.85, 0.85, 24);
    for (let r = 2.6; r <= 4.4; r += 1.8) {
      ring([p[0], p[1] + 0.9, p[2]], r, 10, {
        tex: TEX.crit,
        life: [0.22, 0.45],
        power: [0.7, 2.0],
        size: [0.3, 0.58],
        colors: [
          [[255, 70, 35], [50, 10, 10]],
          [[40, 5, 5, 0], [240, 55, 25, 0]],
        ],
      });
    }
    hitArea(p, 4.8, pid, itemName, 92, { height: 3.2 });
    pushOut(p, 4.8, pid, 2.3, 0.75);
    return true;
  }

  // King's Roar : transformation en T-Rex Apex + rugissement primal qui marque toutes les proies.
  function onPlayerClickPredatorRoar(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    poseRoar(pid, 640);
    eff(pid, "Damage", 8000, { inbuiltLevel: 3 });
    eff(pid, "Speed", 8000, { inbuiltLevel: 2 });
    sound.at(pid, "bearRoar1", 1.0, 0.6, 30);
    sound.at(pid, "ominousBellHit", 0.85, 0.75, 28);
    startMythicForm(pid, {
      scale: 1.42,
      title: "APEX T-REX AWAKENING",
      bannerColor: "#ef4444",
      colors: [
        [[255, 40, 40], [35, 5, 10]],
        [[25, 0, 0, 0], [255, 110, 50, 0]],
      ],
      steps: 14,
      onAura: function (ap, st) {
        ring(
          [ap[0], ap[1] + 1.0, ap[2]],
          3.0,
          8,
          {
            tex: TEX.crit,
            life: [0.2, 0.42],
            power: [0.4, 1.2],
            size: [0.26, 0.52],
            colors: [
              [[255, 40, 40], [35, 5, 10]],
              [[25, 0, 0, 0], [255, 110, 50, 0]],
            ],
          },
          st * 0.75,
        );
      },
    });
    ring([p[0], p[1] + 1.2, p[2]], 5.4, 12, {
      tex: TEX.crit,
      life: [0.28, 0.58],
      power: [0.8, 2.2],
      size: [0.32, 0.64],
      colors: [
        [[255, 45, 45], [255, 160, 60]],
        [[160, 10, 10, 0], [255, 60, 60, 0]],
      ],
    });
    const ids = lifeforms(pid);
    const exp = Date.now() + 8000;
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const q = posOf(id);
      if (q && dist2(q, p) <= 49) {
        markUntil(id, pid, exp);
        damage(id, 90, pid, itemName);
        eff(id, "Slowness", 3500, { inbuiltLevel: 3 });
      }
    }
    return true;
  }

  // Extinction Rampage : frénésie de 5 assauts sauvages + impact météorique final.
  function onPlayerClickMeteoricRampage(pid, itemName) {
    if (!isAliveId(pid)) return false;
    sound.at(pid, "bearRoar1", 0.95, 0.7, 26);
    let f = 0;
    run({
      next: function () {
        const p = posOf(pid);
        if (!p || f >= 5) return { done: true };
        const d = flatDir(pid);
        poseSlash(pid, 320);
        impulse(pid, d[0] * 1.55, 0.22, d[2] * 1.55);
        const c = [p[0] + d[0] * 3.2, p[1] + 1.0, p[2] + d[2] * 3.2];
        sound.at(c, f === 4 ? "cannonFire1" : "critical_hit", 0.85, 0.75 + f * 0.12, 24);
        boom(c, f === 4 ? 2.8 : 1.9, {
          tex: TEX.crit,
          count: f === 4 ? 28 : 18,
          colors: [
            [[255, 55, 40], [45, 5, 10]],
            [[35, 0, 0, 0], [255, 130, 40, 0]],
          ],
        });
        hitArea(c, 4.0, pid, itemName, f === 4 ? 42 : 26, { height: 3.2 });
        if (f === 4) pushOut(c, 4.4, pid, 2.0, 0.8);
        f++;
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // ---------------------------------------------------- MYTHICAL : DOUGHT ---
  // Mochi Thrust : éveil Mochi + vrille foreuse entourée d'un tunnel d'anneaux de pâte.
  function onPlayerClickMochiBuzzsaw(pid, itemName) {
    const p0 = posOf(pid);
    if (!p0) return true;
    const d = facing(pid);
    poseSlash(pid, 500);
    sound.at(pid, "bigDrumSwish2", 0.9, 1.15, 24);
    sound.at(pid, "cannonFire2", 0.8, 1.1, 24);
    startMythicForm(pid, {
      scale: 1.18,
      title: "AWAKENED MOCHI SOVEREIGN",
      bannerColor: "#fef08a",
      colors: [
        [[255, 250, 230], [235, 195, 130]],
        [[195, 160, 100, 0], [255, 252, 235, 0]],
      ],
      steps: 12,
      onAura: function (ap, st) {
        ring(
          [ap[0], ap[1] + 1.1, ap[2]],
          2.2,
          7,
          {
            tex: TEX.square,
            life: [0.18, 0.36],
            size: [0.24, 0.48],
            colors: [
              [[255, 250, 230], [235, 195, 130]],
              [[195, 160, 100, 0], [255, 252, 235, 0]],
            ],
          },
          st * 0.9,
        );
      },
    });
    impulse(pid, d[0] * 2.6, Math.max(0.32, d[1] * 1.35), d[2] * 2.6);
    const seen = {};
    let t = 0;
    run({
      next: function () {
        const p = posOf(pid);
        if (!p || t >= 6) return { done: true };
        ring(
          [p[0], p[1] + 1.0, p[2]],
          2.1,
          8,
          {
            tex: TEX.square,
            life: [0.2, 0.4],
            size: [0.28, 0.56],
            colors: [
              [[255, 248, 225], [235, 200, 140]],
              [[200, 170, 115, 0], [255, 250, 235, 0]],
            ],
          },
          t * 1.1,
        );
        const ids = lifeforms(pid);
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          if (seen[id]) continue;
          const q = posOf(id);
          if (q && dist2(q, p) <= 22.0) {
            seen[id] = 1;
            damage(id, 96, pid, itemName);
            eff(id, "Slowness", 3200, { inbuiltLevel: 3 });
          }
        }
        t++;
        return { value: sleep(1), done: false };
      },
    });
    return true;
  }

  // Peerless Donuts : 4 donuts dimensionnels flottants qui pilonnent la cible en rafale avant d'imploser.
  function onPlayerClickUnstoppableDonuts(pid, itemName) {
    const c = aimSpot(pid, 13);
    if (!c) return true;
    poseSlam(pid, 520);
    shake(pid, 0.4, 360);
    sound.at(c, "futureStrangePulse", 0.9, 1.05, 26);
    let wave = 0;
    run({
      next: function () {
        wave++;
        for (let i = 0; i < 4; i++) {
          const a = i * 1.57 + wave * 0.35;
          const donut = [c[0] + Math.cos(a) * 3.4, c[1] + 2.8, c[2] + Math.sin(a) * 3.4];
          ring(donut, 0.95, 6, {
            tex: TEX.square,
            life: [0.2, 0.4],
            size: [0.24, 0.46],
            colors: [
              [[255, 245, 215], [230, 185, 120]],
              [[185, 145, 90, 0], [255, 250, 230, 0]],
            ],
          });
          seg(donut, c, {
            r: 0.25,
            tex: TEX.square,
            count: 7,
            life: [0.18, 0.36],
            size: [0.28, 0.54],
            colors: [
              [[255, 248, 225], [235, 195, 130]],
              [[190, 155, 100, 0], [255, 250, 235, 0]],
            ],
          });
        }
        sound.at(c, "cannonFire2", 0.75, 0.9 + wave * 0.1, 24);
        hitArea(c, 4.8, pid, itemName, 32, { height: 3.8, slow: [3000, 3] });
        if (wave >= 4) {
          sound.at(c, "cannonFire1", 0.95, 0.65, 28);
          boom(c, 2.8, {
            tex: TEX.square,
            count: 28,
            colors: [
              [[255, 248, 225], [230, 190, 130]],
              [[180, 145, 95, 0], [255, 248, 230, 0]],
            ],
          });
          pushOut(c, 4.8, pid, 1.9, 0.8);
          return { done: true };
        }
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // ---------------------------------------------------- MYTHICAL : SHADOW ---
  // Brick Bat Swarm : 3 vagues de chauves-souris d'ombre qui lacèrent en ligne.
  function onPlayerClickBrickBat(pid, itemName) {
    if (!isAliveId(pid)) return false;
    poseSlash(pid, 420);
    sound.at(pid, "magicAccent3", 0.85, 1.45, 24);
    let w = 0;
    run({
      next: function () {
        const p = posOf(pid);
        if (!p || w >= 3) return { done: true };
        const d = facing(pid);
        const a = [p[0] + d[0] * 1.2, p[1] + 1.2, p[2] + d[2] * 1.2];
        const b = [p[0] + d[0] * 14, p[1] + 1.2 + d[1] * 13, p[2] + d[2] * 14];
        sound.at(pid, "critical_hit", 0.75, 1.35 + w * 0.12, 22);
        seg(a, b, {
          r: 0.5,
          tex: TEX.soul,
          count: 12,
          life: [0.22, 0.48],
          power: [0.5, 1.5],
          size: [0.26, 0.52],
          colors: [
            [[35, 5, 65], [170, 55, 245]],
            [[15, 0, 30, 0], [115, 30, 180, 0]],
          ],
        });
        hitSeg(a, b, 2.1, pid, itemName, 32, { slow: [2500, 2] });
        w++;
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // Shadow Swap : double d'ombre explosif au départ + téléportation + nova d'ombre à l'arrivée.
  function onPlayerClickDoppelmanSwap(pid, itemName) {
    const p = posOf(pid);
    const dst = aimSpot(pid, 12);
    if (!p || !dst) return true;
    sound.at(p, "futureStrangePulse", 0.85, 1.25, 24);
    boom(p, 1.8, {
      tex: TEX.soul,
      count: 16,
      colors: [
        [[45, 10, 80], [175, 60, 250]],
        [[15, 0, 35, 0], [120, 35, 190, 0]],
      ],
    });
    seg([p[0], p[1] + 1.0, p[2]], [dst[0], dst[1] + 1.0, dst[2]], {
      r: 0.25,
      tex: TEX.soul,
      count: 12,
      life: [0.25, 0.5],
      size: [0.28, 0.54],
      colors: [
        [[45, 10, 80], [170, 60, 245]],
        [[20, 0, 40, 0], [120, 40, 190, 0]],
      ],
    });
    teleport(pid, dst[0], dst[1] + 0.5, dst[2]);
    sound.at(dst, "pulseFromTheDark", 0.9, 1.15, 24);
    boom(dst, 2.4, {
      tex: TEX.soul,
      count: 24,
      colors: [
        [[50, 10, 90], [180, 65, 255]],
        [[20, 0, 40, 0], [120, 35, 190, 0]],
      ],
    });
    hitArea(dst, 4.4, pid, itemName, 90, { height: 3.4 });
    return true;
  }

  // Black Box : cage cubique d'ombres en 3D qui se resserre puis implose.
  function onPlayerClickShadowBox(pid, itemName) {
    const c = aimSpot(pid, 12);
    if (!c) return true;
    poseSlam(pid, 460);
    sound.at(c, "ominousBellHit", 0.85, 0.8, 26);
    let step = 0;
    run({
      next: function () {
        step++;
        const r = Math.max(1.2, 3.6 - step * 0.7);
        ring([c[0], c[1] + 0.3, c[2]], r, 8, {
          tex: TEX.soul,
          life: [0.22, 0.45],
          size: [0.3, 0.58],
          colors: [
            [[30, 5, 55], [155, 45, 235]],
            [[15, 0, 30, 0], [100, 25, 165, 0]],
          ],
        });
        ring([c[0], c[1] + 2.8, c[2]], r, 8, {
          tex: TEX.soul,
          life: [0.22, 0.45],
          size: [0.3, 0.58],
          colors: [
            [[30, 5, 55], [155, 45, 235]],
            [[15, 0, 30, 0], [100, 25, 165, 0]],
          ],
        });
        pullIn(c, 4.4, pid, 0.9, 0.15);
        if (step >= 3) {
          sound.at(c, "cannonFire2", 0.95, 0.65, 28);
          boom(c, 2.8, {
            tex: TEX.soul,
            count: 28,
            colors: [
              [[170, 55, 250], [30, 5, 60]],
              [[15, 0, 30, 0], [120, 30, 185, 0]],
            ],
          });
          hitArea(c, 4.8, pid, itemName, 108, { height: 3.8, slow: [3500, 4] });
          return { done: true };
        }
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // Night Sovereign (Shadows' Asgard) : transformation géante en Seigneur des Ombres + vortex de 1000 ombres.
  function onPlayerClickShadowsAsgard(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    poseRoar(pid, 680);
    sound.at(pid, "pulseFromTheDark", 1.0, 0.55, 30);
    sound.at(pid, "ominousBellHit", 0.95, 0.6, 30);
    eff(pid, "Damage", 9000, { inbuiltLevel: 3 });
    eff(pid, "Damage Reduction", 9000, { inbuiltLevel: 3 });
    startMythicForm(pid, {
      scale: 1.5,
      title: "SHADOWS' ASGARD OVERLORD",
      bannerColor: "#a855f7",
      colors: [
        [[175, 60, 255], [25, 0, 50]],
        [[15, 0, 30, 0], [130, 35, 200, 0]],
      ],
      steps: 15,
      onAura: function (ap, st) {
        ring(
          [ap[0], ap[1] + 0.9, ap[2]],
          3.8,
          9,
          {
            tex: TEX.soul,
            life: [0.22, 0.48],
            power: [0.4, 1.3],
            size: [0.3, 0.6],
            gravity: [0, 1.4, 0],
            colors: [
              [[175, 60, 255], [25, 0, 50]],
              [[15, 0, 30, 0], [130, 35, 200, 0]],
            ],
          },
          st * 0.7,
        );
        if (st % 3 === 0) {
          hitArea(ap, 4.6, pid, itemName, 18, { height: 3.6, slow: [2000, 2] });
        }
      },
    });
    boom(p, 3.6, {
      tex: TEX.soul,
      count: 34,
      colors: [
        [[175, 60, 255], [30, 0, 55]],
        [[15, 0, 30, 0], [120, 30, 190, 0]],
      ],
    });
    hitArea(p, 6.0, pid, itemName, 118, { height: 4.2, slow: [3000, 3] });
    pushOut(p, 6.0, pid, 2.1, 0.85);
    return true;
  }

  Object.assign(R, {
    onPlayerClickCrescendoFinale,
    onPlayerClickSirenHypnosis,
    onPlayerClickEncoreBeat,
    onPlayerClickBlueFlameWings,
    onPlayerClickPhoenixTalon,
    onPlayerClickRebirthNova,
    onPlayerClickDimensionalGate,
    onPlayerClickWarpBarrage,
    onPlayerClickRaigoCloud,
    onPlayerClickVoltStep,
    onPlayerClickThunderGodAura,
    onPlayerClickPadCannon,
    onPlayerClickUrsusShock,
    onPlayerClickRepelStep,
    onPlayerClickBlizzardTornado,
    onPlayerClickGravityWell,
    onPlayerClickMammothStampede,
    onPlayerClickTuskGore,
    onPlayerClickTrunkTrumpet,
    onPlayerClickExtinctionQuake,
    onPlayerClickTrexBite,
    onPlayerClickTailSwipe,
    onPlayerClickPredatorRoar,
    onPlayerClickMeteoricRampage,
    onPlayerClickMochiBuzzsaw,
    onPlayerClickUnstoppableDonuts,
    onPlayerClickBrickBat,
    onPlayerClickDoppelmanSwap,
    onPlayerClickShadowBox,
    onPlayerClickShadowsAsgard,
  });
  FA.clearMythic = clearMythicForm;
})(globalThis.FA);
