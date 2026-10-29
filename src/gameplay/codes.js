// codes.js

import { changeMoney, getStat, setStat } from "../utils/data";
import { applyEffect } from "../utils/combat";
import { say } from "../core/theme";

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
        customTitle: [{ str: "How to use a code?", style: { color: "gold", fontWeight: "bold" } }],
        description: [
            "1. Click the purple ",
            { icon: "Epic Lottery Ticket" },
            " \"Redeem a gift code\" tile.\n",
            "2. Type (or paste) your code into the text box.\n",
            "3. Press the ",
            { str: "Redeem", style: { color: "lightgreen", fontWeight: "bold" } },
            " button.\n\n",
            { icon: "fa-solid fa-gift", style: { color: "hotpink" } },
            " You get your reward instantly!\n",
            { icon: "fa-solid fa-triangle-exclamation", style: { color: "orange" } },
            " Note: a code only works ONCE per player.\n\n",
            { str: "You have already Redeemed " + count + " code(s) on this server.", style: { color: "aqua" } }
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
        customTitle: [{ str: "Redeem a gift code", style: { color: "violet", fontWeight: "bold" } }],
        buyButtonText: "Redeem",
        description: [
            { icon: "fa-solid fa-keyboard", style: { color: "violet" } },
            " Type your code in the text box below, then press ",
            { str: "Redeem", style: { color: "lightgreen", fontWeight: "bold" } },
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
            { icon: "fa-solid fa-pen", style: { color: "orange" } },
            { str: "  Type a code in the text box first!", style: { color: "orange" } }
        ])
        return
    }

    const code = CODES[entered]

    if (!code) {
        api.sendOverShopInfo(playerId, [
            { icon: "fa-solid fa-xmark", style: { color: "red" } },
            { str: "  Invalid code. Check the spelling and try again!", style: { color: "red" } }
        ])
        say(playerId, [{ str: "[Codes] ", style: { color: "violet", fontWeight: "bold" } },
            "That code does not exist (or no longer does)."], { color: "red" })
        return
    }

    if (code.expiration && Date.now() > code.expiration) {
        api.sendOverShopInfo(playerId, [
            { icon: "fa-solid fa-clock", style: { color: "red" } },
            { str: "  This code has expired!", style: { color: "red" } }
        ])
        return
    }

    const alreadyClaimed = getClaimedList(playerId)
    if (alreadyClaimed.indexOf(code.name) !== -1) {
        api.sendOverShopInfo(playerId, [
            { icon: "fa-solid fa-check", style: { color: "gray" } },
            { str: "  You have already Redeemed this code!", style: { color: "gray" } }
        ])
        say(playerId, [{ str: "[Codes] ", style: { color: "violet", fontWeight: "bold" } },
            "You have already Redeemed the code " + code.name + "."], { color: "gray" })
        return
    }

    markClaimed(playerId, code.name)
    giveReward(playerId, code)

    api.sendOverShopInfo(playerId, [
        { icon: "fa-solid fa-gift", style: { color: "hotpink" } },
        { str: "  Code accepted! Reward received.", style: { color: "lightgreen" } }
    ])

    say(playerId,
        [{ str: "[Codes] ", style: { color: "violet", fontWeight: "bold" } },
         { icon: "fa-solid fa-gift", style: { color: "hotpink" } },
         { str: " Code " + code.name + " Redeemed! ", style: { color: "lightgreen", fontWeight: "bold" } },
         code.reward],
        { color: "lightgreen" })

    api.sendFlyingMiddleMessage(playerId, ["CODE ACCEPTED!", code.reward], 80)

    refreshInfoCase(playerId)
}

export function codeJoin(playerId) {
    setupCodeShop()
    refreshInfoCase(playerId)
}
