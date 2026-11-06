// gameplay/saber/kit.js
/* kit.js — les petits outils partages par toute la quete

   Ce qu'il faut pour lire le monde et lui parler : distance, vie, blocs,
   inventaire, messages des PNJ, et le dessin des telegraphies (anneau,
   couloir, marque, colonne) avec les ondes communes aux deux boss.
   
   Tout est generique : rien ici ne connait une etape de la quete.
 */

import { C, say } from "../../core/theme";
import { TEX, point, rgba, ring } from "../../utils/fx";
import { hitSeg } from "../../utils/combat";
import { disarmBossGate } from "../../utils/bossGate";
import { scanAllItems } from "../customItem";


/* ── 2. OUTILS ─────────────────────────────────────────────────────────── */

export function dist3(a, b) {
    const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}


export function norm3(v) {
    const l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
}


export function alive(id) {
    if (!id) return false;
    try { return !!api.isAlive(id); } catch (e) { return false; }
}


export function healthOf(id) {
    let hp = null;
    try { hp = api.getHealth(id); } catch (e) { hp = null; }
    return typeof hp === "number" ? hp : 0;
}


export function blockAt(x, y, z) {
    try { return api.getBlock(x, y, z); } catch (e) { return null; }
}


export function tell(playerId, parts) {
    try { say(playerId, parts); } catch (e) {}
}


export function line(icon, color, text) {
    return [
        { icon: icon, style: { color: color } },
        { str: " " + text, style: { color: C.INFO } },
    ];
}


export function speech(icon, color, speaker, quote, extra) {
    const parts = [
        { icon: icon, style: { color: color } },
        { str: " " + speaker + ": \"", style: { color: C.INFO } },
        { str: quote, style: { color: "#FFFFFF" } },
        { str: "\"", style: { color: C.INFO } },
    ];
    if (extra) parts.push({ str: "\n" + extra, style: { color: C.SUCCESS } });
    return parts;
}


export function hasItem(playerId, itemName) {
    try { return (api.getInventoryItemAmount(playerId, itemName) || 0) > 0; }
    catch (e) { return false; }
}


/* Tous les slots qui contiennent cet item, inventaire ET Moonstone Chest :
   `[{ where, slot, amount }]`. Sert a transformer un item SUR PLACE au lieu
   de le retirer puis de le redonner. */
export function slotsOf(playerId, itemName) {
    const out = [];
    try {
        scanAllItems(playerId, function (item, where, slot) {
            if (item && item.name === itemName) out.push({ where: where, slot: slot, amount: item.amount || 1 });
        });
    } catch (e) {}
    return out;
}


export function countOf(playerId, itemName) {
    const slots = slotsOf(playerId, itemName);
    let n = 0;
    for (let i = 0; i < slots.length; i++) n += slots[i].amount || 1;
    return n;
}


export function heldItemName(playerId) {
    try {
        const h = api.getHeldItem(playerId);
        if (!h) return null;
        if (typeof h === "string") return h;
        return h.name || h.type || null;
    } catch (e) { return null; }
}


/* ── 5. CLICS DANS LE MONDE ────────────────────────────────────────────── */

/* Un clic arrive en coordonnees flottantes : la case cliquee est le floor.
   Les deux tolérances ci-dessous evitent de rater un bouton d'une case. */
export function hitBlock(x, y, z, target) {
    const bx = Math.floor(x), by = Math.floor(y), bz = Math.floor(z);
    return Math.abs(bx - target[0]) <= 1 && Math.abs(by - target[1]) <= 1 && Math.abs(bz - target[2]) <= 1;
}


export function inClickBox(x, y, z, min, max) {
    const bx = Math.floor(x), by = Math.floor(y), bz = Math.floor(z);
    return bx >= min[0] - 1 && bx <= max[0] + 1
        && by >= min[1] - 1 && by <= max[1] + 1
        && bz >= min[2] - 1 && bz <= max[2] + 1;
}


export function nameTag(title, subtitle, color) {
    const info = {
        content: [{ str: title, style: { color: color, fontWeight: "bold" } }],
        healthbar: { display: "always", foregroundColour: color, backgroundColour: "#22130a" },
        border: { colour: color, style: "solid" },
    };
    if (subtitle) info.subtitle = [{ str: subtitle, style: { color: "#FFD166" } }];
    return info;
}


export function clearSpot(p) {
    let y = p[1];
    for (let i = 0; i < 48; i++) {
        const b = blockAt(Math.floor(p[0]), Math.floor(y), Math.floor(p[2]));
        if (b === "Air" || b === null) return [p[0], y, p[2]];
        y += 1;
    }
    return [p[0], y, p[2]];
}


export function typeOf(id) {
    try { return api.getEntityType(id); } catch (e) { return null; }
}


export function despawnIfAlive(id) {
    if (!id) return;
    /* Le garde-fou de degats suit le mob : plus de mob, plus de palier. */
    disarmBossGate(id);
    try { if (alive(id)) api.despawnMob(id); } catch (e) {}
}


/* ── 9 bis. DESSINER UNE ZONE (la telegraphie du boss) ─────────────────── */

export const WARN_A = rgba(232, 180, 160);

export const WARN_B = rgba(140, 30, 20, 0);

export const HOT_A = rgba(255, 120, 80);

export const HOT_B = rgba(90, 0, 0, 0);


/* Un anneau au sol. `count` suit le rayon pour que les points ne s'espacent
   pas quand la zone grandit. */
export function groundRing(c, radius, colorA, colorB, spin) {
    const n = Math.max(10, Math.round(radius * 5));
    ring([c[0], c[1] + 0.12, c[2]], radius, n, {
        tex: TEX.crit,
        r: 0.1,
        size: [0.26, 0.46],
        life: [0.18, 0.38],
        colors: [colorA || WARN_A, colorB || WARN_B],
    }, spin || 0);
}


/* Un couloir : les deux bords + des barres transversales. C'est la zone
   exacte que la charge va balayer. */
export function groundCorridor(a, b, width, colorA, colorB) {
    const dx = b[0] - a[0], dz = b[2] - a[2];
    const len = Math.sqrt(dx * dx + dz * dz) || 1;
    const px = -dz / len, pz = dx / len;
    const y = a[1] + 0.12;
    const steps = Math.max(4, Math.min(40, Math.round(len / 1.6)));
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = a[0] + dx * t, z = a[2] + dz * t;
        point([x + px * width, y, z + pz * width], { tex: TEX.crit, count: 1, r: 0.1, size: [0.22, 0.4], life: [0.16, 0.32], colors: [colorA || WARN_A, colorB || WARN_B] });
        point([x - px * width, y, z - pz * width], { tex: TEX.crit, count: 1, r: 0.1, size: [0.22, 0.4], life: [0.16, 0.32], colors: [colorA || WARN_A, colorB || WARN_B] });
        if (i % 3 === 0) point([x, y, z], { tex: TEX.glint, count: 1, r: 0.07, size: [0.16, 0.3], life: [0.12, 0.26], colors: [colorA || WARN_A, colorB || WARN_B] });
    }
}


/* Un disque marque au sol : deux anneaux + une croix. */
export function groundMark(c, radius, colorA, colorB, spin) {
    groundRing(c, radius, colorA, colorB, spin || 0);
    groundRing(c, radius * 0.55, colorA, colorB, -(spin || 0));
    point([c[0], c[1] + 0.12, c[2]], { tex: TEX.crit, count: 4, r: 0.14, size: [0.3, 0.5], life: [0.2, 0.4], colors: [colorA || WARN_A, colorB || WARN_B] });
}


/* Une colonne verticale, pour l'impact du rayon. */
export function pillar(c, height, colorA, colorB) {
    const n = Math.max(6, Math.round(height * 2));
    for (let i = 0; i <= n; i++) {
        const t = i / n;
        const rad = Math.sin(t * Math.PI) * 0.5;
        point([c[0] + Math.cos(i * 2.4) * rad, c[1] + height * t, c[2] + Math.sin(i * 2.4) * rad], {
            tex: TEX.glint, count: 2, r: 0.12, size: [0.3, 0.55], life: [0.16, 0.34],
            colors: [colorA || HOT_A, colorB || HOT_B],
        });
    }
}


/* ── 10. ONDES (communes au Mob Leader et au Saber Expert) ─────────────── */

/* Une onde est une ligne qui avance : on teste le SEGMENT parcouru depuis le
   tick precedent, donc personne ne traverse l'onde entre deux images. */
export function spawnWave(list, origin, dir, speed, radius, dmg, item) {
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


export const WAVE_STEP_MS = 200;


export function advanceWaves(list, caster) {
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
