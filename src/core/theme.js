// core/theme.js — palette unique + icones Bloxd + normalisation des messages
//
// Deux problemes regles ici, au meme endroit :
//   1. une seule palette de couleurs pour TOUS les textes affiches ;
//   2. plus aucun emoji : chaque emoji devient une icone Bloxd (fa-solid / icone du jeu).
//
// Pourquoi un module central : les messages sont construits un peu partout
// (core, gameplay, fruit, utils, Code Blocks). Normaliser a la source
// demanderait de reecrire des centaines de litteraux ; ici on normalise au
// dernier moment, juste avant l'envoi, via say() / shout() et le patch de l'API.
//
// Regle : themeColor() est IDEMPOTENT (une couleur deja palette revient
// identique), donc formater deux fois ne change rien.

/* Palette. Une seule teinte par role, partout dans le jeu. */
export const C = {
    PIRATE: "#E63946", /* Pirates — rouge (plus rouge que le corail d'origine) */
    MARINE: "#7DD3FC", /* Marines — bleu clair */
    MONEY: "#FFD700", /* Argent — jaune dore */
    XP: "#22D3EE", /* XP — cyan */
    SUCCESS: "#4ADE80", /* Succes — vert */
    DANGER: "#EF4444", /* Danger — rouge */
    INFO: "#CBD5E1", /* Information — gris clair */
};

const ROLE_OF_VALUE = {};
for (const role in C) ROLE_OF_VALUE[C[role].toLowerCase()] = role;

/* Litteraux deja utilises dans le projet -> role. Evite de dependre d'un
   calcul de teinte pour les cas frequents (et donc d'un rendu surprenant). */
const ROLE_OF = {
    /* rouges / dangers */
    red: "DANGER", tomato: "DANGER", crimson: "DANGER", firebrick: "DANGER",
    "#ff0000": "DANGER", "#f00": "DANGER", "#cc0000": "DANGER", "#b91c1c": "DANGER",
    "#dc2626": "DANGER", "#ef4444": "DANGER", "#ff4444": "DANGER", "#ff3333": "DANGER",
    "#ff5555": "DANGER", "#ff6666": "DANGER", "#f87171": "DANGER", "#e74c3c": "DANGER",
    "#ff8844": "DANGER", "#ff8855": "DANGER", "#ff6600": "DANGER", "#f59e0b": "DANGER",
    "#ff8c00": "DANGER", "#ff9900": "DANGER",
    "#f97316": "DANGER", "#e67e22": "DANGER", "#d35400": "DANGER", "#c0392b": "DANGER",
    /* corail / accents chauds */
    coral: "PIRATE", "#ff7f50": "PIRATE", "#ff8a65": "PIRATE", "#f4845f": "PIRATE",
    violet: "PIRATE", purple: "PIRATE", magenta: "PIRATE", hotpink: "PIRATE", pink: "PIRATE",
    "#aa55ff": "PIRATE", "#bb88ff": "PIRATE", "#ff88ff": "PIRATE", "#f472b6": "PIRATE",
    "#ec62e8": "PIRATE", "#a855f7": "PIRATE", "#8b5cf6": "PIRATE", "#e84759": "PIRATE",
    /* argent / jaunes dores */
    gold: "MONEY", yellow: "MONEY", khaki: "MONEY", "#ffd700": "MONEY", "#ffdd00": "MONEY",
    "#ffdf00": "MONEY", "#facc15": "MONEY", "#fbbf24": "MONEY", "#ffdd55": "MONEY",
    "#ecc727": "MONEY", "#fde68a": "MONEY", "#fde047": "MONEY", "#fef08a": "MONEY",
    "#ffff00": "MONEY", "#ffc107": "MONEY",
    /* jaune franc : c'est de l'OR, pas une alerte. Avant, "#ffcc00" tombait
       dans les rouges : le nom d'un equipage, « Crew invite », un gain d'or
       s'affichaient en rouge de danger, alors que leur elementBgColor (le
       meme jaune, non normalise, lui) restait dore. Deux couleurs pour la
       meme chose. */
    "#ffcc00": "MONEY", "#ffaa00": "MONEY",
    /* succes / verts */
    lime: "SUCCESS", lightgreen: "SUCCESS", green: "SUCCESS", springgreen: "SUCCESS",
    "#00ff00": "SUCCESS", "#0f0": "SUCCESS", "#00ff88": "SUCCESS", "#55ff55": "SUCCESS",
    "#55ff88": "SUCCESS", "#4ade80": "SUCCESS", "#86efac": "SUCCESS", "#22c55e": "SUCCESS",
    "#34d399": "SUCCESS", "#2ecc71": "SUCCESS", "#7cff7c": "SUCCESS",
    /* xp / cyans */
    cyan: "XP", aqua: "XP", turquoise: "XP", "#00ffff": "XP", "#0ff": "XP",
    "#22d3ee": "XP", "#67e8f9": "XP", "#06b6d4": "XP", "#aaddff": "XP", "#00e5ff": "XP",
    /* marines / bleus */
    blue: "MARINE", lightblue: "MARINE", deepskyblue: "MARINE", skyblue: "MARINE",
    dodgerblue: "MARINE", royalblue: "MARINE", "#00bfff": "MARINE", "#3b82f6": "MARINE",
    "#55aaff": "MARINE", "#6bb6ff": "MARINE", "#7dd3fc": "MARINE", "#38bdf8": "MARINE",
    "#1e90ff": "MARINE", "#2791ec": "MARINE", "#cef3ff": "MARINE", "#1e40af": "MARINE",
    "#5aa9ff": "MARINE", "#0ea5e9": "MARINE", "#2563eb": "MARINE",
    /* Avertissements orange : meme famille que « #ff9900 » et « #ff6600 »,
       deja traites comme du danger. Sans cette ligne, « orange » traversait
       themeColor sans conversion : c'etait la SEULE couleur du jeu hors
       palette. */
    orange: "DANGER", darkorange: "DANGER",
    /* information / gris et blancs */
    white: "INFO", gray: "INFO", grey: "INFO", lightgray: "INFO", lightgrey: "INFO",
    silver: "INFO", gainsboro: "INFO", black: "INFO",
    "#ffffff": "INFO", "#fff": "INFO", "#aaaaaa": "INFO", "#888888": "INFO",
    "#666666": "INFO", "#999999": "INFO", "#bbbbbb": "INFO", "#cccccc": "INFO",
    "#b3b3b3": "INFO", "#94a3b8": "INFO", "#cbd5e1": "INFO", "#d1d5db": "INFO",
    "#e2e8f0": "INFO", "#f8fafc": "INFO", "#9ca3af": "INFO", "#e5e7eb": "INFO",
    "#f1f5f9": "INFO", "#475569": "INFO", "#334155": "INFO", "#dfe6ee": "INFO",
};

/* Teintes de reference : sert aux couleurs inconnues (choix par teinte). */
const HUE_ROLES = [
    ["DANGER", 0],
    ["PIRATE", 18],
    ["MONEY", 48],
    ["SUCCESS", 142],
    ["XP", 182],
    ["MARINE", 205],
];

/* Couleurs CSS nommees (les 16 de base + les plus courantes) : elles servent
   seulement a retrouver une TEINTE, jamais a s'afficher. */
const NAMED_COLOURS = {
    white: "#ffffff", black: "#000000", gray: "#808080", grey: "#808080",
    silver: "#c0c0c0", maroon: "#800000", red: "#ff0000", purple: "#800080",
    fuchsia: "#ff00ff", magenta: "#ff00ff", green: "#008000", lime: "#00ff00",
    olive: "#808000", yellow: "#ffff00", navy: "#000080", blue: "#0000ff",
    teal: "#008080", aqua: "#00ffff", cyan: "#00ffff", orange: "#ffa500",
    pink: "#ffc0cb", hotpink: "#ff69b4", violet: "#ee82ee", gold: "#ffd700",
    coral: "#ff7f50", tomato: "#ff6347", crimson: "#dc143c", khaki: "#f0e68c",
    lightgreen: "#90ee90", lightblue: "#add8e6", lightgray: "#d3d3d3",
    lightgrey: "#d3d3d3", salmon: "#fa8072", beige: "#f5f5dc", ivory: "#fffff0",
    lavender: "#e6e6fa", orchid: "#da70d6", plum: "#dda0dd", tan: "#d2b48c",
    turquoise: "#40e0d0", azure: "#f0ffff", brown: "#a52a2a", indigo: "#4b0082",
    springgreen: "#00ff7f", deepskyblue: "#00bfff", skyblue: "#87ceeb",
    dodgerblue: "#1e90ff", royalblue: "#4169e1", gainsboro: "#dcdcdc",
};

function parseColor(value) {
    const s = String(value).trim().toLowerCase();
    if (s.charAt(0) === "#") {
        const hex = s.slice(1);
        if (hex.length === 3) {
            return [
                parseInt(hex.charAt(0) + hex.charAt(0), 16),
                parseInt(hex.charAt(1) + hex.charAt(1), 16),
                parseInt(hex.charAt(2) + hex.charAt(2), 16),
            ];
        }
        if (hex.length === 6) {
            return [
                parseInt(hex.slice(0, 2), 16),
                parseInt(hex.slice(2, 4), 16),
                parseInt(hex.slice(4, 6), 16),
            ];
        }
        return null;
    }
    /* Couleurs CSS nommees : une teinte est indispensable. Une couleur nommee
       que parseColor ne connait pas traverse themeColor sans conversion, donc
       le jeu l'affiche telle quelle — hors palette. */
    const named = NAMED_COLOURS[s];
    if (named) return parseColor(named);
    return null;
}

function hueOf(r, g, b) {
    const rr = r / 255, gg = g / 255, bb = b / 255;
    const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb);
    const l = (max + min) / 2;
    const d = max - min;
    if (d === 0) return { h: 0, s: 0, l: l };
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
    return { h: h, s: s, l: l };
}

function roleForRgb(rgb) {
    if (!rgb || !isFinite(rgb[0]) || !isFinite(rgb[1]) || !isFinite(rgb[2])) return null;
    const hsl = hueOf(rgb[0], rgb[1], rgb[2]);
    /* Trop pale, trop sombre : c'est de l'information, pas une couleur d'action. */
    if (hsl.s < 0.16 || hsl.l < 0.12 || hsl.l > 0.97) return "INFO";
    let best = "INFO", bestD = 999;
    for (let i = 0; i < HUE_ROLES.length; i++) {
        const role = HUE_ROLES[i][0];
        let d = Math.abs(hsl.h - HUE_ROLES[i][1]);
        if (d > 180) d = 360 - d;
        if (d < bestD) {
            bestD = d;
            best = role;
        }
    }
    return best;
}

/* Exception assumee a la regle « une couleur par role » : les COULEURS
   D'OBJETS de l'inspection d'inventaire. Ce ne sont pas des roles (equipe,
   argent, succes...), donc elles gardent leur teinte exacte au lieu d'etre
   ramenees a la palette :
     - item normal ...................... gris un peu plus fonce
     - item normal renomme (nom custom) . gris tres clair
     - fruit du demon (sneak + click) ... rouge-orange
     - ability (item d'un fruit) ........ bleu-violet
     - capacity (style de combat) ....... beige-rose */
export const ITEM_COLOR = {
    plain: "#8B8F98",     /* item normal : gris un peu plus fonce */
    custom: "#E5E7EB",    /* item normal renomme (nom custom) : gris tres clair */
    fruit: "#FF6B35",     /* fruit du demon (mangeable, sneak + click) : rouge-orange */
    ability: "#8B5CF6",   /* ABILITY : item d'un fruit (bleu-violet) */
    capacity: "#E8B4A0",  /* CAPACITY : item d'un style de combat (beige-rose) */
};

const KEEP_AS_IS = {};
for (const k in ITEM_COLOR) KEEP_AS_IS[ITEM_COLOR[k].toLowerCase()] = ITEM_COLOR[k];

/* Deuxieme exception, aussi assumee : les TEINTES DE LA SIDEBAR D'AVANT
   (demande 88). Le joueur a demande de retrouver l'interface d'origine, pas
   une version repeinte : #00BFFF (titre, quete) et #FF8C00 (niveau) etaient
   dans la palette comme bleu clair et rouge de danger. Personne d'autre ne
   les utilise dans le projet, donc les garder ne change rien ailleurs — ca
   evite juste que la sidebar se recolorie toute seule au premier appel de
   themeColor(). */
const LEGACY_TINTS = { "#00bfff": "#00BFFF", "#ff8c00": "#FF8C00" };
for (const k in LEGACY_TINTS) KEEP_AS_IS[k] = LEGACY_TINTS[k];

/* Couleur -> couleur de la palette. Renvoie l'entree inchangee si illisible. */
export function themeColor(value) {
    if (typeof value !== "string" || !value) return value;
    const key = value.trim().toLowerCase();
    const keep = KEEP_AS_IS[key];
    if (keep) return keep;
    const direct = ROLE_OF_VALUE[key];
    if (direct) return C[direct];
    const role = ROLE_OF[key];
    if (role) return C[role];
    const byHue = roleForRgb(parseColor(key));
    return byHue ? C[byHue] : value;
}

/* ==========================================================================
   ICONES — LISTE BLANCHE

   Bloxd ne connait qu'un jeu FERME d'icones. Un nom inconnu ne provoque pas
   d'erreur : il s'affiche simplement en « ? ». D'ou ce garde-fou, applique a
   TOUT ce qui sort (chat, textes de boutique, descriptions d'items, Code
   Blocks), en un seul endroit : `safeIcon()`.

     - un nom Font Awesome doit figurer dans FA_NAMES (sinon ICON_ALIAS, sinon
       ICON_FALLBACK) ;
     - les icones natives Bloxd (item, bloc, icone ingame : "Apple", "Frozen",
       "Compass"...) passent telles quelles : on ne peut pas les valider sans
       embarquer la liste des milliers d'items, et elles sont deja valides ;
     - un mot nu en minuscules ("globe", "flag") n'est ni l'un ni l'autre :
       il est corrige par BARE_ALIAS.

   Ajouter une icone = ajouter son nom ici, sinon elle restera invisible. */

/* Icônes **ingame** de Bloxd (96) : elles s'écrivent avec des majuscules et
   des espaces (« Jump Boost »), donc elles ne peuvent pas passer par les
   tableaux de Font Awesome. Elles sont préférées aux icônes Font Awesome
   (docs Bloxd : « Prefer Bloxd-native icons »). */
const INGAME_NAMES = (
    "Damage|Damage Reduction|Speed|VoidJump|Fist|Frozen|Hydrated|Invisible|Jump Boost|" +
    "Poisoned|Slowness|Weakness|Health Regen|Healing Pulse|Haste|Double Jump|" +
    "Heat Resistance|Gliding|Boating|Obsidian Boating|Riding|Bunny Hop|FallDamage|" +
    "Feather Falling|Thief|X-Ray Vision|Mining Yield|Brain Rot|Rested Damage|Rested Haste|" +
    "Rested Speed|Rested Farming Yield|Rested Aura|Blindness|Pickpocketer|Lifesteal|" +
    "Bounciness|Air Walk|Wall Climbing|Thorns|Poopy|Glowing|Night Vision|Irradiated|" +
    "Draugr Knight Head|Draugr Warper Head|Magma Golem Head|Mystery Fish|Damage Enchantment|" +
    "Critical Damage Enchantment|Attack Speed Enchantment|Protection Enchantment|" +
    "Health Enchantment|Health Regen Enchantment|Stomp Damage Enchantment|" +
    "Knockback Resist Enchantment|Arrow Speed Enchantment|Arrow Damage Enchantment|" +
    "Quick Charge Enchantment|Break Speed Enchantment|Momentum Enchantment|" +
    "Mining Yield Enchantment|Farming Yield Enchantment|Mining Aura Enchantment|" +
    "Digging Aura Enchantment|Lumber Aura Enchantment|Farming Aura Enchantment|" +
    "Vertical Knockback Enchantment|Horizontal Knockback Enchantment|" +
    "Firecracker Cooldown Enchantment|Firecracker Boost Enchantment|" +
    "Gliding Speed Enchantment|Self Yield|Friends|Riding Speed|Feed Aura|Double Poop|" +
    "Mob Slayer|Rainbow Wool|Pack Leader|Max Health|Poison Claws|Mob Yield|Antlers Bonus|" +
    "Health|HealthShield|Cross|Friendship|Dotted Friendship|Hunger|Empty Hunger|" +
    "Pixelated Heart|Question Mark|Trader Black|Trader Blue|Trader Piggy"
).split("|").filter(Boolean);

const FA_NAMES = (
    "add angle-double-up angle-down angle-up angles-up arrow-left arrow-up " +
    "arrow-up-right-from-square arrows arrows-h arrows-left-right arrows-rotate " +
    "arrows-up-down-left-right award backpack bars bee bell block-question bolt boot " +
    "calendar caret-down caret-right caret-up cart-shopping check chess-knight chess-rook " +
    "child-reaching circle-check circle-info circle-plus circle-question circle-xmark " +
    "clock-rotate-left cog coins comment-dots commenting compress computer-mouse cookie " +
    "copy crosshairs crown cube cubes cut dice dizzy door-closed door-open download edit " +
    "ellipsis ellipsis-h exclamation exclamation-triangle expand external-link eye " +
    "eye-slash face-diagonal-mouth face-dizzy face-raised-eyebrow face-smile face-worried " +
    "feather-alt feather-pointed file-alt file-clipboard file-lines file-text film fire " +
    "fist-raised flag folder folder-image folder-open gauge-high gear gem globe hammer " +
    "hand-back-point-up hand-fist hand-holding-medical hand-point-left hand-wave " +
    "hands-clapping hat-santa hat-witch heart heart-music-camera-bolt history hourglass " +
    "hourglass-clock hourglass-empty house icons image image-slash info-circle joystick " +
    "layer-group left-from-bracket lightbulb list list-squares location-check " +
    "location-xmark lock lock-open magnifying-glass male map-marker-check map-marker-times " +
    "map-marker-xmark minus minus-square moon mouse music music-slash navicon palette pants " +
    "party-horn paste pause pen pen-field pen-to-square person person-arrow-down-to-line " +
    "person-arrow-up-from-line person-falling-burst person-military-pointing planet-ringed " +
    "play plus plus-circle power-off ranking-star recycle redo-alt refresh " +
    "right-from-bracket rocket-launch rotate-forward rotate-right scissors search shield " +
    "shield-alt shield-blank shield-halved shirt shoe shopping-cart sign-out-alt skull " +
    "smile snowflake sparkle square-dashed square-minus star star-christmas store subtract " +
    "sun-bright swords sync t-shirt tachometer-alt tachometer-alt-fast terminal trash-alt " +
    "trash-can triangle-exclamation trophy tshirt up-from-bracket upload user " +
    "user-astronaut user-check user-clock user-friends user-group user-group-crown " +
    "user-minus user-plus user-slash user-unlock users-crown video video-camera volume " +
    "volume-down volume-low volume-medium volume-slash warning wifi wifi-3 wifi-strong " +
    "wrench x xmark zap"
).split(" ");

const FA_BRANDS = (
    "apple chrome discord google-play instagram reddit-alien tiktok twitch " +
    "windows x-twitter youtube"
).split(" ");

const FA_SET = {};
for (let i = 0; i < FA_NAMES.length; i++) FA_SET[FA_NAMES[i]] = 1;
const INGAME_BY_LOWER = {};
for (let i = 0; i < INGAME_NAMES.length; i++) INGAME_BY_LOWER[INGAME_NAMES[i].toLowerCase()] = INGAME_NAMES[i];
const BRAND_SET = {};
for (let i = 0; i < FA_BRANDS.length; i++) BRAND_SET[FA_BRANDS[i]] = 1;

/* Icone de secours : toujours valide, jamais de « ? ». */
export const ICON_FALLBACK = "fa-solid fa-circle-info";

/* Anciens noms (ou noms plausibles) -> nom valide. Le suffixe fait foi :
   "fa-solid fa-recycle" et "fa-broom" tombent tous les deux sur "broom". */
const ICON_ALIAS = {
    gift: "fa-solid fa-award",
    microphone: "fa-solid fa-volume",
    "microphone-slash": "fa-solid fa-volume-slash",
    ghost: "Invisible",
    keyboard: "fa-solid fa-terminal",
    bullhorn: "fa-solid fa-bell",
    broom: "fa-solid fa-recycle",
    ban: "fa-solid fa-circle-xmark",
    anchor: "Boat",
    unlock: "fa-solid fa-lock-open",
    trash: "fa-solid fa-trash-can",
    users: "fa-solid fa-user-group",
    clock: "fa-solid fa-hourglass",
    compass: "fa-solid fa-map-marker-check",
    "bag-shopping": "fa-solid fa-cart-shopping",
    "location-crosshairs": "fa-solid fa-crosshairs",
    "island-tropical": "fa-solid fa-globe",
    gavel: "fa-solid fa-hammer",
    question: "fa-solid fa-circle-question",
    "arrow-right-to-bracket": "fa-solid fa-door-open",
    "shield-check": "fa-solid fa-shield-halved",
    "user-shield": "fa-solid fa-shield-halved",
};

/* Mots nus historiques (ni Font Awesome, ni nom Bloxd). */
const BARE_ALIAS = {
    globe: "fa-solid fa-globe",
    flag: "fa-solid fa-flag",
    nan: ICON_FALLBACK,
    undefined: ICON_FALLBACK,
    null: ICON_FALLBACK,
    star: "fa-solid fa-star",
    fire: "fa-solid fa-fire",
};

/* Nom d'icone sur : renvoie TOUJOURS quelque chose que Bloxd sait afficher. */
export function safeIcon(name) {
    if (typeof name !== "string") return ICON_FALLBACK;
    const raw = name.trim();
    if (!raw) return ICON_FALLBACK;

    /* Icone native Bloxd (item, bloc, icone ingame) : on n'y touche pas, mais
       on remet la casse exacte d'une icone ingame — « invisible » ou
       « jump boost » s'afficheraient en « ? » alors que « Invisible » et
       « Jump Boost » existent. */
    if (raw.indexOf("fa-") !== 0) {
        const ingame = INGAME_BY_LOWER[raw.toLowerCase()];
        if (ingame) return ingame;
        const bare = raw.indexOf(" ") === -1 && raw === raw.toLowerCase();
        if (bare) return BARE_ALIAS[raw] || ICON_FALLBACK;
        return raw;
    }

    const tokens = raw.split(/\s+/);
    let base = tokens[tokens.length - 1];
    if (base.indexOf("fa-") === 0) base = base.slice(3);

    if (tokens.indexOf("fa-brands") !== -1) {
        return BRAND_SET[base] ? "fa-solid fa-brands fa-" + base : ICON_FALLBACK;
    }
    if (FA_SET[base]) return raw;
    return ICON_ALIAS[base] || ICON_FALLBACK;
}

/* Emoji -> icone Bloxd. La liste couvre tous les emojis du projet ; les
   suivants iront directement dans ICON. */
export const ICON = {
    "\u2694": "fa-solid fa-swords", /* croix = combat */
    "\u274C": "fa-solid fa-xmark", /* croix rouge */
    "\u2716": "fa-solid fa-xmark", /* x lourd */
    "\u2705": "fa-solid fa-circle-check", /* ok */
    "\u26A0": "fa-solid fa-triangle-exclamation", /* attention */
    "\u2620": "fa-solid fa-skull", /* tete de mort */
    "\u2693": "fa-solid fa-shield-halved", /* ancre -> bouclier */
    "\u{1F6AA}": "fa-solid fa-sign-out-alt", /* porte */
    "\u{1F4A5}": "fa-solid fa-fire", /* explosion */
    "\u{1F4E9}": "fa-solid fa-bell", /* enveloppe */
    "\u{1F94B}": "fa-solid fa-hand-fist", /* arts martiaux */
    "\u{1F4B0}": "fa-solid fa-coins", /* sac d'argent */
    "\u{1F389}": "fa-solid fa-party-horn", /* fete */
    "\u{1F4DC}": "fa-solid fa-file-lines", /* parchemin */
    "\u{1F4CD}": "fa-solid fa-map-marker-check", /* position */
    "\u{1F3C6}": "fa-solid fa-trophy", /* trophee */
    "\u{1F525}": "fa-solid fa-fire", /* feu */
    "\u{1F464}": "fa-solid fa-user", /* personne */
    "\u2728": "fa-solid fa-sparkle", /* etincelles */
    "\u2726": "fa-solid fa-sparkle", /* etoile a 4 branches */
    "\u{1F4C8}": "fa-solid fa-ranking-star", /* courbe qui monte */
    "\u{1F680}": "fa-solid fa-rocket-launch", /* fusee */
    "\u{1F479}": "fa-solid fa-skull", /* ogre */
    "\u{1F9F9}": "fa-solid fa-recycle", /* balai */
    "\u26CF": "fa-solid fa-hammer", /* pioche */
    "\u{1F48E}": "fa-solid fa-gem", /* gemme */
    "\u{1F3F4}": "fa-solid fa-flag", /* drapeau */
    "\u{1F451}": "fa-solid fa-crown", /* couronne */
    "\u{1F511}": "fa-solid fa-lock", /* cle */
    "\u{1F512}": "fa-solid fa-lock", /* cadenas */
    "\u{1F513}": "fa-solid fa-lock-open", /* cadenas ouvert */
    "\u{1F6E1}": "fa-solid fa-shield", /* bouclier */
    "\u2B50": "fa-solid fa-star", /* etoile */
    "\u{1F4DA}": "fa-solid fa-file-lines", /* livres */
    "\u{1F4AC}": "fa-solid fa-comment-dots", /* bulle */
    "\u{1F50A}": "fa-solid fa-volume", /* son */
    "\u{1F3AF}": "fa-solid fa-crosshairs", /* cible */
};

/* Caracteres de presentation a jeter (variateur, jointure). */
const SKIP = { "\uFE0F": 1, "\u200D": 1, "\uFE0E": 1 };

function textPart(text, color) {
    if (!color) return text;
    return { str: text, style: { color: color } };
}

/* Un texte contenant un emoji est decoupe en morceaux + icone. */
function splitIcons(text, color) {
    const out = [];
    let buffer = "";
    for (let i = 0; i < text.length; i++) {
        const ch = text.charAt(i);
        if (SKIP[ch]) continue;
        let icon = ICON[ch];
        if (!icon) {
            /* paires astrales (U+1F300 et plus) : 2 unites de code */
            const code = text.codePointAt(i);
            if (code > 0xffff) {
                icon = ICON[String.fromCodePoint(code)];
                if (icon) i++;
            }
        }
        if (!icon) {
            buffer += ch;
            continue;
        }
        if (buffer) {
            out.push(textPart(buffer, color));
            buffer = "";
        }
        const part = { icon: icon };
        if (color) part.style = { color: color };
        out.push(part);
    }
    if (buffer) out.push(textPart(buffer, color));
    if (!out.length) out.push(textPart("", color));
    return out;
}

function normalizeStyle(style) {
    if (!style || typeof style !== "object" || !style.color) return style;
    const color = themeColor(style.color);
    if (color === style.color) return style;
    return Object.assign({}, style, { color: color });
}

/* Normalise un texte (string ou tableau de parties Bloxd). */
export function format(message, style) {
    const baseColor = style && style.color ? themeColor(style.color) : null;
    if (typeof message === "string") {
        const parts = splitIcons(message, baseColor);
        if (parts.length === 1 && typeof parts[0] === "string") return message;
        return parts;
    }
    if (!Array.isArray(message)) return message;
    const out = [];
    for (let i = 0; i < message.length; i++) {
        const part = message[i];
        if (typeof part === "string") {
            const pieces = splitIcons(part, baseColor);
            for (let j = 0; j < pieces.length; j++) out.push(pieces[j]);
            continue;
        }
        if (!part || typeof part !== "object") {
            out.push(part);
            continue;
        }
        if (part.icon) {
            const iconStyle = normalizeStyle(part.style);
            const iconName = safeIcon(part.icon);
            if (iconName === part.icon && iconStyle === part.style) {
                out.push(part);
                continue;
            }
            const fixed = Object.assign({}, part, { icon: iconName });
            if (iconStyle !== part.style) fixed.style = iconStyle;
            out.push(fixed);
            continue;
        }
        if (typeof part.str === "string") {
            const ownColor = part.style && part.style.color ? themeColor(part.style.color) : baseColor;
            const st = part.style || (baseColor ? {} : null);
            const styled = st ? Object.assign({}, st, ownColor ? { color: ownColor } : {}) : null;
            const pieces = splitIcons(part.str, ownColor);
            if (pieces.length === 1) {
                out.push(styled ? { str: part.str, style: styled } : { str: part.str });
                continue;
            }
            for (let j = 0; j < pieces.length; j++) {
                const piece = pieces[j];
                if (typeof piece === "string") out.push({ str: piece, style: styled || undefined });
                else out.push(piece);
            }
            continue;
        }
        out.push(part);
    }
    return out;
}

/* Style d'un message simple (sendMessage accepte un 3e argument). */
function outStyle(style) {
    if (!style || typeof style !== "object") return style;
    const copy = normalizeStyle(style);
    return copy === style ? style : copy;
}

/* --- Budget de taille -----------------------------------------------------
   Bloxd refuse un textStyling trop gros : le moteur leve
   « InternalError: Argument too large » et l'erreur remonte au handler
   (d'ou « World code tick: ... »). La limite se situe autour de la taille de
   la sidebar ; on prend donc une marge confortable et on DEGRADE au lieu de
   jeter : fusion, simplification des styles, puis troncature.

   Trois paliers :
     BUDGET_SIDEBAR : textes "collés" a l'ecran (RightInfoText, middleText*),
                      envoyes a chaque tick -> budget serre ;
     BUDGET         : messages ordinaires (chat, boutiques, textes flottants) ;
     BUDGET_SHOP    : panneaux de boutique, ou l'on accepte un peu plus gros. */
/* 1400 = la valeur du chat, qui passe en jeu en permanence : c'est la plus
   grosse taille de textStyling dont on soit SUR qu'elle est acceptee. La
   sidebar complete (fruit + style + tutoriel + quete) pese 1398 caracteres ;
   au-dela, elle perd des blocs par ordre de priorite plutot que d'etre refusee
   (erreur « Argument too large », qui casse le tick). */
export const BUDGET_SIDEBAR = 1400;
export const BUDGET = 1400;
export const BUDGET_SHOP = 1500;

/* Taille serialisee d'un payload : c'est elle que le moteur compte. */
export function measure(value) {
    if (value === undefined || value === null) return 0;
    try { return JSON.stringify(value).length; } catch (e) { return 0; }
}

function styleKey(style) {
    if (!style || typeof style !== "object") return "";
    try { return JSON.stringify(style); } catch (e) { return ""; }
}

/* Parties voisines de meme style -> une seule partie. Le rendu est identique
   et chaque partie economisee coute ~40 a 80 caracteres de JSON. */
function mergeNeighbours(parts) {
    const out = [];
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const last = out[out.length - 1];
        if (
            last && typeof last.str === "string" &&
            part && typeof part.str === "string" &&
            styleKey(last.style) === styleKey(part.style)
        ) {
            out[out.length - 1] = { str: last.str + part.str, style: last.style };
            continue;
        }
        out.push(part);
    }
    return out;
}

/* fontSize / fontWeight pesent lourd et ne servent qu'aux titres : on garde
   le style complet de la plus grande police (les titres) et des premieres
   parties, et on allege tout le reste. */
function stripHeavyStyles(parts) {
    let maxSize = 0;
    for (let i = 0; i < parts.length; i++) {
        const style = parts[i] && parts[i].style;
        const size = style && style.fontSize !== undefined ? parseFloat(style.fontSize) : 0;
        if (size > maxSize) maxSize = size;
    }
    const out = [];
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!part || typeof part !== "object" || !part.style) {
            out.push(part);
            continue;
        }
        const size = part.style.fontSize !== undefined ? parseFloat(part.style.fontSize) : 0;
        const isTitle = maxSize > 0 && size >= maxSize;
        if (isTitle) {
            out.push(part);
            continue;
        }
        const keepBold = i < 3;
        if (!part.style.fontSize && (!part.style.fontWeight || !keepBold)) {
            out.push(part);
            continue;
        }
        const style = {};
        for (const key in part.style) {
            if (key === "fontSize") continue;
            if (key === "fontWeight" && !keepBold) continue;
            style[key] = part.style[key];
        }
        out.push(Object.assign({}, part, { style: style }));
    }
    return out;
}

function strOf(part) {
    return part && typeof part.str === "string" ? part.str : "";
}

/* Dernier recours : on garde les parties entieres qui tiennent, on coupe la
   suivante au caractere pres et on termine par une ellipse. Le rendu reste
   lisible et on ne depasse JAMAIS le budget. */
function truncateToBudget(parts, limit) {
    const out = [];
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (measure(out.concat([part])) <= limit) {
            out.push(part);
            continue;
        }
        const text = strOf(part);
        if (text) {
            for (let keep = text.length; keep > 0; keep -= 4) {
                const candidate = { str: (keep > 3 ? text.slice(0, keep - 3) : "") + "...", style: part.style };
                if (measure(out.concat([candidate])) <= limit) {
                    out.push(candidate);
                    break;
                }
            }
        }
        break;
    }
    if (!out.length) {
        const first = parts[0];
        out.push(first && typeof first.str === "string" ? { str: first.str.slice(0, 32) + "...", style: first.style } : { str: "..." });
    }
    return out;
}

/* Ramene un payload sous le budget, en gardant le sens du message. */
export function fit(message, budget) {
    const limit = budget || BUDGET;
    if (message === undefined || message === null) return message;
    if (typeof message === "string") {
        if (message.length + 4 <= limit) return message;
        return message.slice(0, Math.max(1, limit - 8)) + "...";
    }
    if (!Array.isArray(message)) return message;
    let out = mergeNeighbours(message);
    if (measure(out) <= limit) return out;
    out = stripHeavyStyles(out);
    if (measure(out) <= limit) return out;
    return truncateToBudget(out, limit);
}

/* Messages. say() = un joueur, shout() = tout le monde.
   On garde l'acces d'origine a l'API pour ne pas formater deux fois. */
const native = {};

function nativeSend() {
    return native.sendMessage || api.sendMessage;
}

function nativeBroadcast() {
    return native.broadcastMessage || api.broadcastMessage;
}

export function say(playerId, message, style) {
    try {
        nativeSend()(playerId, fit(format(message, style), BUDGET), outStyle(style));
    } catch (e) {}
}

export function shout(message, style) {
    try {
        nativeBroadcast()(fit(format(message, style), BUDGET), outStyle(style));
    } catch (e) {}
}

/* Annonce brute : AUCUNE normalisation de couleur.
   Les messages normaux passent par themeColor() (une couleur par role), ce qui
   ramenerait « <yellow> » a la palette. Une annonce ecrite par un admin doit
   garder EXACTEMENT la couleur demandee (nom Bloxd ou hexadecimal), donc on
   envoie les segments tels quels a l'API d'origine. Les emojis sont quand
   meme convertis en icones Bloxd, et le budget de taille s'applique. */
export function shoutRaw(message) {
    try {
        nativeBroadcast()(fit(toIconsOnly(message), BUDGET));
    } catch (e) {}
}

/* Conversion emoji -> icone, sans toucher aux couleurs. */
function toIconsOnly(message) {
    if (typeof message === "string") return message;
    if (!Array.isArray(message)) return message;
    const out = [];
    for (let i = 0; i < message.length; i++) {
        const part = message[i];
        if (!part || typeof part !== "object" || typeof part.str !== "string" || part.icon) {
            out.push(part);
            continue;
        }
        const color = part.style && part.style.color ? part.style.color : null;
        const pieces = splitIcons(part.str, color);
        for (let j = 0; j < pieces.length; j++) {
            const piece = pieces[j];
            if (typeof piece === "string") out.push(part.style ? { str: piece, style: part.style } : { str: piece });
            else out.push(piece);
        }
    }
    return out;
}

/* ══════════════════════════════════════════════════════════════════════════
   SEGMENTS DE MESSAGE — txt() / bold() / ic()

   Un message Bloxd est un tableau de parties, et une partie n'a que deux
   formes utiles :

       { str: " You bought ", style: { color: C.INFO } }
       { icon: "fa-solid fa-coins", style: { color: C.MONEY } }

   Le jeu en construisait un millier a la main, avec la meme ponctuation
   recopiee : `txt(texte, couleur)` et `ic(icone, couleur)` remplacent ces
   litteraux, `bold(texte, couleur)` le cas (tres frequent) du texte en gras.
   La 3e valeur est reservee aux autres proprietes de style (fontSize,
   fontWeight non standard) : elle n'est PAS fusionnee avec la couleur, donc
   on peut passer la meme constante sans la modifier par accident.

   La couleur reste celle qu'on donne : c'est format() qui la ramene a la
   palette au moment de l'envoi (themeColor est idempotent). Aucune de ces
   fabriques n'appelle l'API ni ne touche a l'etat : elles ne construisent
   qu'un objet, exactement comme le litteral qu'elles remplacent.
   ══════════════════════════════════════════════════════════════════════════ */

function segmentStyle(color, extra) {
    if (!extra) return color ? { color: color } : null;
    if (!color) return Object.assign({}, extra);
    /* color en premier : l'ordre des cles reste celui qu'ecrivaient les
       litteraux, donc deux segments identiques restent identiques. */
    return Object.assign({ color: color }, extra);
}

/* Montants lisibles : 14000 devient « 14,000 ». Les prix, les primes et
   l'argent du joueur se lisent d'un coup d'oeil au lieu de se compter. */
export function nfmt(n) {
    const value = Number(n);
    if (!isFinite(value)) return String(n);
    const digits = String(Math.abs(Math.round(value)));
    let out = "";
    for (let i = 0; i < digits.length; i++) {
        if (i > 0 && (digits.length - i) % 3 === 0) out += ",";
        out += digits.charAt(i);
    }
    return (value < 0 ? "-" : "") + out;
}

/* Texte seul. */
export function txt(str, color, extra) {
    const style = segmentStyle(color, extra);
    return style ? { str: str, style: style } : { str: str };
}

/* Texte en gras : le style exact que le jeu ecrivait a la main. */
export function bold(str, color) {
    return { str: str, style: { color: color, fontWeight: "bold" } };
}

/* Icone seule. */
export function ic(name, color, extra) {
    const style = segmentStyle(color, extra);
    return style ? { icon: name, style: style } : { icon: name };
}

/* Barre de progression NATIVE de Bloxd (`type: "ProgressBar"`, ajoutee en
   novembre 2026) : c'est le moteur qui dessine, plus une suite de « █ ».
   `progress` est un ratio 0..1 ; les couleurs sont du CSS simple (nom, hex,
   rgb()/hsl()), eventuellement suivies d'une position d'arret
   (« #4ADE80 30% »). Aucune fonction CSS exotique : url() est refuse.
   L'objet est un element de CustomTextStyling comme un autre — il n'a ni `str`
   ni `icon`, donc format() et fit() le laissent intact, et measure() le compte
   a sa taille JSON reelle (d'ou l'interet de ne pas le surcharger). */
/* TAILLE DES BARRES (demande 99) : elle vit ICI, a cote de `bar()`, et pas
   dans core/UI.js — c'est le genre de reglage qu'on cherche naturellement dans
   theme.js. Une seule source, lue par la sidebar (et par tout futur ecran qui
   affiche une barre), pour qu'une modification ici se voie vraiment en jeu.
   Le ratio suit celui de la reference (~10 pour 1) : une barre plus large que
   haute, lisible sans prendre la moitie de la hauteur de la carte.
   `height` et `width` DOIVENT rester des tailles CSS en px : sans `width`,
   Bloxd etire la barre sur toute la ligne et elle redevient un fil. */
export const BAR_SIZE = { height: "18px", width: "150px" };        /* PC */
export const BAR_SIZE_MOBILE = { height: "14px", width: "120px" }; /* mobile */

export function bar(progress, colours, extra) {
    const ratio = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
    /* 3 decimales suffisent : au-dela on paie des caracteres pour une
       difference invisible a l'ecran (0.3333333 > 0.333). */
    /* La taille NE s'ecrit PAS ici : elle arrive par `extra` (BAR_SIZE /
       BAR_SIZE_MOBILE ci-dessus), et la boucle de la ligne suivante ecrase
       toute valeur posee dans cet objet. C'est exactement pour ca qu'un
       `width` ajoute a la main ici ne changeait rien en jeu : la boucle
       `for (const key in extra)` le recouvrait avec la taille de la sidebar. */
    const out = { type: "ProgressBar", progress: Math.round(ratio * 1000) / 1000 };
    if (colours) out.colours = colours;
    if (extra) for (const key in extra) out[key] = extra[key];
    return out;
}

/* --- Patch de l'API -------------------------------------------------------
   Dernier filet : tout ce qui passe par api.sendMessage / broadcastMessage /
   les textes de boutique est normalise, y compris le code des Code Blocks.
   Si l'objet api refuse l'ecriture, on ne casse rien : say()/shout() restent
   utilises par le World Code et font le travail. */
const SHOP_TEXT_KEYS = ["customTitle", "description", "buyButtonText", "title", "lore"];
/* Options client qui contiennent du TEXTE (les autres restent des nombres,
   des booleens... on n'y touche pas). */
const TEXT_OPTIONS = {
    middleTextUpper: 1,
    middleTextLower: 1,
    middleTextTop: 1,
    RightInfoText: 1,
    crosshairText: 1,
    respawnButtonText: 1,
};
let patched = false;

function formatShopOptions(options) {
    if (!options || typeof options !== "object") return options;
    let copy = null;
    for (let i = 0; i < SHOP_TEXT_KEYS.length; i++) {
        const key = SHOP_TEXT_KEYS[i];
        if (!options[key]) continue;
        const value = fit(format(options[key]), BUDGET_SHOP);
        if (value === options[key]) continue;
        if (!copy) copy = Object.assign({}, options);
        copy[key] = value;
    }
    return copy || options;
}

export function installTheme() {
    if (patched) return true;
    try {
        const original = {
            sendMessage: api.sendMessage,
            broadcastMessage: api.broadcastMessage,
            sendOverShopInfo: api.sendOverShopInfo,
            createShopItemForPlayer: api.createShopItemForPlayer,
            updateShopItemForPlayer: api.updateShopItemForPlayer,
            setClientOption: api.setClientOption,
            setClientOptions: api.setClientOptions,
            sendFlyingMiddleMessage: api.sendFlyingMiddleMessage,
        };
        native.sendMessage = original.sendMessage;
        native.broadcastMessage = original.broadcastMessage;
        api.sendMessage = function (playerId, message, style) {
            return original.sendMessage(playerId, fit(format(message, style), BUDGET), outStyle(style));
        };
        api.broadcastMessage = function (message, style) {
            return original.broadcastMessage(fit(format(message, style), BUDGET), outStyle(style));
        };
        if (original.sendOverShopInfo) {
            api.sendOverShopInfo = function (playerId, parts) {
                return original.sendOverShopInfo(playerId, fit(format(parts), BUDGET_SHOP));
            };
        }
        if (original.createShopItemForPlayer) {
            api.createShopItemForPlayer = function (playerId, categoryKey, itemKey, options) {
                return original.createShopItemForPlayer(playerId, categoryKey, itemKey, formatShopOptions(options));
            };
        }
        if (original.updateShopItemForPlayer) {
            api.updateShopItemForPlayer = function (playerId, categoryKey, itemKey, options) {
                return original.updateShopItemForPlayer(playerId, categoryKey, itemKey, formatShopOptions(options));
            };
        }
        if (original.sendFlyingMiddleMessage) {
            api.sendFlyingMiddleMessage = function (playerId, message, distance, lifetime) {
                return original.sendFlyingMiddleMessage(playerId, fit(format(message), BUDGET), distance, lifetime);
            };
        }
        if (original.setClientOption) {
            api.setClientOption = function (playerId, key, value) {
                if (TEXT_OPTIONS[key] && value !== undefined && value !== null && value !== "") {
                    value = fit(format(value), BUDGET_SIDEBAR);
                }
                return original.setClientOption(playerId, key, value);
            };
        }
        if (original.setClientOptions) {
            api.setClientOptions = function (playerId, options) {
                if (options && typeof options === "object") {
                    let copy = null;
                    for (const key in TEXT_OPTIONS) {
                        const value = options[key];
                        if (value === undefined || value === null || value === "") continue;
                        const next = fit(format(value), BUDGET_SIDEBAR);
                        if (next === value) continue;
                        if (!copy) copy = Object.assign({}, options);
                        copy[key] = next;
                    }
                    if (copy) options = copy;
                }
                return original.setClientOptions(playerId, options);
            };
        }
        patched = true;
    } catch (e) {
        patched = false;
        try {
            api.log("[theme] patch impossible : " + (e && e.message ? e.message : e));
        } catch (e2) {}
    }
    return patched;
}
