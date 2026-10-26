// src/blocks/330-mythical-apex-plus.js — NOUVELLES HABILITÉS (MYTHICAL II : VENOM..DRAGON)
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

  // ----------------------------------------------------- MYTHICAL : VENOM ---
  // Venom Hydra : 3 têtes de serpent de venin violet/vert qui mordent en avant.
  function onPlayerClickHydraSerpent(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const fr = frame(facing(pid));
    sound.at(pid, "cannonFire3", 0.85, 0.85, 24);
    const seen = {};
    for (let k = -1; k <= 1; k++) {
      const a = [p[0] + fr.r[0] * k * 0.9, p[1] + 1.4, p[2] + fr.r[2] * k * 0.9];
      const b = [
        p[0] + fr.f[0] * 13 + fr.r[0] * k * 1.8,
        p[1] + 1.2 + fr.f[1] * 11,
        p[2] + fr.f[2] * 13 + fr.r[2] * k * 1.8,
      ];
      seg(a, b, {
        r: 0.22,
        tex: TEX.effect,
        count: 10,
        life: [0.22, 0.48],
        size: [0.28, 0.56],
        colors: [
          [[175, 55, 240], [90, 235, 110]],
          [[70, 15, 110, 0], [50, 160, 65, 0]],
        ],
      });
      const res = hitSeg(a, b, 1.8, pid, itemName, 0);
      for (const id in res.seen) {
        if (!seen[id]) {
          seen[id] = 1;
          damage(id, 94, pid, itemName);
          eff(id, "Slowness", 3500, { inbuiltLevel: 3 });
          eff(id, "Weakness", 3500, { inbuiltLevel: 2 });
        }
      }
    }
    return true;
  }

  // Chloro Ball : sphère d'acide qui explose en nuage corrosif persistant.
  function onPlayerClickToxicCloud(pid, itemName) {
    const c = aimSpot(pid, 12);
    if (!c) return true;
    sound.at(c, "cannonFire3", 0.8, 0.75, 24);
    let t = 0;
    run({
      next: function () {
        t++;
        ring(
          [c[0], c[1] + 0.5, c[2]],
          3.8,
          8,
          {
            tex: TEX.effect,
            life: [0.28, 0.58],
            power: [0.3, 0.9],
            size: [0.32, 0.64],
            colors: [
              [[170, 50, 235], [85, 235, 105]],
              [[65, 10, 100, 0], [45, 150, 60, 0]],
            ],
          },
          t * 0.7,
        );
        hitArea(c, 4.4, pid, itemName, 24, { height: 3.2, slow: [2500, 3] });
        if (t >= 4) return { done: true };
        return { value: sleep(3), done: false };
      },
    });
    return true;
  }

  // Serpent Slither : glisse à grande vitesse dans un tunnel de venin violet.
  function onPlayerClickVenomRoad(pid, itemName) {
    const p = posOf(pid);
    const dst = aimSpot(pid, 11);
    if (!p || !dst) return true;
    sound.at(p, "cannonFire3", 0.75, 1.15, 22);
    seg([p[0], p[1] + 1.0, p[2]], [dst[0], dst[1] + 1.0, dst[2]], {
      r: 0.3,
      tex: TEX.effect,
      count: 14,
      life: [0.25, 0.55],
      size: [0.3, 0.6],
      colors: [
        [[180, 55, 245], [95, 240, 115]],
        [[70, 15, 110, 0], [50, 160, 65, 0]],
      ],
    });
    hitSeg([p[0], p[1] + 1.0, p[2]], [dst[0], dst[1] + 1.0, dst[2]], 2.1, pid, itemName, 86, {
      slow: [3000, 3],
    });
    teleport(pid, dst[0], dst[1] + 0.5, dst[2]);
    return true;
  }

  // Hell's Judgment : éruption d'un démon de poison écarlate/violet autour du joueur.
  function onPlayerClickVenomDemon(pid, itemName) {
    if (!isAliveId(pid)) return false;
    sound.at(pid, "cannonFire3", 0.95, 0.55, 26);
    eff(pid, "Damage Reduction", 7000, { inbuiltLevel: 3 });
    let t = 0;
    run({
      next: function () {
        const p = posOf(pid);
        if (!p || !isAliveId(pid) || t >= 5) return { done: true };
        ring(
          [p[0], p[1] + 1.2, p[2]],
          4.4,
          9,
          {
            tex: TEX.effect,
            life: [0.25, 0.55],
            power: [0.5, 1.5],
            size: [0.34, 0.68],
            colors: [
              [[225, 30, 90], [150, 30, 220]],
              [[90, 0, 40, 0], [80, 10, 130, 0]],
            ],
          },
          t * 0.8,
        );
        hitArea(p, 4.8, pid, itemName, 25, { height: 3.6, slow: [2500, 3] });
        t++;
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // ------------------------------------------------------- MYTHICAL : GAS ---
  // Gastille Laser : rayon concentré de gaz bleu/violet incandescent.
  function onPlayerClickGastilleBeam(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = facing(pid);
    const a = [p[0] + d[0] * 1.2, p[1] + 1.2, p[2] + d[2] * 1.2];
    const b = [p[0] + d[0] * 15, p[1] + 1.2 + d[1] * 14, p[2] + d[2] * 15];
    sound.at(pid, "cannonFire3", 0.8, 1.45, 24);
    seg(a, b, {
      r: 0.2,
      tex: TEX.glint,
      count: 15,
      life: [0.2, 0.45],
      size: [0.28, 0.54],
      colors: [
        [[110, 230, 255], [195, 95, 255]],
        [[50, 140, 220, 0], [140, 50, 210, 0]],
      ],
    });
    boom(b, 2.0, {
      count: 20,
      colors: [
        [[120, 235, 255], [200, 100, 255]],
        [[50, 140, 220, 0], [140, 50, 210, 0]],
      ],
    });
    hitSeg(a, b, 1.8, pid, itemName, 90, { slow: [2500, 2] });
    return true;
  }

  // Karakuni Vacuum : sphère sans oxygène qui asphyxie et paralyse les ennemis proches.
  function onPlayerClickGasRobe(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    sound.at(pid, "cannonFire3", 0.75, 0.65, 24);
    ring([p[0], p[1] + 1.1, p[2]], 4.8, 10, {
      tex: TEX.soul,
      life: [0.3, 0.65],
      power: [0.2, 0.7],
      size: [0.3, 0.6],
      colors: [
        [[180, 110, 255], [110, 240, 255]],
        [[90, 40, 160, 0], [60, 170, 210, 0]],
      ],
    });
    pullIn(p, 5.2, pid, 0.85, 0.1);
    hitArea(p, 5.2, pid, itemName, 98, { height: 3.6, slow: [4500, 5] });
    return true;
  }

  // Miokiss Combustion : déflagration thermobarique géante de gaz volatil.
  function onPlayerClickCombustionNova(pid, itemName) {
    const c = aimSpot(pid, 11);
    if (!c) return true;
    sound.at(c, "cannonFire3", 1.0, 0.55, 28);
    boom(c, 3.2, {
      tex: TEX.crit,
      count: 30,
      colors: [
        [[255, 160, 50], [185, 70, 255]],
        [[180, 40, 10, 0], [110, 20, 180, 0]],
      ],
    });
    hitArea(c, 5.8, pid, itemName, 118, { height: 3.8 });
    pushOut(c, 5.8, pid, 2.2, 0.85);
    return true;
  }

  // ---------------------------------------------------- MYTHICAL : SPIRIT ---
  // Soul Pocus : vague d'âmes qui draine la vie des ennemis et soigne le lanceur.
  function onPlayerClickSoulPocus(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    sound.at(pid, "cannonFire3", 0.8, 1.35, 24);
    ring([p[0], p[1] + 1.1, p[2]], 4.6, 10, {
      tex: TEX.soul,
      life: [0.28, 0.58],
      power: [0.4, 1.3],
      size: [0.3, 0.6],
      colors: [
        [[110, 255, 235], [255, 110, 215]],
        [[40, 170, 160, 0], [200, 50, 160, 0]],
      ],
    });
    const hits = hitArea(p, 5.0, pid, itemName, 90, { height: 3.4, slow: [3000, 3] });
    if (hits > 0) heal(pid, Math.min(48, hits * 18));
    return true;
  }

  // Hera Storm : esprit d'orage qui foudroie les ennemis proches en chaîne.
  function onPlayerClickZeusBolt(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    sound.at(pid, "cannonFire3", 0.85, 1.45, 24);
    const ids = lifeforms(pid);
    let hitCount = 0;
    for (let i = 0; i < ids.length && hitCount < 4; i++) {
      const id = ids[i];
      const q = posOf(id);
      if (!q || dist2(q, p) > 169) continue;
      hitCount++;
      seg([q[0], q[1] + 7, q[2]], q, {
        r: 0.22,
        tex: TEX.glint,
        count: 10,
        life: [0.2, 0.42],
        size: [0.28, 0.56],
        colors: [
          [[255, 250, 120], [120, 225, 255]],
          [[255, 200, 40, 0], [80, 180, 255, 0]],
        ],
      });
      damage(id, 92, pid, itemName);
      eff(id, "Slowness", 2500, { inbuiltLevel: 3 });
    }
    if (!hitCount) {
      const c = aimSpot(pid, 10) || p;
      boom(c, 2.2, {
        tex: TEX.glint,
        count: 20,
        colors: [
          [[255, 250, 120], [120, 225, 255]],
          [[255, 200, 40, 0], [80, 180, 255, 0]],
        ],
      });
      hitArea(c, 4.2, pid, itemName, 92, { height: 3.4 });
    }
    return true;
  }

  // Prometheus Miniature Sun : lance un soleil miniature ardent qui explose.
  function onPlayerClickPrometheusSun(pid, itemName) {
    const c = aimSpot(pid, 13);
    const p = posOf(pid);
    if (!p || !c) return true;
    sound.at(c, "cannonFire3", 0.95, 0.65, 26);
    seg([p[0], p[1] + 2.4, p[2]], c, {
      r: 0.35,
      tex: TEX.crit,
      count: 12,
      life: [0.22, 0.48],
      size: [0.34, 0.68],
      colors: [
        [[255, 240, 110], [255, 95, 20]],
        [[200, 30, 0, 0], [255, 160, 40, 0]],
      ],
    });
    boom(c, 3.0, {
      tex: TEX.crit,
      count: 28,
      colors: [
        [[255, 245, 130], [255, 80, 15]],
        [[180, 20, 0, 0], [255, 140, 30, 0]],
      ],
    });
    hitArea(c, 5.4, pid, itemName, 108, { height: 3.8 });
    pushOut(c, 5.4, pid, 1.9, 0.75);
    return true;
  }

  // Combined Conquest : onde de choc combinant la foudre et le feu solaire.
  function onPlayerClickSovereignDominion(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = facing(pid);
    const a = [p[0] + d[0] * 1.4, p[1] + 1.3, p[2] + d[2] * 1.4];
    const b = [p[0] + d[0] * 16, p[1] + 1.3 + d[1] * 15, p[2] + d[2] * 16];
    sound.at(pid, "cannonFire3", 1.0, 0.55, 28);
    seg(a, b, {
      r: 0.55,
      tex: TEX.glint,
      count: 20,
      life: [0.25, 0.55],
      size: [0.35, 0.7],
      colors: [
        [[255, 235, 95], [110, 230, 255]],
        [[255, 80, 20, 0], [180, 70, 255, 0]],
      ],
    });
    boom(b, 2.8, {
      count: 26,
      colors: [
        [[255, 240, 110], [120, 230, 255]],
        [[220, 50, 10, 0], [160, 60, 240, 0]],
      ],
    });
    const res = hitSeg(a, b, 2.5, pid, itemName, 124);
    for (const id in res.seen) {
      impulse(id, d[0] * 2.3, 0.85, d[2] * 2.3);
    }
    return true;
  }

  // ----------------------------------------------------- MYTHICAL : TIGER ---
  // Tempest Finger Barrage : rafale d'ondes d'air comprimé dorées/blanches.
  function onPlayerClickFingerPistol(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = facing(pid);
    const a = [p[0] + d[0] * 1.2, p[1] + 1.2, p[2] + d[2] * 1.2];
    const b = [p[0] + d[0] * 13, p[1] + 1.2 + d[1] * 12, p[2] + d[2] * 13];
    sound.at(pid, "cannonFire3", 0.75, 1.55, 22);
    seg(a, b, {
      r: 0.25,
      tex: TEX.crit,
      count: 14,
      life: [0.18, 0.38],
      size: [0.26, 0.52],
      colors: [
        [[255, 235, 140], [255, 160, 45]],
        [[200, 110, 20, 0], [255, 245, 200, 0]],
      ],
    });
    hitSeg(a, b, 1.8, pid, itemName, 90);
    return true;
  }

  // White Tiger Finisher : bond félin éclair et tempête de griffes à l'arrivée.
  function onPlayerClickFeralMaul(pid, itemName) {
    const p = posOf(pid);
    const dst = aimSpot(pid, 11);
    if (!p || !dst) return true;
    sound.at(p, "cannonFire3", 0.85, 1.25, 24);
    seg([p[0], p[1] + 1.0, p[2]], [dst[0], dst[1] + 1.0, dst[2]], {
      r: 0.25,
      tex: TEX.crit,
      count: 12,
      life: [0.2, 0.42],
      size: [0.28, 0.56],
      colors: [
        [[255, 220, 110], [255, 130, 30]],
        [[190, 80, 10, 0], [255, 235, 160, 0]],
      ],
    });
    teleport(pid, dst[0], dst[1] + 0.5, dst[2]);
    boom(dst, 2.6, {
      tex: TEX.crit,
      count: 26,
      colors: [
        [[255, 230, 120], [255, 120, 25]],
        [[180, 60, 10, 0], [255, 220, 130, 0]],
      ],
    });
    hitArea(dst, 4.6, pid, itemName, 114, { height: 3.4 });
    pushOut(dst, 4.6, pid, 1.8, 0.75);
    return true;
  }

  // ------------------------------------------------------ MYTHICAL : YETI ---
  // Glacier Throw : projette un rocher de glace massif qui explose en éclats gelés.
  function onPlayerClickAvalancheBoulder(pid, itemName) {
    const p = posOf(pid);
    const c = aimSpot(pid, 13);
    if (!p || !c) return true;
    sound.at(pid, "cannonFire3", 0.85, 0.75, 24);
    seg([p[0], p[1] + 1.8, p[2]], c, {
      r: 0.35,
      tex: TEX.glint,
      count: 12,
      life: [0.22, 0.48],
      size: [0.32, 0.64],
      colors: [
        [[220, 250, 255], [110, 200, 255]],
        [[60, 140, 220, 0], [220, 250, 255, 0]],
      ],
    });
    boom(c, 2.5, {
      tex: TEX.glint,
      count: 26,
      colors: [
        [[225, 252, 255], [100, 195, 255]],
        [[50, 130, 210, 0], [210, 245, 255, 0]],
      ],
    });
    hitArea(c, 4.6, pid, itemName, 92, { height: 3.4, slow: [3500, 4] });
    pushOut(c, 4.6, pid, 1.7, 0.7);
    return true;
  }

  // Subzero Roar : hurlement polaire qui gèle sur place (Slowness 5) et repousse.
  function onPlayerClickAbominableRoar(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    sound.at(pid, "cannonFire3", 0.9, 0.6, 26);
    ring([p[0], p[1] + 1.1, p[2]], 4.8, 10, {
      tex: TEX.glint,
      life: [0.25, 0.55],
      power: [0.7, 2.0],
      size: [0.3, 0.6],
      colors: [
        [[220, 250, 255], [105, 200, 255]],
        [[60, 145, 225, 0], [220, 250, 255, 0]],
      ],
    });
    hitArea(p, 5.2, pid, itemName, 88, { height: 3.4, slow: [4500, 5] });
    pushOut(p, 5.2, pid, 1.9, 0.65);
    return true;
  }

  // Permafrost Earthshatter : frappe le sol et fait surgir des pics de glace bleue.
  function onPlayerClickPermafrostSlam(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    sound.at(pid, "cannonFire3", 0.95, 0.55, 26);
    boom(p, 2.8, {
      tex: TEX.glint,
      count: 28,
      colors: [
        [[225, 252, 255], [95, 190, 255]],
        [[50, 130, 215, 0], [210, 248, 255, 0]],
      ],
    });
    hitArea(p, 5.6, pid, itemName, 106, { height: 3.8, slow: [4000, 4] });
    pushOut(p, 5.6, pid, 1.8, 0.85);
    return true;
  }

  // --------------------------------------------------- MYTHICAL : KITSUNE ---
  // Nine-Tails Foxfire : 5 feux follets azur/rose qui foncent sur la visée.
  function onPlayerClickFoxFireOrbs(pid, itemName) {
    const p = posOf(pid);
    const tgt = aimSpot(pid, 14);
    if (!p || !tgt) return true;
    sound.at(pid, "cannonFire3", 0.75, 1.5, 24);
    for (let i = -2; i <= 2; i++) {
      const start = [p[0] + i * 0.7, p[1] + 2.1, p[2] + Math.abs(i) * 0.4];
      seg(start, tgt, {
        r: 0.14,
        tex: TEX.soul,
        count: 7,
        life: [0.2, 0.42],
        size: [0.24, 0.48],
        colors: [
          [[70, 225, 255], [255, 110, 225]],
          [[30, 140, 240, 0], [220, 60, 180, 0]],
        ],
      });
    }
    boom(tgt, 2.2, {
      tex: TEX.soul,
      count: 22,
      colors: [
        [[80, 230, 255], [255, 115, 225]],
        [[30, 140, 240, 0], [220, 60, 180, 0]],
      ],
    });
    hitArea(tgt, 4.2, pid, itemName, 94, { height: 3.4 });
    return true;
  }

  // Celestial Tails Lash : balayage de queues de flammes mystiques bleues.
  function onPlayerClickTailsSweep(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = facing(pid);
    const c = [p[0] + d[0] * 3.6, p[1] + 1.1, p[2] + d[2] * 3.6];
    sound.at(pid, "cannonFire3", 0.8, 1.35, 22);
    ring(c, 3.8, 10, {
      tex: TEX.soul,
      life: [0.22, 0.48],
      power: [0.6, 1.8],
      size: [0.28, 0.56],
      colors: [
        [[75, 225, 255], [255, 120, 230]],
        [[25, 130, 235, 0], [210, 50, 180, 0]],
      ],
    });
    hitArea(c, 4.6, pid, itemName, 88, { height: 3.2 });
    pushOut(c, 4.6, pid, 1.9, 0.65);
    return true;
  }

  // Kitsune Illusion Step : téléportation dans des flammes azur + explosion d'illusions.
  function onPlayerClickMirageDash(pid, itemName) {
    const p = posOf(pid);
    const dst = aimSpot(pid, 12);
    if (!p || !dst) return true;
    sound.at(p, "cannonFire3", 0.75, 1.6, 22);
    eff(pid, "Speed", 6000, { inbuiltLevel: 3 });
    seg([p[0], p[1] + 1.0, p[2]], [dst[0], dst[1] + 1.0, dst[2]], {
      r: 0.22,
      tex: TEX.soul,
      count: 12,
      life: [0.2, 0.45],
      size: [0.28, 0.54],
      colors: [
        [[80, 230, 255], [255, 120, 230]],
        [[25, 130, 235, 0], [210, 50, 180, 0]],
      ],
    });
    teleport(pid, dst[0], dst[1] + 0.5, dst[2]);
    boom(dst, 2.2, {
      tex: TEX.soul,
      count: 22,
      colors: [
        [[80, 230, 255], [255, 120, 230]],
        [[25, 130, 235, 0], [210, 50, 180, 0]],
      ],
    });
    hitArea(dst, 4.2, pid, itemName, 90, { height: 3.2 });
    return true;
  }

  // Shrine Bomb : sphère géante de feu de renard azur qui dévaste la zone.
  function onPlayerClickNineTailsCataclysm(pid, itemName) {
    const c = aimSpot(pid, 14);
    const p = posOf(pid);
    if (!p || !c) return true;
    sound.at(c, "cannonFire3", 0.95, 0.7, 28);
    seg([p[0], p[1] + 2.2, p[2]], c, {
      r: 0.35,
      tex: TEX.soul,
      count: 14,
      life: [0.25, 0.55],
      size: [0.34, 0.68],
      colors: [
        [[75, 230, 255], [255, 110, 225]],
        [[25, 135, 240, 0], [215, 50, 180, 0]],
      ],
    });
    boom(c, 3.2, {
      tex: TEX.soul,
      count: 30,
      colors: [
        [[85, 235, 255], [255, 120, 230]],
        [[25, 135, 240, 0], [215, 50, 180, 0]],
      ],
    });
    hitArea(c, 5.8, pid, itemName, 122, { height: 4.0 });
    pushOut(c, 5.8, pid, 2.1, 0.85);
    return true;
  }

  // --------------------------------------------------- MYTHICAL : CONTROL ---
  // Gamma Knife : dash chirurgical et lame d'énergie verte/cyan interne.
  function onPlayerClickGammaKnife(pid, itemName) {
    const p = posOf(pid);
    const dst = aimSpot(pid, 10);
    if (!p || !dst) return true;
    sound.at(p, "cannonFire3", 0.8, 1.55, 24);
    seg([p[0], p[1] + 1.1, p[2]], [dst[0], dst[1] + 1.1, dst[2]], {
      r: 0.2,
      tex: TEX.glint,
      count: 14,
      life: [0.2, 0.45],
      size: [0.26, 0.52],
      colors: [
        [[90, 255, 165], [90, 220, 255]],
        [[30, 180, 100, 0], [40, 160, 220, 0]],
      ],
    });
    teleport(pid, dst[0], dst[1] + 0.5, dst[2]);
    boom(dst, 2.2, {
      tex: TEX.glint,
      count: 24,
      colors: [
        [[95, 255, 170], [95, 225, 255]],
        [[30, 180, 100, 0], [40, 160, 220, 0]],
      ],
    });
    hitArea(dst, 4.2, pid, itemName, 104, { height: 3.4, slow: [3500, 4] });
    return true;
  }

  // Counter Shock : décharge défibrillateur cyan/bleue à bout portant.
  function onPlayerClickCounterShock(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = facing(pid);
    const c = [p[0] + d[0] * 3.0, p[1] + 1.2 + d[1] * 1.5, p[2] + d[2] * 3.0];
    sound.at(c, "cannonFire3", 0.9, 1.35, 24);
    boom(c, 2.5, {
      tex: TEX.glint,
      count: 26,
      colors: [
        [[110, 240, 255], [255, 255, 150]],
        [[40, 160, 235, 0], [255, 220, 60, 0]],
      ],
    });
    hitArea(c, 4.5, pid, itemName, 92, { height: 3.4, slow: [2500, 3] });
    pushOut(c, 4.5, pid, 2.2, 0.8);
    return true;
  }

  // ---------------------------------------------------- MYTHICAL : DRAGON ---
  // Blast Breath : torrent colossal de feu draconique doré/écarlate sur 18 blocs.
  function onPlayerClickBoroBreath(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = facing(pid);
    const a = [p[0] + d[0] * 1.4, p[1] + 1.4, p[2] + d[2] * 1.4];
    const b = [p[0] + d[0] * 18, p[1] + 1.4 + d[1] * 17, p[2] + d[2] * 18];
    sound.at(pid, "cannonFire3", 1.0, 0.5, 30);
    seg(a, b, {
      r: 0.65,
      tex: TEX.crit,
      count: 22,
      life: [0.25, 0.58],
      size: [0.4, 0.8],
      colors: [
        [[255, 240, 110], [255, 70, 15]],
        [[190, 20, 0, 0], [255, 150, 30, 0]],
      ],
    });
    boom(b, 3.4, {
      tex: TEX.crit,
      count: 32,
      colors: [
        [[255, 245, 120], [255, 65, 10]],
        [[180, 15, 0, 0], [255, 140, 25, 0]],
      ],
    });
    hitSeg(a, b, 2.6, pid, itemName, 128);
    hitArea(b, 5.2, pid, itemName, 40, { height: 3.8 });
    pushOut(b, 5.2, pid, 2.3, 0.9);
    return true;
  }

  // Demolition Gust : tornade draconique qui soulève et découpe les ennemis.
  function onPlayerClickDragonTwister(pid, itemName) {
    const c = aimSpot(pid, 12);
    if (!c) return true;
    sound.at(c, "cannonFire3", 0.9, 0.75, 26);
    let t = 0;
    run({
      next: function () {
        t++;
        ring(
          [c[0], c[1] + (t % 3) * 1.2, c[2]],
          3.8,
          9,
          {
            tex: TEX.glint,
            life: [0.22, 0.48],
            power: [0.5, 1.5],
            size: [0.28, 0.56],
            gravity: [0, 2.0, 0],
            colors: [
              [[140, 255, 195], [255, 190, 70]],
              [[50, 180, 120, 0], [240, 120, 30, 0]],
            ],
          },
          t * 0.9,
        );
        pullIn(c, 4.8, pid, 0.9, 0.55);
        if (t % 2 === 0) hitArea(c, 4.6, pid, itemName, 33, { height: 4.2 });
        if (t >= 6) return { done: true };
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // Rising Dragon : ascension entourée d'une spirale de flammes et d'éclairs rouges.
  function onPlayerClickDraconicAscent(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = facing(pid);
    sound.at(pid, "cannonFire3", 0.9, 0.85, 26);
    eff(pid, "Damage Reduction", 7000, { inbuiltLevel: 3 });
    impulse(pid, d[0] * 2.2, 1.1, d[2] * 2.2);
    ring([p[0], p[1] + 1.0, p[2]], 4.2, 10, {
      tex: TEX.crit,
      life: [0.25, 0.55],
      power: [0.7, 2.0],
      size: [0.32, 0.64],
      colors: [
        [[255, 220, 80], [255, 50, 20]],
        [[180, 15, 0, 0], [255, 130, 30, 0]],
      ],
    });
    hitArea(p, 5.2, pid, itemName, 106, { height: 4.0 });
    pushOut(p, 5.2, pid, 1.9, 0.85);
    return true;
  }

  Object.assign(R, {
    onPlayerClickHydraSerpent,
    onPlayerClickToxicCloud,
    onPlayerClickVenomRoad,
    onPlayerClickVenomDemon,
    onPlayerClickGastilleBeam,
    onPlayerClickGasRobe,
    onPlayerClickCombustionNova,
    onPlayerClickSoulPocus,
    onPlayerClickZeusBolt,
    onPlayerClickPrometheusSun,
    onPlayerClickSovereignDominion,
    onPlayerClickFingerPistol,
    onPlayerClickFeralMaul,
    onPlayerClickAvalancheBoulder,
    onPlayerClickAbominableRoar,
    onPlayerClickPermafrostSlam,
    onPlayerClickFoxFireOrbs,
    onPlayerClickTailsSweep,
    onPlayerClickMirageDash,
    onPlayerClickNineTailsCataclysm,
    onPlayerClickGammaKnife,
    onPlayerClickCounterShock,
    onPlayerClickBoroBreath,
    onPlayerClickDragonTwister,
    onPlayerClickDraconicAscent,
  });
})(globalThis.FA);
