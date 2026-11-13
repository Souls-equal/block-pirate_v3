/* Flat per-hit combat effects for the Damage and Defense stats.
 * The exponents keep the bonuses in step with mob scaling at high levels while
 * remaining useful at low levels. */
export function getDamageBonusForPoints(points) {
    const p = Math.max(0, Number(points) || 0);
    return 1.6 * Math.pow(p, 1.35);
}

export function getDefenseReductionForPoints(points) {
    const p = Math.max(0, Number(points) || 0);
    return 1.95 * Math.pow(p, 1.4);
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
