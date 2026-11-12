// UI.js

import { applyControls, confirmAction, getControlMode, isMobilePlayer, setControlMode, getStat, xpToNext } from "../utils/data";
import { playerQuest, questProgress } from "../gameplay/quest";
import { getCrewName } from "./team";
import { getFruit } from "../fruit/index";
import { getFightingStyle } from "../gameplay/fightingStyles";
import { getMaxStamina, getStamina } from "../gameplay/stamina";
import { isOwner } from "./ranks";
import { ISLAND_WARPS_BY_SEA, currentIslands, isVanished } from "./admin";
import { LOBBY, currentVariation, seaFromVariation, variationsSupported } from "../gameplay/variations";
import { getLastDamager } from "../utils/killAttribution";
import { BAR_SIZE, BAR_SIZE_MOBILE, BUDGET_SIDEBAR, C, bar, fit, measure, nfmt, say, txt, bold, ic } from "./theme";

/* Ligne du tutoriel dans la sidebar. UI n'importe PAS gameplay/tutorial (data
   importe UI : ce serait un cycle de plus) : index.js pose la fonction, qui
   renvoie une chaine courte ou null. */
let tutorialLineLookup = null;
export function setTutorialLineLookup(fn) {
    tutorialLineLookup = typeof fn === "function" ? fn : null;
}

export const dCode = "7WGjmPHZrS"

/* Ratio 0..1 et pourcentage. Le dessin est fait par le moteur (ProgressBar,
   cf. `bar()` dans theme.js) : plus de suite de « █ »/« ▒ » a calculer, et un
   rendu constant quelle que soit la police du joueur. */
function makeBar(value, max){
    const ok = Number.isFinite(value) && Number.isFinite(max) && max > 0;
    const ratio = ok ? value / max : 0;
    return {
        ratio: ratio,
        percent: Math.floor(Math.max(0, Math.min(1, ratio)) * 100)
    };
}

/* Barres natives. REGLE : une barre a la couleur de SON TEXTE, pour que
   « XP 1260/23980  5% » et sa barre se lisent comme un seul bloc (demande 74).
   Le vert de succes reste reserve aux messages de succes : sur la sidebar, il
   jurait a cote du cyan de l'XP. L'icone, le texte et la barre partagent donc la
   meme constante — impossible qu'ils divergent.
   Une seule couleur par barre (un degrade couterait ~20 caracteres de JSON de
   plus pour un ecart invisible).
   Taille : elle ne se regle PLUS ici mais dans theme.js (`BAR_SIZE` et
   `BAR_SIZE_MOBILE`, demande 99), a cote de `bar()`. Sans `width`, la barre
   prenait la largeur de la ligne et restait tres fine ; en px elle est lisible
   et sa taille ne depend plus de la police du joueur. */
/* Deux teintes d'AVANT, gardees telles quelles (demande 88) : le cyan du
   titre et de la quete, l'orange du niveau. Elles sont declarees dans
   KEEP_AS_IS (theme.js), sinon le passage a la palette les ramenerait sur
   MARINE (#7dd3fc) et DANGER (#ef4444) — c'est-a-dire a l'interface de la
   refonte 81 que le joueur vient de refuser. */
const LEGACY_TITLE = "#00BFFF"; // cyan d'origine : titre et quete
const LEGACY_LEVEL = "#FF8C00"; // orange d'origine : niveau

/* == LA PALETTE DE LA CARTE (demande 101) : QUATRE couleurs, pas une de plus.
   Chaque couleur distincte est un style distinct dans le message : en reduire
   le nombre reduit le `customTextStyling` envoye au client et laisse de la
   marge sous le budget (demande 100). On est passe de huit teintes (cyan du
   titre, bleu du cadre, orange du niveau, cyan de l'XP, bleu de la stamina,
   rouge du fruit, couleur libre du style, vert du tutoriel) a ces quatre-la :

     1. CYAN   #00BFFF — LA CARTE : cadre, titre, en-tetes de section, ligne
        d'XP et sa barre, quete. C'est le cyan d'origine (demande 88) ;
     2. OR     #FFD700 — LA CARTE DU JOUEUR : nom, mer, prime et pieces ;
     3. ORANGE #FF8C00 — LE NIVEAU, et rien d'autre (teinte d'origine, 88) ;
     4. BLEU   #7DD3FC — L'EFFORT : stamina et sa barre, points de stat,
        objectif du tutoriel.

   Volontairement ecartes : la couleur propre d'un style de combat (une teinte
   libre par style = une couleur de plus, et un rendu qui change d'un joueur a
   l'autre) et le vert du succes. Les barres prennent la couleur de leur texte :
   une de moins a compter. */
const SIDE_FRAME = LEGACY_TITLE;   // cyan d'origine : cadre, titres, XP, quete
const SIDE_LEVEL = LEGACY_LEVEL;   // orange d'origine : le niveau seul
const SIDE_SEA = C.MARINE;         // bleu clair : stamina, stat points, tutoriel
const BAR_XP = [SIDE_FRAME];
const BAR_STAMINA = [SIDE_SEA];
const border = "lightgray"

export function updateSidebar(playerId){
    if (!playerId) return;
    updateLeaderboard(playerId)
    drawSidebar(playerId)
}

export function updateSidebarLight(playerId){
    drawSidebar(playerId)
}

/* --- Sidebar -------------------------------------------------------------
   Le TEXTE de la sidebar est court ; ce qui pese, c'est le stylage : chaque
   partie {str|icon, style} coute 40 a 80 caracteres de JSON, et Bloxd refuse
   un textStyling trop gros (« InternalError: Argument too large », qui remonte
   en « World code tick: ... »). Regles appliquees ici :
     - une seule couleur par partie, et DEUX tailles seulement (le titre et
       le reste, demande 98) : une partie sans `fontSize` repart a la taille
       par defaut du client et casse l'uniformite ;
     - segments de meme style fusionnes, lignes regroupees (moins de parties) ;
     - les textes libres (fruit, style, cible de quete) sont bornes ;
     - si ca depasse quand meme SIDEBAR_BUDGET, on retire les blocs
       secondaires en commencant par le moins utile, JAMAIS tout le message.
   La sidebar ne doit JAMAIS faire planter le tick. */

/* Le budget de la sidebar vient de theme.js (`BUDGET_SIDEBAR`) et non d'une
   constante locale : le patch d'API de theme.js reapplique `fit(...)` avec
   CETTE valeur-la sur `RightInfoText`. Deux constantes separees, c'est deux
   occasions de tronquer la sidebar en douce apres coup. */
const SIDEBAR_BUDGET = BUDGET_SIDEBAR;

/* Coupe un texte libre trop long (nom de fruit, d'ile, liste de cibles). */
function short(text, max){
    const str = String(text === undefined || text === null ? "" : text);
    return str.length > max ? str.slice(0, Math.max(1, max - 1)) + "~" : str;
}

function drawSidebar(playerId){
    const money = getStat(playerId, "money", 0);
    const lvl = getStat(playerId, "lvl", 1);
    const xp = getStat(playerId, "xp", 0);
    const sp = getStat(playerId, "sp", 0);
    /* Fruit et style : affiches SEULEMENT quand le joueur en a un. Une ligne
       « No fruit » / « No style » ne dit rien a un debutant (il ne sait pas
       encore ce que c'est) et prend la place d'une vraie information sur un
       ecran deja plafonne a 1200 caracteres. */
    const fruitName = getFruit(playerId);
    const fruit = fruitName ? short(fruitName, 20) : "";
    const styleName = getFightingStyle(playerId);
    const styleLabel = styleName ? short(styleName, 18) : "";
    const xpNeeded = xpToNext(lvl);
    const xpData = makeBar(xp, xpNeeded);

    const stValue = getStamina(playerId);
    const stMax = getMaxStamina(playerId);
    const stSafe = Number.isFinite(stValue) ? stValue : 0;
    const stMaxSafe = Number.isFinite(stMax) && stMax > 0 ? stMax : 100;
    const stData = makeBar(stSafe, stMaxSafe);

    /* La prime (0 = pas de ligne) et la mer ou le joueur navigue : « Sea 1 »,
       « Sea 2 » ou « Lobby ». Les variations etant coupees, c'est toujours la
       mer 1 - la ligne n'en est pas moins vraie le jour ou elles reviennent. */
    const bounty = bountyOf(playerId);
    const seaInfo = seaFromVariation(currentVariation());
    const seaLabel = (seaInfo && seaInfo.title) || "Sea 1";

    const quest = playerQuest[playerId];
    const progress = questProgress[playerId] || 0;

    /* Blocs dans l'ordre d'affichage. `optional` = peut etre retire sous
       pression du budget ; `priority` = ordre de sacrifice (petit = garde). */
    const blocks = [];
    const block = (parts, optional, priority) => {
        /* `priority || 9` transformait la priorite 0 en 9 : l'objectif du
           tutoriel (« garde en premier ») passait donc en dernier, et `fit()`
           le coupait le premier quand la sidebar debordait. 0 est une priorite
           valide : seul `undefined` prend la valeur par defaut. */
        if (parts && parts.length) blocks.push({ parts: parts, optional: !!optional, priority: priority === undefined ? 9 : priority });
    };

    /* ==========================================================================
       LA CARTE DU NAVIRE (demandes 97, 98 et 100)

       Le joueur a fourni la mise en page d'une sidebar d'un autre jeu et a
       demande la meme chose ici. Trois contraintes ont guide chaque ligne :

         - AUCUNE ICONE, ni Bloxd (« Hunger ») ni Font Awesome : le cadre, les
           ornements (✦ ✧ ★ ◈ ▸) et les mots portent tout le sens. Les signes
           choisis passent tous la liste noire d'emojis de `npm run check` ;
         - LE THEME : la mer, en QUATRE couleurs, pas une de plus (demande
           101) : cyan d'origine (#00BFFF) pour le cadre, les titres, XP, fruit,
           style et quete ; or (#FFD700) pour la carte du joueur ; orange
           d'origine (#FF8C00) pour LVL seul ; bleu clair (#7DD3FC) pour
           stamina, points de stat et tutoriel. Le titre cyan et LVL orange
           restent dans KEEP_AS_IS (demande 88) ;
         - LE BUDGET, et c'est lui qui a cause les deux bugs de la demande 100.

       DEUX REGLES DE STRUCTURE (demande 100), et il faut les comprendre avant
       de toucher a ce bloc :

         1. UNE SECTION = UN BLOC. L'en-tete, ses lignes et ses couleurs vivent
            dans le MEME bloc (`block([...])`), qui est garde ou retire ENTIER
            par le budget. Avant, l'en-tete et ses lignes etaient des blocs
            separes avec des priorites differentes : quand l'en-tete
            « 𝒜𝒷𝒾𝓁𝒾𝓉𝒾𝑒𝓈 » etait retire, la ligne « ◈ Fruit » restait — un fruit
            sans titre, et surtout une ligne sans le \n que portait l'en-tete.
         2. CHAQUE BLOC COMMENCE PAR UN \n, sauf le titre qui ouvre la carte.
            Le saut de ligne n'est JAMAIS porte par le bloc precedent : sinon,
            des que ce bloc-la est retire, la section suivante se colle a la
            barre de progression (le fruit qui « saute » d'une ligne a l'autre).
            Corollaire : aucune constante de cadre ne contient de \n.

       Ordre d'affichage : titre, identite, progression, pouvoirs, tutoriel,
       quete (tout en bas, demande 87), pied du cadre.

       Budget : `priority` = ordre de SACRIFICE (petit = garde en premier).
       Obligatoires, jamais retires : le titre, la section progression
       (en-tete + niveau + les deux barres) et le pied du cadre.
       Ensuite : tutoriel (0), quete (1), pouvoirs (8), carte du joueur (10 :
       nom, mer, prime, pieces). Les points de stat sont colles a la stamina et
       le pied du cadre a la derniere section : deux parties de moins, ~120
       caracteres de JSON economises.
       ========================================================================== */

    /* Le cadre. Aucune de ces constantes ne finit par \n : c'est chaque bloc
       qui ouvre son texte par un saut de ligne (regle 2 ci-dessus). */
    const FRAME_TOP = "\u2554\u2550\u2550\u2550\u2550\u2550\u2550 \u2726 \u2550\u2550\u2550\u2550\u2550\u2557";
    const FRAME_BOT = "\u255A\u2550\u2550\u2550\u2550\u2550\u2550 \u2726 \u2550\u2550\u2550\u2550\u2550\u255D";
    const FRAME_MID = "\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 \u2726 \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563";
    const FRAME_END = "\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 \u2726 \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D";

    /* == LES TAILLES (demande 98) ==========================================
       Deux tailles seulement, comme sur la reference : le titre un cran
       au-dessus, tout le reste pareil. Sur mobile on descend d'un cran de plus,
       et les barres suivent (elles viennent de theme.js, demande 99). */
    const mob = isMobilePlayer(playerId);
    const TITLE_SIZE = mob ? "0.95em" : "1.05em";
    const BODY_SIZE = mob ? "0.7em" : "0.8em";
    const BAR_PX = mob ? BAR_SIZE_MOBILE : BAR_SIZE;
    const body = (str, color, extra) => txt(str, color, Object.assign({ fontSize: BODY_SIZE }, extra || {}));

    /* LE TITRE : le nom du jeu, jamais sacrifie (demande 88). Le nom est
       centre par des ESPACES INSECABLES : le client avale les espaces
       ordinaires en debut de ligne, un \u00A0 est un caractere comme un autre
       et reste. */
    const PAD_L = "\u00A0\u00A0\u00A0";
    block([
        txt(FRAME_TOP + "\n" + PAD_L + "  𝓑𝓵𝓸𝓬𝓴 𝓟𝓲𝓻𝓪𝓽𝓮\n" + FRAME_BOT, LEGACY_TITLE, {fontWeight: "bold", fontSize: TITLE_SIZE}),
    ]);

    /* == IDENTITE : qui il est, et ce qu'il a en poche (un seul bloc). ======
       Nom, mer, prime et pieces : une seule PARTIE, donc un seul style. La
       prime de 0 ne s'affiche pas : « Bounty: 0 » ne dit rien et coute une
       ligne entiere. */
    let playerName = "Unknown";
    try { playerName = api.getEntityName(playerId) || "Unknown"; } catch (e) {}
    block([
        body("\n \u2726 𝒫𝓁𝒶𝓎𝑒𝓇\n \u25C8 " + short(playerName, 16) + " \u25AA " + seaLabel + (bounty > 0 ? "\n \u2605 Bounty: " + nfmt(bounty) : "") + "\n \u2605 Coins: " + nfmt(money), C.MONEY),
    ], true, 10);

    /* == PROGRESSION : l'en-tete, le niveau et les deux barres. =============
       Obligatoire : sans le niveau ni les deux barres, la carte ne dit plus
       ou en est le joueur. L'en-tete et le niveau sont dans le meme bloc
       (couleurs differentes, c'est permis : un bloc est un GROUPE de parties,
       le budget ne regarde que leur somme). */
    block([
        body("\n" + FRAME_MID + "\n \u2726 𝐿𝑒𝓋𝑒𝓁𝒾𝓃𝑔", SIDE_FRAME),
        body("\n LVL " + lvl, SIDE_LEVEL),
    ]);

    /* L'XP : la ligne de chiffres, puis sa barre juste dessous. La partie
       suivante ouvre par un \n, donc la barre est bien suivie d'un retour. */
    block([
        body("\n XP " + nfmt(xp) + "/" + nfmt(xpNeeded) + "  " + xpData.percent + "%\n", SIDE_FRAME),
        bar(xpData.ratio, BAR_XP, BAR_PX),
    ]);

    /* La stamina, meme disposition que l'XP. Les points de stat sont sur la
       meme PARTIE (une ligne en dessous, avant la barre) : meme couleur, donc
       un style de moins dans le message. Le `body("")` precedent, quand le
       joueur n'avait aucun point, envoyait carrement une partie `undefined`. */
    block([
        body(
            "\n \u2727 Stamina " + Math.round(stSafe) + "/" + Math.round(stMaxSafe) + "  " + stData.percent + "%\n" +
            (sp > 0 ? " \u2727 Skill Points: " + sp + "\n" : ""),
            SIDE_SEA
        ),
        bar(stData.ratio, BAR_STAMINA, BAR_PX),
    ]);

    /* == POUVOIRS : le fruit et le style de combat, dans UN bloc. ==========
       Rien du tout quand le joueur n'en a pas (demande 89 : ni section vide, ni
       « No fruit »). Comme l'en-tete fait partie du bloc, il ne peut plus
       s'afficher sans ses lignes ni disparaitre en les laissant seules. */
    if (fruit || styleLabel) {
        /* L'en-tete et ses lignes dans la MEME partie : tout est en
           SIDE_FRAME, donc un seul style au lieu de deux (demande 101). Les
           lignes gardent leur place sous l'en-tete grace a leur \n. */
        const powerLines = [];
        if (fruit) powerLines.push("\n \u25C8 Fruit: " + fruit);
        if (styleLabel) powerLines.push("\n \u25C8 Style: " + styleLabel);
        block([
            body("\n" + FRAME_MID + "\n \u2726 𝒜𝒷𝒾𝓁𝒾𝓉𝒾𝑒𝓈/𝒞𝒶𝓅𝒶𝒸𝒾𝓉𝒾𝑒𝓈" + powerLines.join(""), SIDE_FRAME),
        ], true, 8);
    }

    /* L'OBJECTIF DU TUTORIEL, juste avant la quete. Priorite 0 : garde en
       premier, jamais sacrifie par le budget. */
    const tut = tutorialLineLookup ? tutorialLineLookup(playerId) : null;
    if (tut) {
        block([
            body("\n" + FRAME_MID + "\n \u2726 𝒯𝓊𝓉𝑜𝓇𝒾𝒶𝓁\n \u25B8 " + short(tut, 44), SIDE_SEA),
        ], true, 0);
    }

    /* LA QUETE, TOUT EN BAS (demande 87) : l'en-tete, la cible, puis la
       progression et l'ile, dans un seul bloc. */
    if (quest) {
        const targetText = short(Array.isArray(quest.targetMob) ? quest.targetMob.join(" / ") : quest.targetMob, 22);
        const percent = quest.killAmount > 0 ? Math.floor((progress / quest.killAmount) * 100) : 0;
        block([
            body("\n" + FRAME_MID + "\n \u2726 𝒬𝓊𝑒𝓈𝓉𝓈\n \u25B8 " + targetText + "\n \u25B8 " + progress + "/" + quest.killAmount + " (" + percent + "%)  " + short(quest.island, 14), SIDE_FRAME),
        ], true, 1);
    }




    /* Budget : les blocs obligatoires passent toujours, puis les secondaires
       sont ajoutes du plus utile au moins utile tant que ca tient, et
       reassembles dans l'ordre d'affichage.
       Les blocs acceptes s'ADDITIONNENT (`chosen`) : tester chacun contre les
       seuls blocs obligatoires laissait passer plusieurs optionnels dont la
       somme depassait, et `fit()` coupait alors la fin de la sidebar — le plus
       souvent l'objectif du tutoriel, qui a pourtant la priorite la plus haute
       (0 = garde en premier). Les barres natives, plus lourdes en JSON que les
       anciennes suites de « █ », ont rendu le probleme visible. */
    /* Le pied du cadre, JAMAIS retire : un cadre ouvert se lit mal. Il n'est
       pas un bloc a part entiere — il se recolle a la derniere partie de texte
       (~60 caracteres de JSON economises). `withFooter` rend donc la liste
       REELLE qui partira au client, et c'est ELLE que le budget mesure :
       mesurer sans le pied liait la selection a une taille qui n'existe pas. */
    const withFooter = (list) => {
        const out = list.slice();
        const at = out.length - 1;
        const last = out[at];
        /* On ALLONGE la derniere partie, on ne la remplace pas. La version
           precedente fusionnait les deux dernieres parties : elle jetait donc
           le texte de la derniere (le tutoriel en priorite 0, ou la quete) —
           exactement le « il manque une section » de la demande 100. */
        if (last && typeof last.str === "string") {
            out[at] = Object.assign({}, last, { str: last.str + "\n" + FRAME_END });
        } else {
            out.push(body("\n" + FRAME_END, SIDE_FRAME));
        }
        return out;
    };

    const chosen = [];
    for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        if (b.optional) continue;
        for (let j = 0; j < b.parts.length; j++) chosen.push(b.parts[j]);
    }
    const optional = blocks.filter((b) => b.optional).sort((a, b) => a.priority - b.priority);
    for (let i = 0; i < optional.length; i++) {
        const trial = chosen.concat(optional[i].parts);
        if (measure(withFooter(trial)) > SIDEBAR_BUDGET) continue;
        for (let j = 0; j < optional[i].parts.length; j++) chosen.push(optional[i].parts[j]);
        optional[i].keptUnderBudget = true;
    }

    const picked = [];
    for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        if (b.optional && !b.keptUnderBudget) continue;
        for (let j = 0; j < b.parts.length; j++) picked.push(b.parts[j]);
    }
    const parts = withFooter(picked);


    try {
        api.setClientOption(playerId, "RightInfoText", fit(parts, SIDEBAR_BUDGET));
    } catch (e) {}
}

/* Prime d'un joueur (0 si absente ou illisible). */
function bountyOf(playerId){
    const n = Math.floor(Number(getStat(playerId, "bounty", 0)));
    return n > 0 ? n : 0;
}

/* SETUP TABLE STRUCTURE */
export function setupLeaderboard(playerId){
    try {
        api.setClientOption(playerId, "lobbyLeaderboardInfo", {
            name:  { displayName: "Name",  sortPriority: 11 },
            level: { displayName: "Level", sortPriority: 0 },
            xp:    { displayName: "XP %",  sortPriority: 2 },
            money: { displayName: "Money", sortPriority: 1 },
            bounty: { displayName: "Bounty", sortPriority: 3 },
            team:  { displayName: "Team",  sortPriority: 9 },
            crew:  { displayName: "Crew",  sortPriority: 10 },
        });
    } catch (e) {}
}

/* UPDATE PLAYER VALUES */
export function updateLeaderboard(playerId){

    const lvl = getStat(playerId, "lvl", 1);
    const money = getStat(playerId, "money", 0);
    const xp = getStat(playerId, "xp", 0);
    const crew = getCrewName(playerId) || "NONE";
    const team = getStat(playerId, "team", "NONE");
    /* Prime : lue directement en DB (pas d'import croise avec team.js,
       sinon un fichier non recopie casserait tout le module UI). */
    const bounty = bountyOf(playerId);
    const xpNeeded = xpToNext(lvl);
    const xpPercent = xpNeeded > 0 ? Math.floor((xp / xpNeeded) * 100) : 0;

    /* Un joueur qui vient de se déconnecter fait lever une ApiError : on
       l'ignore silencieusement pour ne jamais casser l'affichage des autres. */
    try {
        api.setTargetedPlayerSettingForEveryone(playerId, "lobbyLeaderboardValues", {
            level: lvl,
            money: money,
            xp: xpPercent,
            team: team,
            crew: crew,
            bounty: bounty,
        });
    } catch (e) {}
}

/* TEAM COLOR ON LEADERBOARD */
export function updateLeaderboardColor(playerId){

    const team = getStat(playerId, "team", "NONE");

    const colorMap = {
        PIRATES: C.PIRATE,
        MARINES: C.MARINE,
        REVOLUTIONARIES: C.SUCCESS,
        NONE: C.INFO
    };

    try {
        api.setTargetedPlayerSettingForEveryone(
            playerId,
            "colorInLobbyLeaderboard",
            colorMap[team] || "#aaaaaa"
        );
    } catch (e) {}
}

/* REFRESH SINGLE PLAYER */

export function refreshLeaderboardPlayer(playerId) {
    if (isVanished(playerId)) {
        try {
            api.setTargetedPlayerSettingForEveryone(playerId, "lobbyLeaderboardValues", {}, true);
            api.setTargetedPlayerSettingForEveryone(playerId, "colorInLobbyLeaderboard", "", true);
            api.setTargetedPlayerSettingForEveryone(playerId, "lobbyLeaderboardTags", null, true);
        } catch (e) {}
        return;
    }
    updateLeaderboard(playerId);
    updateLeaderboardColor(playerId);
}

/* REFRESH ALL PLAYERS (SORTED) */
export function refreshLeaderboardAll(){
    const players = api.getPlayerIds();
    const data = players.map(id => {
        const lvl = getStat(id, "lvl", 1);
        const money = getStat(id, "money", 0);
        const xp = getStat(id, "xp", 0);
        const xpNeeded = xpToNext(lvl);
        const xpPercent = xpNeeded > 0 ? Math.floor((xp / xpNeeded) * 100) : 0;
        const bounty = bountyOf(id);
        return {
            id,
            lvl,
            money,
            xp: xpPercent,
            bounty: bounty,
        }
    });
    /* SORT BY LEVEL (BLOX FRUITS STYLE) */
    data.sort((a, b) => b.lvl - a.lvl);
    for (let p of data){
        updateLeaderboard(p.id);
        updateLeaderboardColor(p.id);
    }
}

export function onPlayerJoinLeaderboard(playerId){
    setupLeaderboard(playerId);
    refreshLeaderboardPlayer(playerId);
}

export function joinUI(playerId) {
    api.setClientOption(playerId, "headerChips", [
        { content: [bold("Discord:", "#5865F2")], showBackground: true },
        { content: [txt(["discord.", "gg", "/",dCode].join(""), C.INFO)], showBackground: true },
        { content: [ic("fa-solid fa-brands fa-discord", C.MARINE), bold(" Join Now! ", C.MONEY)], showBackground: false }
    ]);

    /* Les fleches d'iles ne sont plus reservees a un compte : elles sont
       posees, pour tout le monde, par la categorie Settings (voir plus bas). */
    try { setupSettingsShop(playerId); } catch (e) {}

    /* Confort du proprietaire du monde, sans effet sur le jeu (ni fleche, ni
       avantage en combat) : vol plus rapide et coordonnees affichees. Le rang
       decide, pas un pseudo ecrit dans le code. */
    if (isOwner(playerId)) {
        try {
            api.setClientOptions(playerId, {
                "flySpeedMultiplier": 2,
                "hideCoordinates": false,
            });
        } catch (e) {}
    }
}

/* ==========================================================================
   SETTINGS (boutique, visible par TOUS, SAUF dans le lobby)

   Reglages personnels, sans achat ni argent :

     1. Island Arrows — les iles de la MER ou l'on se trouve (core/admin.js :
        ISLAND_WARPS_BY_SEA), une fleche par ile, chacune de la couleur de son
        theme. Deux listes deroulantes font le menage a l'ecran :
           "Hide an island" ne propose QUE les iles affichees ;
           "Show an island" ne propose QUE les iles cachees.
        Valider deplace l'ile d'une liste vers l'autre, donc une ile ne peut
        jamais etre dans les deux (ni disparaitre des deux).
        L'item du haut est l'interrupteur general (tout montrer / tout cacher).
     2. Respawn — tue le joueur pour le debloquer (coince dans un bloc, tombe
        hors de la map...). Refuse s'il vient de se faire frapper par un
        joueur : sinon c'est une sortie de combat gratuite.
     3. PvP Protection — la protection de 5 minutes accordee contre son tueur
        au respawn (voir utils/combat). Desactivable : plus de bouclier, et la
        protection deja active tombe immediatement.

   PAS DE SETTINGS DANS LE LOBBY (variation "default") : il n'y a ni ile ni mer
   a y regler. Tant que les variations sont coupees (VARIATIONS_ENABLED dans
   gameplay/variations.js), le monde EST la mer 1 : les Settings sont donc
   toujours la. Le jeu recharge le joueur a chaque saut de variation, donc un
   simple test au join suffit : dans une mer la categorie existe, dans le lobby
   elle n'existe pas (et nos fleches sont effacees au passage).

   Reglages stockes en db JOUEUR (trois cles nouvelles, courtes) :
     "dirArrow" = 0        -> plus aucune fleche d'ile (defaut : affichees)
     "arrowOff" = "JU,DE"  -> codes des iles masquees une par une
     "pvpProt"  = 0        -> protection automatique refusee (defaut : acceptee)
   ========================================================================== */

const SETTINGS_CATEGORY = "settings";
/* Couleurs des cartes : des ROLES de la palette, pas des teintes choisies
   une par une. Une fleche d'ile est de l'information de navigation (bleu),
   cacher/remettre reprend le rouge/vert de « off/on », et le respawn garde
   l'or de l'argent qu'il coutait autrefois. */
const SETTING_ARROW_COLOR = C.MARINE;
const SETTING_HIDE_COLOR = C.DANGER;
const SETTING_SHOW_COLOR = C.SUCCESS;
const SETTING_RESPAWN_COLOR = C.MONEY;
const SETTING_PROTECT_COLOR = C.SUCCESS;
const SETTING_CONTROLS_COLOR = C.MARINE;
/* Valeur affichee dans une liste vide : l'API veut au moins une option, et un
   libelle entre parentheses ne peut pas etre confondu avec une ile. */
const EMPTY_CHOICE = "(nothing left)";

/* Une couleur par ile, choisie sur son theme, et un code court qui sert de cle
   de reglage : deux iles ne doivent jamais partager un code, sinon cacher l'une
   cacherait l'autre. Toute ile ajoutee sans theme ici recoit ses initiales et
   le gris neutre (voir islandTheme) : elle marche quand meme. */
const ISLAND_STYLE = {
    "Starter Pirate":   { code: "SP", color: "#F0A35E" },  /* sable du depart */
    "Middle Town":      { code: "MT", color: "#9AA7B4" },  /* pierre de la ville */
    "Starter Marine":   { code: "SM", color: "#5AA9E6" },  /* uniforme marine */
    "Jungle":           { code: "JU", color: "#4CAF50" },  /* feuilles */
    "Pirate Village":   { code: "PV", color: "#C0392B" },  /* rouge pirate */
    "Desert":           { code: "DE", color: "#E5C15A" },  /* sable chaud */
    "Snow Village":     { code: "SV", color: "#A8E0F5" },  /* glace */
    "Marine Fortress":  { code: "MF", color: "#2F5FA8" },  /* bleu profond */
    "Skylands":         { code: "SK", color: "#B388E8" },  /* violet du ciel */
};

function islandTheme(name) {
    const style = ISLAND_STYLE[name];
    if (style) return style;
    const initials = String(name).split(/\s+/).map(function (w) { return w[0] || ""; }).join("").toUpperCase();
    return { code: (initials.slice(0, 2) || "IL"), color: C.INFO };
}

/* Identifiant stable d'une fleche : une ile = une fleche, donc la masquer ne
   touche jamais la fleche de quete (qui a son propre id). */
function islandArrowId(name) {
    return "isle-" + String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/* Les iles de la mer courante. Une seule lecture par affichage : le lobby (ou
   une mer pas encore declaree) renvoie un objet vide, jamais null. */
function islandNames() {
    return Object.keys(currentIslands());
}

function settingOn(playerId, key, fallback) {
    let v = null;
    try { v = api.getPlayerDbValue(playerId, key); } catch (e) { return fallback; }
    if (v === undefined || v === null || v === "") return fallback;
    return !(v === 0 || v === "0" || v === false);
}

function settingSet(playerId, key, on) {
    try { api.setPlayerDbValue(playerId, key, on ? 1 : 0); return true; }
    catch (e) { return false; }
}

export function islandArrowsEnabled(playerId) {
    return settingOn(playerId, "dirArrow", true);
}

export function pvpProtectionEnabled(playerId) {
    return settingOn(playerId, "pvpProt", true);
}

/* Iles masquees une par une : une seule cle db, une liste de codes courts.
   Lue une fois par affichage (pas une lecture de base par ile). */
function hiddenIslands(playerId) {
    const out = {};
    let v = null;
    try { v = api.getPlayerDbValue(playerId, "arrowOff"); } catch (e) { return out; }
    if (typeof v !== "string") return out;
    const codes = v.split(",");
    for (let i = 0; i < codes.length; i++) {
        const code = codes[i].trim().toUpperCase();
        if (code) out[code] = true;
    }
    return out;
}

/* On n'enregistre que les codes des iles de la mer courante : la liste reste
   courte, et une ile d'une autre mer ne peut pas s'y glisser. */
function saveHiddenIslands(playerId, hidden) {
    const list = [];
    for (const name in currentIslands()) {
        const code = islandTheme(name).code;
        if (hidden[code] && list.indexOf(code) === -1) list.push(code);
    }
    try { api.setPlayerDbValue(playerId, "arrowOff", list.join(",")); return true; }
    catch (e) { return false; }
}

/* Une ile est-elle visible pour ce joueur ? Sert au panneau ET a l'ancien
   format d'items (un bouton par ile, voir handleSettingsShop). */
function islandArrowVisible(playerId, name) {
    if (!islandArrowsEnabled(playerId)) return false;
    return !hiddenIslands(playerId)[islandTheme(name).code];
}

/* Cle de l'ancien format : un item par ile ("isle_ju"). On garde la lecture :
   un client qui a encore ces items en boutique doit pouvoir cliquer dessus,
   sinon le clic ne fait rien du tout. Aucun nouvel item n'est cree avec. */
function islandItemKey(name) {
    return "isle_" + islandTheme(name).code.toLowerCase();
}

/* Les deux listes du panneau : ce qui est affiche, ce qui est cache. */
function shownIslandNames(playerId) {
    const all = islandArrowsEnabled(playerId);
    const hidden = hiddenIslands(playerId);
    const out = [];
    for (const name of islandNames()) if (all && !hidden[islandTheme(name).code]) out.push(name);
    return out;
}

function hiddenIslandNames(playerId) {
    const shown = shownIslandNames(playerId);
    return islandNames().filter(function (name) { return shown.indexOf(name) === -1; });
}

/* Pose (ou efface) les fleches d'iles du joueur, avec la couleur de chaque ile.
   Ne touche qu'a NOS ids : la fleche de quete survit a tous les reglages. */
export function applyIslandArrows(playerId) {
    if (!playerId) return false;
    const all = islandArrowsEnabled(playerId);
    const hidden = hiddenIslands(playerId);
    for (const name in currentIslands()) {
        const id = islandArrowId(name);
        const theme = islandTheme(name);
        const on = all && !hidden[theme.code];
        try {
            if (on) {
                api.setDirectionArrow(playerId, id, currentIslands()[name], name, false, {
                    color: theme.color,
                    fontSize: "17px",
                    fontWeight: "bold",
                });
            } else if (typeof api.clearDirectionArrow === "function") {
                api.clearDirectionArrow(playerId, id);
            }
        } catch (e) {}
    }
    return all;
}

/* Efface nos fleches, dans TOUTES les mers declarees : un joueur qui change de
   variation ne doit pas laisser de fleche derriere lui. */
function clearIslandArrows(playerId) {
    if (!playerId || typeof api.clearDirectionArrow !== "function") return false;
    for (const sea in ISLAND_WARPS_BY_SEA) {
        for (const name in ISLAND_WARPS_BY_SEA[sea]) {
            try { api.clearDirectionArrow(playerId, islandArrowId(name)); } catch (e) {}
        }
    }
    return true;
}

/* Les Settings n'ont de sens que dans une mer. Sans le support des variations,
   le monde EST la mer (comportement d'avant les mers). */
export function settingsAvailableHere() {
    if (!variationsSupported()) return true;
    return currentVariation() !== LOBBY.variation;
}

function settingsSay(playerId, parts) {
    try { say(playerId, parts); } catch (e) {}
}

/* Recree les items : c'est ce qui met a jour l'etat affiche (compteur, titres,
   et surtout les options des deux listes deroulantes). */
function createSettingsItems(playerId) {
    const total = islandNames().length;
    const shown = shownIslandNames(playerId);
    const hidden = hiddenIslandNames(playerId);
    const all = islandArrowsEnabled(playerId);
    const protect = pvpProtectionEnabled(playerId);
    const byButtons = getControlMode(playerId) === "buttons";

    /* ANATOMIE COMMUNE DES CARTES DE REGLAGE (et de toutes les boutiques) :
       titre, puis dans la description :
         1. une icone + une phrase qui dit CE QUE CA FAIT ;
         2. une ligne d'etat « ● … » : une seule, celle qui change ;
         3. une phrase d'aide en gris (INFO), pour l'action elle-meme.
       Avant, chaque carte racontait ca dans son ordre et sa couleur : la ligne
       d'etat etait tantot avant, tantot apres, et deux cartes se terminaient
       par une phrase plus foncee que les autres (illisible sur le fond sombre).
       Le gris « INFO » est la couleur des explications, partout. */

    /* Interrupteur general. */
    try {
        api.createShopItemForPlayer(playerId, SETTINGS_CATEGORY, "set_arrows", {
            image: "Compass",
            imageColour: SETTING_ARROW_COLOR,
            canBuy: true,
            cost: 0,
            sortPriority: 50,
            customTitle: [bold("Island Arrows [" + shown.length + "/" + total + "]", SETTING_ARROW_COLOR)],
            buyButtonText: [txt(all ? "Hide all" : "Show all", SETTING_ARROW_COLOR)],
            description: [
                ic("fa-solid fa-map-marker-check", SETTING_ARROW_COLOR),
                txt(" One arrow per island, in the colour of that island.", C.INFO),
                shown.length > 0
                    ? bold("\n● " + shown.length + " of " + total + " arrows shown", C.SUCCESS)
                    : bold("\n● No arrow shown", C.DANGER),
                txt("\nPick the islands you need below.", C.INFO),
            ],
        });
    } catch (e) {}

    /* Masquer : ne propose que ce qui est affiche. */
    try {
        api.createShopItemForPlayer(playerId, SETTINGS_CATEGORY, "set_arrows_hide", {
            image: "Compass",
            imageColour: SETTING_HIDE_COLOR,
            canBuy: true,
            cost: 0,
            sortPriority: 48,
            customTitle: [bold("Hide an island", SETTING_HIDE_COLOR)],
            buyButtonText: [txt("Hide", SETTING_HIDE_COLOR)],
            userInput: { type: "dropdown", dropdownOptions: shown.length ? shown : [EMPTY_CHOICE] },
            description: [
                ic("fa-solid fa-eye-slash", SETTING_HIDE_COLOR),
                txt(" Remove one arrow from your screen.", C.INFO),
                bold("\n● Shown now: ", C.INFO),
                txt(shown.length ? shown.join(", ") : "nothing", C.SUCCESS),
                txt("\nThe island moves to the other list.", C.INFO),
            ],
        });
    } catch (e) {}

    /* Montrer : ne propose que ce qui est cache. */
    try {
        api.createShopItemForPlayer(playerId, SETTINGS_CATEGORY, "set_arrows_show", {
            image: "Compass",
            imageColour: SETTING_SHOW_COLOR,
            canBuy: true,
            cost: 0,
            sortPriority: 47,
            customTitle: [bold("Show an island", SETTING_SHOW_COLOR)],
            buyButtonText: [txt("Show", SETTING_SHOW_COLOR)],
            userInput: { type: "dropdown", dropdownOptions: hidden.length ? hidden : [EMPTY_CHOICE] },
            description: [
                ic("fa-solid fa-eye", SETTING_SHOW_COLOR),
                txt(" Bring one arrow back on your screen.", C.INFO),
                bold("\n● Hidden now: ", C.INFO),
                txt(hidden.length ? hidden.join(", ") : "nothing", C.DANGER),
                txt("\nThe island moves to the other list.", C.INFO),
            ],
        });
    } catch (e) {}

    /* Choix des commandes (demande 77). PC seulement : un ecran tactile n'a
       qu'UN bouton supplementaire, celui du dash, donc ses capacites passent
       par les items et il n'a rien a choisir (demande 92). */
    if (!isMobilePlayer(playerId)) {
        try {
            api.createShopItemForPlayer(playerId, SETTINGS_CATEGORY, "set_controls", {
                image: byButtons ? "Swap Orb" : "Moonstone Dust",
                imageColour: SETTING_CONTROLS_COLOR,
                canBuy: true,
                cost: 0,
                sortPriority: 30,
                customTitle: [bold("Controls [" + (byButtons ? "BUTTONS" : "ITEMS") + "]", SETTING_CONTROLS_COLOR)],
                buyButtonText: [txt(byButtons ? "Use items" : "Use buttons", SETTING_CONTROLS_COLOR)],
                description: [
                    ic(byButtons ? "fa-solid fa-computer-mouse" : "fa-solid fa-backpack", SETTING_CONTROLS_COLOR),
                    txt(byButtons
                        ? " Keyboard: the items in your hand open the keys."
                        : " Items: one item per ability.", C.INFO),
                    bold("\n● " + (byButtons ? "BUTTONS" : "ITEMS"), C.SUCCESS),
                    txt(byButtons
                        ? " — Q dash, Z X C V F fruit, Z X style."
                        : " — click an ability item, right click to dash.", C.INFO),
                    txt(byButtons
                        ? "\nSwitch back if you prefer items."
                        : "\nSwitch if you prefer the buttons.", C.INFO),
                ],
            });
        } catch (e) {}
    }

    try {
        api.createShopItemForPlayer(playerId, SETTINGS_CATEGORY, "set_respawn", {
            image: "Moonstone Orb",
            imageColour: SETTING_RESPAWN_COLOR,
            canBuy: true,
            cost: 0,
            sortPriority: 20,
            customTitle: [bold("Respawn", SETTING_RESPAWN_COLOR)],
            buyButtonText: [txt("Respawn", SETTING_RESPAWN_COLOR)],
            description: [
                ic("fa-solid fa-user-clock", SETTING_RESPAWN_COLOR),
                txt(" Kill yourself and come back at your spawn.", C.INFO),
                bold("\n● Stuck in a block, or under the map?", C.INFO),
                txt("\nClick twice to confirm. Refused within 10 seconds of a hit from a player.", C.INFO),
            ],
        });
    } catch (e) {}

    try {
        api.createShopItemForPlayer(playerId, SETTINGS_CATEGORY, "set_protect", {
            image: "Shield Potion",
            imageColour: SETTING_PROTECT_COLOR,
            canBuy: true,
            cost: 0,
            sortPriority: 10,
            customTitle: [bold("PvP Protection [" + (protect ? "ON" : "OFF") + "]", SETTING_PROTECT_COLOR)],
            buyButtonText: [txt(protect ? "Disable" : "Enable", SETTING_PROTECT_COLOR)],
            description: [
                ic("fa-solid fa-shield-halved", SETTING_PROTECT_COLOR),
                txt(" A 5-minute shield after a player kills you.", C.INFO),
                protect
                    ? bold("\n● ON", C.SUCCESS)
                    : bold("\n● OFF", C.DANGER),
                txt(protect
                    ? " — your killer cannot hit you; it drops if you hit them."
                    : " — you accept every hit again, your killer included.", C.INFO),
            ],
        });
    } catch (e) {}
}

/* Cree la categorie et ses items. Appele au join : dans une mer seulement. */
export function setupSettingsShop(playerId) {
    if (!playerId) return false;
    if (!settingsAvailableHere()) {
        /* Lobby : rien a regler, et on ne laisse pas trainer de fleches d'une
           mer precedente. */
        clearIslandArrows(playerId);
        return false;
    }
    try {
        api.configureShopCategoryForPlayer(playerId, SETTINGS_CATEGORY, {
            customTitle: "Settings",
            autoSelectCategory: false,
            sortPriority: 190,
        });
    } catch (e) {}
    createSettingsItems(playerId);
    applyIslandArrows(playerId);
    return true;
}

/* « Tout montrer / tout cacher ». Tout montrer efface aussi les exceptions
   individuelles : l'interrupteur general doit vraiment tout rallumer. */
function toggleIslandArrows(playerId) {
    const want = !islandArrowsEnabled(playerId);
    settingSet(playerId, "dirArrow", want);
    if (want) saveHiddenIslands(playerId, {});
    createSettingsItems(playerId);
    applyIslandArrows(playerId);
    settingsSay(playerId, [
        ic("fa-solid fa-map-marker-check", SETTING_ARROW_COLOR),
        bold(want ? " All island arrows shown." : " All island arrows hidden.", SETTING_ARROW_COLOR),
    ]);
}

/* Le nom choisi dans une liste. Insensible a la casse, mais jamais devine :
   une valeur inconnue (ou la ligne "(nothing left)") renvoie null. */
function resolveIslandName(input) {
    const raw = String(input == null ? "" : input).trim();
    if (!raw) return null;
    const islands = currentIslands();
    if (islands[raw]) return raw;
    const lower = raw.toLowerCase();
    for (const name in islands) if (name.toLowerCase() === lower) return name;
    return null;
}

/* Une ile a la fois. Cas utile : tout est cache et on veut UNE ile — on ne
   rallume qu'elle, les autres restent masquees (pas besoin de huit clics). */
function setIslandShown(playerId, name, want) {
    const theme = islandTheme(name);
    const all = islandArrowsEnabled(playerId);
    const hidden = hiddenIslands(playerId);
    const isShown = all && !hidden[theme.code];

    if (isShown === want) {
        settingsSay(playerId, [
            ic("fa-solid fa-circle-info", C.INFO),
            txt(" " + name + (want ? " is already shown." : " is already hidden."), C.INFO),
        ]);
        return false;
    }

    let onlyOne = false;
    if (!want) {
        hidden[theme.code] = true;
        saveHiddenIslands(playerId, hidden);
    } else {
        if (!all) {
            for (const other of islandNames()) {
                if (other !== name) hidden[islandTheme(other).code] = true;
            }
            settingSet(playerId, "dirArrow", true);
            onlyOne = true;
        }
        delete hidden[theme.code];
        saveHiddenIslands(playerId, hidden);
    }

    createSettingsItems(playerId);
    applyIslandArrows(playerId);
    settingsSay(playerId, [
        ic("fa-solid fa-map-marker-check", theme.color),
        bold(" " + name + " ", theme.color),
        txt(want ? "arrow shown." : "arrow hidden.", theme.color),
        txt(onlyOne ? " The other islands stay hidden." : "", C.INFO),
    ]);
    return true;
}

/* Bascule ITEMS <-> BUTTONS. Les items de l'ancien mode sont retires et ceux
   du nouveau donnes immediatement (data.applyControls -> index.js) : le joueur
   n'a pas a se deconnecter pour voir le changement. */
function toggleControlMode(playerId) {
    /* Le tactile n'a pas de clavier, et un seul bouton a l'ecran (le dash) :
       ses capacites restent des items, il n'y a rien a basculer (demande 92). */
    if (isMobilePlayer(playerId)) {
        settingsSay(playerId, [
            ic("fa-solid fa-circle-info", C.INFO),
            txt(" Touch screens always use items: one item per ability.", C.INFO),
            txt("\nYour dash is the button under your thumb.", C.INFO),
        ]);
        return;
    }
    const byButtons = getControlMode(playerId) === "buttons";
    const mode = setControlMode(playerId, byButtons ? "items" : "buttons");
    applyControls(playerId);
    createSettingsItems(playerId);
    const buttons = mode === "buttons";
    settingsSay(playerId, [
        ic(buttons ? "fa-solid fa-computer-mouse" : "fa-solid fa-backpack", SETTING_CONTROLS_COLOR),
        bold(buttons ? " Button controls." : " Item controls.", SETTING_CONTROLS_COLOR),
        txt(buttons
            ? " Hold Fruit Abilities for your fruit keys, Fighting Style Capacities for your style keys. Q is your dash."
            : " One item per ability, and right click to dash.", C.INFO),
    ]);
}

function togglePvPProtection(playerId) {
    const want = !pvpProtectionEnabled(playerId);
    settingSet(playerId, "pvpProt", want);
    createSettingsItems(playerId);
    settingsSay(playerId, [
        ic("fa-solid fa-shield-halved", SETTING_PROTECT_COLOR),
        bold(want ? " PvP protection enabled." : " PvP protection disabled.", SETTING_PROTECT_COLOR),
        txt(want
            ? " You get 5 minutes against your killer when you respawn."
            : " You accept every hit, killer included.", C.INFO),
    ]);
}

/* Debloque un joueur coince en le tuant. Anti-abus : refus si un joueur
   l'a frappe dans les 10 dernieres secondes (sinon c'est une fuite de combat). */
function settingsRespawn(playerId) {
    let last = null;
    try { last = getLastDamager(playerId); } catch (e) { last = null; }
    if (last && last.killerId && Date.now() - last.at < 10000) {
        let attackerIsPlayer = false;
        try {
            attackerIsPlayer = (api.getPlayerIds() || []).indexOf(last.killerId) !== -1;
        } catch (e) {}
        if (attackerIsPlayer) {
            settingsSay(playerId, [
                ic("fa-solid fa-triangle-exclamation", C.DANGER),
                bold(" You are in a fight: no respawn right now.", C.DANGER),
            ]);
            return;
        }
    }

    if (!confirmAction(playerId, "respawn", [
        ic("fa-solid fa-user-clock", SETTING_RESPAWN_COLOR),
        txt(" Respawn now? ", C.INFO),
        bold("You will die", C.DANGER),
        txt(" and come back at your spawn.", C.INFO),
    ])) return;

    let killed = false;
    try {
        if (typeof api.killLifeform === "function") { api.killLifeform(playerId); killed = true; }
    } catch (e) {}
    if (!killed) { try { api.setHealth(playerId, 0, undefined, true); killed = true; } catch (e) {} }
    if (!killed) { try { api.applyHealthChange(playerId, -99999, undefined, true); killed = true; } catch (e) {} }

    if (!killed) {
        settingsSay(playerId, [
            ic("fa-solid fa-circle-xmark", C.DANGER),
            bold(" Respawn failed. Try again in a moment.", C.DANGER),
        ]);
        return;
    }
    settingsSay(playerId, [
        ic("fa-solid fa-user-clock", SETTING_RESPAWN_COLOR),
        bold(" Respawning.", SETTING_RESPAWN_COLOR),
    ]);
}

/* Point d'entree unique, branche sur onPlayerBoughtShopItem (index.js). */
export function handleSettingsShop(playerId, categoryKey, itemKey, item, userInput) {
    if (categoryKey !== SETTINGS_CATEGORY) return false;
    if (!playerId || !itemKey) return false;
    /* Lobby : la categorie n'existe pas. Si un client garde un vieil item,
       le clic ne fait rien plutot que de peindre des fleches sans ile. */
    if (!settingsAvailableHere()) return true;

    switch (itemKey) {
        case "set_arrows": toggleIslandArrows(playerId); return true;
        case "set_arrows_hide": {
            const name = resolveIslandName(userInput);
            if (!name) { settingsSay(playerId, [
                ic("fa-solid fa-circle-info", C.INFO),
                txt(" Every island is already hidden.", C.INFO),
            ]); return true; }
            setIslandShown(playerId, name, false);
            return true;
        }
        case "set_arrows_show": {
            const name = resolveIslandName(userInput);
            if (!name) { settingsSay(playerId, [
                ic("fa-solid fa-circle-info", C.INFO),
                txt(" Every island is already shown.", C.INFO),
            ]); return true; }
            setIslandShown(playerId, name, true);
            return true;
        }
        case "set_respawn": settingsRespawn(playerId); return true;
        case "set_protect": togglePvPProtection(playerId); return true;
        case "set_controls": toggleControlMode(playerId); return true;
        case "set_info": createSettingsItems(playerId); return true;
        default: break;
    }

    /* ANCIENNE UI : le panneau a deja eu un item par ile ("isle_ju", "isle_pv").
       Un client qui les affiche encore doit obtenir le meme effet qu'avant :
       on bascule l'ile au lieu de laisser le clic sans reponse. Les items
       actuels (set_arrows_show / set_arrows_hide) ne passent jamais ici. */
    for (const name of islandNames()) {
        if (islandItemKey(name) === itemKey) {
            setIslandShown(playerId, name, !islandArrowVisible(playerId, name));
            return true;
        }
    }

    return false;
}

/* Variation vue par joueur : permet de reagir a un saut de variation meme
   s'il ne recharge pas le joueur. */
const lastVariationSeen = {};

/* Filet de securite, appele a chaque tick (une comparaison de texte par
   joueur, donc presque gratuit) :
     - lobby  -> les Settings et les fleches n'ont rien a faire la ;
     - mer    -> ils reviennent, avec les iles de CETTE mer.
   Le join fait deja le travail dans le cas normal ; ceci couvre le cas ou le
   passage d'une variation a l'autre se fait sans recharger le joueur. */
export function settingsSyncVariation(playerId) {
    if (!playerId) return false;
    const now = variationsSupported() ? currentVariation() : "world";
    if (lastVariationSeen[playerId] === now) return false;
    const first = lastVariationSeen[playerId] === undefined;
    lastVariationSeen[playerId] = now;
    if (!settingsAvailableHere()) {
        clearIslandArrows(playerId);
        return false;
    }
    if (first) return false; /* le join vient de le faire */
    return setupSettingsShop(playerId);
}

/* Deconnexion : on efface nos fleches (l'API le recommande) sans toucher a
   celles des quetes, qui ont leurs propres ids. */
export function settingsLeave(playerId) {
    if (!playerId) return false;
    delete lastVariationSeen[playerId];
    clearIslandArrows(playerId);
    return true;
}
