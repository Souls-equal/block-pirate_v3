// team.js

import { convertWeaponAttributes, scanAllItems, writeItem } from "../gameplay/customItem";
import { deleteStat, getStat, setStat } from "../utils/data";
import { getRankDataForPlayer, canBypassChatRestriction } from './ranks'
import { updateSidebar, refreshLeaderboardPlayer } from "./UI";
import { isVanished } from "./admin";
function safeName(id) {
    if (!id) return "Unknown";
    try { return api.getEntityName(id) || "Unknown"; } catch (e) { return "Unknown"; }
};

/* TEAM SYSTEM */
export const TEAM = {
    NONE: {
        id: "NONE",
        name: "No Team",
        color: "lightgray",
        prefix: "[NoTeam]",
        chatLetter: " N"
    },
    PIRATES: {
        id: "PIRATES",
        name: "Pirates",
        color: "#ff6b6b",
        prefix: "[Pirate]",
        chatLetter: " P"
    },
    MARINES: {
        id: "MARINES",
        name: "Marines",
        color: "#6bb6ff",
        prefix: "[Marine]",
        chatLetter: " M"
    }
};

/* TEAM WEAPONS MAPPING (NOUVEAU) */
const WEAPON_MAPPING = {
    "Basic Dagger": {
        PIRATES: { item: "Wood Sword", displayName: "Basic Dagger", description: "The first weapon of every Pirates." },
        MARINES: { item: "Wood Spear", displayName: "Basic Spear", description: "The spear of the Justice!" },
        DEFAULT: { item: "Wood Sword", displayName: "Basic Sword", description: "Just a sword for a normal people..." }
    },
    "Basic Spear": {
        PIRATES: { item: "Wood Sword", displayName: "Basic Dagger", description: "The first weapon of every Pirates." },
        MARINES: { item: "Wood Spear", displayName: "Basic Spear", description: "The spear of the Justice!" },
        DEFAULT: { item: "Wood Sword", displayName: "Basic Sword", description: "Just a sword for a normal people..." }
    },
    "Basic Sword": {
        PIRATES: { item: "Wood Sword", displayName: "Basic Dagger", description: "The first weapon of every Pirates." },
        MARINES: { item: "Wood Spear", displayName: "Basic Spear", description: "The spear of the Justice!" },
        DEFAULT: { item: "Wood Sword", displayName: "Basic Sword", description: "Just a sword for a normal people..." }
    },
    "Advanced Sword": {
        PIRATES: { item: "Stone Sword", displayName: "Advanced Sword", description: "The sword of a strong Pirates." },
        MARINES: { item: "M1911", displayName: "Flintlock", description: "A slow Flintlock to kill enemies from the distance!" },
        DEFAULT: { item: "Stone Spear", displayName: "Advanced Spear", description: "Just a sword for a normal people..." }
    },
    "Flintlock": {
        PIRATES: { item: "Stone Sword", displayName: "Advanced Sword", description: "The sword of a strong Pirates." },
        MARINES: { item: "M1911", displayName: "Flintlock", description: "A slow Flintlock to kill enemies from the distance!" },
        DEFAULT: { item: "Stone Spear", displayName: "Advanced Spear", description: "Just a sword for a normal people..." }
    },
    "Advanced Spear": {
        PIRATES: { item: "Stone Sword", displayName: "Advanced Sword", description: "The sword of a strong Pirates." },
        MARINES: { item: "M1911", displayName: "Flintlock", description: "A slow Flintlock to kill enemies from the distance!" },
        DEFAULT: { item: "Stone Spear", displayName: "Advanced Spear", description: "Just a sword for a normal people..." }
    }
};

function replaceTeamWeapons(playerId, newTeam) {
    let replacedCount = 0;

    scanAllItems(playerId, (item, where, slot) => {
        const displayName = item.attributes?.customDisplayName;
        if (!displayName) return;

        const weaponMap = WEAPON_MAPPING[displayName];
        if (!weaponMap) return;

        const newWeaponInfo = weaponMap[newTeam] || weaponMap.DEFAULT;
        if (!newWeaponInfo) return;

        const newAttributes = {
            customDisplayName: newWeaponInfo.displayName,
            customDescription: newWeaponInfo.description
        };

        const customAttributes = convertWeaponAttributes(
            item.attributes?.customAttributes,
            newWeaponInfo.item
        );
        if (Object.keys(customAttributes).length) {
            newAttributes.customAttributes = customAttributes;
        }

        if (writeItem(playerId, where, slot, newWeaponInfo.item, 1, newAttributes)) {
            replacedCount++;
        }
    });

    return replacedCount;
}

export function reconcileTeamWeapons(playerId) {
    return replaceTeamWeapons(playerId, getPlayerTeam(playerId));
}

export function getTeamData(teamId) {
    return Object.values(TEAM).find(t => t.id === teamId) || TEAM.NONE;
}

export function getPlayerTeam(playerId) {
    return getStat(playerId, "team", "NONE");
}

setPlayerTeam = (playerId, teamId) => {
    const oldTeam = getPlayerTeam(playerId);
    setStat(playerId, "team", teamId);
    updateNameTag(playerId);
    setupChatChannels(playerId);
    updateSidebar(playerId);
    refreshLeaderboardPlayer(playerId);

    if (oldTeam !== teamId) {
        const replacedCount = replaceTeamWeapons(playerId, teamId);
        if (replacedCount > 0) {
            api.sendMessage(playerId, [
                { str: "⚔️ Team changed! Your weapons have been updated to ", style: { color: "#00BFFF" } },
                { str: getTeamData(teamId).name, style: { color: getTeamData(teamId).color, fontWeight: "bold" } },
                { str: " weapons. (" + replacedCount + " items replaced)", style: { color: "#AAAAAA" } }
            ]);
        }
    }
}

/* NAME TAG */
export function updateNameTag(playerId) {
    const name = api.getEntityName(playerId);
    const team = getTeamData(getPlayerTeam(playerId));
    const crew = getCrewName(playerId) || "No Crew";
    /* Une erreur d'API (joueur qui vient de partir) ne doit pas remonter et
       casser la suite de onPlayerJoin. */
    try {
        api.setTargetedPlayerSettingForEveryone(playerId, "nameTagInfo", {
            content: [{ str: name, style: { color: "white" } }],
            subtitle: [
                { str: team.prefix, style: { color: team.color, fontWeight: "bold" } },
                { str: " | ", style: { color: "lightgray", fontWeight: "bold" } },
                { str: crew, style: { color: "#ffcc00", fontWeight: "bold" } },
            ],
            border: { colour: team.color, applyTo: "both", style: "glow" },
            healthbar: {height:"19px", display:"always", backgroundColour:"gray" }
        });
    } catch (e) {}
}

/* CHAT CHANNEL UI */
export const CHAT_CHANNEL = {
    GLOBAL: "GLOBAL",
    TEAM: "TEAM",
    CREW: "CREW"
};

export { CHAT_CHANNEL as CHANNEL };

export function setupChatChannels(playerId) {
    const playerTeamData = getTeamData(getPlayerTeam(playerId))
    const channels = [
        {
            channelName: CHAT_CHANNEL.GLOBAL,
            elementContent: [{ icon: "globe" }, { str: " G" }],
            elementBgColor: "#2671d7"
        },
        {
            channelName: CHAT_CHANNEL.TEAM,
            elementContent: [{ icon: "flag" }, { str: playerTeamData.chatLetter}],
            elementBgColor: playerTeamData.color
        }
    ];

    if (getCrewName(playerId)) {
        channels.push({
            channelName: CHAT_CHANNEL.CREW,
            elementContent: [{ icon: "fa-solid fa-user-group" }, { str: " C" }],
            elementBgColor: "#ffcc00"
        });
    }

    api.setClientOption(playerId, "chatChannels", channels);
}

/* CREW SYSTEM */
export const CREWS = {};

export function getCrewName(playerId) {
    return getStat(playerId, "crew:name", null);
}

export function getCrewRole(playerId) {
    return getStat(playerId, "crew:role", null);
}

function setCrew(playerId, name, role) {
    setStat(playerId, "crew:name", name);
    setStat(playerId, "crew:role", role);
}

function clearCrew(playerId) {
    deleteStat(playerId, "crew:name");
    deleteStat(playerId, "crew:role");
}

export function syncCrewFromDB(playerId) {

    const crewName = getCrewName(playerId);
    if (!crewName) return;

    if (!CREWS[crewName]) {
        CREWS[crewName] = {
            captainId: null,
            members: new Set()
        };
    }
    const crew = CREWS[crewName];
    crew.members.add(playerId);

    const role = getCrewRole(playerId);
    if (role === "CAPTAIN") {
        crew.captainId = playerId;
    }
}

/* CREATE CREW */
function createCrew(playerId, name) {

    if (!name) {
        api.sendMessage(playerId, [{ str: "❌ Usage: /crew create <name>", style: { color: "#ff4444" } }]);
        return;
    }

    if (getCrewName(playerId)) {
        api.sendMessage(playerId, [{ str: "❌ You are already in a crew. Leave it first (/crew leave).", style: { color: "#ff4444" } }]);
        return;
    }

    if (CREWS[name]) {
        api.sendMessage(playerId, [{ str: "❌ A crew with this name already exists", style: { color: "#ff4444" } }]);
        return;
    }

    CREWS[name] = {
        captainId: playerId,
        members: new Set([playerId])
    };

    setCrew(playerId, name, "CAPTAIN");
    setupChatChannels(playerId);

    api.broadcastMessage([
        { str: api.getEntityName(playerId) + " created the crew: ", style: { color: "#00bfff" } },
        { str: name, style: { color: "#ffffff", fontWeight: "bold" } }
    ]);

    updateNameTag(playerId);
    updateSidebar(playerId);
    refreshLeaderboardPlayer(playerId);
}

/* JOIN CREW */
function joinCrew(playerId, name) {

    const crew = CREWS[name];
    if (!crew) return false;

    if (!crew.members) crew.members = new Set();

    if (getCrewName(playerId)) return false;
    if (crew.members.has(playerId)) return false;

    crew.members.add(playerId);
    setCrew(playerId, name, "MEMBER");
    setupChatChannels(playerId);

    api.sendMessage(playerId, [
        { str: "✅ Joined crew ", style: { color: "#00ff88" } },
        { str: name, style: { color: "#ffffff" } }
    ]);

    updateNameTag(playerId);
    updateSidebar(playerId);
    refreshLeaderboardPlayer(playerId);
    return true;
}

/* LEAVE CREW */
function leaveCrew(playerId) {

    const name = getCrewName(playerId);
    if (!name) {
        api.sendMessage(playerId, [{ str: "❌ You are not in a crew", style: { color: "#ff4444" } }]);
        return;
    }

    const crew = CREWS[name];
    clearCrew(playerId);
    setupChatChannels(playerId);

    api.sendMessage(playerId, [
        { str: "🚪 You left crew ", style: { color: "#ffcc00" } },
        { str: name, style: { color: "#ffffff" } }
    ]);

    updateNameTag(playerId);
    updateSidebar(playerId);
    refreshLeaderboardPlayer(playerId);

    if (!crew) return;

    crew.members.delete(playerId);

    if (crew.captainId === playerId || crew.members.size === 0) {
        disbandCrew(name);
    }
}

/* DISBAND CREW */
function disbandCrew(name) {

    const crew = CREWS[name];
    if (!crew) return;

    for (const id of [...crew.members]) {
        clearCrew(id);
        setupChatChannels(id);

        api.sendMessage(id, [
            { str: "💥 Crew disbanded: ", style: { color: "#ff4444" } },
            { str: name, style: { color: "#ffffff" } }
        ]);

        updateNameTag(id);
        updateSidebar(id);
        refreshLeaderboardPlayer(id);
    }

    delete CREWS[name];
}

/* INVITE */
function invitePlayer(senderId, targetName) {

    const crewName = getCrewName(senderId);
    const role = getCrewRole(senderId);

    if (role !== "CAPTAIN") {
        api.sendMessage(senderId, [{ str: "❌ Only the captain can invite", style: { color: "#ff4444" } }]);
        return;
    }

    if (!targetName) {
        api.sendMessage(senderId, [{ str: "❌ Usage: /crew invite <player>", style: { color: "#ff4444" } }]);
        return;
    }

    const targetId = api.getPlayerId(targetName);
    if (!targetId) {
        api.sendMessage(senderId, [{ str: "❌ Player not found (or offline)", style: { color: "#ff4444" } }]);
        return;
    }

    if (getCrewName(targetId)) {
        api.sendMessage(senderId, [{ str: "❌ Player already in a crew", style: { color: "#ff4444" } }]);
        return;
    }

    setStat(targetId, "crew:invite", crewName);

    api.sendMessage(targetId, [
        { str: "📩 Crew invite from ", style: { color: "#00bfff" } },
        { str: crewName, style: { color: "#ffffff" } },
        { str: " — type /crew accept " + crewName, style: { color: "#888888" } }
    ]);

    api.sendMessage(senderId, [{ str: "✅ Invite sent", style: { color: "#00ff88" } }]);
}

/* ACCEPT */
function acceptInvite(playerId, name) {

    const invite = getStat(playerId, "crew:invite", null);
    if (invite !== name) {
        api.sendMessage(playerId, [{ str: "❌ No invite from this crew", style: { color: "#ff4444" } }]);
        return;
    }

    const ok = joinCrew(playerId, name);
    if (ok) {
        deleteStat(playerId, "crew:invite");
    } else {
        api.sendMessage(playerId, [{ str: "❌ Could not join the crew (full / disbanded / already in one)", style: { color: "#ff4444" } }]);
    }
}

/* CHAT ROUTER */
const CAPS_LIMIT = 6;

export function normalizeCaps(message) {
    const text = typeof message === "string" ? message : String(message ?? "");
    let caps = 0;
    for (const ch of text) {
        if (ch !== ch.toLowerCase()) {
            caps++;
            if (caps > CAPS_LIMIT) return text.toLowerCase();
        }
    }
    return text;
}

export function handleChat(playerId, message, channel) {
    if (isVanished(playerId)) {
        api.sendMessage(playerId, [
            { str: "[Vanish] ", style: { color: "#cef3ff", fontWeight: "bold" } },
            { str: "Message not sent : ", style: { color: "#ff4444", fontWeight: "bold" } },
            { str: "you are vanished (fully invisible for other players).", style: { color: "#ffffff" } },
            { str: "\n(desactive Vanish from the admin panel to 'rejoin')", style: { color: "#888888" } }
        ]);
        return false;
    }

    message = normalizeCaps(message);

    const name = api.getEntityName(playerId);
    const team = getTeamData(getPlayerTeam(playerId));
    const rank = getRankDataForPlayer(playerId);

    const rankSeg = rank.prefix
        ? [{ str: rank.prefix + " ", style: { color: rank.color, fontWeight: "bold" } }]
        : [];

    const all = api.getPlayerIds();
    const online = new Set(all);

    const deliver = (ids, segments, tag) => {
        const done = new Set();
        for (const id of ids) {
            if (!id || done.has(id) || !online.has(id)) continue;
            done.add(id);
            api.sendMessage(id, segments);
        }
        if (tag) {
            for (const id of all) {
                if (done.has(id) || !online.has(id)) continue;
                if (!canBypassChatRestriction(id)) continue;
                api.sendMessage(id, [
                    { str: "[" + tag + "] ", style: { color: "#888888" } },
                    ...segments
                ]);
            }
        }
    };

    const buildMsg = (msgColor) => [
        ...rankSeg,
        { str: team.prefix + " ", style: { color: team.color, fontWeight: "bold" } },
        { str: name, style: { color: "#bbbbbb" } },
        { str: " : ", style: { color: "#888888" } },
        { str: message, style: { color: msgColor } }
    ];

    /* BYPASS: admins/mods reach everyone regardless of the channel */
    if (canBypassChatRestriction(playerId)) {
        deliver(all, buildMsg("#ffffff"));
        return false;
    }

    /* GLOBAL */
    if (channel === CHAT_CHANNEL.GLOBAL) {
        deliver(all, buildMsg("#ffffff"));
        return false;
    }

    /* TEAM */
    if (channel === CHAT_CHANNEL.TEAM) {
        const myTeam = getPlayerTeam(playerId);
        deliver(
            all.filter(id => getPlayerTeam(id) === myTeam),
            buildMsg(team.color),
            "Team " + team.name
        );
        return false;
    }

    /* CREW */
    if ((channel || "").toUpperCase() === CHAT_CHANNEL.CREW) {
        const crewName = getCrewName(playerId);
        if (!crewName) return false;

        syncCrewFromDB(playerId);
        const crew = CREWS[crewName];
        if (!crew) return false;
        if (!crew.members) crew.members = new Set();

        const role = getCrewRole(playerId);
        deliver([...crew.members].filter(id => online.has(id)), [
            ...rankSeg,
            {
                str: `[CREW:${role}] `,
                style: { color: role === "CAPTAIN" ? "#ffd700" : "#3DDC84", fontWeight: "bold" }
            },
            { str: name, style: { color: "#bbbbbb" } },
            { str: " : ", style: { color: "#888888" } },
            { str: message, style: { color: "#ffffff" } }
        ], "Crew " + crewName);
        return false;
    }

    return false;
}

/* DAMAGE CHECK */
export function canDamage(attacker, target) {

    const A = getCrewName(attacker);
    const B = getCrewName(target);
    if (A && B && A === B) return "preventDamage";

    const teamA = getPlayerTeam(attacker);
    const teamB = getPlayerTeam(target);
    if (teamA && teamB && teamA === "MARINES" && teamB === "MARINES") {
        api.sendMessage(attacker, "As a marine, you cant attack another marine player.", {color:"orange"});
        return "preventDamage"
    }
    return;
}

/* COMMANDS */
export function crewCommands(playerId, command) {
    const args = command.trim().split(/\s+/);
    let head = (args[0] || "").toLowerCase();

    if (head === "crew") {
        args.shift();
        head = (args[0] || "").toLowerCase();
    }

    const arg = args[1];

    switch (head) {
        case "pirate": setPlayerTeam(playerId, "PIRATES"); break;
        case "marine": setPlayerTeam(playerId, "MARINES"); break;
        case "pirates": setPlayerTeam(playerId, "PIRATES"); break;
        case "marines": setPlayerTeam(playerId, "MARINES"); break;

        case "create": createCrew(playerId, arg); break;
        case "invite": invitePlayer(playerId, arg); break;
        case "accept": acceptInvite(playerId, arg); break;
        case "leave":  leaveCrew(playerId); break;
        case "disband": {
            if (getCrewRole(playerId) === "CAPTAIN") {
                disbandCrew(getCrewName(playerId));
            } else {
                api.sendMessage(playerId, [{ str: "❌ Only the captain can disband the crew", style: { color: "#ff4444" } }]);
            }
            break;
        }
        case "info":
        case "":
            crewInfo(playerId);
            break;

    }

    return true;
}

/* CREW INFO */
function crewInfo(playerId) {

    const crewName = getCrewName(playerId);

    /* HELP HEADER */
    api.sendMessage(playerId, [
        { str: "⚔️ ===== CREW COMMANDS =====\n", style: { color: "#ffd700", fontWeight: "bold" } },

        { str: "/crew create <name> ", style: { color: "#ffffff" } },
        { str: "- Create a crew\n", style: { color: "#888888" } },

        { str: "/crew invite <player> ", style: { color: "#ffffff" } },
        { str: "- Invite a player\n", style: { color: "#888888" } },

        { str: "/crew accept <name> ", style: { color: "#ffffff" } },
        { str: "- Accept invite\n", style: { color: "#888888" } },

        { str: "/crew leave ", style: { color: "#ffffff" } },
        { str: "- Leave your crew\n", style: { color: "#888888" } },

        { str: "/crew disband ", style: { color: "#ffffff" } },
        { str: "- Disband crew (captain only)\n\n", style: { color: "#888888" } }
    ]);

    /* IF NO CREW */
    if (!crewName) {
        api.sendMessage(playerId, [
            { str: "❌ You are not in a crew\n", style: { color: "#ff4444" } }
        ]);
        return true;
    }

    const crew = CREWS[crewName];

    if (!crew) {
        api.sendMessage(playerId, [
            { str: "⚠️ Crew not found in memory (rejoin to resync)\n", style: { color: "#ffcc00" } }
        ]);
        return true;
    }

    const onlineMembers = new Set(api.getPlayerIds());
    const members = [...crew.members].filter(id => id && onlineMembers.has(id));

    const ownerName = (crew.captainId && onlineMembers.has(crew.captainId))
        ? safeName(crew.captainId)
        : "Unknown";

    api.sendMessage(playerId, [
        { str: "⚔️ ===== YOUR CREW =====\n", style: { color: "#00bfff", fontWeight: "bold" } },
        { str: crewName + "\n", style: { color: "#ffd700" } },

        { str: "Owner: ", style: { color: "#ffffff", fontWeight: "bold" } },
        { str: ownerName + "\n", style: { color: "#00bfff" } },

        { str: "Online Members (" + members.length + ")\n", style: { color: "#ffffff", fontWeight: "bold" } }
    ]);

    for (const id of members) {

        const role = getCrewRole(id) || "MEMBER";
        const mName = safeName(id);

        api.sendMessage(playerId, [
            { str: "- ", style: { color: "#888888" } },
            {
                str: mName + " ",
                style: {
                    color: role === "CAPTAIN" ? "#ffd700" : "#bbbbbb",
                    fontWeight: role === "CAPTAIN" ? "bold" : "normal"
                }
            },
            {
                str: `[${role}]\n`,
                style: { color: role === "CAPTAIN" ? "#ffd700" : "#00bfff" }
            }
        ]);
    }

    return true;
}
