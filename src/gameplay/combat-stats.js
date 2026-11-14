/* Flat per-hit combat effects for the Damage and Defense stats.
 * The exponents keep the bonuses in step with mob scaling at high levels while
 * remaining useful at low levels. */
export function getDamageBonusForPoints(points) {
    const p = Math.max(0, Number(points) || 0);
    return 1.6 * Math.pow(p, 1.35);
}

// PvP stat bonuses are tuned separately from PvE: mob-level scaling would make
// equal-level players almost one-shot each other once Defense is reduced.
export function getPvPDamageBonusForPoints(points) {
    const p = Math.max(0, Number(points) || 0);
    return 0.12 * Math.pow(p, 1.35);
}

export function getDefenseReductionForPoints(points) {
    const p = Math.max(0, Number(points) || 0);
    return 1.95 * Math.pow(p, 1.4);
}

// PvP uses a gentler flat curve than PvE so equal-level hits stay meaningful,
// but Defense keeps scaling as players invest more points.
export function getPvPDefenseReductionForPoints(points) {
    const p = Math.max(0, Number(points) || 0);
    return 0.4 * Math.sqrt(p);
}

export function applyDamageBonus(baseDamage, bonus) {
    const base = Math.max(0, Number(baseDamage) || 0);
    const flat = Math.max(0, Number(bonus) || 0);
    return Math.max(1, Math.round(base + flat));
}

export function applyDefenseReduction(incomingDamage, reduction) {
    const incoming = Math.max(0, Number(incomingDamage) || 0);
    const flat = Math.max(0, Number(reduction) || 0);
    return incoming > 0 ? Math.max(1, Math.round(incoming - flat)) : 0;
}
