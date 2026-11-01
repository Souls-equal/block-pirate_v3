// UI.js

import { addStat, confirmAction, getStat, setStat, xpToNext } from "../utils/data";
import { playerQuest, questProgress } from "../gameplay/quest";
import { getCrewName } from "./team";
import { getFruit } from "../fruit/index";
import { getFightingStyle, getFightingStyleInfo } from "../gameplay/fightingStyles";
import { getMaxStamina, getStamina } from "../gameplay/stamina";
import { ISLAND_WARPS, isVanished } from "./admin";
import { isPvPProtectionEnabled } from "../utils/combat";
import { getLastDamager } from "../utils/killAttribution";
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
        { icon: "fa-solid fa-skull", style: { color: C.MARINE, fontSize: title } },
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
        { content: [{ icon: "fa-solid fa-brands fa-discord", style: { color: C.MARINE } }, { str: " Join Now! ", style: { color: C.MONEY, fontWeight: "bold" } }], showBackground: false }
    ]);

    /* Les fleches d'iles ne sont plus reservees a un compte : elles sont
       posees, pour tout le monde, par la categorie Settings (voir plus bas). */
    try { setupSettingsShop(playerId); } catch (e) {}

    /* Confort du proprietaire du monde, sans effet sur le jeu (ni fleche, ni
       avantage en combat) : vol plus rapide et coordonnees affichees. */
    if (api.getEntityName(playerId) === "K4miNoK4mi") {
        try {
            api.setClientOptions(playerId, {
                "flySpeedMultiplier": 2,
                "hideCoordinates": false,
            });
        } catch (e) {}
    }
}

/* ==========================================================================
   SETTINGS (boutique, visible par TOUS)

   Trois reglages personnels, sans achat ni argent :

     1. Island Arrows — affiche ou masque les fleches qui pointent vers les
        iles. Les coordonnees sont EXACTEMENT celles des teleports du panneau
        admin (ISLAND_WARPS, core/admin.js) : un seul endroit a corriger si une
        ile bouge, et les deux fonctions restent d'accord.
     2. Respawn — tue le joueur pour le debloquer (coince dans un bloc, tombe
        hors de la map...). Refuse s'il vient de se faire frapper par un
        joueur : sinon c'est une sortie de combat gratuite.
     3. PvP Protection — la protection de 5 minutes accordee contre son tueur
        au respawn (voir utils/combat). Desactivable : plus de bouclier, et la
        protection deja active tombe immediatement.

   Reglages stockes en db JOUEUR (deux cles nouvelles, courtes) :
     "dirArrow" = 0  -> fleches d'iles masquees (defaut : affichees)
     "pvpProt"  = 0  -> protection automatique refusee (defaut : acceptee)
   ========================================================================== */

const SETTINGS_CATEGORY = "settings";
const SETTING_ARROW_COLOR = "#7DD3FC";
const SETTING_RESPAWN_COLOR = "#FFD166";
const SETTING_PROTECT_COLOR = "#4ADE80";

/* Identifiant stable d'une fleche : une ile = une fleche, donc la masquer ne
   touche jamais la fleche de quete (qui a son propre id). */
function islandArrowId(name) {
    return "isle-" + String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function settingOn(playerId, key, fallback) {
    let v = null;
    try { v = api.getPlayerDbValue(playerId, key); } catch (e) { return fallback; }
    if (v === undefined || v === null || v === "") return fallback;
    return !(v === 0 || v === "0" || v === false);
}

function settingSet(playerId, key, on) {
    try { api.setPlayerDbValue(playerId, key, on ? 1 : 0); return true; }
    catch (e) { return false; }
}

export function islandArrowsEnabled(playerId) {
    return settingOn(playerId, "dirArrow", true);
}

export function pvpProtectionEnabled(playerId) {
    return settingOn(playerId, "pvpProt", true);
}

/* Pose (ou efface) les fleches d'iles du joueur. Ne touche qu'a NOS ids. */
export function applyIslandArrows(playerId) {
    if (!playerId) return false;
    const on = islandArrowsEnabled(playerId);
    for (const name in ISLAND_WARPS) {
        const id = islandArrowId(name);
        try {
            if (on) api.setDirectionArrow(playerId, id, ISLAND_WARPS[name], name, false);
            else if (typeof api.clearDirectionArrow === "function") api.clearDirectionArrow(playerId, id);
        } catch (e) {}
    }
    return on;
}

function settingsSay(playerId, parts) {
    try { say(playerId, parts); } catch (e) {}
}

/* Recree les trois items : c'est ce qui met a jour l'etat affiche (ON/OFF). */
function createSettingsItems(playerId) {
    const arrows = islandArrowsEnabled(playerId);
    const protect = pvpProtectionEnabled(playerId);
    try {
        api.createShopItemForPlayer(playerId, SETTINGS_CATEGORY, "set_arrows", {
            image: "Compass",
            imageColour: SETTING_ARROW_COLOR,
            canBuy: true,
            cost: 0,
            sortPriority: 30,
            customTitle: [{
                str: arrows ? "Island Arrows [ON]" : "Island Arrows [OFF]",
                style: { color: SETTING_ARROW_COLOR, fontWeight: "bold" },
            }],
            buyButtonText: [{ str: arrows ? "Hide" : "Show", style: { color: SETTING_ARROW_COLOR } }],
            description: [
                { icon: "fa-solid fa-map-marker-check", style: { color: SETTING_ARROW_COLOR } },
                " Arrows pointing to the islands.",
                arrows
                    ? { str: "\n● Showing ", style: { color: "#4ADE80", fontWeight: "bold" } }
                    : { str: "\n● Hidden ", style: { color: "#888888", fontWeight: "bold" } },
                { str: (arrows ? "all " : "") + "islands — click to " + (arrows ? "hide" : "show") + ".", style: { color: "#94A3B8" } },
            ],
        });
    } catch (e) {}

    try {
        api.createShopItemForPlayer(playerId, SETTINGS_CATEGORY, "set_respawn", {
            image: "Ender Pearl",
            imageColour: SETTING_RESPAWN_COLOR,
            canBuy: true,
            cost: 0,
            sortPriority: 20,
            customTitle: [{ str: "Respawn", style: { color: SETTING_RESPAWN_COLOR, fontWeight: "bold" } }],
            buyButtonText: [{ str: "Respawn", style: { color: SETTING_RESPAWN_COLOR } }],
            description: [
                { icon: "fa-solid fa-user-clock", style: { color: SETTING_RESPAWN_COLOR } },
                " Kill yourself and respawn.",
                { str: "\nStuck in a block, under the map, in a wall?", style: { color: "#CBD5E1" } },
                { str: "\nClick two time to respawn.", style: { color: "#313D50" } },
            ],
        });
    } catch (e) {}

    try {
        api.createShopItemForPlayer(playerId, SETTINGS_CATEGORY, "set_protect", {
            image: "Shield Potion",
            imageColour: SETTING_PROTECT_COLOR,
            canBuy: true,
            cost: 0,
            sortPriority: 10,
            customTitle: [{
                str: protect ? "PvP Protection [ON]" : "PvP Protection [OFF]",
                style: { color: SETTING_PROTECT_COLOR, fontWeight: "bold" },
            }],
            buyButtonText: [{ str: protect ? "Disable" : "Enable", style: { color: SETTING_PROTECT_COLOR } }],
            description: [
                { icon: "fa-solid fa-shield-halved", style: { color: SETTING_PROTECT_COLOR } },
                " The shield you get after being killed by a player.",
                protect
                    ? { str: "\n● ON ", style: { color: "#4ADE80", fontWeight: "bold" } }
                    : { str: "\n● OFF ", style: { color: "#888888", fontWeight: "bold" } },
                { str: protect
                    ? "— 5 minutes during which your killer cannot hit you. It drops if you attack them."
                    : "— you accept every hit again, killer included.", style: { color: "#94A3B8" } },
                { str: "\nYour choice, nothing is bought.", style: { color: "#888888" } },
            ],
        });
    } catch (e) {}
}

/* Cree la categorie et ses items. Appele au join, pour tout le monde. */
export function setupSettingsShop(playerId) {
    if (!playerId) return false;
    try {
        api.configureShopCategoryForPlayer(playerId, SETTINGS_CATEGORY, {
            customTitle: "Settings",
            autoSelectCategory: false,
            sortPriority: 190,
        });
    } catch (e) {}
    createSettingsItems(playerId);
    applyIslandArrows(playerId);
    return true;
}

function toggleIslandArrows(playerId) {
    const want = !islandArrowsEnabled(playerId);
    settingSet(playerId, "dirArrow", want);
    createSettingsItems(playerId);
    applyIslandArrows(playerId);
    settingsSay(playerId, [
        { icon: "fa-solid fa-map-marker-check", style: { color: SETTING_ARROW_COLOR } },
        { str: want ? " Island arrows shown." : " Island arrows hidden.", style: { color: SETTING_ARROW_COLOR, fontWeight: "bold" } },
    ]);
}

function togglePvPProtection(playerId) {
    const want = !pvpProtectionEnabled(playerId);
    settingSet(playerId, "pvpProt", want);
    createSettingsItems(playerId);
    settingsSay(playerId, [
        { icon: "fa-solid fa-shield-halved", style: { color: SETTING_PROTECT_COLOR } },
        { str: want ? " PvP protection enabled." : " PvP protection disabled.", style: { color: SETTING_PROTECT_COLOR, fontWeight: "bold" } },
        { str: want
            ? " You get 5 minutes against your killer when you respawn."
            : " You accept every hit, killer included.", style: { color: "#94A3B8" } },
    ]);
}

/* Debloque un joueur coince en le tuant. Anti-abus : refus si un joueur
   l'a frappe dans les 10 dernieres secondes (sinon c'est une fuite de combat). */
function settingsRespawn(playerId) {
    let last = null;
    try { last = getLastDamager(playerId); } catch (e) { last = null; }
    if (last && last.killerId && Date.now() - last.at < 10000) {
        let attackerIsPlayer = false;
        try {
            attackerIsPlayer = (api.getPlayerIds() || []).indexOf(last.killerId) !== -1;
        } catch (e) {}
        if (attackerIsPlayer) {
            settingsSay(playerId, [
                { icon: "fa-solid fa-triangle-exclamation", style: { color: "#EF4444" } },
                { str: " You are in a fight: no respawn right now.", style: { color: "#EF4444", fontWeight: "bold" } },
            ]);
            return;
        }
    }

    if (!confirmAction(playerId, "respawn", [
        { icon: "fa-solid fa-user-clock", style: { color: SETTING_RESPAWN_COLOR } },
        { str: " Respawn now? ", style: { color: "#CBD5E1" } },
        { str: "You will die", style: { color: "#EF4444", fontWeight: "bold" } },
        { str: " and come back at your spawn.", style: { color: "#CBD5E1" } },
    ])) return;

    let killed = false;
    try {
        if (typeof api.killLifeform === "function") { api.killLifeform(playerId); killed = true; }
    } catch (e) {}
    if (!killed) { try { api.setHealth(playerId, 0, undefined, true); killed = true; } catch (e) {} }
    if (!killed) { try { api.applyHealthChange(playerId, -99999, undefined, true); killed = true; } catch (e) {} }

    if (!killed) {
        settingsSay(playerId, [
            { icon: "fa-solid fa-circle-xmark", style: { color: "#EF4444" } },
            { str: " Respawn failed. Try again in a moment.", style: { color: "#EF4444", fontWeight: "bold" } },
        ]);
        return;
    }
    settingsSay(playerId, [
        { icon: "fa-solid fa-user-clock", style: { color: SETTING_RESPAWN_COLOR } },
        { str: " Respawning…", style: { color: SETTING_RESPAWN_COLOR, fontWeight: "bold" } },
    ]);
}

/* Point d'entree unique, branche sur onPlayerBoughtShopItem (index.js). */
export function handleSettingsShop(playerId, categoryKey, itemKey, item, userInput) {
    if (categoryKey !== SETTINGS_CATEGORY) return false;
    if (!playerId || !itemKey) return false;
    switch (itemKey) {
        case "set_arrows": toggleIslandArrows(playerId); return true;
        case "set_respawn": settingsRespawn(playerId); return true;
        case "set_protect": togglePvPProtection(playerId); return true;
        case "set_info": createSettingsItems(playerId); return true;
        default: return false;
    }
}

/* Deconnexion : on efface nos fleches (l'API le recommande) sans toucher a
   celles des quetes, qui ont leurs propres ids. */
export function settingsLeave(playerId) {
    if (!playerId) return false;
    for (const name in ISLAND_WARPS) {
        try {
            if (typeof api.clearDirectionArrow === "function") api.clearDirectionArrow(playerId, islandArrowId(name));
        } catch (e) {}
    }
    return true;
}
