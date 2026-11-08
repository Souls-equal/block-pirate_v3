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
import { C, bar, fit, measure, say, txt, bold, ic } from "./theme";

/* Ligne du tutoriel dans la sidebar. UI n'importe PAS gameplay/tutorial (data
   importe UI : ce serait un cycle de plus) : index.js pose la fonction, qui
   renvoie une chaine courte ou null. */
let tutorialLineLookup = null;
export function setTutorialLineLookup(fn) {
    tutorialLineLookup = typeof fn === "function" ? fn : null;
}

export const dCode = "7WGjmPHZrS"

/* Ratio 0..1 et pourcentage. Le dessin est fait par le moteur (ProgressBar,
   cf. `bar()` dans theme.js) : plus de suite de « █ »/« ▒ » a calculer, et un
   rendu constant quelle que soit la police du joueur. */
function makeBar(value, max){
    const ok = Number.isFinite(value) && Number.isFinite(max) && max > 0;
    const ratio = ok ? value / max : 0;
    return {
        ratio: ratio,
        percent: Math.floor(Math.max(0, Math.min(1, ratio)) * 100)
    };
}

const title = "1.9em", title2 = "1.5em", text = "1.1em";

/* Barres natives. REGLE : une barre a la couleur de SON TEXTE, pour que
   « XP 1260/23980  5% » et sa barre se lisent comme un seul bloc (demande 74).
   Le vert de succes reste reserve aux messages de succes : sur la sidebar, il
   jurait a cote du cyan de l'XP. L'icone, le texte et la barre partagent donc la
   meme constante — impossible qu'ils divergent.
   Une seule couleur par barre (un degrade couterait ~20 caracteres de JSON de
   plus pour un ecart invisible).
   Taille : 250x24 px, reglee en jeu (demande 71). Sans `width`, la barre prenait
   la largeur de la ligne et restait tres fine ; en px elle est lisible et sa
   taille ne depend plus de la police du joueur. Cout : 26 caracteres de JSON,
   pris dans la marge du budget. */
const COLOUR_XP = C.XP;          // cyan : texte d'XP, icone, barre
const COLOUR_STAMINA = C.MARINE; // bleu clair : stamina
const BAR_XP = [COLOUR_XP];
const BAR_STAMINA = [COLOUR_STAMINA];
const BAR_SIZE = { height: "24px", width: "250px" };
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
    const xpData = makeBar(xp, xpNeeded);

    const stValue = getStamina(playerId);
    const stMax = getMaxStamina(playerId);
    const stSafe = Number.isFinite(stValue) ? stValue : 0;
    const stMaxSafe = Number.isFinite(stMax) && stMax > 0 ? stMax : 100;
    const stData = makeBar(stSafe, stMaxSafe);

    const quest = playerQuest[playerId];
    const progress = questProgress[playerId] || 0;

    /* Blocs dans l'ordre d'affichage. `optional` = peut etre retire sous
       pression du budget ; `priority` = ordre de sacrifice (petit = garde). */
    const blocks = [];
    const block = (parts, optional, priority) => {
        /* `priority || 9` transformait la priorite 0 en 9 : l'objectif du
           tutoriel (« garde en premier ») passait donc en dernier, et `fit()`
           le coupait le premier quand la sidebar debordait. 0 est une priorite
           valide : seul `undefined` prend la valeur par defaut. */
        if (parts && parts.length) blocks.push({ parts: parts, optional: !!optional, priority: priority === undefined ? 9 : priority });
    };

    /* Le titre est le PREMIER bloc sacrifie quand la place manque (priorite 12,
       au-dessus de la valeur par defaut 9) : il coute 168 caracteres a lui seul,
       et le joueur connait deja le nom du jeu. Sans ca, agrandir les barres
       (250x24 px) faisait disparaitre la barre de STAMINA chez un nouveau
       joueur qui a un objectif de tutoriel ET une quete — c'est-a-dire
       exactement le joueur qui en a le plus besoin. */
    block([
        ic("fa-solid fa-skull", C.MARINE, {fontSize: title}),
        txt(" BLOCK PIRATES\n", C.MARINE, {fontWeight: "bold", fontSize: title}),
    ], true, 12);
    block([
        ic("fa-solid fa-coins", C.MONEY),
        txt(" " + money + "\n", C.MONEY),
    ]);
    block([
        ic("Hunger", C.PIRATE),
        txt(" " + fruit + "\n", C.PIRATE),
    ]);
    block([
        ic("fa-solid fa-hand-fist", styleColor),
        txt(" " + styleLabel + "\n", styleColor),
    ]);
    block([
        ic("fa-solid fa-angle-double-up", C.MONEY),
        txt(" LVL " + lvl + "\n", C.MONEY),
    ]);
    block([
        txt("XP " + xp + "/" + xpNeeded + "  " + xpData.percent + "%\n", COLOUR_XP),
        bar(xpData.ratio, BAR_XP, BAR_SIZE),
        txt("\n\n"), // pas de style : une couleur sur des sauts de ligne coute 29 car.
    ], true, 2);
    block([
        ic("fa-solid fa-bolt", COLOUR_STAMINA),
        txt(" " + Math.round(stSafe) + "/" + Math.round(stMaxSafe) + "  " + stData.percent + "%\n", COLOUR_STAMINA),
        bar(stData.ratio, BAR_STAMINA, BAR_SIZE),
        txt("\n\n"),
    ], true, 3);
    /* Seulement s'il y a des points a depenser : « Stat Points 0 » ne dit rien
       et coute ~150 caracteres dans une sidebar plafonnee a 1 200. */
    if (sp > 0) {
        block([
            ic("fa-solid fa-star", C.SUCCESS),
            txt(" Stat Points " + sp + "\n\n", C.SUCCESS),
        ], true, 4);
    }

    /* Objectif du tutoriel : optionnel, mais garde en premier (priorite 0). */
    const tut = tutorialLineLookup ? tutorialLineLookup(playerId) : null;
    if (tut) {
        block([
            ic("fa-solid fa-list", C.SUCCESS),
            txt(" " + short(tut, 40) + "\n\n", C.SUCCESS),
        ], true, 0);
    }

    if (quest) {
        const targetText = short(Array.isArray(quest.targetMob) ? quest.targetMob.join(" / ") : quest.targetMob, 26);
        const percent = quest.killAmount > 0 ? Math.floor((progress / quest.killAmount) * 100) : 0;
        block([
            ic("fa-solid fa-globe", C.MARINE),
            txt(" QUEST " + targetText + "\n", C.MARINE),
            txt(progress + "/" + quest.killAmount + " (" + percent + "%) " + short(quest.island, 18) + "\n\n", C.INFO),
        ], true, 1);
    } else {
        block([
            ic("fa-solid fa-globe", C.MARINE),
            txt(" QUEST  no active quest\n\n", C.INFO),
        ], true, 8);
    }

    /* Budget : les blocs obligatoires passent toujours, puis les secondaires
       sont ajoutes du plus utile au moins utile tant que ca tient, et
       reassembles dans l'ordre d'affichage.
       Les blocs acceptes s'ADDITIONNENT (`chosen`) : tester chacun contre les
       seuls blocs obligatoires laissait passer plusieurs optionnels dont la
       somme depassait, et `fit()` coupait alors la fin de la sidebar — le plus
       souvent l'objectif du tutoriel, qui a pourtant la priorite la plus haute
       (0 = garde en premier). Les barres natives, plus lourdes en JSON que les
       anciennes suites de « █ », ont rendu le probleme visible. */
    const chosen = [];
    for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        if (b.optional) continue;
        for (let j = 0; j < b.parts.length; j++) chosen.push(b.parts[j]);
    }
    const optional = blocks.filter((b) => b.optional).sort((a, b) => a.priority - b.priority);
    for (let i = 0; i < optional.length; i++) {
        const trial = chosen.concat(optional[i].parts);
        if (measure(trial) > SIDEBAR_BUDGET) continue;
        for (let j = 0; j < optional[i].parts.length; j++) chosen.push(optional[i].parts[j]);
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
        { content: [bold("Discord:", "#5865F2")], showBackground: true },
        { content: [txt(["discord.", "gg", "/",dCode].join(""), C.INFO)], showBackground: true },
        { content: [ic("fa-solid fa-brands fa-discord", C.MARINE), bold(" Join Now! ", C.MONEY)], showBackground: false }
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
   a y regler. Tant que les variations sont coupees (VARIATIONS_ENABLED dans
   gameplay/variations.js), le monde EST la mer 1 : les Settings sont donc
   toujours la. Le jeu recharge le joueur a chaque saut de variation, donc un
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
            customTitle: [bold("Island Arrows [" + shown.length + "/" + total + "]", SETTING_ARROW_COLOR)],
            buyButtonText: [txt(all ? "Hide all" : "Show all", SETTING_ARROW_COLOR)],
            description: [
                ic("fa-solid fa-map-marker-check", SETTING_ARROW_COLOR),
                " One arrow per island, each in its own colour.",
                shown.length > 0
                    ? bold("\n● " + shown.length, "#4ADE80")
                    : bold("\n● 0", "#888888"),
                txt(" of " + total + " islands shown.", "#94A3B8"),
                txt("\nPick the islands you need below.", "#CBD5E1"),
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
            customTitle: [bold("Hide an island", SETTING_HIDE_COLOR)],
            buyButtonText: [txt("Hide", SETTING_HIDE_COLOR)],
            userInput: { type: "dropdown", dropdownOptions: shown.length ? shown : [EMPTY_CHOICE] },
            description: [
                ic("fa-solid fa-eye-slash", SETTING_HIDE_COLOR),
                " Remove one arrow from your screen.",
                txt("\nShown now: ", "#94A3B8"),
                txt(shown.length ? shown.join(", ") : "nothing", SETTING_SHOW_COLOR),
                txt("\nThe island moves to the other list.", "#888888"),
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
            customTitle: [bold("Show an island", SETTING_SHOW_COLOR)],
            buyButtonText: [txt("Show", SETTING_SHOW_COLOR)],
            userInput: { type: "dropdown", dropdownOptions: hidden.length ? hidden : [EMPTY_CHOICE] },
            description: [
                ic("fa-solid fa-eye", SETTING_SHOW_COLOR),
                " Bring one arrow back.",
                txt("\nHidden now: ", "#94A3B8"),
                txt(hidden.length ? hidden.join(", ") : "nothing", SETTING_HIDE_COLOR),
                txt("\nThe island moves to the other list.", "#888888"),
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
            customTitle: [bold("Respawn", SETTING_RESPAWN_COLOR)],
            buyButtonText: [txt("Respawn", SETTING_RESPAWN_COLOR)],
            description: [
                ic("fa-solid fa-user-clock", SETTING_RESPAWN_COLOR),
                " Kill yourself and respawn.",
                txt("\nStuck in a block, under the map, in a wall?", "#CBD5E1"),
                txt("\nClick two time to respawn.", "#313D50"),
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
            customTitle: [bold(protect ? "PvP Protection [ON]" : "PvP Protection [OFF]", SETTING_PROTECT_COLOR)],
            buyButtonText: [txt(protect ? "Disable" : "Enable", SETTING_PROTECT_COLOR)],
            description: [
                ic("fa-solid fa-shield-halved", SETTING_PROTECT_COLOR),
                " The shield you get after being killed by a player.",
                protect
                    ? bold("\n● ON ", "#4ADE80")
                    : bold("\n● OFF ", "#888888"),
                txt(protect
                    ? "— 5 minutes during which your killer cannot hit you. It drops if you attack them."
                    : "— you accept every hit again, killer included.", "#94A3B8"),
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
        ic("fa-solid fa-map-marker-check", SETTING_ARROW_COLOR),
        bold(want ? " All island arrows shown." : " All island arrows hidden.", SETTING_ARROW_COLOR),
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
            ic("fa-solid fa-circle-info", "#94A3B8"),
            txt(" " + name + (want ? " is already shown." : " is already hidden."), "#94A3B8"),
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
        ic("fa-solid fa-map-marker-check", theme.color),
        bold(" " + name + " ", theme.color),
        txt(want ? "arrow shown." : "arrow hidden.", theme.color),
        txt(onlyOne ? " The other islands stay hidden." : "", "#94A3B8"),
    ]);
    return true;
}

function togglePvPProtection(playerId) {
    const want = !pvpProtectionEnabled(playerId);
    settingSet(playerId, "pvpProt", want);
    createSettingsItems(playerId);
    settingsSay(playerId, [
        ic("fa-solid fa-shield-halved", SETTING_PROTECT_COLOR),
        bold(want ? " PvP protection enabled." : " PvP protection disabled.", SETTING_PROTECT_COLOR),
        txt(want
            ? " You get 5 minutes against your killer when you respawn."
            : " You accept every hit, killer included.", "#94A3B8"),
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
                ic("fa-solid fa-triangle-exclamation", "#EF4444"),
                bold(" You are in a fight: no respawn right now.", "#EF4444"),
            ]);
            return;
        }
    }

    if (!confirmAction(playerId, "respawn", [
        ic("fa-solid fa-user-clock", SETTING_RESPAWN_COLOR),
        txt(" Respawn now? ", "#CBD5E1"),
        bold("You will die", "#EF4444"),
        txt(" and come back at your spawn.", "#CBD5E1"),
    ])) return;

    let killed = false;
    try {
        if (typeof api.killLifeform === "function") { api.killLifeform(playerId); killed = true; }
    } catch (e) {}
    if (!killed) { try { api.setHealth(playerId, 0, undefined, true); killed = true; } catch (e) {} }
    if (!killed) { try { api.applyHealthChange(playerId, -99999, undefined, true); killed = true; } catch (e) {} }

    if (!killed) {
        settingsSay(playerId, [
            ic("fa-solid fa-circle-xmark", "#EF4444"),
            bold(" Respawn failed. Try again in a moment.", "#EF4444"),
        ]);
        return;
    }
    settingsSay(playerId, [
        ic("fa-solid fa-user-clock", SETTING_RESPAWN_COLOR),
        bold(" Respawning…", SETTING_RESPAWN_COLOR),
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
                ic("fa-solid fa-circle-info", "#94A3B8"),
                txt(" Every island is already hidden.", "#94A3B8"),
            ]); return true; }
            setIslandShown(playerId, name, false);
            return true;
        }
        case "set_arrows_show": {
            const name = resolveIslandName(userInput);
            if (!name) { settingsSay(playerId, [
                ic("fa-solid fa-circle-info", "#94A3B8"),
                txt(" Every island is already shown.", "#94A3B8"),
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
