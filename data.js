// utils/data.js

import { updateSidebar } from "../UI";
import { checkQuestValidity, quests } from "../quest";
import { applyStatEffects, fullHeal, totalSpent, resetStats } from "../stats";
import { clearFruit } from "../fruit"

resetPlayer = (id) => {
    setLevel(id, 1, true);
    resetStats(playerId);
    setStat(id, "money", 0);
    setStat(id, "sp", 0);
    clearFruit(id)
    api.clearInventory(id)
}

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
        api.sendMessage(playerId,[{ str:"💰 "+amount+" Coins",style:{color:color} }]);
    }
}

export function buyItem(playerId, item, price=0, amount=1, attributes={}) {
    if (!attributes.customDisplayName) attributes.customDisplayName = item;
    if (!attributes.customDescription) attributes.customDescription = ""
    const money = getStat(playerId, "money", 0);
    if (money < price) {
        api.sendMessage(playerId,[{ str:"💰You don't have enough Coins: "+money+"/"+price,style:{color:"orange"} }]);
        return;
    }
    if (api.hasEffect(playerId, "verif")) {
        if (attributes.customDisplayName===null) attributes.customDisplayName = item;
        changeMoney(playerId, -price);

        api.giveItem(playerId, item, amount, attributes)
        api.sendMessage(playerId, "You bough "+amount+" '"+attributes.customDisplayName+"'.", {color:"lime"})
    } else {
        api.applyEffect(playerId, "verif", 2000, {displayName:"Are you sure? Click to buy!", icon:"NaN"})
        api.sendMessage(playerId, [
            {str:"Are you sure you want to buy "+amount+" '"+attributes.customDisplayName+"' for "+price+" Coins?\nIf yeah: ", style:{color:"lightgray"}},
            {str:"Click another times to valid! (be fast)",style:{color:"lime"}}
        ])
    }
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
        api.sendMessage(playerId,[
            {str:"✨ LEVEL UP! ",style:{color:"#00ff00",fontWeight:"bold"}},
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
    api.sendMessage(playerId, [
        {str:"📈 Level set to ", style:{color:"#AAAAAA"}},
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
        api.sendMessage(playerId, [
            { str: "✨ SP recovered: ", style: { color: "#00ff00", fontWeight: "bold" } },
            { str: "+" + diff, style: { color: "white" } }
        ]);
    } else {
        api.sendMessage(playerId, [
            { str: "⚠️ SP corrected: ", style: { color: "#ff9900", fontWeight: "bold" } },
            { str: String(diff), style: { color: "white" } }
        ]);
    }

    return diff;
}
