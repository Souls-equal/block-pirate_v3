import { hasPermission, isOwner, getPermissionLevel, PERMISSION_LEVELS } from "./ranks";
import { FRUITS_BY_RARITY, FRUIT_RARITIES, getFruitInfo, getRarityColor, getRarityEnchantTier } from "../fruit/index";
import { FRUIT_ABILITIES, isAbilityItemName } from "../fruit/abilities";
import { updateNameTag } from "./team";
import { refreshLeaderboardPlayer, updateSidebar } from "./UI";
import { addXP, getStat, setLevel, setStat, xpToNext } from "../utils/data";
import { muteDurations, muteDurationOptions, getMuteList, getMuteInfo, isMuted, mutePlayer, unmuteName, remainingText } from "./team";

import { ITEM_COLOR, say, shout } from "./theme";
/* ==========================================================================
   CONFIGURATION (Variables basiques éditables)
   ========================================================================== */

export const ACTION_PERMISSIONS = {
    target_display:    PERMISSION_LEVELS.BASIC,
    select_target:     PERMISSION_LEVELS.BASIC,
    tp_to:             PERMISSION_LEVELS.MOD,
    tp_here:           PERMISSION_LEVELS.MOD,
    tp_to_pos:         PERMISSION_LEVELS.MOD,
    warp_island:       PERMISSION_LEVELS.BASIC,
    clear_entities:    PERMISSION_LEVELS.BASIC,
    vanish:            PERMISSION_LEVELS.MOD,
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
    mute_list:         PERMISSION_LEVELS.MOD,
    give_fruit:        PERMISSION_LEVELS.OWNER,
    remove_items:      PERMISSION_LEVELS.OWNER,
    set_money:         PERMISSION_LEVELS.OWNER,
    set_level:         PERMISSION_LEVELS.OWNER,
};

export const ISLAND_WARPS = {
    "Starter Island":   [688, -910, -239],
    "Jungle":           [1350, -910, 330],
    "Pirate Village":   [950, -910, 810],
    "Desert":           [650, -910, 1680],
    "Snow Village":     [2510, -905, 520],
    "Marine Fortress":  [2140, -910, -470],
};

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
        { icon: "fa-solid fa-list", style: { color: "#55ff55" } },
        " Pick an action in the list, then click ",
        { str: "Choose", style: { color: "#ffffff", fontWeight: "bold" } },
        " and type the value.",
        { str: "\nOWNER ONLY", style: { color: "#FFD700", fontWeight: "bold" } },
        { str: "\n• Set Level", style: { color: "#55ff55" } }, " — exact level (XP reset)",
        { str: "\n• Add / Remove Levels", style: { color: "#55ff55" } }, " — keep XP",
        { str: "\n• Set XP", style: { color: "#55aaff" } }, " — exact XP bar",
        { str: "\n• Add / Remove XP", style: { color: "#55aaff" } }, " — real XP gain (can level up)",
    ];
}

function sendAdminInfo(adminId, ok, text) {
    try {
        api.sendOverShopInfo(adminId, ok
            ? [{ icon: "fa-solid fa-check", style: { color: "lightgreen" } }, { str: "  " + text, style: { color: "lightgreen" } }]
            : [{ icon: "fa-solid fa-xmark", style: { color: "red" } }, { str: "  " + text, style: { color: "red" } }]);
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
    let variation = "";
    try {
        variation = api.getVariation();
    } catch (e) {}
    if (variation !== LOBBY_VARIATION) return true;
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
    sendAdminInfo(adminId, true, name + ": " + before + " -> " + after + " Coins (" + (delta >= 0 ? "+" : "") + delta + ")");

    try {
        say(adminId, [
            { str: "[Owner] ", style: { color: "#FFD700", fontWeight: "bold" } },
            { str: "Money of ", style: { color: "#aaaaaa" } },
            { str: name, style: { color: "#FFD700" } },
            { str: " set to ", style: { color: "#aaaaaa" } },
            { str: String(after) + " Coins", style: { color: "#FFD700", fontWeight: "bold" } },
        ]);
    } catch (e) {}

    if (targetId !== adminId) try {
        say(targetId, [
            { str: "[Admin] ", style: { color: "#FFD700", fontWeight: "bold" } },
            { str: "Your money was changed to ", style: { color: "#aaaaaa" } },
            { str: String(after) + " Coins", style: { color: "#FFD700", fontWeight: "bold" } },
            { str: " by an owner.", style: { color: "#aaaaaa" } },
        ]);
    } catch (e) {}
}

/* Remet le bouton Niveau / XP sur le menu déroulant. */
function resetLevelMenuItem(adminId) {
    delete levelMenuMode[adminId];
    try {
        api.updateShopItemForPlayer(adminId, "admin", "set_level", {
            customTitle: [{ str: "Level / XP Menu", style: { color: "#55ff55", fontWeight: "bold" } }],
            buyButtonText: [{ str: "Choose", style: { color: "#55ff55" } }],
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
                customTitle: [{ str: "Level / XP — " + chosen, style: { color: "#55ff55", fontWeight: "bold" } }],
                buyButtonText: [{ str: "Apply", style: { color: "#55ff55" } }],
                description: [
                    { icon: "fa-solid fa-pen", style: { color: "#55ff55" } },
                    " Type the value for ",
                    { str: chosen, style: { color: "#ffffff", fontWeight: "bold" } },
                    " on ",
                    { str: getTargetName(targetId), style: { color: "#FFD700", fontWeight: "bold" } },
                    ":",
                    { str: "\nLevel " + lvl + "  •  " + xp + "/" + xpToNext(lvl) + " XP", style: { color: "#aaaaaa" } },
                    { str: "\nClick Apply to confirm, or choose another action in the list.", style: { color: "#888888" } },
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
            { str: "[Owner] ", style: { color: "#FFD700", fontWeight: "bold" } },
            { str: name, style: { color: "#FFD700" } },
            { str: " — " + mode + ": " + detail, style: { color: "#55ff55" } },
        ]);
    } catch (e) {}
    if (targetId !== adminId) try {
        say(targetId, [
            { str: "[Admin] ", style: { color: "#FFD700", fontWeight: "bold" } },
            { str: "An owner changed your progress (" + detail + ").", style: { color: "#55ff55" } },
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
    lines.push({ str: "Muted Players (" + muted.length + ")\n", style: { color: "#EF4444", fontWeight: "bold" } });
    if (!muted.length) {
        lines.push({ str: "  (nobody is muted)\n", style: { color: "#666666" } });
    } else {
        for (const name of muted) {
            const info = getMuteInfo(name);
            if (!info) {
                lines.push({ str: "  " + name + " (expired)\n", style: { color: "#888888" } });
                continue;
            }
            lines.push({ str: "  " + name, style: { color: "#ff6666" } });
            lines.push({ str: "  " + info.remaining + " — by " + info.by + "\n", style: { color: "#888888" } });
        }
    }
    lines.push({ str: "\nMute only stops the chat.", style: { color: "#666666" } });
    try {
        api.createShopItemForPlayer(adminId, "admin", "mute_list_display", {
            image: "Book",
            canBuy: false,
            sortPriority: 26,
            customTitle: [{ str: "Mute List", style: { color: "#EF4444", fontWeight: "bold" } }],
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
    refreshUnmuteDropdown(adminId);
    sendAdminInfo(adminId, true, "Muted " + name + " " + span + ".");
    try {
        say(adminId, [
            { str: "[Admin] ", style: { color: "#FFD700", fontWeight: "bold" } },
            { str: "Muted ", style: { color: "#aaaaaa" } },
            { str: name, style: { color: "#EF4444", fontWeight: "bold" } },
            { str: " " + span + " (chat only).", style: { color: "#aaaaaa" } },
        ]);
    } catch (e) {}
    if (targetId !== adminId) try {
        say(targetId, [
            { icon: "fa-solid fa-microphone-slash", style: { color: "#EF4444" } },
            { str: " You have been muted " + span + " by ", style: { color: "#EF4444" } },
            { str: adminName, style: { color: "#FFD700", fontWeight: "bold" } },
            { str: ". You can still play, just not talk.", style: { color: "#CBD5E1" } },
        ]);
    } catch (e) {}
}

/* Bouton "Unmute" (le joueur peut etre hors ligne). */
function unmuteTarget(adminId, userInput) {
    if (!hasPermission(adminId, PERMISSION_LEVELS.MOD)) return;
    const playerName = String(userInput == null ? "" : userInput).trim();
    if (!playerName || playerName === "(nobody is muted)")
        return sendAdminInfo(adminId, false, "No muted player selected!");

    const info = getMuteInfo(playerName);
    if (!info && getMuteList().indexOf(playerName) === -1)
        return sendAdminInfo(adminId, false, '"' + playerName + '" is not muted.');

    unmuteName(playerName);
    refreshUnmuteDropdown(adminId);
    refreshMuteListDisplay(adminId);
    sendAdminInfo(adminId, true, "Unmuted " + playerName + "!");

    try {
        say(adminId, [
            { str: "[Admin] ", style: { color: "#FFD700", fontWeight: "bold" } },
            { str: "Unmuted ", style: { color: "#aaaaaa" } },
            { str: playerName, style: { color: "#4ADE80", fontWeight: "bold" } },
            { str: " — they can talk again.", style: { color: "#aaaaaa" } },
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
                { icon: "fa-solid fa-microphone", style: { color: "#4ADE80" } },
                { str: " You are no longer muted — you can talk again.", style: { color: "#4ADE80" } },
            ]);
        } catch (e) {}
    }
}

/* Les 4 boutons du panneau (visibles pour MOD+). */
function createMuteItems(adminId) {
    const muted = getMuteList();
    try {
        api.createShopItemForPlayer(adminId, "admin", "mute", {
            image: "Iron Sword",
            imageColour: "#EF4444",
            canBuy: true,
            cost: 0,
            sortPriority: 29,
            customTitle: [{ str: "Mute Player", style: { color: "#EF4444", fontWeight: "bold" } }],
            buyButtonText: [{ str: "Mute", style: { color: "#EF4444" } }],
            description: [
                { icon: "fa-solid fa-microphone-slash", style: { color: "#EF4444" } },
                " ", { str: "MOD+", style: { color: "#FFD700", fontWeight: "bold" } },
                " — Stop the target from talking.",
                { str: "\nThey stay, play and keep everything", style: { color: "#4ADE80" } },
                { str: " (no kick, no ban).", style: { color: "#888888" } },
                { str: "\nPick how long, then click Mute.", style: { color: "#888888" } },
                { str: "\nCannot mute equal or higher rank.", style: { color: "#888888" } },
            ],
            userInput: { type: "dropdown", dropdownOptions: muteDurationOptions() },
        });
    } catch (e) {}

    try {
        api.createShopItemForPlayer(adminId, "admin", "unmute", {
            image: "Golden Apple",
            imageColour: "#4ADE80",
            canBuy: true,
            cost: 0,
            sortPriority: 28,
            customTitle: [{ str: "Unmute Player", style: { color: "#4ADE80", fontWeight: "bold" } }],
            buyButtonText: [{ str: "Unmute", style: { color: "#4ADE80" } }],
            description: [
                { icon: "fa-solid fa-microphone", style: { color: "#4ADE80" } },
                " ", { str: "MOD+", style: { color: "#FFD700", fontWeight: "bold" } },
                " — Let a muted player talk again.",
                { str: "\nPick a name in the list.", style: { color: "#888888" } },
                { str: "\nWorks even if they are offline.", style: { color: "#888888" } },
            ],
            userInput: { type: "dropdown", dropdownOptions: muted.length ? muted : ["(nobody is muted)"] },
        });
    } catch (e) {}

    try {
        api.createShopItemForPlayer(adminId, "admin", "mute_list", {
            image: "Book",
            imageColour: "#EF4444",
            canBuy: true,
            cost: 0,
            sortPriority: 27,
            customTitle: [{ str: "View Mute List", style: { color: "#EF4444", fontWeight: "bold" } }],
            buyButtonText: [{ str: "Refresh", style: { color: "#EF4444" } }],
            description: [
                { icon: "fa-solid fa-list", style: { color: "#EF4444" } },
                " View everyone who is ", { str: "muted", style: { color: "#ff6666", fontWeight: "bold" } },
                ", for how long and by whom.",
            ],
        });
    } catch (e) {}

    try {
        api.createShopItemForPlayer(adminId, "admin", "mute_list_display", {
            image: "Book",
            canBuy: false,
            sortPriority: 26,
            customTitle: [{ str: "Mute List", style: { color: "#888888" } }],
            description: [{ str: 'Click "View Mute List" to load.', style: { color: "#888888" } }],
        });
    } catch (e) {}
}

const GAMEMODES=["creative","survival","survivaladventure","peaceful","peacefuladventure","spectator"],adminTargetPlayer={};let _allFruits=null;function getAllFruits(){if(_allFruits)return _allFruits;_allFruits=[];for(const rarity in FRUITS_BY_RARITY)for(const fruit of FRUITS_BY_RARITY[rarity])_allFruits.push({itemName:fruit.itemName,rpName:fruit.rpName,rpDesc:fruit.rpDesc,rarity:rarity});return _allFruits}function levenshtein(a,b){const la=a.length,lb=b.length,dp=[];for(let i=0;i<=la;i++){dp[i]=[i];for(let j=1;j<=lb;j++){if(0===i){dp[0][j]=j;continue}const cost=a[i-1]===b[j-1]?0:1;dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+cost)}}return dp[la][lb]}function findFruitByInput(input){if(!input)return null;const queryLower=input.trim().toLowerCase(),fruits=getAllFruits();for(const f of fruits)if(f.rpName.toLowerCase()===queryLower)return{...f,matchType:"exact_rp"};for(const f of fruits)if(f.itemName.toLowerCase()===queryLower)return{...f,matchType:"exact_item"};for(const f of fruits)if(0===f.rpName.toLowerCase().indexOf(queryLower))return{...f,matchType:"partial_rp"};for(const f of fruits)if(-1!==f.rpName.toLowerCase().indexOf(queryLower))return{...f,matchType:"contains_rp"};for(const f of fruits)if(-1!==f.itemName.toLowerCase().indexOf(queryLower))return{...f,matchType:"contains_item"};return null}function getTargetName(targetId){try{return api.getEntityName(targetId)}catch(e){return"Unknown"}}function requireTarget(adminId){const targetId=function(adminId){const targetId=adminTargetPlayer[adminId];if(!targetId)return null;try{if(-1!==api.getPlayerIds().indexOf(targetId))return targetId}catch(e){}return null}(adminId);return targetId||(api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-xmark",style:{color:"red"}},{str:'  No target selected! Use "Select Player" first.',style:{color:"red"}}]),null)}function refreshTargetDisplay(adminId){const targetId=adminTargetPlayer[adminId];let name="None",color="#666666";if(targetId){const tName=getTargetName(targetId);"Unknown"!==tName?(name=tName,color="#55ff55"):(name="(disconnected)",color="#ff8844")}api.createShopItemForPlayer(adminId,"admin","target_display",{image:"Player Head",canBuy:!0,cost:0,buyButtonText:[{str:"Select Me",style:{color:"#55ff55"}}],sortPriority:95,customTitle:[{str:"Target: ",style:{color:"#888888"}},{str:name,style:{color:color,fontWeight:"bold"}}],description:[{str:"Current target player.",style:{color:"#888888"}},"\nUse ",{str:"Select Player",style:{color:"#55aaff"}}," to change.",{str:'\nClick "Select Me" to target yourself.',style:{color:"#888888"}}]})}function resolveTargetPlayerId(adminId,input){if(!input)return null;const str=input.toString().trim();if(!str)return null;try{if(-1!==api.getPlayerIds().indexOf(str))return str}catch(e){}try{const id=api.getPlayerId(str);if(id)return id}catch(e){}return null}let _fruitItemMap=null;/* ==========================================================================
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

/* Nom affiche + couleur d'un item de l'inventaire. */
function resolveItemLabel(item) {
    if (!item) return { name: "?", color: ITEM_COLOR.plain };
    const attrs = item.attributes;
    const ca = attrs ? attrs.customAttributes : null;

    /* 1. Fruit du demon : bloc mangeable (sneak + click). */
    if (ca && ca.isFruitBlock && ca.fruitRpName) {
        return { name: ca.fruitRpName, color: ITEM_COLOR.fruit };
    }

    /* 2. Item de competence (l'item unique d'un fruit). */
    if (isAbilityItemName(item.name)) {
        const label = attrs && attrs.customDisplayName ? String(attrs.customDisplayName) : item.name;
        return { name: label, color: ITEM_COLOR.ability };
    }

    /* 3. Fruit range sous son nom de bloc. */
    const mapped = fruitItemMap()[item.name];
    if (mapped) return { name: mapped.rpName, color: ITEM_COLOR.fruit };

    /* 4. Item normal renomme. */
    if (attrs && attrs.customDisplayName) {
        return { name: String(attrs.customDisplayName), color: ITEM_COLOR.custom };
    }

    /* 5. Item normal. */
    return { name: item.name, color: ITEM_COLOR.plain };
}

function buildDescriptionLines(title,items,color,compact){const lines=[];if(lines.push({str:title+"\n",style:{color:color,fontWeight:"bold"}}),0===items.length)lines.push({str:"  (empty)\n",style:{color:"#666666"}});else{const maxName=3===compact?8:2===compact?11:1===compact?15:26,grouped=[],byKey={};for(const item of items){const rawLabel=item.displayName||item.name||"?",itemColor=item.displayColor||"#cccccc",key=rawLabel+"|"+itemColor,label=rawLabel.length>maxName?rawLabel.slice(0,Math.max(2,maxName-4))+"."+rawLabel.slice(-3):rawLabel,amt="number"==typeof item.amount&&item.amount>0?item.amount:1;byKey[key]?(byKey[key].amount+=amt,byKey[key].slots++):(byKey[key]={label:label,color:itemColor,amount:amt,slots:1},grouped.push(byKey[key]))}if(compact){const perLine=3===compact?4:2===compact?3:2,sep=3===compact?", ":" | ";for(let i=0;i<grouped.length;){const first=grouped[i],chunk=[];for(;i<grouped.length&&chunk.length<perLine&&grouped[i].color===first.color;){const g=grouped[i++];chunk.push(g.label+(g.amount>1?" x"+g.amount:""))}lines.push({str:" "+chunk.join(sep)+"\n",style:{color:first.color}})}}else for(const g of grouped){const amt=g.amount>1?" x"+g.amount:"",slots=g.slots>1&&g.amount!==g.slots?" ("+g.slots+" slots)":"";lines.push({str:"  "+g.label+amt+slots+"\n",style:{color:g.color}})}}return lines}function selectSelfTarget(adminId){adminTargetPlayer[adminId]=adminId,refreshTargetDisplay(adminId);const selfName=getTargetName(adminId);api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-check",style:{color:"lightgreen"}},{str:"  Target set to "+selfName+" (yourself)!",style:{color:"lightgreen"}}])}const CLEAR_SCOPE_OPTIONS=["All","Mobs only","Dropped items only","Meshes only","Throwables only","Loot only (Items + Meshes)"],CLEAR_SCOPES={all:{mobs:!0,items:!0,meshes:!0,throwables:!0},"mobs only":{mobs:!0,items:!1,meshes:!1,throwables:!1},"dropped items only":{mobs:!1,items:!0,meshes:!1,throwables:!1},"meshes only":{mobs:!1,items:!1,meshes:!0,throwables:!1},"throwables only":{mobs:!1,items:!1,meshes:!1,throwables:!0},"loot only (items + meshes)":{mobs:!1,items:!0,meshes:!0,throwables:!1}};function buildClearCountParts(scope,counts,sepStr,sepColor){const segs=[];scope.mobs&&segs.push({str:counts.mobs+" mobs",style:{color:"#ff8844",fontWeight:"bold"}}),scope.items&&segs.push({str:counts.items+" items",style:{color:"#ffdd55",fontWeight:"bold"}}),scope.meshes&&segs.push({str:counts.meshes+" meshes",style:{color:"#bb88ff",fontWeight:"bold"}}),scope.throwables&&segs.push({str:counts.throwables+" throwables",style:{color:"#66e0ff",fontWeight:"bold"}});const out=[];for(let i=0;i<segs.length;i++)i>0&&out.push({str:sepStr,style:{color:sepColor}}),out.push(segs[i]);return out}const vanishedPlayers=new Set;
export function isVanished(playerId){return vanishedPlayers.has(playerId)}function measureDescText(lines){let total=0;for(const line of lines)null!=line&&("string"!=typeof line?"string"==typeof line.str&&(total+=line.str.length):total+=line.length);return total}function buildFruitTarget(fruit){const ability=FRUIT_ABILITIES[fruit.rpName],names=[],type=ability&&ability.baseItem&&ability.baseItem.type?ability.baseItem.type:fruit.itemName;return type&&names.push(type),fruit.itemName&&-1===names.indexOf(fruit.itemName)&&names.push(fruit.itemName),{fruit:fruit,names:names}}function slotMatchesTarget(item,target){if(!item||!item.name||"Air"===item.name)return!1;if(target.fruit){let nameOk=!1;for(let i=0;i<target.names.length;i++)if(item.name===target.names[i]){nameOk=!0;break}if(!nameOk)return!1;const ca=item.attributes&&item.attributes.customAttributes;return!ca||!ca.isFruitBlock||ca.fruitRpName===target.fruit.rpName}return item.name.toLowerCase()===target.nameLower}function playerHasPlainItem(playerId,nameLower){for(let i=0;i<40;i++)try{const slot=api.getItemSlot(playerId,i);if(slot&&slot.name&&slot.name.toLowerCase()===nameLower)return!0}catch(e){}try{const chest=api.getMoonstoneChestItems(playerId);if(chest)for(let i=0;i<chest.length;i++){const entry=chest[i];if(entry&&entry.name&&entry.name.toLowerCase()===nameLower)return!0}}catch(e){}return!1}function removeTargetFromInventory(playerId,target,wanted){let remaining=wanted,removed=0;for(let i=0;i<40&&remaining>0;i++)try{const slot=api.getItemSlot(playerId,i);if(!slot||!slotMatchesTarget(slot,target))continue;const amt="number"==typeof slot.amount&&0!==slot.amount?slot.amount:1;if(amt<0)continue;const take=Math.min(remaining,amt);take>=amt?api.setItemSlot(playerId,i,"Air"):api.setItemSlot(playerId,i,slot.name,amt-take,slot.attributes),removed+=take,remaining-=take}catch(e){}return removed}function removeTargetFromMoonstone(playerId,target,wanted){if(wanted<=0)return 0;let remaining=wanted,removed=0,chest=null;try{chest=api.getMoonstoneChestItems(playerId)}catch(e){chest=null}if(!chest)return 0;for(let i=0;i<chest.length&&remaining>0;i++)try{const entry=chest[i];if(!entry||!slotMatchesTarget(entry,target))continue;const amt="number"==typeof entry.amount&&0!==entry.amount?entry.amount:1;if(amt<0)continue;const take=Math.min(remaining,amt);take>=amt?api.setMoonstoneChestItemSlot(playerId,i,"Air"):api.setMoonstoneChestItemSlot(playerId,i,entry.name,amt-take,entry.attributes),removed+=take,remaining-=take}catch(e){}return removed}function getBanList(){try{const raw=api.getLobbyDbValue("admin_banList");return raw?raw.toString().split(",").filter(function(n){return n.length>0}):[]}catch(e){return[]}}function saveBanList(list){try{api.setLobbyDbValue("admin_banList",list.join(","))}catch(e){}}function removeFromBanList(name){const list=getBanList(),idx=list.indexOf(name);-1!==idx&&list.splice(idx,1),saveBanList(list)}function isBannedByName(name){return-1!==getBanList().indexOf(name)}function getRecentList(){try{const raw=api.getLobbyDbValue("admin_recentList");return raw?raw.toString().split(",").filter(function(n){return n.length>0}):[]}catch(e){return[]}}
export function registerRecentPlayer(playerId){try{const name=api.getEntityName(playerId);if(!name)return;const list=getRecentList(),idx=list.indexOf(name);for(-1!==idx&&list.splice(idx,1),list.unshift(name);list.length>50;)list.pop();!function(list){try{api.setLobbyDbValue("admin_recentList",list.join(","))}catch(e){}}(list);try{api.setLobbyDbValue("admin_recent_"+name,Date.now())}catch(e){}}catch(e){}}function refreshUnbanDropdown(adminId){try{const banned=getBanList(),options=banned.length>0?banned:["(no banned players)"];api.updateShopItemForPlayer(adminId,"admin","unban",{userInput:{type:"dropdown",dropdownOptions:options}})}catch(e){}}
export function checkBanOnJoin(playerId){try{const name=api.getEntityName(playerId);if(!name)return!1;if("K4miNoK4mi"===name||"Yanick2010"===name||"EPICOO00000"===name||"Chillguy45"===name){removeFromBanList(name);try{api.deleteLobbyDbValue("admin_ban_"+name)}catch(e){}try{api.deletePlayerDbValue(playerId,"ban")}catch(e){}try{api.deletePlayerDbValue(playerId,"banBy")}catch(e){}return!1}if(!isBannedByName(name))return!1;let banBy="Admin";try{const raw=api.getLobbyDbValue("admin_ban_"+name);raw&&(banBy=raw.toString().split("|")[0]||"Admin")}catch(e){}return api.kickPlayer(playerId,"You are banned from this lobby. (Banned by "+banBy+")"),!0}catch(e){return!1}}
export function handleAdminShop(playerId,categoryKey,itemKey,item,userInput){if("admin"!==categoryKey)return;const requiredLevel=ACTION_PERMISSIONS[itemKey];if(void 0!==requiredLevel)if(hasPermission(playerId,requiredLevel))switch(itemKey){case"select_target":!function(adminId,userInput){if(!(userInput||"").toString().trim())return void selectSelfTarget(adminId);const targetId=resolveTargetPlayerId(0,userInput);if(!targetId)return void api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-xmark",style:{color:"red"}},{str:"  Invalid player!",style:{color:"red"}}]);adminTargetPlayer[adminId]=targetId,refreshTargetDisplay(adminId);const name=getTargetName(targetId);api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-check",style:{color:"lightgreen"}},{str:"  Target set to "+name+"!",style:{color:"lightgreen"}}])}(playerId,userInput),resetLevelMenuItem(playerId);break;case"target_display":selectSelfTarget(playerId);break;case"tp_to":canAdminTp(playerId)&&!function(adminId){const targetId=requireTarget(adminId);if(!targetId)return;if(targetId===adminId)return void api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-xmark",style:{color:"red"}},{str:"  You can't teleport to yourself!",style:{color:"red"}}]);let pos;try{pos=api.getPosition(targetId)}catch(e){return void api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-xmark",style:{color:"red"}},{str:"  Could not get target position!",style:{color:"red"}}])}api.setPosition(adminId,pos[0],pos[1]+1,pos[2]);const name=getTargetName(targetId);api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-check",style:{color:"lightgreen"}},{str:"  Teleported to "+name+"!",style:{color:"lightgreen"}}]),say(adminId,[{str:"[Admin] ",style:{color:"#FFD700",fontWeight:"bold"}},{str:"Teleported to ",style:{color:"#aaaaaa"}},{str:name,style:{color:"#55aaff"}}])}(playerId);break;case"tp_here":canAdminTp(playerId)&&!function(adminId){const targetId=requireTarget(adminId);if(!targetId)return;if(targetId===adminId)return void api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-xmark",style:{color:"red"}},{str:"  You can't summon yourself!",style:{color:"red"}}]);let pos;try{pos=api.getPosition(adminId)}catch(e){return void api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-xmark",style:{color:"red"}},{str:"  Could not get your position!",style:{color:"red"}}])}api.setPosition(targetId,pos[0],pos[1]+1,pos[2]);const name=getTargetName(targetId);api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-check",style:{color:"lightgreen"}},{str:"  Summoned "+name+"!",style:{color:"lightgreen"}}]),say(adminId,[{str:"[Admin] ",style:{color:"#FFD700",fontWeight:"bold"}},{str:"Summoned ",style:{color:"#aaaaaa"}},{str:name,style:{color:"#ff8855"}},{str:" to your location.",style:{color:"#aaaaaa"}}]);try{say(targetId,[{str:"[Admin] ",style:{color:"#FFD700",fontWeight:"bold"}},{str:"You have been summoned by an admin.",style:{color:"#ff8855"}}])}catch(e){}}(playerId);break;case"tp_to_pos":canAdminTp(playerId)&&!function(adminId,userInput){const coords=function(text){if(!text)return null;const parts=text.toString().split(/[,\s]+/).filter(Boolean);if(parts.length<3)return null;const x=parseFloat(parts[0]),y=parseFloat(parts[1]),z=parseFloat(parts[2]);return isNaN(x)||isNaN(y)||isNaN(z)?null:[x,y,z]}(userInput);coords?(api.setPosition(adminId,coords[0],coords[1],coords[2]),api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-check",style:{color:"lightgreen"}},{str:"  Teleported to ["+coords[0]+", "+coords[1]+", "+coords[2]+"]!",style:{color:"lightgreen"}}]),say(adminId,[{str:"[Admin] ",style:{color:"#FFD700",fontWeight:"bold"}},{str:"Teleported to ",style:{color:"#aaaaaa"}},{str:"["+coords[0]+", "+coords[1]+", "+coords[2]+"]",style:{color:"#aa55ff"}}])):api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-xmark",style:{color:"red"}},{str:"  Invalid coordinates! Use format: x, y, z",style:{color:"red"}}])}(playerId,userInput);break;case"warp_island":canAdminTp(playerId)&&!function(adminId,userInput){const islandName=(userInput||"").toString().trim(),pos=ISLAND_WARPS[islandName];pos?(api.setPosition(adminId,pos[0],pos[1],pos[2]),api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-check",style:{color:"lightgreen"}},{str:"  Warped to "+islandName+"!",style:{color:"lightgreen"}}]),say(adminId,[{str:"[Admin] ",style:{color:"#FFD700",fontWeight:"bold"}},{str:"Warped to ",style:{color:"#aaaaaa"}},{str:islandName,style:{color:"#55ff88",fontWeight:"bold"}}])):api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-xmark",style:{color:"red"}},{str:"  Unknown island!",style:{color:"red"}}])}(playerId,userInput);break;case"clear_entities":!function(adminId,userInput){const scopeKey=(userInput||"").toString().trim().toLowerCase();let scope=CLEAR_SCOPES[scopeKey];if(!scope){if(""!==scopeKey)return void api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-xmark",style:{color:"red"}},{str:"  Unknown scope! Pick one from the list.",style:{color:"red"}}]);scope=CLEAR_SCOPES.all}let mobCount=0,itemCount=0,meshCount=0,throwableCount=0;if(scope.mobs)try{const mobIds=api.getMobIds()||[];for(const mobId of mobIds)try{api.despawnMob(mobId),mobCount++}catch(e){}}catch(e){}try{const W=5e4,ids=api.getEntitiesInRect([-W,-W,-W],[W,W,W])||[];for(const id of ids)try{if(!api.checkValid(id))continue;const type=api.getEntityType(id);if("Player"===type)continue;if("Item"===type){if(!scope.items)continue;try{api.deleteItemDrop(id),itemCount++}catch(e){}continue}if("Mesh"===type){if(!scope.meshes)continue;try{api.deleteMeshEntity(id)&&meshCount++}catch(e){}continue}if(scope.throwables&&type&&-1!==String(type).toLowerCase().indexOf("throw")){try{api.deleteThrowable(id),throwableCount++}catch(e){}continue}if(scope.mobs)try{api.despawnMob(id),mobCount++}catch(e){if(scope.throwables)try{api.deleteThrowable(id),throwableCount++}catch(e2){}}else if(scope.throwables)try{api.deleteThrowable(id),throwableCount++}catch(e){}}catch(e){}}catch(e){}const counts={mobs:mobCount,items:itemCount,meshes:meshCount,throwables:throwableCount};api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-broom",style:{color:"lightgreen"}},{str:"  Cleared ",style:{color:"lightgreen"}},...buildClearCountParts(scope,counts,", ","#888888"),{str:"!",style:{color:"lightgreen"}}]),say(adminId,[{str:"[Admin] ",style:{color:"#FFD700",fontWeight:"bold"}},{str:"Cleared ",style:{color:"#aaaaaa"}},...buildClearCountParts(scope,counts,", ","#aaaaaa"),{str:".",style:{color:"#aaaaaa"}}])}(playerId,userInput);break;case"vanish":!function(adminId){if(!hasPermission(adminId,PERMISSION_LEVELS.MOD))return;let adminName="Admin";try{adminName=api.getEntityName(adminId)||"Admin"}catch(e){}if(isVanished(adminId)){vanishedPlayers.delete(adminId);try{shout([{str:adminName+" joined",style:{color:"#cef3ff"}}])}catch(e){try{shout(adminName+" joined",{color:"#cef3ff"})}catch(e2){}}try{api.setPlayerOpacity(adminId,1)}catch(e){}try{api.setTargetedPlayerSettingForEveryone(adminId,"canSee",!0,!0)}catch(e){}let restored=!1;try{"function"==typeof updateNameTag&&(updateNameTag(adminId),restored=!0)}catch(e){}if(!restored)try{api.setTargetedPlayerSettingForEveryone(adminId,"nameTagInfo",{content:[{str:adminName,style:{color:"white"}}],healthbar:{height:"19px",display:"always",backgroundColour:"gray"}},!0)}catch(e){}try{"function"==typeof refreshLeaderboardPlayer&&refreshLeaderboardPlayer(adminId)}catch(e){}api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-eye",style:{color:"#ffaa00"}},{str:"  Vanish DISABLED — you are visible again.",style:{color:"#ffaa00",fontWeight:"bold"}}]),say(adminId,[{str:"[Admin] ",style:{color:"#FFD700",fontWeight:"bold"}},{str:"Vanish disabled. Fake join broadcast sent.",style:{color:"#ffaa00"}}])}else{vanishedPlayers.add(adminId);try{shout([{str:adminName+" left",style:{color:"#cef3ff"}}])}catch(e){try{shout(adminName+" left",{color:"#cef3ff"})}catch(e2){}}try{api.setPlayerOpacity(adminId,0)}catch(e){}try{api.setTargetedPlayerSettingForEveryone(adminId,"canSee",!1,!0)}catch(e){}try{api.setTargetedPlayerSettingForEveryone(adminId,"nameTagInfo",{content:[],subtitle:[],border:null,healthbar:{display:"never"}},!0)}catch(e){}try{api.setTargetedPlayerSettingForEveryone(adminId,"hasPriorityNametag",!1,!0)}catch(e){}try{api.setTargetedPlayerSettingForEveryone(adminId,"multilineTextBox",null,!0)}catch(e){}try{api.setTargetedPlayerSettingForEveryone(adminId,"lobbyLeaderboardValues",null,!0)}catch(e){}try{api.setTargetedPlayerSettingForEveryone(adminId,"colorInLobbyLeaderboard","",!0)}catch(e){}try{api.setTargetedPlayerSettingForEveryone(adminId,"lobbyLeaderboardTags",null,!0)}catch(e){}api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-ghost",style:{color:"#cef3ff"}},{str:"  Vanish ENABLED — you are now completely invisible!",style:{color:"#cef3ff",fontWeight:"bold"}}]),say(adminId,[{str:"[Admin] ",style:{color:"#FFD700",fontWeight:"bold"}},{str:"Vanish enabled. Fake leave broadcast sent.",style:{color:"#cef3ff"}}])}!function(playerId){if(!hasPermission(playerId,PERMISSION_LEVELS.MOD))return;const vanished=isVanished(playerId);try{api.updateShopItemForPlayer(playerId,"admin","vanish",{customTitle:[{str:vanished?"Vanish [ON]":"Vanish [OFF]",style:{color:vanished?"#00ffff":"#cef3ff",fontWeight:"bold"}}],buyButtonText:[{str:vanished?"Disable":"Enable",style:{color:vanished?"#ff6666":"#55ff55"}}],description:[{icon:"fa-solid fa-ghost",style:{color:"#cef3ff"}}," Total invisibility mode (fake leave/join, hidden from leaderboard & nametag).",vanished?{str:"\n● STATUS: CURRENTLY VANISHED (hidden from everyone)",style:{color:"#00ffff",fontWeight:"bold"}}:{str:"\n● STATUS: Visible",style:{color:"#888888"}},{str:"\n(MOD+ only)",style:{color:"#888888"}}]})}catch(e){}}(adminId)}(playerId);break;case"kick":!function(adminId){const targetId=requireTarget(adminId);if(!targetId)return;if(targetId===adminId)return void api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-xmark",style:{color:"red"}},{str:"  You can't kick yourself!",style:{color:"red"}}]);if(getPermissionLevel(targetId)>=getPermissionLevel(adminId))return void api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-shield",style:{color:"orange"}},{str:"  Cannot kick a player with equal or higher rank!",style:{color:"orange"}}]);const name=getTargetName(targetId);let adminName;try{adminName=api.getEntityName(adminId)}catch(e){adminName="Admin"}try{api.kickPlayer(targetId,"Kicked by "+adminName)}catch(e){return void api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-xmark",style:{color:"red"}},{str:"  Failed to kick player!",style:{color:"red"}}])}api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-check",style:{color:"lightgreen"}},{str:"  Kicked "+name+"!",style:{color:"lightgreen"}}]),say(adminId,[{str:"[Admin] ",style:{color:"#FFD700",fontWeight:"bold"}},{str:"Kicked ",style:{color:"#aaaaaa"}},{str:name,style:{color:"#ff4444",fontWeight:"bold"}}]);try{shout([{str:"[Admin] ",style:{color:"#FFD700",fontWeight:"bold"}},{str:name,style:{color:"#ff4444"}},{str:" has been kicked.",style:{color:"#aaaaaa"}}])}catch(e){}}(playerId);break;case"view_inventory":!function(adminId){const targetId=requireTarget(adminId);if(!targetId)return;const name=getTargetName(targetId),inv=function(targetId){const items=[];for(let i=0;i<40;i++)try{const slot=api.getItemSlot(targetId,i);if(slot&&slot.name&&"Air"!==slot.name){const label=resolveItemLabel(slot);items.push({slot:i,name:slot.name,amount:slot.amount||1,displayName:label.name,displayColor:label.color})}}catch(e){}return items}(targetId),moon=function(targetId){try{const chest=api.getMoonstoneChestItems(targetId);if(!chest)return[];const items=[];for(let i=0;i<chest.length;i++){const entry=chest[i];if(entry&&entry.name&&"Air"!==entry.name){const label=resolveItemLabel(entry);items.push({slot:i,name:entry.name,amount:entry.amount||1,displayName:label.name,displayColor:label.color})}}return items}catch(e){return[]}}(targetId),PAGE_LIMIT=410,makePages=function(compact){const invLines=buildDescriptionLines("Inventory ("+inv.length+" item"+(1!==inv.length?"s":"")+")",inv,"#ffdd55",compact),moonLines=buildDescriptionLines("Moonstone Chest ("+moon.length+" item"+(1!==moon.length?"s":"")+")",moon,"#bb88ff",compact),body=[];for(const l of invLines)body.push({line:l,section:0});body.push({line:{str:"\n",style:{}},section:-1});for(const l of moonLines)body.push({line:l,section:1});const moonTitleIdx=invLines.length+1,buildPre=function(pageNum,cutIdx){const pre=[{str:name+(pageNum>1?" - page "+pageNum:"")+"\n",style:{color:"#FFD700",fontWeight:"bold"}}];if(pageNum>1&&cutIdx<body.length){const sec=body[cutIdx].section;0===sec&&0!==cutIdx?pre.push({str:"Inventory (continued)\n",style:{color:"#ffdd55",fontWeight:"bold"}}):1===sec&&cutIdx!==moonTitleIdx&&pre.push({str:"Moonstone Chest (continued)\n",style:{color:"#bb88ff",fontWeight:"bold"}})}return pre},takePage=function(pageNum,startIdx,reserveFooter){const pre=buildPre(pageNum,startIdx);let used=measureDescText(pre),idx=startIdx,count=0;const limit=PAGE_LIMIT-(reserveFooter?28:0);for(;idx<body.length;){const pieceLen=measureDescText([body[idx].line]);if(count>0&&used+pieceLen>limit)break;used+=pieceLen,idx++,count++}return{pre:pre,end:idx}};let p1=takePage(1,0,!1);p1.end<body.length&&(p1=takePage(1,0,!0));const desc1=p1.pre.slice();for(let i=0;i<p1.end;i++)desc1.push(body[i].line);p1.end<body.length&&desc1.push({str:"\n... more on page 2 below",style:{color:"#888888"}});let desc2,desc3,overflow=0;if(p1.end>=body.length)desc2=[{str:"Nothing more to show.\n",style:{color:"#888888"}},{str:"All items fit on page 1.",style:{color:"#666666"}}],desc3=[{str:"Nothing more to show.\n",style:{color:"#888888"}},{str:"All items fit on page 1.",style:{color:"#666666"}}];else{let p2=takePage(2,p1.end,!1);p2.end<body.length&&(p2=takePage(2,p1.end,!0)),desc2=p2.pre.slice();for(let i=p1.end;i<p2.end;i++)desc2.push(body[i].line);if(p2.end>=body.length)desc3=[{str:"Nothing more to show.\n",style:{color:"#888888"}},{str:"All items fit on pages 1-2.",style:{color:"#666666"}}];else{desc2.push({str:"\n... more on page 3 below",style:{color:"#888888"}});let p3=takePage(3,p2.end,!1);p3.end<body.length&&(p3=takePage(3,p2.end,!0)),desc3=p3.pre.slice();for(let i=p2.end;i<p3.end;i++)desc3.push(body[i].line);if(p3.end<body.length){overflow=body.length-p3.end;desc3.push({str:"\n... +"+overflow+" more lines",style:{color:"#ff8844"}})}}}return{desc1:desc1,desc2:desc2,desc3:desc3,overflow:overflow}};let pages=makePages(0);pages.overflow>0&&(pages=makePages(1)),pages.overflow>0&&(pages=makePages(2)),pages.overflow>0&&(pages=makePages(3));const{desc1:desc1,desc2:desc2,desc3:desc3}=pages;try{api.createShopItemForPlayer(adminId,"admin","inventory_display",{image:"Book",canBuy:!1,sortPriority:35,customTitle:[{str:"Inspecting: ",style:{color:"#888888"}},{str:name,style:{color:"#FFD700",fontWeight:"bold"}}],description:desc1})}catch(e){}try{api.createShopItemForPlayer(adminId,"admin","inventory_display2",{image:"Book",canBuy:!1,sortPriority:34,customTitle:[{str:"Inspecting: ",style:{color:"#888888"}},{str:name,style:{color:"#FFD700",fontWeight:"bold"}},{str:" (page 2)",style:{color:"#888888"}}],description:desc2})}catch(e){}try{api.createShopItemForPlayer(adminId,"admin","inventory_display3",{image:"Book",canBuy:!1,sortPriority:33,customTitle:[{str:"Inspecting: ",style:{color:"#888888"}},{str:name,style:{color:"#FFD700",fontWeight:"bold"}},{str:" (page 3)",style:{color:"#888888"}}],description:desc3})}catch(e){}api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-check",style:{color:"lightgreen"}},{str:"  Inspecting "+name+"'s inventory!",style:{color:"lightgreen"}}]),say(adminId,[{str:"[Admin] ",style:{color:"#FFD700",fontWeight:"bold"}},{str:"Inventory of ",style:{color:"#aaaaaa"}},{str:name,style:{color:"#ffdd55",fontWeight:"bold"}},{str:" - "+inv.length+" items, "+moon.length+" in Moonstone Chest.",style:{color:"#aaaaaa"}}])}(playerId);break;case"set_gamemode":!function(adminId,userInput){if(!isOwner(adminId))return;const targetId=requireTarget(adminId);if(!targetId)return;const gamemode=(userInput||"").toString().trim().toLowerCase();if(!gamemode||-1===GAMEMODES.indexOf(gamemode))return void api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-xmark",style:{color:"red"}},{str:"  Please select a valid gamemode!",style:{color:"red"}}]);const name=getTargetName(targetId);try{api.setPlayerGamemode(targetId,gamemode)}catch(e){return void api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-xmark",style:{color:"red"}},{str:"  Failed to set gamemode!",style:{color:"red"}}])}if(api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-check",style:{color:"lightgreen"}},{str:"  "+name+" → "+gamemode,style:{color:"lightgreen"}}]),say(adminId,[{str:"[Owner] ",style:{color:"#FFD700",fontWeight:"bold"}},{str:"Set ",style:{color:"#aaaaaa"}},{str:name,style:{color:"#FFD700"}},{str:" gamemode to ",style:{color:"#aaaaaa"}},{str:gamemode,style:{color:"#FFD700",fontWeight:"bold"}}]),targetId!==adminId)try{say(targetId,[{str:"[Admin] ",style:{color:"#FFD700",fontWeight:"bold"}},{str:"Your gamemode has been changed to ",style:{color:"#aaaaaa"}},{str:gamemode,style:{color:"#FFD700",fontWeight:"bold"}},{str:" by an owner.",style:{color:"#aaaaaa"}}])}catch(e){}}(playerId,userInput);break;case"ban":!function(adminId){if(!isOwner(adminId))return;const targetId=requireTarget(adminId);if(!targetId)return;if(targetId===adminId)return void api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-xmark",style:{color:"red"}},{str:"  You can't ban yourself!",style:{color:"red"}}]);if(hasPermission(targetId,PERMISSION_LEVELS.OWNER))return void api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-shield",style:{color:"orange"}},{str:"  Cannot ban another Owner!",style:{color:"orange"}}]);const name=getTargetName(targetId);let adminName;try{adminName=api.getEntityName(adminId)}catch(e){adminName="Owner"}try{!function(name){const list=getBanList();-1===list.indexOf(name)&&list.push(name),saveBanList(list)}(name),api.setLobbyDbValue("admin_ban_"+name,adminName+"|"+Date.now())}catch(e){return void api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-xmark",style:{color:"red"}},{str:"  Failed to save ban!",style:{color:"red"}}])}try{api.kickPlayer(targetId,"You have been banned from this lobby by "+adminName+".")}catch(e){}api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-check",style:{color:"lightgreen"}},{str:"  Banned "+name+"!",style:{color:"lightgreen"}}]),say(adminId,[{str:"[Owner] ",style:{color:"#FFD700",fontWeight:"bold"}},{str:"Banned ",style:{color:"#aaaaaa"}},{str:name,style:{color:"#cc0000",fontWeight:"bold"}},{str:" permanently.",style:{color:"#aaaaaa"}}]);try{shout([{str:"[Admin] ",style:{color:"#FFD700",fontWeight:"bold"}},{str:name,style:{color:"#cc0000"}},{str:" has been banned.",style:{color:"#aaaaaa"}}])}catch(e){}refreshUnbanDropdown(adminId)}(playerId);break;case"unban":!function(adminId,userInput){if(!isOwner(adminId))return;const playerName=(userInput||"").toString().trim();if(playerName&&"(no banned players)"!==playerName){if(!isBannedByName(playerName))return api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-triangle-exclamation",style:{color:"orange"}},{str:'  "'+playerName+'" is not in the ban list.',style:{color:"orange"}}]),void refreshUnbanDropdown(adminId);try{removeFromBanList(playerName),api.deleteLobbyDbValue("admin_ban_"+playerName)}catch(e){}try{const targetId=resolveTargetPlayerId(0,playerName);if(targetId){try{api.deletePlayerDbValue(targetId,"ban")}catch(e){}try{api.deletePlayerDbValue(targetId,"banBy")}catch(e){}say(targetId,[{str:"[Admin] ",style:{color:"#FFD700",fontWeight:"bold"}},{str:"You have been unbanned from this lobby!",style:{color:"#55ff55"}}])}}catch(e){}refreshUnbanDropdown(adminId),api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-check",style:{color:"lightgreen"}},{str:"  Unbanned "+playerName+"!",style:{color:"lightgreen"}}]),say(adminId,[{str:"[Owner] ",style:{color:"#FFD700",fontWeight:"bold"}},{str:"Unbanned ",style:{color:"#aaaaaa"}},{str:playerName,style:{color:"#55ff55",fontWeight:"bold"}},{str:" from this lobby.",style:{color:"#aaaaaa"}}])}else api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-xmark",style:{color:"red"}},{str:"  No banned player selected!",style:{color:"red"}}])}(playerId,userInput);break;case"ban_list":!function(adminId){if(!isOwner(adminId))return;const banned=getBanList(),recent=getRecentList(),descLines=[];if(descLines.push({str:"Banned Players ("+banned.length+")\n",style:{color:"#cc0000",fontWeight:"bold"}}),0===banned.length)descLines.push({str:"  (no bans)\n",style:{color:"#666666"}});else for(const name of banned){let info="";try{const raw=api.getLobbyDbValue("admin_ban_"+name);raw&&(info=" (by "+raw.toString().split("|")[0]+")")}catch(e){}descLines.push({str:"  "+name+info+"\n",style:{color:"#ff6666"}})}if(descLines.push({str:"\n",style:{}}),descLines.push({str:"Recent Players ("+Math.min(recent.length,20)+")\n",style:{color:"#55aaff",fontWeight:"bold"}}),0===recent.length)descLines.push({str:"  (none)\n",style:{color:"#666666"}});else{const shown=recent.slice(0,20);for(const name of shown){const isBanned=-1!==banned.indexOf(name);descLines.push({str:"  "+name+(isBanned?" [BANNED]":"")+"\n",style:{color:isBanned?"#ff6666":"#aaaaaa"}})}}api.createShopItemForPlayer(adminId,"admin","ban_list_display",{image:"Book",canBuy:!1,sortPriority:22,customTitle:[{str:"Ban List & Recent",style:{color:"#cc0000",fontWeight:"bold"}}],description:descLines}),refreshUnbanDropdown(adminId),api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-check",style:{color:"lightgreen"}},{str:"  Ban list refreshed!",style:{color:"lightgreen"}}])}(playerId);break;case"mute":muteTarget(playerId,userInput);break;case"unmute":unmuteTarget(playerId,userInput);break;case"mute_list":hasPermission(playerId,PERMISSION_LEVELS.MOD)&&refreshMuteListDisplay(playerId);break;case"give_fruit":!function(adminId,userInput){if(!isOwner(adminId))return;const targetId=requireTarget(adminId);if(!targetId)return;const fruitQuery=(userInput||"").toString().trim();if(!fruitQuery)return void api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-xmark",style:{color:"red"}},{str:"  Type a fruit or block name!",style:{color:"red"}}]);const targetName=getTargetName(targetId),found=findFruitByInput(fruitQuery);if(!found){const suggestions=function(input){const queryLower=input.trim().toLowerCase(),scored=[],fruits=getAllFruits();for(const f of fruits){const dRp=levenshtein(queryLower,f.rpName.toLowerCase()),dItem=levenshtein(queryLower,f.itemName.toLowerCase()),bestDist=Math.min(dRp,dItem);scored.push({fruit:f,distance:bestDist,matchedBy:dRp<=dItem?"rpName":"itemName"})}return scored.sort((a,b)=>a.distance-b.distance),scored.slice(0,5)}(fruitQuery);if(api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-question",style:{color:"orange"}},{str:'  Fruit not found: "'+fruitQuery+'"',style:{color:"orange"}}]),suggestions.length>0){say(adminId,[{str:"[Admin] ",style:{color:"#FFD700",fontWeight:"bold"}},{str:"Did you mean:\n",style:{color:"#ff8844"}}]);for(const sug of suggestions){const rarity=FRUIT_RARITIES.find(function(r){return r.name===sug.fruit.rarity}),color=rarity?rarity.color:"#ffffff";say(adminId,[{str:"  → ",style:{color:"#888888"}},{str:sug.fruit.rpName,style:{color:color,fontWeight:"bold"}},{str:" ("+sug.fruit.itemName+")",style:{color:"#888888"}},{str:" ["+sug.fruit.rarity+"]",style:{color:color}}])}}return}const fruitData=found,ability=FRUIT_ABILITIES[fruitData.rpName],rarity=FRUIT_RARITIES.find(function(r){return r.name===fruitData.rarity}),color=rarity?rarity.color:"#ffffff",attributes={customDisplayName:fruitData.rpName,customDescription:"● "+fruitData.rarity+" Fruit ●\n"+fruitData.rpDesc+"\n[Sneak + Click to consume | Drop to give away]",customAttributes:{enchantmentTier:getRarityEnchantTier(fruitData.rarity),isFruitBlock:!0,fruitRpName:fruitData.rpName,uniqueRollId:Date.now()+"_"+Math.floor(1e5*Math.random())}},itemType=ability&&ability.baseItem?ability.baseItem.type:fruitData.itemName;try{api.giveItem(targetId,itemType,1,attributes)}catch(e){return void api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-xmark",style:{color:"red"}},{str:"  Failed to give fruit!",style:{color:"red"}}])}api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-check",style:{color:"lightgreen"}},{str:"  Gave "+fruitData.rpName+" to "+targetName+"!",style:{color:"lightgreen"}}]),say(adminId,[{str:"[Owner] ",style:{color:"#FFD700",fontWeight:"bold"}},{str:"Gave ",style:{color:"#aaaaaa"}},{str:fruitData.rpName,style:{color:color,fontWeight:"bold"}},{str:" ("+fruitData.itemName+") to ",style:{color:"#aaaaaa"}},{str:targetName,style:{color:"#FFD700"}}]);try{say(targetId,[{str:"[Admin] ",style:{color:"#FFD700",fontWeight:"bold"}},{str:"You received a ",style:{color:"#aaaaaa"}},{str:fruitData.rpName,style:{color:color,fontWeight:"bold"}},{str:" fruit! Hold it and Sneak + Click to eat.",style:{color:"#55ff55"}}])}catch(e){}}(playerId,userInput);break;case"remove_items":!function(adminId,userInput){if(!isOwner(adminId))return;const targetId=requireTarget(adminId);if(!targetId)return;const entries=function(input){const str=(input||"").toString().trim();if(!str)return[];const entries=[],parts=str.split(",");for(let i=0;i<parts.length;i++){const s=parts[i].trim();if(!s)continue;let amount=1,name=s;const m=s.match(/^(\d+)\s+(.+)$/);if(m)amount=parseInt(m[1],10),name=m[2].trim();else{const m2=s.match(/^(\d+)(\D.+)$/);m2&&(amount=parseInt(m2[1],10),name=m2[2].trim())}name&&amount>0&&entries.push({amount:amount,name:name})}return entries}(userInput);if(0===entries.length)return void api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-xmark",style:{color:"red"}},{str:"  Format: <amount> <name>, <amount> <name>… (e.g. 999 Dirt, 2 Control)",style:{color:"red"}}]);const targetName=getTargetName(targetId),results=[],notFound=[];for(const entry of entries){const nameLower=entry.name.toLowerCase(),fruitFound=findFruitByInput(entry.name);let target;target=!fruitFound||"exact_rp"!==fruitFound.matchType&&"exact_item"!==fruitFound.matchType?playerHasPlainItem(targetId,nameLower)?{nameLower:nameLower}:fruitFound?buildFruitTarget(fruitFound):{nameLower:nameLower}:buildFruitTarget(fruitFound);const invRemoved=removeTargetFromInventory(targetId,target,entry.amount),total=invRemoved+removeTargetFromMoonstone(targetId,target,entry.amount-invRemoved);if(total>0){const label=target.fruit?target.fruit.rpName:entry.name;results.push({label:label,amount:total})}else notFound.push(entry.name)}if(results.length>0){const removedStr=results.map(function(r){return r.amount+" "+r.label}).join(", "),infoParts=[{icon:"fa-solid fa-check",style:{color:"lightgreen"}},{str:"  Removed "+removedStr+" from "+targetName+"!",style:{color:"lightgreen"}}];if(notFound.length>0&&infoParts.push({str:"\nNot found: "+notFound.join(", "),style:{color:"orange"}}),api.sendOverShopInfo(adminId,infoParts),say(adminId,[{str:"[Owner] ",style:{color:"#FFD700",fontWeight:"bold"}},{str:"Removed from ",style:{color:"#aaaaaa"}},{str:targetName,style:{color:"#FFD700"}},{str:": "+removedStr,style:{color:"#ff8844",fontWeight:"bold"}}]),notFound.length>0&&say(adminId,[{str:"[Owner] ",style:{color:"#FFD700",fontWeight:"bold"}},{str:"Not found: ",style:{color:"orange"}},{str:notFound.join(", "),style:{color:"orange",fontWeight:"bold"}}]),targetId!==adminId)try{say(targetId,[{str:"[Admin] ",style:{color:"#FFD700",fontWeight:"bold"}},{str:"Items were removed from your inventory by an owner.",style:{color:"#ff8844"}}])}catch(e){}}else api.sendOverShopInfo(adminId,[{icon:"fa-solid fa-triangle-exclamation",style:{color:"orange"}},{str:"  Nothing removed — not found: "+notFound.join(", "),style:{color:"orange"}}])}(playerId,userInput);break;case"set_money":setTargetMoney(playerId,userInput);break;case"set_level":setTargetLevelMenu(playerId,userInput)}else api.sendOverShopInfo(playerId,[{icon:"fa-solid fa-lock",style:{color:"red"}},{str:"  You don't have permission to use this!",style:{color:"red"}}])}
export function adminJoin(playerId){if(hasPermission(playerId,PERMISSION_LEVELS.BASIC)){!function(playerId){if(adminTargetPlayer[playerId]=playerId,api.configureShopCategoryForPlayer(playerId,"admin",{customTitle:"Admin Panel",autoSelectCategory:!1,sortPriority:200}),api.createShopItemForPlayer(playerId,"admin","info",{image:"Golden Crown",canBuy:!1,sortPriority:100,customTitle:[{str:"Admin Panel",style:{color:"#FFD700",fontWeight:"bold"}}],description:[{icon:"fa-solid fa-shield-halved",style:{color:"#FFD700"}}," Welcome to the ",{str:"Admin Panel",style:{color:"#FFD700",fontWeight:"bold"}},".\nUse the buttons below to perform admin actions."]}),api.createShopItemForPlayer(playerId,"admin","select_target",{image:"Player Head",imageColour:"#55aaff",canBuy:!0,cost:0,sortPriority:98,customTitle:[{str:"Select Player",style:{color:"#55aaff",fontWeight:"bold"}}],buyButtonText:[{str:"Select",style:{color:"#55aaff"}}],description:[{icon:"fa-solid fa-crosshairs",style:{color:"#55aaff"}}," Pick the player to target with other actions.","\nThis selection is used by ",{str:"TP To, TP Here, Kick, Ban, View Inventory, Set Gamemode, Give Fruit",style:{color:"#cccccc"}},".",{str:'\nClick "Select" without picking anyone to target yourself.',style:{color:"#888888"}}],userInput:{type:"player"}}),refreshTargetDisplay(playerId),api.createShopItemForPlayer(playerId,"admin","tp_to",{image:"Compass",imageColour:"#55aaff",canBuy:!0,cost:0,sortPriority:90,customTitle:[{str:"TP To Player",style:{color:"#55aaff",fontWeight:"bold"}}],buyButtonText:[{str:"Teleport",style:{color:"#55aaff"}}],description:[{icon:"fa-solid fa-arrow-right-to-bracket",style:{color:"#55aaff"}}," Teleport ",{str:"yourself",style:{color:"#ffffff",fontWeight:"bold"}}," to the selected target."]}),api.createShopItemForPlayer(playerId,"admin","tp_here",{image:"Compass",imageColour:"#ff8855",canBuy:!0,cost:0,sortPriority:80,customTitle:[{str:"TP Here",style:{color:"#ff8855",fontWeight:"bold"}}],buyButtonText:[{str:"Summon",style:{color:"#ff8855"}}],description:[{icon:"fa-solid fa-user-plus",style:{color:"#ff8855"}}," Teleport the target player ",{str:"to you",style:{color:"#ffffff",fontWeight:"bold"}},"."]}),api.createShopItemForPlayer(playerId,"admin","tp_to_pos",{image:"Map",imageColour:"#aa55ff",canBuy:!0,cost:0,sortPriority:70,customTitle:[{str:"TP To Position",style:{color:"#aa55ff",fontWeight:"bold"}}],buyButtonText:[{str:"Go",style:{color:"#aa55ff"}}],description:[{icon:"fa-solid fa-location-crosshairs",style:{color:"#aa55ff"}}," Teleport yourself to ",{str:"coordinates",style:{color:"#ffffff",fontWeight:"bold"}},".\nFormat: ",{str:"x, y, z",style:{color:"#cccccc"}}," (e.g. 700, -910, -200)"],userInput:{type:"text",placeholderText:"x, y, z",wordCharsOnly:!1}}),api.createShopItemForPlayer(playerId,"admin","warp_island",{image:"Map",imageColour:"#55ff88",canBuy:!0,cost:0,sortPriority:65,customTitle:[{str:"Warp to Island",style:{color:"#55ff88",fontWeight:"bold"}}],buyButtonText:[{str:"Warp",style:{color:"#55ff88"}}],description:[{icon:"fa-solid fa-island-tropical",style:{color:"#55ff88"}}," Teleport yourself to an ",{str:"island",style:{color:"#ffffff",fontWeight:"bold"}},".",{str:"\n(All staff including Testers+)",style:{color:"#888888"}}],userInput:{type:"dropdown",dropdownOptions:Object.keys(ISLAND_WARPS)}}),api.createShopItemForPlayer(playerId,"admin","clear_entities",{image:"Iron Sword",imageColour:"#ff6600",canBuy:!0,cost:0,sortPriority:60,customTitle:[{str:"Clear Entities",style:{color:"#ff6600",fontWeight:"bold"}}],buyButtonText:[{str:"Clear",style:{color:"#ff4444"}}],description:[{icon:"fa-solid fa-broom",style:{color:"#ff6600"}}," Pick in the list what to clear: ",{str:"All",style:{color:"#ffffff",fontWeight:"bold"}},", mobs, dropped items, meshes, throwables, loot…","\nPlayers are never touched.",{str:"\n(Tester+ only)",style:{color:"#888888"}}],userInput:{type:"dropdown",dropdownOptions:CLEAR_SCOPE_OPTIONS}}),hasPermission(playerId,PERMISSION_LEVELS.MOD)){const vanished=isVanished(playerId);api.createShopItemForPlayer(playerId,"admin","vanish",{image:"Ender Pearl",imageColour:"#cef3ff",canBuy:!0,cost:0,sortPriority:55,customTitle:[{str:vanished?"Vanish [ON]":"Vanish [OFF]",style:{color:vanished?"#00ffff":"#cef3ff",fontWeight:"bold"}}],buyButtonText:[{str:vanished?"Disable":"Enable",style:{color:vanished?"#ff6666":"#55ff55"}}],description:[{icon:"fa-solid fa-ghost",style:{color:"#cef3ff"}}," Total invisibility mode (fake leave/join, hidden from leaderboard & nametag).",vanished?{str:"\n● STATUS: CURRENTLY VANISHED (hidden from everyone)",style:{color:"#00ffff",fontWeight:"bold"}}:{str:"\n● STATUS: Visible",style:{color:"#888888"}},{str:"\n(MOD+ only)",style:{color:"#888888"}}]})}api.createShopItemForPlayer(playerId,"admin","view_inventory",{image:"Chest",imageColour:"#ffdd55",canBuy:!0,cost:0,sortPriority:40,customTitle:[{str:"View Inventory",style:{color:"#ffdd55",fontWeight:"bold"}}],buyButtonText:[{str:"Inspect",style:{color:"#ffdd55"}}],description:[{icon:"fa-solid fa-magnifying-glass",style:{color:"#ffdd55"}}," Inspect the target's ",{str:"inventory",style:{color:"#ffffff",fontWeight:"bold"}}," and ",{str:"Moonstone Chest",style:{color:"#bb88ff",fontWeight:"bold"}},"."]}),api.createShopItemForPlayer(playerId,"admin","inventory_display",{image:"Book",canBuy:!1,sortPriority:35,customTitle:[{str:"Last Inspection",style:{color:"#888888"}}],description:[{str:"No inspection yet.",style:{color:"#888888"}},"\nUse ",{str:"View Inventory",style:{color:"#ffdd55"}}," to inspect a player."]}),api.createShopItemForPlayer(playerId,"admin","inventory_display2",{image:"Book",canBuy:!1,sortPriority:34,customTitle:[{str:"Last Inspection (page 2)",style:{color:"#888888"}}],description:[{str:"Nothing here yet.",style:{color:"#888888"}},"\nThis page is only used when a player has too many items to fit on page 1."]}),api.createShopItemForPlayer(playerId,"admin","inventory_display3",{image:"Book",canBuy:!1,sortPriority:33,customTitle:[{str:"Last Inspection (page 3)",style:{color:"#888888"}}],description:[{str:"Nothing here yet.",style:{color:"#888888"}},"\nThis page is used in case of heavy inventory overflow."]}),api.createShopItemForPlayer(playerId,"admin","kick",{image:"Iron Sword",imageColour:"#ff4444",canBuy:!0,cost:0,sortPriority:50,customTitle:[{str:"Kick Player",style:{color:"#ff4444",fontWeight:"bold"}}],buyButtonText:[{str:"Kick",style:{color:"#ff4444"}}],description:[{icon:"fa-solid fa-ban",style:{color:"#ff4444"}}," Kick the target player from the server.",{str:"\n(DEV+ only)",style:{color:"#888888"}},{str:"\nYou cannot kick yourself.",style:{color:"#888888"}}]}),isOwner(playerId)&&(api.createShopItemForPlayer(playerId,"admin","set_gamemode",{image:"Golden Crown",imageColour:"#FFD700",canBuy:!0,cost:0,sortPriority:30,customTitle:[{str:"Set Gamemode",style:{color:"#FFD700",fontWeight:"bold"}}],buyButtonText:[{str:"Apply",style:{color:"#FFD700"}}],description:[{icon:"fa-solid fa-crown",style:{color:"#FFD700"}}," ",{str:"OWNER ONLY",style:{color:"#FFD700",fontWeight:"bold"}}," — Change the target player's gamemode."],userInput:{type:"dropdown",dropdownOptions:GAMEMODES,autoSubmit:!1}}),api.createShopItemForPlayer(playerId,"admin","ban",{image:"Iron Sword",imageColour:"#cc0000",canBuy:!0,cost:0,sortPriority:25,customTitle:[{str:"Ban from Lobby",style:{color:"#cc0000",fontWeight:"bold"}}],buyButtonText:[{str:"Ban",style:{color:"#cc0000"}}],description:[{icon:"fa-solid fa-gavel",style:{color:"#cc0000"}}," ",{str:"OWNER ONLY",style:{color:"#FFD700",fontWeight:"bold"}}," — Ban the target player from this lobby.","\nThey will be kicked and unable to rejoin this lobby.",{str:"\nYou cannot ban yourself.",style:{color:"#888888"}}]}),api.createShopItemForPlayer(playerId,"admin","unban",{image:"Golden Apple",imageColour:"#55ff55",canBuy:!0,cost:0,sortPriority:24,customTitle:[{str:"Unban from Lobby",style:{color:"#55ff55",fontWeight:"bold"}}],buyButtonText:[{str:"Unban",style:{color:"#55ff55"}}],description:[{icon:"fa-solid fa-unlock",style:{color:"#55ff55"}}," ",{str:"OWNER ONLY",style:{color:"#FFD700",fontWeight:"bold"}}," — Remove a player's lobby ban.","\nSelect a player from the banned list.","\nWorks even if they are offline."],userInput:{type:"dropdown",dropdownOptions:getBanList().length>0?getBanList():["(no banned players)"]}}),api.createShopItemForPlayer(playerId,"admin","ban_list",{image:"Book",imageColour:"#cc0000",canBuy:!0,cost:0,sortPriority:23,customTitle:[{str:"View Ban List",style:{color:"#cc0000",fontWeight:"bold"}}],buyButtonText:[{str:"Refresh",style:{color:"#cc0000"}}],description:[{icon:"fa-solid fa-list",style:{color:"#cc0000"}}," View all ",{str:"banned players",style:{color:"#ff6666",fontWeight:"bold"}}," and ",{str:"recent players",style:{color:"#55aaff",fontWeight:"bold"}},".\nUseful to find the exact name for unban."]}),api.createShopItemForPlayer(playerId,"admin","ban_list_display",{image:"Book",canBuy:!1,sortPriority:22,customTitle:[{str:"Ban List & Recent",style:{color:"#888888"}}],description:[{str:'Click "View Ban List" to load.',style:{color:"#888888"}}]}),api.createShopItemForPlayer(playerId,"admin","give_fruit",{image:"Apple",imageColour:"#ff88ff",canBuy:!0,cost:0,sortPriority:20,customTitle:[{str:"Give Fruit",style:{color:"#ff88ff",fontWeight:"bold"}}],buyButtonText:[{str:"Give",style:{color:"#ff88ff"}}],description:[{icon:"fa-solid fa-gift",style:{color:"#ff88ff"}}," ",{str:"OWNER ONLY",style:{color:"#FFD700",fontWeight:"bold"}}," — Give a fruit to the target player.","\nType the ",{str:"fruit name",style:{color:"#ffffff"}}," or ",{str:"block name",style:{color:"#ffffff"}}," below.","\nPartial names work! (Bud → Buddha, Sto → Stone → Control)"],userInput:{type:"text",placeholderText:"e.g. Buddha or Banana Block",wordCharsOnly:!1}}),api.createShopItemForPlayer(playerId,"admin","remove_items",{image:"Iron Sword",imageColour:"#ff8844",canBuy:!0,cost:0,sortPriority:18,customTitle:[{str:"Remove Items",style:{color:"#ff8844",fontWeight:"bold"}}],buyButtonText:[{str:"Remove",style:{color:"#ff4444"}}],description:[{icon:"fa-solid fa-trash",style:{color:"#ff8844"}}," ",{str:"OWNER ONLY",style:{color:"#FFD700",fontWeight:"bold"}}," — Remove items from the target (inventory + Moonstone Chest).","\nFormat: ",{str:"<amount> <name>, <amount> <name>…",style:{color:"#cccccc"}},"\nExample: ",{str:"999 Dirt, 2 Control",style:{color:"#ffdd55",fontWeight:"bold"}},"\n• Blocks: exact item name","\n• Fruits: real fruit name (autocomplete) or item name",{str:"\nAn amount bigger than what they hold just removes everything (no error).",style:{color:"#888888"}}],userInput:{type:"text",placeholderText:"e.g. 999 Dirt, 2 Control",wordCharsOnly:!1}}),api.createShopItemForPlayer(playerId,"admin","set_money",{image:"Golden Apple",imageColour:"#FFD700",canBuy:!0,cost:0,sortPriority:17,customTitle:[{str:"Change Money",style:{color:"#FFD700",fontWeight:"bold"}}],buyButtonText:[{str:"Apply",style:{color:"#FFD700"}}],description:[{icon:"fa-solid fa-coins",style:{color:"#FFD700"}}," ",{str:"OWNER ONLY",style:{color:"#FFD700",fontWeight:"bold"}}," — Add or remove Coins on the selected player.\n",{str:"+5000",style:{color:"#55ff55",fontWeight:"bold"}}," adds, ",{str:"-2000",style:{color:"#ff6666",fontWeight:"bold"}}," removes, ",{str:"5000",style:{color:"#55aaff",fontWeight:"bold"}}," sets the exact amount.",{str:"\nGoes down to 0, never negative.",style:{color:"#888888"}}],userInput:{type:"text",placeholderText:"e.g. +5000 / -2000 / 5000",wordCharsOnly:!1}}),delete levelMenuMode[playerId],api.createShopItemForPlayer(playerId,"admin","set_level",{image:"Book",imageColour:"#55ff55",canBuy:!0,cost:0,sortPriority:16,customTitle:[{str:"Level / XP Menu",style:{color:"#55ff55",fontWeight:"bold"}}],buyButtonText:[{str:"Choose",style:{color:"#55ff55"}}],description:levelMenuDesc(),userInput:{type:"dropdown",dropdownOptions:LEVEL_MENU_MODES}}))}(playerId);hasPermission(playerId,PERMISSION_LEVELS.MOD)&&createMuteItems(playerId);try{say(playerId,[{str:"[Admin] ",style:{color:"#FFD700",fontWeight:"bold"}},{str:"Admin Panel loaded. Open the shop to access it.",style:{color:"#aaaaaa"}}])}catch(e){}}for(const vId of vanishedPlayers)if(vId!==playerId){try{api.setOtherEntitySetting(playerId,vId,"canSee",!1)}catch(e){}try{api.setOtherEntitySetting(playerId,vId,"opacity",0)}catch(e){}try{api.setOtherEntitySetting(playerId,vId,"nameTagInfo",{content:[],subtitle:[],border:null,healthbar:{display:"never"}})}catch(e){}try{api.setOtherEntitySetting(playerId,vId,"lobbyLeaderboardValues",null)}catch(e){}}}
export function adminLeave(playerId){delete adminTargetPlayer[playerId];delete levelMenuMode[playerId];for(const adminId in adminTargetPlayer)adminTargetPlayer[adminId]===playerId&&delete adminTargetPlayer[adminId];vanishedPlayers.has(playerId)&&vanishedPlayers.delete(playerId)}try{const onlinePlayers=api.getPlayerIds();for(const id of onlinePlayers)adminJoin(id)}catch(e){}