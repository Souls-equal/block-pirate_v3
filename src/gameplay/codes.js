// codes.js

import { changeMoney, getStat, setStat } from "../utils/data";
import { applyEffect } from "../utils/combat";
import { say, txt, bold, ic } from "../core/theme";

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

export const refreshInfoCase = (playerId) => {
    const Redeemed = (getStat(playerId, CLAIMED_KEY, "") || "").toString()
    const count = Redeemed ? Redeemed.split(",").length : 0
    api.createShopItemForPlayer(playerId, CATEGORY_KEY, "info", {
        image: "Epic Lottery Ticket",
        canBuy: false,
        sortPriority: 10,
        customTitle: [bold("How to use a code?", "gold")],
        description: [
            "1. Click the purple ",
            ic("Epic Lottery Ticket"),
            " \"Redeem a gift code\" tile.\n",
            "2. Type (or paste) your code into the text box.\n",
            "3. Press the ",
            bold("Redeem", "lightgreen"),
            " button.\n\n",
            ic("fa-solid fa-award", "hotpink"),
            " You get your reward instantly!\n",
            ic("fa-solid fa-triangle-exclamation", "orange"),
            " Note: a code only works ONCE per player.\n\n",
            txt("You have already Redeemed " + count + " code(s) on this server.", "aqua")
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
        imageColour: "#b347ff",
        canBuy: true,
        cost: 0,
        sortPriority: 20,
        customTitle: [bold("Redeem a gift code", "violet")],
        buyButtonText: "Redeem",
        description: [
            ic("fa-solid fa-terminal", "violet"),
            " Type your code in the text box below, then press ",
            bold("Redeem", "lightgreen"),
            ".\n(Spaces are ignored, but uppercase letters matter.)"
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

    if (!entered) {
        api.sendOverShopInfo(playerId, [
            ic("fa-solid fa-pen", "orange"),
            txt("  Type a code in the text box first!", "orange")
        ])
        return
    }

    const code = CODES[entered]

    if (!code) {
        api.sendOverShopInfo(playerId, [
            ic("fa-solid fa-xmark", "red"),
            txt("  Invalid code. Check the spelling and try again!", "red")
        ])
        say(playerId, [bold("[Codes] ", "violet"),
            "That code does not exist (or no longer does)."], { color: "red" })
        return
    }

    if (code.expiration && Date.now() > code.expiration) {
        api.sendOverShopInfo(playerId, [
            ic("fa-solid fa-hourglass", "red"),
            txt("  This code has expired!", "red")
        ])
        return
    }

    const alreadyClaimed = getClaimedList(playerId)
    if (alreadyClaimed.indexOf(code.name) !== -1) {
        api.sendOverShopInfo(playerId, [
            ic("fa-solid fa-check", "gray"),
            txt("  You have already Redeemed this code!", "gray")
        ])
        say(playerId, [bold("[Codes] ", "violet"),
            "You have already Redeemed the code " + code.name + "."], { color: "gray" })
        return
    }

    markClaimed(playerId, code.name)
    giveReward(playerId, code)

    api.sendOverShopInfo(playerId, [
        ic("fa-solid fa-award", "hotpink"),
        txt("  Code accepted! Reward received.", "lightgreen")
    ])

    say(playerId,
        [bold("[Codes] ", "violet"),
         ic("fa-solid fa-award", "hotpink"),
         bold(" Code " + code.name + " Redeemed! ", "lightgreen"),
         code.reward],
        { color: "lightgreen" })

    api.sendFlyingMiddleMessage(playerId, ["CODE ACCEPTED!", code.reward], 80)

    refreshInfoCase(playerId)
}

export function codeJoin(playerId) {
    setupCodeShop()
    refreshInfoCase(playerId)
}
