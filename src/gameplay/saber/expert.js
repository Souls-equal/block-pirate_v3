// gameplay/saber/expert.js
/* expert.js — le Saber Expert (niveau 200, mob Lord Vulcan)

   Le duel : 38 456 PV, neuf attaques telegraphiees (ruee, frappe au sol,
   seisme, rayon, pluie de lames, tempete, saisie, entaille, tempete finale),
   et une phase 2 a 50 % de vie ou il accelere.
   
   Il ne peut pas etre tue d'un seul coup (paliers dans utils/bossGate.js).
   Le vaincre termine la quete et rend le joueur dans la salle de Shanks.
 */

import { C } from "../../core/theme";
import { TEX, boom, point, rgba, ring, segDist, at as soundAt } from "../../utils/fx";
import { damage, eff, hitArea, impulse, setVel } from "../../utils/combat";
import { setInterval as every, nowMs } from "../../utils/timer";
import { getAlivePlayerIds, isMobEntityType, safePosition } from "../../utils/lifeform";
import { armBossGate } from "../../utils/bossGate";
import { markBossMob } from "../loot";
import { ARENA, WALL_BEHIND } from "./config";
import { clearSecretArrow, clearStructArrow } from "./arrows";
import { resetQuest } from "./state";
import { HOT_A, HOT_B, WARN_A, WARN_B, advanceWaves, alive, clearSpot, despawnIfAlive, dist3, groundCorridor, groundMark, groundRing, healthOf, line, nameTag, norm3, pillar, spawnWave, tell, typeOf } from "./kit";


/* ── niveau 200 : memes formules que gameplay/spawning.js ───────────────── */
function mobHp(level) { return Math.round(20 + Math.pow(level, 1.6) * 8); }

function mobDmg(level) { return Math.round(3 + Math.pow(level, 1.3) * 0.8); }


/* LE SABER EXPERT EST UN BOSS, PAS UN DUELISTE.
   Il a les statistiques d'un mob de NIVEAU 200 (memes formules que le Mob
   Leader : ~38 500 PV, ~786 de corps a corps), et neuf attaques qui, toutes,
   DESSINENT leur zone avant de frapper.

   Aucune de ses attaques ne previent dans le chat : la preparation est une
   animation au sol (couloir, cercle, anneau, marque), puis l'impact tombe
   exactement dans la zone dessinee. Le joueur lit le terrain, pas les logs. */
const SABER = {
    MOB: "Lord Vulcan",
    NAME: "SABER EXPERT",
    TITLE: "Level 200 - Guardian of the Ancient Blade",
    LEVEL: 200,
    SCALE: 1.9,
    SPEED: 6.2,
    DASH_SPEED: 34,
    BG: "#E8B4A0",
    /* Degats = multiples d'un coup de corps a corps de niveau 200. */
    HIT: {
        dash: 1.0, slam: 0.9, quake: 0.7, beam: 1.3, rain: 0.55,
        storm: 0.12, grab: 1.1, tempest: 0.45, slash: 0.8,
    },
    CD: {
        dash: 7000, slam: 6500, quake: 9000, beam: 5500, rain: 12000,
        storm: 12000, grab: 8000, tempest: 9000, slash: 4500,
    },
    WARN: { dash: 900, slam: 750, beam: 900, grab: 700 },
    DASH: { MS: 800, LEN_MAX: 34, WIDTH: 3.2 },
    STORM: { MS: 2600, TICK: 400, RADIUS: 5.5 },
    QUAKE: { SPEED: 13, MAX: 26, BAND: 1.8 },
    BEAM: { RADIUS: 2.8 },
    RAIN: { COUNT: 5, RADIUS: 2.6, STEP: 340 },
};


function saberHp() { return mobHp(SABER.LEVEL); }

function saberDmg() { return mobDmg(SABER.LEVEL); }

function hitFor(key) { return Math.round(saberDmg() * (SABER.HIT[key] || 0.5)); }


let saber = null; // voir startSaberFight pour la forme exacte
let saberTimer = null;


function arenaSpot() {
    const x = ARENA.a[0] + Math.random() * (ARENA.b[0] - ARENA.a[0]);
    const z = ARENA.a[2] + Math.random() * (ARENA.b[2] - ARENA.a[2]);
    return clearSpot([x, ARENA.a[1], z]);
}


function playersInArena() {
    const ids = getAlivePlayerIds();
    const out = [];
    for (let i = 0; i < ids.length; i++) {
        const p = safePosition(ids[i]);
        if (!p) continue;
        if (p[0] < ARENA.a[0] || p[0] > ARENA.b[0]) continue;
        if (p[2] < ARENA.a[2] || p[2] > ARENA.b[2]) continue;
        if (p[1] < ARENA.a[1] - 40 || p[1] > ARENA.b[1] + 80) continue;
        out.push(ids[i]);
    }
    return out;
}


/* ── 9 ter. LA BOUCLE ──────────────────────────────────────────────────── */

export function startSaberFight(playerId) {
    if (saber && alive(saber.id)) {
        tell(playerId, line("fa-solid fa-swords", C.DANGER,
            saber.fighter === playerId
                ? "The Saber Expert is already waiting for you."
                : "A duel is already taking place in the arena."));
        return false;
    }
    const inArena = playersInArena();
    for (let i = 0; i < inArena.length; i++) {
        if (inArena[i] !== playerId) {
            tell(playerId, line("fa-solid fa-xmark", C.DANGER, "Someone is already fighting in the arena."));
            return false;
        }
    }
    if (inArena.length === 0) clearArenaMobs();

    const landing = arenaSpot();
    try { api.setPosition(playerId, landing[0], landing[1], landing[2]); } catch (e) {}
    const p = safePosition(playerId) || landing;
    const angle = Math.random() * Math.PI * 2;
    const spot = clearSpot([p[0] + Math.cos(angle) * 10, p[1], p[2] + Math.sin(angle) * 10]);

    let id = null;
    try {
        id = api.attemptSpawnMob(SABER.MOB, spot[0], spot[1], spot[2], {
            name: SABER.NAME,
            playSoundOnSpawn: true,
        });
    } catch (e) { id = null; }
    if (!id) {
        tell(playerId, line("fa-solid fa-xmark", C.DANGER, "The Saber Expert did not show up."));
        return false;
    }
    /* Meme raison que le Mob Leader : l'arene est rangee avant le credit du
       kill, donc le nom du boss n'est plus lisible a ce moment-la. */
    markBossMob(id, SABER.NAME);
    const hp = saberHp();
    /* Pas de one shot : meme garde-fou que sur le Mob Leader et Garp. */
    armBossGate(id, hp);
    try {
        api.setMobSetting(id, "maxHealth", hp);
        api.setHealth(id, hp, undefined, true);
        api.setMobSetting(id, "attackDamage", saberDmg());
        api.setMobSetting(id, "hostilityRadius", 48);
        api.setMobSetting(id, "chaseRadius", 48);
        api.setMobSetting(id, "territoryRadius", 48);
        api.setMobSetting(id, "onDeathItemDrops", []);
        api.setMobSetting(id, "baseRunningSpeed", SABER.SPEED);
        api.setMobSetting(id, "baseWalkingSpeed", SABER.SPEED * 0.75);
        api.setMobSetting(id, "knockbackReceivedMultiplier", 0);
        api.setLifeformScale(id, SABER.SCALE);
        api.setTargetedPlayerSettingForEveryone(id, "nameTagInfo",
            nameTag(SABER.NAME, SABER.TITLE, SABER.BG), true);
        api.setMobAiState(id, "chasing", { targetId: playerId });
    } catch (e) {}

    saber = {
        id: id,
        fighter: playerId,
        hp0: hp,
        enraged: false,
        last: null,
        cds: {
            dash: nowMs() + 2500, slam: nowMs() + 4000, quake: nowMs() + 6000,
            beam: nowMs() + 3000, rain: nowMs() + 9000, storm: nowMs() + 7000,
            grab: nowMs() + 5000, tempest: 0, slash: nowMs() + 1500,
        },
        waves: [],
        cast: null,
        used: {},
        storm: null,
        quake: null,
        rain: null,
        grab: null,
        dashUntil: 0,
        dashFrom: null,
        dashHit: {},
        aiTarget: playerId,
    };
    if (saberTimer) saberTimer.stop();
    saberTimer = every(thinkSaber, 4);

    soundAt(spot, "ominousBellHit", 1, 0.6, 45);
    groundRing(spot, 4, HOT_A, HOT_B);
    tell(playerId, [
        { icon: "fa-solid fa-swords", style: { color: SABER.BG } },
        { str: " SABER EXPERT", style: { color: SABER.BG, fontWeight: "bold" } },
        { str: ": \"Then draw your steel.\"", style: { color: C.INFO } },
    ]);
    return true;
}


function clearArenaMobs() {
    let ids = [];
    try { ids = api.getEntitiesInRect(ARENA.a, ARENA.b) || []; } catch (e) { return; }
    for (let i = 0; i < ids.length; i++) {
        if (!isMobEntityType(typeOf(ids[i]))) continue;
        despawnIfAlive(ids[i]);
    }
}


function thinkSaber() {
    if (!saber) { stopSaber(); return; }
    if (!alive(saber.id)) { saberFallen(); return; }
    const p = safePosition(saber.id);
    if (!p) { despawnIfAlive(saber.id); stopSaber(); return; }

    advanceWaves(saber.waves, saber.id);
    tickSaberDash(p);
    tickSaberCast(p);
    tickSaberStorm(p);
    tickSaberQuake(p);
    tickSaberRain(p);
    tickSaberGrab(p);

    const target = saber.fighter && alive(saber.fighter) ? saber.fighter : null;
    if (!target) { endSaberFight("Your duel ended: the arena is empty."); return; }
    const tp = safePosition(target);
    if (!tp) { endSaberFight("Your duel ended: the arena is empty."); return; }

    if (!saber.enraged && healthOf(saber.id) <= saber.hp0 * 0.5) enrage();

    const d = dist3(p, tp);
    const now = nowMs();
    if (saberBusy(now)) return;

    /* ROTATION : tout ce qui est disponible a cette distance, moins la
       derniere attaque jouee. Les portees sont larges parce que chaque
       attaque se prepare : le boss a le temps de la lancer. */
    const ready = [];
    if (now >= saber.cds.dash && d > 5 && d < SABER.DASH.LEN_MAX) ready.push("dash");
    if (now >= saber.cds.slam && d < 10) ready.push("slam");
    if (now >= saber.cds.quake && d < SABER.QUAKE.MAX) ready.push("quake");
    if (now >= saber.cds.beam && d > 5 && d < 44) ready.push("beam");
    if (now >= saber.cds.rain && d > 4 && d < 34) ready.push("rain");
    if (now >= saber.cds.storm && d < SABER.STORM.RADIUS + 5) ready.push("storm");
    if (now >= saber.cds.grab && d < 13) ready.push("grab");
    if (saber.enraged && now >= saber.cds.tempest && d < 18) ready.push("tempest");
    if (now >= saber.cds.slash && d > 4 && d < 32) ready.push("slash");

    /* On joue celle qui n'a pas servi depuis le plus longtemps : c'est ce qui
       garantit que TOUTES les attaques passent, et pas seulement les deux
       premieres de la liste. `saber.last` evite juste de repeter la meme
       deux fois de suite. */
    let pick = null, pickAge = -1;
    for (let i = 0; i < ready.length; i++) {
        const age = now - (saber.used[ready[i]] || 0);
        if (ready[i] === saber.last) continue;
        if (age > pickAge) { pickAge = age; pick = ready[i]; }
    }
    if (!pick && ready.length) pick = ready[0];
    if (pick) { castSaber(pick, p, tp); return; }

    if (saber.aiTarget !== target) {
        try { api.setMobAiState(saber.id, "chasing", { targetId: target }); } catch (e) {}
        saber.aiTarget = target;
    }
}


function saberBusy(now) {
    if (saber.cast) return true;
    if (saber.storm) return true;
    if (saber.quake) return true;
    if (saber.rain) return true;
    if (saber.grab) return true;
    if (now < saber.dashUntil) return true;
    return false;
}


function castSaber(kind, p, tp) {
    saber.last = kind;
    saber.used[kind] = nowMs();
    if (kind === "dash") saberDash(p, tp);
    else if (kind === "slam") saberSlam(p);
    else if (kind === "quake") saberQuake(p);
    else if (kind === "beam") saberBeam(p, tp);
    else if (kind === "rain") saberRain(p, tp);
    else if (kind === "storm") saberStorm(p);
    else if (kind === "grab") saberGrab(p);
    else if (kind === "tempest") saberTempest(p);
    else saberSlash(p, tp);
}


/* Phase 2 : plus rapide, plus rouge. Uniquement du visuel. */
function enrage() {
    saber.enraged = true;
    for (const k in saber.cds) saber.cds[k] = Math.min(saber.cds[k], nowMs() + 1200);
    try {
        api.setMobSetting(saber.id, "baseRunningSpeed", SABER.SPEED * 1.25);
        api.setMobSetting(saber.id, "baseWalkingSpeed", SABER.SPEED);
        api.setTargetedPlayerSettingForEveryone(saber.id, "nameTagInfo",
            nameTag(SABER.NAME + " [ENRAGED]", SABER.TITLE, "#FF4D4D"), true);
    } catch (e) {}
    const p = safePosition(saber.id);
    if (!p) return;
    boom(p, 5, { tex: TEX.effect, count: 120, colors: [rgba(255, 60, 40), rgba(60, 0, 0, 0)] });
    groundRing(p, 9, HOT_A, HOT_B);
    groundRing(p, 6, HOT_A, HOT_B, 1);
    soundAt(p, "bearRoar1", 1, 0.85, 60);
}


/* ══ LES ATTAQUES ═════════════════════════════════════════════════════════
   Chacune : une preparation dessinee, puis l'impact dans la zone dessinee. */

/* 1. CHARGE GEANTE. Un couloir de particules apparait de lui jusqu'au sol
   ou se trouve le joueur, avec une fleche qui avance. A la fin de la
   preparation il fonce DANS ce couloir, coupe tout ce qu'il traverse et
   termine par une onde de choc. On esquive sur le cote, jamais en reculant. */
function saberDash(p, tp) {
    saber.cds.dash = nowMs() + SABER.CD.dash * (saber.enraged ? 0.8 : 1);
    const dx = tp[0] - p[0], dz = tp[2] - p[2];
    const len = Math.min(SABER.DASH.LEN_MAX, Math.sqrt(dx * dx + dz * dz) + 4);
    const d = norm3([dx, 0, dz]);
    saber.cast = {
        kind: "dash",
        until: nowMs() + SABER.WARN.dash,
        from: [p[0], p[1], p[2]],
        dir: [d[0], 0, d[2]],
        len: len,
        to: [p[0] + d[0] * len, p[1], p[2] + d[2] * len],
    };
    soundAt(p, "bearRoar1", 1, 1.25, 45);
}


function drawDashCast(c, now) {
    const t = 1 - Math.max(0, c.until - now) / SABER.WARN.dash;
    groundCorridor(c.from, c.to, SABER.DASH.WIDTH, WARN_A, WARN_B);
    /* la fleche qui progresse : elle montre ou il sera dans un instant */
    const lead = [c.from[0] + (c.to[0] - c.from[0]) * Math.min(1, t * 1.15),
        c.from[1], c.from[2] + (c.to[2] - c.from[2]) * Math.min(1, t * 1.15)];
    groundMark(lead, 1.4, HOT_A, HOT_B, now / 120);
}


function startDash(c) {
    saber.dashUntil = nowMs() + SABER.DASH.MS;
    saber.dashHit = {};
    saber.dashFrom = [c.from[0], c.from[1], c.from[2]];
    setVel(saber.id, c.dir[0] * SABER.DASH_SPEED, 2.5, c.dir[2] * SABER.DASH_SPEED);
    try { api.setEntityHeading(saber.id, Math.atan2(c.dir[0], c.dir[2])); } catch (e) {}
    soundAt(c.from, "bearRoar1", 1, 1.4, 55);
}


function tickSaberDash(p) {
    const prev = saber.dashFrom;
    saber.dashFrom = [p[0], p[1], p[2]];
    const now = nowMs();
    if (now >= saber.dashUntil) return;
    if (!prev) return;

    point([p[0], p[1] + 1, p[2]], { tex: TEX.glint, count: 5, r: 0.14, size: [0.32, 0.6], life: [0.14, 0.3], colors: [WARN_A, WARN_B] });

    const ids = getAlivePlayerIds();
    for (let i = 0; i < ids.length; i++) {
        const t = ids[i];
        if (saber.dashHit[t]) continue;
        const tp = safePosition(t);
        if (!tp) continue;
        const near = segDist([tp[0], tp[1] + 0.9, tp[2]], prev, p);
        if (near.d2 > SABER.DASH.WIDTH * SABER.DASH.WIDTH) continue;
        saber.dashHit[t] = 1;
        if (damage(t, hitFor("dash"), saber.id, "Saber Dash")) {
            const dir = norm3([tp[0] - p[0], 0.5, tp[2] - p[2]]);
            impulse(t, dir[0] * 13, 6, dir[2] * 13);
        }
    }
}


/* 2. FRAPPE AU SOL. Un anneau se resserre sur le sol autour de lui : quand il
   atteint le rayon d'impact, tout ce qui est dedans est projete. */
function saberSlam(p) {
    saber.cds.slam = nowMs() + SABER.CD.slam * (saber.enraged ? 0.8 : 1);
    saber.cast = { kind: "slam", until: nowMs() + SABER.WARN.slam, at: [p[0], p[1], p[2]], radius: 9 };
    soundAt(p, "ominousBellHit", 1, 0.9, 45);
}


function drawSlamCast(c, now) {
    const t = 1 - Math.max(0, c.until - now) / SABER.WARN.slam;
    const r = c.radius * (1.6 - 0.6 * t);
    groundRing(c.at, r, WARN_A, WARN_B, now / 160);
    groundRing(c.at, c.radius, WARN_A, WARN_B, -now / 200);
    if (t > 0.6) groundRing(c.at, c.radius * 0.4, HOT_A, HOT_B, now / 90);
}


function resolveSlam(c) {
    hitArea([c.at[0], c.at[1] + 0.5, c.at[2]], c.radius, saber.id, "Saber Slam", hitFor("slam"), {
        knock: 15, lift: 7, slow: [1500, 2],
    });
    boom([c.at[0], c.at[1] + 0.5, c.at[2]], 5, { tex: TEX.crit, count: 90, colors: [rgba(255, 220, 120), rgba(90, 60, 0, 0)] });
    groundRing(c.at, c.radius, HOT_A, HOT_B);
    soundAt(c.at, "glass1", 1, 0.55, 55);
}


/* 3. ONDE DE CHOC. Un anneau part de lui et grandit : il faut sauter
   par-dessus ou sortir du cercle, rester dedans est puni une fois. */
function saberQuake(p) {
    saber.cds.quake = nowMs() + SABER.CD.quake * (saber.enraged ? 0.8 : 1);
    saber.quake = { at: [p[0], p[1], p[2]], r: 1.2, hit: {} };
    soundAt(p, "ominousBellHit", 1, 0.7, 55);
}


function tickSaberQuake(p) {
    const q = saber.quake;
    if (!q) return;
    const now = nowMs();
    const stepR = SABER.QUAKE.SPEED * 0.2; // 200 ms
    q.r += stepR;
    if (q.r > SABER.QUAKE.MAX) { saber.quake = null; return; }

    groundRing(q.at, q.r, HOT_A, HOT_B, now / 100);

    const ids = getAlivePlayerIds();
    for (let i = 0; i < ids.length; i++) {
        const t = ids[i];
        if (q.hit[t]) continue;
        const tp = safePosition(t);
        if (!tp) continue;
        if (Math.abs(dist3(tp, q.at) - q.r) > SABER.QUAKE.BAND) continue;
        q.hit[t] = 1;
        if (damage(t, hitFor("quake"), saber.id, "Shockwave")) {
            const dir = norm3([tp[0] - q.at[0], 0.4, tp[2] - q.at[2]]);
            impulse(t, dir[0] * 7, 8, dir[2] * 7);
        }
    }
}


/* 4. RAYON. Une marque apparait la ou le joueur se trouve, avec un cercle qui
   se resserre : quand les deux anneaux se rejoignent, une colonne tombe.
   Bouger suffit. */
function saberBeam(p, tp) {
    saber.cds.beam = nowMs() + SABER.CD.beam * (saber.enraged ? 0.8 : 1);
    saber.cast = {
        kind: "beam",
        until: nowMs() + SABER.WARN.beam,
        at: [tp[0], tp[1], tp[2]],
        from: [p[0], p[1], p[2]],
        radius: SABER.BEAM.RADIUS,
    };
    soundAt(p, "magicAccent1", 0.85, 0.6, 55);
}


function drawBeamCast(c, now) {
    const t = 1 - Math.max(0, c.until - now) / SABER.WARN.beam;
    groundMark(c.at, c.radius, WARN_A, WARN_B, now / 140);
    groundRing(c.at, c.radius * (3.2 - 2.2 * t), WARN_A, WARN_B, -now / 120);
    groundCorridor(c.from, c.at, 0.5, rgba(255, 200, 180, 0.6), WARN_B);
    if (t > 0.75) pillar(c.at, 6, HOT_A, HOT_B);
}


function resolveBeam(c) {
    hitArea([c.at[0], c.at[1] + 0.5, c.at[2]], c.radius, saber.id, "Saber Beam", hitFor("beam"), {
        knock: 6, lift: 5,
    });
    pillar(c.at, 10, HOT_A, HOT_B);
    boom([c.at[0], c.at[1] + 0.8, c.at[2]], 3.4, { tex: TEX.crit, count: 90, colors: [rgba(255, 220, 200), rgba(150, 20, 20, 0)] });
    soundAt(c.at, "cannonFire3", 0.9, 1.05, 55);
}


/* 5. PLUIE DE LAMES. Cinq marques apparaissent autour de la position du
   joueur, puis chacune tombe a son tour. On peut sortir du cercle marque. */
function saberRain(p, tp) {
    saber.cds.rain = nowMs() + SABER.CD.rain * (saber.enraged ? 0.8 : 1);
    const marks = [{ at: [tp[0], tp[1], tp[2]], due: nowMs() + 700, done: false }];
    const n = SABER.RAIN.COUNT - 1;
    const a0 = Math.random() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * Math.PI * 2;
        const rad = 4 + Math.random() * 5;
        const spot = clearSpot([tp[0] + Math.cos(a) * rad, tp[1], tp[2] + Math.sin(a) * rad]);
        marks.push({ at: spot, due: nowMs() + 700 + (i + 1) * SABER.RAIN.STEP, done: false });
    }
    saber.rain = { marks: marks };
    soundAt(p, "magicAccent1", 0.8, 1.3, 55);
}


function tickSaberRain(p) {
    const r = saber.rain;
    if (!r) return;
    const now = nowMs();
    let left = 0;
    for (let i = 0; i < r.marks.length; i++) {
        const m = r.marks[i];
        if (m.done) continue;
        if (now >= m.due) {
            m.done = true;
            hitArea([m.at[0], m.at[1] + 0.5, m.at[2]], SABER.RAIN.RADIUS, saber.id, "Blade Rain", hitFor("rain"), {
                knock: 5, lift: 6,
            });
            pillar(m.at, 9, HOT_A, HOT_B);
            groundRing(m.at, SABER.RAIN.RADIUS, HOT_A, HOT_B);
            soundAt(m.at, "glass1", 0.9, 0.8, 50);
            continue;
        }
        left++;
        /* marque legere : cinq marques dessinees en meme temps, on ne peut pas
           se permettre deux anneaux + une croix par marque a chaque passage */
        groundRing(m.at, SABER.RAIN.RADIUS, WARN_A, WARN_B, now / 130);
        point([m.at[0], m.at[1] + 0.12, m.at[2]], { tex: TEX.crit, count: 3, r: 0.13, size: [0.26, 0.46], life: [0.16, 0.34], colors: [WARN_A, WARN_B] });
    }
    if (left === 0) saber.rain = null;
}


/* 6. TOURBILLON. Deux anneaux de lames tournent autour de lui et blessent par
   vagues. On ne reste pas colle. */
function saberStorm(p) {
    saber.cds.storm = nowMs() + SABER.CD.storm * (saber.enraged ? 0.8 : 1);
    saber.storm = { until: nowMs() + SABER.STORM.MS, next: nowMs() };
    soundAt(p, "bigDrumSwish1", 1, 0.9, 50);
}


function tickSaberStorm(p) {
    const st = saber.storm;
    if (!st) return;
    const now = nowMs();
    if (now >= st.until) { saber.storm = null; return; }

    groundRing(p, SABER.STORM.RADIUS, WARN_A, WARN_B, now / 120);
    ring([p[0], p[1] + 1.2, p[2]], SABER.STORM.RADIUS * 0.65, 14, {
        tex: TEX.glint, r: 0.1, size: [0.26, 0.46], life: [0.16, 0.32],
        colors: [rgba(255, 255, 255), rgba(200, 120, 90, 0)],
    }, -now / 90);

    if (now < st.next) return;
    st.next = now + SABER.STORM.TICK;
    hitArea([p[0], p[1] + 0.6, p[2]], SABER.STORM.RADIUS, saber.id, "Blade Storm", hitFor("storm"), {});
}


/* 7. CHAINE. Un fil rouge part de sa main vers le joueur, en direct : s'il
   est encore a portee au bout du delai, il l'aspire et frappe. Sortir des
   12 blocs pendant la preparation annule. */
const GRAB_RANGE = 12;


function saberGrab(p) {
    saber.cds.grab = nowMs() + SABER.CD.grab * (saber.enraged ? 0.8 : 1);
    saber.grab = { until: nowMs() + SABER.WARN.grab, target: saber.fighter, from: [p[0], p[1], p[2]] };
    soundAt(p, "magicAccent1", 1, 0.8, 50);
}


function tickSaberGrab(p) {
    const g = saber.grab;
    if (!g) return;
    const now = nowMs();
    const victim = g.target;
    const tp = victim ? safePosition(victim) : null;

    if (tp) {
        const a = [p[0], p[1] + 1.4, p[2]];
        const b = [tp[0], tp[1] + 1.2, tp[2]];
        for (let i = 1; i <= 12; i++) {
            const t = i / 13;
            point([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], {
                tex: TEX.square, count: 1, r: 0.08, size: [0.18, 0.3], life: [0.08, 0.18],
                colors: [rgba(255, 90, 70), rgba(90, 0, 0, 0)],
            });
        }
        groundRing([tp[0], tp[1], tp[2]], 2, HOT_A, HOT_B, now / 100);
    }
    if (now < g.until) return;

    saber.grab = null;
    if (!victim || !tp) return;
    if (dist3(tp, p) > GRAB_RANGE) return;   // il s'est echappe : rien ne se passe
    const dir = norm3([p[0] - tp[0], 0.35, p[2] - tp[2]]);
    try { setVel(victim, dir[0] * 18, 5, dir[2] * 18); } catch (e) {}
    if (damage(victim, hitFor("grab"), saber.id, "Saber Chain")) {
        eff(victim, "Weakness", 3000, { inbuiltLevel: 2 });
    }
    boom([tp[0], tp[1] + 1, tp[2]], 2.5, { tex: TEX.crit, count: 50, colors: [rgba(255, 90, 70), rgba(90, 0, 0, 0)] });
}


/* 8. ENTaille double : deux ondes qui ne partent pas du meme point. */
function saberSlash(p, tp) {
    saber.cds.slash = nowMs() + SABER.CD.slash * (saber.enraged ? 0.75 : 1);
    const dir = norm3([tp[0] - p[0], 0.05, tp[2] - p[2]]);
    const side = [-dir[2], 0, dir[0]];
    spawnWave(saber.waves, [p[0] + side[0] * 2.4, p[1] + 1, p[2] + side[2] * 2.4], dir, 32, 1.6, hitFor("slash"), "Air Slash");
    spawnWave(saber.waves, [p[0] - side[0] * 2.4, p[1] + 1, p[2] - side[2] * 2.4], dir, 32, 1.6, hitFor("slash"), "Air Slash");
    soundAt(p, "magicAccent1", 0.9, 1.2, 45);
}


/* 9. TEMPETE DE LAMES : six ondes en etoile, phase 2 seulement. */
function saberTempest(p) {
    saber.cds.tempest = nowMs() + SABER.CD.tempest;
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        spawnWave(saber.waves, [p[0], p[1] + 0.6, p[2]], [Math.cos(a), 0, Math.sin(a)],
            22, 1.3, hitFor("tempest"), "Blade Tempest");
    }
    groundRing(p, 4, HOT_A, HOT_B);
    soundAt(p, "ominousBellHit", 1, 0.5, 55);
}


/* Le chef d'orchestre de la preparation : dessine, puis frappe. */
function tickSaberCast(p) {
    const c = saber.cast;
    if (!c) return;
    const now = nowMs();
    if (c.kind === "dash") {
        /* Le couloir suit le boss : il reste colle a lui pendant qu'il avance,
           et la charge part donc de la ou il est vraiment. */
        c.from = [p[0], p[1], p[2]];
        c.to = [p[0] + c.dir[0] * c.len, p[1], p[2] + c.dir[2] * c.len];
        drawDashCast(c, now);
    } else if (c.kind === "slam") {
        c.at = [p[0], p[1], p[2]];
        drawSlamCast(c, now);
    } else if (c.kind === "beam") {
        drawBeamCast(c, now);
    }
    if (now < c.until) return;

    saber.cast = null;
    if (c.kind === "dash") startDash(c);
    else if (c.kind === "slam") resolveSlam(c);
    else if (c.kind === "beam") resolveBeam(c);
}


/* ── 11. MORTS, DESPAWNS, JOIN / LEAVE ─────────────────────────────────── */

function saberFallen() {
    const fighter = saber ? saber.fighter : null;
    const id = saber ? saber.id : null;
    const p = saber ? safePosition(saber.id) : null;
    stopSaber();
    despawnIfAlive(id);
    if (p) {
        boom(p, 4, { tex: TEX.soul, colors: [rgba(232, 180, 160), rgba(60, 30, 30, 0)] });
        soundAt(p, "exp_levelup", 1, 0.8, 50);
    }
    if (fighter) {
        tell(fighter, [
            { icon: "fa-solid fa-trophy", style: { color: C.MONEY } },
            { str: " SABER EXPERT defeated. ", style: { color: C.MONEY, fontWeight: "bold" } },
            { str: "The Saber Quest is complete.", style: { color: C.SUCCESS } },
        ]);
        /* LA QUETE EST FINIE : etape ET boutons repartent a zero. Rien n'est
           garde en memoire pour ce joueur, donc rien a nettoyer plus tard. */
        clearSecretArrow(fighter);
        clearStructArrow(fighter, "door");
        clearStructArrow(fighter, "curtain");
        resetQuest(fighter);
        /* Retour dans la salle de Shanks, comme Garp renvoie au spawn. */
        try {
            api.setPosition(fighter, WALL_BEHIND[0], WALL_BEHIND[1], WALL_BEHIND[2]);
        } catch (e) {}
    }
}


export function endSaberFight(reason) {
    const fighter = saber ? saber.fighter : null;
    const id = saber ? saber.id : null;
    stopSaber();
    despawnIfAlive(id);
    if (fighter && reason) tell(fighter, line("fa-solid fa-circle-info", C.INFO, reason));
}


export function stopSaber() {
    if (saberTimer) { saberTimer.stop(); saberTimer = null; }
    saber = null;
}

/* Etat du duel, lu par l'exterieur : qui se bat, quel mob, et la branche de
   mort appelee par onPlayerKilledMob. Rien d'autre ne sort de ce fichier. */
export function saberMobId() {
    return saber ? saber.id : null;
}

export function saberFighter() {
    return saber ? saber.fighter : null;
}

export function killSaber(mobId) {
    if (!mobId || !saber || mobId !== saber.id) return false;
    saberFallen();
    return true;
}
