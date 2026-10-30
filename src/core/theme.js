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
    "#ff8c00": "DANGER", "#ff9900": "DANGER", "#ffaa00": "DANGER", "#ffcc00": "DANGER",
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
    const named = { white: "#ffffff", black: "#000000", gray: "#808080", grey: "#808080" };
    if (named[s]) return parseColor(named[s]);
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
     - item de competence ............... bleu-violet */
export const ITEM_COLOR = {
    plain: "#8B8F98",
    custom: "#E5E7EB",
    fruit: "#FF6B35",
    ability: "#8B5CF6",
};

const KEEP_AS_IS = {};
for (const k in ITEM_COLOR) KEEP_AS_IS[ITEM_COLOR[k].toLowerCase()] = ITEM_COLOR[k];

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
            out.push(iconStyle === part.style ? part : Object.assign({}, part, { style: iconStyle }));
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
export const BUDGET_SIDEBAR = 1200;
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

/* Icone seule, dans la couleur demandee. */
export function icon(name, color) {
    const part = { icon: name };
    if (color) part.style = { color: themeColor(color) };
    return part;
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
