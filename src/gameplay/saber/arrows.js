// gameplay/saber/arrows.js
/* arrows.js — les fleches de la quete

   Deux sortes de fleches, et elles ne durent pas : celle de Secret Island
   tant que la chasse est en cours, et celle d'une structure qu'on vient
   d'ouvrir (elle s'efface des qu'on est dessus).
 */

import { SABER_ISLAND, STRUCTS } from "./config";


/* ── 7. LA FLECHE DE L'ILE SECRETE ─────────────────────────────────────── */

const ARROW_ID = "saber-isle";


export function armSecretArrow(playerId) {
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


export function clearSecretArrow(playerId) {
    try { api.clearDirectionArrow(playerId, ARROW_ID); } catch (e) {}
}


/* Fleche temporaire vers l'ouverture, pour la meme raison : elle indique ou
   aller, et disparait des qu'on est arrive (ou au bout du delai de grace). */
export function armStructArrow(playerId, key) {
    const s = STRUCTS[key];
    if (!s || !playerId) return false;
    try {
        api.setDirectionArrow(playerId, s.arrowId, s.center, s.arrowLabel, true, {
            color: "#4ADE80", fontSize: "16px", fontWeight: "bold",
        });
        return true;
    } catch (e) { return false; }
}


export function clearStructArrow(playerId, key) {
    const s = STRUCTS[key];
    if (!s || !playerId) return false;
    try { api.clearDirectionArrow(playerId, s.arrowId); return true; } catch (e) { return false; }
}
