// codes.js

import { changeMoney, getStat, setStat } from "../utils/data";
import { applyEffect } from "../utils/combat";
import { C, say, txt, bold, ic } from "../core/theme";

const CATEGORY_KEY = "code"
const CLAIMED_KEY = "codeRedeem"

const CODES = {}

const addCode = (name, reward, items, effects, money) => {
    CODES[name.toUpperCase()] = {
        name: name.toUpperCase(),
        reward: reward,
        items: items || [],
        effects: effects || [],
        money: money || 0,
    }
}

addCode(
    "WELCOME99",
    "Welcome to the game! Dont forget to join the discord for more codes!",
    [{ item: "Stick", qte: 1 }, { item: "Apple", qte: 5 }],
    [],
    99,
)
addCode(
    "1SPEED",
    "Welcome to the game! Dont forget to join the discord for more codes!",
    [],
    [{ name: "Speed", duration:null }],
    99,
)
addCode(
    "IMINTHEDISCORD",
    "500 Money and speed for 1h! Tysm to joining it!",
    [],
    [{ name: "Speed", duration: 60 * 60 * 1000 }],
    500,
)
addCode(
    "BLADEFRUITFORFREE",
    "Blade??!?!",
    [{ item:"Plum Block", qte: 1 }],
    [],
    0,
)
addCode(
    "VIP200",
    "200 Money + Health Regen for 30 minutes. Thanks for supporting the server!",
    [{ item: "Apple", qte: 10 }],
    [{ name: "Health Regen", duration: 60 * 30 * 1000 }],
    200,
)
addCode(
    "TYFOR40MEMBERS",
    "500 Money, apples and Damage for 60 minutes. Thanks for supporting the server!",
    [{ item: "Apple", qte: 50 }],
    [{ name: "Damage", duration: 60 * 60 * 1000 }],
    500,
)

/* ANATOMIE DES CARTES (la meme que Settings et Upgrades) : une icone + une
   phrase qui dit ce que ca fait, une seule ligne d'etat « ● », puis l'aide.
   Les deux cartes de cette categorie racontaient la meme chose deux fois, avec
   des couleurs nommees a la main (« gold », « hotpink », « orange », « aqua »)
   qui atterrissaient toutes dans deux ou trois roles de la palette. */
export const refreshInfoCase = (playerId) => {
    const redeemed = (getStat(playerId, CLAIMED_KEY, "") || "").toString()
    const count = redeemed ? redeemed.split(",").length : 0
    api.createShopItemForPlayer(playerId, CATEGORY_KEY, "info", {
        image: "Epic Lottery Ticket",
        imageColour: C.MONEY,
        canBuy: false,
        sortPriority: 10,
        customTitle: [bold("How codes work", C.MONEY)],
        description: [
            ic("fa-solid fa-circle-info", C.MONEY),
            txt(" A code gives its reward the moment you redeem it.", C.INFO),
            bold("\n\u25cf One code per player, forever.", C.SUCCESS),
            txt("\nCodes come from the Discord, and some expire.", C.INFO),
            bold("\n\u25cf " + count + " code" + (count === 1 ? "" : "s") + " redeemed here.", C.XP),
        ]
    })
}

export const setupCodeShop = () => {
    api.configureShopCategory(CATEGORY_KEY, {
        customTitle: "Gift Codes",
        autoSelectCategory: false,
        sortPriority: 100
    })

    api.createShopItem(CATEGORY_KEY, "enter_code", {
        image: "Legendary Lottery Ticket",
        imageColour: C.MONEY,
        canBuy: true,
        cost: 0,
        sortPriority: 20,
        customTitle: [bold("Redeem a code", C.MONEY)],
        buyButtonText: [txt("Redeem", C.MONEY)],
        description: [
            ic("fa-solid fa-terminal", C.MONEY),
            txt(" Type your code below, then press ", C.INFO),
            bold("Redeem", C.SUCCESS),
            txt(".", C.INFO),
            txt("\nSpaces are ignored; letters are not case sensitive.", C.INFO),
        ],
        userInput: {
            type: "text",
            placeholderText: "e.g. WELCOME99",
            wordCharsOnly: false
        }
    })
}

const getClaimedList = (playerId) => {
    const raw = getStat(playerId, CLAIMED_KEY, null)
    if (!raw) return []
    return raw.toString().split(",").filter((c) => c.length > 0)
}

const markClaimed = (playerId, codeName) => {
    const list = getClaimedList(playerId)
    list.push(codeName)
    setStat(playerId, CLAIMED_KEY, list.join(","))
}

const giveReward = (playerId, code) => {
    for (const lot of code.items) {
        api.giveItem(playerId, lot.item, lot.qte || 1)
    }
    for (const effect of code.effects) {
        applyEffect(playerId, effect.name, effect.duration ? effect.duration : null)
    }

    if (code.money && code.money > 0) {
        changeMoney(playerId, code.money)
    }
}

export function handleShopCode(playerId, categoryKey, itemKey, item, userInput) {
    if (categoryKey !== CATEGORY_KEY || itemKey !== "enter_code") return

    const entered = (userInput || "").toString().trim().toUpperCase()

    /* Meme anatomie pour les cinq reponses : icone + « CODE » + la phrase.
       Avant, quatre d'entre elles commencaient par deux espaces et une
       majuscule au hasard («  Type a code… »), et le succes etait le seul a
       avoir droit a un point d'exclamation. */
    if (!entered) {
        api.sendOverShopInfo(playerId, [
            ic("fa-solid fa-pen", C.DANGER),
            bold(" CODE  ", C.MONEY),
            txt("Type a code in the box first.", C.INFO)
        ])
        return
    }

    const code = CODES[entered]

    if (!code) {
        api.sendOverShopInfo(playerId, [
            ic("fa-solid fa-xmark", C.DANGER),
            bold(" CODE  ", C.MONEY),
            txt("That code does not exist, or no longer does.", C.DANGER)
        ])
        say(playerId, [
            ic("fa-solid fa-xmark", C.DANGER),
            bold(" CODE  ", C.MONEY),
            txt("That code does not exist, or no longer does.", C.DANGER)
        ])
        return
    }

    if (code.expiration && Date.now() > code.expiration) {
        api.sendOverShopInfo(playerId, [
            ic("fa-solid fa-hourglass", C.DANGER),
            bold(" CODE  ", C.MONEY),
            txt("This code has expired.", C.DANGER)
        ])
        return
    }

    const alreadyClaimed = getClaimedList(playerId)
    if (alreadyClaimed.indexOf(code.name) !== -1) {
        api.sendOverShopInfo(playerId, [
            ic("fa-solid fa-check", C.INFO),
            bold(" CODE  ", C.MONEY),
            txt("You already redeemed " + code.name + ".", C.INFO)
        ])
        say(playerId, [
            ic("fa-solid fa-check", C.INFO),
            bold(" CODE  ", C.MONEY),
            txt("You already redeemed " + code.name + ".", C.INFO)
        ])
        return
    }

    markClaimed(playerId, code.name)
    giveReward(playerId, code)

    api.sendOverShopInfo(playerId, [
        ic("fa-solid fa-award", C.SUCCESS),
        bold(" CODE  ", C.MONEY),
        txt("Accepted, reward received.", C.SUCCESS)
    ])

    say(playerId, [
        ic("fa-solid fa-award", C.SUCCESS),
        bold(" CODE  ", C.MONEY),
        bold(code.name, C.MONEY),
        txt(" accepted: ", C.SUCCESS),
        txt(code.reward, C.INFO),
    ])

    api.sendFlyingMiddleMessage(playerId, ["CODE ACCEPTED", code.reward], 80)

    refreshInfoCase(playerId)
}

export function codeJoin(playerId) {
    setupCodeShop()
    refreshInfoCase(playerId)
}
