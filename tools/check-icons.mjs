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
const CONTROLS_RE = /const CONTROLS = \[([\s\S]*?)\n\];/;
const controlsSource = readFileSync(join(ROOT, "src/index.js"), "utf8");
const controlsBlock = CONTROLS_RE.exec(controlsSource);

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
        ui.playerQuest.p1 = quest.id;
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
const RICH = { money: 1234567, lvl: 87, xp: 4321, sp: 12, team: "PIRATE" };
/* Le pire cas RÉEL : un nouveau joueur, donc objectif de tutoriel ET première
   quête en cours. C'est exactement celui qui a le moins de place et le plus
   besoin de voir sa stamina. */
const NEWBIE = { id: "skyBandit3", progress: 3 };
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
       doivent jamais etre sacrifiees, meme quand la place manque. Le titre,
       lui, a la priorite de sacrifice la plus faible (12). */
    if (bars.length !== 2) errors.push(`${label} : une barre a ete sacrifiee (${bars.length}/2)`);
    if (quest) {
        const shownQuest = sidebar.some((p) => typeof p.str === "string" && p.str.indexOf("QUEST") !== -1);
        if (!shownQuest) errors.push(`${label} : le bloc de quete a ete coupe`);
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
   Et deux boutons sur la meme touche : le second est inutilisable. */
const KEYCODE_OK = /^(Key[A-Z]|Digit[0-9]|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Space)$/;
const EXPECTED_IDS = ["dash", "ability1", "ability2", "ability3", "ability4", "ability5"];

if (!controlsBlock) {
    errors.push("src/index.js : bloc CONTROLS introuvable (boutons du PC)");
} else {
    const entries = [];
    const reEntry = /\{[^{}]*\}/g;
    let em;
    while ((em = reEntry.exec(controlsBlock[1]))) {
        const raw = em[0];
        const id = /id:\s*"([^"]*)"/.exec(raw);
        const icon = /icon:\s*"([^"]*)"/.exec(raw);
        const keycode = /keycode:\s*"([^"]*)"/.exec(raw);
        const description = /description:\s*"([^"]*)"/.exec(raw);
        if (!id || !icon || !keycode) {
            errors.push("src/index.js : bouton incomplet (" + raw.replace(/\s+/g, " ") + ")");
            continue;
        }
        entries.push({ id: id[1], icon: icon[1], keycode: keycode[1], description: description ? description[1] : "" });
    }
    checked += entries.length;
    if (entries.length !== EXPECTED_IDS.length)
        errors.push("src/index.js : " + entries.length + " boutons au lieu de " + EXPECTED_IDS.length);
    for (let i = 0; i < EXPECTED_IDS.length; i++) {
        if (!entries.some((e) => e.id === EXPECTED_IDS[i]))
            errors.push("src/index.js : bouton \"" + EXPECTED_IDS[i] + "\" absent");
    }
    const keySeen = {};
    for (const e of entries) {
        if (e.icon.indexOf("fa-") === 0) {
            errors.push("bouton " + e.id + " : icone \"" + e.icon + "\" — customButtons attend un nom NU (sans \"fa-solid\")");
        } else if (!fa.has(e.icon)) {
            errors.push("bouton " + e.id + " : icone \"" + e.icon + "\" absente de la liste blanche (elle s'afficherait « ? »)");
        }
        if (!KEYCODE_OK.test(e.keycode))
            errors.push("bouton " + e.id + " : keycode \"" + e.keycode + "\" refuse par Bloxd");
        if (keySeen[e.keycode]) errors.push("bouton " + e.id + " : touche " + e.keycode + " deja prise par " + keySeen[e.keycode]);
        keySeen[e.keycode] = e.id;
        if (!e.description.trim()) errors.push("bouton " + e.id + " : description vide");
    }
    /* Chaque id doit etre traite par le handler, sinon le bouton ne fait rien. */
    const handlerAt = controlsSource.indexOf("onPlayerPressedButton");
    const handler = handlerAt >= 0 ? controlsSource.slice(handlerAt, handlerAt + 700) : "";
    if (handlerAt < 0) errors.push("src/index.js : onPlayerPressedButton introuvable");
    else {
        if (handler.indexOf('"dash"') === -1) errors.push("onPlayerPressedButton ne traite pas le bouton \"dash\"");
        if (!/ability\(\[1-5\]\)|ability\(\d/.test(handler))
            errors.push("onPlayerPressedButton ne traite pas les boutons ability1..5");
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
console.log("  Boutons PC : " + EXPECTED_IDS.join(", ") + " (icones, touches uniques, ids traites).");
