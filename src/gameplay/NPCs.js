// NPCs.js
import { buyArmamentHaki } from "../utils/haki"
import { startQuest } from "./quest";
import { buyItem } from "../utils/data";
import { setInterval, setTimeout } from "../utils/timer";
import { getPlayerTeam } from "../core/team";
import { rollFruit } from "../fruit";
import { markAggro } from "../fruit/func-abilities";
import { safeEntityName, safeEntityType } from "../utils/lifeform";
export function attackNPC(playerId, mobId) {

    const name = safeEntityName(mobId);
    if (!name) return "preventDamage";
    const team = getPlayerTeam(playerId)

    if (name === "Quest Dealer") {
        startQuest(playerId);
    }

    else if (name === "Fruit Dealer") {
        rollFruit(playerId, 1);
    }
    else if (name == "Marine Fruit Dealer") {
        rollFruit(playerId, 1.25);
    } else if (name === "Haki Seller") {
        buyArmamentHaki(playerId);
    }

    else if (name === "Apple Seller") {
        buyItem(playerId, "Apple", 75, 3 )
    }
    else if (name === "Steak Seller") {
        buyItem(playerId, "Steak", 180, 3 )
    }
    else if (name === "Cornbread Seller") {
        buyItem(playerId, "Cornbread", 140, 3 )
    }
    else if (name === "Corn Seller") {
        buyItem(playerId, "Corn", 80, 3 )
    }
    else if (name === "Bread Seller") {
        buyItem(playerId, "Bread", 110, 3 )
    }
    else if (name === "Chili Seller") {
        buyItem(playerId, "Chili Pepper", 120, 2 )
    }
    else if (name === "Mango Seller") {
        buyItem(playerId, "Mango", 120, 3 )
    }
    else if (name === "Venison Seller") {
        buyItem(playerId, "Cooked Venison", 180, 3 )
    }
    else if (name === "Pork Seller") {
        buyItem(playerId, "Cooked Porkchop", 180, 3 )
    }
    else if (name === "Mutton Seller") {
        buyItem(playerId, "Cooked Mutton", 180, 3 )
    }

    else if (name === "Boat Dealer") {
        buyItem(playerId, "Boat", 500, 1, {customDisplayName:"Normal Boat", customDescription:"A classic boat made to travel all seas."})
    }
    else if (name === "Advanced Boat Dealer") {
         buyItem(playerId, "Obsidian Boat", 1000, 1, {customDisplayName:"Advanced Boat", customDescription:"A stronger boat made to travel all seas."})
    }
    else if (name === "Luxury Boat Dealer") {
         buyItem(playerId, "Speedboat", 5000, 1, {customDisplayName:"Luxury Boat", customDescription:"A super fast boat made to travel all seas."})
    }
        
    else if (name === "Sand Weapon Dealer") {
         buyItem(playerId, "Stone Dagger", 230, 1, {customDisplayName:"Sand Dagger", customDescription:"A dagger made of the rock of the desert."})
    }
        
    else if (name === "First Weapon Dealer") {
        if (team === "PIRATES") {
            buyItem(playerId, "Wood Sword", 60, 1, {customDisplayName:"Basic Dagger", customDescription:"The first weapon of every Pirates."})
        }
        else if(team === "MARINES") {
            buyItem(playerId, "Wood Spear", 60, 1, {customDisplayName:"Basic Spear", customDescription:"The spear of the Justice!"})
        }
        else {
            buyItem(playerId, "Wood Sword", 30, 1, {customDisplayName:"Basic Sword", customDescription:"Just a sword for a normal people..."})
        }
    }
    else if (name === "Weapon Dealer T2") {
        if (team === "PIRATES") {
            buyItem(playerId, "Stone Sword", 230, 1, {customDisplayName:"Advanced Sword", customDescription:"The sword of a strong Pirates."})
        }
        else if(team === "MARINES") {
            buyItem(playerId, "M1911", 260, 1, {customDisplayName:"Flintlock", customDescription:"A slow Flintlock to kill enemies from the distance!"})
        }
        else {
            buyItem(playerId, "Stone Spear", 200, 1, {customDisplayName:"Advanced Spear", customDescription:"Just a sword for a normal people..."})
        }
    }

    if (safeEntityType(mobId) === "NPC") return "preventDamage"
    markAggro(mobId, playerId);
}

/* NPC SPAWNER (ex-questNPC, renommé spawnNPC) */

const NPC_REGISTRY = new Map();
const NPC_IDS = new Set();

const NPC_MAINTAIN_MIN_MS = 8000;
const NPC_MAINTAIN_MAX_MS = 15000;
const NPC_NEAR_DIST = 100;
const NPC_SWEEP_BATCH = 6;
const NPC_SWEEP_EVERY_TICKS = 40;

let sweeperTimer = null;
let sweepCursor = 0;

function npcKey(pos, name) {
    return name + "|" + Math.round(pos[0]) + "," + Math.round(pos[1]) + "," + Math.round(pos[2]);
}

function findNPCNear(pos, name, radius) {
    radius = radius || 4;
    let around = [];
    try {
        around = api.getEntitiesInRect(
            [pos[0] - radius, pos[1] - 3, pos[2] - radius],
            [pos[0] + radius, pos[1] + 3, pos[2] + radius]
        ) || [];
    } catch (e) { return null }
    for (let i = 0; i < around.length; i++) {
        const id = around[i];
        try {
            if (api.getEntityType(id) === "NPC" && api.getEntityName(id) === name) return id;
        } catch (e2) {}
    }
    return null;
}

function nearestPlayer(pos) {
    let best = null, bestDist = Infinity;
    let ids = [];
    try { ids = api.getPlayerIds() || [] } catch (e) { return null }
    for (let i = 0; i < ids.length; i++) {
        let p = null;
        try { p = api.getPosition(ids[i]) } catch (e2) { p = null }
        if (!p) continue;
        const d = Math.abs(p[0] - pos[0]) + Math.abs(p[1] - pos[1]) + Math.abs(p[2] - pos[2]);
        if (d < bestDist) { bestDist = d; best = ids[i]; }
    }
    return { id: best, dist: bestDist };
}

function dressUpNPC(NPC, name) {
    api.setTargetedPlayerSettingForEveryone(NPC, "nameTagInfo", {
        subtitle: [
            { str: "Click on the NPC!", style: {color: "lightgray", fontWeight: "bold"} },
            { str: "", style: {color: "gray"} },
            { str: "", style: {color: "#00bfff"} }
        ],
        healthbar: {
            display: "never"
        },
        border: {
            colour: "#666666",
            applyTo: "nametag",
            style: "solid"
        }
    });
}

function ensureNPC(entry, playerId, force) {
    const now = Date.now();
    if (!force && now < entry.nextCheck) return entry.id || null;
    entry.nextCheck = now + NPC_MAINTAIN_MIN_MS + Math.floor(Math.random() * (NPC_MAINTAIN_MAX_MS - NPC_MAINTAIN_MIN_MS));

    const existing = findNPCNear(entry.pos, entry.name);
    if (existing) {
        if (entry.id && entry.id !== existing) NPC_IDS.delete(entry.id);
        entry.id = existing;
        NPC_IDS.add(existing);
        return existing;
    }
    entry.id = null;

    const near = nearestPlayer(entry.pos);
    if (!near.id || near.dist > NPC_NEAR_DIST) return null;

    const NPC = api.attemptSpawnMob("NPC", entry.pos[0] + 0.5, entry.pos[1] + 1, entry.pos[2] + 0.5, {
        name: entry.name,
        physicsOpts: {
            collidesEntities: false
        },
        playSoundOnSpawn: false,
    });
    if (!NPC) return null;
    
    entry.id = NPC;
    NPC_IDS.add(NPC);
    dressUpNPC(NPC, entry.name);
    api.setTargetedPlayerSettingForEveryone(NPC, "interactable", true);
    api.setTargetedPlayerSettingForEveryone(NPC, "interactionPrompt", "Click to Interact");

    const watcher = playerId || near.id;
    try { api.setMobAiState(NPC, "watching", { targetId: watcher }) } catch (e) {}
    setTimeout(() => {
        try { api.setMobAiState(NPC, "disabled", null) } catch (e2) {}
    }, 5);

    return NPC;
}

function startNPCSweeper() {
    if (sweeperTimer) return;
    sweeperTimer = setInterval(function () {
        if (NPC_REGISTRY.size === 0) return;
        const entries = Array.from(NPC_REGISTRY.values());
        const now = Date.now();
        const batch = Math.min(entries.length, NPC_SWEEP_BATCH);
        for (let i = 0; i < batch; i++) {
            const entry = entries[sweepCursor % entries.length];
            sweepCursor++;
            if (now < entry.nextCheck) continue;
            try { ensureNPC(entry, null) } catch (e) {}
        }
    }, NPC_SWEEP_EVERY_TICKS);
}

spawnNPC = (pos, name, playerId) => {
    if (!pos || !name) return null;

    const key = npcKey(pos, name);
    let entry = NPC_REGISTRY.get(key);
    if (!entry) {
        entry = { key: key, pos: [pos[0], pos[1], pos[2]], name: name, id: null, nextCheck: 0 };
        NPC_REGISTRY.set(key, entry);
    }

    startNPCSweeper();
    return ensureNPC(entry, playerId);
}

export const questNPC = spawnNPC;

export function forgetNPC(mobId) {
    NPC_IDS.delete(mobId);
    for (const entry of NPC_REGISTRY.values()) {
        if (entry.id === mobId) entry.id = null;
    }
}

export function isProtectedNPC(mobId) {
    if (NPC_IDS.has(mobId)) return true;

    try {
        if (api.getEntityType(mobId) !== "NPC") return false;
        const name = api.getEntityName(mobId);
        if (!name) return false;
        for (const entry of NPC_REGISTRY.values()) {
            if (entry.name === name) return true;
        }
    } catch (e) {}
    return false;
}
