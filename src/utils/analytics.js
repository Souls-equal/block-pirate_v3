/* Analytics du monde — instrumentation prudente, sans stockage de donnees
   personnelles dans les valeurs d'evenement.

   Les methodes analytics n'existent que dans les mondes custom. Chaque appel
   est donc optionnel et isole : hors de ce contexte, aucune erreur analytics
   ne doit casser un handler de jeu.

   Limites Bloxd prises en compte : 20 evenements/joueur/minute, 20 types,
   50 valeurs par type, 20 categories/jour et 100 000 blocs de positions/jour.
   Garder les types et les valeurs sous forme d'enumerations controlees. */

const EVENT_LIMIT_PER_MINUTE = 18; // marge sous les 20 autorises
const EVENT_WINDOW_MS = 60_000;
/* Types d'evenements declares : 12 sur les 20 maximums par categorie. Evite qu'un
   ajout ponctuel ou une valeur dynamique cree un nouveau type a chaque appel. */
const EVENT_TYPES = new Set([
    "match", "session", "economy", "progression", "quest", "team",
    "travel", "fruit", "style", "upgrade", "combat", "boss",
]);
const POSITION_SAMPLE_MS = 60_000; // 1 position/minute/joueur, marge sur le quota global
const MONEY_FLUSH_MS = 30_000;
const MAX_MATCH_AGE_MS = 29 * 24 * 60 * 60 * 1000;

const sessions = new Map();       // playerId -> debut epoch ms
const eventTimes = new Map();     // playerId -> timestamps des evenements recents
const dailyValues = new Map();    // jour UTC + type -> Set de valeurs (quota Bloxd: 50)
const lastPosition = new Map();   // playerId -> dernier echantillon
const pendingMoney = new Map();   // playerId -> { gain, spend, flushAt }
let lastPositionSweep = 0;
let lastRateSweep = 0;
let categoryProvider = null;

function nowMs() {
    const n = Date.now();
    return Number.isFinite(n) && n > 0 ? n : 1;
}

export function setAnalyticsCategoryProvider(provider) {
    categoryProvider = typeof provider === "function" ? provider : null;
}

/* Les ids restent stables et tres peu nombreux : `lobby`, `sea1`... N'accepte
   que les categories que le projet connait; une variation inattendue tombe sur
   `sea1`, pour ne jamais depasser la limite quotidienne de 20 categories. */
function gameCategoryId() {
    let raw = "sea1";
    try {
        raw = categoryProvider ? categoryProvider() : api.getVariation();
    } catch (e) {}
    if (typeof raw !== "string") return "sea1";
    if (raw === "default" || raw === "lobby") return "lobby";
    if (/^sea(?:[1-9]|1[0-9])$/.test(raw)) return raw;
    /* `lobby` + `sea1`..`sea19` = 20 categories au maximum par jour. */
    return "sea1";
}

function validPlayerId(playerId) {
    return typeof playerId === "string" && playerId.length > 0;
}

function positionOf(playerId) {
    try {
        const p = api.getPosition(playerId);
        if (!Array.isArray(p) || p.length < 3) return null;
        const xyz = [Number(p[0]), Number(p[1]), Number(p[2])];
        if (!xyz.every(Number.isFinite)) return null;
        return xyz.map(Math.floor);
    } catch (e) {
        return null;
    }
}

function startTime(playerId) {
    const now = nowMs();
    let start = sessions.get(playerId);
    if (!Number.isFinite(start) || start <= 0 || start > now || now - start > MAX_MATCH_AGE_MS) {
        start = now;
        sessions.set(playerId, start);
        /* Valeur speciale documentee par Bloxd : elle delimite une session
           (match) pour les moyennes et temps relatifs. */
        sendEvent(playerId, "match", "match_started", null, false, start);
    }
    return start;
}

function underDailyValueLimit(eventType, eventValue, now) {
    if (eventValue === null || eventValue === undefined) return true;
    const day = new Date(now).toISOString().slice(0, 10); // minuit UTC
    const key = day + ":" + eventType;
    const values = dailyValues.get(key);
    return !values || values.has(eventValue) || values.size < 50;
}

function noteDailyValue(eventType, eventValue, now) {
    if (eventValue === null || eventValue === undefined) return;
    const day = new Date(now).toISOString().slice(0, 10);
    const key = day + ":" + eventType;
    let values = dailyValues.get(key);
    if (!values) values = new Set();
    values.add(eventValue);
    dailyValues.set(key, values);
    /* Ne conserve que le jour courant pour borner la memoire du module. */
    for (const oldKey of dailyValues.keys()) if (oldKey.slice(0, 10) !== day) dailyValues.delete(oldKey);
}

function underPlayerEventLimit(playerId, now) {
    let times = eventTimes.get(playerId);
    if (!times) times = [];
    while (times.length && now - times[0] >= EVENT_WINDOW_MS) times.shift();
    if (times.length >= EVENT_LIMIT_PER_MINUTE) {
        eventTimes.set(playerId, times);
        return false;
    }
    times.push(now);
    eventTimes.set(playerId, times);
    return true;
}

function sendEvent(playerId, eventType, eventValue, numericValue, withPosition, fixedStart) {
    if (!validPlayerId(playerId) || !EVENT_TYPES.has(eventType)) return false;
    if (eventValue !== null && eventValue !== undefined && (typeof eventValue !== "string" || eventValue.length > 128)) return false;
    try {
        if (!api || typeof api.registerAnalyticsEvent !== "function") return false;
        const now = nowMs();
        if (!underDailyValueLimit(eventType, eventValue, now)) return false;
        if (!underPlayerEventLimit(playerId, now)) return false;
        const start = fixedStart || startTime(playerId);
        const position = withPosition ? positionOf(playerId) : null;
        const numeric = Number.isFinite(numericValue) ? numericValue : null;
        api.registerAnalyticsEvent(
            playerId,
            eventType,
            eventValue === undefined ? null : eventValue,
            gameCategoryId(),
            start,
            position,
            numeric,
        );
        noteDailyValue(eventType, eventValue, now);
        return true;
    } catch (e) {
        return false;
    }
}

export function analyticsJoin(playerId) {
    if (!validPlayerId(playerId)) return false;
    const old = sessions.get(playerId);
    if (Number.isFinite(old) && old > 0) return true;
    const start = nowMs();
    sessions.set(playerId, start);
    lastPosition.delete(playerId);
    pendingMoney.delete(playerId);
    return sendEvent(playerId, "match", "match_started", null, false, start);
}

export function trackAnalyticsEvent(playerId, eventType, eventValue, numericValue, withPosition) {
    return sendEvent(playerId, eventType, eventValue, numericValue, withPosition === true);
}

/* Ajoute les changements de monnaie dans un agregat de 30 secondes. Sans
   regroupement, un joueur qui farm vite pourrait depasser 20 evenements/minute.
   Les achats et gains restent mesures, sans journaliser chaque mob tue. */
export function recordAnalyticsMoney(playerId, delta) {
    if (!validPlayerId(playerId) || !Number.isFinite(delta) || delta === 0) return;
    const now = nowMs();
    let row = pendingMoney.get(playerId);
    if (!row) row = { gain: 0, spend: 0, flushAt: now + MONEY_FLUSH_MS };
    if (delta > 0) row.gain += delta;
    else row.spend += Math.abs(delta);
    pendingMoney.set(playerId, row);
}

function flushMoney(playerId) {
    const row = pendingMoney.get(playerId);
    if (!row) return;
    pendingMoney.delete(playerId);
    if (row.gain > 0) sendEvent(playerId, "economy", "coins_gained", row.gain, false);
    if (row.spend > 0) sendEvent(playerId, "economy", "coins_spent", row.spend, false);
}

export function analyticsLeave(playerId) {
    if (!validPlayerId(playerId)) return;
    flushMoney(playerId);
    const start = sessions.get(playerId);
    if (Number.isFinite(start) && start > 0) {
        const durationSeconds = Math.max(0, Math.floor((nowMs() - start) / 1000));
        sendEvent(playerId, "session", "session_ended", durationSeconds, false, start);
    }
    sessions.delete(playerId);
    /* La limite est bien par compte, pas par connexion : garder les horodatages
       récents après un leave évite de pouvoir la contourner par reconnexion. */
    lastPosition.delete(playerId);
}

/* A appeler depuis tick. Positions arrondies au bloc, une fois par minute,
   pour obtenir une heatmap utile tout en limitant le quota mondial de 100k/j. */
export function analyticsTick() {
    const now = nowMs();
    if (now - lastRateSweep >= EVENT_WINDOW_MS) {
        lastRateSweep = now;
        for (const [playerId, times] of eventTimes) {
            while (times.length && now - times[0] >= EVENT_WINDOW_MS) times.shift();
            if (!times.length) eventTimes.delete(playerId);
        }
    }
    for (const [playerId, row] of pendingMoney) {
        if (now >= row.flushAt) flushMoney(playerId);
    }
    if (now - lastPositionSweep < POSITION_SAMPLE_MS) return;
    lastPositionSweep = now;
    let ids = [];
    try { ids = api.getPlayerIds() || []; } catch (e) { return; }
    for (const playerId of ids) {
        if (!validPlayerId(playerId)) continue;
        const start = startTime(playerId);
        const previous = lastPosition.get(playerId) || 0;
        if (now - previous < POSITION_SAMPLE_MS) continue;
        try {
            if (typeof api.registerAnalyticsPlayerPosition !== "function") continue;
            api.registerAnalyticsPlayerPosition(playerId, gameCategoryId(), start, positionOf(playerId));
            lastPosition.set(playerId, now);
        } catch (e) {}
    }
}
