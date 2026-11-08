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
    const end = source.indexOf(").split(\" \")", start);
    if (end < 0) throw new Error("fin de " + name + " introuvable");
    const chunk = source.slice(start, end);
    /* Chaque morceau est une chaine "mot mot mot " : on eclate les mots. */
    const parts = chunk.match(/"([^"]*)"/g) || [];
    const out = [];
    for (const p of parts) {
        const words = p.slice(1, -1).split(" ");
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

/* Noms natifs Bloxd (items, blocs, icones ingame) : acceptes tels quels. */
const NATIVE_OK = /^[A-Z0-9]/;

function checkIcon(name) {
    if (typeof name !== "string" || !name.trim()) return "icone vide";
    const raw = name.trim();
    if (raw.indexOf("fa-") !== 0) {
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
for (const file of files) {
    const source = readFileSync(file, "utf8");
    const where = relative(ROOT, file);
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

async function renderSidebar(db, tutorialLine) {
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
            contents: `export * from ${JSON.stringify(join(ROOT, "src/core/UI.js"))};`,
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

const POOR = {};
const RICH = { money: 1234567, lvl: 87, xp: 4321, sp: 12, team: "PIRATE" };
const scenarios = [
    ["joueur nu", POOR, null],
    ["joueur charge + objectif de tutoriel", RICH, "Buy your first weapon at the Combat Teacher"],
];
for (const [label, db, tutorialLine] of scenarios) {
    const sidebar = await renderSidebar(db, tutorialLine);
    if (!Array.isArray(sidebar)) {
        errors.push(`${label} : aucune sidebar envoyee`);
        continue;
    }
    checked++;
    const size = JSON.stringify(sidebar).length;
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
        for (const key of ["width", "height"])
            if (b[key] !== undefined && typeof b[key] !== "string")
                errors.push(`${label} : ${key} doit etre une taille CSS ("0.75em")`);
    }
    /* Vert pour l'XP, bleu pour la stamina : c'est la demande du joueur, verifiee
       sur la teinte et non sur une constante recopiee. */
    const hues = bars.map((b) => (b.colours && b.colours[0] ? hueOf(b.colours[0].replace(/\s.*$/, "")) : -1));
    if (bars.length === 2) {
        if (!(hues[0] >= 90 && hues[0] <= 165)) errors.push(`${label} : barre d'XP pas verte (teinte ${Math.round(hues[0])})`);
        if (!(hues[1] >= 190 && hues[1] <= 260)) errors.push(`${label} : barre de stamina pas bleue (teinte ${Math.round(hues[1])})`);
    }
    /* Priorite 0 = garde en premier : l'objectif du tutoriel doit survivre a un
       joueur charge (regression de `priority || 9`, qui le mettait en dernier). */
    if (tutorialLine) {
        const head = tutorialLine.slice(0, 20); // la ligne est tronquee a 40 car.
        const shown = sidebar.some((p) => typeof p.str === "string" && p.str.indexOf(head) !== -1);
        if (!shown) errors.push(`${label} : l'objectif du tutoriel est coupe alors qu'il est prioritaire`);
    }
}

if (errors.length) {
    console.error("Textes invalides (" + errors.length + ") :");
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
}
console.log("Textes : " + checked + " verifications (icones + 2 barres + 2 sidebars), tout est valide.");
