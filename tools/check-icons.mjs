/* Verifie ce qui part vers l'ecran du joueur : les icones et les barres.
 *
 * 1. ICONES. Bloxd n'affiche pas d'erreur pour une icone inconnue : il montre
 *    un « ? ». Une faute de frappe invisible en developpement devient donc un
 *    bug visuel en jeu. On lit la liste blanche de src/core/theme.js (FA_NAMES,
 *    FA_BRANDS) et on refuse toute icone Font Awesome absente, ainsi que les
 *    mots nus (« globe », « flag ») qui ne sont ni un item Bloxd ni une icone.
 * 2. BARRES. Bloxd dessine lui-meme les `type: "ProgressBar"` (novembre 2026).
 *    Trois choses ne se voient qu'a l'execution : la forme de l'objet, la
 *    couleur (le 2 novembre 2026, Bloxd a exige du CSS simple : nom, hex,
 *    rgb()/hsl() — `url()` est refuse avec une erreur), et la TAILLE du
 *    message, puisque `measure()` compte le JSON envoye et que la sidebar a un
 *    budget. On rend donc la vraie sidebar avec une `api` simulee.
 *
 * Lance par `npm run check`.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const THEME = join(ROOT, "src/core/theme.js");

function listOf(source, name) {
    const start = source.indexOf("const " + name + " = (");
    if (start < 0) throw new Error("liste " + name + " introuvable dans theme.js");
    /* Fin de la liste : `).split(" ")` (Font Awesome) ou `).split(/[\s|]+/)`
       (icones ingame, qui contiennent des espaces et sont separees par « | »). */
    const end = source.indexOf(").split(", start);
    if (end < 0) throw new Error("fin de " + name + " introuvable");
    const chunk = source.slice(start, end);
    /* Chaque morceau est une chaine "mot mot mot " : on eclate les mots. */
    const parts = chunk.match(/"([^"]*)"/g) || [];
    const out = [];
    for (const p of parts) {
        const words = p.slice(1, -1).split(/[\s|]+/);
        for (const word of words) {
            const text = word.trim();
            if (text) out.push(text);
        }
    }
    return out;
}

const theme = readFileSync(THEME, "utf8");
const fa = new Set(listOf(theme, "FA_NAMES"));
const brands = new Set(listOf(theme, "FA_BRANDS"));
const ingame = new Set(listOf(theme, "INGAME_NAMES"));
const ingameLower = new Map();
for (const name of ingame) ingameLower.set(name.toLowerCase(), name);

/* --------------------------------------------------------------------------
   LISTES OFFICIELLES (ICONS.md du depot Bloxdy/code-api)
   --------------------------------------------------------------------------
   Copiees ici pour que la liste blanche de theme.js ne puisse pas deriver :
   une icone oubliee s'afficherait en « ? » sans aucune erreur, et une icone
   inventee ne s'afficherait jamais. `npm run check` compare donc les trois
   listes du projet aux listes officielles, dans les deux sens.
   Ajouter une icone = la mettre ici ET dans theme.js, jamais dans un seul. */
/* Separe une liste ecrite en clair : plus facile a relire et a comparer au
   doc officiel qu'un tableau de 214 entrees. */
function names(text) {
    return text.split(/[\s|]+/).filter(Boolean);
}

/* Font Awesome (214) — ICONS.md, « Font Awesome Icons ». */
const OFFICIAL_FA = names(
            "add angle-double-up angle-down angle-up angles-up arrow-left arrow-up " +
            "arrow-up-right-from-square arrows arrows-h arrows-left-right arrows-rotate " +
            "arrows-up-down-left-right award backpack bars bee bell block-question bolt boot " +
            "calendar caret-down caret-right caret-up cart-shopping check chess-knight " +
            "chess-rook child-reaching circle-check circle-info circle-plus circle-question " +
            "circle-xmark clock-rotate-left cog coins comment-dots commenting compress " +
            "computer-mouse cookie copy crosshairs crown cube cubes cut dice dizzy door-closed " +
            "door-open download edit ellipsis ellipsis-h exclamation exclamation-triangle expand " +
            "external-link eye eye-slash face-diagonal-mouth face-dizzy face-raised-eyebrow " +
            "face-smile face-worried feather-alt feather-pointed file-alt file-clipboard " +
            "file-lines file-text film fire fist-raised flag folder folder-image folder-open " +
            "gauge-high gear gem globe hammer hand-back-point-up hand-fist hand-holding-medical " +
            "hand-point-left hand-wave hands-clapping hat-santa hat-witch heart " +
            "heart-music-camera-bolt history hourglass hourglass-clock hourglass-empty house " +
            "icons image image-slash info-circle joystick layer-group left-from-bracket " +
            "lightbulb list list-squares location-check location-xmark lock lock-open " +
            "magnifying-glass male map-marker-check map-marker-times map-marker-xmark minus " +
            "minus-square moon mouse music music-slash navicon palette pants party-horn paste " +
            "pause pen pen-field pen-to-square person person-arrow-down-to-line " +
            "person-arrow-up-from-line person-falling-burst person-military-pointing " +
            "planet-ringed play plus plus-circle power-off ranking-star recycle redo-alt refresh " +
            "right-from-bracket rocket-launch rotate-forward rotate-right scissors search shield " +
            "shield-alt shield-blank shield-halved shirt shoe shopping-cart sign-out-alt skull " +
            "smile snowflake sparkle square-dashed square-minus star star-christmas store " +
            "subtract sun-bright swords sync t-shirt tachometer-alt tachometer-alt-fast terminal " +
            "trash-alt trash-can triangle-exclamation trophy tshirt up-from-bracket upload user " +
            "user-astronaut user-check user-clock user-friends user-group user-group-crown " +
            "user-minus user-plus user-slash user-unlock users-crown video video-camera volume " +
            "volume-down volume-low volume-medium volume-slash warning wifi wifi-3 wifi-strong " +
            "wrench x xmark zap"
);

/* Icones ingame Bloxd (96) — ICONS.md, « Ingame Icons ». */
const OFFICIAL_INGAME = names(
            "Damage|Damage Reduction|Speed|VoidJump|Fist|Frozen|Hydrated|Invisible|Jump Boost| " +
            "Poisoned|Slowness|Weakness|Health Regen|Healing Pulse|Haste|Double Jump| " +
            "Heat Resistance|Gliding|Boating|Obsidian Boating|Riding|Bunny Hop|FallDamage| " +
            "Feather Falling|Thief|X-Ray Vision|Mining Yield|Brain Rot|Rested Damage| " +
            "Rested Haste|Rested Speed|Rested Farming Yield|Rested Aura|Blindness|Pickpocketer| " +
            "Lifesteal|Bounciness|Air Walk|Wall Climbing|Thorns|Poopy|Glowing|Night Vision| " +
            "Irradiated|Draugr Knight Head|Draugr Warper Head|Magma Golem Head|Mystery Fish| " +
            "Damage Enchantment|Critical Damage Enchantment|Attack Speed Enchantment| " +
            "Protection Enchantment|Health Enchantment|Health Regen Enchantment| " +
            "Stomp Damage Enchantment|Knockback Resist Enchantment|Arrow Speed Enchantment| " +
            "Arrow Damage Enchantment|Quick Charge Enchantment|Break Speed Enchantment| " +
            "Momentum Enchantment|Mining Yield Enchantment|Farming Yield Enchantment| " +
            "Mining Aura Enchantment|Digging Aura Enchantment|Lumber Aura Enchantment| " +
            "Farming Aura Enchantment|Vertical Knockback Enchantment| " +
            "Horizontal Knockback Enchantment|Firecracker Cooldown Enchantment| " +
            "Firecracker Boost Enchantment|Gliding Speed Enchantment|Self Yield|Friends| " +
            "Riding Speed|Feed Aura|Double Poop|Mob Slayer|Rainbow Wool|Pack Leader|Max Health| " +
            "Poison Claws|Mob Yield|Antlers Bonus|Health|HealthShield|Cross|Friendship| " +
            "Dotted Friendship|Hunger|Empty Hunger|Pixelated Heart|Question Mark|Trader Black| " +
            "Trader Blue|Trader Piggy|"
);

/* Marques (11) — ICONS.md, « Brand Icons ». */
const OFFICIAL_BRANDS = names(
            "apple chrome discord google-play instagram reddit-alien tiktok twitch windows " +
            "x-twitter youtube"
);

/* Noms natifs Bloxd (items, blocs, icones ingame) : acceptes tels quels. */
const NATIVE_OK = /^[A-Z0-9]/;

function checkIcon(name) {
    if (typeof name !== "string" || !name.trim()) return "icone vide";
    const raw = name.trim();
    if (raw.indexOf("fa-") !== 0) {
        /* Icone ingame : reconnue, et la casse doit etre exacte (safeIcon la
           corrigerait, mais autant ecrire juste dans le source). */
        const exact = ingameLower.get(raw.toLowerCase());
        if (exact) return exact === raw ? null : "icone ingame « " + exact + " » (casse exacte attendue)";
        if (raw.indexOf(" ") === -1 && raw === raw.toLowerCase()) return "mot nu (ni Font Awesome ni nom Bloxd)";
        if (!NATIVE_OK.test(raw)) return "nom Bloxd douteux (doit commencer par une majuscule)";
        return null;
    }
    const tokens = raw.split(/\s+/);
    let base = tokens[tokens.length - 1];
    if (base.indexOf("fa-") === 0) base = base.slice(3);
    if (tokens.indexOf("fa-brands") !== -1) return brands.has(base) ? null : "marque inconnue";
    return fa.has(base) ? null : "nom Font Awesome absent de la liste blanche";
}

const files = [];
(function walk(dir) {
    for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(js|ts)$/.test(entry)) files.push(p);
    }
})(join(ROOT, "src"));

let checked = 0;
const errors = [];
/* Tous les litteraux Font Awesome rencontres : rejoues dans safeIcon plus bas. */
const LITERALS = new Set();
/* Nombre de capacites classees : affiche dans le bilan. */
let ATTACK_TYPE_COUNT = 0;
/* Nombre de noms d'items declares : affiche dans le bilan. */
let ITEM_LOOKS_COUNT = 0;
/* Nombre de noms techniques interdits dans les textes : affiche dans le bilan. */
let ITEM_TECH_COUNT = 0;

/* ==========================================================================
   0. Les trois listes du projet doivent etre EXACTEMENT les listes officielles
   ==========================================================================
   Un nom oublie dans theme.js s'affiche « ? » en jeu ; un nom ajoute a la main
   ne s'affiche jamais. On compare donc dans les deux sens. */
function compareLists(projectSet, official, label) {
    checked++;
    const missing = official.filter((n) => !projectSet.has(n));
    const extra = [...projectSet].filter((n) => !official.includes(n));
    if (missing.length) errors.push(label + " : " + missing.length + " icone(s) officielle(s) oubliee(s) — " + missing.join(", "));
    if (extra.length) errors.push(label + " : " + extra.length + " icone(s) qui n'existent pas — " + extra.join(", "));
}
compareLists(fa, OFFICIAL_FA, "theme.js FA_NAMES");
compareLists(brands, OFFICIAL_BRANDS, "theme.js FA_BRANDS");
compareLists(ingame, OFFICIAL_INGAME, "theme.js INGAME_NAMES");
/* Les boutons personnalises (customButtons) sont le SEUL endroit ou une icone
   s'ecrit en nom nu (« zap ») : c'est ce que l'API attend. Ce bloc est donc
   retire du scan generique et verifie a part, plus bas (section 3). */
const controlsSource = readFileSync(join(ROOT, "src/index.js"), "utf8");
/* Retire le bloc CONTROLS du scan generique : ses icones sont des noms nus,
   volontairement, et sont verifiees par la section 3. */
const controlsBlock = /const CONTROLS = \{[\s\S]*?\n\};/.exec(controlsSource);

for (const file of files) {
    let source = readFileSync(file, "utf8");
    const where = relative(ROOT, file);
    if (controlsBlock && where === "src/index.js") source = source.replace(controlsBlock[0], "");
    let m;
    /* Deux ecritures pour la meme chose : le litteral historique
       `icon: "fa-solid fa-x"` et la fabrique `ic("fa-solid fa-x", couleur)`
       (core/theme.js). Sans la seconde, 200 icones echapperaient au controle. */
    const re = /icon:\s*["']([^"']*)["']|(?<![\w$.])ic\s*\(\s*["']([^"']*)["']/g;
    while ((m = re.exec(source))) {
        if (m[2] !== undefined) m = [m[0], m[2]];
        checked++;
        const problem = checkIcon(m[1]);
        if (problem) errors.push(where + " : \"" + m[1] + "\" — " + problem);
    }
    /* TOUS les litteraux « fa-... » du fichier, quel que soit le contexte :
       beaucoup d'icones partent par une fonction maison (`line("fa-solid
       fa-x")`, `speech(...)`) et echappaient au motif icon:/ic(). Seules les
       chaines completes « fa-solid fa-nom » sont controlees, pour ne pas
       signaler le code de safeIcon (« fa-brands » seul, concatenations). */
    const reLiteral = /"(fa-(?:solid|regular|duotone|brands)(?:\s+fa-[a-z0-9-]+)+)"/g;
    while ((m = reLiteral.exec(source))) {
        checked++;
        LITERALS.add(m[1]);
        const problem = checkIcon(m[1]);
        if (problem) errors.push(where + " : \"" + m[1] + "\" — " + problem);
    }
    /* Table emoji -> icone de theme.js. */
    if (where.endsWith("core/theme.js")) {
        const map = source.slice(source.indexOf("export const ICON = {"));
        const reEmoji = /"([^"]+)":\s*"([^"]+)"\s*,\s*\/\*/g;
        while ((m = reEmoji.exec(map))) {
            checked++;
            const problem = checkIcon(m[2]);
            if (problem) errors.push(where + " (emoji) : \"" + m[2] + "\" — " + problem);
        }
    }
}

/* ==========================================================================
   2. Barres natives + budget de la sidebar
   ==========================================================================
   La sidebar est rendue pour de vrai : on bundle src/core/UI.js, on lui donne
   une `api` simulee et on inspecte exactement ce qui part dans
   `setClientOption(pid, "RightInfoText", …)`. */

const BUDGET_SIDEBAR = 1200; // cf. core/theme.js (BUDGET_SIDEBAR)
/* Repères de la sidebar (demande 97) : le titre en lettres gothiques et
   l'en-tête de la quête. On cherche ces chaînes-là, pas une position : le
   budget peut retirer des blocs, jamais le titre ni la quête. */
const TITLE_MARK = "𝓑𝓵𝓸𝓬𝓴 𝓟𝓲𝓻𝓪𝓽𝓮";
const QUEST_MARK = "THE HUNT";

/* Bloxd evalue ses fichiers en mode sloppy : ces noms sont assignes sans
   declaration dans src/ et deviennent des globals. Hors de Bloxd (ESM strict)
   il faut les poser, sinon l'import du bundle leve un ReferenceError. */
const SLOPPY_GLOBALS = [
    "chooseTeam", "continueJourney", "doPeriodicSave", "enterSea", "resetPlayer",
    "setPlayerTeam", "skipTutorial", "spawnMobLeader", "spawnNPC", "spawnQuestMob",
    "startBoss", "startTutorial", "withEffectSource",
];

async function renderSidebar(db, tutorialLine, quest) {
    for (const n of SLOPPY_GLOBALS) globalThis[n] = () => false;
    let sidebar = null;
    globalThis.api = new Proxy(
        {
            setClientOption: (pid, key, value) => {
                if (key === "RightInfoText") sidebar = value;
            },
            getPlayerDbValue: (pid, key) => db[key],
            getPlayerIds: () => ["p1"],
            sendMessage: () => {},
            broadcastMessage: () => {},
            log: () => {},
            now: () => Date.now(),
            getHealth: () => 20,
            getMaxHealth: () => 20,
            getPlayerFacingInfo: () => ({ camPos: [0, 65, 0], dir: [0, 0, 1] }),
            getEntityType: () => "Player",
        },
        { get: (t, k) => (k in t ? t[k] : () => undefined) },
    );
    const { buildSync } = await import("esbuild");
    const built = buildSync({
        stdin: {
            contents:
                `export * from ${JSON.stringify(join(ROOT, "src/core/UI.js"))};` +
                `export { playerQuest, questProgress } from ${JSON.stringify(join(ROOT, "src/gameplay/quest.js"))};`,
            resolveDir: ROOT,
            loader: "js",
        },
        bundle: true,
        write: false,
        format: "esm",
        platform: "browser",
        target: "es2020",
        logLevel: "silent",
    });
    const url = "data:text/javascript;base64," + Buffer.from(built.outputFiles[0].text).toString("base64");
    const ui = await import(url);
    ui.setTutorialLineLookup(tutorialLine ? () => tutorialLine : null);
    if (quest) {
        ui.playerQuest.p1 = { targetMob: quest.targetMob, killAmount: quest.killAmount, island: quest.island };
        ui.questProgress.p1 = quest.progress;
    }
    ui.updateSidebar("p1");
    return sidebar;
}

/* Couleur acceptee depuis le 2 novembre 2026 : nom CSS, hex, rgb()/hsl().
   On refuse tout le reste (`url()`, gradient, var()) : Bloxd leve une erreur. */
function colourProblem(value) {
    if (typeof value !== "string" || !value.trim()) return "couleur vide";
    if (/url\(|var\(|gradient/i.test(value)) return "fonction CSS refusee (" + value + ")";
    const css = value.replace(/\s+\d+%$/, ""); // position d'arret d'un degrade
    if (/^#[0-9a-f]{3,8}$/i.test(css)) return null;
    if (/^[a-z]+$/i.test(css)) return null;
    if (/^(rgba?|hsla?)\([^()]*\)$/i.test(css)) return null;
    return "couleur CSS invalide (" + value + ")";
}

function hueOf(hex) {
    const h = hex.replace("#", "");
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const r = parseInt(full.slice(0, 2), 16) / 255;
    const g = parseInt(full.slice(2, 4), 16) / 255;
    const b = parseInt(full.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    if (d === 0) return 0;
    let hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hue *= 60;
    return hue < 0 ? hue + 360 : hue;
}

const SIDEBAR_SIZES = [];
const POOR = {};
const RICH = {
    money: 1234567, lvl: 87, xp: 4321, sp: 12,
    team: "PIRATES", "crew:name": "Straw Hat Crew", "crew:role": "CAPTAIN",
};
/* Le pire cas RÉEL : un nouveau joueur, donc objectif de tutoriel ET première
   quête en cours. C'est exactement celui qui a le moins de place et le plus
   besoin de voir sa stamina. */
/* Objet de quete COMPLET, comme en jeu : `playerQuest[pid]` porte la quete
   resolue, pas seulement son identifiant. Une quete sans cible rendait la
   sidebar artificiellement plus legere (la ligne « QUEST  <cible> » manquait),
   donc le pire cas reel n'etait jamais mesure. */
const NEWBIE = { targetMob: ["Sky Bandit"], killAmount: 5, island: "Jungle", progress: 3 };
const scenarios = [
    ["joueur nu", POOR, null, null],
    ["joueur charge + objectif de tutoriel", RICH, "Buy your first weapon at the Combat Teacher", null],
    ["nouveau joueur + tutoriel + quete", POOR, "Kill 3 Sky Bandits in the Lower Skyl", NEWBIE],
];
for (const [label, db, tutorialLine, quest] of scenarios) {
    const sidebar = await renderSidebar(db, tutorialLine, quest);
    if (!Array.isArray(sidebar)) {
        errors.push(`${label} : aucune sidebar envoyee`);
        continue;
    }
    checked++;
    const size = JSON.stringify(sidebar).length;
    SIDEBAR_SIZES.push(`${label} ${size}`);
    if (size > BUDGET_SIDEBAR)
        errors.push(`${label} : sidebar de ${size} car. > budget ${BUDGET_SIDEBAR}`);

    /* Demande 97 : AUCUNE icone dans la sidebar, ni Bloxd (« Hunger ») ni Font
       Awesome. Le cadre, les ornements (✦ ✧ ★ ◈ ▸) et les mots suffisent, et
       une icone coute plus cher qu'un caractere dans un budget de 1200. */
    for (const p of sidebar) {
        checked++;
        if (p && p.icon) errors.push(`${label} : icone « ${p.icon} » dans la sidebar (caracteres seulement)`);
    }
    const bars = sidebar.filter((p) => p && p.type === "ProgressBar");
    if (bars.length !== 2) {
        errors.push(`${label} : ${bars.length} barre(s) au lieu de 2 (XP + stamina)`);
    }
    for (const b of bars) {
        checked++;
        if (!Number.isFinite(b.progress) || b.progress < 0 || b.progress > 1)
            errors.push(`${label} : progress ${b.progress} hors de 0..1`);
        if (Math.round(b.progress * 1000) / 1000 !== b.progress)
            errors.push(`${label} : progress ${b.progress} non arrondi (poids inutile)`);
        if (!Array.isArray(b.colours) || !b.colours.length)
            errors.push(`${label} : barre sans colours`);
        else
            for (const c of b.colours) {
                const pb = colourProblem(c);
                if (pb) errors.push(`${label} : ${pb}`);
            }
        if (b.backgroundColour) {
            const pb = colourProblem(b.backgroundColour);
            if (pb) errors.push(`${label} : fond de barre — ${pb}`);
        }
        /* Taille reglee en jeu (demande 71) : 250x24 px. Sans `width`, la barre
           prenait la largeur de la ligne et restait tres fine ; on refuse donc
           une barre qui perd sa taille en route (fit() ne doit pas la toucher). */
        for (const key of ["width", "height"]) {
            if (b[key] === undefined) errors.push(`${label} : barre sans ${key}`);
            else if (typeof b[key] !== "string") errors.push(`${label} : ${key} doit etre une taille CSS ("24px")`);
            else if (!/^\d+px$/.test(b[key])) errors.push(`${label} : ${key} = ${b[key]} (attendu en px)`);
        }
    }
    /* REGLE (demande 74) : une barre porte la couleur de SON texte. On ne teste
       donc pas « vert » / « bleu » (des constantes recopiees, qui divergeraient
       au premier changement de palette) mais l'EGALITE avec la couleur de la
       ligne qui precede la barre. L'XP doit donc etre cyan comme « XP 1260/… »,
       et la stamina bleue comme « 100/100 100% ». */
    const norm = (c) => String(c).trim().toLowerCase();
    for (const b of bars) {
        const at = sidebar.indexOf(b);
        let label = null;
        for (let i = at - 1; i >= 0; i--) {
            const p = sidebar[i];
            if (p && typeof p.str === "string" && p.str.trim()) { label = p; break; }
        }
        if (!label) { errors.push(`${label} : barre sans texte au-dessus`); continue; }
        const textColour = label.style && label.style.color;
        const barColour = b.colours && b.colours[0];
        if (!textColour) errors.push(`${label} : le texte de la barre n'a pas de couleur`);
        else if (norm(textColour) !== norm(barColour))
            errors.push(`${label} : barre ${barColour} mais son texte ${textColour} (doivent etre identiques)`);
    }
    /* Et les deux barres ne doivent pas avoir la MEME couleur : sinon on ne
       distingue plus l'XP de la stamina. */
    if (bars.length === 2 && bars[0].colours && bars[1].colours && norm(bars[0].colours[0]) === norm(bars[1].colours[0]))
        errors.push(`${label} : XP et stamina ont la meme couleur (${bars[0].colours[0]})`);
    /* Priorite 0 = garde en premier : l'objectif du tutoriel doit survivre a un
       joueur charge (regression de `priority || 9`, qui le mettait en dernier). */
    if (tutorialLine) {
        const head = tutorialLine.slice(0, 20); // la ligne est tronquee a 40 car.
        const shown = sidebar.some((p) => typeof p.str === "string" && p.str.indexOf(head) !== -1);
        if (!shown) errors.push(`${label} : l'objectif du tutoriel est coupe alors qu'il est prioritaire`);
    }
    /* Les deux barres sont une exigence du joueur (demande 70/71) : elles ne
       doivent jamais etre sacrifiees, meme quand la place manque. Le titre et
       le pied du cadre ne sont pas optionnels : ils ne partent jamais. */
    if (bars.length !== 2) errors.push(`${label} : une barre a ete sacrifiee (${bars.length}/2)`);
    if (quest) {
        const shownQuest = sidebar.some((p) => typeof p.str === "string" && p.str.indexOf(QUEST_MARK) !== -1);
        if (!shownQuest) errors.push(`${label} : le bloc de quete a ete coupe`);
    }

    /* ══════════════════════════════════════════════════════════════════════
       ORDRE DE LA SIDEBAR (la carte du navire, demande 97)

         titre -> THE PIRATE (nom, mer, pieces) -> THE VOYAGE (niveau,
         XP, points de stat, stamina) -> THE POWERS (fruit, style)
         -> THE PATH (tutoriel) -> THE HUNT (quete) -> pied du cadre

       La quete est en dernier bloc : c'est la demande explicite (« la quete
       tout en bas, absolument »). Elle reste prioritaire au budget (elle n'est
       jamais coupee), mais elle s'AFFICHE en dernier, juste avant le pied du
       cadre. On verifie l'ordre reel du tableau envoye au client, pas
       l'intention du code.
       ══════════════════════════════════════════════════════════════════════ */
    const at = (needle) => sidebar.findIndex((p) => p && typeof p.str === "string" && p.str.indexOf(needle) !== -1);
    const lastBar = (() => {
        for (let i = sidebar.length - 1; i >= 0; i--) if (sidebar[i] && sidebar[i].type === "ProgressBar") return i;
        return -1;
    })();
    const lvlAt = at("LVL");
    const moneyAt = at("");

    /* 1. Le titre : PREMIER bloc, et ECRIT EN GROS (demande 88 — « celle ou il
          y avait BlockPirate ecrit en gros en haut »). Il ne doit plus etre le
          premier sacrifie par le budget : un joueur charge qui perd son titre
          ne reconnait plus son interface. */
    const titlePart = sidebar.find((p) => typeof p.str === "string" && p.str.indexOf(TITLE_MARK) !== -1);
    checked++;
    if (!titlePart) {
        errors.push(`${label} : le titre « ${TITLE_MARK} » a ete coupe`);
    } else {
        checked++;
        if (!titlePart.style || !titlePart.style.fontSize)
            errors.push(`${label} : le titre n'est plus ecrit en gros (aucun fontSize)`);
        for (let i = 0; i < sidebar.length; i++) {
            const p = sidebar[i];
            if (!p || typeof p.str !== "string" || !p.str.trim()) continue;
            if (p.str.indexOf(TITLE_MARK) === -1)
                errors.push(`${label} : un bloc passe avant le titre (« ${p.str.trim().slice(0, 20)} »)`);
            break;
        }
    }

    /* 2. AUCUNE ligne d'equipe ni d'equipage (demande 89). L'equipe se lit
          deja a deux endroits : la couleur du name tag et celle du classement
          du lobby. Ce bloc `db` est justement un joueur qui a une equipe et un
          equipage : si quelque chose s'affiche, c'est que la ligne est revenue.
          On cherche les noms (et pas une icone : le drapeau sert ailleurs). */
    if (db.team) {
        checked++;
        const crew = db["crew:name"];
        for (const p of sidebar) {
            const s = p && typeof p.str === "string" ? p.str : "";
            if (s.indexOf("Pirates") !== -1 || s.indexOf("Marines") !== -1)
                errors.push(`${label} : l'equipe est revenue dans la sidebar (« ${s.trim().slice(0, 20)} »)`);
            if (crew && s.indexOf(crew.slice(0, 8)) !== -1)
                errors.push(`${label} : l'equipage est revenu dans la sidebar (« ${s.trim().slice(0, 20)} »)`);
        }
    }

    /* 3. Les DEUX barres viennent apres les stats et avant la quete. */
    checked++;
    if (lvlAt !== -1 && lastBar !== -1 && lvlAt > lastBar)
        errors.push(`${label} : le niveau est sous les barres (les stats doivent etre en haut)`);
    if (quest) {
        const questAt = at(QUEST_MARK);
        if (questAt !== -1 && lastBar !== -1 && questAt < lastBar)
            errors.push(`${label} : la quete n'est pas sous les barres`);
    }
    if (tutorialLine) {
        const head = tutorialLine.slice(0, 20);
        const tutAt = at(head);
        if (tutAt !== -1 && lastBar !== -1 && tutAt < lastBar)
            errors.push(`${label} : l'objectif du tutoriel n'est pas sous les barres`);
    }
    /* 4. La quete est le DERNIER bloc affiche : apres son titre, il ne reste
          que SES lignes de detail (cible, progression, ile) — aucune icone,
          c'est-a-dire aucun autre bloc. Un bloc a icone apres la quete = un
          bloc qui a ete pousse sous elle. */
    if (quest) {
        const questAt = at(QUEST_MARK);
        checked++;
        if (questAt !== -1) {
            let details = 0;
            for (let i = questAt + 1; i < sidebar.length; i++) {
                const p = sidebar[i];
                if (!p) continue;
                if (p.icon) {
                    errors.push(`${label} : le bloc « ${p.icon} » est affiche apres la quete`);
                    continue;
                }
                if (typeof p.str !== "string" || !p.str.trim()) continue;
                /* Le pied du cadre (╚…╝) et la ligne decorative de la Grand
                   Line ferment la carte : ce ne sont pas des informations
                   poussees sous la quete, elles doivent rester la. */
                if (p.str.indexOf("\u255A") !== -1 || p.str.indexOf("\u3014") !== -1) continue;
                details++;
            }
            if (details > 4) errors.push(`${label} : ${details} lignes de detail apres la quete (attendu 3 au plus)`);
        }
    }
}

/* ==========================================================================
   3. Boutons personnalises (customButtons) : clavier du PC
   ==========================================================================
   Trois choses cassent silencieusement un bouton :
     - un `icon` absent de la liste blanche -> un « ? » a l'ecran (pas d'erreur) ;
     - un `keycode` hors de la liste autorisee par Bloxd -> le bouton ne se
       declenche jamais ;
     - un `id` que `onPlayerPressedButton` ne traite pas -> un bouton mort.
   Et deux boutons sur la meme touche : le second est inutilisable.

   Les boutons sont maintenant groupes (demande 76) : le dash toujours la, les
   capacites du fruit seulement si le « Swap Orb » est en main, les attaques du
   style seulement si le « Void Net » est en main. `ability` et `style` ont le
   DROIT de partager Z/X (une seule main a la fois) ; le dash, lui, est toujours
   actif et ne peut donc rien partager. */
const KEYCODE_OK = /^(Key[A-Z]|Digit[0-9]|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Space)$/;
const GROUPS = { dash: 1, ability: 5, style: 2 };

/* Contenu du tableau qui suit `groupe:` — crochets equilibres, pour ne pas
   dependre de la mise en forme (un tableau sur une ligne est valide). */
function arrayAfter(source, name) {
    const at = source.indexOf(name + ":");
    if (at < 0) return null;
    const open = source.indexOf("[", at);
    if (open < 0) return null;
    let depth = 0;
    for (let i = open; i < source.length; i++) {
        const c = source[i];
        if (c === "[") depth++;
        else if (c === "]") {
            depth--;
            if (!depth) return source.slice(open + 1, i);
        }
    }
    return null;
}

const controlsRe = /const CONTROLS = \{([\s\S]*?)\n\};/;
const controlsMatch = controlsRe.exec(controlsSource);
const entries = { dash: [], ability: [], style: [] };

if (!controlsMatch) {
    errors.push("src/index.js : bloc CONTROLS introuvable (boutons du PC)");
} else {
    for (const group of Object.keys(GROUPS)) {
        const body = arrayAfter(controlsMatch[1], group);
        if (body === null) { errors.push("src/index.js : groupe de boutons \"" + group + "\" absent"); continue; }
        const reEntry = /\{[^{}]*\}/g;
        let em;
        while ((em = reEntry.exec(body))) {
            const raw = em[0];
            const id = /id:\s*"([^"]*)"/.exec(raw);
            const icon = /icon:\s*"([^"]*)"/.exec(raw);
            const keycode = /keycode:\s*"([^"]*)"/.exec(raw);
            const description = /description:\s*"([^"]*)"/.exec(raw);
            if (!id || !icon || !keycode) {
                errors.push("src/index.js : bouton incomplet dans \"" + group + "\" (" + raw.replace(/\s+/g, " ") + ")");
                continue;
            }
            entries[group].push({ group, id: id[1], icon: icon[1], keycode: keycode[1], description: description ? description[1] : "" });
        }
    }

    for (const group of Object.keys(GROUPS)) {
        const list = entries[group];
        checked += list.length;
        if (list.length !== GROUPS[group])
            errors.push("groupe \"" + group + "\" : " + list.length + " bouton(s) au lieu de " + GROUPS[group]);
        const seenKey = {};
        for (const e of list) {
            if (e.icon.indexOf("fa-") === 0)
                errors.push("bouton " + e.id + " : icone \"" + e.icon + "\" — customButtons attend un nom NU (sans \"fa-solid\")");
            else if (!fa.has(e.icon))
                errors.push("bouton " + e.id + " : icone \"" + e.icon + "\" absente de la liste blanche (elle s'afficherait « ? »)");
            if (!KEYCODE_OK.test(e.keycode))
                errors.push("bouton " + e.id + " : keycode \"" + e.keycode + "\" refuse par Bloxd");
            if (seenKey[e.keycode]) errors.push("bouton " + e.id + " : touche " + e.keycode + " deja prise par " + seenKey[e.keycode]);
            seenKey[e.keycode] = e.id;
            if (!e.description.trim()) errors.push("bouton " + e.id + " : description vide");
        }
    }
    /* Le dash est toujours actif : ses touches ne doivent appartenir a aucun
       autre groupe. ability et style, eux, ne coexistent jamais. */
    const dashKeys = new Set(entries.dash.map((e) => e.keycode));
    for (const group of ["ability", "style"]) {
        for (const e of entries[group]) {
            if (dashKeys.has(e.keycode))
                errors.push("bouton " + e.id + " : touche " + e.keycode + " deja prise par le dash (toujours actif)");
        }
    }
    /* Chaque id doit etre traite par le handler, sinon le bouton ne fait rien. */
    /* L'ASSIGNATION, pas la premiere mention : les commentaires parlent de ce
       handler bien avant sa definition (demande 94). */
    const handlerMatch = /onPlayerPressedButton = \(playerId, buttonId\) => \{/.exec(controlsSource);
    const handlerAt = handlerMatch ? handlerMatch.index : -1;
    const handler = handlerAt >= 0 ? controlsSource.slice(handlerAt, handlerAt + 1600) : "";
    if (handlerAt < 0) errors.push("src/index.js : onPlayerPressedButton introuvable");
    else {
        if (handler.indexOf('"dash"') === -1) errors.push("onPlayerPressedButton ne traite pas le bouton \"dash\"");
        if (!/ability\(\[1-5\]\)|ability\(\d/.test(handler))
            errors.push("onPlayerPressedButton ne traite pas les boutons ability1..5");
        if (handler.indexOf("style1") === -1 || handler.indexOf("style2") === -1)
            errors.push("onPlayerPressedButton ne traite pas les boutons style1/style2");
    }
}

/* ==========================================================================
   3c. Bouton tactile du dash (mobile)
   ==========================================================================
   Le dash mobile ne passe plus par un item a tenir en main : il a son propre
   bouton tactile (demande 90). Trois choses le cassent en silence :
     - la client option n'est jamais posee  -> aucun bouton a l'ecran ;
     - le callback n'existe pas             -> un bouton mort ;
     - l'icone du bouton n'existe pas       -> un « ? » dans le bouton.
   On verifie donc les trois, sur les sources telles qu'elles partent. */
{
    const staminaSrc = readFileSync(join(ROOT, "src/gameplay/stamina.js"), "utf8");
    checked++;
    if (staminaSrc.indexOf('"touchscreenActionButton"') < 0)
        errors.push("dash mobile : src/gameplay/stamina.js ne pose pas la client option touchscreenActionButton");
    const bolt = /ic\("fa-solid fa-([a-z-]+)"/.exec(staminaSrc.slice(staminaSrc.indexOf("function dashButtonParts")));
    checked++;
    if (!bolt || !fa.has(bolt[1]))
        errors.push("dash mobile : l'icone du bouton tactile n'est pas dans la liste blanche");

    /* L'ASSIGNATION, pas la premiere mention (les commentaires en parlent). */
    const hook = /onTouchscreenActionButton\s*=/.exec(controlsSource);
    checked++;
    if (!hook) errors.push("src/index.js : onTouchscreenActionButton introuvable (le bouton tactile ne fait rien)");
    else {
        const body = controlsSource.slice(hook.index, hook.index + 400);
        checked++;
        if (body.toLowerCase().indexOf("dash") < 0)
            errors.push("onTouchscreenActionButton n'appelle pas le dash");
    }
}

/* ==========================================================================
   3b. Icones des capacites de fruit (types d'attaque)
   ==========================================================================
   Les touches du PC affichent l'icone du TYPE d'une capacite (projectile,
   rayon, zone...), pas une icone par capacite : 16 dessins au lieu de 152.
   Deux erreurs silencieuses a attraper :
     - un nom hors liste blanche -> « ? » sur le bouton ;
     - une capacite sans type -> l'icone de secours, sans le dire.
   `customButtons` attend un nom NU (`sparkle`), pas `fa-solid fa-sparkle`. */
{
    const abilitiesSrc = readFileSync(join(ROOT, "src/fruit/abilities.js"), "utf8");
    const typesRe = /const ATTACK_TYPES = \{([\s\S]*?)\n\};/;
    const typesMatch = typesRe.exec(abilitiesSrc);
    if (!typesMatch) {
        errors.push("src/fruit/abilities.js : table ATTACK_TYPES introuvable");
    } else {
        const seenType = new Set();
        const reType = /(\d+):\s*\{\s*fa:\s*"([^"]+)"/g;
        let tm;
        while ((tm = reType.exec(typesMatch[1]))) {
            checked++;
            seenType.add(Number(tm[1]));
            if (tm[2].indexOf("fa-") === 0) errors.push("type " + tm[1] + " : icone \"" + tm[2] + "\" — customButtons attend un nom NU");
            else if (!fa.has(tm[2])) errors.push("type " + tm[1] + " : icone \"" + tm[2] + "\" absente de la liste blanche (elle s'afficherait « ? »)");
        }
        for (let t = 1; t <= 16; t++) if (!seenType.has(t)) errors.push("type d'attaque " + t + " manquant dans ATTACK_TYPES");

        /* Chaque capacite citee par un fruit doit avoir un type. */
        const tableAt = abilitiesSrc.indexOf("const FRUIT_ABILITY_TABLE = {");
        const tableEnd = abilitiesSrc.indexOf("\n};", tableAt);
        const used = new Set();
        const reIds = /"([A-Za-z_][A-Za-z_0-9]*)"/g;
        let im;
        const tableBody = abilitiesSrc.slice(tableAt, tableEnd);
        const reList = /\[([^\]]*)\]/g;
        while ((im = reList.exec(tableBody))) {
            let nm;
            const re = new RegExp(reIds.source, "g");
            while ((nm = re.exec(im[1]))) used.add(nm[1]);
        }
        const typeAt = abilitiesSrc.indexOf("const ABILITY_TYPE = {");
        const typeEnd = abilitiesSrc.indexOf("\n};", typeAt);
        const typed = new Set();
        const reTyped = /"([A-Za-z_][A-Za-z_0-9]*)":\s*\d+/g;
        let tm2;
        while ((tm2 = reTyped.exec(abilitiesSrc.slice(typeAt, typeEnd)))) typed.add(tm2[1]);
        checked += used.size;
        const missing = [...used].filter((id) => !typed.has(id));
        if (missing.length) errors.push("capacites sans type d'attaque (" + missing.length + ") : " + missing.join(", "));
        const extra = [...typed].filter((id) => !used.has(id));
        if (extra.length) errors.push("types declares pour des capacites inutilisees : " + extra.join(", "));
        ATTACK_TYPE_COUNT = typed.size;
    }
}

/* ==========================================================================
   3c. Noms et descriptions des items : une seule source, jamais au give
   ==========================================================================
   Regle du projet (demande 63) : TOUT nom et TOUTE description d'item vivent
   dans ITEM_LOOKS (gameplay/customItem.js), poses au join par setItemStat. Un
   nom passe au moment du give (customDisplayName) se perd des que l'item change
   de case, et le joueur retombe sur le nom brut de Bloxd
   (« White Seeking Paintball Explosive Item »).

   Trois choses sont donc verifiees :
     - chaque entree a un nom ET une description non vides ;
     - le nom affiche n'est jamais le nom d'item du code (« Swap Orb ») ;
     - aucun item de ITEM_LOOKS n'est renomme au give quelque part dans src/. */
{
    const itemSrc = readFileSync(join(ROOT, "src/gameplay/customItem.js"), "utf8");
    const looksAt = itemSrc.indexOf("export const ITEM_LOOKS = {");
    const looksEnd = itemSrc.indexOf("\n};", looksAt);
    if (looksAt < 0) {
        errors.push("customItem.js : table ITEM_LOOKS introuvable");
    } else {
        const looks = new Set();
        const reEntry = /"([^"]+)"\s*:\s*\{([^{}]*)\}/g;
        let em;
        const body = itemSrc.slice(looksAt, looksEnd);
        while ((em = reEntry.exec(body))) {
            const key = em[1];
            const entry = em[2];
            looks.add(key);
            checked++;
            const shown = /displayName:\s*"([^"]*)"/.exec(entry);
            const desc = /description:\s*"([^"]*)"/.exec(entry);
            if (!shown || !shown[1].trim()) errors.push("ITEM_LOOKS \"" + key + "\" : nom affiche vide");
            else if (shown[1] === key) errors.push("ITEM_LOOKS \"" + key + "\" : le nom affiche est le nom du code");
            if (!desc || !desc[1].trim()) errors.push("ITEM_LOOKS \"" + key + "\" : description vide");
        }
        ITEM_LOOKS_COUNT = looks.size;

        /* Aucun renommage au give sur un item qui a deja son nom dans la table :
           giveItem(pid, "Swap Orb", n, { customDisplayName: … }) est interdit. */
        const CALLS = /\b(giveItem|createItemDrop|writeItem|buyItem)\(\s*(?:[A-Za-z_$][\w$]*\s*,\s*)?"([^"]+)"/g;
        for (const file of files) {
            const src = readFileSync(file, "utf8");
            const where = relative(ROOT, file);
            let m;
            while ((m = CALLS.exec(src))) {
                if (!looks.has(m[2])) continue;
                const window = src.slice(m.index, m.index + 400);
                if (window.indexOf("customDisplayName") === -1 && window.indexOf("customDescription") === -1) continue;
                checked++;
                errors.push(where + " : \"" + m[2] + "\" est renomme au give — son nom et sa description doivent venir de ITEM_LOOKS (customItem.js)");
            }
        }
    }
}

/* ==========================================================================
   3d. L'interface : une seule anatomie pour les messages et les boutiques
   ==========================================================================
   Le jeu parle au joueur par trois canaux seulement : le chat (say/shout), les
   cartes de boutique, et les deux textes colles a l'ecran (sidebar, milieu).
   Ces trois canaux ont UNE forme, verifiee ici :

     - un message commence par une ICONE (sa couleur dit le role : rouge =
       erreur, vert = succes, or = argent, cyan = quete) ;
     - une carte de boutique a une image, un titre, une description qui
       commence par une icone, et un texte de bouton ;
     - aucun texte montre au joueur ne contient le NOM TECHNIQUE d'un item
       renomme (« Black Carpet » au lieu de « Haki Fragment »).

   Sans ca, chaque nouveau message invente sa presentation : c'est exactement
   ce qui s'etait passe (messages sans icone, reponses en texte nu). */

/* Les arguments de premier niveau d'un appel, separes par les virgules qui ne
   sont ni dans une chaine, ni dans un tableau/objet. */
function topLevelArgs(body) {
    const out = [];
    let depth = 0;
    let start = 0;
    let i = 0;
    while (i < body.length) {
        const ch = body[i];
        if (ch === '"') {
            i++;
            while (i < body.length && body[i] !== '"') {
                if (body[i] === "\\") i++;
                i++;
            }
        } else if (ch === "(" || ch === "[" || ch === "{") depth++;
        else if (ch === ")" || ch === "]" || ch === "}") depth--;
        else if (ch === "," && depth === 0) {
            out.push(body.slice(start, i));
            start = i + 1;
        }
        i++;
    }
    out.push(body.slice(start));
    return out;
}

/* Le corps d'un appel : de la parenthese ouvrante a la fermante correspondante,
   chaines comprises. */
function callBody(src, openIndex) {
    let depth = 1;
    let i = openIndex + 1;
    while (i < src.length && depth > 0) {
        const ch = src[i];
        if (ch === '"') {
            i++;
            while (i < src.length && src[i] !== '"') {
                if (src[i] === "\\") i++;
                i++;
            }
        } else if (ch === "(" || ch === "[" || ch === "{") depth++;
        else if (ch === ")" || ch === "]" || ch === "}") depth--;
        i++;
    }
    return src.slice(openIndex + 1, i - 1);
}

{
    const itemSrc = readFileSync(join(ROOT, "src/gameplay/customItem.js"), "utf8");
    const looksAt = itemSrc.indexOf("export const ITEM_LOOKS = {");
    const looksEnd = itemSrc.indexOf("\n};", looksAt);
    const body = itemSrc.slice(looksAt, looksEnd);
    /* Noms TECHNIQUES a ne jamais montrer : ceux que le nom affiche ne contient
       pas. « Boat » -> « Normal Boat » contient le mot, donc « Normal Boat »
       reste utilisable ; « Black Carpet » -> « Haki Fragment » n'a plus rien en
       commun, donc le nom technique est interdit dans un texte. */
    const forbidden = [];
    const reEntry = /"([^"]+)"\s*:\s*\{([^{}]*)\}/g;
    let entry;
    while ((entry = reEntry.exec(body))) {
        const shown = /displayName:\s*"([^"]*)"/.exec(entry[2]);
        if (shown && shown[1].indexOf(entry[1]) === -1) forbidden.push([entry[1], shown[1]]);
    }
    ITEM_TECH_COUNT = forbidden.length;

    const MESSAGE_CALL = /\b(say|shout)\s*\(/g;
    const SHOP_CALL = /\b(createShopItem|createShopItemForPlayer|updateShopItemForPlayer)\s*\(/g;
    for (const file of files) {
        const src = readFileSync(file, "utf8");
        const where = relative(ROOT, file);
        let m;
        while ((m = MESSAGE_CALL.exec(src))) {
            /* say(pid, [ … ]) : le message est le premier argument qui est un
               tableau. Les autres formes (message construit a la main, appele
               par un helper) ne sont pas inspectables ici. */
            const raw = callBody(src, m.index + m[0].length - 1);
            const args = topLevelArgs(raw).map((a) => a.trim()).filter((a) => a.charAt(0) === "[")[0];
            if (!args) continue;
            checked++;
            /* Exception documentee : les tags du STAFF (« [Admin] », « [Owner] »)
               sont un prefixe de moderation, pas un message de jeu. */
            const first = /^\[\s*([A-Za-z_$][\w$]*)\s*\(/.exec(args);
            const token = first ? first[1] : "";
            const staff = /^\[\s*(bold|txt)\(\s*"\[/.test(args);
            if (token !== "ic" && !staff)
                errors.push(where + " : message " + m[1] + "() sans icone en tete");
            for (const [tech, shown] of forbidden) {
                if (args.indexOf('"' + tech) === -1) continue;
                errors.push(where + " : le texte dit \"" + tech + "\" (nom technique) au lieu de \"" + shown + "\"");
            }
        }
        while ((m = SHOP_CALL.exec(src))) {
            const args = callBody(src, m.index + m[0].length - 1);
            const at = args.indexOf("{");
            if (at < 0) continue;
            const obj = callBody(args, at);
            /* `image` est le nom REEl de l'item dessine dans la case : c'est la
               seule place ou le nom technique a le droit d'apparaitre. */
            const text = obj.replace(/image:[^,\n]*/g, "");
            checked++;
            /* `updateShopItemForPlayer` ne renvoie qu'un fragment (la
               description) : il ne peut pas porter les autres champs. */
            if (m[1] !== "updateShopItemForPlayer") {
                for (const key of ["image", "customTitle", "description"]) {
                    if (obj.indexOf(key + ":") === -1)
                        errors.push(where + " : carte de boutique sans " + key + " (" + m[1] + ")");
                }
                /* Le code de Bloxd est minifie par endroits : `canBuy:!1` est
                   la meme chose que `canBuy: false`. */
                const notBuyable = /canBuy\s*:\s*(false|!1|0)/.test(obj);
                if (!notBuyable && obj.indexOf("buyButtonText:") === -1)
                    errors.push(where + " : carte achetable sans buyButtonText (" + m[1] + ")");
            }
            const desc = /description:\s*\[/.exec(obj);
            if (desc) {
                const after = obj.slice(desc.index + desc[0].length).trimStart();
                if (after.indexOf("ic(") !== 0)
                    errors.push(where + " : description de carte qui ne commence pas par une icone");
            }
            for (const [tech, shown] of forbidden) {
                if (text.indexOf('"' + tech) === -1) continue;
                errors.push(where + " : carte de boutique qui dit \"" + tech + "\" au lieu de \"" + shown + "\"");
            }
        }
    }
}

/* ==========================================================================
   4. Ce que safeIcon renvoie VRAIMENT
   ==========================================================================
   Le tableau de bord des icones ne suffit pas : c'est `safeIcon()` qui decide
   ce qui part a l'ecran, alias compris. Un alias mal ecrit (`fa-trash-can-can`)
   transforme silencieusement une icone valide en « ? » ou en icone de secours.
   On charge donc le vrai module et on exige safeIcon(X) === X pour chaque
   icone du projet. */
{
    const { buildSync } = await import("esbuild");
    const built = buildSync({
        stdin: { contents: `export { safeIcon } from ${JSON.stringify(THEME)};`, resolveDir: ROOT, loader: "js" },
        bundle: true, write: false, format: "esm", platform: "browser", target: "es2020", logLevel: "silent",
    });
    const url = "data:text/javascript;base64," + Buffer.from(built.outputFiles[0].text).toString("base64");
    globalThis.api = globalThis.api || new Proxy({}, { get: () => () => undefined });
    const { safeIcon } = await import(url);
    for (const literal of LITERALS) {
        checked++;
        const got = safeIcon(literal);
        if (got !== literal) errors.push("safeIcon(\"" + literal + "\") renvoie \"" + got + "\" (l'icone serait remplacee en jeu)");
    }
    /* Les icones ingame aussi, casse comprise. */
    for (const name of ingame) {
        checked++;
        if (safeIcon(name) !== name) errors.push("safeIcon(\"" + name + "\") ne preserve pas l'icone ingame");
    }
    /* Et un mot nu ne doit JAMAIS partir tel quel : il s'afficherait « ? ». */
    for (const bare of ["globe", "star", "fire", "invisible", "jump boost", "dirt"]) {
        checked++;
        if (safeIcon(bare) === bare) errors.push("safeIcon(\"" + bare + "\") laisse passer un nom nu (affichage « ? »)");
    }
}

/* Un meme litteral peut etre vu deux fois (scan general + scan icon:/ic()) :
   on n'affiche qu'une ligne par probleme, sinon le vrai signal se noie. */
const unique = [...new Set(errors)];
if (unique.length) {
    console.error("Textes invalides (" + unique.length + ") :");
    for (const e of unique) console.error("  - " + e);
    process.exit(1);
}
console.log("Textes : " + checked + " verifications (icones + " + SIDEBAR_SIZES.length + " sidebars + barres), tout est valide.");
console.log("  Sidebars : " + SIDEBAR_SIZES.join(" | ") + " (budget " + BUDGET_SIDEBAR + ").");
console.log("  Boutons PC : dash " + entries.dash.length + " | capacites " + entries.ability.length + " | style " + entries.style.length + " (icones, touches, ids).");
console.log("  Capacites classees : " + ATTACK_TYPE_COUNT + " (16 types d'attaque, icones verifiees).");
console.log("  Noms d'items : " + ITEM_LOOKS_COUNT + " (nom + description, aucun renommage au give).");
console.log("  Interface : messages a icone, cartes de boutique completes, " + ITEM_TECH_COUNT + " noms techniques interdits dans les textes.");
