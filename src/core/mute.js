// core/mute.js
//
// MUTE — « tais-toi », et rien d'autre.
//
// Un mute n'empeche QUE de parler : le joueur peut toujours se deplacer, se
// battre, commercer, utiliser ses fruits, jouer normalement. Rien n'est
// supprime et il n'est pas deconnecte, contrairement a un kick ou a un ban.
//
// STOCKAGE (que des cles nouvelles, aucune donnee existante touchee)
//   db JOUEUR  "mt"     = "Par|fin"      -> source de verite, suit le joueur
//                                          d'une variation a l'autre (lobby,
//                                          sea1, ...). 2 caracteres de cle.
//   db LOBBY   "admin_muteList" = "Nom1,Nom2"
//   db LOBBY   "admin_mute_<nom>" = "Par|fin"
//                                      -> comme la ban list : liste consultable
//                                          meme quand le joueur est hors ligne.
//
// `fin` = 0 : mute permanent. Sinon date de fin en ms : le mute s'efface tout
// seul, c'est ce qui le rend plus gentil qu'un ban.

/* Durees proposees dans le panneau admin (ms ; 0 = permanent). */
export const MUTE_DURATIONS = {
    "Permanent (until unmuted)": 0,
    "10 minutes": 10 * 60000,
    "1 hour": 60 * 60000,
    "1 day": 24 * 60 * 60000,
};
export const MUTE_DURATION_OPTIONS = Object.keys(MUTE_DURATIONS);

const LIST_KEY = "admin_muteList";
const INFO_PREFIX = "admin_mute_";
const PLAYER_KEY = "mt";

/* ------------------------------------------------------------- stockage */

function lobbyGet(key) {
    try {
        const v = api.getLobbyDbValue(key);
        return v == null ? null : String(v);
    } catch (e) {
        return null;
    }
}

function lobbySet(key, value) {
    try {
        api.setLobbyDbValue(key, value);
        return true;
    } catch (e) {
        return false;
    }
}

function lobbyDel(key) {
    try {
        api.deleteLobbyDbValue(key);
    } catch (e) {}
}

function playerGet(playerId, key) {
    try {
        const v = api.getPlayerDbValue(playerId, key);
        return v == null ? null : String(v);
    } catch (e) {
        return null;
    }
}

function playerSet(playerId, key, value) {
    try {
        api.setPlayerDbValue(playerId, key, value);
        return true;
    } catch (e) {
        return false;
    }
}

function playerDel(playerId, key) {
    try {
        api.deletePlayerDbValue(playerId, key);
    } catch (e) {}
}

function nameOf(playerId) {
    try {
        return api.getEntityName(playerId) || "";
    } catch (e) {
        return "";
    }
}

/* --------------------------------------------------------------- lecture */

/* "Par|fin" -> { by, until }. Null si la valeur est inutilisable. */
function parse(raw) {
    if (!raw) return null;
    const parts = String(raw).split("|");
    const by = (parts[0] || "Admin").trim() || "Admin";
    const until = Number(parts[1]) || 0;
    return { by, until };
}

/* Le mute a-t-il expire ? */
function expired(info) {
    return !!info && info.until > 0 && Date.now() >= info.until;
}

export function getMuteList() {
    const raw = lobbyGet(LIST_KEY);
    if (!raw) return [];
    return raw.split(",").filter(function (n) {
        return n.length > 0;
    });
}

function saveMuteList(list) {
    return lobbySet(LIST_KEY, list.join(","));
}

export function isMutedName(name) {
    if (!name) return false;
    const info = parse(lobbyGet(INFO_PREFIX + name));
    if (info) {
        if (expired(info)) {
            /* Menage paresseux : le mute s'efface tout seul. */
            unmuteName(name, true);
            return false;
        }
        return true;
    }
    return getMuteList().indexOf(name) !== -1;
}

/* Un joueur est-il muet ? (db joueur d'abord, liste du lobby en secours) */
export function isMuted(playerId) {
    if (!playerId) return false;
    const raw = playerGet(playerId, PLAYER_KEY);
    if (raw) {
        const info = parse(raw);
        if (info && !expired(info)) return true;
        /* Expire : on nettoie sa propre db au passage. */
        playerDel(playerId, PLAYER_KEY);
    }
    return isMutedName(nameOf(playerId));
}

/* Infos affichables : { by, until, remaining } ou null. */
export function getMuteInfo(name) {
    const info = parse(lobbyGet(INFO_PREFIX + name)) || parse(rawForName(name));
    if (!info) return null;
    if (expired(info)) return null;
    return { by: info.by, until: info.until, remaining: remainingText(info.until) };
}

/* Repli quand un joueur est en ligne : sa db joueur porte le mute. */
function rawForName(name) {
    const all = onlineIds();
    for (let i = 0; i < all.length; i++) {
        if (nameOf(all[i]) === name) return playerGet(all[i], PLAYER_KEY);
    }
    return null;
}

function onlineIds() {
    try {
        return api.getPlayerIds() || [];
    } catch (e) {
        return [];
    }
}

function idOfName(name) {
    if (!name) return null;
    try {
        const id = api.getPlayerId(name);
        if (id) return id;
    } catch (e) {}
    const all = onlineIds();
    for (let i = 0; i < all.length; i++) if (nameOf(all[i]) === name) return all[i];
    return null;
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

/* -------------------------------------------------------------- ecriture */

/* Mute par nom (le joueur peut etre hors ligne). */
export function muteName(name, byName, durationMs) {
    if (!name) return false;
    const until = durationMs > 0 ? Date.now() + durationMs : 0;
    const info = String(byName || "Admin") + "|" + until;

    lobbySet(INFO_PREFIX + name, info);
    const list = getMuteList();
    if (list.indexOf(name) === -1) {
        list.push(name);
        saveMuteList(list);
    }

    /* Le joueur en ligne recoit aussi le drapeau dans sa db (suit le joueur
       d'une variation a l'autre, contrairement a la db du lobby). */
    const id = idOfName(name);
    if (id) playerSet(id, PLAYER_KEY, info);
    return true;
}

/* Mute du joueur cible (panneau admin). */
export function mutePlayer(playerId, byName, durationMs) {
    const name = nameOf(playerId);
    if (!name) return false;
    if (!muteName(name, byName, durationMs)) return false;
    playerSet(playerId, PLAYER_KEY, String(byName || "Admin") + "|" + (durationMs > 0 ? Date.now() + durationMs : 0));
    return true;
}

/* Retire le mute (silencieux = pas de message de succes). */
export function unmuteName(name, silent) {
    if (!name) return false;
    const wasThere = getMuteList().indexOf(name) !== -1 || lobbyGet(INFO_PREFIX + name) != null;
    saveMuteList(getMuteList().filter(function (n) {
        return n !== name;
    }));
    lobbyDel(INFO_PREFIX + name);
    const id = idOfName(name);
    if (id) playerDel(id, PLAYER_KEY);
    return !silent ? wasThere : false;
}

export function unmutePlayer(playerId) {
    return unmuteName(nameOf(playerId));
}

/* ------------------------------------------------------------- messages */

/* Ce qu'on repond au joueur qui essaie de parler. */
export function muteRefusal(playerId) {
    const name = nameOf(playerId);
    const info = getMuteInfo(name) || { by: "an admin", remaining: "unknown" };
    return [
        { icon: "fa-solid fa-microphone-slash", style: { color: "#EF4444" } },
        { str: " You are muted", style: { color: "#EF4444", fontWeight: "bold" } },
        { str: " (" + info.remaining + ") by ", style: { color: "#CBD5E1" } },
        { str: info.by, style: { color: "#FFD700", fontWeight: "bold" } },
        { str: " — you can play, but not talk.", style: { color: "#CBD5E1" } },
    ];
}
