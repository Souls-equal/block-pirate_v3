#!/usr/bin/env node
// tools/check-tutorial.mjs
//
// Le tutoriel est une machine a etats : etape par etape, il regarde l'ETAT du
// joueur (equipe, style, premiere quete, premiere arme) et avance. Rien de tout
// ca ne se voit a la compilation, donc on le rejoue ici avec une `api` simulee :
//
//   1. un nouveau joueur recoit l'accueil (but du jeu, comment jouer) + l'etape 1
//   2. chaque action le fait avancer d'une etape, sans jamais sauter
//   3. la premiere arme termine le tutoriel et explique la boucle du jeu
//   4. un achat d'arme hors de l'etape 4 ne fait rien ; une arme deja possedee
//      saute l'etape 4
//   5. la protection PvP couvre l'etape 1 seulement
//   6. `skipTutorial` demande deux clics, puis ne revient jamais tout seul
//   7. un veteran (level, team, quete) n'est pas embarque dans le tutoriel
import * as esbuild from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = path.join(ROOT, "src/gameplay/tutorial.js");

const built = esbuild.buildSync({
  stdin: {
    contents:
      `export * from ${JSON.stringify(ENTRY)};\n` +
      `export { step } from ${JSON.stringify(path.join(ROOT, "src/utils/timer.ts"))};\n`,
    resolveDir: ROOT,
    loader: "js",
  },
  bundle: true,
  format: "iife",
  globalName: "TUT",
  write: false,
  logLevel: "silent",
});

let code = built.outputFiles[0].text;

/* ------------------------------------------------------------- faux jeu --- */
const msgs = [];
const db = {};
const noop = () => {};

globalThis.api = new Proxy(
  {
    now: () => Date.now(),
    log: noop,
    sendMessage: (p, m) => msgs.push({ p, m }),
    broadcastMessage: (m) => msgs.push({ p: "*", m }),
    getPlayerDbValue: (p, k) => (k in (db[p] || {}) ? db[p][k] : null),
    setPlayerDbValue: (p, k, v) => {
      (db[p] = db[p] || {})[k] = v;
    },
    deletePlayerDbValue: (p, k) => {
      if (db[p]) delete db[p][k];
    },
    getPlayerIds: () => Object.keys(db),
    getEntityType: (id) => (String(id).startsWith("p") ? "Player" : "Mob"),
    getEntityName: (id) => String(id),
    getHealth: () => 20,
    getPosition: () => [0, 64, 0],
    getItemSlot: () => null,
    getMoonstoneChestItems: () => [],
    playSound: noop,
  },
  { get: (t, k) => (k in t ? t[k] : noop) },
);

(0, eval)(code);
const TUT = globalThis.TUT;
TUT.startTutorialLoop();

/* ---------------------------------------------------------------- outils -- */
const problems = [];
const ok = (cond, msg) => {
  if (!cond) problems.push(msg);
};
const textOf = (m) =>
  Array.isArray(m) ? m.map((s) => (s && s.str) || "").join("") : String(m || "");
const texts = (p) => msgs.filter((x) => x.p === p).map((x) => textOf(x.m));
const clear = () => (msgs.length = 0);
const drive = (n) => {
  for (let i = 0; i < n; i++) TUT.step();
};
const stepOf = (p) => Number((db[p] || {}).tut || 0);
const isDone = (p) => Number((db[p] || {}).tutd || 0) === 1;

/* 1. nouveau joueur ------------------------------------------------------- */
db.p1 = {};
clear();
ok(TUT.tutorialJoin("p1") === true, "tutorialJoin ne demarre pas le tutoriel");
ok(stepOf("p1") === 1, `etape attendue 1, obtenu ${stepOf("p1")}`);
drive(200); /* accueil : trois messages espaces de 70 et 140 ticks */
{
  const all = texts("p1").join("\n");
  ok(/WELCOME TO BLOCK PIRATE/.test(all), "pas de message d'accueil");
  ok(/become the strongest/.test(all), "l'accueil ne dit pas le but du jeu");
  ok(/HOW IT WORKS/.test(all), "pas d'explication de comment jouer");
  ok(/STEP 1\/4/.test(all), "pas de premiere etape annoncee");
  ok(
    TUT.tutorialObjective("p1") === "TUTORIAL 1/4  Choose your side",
    `objectif de sidebar inattendu : ${TUT.tutorialObjective("p1")}`,
  );
  ok(/two clicks/.test(all), "l'accueil ne dit pas que deux clics valident un achat");
}

/* 2. une etape a la fois -------------------------------------------------- */
clear();
db.p1.team = "PIRATES";
drive(60);
ok(stepOf("p1") === 2, `equipe choisie : etape 2 attendue, obtenu ${stepOf("p1")}`);
ok(/STEP 2\/4/.test(texts("p1").join("\n")), "l'etape 2 n'est pas annoncee");

clear();
db.p1.fs = "Combat";
drive(60);
ok(stepOf("p1") === 3, `style appris : etape 3 attendue, obtenu ${stepOf("p1")}`);
ok(/STEP 3\/4/.test(texts("p1").join("\n")), "l'etape 3 n'est pas annoncee");

clear();
db.p1.questProgress = 1;
drive(60);
ok(stepOf("p1") === 4, `premiere quete : etape 4 attendue, obtenu ${stepOf("p1")}`);
ok(/STEP 4\/4/.test(texts("p1").join("\n")), "l'etape 4 n'est pas annoncee");

/* 3. la premiere arme termine tout ---------------------------------------- */
clear();
TUT.notePurchase("p1", "Wood Sword");
drive(120);
ok(isDone("p1"), "l'achat de la premiere arme ne termine pas le tutoriel");
ok(!("tut" in db.p1), "la cle d'etape traine apres la fin");
{
  const all = texts("p1").join("\n");
  ok(/TUTORIAL COMPLETE/.test(all), "pas de message de fin");
  ok(/XP/.test(all) && /Coins/.test(all), "la fin n'explique pas XP / Coins");
  ok(/GARP/.test(all), "la fin ne parle pas des boss");
  ok(TUT.tutorialObjective("p1") === null, "la sidebar affiche encore l'objectif");
}

/* 4. l'arme : ni trop tot, ni obligatoire deux fois ----------------------- */
db.p3 = { tut: 3, team: "MARINES" };
TUT.notePurchase("p3", "Wood Spear");
ok(stepOf("p3") === 3, "un achat d'arme a l'etape 3 fait avancer le tutoriel");
globalThis.api.getItemSlot = (p, slot) =>
  p === "p3" && slot === 0 ? { name: "Wood Spear" } : null;
db.p3.questProgress = 2;
drive(60);
ok(isDone("p3"), "arme deja en inventaire : l'etape 4 n'est pas sautee");
globalThis.api.getItemSlot = () => null;

/* 5. protection PvP : etape 1 seulement ----------------------------------- */
db.p4 = { tut: 1 };
ok(TUT.tutorialShield("p9", "p4") === true, "aucune protection a l'etape 1");
ok(TUT.tutorialShield("p4", "p9") === false, "le nouveau protege les autres !");
db.p4.team = "PIRATES";
ok(TUT.tutorialShield("p9", "p4") === false, "protection encore active apres le choix de team");

/* 6. passer : deux clics, et pour de bon ---------------------------------- */
db.p5 = {};
TUT.tutorialJoin("p5");
clear();
ok(TUT.skipTutorial("p5") === false, "le premier clic saute deja le tutoriel");
ok(/Skip the tutorial/.test(texts("p5").join("\n")), "le premier clic n'explique rien");
ok(TUT.skipTutorial("p5") === true, "le second clic ne saute pas le tutoriel");
ok(isDone("p5") && !("tut" in db.p5), "etat impropre apres le saut");
ok(TUT.tutorialJoin("p5") === false, "le tutoriel redemarre apres le saut");

/* 7. un veteran n'y a pas droit ------------------------------------------- */
db.p6 = { team: "PIRATES", lvl: 42, money: 9000, questId: "monkey2" };
clear();
TUT.tutorialJoin("p6");
ok(isDone("p6"), "un veteran n'est pas marque comme deja forme");
ok(!("tut" in db.p6), "un veteran recoit une etape de tutoriel");
ok(texts("p6").length === 0, "un veteran recoit un message de tutoriel");

/* 8. relance manuelle ----------------------------------------------------- */
TUT.startTutorial("p1", true);
ok(stepOf("p1") === 1 && !isDone("p1"), "startTutorial ne relance pas a l'etape 1");

/* ------------------------------------------------------------- resultat -- */
console.log(
  `Tutoriel : 4 etapes, protection PvP de l'etape 1, saut confirme, veteran exclu ` +
    `(${Object.keys(db).length} joueurs simules).`,
);
if (problems.length) {
  console.error("\n" + problems.map((p) => "  ✖ " + p).join("\n"));
  process.exit(1);
}
console.log("Tutoriel du nouveau joueur. ✅");
