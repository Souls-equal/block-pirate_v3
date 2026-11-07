//utils/boss.js
import { setTimeout, setInterval, sleep, run } from "./timer";
import { say } from "../core/theme";
import { markBossMob } from "../gameplay/loot";
import { aliveNow, dist2, nameTagInfo, posOf } from "./lifeform";
import { armBossGate, disarmBossGate } from "./bossGate";

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


function nearestPlayer(from) {
  const fighter = fighterId();
  if (fighter && aliveNow(fighter)) {
    const p = posOf(fighter);
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
    if (!aliveNow(id)) continue;
    const p = posOf(id);
    if (!p) continue;
    const d = dist2(from, p);
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

/* MISE EN PLACE D'UN BOSS — une seule fonction pour les trois.

   Garp (ici), le Mob Leader et le Saber Expert (gameplay/saber.js) demandaient
   le meme bloc de dix reglages, recopie trois fois avec deux ou trois valeurs
   qui changeaient. La difference est desormais un objet :

     hp, dmg, radius, speed, scale   les nombres du boss
     name, title, colour, background le nameTag (weight : graisse du texte)
     knockback, target, settings     ce qui n'appartient qu'a un seul boss

   Tout est dans UN try/catch : un reglage refuse par le moteur ne doit jamais
   empecher le boss d'exister (c'est ce que faisait deja boss.js). */
export function setupBossMob(id, cfg) {
  if (!id) return null;
  const radius = cfg.radius === undefined ? 48 : cfg.radius;
  try {
    api.setMobSetting(id, "maxHealth", cfg.hp);
    api.setHealth(id, cfg.hp, undefined, true);
    if (cfg.dmg !== undefined) api.setMobSetting(id, "attackDamage", cfg.dmg);
    api.setMobSetting(id, "hostilityRadius", radius);
    api.setMobSetting(id, "chaseRadius", radius);
    api.setMobSetting(id, "territoryRadius", radius);
    api.setMobSetting(id, "onDeathItemDrops", []);
    /* settings d'abord : c'est l'ordre qu'avait Garp (name avant les vitesses). */
    if (cfg.settings) {
      for (const key in cfg.settings) api.setMobSetting(id, key, cfg.settings[key]);
    }
    if (cfg.speed !== undefined) {
      api.setMobSetting(id, "baseRunningSpeed", cfg.speed);
      api.setMobSetting(id, "baseWalkingSpeed", cfg.speed * 0.75);
    }
    if (cfg.knockback === 0) api.setMobSetting(id, "knockbackReceivedMultiplier", 0);
    if (cfg.scale !== undefined) api.setLifeformScale(id, cfg.scale);
    if (cfg.colour) {
      api.setTargetedPlayerSettingForEveryone(id, "nameTagInfo",
        nameTagInfo(cfg.name, cfg.title, cfg.colour, cfg.background, null, cfg.weight), true);
    }
    if (cfg.target) api.setMobAiState(id, "chasing", { targetId: cfg.target });
  } catch (e) {}
  return id;
}


function pruneGuards() {
  if (!boss) return 0;
  for (let i = boss.guards.length - 1; i >= 0; i--) {
    if (!aliveNow(boss.guards[i])) boss.guards.splice(i, 1);
  }
  return boss.guards.length;
}

function setInv(inv) {
  if (!boss || boss.inv === inv) return;
  boss.inv = inv;
  api.setTargetedPlayerSettingForEveryone(boss.id, "opacity", inv ? 0.45 : 1, true);
}

function chase() {
  if (!boss || !aliveNow(boss.id)) return;
  const p = posOf(boss.id);
  if (!p) return;
  const target = nearestPlayer(p);
  if (!target || boss.aiTarget === target) return;
  api.setMobAiState(boss.id, "chasing", { targetId: target });
  boss.aiTarget = target;
}

function watch() {
  if (!boss) return;
  if (!aliveNow(boss.id)) {
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
    if (aliveNow(boss.id)) {
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
  if (!spawnPos && playerId) spawnPos = posOf(playerId);
  if (!spawnPos) {
    const ids = api.getPlayerIds() || [];
    spawnPos = ids.length ? posOf(ids[0]) : null;
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

  setupBossMob(id, {
    hp: CFG.HP,
    radius: 48,
    speed: CFG.SPEED,
    scale: CFG.SCALE,
    knockback: 0,
    name: CFG.NAME,
    title: CFG.TITLE,
    colour: "#7ec8ff",
    background: "#2a1210",
    weight: "700",
    settings: { name: CFG.NAME },
  });
  /* Pas de one shot : paliers a 1/2, 1/3, 1/4 et 1/5 (voir bossDamageGate). */
  armBossGate(id, CFG.HP);


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
  const origin = posOf(boss.id);
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
    api.setTargetedPlayerSettingForEveryone(id, "nameTagInfo", nameTagInfo(CFG.GUARD_NAME, null, "#ff9d4d", null, "#7ec8ff"), true);
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
  const p = posOf(boss.id);
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
