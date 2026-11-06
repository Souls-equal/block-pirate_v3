// gameplay/saber/leader.js
/* leader.js — le Mob Leader (niveau 200, mob Glass Bro)

   Lance par un Code Block : spawnMobLeader(x, y, z[, playerId]). Il choisit
   sa cible tout seul (le joueur le plus proche dans 40 blocs) et il attaque
   vraiment : ruee, volee, frappe au sol et Gold Ring.
   
   Il ne peut pas etre tue d'un seul coup (paliers dans utils/bossGate.js) et
   il lache le Gold Grit de la quete, une seule fois, a l'etape chasse.
 */

import { C } from "../../core/theme";
import { TEX, rgba, ring, at as soundAt } from "../../utils/fx";
import { damage, hitArea, impulse, setVel } from "../../utils/combat";
import { setInterval as every, nowMs } from "../../utils/timer";
import { getAlivePlayerIds, safePosition } from "../../utils/lifeform";
import { armBossGate } from "../../utils/bossGate";
import { markBossMob } from "../loot";
import { ITEM_GOLD, S } from "./config";
import { stepOf, setStep } from "./state";
import { advanceWaves, alive, clearSpot, despawnIfAlive, dist3, line, nameTag, norm3, spawnWave, tell } from "./kit";


/* ── 8. LE MOB LEADER (niveau 200) ─────────────────────────────────────── */

const LEADER = {
    LEVEL: 200,
    MOB: "Glass Bro",
    NAME: "MOB LEADER",
    TITLE: "Level 200",
    SCALE: 1.6,
    SPEED: 5,
    CD: { rush: 7000, volley: 5000, shake: 6000, ring: 9000 },
    /* Portee a laquelle il prend quelqu'un en chasse tout seul (son
       hostilityRadius est du meme ordre). */
    AGGRO: 40,
    /* Ses capacites sont a l'echelle de son niveau (multiples d'un coup de
       corps a corps), pas des petits chiffres fixes : une capacite qui fait
       90 quand le poing en fait 787 ne se sent pas. */
    HIT: { rush: 0.55, volley: 0.45, shake: 0.7 },
    /* LE CERCLE D'OR : un anneau de particules se dessine autour du mob (il
       reste visible pendant toute la preparation), puis il eclate. Prendre
       l'eclat quand on est dedans coute UN coup de corps a corps du mob en
       plus des degats normaux : rester colle a un mob de niveau 200 devient
       vraiment puni. Rayon et delais se retouchent ici. */
    RING: { RADIUS: 6.5, WARN: 1400, SCALE: 1 },
};


/* Memes formules que gameplay/spawning.js (mobBaseHp / mobBaseDmg), pour que
   le Mob Leader soit REELLEMENT un mob de niveau 200 et pas un colosse
   arbitraire. Les deux valeurs se retouchent ici si besoin. */
function leaderHp() { return Math.round(20 + Math.pow(LEADER.LEVEL, 1.6) * 8); }

function leaderDmg() { return Math.round(3 + Math.pow(LEADER.LEVEL, 1.3) * 0.8); }

function leaderHit(key) { return Math.round(leaderDmg() * (LEADER.HIT[key] || 0.5)); }


let leader = null; // { id, handle, cds, rushUntil, rushHit, waves }


let leaderTimer = null;


export function stopLeader() {
    if (leaderTimer) { leaderTimer.stop(); leaderTimer = null; }
    leader = null;
}


function thinkLeader() {
    if (!leader) { stopLeader(); return; }
    if (!alive(leader.id)) { stopLeader(); return; }
    const p = safePosition(leader.id);
    if (!p) { despawnIfAlive(leader.id); stopLeader(); return; }

    advanceWaves(leader.waves, leader.id);
    advanceLeaderRing(leader.id, p);
    tickLeaderShake(p);

    if (nowMs() < leader.rushUntil) {
        const ids = getAlivePlayerIds();
        for (let i = 0; i < ids.length; i++) {
            const t = ids[i];
            if (leader.rushHit[t]) continue;
            const tp = safePosition(t);
            if (!tp || dist3(tp, p) > 3.2) continue;
            leader.rushHit[t] = 1;
            damage(t, leaderHit("rush"), leader.id, "Mob Leader");
            const dir = norm3([tp[0] - p[0], 0.4, tp[2] - p[2]]);
            impulse(t, dir[0] * 9, 4, dir[2] * 9);
        }
    }

    /* CIBLE : on garde la cible courante si elle est vivante et encore a
       portee, sinon on prend le joueur le plus proche. C'est ce qui fait la
       difference entre "un mob qui marche" et "un boss qui attaque". */
    let target = leader.aiTarget && alive(leader.aiTarget) ? leader.aiTarget : null;
    if (target) {
        const cp = safePosition(target);
        if (!cp || dist3(cp, p) > LEADER.AGGRO) target = null;
    }
    if (!target) target = nearestPlayerTo(p, LEADER.AGGRO);
    if (!target) return;
    leader.aiTarget = target;
    const tp = safePosition(target);
    if (!tp) return;
    const d = dist3(p, tp);
    const now = nowMs();

    if (now >= leader.cds.ring && d < 9) { leaderRing(p); return; }
    if (now >= leader.cds.shake && d < 7) { leaderShake(p); return; }
    if (now >= leader.cds.volley && d > 5 && d < 26) { leaderVolley(p, tp); return; }
    if (now >= leader.cds.rush && d > 4 && d < 20) { leaderRush(p, tp); return; }
    try { api.setMobAiState(leader.id, "chasing", { targetId: target }); } catch (e) {}
}


function leaderRush(p, tp) {
    leader.cds.rush = nowMs() + LEADER.CD.rush;
    leader.rushUntil = nowMs() + 700;
    leader.rushHit = {};
    const dir = norm3([tp[0] - p[0], 0, tp[2] - p[2]]);
    setVel(leader.id, dir[0] * 16, 3, dir[2] * 16);
    soundAt(p, "bearRoar1", 1, 1.3, 35);
}


/* La frappe au sol : meme principe que le boss, un anneau se resserre sur le
   sol pendant 0,6 s, puis tout ce qui est dedans est projete et ralenti. */
function leaderShake(p) {
    leader.cds.shake = nowMs() + LEADER.CD.shake;
    leader.shake = { until: nowMs() + 600, at: [p[0], p[1], p[2]], radius: 6 };
    soundAt(p, "ominousBellHit", 1, 0.7, 35);
}


function tickLeaderShake(p) {
    const sh = leader ? leader.shake : null;
    if (!sh) return;
    const now = nowMs();
    const left = Math.max(0, sh.until - now) / 600;
    ring([sh.at[0], sh.at[1] + 0.12, sh.at[2]], sh.radius * (0.4 + 0.6 * left), 16, {
        tex: TEX.crit, r: 0.11, size: [0.24, 0.42], life: [0.16, 0.34],
        colors: [rgba(255, 210, 80), rgba(120, 60, 0, 0)],
    }, now / 130);
    if (now < sh.until) return;
    leader.shake = null;
    hitArea([sh.at[0], sh.at[1] + 0.4, sh.at[2]], sh.radius, leader.id, "Gold Slam", leaderHit("shake"), {
        knock: 10, lift: 5, slow: [1200, 2],
    });
    boom([sh.at[0], sh.at[1], sh.at[2]], 3.5, { tex: TEX.crit, count: 60, colors: [rgba(255, 200, 60), rgba(90, 60, 0, 0)] });
    soundAt(sh.at, "glass1", 1, 0.7, 40);
}


/* Le cercle : preparation visible, puis eclat. Les degats sont exactement
   ceux d'un coup de corps a corps du mob (leaderDmg()), donc "un coup de
   plus", pas une deuxieme attaque inventee. */
function leaderRing(p) {
    leader.cds.ring = nowMs() + LEADER.CD.ring;
    leader.ring = { until: nowMs() + LEADER.RING.WARN, hit: {} };
    soundAt(p, "ominousBellHit", 1, 1.15, 35);
}


function advanceLeaderRing(id, p) {
    const r = leader ? leader.ring : null;
    if (!r) return;
    const R = LEADER.RING.RADIUS;
    const now = nowMs();

    /* L'anneau se dessine a chaque passage (200 ms) : il tourne, il monte
       legerement, il est impossible a ne pas voir. */
    ring([p[0], p[1] + 0.15, p[2]], R, 20, {
        tex: TEX.crit,
        r: 0.12,
        size: [0.26, 0.44],
        life: [0.22, 0.45],
        colors: [rgba(255, 210, 80), rgba(150, 90, 0, 0)],
    }, now / 240);

    if (now < r.until) return;

    const ids = getAlivePlayerIds();
    let touched = 0;
    for (let i = 0; i < ids.length; i++) {
        const t = ids[i];
        if (r.hit[t]) continue;
        const tp = safePosition(t);
        if (!tp || dist3(tp, p) > R) continue;
        r.hit[t] = 1;
        touched++;
        if (damage(t, Math.round(leaderDmg() * LEADER.RING.SCALE), id, "Gold Ring")) {
            const dir = norm3([tp[0] - p[0], 0.6, tp[2] - p[2]]);
            impulse(t, dir[0] * 8, 5, dir[2] * 8);
        }
    }
    boom([p[0], p[1] + 0.2, p[2]], R * 0.8, {
        tex: TEX.crit,
        count: touched ? 70 : 40,
        colors: [rgba(255, 210, 80), rgba(120, 60, 0, 0)],
    });
    soundAt(p, "glass1", 1, 0.65, 40);
    leader.ring = null;
}


/* Le joueur le plus proche dans un rayon. Indispensable : un Mob Leader lance
   par un Code Block sans joueur (le cas de Secret Island) n'avait AUCUNE
   cible, donc il ne declenchait jamais la moindre attaque et se battait comme
   un mob ordinaire. */
function nearestPlayerTo(p, radius) {
    const ids = getAlivePlayerIds();
    let best = null, bestD = radius * radius;
    for (let i = 0; i < ids.length; i++) {
        const tp = safePosition(ids[i]);
        if (!tp) continue;
        const dx = tp[0] - p[0], dy = tp[1] - p[1], dz = tp[2] - p[2];
        const d2 = dx * dx + dy * dy * 4 + dz * dz;
        if (d2 < bestD) { bestD = d2; best = ids[i]; }
    }
    return best;
}


function leaderVolley(p, tp) {
    leader.cds.volley = nowMs() + LEADER.CD.volley;
    const dir = norm3([tp[0] - p[0], 0.15, tp[2] - p[2]]);
    spawnWave(leader.waves, [p[0], p[1] + 1.1, p[2]], dir, 26, 1.2, leaderHit("volley"), "Gold Shot");
    soundAt(p, "cannonFire3", 0.8, 1.4, 35);
}


/* Lance par un Code Block :
       spawnMobLeader(x, y, z)              -> a l'endroit voulu
       spawnMobLeader(x, y, z, playerId)    -> et il vise ce joueur
   Retourne l'id du mob, ou null. */
export function spawnMobLeader(x, y, z, playerId) {
    const px = Number(x), py = Number(y), pz = Number(z);
    if (!isFinite(px) || !isFinite(py) || !isFinite(pz)) return null;
    if (leader && alive(leader.id)) {
        if (playerId) tell(playerId, line("fa-solid fa-circle-info", C.INFO, "The Mob Leader is already on the loose."));
        return null;
    }

    const spot = clearSpot([px, py, pz]);
    let id = null;
    try {
        id = api.attemptSpawnMob(LEADER.MOB, spot[0], spot[1], spot[2], {
            name: LEADER.NAME,
            playSoundOnSpawn: true,
        });
    } catch (e) { id = null; }
    if (!id) {
        if (playerId) tell(playerId, line("fa-solid fa-xmark", C.DANGER, "The Mob Leader could not be summoned."));
        return null;
    }
    /* Boss de rang 3 pour le butin : le mob est despawn avant le credit de son
       kill, donc son nom ne sera plus lisible a ce moment-la. */
    markBossMob(id, LEADER.NAME);
    const hp = leaderHp();
    /* Pas de one shot : paliers a 1/2, 1/3, 1/4 et 1/5 de sa vie. */
    armBossGate(id, hp);
    try {
        api.setMobSetting(id, "maxHealth", hp);
        api.setHealth(id, hp, undefined, true);
        api.setMobSetting(id, "attackDamage", leaderDmg());
        api.setMobSetting(id, "hostilityRadius", 40);
        api.setMobSetting(id, "chaseRadius", 40);
        api.setMobSetting(id, "territoryRadius", 40);
        api.setMobSetting(id, "onDeathItemDrops", []);
        api.setMobSetting(id, "baseRunningSpeed", LEADER.SPEED);
        api.setMobSetting(id, "baseWalkingSpeed", LEADER.SPEED * 0.75);
        api.setLifeformScale(id, LEADER.SCALE);
        api.setTargetedPlayerSettingForEveryone(id, "nameTagInfo",
            nameTag(LEADER.NAME, LEADER.TITLE, "#FFD166"), true);
    } catch (e) {}
    /* Il se choisit une cible tout seul des le spawn : sans joueur en
       parametre (Code Block de Secret Island), il restait sans cible et
       n'attaquait donc jamais avec ses capacites. */
    const firstTarget = playerId || nearestPlayerTo(spot, LEADER.AGGRO);
    if (firstTarget) {
        try { api.setMobAiState(id, "chasing", { targetId: firstTarget }); } catch (e) {}
    }
    soundAt(spot, "ominousBellHit", 1, 0.8, 40);

    leader = {
        id: id,
        cds: { rush: 0, volley: 0, shake: 0, ring: 0 },
        rushUntil: 0,
        rushHit: {},
        waves: [],
        ring: null,
        shake: null,
        aiTarget: firstTarget || null,
    };
    if (!leaderTimer) leaderTimer = every(thinkLeader, 4);
    return id;
}

/* Id du Mob Leader en course, ou null : c'est tout ce dont l'exterieur a
   besoin (despawn, nettoyage de fin de monde). */
export function leaderMobId() {
    return leader ? leader.id : null;
}

/* BRANCHE DE MORT : appelee par onPlayerKilledMob (gameplay/saber/index.js).
   Renvoie true si le mob etait bien le Mob Leader. */
export function killLeader(playerId, mobId) {
    if (!mobId || !leader || mobId !== leader.id) return false;

    const p = safePosition(mobId);
    stopLeader();
    despawnIfAlive(mobId);

    /* L'OR NE TOMBE QU'UNE FOIS, a l'etape chasse. Un second Mob Leader lance
       par le Code Block et tue a l'etape "or" ne lache donc plus rien : le
       Gold Grit ne peut pas etre lache, un doublon resterait bloque dans
       l'inventaire pour toujours. S'il a perdu l'or, le Rich Man remet l'etape
       a la chasse (voir world.js) et le prochain kill le rend. */
    const st = playerId ? stepOf(playerId) : S.NONE;
    const wantGold = st === S.HUNT;
    if (p && wantGold) {
        try { api.createItemDrop(p[0], p[1] + 0.5, p[2], ITEM_GOLD, 1, false); } catch (e) {}
        soundAt(p, "coin", 1, 0.9, 40);
    }
    if (playerId) {
        if (st === S.HUNT) setStep(playerId, S.GOLD);
        tell(playerId, wantGold
            ? [
                { icon: "fa-solid fa-coins", style: { color: C.MONEY } },
                { str: " The Mob Leader drops ", style: { color: C.INFO } },
                { str: ITEM_GOLD, style: { color: C.MONEY, fontWeight: "bold" } },
                { str: ". Take it back to the Rich Man.", style: { color: C.INFO } },
            ]
            : [
                { icon: "fa-solid fa-skull", style: { color: C.SUCCESS } },
                { str: " The Mob Leader is down. ", style: { color: C.INFO } },
                { str: "Nothing left to take from him.", style: { color: "#94A3B8" } },
            ]);
    }
    return true;
}
