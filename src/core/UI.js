// UI.js

import { addStat, getStat, setStat, xpToNext } from "../utils/data";
import { playerQuest, questProgress } from "../gameplay/quest";
import { getCrewName } from "./team";
import { getFruit } from "../fruit/index";
import { getFightingStyle, getFightingStyleInfo } from "../gameplay/fightingStyles";
import { getMaxStamina, getStamina } from "../gameplay/stamina";
import { isVanished } from "./admin";

export const dCode = "7WGjmPHZrS"

function makeBar(value, max, size = 18){
    if (!Number.isFinite(value)) value = 0;
    if (!Number.isFinite(max) || max <= 0) max = 1;

    let filled = Math.floor((value / max) * size);
    filled = Math.max(0, Math.min(size, filled));

    let bar = "";

    for(let i = 0; i < size; i++){
        bar += i < filled ? "█" : "▒";
    }

    let percent = Math.floor((value / max) * 100);

    return {
        bar: bar,
        percent: percent
    };
}

function makeXpBar(xp, xpNeeded, size = 18){
    return makeBar(xp, xpNeeded, size);
}

const title = "1.9em", title2 = "1.5em", text = "1.1em";
const border = "lightgray"

export function updateSidebar(playerId){
    if (!playerId) return;
    updateLeaderboard(playerId)
    drawSidebar(playerId)
}

export function updateSidebarLight(playerId){
    drawSidebar(playerId)
}

function drawSidebar(playerId){
    const money = getStat(playerId, "money", 0);
    const lvl = getStat(playerId, "lvl", 1);
    const xp = getStat(playerId, "xp", 0);
    const sp = getStat(playerId, "sp", 0);
    const fruit = getFruit(playerId) || "No fruit";
    const styleName = getFightingStyle(playerId);
    const styleInfo = getFightingStyleInfo(styleName);
    const styleLabel = styleName || "No style";
    const styleColor = (styleInfo && styleInfo.color) || "#94a3b8";
    const xpNeeded = xpToNext(lvl);

    const xpData = makeXpBar(xp, xpNeeded);

    const stValue = getStamina(playerId);
    const stMax = getMaxStamina(playerId);
    const stSafe = Number.isFinite(stValue) ? stValue : 0;
    const stMaxSafe = Number.isFinite(stMax) && stMax > 0 ? stMax : 100;
    const stData = Object.assign(makeBar(stSafe, stMaxSafe), { value: stSafe, max: stMaxSafe });

    const quest = playerQuest[playerId];
    const progress = questProgress[playerId] || 0;

    let questLines = [];

    if (quest) {
        const targetText = Array.isArray(quest.targetMob)
            ? quest.targetMob.join(" / ")
            : quest.targetMob;
        const percent = Math.floor((progress / quest.killAmount) * 100);
        questLines = [
            { icon: "fa-solid fa-globe", style: { color: "#00BFFF", fontSize: title2 } },
            { str: " QUEST\n", style: { color: "#00BFFF", fontWeight: "bold", fontSize: title2 } },
            { str: targetText + "\n", style: { color: "#FFFFFF", fontWeight: "bold", fontSize:text } },
            { str: progress + "/" + quest.killAmount + " ", style: { color: "#AAAAAA", fontSize:text  } },
            { str: "(" + percent + "%)\n", style: { color: "#00FFFF", fontWeight: "bold", fontSize:text  } },
            { str: quest.island + "\n\n", style: { color: "#888888", fontSize:text  } }
        ];
    } else {
        questLines = [
            { icon: "fa-solid fa-globe", style: { color: "#00BFFF", fontSize: title2 } },
            { str: " QUEST\n", style: { color: "#00BFFF", fontWeight: "bold", fontSize: title2 } },
            { str: "No active quest\n\n", style: { color: "#AAAAAA", fontSize:text  } }
        ];
    }
    const sidebarText = [
        { str: "╔ BLOCK PIRATES ╗\n", style: { color: "#00BFFF", fontWeight: "bold", fontSize: title } },

        /* MONEY */
        { icon: "fa-solid fa-coins", style: { color: "#FFD700", fontSize: title2 } },
        { str: money + "\n", style: { color: "#FFD700", fontSize:title2  } },

        /* FRUIT */
        { icon:"Hunger", style:{ fontSize: title2, fontWeight: "bold" } },
        { str: fruit + "\n", style: { color: "#E84759", fontWeight: "bold", fontSize:title2  } },

        /* FIGHTING STYLE */
        { icon: "fa-solid fa-hand-fist", style: { color: styleColor, fontSize: title2 } },
        { str: " " + styleLabel + "\n\n", style: { color: styleColor, fontWeight: "bold", fontSize: title2 } },

        /* LEVEL */
        { icon: "fa-solid fa-angle-double-up", style: { color: "#FF8C00", fontSize: title2} },
        { str: " LVL: ", style: { color: "#FF8C00", fontWeight: "bold", fontSize: title2 } },
        { str: lvl + "\n", style: { color: "#FFFFFF", fontWeight: "bold", fontSize:title2  } },

        /* XP TEXT */
        { str: "XP: ", style: { color: "#AAAAAA", fontSize:text } },
        { str: xp + "/" + xpNeeded + "\n", style: { color: "#AAAAAA", fontSize:text } },
        { str: xpData.bar + " " + xpData.percent + "%\n\n", style: { color: "#00FFFF", fontWeight: "bold", fontSize:text } },

        ...(function(){
            try {
                const v = Number.isFinite(stData.value) ? stData.value : 0;
                const m = Number.isFinite(stData.max) && stData.max > 0 ? stData.max : 100;
                return [
                { icon: "fa-solid fa-bolt", style: { color: "#aaddff", fontSize:text } },
                {str: " " + Math.round(v) + "/" + Math.round(m) + "\n"+ stData.bar + " " + stData.percent + "%\n\n",style: { color: "#aaddff", fontWeight: "bold", fontSize: text }}
                ];
            } catch (e) { return []; }
        })(),

        /* STAT POINTS */
        { icon: "fa-solid fa-star", style: { color: "#FFDD00", fontSize:text } },
        { str: " Stat Points\n", style: { color: "#AAAAAA", fontWeight: "bold", fontSize:text } },
        { str: sp + "\n\n", style: { color: "#FFFFFF", fontWeight: "bold", fontSize:text  } },

        ...questLines,

    ];
    try {
        api.setClientOption(playerId, "RightInfoText", sidebarText);
    } catch (e) {}
}

/* Prime d'un joueur (0 si absente ou illisible). */
function bountyOf(playerId){
    const n = Math.floor(Number(getStat(playerId, "bounty", 0)));
    return n > 0 ? n : 0;
}

/* SETUP TABLE STRUCTURE */
export function setupLeaderboard(playerId){
    try {
        api.setClientOption(playerId, "lobbyLeaderboardInfo", {
            name:  { displayName: "Name",  sortPriority: 11 },
            level: { displayName: "Level", sortPriority: 0 },
            xp:    { displayName: "XP %",  sortPriority: 2 },
            money: { displayName: "Money", sortPriority: 1 },
            bounty: { displayName: "Bounty", sortPriority: 3 },
            team:  { displayName: "Team",  sortPriority: 9 },
            crew:  { displayName: "Crew",  sortPriority: 10 },
        });
    } catch (e) {}
}

/* UPDATE PLAYER VALUES */
export function updateLeaderboard(playerId){

    const lvl = getStat(playerId, "lvl", 1);
    const money = getStat(playerId, "money", 0);
    const xp = getStat(playerId, "xp", 0);
    const crew = getCrewName(playerId) || "NONE";
    const team = getStat(playerId, "team", "NONE");
    /* Prime : lue directement en DB (pas d'import croise avec team.js,
       sinon un fichier non recopie casserait tout le module UI). */
    const bounty = bountyOf(playerId);
    const xpNeeded = xpToNext(lvl);
    const xpPercent = xpNeeded > 0 ? Math.floor((xp / xpNeeded) * 100) : 0;

    /* Un joueur qui vient de se déconnecter fait lever une ApiError : on
       l'ignore silencieusement pour ne jamais casser l'affichage des autres. */
    try {
        api.setTargetedPlayerSettingForEveryone(playerId, "lobbyLeaderboardValues", {
            level: lvl,
            money: money,
            xp: xpPercent,
            team: team,
            crew: crew,
            bounty: bounty,
        });
    } catch (e) {}
}

/* TEAM COLOR ON LEADERBOARD */
export function updateLeaderboardColor(playerId){

    const team = getStat(playerId, "team", "NONE");

    const colorMap = {
        PIRATES: "#ff6b6b",
        MARINES: "#6bb6ff",
        REVOLUTIONARIES: "#7cff7c",
        NONE: "#aaaaaa"
    };

    try {
        api.setTargetedPlayerSettingForEveryone(
            playerId,
            "colorInLobbyLeaderboard",
            colorMap[team] || "#aaaaaa"
        );
    } catch (e) {}
}

/* REFRESH SINGLE PLAYER */

export function refreshLeaderboardPlayer(playerId) {
    if (isVanished(playerId)) {
        try {
            api.setTargetedPlayerSettingForEveryone(playerId, "lobbyLeaderboardValues", {}, true);
            api.setTargetedPlayerSettingForEveryone(playerId, "colorInLobbyLeaderboard", "", true);
            api.setTargetedPlayerSettingForEveryone(playerId, "lobbyLeaderboardTags", null, true);
        } catch (e) {}
        return;
    }
    updateLeaderboard(playerId);
    updateLeaderboardColor(playerId);
}

/* REFRESH ALL PLAYERS (SORTED) */
export function refreshLeaderboardAll(){
    const players = api.getPlayerIds();
    const data = players.map(id => {
        const lvl = getStat(id, "lvl", 1);
        const money = getStat(id, "money", 0);
        const xp = getStat(id, "xp", 0);
        const xpNeeded = xpToNext(lvl);
        const xpPercent = xpNeeded > 0 ? Math.floor((xp / xpNeeded) * 100) : 0;
        const bounty = bountyOf(id);
        return {
            id,
            lvl,
            money,
            xp: xpPercent,
            bounty: bounty,
        }
    });
    /* SORT BY LEVEL (BLOX FRUITS STYLE) */
    data.sort((a, b) => b.lvl - a.lvl);
    for (let p of data){
        updateLeaderboard(p.id);
        updateLeaderboardColor(p.id);
    }
}

export function onPlayerJoinLeaderboard(playerId){
    setupLeaderboard(playerId);
    refreshLeaderboardPlayer(playerId);
}

export function joinUI(playerId) {
    api.setClientOption(playerId, "headerChips", [
        { content: [{ str: "Discord:", style: { color: "#5865F2", fontWeight: "bold" } }], showBackground: true },
        { content: [{ str: ["discord.", "gg", "/",dCode].join(""), style: { color: "#FFFFFF" } }], showBackground: true },
        { content: [{ str: " Join Now! ", style: { color: "#FFD700", fontWeight: "bold" } }], showBackground: false }
    ]);

    if (api.getEntityName(playerId)==="K4miNoK4mi") {
        api.setDirectionArrow(playerId, "pirate-village", [812, -906, 771], "Pirate Village", false)
        api.setDirectionArrow(playerId, "starter-pirate", [-5, -900, 33], "Starter Pirate", false)
        api.setDirectionArrow(playerId, "jungle", [1323, -906, 328], "Jungle", false)
        api.setDirectionArrow(playerId, "desert", [649, -914, 1789], "Desert", false)
        api.setDirectionArrow(playerId, "marine-starter", [885, -907, -275], "Marine Starter", true)
        api.setDirectionArrow(playerId, "mid", [633, -901, -205], "Middle Town", true)
        api.setDirectionArrow(playerId, "snow", [2499, -915, 663], "Snow Village", false)
        api.setClientOptions(playerId, {
            "flySpeedMultiplier": 2,
            "hideCoordinates": false,
        });
    }
}
