/* Tests de contrat pour l'instrumentation analytics de Block Pirate. */
import assert from "node:assert/strict";
import { buildSync } from "esbuild";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SOURCE = join(ROOT, "src/utils/analytics.js");
const built = buildSync({
    stdin: { contents: `export * from ${JSON.stringify(SOURCE)};`, resolveDir: ROOT, loader: "js" },
    bundle: true, write: false, format: "esm", platform: "node", target: "es2020", logLevel: "silent",
});

let clock = 1_800_000_000_000;
const realNow = Date.now;
Date.now = () => clock;
const events = [];
const positions = [];
globalThis.api = {
    getVariation: () => "sea1",
    getPlayerIds: () => ["p1"],
    getPosition: () => [12.8, -4.2, 99.1],
    registerAnalyticsEvent: (...args) => events.push(args),
    registerAnalyticsPlayerPosition: (...args) => positions.push(args),
};

try {
    const analytics = await import("data:text/javascript;base64," + Buffer.from(built.outputFiles[0].text).toString("base64"));
    analytics.setAnalyticsCategoryProvider(() => "sea1");

    assert.equal(analytics.analyticsJoin("p1"), true);
    assert.equal(events.length, 1);
    assert.deepEqual(events[0], ["p1", "match", "match_started", "sea1", clock, null, null]);

    assert.equal(analytics.trackAnalyticsEvent("p1", "quest", "starter_island", 250, true), true);
    assert.deepEqual(events[1], ["p1", "quest", "starter_island", "sea1", clock, [12, -5, 99], 250]);
    analytics.setAnalyticsCategoryProvider(() => "unrecognized-variation");
    assert.equal(analytics.trackAnalyticsEvent("p1", "style", "Combat", null, false), true);
    assert.equal(events[2][3], "sea1", "une variation inconnue retombe dans une catégorie stable");
    analytics.setAnalyticsCategoryProvider(() => "default");
    assert.equal(analytics.trackAnalyticsEvent("p1", "team", "pirates", null, false), true);
    assert.equal(events[3][3], "lobby");
    analytics.setAnalyticsCategoryProvider(() => "sea1");

    analytics.recordAnalyticsMoney("p1", 100);
    analytics.recordAnalyticsMoney("p1", 50);
    analytics.recordAnalyticsMoney("p1", -40);
    clock += 30_000;
    analytics.analyticsTick();
    assert(events.some((e) => e[1] === "economy" && e[2] === "coins_gained" && e[6] === 150));
    assert(events.some((e) => e[1] === "economy" && e[2] === "coins_spent" && e[6] === 40));

    /* Le heatmap échantillonne au plus une fois par minute et arrondit au bloc. */
    const firstPositionCount = positions.length;
    analytics.analyticsTick();
    assert.equal(positions.length, firstPositionCount);
    clock += 60_000;
    analytics.analyticsTick();
    assert.equal(positions.length, firstPositionCount + 1);
    assert.deepEqual(positions[0], ["p1", "sea1", 1_800_000_000_000, [12, -5, 99]]);

    analytics.analyticsLeave("p1");
    const end = events.find((e) => e[1] === "session" && e[2] === "session_ended");
    assert(end, "session_ended doit être enregistré au départ");
    assert.equal(end[6], 90);

    /* Le garde-fou local conserve une marge sous les 20 événements/minute. */
    analytics.analyticsJoin("p2");
    for (let i = 0; i < 30; i++) analytics.trackAnalyticsEvent("p2", "combat", "pvp_kill", null, false);
    assert(events.filter((e) => e[0] === "p2").length <= 18);
    assert.equal(analytics.trackAnalyticsEvent("p2", "invented_type", "x", null, false), false);
    analytics.analyticsLeave("p2");
    analytics.analyticsJoin("p2"); // reconnexion : le quota ne se reinitialise pas
    assert(events.filter((e) => e[0] === "p2").length <= 18);

    /* Le plafond quotidien de 50 valeurs par type est aussi respecte. */
    let acceptedValues = 0;
    for (let i = 0; i < 51; i++) {
        const id = "value-test-" + i;
        analytics.analyticsJoin(id);
        if (analytics.trackAnalyticsEvent(id, "upgrade", "controlled_" + i, null, false)) acceptedValues++;
    }
    assert.equal(acceptedValues, 50);

    /* Un monde non-custom ou un client sans l'API analytics ne doit pas casser. */
    globalThis.api = {};
    assert.doesNotThrow(() => analytics.analyticsJoin("p3"));
    assert.doesNotThrow(() => analytics.analyticsTick());

    console.log("Analytics : session, catégories, événements, monnaie agrégée, quota et heatmap validés.");
} finally {
    Date.now = realNow;
}
