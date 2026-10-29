// UI.js

import { addStat, getStat, setStat, xpToNext } from "../utils/data";
import { playerQuest, questProgress } from "../gameplay/quest";
import { getCrewName } from "./team";
import { getFruit } from "../fruit/index";
import { getFightingStyle, getFightingStyleInfo } from "../gameplay/fightingStyles";
import { getMaxStamina, getStamina } from "../gameplay/stamina";
import { isVanished } from "./admin";
import { C, fit, measure } from "./theme";

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

/* --- Sidebar -------------------------------------------------------------
   Le TEXTE de la sidebar est court ; ce qui pese, c'est le stylage : chaque
   partie {str|icon, style} coute 40 a 80 caracteres de JSON, et Bloxd refuse
   un textStyling trop gros (« InternalError: Argument too large », qui remonte
   en « World code tick: ... »). Regles appliquees ici :
     - une seule couleur par partie, fontSize reserve au titre ;
     - segments de meme style fusionnes, lignes regroupees (moins de parties) ;
     - les textes libres (fruit, style, cible de quete) sont bornes ;
     - si ca depasse quand meme SIDEBAR_BUDGET, on retire les blocs
       secondaires en commencant par le moins utile, JAMAIS tout le message.
   La sidebar ne doit JAMAIS faire planter le tick. */

const SIDEBAR_BUDGET = 1200;

/* Coupe un texte libre trop long (nom de fruit, d'ile, liste de cibles). */
function short(text, max){
    const str = String(text === undefined || text === null ? "" : text);
    return str.length > max ? str.slice(0, Math.max(1, max - 1)) + "~" : str;
}

function drawSidebar(playerId){
    const money = getStat(playerId, "money", 0);
    const lvl = getStat(playerId, "lvl", 1);
    const xp = getStat(playerId, "xp", 0);
    const sp = getStat(playerId, "sp", 0);
    const fruit = short(getFruit(playerId) || "No fruit", 20);
    const styleName = getFightingStyle(playerId);
    const styleInfo = getFightingStyleInfo(styleName);
    const styleLabel = short(styleName || "No style", 18);
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

    /* Blocs dans l'ordre d'affichage. `optional` = peut etre retire sous
       pression du budget ; `priority` = ordre de sacrifice (petit = garde). */
    const blocks = [];
    const block = (parts, optional, priority) => {
        if (parts && parts.length) blocks.push({ parts: parts, optional: !!optional, priority: priority || 9 });
    };

    block([
        { icon: "fa-solid fa-skull", style: { color: C.PIRATE } },
        { str: " BLOCK PIRATES\n", style: { color: C.MARINE, fontWeight: "bold", fontSize: title } },
    ]);
    block([
        { icon: "fa-solid fa-coins", style: { color: C.MONEY } },
        { str: " " + money + "\n", style: { color: C.MONEY } },
    ]);
    block([
        { icon: "Hunger", style: { color: C.PIRATE } },
        { str: " " + fruit + "\n", style: { color: C.PIRATE } },
    ]);
    block([
        { icon: "fa-solid fa-hand-fist", style: { color: styleColor } },
        { str: " " + styleLabel + "\n", style: { color: styleColor } },
    ]);
    block([
        { icon: "fa-solid fa-angle-double-up", style: { color: C.MONEY } },
        { str: " LVL " + lvl + "\n", style: { color: C.MONEY } },
    ]);
    block([
        { str: "XP " + xp + "/" + xpNeeded + "  " + xpData.percent + "%\n", style: { color: C.XP } },
        { str: xpData.bar + "\n\n", style: { color: C.XP } },
    ], true, 2);
    block([
        { icon: "fa-solid fa-bolt", style: { color: C.XP } },
        { str: " " + Math.round(stSafe) + "/" + Math.round(stMaxSafe) + "  " + stData.percent + "%\n", style: { color: C.XP } },
        { str: stData.bar + "\n\n", style: { color: C.XP } },
    ], true, 3);
    block([
        { icon: "fa-solid fa-star", style: { color: C.SUCCESS } },
        { str: " Stat Points " + sp + "\n\n", style: { color: C.SUCCESS } },
    ], true, 4);

    if (quest) {
        const targetText = short(Array.isArray(quest.targetMob) ? quest.targetMob.join(" / ") : quest.targetMob, 26);
        const percent = quest.killAmount > 0 ? Math.floor((progress / quest.killAmount) * 100) : 0;
        block([
            { icon: "fa-solid fa-globe", style: { color: C.MARINE } },
            { str: " QUEST " + targetText + "\n", style: { color: C.MARINE } },
            { str: progress + "/" + quest.killAmount + " (" + percent + "%) " + short(quest.island, 18) + "\n\n", style: { color: C.INFO } },
        ], true, 1);
    } else {
        block([
            { icon: "fa-solid fa-globe", style: { color: C.MARINE } },
            { str: " QUEST  no active quest\n\n", style: { color: C.INFO } },
        ], true, 8);
    }

    /* Budget : les blocs obligatoires passent toujours, puis les secondaires
       sont ajoutes du plus utile au moins utile tant que ca tient, et
       reassembles dans l'ordre d'affichage. */
    const kept = [];
    for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        if (b.optional) continue;
        for (let j = 0; j < b.parts.length; j++) kept.push(b.parts[j]);
    }
    const optional = blocks.filter((b) => b.optional).sort((a, b) => a.priority - b.priority);
    for (let i = 0; i < optional.length; i++) {
        const trial = kept.concat(optional[i].parts);
        if (measure(trial) > SIDEBAR_BUDGET) continue;
        optional[i].keptUnderBudget = true;
    }

    const parts = [];
    for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        if (b.optional && !b.keptUnderBudget) continue;
        for (let j = 0; j < b.parts.length; j++) parts.push(b.parts[j]);
    }

    try {
        api.setClientOption(playerId, "RightInfoText", fit(parts, SIDEBAR_BUDGET));
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
        PIRATES: C.PIRATE,
        MARINES: C.MARINE,
        REVOLUTIONARIES: C.SUCCESS,
        NONE: C.INFO
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
        { content: [{ str: ["discord.", "gg", "/",dCode].join(""), style: { color: C.INFO } }], showBackground: true },
        { content: [{ icon: "fa-solid fa-discord", style: { color: C.MARINE } }, { str: " Join Now! ", style: { color: C.MONEY, fontWeight: "bold" } }], showBackground: false }
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
