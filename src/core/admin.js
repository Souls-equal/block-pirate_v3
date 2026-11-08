import { hasPermission, isOwner, getPermissionLevel, isCrowdControlImmune, PERMISSION_LEVELS } from "./ranks";
import { FRUITS_BY_RARITY, FRUIT_RARITIES, getFruitInfo, getRarityColor, getRarityEnchantTier } from "../fruit/index";
import { FRUIT_ABILITIES, isAbilityItemName } from "../fruit/abilities";
import { isFightingStyleAbilityName, isFightingStyleItemName } from "../gameplay/fightingStyles";
import { updateNameTag } from "./team";
import { refreshLeaderboardPlayer, updateSidebar } from "./UI";
import { addXP, getStat, setLevel, setStat, xpToNext } from "../utils/data";
import { muteDurations, muteDurationOptions, getMuteList, getMuteInfo, isMuted, mutePlayer, unmuteName, remainingText } from "./team";
import { eff, isAliveId, restoreClientOption, setAirJumpCount, setJumpAmount, setMoveSpeed, setVel, teleport } from "../utils/combat";
import { setInterval as everyTick } from "../utils/timer";
import { blockKillCredit } from "../utils/killAttribution";
import { currentVariation } from "../gameplay/variations";
import { SABER_ISLAND } from "../gameplay/saber";

import { C, ITEM_COLOR, nfmt, say, shout, shoutRaw, txt, bold, ic } from "./theme";
/* ==========================================================================
   CONFIGURATION (Variables basiques éditables)
   ========================================================================== */

export const ACTION_PERMISSIONS = {
    target_display:    PERMISSION_LEVELS.BASIC,
    select_target:     PERMISSION_LEVELS.BASIC,
    /* TP vers un joueur : ouvert aux TESTER. C'est le seul teleport qu'ils
       ont — TP Here, TP To Position et les warps gardent leur niveau. */
    tp_to:             PERMISSION_LEVELS.BASIC,
    tp_here:           PERMISSION_LEVELS.MOD,
    tp_to_pos:         PERMISSION_LEVELS.MOD,
    warp_island:       PERMISSION_LEVELS.BASIC,
    clear_entities:    PERMISSION_LEVELS.BASIC,
    vanish:            PERMISSION_LEVELS.MOD,
    /* Freeze = moderation courante : un MOD suffit, et on ne peut pas figer
       quelqu'un du meme rang ou au-dessus (voir freezeTarget). */
    freeze:            PERMISSION_LEVELS.MOD,
    view_inventory:    PERMISSION_LEVELS.MOD,
    kick:              PERMISSION_LEVELS.DEV,
    set_gamemode:      PERMISSION_LEVELS.OWNER,
    ban:               PERMISSION_LEVELS.OWNER,
    unban:             PERMISSION_LEVELS.OWNER,
    ban_list:          PERMISSION_LEVELS.OWNER,
    /* Mute = moderation courante : un MOD suffit, et on ne peut pas
       muter quelqu'un du meme rang ou au-dessus (voir muteTarget). */
    mute:              PERMISSION_LEVELS.MOD,
    unmute:            PERMISSION_LEVELS.MOD,
    unmute_name:       PERMISSION_LEVELS.MOD,
    mute_list:         PERMISSION_LEVELS.MOD,
    /* Annonce dans le chat : ADMIN et au-dessus (une ligne a changer si tu
       veux la reserver aux owners). */
    announce:          PERMISSION_LEVELS.ADMIN,
    give_fruit:        PERMISSION_LEVELS.OWNER,
    remove_items:      PERMISSION_LEVELS.OWNER,
    set_money:         PERMISSION_LEVELS.OWNER,
    set_level:         PERMISSION_LEVELS.OWNER,
};

/* Points de warp du panneau admin (bouton "Warp to Island"), PAR MER.
   L'ordre de ce tableau EST l'ordre du menu deroulant : un nom = une entree,
   et une faute de frappe dans le nom se voit tout de suite dans la liste.
   [x, y, z] : y est la hauteur du sol au point d'arrivee.

   Quand les variations sont coupees (VARIATIONS_ENABLED = false dans
   gameplay/variations.js), la variation courante est la mer 1 : les iles et
   les warps existent donc dans le monde unique, sans lobby.

   La cle est le NOM DE LA VARIATION : une mer a ses iles, et le panneau ne
   propose que celles de la mer ou l'on se trouve. Le lobby ("default") n'en a
   aucune, donc le bouton n'y existe pas. Le jour ou la mer 2 arrive, on ajoute
   une entree "sea2" ici : les deux listes (warp admin et fleches joueur, qui
   lit la meme table) la prendront sans autre changement. */
export const ISLAND_WARPS_BY_SEA = {
    sea1: {
        "Starter Pirate":   [-12, -910, 24],
        "Middle Town":      [635, -900, -206],
        "Starter Marine":   [885, -906, -276],
        "Jungle":           [1319, -906, 317],
        "Pirate Village":   [811, -906, 770],
        "Desert":           [650, -913, 1789],
        "Snow Village":     [2502, -915, 664],
        "Marine Fortress":  [2101, -910, -666],
        "Skylands":         [2498, -909, 1247],
    },
};

/* Raccourci historique : la table de la mer 1. */
export const ISLAND_WARPS = ISLAND_WARPS_BY_SEA.sea1;

/* Iles d'une variation. Lobby, mer pas encore declaree ou variation
   illisible -> aucune ile (objet vide, jamais null : on boucle dessus). */
export function islandsOfVariation(variation) {
    const table = ISLAND_WARPS_BY_SEA[variation];
    return table && typeof table === "object" ? table : {};
}

/* Iles de la variation courante. Le jeu recharge le joueur a chaque saut de
   variation : cette lecture suffit, rien a maintenir a la main. */
export function currentIslands() {
    /* Meme decision que partout ailleurs (gameplay/variations.js) : quand les
       variations sont coupees, la variation courante EST la mer 1, donc les
       iles existent dans le monde unique. */
    return islandsOfVariation(currentVariation());
}

/* ILES DU PANNEAU ADMIN = iles normales + Secret Island.

   Secret Island appartient a la Saber Quest (gameplay/saber) : elle ne doit
   PAS apparaitre dans la liste des iles des joueurs (ni dans Settings, ni
   dans les fleches d'ile automatiques), mais le staff doit pouvoir s'y
   teleporter. On garde donc deux listes, et seule celle-ci est proposee dans
   "Warp to Island".

   La position est lue A L'APPEL, jamais au chargement : saber.js importe
   utils/data, donc une lecture en haut de fichier tomberait sur un module
   pas encore initialise (cycle d'imports). Sans position, l'ile n'est pas
   proposee du tout (aucun warp casse). */
export function adminIslands() {
    const out = {};
    const isles = currentIslands();
    for (const name in isles) out[name] = isles[name];
    try {
        const secret = SABER_ISLAND;
        if (secret && secret.pos) out[secret.name] = secret.pos;
    } catch (e) {}
    return out;
}

/* Y a-t-il des iles ici ? (panneau admin et fleches s'appuient dessus) */
export function hasIslandsHere() {
    return Object.keys(currentIslands()).length > 0;
}

/* ==========================================================================
   PANNEAU : ON NE MONTRE QUE CE QU'ON PEUT FAIRE

   Un item du panneau n'est cree que si le joueur a le niveau de son action
   (ACTION_PERMISSIONS, seule source de verite). Un TESTER ne voit donc plus
   les boutons MOD/DEV/ADMIN/OWNER : il ne peut pas cliquer dessus, il ne les
   voit pas non plus.

   Les items d'AFFICHAGE (derniere inspection, liste des bans) suivent la
   permission de l'action qu'ils documentent (PANEL_ITEM_PERMISSION) : inutile
   de montrer une page "aucune inspection" a qui ne peut pas inspecter.

   Les boutons deja conditionnes (vanish MOD, bloc OWNER) passent aussi par ici :
   une seule regle, pas deux endroits a maintenir.
   ========================================================================== */

const PANEL_ITEM_PERMISSION = {
    inventory_display:  PERMISSION_LEVELS.MOD,
    inventory_display2: PERMISSION_LEVELS.MOD,
    inventory_display3: PERMISSION_LEVELS.MOD,
    ban_list_display:   PERMISSION_LEVELS.OWNER,
};

export function canSeePanelItem(adminId, itemKey) {
    /* Les iles appartiennent a une mer : dans le lobby il n'y en a pas, donc
       pas de bouton "Warp to Island" (on ne montre que ce qu'on peut faire,
       et un menu vide n'aurait rien a proposer). */
    if (itemKey === "warp_island" && !hasIslandsHere()) return false;
    const required = ACTION_PERMISSIONS[itemKey] !== undefined
        ? ACTION_PERMISSIONS[itemKey]
        : PANEL_ITEM_PERMISSION[itemKey];
    if (required === undefined) return true;
    return hasPermission(adminId, required);
}

/* Remplace api.createShopItemForPlayer pour les items du panneau admin. */
function panelItem(adminId, itemKey, options) {
    if (!canSeePanelItem(adminId, itemKey)) return false;
    try { api.createShopItemForPlayer(adminId, "admin", itemKey, options); return true; }
    catch (e) { return false; }
}

/* ==========================================================================
   CODE ADMIN (COMPRESSED)
   ========================================================================== */

/* ==========================================================================
   MONEY / LEVEL / XP — outils Owner (boutons du panneau admin)
   ========================================================================== */

const LEVEL_MENU_MODES = [
    "Set Level", "Add Levels", "Remove Levels",
    "Set XP", "Add XP", "Remove XP",
];
const levelMenuMode = {};

function levelMenuPlaceholder(mode) {
    if (mode === "Set Level") return "e.g. 50";
    if (mode === "Add Levels") return "e.g. 5";
    if (mode === "Remove Levels") return "e.g. 3";
    if (mode === "Set XP") return "e.g. 1200";
    if (mode === "Add XP") return "e.g. 500";
    if (mode === "Remove XP") return "e.g. 500";
    return "value";
}

function levelMenuDesc() {
    return [
        ic("fa-solid fa-list", "#55ff55"),
        " Pick an action in the list, then click ",
        bold("Choose", "#ffffff"),
        " and type the value.",
        bold("\nOWNER ONLY", "#FFD700"),
        txt("\n• Set Level", "#55ff55"), " — exact level (XP reset)",
        txt("\n• Add / Remove Levels", "#55ff55"), " — keep XP",
        txt("\n• Set XP", "#55aaff"), " — exact XP bar",
        txt("\n• Add / Remove XP", "#55aaff"), " — real XP gain (can level up)",
    ];
}

function sendAdminInfo(adminId, ok, text) {
    try {
        api.sendOverShopInfo(adminId, ok
            ? [ic("fa-solid fa-check", "lightgreen"), txt("  " + text, "lightgreen")]
            : [ic("fa-solid fa-xmark", "red"), txt("  " + text, "red")]);
    } catch (e) {}
}

/* ==========================================================================
   TELEPORT INTERDIT DANS LE LOBBY
   La variation "default" est le lobby. Un admin qui s'y teleporte (ou qui y
   fait venir quelqu'un) peut en sortir par accident et casser le parcours
   lobby -> mer. Les 4 boutons de TP du panneau sont donc refuses tant qu'on
   est dans le lobby ; il suffit d'etre dans une mer pour qu'ils remarchent.
   ========================================================================== */

const LOBBY_VARIATION = "default";

function canAdminTp(adminId) {
    /* Sans variations il n'y a pas de lobby : le TP est toujours autorise. */
    if (currentVariation() !== LOBBY_VARIATION) return true;
    sendAdminInfo(adminId, false, "Teleport is disabled in the lobby (variation \"default\"). Join your sea first.");
    return false;
}

function parseAmount(text) {
    const raw = String(text == null ? "" : text).trim().replace(/[\s_]/g, "");
    if (!raw) return null;
    const m = raw.match(/^([+-]?)(\d+(?:\.\d+)?)$/);
    if (!m) return null;
    const n = Math.floor(Number(m[2]));
    if (!isFinite(n)) return null;
    return { sign: m[1], value: n };
}

function touchTarget(targetId) {
    try { updateSidebar(targetId); } catch (e) {}
    try { refreshLeaderboardPlayer(targetId); } catch (e) {}
}

/* Argent : "+5000" ajoute, "-2000" retire, "5000" met le montant exact. */
function setTargetMoney(adminId, userInput) {
    if (!isOwner(adminId)) return;
    const targetId = requireTarget(adminId);
    if (!targetId) return;

    const parsed = parseAmount(userInput);
    if (!parsed) return sendAdminInfo(adminId, false, "Invalid amount. Examples: +5000, -2000, 5000.");

    const before = Math.floor(Number(getStat(targetId, "money", 0)) || 0);
    let after;
    if (parsed.sign === "+") after = before + parsed.value;
    else if (parsed.sign === "-") after = before - parsed.value;
    else after = parsed.value;
    if (after < 0) after = 0;
    if (after > 1e12) after = 1e12;
    after = Math.floor(after);

    setStat(targetId, "money", after);
    touchTarget(targetId);

    const name = getTargetName(targetId);
    const delta = after - before;
    sendAdminInfo(adminId, true, name + ": " + nfmt(before) + " -> " + nfmt(after) + " Coins (" + (delta >= 0 ? "+" : "") + nfmt(delta) + ")");

    try {
        say(adminId, [
            ic("fa-solid fa-crown", "#FFD700"),bold(" [Owner] ", "#FFD700"),
            txt("Money of ", "#aaaaaa"),
            txt(name, "#FFD700"),
            txt(" set to ", "#aaaaaa"),
            bold(nfmt(after) + " Coins", C.MONEY),
        ]);
    } catch (e) {}

    if (targetId !== adminId) try {
        say(targetId, [
            ic("fa-solid fa-shield-halved", "#FFD700"),bold(" [Admin] ", "#FFD700"),
            txt("Your money was changed to ", "#aaaaaa"),
            bold(nfmt(after) + " Coins", C.MONEY),
            txt(" by an owner.", "#aaaaaa"),
        ]);
    } catch (e) {}
}

/* Remet le bouton Niveau / XP sur le menu déroulant. */
function resetLevelMenuItem(adminId) {
    delete levelMenuMode[adminId];
    try {
        api.updateShopItemForPlayer(adminId, "admin", "set_level", {
            customTitle: [bold("Level / XP Menu", "#55ff55")],
            buyButtonText: [txt("Choose", "#55ff55")],
            description: levelMenuDesc(),
            userInput: { type: "dropdown", dropdownOptions: LEVEL_MENU_MODES },
        });
    } catch (e) {}
}

/* Menu en 2 temps : 1) on choisit l'action, 2) on tape la valeur. */
function setTargetLevelMenu(adminId, userInput) {
    if (!isOwner(adminId)) return;
    const targetId = requireTarget(adminId);
    if (!targetId) return;

    const chosen = String(userInput == null ? "" : userInput).trim();

    if (LEVEL_MENU_MODES.indexOf(chosen) >= 0) {
        levelMenuMode[adminId] = chosen;
        const lvl = Number(getStat(targetId, "lvl", 1)) || 1;
        const xp = Number(getStat(targetId, "xp", 0)) || 0;
        try {
            api.updateShopItemForPlayer(adminId, "admin", "set_level", {
                customTitle: [bold("Level / XP — " + chosen, "#55ff55")],
                buyButtonText: [txt("Apply", "#55ff55")],
                description: [
                    ic("fa-solid fa-pen", "#55ff55"),
                    " Type the value for ",
                    bold(chosen, "#ffffff"),
                    " on ",
                    bold(getTargetName(targetId), "#FFD700"),
                    ":",
                    txt("\nLevel " + lvl + "  •  " + xp + "/" + xpToNext(lvl) + " XP", "#aaaaaa"),
                    txt("\nClick Apply to confirm, or choose another action in the list.", "#888888"),
                ],
                userInput: { type: "text", placeholderText: levelMenuPlaceholder(chosen), wordCharsOnly: false },
            });
        } catch (e) {}
        return sendAdminInfo(adminId, true, chosen + " selected — type the value, then click Apply.");
    }

    const mode = levelMenuMode[adminId];
    if (!mode) return sendAdminInfo(adminId, false, "Pick an action in the list first.");

    const parsed = parseAmount(chosen);
    if (!parsed) return sendAdminInfo(adminId, false, "Invalid value for " + mode + ".");

    const lvl = Math.max(1, Math.floor(Number(getStat(targetId, "lvl", 1)) || 1));
    const xp = Math.max(0, Math.floor(Number(getStat(targetId, "xp", 0)) || 0));
    const value = parsed.value;
    let detail = "";

    if (mode === "Set Level") {
        const newLvl = Math.min(5000, Math.max(1, value));
        setLevel(targetId, newLvl, true);
        detail = "Level = " + newLvl + " (XP reset)";
    } else if (mode === "Add Levels" || mode === "Remove Levels") {
        const sign = mode === "Add Levels" ? 1 : -1;
        const newLvl = Math.min(5000, Math.max(1, lvl + sign * value));
        setLevel(targetId, newLvl, false);
        detail = "Level " + lvl + " -> " + newLvl;
    } else if (mode === "Set XP") {
        const newXp = Math.min(1e7, Math.max(0, value));
        setStat(targetId, "xp", newXp);
        detail = "XP = " + newXp + "/" + xpToNext(lvl);
    } else if (mode === "Add XP") {
        addXP(targetId, Math.min(1e7, value));
        detail = "+" + value + " XP";
    } else if (mode === "Remove XP") {
        const newXp = Math.max(0, xp - value);
        setStat(targetId, "xp", newXp);
        detail = "XP = " + newXp + "/" + xpToNext(lvl);
    } else {
        return sendAdminInfo(adminId, false, "Unknown action, menu reset.");
    }

    touchTarget(targetId);
    const name = getTargetName(targetId);
    sendAdminInfo(adminId, true, name + ": " + mode + " — " + detail);
    try {
        say(adminId, [
            ic("fa-solid fa-crown", "#FFD700"),bold(" [Owner] ", "#FFD700"),
            txt(name, "#FFD700"),
            txt(" — " + mode + ": " + detail, "#55ff55"),
        ]);
    } catch (e) {}
    if (targetId !== adminId) try {
        say(targetId, [
            ic("fa-solid fa-shield-halved", "#FFD700"),bold(" [Admin] ", "#FFD700"),
            txt("An owner changed your progress (" + detail + ").", "#55ff55"),
        ]);
    } catch (e) {}

    resetLevelMenuItem(adminId);
}

/* ==========================================================================
   MUTE — « tais-toi », et rien d'autre (implementation dans core/team.js)
   Le joueur mute peut toujours jouer : on lui bloque uniquement le chat.
   ========================================================================== */

/* Le menu deroulant de la liste des mutes (comme refreshUnbanDropdown). */
function refreshUnmuteDropdown(adminId) {
    try {
        const muted = getMuteList();
        api.updateShopItemForPlayer(adminId, "admin", "unmute", {
            userInput: { type: "dropdown", dropdownOptions: muted.length ? muted : ["(nobody is muted)"] },
        });
    } catch (e) {}
}

/* Le tableau de la liste des mutes (meme esprit que la ban list). */
function refreshMuteListDisplay(adminId) {
    const muted = getMuteList();
    const lines = [];
    lines.push(bold("Muted Players (" + muted.length + ")\n", "#EF4444"));
    if (!muted.length) {
        lines.push(txt("  (nobody is muted)\n", "#666666"));
    } else {
        for (const name of muted) {
            const info = getMuteInfo(name);
            if (!info) {
                /* le nom est la, mais l'enregistrement du lobby a disparu
                   (redemarrage) : "Unmute by Name" reste le chemin sur. */
                lines.push(txt("  " + name + " (no record — use Unmute by Name)\n", "#888888"));
                continue;
            }
            lines.push(txt("  " + name, "#ff6666"));
            lines.push(txt("  " + info.remaining + " — by " + info.by + "\n", "#888888"));
        }
    }
    lines.push(txt("\nMute only stops the chat.", "#666666"));
    try {
        api.createShopItemForPlayer(adminId, "admin", "mute_list_display", {
            image: "Book",
            canBuy: false,
            sortPriority: 26,
            customTitle: [bold("Mute List", "#EF4444")],
            description: lines,
        });
    } catch (e) {}
    refreshUnmuteDropdown(adminId);
}

/* Bouton "Mute Player" (duree choisie dans la liste). */
function muteTarget(adminId, userInput) {
    if (!hasPermission(adminId, PERMISSION_LEVELS.MOD)) return;
    const targetId = requireTarget(adminId);
    if (!targetId) return;
    if (targetId === adminId) return sendAdminInfo(adminId, false, "You can't mute yourself!");
    if (getPermissionLevel(targetId) >= getPermissionLevel(adminId))
        return sendAdminInfo(adminId, false, "Cannot mute a player with equal or higher rank!");

    const name = getTargetName(targetId);
    if (isMuted(targetId)) return sendAdminInfo(adminId, false, name + " is already muted.");

    let adminName = "Admin";
    try { adminName = api.getEntityName(adminId) || "Admin"; } catch (e) {}

    const choice = String(userInput == null ? "" : userInput).trim();
    const ms = muteDurations()[choice] || 0;
    if (!mutePlayer(targetId, adminName, ms)) return sendAdminInfo(adminId, false, "Failed to save the mute!");

    const span = ms > 0 ? "for " + remainingText(Date.now() + ms) : "until unmuted";
    /* refreshMuteListDisplay rafraichit aussi le menu deroulant : sans ca le
       tableau "Mute List" restait sur son instantane d'arrivee et le joueur
       venait d'etre mute sans jamais y apparaitre. */
    refreshMuteListDisplay(adminId);
    sendAdminInfo(adminId, true, "Muted " + name + " " + span + ".");
    try {
        say(adminId, [
            ic("fa-solid fa-shield-halved", "#FFD700"),bold(" [Admin] ", "#FFD700"),
            txt("Muted ", "#aaaaaa"),
            bold(name, "#EF4444"),
            txt(" " + span + " (chat only).", "#aaaaaa"),
        ]);
    } catch (e) {}
    if (targetId !== adminId) try {
        say(targetId, [
            ic("fa-solid fa-volume-slash", "#EF4444"),
            txt(" You have been muted " + span + " by ", "#EF4444"),
            bold(adminName, "#FFD700"),
            txt(". You can still play, just not talk.", "#CBD5E1"),
        ]);
    } catch (e) {}
}

/* Levee du mute, quelle que soit la porte d'entree (liste ou nom tape). */
function performUnmute(adminId, playerName) {
    const info = getMuteInfo(playerName);
    if (!info && getMuteList().indexOf(playerName) === -1)
        return sendAdminInfo(adminId, false, '"' + playerName + '" is not muted.');

    unmuteName(playerName);
    refreshUnmuteDropdown(adminId);
    refreshMuteListDisplay(adminId);
    sendAdminInfo(adminId, true, "Unmuted " + playerName + "!");

    try {
        say(adminId, [
            ic("fa-solid fa-shield-halved", "#FFD700"),bold(" [Admin] ", "#FFD700"),
            txt("Unmuted ", "#aaaaaa"),
            bold(playerName, "#4ADE80"),
            txt(" — they can talk again.", "#aaaaaa"),
        ]);
    } catch (e) {}

    /* Prevenir la personne si elle est en ligne. */
    const ids = (function () {
        try { return api.getPlayerIds() || []; } catch (e) { return []; }
    })();
    for (const id of ids) {
        let n = "";
        try { n = api.getEntityName(id); } catch (e) { n = ""; }
        if (n !== playerName) continue;
        try {
            say(id, [
                ic("fa-solid fa-volume", "#4ADE80"),
                txt(" You are no longer muted — you can talk again.", "#4ADE80"),
            ]);
        } catch (e) {}
    }
}

/* Bouton "Unmute" (le joueur peut etre hors ligne). */
function unmuteTarget(adminId, userInput) {
    if (!hasPermission(adminId, PERMISSION_LEVELS.MOD)) return;
    const playerName = String(userInput == null ? "" : userInput).trim();
    if (!playerName || playerName === "(nobody is muted)")
        return sendAdminInfo(adminId, false, "No muted player selected!");
    performUnmute(adminId, playerName);
}

/* Bouton "Unmute by Name" : filet de securite quand le nom n'est pas (ou plus)
   dans la liste — index du lobby perdu apres un redemarrage, joueur hors ligne,
   liste vide alors que le mute existe encore dans sa db joueur. */
function unmuteByNameTarget(adminId, userInput) {
    if (!hasPermission(adminId, PERMISSION_LEVELS.MOD)) return;
    const playerName = String(userInput == null ? "" : userInput).replace(/[\r\n\t]+/g, " ").trim();
    if (!playerName)
        return sendAdminInfo(adminId, false, "Type the name of the player to unmute!");
    if (playerName === "(nobody is muted)")
        return sendAdminInfo(adminId, false, "Type a player name, not the placeholder!");
    performUnmute(adminId, playerName);
}

/* Les 4 boutons du panneau (visibles pour MOD+). */
function createMuteItems(adminId) {
    const muted = getMuteList();
    try {
        panelItem(adminId, "mute", {
            image: "Iron Sword",
            imageColour: "#EF4444",
            canBuy: true,
            cost: 0,
            sortPriority: 29,
            customTitle: [bold("Mute Player", "#EF4444")],
            buyButtonText: [txt("Mute", "#EF4444")],
            description: [
                ic("fa-solid fa-volume-slash", "#EF4444"),
                " ", bold("MOD+", "#FFD700"),
                " — Stop the target from talking.",
                txt("\nThey stay, play and keep everything", "#4ADE80"),
                txt(" (no kick, no ban).", "#888888"),
                txt("\nPick how long, then click Mute.", "#888888"),
                txt("\nCannot mute equal or higher rank.", "#888888"),
            ],
            userInput: { type: "dropdown", dropdownOptions: muteDurationOptions() },
        });
    } catch (e) {}

    try {
        panelItem(adminId, "unmute", {
            image: "Golden Apple",
            imageColour: "#4ADE80",
            canBuy: true,
            cost: 0,
            sortPriority: 28,
            customTitle: [bold("Unmute Player", "#4ADE80")],
            buyButtonText: [txt("Unmute", "#4ADE80")],
            description: [
                ic("fa-solid fa-volume", "#4ADE80"),
                " ", bold("MOD+", "#FFD700"),
                " — Let a muted player talk again.",
                txt("\nPick a name in the list.", "#888888"),
                txt("\nWorks even if they are offline.", "#888888"),
            ],
            userInput: { type: "dropdown", dropdownOptions: muted.length ? muted : ["(nobody is muted)"] },
        });
    } catch (e) {}

    try {
        panelItem(adminId, "unmute_name", {
            image: "Golden Apple",
            imageColour: "#4ADE80",
            canBuy: true,
            cost: 0,
            sortPriority: 25,
            customTitle: [bold("Unmute by Name", "#4ADE80")],
            buyButtonText: [txt("Unmute", "#4ADE80")],
            description: [
                ic("fa-solid fa-terminal", "#4ADE80"),
                " ", bold("MOD+", "#FFD700"),
                " — Unmute by typing the name.",
                txt("\nUse it when the name is missing from the list.", "#888888"),
            ],
            userInput: { type: "text", placeholderText: "Player name", wordCharsOnly: false },
        });
    } catch (e) {}

    try {
        panelItem(adminId, "mute_list", {
            image: "Book",
            imageColour: "#EF4444",
            canBuy: true,
            cost: 0,
            sortPriority: 27,
            customTitle: [bold("View Mute List", "#EF4444")],
            buyButtonText: [txt("Refresh", "#EF4444")],
            description: [
                ic("fa-solid fa-list", "#EF4444"),
                " View everyone who is ", bold("muted", "#ff6666"),
                ", for how long and by whom.",
            ],
        });
    } catch (e) {}

    try {
        panelItem(adminId, "mute_list_display", {
            image: "Book",
            canBuy: false,
            sortPriority: 26,
            customTitle: [txt("Mute List", "#888888")],
            description: [txt('Click "View Mute List" to load.', "#888888")],
        });
    } catch (e) {}

    /* Des qu'il y a un mute, on affiche la vraie liste tout de suite : plus
       besoin de deviner qu'il faut cliquer sur "View Mute List". */
    if (muted.length) refreshMuteListDisplay(adminId);
}

/* ==========================================================================
   ANNONCE DANS LE CHAT
   L'admin ecrit une ligne avec des zones colorees :

       *New update guys*<yellow>, You can now play the *game*<lime> now!

   - une zone = le texte entre deux `*` ;
   - juste apres le `*` fermant, `<couleur>` donne la couleur de TOUTE la zone
     (nom de couleur Bloxd ou hexadecimal `#RRGGBB`) ;
   - le reste du texte garde la couleur par defaut (blanc) ;
   - un `*` sans `<couleur>` n'est pas une zone : il reste affiche tel quel,
     pour que l'admin voie sa faute de frappe.

   Les couleurs passent par shoutRaw() : elles ne sont PAS ramenees a la
   palette de role (c'est tout l'interet d'une annonce).
   ========================================================================== */

const ANNOUNCE_MAX = 400;

/* Une couleur utilisable par Bloxd : #abc / #aabbcc, ou un nom simple. */
function isAnnounceColor(value) {
    if (!value) return false;
    if (value.charAt(0) === "#") return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
    return /^[a-zA-Z]{2,20}$/.test(value);
}

/* "*texte*<couleur>" -> [{ str, style }] (segments prets pour le chat). */
function parseAnnouncement(text) {
    const src = String(text == null ? "" : text).replace(/[\r\n\t]+/g, " ").trim();
    const parts = [];
    let plain = "";
    let i = 0;

    const flush = () => {
        if (!plain) return;
        parts.push(txt(plain));
        plain = "";
    };

    while (i < src.length) {
        if (src.charAt(i) === "*") {
            const end = src.indexOf("*", i + 1);
            if (end > i + 1) {
                const zone = src.slice(i + 1, end);
                let next = end + 1;
                let color = null;
                if (src.charAt(next) === "<") {
                    const close = src.indexOf(">", next + 1);
                    if (close > next) {
                        const asked = src.slice(next + 1, close).trim();
                        if (isAnnounceColor(asked)) {
                            color = asked;
                            next = close + 1;
                        }
                    }
                }
                if (color) {
                    flush();
                    parts.push(bold(zone, color));
                    i = next;
                    continue;
                }
            }
        }
        plain += src.charAt(i);
        i++;
    }
    flush();
    return parts;
}

function announceTarget(adminId, userInput) {
    if (!hasPermission(adminId, PERMISSION_LEVELS.ADMIN)) return;

    const raw = String(userInput == null ? "" : userInput).trim();
    if (!raw) return sendAdminInfo(adminId, false, "Type an announcement first.");
    if (raw.length > ANNOUNCE_MAX)
        return sendAdminInfo(adminId, false, "Too long (" + raw.length + "/" + ANNOUNCE_MAX + " characters).");

    const body = parseAnnouncement(raw);
    if (!body.length) return sendAdminInfo(adminId, false, "Nothing to send.");

    let adminName = "Admin";
    try { adminName = api.getEntityName(adminId) || "Admin"; } catch (e) {}

    try {
        shoutRaw([
            ic("fa-solid fa-bell", "#FFD700"),
            bold(" [Announcement] ", "#FFD700"),
            ...body,
        ]);
    } catch (e) {
        return sendAdminInfo(adminId, false, "Could not send the announcement.");
    }

    const zones = body.filter(function (p) { return p.style && p.style.color; }).length;
    sendAdminInfo(adminId, true, "Announcement sent" + (zones ? " (" + zones + " colored zone" + (zones > 1 ? "s" : "") + ")" : "") + ".");
    try {
        say(adminId, [
            ic("fa-solid fa-shield-halved", "#FFD700"),bold(" [Admin] ", "#FFD700"),
            txt("You announced this as ", "#aaaaaa"),
            txt(adminName, "#FFD700"),
            txt(" to everyone online.", "#aaaaaa"),
        ]);
    } catch (e) {}
}

/* Le bouton du panneau admin. */
function createAnnounceItem(adminId) {
    try {
        panelItem(adminId, "announce", {
            image: "Book",
            imageColour: "#FFD700",
            canBuy: true,
            cost: 0,
            sortPriority: 19,
            customTitle: [bold("Announcement", "#FFD700")],
            buyButtonText: [txt("Send", "#FFD700")],
            description: [
                ic("fa-solid fa-bell", "#FFD700"),
                " ", bold("ADMIN+", "#FFD700"),
                " — Send a message to everyone in the chat.",
                bold("\nColor a zone", "#ffffff"),
                " by putting it between ", bold("* *", "#ffffff"),
                " then a color: ",
                txt("*zone*<yellow>", "#FFD700"),
                txt("\nColor = Bloxd color name or #hex", "#888888"),
                txt("\nExample: ", "#888888"),
                txt("*New update guys*<yellow>, play the *game*<lime> now!", "#aaaaaa"),
            ],
            userInput: { type: "text", placeholderText: "*New update*<yellow>, play now!", wordCharsOnly: false },
        });
    } catch (e) {}
}

/* ==========================================================================
   FAUX MESSAGES JOIN / LEAVE DU VANISH
   Quand un admin active Vanish, on diffuse un faux « X left » (et un faux
   « X joined » quand il le desactive) pour qu'il disparaisse des yeux des
   autres. Ces deux messages doivent etre INDISTINGUABLES d'un vrai message de
   join / leave : si leur couleur differe, n'importe qui repere qu'un admin
   vient de se cacher.

   On passe donc par shoutRaw() et NON par shout() : shout() applique la
   palette de role (themeColor), qui ramenait #cef3ff a MARINE (#7DD3FC) et
   rendait le faux message reconnaissable. Change la teinte ici si le vrai
   message du moteur change : c'est le seul endroit a toucher.
   ========================================================================== */

const VANISH_CHAT_COLOR = "#cef3ff";

function fakeJoinLeave(text) {
    shoutRaw([txt(text, VANISH_CHAT_COLOR)]);
}

/* ==========================================================================
   FREEZE (panneau admin)

   Trois verrous, parce qu'un seul ne suffit pas :
     1. effet natif "Frozen" (icone Frozen, blocage moteur) rafraichi chaque
        seconde -> l'etiquette reste affichee et la vue du joueur le voit ;
     2. vitesse 0 + saut 0 + doubles sauts 0 -> plus de deplacement
        horizontal, plus de saut, plus de saut aerien ;
     3. re-teleport sur la position verrouillee toutes les secondes, avec
        vitesse remise a zero -> les dashs, impulses et sauts de capacite
        ramenent le joueur a sa place au lieu de le faire traverser la map.

   Tout passe par les primitives gardees de utils/combat : un rang immunise
   (OWNER / ADMIN) ne peut donc PAS etre fige, meme par un autre admin.
   Les valeurs d'avant (vitesse, saut, doubles sauts) sont capturees a la
   pose et rendues a la levee : un joueur qui avait un bonus de vitesse le
   retrouve intact.
   ========================================================================== */

const frozenPlayers = new Map(); /* playerId -> etat */

const FREEZE_TICK = 20;          /* ticks entre deux verifications (~1 s) */
const FREEZE_EFFECT_MS = 1500;   /* duree de l'effet, rafraichi chaque seconde */
const FREEZE_SNAP = 0.35;        /* au-dela, on considere qu'il a bouge */
const FREEZE_MAX_MS = 10 * 60 * 1000; /* securite : jamais fige plus de 10 min */

function readClientOption(id, option) {
    try {
        const v = api.getClientOption(id, option);
        return typeof v === "number" && isFinite(v) ? v : undefined;
    } catch (e) {
        return undefined;
    }
}

/* Vivant ? `isAliveId` seul ne suffit pas pendant l'ecran de mort : le cache
   des joueurs listes par le serveur le compte encore en vie, et on le
   re-teleporterait la ou il vient de mourir au lieu de le laisser respawn.
   La vie, elle, passe bien a 0. */
function isFreezeTargetAlive(id) {
    if (!isAliveId(id)) return false;
    try {
        const h = api.getHealth(id);
        if (typeof h === "number" && h <= 0) return false;
    } catch (e) {}
    return true;
}

function playerPosition(id) {
    try {
        const p = api.getPosition(id);
        return p && p.length >= 3 ? [p[0], p[1], p[2]] : null;
    } catch (e) {
        return null;
    }
}

export function isFrozen(playerId) {
    return !!playerId && frozenPlayers.has(playerId);
}

/* Changer de cible leve le freeze de l'ancienne : sinon un joueur reste fige
   indefiniment des qu'on passe a quelqu'un d'autre dans le panneau. */
function releaseFreezeOnTargetChange(adminId, newTargetId) {
    const prev = adminTargetPlayer[adminId];
    if (prev && prev !== newTargetId && frozenPlayers.has(prev)) unfreezePlayer(prev, "target");
}

function freezeTick(playerId) {
    const st = frozenPlayers.get(playerId);
    if (!st) return;

    if (Date.now() - st.at > FREEZE_MAX_MS) {
        unfreezePlayer(playerId, "timeout");
        return;
    }

    /* Mort / en attente de respawn : on ne fait rien et on re-verrouille sur
       la position d'arrivee au retour, plutot que de le renvoyer mourir la ou
       il est tombe. */
    if (!isFreezeTargetAlive(playerId)) {
        st.waiting = true;
        return;
    }

    const p = playerPosition(playerId);
    if (!p) return;
    if (st.waiting) {
        st.waiting = false;
        st.pos = p;
    }
    if (!st.pos) st.pos = p;

    /* "Frozen" est un effet natif de Bloxd : le moteur bloque le deplacement
       et l'icone Frozen s'affiche d'elle-meme. On le rafraichit chaque
       seconde pour qu'il ne retombe jamais pendant le freeze. */
    eff(playerId, "Frozen", FREEZE_EFFECT_MS, { inbuiltLevel: 1 });
    setMoveSpeed(playerId, 0);
    setJumpAmount(playerId, 0);
    setAirJumpCount(playerId, 0);

    const dx = p[0] - st.pos[0];
    const dy = p[1] - st.pos[1];
    const dz = p[2] - st.pos[2];
    if (dx * dx + dy * dy + dz * dz > FREEZE_SNAP * FREEZE_SNAP) {
        teleport(playerId, st.pos[0], st.pos[1], st.pos[2]);
        setVel(playerId, 0, 0, 0);
    }
}

function unfreezePlayer(playerId, reason) {
    const st = frozenPlayers.get(playerId);
    if (!st) return false;
    frozenPlayers.delete(playerId);
    try { if (st.timer && st.timer.stop) st.timer.stop(); } catch (e) {}

    /* Restauration : jamais bloquee, meme si le rang a change entre-temps. */
    restoreClientOption(playerId, "speedMultiplier", st.speed);
    restoreClientOption(playerId, "jumpAmount", st.jump);
    restoreClientOption(playerId, "airJumpCount", st.air);

    if (reason !== "leave") {
        try {
            say(playerId, [
                ic("fa-solid fa-fire", "#4ADE80"),
                bold(reason === "timeout"
                        ? " The freeze expired. You can move again."
                        : " You are no longer frozen.", "#4ADE80"),
            ]);
        } catch (e) {}
    }
    return true;
}

function freezePlayer(adminId, targetId) {
    const pos = playerPosition(targetId) || [0, 0, 0];
    const st = {
        by: adminId,
        pos: pos,
        waiting: false,
        at: Date.now(),
        speed: readClientOption(targetId, "speedMultiplier"),
        jump: readClientOption(targetId, "jumpAmount"),
        air: readClientOption(targetId, "airJumpCount"),
        timer: null,
    };
    frozenPlayers.set(targetId, st);

    /* Premier verrou immediat : sans ca, l'effet n'apparait qu'une seconde
       apres le clic et le joueur peut deja avoir bouge. */
    freezeTick(targetId);
    try {
        st.timer = everyTick(function () { freezeTick(targetId); }, FREEZE_TICK);
    } catch (e) {
        frozenPlayers.delete(targetId);
        return false;
    }
    return true;
}

function freezeTarget(adminId) {
    if (!hasPermission(adminId, PERMISSION_LEVELS.MOD)) return;
    const targetId = requireTarget(adminId);
    if (!targetId) return;
    if (targetId === adminId) return sendAdminInfo(adminId, false, "You can't freeze yourself!");
    if (isCrowdControlImmune(targetId))
        return sendAdminInfo(adminId, false, "That player is immune to crowd control.");
    if (getPermissionLevel(targetId) >= getPermissionLevel(adminId))
        return sendAdminInfo(adminId, false, "Cannot freeze a player with equal or higher rank!");

    const name = getTargetName(targetId);
    let adminName = "Admin";
    try { adminName = api.getEntityName(adminId) || "Admin"; } catch (e) {}

    if (isFrozen(targetId)) {
        unfreezePlayer(targetId, "admin");
        createFreezeItem(adminId);
        sendAdminInfo(adminId, true, "Unfroze " + name + ".");
        try {
            say(adminId, [
                ic("fa-solid fa-shield-halved", "#FFD700"),bold(" [Admin] ", "#FFD700"),
                txt("Unfroze ", "#aaaaaa"),
                bold(name, "#4ADE80"),
                txt(".", "#aaaaaa"),
            ]);
        } catch (e) {}
        return;
    }

    if (!freezePlayer(adminId, targetId)) return sendAdminInfo(adminId, false, "Failed to freeze " + name + ".");
    createFreezeItem(adminId);
    sendAdminInfo(adminId, true, "Froze " + name + ". No movement, no jump, no dash.");
    try {
        say(adminId, [
            ic("fa-solid fa-shield-halved", "#FFD700"),bold(" [Admin] ", "#FFD700"),
            txt("Froze ", "#aaaaaa"),
            bold(name, "#7DD3FC"),
            txt(".", "#aaaaaa"),
        ]);
    } catch (e) {}
    try {
        say(targetId, [
            ic("fa-solid fa-snowflake", "#7DD3FC"),
            bold(" You have been frozen by ", "#7DD3FC"),
            bold(adminName, "#FFD700"),
            txt(". You cannot move, jump or dash.", "#CBD5E1"),
        ]);
    } catch (e) {}
}

/* Le joueur se deconnecte (ou est retire du monde) : son etat disparait avec
   lui, sinon un id recycle plus tard heriterait d'un freeze fantome. */
function clearFreezeOnLeave(playerId) {
    unfreezePlayer(playerId, "leave");
}

function createFreezeItem(adminId) {
    let count = 0;
    try { count = frozenPlayers.size; } catch (e) { count = 0; }
    try {
        panelItem(adminId, "freeze", {
            image: "Ice",
            imageColour: "#7DD3FC",
            canBuy: true,
            cost: 0,
            sortPriority: 54,
            customTitle: [bold("Freeze Player", "#7DD3FC")],
            buyButtonText: [txt("Toggle", "#7DD3FC")],
            description: [
                ic("fa-solid fa-snowflake", "#7DD3FC"),
                " ",
                bold("MOD+", "#FFD700"),
                " — Freeze the selected target in place.",
                txt("\nNo horizontal movement, no jump, no double jump.", C.INFO),
                txt("\nRe-teleported every second", "#7DD3FC"),
                txt(" (blocks dashes and pulls).", C.INFO),
                count > 0
                    ? bold("\n● " + count + " player(s) frozen right now.", "#7DD3FC")
                    : txt("\n● Nobody is frozen.", "#888888"),
                txt("\nCannot freeze equal or higher rank.", "#888888"),
                txt("\nAuto-expires after 10 minutes.", "#888888"),
            ],
        });
    } catch (e) {}
}

const GAMEMODES=["creative","survival","survivaladventure","peaceful","peacefuladventure","spectator"],adminTargetPlayer={};let _allFruits=null;function getAllFruits(){if(_allFruits)return _allFruits;_allFruits=[];for(const rarity in FRUITS_BY_RARITY)for(const fruit of FRUITS_BY_RARITY[rarity])_allFruits.push({itemName:fruit.itemName,rpName:fruit.rpName,rpDesc:fruit.rpDesc,rarity:rarity});return _allFruits}function levenshtein(a,b){const la=a.length,lb=b.length,dp=[];for(let i=0;i<=la;i++){dp[i]=[i];for(let j=1;j<=lb;j++){if(0===i){dp[0][j]=j;continue}const cost=a[i-1]===b[j-1]?0:1;dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+cost)}}return dp[la][lb]}function findFruitByInput(input){if(!input)return null;const queryLower=input.trim().toLowerCase(),fruits=getAllFruits();for(const f of fruits)if(f.rpName.toLowerCase()===queryLower)return{...f,matchType:"exact_rp"};for(const f of fruits)if(f.itemName.toLowerCase()===queryLower)return{...f,matchType:"exact_item"};for(const f of fruits)if(0===f.rpName.toLowerCase().indexOf(queryLower))return{...f,matchType:"partial_rp"};for(const f of fruits)if(-1!==f.rpName.toLowerCase().indexOf(queryLower))return{...f,matchType:"contains_rp"};for(const f of fruits)if(-1!==f.itemName.toLowerCase().indexOf(queryLower))return{...f,matchType:"contains_item"};return null}function getTargetName(targetId){try{return api.getEntityName(targetId)}catch(e){return"Unknown"}}function requireTarget(adminId){const targetId=function(adminId){const targetId=adminTargetPlayer[adminId];if(!targetId)return null;try{if(-1!==api.getPlayerIds().indexOf(targetId))return targetId}catch(e){}return null}(adminId);return targetId||(api.sendOverShopInfo(adminId,[ic("fa-solid fa-xmark", "red"),txt(' No target selected: use "Select Player" first.', "red")]),null)}function refreshTargetDisplay(adminId){const targetId=adminTargetPlayer[adminId];let name="None",color="#666666";if(targetId){const tName=getTargetName(targetId);"Unknown"!==tName?(name=tName,color="#55ff55"):(name="(disconnected)",color="#ff8844")}api.createShopItemForPlayer(adminId,"admin","target_display",{image:"Player Head",canBuy:!0,cost:0,buyButtonText:[txt("Select Me", "#55ff55")],sortPriority:95,customTitle:[txt("Target: ", "#888888"),bold(name, color)],description:[ic("fa-solid fa-user", color),txt(" Current target player.", "#888888"),"\nUse ",txt("Select Player", "#55aaff")," to change.",txt('\nClick "Select Me" to target yourself.', "#888888")]})}function resolveTargetPlayerId(adminId,input){if(!input)return null;const str=input.toString().trim();if(!str)return null;try{if(-1!==api.getPlayerIds().indexOf(str))return str}catch(e){}try{const id=api.getPlayerId(str);if(id)return id}catch(e){}return null}let _fruitItemMap=null;/* ==========================================================================
   COULEURS DES ITEMS (inspection d'inventaire)
   Ce sont des CATEGORIES D'OBJETS, pas des equipes : elles sortent donc
   volontairement de la palette de role.
     - item normal ...................... gris un peu plus fonce
     - item normal renomme (nom custom) . plus clair, pour ressortir
     - fruit du demon (sneak + click) ... rouge-orange
     - item de competence ............... bleu-violet
   ========================================================================== */

/* Nom d'item -> { rpName, rarity } pour tous les fruits. Les noms ambigus
   (un bloc qui sert a plusieurs fruits) sont ignores. */
function fruitItemMap() {
    if (_fruitItemMap) return _fruitItemMap;
    const map = {};
    const ambiguous = {};
    for (const rarity in FRUITS_BY_RARITY) {
        for (const fruit of FRUITS_BY_RARITY[rarity]) {
            const ability = FRUIT_ABILITIES[fruit.rpName];
            const type = ability && ability.baseItem && ability.baseItem.type ? ability.baseItem.type : fruit.itemName;
            const value = { rpName: fruit.rpName, rarity: fruit.rarity };
            const keys = [type, fruit.itemName];
            for (const key of keys) {
                if (!key) continue;
                if (map[key] && map[key].rpName !== value.rpName) ambiguous[key] = true;
                else map[key] = value;
            }
        }
    }
    for (const key in ambiguous) delete map[key];
    _fruitItemMap = map;
    return _fruitItemMap;
}

/* Nom affiche + couleur d'un item de l'inventaire.
   ABILITY = item d'un fruit, CAPACITY = item d'un style de combat : ce sont
   deux choses differentes, elles ont donc deux couleurs differentes. Les deux
   familles partagent parfois le meme item de base (Paintball Explosive Item),
   c'est le nom affiche (customDisplayName) qui tranche. */
function resolveItemLabel(item) {
    if (!item) return { name: "?", color: ITEM_COLOR.plain };
    const attrs = item.attributes;
    const ca = attrs ? attrs.customAttributes : null;
    const custom = attrs && attrs.customDisplayName ? String(attrs.customDisplayName) : "";

    /* 1. Fruit du demon : bloc mangeable (sneak + click). */
    if (ca && ca.isFruitBlock && ca.fruitRpName) {
        return { name: ca.fruitRpName, color: ITEM_COLOR.fruit };
    }

    /* 2. Capacity : item d'un style de combat (nom d'aptitude du style). */
    if (isFightingStyleAbilityName(custom)) {
        return { name: custom, color: ITEM_COLOR.capacity };
    }

    /* 3. Ability : item unique d'un fruit. */
    if (isAbilityItemName(item.name)) {
        return { name: custom || item.name, color: ITEM_COLOR.ability };
    }

    /* 4. Capacity sans nom affiche : on retombe sur l'item de base du style. */
    if (isFightingStyleItemName(item.name)) {
        return { name: custom || item.name, color: ITEM_COLOR.capacity };
    }

    /* 5. Fruit range sous son nom de bloc. */
    const mapped = fruitItemMap()[item.name];
    if (mapped) return { name: mapped.rpName, color: ITEM_COLOR.fruit };

    /* 6. Item normal renomme. */
    if (custom) return { name: custom, color: ITEM_COLOR.custom };

    /* 7. Item normal. */
    return { name: item.name, color: ITEM_COLOR.plain };
}

function buildDescriptionLines(title,items,color,compact){const lines=[];if(lines.push(bold(title+"\n", color)),0===items.length)lines.push(txt("  (empty)\n", "#666666"));else{const maxName=3===compact?8:2===compact?11:1===compact?15:26,grouped=[],byKey={};for(const item of items){const rawLabel=item.displayName||item.name||"?",itemColor=item.displayColor||"#cccccc",key=rawLabel+"|"+itemColor,label=rawLabel.length>maxName?rawLabel.slice(0,Math.max(2,maxName-4))+"."+rawLabel.slice(-3):rawLabel,amt="number"==typeof item.amount&&item.amount>0?item.amount:1;byKey[key]?(byKey[key].amount+=amt,byKey[key].slots++):(byKey[key]={label:label,color:itemColor,amount:amt,slots:1},grouped.push(byKey[key]))}if(compact){const perLine=3===compact?4:2===compact?3:2,sep=3===compact?", ":" | ";for(let i=0;i<grouped.length;){const first=grouped[i],chunk=[];for(;i<grouped.length&&chunk.length<perLine&&grouped[i].color===first.color;){const g=grouped[i++];chunk.push(g.label+(g.amount>1?" x"+g.amount:""))}lines.push(txt(" "+chunk.join(sep)+"\n", first.color))}}else for(const g of grouped){const amt=g.amount>1?" x"+g.amount:"",slots=g.slots>1&&g.amount!==g.slots?" ("+g.slots+" slots)":"";lines.push(txt("  "+g.label+amt+slots+"\n", g.color))}}return lines}function selectSelfTarget(adminId){releaseFreezeOnTargetChange(adminId,adminId),adminTargetPlayer[adminId]=adminId,refreshTargetDisplay(adminId);const selfName=getTargetName(adminId);api.sendOverShopInfo(adminId,[ic("fa-solid fa-check", "lightgreen"),txt("  Target set to "+selfName+" (yourself)!", "lightgreen")])}const CLEAR_SCOPE_OPTIONS=["All","Mobs only","Dropped items only","Meshes only","Throwables only","Loot only (Items + Meshes)"],CLEAR_SCOPES={all:{mobs:!0,items:!0,meshes:!0,throwables:!0},"mobs only":{mobs:!0,items:!1,meshes:!1,throwables:!1},"dropped items only":{mobs:!1,items:!0,meshes:!1,throwables:!1},"meshes only":{mobs:!1,items:!1,meshes:!0,throwables:!1},"throwables only":{mobs:!1,items:!1,meshes:!1,throwables:!0},"loot only (items + meshes)":{mobs:!1,items:!0,meshes:!0,throwables:!1}};function buildClearCountParts(scope,counts,sepStr,sepColor){const segs=[];scope.mobs&&segs.push(bold(counts.mobs+" mobs", "#ff8844")),scope.items&&segs.push(bold(counts.items+" items", "#ffdd55")),scope.meshes&&segs.push(bold(counts.meshes+" meshes", "#bb88ff")),scope.throwables&&segs.push(bold(counts.throwables+" throwables", "#66e0ff"));const out=[];for(let i=0;i<segs.length;i++)i>0&&out.push(txt(sepStr, sepColor)),out.push(segs[i]);return out}const vanishedPlayers=new Set;
export function isVanished(playerId){return vanishedPlayers.has(playerId)}function measureDescText(lines){let total=0;for(const line of lines)null!=line&&("string"!=typeof line?"string"==typeof line.str&&(total+=line.str.length):total+=line.length);return total}function buildFruitTarget(fruit){const ability=FRUIT_ABILITIES[fruit.rpName],names=[],type=ability&&ability.baseItem&&ability.baseItem.type?ability.baseItem.type:fruit.itemName;return type&&names.push(type),fruit.itemName&&-1===names.indexOf(fruit.itemName)&&names.push(fruit.itemName),{fruit:fruit,names:names}}function slotMatchesTarget(item,target){if(!item||!item.name||"Air"===item.name)return!1;if(target.fruit){let nameOk=!1;for(let i=0;i<target.names.length;i++)if(item.name===target.names[i]){nameOk=!0;break}if(!nameOk)return!1;const ca=item.attributes&&item.attributes.customAttributes;return!ca||!ca.isFruitBlock||ca.fruitRpName===target.fruit.rpName}return item.name.toLowerCase()===target.nameLower}function playerHasPlainItem(playerId,nameLower){for(let i=0;i<40;i++)try{const slot=api.getItemSlot(playerId,i);if(slot&&slot.name&&slot.name.toLowerCase()===nameLower)return!0}catch(e){}try{const chest=api.getMoonstoneChestItems(playerId);if(chest)for(let i=0;i<chest.length;i++){const entry=chest[i];if(entry&&entry.name&&entry.name.toLowerCase()===nameLower)return!0}}catch(e){}return!1}function removeTargetFromInventory(playerId,target,wanted){let remaining=wanted,removed=0;for(let i=0;i<40&&remaining>0;i++)try{const slot=api.getItemSlot(playerId,i);if(!slot||!slotMatchesTarget(slot,target))continue;const amt="number"==typeof slot.amount&&0!==slot.amount?slot.amount:1;if(amt<0)continue;const take=Math.min(remaining,amt);take>=amt?api.setItemSlot(playerId,i,"Air"):api.setItemSlot(playerId,i,slot.name,amt-take,slot.attributes),removed+=take,remaining-=take}catch(e){}return removed}function removeTargetFromMoonstone(playerId,target,wanted){if(wanted<=0)return 0;let remaining=wanted,removed=0,chest=null;try{chest=api.getMoonstoneChestItems(playerId)}catch(e){chest=null}if(!chest)return 0;for(let i=0;i<chest.length&&remaining>0;i++)try{const entry=chest[i];if(!entry||!slotMatchesTarget(entry,target))continue;const amt="number"==typeof entry.amount&&0!==entry.amount?entry.amount:1;if(amt<0)continue;const take=Math.min(remaining,amt);take>=amt?api.setMoonstoneChestItemSlot(playerId,i,"Air"):api.setMoonstoneChestItemSlot(playerId,i,entry.name,amt-take,entry.attributes),removed+=take,remaining-=take}catch(e){}return removed}function getBanList(){try{const raw=api.getLobbyDbValue("admin_banList");return raw?raw.toString().split(",").filter(function(n){return n.length>0}):[]}catch(e){return[]}}function saveBanList(list){try{api.setLobbyDbValue("admin_banList",list.join(","))}catch(e){}}function removeFromBanList(name){const list=getBanList(),idx=list.indexOf(name);-1!==idx&&list.splice(idx,1),saveBanList(list)}function isBannedByName(name){return-1!==getBanList().indexOf(name)}function getRecentList(){try{const raw=api.getLobbyDbValue("admin_recentList");return raw?raw.toString().split(",").filter(function(n){return n.length>0}):[]}catch(e){return[]}}
export function registerRecentPlayer(playerId){try{const name=api.getEntityName(playerId);if(!name)return;const list=getRecentList(),idx=list.indexOf(name);for(-1!==idx&&list.splice(idx,1),list.unshift(name);list.length>50;)list.pop();!function(list){try{api.setLobbyDbValue("admin_recentList",list.join(","))}catch(e){}}(list);try{api.setLobbyDbValue("admin_recent_"+name,Date.now())}catch(e){}}catch(e){}}function refreshUnbanDropdown(adminId){try{const banned=getBanList(),options=banned.length>0?banned:["(no banned players)"];api.updateShopItemForPlayer(adminId,"admin","unban",{userInput:{type:"dropdown",dropdownOptions:options}})}catch(e){}}
export function checkBanOnJoin(playerId){try{const name=api.getEntityName(playerId);if(!name)return!1;if("K4miNoK4mi"===name||"Yanick2010"===name||"EPICOO00000"===name||"Chillguy45"===name){removeFromBanList(name);try{api.deleteLobbyDbValue("admin_ban_"+name)}catch(e){}try{api.deletePlayerDbValue(playerId,"ban")}catch(e){}try{api.deletePlayerDbValue(playerId,"banBy")}catch(e){}return!1}if(!isBannedByName(name))return!1;let banBy="Admin";try{const raw=api.getLobbyDbValue("admin_ban_"+name);raw&&(banBy=raw.toString().split("|")[0]||"Admin")}catch(e){}return api.kickPlayer(playerId,"You are banned from this lobby. (Banned by "+banBy+")"),!0}catch(e){return!1}}
/* ==========================================================================
   CLEAR DU PANNEAU : AUCUN XP, AUCUN ARGENT

   Un mob supprime par un admin mourait "normalement" du point de vue du
   moteur : onMobDespawned / onEntityDeleted regardaient le dernier joueur qui
   l'avait frappe et lui versaient XP et argent. Un joueur n'avait donc qu'a
   taper un mob puis demander un clear (ou attendre qu'un staff en fasse un)
   pour toucher le pactole sans le tuer.

   `blockKillCredit(id)` verrouille la cible AVANT le despawn : le credit est
   refuse, comme pour un mob deja paye. A appeler sur CHAQUE id avant
   api.despawnMob — jamais apres, l'event serait deja parti.
   ========================================================================== */

function noMobCredit(entityId) {
    try { blockKillCredit(entityId); } catch (e) {}
}

export function handleAdminShop(playerId,categoryKey,itemKey,item,userInput){if("admin"!==categoryKey)return;const requiredLevel=ACTION_PERMISSIONS[itemKey];if(void 0!==requiredLevel)if(hasPermission(playerId,requiredLevel))switch(itemKey){case"select_target":!function(adminId,userInput){if(!(userInput||"").toString().trim())return void selectSelfTarget(adminId);const targetId=resolveTargetPlayerId(0,userInput);if(!targetId)return void api.sendOverShopInfo(adminId,[ic("fa-solid fa-xmark", "red"),txt("  Invalid player!", "red")]);releaseFreezeOnTargetChange(adminId,targetId),adminTargetPlayer[adminId]=targetId,refreshTargetDisplay(adminId);const name=getTargetName(targetId);api.sendOverShopInfo(adminId,[ic("fa-solid fa-check", "lightgreen"),txt("  Target set to "+name+"!", "lightgreen")])}(playerId,userInput),resetLevelMenuItem(playerId);break;case"target_display":selectSelfTarget(playerId);break;case"tp_to":canAdminTp(playerId)&&!function(adminId){const targetId=requireTarget(adminId);if(!targetId)return;if(targetId===adminId)return void api.sendOverShopInfo(adminId,[ic("fa-solid fa-xmark", "red"),txt("  You can't teleport to yourself!", "red")]);let pos;try{pos=api.getPosition(targetId)}catch(e){return void api.sendOverShopInfo(adminId,[ic("fa-solid fa-xmark", "red"),txt("  Could not get target position!", "red")])}api.setPosition(adminId,pos[0],pos[1]+1,pos[2]);const name=getTargetName(targetId);api.sendOverShopInfo(adminId,[ic("fa-solid fa-check", "lightgreen"),txt("  Teleported to "+name+"!", "lightgreen")]),say(adminId,[ic("fa-solid fa-shield-halved", "#FFD700"),bold(" [Admin] ", "#FFD700"),txt("Teleported to ", "#aaaaaa"),txt(name, "#55aaff")])}(playerId);break;case"tp_here":canAdminTp(playerId)&&!function(adminId){const targetId=requireTarget(adminId);if(!targetId)return;if(targetId===adminId)return void api.sendOverShopInfo(adminId,[ic("fa-solid fa-xmark", "red"),txt("  You can't summon yourself!", "red")]);let pos;try{pos=api.getPosition(adminId)}catch(e){return void api.sendOverShopInfo(adminId,[ic("fa-solid fa-xmark", "red"),txt("  Could not get your position!", "red")])}api.setPosition(targetId,pos[0],pos[1]+1,pos[2]);const name=getTargetName(targetId);api.sendOverShopInfo(adminId,[ic("fa-solid fa-check", "lightgreen"),txt("  Summoned "+name+"!", "lightgreen")]),say(adminId,[ic("fa-solid fa-shield-halved", "#FFD700"),bold(" [Admin] ", "#FFD700"),txt("Summoned ", "#aaaaaa"),txt(name, "#ff8855"),txt(" to your location.", "#aaaaaa")]);try{say(targetId,[ic("fa-solid fa-shield-halved", "#FFD700"),bold(" [Admin] ", "#FFD700"),txt("You have been summoned by an admin.", "#ff8855")])}catch(e){}}(playerId);break;case"tp_to_pos":canAdminTp(playerId)&&!function(adminId,userInput){const coords=function(text){if(!text)return null;const parts=text.toString().split(/[,\s]+/).filter(Boolean);if(parts.length<3)return null;const x=parseFloat(parts[0]),y=parseFloat(parts[1]),z=parseFloat(parts[2]);return isNaN(x)||isNaN(y)||isNaN(z)?null:[x,y,z]}(userInput);coords?(api.setPosition(adminId,coords[0],coords[1],coords[2]),api.sendOverShopInfo(adminId,[ic("fa-solid fa-check", "lightgreen"),txt("  Teleported to ["+coords[0]+", "+coords[1]+", "+coords[2]+"]!", "lightgreen")]),say(adminId,[ic("fa-solid fa-shield-halved", "#FFD700"),bold(" [Admin] ", "#FFD700"),txt("Teleported to ", "#aaaaaa"),txt("["+coords[0]+", "+coords[1]+", "+coords[2]+"]", "#aa55ff")])):api.sendOverShopInfo(adminId,[ic("fa-solid fa-xmark", "red"),txt("  Invalid coordinates! Use format: x, y, z", "red")])}(playerId,userInput);break;case"warp_island":canAdminTp(playerId)&&!function(adminId,userInput){const islandName=(userInput||"").toString().trim(),islands=adminIslands(),pos=islands[islandName];pos?(api.setPosition(adminId,pos[0],pos[1],pos[2]),api.sendOverShopInfo(adminId,[ic("fa-solid fa-check", "lightgreen"),txt("  Warped to "+islandName+"!", "lightgreen")]),say(adminId,[ic("fa-solid fa-shield-halved", "#FFD700"),bold(" [Admin] ", "#FFD700"),txt("Warped to ", "#aaaaaa"),bold(islandName, "#55ff88")])):api.sendOverShopInfo(adminId,[ic("fa-solid fa-xmark", "red"),txt("  Unknown island!", "red")])}(playerId,userInput);break;case"clear_entities":!function(adminId,userInput){const scopeKey=(userInput||"").toString().trim().toLowerCase();let scope=CLEAR_SCOPES[scopeKey];if(!scope){if(""!==scopeKey)return void api.sendOverShopInfo(adminId,[ic("fa-solid fa-xmark", "red"),txt("  Unknown scope! Pick one from the list.", "red")]);scope=CLEAR_SCOPES.all}let mobCount=0,itemCount=0,meshCount=0,throwableCount=0;if(scope.mobs)try{const mobIds=api.getMobIds()||[];for(const mobId of mobIds){noMobCredit(mobId);try{api.despawnMob(mobId),mobCount++}catch(e){}}}catch(e){}try{const W=5e4,ids=api.getEntitiesInRect([-W,-W,-W],[W,W,W])||[];for(const id of ids)try{if(!api.checkValid(id))continue;const type=api.getEntityType(id);if("Player"===type)continue;if("Item"===type){if(!scope.items)continue;try{api.deleteItemDrop(id),itemCount++}catch(e){}continue}if("Mesh"===type){if(!scope.meshes)continue;try{api.deleteMeshEntity(id)&&meshCount++}catch(e){}continue}if(scope.throwables&&type&&-1!==String(type).toLowerCase().indexOf("throw")){try{api.deleteThrowable(id),throwableCount++}catch(e){}continue}if(scope.mobs){noMobCredit(id);try{api.despawnMob(id),mobCount++}catch(e){if(scope.throwables)try{api.deleteThrowable(id),throwableCount++}catch(e2){}}}else if(scope.throwables)try{api.deleteThrowable(id),throwableCount++}catch(e){}}catch(e){}}catch(e){}const counts={mobs:mobCount,items:itemCount,meshes:meshCount,throwables:throwableCount};api.sendOverShopInfo(adminId,[ic("fa-solid fa-recycle", "lightgreen"),txt("  Cleared ", "lightgreen"),...buildClearCountParts(scope,counts,", ","#888888"),txt("!", "lightgreen")]),say(adminId,[ic("fa-solid fa-shield-halved", "#FFD700"),bold(" [Admin] ", "#FFD700"),txt("Cleared ", "#aaaaaa"),...buildClearCountParts(scope,counts,", ","#aaaaaa"),txt(".", "#aaaaaa")])}(playerId,userInput);break;case"vanish":!function(adminId){if(!hasPermission(adminId,PERMISSION_LEVELS.MOD))return;let adminName="Admin";try{adminName=api.getEntityName(adminId)||"Admin"}catch(e){}if(isVanished(adminId)){vanishedPlayers.delete(adminId);try{fakeJoinLeave(adminName+" joined")}catch(e){}try{api.setPlayerOpacity(adminId,1)}catch(e){}try{api.setTargetedPlayerSettingForEveryone(adminId,"canSee",!0,!0)}catch(e){}let restored=!1;try{"function"==typeof updateNameTag&&(updateNameTag(adminId),restored=!0)}catch(e){}if(!restored)try{api.setTargetedPlayerSettingForEveryone(adminId,"nameTagInfo",{content:[txt(adminName, "white")],healthbar:{height:"19px",display:"always",backgroundColour:"gray"}},!0)}catch(e){}try{"function"==typeof refreshLeaderboardPlayer&&refreshLeaderboardPlayer(adminId)}catch(e){}api.sendOverShopInfo(adminId,[ic("fa-solid fa-eye", "#ffaa00"),bold("  Vanish DISABLED — you are visible again.", "#ffaa00")]),say(adminId,[ic("fa-solid fa-shield-halved", "#FFD700"),bold(" [Admin] ", "#FFD700"),txt("Vanish disabled. Fake join broadcast sent.", "#ffaa00")])}else{vanishedPlayers.add(adminId);try{fakeJoinLeave(adminName+" left")}catch(e){}try{api.setPlayerOpacity(adminId,0)}catch(e){}try{api.setTargetedPlayerSettingForEveryone(adminId,"canSee",!1,!0)}catch(e){}try{api.setTargetedPlayerSettingForEveryone(adminId,"nameTagInfo",{content:[],subtitle:[],border:null,healthbar:{display:"never"}},!0)}catch(e){}try{api.setTargetedPlayerSettingForEveryone(adminId,"hasPriorityNametag",!1,!0)}catch(e){}try{api.setTargetedPlayerSettingForEveryone(adminId,"multilineTextBox",null,!0)}catch(e){}try{api.setTargetedPlayerSettingForEveryone(adminId,"lobbyLeaderboardValues",null,!0)}catch(e){}try{api.setTargetedPlayerSettingForEveryone(adminId,"colorInLobbyLeaderboard","",!0)}catch(e){}try{api.setTargetedPlayerSettingForEveryone(adminId,"lobbyLeaderboardTags",null,!0)}catch(e){}api.sendOverShopInfo(adminId,[ic("Invisible", "#cef3ff"),bold("  Vanish ENABLED — you are now completely invisible!", "#cef3ff")]),say(adminId,[ic("fa-solid fa-shield-halved", "#FFD700"),bold(" [Admin] ", "#FFD700"),txt("Vanish enabled. Fake leave broadcast sent.", "#cef3ff")])}!function(playerId){if(!hasPermission(playerId,PERMISSION_LEVELS.MOD))return;const vanished=isVanished(playerId);try{api.updateShopItemForPlayer(playerId,"admin","vanish",{customTitle:[bold(vanished?"Vanish [ON]":"Vanish [OFF]", vanished?"#00ffff":"#cef3ff")],buyButtonText:[txt(vanished?"Disable":"Enable", vanished?"#ff6666":"#55ff55")],description:[ic("Invisible", "#cef3ff")," Total invisibility mode (fake leave/join, hidden from leaderboard & nametag).",vanished?bold("\n● STATUS: CURRENTLY VANISHED (hidden from everyone)", "#00ffff"):txt("\n● STATUS: Visible", "#888888"),txt("\n(MOD+ only)", "#888888")]})}catch(e){}}(adminId)}(playerId);break;case"kick":!function(adminId){const targetId=requireTarget(adminId);if(!targetId)return;if(targetId===adminId)return void api.sendOverShopInfo(adminId,[ic("fa-solid fa-xmark", "red"),txt("  You can't kick yourself!", "red")]);if(getPermissionLevel(targetId)>=getPermissionLevel(adminId))return void api.sendOverShopInfo(adminId,[ic("fa-solid fa-shield", "orange"),txt("  Cannot kick a player with equal or higher rank!", "orange")]);const name=getTargetName(targetId);let adminName;try{adminName=api.getEntityName(adminId)}catch(e){adminName="Admin"}try{api.kickPlayer(targetId,"Kicked by "+adminName)}catch(e){return void api.sendOverShopInfo(adminId,[ic("fa-solid fa-xmark", "red"),txt("  Failed to kick player!", "red")])}api.sendOverShopInfo(adminId,[ic("fa-solid fa-check", "lightgreen"),txt("  Kicked "+name+"!", "lightgreen")]),say(adminId,[ic("fa-solid fa-shield-halved", "#FFD700"),bold(" [Admin] ", "#FFD700"),txt("Kicked ", "#aaaaaa"),bold(name, "#ff4444")]);try{shout([ic("fa-solid fa-shield-halved", "#FFD700"),bold(" [Admin] ", "#FFD700"),txt(name, "#ff4444"),txt(" has been kicked.", "#aaaaaa")])}catch(e){}}(playerId);break;case"view_inventory":!function(adminId){const targetId=requireTarget(adminId);if(!targetId)return;const name=getTargetName(targetId),inv=function(targetId){const items=[];for(let i=0;i<40;i++)try{const slot=api.getItemSlot(targetId,i);if(slot&&slot.name&&"Air"!==slot.name){const label=resolveItemLabel(slot);items.push({slot:i,name:slot.name,amount:slot.amount||1,displayName:label.name,displayColor:label.color})}}catch(e){}return items}(targetId),moon=function(targetId){try{const chest=api.getMoonstoneChestItems(targetId);if(!chest)return[];const items=[];for(let i=0;i<chest.length;i++){const entry=chest[i];if(entry&&entry.name&&"Air"!==entry.name){const label=resolveItemLabel(entry);items.push({slot:i,name:entry.name,amount:entry.amount||1,displayName:label.name,displayColor:label.color})}}return items}catch(e){return[]}}(targetId),PAGE_LIMIT=410,makePages=function(compact){const invLines=buildDescriptionLines("Inventory ("+inv.length+" item"+(1!==inv.length?"s":"")+")",inv,"#ffdd55",compact),moonLines=buildDescriptionLines("Moonstone Chest ("+moon.length+" item"+(1!==moon.length?"s":"")+")",moon,"#bb88ff",compact),body=[];for(const l of invLines)body.push({line:l,section:0});body.push({line:{str:"\n",style:{}},section:-1});for(const l of moonLines)body.push({line:l,section:1});const moonTitleIdx=invLines.length+1,buildPre=function(pageNum,cutIdx){const pre=[bold(name+(pageNum>1?" - page "+pageNum:"")+"\n", "#FFD700")];if(pageNum>1&&cutIdx<body.length){const sec=body[cutIdx].section;0===sec&&0!==cutIdx?pre.push(bold("Inventory (continued)\n", "#ffdd55")):1===sec&&cutIdx!==moonTitleIdx&&pre.push(bold("Moonstone Chest (continued)\n", "#bb88ff"))}return pre},takePage=function(pageNum,startIdx,reserveFooter){const pre=buildPre(pageNum,startIdx);let used=measureDescText(pre),idx=startIdx,count=0;const limit=PAGE_LIMIT-(reserveFooter?28:0);for(;idx<body.length;){const pieceLen=measureDescText([body[idx].line]);if(count>0&&used+pieceLen>limit)break;used+=pieceLen,idx++,count++}return{pre:pre,end:idx}};let p1=takePage(1,0,!1);p1.end<body.length&&(p1=takePage(1,0,!0));const desc1=p1.pre.slice();for(let i=0;i<p1.end;i++)desc1.push(body[i].line);p1.end<body.length&&desc1.push(txt("\n... more on page 2 below", "#888888"));let desc2,desc3,overflow=0;if(p1.end>=body.length)desc2=[txt("Nothing more to show.\n", "#888888"),txt("All items fit on page 1.", "#666666")],desc3=[txt("Nothing more to show.\n", "#888888"),txt("All items fit on page 1.", "#666666")];else{let p2=takePage(2,p1.end,!1);p2.end<body.length&&(p2=takePage(2,p1.end,!0)),desc2=p2.pre.slice();for(let i=p1.end;i<p2.end;i++)desc2.push(body[i].line);if(p2.end>=body.length)desc3=[txt("Nothing more to show.\n", "#888888"),txt("All items fit on pages 1-2.", "#666666")];else{desc2.push(txt("\n... more on page 3 below", "#888888"));let p3=takePage(3,p2.end,!1);p3.end<body.length&&(p3=takePage(3,p2.end,!0)),desc3=p3.pre.slice();for(let i=p2.end;i<p3.end;i++)desc3.push(body[i].line);if(p3.end<body.length){overflow=body.length-p3.end;desc3.push(txt("\n... +"+overflow+" more lines", "#ff8844"))}}}return{desc1:desc1,desc2:desc2,desc3:desc3,overflow:overflow}};let pages=makePages(0);pages.overflow>0&&(pages=makePages(1)),pages.overflow>0&&(pages=makePages(2)),pages.overflow>0&&(pages=makePages(3));const{desc1:desc1,desc2:desc2,desc3:desc3}=pages;try{api.createShopItemForPlayer(adminId,"admin","inventory_display",{image:"Book",canBuy:!1,sortPriority:35,customTitle:[txt("Inspecting: ", "#888888"),bold(name, "#FFD700")],description:desc1})}catch(e){}try{api.createShopItemForPlayer(adminId,"admin","inventory_display2",{image:"Book",canBuy:!1,sortPriority:34,customTitle:[txt("Inspecting: ", "#888888"),bold(name, "#FFD700"),txt(" (page 2)", "#888888")],description:desc2})}catch(e){}try{api.createShopItemForPlayer(adminId,"admin","inventory_display3",{image:"Book",canBuy:!1,sortPriority:33,customTitle:[txt("Inspecting: ", "#888888"),bold(name, "#FFD700"),txt(" (page 3)", "#888888")],description:desc3})}catch(e){}api.sendOverShopInfo(adminId,[ic("fa-solid fa-check", "lightgreen"),txt("  Inspecting "+name+"'s inventory!", "lightgreen")]),say(adminId,[ic("fa-solid fa-shield-halved", "#FFD700"),bold(" [Admin] ", "#FFD700"),txt("Inventory of ", "#aaaaaa"),bold(name, "#ffdd55"),txt(" - "+inv.length+" items, "+moon.length+" in Moonstone Chest.", "#aaaaaa")])}(playerId);break;case"set_gamemode":!function(adminId,userInput){if(!isOwner(adminId))return;const targetId=requireTarget(adminId);if(!targetId)return;const gamemode=(userInput||"").toString().trim().toLowerCase();if(!gamemode||-1===GAMEMODES.indexOf(gamemode))return void api.sendOverShopInfo(adminId,[ic("fa-solid fa-xmark", "red"),txt("  Please select a valid gamemode!", "red")]);const name=getTargetName(targetId);try{api.setPlayerGamemode(targetId,gamemode)}catch(e){return void api.sendOverShopInfo(adminId,[ic("fa-solid fa-xmark", "red"),txt("  Failed to set gamemode!", "red")])}if(api.sendOverShopInfo(adminId,[ic("fa-solid fa-check", "lightgreen"),txt("  "+name+" → "+gamemode, "lightgreen")]),say(adminId,[ic("fa-solid fa-crown", "#FFD700"),bold(" [Owner] ", "#FFD700"),txt("Set ", "#aaaaaa"),txt(name, "#FFD700"),txt(" gamemode to ", "#aaaaaa"),bold(gamemode, "#FFD700")]),targetId!==adminId)try{say(targetId,[ic("fa-solid fa-shield-halved", "#FFD700"),bold(" [Admin] ", "#FFD700"),txt("Your gamemode has been changed to ", "#aaaaaa"),bold(gamemode, "#FFD700"),txt(" by an owner.", "#aaaaaa")])}catch(e){}}(playerId,userInput);break;case"ban":!function(adminId){if(!isOwner(adminId))return;const targetId=requireTarget(adminId);if(!targetId)return;if(targetId===adminId)return void api.sendOverShopInfo(adminId,[ic("fa-solid fa-xmark", "red"),txt("  You can't ban yourself!", "red")]);if(hasPermission(targetId,PERMISSION_LEVELS.OWNER))return void api.sendOverShopInfo(adminId,[ic("fa-solid fa-shield", "orange"),txt("  Cannot ban another Owner!", "orange")]);const name=getTargetName(targetId);let adminName;try{adminName=api.getEntityName(adminId)}catch(e){adminName="Owner"}try{!function(name){const list=getBanList();-1===list.indexOf(name)&&list.push(name),saveBanList(list)}(name),api.setLobbyDbValue("admin_ban_"+name,adminName+"|"+Date.now())}catch(e){return void api.sendOverShopInfo(adminId,[ic("fa-solid fa-xmark", "red"),txt("  Failed to save ban!", "red")])}try{api.kickPlayer(targetId,"You have been banned from this lobby by "+adminName+".")}catch(e){}api.sendOverShopInfo(adminId,[ic("fa-solid fa-check", "lightgreen"),txt("  Banned "+name+"!", "lightgreen")]),say(adminId,[ic("fa-solid fa-crown", "#FFD700"),bold(" [Owner] ", "#FFD700"),txt("Banned ", "#aaaaaa"),bold(name, "#cc0000"),txt(" permanently.", "#aaaaaa")]);try{shout([ic("fa-solid fa-shield-halved", "#FFD700"),bold(" [Admin] ", "#FFD700"),txt(name, "#cc0000"),txt(" has been banned.", "#aaaaaa")])}catch(e){}refreshUnbanDropdown(adminId)}(playerId);break;case"unban":!function(adminId,userInput){if(!isOwner(adminId))return;const playerName=(userInput||"").toString().trim();if(playerName&&"(no banned players)"!==playerName){if(!isBannedByName(playerName))return api.sendOverShopInfo(adminId,[ic("fa-solid fa-triangle-exclamation", "orange"),txt('  "'+playerName+'" is not in the ban list.', "orange")]),void refreshUnbanDropdown(adminId);try{removeFromBanList(playerName),api.deleteLobbyDbValue("admin_ban_"+playerName)}catch(e){}try{const targetId=resolveTargetPlayerId(0,playerName);if(targetId){try{api.deletePlayerDbValue(targetId,"ban")}catch(e){}try{api.deletePlayerDbValue(targetId,"banBy")}catch(e){}say(targetId,[ic("fa-solid fa-shield-halved", "#FFD700"),bold(" [Admin] ", "#FFD700"),txt("You have been unbanned from this lobby!", "#55ff55")])}}catch(e){}refreshUnbanDropdown(adminId),api.sendOverShopInfo(adminId,[ic("fa-solid fa-check", "lightgreen"),txt("  Unbanned "+playerName+"!", "lightgreen")]),say(adminId,[ic("fa-solid fa-crown", "#FFD700"),bold(" [Owner] ", "#FFD700"),txt("Unbanned ", "#aaaaaa"),bold(playerName, "#55ff55"),txt(" from this lobby.", "#aaaaaa")])}else api.sendOverShopInfo(adminId,[ic("fa-solid fa-xmark", "red"),txt("  No banned player selected!", "red")])}(playerId,userInput);break;case"ban_list":!function(adminId){if(!isOwner(adminId))return;const banned=getBanList(),recent=getRecentList(),descLines=[];if(descLines.push(bold("Banned Players ("+banned.length+")\n", "#cc0000")),0===banned.length)descLines.push(txt("  (no bans)\n", "#666666"));else for(const name of banned){let info="";try{const raw=api.getLobbyDbValue("admin_ban_"+name);raw&&(info=" (by "+raw.toString().split("|")[0]+")")}catch(e){}descLines.push(txt("  "+name+info+"\n", "#ff6666"))}if(descLines.push({str:"\n",style:{}}),descLines.push(bold("Recent Players ("+Math.min(recent.length,20)+")\n", "#55aaff")),0===recent.length)descLines.push(txt("  (none)\n", "#666666"));else{const shown=recent.slice(0,20);for(const name of shown){const isBanned=-1!==banned.indexOf(name);descLines.push(txt("  "+name+(isBanned?" [BANNED]":"")+"\n", isBanned?"#ff6666":"#aaaaaa"))}}api.createShopItemForPlayer(adminId,"admin","ban_list_display",{image:"Book",canBuy:!1,sortPriority:22,customTitle:[bold("Ban List & Recent", "#cc0000")],description:descLines}),refreshUnbanDropdown(adminId),api.sendOverShopInfo(adminId,[ic("fa-solid fa-check", "lightgreen"),txt("  Ban list refreshed!", "lightgreen")])}(playerId);break;case"freeze":freezeTarget(playerId);break;case"mute":muteTarget(playerId,userInput);break;case"unmute":unmuteTarget(playerId,userInput);break;case"mute_list":hasPermission(playerId,PERMISSION_LEVELS.MOD)&&refreshMuteListDisplay(playerId);break;case"unmute_name":unmuteByNameTarget(playerId,userInput);break;case"announce":announceTarget(playerId,userInput);break;case"give_fruit":!function(adminId,userInput){if(!isOwner(adminId))return;const targetId=requireTarget(adminId);if(!targetId)return;const fruitQuery=(userInput||"").toString().trim();if(!fruitQuery)return void api.sendOverShopInfo(adminId,[ic("fa-solid fa-xmark", "red"),txt("  Type a fruit or item name!", "red")]);const targetName=getTargetName(targetId),found=findFruitByInput(fruitQuery);if(!found){const suggestions=function(input){const queryLower=input.trim().toLowerCase(),scored=[],fruits=getAllFruits();for(const f of fruits){const dRp=levenshtein(queryLower,f.rpName.toLowerCase()),dItem=levenshtein(queryLower,f.itemName.toLowerCase()),bestDist=Math.min(dRp,dItem);scored.push({fruit:f,distance:bestDist,matchedBy:dRp<=dItem?"rpName":"itemName"})}return scored.sort((a,b)=>a.distance-b.distance),scored.slice(0,5)}(fruitQuery);if(api.sendOverShopInfo(adminId,[ic("fa-solid fa-circle-question", "orange"),txt('  Fruit not found: "'+fruitQuery+'"', "orange")]),suggestions.length>0){say(adminId,[ic("fa-solid fa-magnifying-glass", "#ff8844"),bold(" [Admin] ", "#FFD700"),txt("Did you mean:\n", "#ff8844")]);for(const sug of suggestions){const rarity=FRUIT_RARITIES.find(function(r){return r.name===sug.fruit.rarity}),color=rarity?rarity.color:"#ffffff";say(adminId,[ic("fa-solid fa-caret-right", color),bold(" "+sug.fruit.rpName, color),txt(" ("+sug.fruit.itemName+")", "#888888"),txt(" ["+sug.fruit.rarity+"]", color)])}}return}const fruitData=found,ability=FRUIT_ABILITIES[fruitData.rpName],rarity=FRUIT_RARITIES.find(function(r){return r.name===fruitData.rarity}),color=rarity?rarity.color:"#ffffff",attributes={customDisplayName:fruitData.rpName,customDescription:"● "+fruitData.rarity+" Fruit ●\n"+fruitData.rpDesc+"\n[Sneak + Click to consume | Drop to give away]",customAttributes:{enchantmentTier:getRarityEnchantTier(fruitData.rarity),isFruitBlock:!0,fruitRpName:fruitData.rpName,uniqueRollId:Date.now()+"_"+Math.floor(1e5*Math.random())}},itemType=ability&&ability.baseItem?ability.baseItem.type:fruitData.itemName;try{api.giveItem(targetId,itemType,1,attributes)}catch(e){return void api.sendOverShopInfo(adminId,[ic("fa-solid fa-xmark", "red"),txt("  Failed to give fruit!", "red")])}api.sendOverShopInfo(adminId,[ic("fa-solid fa-check", "lightgreen"),txt("  Gave "+fruitData.rpName+" to "+targetName+"!", "lightgreen")]),say(adminId,[ic("fa-solid fa-crown", "#FFD700"),bold(" [Owner] ", "#FFD700"),txt("Gave ", "#aaaaaa"),bold(fruitData.rpName, color),txt(" ("+fruitData.itemName+") to ", "#aaaaaa"),txt(targetName, "#FFD700")]);try{say(targetId,[ic("fa-solid fa-shield-halved", "#FFD700"),bold(" [Admin] ", "#FFD700"),txt("You received a ", "#aaaaaa"),bold(fruitData.rpName, color),txt(" fruit! Hold it and Sneak + Click to eat.", "#55ff55")])}catch(e){}}(playerId,userInput);break;case"remove_items":!function(adminId,userInput){if(!isOwner(adminId))return;const targetId=requireTarget(adminId);if(!targetId)return;const entries=function(input){const str=(input||"").toString().trim();if(!str)return[];const entries=[],parts=str.split(",");for(let i=0;i<parts.length;i++){const s=parts[i].trim();if(!s)continue;let amount=1,name=s;const m=s.match(/^(\d+)\s+(.+)$/);if(m)amount=parseInt(m[1],10),name=m[2].trim();else{const m2=s.match(/^(\d+)(\D.+)$/);m2&&(amount=parseInt(m2[1],10),name=m2[2].trim())}name&&amount>0&&entries.push({amount:amount,name:name})}return entries}(userInput);if(0===entries.length)return void api.sendOverShopInfo(adminId,[ic("fa-solid fa-xmark", "red"),txt("  Format: <amount> <name>, <amount> <name>… (e.g. 999 Dirt, 2 Control)", "red")]);const targetName=getTargetName(targetId),results=[],notFound=[];for(const entry of entries){const nameLower=entry.name.toLowerCase(),fruitFound=findFruitByInput(entry.name);let target;target=!fruitFound||"exact_rp"!==fruitFound.matchType&&"exact_item"!==fruitFound.matchType?playerHasPlainItem(targetId,nameLower)?{nameLower:nameLower}:fruitFound?buildFruitTarget(fruitFound):{nameLower:nameLower}:buildFruitTarget(fruitFound);const invRemoved=removeTargetFromInventory(targetId,target,entry.amount),total=invRemoved+removeTargetFromMoonstone(targetId,target,entry.amount-invRemoved);if(total>0){const label=target.fruit?target.fruit.rpName:entry.name;results.push({label:label,amount:total})}else notFound.push(entry.name)}if(results.length>0){const removedStr=results.map(function(r){return r.amount+" "+r.label}).join(", "),infoParts=[ic("fa-solid fa-check", "lightgreen"),txt("  Removed "+removedStr+" from "+targetName+"!", "lightgreen")];if(notFound.length>0&&infoParts.push(txt("\nNot found: "+notFound.join(", "), "orange")),api.sendOverShopInfo(adminId,infoParts),say(adminId,[ic("fa-solid fa-crown", "#FFD700"),bold(" [Owner] ", "#FFD700"),txt("Removed from ", "#aaaaaa"),txt(targetName, "#FFD700"),bold(": "+removedStr, "#ff8844")]),notFound.length>0&&say(adminId,[ic("fa-solid fa-crown", "#FFD700"),bold(" [Owner] ", "#FFD700"),txt("Not found: ", "orange"),bold(notFound.join(", "), "orange")]),targetId!==adminId)try{say(targetId,[ic("fa-solid fa-shield-halved", "#FFD700"),bold(" [Admin] ", "#FFD700"),txt("Items were removed from your inventory by an owner.", "#ff8844")])}catch(e){}}else api.sendOverShopInfo(adminId,[ic("fa-solid fa-triangle-exclamation", "orange"),txt("  Nothing removed — not found: "+notFound.join(", "), "orange")])}(playerId,userInput);break;case"set_money":setTargetMoney(playerId,userInput);break;case"set_level":setTargetLevelMenu(playerId,userInput)}else api.sendOverShopInfo(playerId,[ic("fa-solid fa-lock", "red"),txt("  You don't have permission to use this!", "red")])}
export function adminJoin(playerId){if(hasPermission(playerId,PERMISSION_LEVELS.BASIC)){!function(playerId){if(releaseFreezeOnTargetChange(playerId,playerId),adminTargetPlayer[playerId]=playerId,api.configureShopCategoryForPlayer(playerId,"admin",{customTitle:"Admin Panel",autoSelectCategory:!1,sortPriority:200}),panelItem(playerId,"info",{image:"Golden Crown",canBuy:!1,sortPriority:100,customTitle:[bold("Admin Panel", "#FFD700")],description:[ic("fa-solid fa-shield-halved", "#FFD700")," Welcome to the ",bold("Admin Panel", "#FFD700"),".\nUse the buttons below to perform admin actions."]}),panelItem(playerId,"select_target",{image:"Player Head",imageColour:"#55aaff",canBuy:!0,cost:0,sortPriority:98,customTitle:[bold("Select Player", "#55aaff")],buyButtonText:[txt("Select", "#55aaff")],description:[ic("fa-solid fa-crosshairs", "#55aaff")," Pick the player to target with other actions.","\nThis selection is used by ",txt("TP To, TP Here, Kick, Ban, View Inventory, Set Gamemode, Give Fruit", "#cccccc"),".",txt('\nClick "Select" without picking anyone to target yourself.', "#888888")],userInput:{type:"player"}}),refreshTargetDisplay(playerId),panelItem(playerId,"tp_to",{image:"Compass",imageColour:"#55aaff",canBuy:!0,cost:0,sortPriority:90,customTitle:[bold("TP To Player", "#55aaff")],buyButtonText:[txt("Teleport", "#55aaff")],description:[ic("fa-solid fa-door-open", "#55aaff")," Teleport ",bold("yourself", "#ffffff")," to the selected target."]}),panelItem(playerId,"tp_here",{image:"Compass",imageColour:"#ff8855",canBuy:!0,cost:0,sortPriority:80,customTitle:[bold("TP Here", "#ff8855")],buyButtonText:[txt("Summon", "#ff8855")],description:[ic("fa-solid fa-user-plus", "#ff8855")," Teleport the target player ",bold("to you", "#ffffff"),"."]}),panelItem(playerId,"tp_to_pos",{image:"Map",imageColour:"#aa55ff",canBuy:!0,cost:0,sortPriority:70,customTitle:[bold("TP To Position", "#aa55ff")],buyButtonText:[txt("Go", "#aa55ff")],description:[ic("fa-solid fa-crosshairs", "#aa55ff")," Teleport yourself to ",bold("coordinates", "#ffffff"),".\nFormat: ",txt("x, y, z", "#cccccc")," (e.g. 700, -910, -200)"],userInput:{type:"text",placeholderText:"x, y, z",wordCharsOnly:!1}}),panelItem(playerId,"warp_island",{image:"Map",imageColour:"#55ff88",canBuy:!0,cost:0,sortPriority:65,customTitle:[bold("Warp to Island", "#55ff88")],buyButtonText:[txt("Warp", "#55ff88")],description:[ic("fa-solid fa-globe", "#55ff88")," Teleport yourself to an ",bold("island", "#ffffff"),".",txt("\n(All staff including Testers+)", "#888888")],userInput:{type:"dropdown",dropdownOptions:Object.keys(adminIslands())}}),panelItem(playerId,"clear_entities",{image:"Iron Sword",imageColour:"#ff6600",canBuy:!0,cost:0,sortPriority:60,customTitle:[bold("Clear Entities", "#ff6600")],buyButtonText:[txt("Clear", "#ff4444")],description:[ic("fa-solid fa-recycle", "#ff6600")," Pick in the list what to clear: ",bold("All", "#ffffff"),", mobs, dropped items, meshes, throwables, loot…","\nPlayers are never touched.",txt("\n(Tester+ only)", "#888888")],userInput:{type:"dropdown",dropdownOptions:CLEAR_SCOPE_OPTIONS}}),hasPermission(playerId,PERMISSION_LEVELS.MOD)){const vanished=isVanished(playerId);panelItem(playerId,"vanish",{image:"Ender Pearl",imageColour:"#cef3ff",canBuy:!0,cost:0,sortPriority:55,customTitle:[bold(vanished?"Vanish [ON]":"Vanish [OFF]", vanished?"#00ffff":"#cef3ff")],buyButtonText:[txt(vanished?"Disable":"Enable", vanished?"#ff6666":"#55ff55")],description:[ic("Invisible", "#cef3ff")," Total invisibility mode (fake leave/join, hidden from leaderboard & nametag).",vanished?bold("\n● STATUS: CURRENTLY VANISHED (hidden from everyone)", "#00ffff"):txt("\n● STATUS: Visible", "#888888"),txt("\n(MOD+ only)", "#888888")]})}panelItem(playerId,"view_inventory",{image:"Chest",imageColour:"#ffdd55",canBuy:!0,cost:0,sortPriority:40,customTitle:[bold("View Inventory", "#ffdd55")],buyButtonText:[txt("Inspect", "#ffdd55")],description:[ic("fa-solid fa-magnifying-glass", "#ffdd55")," Inspect the target's ",bold("inventory", "#ffffff")," and ",bold("Moonstone Chest", "#bb88ff"),"."]}),panelItem(playerId,"inventory_display",{image:"Book",canBuy:!1,sortPriority:35,customTitle:[txt("Last Inspection", "#888888")],description:[txt("No inspection yet.", "#888888"),"\nUse ",txt("View Inventory", "#ffdd55")," to inspect a player."]}),panelItem(playerId,"inventory_display2",{image:"Book",canBuy:!1,sortPriority:34,customTitle:[txt("Last Inspection (page 2)", "#888888")],description:[txt("Nothing here yet.", "#888888"),"\nThis page is only used when a player has too many items to fit on page 1."]}),panelItem(playerId,"inventory_display3",{image:"Book",canBuy:!1,sortPriority:33,customTitle:[txt("Last Inspection (page 3)", "#888888")],description:[txt("Nothing here yet.", "#888888"),"\nThis page is used in case of heavy inventory overflow."]}),panelItem(playerId,"kick",{image:"Iron Sword",imageColour:"#ff4444",canBuy:!0,cost:0,sortPriority:50,customTitle:[bold("Kick Player", "#ff4444")],buyButtonText:[txt("Kick", "#ff4444")],description:[ic("fa-solid fa-circle-xmark", "#ff4444")," Kick the target player from the server.",txt("\n(DEV+ only)", "#888888"),txt("\nYou cannot kick yourself.", "#888888")]}),isOwner(playerId)&&(panelItem(playerId,"set_gamemode",{image:"Golden Crown",imageColour:"#FFD700",canBuy:!0,cost:0,sortPriority:30,customTitle:[bold("Set Gamemode", "#FFD700")],buyButtonText:[txt("Apply", "#FFD700")],description:[ic("fa-solid fa-crown", "#FFD700")," ",bold("OWNER ONLY", "#FFD700")," — Change the target player's gamemode."],userInput:{type:"dropdown",dropdownOptions:GAMEMODES,autoSubmit:!1}}),panelItem(playerId,"ban",{image:"Iron Sword",imageColour:"#cc0000",canBuy:!0,cost:0,sortPriority:25,customTitle:[bold("Ban from Lobby", "#cc0000")],buyButtonText:[txt("Ban", "#cc0000")],description:[ic("fa-solid fa-hammer", "#cc0000")," ",bold("OWNER ONLY", "#FFD700")," — Ban the target player from this lobby.","\nThey will be kicked and unable to rejoin this lobby.",txt("\nYou cannot ban yourself.", "#888888")]}),panelItem(playerId,"unban",{image:"Golden Apple",imageColour:"#55ff55",canBuy:!0,cost:0,sortPriority:24,customTitle:[bold("Unban from Lobby", "#55ff55")],buyButtonText:[txt("Unban", "#55ff55")],description:[ic("fa-solid fa-lock-open", "#55ff55")," ",bold("OWNER ONLY", "#FFD700")," — Remove a player's lobby ban.","\nSelect a player from the banned list.","\nWorks even if they are offline."],userInput:{type:"dropdown",dropdownOptions:getBanList().length>0?getBanList():["(no banned players)"]}}),panelItem(playerId,"ban_list",{image:"Book",imageColour:"#cc0000",canBuy:!0,cost:0,sortPriority:23,customTitle:[bold("View Ban List", "#cc0000")],buyButtonText:[txt("Refresh", "#cc0000")],description:[ic("fa-solid fa-list", "#cc0000")," View all ",bold("banned players", "#ff6666")," and ",bold("recent players", "#55aaff"),".\nUseful to find the exact name for unban."]}),panelItem(playerId,"ban_list_display",{image:"Book",canBuy:!1,sortPriority:22,customTitle:[txt("Ban List & Recent", "#888888")],description:[txt('Click "View Ban List" to load.', "#888888")]}),panelItem(playerId,"give_fruit",{image:"Apple",imageColour:"#ff88ff",canBuy:!0,cost:0,sortPriority:20,customTitle:[bold("Give Fruit", "#ff88ff")],buyButtonText:[txt("Give", "#ff88ff")],description:[ic("fa-solid fa-award", "#ff88ff")," ",bold("OWNER ONLY", "#FFD700")," — Give a fruit to the target player.","\nType the ",txt("fruit name", "#ffffff")," or ",txt("item name", "#ffffff")," below.","\nPartial names work! (Bud → Buddha, Needly → Needlefish)"],userInput:{type:"text",placeholderText:"e.g. Buddha or Sumpback Carp",wordCharsOnly:!1}}),panelItem(playerId,"remove_items",{image:"Iron Sword",imageColour:"#ff8844",canBuy:!0,cost:0,sortPriority:18,customTitle:[bold("Remove Items", "#ff8844")],buyButtonText:[txt("Remove", "#ff4444")],description:[ic("fa-solid fa-trash-can", "#ff8844")," ",bold("OWNER ONLY", "#FFD700")," — Remove items from the target (inventory + Moonstone Chest).","\nFormat: ",txt("<amount> <name>, <amount> <name>…", "#cccccc"),"\nExample: ",bold("999 Dirt, 2 Control", "#ffdd55"),"\n• Blocks: exact item name","\n• Fruits: real fruit name (autocomplete) or item name",txt("\nAn amount bigger than what they hold just removes everything (no error).", "#888888")],userInput:{type:"text",placeholderText:"e.g. 999 Dirt, 2 Control",wordCharsOnly:!1}}),panelItem(playerId,"set_money",{image:"Golden Apple",imageColour:"#FFD700",canBuy:!0,cost:0,sortPriority:17,customTitle:[bold("Change Money", "#FFD700")],buyButtonText:[txt("Apply", "#FFD700")],description:[ic("fa-solid fa-coins", "#FFD700")," ",bold("OWNER ONLY", "#FFD700")," — Add or remove Coins on the selected player.\n",bold("+5000", "#55ff55")," adds, ",bold("-2000", "#ff6666")," removes, ",bold("5000", "#55aaff")," sets the exact amount.",txt("\nGoes down to 0, never negative.", "#888888")],userInput:{type:"text",placeholderText:"e.g. +5000 / -2000 / 5000",wordCharsOnly:!1}}),delete levelMenuMode[playerId],panelItem(playerId,"set_level",{image:"Book",imageColour:"#55ff55",canBuy:!0,cost:0,sortPriority:16,customTitle:[bold("Level / XP Menu", "#55ff55")],buyButtonText:[txt("Choose", "#55ff55")],description:levelMenuDesc(),userInput:{type:"dropdown",dropdownOptions:LEVEL_MENU_MODES}}))}(playerId);hasPermission(playerId,PERMISSION_LEVELS.MOD)&&createFreezeItem(playerId);hasPermission(playerId,PERMISSION_LEVELS.MOD)&&createMuteItems(playerId);hasPermission(playerId,PERMISSION_LEVELS.ADMIN)&&createAnnounceItem(playerId);try{say(playerId,[ic("fa-solid fa-shield-halved", "#FFD700"),bold(" [Admin] ", "#FFD700"),txt("Admin Panel loaded. Open the shop to access it.", "#aaaaaa")])}catch(e){}}for(const vId of vanishedPlayers)if(vId!==playerId){try{api.setOtherEntitySetting(playerId,vId,"canSee",!1)}catch(e){}try{api.setOtherEntitySetting(playerId,vId,"opacity",0)}catch(e){}try{api.setOtherEntitySetting(playerId,vId,"nameTagInfo",{content:[],subtitle:[],border:null,healthbar:{display:"never"}})}catch(e){}try{api.setOtherEntitySetting(playerId,vId,"lobbyLeaderboardValues",null)}catch(e){}}}
export function adminLeave(playerId){clearFreezeOnLeave(playerId);delete adminTargetPlayer[playerId];delete levelMenuMode[playerId];for(const adminId in adminTargetPlayer)adminTargetPlayer[adminId]===playerId&&delete adminTargetPlayer[adminId];vanishedPlayers.has(playerId)&&vanishedPlayers.delete(playerId)}try{const onlinePlayers=api.getPlayerIds();for(const id of onlinePlayers)adminJoin(id)}catch(e){}