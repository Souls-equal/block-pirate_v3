//utils/boss.js
import { setTimeout, setInterval, sleep, run, nowMs } from "./timer";
import { say } from "../core/theme";
import { markBossMob } from "../gameplay/spawning";

// config

const CFG = {
  NAME: "GARP",
  TITLE: "the Marine Protector",
  MOB: "Cave Golem",
  SCALE: 2.3,
  HP: 3200,
  SPEED: 5.2,
  GUARD_MOB: "Draugr Zombie",
  GUARD_NAME: "Soldier",
  GUARD_COUNT: 4,
  GUARD_HP: 84,
  GUARD_DMG: 9,
  GUARD_FIRST: 80,
  GUARD_EVERY: 900,
  LOOT_ITEM: "Black Carpet",
  LOOT_NAME: "Haki fragment",
};

/* ══════════════════════════════════════════════════════════════════════════
   PALIERS DE DEGATS DES BOSS — l'anti one shot

   Les trois boss (Garp, le Saber Expert et le Mob Leader) ne peuvent pas etre
   tues d'un seul coup, meme par une attaque a 38 000 degats.

   DEUX GARDE-FOUS, et ils sont dans cet ordre :

   1. LES PALIERS. A 1/2, 1/3, 1/4 et 1/5 de sa vie, le boss ENCAISSE : le
      coup qui franchirait le palier est REFUSE, et le boss bloque TOUS les
      degats pendant LOCK_MS. Chaque palier ne se declenche qu'une fois, donc
      un boss a quatre moments ou il faut attendre avant de continuer.

   2. LE PLAFOND. Un coup ne retire jamais plus de CAP des PV maximum (9 %).
      Sans lui, un coup enorme pouvait sauter les quatre paliers d'un coup et
      le boss tombait quand meme. La derniere touche, elle, passe toujours :
      des que ce qu'il reste tient dans le plafond, on n'ecourte plus rien,
      donc un boss reste TOUJOURS tuable.

   Un palier ne bloque jamais la mort du boss (le coup fatal arrive quand il
   reste moins que le plafond), donc les recompenses de fin ne sont jamais
   perdues : Garp, le Saber Expert et le Gold Grit du Mob Leader tombent comme
   avant, sur leur propre chemin.
   ══════════════════════════════════════════════════════════════════════════ */

const GATE = {
  /* Du plus haut au plus bas : 1/2, 1/3, 1/4, 1/5 de la vie. */
  FRACTIONS: [1 / 2, 1 / 3, 1 / 4, 1 / 5],
  /* Duree du blocage quand un palier tombe. */
  LOCK_MS: 1500,
  /* Part des PV maximum qu'un seul coup peut retirer. */
  CAP: 0.09,
};

/* mobId -> { max, tiers: [bool...], until } */
const GATES = {};

/* Arme le garde-fou sur un boss qui vient d'apparaitre. */
export function armBossGate(mobId, maxHp) {
  if (!mobId || !(maxHp > 0)) return false;
  const tiers = [];
  for (let i = 0; i < GATE.FRACTIONS.length; i++) tiers.push(false);
  GATES[mobId] = { max: maxHp, tiers: tiers, until: 0 };
  return true;
}

/* Oublie un boss (mort, despawn, arene rangee). */
export function disarmBossGate(mobId) {
  if (!mobId) return false;
  delete GATES[mobId];
  return true;
}

export function bossGateForTest(mobId) {
  const g = mobId ? GATES[mobId] : null;
  return g ? { max: g.max, tiers: g.tiers.slice(), until: g.until } : null;
}

function bossNameOf(mobId) {
  let name = null;
  try { name = api.getMobSetting(mobId, "name", false); } catch (e) { name = null; }
  if (typeof name !== "string" || !name) {
    try { name = api.getEntityName(mobId); } catch (e2) { name = null; }
  }
  return typeof name === "string" && name ? name : "The boss";
}

/* Les joueurs assez proches pour voir le palier tomber. */
function playersNear(at, radius) {
  const out = [];
  let ids = [];
  try { ids = api.getPlayerIds() || []; } catch (e) { return out; }
  for (let i = 0; i < ids.length; i++) {
    const p = pos(ids[i]);
    if (p && dist2d(at, p) <= radius) out.push(ids[i]);
  }
  return out;
}

/* Annonce du palier : message, son et particules sur le boss. */
function announceGate(mobId, restPct) {
  const at = pos(mobId);
  const name = bossNameOf(mobId);
  if (at) {
    try { api.playParticleEffect(at[0], at[1] + 2, at[2], "explosion", "#ffd166", 1); } catch (e) {}
  }
  const near = at ? playersNear(at, 48) : [];
  for (let i = 0; i < near.length; i++) {
    try { api.playSound(near[i], "bearRoar1", 0.8, 1.25); } catch (e) {}
    try {
      say(near[i], [
        { str: "[", style: { color: "#94a3b8" } },
        { str: name, style: { color: "#ffd166", fontWeight: "700" } },
        { str: "] endures ", style: { color: "#cbd5e1" } },
        { str: restPct + "% health left", style: { color: "#ffd166", fontWeight: "700" } },
        { str: " - no damage for a moment.", style: { color: "#cbd5e1" } },
      ]);
    } catch (e) {}
  }
}

/* LA PORTE. Renvoie false (coup refuse), un plafond, ou les degats inchanges.
   Appelee par les deux chemins de degats : capacities (utils/combat) et corps
   a corps (onPlayerDamagingMob). */
export function bossDamageGate(mobId, amount) {
  const g = mobId ? GATES[mobId] : null;
  if (!g) return amount;
  const dmg = Number(amount);
  if (!(dmg > 0)) return amount;

  /* Entite disparue : on nettoie au passage, plutot que de garder une ligne
     par boss tue jusqu'au redemarrage du monde. */
  let hp = null;
  try { hp = api.getHealth(mobId); } catch (e) { hp = null; }
  if (typeof hp !== "number" || !(hp > 0)) { delete GATES[mobId]; return amount; }

  const now = nowMs();
  /* Palier en cours : plus rien ne passe, de personne. */
  if (g.until > now) return false;

  const max = g.max > 0 ? g.max : 1;
  for (let i = 0; i < GATE.FRACTIONS.length; i++) {
    const line = max * GATE.FRACTIONS[i];
    /* Deja sous le palier sans qu'on l'ait vu (deux coups dans la meme frame,
       boss soigne, etc.) : on le marque sans bloquer, sinon il bloquerait
       n'importe quel coup plus tard. */
    if (hp <= line) { g.tiers[i] = true; continue; }
    if (g.tiers[i]) continue;
    /* Ce coup franchirait le palier : on l'encaisse. */
    if (hp - dmg <= line) {
      g.tiers[i] = true;
      g.until = now + GATE.LOCK_MS;
      announceGate(mobId, Math.max(1, Math.round((line / max) * 100)));
      return false;
    }
  }

  /* Plafond par coup. La derniere touche n'est pas ecourtee : quand ce qui
     reste tient dans le plafond, le coup passe tel quel. */
  const cap = Math.max(1, Math.floor(max * GATE.CAP));
  if (dmg > cap && hp > cap) return cap;
  return amount;
}

// state

let boss = null;
let chaseHandle = null;
let watchHandle = null;

// helpers
export function getRandomPosition(pos1, pos2) {
    const [x1, y1, z1] = pos1;
    const [x2, y2, z2] = pos2;

    const x = Math.random() * (x2 - x1) + x1;
    const y = Math.random() * (y2 - y1) + y1;
    const z = Math.random() * (z2 - z1) + z1;

    return [x, y, z];
}
function pos(id) {
  try {
    const p = api.getPosition(id);
    return p ? [p[0], p[1], p[2]] : null;
  } catch (_) {
    return null;
  }
}

function alive(id) {
  if (!id) return false;
  try {
    return !!api.isAlive(id);
  } catch (_) {
    return false;
  }
}

function fighterId() {
  return boss && boss.fighter ? boss.fighter : null;
}

function clearSpawnPos(x, y, z) {
  let yy = y;
  for (let i = 0; i < 48; i++) {
    let block = "Air";
    try {
      block = api.getBlock(x, yy, z);
    } catch (_) {}
    if (block === "Air") return [x, yy, z];
    yy += 1;
  }
  return [x, yy, z];
}

function around(origin, radius, angle, yOff) {
  return [
    origin[0] + Math.cos(angle) * radius,
    origin[1] + (yOff || 0),
    origin[2] + Math.sin(angle) * radius,
  ];
}

function dist2d(a, b) {
  const dx = a[0] - b[0];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dz * dz);
}

function nearestPlayer(from) {
  const fighter = fighterId();
  if (fighter && alive(fighter)) {
    const p = pos(fighter);
    if (p) return fighter;
  }
  let ids = [];
  try {
    ids = api.getPlayerIds() || [];
  } catch (_) {
    return null;
  }
  let best = null;
  let bestD = Infinity;
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (!alive(id)) continue;
    const p = pos(id);
    if (!p) continue;
    const d = dist2d(from, p);
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  return best;
}

function chat(text, color, pId) {
  const id = pId || fighterId();
  if (!id) return;
  try {
    say(id, text, { color: color || "#ffffff" });
  } catch (_) {}
}

function sound(name, volume, rate) {
  const id = fighterId();
  if (!id) return;
  try {
    api.playSound(id, name, volume, rate);
  } catch (_) {}
}

function nameTag(title, subtitle, colour) {
  const info = {
    content: [{ str: title, style: { color: colour || "#7ec8ff", fontWeight: "700" } }],
    healthbar: {
      display: "always",
      foregroundColour: colour || "#ff2f1a",
      backgroundColour: "#2a1210",
    },
    border: { colour: "#7ec8ff", style: "solid" },
  };
  if (subtitle) {
    info.subtitle = [{ str: subtitle, style: { color: "#ffb347" } }];
  }
  return info;
}

function setupMob(id, hp, extra) {
  api.setMobSetting(id, "maxHealth", hp);
  api.setHealth(id, hp, undefined, true);
  api.setMobSetting(id, "hostilityRadius", 48);
  api.setMobSetting(id, "chaseRadius", 48);
  api.setMobSetting(id, "territoryRadius", 48);
  api.setMobSetting(id, "onDeathItemDrops", []);
  if (!extra) return;
  for (const key in extra) api.setMobSetting(id, key, extra[key]);
}

function pruneGuards() {
  if (!boss) return 0;
  for (let i = boss.guards.length - 1; i >= 0; i--) {
    if (!alive(boss.guards[i])) boss.guards.splice(i, 1);
  }
  return boss.guards.length;
}

function setInv(inv) {
  if (!boss || boss.inv === inv) return;
  boss.inv = inv;
  api.setTargetedPlayerSettingForEveryone(boss.id, "opacity", inv ? 0.45 : 1, true);
}

function chase() {
  if (!boss || !alive(boss.id)) return;
  const p = pos(boss.id);
  if (!p) return;
  const target = nearestPlayer(p);
  if (!target || boss.aiTarget === target) return;
  api.setMobAiState(boss.id, "chasing", { targetId: target });
  boss.aiTarget = target;
}

function watch() {
  if (!boss) return;
  if (!alive(boss.id)) {
    onBossDeath(fighterId());
    return;
  }
  setInv(pruneGuards() > 0);
}

function isOurs(id) {
  if (!boss) return false;
  if (id === boss.id) return true;
  return boss.guards.indexOf(id) >= 0;
}

function dropHaki(at) {
  if (!at) return;
  api.createItemDrop(at[0], at[1], at[2], CFG.LOOT_ITEM, 1, false, {
    customDisplayName: CFG.LOOT_NAME,
  });
}

function stopLoops() {
  if (chaseHandle) {
    chaseHandle.stop();
    chaseHandle = null;
  }
  if (watchHandle) {
    watchHandle.stop();
    watchHandle = null;
  }
}

function cleanup() {
  stopLoops();
  if (boss) {
    disarmBossGate(boss.id);
    for (let i = 0; i < boss.guards.length; i++) {
      try {
        api.despawnMob(boss.guards[i]);
      } catch (_) {}
    }
    if (alive(boss.id)) {
      try {
        api.despawnMob(boss.id);
      } catch (_) {}
    }
  }
  boss = null;
}

// src/index.js importe `cleanup` et `clearAll` : sans ces exports le bundle
// esbuild échoue (voir README « Points connus »). clearAll = nettoyage complet.
export { cleanup, cleanup as clearAll };

// spawn

export function spawnBoss(position, playerId) {
  if (boss) cleanup();

  let spawnPos = position;
  if (!spawnPos && playerId) spawnPos = pos(playerId);
  if (!spawnPos) {
    const ids = api.getPlayerIds() || [];
    spawnPos = ids.length ? pos(ids[0]) : null;
  }
  if (!spawnPos) spawnPos = [0, 64, 0];
  spawnPos = clearSpawnPos(spawnPos[0], spawnPos[1], spawnPos[2]);

  const id = api.attemptSpawnMob(CFG.MOB, spawnPos[0], spawnPos[1], spawnPos[2], {
    name: CFG.NAME,
    playSoundOnSpawn: true,
  });
  if (!id) {
    chat("You can't awaken " + CFG.NAME + ".", "#9aa0a6", playerId);
    return null;
  }

  boss = {
    id,
    fighter: playerId || null,
    inv: false,
    dead: false,
    guards: [],
    aiTarget: null,
  };
  /* Boss de rang 3 pour le butin : cleanup() despawn Garp avant le credit du
     kill, donc son nom ne sera plus lisible a ce moment-la. */
  markBossMob(id, CFG.NAME);

  setupMob(id, CFG.HP, {
    name: CFG.NAME,
    baseRunningSpeed: CFG.SPEED,
    baseWalkingSpeed: CFG.SPEED * 0.75,
    knockbackReceivedMultiplier: 0,
  });
  api.setLifeformScale(id, CFG.SCALE);
  /* Pas de one shot : paliers a 1/2, 1/3, 1/4 et 1/5 (voir bossDamageGate). */
  armBossGate(id, CFG.HP);
  api.setTargetedPlayerSettingForEveryone(id, "nameTagInfo", nameTag(CFG.NAME, CFG.TITLE, "#7ec8ff"), true);

  sound("bearRoar1", 1, 0.55);
  chat(CFG.NAME + " awakens", "#7ec8ff");

  chaseHandle = setInterval(chase, 20);
  watchHandle = setInterval(watch, 5);
  run((function* () {
    yield sleep(CFG.GUARD_FIRST);
    while (boss && !boss.dead) {
      if (pruneGuards() === 0) yield* summonGuards();
      yield sleep(CFG.GUARD_EVERY);
    }
  })());

  return id;
}

// summons

function* summonGuards() {
  if (!boss) return;
  const origin = pos(boss.id);
  if (!origin) return;

  chat(CFG.GUARD_NAME + " woke up — the boss is now invincible.", "#ff9d4d");
  sound("ominousBellHit", 1, 0.65);

  const n = CFG.GUARD_COUNT;
  for (let i = 0; i < n; i++) {
    if (!boss) return;
    const raw = around(origin, 6, (i / n) * Math.PI * 2, 0);
    const p = clearSpawnPos(raw[0], raw[1], raw[2]);
    const id = api.attemptSpawnMob(CFG.GUARD_MOB, p[0], p[1], p[2], {
      name: CFG.GUARD_NAME,
      playSoundOnSpawn: true,
    });
    if (!id) continue;
    setupMob(id, CFG.GUARD_HP, {
      name: CFG.GUARD_NAME,
      attackDamage: CFG.GUARD_DMG,
    });
    api.setTargetedPlayerSettingForEveryone(id, "nameTagInfo", nameTag(CFG.GUARD_NAME, null, "#ff9d4d"), true);
    const target = nearestPlayer(p);
    if (target) api.setMobAiState(id, "chasing", { targetId: target });
    boss.guards.push(id);
    yield sleep(3);
  }

  setInv(pruneGuards() > 0);
}

function onBossDeath(playerId) {
  if (!boss || boss.dead) return;
  boss.dead = true;
  const p = pos(boss.id);
  dropHaki(p);
  chat(CFG.NAME + " has fallen", "#ffd166", playerId);
  sound("exp_levelup", 1, 0.9);
  if (playerId) chat(CFG.LOOT_NAME, "#ffd166", playerId);
  cleanup();
  setTimeout(()=>{
      chat("You will be teleported in 5 seconds...", "lime", playerId)
      api.setPosition(playerId, 2441, -915, 533)
  },100)
}

// callbacks

export function onPlayerDamagingMobBoss(playerId, mobId) {
  if (!boss || mobId !== boss.id) return false;
  if (boss.inv) return true;
}

export function onPlayerKilledMobBoss(playerId, mobId) {
  if (!boss) return;
  if (mobId === boss.id) {
    onBossDeath(playerId);
    return;
  }
  const i = boss.guards.indexOf(mobId);
  if (i < 0) return;
  boss.guards.splice(i, 1);
  if (boss.guards.length === 0) {
    setInv(false);
    chat("Shield broke", "#ffd166", playerId);
    sound("glass1", 1, 0.8);
  }
}

export function onWorldAttemptDespawnMobBoss(mobId) {
  if (isOurs(mobId)) return "preventDespawn";
}

export function onCloseBoss() {
  cleanup();
}
