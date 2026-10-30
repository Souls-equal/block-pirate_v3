//spawning.js

import { updateSidebar } from "../core/UI";
import { addStat, addXP, changeMoney, getStat, setStat, xpToNext } from "../utils/data";
import { C, say } from "../core/theme";

export const RANK_MULT = {
    1:{hp:1,dmg:1,gold:1,xp:.3},
    2:{hp:1.4,dmg:1.4,gold:1.5,xp:.8},
    3:{hp:2.5,dmg:2.5,gold:3,xp:1.35}
};

const RANK_NAME = {1:"",2:"",3:"Boss"};

function mobBaseHp(level){
    return Math.round(20 + Math.pow(level,1.6)*8);
}

function mobBaseDmg(level){
    return Math.round(3 + Math.pow(level,1.3)*0.8);
}

function mobGoldMax(level){
    return Math.round(3 + level*3);
}

function mobGoldMin(level){
    return Math.max(1, Math.round(mobGoldMax(level)*0.5));
}

/* RÉCOMPENSE DE QUÊTE AUTOMATIQUE */
const QUEST_SCALE = {
    baseMoney: 10,
    moneyPerGold: 1,
    baseXp: 9,
    xpPerLevel: 16,
};

export function computeQuestReward(killAmount, level, rank) {
    const lvl = Math.max(1, (level|0) || 1);
    const r = RANK_MULT[rank] || RANK_MULT[1];

    const perMob = Math.round((QUEST_SCALE.baseMoney + mobGoldMax(lvl)) * r.gold);
    const money = Math.max(1, Math.round((killAmount || 1) * perMob));

    const perXp = Math.round((QUEST_SCALE.baseXp + lvl * QUEST_SCALE.xpPerLevel) * r.xp);
    const xp = Math.max(1, Math.round((killAmount || 1) * perXp));

    return { xp, money };
}

const mobData = {};
/* export pour debug / fix */
export function _getMobDataMap(){ return mobData; }

/* Un mob despawné n'est plus lisible (getEntityName / getMobSetting throw),
   or l'event de kill peut arriver APRÈS onMobDespawned. On garde donc les
   récompenses et le nom quelques secondes, le temps que le crédit passe. */
const deadMobData = {};
const deadMobName = {};
const DEAD_TTL_MS = 20000;
let lastDeadPrune = 0;

function pruneDeadMobs(now) {
    if (now - lastDeadPrune < 5000) return;
    lastDeadPrune = now;
    for (const k in deadMobData) if (now - deadMobData[k].at > DEAD_TTL_MS) delete deadMobData[k];
    for (const k in deadMobName) if (now - deadMobName[k].at > DEAD_TTL_MS) delete deadMobName[k];
}

const META_PREFIX = "mobreward|";

function buildMobMeta(level, rank, xpReward, moneyMin, moneyMax, name) {
    return META_PREFIX + level + "|" + rank + "|" + xpReward + "|" + moneyMin + "|" + moneyMax + "|" + (name || "");
}

function readMobMeta(mobId) {
    // tente plusieurs lectures, metaInfo peut ne pas être listé comme setting standard
    let raws = [];
    try { raws.push(api.getMobSetting(mobId, "metaInfo", false)); } catch (e) {}
    try { raws.push(api.getMobSetting(mobId, "metaInfo")); } catch (e) {}
    try { raws.push(api.getMobSetting(mobId, "metaInfo", true)); } catch (e) {}
    for (let i = 0; i < raws.length; i++) {
        const raw = raws[i];
        if (typeof raw !== "string" || raw.indexOf(META_PREFIX) !== 0) continue;
        const parts = raw.split("|");
        if (parts.length < 6) continue;
        const data = {
            level: parseInt(parts[1], 10) || 1,
            rank: parseInt(parts[2], 10) || 1,
            xp: parseInt(parts[3], 10) || 0,
            moneyMin: parseInt(parts[4], 10) || 1,
            moneyMax: parseInt(parts[5], 10) || 1,
            name: parts[6] ? parts.slice(6).join("|") : null
        };
        if (data.moneyMax < data.moneyMin) data.moneyMax = data.moneyMin;
        if (data.xp > 0) return data;
    }
    return null;
}

function dataFromMaxHealth(mobId) {
    let hp = null;
    try { hp = api.getMobSetting(mobId, "maxHealth", false) } catch (e0) { hp = null }
    if (typeof hp !== "number" || !(hp > 0)) {
        try { hp = api.getMobSetting(mobId, "maxHealth"); } catch (e1) { hp = null }
    }
    if (typeof hp !== "number" || !(hp > 0)) return null;

    let best = null;
    for (let rank = 1; rank <= 3; rank++) {
        const base = hp / RANK_MULT[rank].hp;
        let level = 1;
        if (base > 21) {
            level = Math.round(Math.pow((base - 20) / 8, 1 / 1.6));
            if (level < 1) level = 1;
            if (level > 1000) level = 1000;
        }
        const back = Math.round(mobBaseHp(level) * RANK_MULT[rank].hp);
        const err = Math.abs(back - hp);
        if (!best || err < best.err) {
            const rm = RANK_MULT[rank];
            best = {
                level: level,
                rank: rank,
                xp: Math.floor(level * 20 * rm.xp),
                moneyMin: Math.floor(mobGoldMin(level) * rm.gold),
                moneyMax: Math.floor(mobGoldMax(level) * rm.gold),
                err: err
            };
        }
    }
    return best;
}

export function ensureMobData(mobId) {
    if (!mobId) return null;
    if (mobData[mobId]) {
        if (!mobData[mobId].name) mobData[mobId].name = safeMobName(mobId);
        return mobData[mobId];
    }
    // si déjà mort mais encore en cache mort, on le restaure
    if (deadMobData[mobId]) {
        mobData[mobId] = deadMobData[mobId];
        return mobData[mobId];
    }
    return recoverMobData(mobId);
}

function recoverMobData(mobId) {
    if (mobData[mobId]) return mobData[mobId];
    if (deadMobData[mobId]) return deadMobData[mobId];

    try { if (api.getEntityType(mobId) === "NPC") return null } catch (e) {}

    let data = readMobMeta(mobId);
    if (!data) data = dataFromMaxHealth(mobId);
    if (!data || !(data.level >= 1)) return null;

    if (!data.name) data.name = safeMobName(mobId);
    mobData[mobId] = data;
    return data;
}

export function forgetMob(mobId) {
    if (!mobId) return;
    const data = mobData[mobId];
    delete mobData[mobId];

    const name = safeMobName(mobId) || (data && data.name) || deadMobName[mobId]?.name || null;
    if (name) deadMobName[mobId] = { name: name, at: Date.now() };

    if (data) {
        if (!data.name) data.name = name;
        data.at = Date.now();
        deadMobData[mobId] = data;
    }
    pruneDeadMobs(Date.now());
}

export function spawnEnemy(callerId, pos, type, name, amount, level, rank) {

    const effect = api.getEffects(callerId);
    if (effect.includes("Spawning Cooldown")) {
        say(callerId, "Wait before spawning more mobs", {color:"red"})
        return true
    }
    api.applyEffect(callerId, "Spawning Cooldown", 10000, {displayName:"Spawning Cooldown", icon:"Updraft" })

    level = Math.max(1,level||1);
    rank = Math.min(3,Math.max(1,rank||1));
    amount = Math.max(1,amount||1);

    const rm = RANK_MULT[rank];

    const hp = Math.round(mobBaseHp(level)*rm.hp);
    const dmg = Math.round(mobBaseDmg(level)*rm.dmg);

    const baseXP = level * 20;
    const xpReward = Math.floor(baseXP * rm.xp);

    const moneyMin = Math.floor(mobGoldMin(level) * rm.gold);
    const moneyMax = Math.floor(mobGoldMax(level) * rm.gold);

    const fullName = name;

    for(let i=0;i<amount;i++){

        const mobId = api.attemptSpawnMob(
            type,
            pos[0] + (Math.random()-0.5)*4,
            pos[1],
            pos[2] + (Math.random()-0.5)*4,
            {
                name:name,
                playSoundOnSpawn:false
            }
        );

        if(!mobId) continue;

        api.setMobSetting(mobId,"name",fullName);
        api.setMobSetting(mobId,"maxHealth",hp);
        api.setHealth(mobId,hp);
        api.setMobSetting(mobId,"attackDamage",dmg);
        api.setMobSetting(mobId, "onDeathItemDrops", [])
        api.setMobSetting(mobId, "secondaryAttackItemName", null)
        api.setMobSetting(mobId, "secondaryAttackImpulse", 0)
        api.setMobSetting(mobId, "secondaryAttackRadius", 0)
        api.setMobSetting(mobId, "secondaryAttackDamage", 0)
        api.setMobSetting(mobId, "heldItemName", null)
        api.setMobSetting(mobId, "attackImpulse", 2)
        api.setMobSetting(mobId, "tameInfo", null)

        mobData[mobId] = {
            level: level,
            rank: rank,
            xp: xpReward,
            moneyMin: moneyMin,
            moneyMax: moneyMax,
            name: fullName
        };

        try { api.setMobSetting(mobId, "metaInfo", buildMobMeta(level, rank, xpReward, moneyMin, moneyMax, fullName)) } catch (e) {}

        setMobNameTag(mobId, rank, level, fullName);
    }
    return true
}

/* NAMETAG DES MOBS
   `nameTagInfo` est valide seulement avec les cles du schema Bloxd :
   content / subtitle / healthbar{display,height,backgroundColour,foregroundColour}
   / border{colour,style,width,applyTo}. `border` doit etre un frere de
   `healthbar`, pas un enfant, et les parties de texte d'un nametag ne
   prennent pas d'icone (elles sont reservees au chat) : sinon le moteur
   repond « Expected: valid nameTagInfo value » et le mob n'apparait jamais.
   On degrade en deux temps pour qu'un nametag refuse ne bloque jamais le
   spawn. */
function setMobNameTag(mobId, rank, level, name) {
    const accent = rank === 3 ? C.DANGER : rank === 2 ? C.MONEY : C.INFO;
    const label = rank === 3 ? "BOSS" : rank === 2 ? "TIER 2" : "NORMAL";
    const rich = {
        content: [{ str: String(name || "Mob"), style: { color: accent, fontWeight: "bold" } }],
        subtitle: [
            { str: label, style: { color: accent, fontWeight: "bold" } },
            { str: "  |  Lvl " + level, style: { color: C.MARINE } }
        ],
        /* `height` volontairement omis : la valeur attendue (nombre ou "13px")
               n'est pas documentee, et une valeur refusee ferait perdre tout le
               nametag. La hauteur par defaut est tres bien. */
            healthbar: { display: "always", foregroundColour: accent },
        border: { colour: accent, applyTo: "nametag", style: rank === 3 ? "double" : "solid" }
    };
    try {
        api.setTargetedPlayerSettingForEveryone(mobId, "nameTagInfo", rich);
        return;
    } catch (e) {}
    /* Repli minimal : un nom + une barre de vie, sans style exotique. */
    try {
        api.setTargetedPlayerSettingForEveryone(mobId, "nameTagInfo", {
            content: [{ str: String(name || "Mob") }],
            healthbar: { display: "always" }
        });
    } catch (e) {}
}

function resolveSummonOwnerForXp(playerId) {
    if (!playerId) return playerId;
    try {
        const map = globalThis.__combatSummonOwner || null;
        if (map && map[playerId]) return map[playerId];
    } catch (e) {}
    try {
        const db = api.getMobSetting(playerId, "ownerDbId", false);
        if (db) {
            let pids = [];
            try { pids = api.getPlayerIds() || []; } catch (e) {}
            for (let i = 0; i < pids.length; i++) {
                try { if (api.getPlayerDbId(pids[i]) === db) return pids[i]; } catch (e2) {}
            }
        }
    } catch (e) {}
    try {
        if (globalThis.__resolveKillOwner) {
            const r = globalThis.__resolveKillOwner(playerId);
            if (r && r !== playerId) return r;
        }
    } catch (e) {}
    return playerId;
}

export function killdMob(playerId, mobId) {

    if (!playerId || !mobId) return null;

    const realPlayerId = resolveSummonOwnerForXp(playerId) || playerId;

    let data = mobData[mobId] || deadMobData[mobId];
    if (!data) {
        // force refresh avant abandon
        try { ensureMobData(mobId); } catch (e) {}
        data = mobData[mobId] || deadMobData[mobId];
    }
    if (!data) data = recoverMobData(mobId);

    // FALLBACK FINAL: si on n'a toujours rien, on donne au moins l'xp du niveau du joueur
    // (évite 0 xp sur les fruits quand metaInfo illisible)
    if (!data) {
        const pLvl = Math.max(1, getStat(realPlayerId,"lvl",1) || 1);
        // on estime que le mob valait au moins le niveau du joueur -5, rank 1
        const estLevel = Math.max(1, pLvl - 5);
        const rm = RANK_MULT[1];
        data = {
            level: estLevel,
            rank: 1,
            xp: Math.floor(estLevel * 20 * rm.xp),
            moneyMin: Math.floor(mobGoldMin(estLevel) * rm.gold),
            moneyMax: Math.floor(mobGoldMax(estLevel) * rm.gold),
            name: safeMobName(mobId) || "Mob",
            isFallback: true
        };
        try { api.log("[spawning] killdMob fallback used for " + mobId + " -> lvl " + estLevel); } catch (e) {}
    }

    const resolvedName = (data && data.name && data.name !== "Mob" ? data.name : null) || safeMobName(mobId);
    if (resolvedName) deadMobName[mobId] = { name: resolvedName, at: Date.now() };

    delete mobData[mobId];
    delete deadMobData[mobId];

    /* Le tueur s'est peut-être déconnecté avant le crédit du kill : les
       récompenses sont isolées plus bas (try/catch), aucune ApiError ne sort. */
    const playerLvl = getStat(realPlayerId,"lvl",1);

    let xp = data.xp;

    const diff = playerLvl - data.level;

    if (diff > 20) xp *= 0.2;
    else if (diff < -20) xp *= 1.3;

    xp = Math.floor(xp);
    if (xp < 1) xp = 1;

    const money = Math.floor(
        Math.random() * (data.moneyMax - data.moneyMin + 1)
    ) + data.moneyMin;

    /* Chaque appel est isolé : un joueur qui vient de se déconnecter ne doit
       jamais empêcher le kill d'être compté pour les autres. */
    try { addXP(realPlayerId, xp); } catch (e) {}
    try { changeMoney(realPlayerId, money); } catch (e) {}

    try {
        say(realPlayerId,[
            {icon:"fa-solid fa-sparkle",style:{color:C.XP}},
            {str:" +"+xp+" XP  ",style:{color:C.XP}},
        ]);
    } catch (e) {}

    return resolvedName || data.name || null;
};

function safeMobName(mobId) {
    const cached = mobData[mobId] || deadMobData[mobId] || deadMobName[mobId];
    if (cached && cached.name && cached.name !== "Mob") return cached.name;
    try {
        const n = api.getMobSetting(mobId, "name", false);
        if (typeof n === "string" && n) return n;
    } catch (e) {}
    try {
        const n = api.getMobSetting(mobId, "name");
        if (typeof n === "string" && n) return n;
    } catch (e2) {}
    try {
        const n = api.getEntityName(mobId);
        if (n) return n;
    } catch (e3) {}
    return (cached && cached.name) || null;
}
