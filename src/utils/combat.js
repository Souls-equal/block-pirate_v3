//utils/combat.js
import { hakiBoost } from "./haki";
import { getDamageMultiplierForPoints, getStatLevel } from "../gameplay/stats";
import { dist2, distH2, segDist } from "./fx";
import { creditKill, noteMobSeen, recordDamager } from "./killAttribution";
import { noteUncreditedKill } from "./killfeed";
import {
    chest,
    eye,
    facing,
    getAliveMobIds,
    getAlivePlayerIds,
    isAliveId,
    isAliveIdFresh,
    isMobAlive,
    isMobEntityType,
    isNpcEntity,
    isOnlinePlayer,
    isPlayerAlive,
    isStillAlive,
    posOf,
    safeEntityName,
    safeEntityType,
    safeHealth,
    safePosition,
    targetBlock,
} from "./lifeform";
import { setTimeout, nowMs, getActor, withActor } from "./timer";
import { C, say } from "../core/theme";
import { isCrowdControlImmune } from "../core/ranks";
export const summonOwner = {};
/* Garde d'equipe (marines entre eux, meme crew). Posee par index.js avec
   canDamage() de core/team : l'import direct creerait un cycle
   team -> customItem -> combat. */
let teamGuard = null;
export function setTeamGuard(fn) { teamGuard = fn; }
/* Garde de zone (lobby) : aucune capacite ne blesse dans les zones neutres.
   Posee par index.js avec idInSafeZone() de gameplay/variations. */
let zoneGuard = null;
export function setZoneGuard(fn) { zoneGuard = fn; }
function blockedByZone(caster, target) {
    if (!zoneGuard) return false;
    try {
        return zoneGuard(caster) || zoneGuard(target);
    } catch (e) {
        return false;
    }
}
function blockedByTeam(caster, target) {
    if (!teamGuard) return false;
    try { return teamGuard(caster, target) === "preventDamage"; } catch (e) { return false; }
}
// expose for killAttribution without circular import
try { globalThis.__combatSummonOwner = summonOwner; } catch (e) {}

export function claimSummon(mobId, ownerId) { if (mobId && ownerId) { summonOwner[mobId] = ownerId; try { globalThis.__combatSummonOwner = summonOwner; } catch (e) {} } }
export function freeSummon(mobId) { if (mobId) { delete summonOwner[mobId]; try { globalThis.__combatSummonOwner = summonOwner; } catch (e) {} } }

export function getEffectiveKiller(id) {
    if (!id) return id;
    let cur = id;
    let seen = {};
    // follow summon chain (golem -> player, etc)
    for (let i = 0; i < 5; i++) {
        if (seen[cur]) break;
        seen[cur] = 1;
        const owner = summonOwner[cur];
        if (owner) { cur = owner; continue; }
        // fallback: ownerDbId set by Creation fruit
        try {
            const db = api.getMobSetting(cur, "ownerDbId", false);
            if (db) {
                // find player with this db id
                const players = getAlivePlayerIds();
                for (let j = 0; j < players.length; j++) {
                    try {
                        if (api.getPlayerDbId(players[j]) === db) { cur = players[j]; break; }
                    } catch (e) {}
                }
                // if we resolved via db, stop (avoid loop)
                if (cur !== id && summonOwner[cur] === undefined) {
                    // check if new cur is also a summon (nested)
                    continue;
                }
            }
        } catch (e) {}
        break;
    }
    return cur;
}

const HARD_CAP = 1e6;

/* MULTIPLICATEUR DE FORCE (stat "d") */
export function statLevel(id, key) {
    if (!id) return 0;
    try { const v = getStatLevel(id, key); if (typeof v === "number" && isFinite(v)) return v; }
    catch (e) {}
    return 0;
}

export function strengthMult(id) {
    try { return getDamageMultiplierForPoints(statLevel(id, "d")) || 1; }
    catch (e) { return 1; }
}

/* MARQUE DU PRÉDATEUR (+30 % de dégâts) */
export const marks = {};

export function markUntil(targetId, ms) {
    try { marks[targetId] = api.now() + ms; } catch (e) { marks[targetId] = Date.now() + ms; }
}
export function unmark(targetId) { delete marks[targetId]; }

/* SANTÉ */
function pushHealth(id, amount, who, broadcast) {
    try {
        if (api.applyHealthChange(id, amount, who, broadcast)) return true;
    } catch (e) {}
    if (who && typeof who === "object" && who.lifeformId && who.withItem !== undefined) {
        try {
            if (api.applyHealthChange(id, amount, { lifeformId: who.lifeformId }, broadcast)) return true;
        } catch (e2) {}
    }
    return false;
}

export function heal(id, amount) {
    const a = Math.floor(amount);
    if (a < 1 || !isAliveId(id)) return false;
    return pushHealth(id, a, undefined, false);
}

/* ─────────────────────────────────────────────────────────────
   DÉGÂTS — point d'entrée unique des fruits
   Fixes:
   - noteMobSeen AVANT le check isAliveId pour garantir mobData
   - isAliveIdFresh + safeHealth fallback pour ne pas rater un mob
     dont le cache est stale
   - résolution du propriétaire pour les invocations (Creation golem)
   - recordDamager AVANT applyHealthChange (déjà présent)
   - détection de mort robuste même si hpAfter null
   ───────────────────────────────────────────────────────────── */
/* ---------- PROTECTION PVP APRES RESPAWN ---------- */
/* Un joueur tue -> sa victime retient le tueur. Au respawn, la victime est
   protegee pendant 5 minutes CONTRE CE JOUEUR PRECIS : il ne peut plus lui
   faire de degats (corps a corps comme capacites). Des que la victime attaque
   son tueur, la protection tombe. Tout reste en memoire de session. */
const PVP_PROTECT_MS = 5 * 60 * 1000;
/* Une victime doit se faire tuer puis respawner : au dela de 2 min, on oublie. */
const PVP_PENDING_MS = 2 * 60 * 1000;
/* Anti-spam du message "il est protege" (par paire tueur/victime). */
const PVP_NOTICE_MS = 4000;
/* Le respawn est automatique dans ce monde (autoRespawn + secsToRespawn 0),
   donc onRespawnRequest n'est pas forcement appele : on surveille le retour
   a la vie frame par frame. Delai minimal pour laisser le moteur tuer. */
const PVP_ARM_DELAY_MS = 250;
/* Si la vie reste illisible (entite absente), on accorde quand meme. */
const PVP_ARM_MAX_MS = 3000;

const PVP_PENDING = {}; /* victimId -> { killerId, at } */
const PVP_SHIELD = {};  /* victimId -> { killerId: expiresAt } */
const PVP_NOTICE = {};  /* "killer|victim" -> dernier message */

function pvpSay(playerId, text, color) {
    try {
        say(playerId, [ { str: text, style: { color: color } } ]);
    } catch (e) {}
}

function pvpName(id) {
    const n = safeEntityName(id);
    return n && n !== "Unknown" ? n : String(id);
}

/* Vie du joueur, ou null si elle est illisible (entite absente). */
function pvpHealth(id) {
    try {
        const h = api.getHealth(id);
        return typeof h === "number" && Number.isFinite(h) ? h : null;
    } catch (e) {
        return null;
    }
}

/* Mort par un joueur : la victime se souviendra du tueur pour son respawn. */
export function notePvPDeath(victimId, killerId) {
    if (!victimId || !killerId || victimId === killerId) return false;
    const now = Date.now();
    const prev = PVP_PENDING[victimId];
    PVP_PENDING[victimId] = { killerId: killerId, at: now };
    /* Deux callbacks de mort peuvent arriver pour le meme kill :
       on ne repete pas le message. */
    if (!prev || prev.killerId !== killerId || now - prev.at > 2000) {
        pvpSay(victimId, "[PvP] Killed by " + pvpName(killerId) + ". 5 min of protection against them once you respawn (cancelled if you attack them).", C.DANGER);
    }
    return true;
}

/* Appele au respawn : accorde 5 min de protection contre le tueur. */
export function grantPvPShield(victimId) {
    if (!victimId) return 0;
    const pending = PVP_PENDING[victimId];
    if (!pending) return 0;
    delete PVP_PENDING[victimId];
    if (!pending.killerId || pending.killerId === victimId) return 0;
    if (Date.now() - pending.at > PVP_PENDING_MS) return 0;
    let shields = PVP_SHIELD[victimId];
    if (!shields) shields = PVP_SHIELD[victimId] = {};
    shields[pending.killerId] = Date.now() + PVP_PROTECT_MS;
    pvpSay(victimId, "[PvP] Protected from " + pvpName(pending.killerId) + " for 5 minutes. Attacking them cancels it.", C.SUCCESS);
    return PVP_PROTECT_MS;
}

export function isPvPShielded(victimId, attackerId) {
    if (!victimId || !attackerId) return false;
    const shields = PVP_SHIELD[victimId];
    if (!shields) return false;
    const until = shields[attackerId];
    if (!until) return false;
    if (Date.now() >= until) {
        delete shields[attackerId];
        return false;
    }
    return true;
}

/* La victime protegee attaque son tueur : la protection saute. */
export function dropPvPShield(attackerId, victimId) {
    if (!attackerId || !victimId) return false;
    const shields = PVP_SHIELD[attackerId];
    if (!shields) return false;
    if (!(victimId in shields)) return false;
    delete shields[victimId];
    pvpSay(attackerId, "[PvP] Protection against " + pvpName(victimId) + " cancelled (you attacked them).", C.INFO);
    return true;
}

/* Point d'entree unique : renvoie true si le coup doit etre ANNULE.
   Garde aussi la regle "si je l'attaque, je perds ma protection". */
export function pvpGuard(attackerId, victimId) {
    if (!attackerId || !victimId || attackerId === victimId) return false;
    if (isPvPShielded(victimId, attackerId)) {
        const now = Date.now();
        const key = attackerId + "|" + victimId;
        if (!PVP_NOTICE[key] || now - PVP_NOTICE[key] > PVP_NOTICE_MS) {
            PVP_NOTICE[key] = now;
            const left = Math.ceil((PVP_SHIELD[victimId][attackerId] - now) / 1000);
            pvpSay(attackerId, "[PvP] " + pvpName(victimId) + " is protected from you (" + left + "s left).", C.DANGER);
        }
        return true;
    }
    dropPvPShield(attackerId, victimId);
    return false;
}

/* Deconnexion : on oublie tout pour ce joueur. */
export function clearPvPFor(playerId) {
    if (!playerId) return;
    delete PVP_PENDING[playerId];
    delete PVP_SHIELD[playerId];
    const prefix = playerId + "|";
    for (const key in PVP_NOTICE) {
        if (key.indexOf(prefix) === 0 || key.indexOf("|" + playerId) !== -1) delete PVP_NOTICE[key];
    }
}

/* Appele a chaque tick : purge les protections terminees (et previent le
   joueur), ainsi que les morts trop anciennes jamais suivies d'un respawn. */
export function tickPvPShield() {
    const now = Date.now();
    for (const victimId in PVP_SHIELD) {
        const shields = PVP_SHIELD[victimId];
        let left = 0;
        for (const killerId in shields) {
            if (now < shields[killerId]) {
                left++;
                continue;
            }
            delete shields[killerId];
            if (isAliveId(victimId)) {
                pvpSay(victimId, "[PvP] Protection against " + pvpName(killerId) + " has expired.", C.INFO);
            }
        }
        if (!left) delete PVP_SHIELD[victimId];
    }
    for (const victimId in PVP_PENDING) {
        const pending = PVP_PENDING[victimId];
        const elapsed = now - pending.at;
        if (elapsed > PVP_PENDING_MS) {
            delete PVP_PENDING[victimId];
            continue;
        }
        /* Respawn automatique : on accorde des que le joueur est de nouveau
           en vie (ou si sa vie reste illisible apres le delai de secours). */
        if (elapsed < PVP_ARM_DELAY_MS) continue;
        const hp = pvpHealth(victimId);
        if (hp !== null && hp <= 0) continue;
        if (hp === null && elapsed < PVP_ARM_MAX_MS) continue;
        grantPvPShield(victimId);
    }
}

export function damage(target, rawAmount, caster, itemName) {
    try {
        if (!target || !caster || target === caster) return false;
        /* Zone neutre du lobby : ni le lanceur ni la cible ne peuvent etre
           touches (capacites, invocations, degats de zone...). */
        if (blockedByZone(caster, target)) return false;

        // Toujours assurer mobData même si le cache alive est en retard.
        // Note: api.getEntityType(id) renvoie "Draugr Zombie", "Gorilla", etc. (jamais "MOB").
        const tTypeEarly = safeEntityType(target);
        if (tTypeEarly === "NPC") return false;
        const isMobEarly = isMobAlive(target) || isMobEntityType(tTypeEarly);
        if (isMobEarly) {
            try { noteMobSeen(target); } catch (e) {}
        }

        // Check alive plus tolérant: cache frais OU vie lisible
        let alive = false;
        try { alive = isAliveId(target) || isAliveIdFresh(target); } catch (e) { alive = false; }
        if (!alive) {
            const h = safeHealth(target);
            if (h === null || h <= 0) {
                // si on ne peut même pas lire la vie, on tente quand même si c'est un mob
                // (le cache peut être vide juste après un spawn)
                if (!isMobEarly) return false;
            }
        }

        const type = safeEntityType(target);
        if (type === "NPC") return false;
        if (type === null && !isMobEarly) {
            // si on n'arrive pas à lire le type mais qu'on a une vie, on continue
            const h = safeHealth(target);
            if (h === null) return false;
        }
        const isMob = isMobEarly || isMobEntityType(type);

        // Résout le vrai tueur (golem -> owner)
        let effectiveCaster = getEffectiveKiller(caster) || caster;

        // si le caster effectif est invalide, on garde l'original pour ne pas perdre le coup
        if (!isAliveId(effectiveCaster) && !isAliveId(caster)) {
            if (isAliveId(caster)) effectiveCaster = caster;
        }
        // Equipe / crew : une capacite ne touche pas un allie (le corps a corps
        // est deja filtre par onPlayerDamagingOtherPlayer).
        if (!isMob && effectiveCaster !== target && blockedByTeam(effectiveCaster, target)) return false;
        // Protection PvP : un tueur ne peut pas retoucher sa victime protegee.
        // pvpGuard annule aussi la protection si c'est la victime qui attaque.
        if (pvpGuard(effectiveCaster, target)) return false;

        let amt = Math.round(Math.abs(rawAmount) * strengthMult(effectiveCaster) * 1.5);
        if (amt < 1) amt = 1;
        if (amt > HARD_CAP) amt = HARD_CAP;
        amt = hakiBoost(effectiveCaster, amt);

        try {
            const until = marks[target];
            if (until && api.now() < until) amt = Math.floor(amt * 1.3);
        } catch (e0) {}

        const item = typeof itemName === "string" && itemName.length ? itemName : "Ability";
        const victimName = safeEntityName(target);
        const casterName = safeEntityName(effectiveCaster);
        const hpBefore = safeHealth(target);

        if (isMob) {
            try { noteMobSeen(target); } catch (e) {}
        }

        try { recordDamager(target, effectiveCaster, item); } catch (e1) {}

        let credited = false;
        try {
            credited = pushHealth(target, -amt, { lifeformId: effectiveCaster, withItem: item }, true);
        } catch (e) { credited = false; }

        let hpAfter = safeHealth(target);
        let landed = credited;

        if (!credited) {
            const appliedAnyway = (hpBefore !== null && hpAfter !== null && hpAfter < hpBefore)
                               || (hpAfter === null && hpBefore !== null && hpBefore > 0);
            if (appliedAnyway) {
                landed = true;
            } else {
                // second essai sans attribution (toujours mieux que rien)
                try { landed = pushHealth(target, -amt, undefined, false); } catch (e) { landed = false; }
                hpAfter = safeHealth(target);
            }
        }

        try { aggro(target, effectiveCaster); } catch (e) {}

        const enoughToKill = hpBefore !== null && amt >= hpBefore;
        const fatal = (hpAfter !== null && hpAfter <= 0)
                   || (hpAfter === null && hpBefore !== null && hpBefore > 0 && (enoughToKill || !isAliveIdFresh(target)))
                   || (enoughToKill && !isAliveIdFresh(target));

        if (!landed && !fatal) return false;

        if (!credited && fatal) {
            try { noteUncreditedKill(target, effectiveCaster, item, victimName, casterName); } catch (e) {}
        }

        if (fatal && (isMob || (type !== "Player" && tTypeEarly !== "Player" && !isPlayerAlive(target)))) {
            try { creditKill(effectiveCaster, target, victimName); } catch (e2) {}
        }
        return true;
    } catch (eTop) {
        return false;
    }
}

/* ═══════════════════════════════════════════════════════════════
   GARDE-FOUS DE MOUVEMENT (toutes les capacites passent par ici)

   1. VEHICULE — bateau (physique 1) et monture (physique 5).
      Tant qu'un joueur est dessus, on ne lui donne AUCUNE vitesse ni
      impulsion : le bateau suit le joueur, un dash le propulsait donc a
      une vitesse absurde (18 blocs/s x le multiplicateur du bateau).

   2. CROWD CONTROL — les rangs marques `immuneToCrowdControl` (ADMIN,
      OWNER, voir core/ranks.js) ne se font ni pousser, ni root, ni
      ralentir, ni teleporter par la capacite de quelqu'un d'autre. Leur
      propre deplacement reste permis : withEffectSource() ouvre une
      fenetre pendant le cast du joueur, et c'est la seule facon de
      deplacer un joueur immunise.
   ═══════════════════════════════════════════════════════════════ */

/* [0,0,0] des types de physique qui transportent le joueur */
const VEHICLE_TYPES = { 1: "boat", 5: "mob" };
/* lire getPlayerPhysicsState pour tout le monde a chaque impact coute cher :
   on garde le resultat le temps d'un tick (50 ms). */
const vehicleCache = {};

export function vehicleTypeOf(id) {
    if (!id || !isOnlinePlayer(id)) return 0;
    const now = nowMs();
    const c = vehicleCache[id];
    if (c && c.at === now) return c.type;
    let type = 0;
    try {
        const st = api.getPlayerPhysicsState(id);
        if (st && typeof st.type === "number") type = st.type;
    } catch (e) {
        type = 0;
    }
    /* nettoyage de temps en temps : la table ne doit pas grossir indefiniment */
    if (Object.keys(vehicleCache).length > 160) {
        for (const k in vehicleCache) delete vehicleCache[k];
    }
    vehicleCache[id] = { at: now, type: type };
    return type;
}

/* Le joueur est-il dans un vehicule (donc protege de tout deplacement) ? */
export function inVehicle(id) {
    return !!VEHICLE_TYPES[vehicleTypeOf(id)];
}

/* PROVENANCE DU MOUVEMENT — "c'est lui qui bouge" ou "on le deplace" ?

   Avant : une fenetre de 2,5 s ouverte a chaque cast. Elle etait fausse dans
   les deux sens. Un admin qui cliquait une capacite devenait deplacable par
   n'importe qui pendant 2,5 s (Control Domain en profitait a chaque tick), et
   une coroutine qui reprenait apres 3 s perdait son droit de bouger.

   Maintenant : l'acteur du code en cours (voir utils/timer). Pendant le cast
   d'une capacite, l'acteur est son lanceur ; a chaque reprise de coroutine il
   est restaure. Donc un admin ne bouge QUE pendant son propre code, jamais
   parce qu'il a clique deux secondes plus tot. */

export function isSelfMoving(id) {
    if (!id) return false;
    const who = getActor();
    if (who) return who === String(id);
    return !!effectCast && effectCast.caster === String(id);
}

/* Crowd control bloque ? (immunise ET ce n'est pas son propre deplacement) */
export function ccLocked(id) {
    /* les mobs ne sont pas concernes : on evite un appel de rang par impact */
    if (!id || !isOnlinePlayer(id)) return false;
    if (!isCrowdControlImmune(id)) return false;
    return !isSelfMoving(id);
}

/* Le joueur qui vient d'utiliser une capacite de deplacement doit savoir
   pourquoi rien ne bouge. Anti-spam : un message toutes les 3 s. */
const lastMoveNotice = {};
function moveNotice(id, text) {
    const now = nowMs();
    const last = lastMoveNotice[id];
    /* `last !== undefined` et non `last` : nowMs() vaut 0 au tout premier tick. */
    if (last !== undefined && now - last < 3000) return;
    lastMoveNotice[id] = now;
    try {
        say(id, [
            { icon: "fa-solid fa-ban", style: { color: "#FFD166" } },
            { str: " " + text, style: { color: "#FFD166" } },
        ]);
    } catch (e) {}
}

/* Raison d'un blocage de mouvement, ou null si le deplacement est permis. */
function moveBlocked(id) {
    if (!id) return null;
    if (inVehicle(id)) return "vehicle";
    if (ccLocked(id)) return "cc";
    return null;
}

/* MOUVEMENT / EFFETS */
export function impulse(id, x, y, z) {
    if (!id || isNpcEntity(id) || !isAliveId(id)) return false;
    const blocked = moveBlocked(id);
    if (blocked) {
        if (blocked === "vehicle" && effectCast && effectCast.caster === String(id)) {
            moveNotice(id, "No movement abilities while you are in a boat.");
        }
        return false;
    }
    try { return !!api.applyImpulse(id, x, y, z); }
    catch (e) { return false; }
}

export function setVel(id, x, y, z) {
    if (!id || isNpcEntity(id) || !isAliveId(id)) return false;
    const blocked = moveBlocked(id);
    if (blocked) {
        if (blocked === "vehicle" && effectCast && effectCast.caster === String(id)) {
            moveNotice(id, "No movement abilities while you are in a boat.");
        }
        return false;
    }
    try { return !!api.setVelocity(id, x, y, z); }
    catch (e) { return false; }
}

export function eff(id, name, duration, opts) {
    return applyEffect(id, name, duration, opts);
}

export function aggro(targetId, casterId) {
    if (!targetId || !casterId || targetId === casterId) return
    if (summonOwner[targetId] === casterId) return
    const effCaster = getEffectiveKiller(casterId) || casterId;
    if (summonOwner[targetId] === effCaster) return
    try {
        var ids = api.getMobIds() || [], i, isMob = false
        for (i = 0; i < ids.length; i++) if (ids[i] === targetId) { isMob = true; break }
        if (!isMob) return
        var st = null
        try { st = api.getMobAiState(targetId) } catch (e0) {}
        if (st && st.state === "chasing" && st.params && st.params.targetId === effCaster) return
        api.setMobAiState(targetId, "chasing", { targetId: effCaster })
    } catch (e) {}
}


export { aggro as markAggro };

/* CIBLES */
export function entitiesIn(min, max) {
    try {
        const raw = api.getEntitiesInRect(min, max) || [];
        const out = [];
        for (let i = 0; i < raw.length; i++) {
            const id = raw[i];
            if (id && !isNpcEntity(id)) out.push(id);
        }
        return out;
    } catch (e) {
        return [];
    }
}

export function lifeforms(exclude) {
    const p = getAlivePlayerIds();
    const m = getAliveMobIds();
    const out = [];
    for (let i = 0; i < p.length; i++) if (p[i] !== exclude && !isNpcEntity(p[i])) out.push(p[i]);
    for (let i = 0; i < m.length; i++) if (m[i] !== exclude && !isNpcEntity(m[i])) out.push(m[i]);
    return out;
}

const HITBOX_PAD = 1.35;
const BODY_LOW = -0.3;
const BODY_HIGH = 2.0;

function gatherTargets(min, max, exclude) {
    const out = [];
    const seen = new Set();
    if (exclude) seen.add(exclude);
    const all = lifeforms(exclude);
    for (let i = 0; i < all.length; i++) {
        const id = all[i];
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push(id);
    }
    const rect = entitiesIn(min, max);
    for (let i = 0; i < rect.length; i++) {
        const id = rect[i];
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push(id);
    }
    return out;
}

export function inSphere(center, radius, cb) {
    const effR = radius + HITBOX_PAD;
    const r2 = effR * effR;
    const list = gatherTargets(
        [center[0] - effR, center[1] - effR - 2, center[2] - effR],
        [center[0] + effR, center[1] + effR + 2, center[2] + effR]
    );
    for (let i = 0; i < list.length; i++) {
        const id = list[i];
        if (!isAliveId(id) || safeEntityType(id) === "NPC") continue;
        const p = posOf(id);
        if (!p) continue;
        const cy = Math.max(p[1] + BODY_LOW, Math.min(p[1] + BODY_HIGH, center[1]));
        const dx = p[0] - center[0], dy = cy - center[1], dz = p[2] - center[2];
        if (dx * dx + dy * dy + dz * dz <= r2) cb(id, p);
    }
}

export function inCylinder(center, radius, height, cb, floorDrop) {
    const effR = radius + HITBOX_PAD;
    const r2 = effR * effR;
    const drop = (floorDrop === undefined ? 2.5 : floorDrop) + 1.2;
    const top = (height === undefined ? 3.0 : height) + 1.4;
    const list = gatherTargets(
        [center[0] - effR, center[1] - drop - 2, center[2] - effR],
        [center[0] + effR, center[1] + top + 2, center[2] + effR]
    );
    for (let i = 0; i < list.length; i++) {
        const id = list[i];
        if (!isAliveId(id) || safeEntityType(id) === "NPC") continue;
        const p = posOf(id);
        if (!p) continue;
        if (
            distH2(p, center) <= r2 &&
            p[1] + BODY_HIGH >= center[1] - drop &&
            p[1] + BODY_LOW <= center[1] + top
        ) {
            cb(id, p);
        }
    }
}

export function hitArea(center, radius, caster, item, dmg, opts) {
    const o = opts || {};
    let count = 0;
    const run = (id, p) => {
        if (id === caster) return;
        count++;
        if (damage(id, dmg, caster, item)) {
            if (o.knock || o.lift) {
                const dx = p[0] - center[0], dz = p[2] - center[2];
                const h = Math.sqrt(dx * dx + dz * dz) || 1;
                impulse(id, (dx / h) * (o.knock || 0), o.lift || 0, (dz / h) * (o.knock || 0));
            }
            if (o.slow) eff(id, "Slowness", o.slow[0], { inbuiltLevel: o.slow[1] || 1 });
            if (o.effect) eff(id, o.effect[0], o.effect[1], { inbuiltLevel: o.effect[2] || 1 });
            if (o.onHit) o.onHit(id, p);
        }
    };
    if (o.height === undefined) inSphere(center, radius, run);
    else inCylinder(center, radius, o.height, run, o.floorDrop);
    return count;
}

export function hitSeg(a, b, radius, caster, item, dmg, opts) {
    const o = opts || {};
    const effR = radius + HITBOX_PAD;
    const r2 = effR * effR;
    const pad = effR + 2.0;
    const list = gatherTargets(
        [Math.min(a[0], b[0]) - pad, Math.min(a[1], b[1]) - pad, Math.min(a[2], b[2]) - pad],
        [Math.max(a[0], b[0]) + pad, Math.max(a[1], b[1]) + pad, Math.max(a[2], b[2]) + pad],
        caster
    );
    let count = 0;
    let best = { t: 1, c: b };
    const seen = {};
    for (let i = 0; i < list.length; i++) {
        const id = list[i];
        if (id === caster || !isAliveId(id) || safeEntityType(id) === "NPC") continue;
        const p = safePosition(id);
        if (!p) continue;
        const s0 = segDist([p[0], p[1] + 0.25, p[2]], a, b);
        const s1 = segDist([p[0], p[1] + 1.0, p[2]], a, b);
        const s2 = segDist([p[0], p[1] + 1.75, p[2]], a, b);
        let s = s0.d2 <= s1.d2 ? s0 : s1;
        if (s2.d2 < s.d2) s = s2;
        if (s.d2 > r2) continue;
        count++;
        seen[id] = 1;
        if (dmg > 0) damage(id, dmg, caster, item);
        if (o.slow) eff(id, "Slowness", o.slow[0], { inbuiltLevel: o.slow[1] || 1 });
        if (o.effect) eff(id, o.effect[0], o.effect[1], { inbuiltLevel: o.effect[2] || 1 });
        if (o.knock || o.lift) {
            const dir = [b[0] - a[0], 0, b[2] - a[2]];
            const h = Math.sqrt(dir[0] * dir[0] + dir[2] * dir[2]) || 1;
            impulse(id, (dir[0] / h) * (o.knock || 0), o.lift || 0, (dir[2] / h) * (o.knock || 0));
        }
        if (o.onHit) o.onHit(id, s.c);
        if (s.t < best.t) best = { t: s.t, c: s.c };
    }
    return { point: best.c, count: count, seen: seen };
}

export function pickTarget(caster, origin, dir, range, coneCos, filter) {
    const ids = lifeforms(caster);
    let inCone = null, coneD = range * range;
    let any = null, anyD = range * range;
    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        if (!isAliveId(id) || safeEntityType(id) === "NPC") continue;
        if (filter && !filter(id)) continue;
        const p = posOf(id);
        if (!p) continue;
        const dx = p[0] - origin[0], dy = (p[1] + 0.9) - origin[1], dz = p[2] - origin[2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > range * range || d2 < 0.01) continue;
        if (d2 < anyD) { anyD = d2; any = id; }
        const inv = 1 / Math.sqrt(d2);
        if ((dx * dir[0] + dy * dir[1] + dz * dir[2]) * inv >= coneCos && d2 < coneD) {
            coneD = d2; inCone = id;
        }
    }
    return inCone || any;
}

export function nearest(pos, maxDist, caster) {
    const ids = lifeforms(caster);
    let best = null, bestD = maxDist * maxDist;
    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        if (!isAliveId(id) || safeEntityType(id) === "NPC") continue;
        const p = posOf(id);
        if (!p) continue;
        const d2 = dist2(p, pos);
        if (d2 < bestD) { bestD = d2; best = id; }
    }
    return best;
}

/* DIVERS */
export function grounded(id) {
    try { return (api.getBlockCoordinatesPlayerStandingOn(id) || []).length > 0; }
    catch (e) { return false; }
}

/* Vitesse de deplacement. `0` = root : c'est du crowd control, refuse a un
   rang immunise. Remettre une vitesse normale (>= 1) n'est JAMAIS bloque,
   sinon on laisserait quelqu'un fige apres un sort. */
export function setMoveSpeed(id, mult) {
    if (!id || isNpcEntity(id) || !isAliveId(id)) return false;
    if (!(mult > 0) && ccLocked(id)) return false;
    try { api.setClientOption(id, "speedMultiplier", mult); return true; }
    catch (e) { return false; }
}

/* Camera forcee (Control Domain braque le regard de ses prisonniers).
   `null` = on relache : toujours autorise, c'est un nettoyage. */
export function forceCameraDir(id, dir) {
    if (!id || isNpcEntity(id) || !isAliveId(id)) return false;
    if (dir !== null && ccLocked(id)) return false;
    try { api.setClientOption(id, "forcedCameraDirection", dir); return true; }
    catch (e) { return false; }
}

export function teleport(id, x, y, z) {
    if (!id || isNpcEntity(id) || !isAliveId(id)) return false;
    const blocked = moveBlocked(id);
    if (blocked) {
        if (blocked === "vehicle" && effectCast && effectCast.caster === String(id)) {
            moveNotice(id, "No movement abilities while you are in a boat.");
        }
        return false;
    }
    try { api.setPosition(id, x, y, z); return true; }
    catch (e) { return false; }
}

export {
    isAliveId, isStillAlive, isPlayerAlive, isMobAlive, isMobEntityType,
    posOf, safePosition, safeEntityName, safeEntityType, safeHealth,
    facing, chest, eye, targetBlock,
};

/* utils/effect.js */

/* REGISTRE DES NIVEAUX DE BASE (effets permanents / fruit, etc.) */

const baseEffectLevel = {};

export function setBaseEffectLevel(playerId, effectId, inbuiltLevel) {
    if (!baseEffectLevel[playerId]) baseEffectLevel[playerId] = {};
    baseEffectLevel[playerId][effectId] = {
        level: inbuiltLevel,
        duration: null
    };
}

export function getBaseEffectLevel(playerId, effectId) {
    return baseEffectLevel[playerId]?.[effectId]?.level ?? 0;
}

export function getBaseEffectDuration(playerId, effectId) {
    return baseEffectLevel[playerId]?.[effectId]?.duration ?? null;
}

export function clearPlayerEffects(playerId) {
    delete baseEffectLevel[playerId];
    delete effectSources[playerId];
}

/* ═══════════════════════════════════════════════════════════════
   PROVENANCE DES EFFETS — un même effet ne s'empile que si la
   provenance diffère.

   Provenance = "lanceur|capacité" (le joueur qui lance ET l'abilité
   utilisée). Elle est posée autour du cast par withEffectSource()
   — un seul point de passage par famille d'abilité (fruits dans
   fruit/abilities.js, styles de combat dans gameplay/fightingStyles.js).

   Quand aucune provenance n'est connue (effet de tick, aura, piège au
   sol...), on retombe sur l'effet lui-même : "fx|Slowness". Conséquence
   voulue : dans le doute on ne cumule pas.

   Règle finale :
     • même provenance  -> la durée se rafraîchit, le niveau NE monte pas ;
     • provenances ≠    -> les niveaux s'additionnent (vrai cumul de groupe).
   ═══════════════════════════════════════════════════════════════ */

/* targetId -> effectId -> { clé de provenance: { level, until, name, icon } } */
const effectSources = {};

/* contexte du cast en cours (remis à sa valeur précédente en sortie) */
let effectCast = null;

/* Pose la provenance le temps d'un cast. Les effets appliqués
   synchroniquement par l'abilité héritent de "lanceur|capacité". */
export function withEffectSource(casterId, abilityId, fn) {
    const prev = effectCast;
    effectCast = {
        caster: casterId ? String(casterId) : "",
        ability: abilityId ? String(abilityId) : ""
    };
    /* l'acteur du code en cours devient le lanceur : c'est ce qui distingue
       un dash d'un crowd control subi, y compris dans la coroutine qui
       reprend apres un sleep(). */
    try {
        return withActor(casterId, fn);
    } finally {
        effectCast = prev;
    }
}

function provenanceKey(effectId, opts) {
    const caster = opts.casterId !== undefined
        ? String(opts.casterId)
        : (effectCast ? effectCast.caster : "");
    const ability = opts.source !== undefined
        ? String(opts.source)
        : (effectCast ? effectCast.ability : "");
    if (!ability) return "fx|" + effectId;
    return (caster || "?") + "|" + ability;
}

/* Empilements vivants pour (cible, effet) — purge les entrées expirées. */
function sourceSlots(targetId, effectId, now) {
    let book = effectSources[targetId];
    if (!book) book = effectSources[targetId] = {};
    let slots = book[effectId];
    if (!slots) slots = book[effectId] = {};
    for (const k in slots) {
        if (!(slots[k].until > now)) delete slots[k];
    }
    return slots;
}

/* Somme des niveaux empilés + l'empilement qui vit le plus longtemps
   (c'est lui qui fournit le libellé / l'icône affichés). */
function slotsSummary(slots) {
    const sum = { level: 0, until: 0, name: null, icon: null };
    for (const k in slots) {
        sum.level += slots[k].level;
        if (slots[k].until > sum.until) {
            sum.until = slots[k].until;
            sum.name = slots[k].name || null;
            sum.icon = slots[k].icon || null;
        }
    }
    return sum;
}

/* Effets qui CONTROLENT le joueur (ralentir, affaiblir, aveugler).
   Un rang immunise au crowd control ne les recoit pas, meme de lui-meme.
   N'inscrire ici que des effets qui existent vraiment dans Bloxd : un nom
   invente ne bloque rien et donne l'illusion d'une protection. */
const CC_EFFECTS = {
    "slowness": 1,
    "weakness": 1,
    "blindness": 1,
};

export function isCrowdControlEffect(effectId) {
    return !!CC_EFFECTS[String(effectId || "").toLowerCase()];
}

/* FONCTION PRINCIPALE — applyEffect custom avec cumul par provenance */

export function applyEffect(targetId, effectId, duration, opts = {}) {

    if (!targetId || !isAliveId(targetId)) return false;

    const displayName = opts.displayName;
    const icon = opts.icon;
    const inbuiltLevel = opts.inbuiltLevel !== undefined ? opts.inbuiltLevel : 1;

    const type = safeEntityType(targetId);
    if (type === null) return false;
    if (type === "NPC") return false;

    /* Crowd control refuse a un rang immunise (ADMIN / OWNER) : ni slow ni
       weakness, jamais. Pas de fenetre "auto-deplacement" ici : un joueur
       immunise ne s'inflige pas a lui-meme un ralentissement, alors qu'il a
       besoin de bouger lui-meme. */
    if (isCrowdControlEffect(effectId) && isCrowdControlImmune(targetId)) return false;

    if (isMobEntityType(type) || isMobAlive(targetId)) {
        const effectOpts = { inbuiltLevel };
        if (displayName) effectOpts.displayName = displayName;
        if (icon) effectOpts.icon = icon;
        try { api.applyEffect(targetId, effectId, duration, effectOpts); } catch (e) {}
        return;
    }

    let currentLevel = 0;
    try { currentLevel = api.getEffectLevel(targetId, effectId) || 0; } catch (e0) {}

    const baseLevel = getBaseEffectLevel(targetId, effectId);

    if (duration === null || duration === undefined) {
        setBaseEffectLevel(targetId, effectId, inbuiltLevel);

        const tempBonus = Math.max(0, currentLevel - baseLevel);
        const newLevel = inbuiltLevel + tempBonus;

        const effectOpts = { inbuiltLevel: newLevel };
        if (displayName) effectOpts.displayName = displayName;
        if (icon) effectOpts.icon = icon;

        try { api.applyEffect(targetId, effectId, null, effectOpts); } catch (e1) {}
        return;
    }

    /* ── 5. Cas : effet TEMPORAIRE — cumul SEULEMENT si la provenance change ── */
    const now = nowMs();
    const slots = sourceSlots(targetId, effectId, now);

    /* niveau déjà posé par ce registre avant cette application */
    let before = 0;
    for (const k in slots) before += slots[k].level;

    const key = provenanceKey(effectId, opts);
    const slot = slots[key];
    if (slot) {
        /* même provenance : on rafraîchit la durée, on n'ajoute RIEN.
           Si la même capacité revient plus fort (niveau supérieur), on
           garde le plus fort au lieu d'empiler. */
        if (inbuiltLevel > slot.level) slot.level = inbuiltLevel;
        slot.until = now + duration;
        if (displayName) slot.name = displayName;
        if (icon) slot.icon = icon;
    } else {
        slots[key] = { level: inbuiltLevel, until: now + duration, name: displayName, icon };
    }

    const live = slotsSummary(slots);

    /* niveaux posés hors de ce registre (moteur, api.applyEffect direct) */
    const foreign = Math.max(0, currentLevel - baseLevel - before);
    const newLevel = baseLevel + foreign + live.level;

    const effectOpts = { inbuiltLevel: newLevel };
    const label = displayName || live.name;
    const ico = icon || live.icon;
    if (label) effectOpts.displayName = label;
    if (ico) effectOpts.icon = ico;

    try { api.applyEffect(targetId, effectId, duration, effectOpts); } catch (e2) { return false; }

    scheduleEffectRestore(targetId, effectId, duration);
    return true;
}

/* RESTAURATION DIFFÉRÉE — réapplique le niveau de base à l'expiration */

function scheduleEffectRestore(playerId, effectId, duration) {

    const delayTicks = Math.max(1, Math.round(duration / 50));

    setTimeout(() => {
        try {

            if (!isStillAlive(playerId)) return;

            const now = nowMs();
            /* purge les empilements expirés, puis on réapplique la somme
               de ceux qui restent (un empilement de groupe peut survivre
               à l'expiration du premier). */
            const live = slotsSummary(sourceSlots(playerId, effectId, now));
            const baseLevel = getBaseEffectLevel(playerId, effectId);

            if (live.level > 0) {
                const remain = Math.max(50, live.until - now);
                const opts = { inbuiltLevel: baseLevel + live.level };
                if (live.name) opts.displayName = live.name;
                if (live.icon) opts.icon = live.icon;
                try { api.applyEffect(playerId, effectId, remain, opts); } catch (e1) {}
                /* réarme pour l'expiration suivante */
                scheduleEffectRestore(playerId, effectId, remain);
                return;
            }

            if (baseLevel > 0) {
                try {
                    api.applyEffect(playerId, effectId, null, { inbuiltLevel: baseLevel });
                } catch (e2) {}
            } else {
                try { api.removeEffect(playerId, effectId); } catch (e3) {}
            }
        } catch (e) {

        }
    }, delayTicks);
}

/* SUPPRESSION D'EFFET — retire proprement un effet temporaire */

export function removeEffect(playerId, effectId) {
    if (!playerId || !isAliveId(playerId)) return;
    const baseLevel = getBaseEffectLevel(playerId, effectId);

    /* l'effet est retiré volontairement : sans ça, le registre croirait
       encore à un empilement vivant et le réappliquerait au tick suivant. */
    try {
        const book = effectSources[playerId];
        if (book) delete book[effectId];
    } catch (eRm) {}

    try { api.removeEffect(playerId, effectId); } catch (e) {}

    if (baseLevel > 0) {
        try { api.applyEffect(playerId, effectId, null, { inbuiltLevel: baseLevel }); } catch (e2) {}
    }
}
