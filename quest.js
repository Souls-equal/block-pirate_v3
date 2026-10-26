// quest.js

import { addStat, addXP, changeMoney, deleteStat, getStat, setStat } from "./utils/data";
import { updateSidebar } from "./UI";
import { computeQuestReward, spawnEnemy } from "./spawning";

export const quests = {
    "Starter Island": {
        starter1: {
            levelMin: 0,
            levelMax: 3,
            targetMob: {
                PIRATES: "Pirate 1",
                MARINES: "Marine 1",
                DEFAULT: "Villager 1"
            },
            realMob: "Draugr Zombie",
            mob: { rank: 1 },
            killAmount: 6,
            position: {
                PIRATES: [-38.5, -913, 86.5],
                MARINES: [1054.5, -912, -294.5],
                DEFAULT: [688, -915, -239]
            }
        },
        starter2: {
            levelMin: 4,
            levelMax: 6,
            targetMob: {
                PIRATES: "Pirate 2",
                MARINES: "Marine 2",
                DEFAULT: "Villager 2"
            },
            realMob: "Draugr Zombie",
            mob: { rank: 1 },
            killAmount: 8,
            position: {
                PIRATES: [-4.5, -912, 112.5],
                MARINES: [993.5, -903, -254.5],
                DEFAULT: [705, -913, -193]
            }
        },
        starter3: {
            levelMin: 7,
            levelMax: 9,
            targetMob: {
                PIRATES: "Pirate 3",
                MARINES: "Marine 3",
                DEFAULT: "Villager 3"
            },
            realMob: "Draugr Zombie",
            mob: { rank: 1 },
            killAmount: 6,
            position: {
                PIRATES: [57.5, -910, 120.5],
                MARINES: [1036.5, -915, -219.5],
                DEFAULT: [690, -914, -170]
            }
        }
    },
    "Jungle": {
        monkey1: {
            levelMin: 10,
            levelMax: 13,
            targetMob: "Monkey 1",
            realMob: "Gorilla",
            mob: { rank: 1 },
            killAmount: 10,
            position: [1318, -911, 363]
        },
        monkey2: {
            levelMin: 14,
            levelMax: 16,
            targetMob: "Monkey 2",
            realMob: "Gorilla",
            mob: { rank: 1 },
            killAmount: 10,
            position: [1364, -913, 344]
        },
        gorilla1: {
            levelMin: 17,
            levelMax: 19,
            targetMob: "Gorilla 1",
            realMob: "Gorilla",
            mob: { rank: 1 },
            killAmount: 10,
            position: [1309, -915, 298]
        },
        gorilla2: {
            levelMin: 20,
            levelMax: 22,
            targetMob: "Gorilla 2",
            realMob: "Gorilla",
            mob: { rank: 1 },
            killAmount: 10,
            position: [1352, -916, 263]
        },
        gorillaKing: {
            levelMin: 23,
            levelMax: 30,
            targetMob: "Gorilla King",
            realMob: "Gorilla",
            mob: { rank: 3 },
            killAmount: 1,
            position: [1499, -914, 136]
        }
    },
    "Pirate Village": {
        littlePirate1: {
            levelMin: 31,
            levelMax: 35,
            targetMob: "Little Pirate 1",
            realMob: "Draugr Zombie",
            mob: { rank: 1 },
            killAmount: 8,
            position: [951, -915, 840]
        },
        littlePirate2: {
            levelMin: 36,
            levelMax: 41,
            targetMob: "Little Pirate 2",
            realMob: "Draugr Zombie",
            mob: { rank: 1 },
            killAmount: 8,
            position: [955, -913, 810]
        },
        brute1: {
            levelMin: 41,
            levelMax: 47,
            targetMob: "Brute 1",
            realMob: "Cave Golem",
            mob: { rank: 2 },
            killAmount: 6,
            position: [971, -914, 788]
        },
        brute2: {
            levelMin: 48,
            levelMax: 54,
            targetMob: "Brute 2",
            realMob: "Cave Golem",
            mob: { rank: 2 },
            killAmount: 6,
            position: [967, -914, 758]
        },
        clown: {
            levelMin: 55,
            levelMax: 60,
            targetMob: "Bubby the Clown",
            realMob: "Spirit Golem",
            mob: { rank: 3 },
            killAmount: 1,
            position: [878, -904, 756]
        }
    },
    "Desert": {
        sandBandit1: {
            levelMin: 60,
            levelMax: 67,
            targetMob: "Sand Bandit 1",
            realMob: "Draugr Zombie",
            mob: { rank: 1 },
            killAmount: 8,
            position: [675, -913, 1713]
        },
        sandBandit2: {
            levelMin: 67,
            levelMax: 73,
            targetMob: "Sand Bandit 2",
            realMob: "Draugr Zombie",
            mob: { rank: 1 },
            killAmount: 8,
            position: [662, -914, 1680]
        },
        sandBandit3: {
            levelMin: 73,
            levelMax: 80,
            targetMob: "Sand Bandit 3",
            realMob: "Draugr Zombie",
            mob: { rank: 1 },
            killAmount: 8,
            position: [627, -919, 1623]
        },
        sandBrute1: {
            levelMin: 80,
            levelMax: 85,
            targetMob: "Sand Brute 1",
            realMob: "Cave Golem",
            mob: { rank: 2 },
            killAmount: 6,
            position: [444, -916, 1656]
        },
        sandBrute2: {
            levelMin: 85,
            levelMax: 90,
            targetMob: "Sand Brute 2",
            realMob: "Cave Golem",
            mob: { rank: 2 },
            killAmount: 6,
            position: [468, -918, 1617]
        }
    },
    "Snow Village": {
        snowBandit1: {
            levelMin: 90,
            levelMax: 95,
            targetMob: "Snow Bandit 1",
            realMob: "Draugr Zombie",
            mob: { rank: 1 },
            killAmount: 8,
            position: [2516, -907, 559]
        },
        snowBandit2: {
            levelMin: 95,
            levelMax: 100,
            targetMob: "Snow Bandit 2",
            realMob: "Draugr Zombie",
            mob: { rank: 1 },
            killAmount: 8,
            position: [2492, -896, 541]
        },
        snowmen1: {
            levelMin: 100,
            levelMax: 105,
            targetMob: "Snowman 1",
            realMob: "Frost Zombie",
            mob: { rank: 2 },
            killAmount: 6,
            position: [2522, -909, 506]
        },
        snowmen2: {
            levelMin: 105,
            levelMax: 112,
            targetMob: "Snowman 2",
            realMob: "Frost Zombie",
            mob: { rank: 2 },
            killAmount: 6,
            position: [2504, -909, 438]
        },
        yeti: {
            levelMin: 112,
            levelMax: 120,
            targetMob: "Yeti",
            realMob: "Frost Golem",
            mob: { rank: 3 },
            killAmount: 1,
            position: [2548, -917, 453]
        },
    },
    "Marine Fortress": {
        soldier1: {
            levelMin: 120,
            levelMax: 125,
            targetMob: "Soldier 1",
            realMob: "Draugr Zombie",
            mob: { rank: 1 },
            killAmount: 8,
            position: [2118, -915, -462]
        },
        soldier2: {
            levelMin: 125,
            levelMax: 130,
            targetMob: "Soldier 2",
            realMob: "Draugr Zombie",
            mob: { rank: 1 },
            killAmount: 8,
            position: [2077, -915, -486]
        },
        soldier3: {
            levelMin: 130,
            levelMax: 135,
            targetMob: "Soldier 3",
            realMob: "Draugr Zombie",
            mob: { rank: 1 },
            killAmount: 8,
            position: [2171, -914, -457]
        },
        captain1: {
            levelMin: 135,
            levelMax: 140,
            targetMob: "Captain 1",
            realMob: "Cave Golem",
            mob: { rank: 2 },
            killAmount: 6,
            position: [2211, -912, -452]
        },
        captain2: {
            levelMin: 140,
            levelMax: 145,
            targetMob: "Captain 2",
            realMob: "Cave Golem",
            mob: { rank: 2 },
            killAmount: 6,
            position: [2231, -915, -480]
        },
        admiral: { 
            levelMin: 145,
            levelMax: 150,
            targetMob: "Admiral", 
            realMob: "Frost Golem",
            mob: { rank: 3 },
            killAmount: 1,
            position: [2088, -907, -569]
        },
    }
};

/* PLAYER QUEST STATE */
export const playerQuest = {};
export const questProgress = {};

/* TEAM RESOLUTION HELPERS */
function resolveField(field, team) {
    if (field && typeof field === "object" && !Array.isArray(field)) {
        const v = field[team];
        return v !== undefined ? v : field.DEFAULT;
    }
    return field;
}

function normalizeTargetMob(target) {
    if (Array.isArray(target)) return target;
    if (target === undefined || target === null) return [];
    return [target];
}

export function resolveQuest(quest, team) {
    const teamKey = team || "DEFAULT";
    return {
        ...quest,
        id: quest.id || Object.keys(quests).find(island => quests[island][quest.id]),
        island: quest.island || Object.keys(quests).find(island => quests[island][quest.id]),
        targetMob: normalizeTargetMob(resolveField(quest.targetMob, teamKey)),
        position: resolveField(quest.position, teamKey)
    };
}

/* MESSAGES AUTOMATIQUES */
function questMessage(quest, resolved) {
    const count = Math.max(1, quest.killAmount || 1);
    const targets = (resolved && resolved.targetMob && resolved.targetMob.length)
        ? resolved.targetMob : [quest.realMob || "Mob"];
    const name = targets[0];

    const n = count > 1 ? count + " " : "";
    return {
        start: "⚔️ Eliminate " + n + name + "!",
        complete: "🎉 " + (count > 1 ? count + " " : "") + name + " defeated!"
    };
}

/* SPAWN AU POINT DE QUÊTE LE PLUS PROCHE */
function pickNearestSpawnPoint(playerId, positionField) {
    const points = [];
    if (Array.isArray(positionField)) {
        points.push(positionField);
    } else if (positionField && typeof positionField === "object") {
        for (const k in positionField) {
            if (Array.isArray(positionField[k])) points.push(positionField[k]);
        }
    }
    if (!points.length) return null;
    if (points.length === 1) return points[0];

    let pp = null;
    try { pp = api.getPosition(playerId); } catch (e) {}

    let best = points[0], bestD = Infinity;
    for (const p of points) {
        const d = Math.abs(p[0] - pp[0]) + Math.abs(p[1] - pp[1]) + Math.abs(p[2] - pp[2]);
        if (d < bestD) { bestD = d; best = p; }
    }
    return best;
}

/* NOMBRE DE MOBS SPAWN AUTOMATIQUE */
function autoSpawnAmount(rank) {
    if (rank >= 3) return 1;
    if (rank === 2) return 2;
    return 2 + Math.floor(Math.random() * 3);
}

/* GET QUEST BY LEVEL */
export function getQuestForLevel(level) {
    for (const islandName in quests) {
        const islandQuests = quests[islandName];
        for (const questId in islandQuests) {
            const quest = islandQuests[questId];
            if (level >= quest.levelMin && level <= quest.levelMax) {
                return { ...quest, id: questId, island: islandName };
            }
        }
    }
    return null;
}

/* GET QUEST BY ID (recherche dans toutes les îles) */
export function getQuestById(questId) {
    if (!questId) return null;
    for (const islandName in quests) {
        if (quests[islandName][questId]) {
            return { ...quests[islandName][questId], id: questId, island: islandName };
        }
    }
    return null;
}

function getPlayerTeam(playerId) {
    return getStat(playerId, "team", "DEFAULT");
}

/* SPAWN QUEST MOBS — "spawnMob(questId)" */
spawnQuestMob = (playerId, questId) => {
    const quest = getQuestById(questId) || getQuestForLevel(getStat(playerId, "lvl", 1));
    if (!quest) {
        api.sendMessage(playerId, [
            { str: "❌ Unknown quest / no quest for your level", style: { color: "#ff4444" } }
        ]);
        return false;
    }

    const team = getPlayerTeam(playerId);
    const resolved = resolveQuest(quest, team);

    const spawnPos = pickNearestSpawnPoint(playerId, quest.position);
    if (!spawnPos) return false;

    const rank = Math.min(3, Math.max(1, (quest.mob && quest.mob.rank) || 1));
    const level = Math.max(1, quest.levelMin || 1);
    const amount = autoSpawnAmount(rank);

    const name = (resolved.targetMob && resolved.targetMob.length)
        ? resolved.targetMob[0]
        : quest.realMob;

    return spawnEnemy(playerId, spawnPos, quest.realMob, name, amount, level, rank);
}

/* CHECK QUEST VALIDITY (auto-complete si trop fort) */
export function checkQuestValidity(playerId) {
    const quest = playerQuest[playerId];
    if (!quest) return false;

    const playerLevel = getStat(playerId, "lvl", 1);
    if (playerLevel > quest.levelMax) {
        completeQuest(playerId);
        startQuest(playerId);
        return true;
    }
    return false;
}

/* START / REPLACE QUEST */
export function startQuest(playerId) {
    const lvl = getStat(playerId, "lvl", 1);
    const quest = getQuestForLevel(lvl);

    if (!quest) {
        api.sendMessage(playerId, [
            { str: "Woww... ❌ No quest available...", style: { color: "#ff4444" } }
        ]);
        return;
    }

    const team = getPlayerTeam(playerId);
    const resolved = resolveQuest(quest, team);
    const msg = questMessage(quest, resolved);

    playerQuest[playerId] = resolved;
    questProgress[playerId] = 0;
    saveQuest(playerId, resolved, 0);

    api.sendMessage(playerId, [
        { str: "📜 QUEST STARTED\n", style: { color: "#00BFFF", fontWeight: "bold" } },
        { str: msg.start, style: { color: "#FFFFFF" } }
    ]);

    api.setDirectionArrow(
        playerId,
        resolved.id,
        resolved.position,
        "📍 Quest Location",
        true,
        { color: "red", fontSize: "17px", fontWeight: "bold" }
    );

    updateSidebar(playerId);
}

/* RESTORE ON JOIN */
export function restorePlayerQuest(playerId) {
    delete playerQuest[playerId];
    delete questProgress[playerId];

    const qid = getStat(playerId, "questId", null);
    const savedProgress = getStat(playerId, "questProgress", 0);
    let restored = false;

    if (qid) {
        let quest = getQuestById(qid);

        if (quest) {
            const team = getPlayerTeam(playerId);
            const resolved = resolveQuest(quest, team);

            playerQuest[playerId] = resolved;
            questProgress[playerId] = savedProgress;

            api.setDirectionArrow(
                playerId,
                resolved.id,
                resolved.position,
                "📍 Quest Location",
                true,
                { color: "red", fontSize: "17px", fontWeight: "bold" }
            );

            const label = resolved.targetMob.join(" / ");
            api.sendMessage(playerId, [
                { str: "📜 Quest restored!\n", style: { color: "#00BFFF" } },
                { str: label + " (" + savedProgress + "/" + quest.killAmount + ")", style: { color: "#FFFFFF" } }
            ]);
            restored = true;
        } else {
            deleteStat(playerId, "questId");
            deleteStat(playerId, "questProgress");
        }
    }

    updateSidebar(playerId);
    return restored;
}

export function clearQuestMemory(playerId) {
    delete playerQuest[playerId];
    delete questProgress[playerId];
}

/* QUEST PROGRESS */
export function onQuestKill(playerId, mobName) {
    if (!mobName) return;

    if (!playerQuest[playerId]) {
        restorePlayerQuest(playerId);
    }

    const quest = playerQuest[playerId];
    if (!quest) return;

    if (!quest.targetMob.includes(mobName)) return;

    questProgress[playerId]++;
    saveQuest(playerId, quest, questProgress[playerId]);

    const progress = questProgress[playerId];
    const targetLabel = quest.targetMob.join(" / ");

    api.sendMessage(playerId, [
        { str: "☠️ " + progress + "/" + quest.killAmount + " ", style: { color: "#AAAAAA" } },
        { str: targetLabel + " defeated", style: { color: "#00FFAA" } }
    ]);

    const playerLevel = getStat(playerId, "lvl", 1);
    if (playerLevel > quest.levelMax) {
        completeQuest(playerId);
        startQuest(playerId);
        return;
    }

    if (progress >= quest.killAmount) {
        completeQuest(playerId);
    }
}

/* COMPLETE QUEST */
function completeQuest(playerId) {
    const quest = playerQuest[playerId];
    if (!quest) return;

    const rank = Math.min(3, Math.max(1, (quest.mob && quest.mob.rank) || 1));
    const reward = computeQuestReward(quest.killAmount, quest.levelMin, rank);

    addXP(playerId, reward.xp);
    changeMoney(playerId, reward.money);

    const msg = questMessage(quest, quest);

    api.sendMessage(playerId, [
        { str: "🏆 QUEST COMPLETE!\n", style: { color: "#FFD700", fontWeight: "bold" } },
        { str: msg.complete, style: { color: "#FFFFFF" } },
        { str: "\nYou gained: ", style: { color: "#B3B3B3" } },
        { str: "+" + reward.money, style: { color: "#ECC727" } },
        { str: " Money\n", style: { color: "#ECC727" } },
        { str: "And ", style: { color: "#B3B3B3" } },
        { str: "+" + reward.xp, style: { color: "#2791EC" } },
        { str: " xp", style: { color: "#2791EC" } }
    ]);

    delete playerQuest[playerId];
    delete questProgress[playerId];
    saveQuest(playerId, null, 0);
    api.clearDirectionArrow(playerId, quest.id);
    updateSidebar(playerId);
}

/* DB SAVE / LOAD */
export function saveQuest(playerId, quest, progress) {
    quest ? setStat(playerId, "questId", quest.id) : deleteStat(playerId, "questId");
    setStat(playerId, "questProgress", progress || 0);
}

export function loadQuest(playerId) {
    return {
        id: getStat(playerId, "questId", null),
        progress: getStat(playerId, "questProgress", 0)
    };
}

/* RESET / CANCEL */
export function resetQuest(playerId) {
    const quest = playerQuest[playerId];
    const qid = quest ? quest.id : null;

    delete playerQuest[playerId];
    delete questProgress[playerId];

    deleteStat(playerId, "questId");
    deleteStat(playerId, "questProgress");

    if (qid) {
        try { api.clearDirectionArrow(playerId, qid); } catch (e) {}
    }

    api.sendMessage(playerId, [
        { str: "❌ Quest cancelled", style: { color: "#ff4444", fontWeight: "bold" } }
    ]);
    updateSidebar(playerId);
}
