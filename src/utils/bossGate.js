// utils/bossGate.js
/* Les paliers de degats des trois boss (Garp, Saber Expert, Mob Leader).
   Extrait de boss.js le jour ou la limite est passee a 64 fichiers : ce
   garde-fou ne connait AUCUN boss en particulier, il ne fait que repondre
   a une question ("ce coup passe ? plafonne ? refuse ?") pour les trois.
   Arme par utils/boss.js et gameplay/saber/*, interroge par utils/combat.js
   et par onPlayerDamagingMob (index.js). */

import { say } from "../core/theme";
import { nowMs } from "./timer";

/* Position lisible, ou null : meme garde que partout ailleurs (une entite
   qui vient de disparaitre leve, on ne veut pas d'exception). */
function posOf(id) {
  try {
    const p = api.getPosition(id);
    return p ? [p[0], p[1], p[2]] : null;
  } catch (_) {
    return null;
  }
}

function dist2d(a, b) {
  const dx = a[0] - b[0], dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dz * dz);
}

/* ══════════════════════════════════════════════════════════════════════════
   PALIERS DE DEGATS DES BOSS — l'anti one shot

   Les trois boss (Garp, le Saber Expert et le Mob Leader) ne peuvent pas etre
   tues d'un seul coup, meme par une attaque a 38 000 degats.

   DEUX GARDE-FOUS, et ils sont dans cet ordre :

   1. LES PALIERS. A 1/2, 1/3, 1/4 et 1/5 de sa vie, le boss ENCAISSE : le
      coup qui franchirait le palier est REFUSE, et le boss bloque TOUS les
      degats pendant LOCK_MS. Chaque palier ne se declenche qu'une fois, donc
      un boss a quatre moments ou il faut attendre avant de continuer.

   2. LE PLAFOND. Un coup ne retire jamais plus de CAP des PV maximum (9 %).
      Sans lui, un coup enorme pouvait sauter les quatre paliers d'un coup et
      le boss tombait quand meme. La derniere touche, elle, passe toujours :
      des que ce qu'il reste tient dans le plafond, on n'ecourte plus rien,
      donc un boss reste TOUJOURS tuable.

   Un palier ne bloque jamais la mort du boss (le coup fatal arrive quand il
   reste moins que le plafond), donc les recompenses de fin ne sont jamais
   perdues : Garp, le Saber Expert et le Gold Grit du Mob Leader tombent comme
   avant, sur leur propre chemin.
   ══════════════════════════════════════════════════════════════════════════ */

const GATE = {
  /* Du plus haut au plus bas : 1/2, 1/3, 1/4, 1/5 de la vie. */
  FRACTIONS: [1 / 2, 1 / 3, 1 / 4, 1 / 5],
  /* Duree du blocage quand un palier tombe. */
  LOCK_MS: 1500,
  /* Part des PV maximum qu'un seul coup peut retirer. */
  CAP: 0.09,
};

/* mobId -> { max, tiers: [bool...], until } */
const GATES = {};

/* Arme le garde-fou sur un boss qui vient d'apparaitre. */
export function armBossGate(mobId, maxHp) {
  if (!mobId || !(maxHp > 0)) return false;
  const tiers = [];
  for (let i = 0; i < GATE.FRACTIONS.length; i++) tiers.push(false);
  GATES[mobId] = { max: maxHp, tiers: tiers, until: 0 };
  return true;
}

/* Oublie un boss (mort, despawn, arene rangee). */
export function disarmBossGate(mobId) {
  if (!mobId) return false;
  delete GATES[mobId];
  return true;
}

export function bossGateForTest(mobId) {
  const g = mobId ? GATES[mobId] : null;
  return g ? { max: g.max, tiers: g.tiers.slice(), until: g.until } : null;
}

function bossNameOf(mobId) {
  let name = null;
  try { name = api.getMobSetting(mobId, "name", false); } catch (e) { name = null; }
  if (typeof name !== "string" || !name) {
    try { name = api.getEntityName(mobId); } catch (e2) { name = null; }
  }
  return typeof name === "string" && name ? name : "The boss";
}

/* Les joueurs assez proches pour voir le palier tomber. */
function playersNear(at, radius) {
  const out = [];
  let ids = [];
  try { ids = api.getPlayerIds() || []; } catch (e) { return out; }
  for (let i = 0; i < ids.length; i++) {
    const p = posOf(ids[i]);
    if (p && dist2d(at, p) <= radius) out.push(ids[i]);
  }
  return out;
}

/* Annonce du palier : message, son et particules sur le boss. */
function announceGate(mobId, restPct) {
  const at = posOf(mobId);
  const name = bossNameOf(mobId);
  if (at) {
    try { api.playParticleEffect(at[0], at[1] + 2, at[2], "explosion", "#ffd166", 1); } catch (e) {}
  }
  const near = at ? playersNear(at, 48) : [];
  for (let i = 0; i < near.length; i++) {
    try { api.playSound(near[i], "bearRoar1", 0.8, 1.25); } catch (e) {}
    try {
      say(near[i], [
        { str: "[", style: { color: "#94a3b8" } },
        { str: name, style: { color: "#ffd166", fontWeight: "700" } },
        { str: "] endures ", style: { color: "#cbd5e1" } },
        { str: restPct + "% health left", style: { color: "#ffd166", fontWeight: "700" } },
        { str: " - no damage for a moment.", style: { color: "#cbd5e1" } },
      ]);
    } catch (e) {}
  }
}

/* LA PORTE. Renvoie false (coup refuse), un plafond, ou les degats inchanges.
   Appelee par les deux chemins de degats : capacities (utils/combat) et corps
   a corps (onPlayerDamagingMob). */
export function bossDamageGate(mobId, amount) {
  const g = mobId ? GATES[mobId] : null;
  if (!g) return amount;
  const dmg = Number(amount);
  if (!(dmg > 0)) return amount;

  /* Entite disparue : on nettoie au passage, plutot que de garder une ligne
     par boss tue jusqu'au redemarrage du monde. */
  let hp = null;
  try { hp = api.getHealth(mobId); } catch (e) { hp = null; }
  if (typeof hp !== "number" || !(hp > 0)) { delete GATES[mobId]; return amount; }

  const now = nowMs();
  /* Palier en cours : plus rien ne passe, de personne. */
  if (g.until > now) return false;

  const max = g.max > 0 ? g.max : 1;
  for (let i = 0; i < GATE.FRACTIONS.length; i++) {
    const line = max * GATE.FRACTIONS[i];
    /* Deja sous le palier sans qu'on l'ait vu (deux coups dans la meme frame,
       boss soigne, etc.) : on le marque sans bloquer, sinon il bloquerait
       n'importe quel coup plus tard. */
    if (hp <= line) { g.tiers[i] = true; continue; }
    if (g.tiers[i]) continue;
    /* Ce coup franchirait le palier : on l'encaisse. */
    if (hp - dmg <= line) {
      g.tiers[i] = true;
      g.until = now + GATE.LOCK_MS;
      announceGate(mobId, Math.max(1, Math.round((line / max) * 100)));
      return false;
    }
  }

  /* Plafond par coup. La derniere touche n'est pas ecourtee : quand ce qui
     reste tient dans le plafond, le coup passe tel quel. */
  const cap = Math.max(1, Math.floor(max * GATE.CAP));
  if (dmg > cap && hp > cap) return cap;
  return amount;
}
