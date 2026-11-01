/* Verifie que TOUTES les icones du code existent vraiment dans Bloxd.
 *
 * Bloxd n'affiche pas d'erreur pour une icone inconnue : il montre un « ? ».
 * Donc une faute de frappe invisible en developpement devient un bug visuel
 * en jeu. Ce script lit la liste blanche de src/core/theme.js (FA_NAMES,
 * FA_BRANDS) et refuse toute icone Font Awesome absente, ainsi que les mots
 * nus (« globe », « flag ») qui ne sont ni un item Bloxd ni une icone.
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
    const re = /icon:\s*["']([^"']*)["']/g;
    while ((m = re.exec(source))) {
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

if (errors.length) {
    console.error("Icones invalides (" + errors.length + ") :");
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
}
console.log("Icones : " + checked + " verifiees, toutes valides.");
