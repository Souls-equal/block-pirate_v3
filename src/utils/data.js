// utils/data.js

import { updateSidebar } from "../core/UI";
import { checkQuestValidity, quests } from "../gameplay/quest";
import { applyStatEffects, fullHeal, totalSpent, resetStats } from "../gameplay/stats";
import { clearFruit } from "../fruit/index";
import { clearFightingStyle } from "../gameplay/fightingStyles";

resetPlayer = (id) => {
    setLevel(id, 1, true);
    resetStats(id);
    setStat(id, "money", 0);
    setStat(id, "sp", 0);
    clearFruit(id);
    clearFightingStyle(id);
    api.clearInventory(id);
}

import { C, say } from "../core/theme";
export function getStat(playerId, key, def=0){
    if (!playerId) return def;
    let v;
    try { v = api.getPlayerDbValue(playerId, key); } catch (e) { return def; }
    if (v === undefined || v === null) return def;
    return v;
}

export function setStat(playerId, key, value){
    if (!playerId) return false;
    let ok = false;
    try { api.setPlayerDbValue(playerId, key, value); ok = true; } catch (e) { ok = false; }
    try { updateSidebar(playerId); } catch (e2) {}
    return ok;
}

export function deleteStat(playerId, key){
    if (!playerId) return false;
    try { api.deletePlayerDbValue(playerId, key); return true; } catch (e) { return false; }
}

export function addStat(playerId, key, amount){
    let v = getStat(playerId, key, 0);
    return setStat(playerId, key, v + amount);
}

/* utils/money.js */

export function payMoney(playerId, amount) {
    const money = getStat(playerId, "money", 0);
    if (money < amount) return false;
    addStat(playerId, "money", -amount);
    return true;
}

export function getTotalMoney(playerId) {
    return getStat(playerId, "money", 0);
}
export function changeMoney(playerId, amount, showMessage=true){
    addStat(playerId, "money", amount);
    if (showMessage) {
        const color = amount > 0 ? "#FFD700" : "#ff4444";
        say(playerId,[{ icon: "fa-solid fa-coins", style:{color:C.MONEY} },{ str:" "+amount+" Coins",style:{color:color} }]);
    }
}

/* ══════════════════════════════════════════════════════════════════════════
   CONFIRMATION D'ACHAT — UN SEUL systeme pour tout le jeu.

   Tous les achats passent par confirmAction() : premier clic = on rappelle ce
   qui va etre achete, second clic DANS LA MEME FENETRE = l'achat se fait.
   Avant, il y avait trois comportements differents (un effet "verif" de 2 s
   pour les items, une Map de 5 s pour les styles de combat, et rien du tout
   pour le haki et la machine a fruits) : le joueur ne savait jamais quel
   clic validait quoi.

   Regles :
   - meme fenetre partout (CONFIRM_MS) ;
   - meme message de validation, ajoute automatiquement en fin de prompt ;
   - la cle identifie l'achat : deux clics sur deux choses differentes ne
     valident jamais l'une par l'autre (le pending est remplace).
   ══════════════════════════════════════════════════════════════════════════ */

export const CONFIRM_MS = 3000;
const CONFIRM_SECONDS = CONFIRM_MS / 1000;

/* playerId -> { key, until } */
const pendingConfirm = new Map();

/* Fin de la confirmation en cours pour ce joueur (deconnexion, achat fait,
   changement de contexte). */
export function clearConfirm(playerId) {
    if (!playerId) return;
    pendingConfirm.delete(playerId);
}

function confirmVisualClear(playerId) {
    try { api.removeEffect(playerId, "verif"); } catch (e) {}
}

/* Petit rappel visuel : meme effet, meme duree, pour tous les achats. */
function confirmVisualShow(playerId) {
    try {
        api.applyEffect(playerId, "verif", CONFIRM_MS, {
            displayName: "Click again to confirm",
            icon: "fa-solid fa-circle-question",
        });
    } catch (e) {}
}

/* Retourne true si l'achat est confirme (second clic dans la fenetre). */
export function confirmAction(playerId, key, what) {
    if (!playerId) return false;
    if (!key) return true;

    const now = Date.now();
    const pending = pendingConfirm.get(playerId);
    if (pending && pending.until < now) pendingConfirm.delete(playerId);

    const current = pendingConfirm.get(playerId);
    if (current && current.key === key) {
        pendingConfirm.delete(playerId);
        confirmVisualClear(playerId);
        return true;
    }

    pendingConfirm.set(playerId, { key: key, until: now + CONFIRM_MS });
    confirmVisualShow(playerId);

    const parts = [];
    if (what) {
        if (Array.isArray(what)) for (const w of what) parts.push(w);
        else parts.push(what);
    }
    parts.push({
        str: "\nClick again within " + CONFIRM_SECONDS + "s to confirm.",
        style: { color: C.SUCCESS, fontWeight: "bold" },
    });
    say(playerId, parts);
    return false;
}

/* A appeler quand un achat est confirme puis annule par une autre raison
   (plus assez d'argent entre les deux clics, par exemple). */
export function cancelConfirm(playerId) {
    clearConfirm(playerId);
    confirmVisualClear(playerId);
}

export function buyItem(playerId, item, price=0, amount=1, attributes={}) {
    if (!attributes.customDisplayName) attributes.customDisplayName = item;
    if (!attributes.customDescription) attributes.customDescription = "";
    const money = getStat(playerId, "money", 0);
    if (money < price) {
        say(playerId,[{ icon: "fa-solid fa-coins", style:{color:C.MONEY} },{ str:" You don't have enough Coins: "+money+"/"+price,style:{color:C.DANGER} }]);
        return;
    }

    const label = attributes.customDisplayName;
    const key = "buy|" + item + "|" + amount + "|" + price;
    if (!confirmAction(playerId, key, [
        { icon: "fa-solid fa-cart-shopping", style: { color: C.MONEY } },
        { str: " Buy " + amount + "x ", style: { color: C.INFO } },
        { str: label, style: { color: C.MONEY, fontWeight: "bold" } },
        { str: " for ", style: { color: C.INFO } },
        { str: price + " Coins", style: { color: C.MONEY, fontWeight: "bold" } },
        { str: "?", style: { color: C.INFO } },
    ])) return;

    if (!payMoney(playerId, price)) {
        cancelConfirm(playerId);
        return;
    }
    try { api.giveItem(playerId, item, amount, attributes); } catch (e) {}
    try { api.playSound(playerId, "CashRegister", 1, 1); } catch (e) {}
    say(playerId, [
        { icon: "fa-solid fa-cart-shopping", style: { color: C.SUCCESS } },
        { str: " You bought " + amount + "x ", style: { color: C.INFO } },
        { str: label, style: { color: C.MONEY, fontWeight: "bold" } },
        { str: ".", style: { color: C.INFO } },
    ]);
}


/* ══════════════════════════════════════════════════════════════════════════
   BONS DE REDUCTION POUR LA MACHINE A FRUITS

   Cinq items PAR DEFAUT de Bloxd (les Lottery Tickets), renommes en "Fruit
   Voucher" par customItem.js. Un bon garde dans l'inventaire reduit le prix du
   tirage : 10, 20, 30, 40 puis 50 % pour le plus rare. Le MEILLEUR bon du
   joueur est utilise, et il n'est consomme qu'au moment ou le fruit est
   reellement remis : un tirage echoue ou rembourse ne coute pas le bon.

   Source unique : le nom d'item, le nom affiche, la description ET la
   reduction vivent ici. customItem.js les affiche, utils/spawning.js les
   utilise comme butin, fruit/index.js les applique au prix.
   ══════════════════════════════════════════════════════════════════════════ */

export const FRUIT_TICKETS = [
    {
        item: "Common Lottery Ticket",
        pct: 10,
        label: "Common Fruit Voucher",
        desc: "10% off the fruit machine. The Fruit Dealer takes it when you spin.",
    },
    {
        item: "Uncommon Lottery Ticket",
        pct: 20,
        label: "Uncommon Fruit Voucher",
        desc: "20% off the fruit machine. The Fruit Dealer takes it when you spin.",
    },
    {
        item: "Rare Lottery Ticket",
        pct: 30,
        label: "Rare Fruit Voucher",
        desc: "30% off the fruit machine. The Fruit Dealer takes it when you spin.",
    },
    {
        item: "Epic Lottery Ticket",
        pct: 40,
        label: "Epic Fruit Voucher",
        desc: "40% off the fruit machine. The Fruit Dealer takes it when you spin.",
    },
    {
        item: "Legendary Lottery Ticket",
        pct: 50,
        label: "Legendary Fruit Voucher",
        desc: "50% off the fruit machine. The Fruit Dealer takes it when you spin.",
    },
];

/* Le meilleur bon du joueur : { item, pct, label } ou null. Aucun test de
   nom affiche : on lit l'item d'origine, comme partout ailleurs. */
export function bestFruitTicket(playerId) {
    if (!playerId) return null;
    let best = null;
    for (let i = 0; i < FRUIT_TICKETS.length; i++) {
        const t = FRUIT_TICKETS[i];
        let n = 0;
        try { n = api.getInventoryItemAmount(playerId, t.item) || 0; } catch (e) { n = 0; }
        if (n > 0 && (!best || t.pct > best.pct)) best = t;
    }
    return best;
}

/* Consomme UN bon. Renvoie false si le joueur n'en a plus (il a pu le perdre
   pendant l'animation) : l'achat reste valable, on ne le fait pas payer deux
   fois. */
export function spendFruitTicket(playerId, itemName) {
    if (!playerId || !itemName) return false;
    try { api.removeItemName(playerId, itemName, 1); return true; } catch (e) { return false; }
}

/* Prix d'un tirage, reduction appliquee (0 a 50 %). */
export function fruitRollPrice(level, pct) {
    const lvl = Math.max(0, Math.floor(level) || 0);
    const off = Math.max(0, Math.min(50, Math.floor(pct) || 0));
    return Math.max(1, Math.round((500 + 35 * lvl) * (100 - off) / 100));
}


/* utils/leveling.js */

export const SP_PER_LEVEL = 3;

function islandAt(level, islands) {
    let isle = islands[0];
    for (let i = 0; i < islands.length; i++) {
        if (level >= islands[i].start) isle = islands[i];
    }
    return isle;
}

function islandsFromQuests(quests) {
    const raw = Object.entries(quests).map(([name, qs]) => {
        const vals = Object.values(qs);
        return {
            name,
            start: Math.min(...vals.map(q => q.levelMin)),
            end: Math.max(...vals.map(q => q.levelMax)),
        };
    }).sort((a, b) => a.start - b.start);

    return raw.map((isle, i) => ({
        name: isle.name,
        start: isle.start,
        end: raw[i + 1] ? raw[i + 1].start : isle.end,
    }));
}

const islands = islandsFromQuests(quests);

export function xpToNext(level) {
    if (level < 1) level = 1;
    const isle = islandAt(level, islands);
    const span = Math.max(1, isle.end - isle.start);
    let t = Math.min(1, Math.max(0, (level - isle.start) / span));
    t = Math.pow(t, 1.1);
    const base = 120 * level - 20;
    const saw = 0.5 + (1 - 0.5) * t;
    return Math.max(40, Math.round(base * saw));
}


export function addXP(playerId, amount){
    let xp = getStat(playerId,"xp",0);
    let lvl = getStat(playerId,"lvl",1);
    const oldLvl = lvl;

    xp += amount;

    while (xp >= xpToNext(lvl)){
        xp -= xpToNext(lvl);
        lvl++;
    }

    const levelsGained = lvl - oldLvl;

    setStat(playerId,"xp",xp);
    setStat(playerId,"lvl",lvl);

    if (levelsGained > 0){

        addStat(playerId, "sp", SP_PER_LEVEL * levelsGained);
        fullHeal(playerId);
        applyStatEffects(playerId);
        checkQuestValidity(playerId);
        say(playerId,[
            {icon:"fa-solid fa-sparkle",style:{color:C.SUCCESS}},
        {str:" LEVEL UP! ",style:{color:C.SUCCESS,fontWeight:"bold"}},
            {str:"Level "+lvl,style:{color:"white"}}
        ]);

        reconcileSP(playerId);
    }
}

/* GET LEVEL */
export function getLevel(playerId){
    return getStat(playerId, "lvl", 1);
}

/* SET LEVEL */
export function setLevel(playerId, newLevel, resetXP = true){
    newLevel = Math.max(1, Math.floor(newLevel));
    setStat(playerId, "lvl", newLevel);

    if (resetXP){
        setStat(playerId, "xp", 0);
    }

    reconcileSP(playerId);
    applyStatEffects(playerId);
    fullHeal(playerId);
    say(playerId, [
        {icon:"fa-solid fa-ranking-star",style:{color:C.INFO}},
        {str:" Level set to ", style:{color:C.INFO}},
        {str:String(newLevel), style:{color:"#00FF00", fontWeight:"bold"}}
    ]);
}

/* SP RECONCILIATION */
export function reconcileSP(playerId) {
    const level    = Math.max(1, getStat(playerId, "lvl", 1) | 0);
    const earned   = SP_PER_LEVEL * (level - 1);
    const spent    = totalSpent(playerId);
    const expected = Math.max(0, earned - spent);
    const actual   = getStat(playerId, "sp", 0);
    const diff     = expected - actual;

    if (diff === 0) return 0;

    setStat(playerId, "sp", expected);

    if (diff > 0) {
        say(playerId, [
            { icon: "fa-solid fa-sparkle", style: { color: "#00ff00", fontWeight: "bold" } }, { str: " SP recovered: ", style: { color: "#00ff00", fontWeight: "bold" } },
            { str: "+" + diff, style: { color: "white" } }
        ]);
    } else {
        say(playerId, [
            { icon: "fa-solid fa-triangle-exclamation", style: { color: "#ff9900", fontWeight: "bold" } }, { str: " SP corrected: ", style: { color: "#ff9900", fontWeight: "bold" } },
            { str: String(diff), style: { color: "white" } }
        ]);
    }

    return diff;
}
