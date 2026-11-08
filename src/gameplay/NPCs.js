// NPCs.js
import { buyArmamentHaki, startGarpBoss } from "../utils/haki"
import { startQuest } from "./quest";
import { buyItem, changeMoney, confirmAction, CONFIRM_MS } from "../utils/data";
import { setInterval, setTimeout } from "../utils/timer";
import { getPlayerTeam, getTeamData } from "../core/team";
import { C, say, txt, bold, ic } from "../core/theme";
import { rollFruit } from "../fruit/index";
import { markAggro } from "../fruit/func-abilities";
import { applyNameTag, safeEntityName, safeEntityType } from "../utils/lifeform";
import { buyFightingStyle } from "./fightingStyles";
import { saberOldMan, saberRichMan, saberShanks } from "./saber";
import { clearItem, scanAllItems } from "./customItem";
/* ══════════════════════════════════════════════════════════════════════════
   RECRUTEURS DE TEAM

   Un PNJ par camp, place dans le monde avec le nom ci-dessous (comme les
   autres marchands : "Fruit Dealer", "Haki Seller"...). Au clic, il annonce
   la team dans laquelle il va te basculer ; au second clic (meme fenetre que
   tous les autres achats, voir utils/data), le changement est applique.
   ══════════════════════════════════════════════════════════════════════════ */

export const TEAM_RECRUITERS = {
    "Pirate Recruiter": "PIRATES",
    "Marine Recruiter": "MARINES",
};

function teamLabel(teamId) {
    const data = getTeamData(teamId);
    return data && data.name ? data.name : teamId === "PIRATES" ? "Pirates" : "Marines";
}

function teamColor(teamId) {
    const data = getTeamData(teamId);
    return (data && data.color) || (teamId === "PIRATES" ? "#E63946" : "#7DD3FC");
}

/* Applique la team. setPlayerTeam (core/team) fait le vrai travail : db,
   nametag, canaux de chat, sidebar et conversion des armes. Le repli en db
   n'existe que si la fonction n'a pas ete posee. */
function applyTeamChoice(playerId, teamId) {
    try {
        if (typeof setPlayerTeam === "function") {
            setPlayerTeam(playerId, teamId);
            return true;
        }
    } catch (e) {}
    try {
        api.setPlayerDbValue(playerId, "team", teamId);
        return true;
    } catch (e) {
        return false;
    }
}

function handleTeamRecruiter(playerId, npcName, teamId) {
    const current = getPlayerTeam(playerId);
    const target = teamLabel(teamId);
    const color = teamColor(teamId);

    if (current === teamId) {
        say(playerId, [
            ic("fa-solid fa-circle-info", color),
            bold(" TEAM  ", color),
            txt("You are already a ", C.INFO),
            bold(target.replace(/s$/, ""), color),
            txt(".", C.INFO),
        ]);
        return;
    }

    /* Premier clic : on dit exactement ce qui va se passer. */
    /* Le PNJ ne parle plus de lui a la troisieme personne : le message dit
       ce que le JOUEUR obtient, et la confirmation ajoute elle-meme la phrase
       « clique encore dans 3 s ». */
    if (!confirmAction(playerId, "team|" + teamId, [
        ic("fa-solid fa-flag", color),
        bold(" TEAM  ", color),
        txt("Join the ", C.INFO),
        bold(target, color),
        txt("? You are ", C.INFO),
        txt(current === "NONE" ? "in no team" : "a " + teamLabel(current).replace(/s$/, ""), C.INFO),
        txt(", and your weapons become " + target + " weapons.", C.INFO),
    ])) return;

    if (!applyTeamChoice(playerId, teamId)) {
        say(playerId, [
            ic("fa-solid fa-xmark", C.DANGER),
            bold(" TEAM  ", color),
            txt("The team change failed. Try again.", C.DANGER),
        ]);
        return;
    }

    try { api.playSound(playerId, "exp_levelup", 1, 1.1); } catch (e) {}
    say(playerId, [
        ic("fa-solid fa-flag", color),
        bold(" TEAM  ", color),
        txt("You are now a ", C.INFO),
        bold(target.replace(/s$/, ""), color),
        txt(".", C.INFO),
    ]);
}

/* ══════════════════════════════════════════════════════════════════════════
   RACHAT DES HAKI FRAGMENTS

   Garp lache un "Haki fragment" : c'est un Black Carpet (voir dropHaki dans
   utils/boss.js). Le Haki Seller demande ce MEME item pour apprendre le
   haki, et c'est voulu : un joueur qui refarme le boss gagne de l'argent au
   lieu de stocker un item qui ne lui sert plus une fois le haki appris. Le
   PNJ rachete donc les Black Carpets, quel que soit leur nom affiche, au
   prix TIRE AU HASARD entre 100 et 300 Coins chacun.

   LE JOUEUR EST PREVENU : la confirmation rappelle que le lot comprend les
   Black Carpets gardes pour le Haki Seller. Rien n'est vendu sans le second
   clic, et le total est annonce avant.

   Le prix est tire UNE fois par offre : la cle de confirmation est fixe,
   donc le second clic (dans les 3 s) retrouve exactement le prix annonce
   au premier. Sans ce cache, le prix serait retire a chaque clic et la
   confirmation ne tomberait jamais juste.
   ══════════════════════════════════════════════════════════════════════════ */

const FRAGMENT_ITEM = "Black Carpet";
const HAKI_DEAL = {}; /* playerId -> { price, until } */

/* Slots (inventaire + Moonstone Chest) qui contiennent des fragments. */
function fragmentSpots(playerId) {
    const spots = [];
    scanAllItems(playerId, function (item, where, slot) {
        if (!item || item.name !== FRAGMENT_ITEM) return;
        const n = typeof item.amount === "number" && item.amount > 0 ? item.amount : 1;
        spots.push({ where: where, slot: slot, n: n });
    });
    return spots;
}

function sellHakiFragments(playerId) {
    const spots = fragmentSpots(playerId);
    let total = 0;
    for (let i = 0; i < spots.length; i++) total += spots[i].n;

    if (!total) {
        say(playerId, [
            ic("fa-solid fa-coins", C.MONEY),
            bold(" HAKI  ", C.MONEY),
            txt("Bring me Haki Fragments and I will pay well for them.", C.INFO),
        ]);
        return;
    }

    const now = Date.now();
    const pending = HAKI_DEAL[playerId];
    const price = pending && pending.until > now
        ? pending.price
        : 100 + Math.floor(Math.random() * 201); /* 100 a 300 inclus */

    if (!confirmAction(playerId, "hakiFragments", [
        ic("fa-solid fa-coins", C.MONEY),
        txt(" Sell ", C.INFO),
        bold(total + " Haki Fragment" + (total > 1 ? "s" : ""), "#E8B4A0"),
        txt(" for ", C.INFO),
        bold(price + " Coins each", C.MONEY),
        txt(" (" + total * price + " Coins total)?", C.INFO),
        txt("\nEvery Haki Fragment in your bag is sold, wherever you keep it.", C.INFO),
    ])) {
        HAKI_DEAL[playerId] = { price: price, until: now + CONFIRM_MS };
        return;
    }

    delete HAKI_DEAL[playerId];

    /* On recompte : entre les deux clics, l'inventaire a pu changer (mort,
       coffre, autre achat). On ne paie que ce qu'on retire vraiment. */
    const again = fragmentSpots(playerId);
    let sold = 0;
    for (let i = 0; i < again.length; i++) {
        if (clearItem(playerId, again[i].where, again[i].slot)) sold += again[i].n;
    }
    if (!sold) {
        say(playerId, [
            ic("fa-solid fa-xmark", C.DANGER),
            txt(" Nothing left to sell.", C.DANGER),
        ]);
        return;
    }

    changeMoney(playerId, sold * price, false);
    try { api.playSound(playerId, "coin", 1, 1); } catch (e) {}
    say(playerId, [
        ic("fa-solid fa-coins", C.MONEY),
        txt(" Sold ", C.INFO),
        bold(sold + " Haki Fragment" + (sold > 1 ? "s" : ""), "#E8B4A0"),
        txt(" for ", C.INFO),
        bold(sold * price + " Coins", C.MONEY),
        txt(".", C.INFO),
    ]);
}

/* ══════════════════════════════════════════════════════════════════════════
   PNJ QUI LANCE GARP

   Garp n'avait AUCUN point d'entree en jeu : le combat ne partait que d'un
   Code Block appele `startBoss(playerId)` (portail). Ce PNJ fait la meme
   chose, avec la confirmation commune a tous les achats :

     clic 1 -> ce qui va se passer (arene, gardes, ce qu'il lache)
     clic 2 (3 s) -> startGarpBoss(), le chemin unique de utils/haki.js

   Les deux clics ne coutent rien : ce n'est pas un achat mais une mise en
   garde, parce qu'on ne teleporte pas quelqu'un dans une arene de boss sur un
   clic malheureux. Le refus "quelqu'un se bat deja" vient du combat lui-meme.
   ══════════════════════════════════════════════════════════════════════════ */

function startGarpFight(playerId) {
    if (!confirmAction(playerId, "garpBoss", [
        ic("fa-solid fa-skull", C.DANGER),
        txt(" Fight ", C.INFO),
        bold("GARP", "#7EC8FF"),
        txt(", the Marine Protector? ", C.INFO),
        txt(" You will be teleported into his arena and his guards will wake up.", C.INFO),
        txt("\nHe drops a Haki Fragment, which the Haki Buyer will take off your hands.", C.INFO),
    ])) return;

    /* Pas de message ici en cas d'echec : le combat parle lui-meme
       ("A player is already fighting the boss.", ou "You can't awaken GARP.").
       Deux messages pour le meme refus, c'est du bruit. */
    startGarpBoss(playerId);
}

export function attackNPC(playerId, mobId) {

    const name = safeEntityName(mobId);
    if (!name) return "preventDamage";
    const team = getPlayerTeam(playerId)

    const recruiterTeam = TEAM_RECRUITERS[name];
    if (recruiterTeam) {
        handleTeamRecruiter(playerId, name, recruiterTeam);
        /* meme valeur de retour que tous les autres PNJ : on ne frappe pas. */
        return "preventDamage";
    }

    if (name === "Quest Dealer") {
        startQuest(playerId);
    }

    /* SABER QUEST (gameplay/saber) : trois PNJ, trois etapes.
       Old Man ne parle d'eau qu'une fois la Cup remplie ; Rich Man donne
       l'objectif puis paie ; Shanks ouvre le duel du Saber Expert. */
    else if (name === "Old Man") {
        saberOldMan(playerId);
    }
    else if (name === "Rich Man") {
        saberRichMan(playerId);
    }
    else if (name === "Shanks") {
        saberShanks(playerId);
    }
    /* Boss Garp : le PNJ remplace le portail (meme confirmation que les
       marchands, meme arene que le Code Block startBoss). */
    else if (name === "Garp Summoner" || name === "Garp Starter") {
        startGarpFight(playerId);
    }

    else if (name === "Fruit Dealer") {
        rollFruit(playerId, 1);
    }
    else if (name == "Marine Fruit Dealer") {
        rollFruit(playerId, 1.25);
    } else if (name === "Haki Seller") {
        buyArmamentHaki(playerId);
    } else if (name === "Haki Buyer" || name === "Haki Fragment Buyer") {
        sellHakiFragments(playerId);
    } else if (name === "Combat Teacher") {
        buyFightingStyle(playerId, "Combat");
    } else if (name === "Dark Step Teacher") {
        buyFightingStyle(playerId, "Dark Step");
    } else if (name === "Mad Scientist") {
        buyFightingStyle(playerId, "Electric");
    } else if (name === "Water Kung-Fu Teacher") {
        buyFightingStyle(playerId, "Water Kung-Fu");
    }

    else if (name === "Apple Seller") {
        buyItem(playerId, "Apple", 75, 3 )
    }
    else if (name === "Coconut Seller") {
        /* Cracked Coconut : la noix craquee donne l'effet Speed (voir la liste
           des effets natifs). Meme prix que les autres fruits de soin. */
        buyItem(playerId, "Cracked Coconut", 200, 3 )
    }
    else if (name === "Steak Seller") {
        buyItem(playerId, "Steak", 180, 3 )
    }
    else if (name === "Cornbread Seller") {
        buyItem(playerId, "Cornbread", 140, 3 )
    }
    else if (name === "Corn Seller") {
        buyItem(playerId, "Corn", 80, 3 )
    }
    else if (name === "Bread Seller") {
        buyItem(playerId, "Bread", 110, 3 )
    }
    else if (name === "Chili Seller") {
        buyItem(playerId, "Chili Pepper", 120, 2 )
    }
    else if (name === "Mango Seller") {
        buyItem(playerId, "Mango", 120, 3 )
    }
    else if (name === "Venison Seller") {
        buyItem(playerId, "Cooked Venison", 180, 3 )
    }
    else if (name === "Pork Seller") {
        buyItem(playerId, "Cooked Porkchop", 180, 3 )
    }
    else if (name === "Mutton Seller") {
        buyItem(playerId, "Cooked Mutton", 180, 3 )
    }

    else if (name === "Boat Dealer") {
        buyItem(playerId, "Boat", 500, 1)
    }
    else if (name === "Advanced Boat Dealer") {
         buyItem(playerId, "Obsidian Boat", 1000, 1)
    }
    else if (name === "Luxury Boat Dealer") {
         buyItem(playerId, "Speedboat", 5000, 1)
    }
        
    else if (name === "Sand Weapon Dealer") {
         buyItem(playerId, "Stone Dagger", 230, 1)
    }
        
    else if (name === "First Weapon Dealer") {
        if (team === "PIRATES") {
            buyItem(playerId, "Wood Sword", 60, 1)
        }
        else if(team === "MARINES") {
            buyItem(playerId, "Wood Spear", 60, 1)
        }
        else {
            buyItem(playerId, "Wood Sword", 30, 1)
        }
    }
    else if (name === "Weapon Dealer T2") {
        if (team === "PIRATES") {
            buyItem(playerId, "Stone Sword", 230, 1)
        }
        else if(team === "MARINES") {
            buyItem(playerId, "M1911", 260, 1)
        }
        else {
            buyItem(playerId, "Stone Spear", 200, 1)
        }
    }

    if (safeEntityType(mobId) === "NPC") return "preventDamage"
    markAggro(mobId, playerId);
}

/* NPC SPAWNER (ex-questNPC, renommé spawnNPC) */

const NPC_REGISTRY = new Map();
const NPC_IDS = new Set();

const NPC_MAINTAIN_MIN_MS = 8000;
const NPC_MAINTAIN_MAX_MS = 15000;
const NPC_NEAR_DIST = 100;
const NPC_SWEEP_BATCH = 6;
const NPC_SWEEP_EVERY_TICKS = 40;

let sweeperTimer = null;
let sweepCursor = 0;

function npcKey(pos, name) {
    return name + "|" + Math.round(pos[0]) + "," + Math.round(pos[1]) + "," + Math.round(pos[2]);
}

function anchorNPCPos(id, pos) {
    if (!id || !pos) return;
    const tx = pos[0] + 0.5, ty = pos[1] + 1, tz = pos[2] + 0.5;
    try {
        const p = api.getPosition(id);
        if (p && (Math.abs(p[0] - tx) > 0.12 || Math.abs(p[1] - ty) > 0.5 || Math.abs(p[2] - tz) > 0.12)) {
            api.setPosition(id, tx, ty, tz);
            api.setVelocity(id, 0, 0, 0);
        }
    } catch (e) {}
}

function findNPCNear(pos, name, radius) {
    radius = radius || 16;
    let around = [];
    try {
        around = api.getEntitiesInRect(
            [pos[0] - radius, pos[1] - 6, pos[2] - radius],
            [pos[0] + radius, pos[1] + 6, pos[2] + radius]
        ) || [];
    } catch (e) { return null }
    for (let i = 0; i < around.length; i++) {
        const id = around[i];
        try {
            if (api.getEntityType(id) === "NPC" && api.getEntityName(id) === name) return id;
        } catch (e2) {}
    }
    return null;
}

function nearestPlayer(pos) {
    let best = null, bestDist = Infinity;
    let ids = [];
    try { ids = api.getPlayerIds() || [] } catch (e) { return null }
    for (let i = 0; i < ids.length; i++) {
        let p = null;
        try { p = api.getPosition(ids[i]) } catch (e2) { p = null }
        if (!p) continue;
        const d = Math.abs(p[0] - pos[0]) + Math.abs(p[1] - pos[1]) + Math.abs(p[2] - pos[2]);
        if (d < bestDist) { bestDist = d; best = ids[i]; }
    }
    return { id: best, dist: bestDist };
}

function dressUpNPC(NPC, name) {
    /* Nom du PNJ en `content` : sans lui, un mob sans nom garde son nom
       d'item (« Draugr Zombie »). Le sous-titre ne sert qu'a l'invite. */
    applyNameTag(NPC, {
        content: [bold(String(name || "NPC"), C.INFO)],
        subtitle: [bold("Click on the NPC!", C.INFO)],
        healthbar: { display: "never" },
        border: { colour: "#666666", applyTo: "nametag", style: "solid" },
    });
}

function ensureNPC(entry, playerId, force) {
    if (entry.id) anchorNPCPos(entry.id, entry.pos);
    const now = Date.now();
    if (!force && now < entry.nextCheck) return entry.id || null;
    entry.nextCheck = now + NPC_MAINTAIN_MIN_MS + Math.floor(Math.random() * (NPC_MAINTAIN_MAX_MS - NPC_MAINTAIN_MIN_MS));

    const existing = findNPCNear(entry.pos, entry.name);
    if (existing) {
        if (entry.id && entry.id !== existing) NPC_IDS.delete(entry.id);
        entry.id = existing;
        NPC_IDS.add(existing);
        anchorNPCPos(existing, entry.pos);
        return existing;
    }
    entry.id = null;

    const near = nearestPlayer(entry.pos);
    if (!near.id || near.dist > NPC_NEAR_DIST) return null;

    const NPC = api.attemptSpawnMob("NPC", entry.pos[0] + 0.5, entry.pos[1] + 1, entry.pos[2] + 0.5, {
        name: entry.name,
        physicsOpts: {
            collidesEntities: false
        },
        playSoundOnSpawn: false,
    });
    if (!NPC) return null;
    
    entry.id = NPC;
    NPC_IDS.add(NPC);
    dressUpNPC(NPC, entry.name);
    api.setTargetedPlayerSettingForEveryone(NPC, "interactable", true);
    api.setTargetedPlayerSettingForEveryone(NPC, "interactionPrompt", "Click to Interact");

    const watcher = playerId || near.id;
    try { api.setMobAiState(NPC, "watching", { targetId: watcher }) } catch (e) {}
    setTimeout(() => {
        try { api.setMobAiState(NPC, "disabled", null) } catch (e2) {}
    }, 5);

    return NPC;
}

function startNPCSweeper() {
    if (sweeperTimer) return;
    sweeperTimer = setInterval(function () {
        if (NPC_REGISTRY.size === 0) return;
        const entries = Array.from(NPC_REGISTRY.values());
        const now = Date.now();
        for (let j = 0; j < entries.length; j++) {
            if (entries[j].id) anchorNPCPos(entries[j].id, entries[j].pos);
        }
        const batch = Math.min(entries.length, NPC_SWEEP_BATCH);
        for (let i = 0; i < batch; i++) {
            const entry = entries[sweepCursor % entries.length];
            sweepCursor++;
            if (now < entry.nextCheck) continue;
            try { ensureNPC(entry, null) } catch (e) {}
        }
    }, NPC_SWEEP_EVERY_TICKS);
}

spawnNPC = (pos, name, playerId) => {
    if (!pos || !name) return null;

    const key = npcKey(pos, name);
    let entry = NPC_REGISTRY.get(key);
    if (!entry) {
        entry = { key: key, pos: [pos[0], pos[1], pos[2]], name: name, id: null, nextCheck: 0 };
        NPC_REGISTRY.set(key, entry);
    }

    startNPCSweeper();
    return ensureNPC(entry, playerId);
}

export const questNPC = spawnNPC;

export function forgetNPC(mobId) {
    NPC_IDS.delete(mobId);
    for (const entry of NPC_REGISTRY.values()) {
        if (entry.id === mobId) entry.id = null;
    }
}

export function isProtectedNPC(mobId) {
    if (NPC_IDS.has(mobId)) return true;

    try {
        if (api.getEntityType(mobId) !== "NPC") return false;
        const name = api.getEntityName(mobId);
        if (!name) return false;
        for (const entry of NPC_REGISTRY.values()) {
            if (entry.name === name) return true;
        }
    } catch (e) {}
    return false;
}
