// gameplay/variations.js
//
// LOBBY + MERS (variations Bloxd)
//
// Le monde est decoupe en variations :
//   - "default" : le LOBBY (spawn, couloir de lancement, choix de team) ;
//   - "sea1"    : la mer 1 (le jeu) ; "sea2", "sea3"... viendront plus tard.
// Les noms doivent rester dans [A-Za-z0-9_-] et faire 1 a 32 caracteres.
// Chaque mer est une variation separee : les joueurs n'y voient que ceux de
// la meme mer, ce qui separe les puissances sans serveur supplementaire.
//
// DEROULEMENT
//   1. Connexion dans le lobby  -> tp au spawn du lobby.
//   2. Le joueur prend le couloir et lance le jeu :
//        - jamais joue : tp au hub "premier passage" et choix de team ;
//        - deja joue   : tp au hub "retour", avec de quoi repartir dans SA mer.
//   3. Choix de team (ou reprise) -> matchmake vers la mer + tp a la position
//      sauvegardee de cette mer (ou au spawn de la team la premiere fois).
//
// REGLES DE STOCKAGE (db par joueur = quota de caracteres, le nom du joueur
// compte dedans) : on n'ajoute que des cles tres courtes et rien d'autre.
//   vsea : numero de la mer du joueur (1, 2, ...). Absent = jamais joue.
//   vp<N> : position sauvegardee dans la mer N, compacte "x,y,z" (entiers).
//   vtp  : position d'arrivee en attente (consommee et supprimee au join).
// Aucune cle existante (money, lvl, team, xp...) n'est modifiee.

import { setInterval } from "../utils/timer";
import { C, say } from "../core/theme";
import { forgetChatChannel } from "../core/team";

/* ---------------------------------------------------------------- reglages */

export const LOBBY = {
    /* Variation du lobby (celle du jeu de base). */
    variation: "default",
    title: "Lobby",
    /* Spawn a la connexion. */
    spawn: [82.5, 40, -36.5],
    /* Hub "premier passage" (choix de team). */
    hubFirst: [10, 20, 10],
    /* Hub "deja joue" (bouton de reprise). */
    hubReturning: [166.5, 20, 12.5],
    /* Zone neutre : rayon (en blocs) autour de CHAQUE point ci-dessus ou les
       capacites et les degats sont bloques. 0 = desactive. */
    safeRadius: 100
};

/* Les mers. `teams` = position d'arrivee de chaque team dans cette mer. */
export const SEAS = {
    1: {
        id: "sea1",
        title: "Sea 1",
        teams: {
            PIRATES: [-15, -911, 28],
            NONE: [635, -900, -206],
            MARINES: [885, -906, -276]
        }
    }
    /* 2: { id: "sea2", title: "Sea 2", teams: { ... } }, */
};

/* Sauvegarde de la position dans une mer : toutes les N ticks. */
const SAVE_EVERY_TICKS = 200; /* 10 s a 20 tps */

/* ------------------------------------------------------------------- etat */

const lastSaved = {};   /* playerId -> "x,y,z" deja ecrit (evite les ecritures inutiles) */
const notice = {};     /* anti-spam des messages */
let hooks = null;

/* Injection de dependances (evite les imports circulaires avec team/UI). */
export function setVariationHooks(h) {
    hooks = h || null;
}

/* ---------------------------------------------------------------- helpers */

function num(playerId, key) {
    try {
        const v = api.getPlayerDbValue(playerId, key);
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    } catch (e) {
        return 0;
    }
}

function put(playerId, key, value) {
    try {
        api.setPlayerDbValue(playerId, key, value);
        return true;
    } catch (e) {
        return false;
    }
}

function drop(playerId, key) {
    try {
        api.deletePlayerDbValue(playerId, key);
    } catch (e) {}
}

/* Position compacte : entiers, "x,y,z" (le moins de caracteres possible). */
function packPos(pos) {
    if (!pos || pos.length < 3) return null;
    return Math.round(pos[0]) + "," + Math.round(pos[1]) + "," + Math.round(pos[2]);
}

function unpackPos(str) {
    if (typeof str !== "string") return null;
    const p = str.split(",");
    if (p.length < 3) return null;
    const x = Number(p[0]), y = Number(p[1]), z = Number(p[2]);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
    return [x, y, z];
}

function teleport(playerId, pos) {
    if (!pos) return false;
    try {
        api.setPosition(playerId, pos[0], pos[1], pos[2]);
        return true;
    } catch (e) {
        return false;
    }
}

function positionOf(playerId) {
    try {
        const p = api.getPosition(playerId);
        return p && p.length >= 3 ? p : null;
    } catch (e) {
        return null;
    }
}

function throttled(playerId, key, ms) {
    const now = Date.now();
    const full = playerId + "|" + key;
    if (notice[full] && now - notice[full] < ms) return false;
    notice[full] = now;
    return true;
}

function tell(playerId, segments, key) {
    if (key && !throttled(playerId, key, 3000)) return;
    say(playerId, segments);
}

/* -------------------------------------------------------------- variations */

/* Variation courante. Renvoie LOBBY.variation si le moteur ne fournit rien. */
export function currentVariation() {
    try {
        const v = api.getVariation();
        return typeof v === "string" && v ? v : LOBBY.variation;
    } catch (e) {
        return LOBBY.variation;
    }
}

export function isLobby() {
    return currentVariation() === LOBBY.variation;
}

/* Numero de mer -> definition. */
export function seaByNumber(n) {
    return SEAS[n] || null;
}

export function seaFromVariation(variation) {
    for (const n in SEAS) if (SEAS[n].id === variation) return SEAS[n];
    return null;
}

/* Numero (cle) de la mer d'une variation : "sea1" -> "1". */
export function seaKeyFromVariation(variation) {
    for (const n in SEAS) if (SEAS[n].id === variation) return n;
    return null;
}

/* La mer du joueur (0 = jamais joue).
   Migration douce : les joueurs d'avant les variations n'ont pas `vsea`, mais
   ils ont deja une team -> on les considere comme etant en mer 1, sans leur
   redemander de choisir. Aucune de leurs autres donnees n'est touchee. */
export function playerSea(playerId) {
    const n = num(playerId, "vsea");
    if (n > 0) return n;
    const team = teamOf(playerId);
    return team === "PIRATES" || team === "MARINES" ? 1 : 0;
}

/* Le moteur accepte-t-il les variations ? (sinon on ne fait rien du tout) */
export function variationsSupported() {
    return typeof api.getVariation === "function" && typeof api.matchmakeToVariation === "function";
}

/* Titre affiche en haut a gauche (Sea 1, Lobby...). */
function applyTitle(playerId, title) {
    try {
        api.setClientOption(playerId, "customVariationTitle", title);
    } catch (e) {}
}

function moveToVariation(playerId, variation) {
    try {
        api.matchmakeToVariation(playerId, variation);
        return true;
    } catch (e) {
        return false;
    }
}

/* --------------------------------------------------------------- zone sure */

/* Les trois points du lobby ou l'on ne peut ni se battre ni utiliser de
   capacite : le spawn, le hub de premiere selection de team, et le hub de
   reprise. Ce sont des points de passage : un joueur qui arrive ne doit pas
   pouvoir etre tue pendant qu'il choisit. */
export function safeZoneCenters() {
    return [LOBBY.spawn, LOBBY.hubFirst, LOBBY.hubReturning];
}

/* Une position est-elle dans une zone neutre du lobby ? */
export function posInSafeZone(pos) {
    if (!pos || pos.length < 3) return false;
    const radius = LOBBY.safeRadius;
    if (!(radius > 0)) return false;
    const zones = safeZoneCenters();
    for (let i = 0; i < zones.length; i++) {
        const p = zones[i];
        if (!p) continue;
        const dx = pos[0] - p[0];
        const dy = pos[1] - p[1];
        const dz = pos[2] - p[2];
        if (dx * dx + dy * dy + dz * dz <= radius * radius) return true;
    }
    return false;
}

/* Une entite (joueur ou mob) est-elle dans une zone neutre ? Ne s'applique que
   dans le lobby : les coordonnees ne veulent rien dire dans une mer. */
export function idInSafeZone(id) {
    if (!id) return false;
    if (!(LOBBY.safeRadius > 0)) return false;
    if (currentVariation() !== LOBBY.variation) return false;
    return posInSafeZone(positionOf(id));
}

/* Message (limite a un toutes les 3 s) quand une action est refusee. */
export function safeZoneBlocked(playerId) {
    tell(playerId, [
        { icon: "fa-solid fa-shield-halved", style: { color: C.MARINE } },
        { str: " Safe zone: ", style: { color: C.INFO } },
        { str: "no abilities, no damage", style: { color: C.MARINE, fontWeight: "bold" } },
        { str: " in this area.", style: { color: C.INFO } },
    ], "safeZone");
    return true;
}

/* ---------------------------------------------------------------- parcours */

/* Position d'arrivee d'une team dans une mer (ou spawn de la mer). */
function teamSpawn(sea, teamId) {
    if (!sea) return null;
    return sea.teams[teamId] || sea.teams.NONE || null;
}

/* Ecrit la position d'arrivee avant un changement de variation : elle sera
   appliquee au join (le saut de variation recharge le joueur). */
function setPending(playerId, pos) {
    const packed = packPos(pos);
    if (packed) put(playerId, "vtp", packed);
}

/* Envoie le joueur dans sa mer (creee avec la team si besoin). */
export function enterSea(playerId, seaNumber, pos) {
    const n = Number(seaNumber) || playerSea(playerId) || 1;
    const sea = seaByNumber(n);
    if (!sea) return false;
    if (!variationsSupported()) return false;
    put(playerId, "vsea", n);
    setPending(playerId, pos || unpackPos(getDb(playerId, "vp" + n)) || teamSpawn(sea, teamOf(playerId)));
    return moveToVariation(playerId, sea.id);
}

function getDb(playerId, key) {
    try {
        return api.getPlayerDbValue(playerId, key);
    } catch (e) {
        return undefined;
    }
}

/* Team du joueur, lue dans SA db (sans dependre de core/team). */
export function teamOf(playerId) {
    const t = getDb(playerId, "team");
    return typeof t === "string" && t ? t : "NONE";
}

function applyTeam(playerId, teamId) {
    let ok = false;
    try {
        if (typeof setPlayerTeam === "function") {
            setPlayerTeam(playerId, teamId);
            ok = true;
        }
    } catch (e) {}
    if (!ok) {
        ok = put(playerId, "team", teamId);
        try {
            if (savedTeamHook) savedTeamHook(playerId);
        } catch (e) {}
    }
    return ok;
}

let savedTeamHook = null;
export function setTeamAppliedHook(fn) { savedTeamHook = fn; }

/* Choix de la team dans le hub : on enregistre, puis on envoie dans la mer 1. */
export function chooseTeam(playerId, teamId) {
    const team = teamId === "PIRATES" || teamId === "MARINES" ? teamId : "NONE";
    const firstTime = playerSea(playerId) === 0;
    const n = firstTime ? 1 : playerSea(playerId);
    const sea = seaByNumber(n) || SEAS[1];
    applyTeam(playerId, team);
    put(playerId, "vsea", n);
    setPending(playerId, teamSpawn(sea, team));
    const ok = moveToVariation(playerId, sea.id);
    tell(playerId, [
        { icon: "fa-solid fa-compass", style: { color: C.MARINE } },
        { str: ok ? " Sailing to " : " Could not board ", style: { color: C.INFO } },
        { str: sea.title, style: { color: C.XP, fontWeight: "bold" } },
        { str: " as " + (team === "PIRATES" ? "Pirates" : team === "MARINES" ? "Marines" : "No Team"), style: { color: C.PIRATE } }
    ]);
    return ok;
}

/* Bouton "reprendre" du hub retour : renvoie dans SA mer, a sa position. */
export function continueJourney(playerId) {
    const n = playerSea(playerId) || 1;
    const sea = seaByNumber(n) || SEAS[1];
    setPending(playerId, unpackPos(getDb(playerId, "vp" + n)) || teamSpawn(sea, teamOf(playerId)));
    const ok = moveToVariation(playerId, sea.id);
    tell(playerId, [
        { icon: "fa-solid fa-anchor", style: { color: C.MARINE } },
        { str: ok ? " Welcome back to " : " Could not board ", style: { color: C.INFO } },
        { str: sea.title, style: { color: C.XP, fontWeight: "bold" } }
    ]);
    return ok;
}

/* Lancement depuis le couloir : premier passage ou reprise. */
export function launch(playerId) {
    const firstTime = playerSea(playerId) === 0;
    teleport(playerId, firstTime ? LOBBY.hubFirst : LOBBY.hubReturning);
    if (firstTime) {
        say(playerId, [
            { icon: "fa-solid fa-user-group", style: { color: C.MONEY } },
            { str: " Choose your side: ", style: { color: C.INFO } },
            { str: "Pirates", style: { color: C.PIRATE, fontWeight: "bold" } },
            { str: " / ", style: { color: C.INFO } },
            { str: "Marines", style: { color: C.MARINE, fontWeight: "bold" } },
            { str: " / ", style: { color: C.INFO } },
            { str: "None", style: { color: C.INFO, fontWeight: "bold" } }
        ]);
    } else {
        say(playerId, [
            { icon: "fa-solid fa-anchor", style: { color: C.MARINE } },
            { str: " Continue your journey in ", style: { color: C.INFO } },
            { str: (seaByNumber(playerSea(playerId)) || SEAS[1]).title, style: { color: C.XP, fontWeight: "bold" } }
        ]);
    }
    return true;
}

/* --------------------------------------------------------------- cycle vie */

/* A appeler au join (toutes variations). */
export function variationJoin(playerId) {
    if (!playerId || !variationsSupported()) return false;
    const variation = currentVariation();
    if (variation === LOBBY.variation) {
        applyTitle(playerId, LOBBY.title);
        teleport(playerId, LOBBY.spawn);
        return true;
    }

    const sea = seaFromVariation(variation);
    const title = sea ? sea.title : variation;
    applyTitle(playerId, title);
    if (!sea) return true;

    const key = seaKeyFromVariation(variation) || "1";
    const pending = unpackPos(getDb(playerId, "vtp"));
    if (pending) {
        drop(playerId, "vtp");
        teleport(playerId, pending);
    } else {
        const saved = unpackPos(getDb(playerId, "vp" + key));
        teleport(playerId, saved || teamSpawn(sea, teamOf(playerId)));
    }
    return true;
}

/* Sauvegarde la position du joueur s'il est dans une mer. */
export function savePosition(playerId) {
    if (!playerId || !variationsSupported()) return false;
    const variation = currentVariation();
    if (variation === LOBBY.variation) return false;
    const sea = seaFromVariation(variation);
    if (!sea) return false;
    const key = seaKeyFromVariation(variation) || "1";
    const packed = packPos(positionOf(playerId));
    if (!packed || lastSaved[playerId] === packed) return false;
    lastSaved[playerId] = packed;
    return put(playerId, "vp" + key, packed);
}

/* A appeler en quittant : derniere sauvegarde puis oubli de l'etat memoire. */
export function variationLeave(playerId) {
    try {
        savePosition(playerId);
    } catch (e) {}
    delete lastSaved[playerId];
    for (const key in notice) if (key.indexOf(playerId + "|") === 0) delete notice[key];
    /* Meme raison pour le dernier canal de chat memorise (core/team.js). */
    try {
        forgetChatChannel(playerId);
    } catch (e) {}
}

/* Sauvegarde periodique de tous les joueurs de la variation. */
function saveAll() {
    if (!variationsSupported()) return;
    if (currentVariation() === LOBBY.variation) return;
    let ids = [];
    try {
        ids = api.getPlayerIds() || [];
    } catch (e) {
        return;
    }
    for (let i = 0; i < ids.length; i++) {
        try {
            savePosition(ids[i]);
        } catch (e) {}
    }
}

let loopStarted = false;

/* Branche la sauvegarde periodique (appelee une fois au demarrage). */
export function startVariationLoop() {
    if (loopStarted) return;
    loopStarted = true;
    setInterval(saveAll, SAVE_EVERY_TICKS);
}

/* ------------------------------------------------------------ api publique
   A appeler depuis tes Code Blocks (globalThis.BPSea). Aucun bloc ni pad
   n'est necessaire : c'est TOI qui decides quand appeler quoi.

     BPSea.launch(playerId)                  -> hub + message (1er passage ou retour)
     BPSea.chooseTeam(playerId, "PIRATES")   -> team + mer 1, au spawn de la team
     BPSea.continueJourney(playerId)         -> retour dans SA mer, a sa position
     BPSea.enterSea(playerId, 2)             -> envoie dans la mer 2 (si declaree)
     BPSea.savePosition(playerId)            -> force une sauvegarde
     BPSea.playerSea(playerId)               -> numero de mer (0 = jamais joue)
     BPSea.currentVariation()                -> "default" / "sea1" ...

   Exemple de Code Block (bouton du couloir) :
     BPSea.launch(playerId);  // ou BPSea.chooseTeam(playerId, "MARINES") */
export const BPSea = {
    launch,
    chooseTeam,
    continueJourney,
    enterSea,
    savePosition,
    playerSea,
    currentVariation,
    isLobby,
    inSafeZone: idInSafeZone,
    config: { LOBBY, SEAS }
};

try {
    globalThis.BPSea = BPSea;
} catch (e) {}
