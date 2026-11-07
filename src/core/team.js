// team.js

import { convertWeaponAttributes, scanAllItems, writeItem } from "../gameplay/customItem";
import { deleteStat, getStat, setStat } from "../utils/data";
import { getRankDataForPlayer, canBypassChatRestriction } from './ranks'
import { updateSidebar, refreshLeaderboardPlayer } from "./UI";
import { isVanished } from "./admin";
import { isOnlinePlayer } from "../utils/lifeform";
import { C, say, shout } from "./theme";
function safeName(id) {
    if (!id) return "Unknown";
    try { return api.getEntityName(id) || "Unknown"; } catch (e) { return "Unknown"; }
};

/* TEAM SYSTEM */
export const TEAM = {
    NONE: {
        id: "NONE",
        name: "No Team",
        color: C.INFO,
        prefix: "[NoTeam]",
        chatLetter: " N"
    },
    PIRATES: {
        id: "PIRATES",
        name: "Pirates",
        color: C.PIRATE,
        prefix: "[Pirate]",
        chatLetter: " P"
    },
    MARINES: {
        id: "MARINES",
        name: "Marines",
        color: C.MARINE,
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
            say(playerId, [
                { icon: "fa-solid fa-swords", style: { color: "#00BFFF" } }, { str: " Team changed! Your weapons have been updated to ", style: { color: "#00BFFF" } },
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
            elementContent: [{ icon: "fa-solid fa-globe" }, { str: " G" }],
            elementBgColor: "#2671d7"
        },
        {
            channelName: CHAT_CHANNEL.TEAM,
            elementContent: [{ icon: "fa-solid fa-flag" }, { str: playerTeamData.chatLetter}],
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
        say(playerId, [{ icon: "fa-solid fa-xmark", style: { color: "#ff4444" } }, { str: " Usage: /crew create <name>", style: { color: "#ff4444" } }]);
        return;
    }

    if (getCrewName(playerId)) {
        say(playerId, [{ icon: "fa-solid fa-xmark", style: { color: "#ff4444" } }, { str: " You are already in a crew. Leave it first (/crew leave).", style: { color: "#ff4444" } }]);
        return;
    }

    if (CREWS[name]) {
        say(playerId, [{ icon: "fa-solid fa-xmark", style: { color: "#ff4444" } }, { str: " A crew with this name already exists", style: { color: "#ff4444" } }]);
        return;
    }

    CREWS[name] = {
        captainId: playerId,
        members: new Set([playerId])
    };

    setCrew(playerId, name, "CAPTAIN");
    setupChatChannels(playerId);

    shout([
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

    say(playerId, [
        { icon: "fa-solid fa-circle-check", style: { color: "#00ff88" } }, { str: " Joined crew ", style: { color: "#00ff88" } },
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
        say(playerId, [{ icon: "fa-solid fa-xmark", style: { color: "#ff4444" } }, { str: " You are not in a crew", style: { color: "#ff4444" } }]);
        return;
    }

    const crew = CREWS[name];
    clearCrew(playerId);
    setupChatChannels(playerId);

    say(playerId, [
        { icon: "fa-solid fa-sign-out-alt", style: { color: "#ffcc00" } }, { str: " You left crew ", style: { color: "#ffcc00" } },
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

        say(id, [
            { icon: "fa-solid fa-fire", style: { color: "#ff4444" } }, { str: " Crew disbanded: ", style: { color: "#ff4444" } },
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
        say(senderId, [{ icon: "fa-solid fa-xmark", style: { color: "#ff4444" } }, { str: " Only the captain can invite", style: { color: "#ff4444" } }]);
        return;
    }

    if (!targetName) {
        say(senderId, [{ icon: "fa-solid fa-xmark", style: { color: "#ff4444" } }, { str: " Usage: /crew invite <player>", style: { color: "#ff4444" } }]);
        return;
    }

    const targetId = api.getPlayerId(targetName);
    if (!targetId) {
        say(senderId, [{ icon: "fa-solid fa-xmark", style: { color: "#ff4444" } }, { str: " Player not found (or offline)", style: { color: "#ff4444" } }]);
        return;
    }

    if (getCrewName(targetId)) {
        say(senderId, [{ icon: "fa-solid fa-xmark", style: { color: "#ff4444" } }, { str: " Player already in a crew", style: { color: "#ff4444" } }]);
        return;
    }

    setStat(targetId, "crew:invite", crewName);

    say(targetId, [
        { icon: "fa-solid fa-bell", style: { color: "#00bfff" } }, { str: " Crew invite from ", style: { color: "#00bfff" } },
        { str: crewName, style: { color: "#ffffff" } },
        { str: " — type /crew accept " + crewName, style: { color: "#888888" } }
    ]);

    say(senderId, [{ icon: "fa-solid fa-circle-check", style: { color: "#00ff88" } }, { str: " Invite sent", style: { color: "#00ff88" } }]);
}

/* ACCEPT */
function acceptInvite(playerId, name) {

    const invite = getStat(playerId, "crew:invite", null);
    if (invite !== name) {
        say(playerId, [{ icon: "fa-solid fa-xmark", style: { color: "#ff4444" } }, { str: " No invite from this crew", style: { color: "#ff4444" } }]);
        return;
    }

    const ok = joinCrew(playerId, name);
    if (ok) {
        deleteStat(playerId, "crew:invite");
    } else {
        say(playerId, [{ icon: "fa-solid fa-xmark", style: { color: "#ff4444" } }, { str: " Could not join the crew (full / disbanded / already in one)", style: { color: "#ff4444" } }]);
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

/* Dernier canal utilise par joueur (voir handleChat). */
const LAST_CHANNEL = {};

/* Appele a la deconnexion : la table ne doit pas grossir sans fin. */
export function forgetChatChannel(playerId) {
    delete LAST_CHANNEL[playerId];
}

export function handleChat(playerId, message, channel) {
    /* MUTE : le joueur ne peut plus parler, mais il joue normalement. On le
       bloque avant tout le reste, tous canaux confondus. */
    if (isMuted(playerId)) {
        say(playerId, muteRefusal(playerId));
        return false;
    }

    if (isVanished(playerId)) {
        say(playerId, [
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

    /* Envoie a `ids`, puis aux joueurs qui ont la permission de voir tous les
       canaux (hors destinataires deja servis) avec un prefixe indiquant le
       canal. Chaque envoi est isole : un joueur parti ne casse pas les autres. */
    const deliver = (ids, segments, tag) => {
        const done = new Set();
        for (const id of ids) {
            if (!id || done.has(id) || !online.has(id)) continue;
            done.add(id);
            try {
                say(id, segments);
            } catch (e) {}
        }
        if (tag) {
            for (const id of all) {
                if (done.has(id) || !online.has(id)) continue;
                if (!canBypassChatRestriction(id)) continue;
                try {
                    say(id, [
                        { str: "[" + tag + "] ", style: { color: "#888888" } },
                        ...segments
                    ]);
                } catch (e) {}
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

    /* Pas de passe-droit a l'ECRITURE : un admin qui parle dans le canal Team
       parle a sa team (couleur de sa team), et les joueurs qui ont la
       permission de voir tous les canaux recoivent la copie prefixee [Team X].
       La permission sert a LIRE les autres canaux, pas a parler a tout le
       monde en blanc. */

    /* Le moteur renvoie le nom du canal tel qu'il a ete enregistre. S'il ne
       le fournit pas (ou avec une casse differente), on reprend le DERNIER
       canal utilise par ce joueur plutot que de retomber en Global : un
       message d'equipe ne doit jamais partir a tout le monde. Le passe-droit
       des admins sert a LIRE les autres canaux, pas a elargir les leurs. */
    let chan = typeof channel === "string" ? channel.toUpperCase() : "";
    if (chan !== CHAT_CHANNEL.GLOBAL && chan !== CHAT_CHANNEL.TEAM && chan !== CHAT_CHANNEL.CREW) {
        chan = LAST_CHANNEL[playerId] || CHAT_CHANNEL.GLOBAL;
    } else {
        LAST_CHANNEL[playerId] = chan;
    }

    /* GLOBAL */
    if (chan === CHAT_CHANNEL.GLOBAL) {
        deliver(all, buildMsg("#ffffff"));
        return false;
    }

    /* TEAM */
    if (chan === CHAT_CHANNEL.TEAM) {
        const myTeam = getPlayerTeam(playerId);
        deliver(
            all.filter(id => getPlayerTeam(id) === myTeam),
            buildMsg(team.color),
            "Team " + team.name
        );
        return false;
    }

    /* CREW */
    if (chan === CHAT_CHANNEL.CREW) {
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

/* DAMAGE CHECK
   Appele par le corps a corps (onPlayerDamagingOtherPlayer) ET par les
   capacites (combat.damage via setTeamGuard) : un marine ne peut pas toucher
   un marine, et deux membres d'un meme equipage ne se touchent pas non plus. */
const TEAM_NOTICE = {};
const TEAM_NOTICE_MS = 4000;

/* PROTECTION DES PETITS NIVEAUX
   Un joueur SOUS le niveau 50 ne peut pas etre touche par un joueur AU-DESSUS
   du niveau 100, et il ne peut pas le toucher non plus : la protection est
   mutuelle, sinon un petit niveau pourrait taper un gros sans riposte.

   Les deux bornes sont volontairement larges : entre 50 et 100, tout reste
   permis, y compris contre un niveau 300 (c'est un choix de jeu, pas un oubli).
   La regle s'applique AUX DEUX CHEMINS de degats : le corps a corps
   (onPlayerDamagingOtherPlayer) et les capacites (combat.damage -> setTeamGuard),
   qui passent tous les deux par canDamage().

   On ne filtre QUE les joueurs : un niveau 300 continue de taper les mobs, les
   PNJ et les structures sans restriction. */
const LEVEL_SHIELD = {
    LOW: 50,   // en dessous : protege (niveau 49 et moins)
    HIGH: 100, // au dessus : dangereux pour les petits (niveau 101 et plus)
};
const LEVEL_NOTICE = {};
const LEVEL_NOTICE_MS = 4000;

/* Renvoie true si un des deux est protege contre l'autre. La lecture du niveau
   passe par la base (cle "lvl"), comme la prime et l'anti-farm. */
function levelShielded(attacker, target) {
    if (!attacker || !target || attacker === target) return false;
    if (!isOnlinePlayer(attacker) || !isOnlinePlayer(target)) return false;
    /* Lecture courte : un attaquant entre 50 et 100 ne peut jamais etre
       protege contre quelqu'un, et personne ne le protege non plus. On evite
       ainsi la seconde lecture de base dans le cas le plus courant. */
    const a = levelOf(attacker);
    const aLow = a < LEVEL_SHIELD.LOW;
    const aHigh = a > LEVEL_SHIELD.HIGH;
    if (!aLow && !aHigh) return false;
    const b = levelOf(target);
    if (aLow) return b > LEVEL_SHIELD.HIGH;
    return b < LEVEL_SHIELD.LOW;
}

/* Un message toutes les 4 s par attaquant : en combat, un coup refuse arrive
   plusieurs fois par seconde et inonderait le chat. */
function warnLevelShield(attacker, target) {
    const now = Date.now();
    if (LEVEL_NOTICE[attacker] && now - LEVEL_NOTICE[attacker] < LEVEL_NOTICE_MS) return;
    LEVEL_NOTICE[attacker] = now;
    say(attacker, [
        { icon: "fa-solid fa-shield", style: { color: C.INFO } },
        { str: " You can't damage ", style: { color: C.MONEY } },
        { str: safeName(target), style: { color: C.INFO, fontWeight: "bold" } },
        { str: " (level " + levelOf(target) + "): players under level " + LEVEL_SHIELD.LOW +
               " are protected from level " + LEVEL_SHIELD.HIGH + "+ players.", style: { color: C.MONEY } },
    ]);
}

function warnFriendly(attacker) {
    const now = Date.now();
    if (TEAM_NOTICE[attacker] && now - TEAM_NOTICE[attacker] < TEAM_NOTICE_MS) return;
    TEAM_NOTICE[attacker] = now;
    say(attacker, "You can't attack your own teammates.", { color: C.MONEY });
}

/* Garde de zone (lobby) : posee par index.js avec idInSafeZone() de
   gameplay/variations. Evite un import croise team <-> variations. */
let safeZoneCheck = null;
export function setSafeZoneCheck(fn) {
    safeZoneCheck = fn;
}

export function canDamage(attacker, target) {
    if (!attacker || !target || attacker === target) return;

    /* Zone neutre du lobby : le corps a corps non plus. */
    if (safeZoneCheck) {
        let inZone = false;
        try {
            inZone = safeZoneCheck(attacker) || safeZoneCheck(target);
        } catch (e) {}
        if (inZone) return "preventDamage";
    }

    const A = getCrewName(attacker);
    const B = getCrewName(target);
    if (A && B && A === B) {
        warnFriendly(attacker);
        return "preventDamage";
    }

    const teamA = getPlayerTeam(attacker);
    const teamB = getPlayerTeam(target);
    if (teamA === "MARINES" && teamB === "MARINES") {
        warnFriendly(attacker);
        return "preventDamage";
    }

    /* Petit niveau contre gros niveau : aucun des deux ne touche l'autre. */
    if (levelShielded(attacker, target)) {
        warnLevelShield(attacker, target);
        return "preventDamage";
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
                say(playerId, [{ icon: "fa-solid fa-xmark", style: { color: "#ff4444" } }, { str: " Only the captain can disband the crew", style: { color: "#ff4444" } }]);
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
    say(playerId, [
        { icon: "fa-solid fa-swords", style: { color: "#ffd700", fontWeight: "bold" } }, { str: " ===== CREW COMMANDS =====\n", style: { color: "#ffd700", fontWeight: "bold" } },

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
        say(playerId, [
            { icon: "fa-solid fa-xmark", style: { color: "#ff4444" } }, { str: " You are not in a crew\n", style: { color: "#ff4444" } }
        ]);
        return true;
    }

    const crew = CREWS[crewName];

    if (!crew) {
        say(playerId, [
            { icon: "fa-solid fa-triangle-exclamation", style: { color: "#ffcc00" } }, { str: " Crew not found in memory (rejoin to resync)\n", style: { color: "#ffcc00" } }
        ]);
        return true;
    }

    const onlineMembers = new Set(api.getPlayerIds());
    const members = [...crew.members].filter(id => id && onlineMembers.has(id));

    const ownerName = (crew.captainId && onlineMembers.has(crew.captainId))
        ? safeName(crew.captainId)
        : "Unknown";

    say(playerId, [
        { icon: "fa-solid fa-swords", style: { color: "#00bfff", fontWeight: "bold" } }, { str: " ===== YOUR CREW =====\n", style: { color: "#00bfff", fontWeight: "bold" } },
        { str: crewName + "\n", style: { color: "#ffd700" } },

        { str: "Owner: ", style: { color: "#ffffff", fontWeight: "bold" } },
        { str: ownerName + "\n", style: { color: "#00bfff" } },

        { str: "Online Members (" + members.length + ")\n", style: { color: "#ffffff", fontWeight: "bold" } }
    ]);

    for (const id of members) {

        const role = getCrewRole(id) || "MEMBER";
        const mName = safeName(id);

        say(playerId, [
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

/* ---------- BOUNTY ---------- */
/* Un Pirate (ou un joueur sans equipe, traite comme pirate) qui tue vole 10 %
   de l'argent de sa victime (1000 max) : ce montant est ajoute a sa prime.
   Un Marine qui tue un pirate empoche la prime (10000 max) et la prime du
   pirate repart a 0 (le surplus eventuel est perdu). La prime n'a pas de
   plafond : seule la recolte d'un Marine est plafonnee. */
const BOUNTY_STEAL_RATE = 0.1;
const BOUNTY_STEAL_MAX = 1000;
const BOUNTY_MARINE_MAX = 10000;
/* Ecart de niveau au-dela duquel la cible est "trop faible" : plus de vol
   d'argent (anti farm des petits joueurs), juste une prime reduite. */
const BOUNTY_WEAK_GAP = 40;
const BOUNTY_WEAK_RATE = 0.05;
/* Le moteur peut signaler une meme mort deux fois : on ignore un second
   traitement pour la meme victime pendant ce delai. */
const BOUNTY_LOCK_MS = 3000;
const BOUNTY_LAST = {};

/* ANTI-FABRICATION D'ARGENT — deux fenetres par PAIRE (tueur, victime).

   La prime "cible trop faible" est un montant CREE : on ajoute 5 % de
   l'argent de la victime a la prime du tueur sans rien debiter a la victime
   (c'est tout l'interet de la regle : on ne prend rien au petit joueur).
   Sans limite, on tuait donc le meme alt en boucle pour gonfler sa propre
   prime sans depenser un dollar, puis un Marine l'encaissait en argent
   frais. Une seule prime de ce type par paire et par fenetre.

   Meme logique a l'encaissement : un Marine qui tue deux fois le meme
   pirate dans la fenetre ne peut pas se faire payer deux fois, sinon un duo
   marine/pirate fabrique de l'argent en s'entretuant.

   Les paires sont purgees toutes les minutes : aucune fuite memoire. */
const BOUNTY_PAIR_MS = 10 * 60 * 1000;
const WEAK_MINT = {};     /* "tueur|victime" -> timestamp de la derniere prime anti-farm */
const MARINE_COLLECT = {}; /* "tueur|victime" -> timestamp du dernier encaissement */
let lastBountyPairPrune = 0;

function pruneBountyPairs(now) {
    if (now - lastBountyPairPrune < 60000) return;
    lastBountyPairPrune = now;
    for (const key in WEAK_MINT) {
        if (now - WEAK_MINT[key] > BOUNTY_PAIR_MS) delete WEAK_MINT[key];
    }
    for (const key in MARINE_COLLECT) {
        if (now - MARINE_COLLECT[key] > BOUNTY_PAIR_MS) delete MARINE_COLLECT[key];
    }
}

/* Minutes restantes avant que la paire redevienne "payable". */
function pairLeftMin(last, now) {
    return Math.max(1, Math.ceil((BOUNTY_PAIR_MS - (now - last)) / 60000));
}

function levelOf(playerId) {
    const n = Math.floor(Number(getStat(playerId, "lvl", 1)));
    return n > 0 ? n : 1;
}

function moneyOf(playerId) {
    const n = Math.floor(Number(getStat(playerId, "money", 0)));
    return n > 0 ? n : 0;
}

function giveMoney(playerId, amount) {
    if (!playerId || !amount) return;
    setStat(playerId, "money", Math.max(0, moneyOf(playerId) + amount));
}

function bountySay(playerId, text, color) {
    say(playerId, [ { str: text, style: { color: color } } ]);
}

/* La prime et l'argent sont affiches dans la leaderboard : on rafraichit les
   deux joueurs concernes apres un kill (jamais bloquant). */
function refreshBountyUi(killerId, victimId) {
    try {
        refreshLeaderboardPlayer(killerId);
    } catch (e) {}
    if (victimId && victimId !== killerId) {
        try {
            refreshLeaderboardPlayer(victimId);
        } catch (e) {}
    }
}

export function getBounty(playerId) {
    const n = Math.floor(Number(getStat(playerId, "bounty", 0)));
    return n > 0 ? n : 0;
}

export function setBounty(playerId, amount) {
    return setStat(playerId, "bounty", Math.max(0, Math.floor(amount || 0)));
}

export function addBounty(playerId, amount) {
    const gain = Math.max(0, Math.floor(amount || 0));
    const next = getBounty(playerId) + gain;
    setStat(playerId, "bounty", next);
    return next;
}

/* killerId doit etre un id de JOUEUR (verifie par l'appelant) ; victimId aussi. */
export function handleBountyKill(killerId, victimId) {
    if (!killerId || !victimId || killerId === victimId) return null;
    const now = Date.now();
    if (BOUNTY_LAST[victimId] && now - BOUNTY_LAST[victimId] < BOUNTY_LOCK_MS) return null;
    BOUNTY_LAST[victimId] = now;
    pruneBountyPairs(now);
    const pairKey = killerId + "|" + victimId;

    let killerTeam = "NONE";
    let victimTeam = "NONE";
    try { killerTeam = getPlayerTeam(killerId) || "NONE"; } catch (e) {}
    try { victimTeam = getPlayerTeam(victimId) || "NONE"; } catch (e) {}

    /* Marine vs Marine : rien (ils ne peuvent pas se frapper de toute facon). */
    if (killerTeam === "MARINES" && victimTeam === "MARINES") return null;

    if (killerTeam === "MARINES") {
        const victimBounty = getBounty(victimId);
        if (victimBounty <= 0) return { type: "none", amount: 0, bounty: 0 };
        /* Deja encaisse cette prime recemment : on la laisse sur la tete du
           pirate (elle reste a prendre plus tard) mais on ne paie pas deux
           fois la meme paire, sinon le duo s'entretue pour fabriquer de
           l'argent. */
        const lastCollect = MARINE_COLLECT[pairKey];
        if (lastCollect !== undefined && now - lastCollect < BOUNTY_PAIR_MS) {
            bountySay(killerId,
                "Bounty already collected from " + safeName(victimId) + " recently: no payout (" + pairLeftMin(lastCollect, now) + " min left).",
                C.INFO);
            return { type: "repeat", amount: 0, bounty: victimBounty };
        }
        MARINE_COLLECT[pairKey] = now;
        const payout = Math.min(victimBounty, BOUNTY_MARINE_MAX);
        setBounty(victimId, 0);
        giveMoney(killerId, payout);
        bountySay(killerId, "Bounty collected: $" + payout + " (" + safeName(victimId) + ")", C.MARINE);
        refreshBountyUi(killerId, victimId);
        return { type: "payout", amount: payout, lost: victimBounty - payout, bounty: 0 };
    }

    /* Cible trop faible (40 niveaux d'ecart ou plus) : on ne prend RIEN a la
       victime. Le tueur gagne seulement 5 % de ce qu'il aurait pu voler, en
       prime — de quoi eviter le farm de petits joueurs sans supprimer l'interet
       du combat. */
    if (levelOf(killerId) - levelOf(victimId) >= BOUNTY_WEAK_GAP) {
        /* Montant CREE : une seule fois par paire et par fenetre, sinon on
           gonfle sa prime en tuant le meme alt en boucle (voir plus haut). */
        const lastWeak = WEAK_MINT[pairKey];
        if (lastWeak !== undefined && now - lastWeak < BOUNTY_PAIR_MS) {
            bountySay(killerId,
                "Target too weak (40+ levels below) and already rewarded recently: no bounty (" + pairLeftMin(lastWeak, now) + " min left).",
                C.INFO);
            return { type: "weak-repeat", amount: 0, bounty: getBounty(killerId) };
        }
        const weak = Math.min(Math.floor(moneyOf(victimId) * BOUNTY_WEAK_RATE), BOUNTY_STEAL_MAX);
        if (weak <= 0) return { type: "none", amount: 0, bounty: getBounty(killerId) };
        WEAK_MINT[pairKey] = now;
        const weakBounty = addBounty(killerId, weak);
        bountySay(killerId,
            "Target too weak (40+ levels below): no money stolen, bounty +$" + weak + " (total $" + weakBounty + ")",
            C.PIRATE);
        refreshBountyUi(killerId, victimId);
        return { type: "weak", amount: 0, bounty: weakBounty };
    }

    /* Pirate (ou sans equipe) : vol de 10 % de l'argent de la victime. */
    const stolen = Math.min(Math.floor(moneyOf(victimId) * BOUNTY_STEAL_RATE), BOUNTY_STEAL_MAX);
    if (stolen <= 0) return { type: "none", amount: 0, bounty: getBounty(killerId) };
    giveMoney(victimId, -stolen);
    giveMoney(killerId, stolen);
    const bounty = addBounty(killerId, stolen);
    bountySay(killerId, "Bounty: +$" + stolen + " (total $" + bounty + ")", C.PIRATE);
    refreshBountyUi(killerId, victimId);
    return { type: "steal", amount: stolen, bounty: bounty };
}

/* ==========================================================================
   MUTE — « tais-toi », et rien d'autre.

   Un mute n'empeche QUE de parler : le joueur se deplace, se bat, commerce,
   utilise ses fruits... Rien n'est supprime et il n'est pas deconnecte,
   contrairement a un kick ou a un ban. Le panneau admin est dans core/admin.js.

   STOCKAGE (uniquement des cles nouvelles)
     db JOUEUR  "mt"               = "Par|fin"  -> source de verite, suit le
                                     joueur d'une variation a l'autre.
     db LOBBY   "admin_muteList"   = "Nom1,Nom2"
     db LOBBY   "admin_mute_<nom>" = "Par|fin"  -> liste consultable meme
                                     quand le joueur est hors ligne.
   `fin` = 0 : permanent, sinon date de fin en ms (le mute s'efface tout seul).

   IMPORTANT : team.js et admin.js s'importent mutuellement. Tout ce qui suit
   est donc en `function` (hors TDZ) et les cles sont ecrites en clair dans les
   fonctions : rien ne depend de l'ordre de chargement des deux fichiers.
   ========================================================================== */

/* Durees proposees dans le panneau admin (ms ; 0 = permanent). */
export function muteDurations() {
    return {
        "Permanent (until unmuted)": 0,
        "10 minutes": 10 * 60000,
        "1 hour": 60 * 60000,
        "1 day": 24 * 60 * 60000,
    };
}

export function muteDurationOptions() {
    return Object.keys(muteDurations());
}

function muteLobbyGet(key) {
    try {
        const v = api.getLobbyDbValue(key);
        return v == null ? null : String(v);
    } catch (e) {
        return null;
    }
}

function muteLobbySet(key, value) {
    try {
        api.setLobbyDbValue(key, value);
        return true;
    } catch (e) {
        return false;
    }
}

function muteLobbyDel(key) {
    try {
        api.deleteLobbyDbValue(key);
    } catch (e) {}
}

function muteDbGet(playerId, key) {
    try {
        const v = api.getPlayerDbValue(playerId, key);
        return v == null ? null : String(v);
    } catch (e) {
        return null;
    }
}

function muteDbSet(playerId, key, value) {
    try {
        api.setPlayerDbValue(playerId, key, value);
        return true;
    } catch (e) {
        return false;
    }
}

function muteDbDel(playerId, key) {
    try {
        api.deletePlayerDbValue(playerId, key);
    } catch (e) {}
}

function muteNameOf(playerId) {
    try {
        return api.getEntityName(playerId) || "";
    } catch (e) {
        return "";
    }
}

/* "Par|fin" -> { by, until }. Null si la valeur est inutilisable. */
function muteParse(raw) {
    if (!raw) return null;
    const parts = String(raw).split("|");
    const by = (parts[0] || "Admin").trim() || "Admin";
    const until = Number(parts[1]) || 0;
    return { by: by, until: until };
}

function muteExpired(info) {
    return !!info && info.until > 0 && Date.now() >= info.until;
}

/* L'index du lobby n'est qu'un INDEX. La verite, c'est la db joueur ("mt") :
   elle survit au redemarrage du lobby, pas l'index. Donc un index vide ou
   abime ne doit JAMAIS rendre un mute impossible a lever -> il se reconstruit
   tout seul (syncMuteIndex / getMuteList / isMuted). */

function getMuteIndex() {
    const raw = muteLobbyGet("admin_muteList");
    if (!raw) return [];
    return raw.split(",").filter(function (n) {
        return n.length > 0;
    });
}

function muteSaveList(list) {
    return muteLobbySet("admin_muteList", list.join(","));
}

/* Ajoute un nom a l'index s'il n'y est pas deja. */
function muteIndexAdd(name) {
    if (!name) return false;
    const list = getMuteIndex();
    if (list.indexOf(name) !== -1) return true;
    list.push(name);
    return muteSaveList(list);
}

/* Recopie la db joueur dans l'index du lobby. A appeler des qu'on croise un
   joueur en ligne : apres un redemarrage de lobby (qui vide la db lobby) le
   mute reste actif, et le nom doit revenir dans la liste pour pouvoir etre
   leve. Sans ca : "il est muet mais il n'apparait pas dans la liste". */
export function syncMuteIndex(playerId) {
    if (!playerId) return false;
    const raw = muteDbGet(playerId, "mt");
    const info = muteParse(raw);
    if (!info) return false;
    if (muteExpired(info)) {
        muteDbDel(playerId, "mt");
        return false;
    }
    const name = muteNameOf(playerId);
    if (!name) return false;
    if (muteLobbyGet("admin_mute_" + name) == null) muteLobbySet("admin_mute_" + name, raw);
    return muteIndexAdd(name);
}

/* Liste affichee : index nettoye + joueurs mutes EN LIGNE, meme si l'index
   les a perdus. Les mutes expires disparaissent au passage (plus de
   "(expired)" qui traine et bloque une nouvelle sanction). */
export function getMuteList() {
    const index = getMuteIndex();
    const list = [];
    let changed = false;

    for (let i = 0; i < index.length; i++) {
        const name = index[i];
        const info = muteParse(muteLobbyGet("admin_mute_" + name));
        if (info && muteExpired(info)) {
            /* mute fini : on nettoie, sinon il bloquerait la prochaine sanction
               ("X is already muted") et resterait affiche pour toujours. */
            changed = true;
            muteLobbyDel("admin_mute_" + name);
            continue;
        }
        /* vivant, ou enregistrement du lobby perdu : on garde le nom dans
           l'index, c'est le seul souvenir du mute pour un joueur hors ligne
           (et syncMuteIndex remettra la cle a son retour). */
        list.push(name);
    }

    /* filet de securite : un joueur muet en ligne est toujours demarquable */
    const online = muteOnlineIds();
    for (let i = 0; i < online.length; i++) {
        const raw = muteDbGet(online[i], "mt");
        const info = muteParse(raw);
        if (!info || muteExpired(info)) continue;
        const name = muteNameOf(online[i]);
        if (!name || list.indexOf(name) !== -1) continue;
        list.push(name);
        muteLobbySet("admin_mute_" + name, raw);
        changed = true;
    }

    if (changed) muteSaveList(list);
    return list;
}

export function isMutedName(name) {
    if (!name) return false;
    const info = muteParse(muteLobbyGet("admin_mute_" + name));
    if (info) {
        if (muteExpired(info)) {
            /* Menage paresseux : le mute s'efface tout seul. */
            unmuteName(name, true);
            return false;
        }
        return true;
    }
    return getMuteIndex().indexOf(name) !== -1;
}

/* Un joueur est-il muet ? (db joueur d'abord, liste du lobby en secours) */
export function isMuted(playerId) {
    if (!playerId) return false;
    const raw = muteDbGet(playerId, "mt");
    if (raw) {
        const info = muteParse(raw);
        if (info && !muteExpired(info)) {
            /* Repare l'index au passage (lobby redemarre, cle perdue...) :
               c'est ce qui garantit que le joueur reste demarquable. */
            const name = muteNameOf(playerId);
            if (name && muteLobbyGet("admin_mute_" + name) == null) {
                muteLobbySet("admin_mute_" + name, raw);
                muteIndexAdd(name);
            }
            return true;
        }
        muteDbDel(playerId, "mt");
    }
    return isMutedName(muteNameOf(playerId));
}

function muteOnlineIds() {
    try {
        return api.getPlayerIds() || [];
    } catch (e) {
        return [];
    }
}

function muteIdOfName(name) {
    if (!name) return null;
    try {
        const id = api.getPlayerId(name);
        if (id) return id;
    } catch (e) {}
    const all = muteOnlineIds();
    for (let i = 0; i < all.length; i++) if (muteNameOf(all[i]) === name) return all[i];
    return null;
}

/* Infos affichables : { by, until, remaining } ou null. */
export function getMuteInfo(name) {
    let raw = muteLobbyGet("admin_mute_" + name);
    if (!raw) {
        /* Repli quand le joueur est en ligne : sa db joueur porte le mute. */
        const all = muteOnlineIds();
        for (let i = 0; i < all.length; i++) {
            if (muteNameOf(all[i]) !== name) continue;
            raw = muteDbGet(all[i], "mt");
            break;
        }
    }
    const info = muteParse(raw);
    if (!info || muteExpired(info)) return null;
    return { by: info.by, until: info.until, remaining: remainingText(info.until) };
}

/* "10 min", "2 h", "permanent" */
export function remainingText(until) {
    if (!until) return "permanent";
    const ms = until - Date.now();
    if (ms <= 0) return "expired";
    const min = Math.ceil(ms / 60000);
    if (min < 60) return min + " min";
    const h = Math.round(min / 60);
    if (h < 48) return h + " h";
    return Math.round(h / 24) + " days";
}

/* Mute par nom (le joueur peut etre hors ligne). */
export function muteName(name, byName, durationMs) {
    if (!name) return false;
    const until = durationMs > 0 ? Date.now() + durationMs : 0;
    const info = String(byName || "Admin") + "|" + until;

    muteLobbySet("admin_mute_" + name, info);
    muteIndexAdd(name);

    /* Le joueur en ligne recoit aussi le drapeau dans sa db (il suit le joueur
       d'une variation a l'autre, contrairement a la db du lobby). */
    const id = muteIdOfName(name);
    if (id) muteDbSet(id, "mt", info);
    return true;
}

/* Mute du joueur cible (panneau admin). */
export function mutePlayer(playerId, byName, durationMs) {
    const name = muteNameOf(playerId);
    if (!name) return false;
    if (!muteName(name, byName, durationMs)) return false;
    const until = durationMs > 0 ? Date.now() + durationMs : 0;
    muteDbSet(playerId, "mt", String(byName || "Admin") + "|" + until);
    return true;
}

/* Retire le mute (silencieux = pas de message de succes). */
export function unmuteName(name, silent) {
    if (!name) return false;
    const index = getMuteIndex();
    const wasThere = index.indexOf(name) !== -1 || muteLobbyGet("admin_mute_" + name) != null;
    muteSaveList(index.filter(function (n) {
        return n !== name;
    }));
    muteLobbyDel("admin_mute_" + name);
    const id = muteIdOfName(name);
    if (id) muteDbDel(id, "mt");
    return !silent ? wasThere : false;
}

export function unmutePlayer(playerId) {
    return unmuteName(muteNameOf(playerId));
}

/* Ce qu'on repond au joueur qui essaie de parler. */
export function muteRefusal(playerId) {
    const info = getMuteInfo(muteNameOf(playerId)) || { by: "an admin", remaining: "unknown" };
    return [
        { icon: "fa-solid fa-volume-slash", style: { color: "#EF4444" } },
        { str: " You are muted", style: { color: "#EF4444", fontWeight: "bold" } },
        { str: " (" + info.remaining + ") by ", style: { color: "#CBD5E1" } },
        { str: info.by, style: { color: "#FFD700", fontWeight: "bold" } },
        { str: " — you can play, but not talk.", style: { color: "#CBD5E1" } },
    ];
}
