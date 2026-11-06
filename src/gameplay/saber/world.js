// gameplay/saber/world.js
/* world.js — ce que le joueur touche : structures, clics, et les trois PNJ

   La porte de la jungle et le rideau du desert s'ouvrent pour de vrai
   (api.setBlock) et se referment quand plus personne n'est a 15 blocs : un
   monde nettoye ne peut donc pas enfermer quelqu'un derriere un mur.
   
   Ici aussi : les cinq boutons, le point d'eau, le mur scelle, et les trois
   PNJ (Old Man, Rich Man, Shanks).
 */

import { C } from "../../core/theme";
import { TEX, boom, point, rgba, at as soundAt } from "../../utils/fx";
import { setInterval as every, nowMs } from "../../utils/timer";
import { getAlivePlayerIds, safePosition } from "../../utils/lifeform";
import { writeItem } from "../customItem";
import { BUTTONS, CUP_FULL, CUP_FULL_ATTRS, ITEM_CUP, ITEM_CUP_FULL, ITEM_GOLD, ITEM_RELIC, ITEM_TORCH, S, STRUCTS, WALL_BEHIND, WALL_MAX, WALL_MIN, WATER_POINT } from "./config";
import { armSecretArrow, armStructArrow, clearSecretArrow, clearStructArrow } from "./arrows";
import { blockAt, countOf, dist3, hasItem, heldItemName, hitBlock, inClickBox, line, slotsOf, speech, tell } from "./kit";
import { buttonsOf, saveButtons, setStep, stepOf } from "./state";
import { startSaberFight } from "./expert";


/* ── 4. STRUCTURES OUVERTES / REFERMEES ────────────────────────────────── */

/* ORDRE DES ARGUMENTS : api.setBlock(x, y, z, nom) et
   api.setBlockRect(pos1, pos2, nom). L'ancien code appelait
   api.setBlock(0, x, y, z) : il posait un bloc a l'origine du monde et la
   porte ne s'ouvrait donc JAMAIS physiquement. On passe maintenant par le
   rectangle, exactement comme dans le monde. */
function rectBlocks(a, b, name) {
    try {
        api.setBlockRect([a[0], a[1], a[2]], [b[0], b[1], b[2]], name);
        return true;
    } catch (e) {}
    /* repli bloc par bloc si setBlockRect n'existe pas dans ce moteur */
    let ok = false;
    const x1 = Math.min(a[0], b[0]), x2 = Math.max(a[0], b[0]);
    const y1 = Math.min(a[1], b[1]), y2 = Math.max(a[1], b[1]);
    const z1 = Math.min(a[2], b[2]), z2 = Math.max(a[2], b[2]);
    for (let x = x1; x <= x2; x++) {
        for (let y = y1; y <= y2; y++) {
            for (let z = z1; z <= z2; z++) {
                try { api.setBlock(x, y, z, name); ok = true; } catch (err) {}
            }
        }
    }
    return ok;
}


/* Ce qu'il y a dans le rectangle avant de le percer. */
function readRect(a, b) {
    const out = [];
    const x1 = Math.min(a[0], b[0]), x2 = Math.max(a[0], b[0]);
    const y1 = Math.min(a[1], b[1]), y2 = Math.max(a[1], b[1]);
    const z1 = Math.min(a[2], b[2]), z2 = Math.max(a[2], b[2]);
    for (let x = x1; x <= x2; x++) {
        for (let y = y1; y <= y2; y++) {
            for (let z = z1; z <= z2; z++) {
                out.push([x, y, z, blockAt(x, y, z)]);
            }
        }
    }
    return out;
}


function openStruct(key) {
    const s = STRUCTS[key];
    if (!s || s.saved) return false;
    startHousekeeping();
    /* On note l'existant, puis on perce le rectangle d'un coup. */
    s.saved = readRect(s.a, s.b);
    if (!rectBlocks(s.a, s.b, "Air")) { s.saved = null; return false; }
    s.openedAt = nowMs();
    return true;
}


export function closeStruct(key) {
    const s = STRUCTS[key];
    if (!s || !s.saved) return false;
    /* On remet la matiere declaree (Stone / Purple Ceramic). Si le rectangle
       est refuse, on remet bloc par bloc ce qu'on avait note. */
    let ok = rectBlocks(s.a, s.b, s.material);
    if (!ok) {
        for (let i = 0; i < s.saved.length; i++) {
            const e = s.saved[i];
            if (!e[3] || e[3] === "Air") continue;
            try { api.setBlock(e[0], e[1], e[2], e[3]); ok = true; } catch (err) {}
        }
    }
    s.saved = null;
    return ok;
}


const KEEP_RADIUS = 15;

/* ATTENTION : les minuteries de utils/timer comptent en TICKS (1 tick = 50 ms),
   pas en millisecondes. 220 ticks = 11 s. */
const HOUSEKEEP_TICKS = 220;

export let houseTimer = null;


/* DELAI DE GRACE : une fois ouverte, une ouverture reste ouverte au moins ce
   temps-la, meme si le joueur qui l'a declenchee s'eloigne. Sans ca, la porte
   se refermait pendant qu'il cherchait ce qui venait de s'ouvrir (les 5
   boutons sont disperses dans la jungle, on ne voit pas la porte depuis le
   dernier). 60 s : largement le temps de traverser une zone. */
const GRACE_MS = 60000;


/* Verification periodique : on remet les blocs quand il n'y a plus personne
   autour ET que le delai de grace est passe, et on les retire de nouveau pour
   un joueur qui a deja valide l'etape et qui revient. Le monde reste donc
   dans son etat d'origine, sans jamais enfermer quelqu'un ni lui fermer la
   porte au nez. */
function tickStructures() {
    const players = getAlivePlayerIds();
    const now = nowMs();
    for (const key in STRUCTS) {
        const s = STRUCTS[key];
        let near = false, allowed = false;
        for (let i = 0; i < players.length; i++) {
            const p = safePosition(players[i]);
            if (!p) continue;
            const d = dist3(p, s.center);
            /* La fleche a rempli son role des qu'on est devant l'ouverture. */
            if (d <= 6) clearStructArrow(players[i], key);
            if (d > KEEP_RADIUS) continue;
            near = true;
            if (stepOf(players[i]) >= s.step) { allowed = true; }
        }
        if (s.saved && !near && now - s.openedAt >= GRACE_MS) closeStruct(key);
        else if (!s.saved && near && allowed) openStruct(key);
    }
}


export function startHousekeeping() {
    if (houseTimer) return;
    houseTimer = every(tickStructures, HOUSEKEEP_TICKS);
}

/* Fermeture du monde : la minuterie s'arrete, les structures restent en
   memoire et seront repeintes a la premiere connexion. */
export function stopHousekeeping() {
    if (houseTimer) { houseTimer.stop(); houseTimer = null; }
}


/* Renvoie true quand le clic est consomme (pas de coup de poing derriere). */
export function saberClick(playerId, rightClick, x, y, z, blockName, targetId) {
    if (!playerId) return false;
    if (typeof x !== "number" || typeof y !== "number" || typeof z !== "number") return false;

    /* 1. Les cinq boutons caches de la jungle. */
    for (let i = 0; i < BUTTONS.length; i++) {
        if (hitBlock(x, y, z, BUTTONS[i])) return pressButton(playerId, i);
    }

    /* 2. Le rideau du desert (il faut la Torch). */
    if (inClickBox(x, y, z, [612, -904, 1760], [612, -902, 1762])) return burnCurtain(playerId);

    /* 3. L'eau du point de remplissage. Deux rayons : l'eau elle-meme, et un
       plus large qui ne sert qu'a repondre "trop loin" — sans lui, un joueur
       qui clic a cote ne voyait rien du tout et croyait que son clic etait
       perdu. */
    const toWater = dist3([x, y, z], WATER_POINT);
    /* L'eau elle-meme est acceptee plus loin que le reste : viser la surface
       ne donne pas la case exacte du point de remplissage, et un joueur sur la
       rive clique forcement un peu a cote. */
    const waterBlock = blockName === "Water" || blockName === "Flowing Water";
    if (toWater <= 5 || (waterBlock && toWater <= 12)) return fillCup(playerId);
    if (toWater <= 10) {
        tell(playerId, line("fa-solid fa-circle-info", C.INFO, "You are too far from the water."));
        return true;
    }

    /* 4. Le mur scelle de la salle de Shanks. */
    if (inClickBox(x, y, z, WALL_MIN, WALL_MAX)) return passWall(playerId);

    return false;
}


function pressButton(playerId, index) {
    const step = stepOf(playerId);
    if (step >= S.DOOR) {
        tell(playerId, line("fa-solid fa-door-open", C.SUCCESS, "The hidden door is already open."));
        return true;
    }
    const mask = buttonsOf(playerId);
    if (mask & (1 << index)) {
        tell(playerId, line("fa-solid fa-circle-info", C.INFO, "You already pressed this button."));
        return true;
    }
    const next = mask | (1 << index);
    saveButtons(playerId, next);

    let pressed = 0;
    for (let i = 0; i < BUTTONS.length; i++) if (next & (1 << i)) pressed++;

    if (pressed >= BUTTONS.length) {
        saveButtons(playerId, 0);
        setStep(playerId, S.DOOR);
        openStruct("door");
        armStructArrow(playerId, "door");
        soundAt(playerId, "glass1", 1, 0.8, 40);
        tell(playerId, [
            { icon: "fa-solid fa-door-open", style: { color: C.SUCCESS } },
            { str: " All five hidden buttons are pressed: ", style: { color: C.SUCCESS } },
            { str: "a door grinds open deeper in the jungle.", style: { color: C.INFO } },
            { str: "\nA marker points at it. It stays open for a minute.",
                style: { color: "#94A3B8" } },
        ]);
    } else {
        soundAt(playerId, "coin", 0.6, 1.4, 20);
        tell(playerId, [
            { icon: "fa-solid fa-circle-check", style: { color: C.XP } },
            { str: " Hidden button pressed ", style: { color: C.INFO } },
            { str: "(" + pressed + "/" + BUTTONS.length + ")", style: { color: C.SUCCESS, fontWeight: "bold" } },
            { str: ".", style: { color: C.INFO } },
        ]);
    }
    return true;
}


function burnCurtain(playerId) {
    const step = stepOf(playerId);
    if (step >= S.CURTAIN) {
        /* Rideau deja brule : on le rouvre pour lui, sans message ni coup. */
        if (!STRUCTS.curtain.saved) openStruct("curtain");
        return false;
    }
    if (step < S.DOOR) return false;

    const held = heldItemName(playerId);
    if (held !== ITEM_TORCH && !hasItem(playerId, ITEM_TORCH)) {
        tell(playerId, line("fa-solid fa-fire", C.DANGER, "The curtain will not burn. You need a Torch."));
        return true;
    }

    /* La Torch part dans le feu : c'est la seule facon d'ouvrir le passage. */
    try { api.removeItemName(playerId, ITEM_TORCH, 1); } catch (e) {}
    setStep(playerId, S.CURTAIN);
    openStruct("curtain");
    soundAt(playerId, "bearRoar1", 1, 1.2, 40);
    const p = safePosition(playerId);
    if (p) boom(p, 2.2, { tex: TEX.effect, colors: [rgba(255, 170, 60), rgba(120, 40, 0, 0)] });
    tell(playerId, [
        { icon: "fa-solid fa-fire", style: { color: C.MONEY } },
        { str: " The Torch sets the curtain ablaze ", style: { color: C.INFO } },
        { str: "and burns out in your hand: a passage opens behind the smoke.", style: { color: C.SUCCESS } },
    ]);
    return true;
}


/* Rend une Cup pleine la ou il y a de la place (reprise apres une perte :
   mort, filtre d'inventaire). Ce n'est PAS le chemin normal du remplissage. */
function giveFullCup(playerId) {
    try {
        api.giveItem(playerId, ITEM_CUP_FULL, 1, {
            customDisplayName: CUP_FULL_ATTRS.customDisplayName,
            customDescription: CUP_FULL_ATTRS.customDescription,
        });
        return true;
    } catch (e) { return false; }
}


function fillCup(playerId) {
    const step = stepOf(playerId);
    /* Vide et pleine sont DEUX ITEMS D'ORIGINE differents, pas deux noms du
       meme item : `Bucket` et `Water Bucket`. C'est la seule chose qu'on
       regarde, donc un seau renomme (Code Block, ancienne version) se remplit
       comme un autre. Consequence : on ne compte jamais un seau VIDE comme une
       Cup pleine, sinon un joueur qui a les deux ne peut plus rien remplir
       ("Your Cup is already full" alors qu'il tient un seau vide). */
    const empty = countOf(playerId, ITEM_CUP);
    const full = countOf(playerId, ITEM_CUP_FULL);

    if (empty === 0) {
        if (full > 0) {
            /* Deja remplie : l'etape suit l'item, pour ne jamais laisser un
               joueur avec une Cup pleine et un Old Man qui a encore soif. */
            if (step >= S.CURTAIN && step < S.WATER) setStep(playerId, S.WATER);
            tell(playerId, line("fa-solid fa-circle-info", C.INFO, "Your Cup is already full of water."));
            return true;
        }
        if (step >= S.WATER) {
            /* Cup perdue en route (mort, filtre d'inventaire) : on la rend
               plutot que d'annoncer une etape que le joueur ne peut plus
               jouer. */
            if (giveFullCup(playerId)) {
                tell(playerId, line("Water", C.SUCCESS, "Your Cup is filled again: someone must be thirsty."));
                return true;
            }
            tell(playerId, line("fa-solid fa-xmark", C.DANGER, "Your Cup is gone, and you have no room to take it back."));
            return true;
        }
        /* Ni seau vide, ni seau plein : le clic est arrive jusqu'ici, c'est
           donc bien un probleme d'item et pas de detection. On le dit, au lieu
           de laisser le joueur croire que son clic s'est perdu. */
        tell(playerId, line("fa-solid fa-circle-info", C.INFO,
            "You have nothing to collect this water with."));
        return true;
    }

    /* Quete pas encore lancee : l'eau reste de l'eau. On ne remplit rien et on
       ne fait pas avancer l'etape, mais on repond quand le joueur tient un
       seau — un clic muet ressemble a un bug. */
    if (step < S.CURTAIN) {
        tell(playerId, line("fa-solid fa-circle-info", C.INFO,
            "The water is clear, but you have no reason to fill that yet."));
        return true;
    }

    /* REMPLISSAGE SUR PLACE : le slot qui tient le seau vide est reecrit en
       seau d'eau, au meme endroit. On ecrit l'ITEM D'ORIGINE `Water Bucket`
       (c'est lui qui decide de tout) et on lui pose par-dessus son nom affiche
       et sa description — du decor, jamais relu par une decision.
       Aucun removeItem suivi d'un giveItem : l'item ne quitte jamais sa case,
       donc rien ne peut se dupliquer, et un inventaire plein ne peut pas
       avaler la Cup.
       Un slot peut contenir plusieurs seaux : on n'en remplit qu'un et on
       rend la pile restante (jamais dupliquee : le slot est d'abord reecrit). */
    const holder = slotsOf(playerId, ITEM_CUP)[0];
    const rest = Math.max(0, (holder.amount | 0) - 1);
    const ok = writeItem(playerId, holder.where, holder.slot, ITEM_CUP_FULL, 1, {
        customDisplayName: CUP_FULL_ATTRS.customDisplayName,
        customDescription: CUP_FULL_ATTRS.customDescription,
    });
    if (!ok) {
        tell(playerId, line("fa-solid fa-xmark", C.DANGER, "Your Cup will not stay in your hands. Try again."));
        return true;
    }
    if (rest > 0) {
        try { api.giveItem(playerId, ITEM_CUP, rest); } catch (e) {}
    }

    if (step < S.WATER) setStep(playerId, S.WATER);
    soundAt(playerId, "coin", 0.5, 1.5, 20);
    tell(playerId, [
        { icon: "Water", style: { color: C.MARINE } },
        { str: " You fill the Cup with water: ", style: { color: C.INFO } },
        { str: CUP_FULL, style: { color: C.MARINE, fontWeight: "bold" } },
        { str: ".", style: { color: C.INFO } },
    ]);
    return true;
}


/* Le mur : la relique y est CONSOMMEE (elle brule dans la roche). Le passage
   reste ensuite ouvert pour ce joueur : sans ca, un joueur qui revient se
   retrouverait devant un mur qu'il ne peut plus ouvrir, puisqu'il n'a plus la
   relique (elle est unique et non lachable). */
function passWall(playerId) {
    const step = stepOf(playerId);
    if (step < S.RELIC) return false;

    const burned = step >= S.WALL;
    if (!burned) {
        if (!hasItem(playerId, ITEM_RELIC)) {
            tell(playerId, line("fa-solid fa-lock", C.DANGER, "This wall is sealed. Only the ancient relic can open it."));
            return true;
        }
        try { api.removeItemName(playerId, ITEM_RELIC, 1); } catch (e) {}
    }

    try { api.setPosition(playerId, WALL_BEHIND[0], WALL_BEHIND[1], WALL_BEHIND[2]); }
    catch (e) { return true; }
    if (!burned) setStep(playerId, S.WALL);
    soundAt(playerId, "glass1", 1, 1.3, 25);
    const p = safePosition(playerId);
    if (p) point(p, { tex: TEX.soul, count: 12, colors: [rgba(255, 90, 40), rgba(40, 10, 0, 0)] });
    tell(playerId, burned
        ? [
            { icon: "fa-solid fa-fire", style: { color: C.MONEY } },
            { str: " The hole in the wall is still warm. ", style: { color: C.INFO } },
            { str: "You slip through it.", style: { color: C.SUCCESS } },
        ]
        : [
            { icon: "fa-solid fa-fire", style: { color: C.MONEY } },
            { str: " The " + ITEM_RELIC + " burns through the wall ", style: { color: C.INFO } },
            { str: "and is consumed by the rock.", style: { color: C.SUCCESS } },
        ]);
    return true;
}


/* ── 6. LES TROIS PNJ ──────────────────────────────────────────────────── */

export function saberOldMan(playerId) {
    if (!playerId) return false;
    const step = stepOf(playerId);

    if (step >= S.OLD_MAN) {
        tell(playerId, speech("fa-solid fa-user-group", C.MARINE, "Old Man",
            "Please meet up with my son, I'm sure he will reward you."));
        return true;
    }
    if (step < S.WATER) {
        tell(playerId, speech("Water", C.MARINE, "Old Man", "I'm so thirsty..."));
        return true;
    }

    /* Il ne boit qu'une Cup REELLEMENT pleine : le seul juge est l'item
       d'origine `Water Bucket`, jamais l'etape ni un nom affiche. Un seau
       VIDE ne desaltere personne, et ca ne bloque pas : le point d'eau
       remplit n'importe quel seau vide (voir fillCup). */
    if (!hasItem(playerId, ITEM_CUP_FULL)) {
        tell(playerId, speech("Water", C.MARINE, "Old Man", "I'm so thirsty..."));
        return true;
    }

    /* Il boit : la Cup pleine disparait, l'etape est ecrite avant l'annonce. */
    try { api.removeItemName(playerId, ITEM_CUP_FULL, 1); } catch (e) {}
    setStep(playerId, S.OLD_MAN);
    soundAt(playerId, "coin", 0.8, 1.2, 20);
    tell(playerId, speech("Water", C.SUCCESS, "Old Man",
        "Thank you so much! Please meet up with my son, I'm sure he will reward you."));
    return true;
}


export function saberRichMan(playerId) {
    if (!playerId) return false;
    const step = stepOf(playerId);

    if (step < S.OLD_MAN) {
        tell(playerId, speech("fa-solid fa-user-group", C.MONEY, "Rich Man",
            "Come back when my father is not thirsty anymore."));
        return true;
    }

    if (step === S.OLD_MAN) {
        setStep(playerId, S.HUNT);
        armSecretArrow(playerId);
        soundAt(playerId, "exp_levelup", 0.8, 1.1, 20);
        tell(playerId, speech("fa-solid fa-coins", C.MONEY, "Rich Man",
            "Thanks for helping my father, but a mob leader has stolen all my money! "
            + "Please find and take him down as soon possible so I can reward player...",
            "A marker now points at Secret Island."));
        return true;
    }

    if (step < S.RELIC) {
        if (hasItem(playerId, ITEM_GOLD)) {
            payRichard(playerId);
            return true;
        }
        /* L'or a ete perdu (mort, coffre vide...) : on remet la chasse en
           cours pour que le Mob Leader puisse le lacher de nouveau. */
        if (step >= S.GOLD) setStep(playerId, S.HUNT);
        armSecretArrow(playerId);
        tell(playerId, speech("fa-solid fa-coins", C.MONEY, "Rich Man",
            "A mob leader still holds my money. Find him first."));
        return true;
    }

    /* Relique perdue (mort) alors que le mur n'est pas encore ouvert : on la
       rend gratuitement, comme le vendeur de haki rend son pod. Il n'y a
       jamais deux reliques : la garde est l'absence de l'item ET l'etape. */
    if (step === S.RELIC && !hasItem(playerId, ITEM_RELIC)) {
        try { api.giveItem(playerId, ITEM_RELIC, 1); } catch (e) {}
        tell(playerId, speech("fa-solid fa-circle-info", C.INFO, "Rich Man",
            "You lost the relic? Here it is again. Burn that wall."));
        return true;
    }

    tell(playerId, speech("fa-solid fa-circle-info", C.INFO, "Rich Man",
        "The relic is yours. Use it on the sealed wall."));
    return true;
}


/* Il reprend son or et donne la relique. Un seul paiement possible : l'etape
   passe a RELIC avant tout le reste, et sans or il n'y a rien a donner. */
function payRichard(playerId) {
    if (!hasItem(playerId, ITEM_GOLD)) return false;
    try { api.removeItemName(playerId, ITEM_GOLD, 1); } catch (e) {}
    setStep(playerId, S.RELIC);
    clearSecretArrow(playerId);
    try { api.giveItem(playerId, ITEM_RELIC, 1); } catch (e) {}
    soundAt(playerId, "exp_levelup", 1, 0.9, 20);
    tell(playerId, speech("fa-solid fa-trophy", C.SUCCESS, "Rich Man",
        "Thank you for getting my money back, you can keep this ancient relic as your reward.",
        "You received " + ITEM_RELIC + "."));
    return true;
}


export function saberShanks(playerId) {
    if (!playerId) return false;
    const step = stepOf(playerId);

    if (step < S.RELIC) {
        tell(playerId, speech("fa-solid fa-circle-info", C.INFO, "Shanks",
            "Come back with something worth my time."));
        return true;
    }
    /* La relique est CONSOMMEE au mur : une fois le passage brule (etape WALL),
       Shanks n'a plus a la reclamer. Avant, il la demande encore. */
    if (step < S.WALL && !hasItem(playerId, ITEM_RELIC)) {
        tell(playerId, line("fa-solid fa-lock", C.DANGER, "Shanks: \"The relic is the key. Bring it back.\""));
        return true;
    }

    tell(playerId, speech("fa-solid fa-swords", "#E8B4A0", "Shanks",
        "So you found the relic. Show me what a real sword can do."));
    startSaberFight(playerId);
    return true;
}
