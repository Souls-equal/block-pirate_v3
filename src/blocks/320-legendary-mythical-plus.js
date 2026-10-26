// src/blocks/320-legendary-mythical-plus.js — NOUVELLES HABILITÉS (LEGENDARY II & MYTHICAL I)
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
      markUntil,
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
    sound.at(pid, "cannonFire3", 0.75, 1.35, 24);
    let beat = 0;
    run({
      next: function () {
        beat++;
        const c = posOf(pid) || p;
        const r = beat * 2.2;
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
    sound.at(pid, "cannonFire3", 0.65, 1.55, 22);
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
    sound.at(c, "cannonFire3", 0.85, 0.7, 24);
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
    sound.at(pid, "cannonFire3", 0.75, 1.35, 22);
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
    sound.at(pid, "cannonFire3", 0.75, 1.45, 22);
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
    sound.at(pid, "cannonFire3", 0.9, 1.1, 26);
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
    sound.at(c, "cannonFire3", 0.75, 1.25, 22);
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
    sound.at(pid, "cannonFire3", 0.75, 1.45, 22);
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
    sound.at(c, "cannonFire3", 0.9, 0.75, 26);
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
    sound.at(p, "cannonFire3", 0.75, 1.65, 22);
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
    sound.at(pid, "cannonFire3", 0.85, 1.45, 24);
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
    sound.at(pid, "cannonFire3", 0.75, 1.5, 22);
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
    sound.at(c, "cannonFire3", 0.75, 0.55, 24);
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
          sound.at(c, "cannonFire3", 1.0, 0.5, 28);
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
    sound.at(pid, "cannonFire3", 0.75, 1.55, 22);
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
    sound.at(c, "cannonFire3", 0.8, 1.2, 24);
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
    sound.at(c, "cannonFire3", 0.9, 0.5, 26);
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
  // Prehistoric Stampede : charge colossale qui renverse tout sur le passage.
  function onPlayerClickMammothStampede(pid, itemName) {
    const p0 = posOf(pid);
    if (!p0) return true;
    const d = flatDir(pid);
    eff(pid, "Damage Reduction", 7000, { inbuiltLevel: 3 });
    sound.at(pid, "cannonFire3", 0.9, 0.55, 24);
    const seen = {};
    let t = 0;
    run({
      next: function () {
        const p = posOf(pid);
        if (!p || !isAliveId(pid) || t >= 6) return { done: true };
        impulse(pid, d[0] * 1.85, 0.15, d[2] * 1.85);
        ring([p[0], p[1] + 0.25, p[2]], 2.6, 8, {
          tex: TEX.square,
          life: [0.18, 0.38],
          power: [0.5, 1.5],
          size: [0.28, 0.56],
          colors: [
            [[170, 125, 80], [115, 80, 45]],
            [[80, 55, 30, 0], [150, 110, 70, 0]],
          ],
        });
        const ids = lifeforms(pid);
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          if (seen[id]) continue;
          const q = posOf(id);
          if (q && dist2(q, p) <= 22.0) {
            seen[id] = 1;
            damage(id, 94, pid, itemName);
            impulse(id, d[0] * 1.9, 0.85, d[2] * 1.9);
          }
        }
        t++;
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // Ivory Tusk Launch : coup de défenses d'ivoire géantes qui projette très haut.
  function onPlayerClickTuskGore(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const fr = frame(facing(pid));
    const c = [p[0] + fr.f[0] * 3.0, p[1] + 1.0, p[2] + fr.f[2] * 3.0];
    sound.at(pid, "cannonFire3", 0.85, 0.7, 22);
    for (let s = -1; s <= 1; s += 2) {
      const base = [p[0] + fr.r[0] * s * 0.9, p[1] + 0.8, p[2] + fr.r[2] * s * 0.9];
      const tip = [c[0] + fr.r[0] * s * 0.6, c[1] + 2.8, c[2] + fr.r[2] * s * 0.6];
      seg(base, tip, {
        r: 0.18,
        tex: TEX.square,
        count: 8,
        life: [0.22, 0.45],
        size: [0.28, 0.54],
        colors: [
          [[250, 245, 225], [200, 185, 150]],
          [[160, 145, 115, 0], [255, 250, 235, 0]],
        ],
      });
    }
    hitArea(c, 3.8, pid, itemName, 88, { height: 3.4 });
    pushOut(c, 3.8, pid, 1.3, 1.25);
    return true;
  }

  // Ancient Roar : rugissement sonique préhistorique en cône.
  function onPlayerClickTrunkTrumpet(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = facing(pid);
    const c = [p[0] + d[0] * 4.2, p[1] + 1.2 + d[1] * 2.0, p[2] + d[2] * 4.2];
    sound.at(pid, "cannonFire3", 0.95, 0.5, 26);
    ring(c, 3.8, 10, {
      tex: TEX.crit,
      life: [0.22, 0.48],
      power: [0.8, 2.2],
      size: [0.3, 0.6],
      colors: [
        [[210, 165, 95], [140, 95, 50]],
        [[90, 60, 30, 0], [200, 150, 85, 0]],
      ],
    });
    hitArea(c, 5.0, pid, itemName, 86, { height: 3.5, slow: [3000, 3] });
    pushOut(c, 5.0, pid, 2.1, 0.65);
    return true;
  }

  // Continental Crush : bond colossal et séisme préhistorique.
  function onPlayerClickExtinctionQuake(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    sound.at(pid, "cannonFire3", 1.0, 0.45, 28);
    boom(p, 3.2, {
      tex: TEX.square,
      count: 30,
      colors: [
        [[185, 140, 85], [115, 80, 45]],
        [[70, 50, 25, 0], [170, 125, 75, 0]],
      ],
    });
    hitArea(p, 6.2, pid, itemName, 115, { height: 3.8, slow: [3000, 3] });
    pushOut(p, 6.2, pid, 2.2, 0.95);
    return true;
  }

  // ----------------------------------------------------- MYTHICAL : T-REX ---
  // Tyrant Jaws : bond vers l'avant et morsure géante d'énergie rouge/noire.
  function onPlayerClickTrexBite(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = facing(pid);
    sound.at(pid, "cannonFire3", 0.9, 0.65, 24);
    impulse(pid, d[0] * 2.1, 0.4, d[2] * 2.1);
    const c = [p[0] + d[0] * 3.4, p[1] + 1.1 + d[1] * 1.8, p[2] + d[2] * 3.4];
    boom(c, 2.2, {
      tex: TEX.crit,
      count: 24,
      colors: [
        [[255, 50, 50], [40, 10, 15]],
        [[30, 0, 0, 0], [220, 30, 30, 0]],
      ],
    });
    hitArea(c, 4.0, pid, itemName, 98, { height: 3.2, slow: [2500, 3] });
    return true;
  }

  // Saurian Tail Whip : balayage circulaire brutal autour du joueur.
  function onPlayerClickTailSwipe(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    sound.at(pid, "cannonFire3", 0.85, 0.8, 22);
    ring([p[0], p[1] + 0.9, p[2]], 4.0, 10, {
      tex: TEX.crit,
      life: [0.2, 0.42],
      power: [0.7, 2.0],
      size: [0.28, 0.56],
      colors: [
        [[255, 80, 40], [90, 25, 15]],
        [[50, 10, 5, 0], [230, 60, 30, 0]],
      ],
    });
    hitArea(p, 4.6, pid, itemName, 88, { height: 3.0 });
    pushOut(p, 4.6, pid, 2.2, 0.7);
    return true;
  }

  // King's Roar : cri primal écarlate qui marque les proies (+30 % dégâts) et les ralentit.
  function onPlayerClickPredatorRoar(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    sound.at(pid, "cannonFire3", 0.95, 0.55, 26);
    ring([p[0], p[1] + 1.2, p[2]], 5.0, 10, {
      tex: TEX.crit,
      life: [0.25, 0.55],
      power: [0.8, 2.2],
      size: [0.3, 0.6],
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
      if (q && dist2(q, p) <= 45) {
        markUntil(id, pid, exp);
        damage(id, 86, pid, itemName);
        eff(id, "Slowness", 3500, { inbuiltLevel: 3 });
      }
    }
    return true;
  }

  // Extinction Rampage : frénésie de morsures et griffures sauvages devant soi.
  function onPlayerClickMeteoricRampage(pid, itemName) {
    if (!isAliveId(pid)) return false;
    let f = 0;
    run({
      next: function () {
        const p = posOf(pid);
        if (!p || f >= 4) return { done: true };
        const d = flatDir(pid);
        impulse(pid, d[0] * 1.4, 0.2, d[2] * 1.4);
        const c = [p[0] + d[0] * 3.0, p[1] + 1.0, p[2] + d[2] * 3.0];
        sound.at(c, "cannonFire3", 0.75, 0.7 + f * 0.15, 22);
        boom(c, 1.9, {
          tex: TEX.crit,
          count: 18,
          colors: [
            [[255, 55, 40], [60, 10, 10]],
            [[40, 0, 0, 0], [230, 40, 30, 0]],
          ],
        });
        hitArea(c, 3.8, pid, itemName, 30, { height: 3.0 });
        f++;
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // ---------------------------------------------------- MYTHICAL : DOUGHT ---
  // Mochi Thrust : vrille vers l'avant entouré d'une spirale de pâte blanche/dorée.
  function onPlayerClickMochiBuzzsaw(pid, itemName) {
    const p0 = posOf(pid);
    if (!p0) return true;
    const d = facing(pid);
    sound.at(pid, "cannonFire3", 0.8, 1.15, 22);
    impulse(pid, d[0] * 2.5, Math.max(0.3, d[1] * 1.3), d[2] * 2.5);
    const seen = {};
    let t = 0;
    run({
      next: function () {
        const p = posOf(pid);
        if (!p || t >= 5) return { done: true };
        ring(
          [p[0], p[1] + 1.0, p[2]],
          1.8,
          6,
          {
            tex: TEX.square,
            life: [0.18, 0.36],
            size: [0.26, 0.52],
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
          if (q && dist2(q, p) <= 20.0) {
            seen[id] = 1;
            damage(id, 92, pid, itemName);
            eff(id, "Slowness", 3000, { inbuiltLevel: 3 });
          }
        }
        t++;
        return { value: sleep(1), done: false };
      },
    });
    return true;
  }

  // Peerless Donuts : 3 anneaux de pâte autour de la visée qui pilonnent la zone.
  function onPlayerClickUnstoppableDonuts(pid, itemName) {
    const c = aimSpot(pid, 13);
    if (!c) return true;
    sound.at(c, "cannonFire3", 0.85, 0.85, 24);
    for (let i = 0; i < 3; i++) {
      const a = i * 2.09;
      const ringPos = [c[0] + Math.cos(a) * 3.0, c[1] + 2.5, c[2] + Math.sin(a) * 3.0];
      seg(ringPos, c, {
        r: 0.3,
        tex: TEX.square,
        count: 10,
        life: [0.22, 0.48],
        size: [0.3, 0.6],
        colors: [
          [[255, 245, 220], [230, 190, 130]],
          [[190, 155, 100, 0], [255, 248, 230, 0]],
        ],
      });
    }
    boom(c, 2.5, {
      tex: TEX.square,
      count: 26,
      colors: [
        [[255, 248, 225], [230, 190, 130]],
        [[180, 145, 95, 0], [255, 248, 230, 0]],
      ],
    });
    hitArea(c, 4.6, pid, itemName, 112, { height: 3.6, slow: [3000, 3] });
    return true;
  }

  // ---------------------------------------------------- MYTHICAL : SHADOW ---
  // Brick Bat Swarm : nuée de chauves-souris d'ombre qui mordent en ligne.
  function onPlayerClickBrickBat(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = facing(pid);
    const a = [p[0] + d[0] * 1.2, p[1] + 1.2, p[2] + d[2] * 1.2];
    const b = [p[0] + d[0] * 14, p[1] + 1.2 + d[1] * 13, p[2] + d[2] * 14];
    sound.at(pid, "cannonFire3", 0.75, 1.5, 22);
    seg(a, b, {
      r: 0.45,
      tex: TEX.soul,
      count: 16,
      life: [0.25, 0.55],
      power: [0.5, 1.5],
      size: [0.26, 0.52],
      colors: [
        [[40, 10, 70], [160, 50, 235]],
        [[15, 0, 30, 0], [110, 30, 170, 0]],
      ],
    });
    hitSeg(a, b, 2.0, pid, itemName, 88, { slow: [2500, 2] });
    return true;
  }

  // Shadow Swap : projette son double d'ombre et échange de position en explosant.
  function onPlayerClickDoppelmanSwap(pid, itemName) {
    const p = posOf(pid);
    const dst = aimSpot(pid, 12);
    if (!p || !dst) return true;
    sound.at(p, "cannonFire3", 0.75, 1.25, 22);
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
    boom(dst, 2.2, {
      tex: TEX.soul,
      count: 22,
      colors: [
        [[50, 10, 90], [180, 65, 255]],
        [[20, 0, 40, 0], [120, 35, 190, 0]],
      ],
    });
    hitArea(dst, 4.2, pid, itemName, 86, { height: 3.2 });
    return true;
  }

  // Black Box : enferme la zone visée dans un cube d'ombres qui implose.
  function onPlayerClickShadowBox(pid, itemName) {
    const c = aimSpot(pid, 12);
    if (!c) return true;
    sound.at(c, "cannonFire3", 0.85, 0.65, 24);
    ring(c, 3.4, 8, {
      tex: TEX.soul,
      life: [0.3, 0.6],
      size: [0.32, 0.64],
      colors: [
        [[30, 5, 55], [150, 45, 230]],
        [[15, 0, 30, 0], [100, 25, 165, 0]],
      ],
    });
    boom(c, 2.5, {
      tex: TEX.soul,
      count: 26,
      colors: [
        [[165, 55, 245], [35, 5, 65]],
        [[15, 0, 30, 0], [120, 30, 185, 0]],
      ],
    });
    hitArea(c, 4.6, pid, itemName, 102, { height: 3.6, slow: [3500, 4] });
    return true;
  }

  // Night Sovereign : éruption colossale d'ombres autour du joueur + buff de dégâts.
  function onPlayerClickShadowsAsgard(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    sound.at(pid, "cannonFire3", 0.95, 0.5, 28);
    eff(pid, "Damage", 9000, { inbuiltLevel: 3 });
    eff(pid, "Damage Reduction", 9000, { inbuiltLevel: 3 });
    boom(p, 3.4, {
      tex: TEX.soul,
      count: 32,
      colors: [
        [[175, 60, 255], [30, 0, 55]],
        [[15, 0, 30, 0], [120, 30, 190, 0]],
      ],
    });
    hitArea(p, 5.8, pid, itemName, 120, { height: 4.0, slow: [3000, 3] });
    pushOut(p, 5.8, pid, 2.0, 0.8);
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
})(globalThis.FA);
