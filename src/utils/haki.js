//utils/haki.js
import { getRandomPosition, spawnBoss } from "./boss";
import { point, TEX } from "./fx";
import { isMobEntityType, posOf } from "./lifeform";
import { cancelConfirm, confirmAction, getTotalMoney, payMoney } from "./data";

import { say } from "../core/theme";
const HK_CLICK = "Small Black Pod";
const HK_TOLL = "Black Carpet", HK_PRICE = 14000;
const HK_BOOST = 1.25;
const HK_BLOCK = "Black Concrete", HK_SIZE = 0.4;
const HK_CLEAR_BLOCK = "Air", HK_CLEAR_SIZE = 0.1;
const HK_ARMS = [["ArmLeftMesh", [0.05, -0.55, 0]], ["ArmRightMesh", [-0.05, -0.55, 0]]];
const HK_HARD = [18, 18, 22], HK_GLOW = [150, 90, 220];
const hkArmed = {};

function hk_say(pid, lines) { try { say(pid, lines) } catch (e) {} }
function hk_has(pid) { return pid !== null && pid !== undefined }

const hkOwnedDb = {};
export function hasArmamentHaki(pid) {
    if (hkOwnedDb[pid]) return true;
    let v = null;
    try { v = api.getPlayerDbValue(pid, "haki") } catch (e) { return false }
    return v === 1 || v === "1" || v === true;
}

export function giveArmamentHaki(pid) {
    hkOwnedDb[pid] = 1;
    try { api.setPlayerDbValue(pid, "haki", 1) } catch (e) {}
    return true;
}

function hk_look(pid, on) {
    if (!hk_has(pid)) return false;
    let ok = false;
    for (let i = 0; i < HK_ARMS.length; i++) {
        const node = HK_ARMS[i][0], off = HK_ARMS[i][1];
        if (on) {
            try {
                api.updateEntityNodeMeshAttachment(pid, node,
                    "BloxdBlock",
                    { blockName: HK_BLOCK, size: HK_SIZE, meshOffset: [0, 0, 0] },
                    off, [0, 0, 0]);
                ok = true;
            } catch (e) {}
        } else {
            try {
                api.updateEntityNodeMeshAttachment(pid, node,
                    "BloxdBlock",
                    { blockName: HK_CLEAR_BLOCK, size: HK_CLEAR_SIZE, meshOffset: [0, 0, 0] },
                    off, [0, 0, 0]);
                ok = true;
            } catch (e) {}
            try {
                api.updateEntityNodeMeshAttachment(pid, node,
                    null,
                    null,
                    off, [0, 0, 0]);
                ok = true;
            } catch (e) {}
        }
    }
    return ok;
}

function hk_puff(pid, on) {
    const p = posOf(pid);
    if (!p) return;
    for (let i = 0; i < 2; i++) {
        const hand = [p[0] + (i ? -0.32 : 0.32), p[1] + 1.02, p[2] + 0.26];
        point(hand, {
            tex: TEX.square, count: on ? 14 : 8, size: on ? [0.2, 0.46] : [0.14, 0.3],
            life: on ? [0.2, 0.55] : [0.14, 0.34], power: on ? [0.6, 2.1] : [0.3, 1.1],
            dir: [i ? -1 : 1, on ? 0.5 : 1.2, 0], dirSpread: on ? 0.9 : 1.6, gravity: [0, -2.2, 0],
            colors: on ? [[HK_GLOW[0], HK_GLOW[1], HK_GLOW[2], 0.9], [HK_HARD[0], HK_HARD[1], HK_HARD[2], 0]]
                       : [[HK_GLOW[0], HK_GLOW[1], HK_GLOW[2], 0.7], [HK_HARD[0], HK_HARD[1], HK_HARD[2], 0]],
        });
    }
    try { api.broadcastSound("cannonFire3", on ? 0.55 : 0.3, on ? 1.5 : 1.9, { playerIdOrPos: pid, maxHearDist: 22 }) } catch (e) {}
}

export function isArmamentHakiActive(pid) { return hkArmed[pid] === 1 }

export function setArmamentHaki(pid, on) {
    if (!hk_has(pid)) return false;
    if (on && !hasArmamentHaki(pid)) return false;
    if (!!hkArmed[pid] === !!on) return false;
    if (on) hkArmed[pid] = 1; else delete hkArmed[pid];
    hk_look(pid, !!on);
    hk_puff(pid, !!on);
    return true;
}

export function resetArmamentHakiVisual(pid) {
    if (!hk_has(pid)) return false;
    delete hkArmed[pid];
    return hk_look(pid, false);
}

export function hakiBoost(attackerId, amt) {
    if (!attackerId || hkArmed[attackerId] !== 1) return amt;
    return Math.round(Math.abs(amt) * HK_BOOST);
}

export function onPlayerClickArmamentHaki(playerId) {
    let held = null;
    try { held = api.getHeldItem(playerId) } catch (e) { return false }
    if (!held || held.name !== HK_CLICK) return false;
    if (!hasArmamentHaki(playerId)) {
        hk_say(playerId, [
            { str: "You do not know Armament Haki yet.\n", style: { color: "#FF5555", fontWeight: "bold" } },
            { str: "It is bought, not found.", style: { color: "#AAAAAA" } }
        ]);
        return true;
    }
    const on = hkArmed[playerId] !== 1;
    setArmamentHaki(playerId, on);
    hk_say(playerId, [{
        str: on ? "Armament Haki: your fists turn black." : "Armament Haki: released.",
        style: { color: "#2A232B", fontWeight: "bold" }
    }]);
    return true;
}

/* l'achat : 1 Black Carpet (retire) + 14000 Gold Coins */
/* Le pod de bascule est un item UNIQUE : s'il est perdu (lache, avale par un
   respawn, filtre d'inventaire), le joueur savait le haki mais n'avait plus
   AUCUN moyen de l'armer. Comme pour les fighting styles, recliquer le
   vendeur le rend : c'est un refresh gratuit, pas un rachat. */
function giveHakiPod(playerId) {
    let pods = 0;
    try { pods = api.getInventoryItemAmount(playerId, HK_CLICK) } catch (e) { pods = 0 }
    if (pods > 0) return false;
    try { api.giveItem(playerId, HK_CLICK, 1) } catch (e) { return false }
    return true;
}

export function buyArmamentHaki(playerId) {
    if (!hk_has(playerId)) return false;
    if (hasArmamentHaki(playerId)) {
        /* Deja appris : on ne fait payer personne, on rend juste l'item. */
        const refreshed = giveHakiPod(playerId);
        hk_say(playerId, refreshed
            ? [
                { icon: "fa-solid fa-hand-fist", style: { color: "#B98CFF" } },
                { str: " You already know Armament Haki.\n", style: { color: "#FFD700" } },
                { str: "Your Small Black Pod has been given back — click with it to arm your fists.", style: { color: "#AAAAAA" } }
            ]
            : [
                { str: "You already know Armament Haki, and your Small Black Pod is in your inventory.", style: { color: "#FFD700" } }
            ]);
        return false;
    }

    let tolls = 0;
    try { tolls = api.getInventoryItemAmount(playerId, HK_TOLL) } catch (e) { tolls = 0 }
    if (!tolls) {
        hk_say(playerId, [
            { str: "You need a Black Carpet to learn this.\n", style: { color: "#FF5555", fontWeight: "bold" } },
            { str: "You have none.", style: { color: "#AAAAAA" } }
        ]);
        return false;
    }

    const money = getTotalMoney(playerId);
    if (money < HK_PRICE) {
        hk_say(playerId, [
            { str: "Not enough Gold Coins!\n", style: { color: "#FF5555", fontWeight: "bold" } },
            { str: "Cost: ", style: { color: "#AAAAAA" } },
            { str: HK_PRICE + " Gold Coins\n", style: { color: "#FFD700", fontWeight: "bold" } },
            { str: "You have: ", style: { color: "#AAAAAA" } },
            { str: money + " Gold Coins", style: { color: "#55FF55", fontWeight: "bold" } }
        ]);
        return false;
    }

    /* Meme confirmation que tous les autres achats (voir utils/data). */
    if (!confirmAction(playerId, "haki", [
        { icon: "fa-solid fa-hand-fist", style: { color: "#B98CFF" } },
        { str: " Learn Armament Haki for ", style: { color: "#AAAAAA" } },
        { str: HK_PRICE + " Gold Coins", style: { color: "#FFD700", fontWeight: "bold" } },
        { str: " and 1 Black Carpet.", style: { color: "#AAAAAA" } },
    ])) return false;

    if (!payMoney(playerId, HK_PRICE)) {
        cancelConfirm(playerId);
        hk_say(playerId, [{ str: "Payment failed.", style: { color: "#FF5555", fontWeight: "bold" } }]);
        return false;
    }
    try { api.removeItemName(playerId, HK_TOLL, 1) } catch (e) {}
    giveArmamentHaki(playerId);
    /* le pod qui sert a basculer : on ne le double pas s'il le traine deja */
    giveHakiPod(playerId);
    setArmamentHaki(playerId, true);
    try { api.playSound(playerId, "coin", 1, 1) } catch (e) {}
    hk_say(playerId, [
        { str: "Armament Haki learned.\n", style: { color: "#B98CFF", fontWeight: "bold", fontSize: "1.3em" } },
        { str: "Your arms are hard as steel: every hit you land deals ", style: { color: "#AAAAAA" } },
        { str: "+25%", style: { color: "#FFD700", fontWeight: "bold" } },
        { str: " more, fruit included.\nClick with the Small Black Pod to arm or release it.", style: { color: "#AAAAAA" } }
    ]);
    return true;
}

/* le noir ne doit pas survivre a deconnexion ni a un respawn qui recree l'entite */
export function onPlayerJoinArmamentHaki(pid) {
    /* on repart desarme, ET on nettoie le rendu : l'ancien code supprimait le
       drapeau sans toucher au mesh, donc un attachement qui survit a la
       recreation d'entite restait visible sans plus aucun moyen de l'enlever. */
    delete hkArmed[pid];
    hk_look(pid, false);
    return true;
}
export function onPlayerLeaveArmamentHaki(pid) {
    /* plus de `if (hkArmed[pid])` : on nettoie dans tous les cas. Cette garde
       laissait le rendu en place des que l'etat etait deja desynchronise. */
    hk_look(pid, false);
    delete hkArmed[pid];
    return true;
}
export function onPlayerRespawnArmamentHaki(pid) {
    /* re-attache si arme, nettoie sinon (avant : rien du tout si pas arme) */
    hk_look(pid, hkArmed[pid] === 1);
    return true;
}

function getSafePosition(pos) {
    let [x, y, z] = pos;
    if (api.getBlock(x, y, z) !== "Air") {
        y += 15;
    }
    return [x, y, z];
}

/* GARP SPAWNE A COTE DU JOUEUR, PAS A L'AUTRE BOUT DE L'ARENE.

   Avant : joueur et boss tires au hasard chacun dans un rectangle de 250x286
   blocs. Deux tirages independants, donc un combat qui pouvait commencer a
   250 blocs de distance : le boss arrivait plusieurs secondes plus tard, ou
   jamais (il perdait la cible, les gardes popaient dans le vide).
   Maintenant on tire un angle et on pose le boss a BOSS_SPAWN_DIST blocs :
   assez pres pour que le combat demarre tout de suite, assez loin pour ne pas
   apparaitre sur le joueur.

   Le point reste borne a l'interieur de l'arene et passe par getSafePosition
   (jamais dans un bloc). */
const BOSS_SPAWN_DIST = 8;

function bossPositionNear(playerPos, posA, posB) {
    const angle = Math.random() * Math.PI * 2;
    const dx = Math.cos(angle) * BOSS_SPAWN_DIST;
    const dz = Math.sin(angle) * BOSS_SPAWN_DIST;
    const minX = Math.min(posA[0], posB[0]), maxX = Math.max(posA[0], posB[0]);
    const minZ = Math.min(posA[2], posB[2]), maxZ = Math.max(posA[2], posB[2]);
    const x = Math.min(maxX, Math.max(minX, playerPos[0] + dx));
    const z = Math.min(maxZ, Math.max(minZ, playerPos[2] + dz));
    return getSafePosition([x, playerPos[1], z]);
}

function hakiBossStart(playerId, posA, posB) {

    let playersInZone = [];

    for (const entity of api.getEntitiesInRect(posA, posB)) {
        const type = api.getEntityType(entity);

        if (type === "Player") {
            playersInZone.push(entity);
        }
    }

    // Si un autre joueur est déjà là → refuser
    if (playersInZone.length > 0 && !playersInZone.includes(playerId)) {
        say(playerId, "A player is already fighting the boss.");
        return;
    }

    // Cleanup mobs SEULEMENT si personne dans la zone
    if (playersInZone.length === 0) {
        for (const entity of api.getEntitiesInRect(posA, posB)) {
            if (isMobEntityType(api.getEntityType(entity))) {
                try { api.despawnMob(entity); } catch (e) {
                    try { api.deleteEntity(entity); } catch (e2) {}
                }
            }
        }
    }

    // Position du joueur : n'importe ou dans l'arene, au sol.
    playerPos = getSafePosition(getRandomPosition(posA, posB));

    // TP du joueur AVANT de placer le boss : on le pose par rapport a l'arrivee.
    api.setPosition(playerId, playerPos);
    try { playerPos = posOf(playerId) || playerPos; } catch (e) {}

    // Spawn boss : a 8 blocs du joueur, jamais a l'autre bout de l'arene.
    bossPos = bossPositionNear(playerPos, posA, posB);
    spawnBoss(bossPos);
}


// Distance
function distance(a, b) {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const dz = a[2] - b[2];
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
}

startBoss = (playerId) => {
    const posA=[-87, 1014, -80];
    const posB=[165, 1014, 206];
    hakiBossStart(playerId, posA, posB)
}