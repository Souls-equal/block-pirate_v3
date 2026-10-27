// src/blocks/330-mythical-apex-plus.js — NOUVELLES HABILITÉS (MYTHICAL II : VENOM..DRAGON)
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
      posOf,
      safeEntityType,
      facing,
      targetBlock,
      teleport,
      boom,
      column,
      dist2,
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

  const BODY_NODES = ["TorsoNode", "HeadMesh", "ArmLeftMesh", "ArmRightMesh", "LegLeftMesh", "LegRightMesh"];
  const mythicForms = FA.m || (FA.m = {});

  function flatDir(pid) {
    const d = facing(pid);
    return norm([d[0], 0, d[2]]);
  }

  function shake(pid, intensity, ms) {
    try {
      api.shakePlayerCamera(pid, intensity || 0.4, ms || 350);
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

  function attachNode(pid, node, blockName, size, offset, rot) {
    try {
      api.updateEntityNodeMeshAttachment(
        pid,
        node,
        "BloxdBlock",
        { blockName: blockName, size: size, meshOffset: [0, 0, 0] },
        offset || [0, 0, 0],
        rot || [0, 0, 0],
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
    for (let i = 0; i < BODY_NODES.length; i++) {
      try {
        api.updateEntityNodeMeshAttachment(pid, BODY_NODES[i], null);
      } catch (e) {}
    }
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
    if (cfg.parts) {
      for (let i = 0; i < cfg.parts.length; i++) {
        const pt = cfg.parts[i];
        attachNode(pid, pt[0], pt[1], pt[2], pt[3], pt[4]);
      }
    }
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
    const maxSteps = (cfg.steps || 14) * 6;
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
        return { value: sleep(cfg.interval || 5), done: false };
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
        animationDurationMs: dur || 620,
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

  function poseBeam(pid, dur) {
    try {
      api.animateEntity(pid, {
        animationDurationMs: dur || 520,
        loop: false,
        nodeAnimations: {
          TorsoNode: {
            timeline: [
              { timeFraction: 0, rotation: { point: [-0.2, 0, 0] } },
              { timeFraction: 0.3, rotation: { point: [0.18, 0, 0] } },
              { timeFraction: 1, rotation: { point: [0, 0, 0] } },
            ],
          },
          ArmLeftMesh: {
            timeline: [
              { timeFraction: 0, rotation: { point: [-1.55, 0.25, 0] } },
              { timeFraction: 0.8, rotation: { point: [-1.55, 0.2, 0] } },
              { timeFraction: 1, rotation: { point: [0, 0, 0] } },
            ],
          },
          ArmRightMesh: {
            timeline: [
              { timeFraction: 0, rotation: { point: [-1.55, -0.25, 0] } },
              { timeFraction: 0.8, rotation: { point: [-1.55, -0.2, 0] } },
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
      if (safeEntityType(ids[i]) === "NPC") continue;
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
      if (safeEntityType(id) === "NPC") continue;
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
      if (safeEntityType(id) === "NPC") continue;
      const q = posOf(id);
      if (!q || dist2(q, center) > r * r) continue;
      const dx = center[0] - q[0],
        dz = center[2] - q[2],
        d = Math.sqrt(dx * dx + dz * dz) || 1;
      if (d > 0.4) impulse(id, (dx / d) * pullH, pullY, (dz / d) * pullH);
    }
  }

  // ----------------------------------------------------- MYTHICAL : VENOM ---
  const VENOM_PARTS = [
    ["TorsoNode", "Purple Concrete", [0.7, 0.92, 0.6], [0, 0.05, 0], [0, 0, 0]],
    ["HeadMesh", "Red Concrete", [0.6, 0.3, 0.55], [0, 0.32, 0], [0, 0.78, 0]],
    ["ArmLeftMesh", "Purple Concrete", [0.4, 0.82, 0.4], [0, -0.12, 0], [0, 0, 0]],
    ["ArmRightMesh", "Purple Concrete", [0.4, 0.82, 0.4], [0, -0.12, 0], [0, 0, 0]],
    ["LegLeftMesh", "Purple Concrete", [0.36, 0.75, 0.36], [0, -0.1, 0], [0, 0, 0]],
    ["LegRightMesh", "Purple Concrete", [0.36, 0.75, 0.36], [0, -0.1, 0], [0, 0, 0]],
  ];

  // Hydra Strike : 3 têtes d'hydre de venin violet/vert qui fondent sur l'avant et explosent.
  function onPlayerClickHydraSerpent(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const fr = frame(facing(pid));
    poseBeam(pid, 460);
    sound.at(pid, "bigDrumSwish2", 0.9, 0.85, 24);
    sound.at(pid, "critical_hit", 0.85, 0.95, 24);
    const seen = {};
    for (let k = -1; k <= 1; k++) {
      const a = [
        p[0] + fr.r[0] * k * 1.15 + fr.f[0] * 1.1,
        p[1] + 1.6 + Math.abs(k) * 0.3,
        p[2] + fr.r[2] * k * 1.15 + fr.f[2] * 1.1,
      ];
      const b = [
        p[0] + fr.f[0] * 13.5 + fr.r[0] * k * 1.6,
        p[1] + 1.2 + fr.f[1] * 12,
        p[2] + fr.f[2] * 13.5 + fr.r[2] * k * 1.6,
      ];
      seg(a, b, {
        r: 0.28,
        tex: TEX.soul,
        count: 11,
        life: [0.24, 0.52],
        size: [0.3, 0.6],
        colors: [
          [[185, 50, 245], [115, 245, 95]],
          [[95, 15, 145, 0], [70, 185, 60, 0]],
        ],
      });
      boom(b, 1.8, {
        tex: TEX.soul,
        count: 14,
        colors: [
          [[190, 55, 250], [120, 250, 100]],
          [[90, 10, 140, 0], [60, 175, 55, 0]],
        ],
      });
      const res = hitSeg(a, b, 1.8, pid, itemName, 0);
      for (const id in res.seen) {
        if (!seen[id]) {
          seen[id] = 1;
          damage(id, 96, pid, itemName);
          eff(id, "Slowness", 3500, { inbuiltLevel: 3 });
          eff(id, "Weakness", 4000, { inbuiltLevel: 2 });
        }
      }
    }
    return true;
  }

  // Chloro Swamp : marécage bouillonnant d'acide à colonnes toxiques qui ronge sur 5 vagues.
  function onPlayerClickToxicCloud(pid, itemName) {
    const c = aimSpot(pid, 12);
    if (!c) return true;
    poseSlam(pid, 440);
    sound.at(c, "cannonFire2", 0.85, 0.7, 24);
    let t = 0;
    run({
      next: function () {
        t++;
        sound.at(c, "pulseFromTheDark", 0.7, 0.8 + t * 0.08, 22);
        ring(
          [c[0], c[1] + 0.4, c[2]],
          4.4,
          10,
          {
            tex: TEX.soul,
            life: [0.3, 0.65],
            power: [0.3, 0.9],
            size: [0.32, 0.64],
            gravity: [0, 1.2, 0],
            colors: [
              [[175, 45, 235], [110, 235, 90]],
              [[85, 15, 130, 0], [60, 170, 50, 0]],
            ],
          },
          t * 0.6,
        );
        const ang = t * GOLDEN;
        column([c[0] + Math.cos(ang) * 2.2, c[1], c[2] + Math.sin(ang) * 2.2], 3.2, {
          tex: TEX.soul,
          r: 0.25,
          count: 2,
          steps: 5,
          life: [0.22, 0.45],
          colors: [
            [[185, 50, 245], [120, 245, 100]],
            [[90, 10, 140, 0], [60, 175, 55, 0]],
          ],
        });
        hitArea(c, 4.8, pid, itemName, 25, { height: 3.4, slow: [2500, 3], effect: ["Weakness", 3000, 2] });
        if (t >= 5) return { done: true };
        return { value: sleep(3), done: false };
      },
    });
    return true;
  }

  // Venom Road : glisse à travers un tunnel de venin jusqu'à la cible et explose.
  function onPlayerClickVenomRoad(pid, itemName) {
    const p = posOf(pid);
    const dst = aimSpot(pid, 12);
    if (!p || !dst) return true;
    sound.at(p, "magicAccent3", 0.85, 1.1, 24);
    seg([p[0], p[1] + 1.0, p[2]], [dst[0], dst[1] + 1.0, dst[2]], {
      r: 0.35,
      tex: TEX.soul,
      count: 14,
      life: [0.25, 0.55],
      size: [0.3, 0.6],
      colors: [
        [[185, 50, 245], [120, 245, 100]],
        [[95, 15, 145, 0], [70, 185, 60, 0]],
      ],
    });
    hitSeg([p[0], p[1] + 1.0, p[2]], [dst[0], dst[1] + 1.0, dst[2]], 2.2, pid, itemName, 45, {
      slow: [2500, 2],
    });
    teleport(pid, dst[0], dst[1] + 0.5, dst[2]);
    sound.at(dst, "pulseFromTheDark", 0.9, 0.9, 24);
    boom(dst, 2.4, {
      tex: TEX.soul,
      count: 24,
      colors: [
        [[190, 55, 250], [125, 250, 105]],
        [[95, 15, 145, 0], [70, 185, 60, 0]],
      ],
    });
    hitArea(dst, 4.4, pid, itemName, 84, { height: 3.4, slow: [3000, 3] });
    return true;
  }

  // Hell's Judgment (Venom Demon Kinjite) : transformation en colosse écarlate/violet + aura corrosive.
  function onPlayerClickVenomDemon(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    poseRoar(pid, 680);
    sound.at(pid, "pulseFromTheDark", 1.0, 0.5, 30);
    sound.at(pid, "ominousBellHit", 0.95, 0.55, 30);
    eff(pid, "Damage", 23000, { inbuiltLevel: 3 });
    eff(pid, "Damage Reduction", 23000, { inbuiltLevel: 3 });
    startMythicForm(pid, {
      scale: 1.48,
      title: "VENOM DEMON: KINJITE",
      bannerColor: "#d946ef",
      parts: VENOM_PARTS,
      colors: [
        [[235, 30, 120], [150, 20, 220]],
        [[80, 0, 110, 0], [220, 20, 100, 0]],
      ],
      steps: 15,
      onAura: function (ap, st) {
        ring(
          [ap[0], ap[1] + 0.9, ap[2]],
          3.8,
          9,
          {
            tex: TEX.soul,
            life: [0.24, 0.5],
            power: [0.4, 1.3],
            size: [0.3, 0.6],
            gravity: [0, 1.3, 0],
            colors: [
              [[235, 30, 120], [150, 20, 220]],
              [[80, 0, 110, 0], [220, 20, 100, 0]],
            ],
          },
          st * 0.7,
        );
        if (st % 3 === 0) {
          hitArea(ap, 4.8, pid, itemName, 20, {
            height: 3.6,
            slow: [2500, 3],
            effect: ["Weakness", 3000, 2],
          });
        }
      },
    });
    boom(p, 3.6, {
      tex: TEX.soul,
      count: 34,
      colors: [
        [[220, 30, 120], [150, 20, 220]],
        [[80, 0, 110, 0], [200, 20, 100, 0]],
      ],
    });
    hitArea(p, 6.0, pid, itemName, 118, {
      height: 4.0,
      slow: [4000, 4],
      effect: ["Weakness", 4500, 3],
    });
    pushOut(p, 6.0, pid, 2.0, 0.8);
    return true;
  }

  // ------------------------------------------------------- MYTHICAL : GAS ---
  const GAS_PARTS = [
    ["TorsoNode", "Purple Glass", [0.72, 0.92, 0.62], [0, 0.05, 0], [0, 0, 0]],
    ["HeadMesh", "Light Blue Glass", [0.58, 0.58, 0.58], [0, 0.12, 0], [0, 0.78, 0]],
    ["ArmLeftMesh", "Purple Glass", [0.4, 0.78, 0.4], [0, -0.1, 0], [0, 0, 0]],
    ["ArmRightMesh", "Light Blue Glass", [0.4, 0.78, 0.4], [0, -0.1, 0], [0, 0, 0]],
  ];

  // Gastille Laser : rayon de gaz enflammé bleu-violet entouré d'anneaux de plasma.
  function onPlayerClickGastilleBeam(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = facing(pid);
    poseBeam(pid, 480);
    const a = [p[0] + d[0] * 1.2, p[1] + 1.25, p[2] + d[2] * 1.2];
    const b = [p[0] + d[0] * 16, p[1] + 1.25 + d[1] * 15, p[2] + d[2] * 16];
    sound.at(pid, "futureStrangePulse", 0.9, 1.35, 26);
    sound.at(b, "cannonFire3", 0.9, 1.1, 26);
    seg(a, b, {
      r: 0.26,
      tex: TEX.glint,
      count: 16,
      life: [0.22, 0.48],
      size: [0.3, 0.58],
      colors: [
        [[110, 235, 255], [200, 90, 255]],
        [[60, 150, 230, 0], [160, 50, 220, 0]],
      ],
    });
    for (let k = 1; k <= 3; k++) {
      const f = k / 4;
      ring([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f], 1.2, 6, {
        tex: TEX.soul,
        life: [0.2, 0.4],
        size: [0.24, 0.48],
        colors: [
          [[120, 240, 255], [210, 95, 255]],
          [[60, 150, 230, 0], [160, 50, 220, 0]],
        ],
      });
    }
    boom(b, 2.4, {
      tex: TEX.glint,
      count: 24,
      colors: [
        [[120, 240, 255], [210, 95, 255]],
        [[50, 140, 220, 0], [150, 40, 210, 0]],
      ],
    });
    hitSeg(a, b, 1.9, pid, itemName, 98, { slow: [2500, 3] });
    return true;
  }

  // Karakuni Vacuum (Shinokuni Form) : manteau gazeux spectral + asphyxie gravitationnelle autour du lanceur.
  function onPlayerClickGasRobe(pid, itemName) {
    if (!isAliveId(pid)) return false;
    poseRoar(pid, 580);
    sound.at(pid, "futureStrangePulse", 0.9, 0.85, 26);
    sound.at(pid, "pulseFromTheDark", 0.85, 0.75, 26);
    eff(pid, "Damage Reduction", 20000, { inbuiltLevel: 3 });
    startMythicForm(pid, {
      scale: 1.32,
      title: "SHINOKUNI GAS REALM",
      bannerColor: "#67e8f9",
      parts: GAS_PARTS,
      colors: [
        [[140, 230, 255], [195, 110, 255]],
        [[70, 160, 220, 0], [140, 60, 210, 0]],
      ],
      steps: 14,
      onAura: function (ap, st) {
        ring(
          [ap[0], ap[1] + 1.0, ap[2]],
          4.4,
          10,
          {
            tex: TEX.soul,
            life: [0.24, 0.5],
            power: [0.3, 0.9],
            size: [0.3, 0.58],
            colors: [
              [[140, 230, 255], [195, 110, 255]],
              [[70, 160, 220, 0], [140, 60, 210, 0]],
            ],
          },
          st * 0.75,
        );
        if (st % 4 === 0) pullIn(ap, 4.8, pid, 0.7, 0.15);
        if (st % 8 === 0) {
          hitArea(ap, 4.6, pid, itemName, 24, { height: 3.4, slow: [2500, 3] });
        }
      },
    });
    return true;
  }

  // Miokiss Combustion : compression gazeuse suivie d'une déflagration thermobarique colossale.
  function onPlayerClickCombustionNova(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    poseSlam(pid, 560);
    shake(pid, 0.5, 450);
    sound.at(pid, "pulseFromTheDark", 0.9, 0.7, 28);
    pullIn(p, 6.2, pid, 1.3, 0.35);
    sound.at(pid, "cannonFire1", 1.0, 0.55, 30);
    sound.at(pid, "cannonFire2", 0.95, 0.75, 30);
    boom(p, 3.6, {
      tex: TEX.crit,
      count: 34,
      colors: [
        [[255, 185, 65], [200, 80, 255]],
        [[190, 40, 20, 0], [140, 30, 210, 0]],
      ],
    });
    ring([p[0], p[1] + 1.0, p[2]], 5.4, 12, {
      tex: TEX.soul,
      life: [0.28, 0.58],
      power: [0.8, 2.2],
      size: [0.34, 0.68],
      colors: [
        [[120, 240, 255], [255, 150, 50]],
        [[70, 150, 230, 0], [200, 60, 220, 0]],
      ],
    });
    hitArea(p, 6.2, pid, itemName, 120, { height: 4.0 });
    pushOut(p, 6.2, pid, 2.3, 0.9);
    return true;
  }

  // ---------------------------------------------------- MYTHICAL : SPIRIT ---
  const SPIRIT_PARTS = [
    ["HeadMesh", "Gold Block", [0.55, 0.22, 0.55], [0, 0.36, 0], [0, 0, 0]],
    ["ArmRightMesh", "Orange Concrete", [0.45, 0.45, 0.45], [0, -0.3, 0], [0, 0, 0]],
    ["ArmLeftMesh", "Light Blue Concrete", [0.45, 0.45, 0.45], [0, -0.3, 0], [0, 0, 0]],
  ];

  // Soul Pocus : éveil de la Souveraine des Âmes (Zeus & Prometheus en orbite) + récolte d'âmes.
  function onPlayerClickSoulPocus(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    poseRoar(pid, 620);
    sound.at(pid, "ominousBellHit", 0.95, 1.05, 28);
    sound.at(pid, "magicAccent4", 0.9, 1.25, 26);
    eff(pid, "Damage", 22000, { inbuiltLevel: 2 });
    startMythicForm(pid, {
      scale: 1.28,
      title: "SOUL SOVEREIGN: ZEUS & PROMETHEUS",
      bannerColor: "#f472b6",
      parts: SPIRIT_PARTS,
      colors: [
        [[255, 125, 225], [120, 245, 255]],
        [[180, 60, 220, 0], [90, 200, 240, 0]],
      ],
      steps: 14,
      onAura: function (ap, st) {
        const a = st * 0.65;
        const sun = [ap[0] + Math.cos(a) * 2.3, ap[1] + 2.1, ap[2] + Math.sin(a) * 2.3];
        const cloud = [ap[0] - Math.cos(a) * 2.3, ap[1] + 2.1, ap[2] - Math.sin(a) * 2.3];
        point(sun, {
          r: 0.35,
          tex: TEX.crit,
          count: 6,
          life: [0.2, 0.4],
          size: [0.3, 0.58],
          colors: [
            [[255, 240, 110], [255, 95, 20]],
            [[200, 40, 0, 0], [255, 180, 40, 0]],
          ],
        });
        point(cloud, {
          r: 0.35,
          tex: TEX.glint,
          count: 6,
          life: [0.2, 0.4],
          size: [0.3, 0.58],
          colors: [
            [[255, 250, 130], [110, 225, 255]],
            [[60, 150, 230, 0], [255, 230, 80, 0]],
          ],
        });
      },
    });
    ring([p[0], p[1] + 1.1, p[2]], 5.2, 12, {
      tex: TEX.soul,
      life: [0.28, 0.58],
      power: [0.6, 1.8],
      size: [0.3, 0.6],
      colors: [
        [[255, 125, 225], [120, 245, 255]],
        [[180, 60, 220, 0], [90, 200, 240, 0]],
      ],
    });
    const hits = hitArea(p, 5.4, pid, itemName, 88, { height: 3.4, slow: [3000, 3] });
    heal(pid, Math.min(50, 20 + hits * 15));
    return true;
  }

  // Thundercloud Zeus : nuage d'orage vivant qui abat 3 foudres divines successives.
  function onPlayerClickZeusBolt(pid, itemName) {
    const c = aimSpot(pid, 14);
    if (!c) return true;
    poseSlam(pid, 460);
    sound.at(c, "magicAccent1", 0.9, 1.35, 26);
    let bolt = 0;
    run({
      next: function () {
        bolt++;
        const a = bolt * 2.09;
        const spot = bolt === 1 ? c : [c[0] + Math.cos(a) * 1.8, c[1], c[2] + Math.sin(a) * 1.8];
        sound.at(spot, "cannonFire3", 0.9, 1.15 + bolt * 0.1, 26);
        seg([spot[0], spot[1] + 8.5, spot[2]], spot, {
          r: 0.3,
          tex: TEX.glint,
          count: 12,
          life: [0.2, 0.42],
          size: [0.3, 0.6],
          colors: [
            [[255, 250, 130], [110, 225, 255]],
            [[255, 210, 40, 0], [80, 180, 255, 0]],
          ],
        });
        boom(spot, 2.2, {
          tex: TEX.glint,
          count: 18,
          colors: [
            [[255, 250, 130], [110, 225, 255]],
            [[255, 200, 30, 0], [80, 180, 255, 0]],
          ],
        });
        hitArea(spot, 4.4, pid, itemName, 34, { height: 4.0, slow: [2500, 3] });
        if (bolt >= 3) return { done: true };
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // Sun Prometheus : invoque un soleil miniature au-dessus du lanceur et l'écrase sur la cible.
  function onPlayerClickPrometheusSun(pid, itemName) {
    const c = aimSpot(pid, 13);
    const p = posOf(pid);
    if (!p || !c) return true;
    poseSlam(pid, 520);
    shake(pid, 0.45, 380);
    const sky = [p[0], p[1] + 4.2, p[2]];
    sound.at(pid, "cannonFire2", 0.9, 0.75, 28);
    boom(sky, 2.0, {
      tex: TEX.crit,
      count: 20,
      colors: [
        [[255, 240, 100], [255, 90, 15]],
        [[200, 30, 0, 0], [255, 160, 30, 0]],
      ],
    });
    seg(sky, c, {
      r: 0.45,
      tex: TEX.crit,
      count: 14,
      life: [0.25, 0.55],
      size: [0.38, 0.75],
      colors: [
        [[255, 235, 100], [255, 85, 15]],
        [[190, 25, 0, 0], [255, 140, 25, 0]],
      ],
    });
    sound.at(c, "cannonFire1", 1.0, 0.55, 30);
    boom(c, 3.2, {
      tex: TEX.crit,
      count: 30,
      colors: [
        [[255, 240, 110], [255, 80, 10]],
        [[180, 20, 0, 0], [255, 130, 20, 0]],
      ],
    });
    hitArea(c, 5.4, pid, itemName, 108, { height: 3.8 });
    pushOut(c, 5.4, pid, 2.0, 0.85);
    return true;
  }

  // Combined Conquest : double hélice cataclysmique de feu solaire et de foudre divine.
  function onPlayerClickSovereignDominion(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = facing(pid);
    poseBeam(pid, 580);
    shake(pid, 0.52, 460);
    const a = [p[0] + d[0] * 1.4, p[1] + 1.35, p[2] + d[2] * 1.4];
    const b = [p[0] + d[0] * 17, p[1] + 1.35 + d[1] * 16, p[2] + d[2] * 17];
    sound.at(pid, "ominousBellHit", 1.0, 0.7, 30);
    sound.at(pid, "cannonFire1", 1.0, 0.55, 30);
    seg(a, b, {
      r: 0.6,
      tex: TEX.crit,
      count: 20,
      life: [0.28, 0.6],
      size: [0.38, 0.76],
      colors: [
        [[255, 235, 95], [110, 230, 255]],
        [[255, 80, 20, 0], [180, 70, 255, 0]],
      ],
    });
    boom(b, 3.2, {
      count: 30,
      colors: [
        [[255, 240, 110], [120, 230, 255]],
        [[220, 50, 10, 0], [160, 60, 240, 0]],
      ],
    });
    const res = hitSeg(a, b, 2.6, pid, itemName, 126);
    for (const id in res.seen) {
      impulse(id, d[0] * 2.4, 0.9, d[2] * 2.4);
    }
    return true;
  }

  // ----------------------------------------------------- MYTHICAL : TIGER ---
  const BYAKKO_PARTS = [
    ["HeadMesh", "Gold Block", [0.58, 0.24, 0.58], [0, 0.34, 0], [0, 0, 0]],
    ["ArmLeftMesh", "Snow", [0.42, 0.78, 0.42], [0, -0.15, 0], [0, 0, 0]],
    ["ArmRightMesh", "Snow", [0.42, 0.78, 0.42], [0, -0.15, 0], [0, 0, 0]],
  ];

  // Tempest Finger Barrage : 3 salves d'ondes d'air comprimé dorées/blanches.
  function onPlayerClickFingerPistol(pid, itemName) {
    if (!isAliveId(pid)) return false;
    poseBeam(pid, 440);
    let shot = 0;
    run({
      next: function () {
        const p = posOf(pid);
        if (!p || shot >= 3) return { done: true };
        const d = facing(pid);
        const a = [p[0] + d[0] * 1.2, p[1] + 1.25, p[2] + d[2] * 1.2];
        const b = [p[0] + d[0] * 14, p[1] + 1.25 + d[1] * 13, p[2] + d[2] * 14];
        sound.at(pid, shot === 2 ? "cannonFire3" : "bigDrumSwish1", 0.85, 1.35 + shot * 0.12, 24);
        seg(a, b, {
          r: 0.26,
          tex: TEX.crit,
          count: 11,
          life: [0.18, 0.38],
          size: [0.28, 0.54],
          colors: [
            [[255, 240, 150], [255, 160, 45]],
            [[200, 110, 20, 0], [255, 245, 200, 0]],
          ],
        });
        ring([a[0] + d[0] * 2.5, a[1] + d[1] * 2.5, a[2] + d[2] * 2.5], 1.3, 6, {
          tex: TEX.glint,
          life: [0.16, 0.32],
          size: [0.24, 0.46],
          colors: [
            [[255, 245, 180], [255, 175, 55]],
            [[200, 110, 20, 0], [255, 245, 200, 0]],
          ],
        });
        hitSeg(a, b, 1.9, pid, itemName, 32);
        shot++;
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // White Tiger Finisher : éveil Byakko + bond éclair et tempête de griffes croisées.
  function onPlayerClickFeralMaul(pid, itemName) {
    const p = posOf(pid);
    const dst = aimSpot(pid, 11);
    if (!p || !dst) return true;
    poseSlash(pid, 480);
    sound.at(p, "bearRoar1", 0.95, 1.05, 26);
    sound.at(p, "magicAccent3", 0.85, 1.45, 24);
    eff(pid, "Speed", 20000, { inbuiltLevel: 2 });
    startMythicForm(pid, {
      scale: 1.25,
      title: "BYAKKO WHITE TIGER",
      bannerColor: "#fde047",
      parts: BYAKKO_PARTS,
      colors: [
        [[255, 245, 180], [255, 150, 40]],
        [[190, 90, 15, 0], [255, 250, 210, 0]],
      ],
      steps: 14,
      onAura: function (ap, st) {
        ring(
          [ap[0], ap[1] + 0.9, ap[2]],
          2.5,
          7,
          {
            tex: TEX.crit,
            life: [0.18, 0.36],
            size: [0.24, 0.48],
            colors: [
              [[255, 245, 180], [255, 150, 40]],
              [[190, 90, 15, 0], [255, 250, 210, 0]],
            ],
          },
          st * 0.9,
        );
      },
    });
    seg([p[0], p[1] + 1.0, p[2]], [dst[0], dst[1] + 1.0, dst[2]], {
      r: 0.28,
      tex: TEX.crit,
      count: 14,
      life: [0.22, 0.45],
      size: [0.3, 0.58],
      colors: [
        [[255, 235, 140], [255, 130, 30]],
        [[190, 80, 10, 0], [255, 245, 190, 0]],
      ],
    });
    teleport(pid, dst[0], dst[1] + 0.5, dst[2]);
    sound.at(dst, "critical_hit", 0.95, 0.95, 26);
    sound.at(dst, "cannonFire2", 0.9, 1.05, 26);
    boom(dst, 2.8, {
      tex: TEX.crit,
      count: 28,
      colors: [
        [[255, 235, 130], [255, 120, 25]],
        [[180, 60, 10, 0], [255, 220, 130, 0]],
      ],
    });
    hitArea(dst, 4.8, pid, itemName, 118, { height: 3.6 });
    pushOut(dst, 4.8, pid, 1.9, 0.8);
    return true;
  }

  // ------------------------------------------------------ MYTHICAL : YETI ---
  const YETI_PARTS = [
    ["TorsoNode", "Snow", [0.74, 0.94, 0.66], [0, 0.05, 0], [0, 0, 0]],
    ["HeadMesh", "Ice", [0.62, 0.58, 0.62], [0, 0.14, 0], [0, 0, 0]],
    ["ArmLeftMesh", "Snow", [0.44, 0.85, 0.44], [0, -0.12, 0], [0, 0, 0]],
    ["ArmRightMesh", "Snow", [0.44, 0.85, 0.44], [0, -0.12, 0], [0, 0, 0]],
    ["LegLeftMesh", "Ice", [0.4, 0.78, 0.4], [0, -0.1, 0], [0, 0, 0]],
    ["LegRightMesh", "Ice", [0.4, 0.78, 0.4], [0, -0.1, 0], [0, 0, 0]],
  ];

  // Glacier Throw : arrache un monolithe de glace et le fracasse en 4 piliers gelés.
  function onPlayerClickAvalancheBoulder(pid, itemName) {
    const p = posOf(pid);
    const c = aimSpot(pid, 13);
    if (!p || !c) return true;
    poseSlam(pid, 480);
    sound.at(pid, "cannonFire1", 0.9, 0.75, 26);
    seg([p[0], p[1] + 2.2, p[2]], c, {
      r: 0.42,
      tex: TEX.glint,
      count: 14,
      life: [0.24, 0.5],
      size: [0.36, 0.7],
      colors: [
        [[225, 252, 255], [110, 200, 255]],
        [[60, 140, 220, 0], [220, 250, 255, 0]],
      ],
    });
    sound.at(c, "glass1", 0.95, 0.75, 26);
    boom(c, 2.8, {
      tex: TEX.glint,
      count: 28,
      colors: [
        [[225, 252, 255], [100, 195, 255]],
        [[50, 130, 210, 0], [210, 245, 255, 0]],
      ],
    });
    for (let i = 0; i < 4; i++) {
      const a = i * 1.57;
      column([c[0] + Math.cos(a) * 2.2, c[1], c[2] + Math.sin(a) * 2.2], 3.2, {
        tex: TEX.glint,
        r: 0.22,
        count: 2,
        steps: 5,
        life: [0.22, 0.45],
        colors: [
          [[225, 252, 255], [100, 195, 255]],
          [[50, 130, 210, 0], [210, 245, 255, 0]],
        ],
      });
    }
    hitArea(c, 4.8, pid, itemName, 96, { height: 3.6, slow: [3800, 4] });
    pushOut(c, 4.8, pid, 1.8, 0.75);
    return true;
  }

  // Subzero Roar : transformation en Titan Yéti Abominable + hurlement polaire qui fige sur place.
  function onPlayerClickAbominableRoar(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    poseRoar(pid, 650);
    sound.at(pid, "bearRoar1", 1.0, 0.55, 30);
    sound.at(pid, "glass1", 0.9, 0.75, 28);
    eff(pid, "Damage Reduction", 22000, { inbuiltLevel: 3 });
    startMythicForm(pid, {
      scale: 1.46,
      title: "ABOMINABLE FROST TITAN",
      bannerColor: "#bae6fd",
      parts: YETI_PARTS,
      colors: [
        [[225, 252, 255], [105, 200, 255]],
        [[60, 145, 225, 0], [220, 250, 255, 0]],
      ],
      steps: 14,
      onAura: function (ap, st) {
        ring(
          [ap[0], ap[1] + 0.9, ap[2]],
          3.6,
          9,
          {
            tex: TEX.glint,
            life: [0.22, 0.45],
            power: [0.3, 1.0],
            size: [0.28, 0.56],
            colors: [
              [[225, 252, 255], [105, 200, 255]],
              [[60, 145, 225, 0], [220, 250, 255, 0]],
            ],
          },
          st * 0.7,
        );
      },
    });
    for (let r = 3.0; r <= 5.4; r += 1.2) {
      ring([p[0], p[1] + 1.1, p[2]], r, 10, {
        tex: TEX.glint,
        life: [0.25, 0.55],
        power: [0.7, 2.0],
        size: [0.3, 0.6],
        colors: [
          [[220, 250, 255], [105, 200, 255]],
          [[60, 145, 225, 0], [220, 250, 255, 0]],
        ],
      });
    }
    hitArea(p, 5.6, pid, itemName, 92, { height: 3.6, slow: [4800, 5] });
    pushOut(p, 5.6, pid, 2.0, 0.7);
    return true;
  }

  // Permafrost Earthshatter : fracasse le sol et érige une couronne de 6 stalagmites de glace.
  function onPlayerClickPermafrostSlam(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    poseSlam(pid, 540);
    shake(pid, 0.48, 420);
    sound.at(pid, "cannonFire1", 1.0, 0.55, 28);
    sound.at(pid, "glass1", 0.95, 0.65, 28);
    boom(p, 3.0, {
      tex: TEX.glint,
      count: 30,
      colors: [
        [[225, 252, 255], [95, 190, 255]],
        [[50, 130, 215, 0], [210, 248, 255, 0]],
      ],
    });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * 6.283;
      column([p[0] + Math.cos(a) * 3.6, p[1], p[2] + Math.sin(a) * 3.6], 3.8, {
        tex: TEX.glint,
        r: 0.25,
        count: 2,
        steps: 6,
        life: [0.26, 0.55],
        colors: [
          [[225, 252, 255], [95, 190, 255]],
          [[50, 130, 215, 0], [210, 248, 255, 0]],
        ],
      });
    }
    hitArea(p, 6.0, pid, itemName, 112, { height: 4.0, slow: [4200, 4] });
    pushOut(p, 6.0, pid, 1.9, 0.9);
    return true;
  }

  // --------------------------------------------------- MYTHICAL : KITSUNE ---
  const KITSUNE_PARTS = [
    ["TorsoNode", "Light Blue Concrete", [0.68, 0.35, 0.85], [0, -0.1, -0.35], [-0.35, 0, 0]],
    ["HeadMesh", "Snow", [0.58, 0.25, 0.58], [0, 0.34, 0], [0, 0.78, 0]],
    ["ArmLeftMesh", "Light Blue Concrete", [0.36, 0.72, 0.36], [0, -0.1, 0], [0, 0, 0]],
    ["ArmRightMesh", "Light Blue Concrete", [0.36, 0.72, 0.36], [0, -0.1, 0], [0, 0, 0]],
  ];

  // Nine-Tails Foxfire : couronne de 5 feux follets azur/magenta tirés sur la visée.
  function onPlayerClickFoxFireOrbs(pid, itemName) {
    const p = posOf(pid);
    const tgt = aimSpot(pid, 14);
    if (!p || !tgt) return true;
    poseBeam(pid, 440);
    sound.at(pid, "magicAccent4", 0.85, 1.45, 24);
    sound.at(tgt, "futureStrangePulse", 0.85, 1.25, 24);
    for (let i = -2; i <= 2; i++) {
      const start = [p[0] + i * 0.75, p[1] + 2.2 + (2 - Math.abs(i)) * 0.25, p[2] + Math.abs(i) * 0.4];
      point(start, {
        r: 0.25,
        tex: TEX.soul,
        count: 5,
        life: [0.22, 0.45],
        size: [0.28, 0.52],
        colors: [
          [[70, 225, 255], [255, 110, 225]],
          [[30, 140, 240, 0], [220, 60, 180, 0]],
        ],
      });
      seg(start, tgt, {
        r: 0.16,
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
    boom(tgt, 2.4, {
      tex: TEX.soul,
      count: 24,
      colors: [
        [[80, 230, 255], [255, 115, 225]],
        [[30, 140, 240, 0], [220, 60, 180, 0]],
      ],
    });
    hitArea(tgt, 4.4, pid, itemName, 98, { height: 3.4 });
    return true;
  }

  // Celestial Tails Lash : transformation Kitsune à 9 queues + balayage de flammes spirituelles.
  function onPlayerClickTailsSweep(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = facing(pid);
    poseSlash(pid, 480);
    const c = [p[0] + d[0] * 3.6, p[1] + 1.1, p[2] + d[2] * 3.6];
    sound.at(pid, "bigDrumSwish2", 0.9, 1.3, 24);
    sound.at(pid, "magicAccent4", 0.85, 1.35, 24);
    eff(pid, "Speed", 22000, { inbuiltLevel: 2 });
    startMythicForm(pid, {
      scale: 1.24,
      title: "CELESTIAL NINE-TAILS KITSUNE",
      bannerColor: "#38bdf8",
      parts: KITSUNE_PARTS,
      colors: [
        [[75, 230, 255], [255, 115, 230]],
        [[25, 130, 235, 0], [210, 50, 180, 0]],
      ],
      steps: 14,
      onAura: function (ap, st) {
        ring(
          [ap[0], ap[1] + 1.15, ap[2]],
          2.6,
          9,
          {
            tex: TEX.soul,
            life: [0.2, 0.42],
            power: [0.2, 0.8],
            size: [0.26, 0.5],
            colors: [
              [[75, 230, 255], [255, 115, 230]],
              [[25, 130, 235, 0], [210, 50, 180, 0]],
            ],
          },
          st * 0.75,
        );
      },
    });
    ring(c, 4.0, 11, {
      tex: TEX.soul,
      life: [0.24, 0.5],
      power: [0.6, 1.8],
      size: [0.3, 0.58],
      colors: [
        [[75, 225, 255], [255, 120, 230]],
        [[25, 130, 235, 0], [210, 50, 180, 0]],
      ],
    });
    hitArea(c, 4.8, pid, itemName, 92, { height: 3.4 });
    pushOut(c, 4.8, pid, 2.0, 0.7);
    return true;
  }

  // Kitsune Illusion Step : clone explosif de feu de renard + téléportation + Speed.
  function onPlayerClickMirageDash(pid, itemName) {
    const p = posOf(pid);
    const dst = aimSpot(pid, 12);
    if (!p || !dst) return true;
    sound.at(p, "magicAccent3", 0.85, 1.55, 24);
    eff(pid, "Speed", 6500, { inbuiltLevel: 3 });
    boom(p, 1.8, {
      tex: TEX.soul,
      count: 16,
      colors: [
        [[80, 230, 255], [255, 120, 230]],
        [[25, 130, 235, 0], [210, 50, 180, 0]],
      ],
    });
    seg([p[0], p[1] + 1.0, p[2]], [dst[0], dst[1] + 1.0, dst[2]], {
      r: 0.24,
      tex: TEX.soul,
      count: 12,
      life: [0.22, 0.45],
      size: [0.28, 0.54],
      colors: [
        [[80, 230, 255], [255, 120, 230]],
        [[25, 130, 235, 0], [210, 50, 180, 0]],
      ],
    });
    teleport(pid, dst[0], dst[1] + 0.5, dst[2]);
    sound.at(dst, "futureStrangePulse", 0.85, 1.4, 24);
    boom(dst, 2.4, {
      tex: TEX.soul,
      count: 24,
      colors: [
        [[80, 230, 255], [255, 120, 230]],
        [[25, 130, 235, 0], [210, 50, 180, 0]],
      ],
    });
    hitArea(dst, 4.4, pid, itemName, 94, { height: 3.4 });
    return true;
  }

  // Shrine Bomb : sphère cataclysmique de feu de renard à 9 queues qui oblitère la zone.
  function onPlayerClickNineTailsCataclysm(pid, itemName) {
    const c = aimSpot(pid, 14);
    const p = posOf(pid);
    if (!p || !c) return true;
    poseSlam(pid, 560);
    shake(pid, 0.5, 450);
    const sky = [p[0], p[1] + 3.6, p[2]];
    sound.at(pid, "ominousBellHit", 0.95, 1.15, 28);
    sound.at(c, "cannonFire1", 1.0, 0.65, 30);
    ring(sky, 2.2, 9, {
      tex: TEX.soul,
      life: [0.24, 0.5],
      size: [0.3, 0.6],
      colors: [
        [[75, 230, 255], [255, 110, 225]],
        [[25, 135, 240, 0], [215, 50, 180, 0]],
      ],
    });
    seg(sky, c, {
      r: 0.4,
      tex: TEX.soul,
      count: 14,
      life: [0.25, 0.55],
      size: [0.36, 0.72],
      colors: [
        [[75, 230, 255], [255, 110, 225]],
        [[25, 135, 240, 0], [215, 50, 180, 0]],
      ],
    });
    boom(c, 3.5, {
      tex: TEX.soul,
      count: 34,
      colors: [
        [[85, 235, 255], [255, 120, 230]],
        [[25, 135, 240, 0], [215, 50, 180, 0]],
      ],
    });
    ring([c[0], c[1] + 0.5, c[2]], 5.2, 12, {
      tex: TEX.soul,
      life: [0.28, 0.58],
      size: [0.32, 0.64],
      colors: [
        [[85, 235, 255], [255, 120, 230]],
        [[25, 135, 240, 0], [215, 50, 180, 0]],
      ],
    });
    hitArea(c, 6.0, pid, itemName, 125, { height: 4.2 });
    pushOut(c, 6.0, pid, 2.2, 0.9);
    return true;
  }

  // --------------------------------------------------- MYTHICAL : CONTROL ---
  // Gamma Knife : dash chirurgical et lame d'énergie verte/cyan interne.
  function onPlayerClickGammaKnife(pid, itemName) {
    const p = posOf(pid);
    const dst = aimSpot(pid, 10);
    if (!p || !dst) return true;
    poseSlash(pid, 400);
    sound.at(p, "futureStrangePulse", 0.85, 1.5, 24);
    sound.at(dst, "critical_hit", 0.9, 1.25, 24);
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
    poseBeam(pid, 420);
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
  const DRAGON_PARTS = [
    ["TorsoNode", "Red Concrete", [0.72, 0.92, 0.65], [0, 0.05, 0], [0, 0, 0]],
    ["HeadMesh", "Gold Block", [0.65, 0.3, 0.55], [0, 0.36, 0], [0.2, 0.78, 0]],
    ["ArmLeftMesh", "Orange Concrete", [0.42, 0.82, 0.42], [0, -0.1, 0], [0, 0, 0]],
    ["ArmRightMesh", "Orange Concrete", [0.42, 0.82, 0.42], [0, -0.1, 0], [0, 0, 0]],
    ["LegLeftMesh", "Red Concrete", [0.38, 0.78, 0.38], [0, -0.1, 0], [0, 0, 0]],
    ["LegRightMesh", "Red Concrete", [0.38, 0.78, 0.38], [0, -0.1, 0], [0, 0, 0]],
  ];

  // Blast Breath : torrent colossal de feu draconique doré/écarlate entouré de 4 anneaux de flammes.
  function onPlayerClickBoroBreath(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = facing(pid);
    poseBeam(pid, 600);
    shake(pid, 0.55, 480);
    const a = [p[0] + d[0] * 1.4, p[1] + 1.45, p[2] + d[2] * 1.4];
    const b = [p[0] + d[0] * 19, p[1] + 1.45 + d[1] * 18, p[2] + d[2] * 19];
    sound.at(pid, "bearRoar1", 1.0, 0.5, 32);
    sound.at(pid, "cannonFire1", 1.0, 0.5, 32);
    sound.at(b, "cannonFire2", 1.0, 0.6, 32);
    seg(a, b, {
      r: 0.7,
      tex: TEX.crit,
      count: 22,
      life: [0.28, 0.62],
      size: [0.42, 0.84],
      colors: [
        [[255, 240, 110], [255, 70, 15]],
        [[190, 20, 0, 0], [255, 150, 30, 0]],
      ],
    });
    for (let k = 1; k <= 4; k++) {
      const f = k / 5;
      ring([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f], 1.8, 7, {
        tex: TEX.crit,
        life: [0.22, 0.48],
        size: [0.3, 0.6],
        colors: [
          [[255, 240, 110], [255, 70, 15]],
          [[190, 20, 0, 0], [255, 150, 30, 0]],
        ],
      });
    }
    boom(b, 3.6, {
      tex: TEX.crit,
      count: 34,
      colors: [
        [[255, 245, 120], [255, 65, 10]],
        [[180, 15, 0, 0], [255, 140, 25, 0]],
      ],
    });
    hitSeg(a, b, 2.7, pid, itemName, 130);
    hitArea(b, 5.4, pid, itemName, 42, { height: 4.0 });
    pushOut(b, 5.4, pid, 2.4, 0.95);
    return true;
  }

  // Demolition Gust : cyclone draconique Kaifu qui soulève et découpe avec des lames de vent.
  function onPlayerClickDragonTwister(pid, itemName) {
    const c = aimSpot(pid, 12);
    if (!c) return true;
    poseSlash(pid, 460);
    sound.at(c, "bigDrumSwish2", 0.95, 0.8, 26);
    let t = 0;
    run({
      next: function () {
        t++;
        if (t % 2 === 0) sound.at(c, "critical_hit", 0.8, 1.15 + t * 0.08, 24);
        ring(
          [c[0], c[1] + (t % 3) * 1.25, c[2]],
          4.0,
          9,
          {
            tex: TEX.glint,
            life: [0.22, 0.48],
            power: [0.5, 1.6],
            size: [0.3, 0.6],
            gravity: [0, 2.0, 0],
            colors: [
              [[140, 255, 195], [255, 190, 70]],
              [[50, 180, 120, 0], [240, 120, 30, 0]],
            ],
          },
          t * 0.9,
        );
        pullIn(c, 5.0, pid, 0.95, 0.6);
        if (t % 2 === 0) hitArea(c, 4.8, pid, itemName, 35, { height: 4.4 });
        if (t >= 6) return { done: true };
        return { value: sleep(2), done: false };
      },
    });
    return true;
  }

  // Rising Dragon : transformation en Dragon Empereur + ascension dans une spirale de nuages de flammes.
  function onPlayerClickDraconicAscent(pid, itemName) {
    const p = posOf(pid);
    if (!p) return true;
    const d = facing(pid);
    poseRoar(pid, 680);
    sound.at(pid, "bearRoar1", 1.0, 0.5, 32);
    sound.at(pid, "ominousBellHit", 0.95, 0.65, 30);
    eff(pid, "Damage Reduction", 24000, { inbuiltLevel: 3 });
    eff(pid, "Damage", 24000, { inbuiltLevel: 3 });
    startMythicForm(pid, {
      scale: 1.48,
      title: "EMPEROR DRAGON ASCENSION",
      bannerColor: "#f97316",
      parts: DRAGON_PARTS,
      colors: [
        [[255, 225, 85], [255, 50, 20]],
        [[180, 15, 0, 0], [255, 130, 30, 0]],
      ],
      steps: 15,
      onAura: function (ap, st) {
        ring(
          [ap[0], ap[1] + 0.6 + (st % 3) * 0.7, ap[2]],
          3.8,
          9,
          {
            tex: TEX.crit,
            life: [0.22, 0.48],
            power: [0.4, 1.3],
            size: [0.3, 0.6],
            gravity: [0, 1.5, 0],
            colors: [
              [[255, 225, 85], [255, 50, 20]],
              [[180, 15, 0, 0], [255, 130, 30, 0]],
            ],
          },
          st * 0.85,
        );
        if (st % 3 === 0) {
          hitArea(ap, 4.8, pid, itemName, 20, { height: 3.8 });
        }
      },
    });
    impulse(pid, d[0] * 2.3, 1.15, d[2] * 2.3);
    ring([p[0], p[1] + 1.0, p[2]], 4.6, 12, {
      tex: TEX.crit,
      life: [0.28, 0.58],
      power: [0.8, 2.2],
      size: [0.34, 0.68],
      colors: [
        [[255, 220, 80], [255, 50, 20]],
        [[180, 15, 0, 0], [255, 130, 30, 0]],
      ],
    });
    hitArea(p, 5.6, pid, itemName, 110, { height: 4.2 });
    pushOut(p, 5.6, pid, 2.0, 0.9);
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
  FA.clearMythic = clearMythicForm;
})(globalThis.FA);
