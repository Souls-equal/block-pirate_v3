// gameplay/saber.js
/* ══════════════════════════════════════════════════════════════════════════
   LA SABER QUEST — la derniere grande quete de la Sea 1.

   Un seul fichier : la limite de 30 fichiers du World Code ne permet pas d'en
   ouvrir un second (voir tools/build-sources.mjs). Tout ce qui suit vit donc
   ici : les structures du monde, les trois PNJ, le Mob Leader et le Saber
   Expert.

   DEROULEMENT (l'etape est un seul nombre en base, cle "sq")

     0  rien
     1  JUNGLE   les cinq boutons caches sont tous pressés : la porte
                [1329,-915,318] + [1329,-914,318] s'ouvre. Derriere, une
                Torch (donnee par un Code Block) qui ne peut pas etre lachee.
     2  DESERT   avec la Torch, le rideau [612,-904/-902,1760/1762] brule :
                le passage s'ouvre ET la Torch est retiree. Derriere, une Cup
                (item Bucket, donnee par un Code Block).
     3  EAU      cliquer l'eau [2534,-897,449] remplit la Cup (meme item,
                attributs differents).
     4  OLD MAN  sans eau "I'm so thirsty...", avec l'eau il remercie et
                envoie vers son fils.
     5  RICH MAN il donne l'objectif (Mob Leader) et pose une fleche vers
                Secret Island.
     6  MOB LEADER  mob de niveau 200, lance par un Code Block avec
                spawnMobLeader(x, y, z) ; a sa mort il lache un "Gold Grit".
     7  RICH MAN il reprend l'or et donne la relique "Magmaward Fuel".
     8  MUR      avec la relique, cliquer le mur [1318..1320,-911..909,321]
                teleporte derriere, dans la salle de Shanks.
     9  SHANKS   parler au PNJ lance le duel du SABER EXPERT dans l'arene du
                boss Haki. Le vaincre termine la quete.

   LES BLOCS SONT REELS : la porte et le rideau sont retires du monde
   (api.setBlock Air) puis remis des qu'il n'y a plus personne a 15 blocs.
   La verification passe toutes les 11 s et ne coute que deux structures. Un
   joueur qui revient apres coup les voit se rouvrir tout seul : la quete ne
   peut pas rester bloquee derriere un monde nettoye.

   AUCUNE REWARD N'EST VERSEE DEUX FOIS : chaque don (eau, or, relique) est
   conditionne par l'etape ET par la presence de l'item, et l'etape est
   ecrite AVANT l'annonce.
   ══════════════════════════════════════════════════════════════════════════ */

import { say, C } from "../core/theme";
import { getStat, setStat } from "../utils/data";
import { setInterval as every, nowMs } from "../utils/timer";
import { damage, eff, hitArea, hitSeg, impulse, setVel } from "../utils/combat";
import { getAlivePlayerIds, isMobEntityType, safePosition } from "../utils/lifeform";
import { boom, point, at as soundAt, TEX, rgba } from "../utils/fx";

/* ── 1. CONFIGURATION ──────────────────────────────────────────────────── */

const ITEM_TORCH = "Torch";
const ITEM_CUP = "Bucket";
const CUP_FULL = "Cup of Water";
const ITEM_GOLD = "Gold Block";
const GOLD_NAME = "Gold Grit";
const ITEM_RELIC = "Obsidian";
const RELIC_NAME = "Magmaward Fuel";

/* Les cinq boutons caches de la jungle. */
const BUTTONS = [
    [1439, -918, 300],
    [1334, -915, 261],
    [1302, -915, 382],
    [1516, -916, 165],
    [1449, -903, 128],
];

const WATER_POINT = [2534, -897, 449];
const WALL_MIN = [1318, -911, 321];
const WALL_MAX = [1320, -909, 321];
const WALL_BEHIND = [1319, -912, 323];

/* Etapes (une seule cle db par joueur). */
const S = {
    NONE: 0,
    DOOR: 1,
    CURTAIN: 2,
    WATER: 3,
    OLD_MAN: 4,
    HUNT: 5,
    GOLD: 6,
    RELIC: 7,
    WALL: 8,
    DONE: 9,
};

const DB_STEP = "sq";
const DB_BUTTONS = "sqB";

/* L'ile secrete de la quete. Sa position est donnee par l'auteur du monde :
   tant qu'elle vaut null, aucune fleche n'est posee et aucun point de warp
   n'est propose au staff (rien de casse). `setSecretIsland()` la remplit a
   chaud, y compris depuis un Code Block. */
export const SABER_ISLAND = { name: "Secret Island", pos: null, color: "#E5C15A" };

export function setSecretIsland(x, y, z) {
    const px = Number(x), py = Number(y), pz = Number(z);
    if (!isFinite(px) || !isFinite(py) || !isFinite(pz)) return false;
    SABER_ISLAND.pos = [px, py, pz];
    return true;
}

/* Les deux structures ouvrables. `saved` retient les blocs retires, dans
   l'ordre, pour pouvoir les remettre a l'identique. */
const STRUCTS = {
    door: {
        step: S.DOOR,
        center: [1329, -914.5, 318],
        blocks: [
            [1329, -915, 318],
            [1329, -914, 318],
        ],
        saved: null,
    },
    curtain: {
        step: S.CURTAIN,
        center: [612, -903, 1761],
        blocks: curtainBlocks(),
        saved: null,
    },
};

function curtainBlocks() {
    const out = [];
    for (let y = -904; y <= -902; y++) {
        for (let z = 1760; z <= 1762; z++) out.push([612, y, z]);
    }
    return out;
}

/* ── 2. OUTILS ─────────────────────────────────────────────────────────── */

function dist3(a, b) {
    const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function norm3(v) {
    const l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
}

function alive(id) {
    if (!id) return false;
    try { return !!api.isAlive(id); } catch (e) { return false; }
}

function healthOf(id) {
    let hp = null;
    try { hp = api.getHealth(id); } catch (e) { hp = null; }
    return typeof hp === "number" ? hp : 0;
}

function blockAt(x, y, z) {
    try { return api.getBlock(x, y, z); } catch (e) { return null; }
}

function tell(playerId, parts) {
    try { say(playerId, parts); } catch (e) {}
}

function line(icon, color, text) {
    return [
        { icon: icon, style: { color: color } },
        { str: " " + text, style: { color: C.INFO } },
    ];
}

function speech(icon, color, speaker, quote, extra) {
    const parts = [
        { icon: icon, style: { color: color } },
        { str: " " + speaker + ": \"", style: { color: C.INFO } },
        { str: quote, style: { color: "#FFFFFF" } },
        { str: "\"", style: { color: C.INFO } },
    ];
    if (extra) parts.push({ str: "\n" + extra, style: { color: C.SUCCESS } });
    return parts;
}

function hasItem(playerId, itemName) {
    try { return (api.getInventoryItemAmount(playerId, itemName) || 0) > 0; }
    catch (e) { return false; }
}

function heldItemName(playerId) {
    try {
        const h = api.getHeldItem(playerId);
        if (!h) return null;
        if (typeof h === "string") return h;
        return h.name || h.type || null;
    } catch (e) { return null; }
}

/* L'item est-il interdit au lacher ? (branche dans onPlayerDropItem) */
export function saberLockedItem(itemName) {
    return itemName === ITEM_TORCH;
}

/* ── 3. ETAT DU JOUEUR (db) ────────────────────────────────────────────── */

function stepOf(playerId) {
    const v = getStat(playerId, DB_STEP, 0);
    const n = typeof v === "number" ? v : parseInt(v, 10);
    return isFinite(n) && n > 0 ? n : 0;
}

function setStep(playerId, step) {
    try { setStat(playerId, DB_STEP, step); } catch (e) {}
}

function buttonsOf(playerId) {
    const v = getStat(playerId, DB_BUTTONS, 0);
    const n = typeof v === "number" ? v : parseInt(v, 10);
    return isFinite(n) && n > 0 ? n : 0;
}

function saveButtons(playerId, mask) {
    try { setStat(playerId, DB_BUTTONS, mask || 0); } catch (e) {}
}

/* ── 4. STRUCTURES OUVERTES / REFERMEES ────────────────────────────────── */

function openStruct(key) {
    const s = STRUCTS[key];
    if (!s || s.saved) return false;
    startHousekeeping();
    const saved = [];
    for (let i = 0; i < s.blocks.length; i++) {
        const b = s.blocks[i];
        const name = blockAt(b[0], b[1], b[2]);
        if (!name) continue;
        saved.push([b[0], b[1], b[2], name]);
        if (name !== "Air") {
            try { api.setBlock(0, b[0], b[1], b[2]); } catch (e) {}
        }
    }
    s.saved = saved;
    return true;
}

function closeStruct(key) {
    const s = STRUCTS[key];
    if (!s || !s.saved) return false;
    for (let i = 0; i < s.saved.length; i++) {
        const e = s.saved[i];
        try { api.setBlock(e[3], e[0], e[1], e[2]); } catch (err) {}
    }
    s.saved = null;
    return true;
}

const KEEP_RADIUS = 15;
/* ATTENTION : les minuteries de utils/timer comptent en TICKS (1 tick = 50 ms),
   pas en millisecondes. 220 ticks = 11 s. */
const HOUSEKEEP_TICKS = 220;
let houseTimer = null;

/* Verification periodique : on remet les blocs des qu'il n'y a plus personne
   autour, et on les retire de nouveau pour un joueur qui a deja valide
   l'etape et qui revient. Le monde reste donc dans son etat d'origine, sans
   jamais enfermer quelqu'un. */
function tickStructures() {
    const players = getAlivePlayerIds();
    for (const key in STRUCTS) {
        const s = STRUCTS[key];
        let near = false, allowed = false;
        for (let i = 0; i < players.length; i++) {
            const p = safePosition(players[i]);
            if (!p || dist3(p, s.center) > KEEP_RADIUS) continue;
            near = true;
            if (stepOf(players[i]) >= s.step) { allowed = true; break; }
        }
        if (s.saved && !near) closeStruct(key);
        else if (!s.saved && near && allowed) openStruct(key);
    }
}

function startHousekeeping() {
    if (houseTimer) return;
    houseTimer = every(tickStructures, HOUSEKEEP_TICKS);
}

/* ── 5. CLICS DANS LE MONDE ────────────────────────────────────────────── */

/* Un clic arrive en coordonnees flottantes : la case cliquee est le floor.
   Les deux tolérances ci-dessous evitent de rater un bouton d'une case. */
function hitBlock(x, y, z, target) {
    const bx = Math.floor(x), by = Math.floor(y), bz = Math.floor(z);
    return Math.abs(bx - target[0]) <= 1 && Math.abs(by - target[1]) <= 1 && Math.abs(bz - target[2]) <= 1;
}

function inClickBox(x, y, z, min, max) {
    const bx = Math.floor(x), by = Math.floor(y), bz = Math.floor(z);
    return bx >= min[0] - 1 && bx <= max[0] + 1
        && by >= min[1] - 1 && by <= max[1] + 1
        && bz >= min[2] - 1 && bz <= max[2] + 1;
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

    /* 3. L'eau du point de remplissage. */
    if (dist3([x, y, z], WATER_POINT) <= 4) return fillCup(playerId);

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
        soundAt(playerId, "glass1", 1, 0.8, 40);
        tell(playerId, [
            { icon: "fa-solid fa-door-open", style: { color: C.SUCCESS } },
            { str: " All five hidden buttons are pressed: ", style: { color: C.SUCCESS } },
            { str: "a door grinds open deeper in the jungle.", style: { color: C.INFO } },
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

function fillCup(playerId) {
    const step = stepOf(playerId);
    if (step >= S.WATER) {
        tell(playerId, line("fa-solid fa-circle-info", C.INFO, "Your Cup is already full of water."));
        return true;
    }
    if (step < S.CURTAIN) return false;
    if (!hasItem(playerId, ITEM_CUP)) {
        tell(playerId, line("fa-solid fa-circle-info", C.INFO, "You need a Cup to carry water."));
        return true;
    }

    /* Meme item, nouveaux attributs : c'est le nom affiche qui fait la Cup
       pleine, donc la tasse reste identifiable dans l'inventaire. */
    try { api.removeItemName(playerId, ITEM_CUP, 1); } catch (e) {}
    try {
        api.giveItem(playerId, ITEM_CUP, 1, {
            customDisplayName: CUP_FULL,
            customDescription: "A cup full of fresh water. Someone must be thirsty.",
        });
    } catch (e) {}
    setStep(playerId, S.WATER);
    soundAt(playerId, "coin", 0.5, 1.5, 20);
    tell(playerId, [
        { icon: "Water", style: { color: C.MARINE } },
        { str: " You fill the Cup: ", style: { color: C.INFO } },
        { str: CUP_FULL, style: { color: C.MARINE, fontWeight: "bold" } },
        { str: ".", style: { color: C.INFO } },
    ]);
    return true;
}

function passWall(playerId) {
    const step = stepOf(playerId);
    if (step < S.RELIC) return false;
    if (!hasItem(playerId, ITEM_RELIC)) {
        tell(playerId, line("fa-solid fa-lock", C.DANGER, "This wall is sealed. Only the ancient relic can open it."));
        return true;
    }
    try { api.setPosition(playerId, WALL_BEHIND[0], WALL_BEHIND[1], WALL_BEHIND[2]); }
    catch (e) { return true; }
    if (step < S.WALL) setStep(playerId, S.WALL);
    soundAt(playerId, "glass1", 1, 1.3, 25);
    const p = safePosition(playerId);
    if (p) point(p, { tex: TEX.soul, count: 12, colors: [rgba(255, 90, 40), rgba(40, 10, 0, 0)] });
    tell(playerId, [
        { icon: "fa-solid fa-fire", style: { color: C.MONEY } },
        { str: " The " + RELIC_NAME + " burns through the wall ", style: { color: C.INFO } },
        { str: "and drags you behind it.", style: { color: C.SUCCESS } },
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

    /* Il boit : la Cup pleine disparait, l'etape est ecrite avant l'annonce. */
    try { api.removeItemName(playerId, ITEM_CUP, 1); } catch (e) {}
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
    try {
        api.giveItem(playerId, ITEM_RELIC, 1, {
            customDisplayName: RELIC_NAME,
            customDescription: "An ancient volcanic relic. It opens what no blade can cut.",
        });
    } catch (e) {}
    soundAt(playerId, "exp_levelup", 1, 0.9, 20);
    tell(playerId, speech("fa-solid fa-trophy", C.SUCCESS, "Rich Man",
        "Thank you for getting my money back, you can keep this ancient relic as your reward.",
        "You received " + RELIC_NAME + "."));
    return true;
}

export function saberShanks(playerId) {
    if (!playerId) return false;
    const step = stepOf(playerId);

    if (step >= S.DONE) {
        tell(playerId, speech("fa-solid fa-swords", C.MONEY, "Shanks",
            "You already carry a saber sharper than mine."));
        return true;
    }
    if (step < S.RELIC) {
        tell(playerId, speech("fa-solid fa-circle-info", C.INFO, "Shanks",
            "Come back with something worth my time."));
        return true;
    }
    if (!hasItem(playerId, ITEM_RELIC)) {
        tell(playerId, line("fa-solid fa-lock", C.DANGER, "Shanks: \"The relic is the key. Bring it back.\""));
        return true;
    }

    tell(playerId, speech("fa-solid fa-swords", "#E8B4A0", "Shanks",
        "So you found the relic. Show me what a real sword can do."));
    startSaberFight(playerId);
    return true;
}

/* ── 7. LA FLECHE DE L'ILE SECRETE ─────────────────────────────────────── */

const ARROW_ID = "saber-isle";

function armSecretArrow(playerId) {
    if (!SABER_ISLAND.pos) return false;
    try {
        api.setDirectionArrow(playerId, ARROW_ID, SABER_ISLAND.pos, SABER_ISLAND.name, false, {
            color: SABER_ISLAND.color,
            fontSize: "17px",
            fontWeight: "bold",
        });
        return true;
    } catch (e) { return false; }
}

function clearSecretArrow(playerId) {
    try { api.clearDirectionArrow(playerId, ARROW_ID); } catch (e) {}
}

/* ── 8. LE MOB LEADER (niveau 200) ─────────────────────────────────────── */

const LEADER = {
    LEVEL: 200,
    MOB: "Draugr Zombie",
    NAME: "MOB LEADER",
    TITLE: "Level 200",
    SCALE: 1.6,
    SPEED: 5,
    CD: { rush: 7000, volley: 5000, shake: 6000 },
    DMG: { rush: 90, volley: 70, shake: 120 },
};

/* Memes formules que gameplay/spawning.js (mobBaseHp / mobBaseDmg), pour que
   le Mob Leader soit REELLEMENT un mob de niveau 200 et pas un colosse
   arbitraire. Les deux valeurs se retouchent ici si besoin. */
function leaderHp() { return Math.round(20 + Math.pow(LEADER.LEVEL, 1.6) * 8); }
function leaderDmg() { return Math.round(3 + Math.pow(LEADER.LEVEL, 1.3) * 0.8); }

let leader = null; // { id, handle, cds, rushUntil, rushHit, waves }

export function leaderHpForTest() { return leaderHp(); }

/* Lance par un Code Block :
       spawnMobLeader(x, y, z)              -> a l'endroit voulu
       spawnMobLeader(x, y, z, playerId)    -> et il vise ce joueur
   Retourne l'id du mob, ou null. */
export function spawnMobLeader(x, y, z, playerId) {
    const px = Number(x), py = Number(y), pz = Number(z);
    if (!isFinite(px) || !isFinite(py) || !isFinite(pz)) return null;
    if (leader && alive(leader.id)) {
        if (playerId) tell(playerId, line("fa-solid fa-circle-info", C.INFO, "The Mob Leader is already on the loose."));
        return null;
    }

    const spot = clearSpot([px, py, pz]);
    let id = null;
    try {
        id = api.attemptSpawnMob(LEADER.MOB, spot[0], spot[1], spot[2], {
            name: LEADER.NAME,
            playSoundOnSpawn: true,
        });
    } catch (e) { id = null; }
    if (!id) {
        if (playerId) tell(playerId, line("fa-solid fa-xmark", C.DANGER, "The Mob Leader could not be summoned."));
        return null;
    }

    const hp = leaderHp();
    try {
        api.setMobSetting(id, "maxHealth", hp);
        api.setHealth(id, hp, undefined, true);
        api.setMobSetting(id, "attackDamage", leaderDmg());
        api.setMobSetting(id, "hostilityRadius", 40);
        api.setMobSetting(id, "chaseRadius", 40);
        api.setMobSetting(id, "territoryRadius", 40);
        api.setMobSetting(id, "onDeathItemDrops", []);
        api.setMobSetting(id, "baseRunningSpeed", LEADER.SPEED);
        api.setMobSetting(id, "baseWalkingSpeed", LEADER.SPEED * 0.75);
        api.setLifeformScale(id, LEADER.SCALE);
        api.setTargetedPlayerSettingForEveryone(id, "nameTagInfo",
            nameTag(LEADER.NAME, LEADER.TITLE, "#FFD166"), true);
    } catch (e) {}
    if (playerId) {
        try { api.setMobAiState(id, "chasing", { targetId: playerId }); } catch (e) {}
    }
    soundAt(spot, "ominousBellHit", 1, 0.8, 40);

    leader = {
        id: id,
        cds: { rush: 0, volley: 0, shake: 0 },
        rushUntil: 0,
        rushHit: {},
        waves: [],
        aiTarget: playerId || null,
    };
    if (!leaderTimer) leaderTimer = every(thinkLeader, 4);
    return id;
}

let leaderTimer = null;

function stopLeader() {
    if (leaderTimer) { leaderTimer.stop(); leaderTimer = null; }
    leader = null;
}

function thinkLeader() {
    if (!leader) { stopLeader(); return; }
    if (!alive(leader.id)) { stopLeader(); return; }
    const p = safePosition(leader.id);
    if (!p) { despawnIfAlive(leader.id); stopLeader(); return; }

    advanceWaves(leader.waves, leader.id);

    if (nowMs() < leader.rushUntil) {
        const ids = getAlivePlayerIds();
        for (let i = 0; i < ids.length; i++) {
            const t = ids[i];
            if (leader.rushHit[t]) continue;
            const tp = safePosition(t);
            if (!tp || dist3(tp, p) > 3.2) continue;
            leader.rushHit[t] = 1;
            damage(t, LEADER.DMG.rush, leader.id, "Mob Leader");
            const dir = norm3([tp[0] - p[0], 0.4, tp[2] - p[2]]);
            impulse(t, dir[0] * 9, 4, dir[2] * 9);
        }
    }

    const target = leader.aiTarget && alive(leader.aiTarget) ? leader.aiTarget : null;
    if (!target) return;
    const tp = safePosition(target);
    if (!tp) return;
    const d = dist3(p, tp);
    const now = nowMs();

    if (now >= leader.cds.shake && d < 7) { leaderShake(p); return; }
    if (now >= leader.cds.volley && d > 5 && d < 26) { leaderVolley(p, tp); return; }
    if (now >= leader.cds.rush && d > 4 && d < 20) { leaderRush(p, tp); return; }
    try { api.setMobAiState(leader.id, "chasing", { targetId: target }); } catch (e) {}
}

function leaderRush(p, tp) {
    leader.cds.rush = nowMs() + LEADER.CD.rush;
    leader.rushUntil = nowMs() + 700;
    leader.rushHit = {};
    const dir = norm3([tp[0] - p[0], 0, tp[2] - p[2]]);
    setVel(leader.id, dir[0] * 16, 3, dir[2] * 16);
    soundAt(p, "bearRoar1", 1, 1.3, 35);
}

function leaderShake(p) {
    leader.cds.shake = nowMs() + LEADER.CD.shake;
    hitArea(p, 5.5, leader.id, "Mob Leader", LEADER.DMG.shake, {
        knock: 10, lift: 5, slow: [1200, 2],
    });
    boom([p[0], p[1], p[2]], 3, { tex: TEX.crit, colors: [rgba(255, 200, 60), rgba(90, 60, 0, 0)] });
    soundAt(p, "ominousBellHit", 1, 0.7, 35);
}

function leaderVolley(p, tp) {
    leader.cds.volley = nowMs() + LEADER.CD.volley;
    const dir = norm3([tp[0] - p[0], 0.15, tp[2] - p[2]]);
    spawnWave(leader.waves, [p[0], p[1] + 1.1, p[2]], dir, 26, 1.2, LEADER.DMG.volley, "Gold Shot");
    soundAt(p, "cannonFire3", 0.8, 1.4, 35);
}

/* ── 9. LE SABER EXPERT ────────────────────────────────────────────────── */

/* Meme arene que le boss Haki (utils/haki.js) : c'est la salle de combat du
   monde, on ne lui en invente pas une seconde. */
const ARENA = { a: [-87, 1014, -80], b: [165, 1014, 206] };

const SABER = {
    MOB: "Draugr Knight",
    NAME: "SABER EXPERT",
    TITLE: "Guardian of the Ancient Blade",
    HP: 6000,
    SCALE: 1.8,
    SPEED: 6.4,
    MELEE: 90,
    RUSH_SPEED: 20,
    DMG: { rush: 190, slash: 150, slam: 210, grab: 240, tempest: 130 },
    CD: { rush: 6500, slash: 4800, slam: 5200, grab: 5800, tempest: 8000 },
};

let saber = null; // { id, fighter, hp0, enraged, cds, waves, rushUntil, rushHit, aiTarget }
let saberTimer = null;

function nameTag(title, subtitle, color) {
    const info = {
        content: [{ str: title, style: { color: color, fontWeight: "bold" } }],
        healthbar: { display: "always", foregroundColour: color, backgroundColour: "#22130a" },
        border: { colour: color, style: "solid" },
    };
    if (subtitle) info.subtitle = [{ str: subtitle, style: { color: "#FFD166" } }];
    return info;
}

function clearSpot(p) {
    let y = p[1];
    for (let i = 0; i < 48; i++) {
        const b = blockAt(Math.floor(p[0]), Math.floor(y), Math.floor(p[2]));
        if (b === "Air" || b === null) return [p[0], y, p[2]];
        y += 1;
    }
    return [p[0], y, p[2]];
}

function arenaSpot() {
    const x = ARENA.a[0] + Math.random() * (ARENA.b[0] - ARENA.a[0]);
    const z = ARENA.a[2] + Math.random() * (ARENA.b[2] - ARENA.a[2]);
    return clearSpot([x, ARENA.a[1], z]);
}

function playersInArena() {
    const ids = getAlivePlayerIds();
    const out = [];
    for (let i = 0; i < ids.length; i++) {
        const p = safePosition(ids[i]);
        if (!p) continue;
        if (p[0] < ARENA.a[0] || p[0] > ARENA.b[0]) continue;
        if (p[2] < ARENA.a[2] || p[2] > ARENA.b[2]) continue;
        if (p[1] < ARENA.a[1] - 40 || p[1] > ARENA.b[1] + 80) continue;
        out.push(ids[i]);
    }
    return out;
}

function despawnIfAlive(id) {
    if (!id) return;
    try { if (alive(id)) api.despawnMob(id); } catch (e) {}
}

function startSaberFight(playerId) {
    if (saber && alive(saber.id)) {
        tell(playerId, line("fa-solid fa-swords", C.DANGER,
            saber.fighter === playerId
                ? "The Saber Expert is already waiting for you."
                : "A duel is already taking place in the arena."));
        return false;
    }
    const inArena = playersInArena();
    for (let i = 0; i < inArena.length; i++) {
        if (inArena[i] !== playerId) {
            tell(playerId, line("fa-solid fa-xmark", C.DANGER, "Someone is already fighting in the arena."));
            return false;
        }
    }
    /* Personne sur place : on nettoie les mobs errants de l'arene. */
    if (inArena.length === 0) clearArenaMobs();

    const landing = arenaSpot();
    try { api.setPosition(playerId, landing[0], landing[1], landing[2]); } catch (e) {}
    const p = safePosition(playerId) || landing;
    const angle = Math.random() * Math.PI * 2;
    const spot = clearSpot([p[0] + Math.cos(angle) * 8, p[1], p[2] + Math.sin(angle) * 8]);

    let id = null;
    try {
        id = api.attemptSpawnMob(SABER.MOB, spot[0], spot[1], spot[2], {
            name: SABER.NAME,
            playSoundOnSpawn: true,
        });
    } catch (e) { id = null; }
    if (!id) {
        tell(playerId, line("fa-solid fa-xmark", C.DANGER, "The Saber Expert did not show up."));
        return false;
    }

    try {
        api.setMobSetting(id, "maxHealth", SABER.HP);
        api.setHealth(id, SABER.HP, undefined, true);
        api.setMobSetting(id, "attackDamage", SABER.MELEE);
        api.setMobSetting(id, "hostilityRadius", 48);
        api.setMobSetting(id, "chaseRadius", 48);
        api.setMobSetting(id, "territoryRadius", 48);
        api.setMobSetting(id, "onDeathItemDrops", []);
        api.setMobSetting(id, "baseRunningSpeed", SABER.SPEED);
        api.setMobSetting(id, "baseWalkingSpeed", SABER.SPEED * 0.75);
        api.setMobSetting(id, "knockbackReceivedMultiplier", 0);
        api.setLifeformScale(id, SABER.SCALE);
        api.setTargetedPlayerSettingForEveryone(id, "nameTagInfo",
            nameTag(SABER.NAME, SABER.TITLE, "#E8B4A0"), true);
        api.setMobAiState(id, "chasing", { targetId: playerId });
    } catch (e) {}

    saber = {
        id: id,
        fighter: playerId,
        hp0: SABER.HP,
        enraged: false,
        cds: { rush: nowMs() + 2500, slash: nowMs() + 1500, slam: 0, grab: 0, tempest: 0 },
        waves: [],
        rushUntil: 0,
        rushHit: {},
        aiTarget: playerId,
    };
    if (saberTimer) saberTimer.stop();
    saberTimer = every(thinkSaber, 4);

    soundAt(spot, "ominousBellHit", 1, 0.6, 45);
    tell(playerId, [
        { icon: "fa-solid fa-swords", style: { color: "#E8B4A0" } },
        { str: " SABER EXPERT", style: { color: "#E8B4A0", fontWeight: "bold" } },
        { str: ": \"Then draw your steel.\"", style: { color: C.INFO } },
    ]);
    return true;
}

function clearArenaMobs() {
    let ids = [];
    try { ids = api.getEntitiesInRect(ARENA.a, ARENA.b) || []; } catch (e) { return; }
    for (let i = 0; i < ids.length; i++) {
        if (!isMobEntityType(typeOf(ids[i]))) continue;
        despawnIfAlive(ids[i]);
    }
}

function typeOf(id) {
    try { return api.getEntityType(id); } catch (e) { return null; }
}

function thinkSaber() {
    if (!saber) { stopSaber(); return; }
    if (!alive(saber.id)) { saberFallen(); return; }
    const p = safePosition(saber.id);
    if (!p) { despawnIfAlive(saber.id); stopSaber(); return; }

    advanceWaves(saber.waves, saber.id);

    if (nowMs() < saber.rushUntil) {
        const ids = getAlivePlayerIds();
        for (let i = 0; i < ids.length; i++) {
            const t = ids[i];
            if (saber.rushHit[t]) continue;
            const tp = safePosition(t);
            if (!tp || dist3(tp, p) > 3.4) continue;
            saber.rushHit[t] = 1;
            damage(t, SABER.DMG.rush, saber.id, "Saber Rush");
            const dir = norm3([tp[0] - p[0], 0.5, tp[2] - p[2]]);
            impulse(t, dir[0] * 12, 6, dir[2] * 12);
        }
    }

    let target = saber.fighter && alive(saber.fighter) ? saber.fighter : null;
    if (!target) { endSaberFight("Your duel ended: the arena is empty."); return; }
    const tp = safePosition(target);
    if (!tp) { endSaberFight("Your duel ended: the arena is empty."); return; }

    if (!saber.enraged && healthOf(saber.id) <= saber.hp0 * 0.5) enrage();

    const d = dist3(p, tp);
    const now = nowMs();

    if (now >= saber.cds.grab && d < 7) { saberGrab(p, tp); return; }
    if (now >= saber.cds.slam && d < 9) { saberSlam(p); return; }
    if (saber.enraged && now >= saber.cds.tempest && d < 16) { saberTempest(p); return; }
    if (now >= saber.cds.slash && d > 4) { saberSlash(p, tp); return; }
    if (now >= saber.cds.rush && d > 3 && d < 24) { saberRush(p, tp); return; }
    if (saber.aiTarget !== target) {
        try { api.setMobAiState(saber.id, "chasing", { targetId: target }); } catch (e) {}
        saber.aiTarget = target;
    }
}

/* Phase 2 : le boss accelere et raccourcit tous ses delais. */
function enrage() {
    saber.enraged = true;
    for (const k in saber.cds) saber.cds[k] = Math.min(saber.cds[k], nowMs() + 1200);
    try {
        api.setMobSetting(saber.id, "baseRunningSpeed", SABER.SPEED * 1.25);
        api.setMobSetting(saber.id, "baseWalkingSpeed", SABER.SPEED);
        api.setTargetedPlayerSettingForEveryone(saber.id, "nameTagInfo",
            nameTag(SABER.NAME + " [ENRAGED]", SABER.TITLE, "#FF4D4D"), true);
    } catch (e) {}
    const p = safePosition(saber.id);
    if (p) {
        boom(p, 4, { tex: TEX.effect, colors: [rgba(255, 60, 40), rgba(60, 0, 0, 0)] });
        soundAt(p, "bearRoar1", 1, 0.9, 50);
    }
    if (saber.fighter) tell(saber.fighter, line("fa-solid fa-fire", C.DANGER, "The Saber Expert is enraged!"));
}

function saberRush(p, tp) {
    saber.cds.rush = nowMs() + SABER.CD.rush * (saber.enraged ? 0.75 : 1);
    saber.rushUntil = nowMs() + 750;
    saber.rushHit = {};
    const dir = norm3([tp[0] - p[0], 0, tp[2] - p[2]]);
    setVel(saber.id, dir[0] * SABER.RUSH_SPEED, 3, dir[2] * SABER.RUSH_SPEED);
    try { api.setEntityHeading(saber.id, Math.atan2(dir[0], dir[2])); } catch (e) {}
    soundAt(p, "bearRoar1", 1, 1.35, 45);
}

function saberSlash(p, tp) {
    saber.cds.slash = nowMs() + SABER.CD.slash * (saber.enraged ? 0.75 : 1);
    const dir = norm3([tp[0] - p[0], 0.05, tp[2] - p[2]]);
    const side = [-dir[2], 0, dir[0]];
    /* DEUX ondes independantes : elles ne partent pas du meme point, donc on
       ne peut pas esquiver en reculant simplement. */
    spawnWave(saber.waves, [p[0] + side[0] * 2.2, p[1] + 1, p[2] + side[2] * 2.2], dir, 34, 1.5, SABER.DMG.slash, "Air Slash");
    spawnWave(saber.waves, [p[0] - side[0] * 2.2, p[1] + 1, p[2] - side[2] * 2.2], dir, 34, 1.5, SABER.DMG.slash, "Air Slash");
    soundAt(p, "magicAccent1", 0.9, 1.2, 45);
}

function saberSlam(p) {
    saber.cds.slam = nowMs() + SABER.CD.slam * (saber.enraged ? 0.75 : 1);
    const ground = [p[0], p[1], p[2]];
    hitArea(ground, 6, saber.id, "Saber Slam", SABER.DMG.slam, {
        knock: 14, lift: 7, slow: [1500, 2],
    });
    boom(ground, 4, { tex: TEX.crit, colors: [rgba(255, 220, 120), rgba(90, 60, 0, 0)] });
    soundAt(ground, "glass1", 1, 0.6, 45);
}

function saberGrab(p, tp) {
    saber.cds.grab = nowMs() + SABER.CD.grab * (saber.enraged ? 0.75 : 1);
    const victim = saber.fighter;
    const dir = norm3([p[0] - tp[0], 0.35, p[2] - tp[2]]);
    try { setVel(victim, dir[0] * 18, 5, dir[2] * 18); } catch (e) {}
    if (damage(victim, SABER.DMG.grab, saber.id, "Saber Grab")) {
        eff(victim, "Weakness", 3000, { inbuiltLevel: 2 });
    }
    soundAt(p, "magicAccent1", 1, 0.8, 45);
    tell(victim, line("fa-solid fa-hand-fist", C.DANGER, "The Saber Expert grabs you!"));
}

function saberTempest(p) {
    saber.cds.tempest = nowMs() + SABER.CD.tempest;
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        spawnWave(saber.waves, [p[0], p[1] + 0.6, p[2]], [Math.cos(a), 0, Math.sin(a)],
            20, 1.2, SABER.DMG.tempest, "Blade Tempest");
    }
    soundAt(p, "ominousBellHit", 1, 0.5, 50);
}

/* ── 10. ONDES (communes au Mob Leader et au Saber Expert) ─────────────── */

/* Une onde est une ligne qui avance : on teste le SEGMENT parcouru depuis le
   tick precedent, donc personne ne traverse l'onde entre deux images. */
function spawnWave(list, origin, dir, speed, radius, dmg, item) {
    if (!list || list.length > 12) return;
    list.push({
        p: [origin[0], origin[1], origin[2]],
        d: [dir[0], dir[1], dir[2]],
        speed: speed,
        r: radius,
        dmg: dmg,
        item: item,
        life: 22,
    });
}

const WAVE_STEP_MS = 200;

function advanceWaves(list, caster) {
    if (!list || !list.length || !caster) return;
    for (let i = list.length - 1; i >= 0; i--) {
        const w = list[i];
        const next = [
            w.p[0] + w.d[0] * w.speed * (WAVE_STEP_MS / 1000),
            w.p[1] + w.d[1] * w.speed * (WAVE_STEP_MS / 1000),
            w.p[2] + w.d[2] * w.speed * (WAVE_STEP_MS / 1000),
        ];
        try { hitSeg(w.p, next, w.r, caster, w.item, w.dmg, null); } catch (e) {}
        point(next, { tex: TEX.glint, count: 3, colors: [rgba(255, 240, 200), rgba(255, 160, 60, 0)] });
        w.p = next;
        w.life--;
        if (w.life <= 0) list.splice(i, 1);
    }
}

/* ── 11. MORTS, DESPAWNS, JOIN / LEAVE ─────────────────────────────────── */

function saberFallen() {
    const fighter = saber ? saber.fighter : null;
    const id = saber ? saber.id : null;
    const p = saber ? safePosition(saber.id) : null;
    stopSaber();
    despawnIfAlive(id);
    if (p) {
        boom(p, 4, { tex: TEX.soul, colors: [rgba(232, 180, 160), rgba(60, 30, 30, 0)] });
        soundAt(p, "exp_levelup", 1, 0.8, 50);
    }
    if (fighter) {
        setStep(fighter, S.DONE);
        clearSecretArrow(fighter);
        tell(fighter, [
            { icon: "fa-solid fa-trophy", style: { color: C.MONEY } },
            { str: " SABER EXPERT defeated. ", style: { color: C.MONEY, fontWeight: "bold" } },
            { str: "The Saber Quest is complete.", style: { color: C.SUCCESS } },
        ]);
        /* Retour dans la salle de Shanks, comme Garp renvoie au spawn. */
        try {
            api.setPosition(fighter, WALL_BEHIND[0], WALL_BEHIND[1], WALL_BEHIND[2]);
        } catch (e) {}
    }
}

function endSaberFight(reason) {
    const fighter = saber ? saber.fighter : null;
    const id = saber ? saber.id : null;
    stopSaber();
    despawnIfAlive(id);
    if (fighter && reason) tell(fighter, line("fa-solid fa-circle-info", C.INFO, reason));
}

function stopSaber() {
    if (saberTimer) { saberTimer.stop(); saberTimer = null; }
    saber = null;
}

/* Branche dans onPlayerKilledMob : renvoie true si le mob etait a nous. */
export function saberKilledMob(playerId, mobId) {
    if (!mobId) return false;

    if (leader && mobId === leader.id) {
        const p = safePosition(mobId);
        stopLeader();
        despawnIfAlive(mobId);
        if (p) {
            try {
                api.createItemDrop(p[0], p[1] + 0.5, p[2], ITEM_GOLD, 1, false, {
                    customDisplayName: GOLD_NAME,
                    customDescription: "The money the Mob Leader stole. Bring it back to the Rich Man.",
                });
            } catch (e) {}
            soundAt(p, "coin", 1, 0.9, 40);
        }
        if (playerId) {
            if (stepOf(playerId) === S.HUNT) setStep(playerId, S.GOLD);
            tell(playerId, [
                { icon: "fa-solid fa-coins", style: { color: C.MONEY } },
                { str: " The Mob Leader drops ", style: { color: C.INFO } },
                { str: GOLD_NAME, style: { color: C.MONEY, fontWeight: "bold" } },
                { str: ". Take it back to the Rich Man.", style: { color: C.INFO } },
            ]);
        }
        return true;
    }

    if (saber && mobId === saber.id) {
        saberFallen();
        return true;
    }
    return false;
}

/* Branche dans onWorldAttemptDespawnMob : nos boss ne doivent pas etre
   nettoyes par le monde au milieu d'un combat. */
export function saberPreventDespawn(mobId) {
    if (saber && mobId === saber.id) return "preventDespawn";
    if (leader && mobId === leader.id) return "preventDespawn";
    return null;
}

export function saberJoin(playerId) {
    if (!playerId) return false;
    startHousekeeping();
    /* Un joueur qui revient au milieu de la chasse doit retrouver sa fleche. */
    if (stepOf(playerId) === S.HUNT && SABER_ISLAND.pos) armSecretArrow(playerId);
    return true;
}

export function saberLeave(playerId) {
    if (!playerId) return false;
    clearSecretArrow(playerId);
    /* Le duel appartient a un joueur : s'il part, on range l'arene. */
    if (saber && saber.fighter === playerId) endSaberFight(null);
    return true;
}

export function saberClose() {
    stopSaber();
    stopLeader();
    if (houseTimer) { houseTimer.stop(); houseTimer = null; }
    closeStruct("door");
    closeStruct("curtain");
    return true;
}
