// team.js

import { applyItemLooks, convertWeaponAttributes, scanAllItems, writeItem } from "../gameplay/customItem";
import { deleteStat, getStat, setStat } from "../utils/data";
import { getRankDataForPlayer, canReadAllChannels } from './ranks'
import { updateSidebar, refreshLeaderboardPlayer } from "./UI";
import { isVanished } from "./admin";
import { applyNameTag, isOnlinePlayer } from "../utils/lifeform";
import { C, nfmt, say, shout, txt, bold, ic } from "./theme";

/* Couleur de l'equipage : l'or, celui de sa pastille de chat et de son nom sur
   le name tag. Un seul endroit, sinon les trois divergent. */
const CREW_COLOR = C.MONEY;
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

/* ARMES DE TEAM
   Ce n'est pas qu'un nom : l'ITEM change avec la team (epee de bois pour un
   pirate, lance de bois pour un marine). Deux tables, et elles ne disent que
   ca : le tier de l'arme et l'item de chaque team.

   Les NOMS, eux, ne sont plus ecrits ici. Ils vivent dans gameplay/customItem
   (ITEM_LOOKS / TEAM_ITEM_LOOKS) et sont poses par setItemStat au join puis a
   chaque changement de team (applyItemLooks). Un item converti est donc ecrit
   SANS customDisplayName : sinon l'ancien nom resterait colle dans les
   attributs et gagnerait contre la table. */
const TEAM_WEAPON_TIER = {
    "Wood Sword": "BASIC",
    "Wood Spear": "BASIC",
    "Stone Sword": "ADVANCED",
    "Stone Spear": "ADVANCED",
    "M1911": "ADVANCED",
};

const TEAM_WEAPON_ITEM = {
    BASIC: { PIRATES: "Wood Sword", MARINES: "Wood Spear", DEFAULT: "Wood Sword" },
    ADVANCED: { PIRATES: "Stone Sword", MARINES: "M1911", DEFAULT: "Stone Spear" },
};

function replaceTeamWeapons(playerId, newTeam) {
    let replacedCount = 0;

    scanAllItems(playerId, (item, where, slot) => {
        const tier = TEAM_WEAPON_TIER[item.name];
        if (!tier) return;

        const target = TEAM_WEAPON_ITEM[tier][newTeam] || TEAM_WEAPON_ITEM[tier].DEFAULT;
        if (!target) return;

        /* Deja le bon item : rien a faire. */
        if (target === item.name) return;

        const customAttributes = convertWeaponAttributes(
            item.attributes?.customAttributes,
            target
        );
        const attributes = Object.keys(customAttributes).length
            ? { customAttributes: customAttributes }
            : undefined;

        if (writeItem(playerId, where, slot, target, 1, attributes)) {
            replacedCount++;
        }
    });

    /* Les noms suivent l'item ET la team : le Wood Sword d'un pirate s'appelle
       "Basic Sword", celui d'un joueur sans team "Rusty Sword" (voir
       TEAM_ITEM_LOOKS). Rien a reecrire a la main : la table s'en charge. */
    if (replacedCount) applyItemLooks(playerId);

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
            /* Meme anatomie que les messages d'equipage : icone + « TEAM » +
               la phrase, le nom de la team dans SA couleur. */
            say(playerId, [
                ic("fa-solid fa-swords", getTeamData(teamId).color),
                bold(" TEAM  ", C.INFO),
                txt("Your weapons are now ", C.INFO),
                bold(getTeamData(teamId).name + " weapons", getTeamData(teamId).color),
                txt(" (" + replacedCount + " replaced).", C.INFO),
            ]);
        }
    }
}

/* NAME TAG */
export function updateNameTag(playerId) {
    /* Un id de joueur reste valide du join au leave : le nom est donc
       lisible. Le seul cas ou l'appel peut lever, c'est un leave dans le meme
       tick que l'appel (on ignore alors le name tag, il n'y a plus personne a
       afficher). Pas de faux nom : on ne pose rien plutot qu'un « Player »
       qui remplacerait un vrai pseudo. */
    let name = "";
    try { name = String(api.getEntityName(playerId) || ""); } catch (e) { return; }
    if (!name) return;
    const team = getTeamData(getPlayerTeam(playerId));
    const crew = getCrewName(playerId);
    /* Name tag = identite : pseudo, puis team et equipage sur la 2e ligne.
       Pas d'equipage = pas de « No Crew » gris : la ligne reste courte. */
    const subtitle = [bold(team.prefix, team.color)];
    if (crew) {
        subtitle.push(bold(" | ", C.INFO));
        subtitle.push(bold(String(crew), CREW_COLOR));
    }
    /* `applyNameTag` reconstruit l'objet selon le schema Bloxd et n'envoie
       jamais une valeur refusee (voir utils/lifeform.js). */
    applyNameTag(playerId, {
        content: [txt(name, C.INFO)],
        subtitle: subtitle,
        border: { colour: team.color, applyTo: "both", style: "glow" },
        healthbar: { height: "19px", display: "always", backgroundColour: "gray" },
    });
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
            elementContent: [ic("fa-solid fa-globe"), txt(" G")],
            elementBgColor: C.MARINE
        },
        {
            channelName: CHAT_CHANNEL.TEAM,
            elementContent: [ic("fa-solid fa-flag"), txt(playerTeamData.chatLetter)],
            elementBgColor: playerTeamData.color
        }
    ];

    if (getCrewName(playerId)) {
        channels.push({
            channelName: CHAT_CHANNEL.CREW,
            elementContent: [ic("fa-solid fa-user-group"), txt(" C")],
            elementBgColor: CREW_COLOR
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
        say(playerId, [
            ic("fa-solid fa-xmark", C.DANGER), bold(" CREW  ", CREW_COLOR),
            txt("Usage: /crew create <name>.", C.DANGER),
        ]);
        return;
    }

    if (getCrewName(playerId)) {
        say(playerId, [
            ic("fa-solid fa-xmark", C.DANGER), bold(" CREW  ", CREW_COLOR),
            txt("You are already in a crew. Leave it first (/crew leave).", C.DANGER),
        ]);
        return;
    }

    if (CREWS[name]) {
        say(playerId, [
            ic("fa-solid fa-xmark", C.DANGER), bold(" CREW  ", CREW_COLOR),
            txt("A crew named ", C.DANGER), bold(name, C.MONEY), txt(" already exists.", C.DANGER),
        ]);
        return;
    }

    CREWS[name] = {
        captainId: playerId,
        members: new Set([playerId])
    };

    setCrew(playerId, name, "CAPTAIN");
    setupChatChannels(playerId);

    shout([
        ic("fa-solid fa-flag", CREW_COLOR),
        bold(" CREW  ", CREW_COLOR),
        txt(api.getEntityName(playerId) + " created the crew ", C.INFO),
        bold(name, CREW_COLOR),
        txt(".", C.INFO),
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
        ic("fa-solid fa-circle-check", C.SUCCESS), bold(" CREW  ", CREW_COLOR),
        txt("You joined ", C.INFO), bold(name, CREW_COLOR), txt(".", C.INFO),
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
        say(playerId, [
            ic("fa-solid fa-xmark", C.DANGER), bold(" CREW  ", CREW_COLOR),
            txt("You are not in a crew.", C.DANGER),
        ]);
        return;
    }

    const crew = CREWS[name];
    clearCrew(playerId);
    setupChatChannels(playerId);

    say(playerId, [
        ic("fa-solid fa-sign-out-alt", C.INFO), bold(" CREW  ", CREW_COLOR),
        txt("You left ", C.INFO), bold(name, CREW_COLOR), txt(".", C.INFO),
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
            ic("fa-solid fa-fire", C.DANGER), bold(" CREW  ", CREW_COLOR),
            txt("Your crew ", C.INFO), bold(name, CREW_COLOR), txt(" was disbanded.", C.DANGER),
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
        say(senderId, [
            ic("fa-solid fa-xmark", C.DANGER), bold(" CREW  ", CREW_COLOR),
            txt("Only the captain can invite.", C.DANGER),
        ]);
        return;
    }

    if (!targetName) {
        say(senderId, [
            ic("fa-solid fa-xmark", C.DANGER), bold(" CREW  ", CREW_COLOR),
            txt("Usage: /crew invite <player>.", C.DANGER),
        ]);
        return;
    }

    const targetId = api.getPlayerId(targetName);
    if (!targetId) {
        say(senderId, [
            ic("fa-solid fa-xmark", C.DANGER), bold(" CREW  ", CREW_COLOR),
            txt("No player named ", C.DANGER), bold(targetName, C.INFO), txt(" is online.", C.DANGER),
        ]);
        return;
    }

    if (getCrewName(targetId)) {
        say(senderId, [
            ic("fa-solid fa-xmark", C.DANGER), bold(" CREW  ", CREW_COLOR),
            txt("That player is already in a crew.", C.DANGER),
        ]);
        return;
    }

    setStat(targetId, "crew:invite", crewName);

    say(targetId, [
        ic("fa-solid fa-bell", CREW_COLOR), bold(" CREW  ", CREW_COLOR),
        txt("You are invited to ", C.INFO), bold(crewName, CREW_COLOR),
        txt(". Type ", C.INFO), bold("/crew accept " + crewName, C.SUCCESS), txt(".", C.INFO),
    ]);

    say(senderId, [
        ic("fa-solid fa-circle-check", C.SUCCESS), bold(" CREW  ", CREW_COLOR),
        txt("Invite sent to ", C.INFO), bold(targetName, C.INFO), txt(".", C.INFO),
    ]);
}

/* ACCEPT */
function acceptInvite(playerId, name) {

    const invite = getStat(playerId, "crew:invite", null);
    if (invite !== name) {
        say(playerId, [
            ic("fa-solid fa-xmark", C.DANGER), bold(" CREW  ", CREW_COLOR),
            txt("No invite from that crew.", C.DANGER),
        ]);
        return;
    }

    const ok = joinCrew(playerId, name);
    if (ok) {
        deleteStat(playerId, "crew:invite");
    } else {
        say(playerId, [
            ic("fa-solid fa-xmark", C.DANGER), bold(" CREW  ", CREW_COLOR),
            txt("Could not join: the crew is gone, or you are already in one.", C.DANGER),
        ]);
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
            ic("Invisible", C.INFO),
            bold(" CHAT  ", C.INFO),
            txt("Message not sent: you are vanished, so nobody would read it.", C.DANGER),
            txt("\nTurn Vanish off in the admin panel to talk again.", C.INFO),
        ]);
        return false;
    }

    message = normalizeCaps(message);

    const name = api.getEntityName(playerId);
    const team = getTeamData(getPlayerTeam(playerId));
    const rank = getRankDataForPlayer(playerId);

    const rankSeg = rank.prefix
        ? [bold(rank.prefix + " ", rank.color)]
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
            /* Copie en LECTURE SEULE : seuls les rangs qui ont le droit de
               lire tous les canaux recoivent ce message, et ils ne peuvent
               pas repondre dedans (voir le refus plus bas). */
            for (const id of all) {
                if (done.has(id) || !online.has(id)) continue;
                if (!canReadAllChannels(id)) continue;
                try {
                    say(id, [
                        txt("[" + tag + "] ", C.INFO),
                        ...segments
                    ]);
                } catch (e) {}
            }
        }
    };

    const buildMsg = (msgColor) => [
        ...rankSeg,
        bold(team.prefix + " ", team.color),
        bold(name, C.INFO),
        txt(": ", C.INFO),
        txt(message, msgColor)
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
        deliver(all, buildMsg(C.INFO));
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
        /* Canal equipage sans equipage : on le DIT. Le silence faisait croire
           a un message parti, et un staff qui n'est dans aucun equipage
           n'obtient rien de plus : il peut LIRE les equipages, pas y parler. */
        if (!crewName) {
            say(playerId, [
                ic("fa-solid fa-lock", C.INFO),
                bold(" CHAT  ", C.INFO),
                txt("Crew channel is read-only for you: join a crew to speak there.", C.INFO),
            ]);
            return false;
        }

        syncCrewFromDB(playerId);
        const crew = CREWS[crewName];
        if (!crew) return false;
        if (!crew.members) crew.members = new Set();

        const role = getCrewRole(playerId);
        deliver([...crew.members].filter(id => online.has(id)), [
            ...rankSeg,
            bold("[Crew] ", CREW_COLOR),
            bold(name, role === "CAPTAIN" ? CREW_COLOR : C.INFO),
            txt(": ", C.INFO),
            txt(message, C.INFO)
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
        ic("fa-solid fa-shield", C.INFO),
        txt(" You can't damage ", C.MONEY),
        bold(safeName(target), C.INFO),
        txt(" (level " + levelOf(target) + "): players under level " + LEVEL_SHIELD.LOW +
               " are protected from level " + LEVEL_SHIELD.HIGH + "+ players.", C.MONEY),
    ]);
}

function warnFriendly(attacker, target) {
    const now = Date.now();
    if (TEAM_NOTICE[attacker] && now - TEAM_NOTICE[attacker] < TEAM_NOTICE_MS) return;
    TEAM_NOTICE[attacker] = now;
    /* Meme forme que l'avertissement de niveau juste au-dessus : icone, puis
       la phrase. C'etait la seule reponse du jeu envoyee en texte nu. */
    say(attacker, [
        ic("fa-solid fa-shield", C.INFO),
        txt(" You can't damage ", C.INFO),
        bold(safeName(target), C.MONEY),
        txt(": you are on the same team.", C.INFO),
    ]);
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
        warnFriendly(attacker, target);
        return "preventDamage";
    }

    const teamA = getPlayerTeam(attacker);
    const teamB = getPlayerTeam(target);
    if (teamA === "MARINES" && teamB === "MARINES") {
        warnFriendly(attacker, target);
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
                say(playerId, [
                    ic("fa-solid fa-xmark", C.DANGER), bold(" CREW  ", CREW_COLOR),
                    txt("Only the captain can disband the crew.", C.DANGER),
                ]);
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

/* CREW INFO

   Un seul message, comme les autres panneaux du jeu : un en-tete « CREW », la
   liste des commandes, puis l'etat de l'equipage. Avant, les commandes
   arrivaient dans un message, « you are not in a crew » dans un deuxieme, et
   CHAQUE membre dans un troisieme : ouvrir /crew inondait le chat, et le
   joueur devait recoller les morceaux. */
function crewInfo(playerId) {

    const crewName = getCrewName(playerId);
    const crew = crewName ? CREWS[crewName] : null;
    const onlineMembers = new Set(api.getPlayerIds());

    const parts = [
        ic("fa-solid fa-flag", CREW_COLOR),
        bold(" CREW COMMANDS\n", CREW_COLOR),

        bold("/crew create <name>", C.SUCCESS),
        txt("  create a crew\n", C.INFO),
        bold("/crew invite <player>", C.SUCCESS),
        txt("  invite a player\n", C.INFO),
        bold("/crew accept <name>", C.SUCCESS),
        txt("  accept an invite\n", C.INFO),
        bold("/crew leave", C.SUCCESS),
        txt("  leave your crew\n", C.INFO),
        bold("/crew disband", C.SUCCESS),
        txt("  disband it (captain only)\n", C.INFO),
    ];

    if (!crewName) {
        parts.push(
            ic("fa-solid fa-circle-info", C.INFO),
            bold(" CREW  ", CREW_COLOR),
            txt("You are not in a crew yet.", C.INFO)
        );
        say(playerId, parts);
        return true;
    }

    if (!crew) {
        parts.push(
            ic("fa-solid fa-triangle-exclamation", C.DANGER),
            bold(" CREW  ", CREW_COLOR),
            txt("Your crew is not loaded: leave it and join again.", C.DANGER)
        );
        say(playerId, parts);
        return true;
    }

    const members = [...crew.members].filter(id => id && onlineMembers.has(id));
    const ownerName = (crew.captainId && onlineMembers.has(crew.captainId))
        ? safeName(crew.captainId)
        : "offline";

    parts.push(
        ic("fa-solid fa-user-group", CREW_COLOR),
        bold(" " + crewName + "\n", CREW_COLOR),
        txt("Owner: ", C.INFO), bold(ownerName, CREW_COLOR),
        txt("   Online: " + members.length + "\n", C.INFO)
    );

    for (const id of members) {
        const role = getCrewRole(id) || "MEMBER";
        const captain = role === "CAPTAIN";
        parts.push(
            txt(captain ? "\u25cf " : "- ", captain ? CREW_COLOR : C.INFO),
            bold(safeName(id), captain ? CREW_COLOR : C.INFO),
            txt(captain ? "  captain\n" : "\n", C.INFO)
        );
    }

    say(playerId, parts);
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

/* Messages de prime : icone de tete + registre, comme le reste du chat. Les
   montants sont toujours en MONEY, les pseudos dans la couleur pirate. */
function bountySay(playerId, icon, color, parts) {
    say(playerId, [ic(icon, color), bold(" BOUNTY  ", color), ...parts]);
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
            bountySay(killerId, "fa-solid fa-clock-rotate-left", C.INFO, [
                txt("Already collected from ", C.INFO),
                bold(safeName(victimId), C.PIRATE),
                txt(" recently: no payout, ", C.INFO),
                bold(pairLeftMin(lastCollect, now) + " min", C.MONEY),
                txt(" left.", C.INFO),
            ]);
            return { type: "repeat", amount: 0, bounty: victimBounty };
        }
        MARINE_COLLECT[pairKey] = now;
        const payout = Math.min(victimBounty, BOUNTY_MARINE_MAX);
        setBounty(victimId, 0);
        giveMoney(killerId, payout);
        bountySay(killerId, "fa-solid fa-shield", C.MARINE, [
            txt("Collected ", C.MARINE),
            bold("+$" + nfmt(payout), C.MONEY),
            txt(" from ", C.MARINE),
            bold(safeName(victimId), C.PIRATE),
            txt(".", C.MARINE),
        ]);
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
            bountySay(killerId, "fa-solid fa-triangle-exclamation", C.INFO, [
                txt("Target too weak and already rewarded recently: no bounty, ", C.INFO),
                bold(pairLeftMin(lastWeak, now) + " min", C.MONEY),
                txt(" left.", C.INFO),
            ]);
            return { type: "weak-repeat", amount: 0, bounty: getBounty(killerId) };
        }
        const weak = Math.min(Math.floor(moneyOf(victimId) * BOUNTY_WEAK_RATE), BOUNTY_STEAL_MAX);
        if (weak <= 0) return { type: "none", amount: 0, bounty: getBounty(killerId) };
        WEAK_MINT[pairKey] = now;
        const weakBounty = addBounty(killerId, weak);
        bountySay(killerId, "fa-solid fa-triangle-exclamation", C.PIRATE, [
            txt("Target too weak: nothing stolen, bounty ", C.PIRATE),
            bold("+$" + nfmt(weak), C.MONEY),
            txt(" (total ", C.PIRATE),
            bold("$" + nfmt(weakBounty), C.MONEY),
            txt(").", C.PIRATE),
        ]);
        refreshBountyUi(killerId, victimId);
        return { type: "weak", amount: 0, bounty: weakBounty };
    }

    /* Pirate (ou sans equipe) : vol de 10 % de l'argent de la victime. */
    const stolen = Math.min(Math.floor(moneyOf(victimId) * BOUNTY_STEAL_RATE), BOUNTY_STEAL_MAX);
    if (stolen <= 0) return { type: "none", amount: 0, bounty: getBounty(killerId) };
    giveMoney(victimId, -stolen);
    giveMoney(killerId, stolen);
    const bounty = addBounty(killerId, stolen);
    bountySay(killerId, "fa-solid fa-skull", C.PIRATE, [
        txt("Stole ", C.PIRATE),
        bold("+$" + nfmt(stolen), C.MONEY),
        txt(" (total ", C.PIRATE),
        bold("$" + nfmt(bounty), C.MONEY),
        txt(").", C.PIRATE),
    ]);
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

/* Ce qu'on repond au joueur qui essaie de parler. */
export function muteRefusal(playerId) {
    const info = getMuteInfo(muteNameOf(playerId)) || { by: "an admin", remaining: "unknown" };
    return [
        ic("fa-solid fa-volume-slash", C.DANGER),
        bold(" CHAT  ", C.INFO),
        txt("You are muted for ", C.DANGER),
        bold(info.remaining, C.DANGER),
        txt(" by ", C.INFO),
        bold(info.by, C.MONEY),
        txt(". You can still play, you just cannot talk.", C.INFO),
    ];
}
