export const PERMISSION_LEVELS = {
    NONE: 0,
    BASIC: 1,
    MOD: 2,
    DEV: 3,
    ADMIN: 4,
    OWNER: 5,
};

export const RANKS = {
    NONE: {
        id: "NONE",
        prefix: "",
        color: "#aaaaaa",
        permissionLevel: PERMISSION_LEVELS.NONE,
        byPassChatRestriction: false,
    },
    OWNER: {
        id: "OWNER",
        prefix: "[OWNER]",
        color: "#FFD700",
        permissionLevel: PERMISSION_LEVELS.OWNER,
        byPassChatRestriction: true,
    },
    ADMIN: {
        id: "ADMIN",
        prefix: "[ADMIN]",
        color: "#FFD700",
        permissionLevel: PERMISSION_LEVELS.ADMIN,
        byPassChatRestriction: true,
    },
    DEV: {
        id: "DEV",
        prefix: "[DEV]",
        color: "#FFD700",
        permissionLevel: PERMISSION_LEVELS.DEV,
        byPassChatRestriction: true,
    },
    MOD: {
        id: "MOD",
        prefix: "[MOD]",
        color: "#ff9900",
        permissionLevel: PERMISSION_LEVELS.MOD,
        byPassChatRestriction: true,
    },
    TESTER: {
        id: "TESTER",
        prefix: "[TESTER]",
        color: "#ff4444",
        permissionLevel: PERMISSION_LEVELS.BASIC,
        byPassChatRestriction: false,
    },
    MOBLANDS: {
        id: "MOBLANDS",
        prefix: "[MOBLANDS]",
        color: "#75dec5",
        permissionLevel: PERMISSION_LEVELS.BASIC,
        byPassChatRestriction: false,
    },
    KNIGHTFALL: {
        id: "KNIGHT FALL",
        prefix: "[KNIGHT FALL]",
        color: "#b08dfb",
        permissionLevel: PERMISSION_LEVELS.BASIC,
        byPassChatRestriction: false,
    },
    VIP: {
        id: "VIP",
        prefix: "[VIP]",
        color: "#FFD700",
        permissionLevel: PERMISSION_LEVELS.BASIC,
        byPassChatRestriction: false,
    },
    YOUTUBER: {
        id: "YOUTUBER",
        prefix: "[YOUTUBER]",
        color: "red",
        permissionLevel: PERMISSION_LEVELS.BASIC,
        byPassChatRestriction: false,
    },
};

export const STAFF = {
    "TheSageOfDeath": "TESTER",
    "Xarvath": "TESTER",
    "Ninja_Reborn": "TESTER",
    "GoogleplexALT": "TESTER",
    "C0NVICT": "MOBLANDS",
    "SUSSYNOTPRIME": "KNIGHTFALL",
    "K4miNoK4mi": "OWNER",
    "Yanick2010": "ADMIN",
    "EPICOO00000": "DEV",
    "_Alxrost": "YOUTUBER",
    "KIDDING_MC_VN": "DEV",
    "BLOXD_IO_YT_ZAY":"TESTER",
    "DlRECTOR":"TESTER",
};

const playerRankCache = {};

export function assignRank(playerId) {
    const name = api.getEntityName(playerId);
    const rankId = STAFF[name] || "NONE";
    playerRankCache[playerId] = rankId;
    return rankId;
}

export function clearRankCache(playerId) {
    delete playerRankCache[playerId];
}

export function getPlayerRank(playerId) {
    if (!playerRankCache[playerId]) assignRank(playerId);
    return playerRankCache[playerId] || "NONE";
}

export function getRankData(rankId) {
    return RANKS[rankId] || RANKS.NONE;
}

export function getRankDataForPlayer(playerId) {
    return getRankData(getPlayerRank(playerId));
}

export function getPermissionLevel(playerId) {
    return getRankDataForPlayer(playerId).permissionLevel || PERMISSION_LEVELS.NONE;
}

export function hasPermission(playerId, requiredLevel) {
    return getPermissionLevel(playerId) >= requiredLevel;
}

export function isOwner(playerId) {
    return getPermissionLevel(playerId) >= PERMISSION_LEVELS.OWNER;
}

export function isAdmin(playerId) {
    return getPermissionLevel(playerId) >= PERMISSION_LEVELS.ADMIN;
}

export function isDev(playerId) {
    return getPermissionLevel(playerId) >= PERMISSION_LEVELS.DEV;
}

export function isMod(playerId) {
    return getPermissionLevel(playerId) >= PERMISSION_LEVELS.MOD;
}

export function canBypassChatRestriction(playerId) {
    return getRankDataForPlayer(playerId).byPassChatRestriction === true;
}
