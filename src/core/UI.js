// UI.js

import { addStat, confirmAction, getStat, setStat, xpToNext } from "../utils/data";
import { playerQuest, questProgress } from "../gameplay/quest";
import { getCrewName } from "./team";
import { getFruit } from "../fruit/index";
import { getFightingStyle, getFightingStyleInfo } from "../gameplay/fightingStyles";
import { getMaxStamina, getStamina } from "../gameplay/stamina";
import { ISLAND_WARPS_BY_SEA, currentIslands, isVanished } from "./admin";
import { LOBBY, currentVariation, variationsSupported } from "../gameplay/variations";
import { isPvPProtectionEnabled } from "../utils/combat";
import { getLastDamager } from "../utils/killAttribution";
import { C, fit, measure, say } from "./theme";

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
   SETTINGS (boutique, visible par TOUS, SAUF dans le lobby)

   Reglages personnels, sans achat ni argent :

     1. Island Arrows — les iles de la MER ou l'on se trouve (core/admin.js :
        ISLAND_WARPS_BY_SEA), une fleche par ile, chacune de la couleur de son
        theme. Deux listes deroulantes font le menage a l'ecran :
           "Hide an island" ne propose QUE les iles affichees ;
           "Show an island" ne propose QUE les iles cachees.
        Valider deplace l'ile d'une liste vers l'autre, donc une ile ne peut
        jamais etre dans les deux (ni disparaitre des deux).
        L'item du haut est l'interrupteur general (tout montrer / tout cacher).
     2. Respawn — tue le joueur pour le debloquer (coince dans un bloc, tombe
        hors de la map...). Refuse s'il vient de se faire frapper par un
        joueur : sinon c'est une sortie de combat gratuite.
     3. PvP Protection — la protection de 5 minutes accordee contre son tueur
        au respawn (voir utils/combat). Desactivable : plus de bouclier, et la
        protection deja active tombe immediatement.

   PAS DE SETTINGS DANS LE LOBBY (variation "default") : il n'y a ni ile ni mer
   a y regler. Le jeu recharge le joueur a chaque saut de variation, donc un
   simple test au join suffit : dans une mer la categorie existe, dans le lobby
   elle n'existe pas (et nos fleches sont effacees au passage).

   Reglages stockes en db JOUEUR (trois cles nouvelles, courtes) :
     "dirArrow" = 0        -> plus aucune fleche d'ile (defaut : affichees)
     "arrowOff" = "JU,DE"  -> codes des iles masquees une par une
     "pvpProt"  = 0        -> protection automatique refusee (defaut : acceptee)
   ========================================================================== */

const SETTINGS_CATEGORY = "settings";
const SETTING_ARROW_COLOR = "#7DD3FC";
const SETTING_HIDE_COLOR = "#FCA5A5";
const SETTING_SHOW_COLOR = "#86EFAC";
const SETTING_RESPAWN_COLOR = "#FFD166";
const SETTING_PROTECT_COLOR = "#4ADE80";
/* Valeur affichee dans une liste vide : l'API veut au moins une option, et un
   libelle entre parentheses ne peut pas etre confondu avec une ile. */
const EMPTY_CHOICE = "(nothing left)";

/* Une couleur par ile, choisie sur son theme, et un code court qui sert de cle
   de reglage : deux iles ne doivent jamais partager un code, sinon cacher l'une
   cacherait l'autre. Toute ile ajoutee sans theme ici recoit ses initiales et
   le gris neutre (voir islandTheme) : elle marche quand meme. */
const ISLAND_STYLE = {
    "Starter Pirate":   { code: "SP", color: "#F0A35E" },  /* sable du depart */
    "Middle Town":      { code: "MT", color: "#9AA7B4" },  /* pierre de la ville */
    "Starter Marine":   { code: "SM", color: "#5AA9E6" },  /* uniforme marine */
    "Jungle":           { code: "JU", color: "#4CAF50" },  /* feuilles */
    "Pirate Village":   { code: "PV", color: "#C0392B" },  /* rouge pirate */
    "Desert":           { code: "DE", color: "#E5C15A" },  /* sable chaud */
    "Snow Village":     { code: "SV", color: "#A8E0F5" },  /* glace */
    "Marine Fortress":  { code: "MF", color: "#2F5FA8" },  /* bleu profond */
    "Skylands":         { code: "SK", color: "#B388E8" },  /* violet du ciel */
};

function islandTheme(name) {
    const style = ISLAND_STYLE[name];
    if (style) return style;
    const initials = String(name).split(/\s+/).map(function (w) { return w[0] || ""; }).join("").toUpperCase();
    return { code: (initials.slice(0, 2) || "IL"), color: "#94A3B8" };
}

/* Identifiant stable d'une fleche : une ile = une fleche, donc la masquer ne
   touche jamais la fleche de quete (qui a son propre id). */
function islandArrowId(name) {
    return "isle-" + String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/* Les iles de la mer courante. Une seule lecture par affichage : le lobby (ou
   une mer pas encore declaree) renvoie un objet vide, jamais null. */
function islandNames() {
    return Object.keys(currentIslands());
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

/* Iles masquees une par une : une seule cle db, une liste de codes courts.
   Lue une fois par affichage (pas une lecture de base par ile). */
function hiddenIslands(playerId) {
    const out = {};
    let v = null;
    try { v = api.getPlayerDbValue(playerId, "arrowOff"); } catch (e) { return out; }
    if (typeof v !== "string") return out;
    const codes = v.split(",");
    for (let i = 0; i < codes.length; i++) {
        const code = codes[i].trim().toUpperCase();
        if (code) out[code] = true;
    }
    return out;
}

/* On n'enregistre que les codes des iles de la mer courante : la liste reste
   courte, et une ile d'une autre mer ne peut pas s'y glisser. */
function saveHiddenIslands(playerId, hidden) {
    const list = [];
    for (const name in currentIslands()) {
        const code = islandTheme(name).code;
        if (hidden[code] && list.indexOf(code) === -1) list.push(code);
    }
    try { api.setPlayerDbValue(playerId, "arrowOff", list.join(",")); return true; }
    catch (e) { return false; }
}

export function islandArrowVisible(playerId, name) {
    if (!islandArrowsEnabled(playerId)) return false;
    return !hiddenIslands(playerId)[islandTheme(name).code];
}

/* Les deux listes du panneau : ce qui est affiche, ce qui est cache. */
function shownIslandNames(playerId) {
    const all = islandArrowsEnabled(playerId);
    const hidden = hiddenIslands(playerId);
    const out = [];
    for (const name of islandNames()) if (all && !hidden[islandTheme(name).code]) out.push(name);
    return out;
}

function hiddenIslandNames(playerId) {
    const shown = shownIslandNames(playerId);
    return islandNames().filter(function (name) { return shown.indexOf(name) === -1; });
}

/* Pose (ou efface) les fleches d'iles du joueur, avec la couleur de chaque ile.
   Ne touche qu'a NOS ids : la fleche de quete survit a tous les reglages. */
export function applyIslandArrows(playerId) {
    if (!playerId) return false;
    const all = islandArrowsEnabled(playerId);
    const hidden = hiddenIslands(playerId);
    for (const name in currentIslands()) {
        const id = islandArrowId(name);
        const theme = islandTheme(name);
        const on = all && !hidden[theme.code];
        try {
            if (on) {
                api.setDirectionArrow(playerId, id, currentIslands()[name], name, false, {
                    color: theme.color,
                    fontSize: "17px",
                    fontWeight: "bold",
                });
            } else if (typeof api.clearDirectionArrow === "function") {
                api.clearDirectionArrow(playerId, id);
            }
        } catch (e) {}
    }
    return all;
}

/* Efface nos fleches, dans TOUTES les mers declarees : un joueur qui change de
   variation ne doit pas laisser de fleche derriere lui. */
function clearIslandArrows(playerId) {
    if (!playerId || typeof api.clearDirectionArrow !== "function") return false;
    for (const sea in ISLAND_WARPS_BY_SEA) {
        for (const name in ISLAND_WARPS_BY_SEA[sea]) {
            try { api.clearDirectionArrow(playerId, islandArrowId(name)); } catch (e) {}
        }
    }
    return true;
}

/* Les Settings n'ont de sens que dans une mer. Sans le support des variations,
   le monde EST la mer (comportement d'avant les mers). */
export function settingsAvailableHere() {
    if (!variationsSupported()) return true;
    return currentVariation() !== LOBBY.variation;
}

function settingsSay(playerId, parts) {
    try { say(playerId, parts); } catch (e) {}
}

/* Recree les items : c'est ce qui met a jour l'etat affiche (compteur, titres,
   et surtout les options des deux listes deroulantes). */
function createSettingsItems(playerId) {
    const total = islandNames().length;
    const shown = shownIslandNames(playerId);
    const hidden = hiddenIslandNames(playerId);
    const all = islandArrowsEnabled(playerId);
    const protect = pvpProtectionEnabled(playerId);

    /* Interrupteur general. */
    try {
        api.createShopItemForPlayer(playerId, SETTINGS_CATEGORY, "set_arrows", {
            image: "Compass",
            imageColour: SETTING_ARROW_COLOR,
            canBuy: true,
            cost: 0,
            sortPriority: 50,
            customTitle: [{
                str: "Island Arrows [" + shown.length + "/" + total + "]",
                style: { color: SETTING_ARROW_COLOR, fontWeight: "bold" },
            }],
            buyButtonText: [{ str: all ? "Hide all" : "Show all", style: { color: SETTING_ARROW_COLOR } }],
            description: [
                { icon: "fa-solid fa-map-marker-check", style: { color: SETTING_ARROW_COLOR } },
                " One arrow per island, each in its own colour.",
                shown.length > 0
                    ? { str: "\n● " + shown.length, style: { color: "#4ADE80", fontWeight: "bold" } }
                    : { str: "\n● 0", style: { color: "#888888", fontWeight: "bold" } },
                { str: " of " + total + " islands shown.", style: { color: "#94A3B8" } },
                { str: "\nPick the islands you need below.", style: { color: "#CBD5E1" } },
            ],
        });
    } catch (e) {}

    /* Masquer : ne propose que ce qui est affiche. */
    try {
        api.createShopItemForPlayer(playerId, SETTINGS_CATEGORY, "set_arrows_hide", {
            image: "Compass",
            imageColour: SETTING_HIDE_COLOR,
            canBuy: true,
            cost: 0,
            sortPriority: 48,
            customTitle: [{ str: "Hide an island", style: { color: SETTING_HIDE_COLOR, fontWeight: "bold" } }],
            buyButtonText: [{ str: "Hide", style: { color: SETTING_HIDE_COLOR } }],
            userInput: { type: "dropdown", dropdownOptions: shown.length ? shown : [EMPTY_CHOICE] },
            description: [
                { icon: "fa-solid fa-eye-slash", style: { color: SETTING_HIDE_COLOR } },
                " Remove one arrow from your screen.",
                { str: "\nShown now: ", style: { color: "#94A3B8" } },
                { str: shown.length ? shown.join(", ") : "nothing", style: { color: SETTING_SHOW_COLOR } },
                { str: "\nThe island moves to the other list.", style: { color: "#888888" } },
            ],
        });
    } catch (e) {}

    /* Montrer : ne propose que ce qui est cache. */
    try {
        api.createShopItemForPlayer(playerId, SETTINGS_CATEGORY, "set_arrows_show", {
            image: "Compass",
            imageColour: SETTING_SHOW_COLOR,
            canBuy: true,
            cost: 0,
            sortPriority: 47,
            customTitle: [{ str: "Show an island", style: { color: SETTING_SHOW_COLOR, fontWeight: "bold" } }],
            buyButtonText: [{ str: "Show", style: { color: SETTING_SHOW_COLOR } }],
            userInput: { type: "dropdown", dropdownOptions: hidden.length ? hidden : [EMPTY_CHOICE] },
            description: [
                { icon: "fa-solid fa-eye", style: { color: SETTING_SHOW_COLOR } },
                " Bring one arrow back.",
                { str: "\nHidden now: ", style: { color: "#94A3B8" } },
                { str: hidden.length ? hidden.join(", ") : "nothing", style: { color: SETTING_HIDE_COLOR } },
                { str: "\nThe island moves to the other list.", style: { color: "#888888" } },
            ],
        });
    } catch (e) {}

    try {
        api.createShopItemForPlayer(playerId, SETTINGS_CATEGORY, "set_respawn", {
            image: "Moonstone Orb",
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
            ],
        });
    } catch (e) {}
}

/* Cree la categorie et ses items. Appele au join : dans une mer seulement. */
export function setupSettingsShop(playerId) {
    if (!playerId) return false;
    if (!settingsAvailableHere()) {
        /* Lobby : rien a regler, et on ne laisse pas trainer de fleches d'une
           mer precedente. */
        clearIslandArrows(playerId);
        return false;
    }
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

/* « Tout montrer / tout cacher ». Tout montrer efface aussi les exceptions
   individuelles : l'interrupteur general doit vraiment tout rallumer. */
function toggleIslandArrows(playerId) {
    const want = !islandArrowsEnabled(playerId);
    settingSet(playerId, "dirArrow", want);
    if (want) saveHiddenIslands(playerId, {});
    createSettingsItems(playerId);
    applyIslandArrows(playerId);
    settingsSay(playerId, [
        { icon: "fa-solid fa-map-marker-check", style: { color: SETTING_ARROW_COLOR } },
        { str: want ? " All island arrows shown." : " All island arrows hidden.", style: { color: SETTING_ARROW_COLOR, fontWeight: "bold" } },
    ]);
}

/* Le nom choisi dans une liste. Insensible a la casse, mais jamais devine :
   une valeur inconnue (ou la ligne "(nothing left)") renvoie null. */
function resolveIslandName(input) {
    const raw = String(input == null ? "" : input).trim();
    if (!raw) return null;
    const islands = currentIslands();
    if (islands[raw]) return raw;
    const lower = raw.toLowerCase();
    for (const name in islands) if (name.toLowerCase() === lower) return name;
    return null;
}

/* Une ile a la fois. Cas utile : tout est cache et on veut UNE ile — on ne
   rallume qu'elle, les autres restent masquees (pas besoin de huit clics). */
function setIslandShown(playerId, name, want) {
    const theme = islandTheme(name);
    const all = islandArrowsEnabled(playerId);
    const hidden = hiddenIslands(playerId);
    const isShown = all && !hidden[theme.code];

    if (isShown === want) {
        settingsSay(playerId, [
            { icon: "fa-solid fa-circle-info", style: { color: "#94A3B8" } },
            { str: " " + name + (want ? " is already shown." : " is already hidden."), style: { color: "#94A3B8" } },
        ]);
        return false;
    }

    let onlyOne = false;
    if (!want) {
        hidden[theme.code] = true;
        saveHiddenIslands(playerId, hidden);
    } else {
        if (!all) {
            for (const other of islandNames()) {
                if (other !== name) hidden[islandTheme(other).code] = true;
            }
            settingSet(playerId, "dirArrow", true);
            onlyOne = true;
        }
        delete hidden[theme.code];
        saveHiddenIslands(playerId, hidden);
    }

    createSettingsItems(playerId);
    applyIslandArrows(playerId);
    settingsSay(playerId, [
        { icon: "fa-solid fa-map-marker-check", style: { color: theme.color } },
        { str: " " + name + " ", style: { color: theme.color, fontWeight: "bold" } },
        { str: want ? "arrow shown." : "arrow hidden.", style: { color: theme.color } },
        { str: onlyOne ? " The other islands stay hidden." : "", style: { color: "#94A3B8" } },
    ]);
    return true;
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
    /* Lobby : la categorie n'existe pas. Si un client garde un vieil item,
       le clic ne fait rien plutot que de peindre des fleches sans ile. */
    if (!settingsAvailableHere()) return true;

    switch (itemKey) {
        case "set_arrows": toggleIslandArrows(playerId); return true;
        case "set_arrows_hide": {
            const name = resolveIslandName(userInput);
            if (!name) { settingsSay(playerId, [
                { icon: "fa-solid fa-circle-info", style: { color: "#94A3B8" } },
                { str: " Every island is already hidden.", style: { color: "#94A3B8" } },
            ]); return true; }
            setIslandShown(playerId, name, false);
            return true;
        }
        case "set_arrows_show": {
            const name = resolveIslandName(userInput);
            if (!name) { settingsSay(playerId, [
                { icon: "fa-solid fa-circle-info", style: { color: "#94A3B8" } },
                { str: " Every island is already shown.", style: { color: "#94A3B8" } },
            ]); return true; }
            setIslandShown(playerId, name, true);
            return true;
        }
        case "set_respawn": settingsRespawn(playerId); return true;
        case "set_protect": togglePvPProtection(playerId); return true;
        case "set_info": createSettingsItems(playerId); return true;
        default: break;
    }

    /* Ancien format (un item par ile, "isle_ju") : le client peut encore
       l'afficher, on le fait basculer plutot que de ne rien faire. */
    for (const name of islandNames()) {
        if (islandItemKey(name) === itemKey) {
            setIslandShown(playerId, name, !islandArrowVisible(playerId, name));
            return true;
        }
    }
    return false;
}

/* Ancien format d'item (un bouton par ile) : garde pour resoudre un clic
   laisse en place par un client plus vieux que la mise a jour. */
function islandItemKey(name) {
    return "isle_" + islandTheme(name).code.toLowerCase();
}

/* Variation vue par joueur : permet de reagir a un saut de variation meme
   s'il ne recharge pas le joueur. */
const lastVariationSeen = {};

/* Filet de securite, appele a chaque tick (une comparaison de texte par
   joueur, donc presque gratuit) :
     - lobby  -> les Settings et les fleches n'ont rien a faire la ;
     - mer    -> ils reviennent, avec les iles de CETTE mer.
   Le join fait deja le travail dans le cas normal ; ceci couvre le cas ou le
   passage d'une variation a l'autre se fait sans recharger le joueur. */
export function settingsSyncVariation(playerId) {
    if (!playerId) return false;
    const now = variationsSupported() ? currentVariation() : "world";
    if (lastVariationSeen[playerId] === now) return false;
    const first = lastVariationSeen[playerId] === undefined;
    lastVariationSeen[playerId] = now;
    if (!settingsAvailableHere()) {
        clearIslandArrows(playerId);
        return false;
    }
    if (first) return false; /* le join vient de le faire */
    return setupSettingsShop(playerId);
}

/* Deconnexion : on efface nos fleches (l'API le recommande) sans toucher a
   celles des quetes, qui ont leurs propres ids. */
export function settingsLeave(playerId) {
    if (!playerId) return false;
    delete lastVariationSeen[playerId];
    clearIslandArrows(playerId);
    return true;
}
