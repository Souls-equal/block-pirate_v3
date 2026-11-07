// gameplay/tutorial.js
//
// LE TUTORIEL DU NOUVEAU JOUEUR
//
// Objectif : un joueur qui arrive pour la premiere fois ne doit pas decrocher
// tout de suite. Il recoit une explication concrete de CE QU'EST le jeu, de
// SON BUT, et une seule chose a faire a la fois :
//
//   1. EQUIPE     choisir son camp chez un recruteur (Pirates / Marines)
//   2. STYLE      prendre le style de combat gratuit du Combat Teacher
//   3. QUETE      parler au Quest Dealer et tuer les mobs de la premiere quete
//   4. ARME       acheter sa premiere arme au First Weapon Dealer
//   -> explication finale : la boucle du jeu (quete -> XP + argent -> armes ->
//      niveaux -> iles plus dures, fruits, boss).
//
// COMMENT ON AVANCE
//   Pas d'evenement a brancher dans chaque fichier : on regarde l'ETAT du
//   joueur (equipe posee ? style achete ? premiere quete commencee ?). Un seul
//   sondage toutes les 2 s, et une etape n'avance que si son etat est vrai.
//   Seule exception, l'arme : les achats passent par un hook (utils/data), et
//   on regarde l'inventaire une fois, en entrant dans l'etape (au cas ou le
//   joueur l'aurait achetee avant).
//
// FICHIERS / DB
//   Deux cles courtes, nouvelles, et rien d'autre :
//     tut  : numero de l'etape en cours (1..4). Absente = pas de tutoriel.
//     tutd : 1 = tutoriel fini (ou passe par un ancien joueur). On ne le refait
//            jamais tout seul.
//
// PROTECTION
//   Tant que l'etape 1 n'est pas finie (pas d'equipe), les autres joueurs ne
//   peuvent pas le blesser : il lit l'explication tranquille. Les mobs, eux,
//   le blessent normalement.

import { C, say, txt, bold, ic } from "../core/theme";
import { confirmAction, deleteStat, getStat, setStat } from "../utils/data";
import { setTimeout, setInterval } from "../utils/timer";
import { getFightingStyle } from "./fightingStyles";

/* ------------------------------------------------------------- reglages --- */

const DB_STEP = "tut";   /* etape en cours (1..4) */
const DB_DONE = "tutd";  /* 1 = termine */

/* Un sondage toutes les 2 s (40 ticks a 20 tps) : assez pour avancer juste
   apres l'action, assez rare pour ne rien couter. */
const POLL = 40;
/* Rappel de l'objectif courant : un toutes les 50 s maximum. */
const REMIND_MS = 50000;

const TEAM_LABEL = { PIRATES: "Pirates", MARINES: "Marines", NONE: "no team" };

/* Les etapes, dans l'ordre. `done(playerId)` = le joueur a fait l'action.
   Aucune fonction ne modifie quoi que ce soit : on ne fait que constater. */
const STEPS = [
    {
        key: "team",
        title: "Choose your side",
        short: "join a team",
        done: (playerId) => getStat(playerId, "team", "NONE") !== "NONE",
        say: (playerId) => [
            ic("fa-solid fa-flag", C.PIRATE),
            bold(" STEP 1/4  Choose your side\n", C.PIRATE),
            txt("Click a ", C.INFO), bold("Pirate Recruiter", C.PIRATE),
            txt(" or a ", C.INFO), bold("Marine Recruiter", C.MARINE),
            txt(".\n", C.INFO),
            txt("Your team gives you your weapon, your team chat, and the players you are allowed to fight.\n", C.INFO),
            txt("Until you pick one, other players cannot hurt you.", C.SUCCESS),
        ],
    },
    {
        key: "style",
        title: "Learn to fight",
        short: "see the Combat Teacher",
        done: (playerId) => !!getFightingStyle(playerId),
        say: () => [
            ic("fa-solid fa-hand-fist", C.MONEY),
            bold(" STEP 2/4  Learn to fight\n", C.MONEY),
            txt("Click the ", C.INFO), bold("Combat Teacher", C.MONEY),
            txt(": your first fighting style is ", C.INFO), bold("free", C.SUCCESS),
            txt(".\n", C.INFO),
            txt("A style replaces bare hands: stronger punches and a dash. Click to punch, hold the style item to move.", C.INFO),
        ],
    },
    {
        key: "quest",
        title: "Your first quest",
        short: "start the first quest",
        done: (playerId) => Number(getStat(playerId, "questProgress", 0)) > 0,
        say: () => [
            ic("fa-solid fa-file-lines", C.XP),
            bold(" STEP 3/4  Your first quest\n", C.XP),
            txt("Click the ", C.INFO), bold("Quest Dealer", C.XP),
            txt(": he gives you the quest of your level and marks it with a ", C.INFO),
            bold("red arrow", C.DANGER),
            txt(".\n", C.INFO),
            txt("Go to the marker and kill the mobs: every kill pays XP and Coins, and the quest pays again when it is done.", C.INFO),
        ],
    },
    {
        key: "weapon",
        title: "Your first weapon",
        short: "buy your first weapon",
        done: (playerId) => hasWeapon(playerId),
        say: () => [
            ic("fa-solid fa-swords", C.MONEY),
            bold(" STEP 4/4  Your first weapon\n", C.MONEY),
            txt("Click the ", C.INFO), bold("First Weapon Dealer", C.MONEY),
            txt(" and buy your team weapon (", C.INFO), bold("60 Coins", C.MONEY),
            txt(").\n", C.INFO),
            txt("Coins come from kills and quests: that is the whole economy. A weapon hits harder than your fists.", C.INFO),
        ],
    },
];

/* Un item est-il une arme ? On teste le NOM (item Bloxd ou nom affiche), jamais
   une liste fermee : une arme ajoutee plus tard compte aussi. */
const WEAPON_RE = /sword|spear|dagger|blade|cutlass|katana|mace|axe|pistol|m1911|gun|rifle|trident|saber/i;

function isWeaponName(name) {
    return typeof name === "string" && WEAPON_RE.test(name);
}

/* Inventaire + Moonstone Chest : l'arme a-t-elle deja ete achetee ? Lu une
   seule fois, en entrant dans l'etape 4. */
function hasWeapon(playerId) {
    let found = false;
    try {
        for (let slot = 0; slot <= 35 && !found; slot++) {
            let item = null;
            try { item = api.getItemSlot(playerId, slot); } catch (e) { item = null; }
            if (!item) continue;
            const shown = item.attributes && item.attributes.customDisplayName;
            found = isWeaponName(item.name) || isWeaponName(shown);
        }
    } catch (e) {}
    return found;
}

/* ------------------------------------------------------------- helpers --- */

function stepOf(playerId) {
    const n = Number(getStat(playerId, DB_STEP, 0));
    return n >= 1 && n <= STEPS.length ? n : 0;
}

function isDone(playerId) {
    return Number(getStat(playerId, DB_DONE, 0)) === 1;
}

function markDone(playerId) {
    deleteStat(playerId, DB_STEP);
    setStat(playerId, DB_DONE, 1);
}

function stepMessage(playerId, index) {
    const step = STEPS[index - 1];
    if (!step) return null;
    try {
        return step.say(playerId, index);
    } catch (e) {
        return null;
    }
}

/* L'objectif en une ligne, pour la sidebar (UI.js). `null` = rien a afficher.
   Cout : une lecture de db, dans un dessin qui en fait deja huit. */
export function tutorialObjective(playerId) {
    if (!playerId) return null;
    const step = stepOf(playerId);
    if (!step) return null;
    return "TUTORIAL " + step + "/" + STEPS.length + "  " + STEPS[step - 1].title;
}

/* ------------------------------------------------------------- etapes --- */

/* Avance tant que l'etat courant est deja satisfait. */
function check(playerId) {
    for (let guard = 0; guard <= STEPS.length; guard++) {
        const index = stepOf(playerId);
        if (!index) return false;
        let ok = false;
        try { ok = !!STEPS[index - 1].done(playerId); } catch (e) { ok = false; }
        if (!ok) return false;
        say(playerId, [
            ic("fa-solid fa-circle-check", C.SUCCESS),
            txt(" " + STEPS[index - 1].title + " - done.", C.SUCCESS),
        ]);
        if (index >= STEPS.length) return finish(playerId);
        setStat(playerId, DB_STEP, index + 1);
        const msg = stepMessage(playerId, index + 1);
        if (msg) say(playerId, msg);
        try { api.playSound(playerId, "exp_levelup", 0.8, 1.2); } catch (e) {}
    }
    return false;
}

/* Fin du tutoriel : l'explication du BUT du jeu, puis plus rien. */
function finish(playerId) {
    markDone(playerId);
    say(playerId, [
        ic("fa-solid fa-trophy", C.MONEY),
        bold(" TUTORIAL COMPLETE\n", C.MONEY),
        txt("The goal: become the strongest on the sea.\n", C.INFO),
        txt("Kills and quests give ", C.INFO), bold("XP", C.XP), txt(" and ", C.INFO), bold("Coins", C.MONEY),
        txt(". XP raises your level and unlocks new, harder islands; Coins buy weapons, boats and fruit rolls.\n", C.INFO),
        txt("The Quest Dealer always has the quest of your level: that is the loop, from level 1 to the top.", C.INFO),
    ]);
    setTimeout(() => {
        say(playerId, [
            ic("fa-solid fa-skull", C.DANGER),
            txt(" What comes next: the ", C.INFO), bold("Fruit Dealer", C.PIRATE),
            txt(" rolls Devil Fruits (a whole set of abilities), and the three bosses - ", C.INFO),
            bold("GARP", C.MARINE), txt(", the ", C.INFO), bold("Saber Expert", C.MONEY),
            txt(" and the ", C.INFO), bold("Mob Leader", C.DANGER),
            txt(" - drop the rarest loot.\n", C.INFO),
            txt("Type in chat to talk to your team, and check the sidebar: it always shows your level, quest and money.", C.INFO),
        ]);
    }, 80);
    return true;
}

/* --------------------------------------------------------- cycle de vie --- */

/* Un vrai nouveau joueur : rien du tout dans sa db. Sert a ne PAS coller le
   tutoriel a un veteran qui aurait efface sa cle par accident. */
function isNewPlayer(playerId) {
    return (
        getStat(playerId, "team", "NONE") === "NONE" &&
        Number(getStat(playerId, "lvl", 1)) <= 1 &&
        !getStat(playerId, "questId", null) &&
        !getFightingStyle(playerId)
    );
}

const welcomed = {}; /* playerId -> 1 : l'accueil n'est envoye qu'une fois par session */

/* Accueil : ce qu'est le jeu, son but, et la premiere chose a faire. Trois
   messages espaces, sinon un seul pave illisible. */
function welcome(playerId) {
    if (welcomed[playerId]) return;
    welcomed[playerId] = 1;
    say(playerId, [
        ic("fa-solid fa-skull", C.MARINE),
        bold(" WELCOME TO BLOCK PIRATE\n", C.MARINE),
        txt("A voxel sea of islands: you start with your fists, and you climb.\n", C.INFO),
        txt("Your goal: become the strongest. Level up, get a Devil Fruit, and beat the bosses at the end of each island.\n", C.INFO),
        txt("Nothing is lost if you leave: your level, money and quest are saved.", C.SUCCESS),
    ]);
    setTimeout(() => {
        say(playerId, [
            ic("fa-solid fa-circle-info", C.XP),
            bold(" HOW IT WORKS\n", C.XP),
            txt("Click to hit. Talk to a merchant (or a teacher) to buy: ", C.INFO),
            bold("two clicks", C.MONEY), txt(" confirm a purchase.\n", C.INFO),
            txt("Quest Dealer = a quest for your level. Kills and quests = XP + Coins. Coins = weapons, boats, fruits.\n", C.INFO),
            txt("The sidebar on the right is your sheet: level, quest, money, stamina.", C.INFO),
        ]);
    }, 70);
    setTimeout(() => {
        const msg = stepMessage(playerId, 1);
        if (msg) say(playerId, msg);
    }, 140);
}

/* A appeler au join, apres le tp de variation (le joueur est en place). */
export function tutorialJoin(playerId) {
    if (!playerId) return false;
    if (isDone(playerId)) {
        /* Nettoyage : une cle d'etape qui traine avec la marque "fini". */
        if (stepOf(playerId)) deleteStat(playerId, DB_STEP);
        return false;
    }
    if (stepOf(playerId)) {
        /* Reprise : on rappelle l'objectif, sans rejouer l'accueil. */
        const index = stepOf(playerId);
        setTimeout(() => {
            const msg = stepMessage(playerId, index);
            if (msg) say(playerId, msg);
        }, 60);
        return true;
    }
    /* Ancien joueur : on ne lui impose pas le tutoriel, on le marque fini. */
    if (!isNewPlayer(playerId)) {
        setStat(playerId, DB_DONE, 1);
        return false;
    }
    setStat(playerId, DB_STEP, 1);
    welcome(playerId);
    return true;
}

export function tutorialLeave(playerId) {
    delete welcomed[playerId];
    delete lastRemind[playerId];
}

/* Un achat (couche utils/data, apres un achat reussi). Acheter une arme EST
   la preuve : inutile de relire l'inventaire, le hook ne se declenche qu'apres
   un achat valide. */
export function notePurchase(playerId, itemName) {
    if (!playerId || stepOf(playerId) !== 4) return false;
    if (!isWeaponName(itemName)) return false;
    return finish(playerId);
}

/* Garde PvP : protege seulement l'etape 1 (pas encore d'equipe). Signature
   (attaquant, cible) comme les autres gardes de utils/combat. */
export function tutorialShield(caster, target) {
    if (!target || caster === target) return false;
    if (stepOf(target) !== 1) return false;
    /* On regarde la team elle-meme : sans ca, la protection survivrait jusqu'au
       sondage suivant (2 s) apres le choix de camp. */
    return getStat(target, "team", "NONE") === "NONE";
}

/* Redemarrage manuel (Code Block / admin) : utile pour tester le parcours. */
export function startTutorial(playerId, force) {
    if (!playerId) return false;
    if (!force && isDone(playerId)) return false;
    deleteStat(playerId, DB_DONE);
    delete welcomed[playerId];
    setStat(playerId, DB_STEP, 1);
    welcome(playerId);
    return true;
}

/* Passer le tutoriel : double clic (meme fenetre que tous les achats), parce
   qu'on ne jette pas une explication sur un clic malheureux. */
const SKIP_KEY = "tutorialSkip";

export function skipTutorial(playerId) {
    if (!playerId) return false;
    if (isDone(playerId)) {
        say(playerId, [
            ic("fa-solid fa-circle-info", C.INFO),
            txt(" The tutorial is already done. ", C.INFO),
            txt("To replay it: startTutorial(playerId)", C.MONEY),
        ]);
        return false;
    }
    /* Meme fenetre que tous les achats : premier clic = on explique, second
       clic DANS la fenetre = c'est fait. */
    if (!confirmAction(playerId, SKIP_KEY, [
        ic("fa-solid fa-circle-xmark", C.DANGER),
        txt(" Skip the tutorial?\n", C.DANGER),
        txt("You keep everything, and you can replay it later with ", C.INFO),
        bold("startTutorial(playerId)", C.MONEY),
        txt(". Click again to skip.", C.INFO),
    ])) return false;
    markDone(playerId);
    say(playerId, [
        ic("fa-solid fa-circle-info", C.INFO),
        bold(" Tutorial skipped.\n", C.INFO),
        txt("You keep everything. The Quest Dealer always has the quest of your level, and the sidebar shows your sheet.", C.INFO),
        txt("\nTo see it again: ", C.INFO), bold("startTutorial(playerId)", C.MONEY),
    ]);
    return true;
}

/* ------------------------------------------------------------- sondage --- */

const lastRemind = {};

function remind(playerId, index) {
    const now = Date.now();
    if (now - (lastRemind[playerId] || 0) < REMIND_MS) return;
    lastRemind[playerId] = now;
    const step = STEPS[index - 1];
    if (!step) return;
    say(playerId, [
        ic("fa-solid fa-list", C.SUCCESS),
        txt(" Tutorial " + index + "/" + STEPS.length + ": ", C.SUCCESS),
        bold(step.short, C.SUCCESS),
        txt("  (skip: skipTutorial)", C.INFO),
    ]);
}

function tickAll() {
    let ids = [];
    try { ids = api.getPlayerIds() || []; } catch (e) { return; }
    for (let i = 0; i < ids.length; i++) {
        const playerId = ids[i];
        const index = stepOf(playerId);
        if (!index) continue;
        let moved = false;
        try { moved = check(playerId) || stepOf(playerId) !== index; } catch (e) { moved = false; }
        if (!moved) remind(playerId, index);
    }
}

let loopStarted = false;

export function startTutorialLoop() {
    if (loopStarted) return;
    loopStarted = true;
    setInterval(tickAll, POLL);
}
