#!/usr/bin/env node
// tools/check-rules.mjs
//
// Les REGLES DU JEU qui ne se voient ni a la compilation ni dans une capture
// d'ecran. On les rejoue sur le vrai code, avec une `api` simulee :
//
//   1. NAME TAGS. Bloxd refuse EN BLOC un `nameTagInfo` qui contient une seule
//      valeur hors schema (« Expected: valid nameTagInfo value ») : le joueur
//      garde son ancien nom, ou aucun. On verifie que le nettoyage jette bien
//      tout ce qui n'est pas au schema — null, cle inventee, nom undefined,
//      icone dans une partie de texte — et que les objets construits par le
//      jeu passent tous.
//   2. PRIME ET ANTI-FARM. Une cible trop faible (40 niveaux d'ecart) ne perd
//      JAMAIS d'argent, le tueur ne touche que ~5 % en prime, et la meme paire
//      ne paie qu'une fois par fenetre.
//   3. CHAT EN LECTURE SEULE. Un rang qui lit tous les canaux recoit une copie
//      des messages d'equipage et ne peut PAS y ecrire.
//   4. BOSS. Aucun crowd control ne s'applique a un boss, quelle que soit la
//      capacite : ni lenteur, ni affaiblissement, ni deplacement force.
//   5. ZERO EMOJI. Aucun caractere pictographique dans les sources : un emoji
//      s'affiche en carre vide ou casse la mise en page du chat. Les signes
//      typographiques (✦, ●, ─) ne sont PAS des emoji et restent autorises.
//   6. ITEM DE DASH. L'item du dash mobile doit etre INERTE (une matiere) : un
//      item qui propulse tout seul fait un second dash que le mobile ne peut
//      pas annuler.
//   7. AUCUN PSEUDO DANS LA LOGIQUE. Les pseudos du staff vivent dans la table
//      STAFF (core/ranks.js) et nulle part ailleurs : une exemption par nom
//      (« ce joueur peut poser des traps ») est une regle qui n'existe pas.
//   8. ANCIENNE UI. Le panneau Settings a deja eu un item par ile ("isle_ju").
//      Un client qui les affiche encore doit obtenir le meme effet : on garde
//      la lecture, et ce test empeche de la supprimer par megarde.
//  10. PNJ SOUS LE DOIGT. Un ecran tactile n'envoie aucune cible d'entite :
//      on retrouve le PNJ le plus proche du point touche, et seulement un PNJ.
//  11. CHANGEMENT DE TEAM. La quete suit la nouvelle team (cible et marqueur)
//      sans perdre les kills deja faits.
//  12. MACHINE A FRUITS. Un tirage encaisse exactement son prix puis donne le
//      fruit ; un echec de remise rembourse tout. Jamais de fruit gratuit.
//
// Les couleurs, elles, ne sont plus verifiees : quelques teintes hors palette
// sont un choix assume du jeu (elles restent lisibles et coherentes).
//
// Lance par `npm run check`. `tools/` n'est PAS du World Code : ces fichiers ne
// partent jamais vers Bloxd (la limite des 64 fichiers ne les concerne pas).
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const SRC = join(ROOT, "src");
const errors = [];
let checked = 0;
const check = (cond, msg) => {
    checked++;
    if (!cond) errors.push(msg);
};

/* ==========================================================================
   0. OUTILS COMMUNS
   ========================================================================== */

function sourceFiles(dir) {
    const out = [];
    for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
        else if (path.endsWith(".js")) out.push(path);
    }
    return out;
}
const FILES = sourceFiles(SRC);
const rel = (path) => relative(ROOT, path).replace(/\\/g, "/");

/* Noms assignes sans declaration dans src/ (mode sloppy de Bloxd) : hors de
   Bloxd il faut les poser, sinon l'import du bundle leve un ReferenceError. */
const SLOPPY_GLOBALS = [
    "chooseTeam", "continueJourney", "doPeriodicSave", "enterSea", "resetPlayer",
    "setPlayerTeam", "skipTutorial", "spawnMobLeader", "spawnNPC", "spawnQuestMob",
    "startBoss", "startTutorial", "withEffectSource",
];

const sent = [];
const db = {};
function installApi(extra) {
    for (const n of SLOPPY_GLOBALS) globalThis[n] = () => false;
    globalThis.api = new Proxy(
        {
            now: () => Date.now(),
            log: () => {},
            sendMessage: (pid, msg) => sent.push({ pid, msg }),
            broadcastMessage: (msg) => sent.push({ pid: "*", msg }),
            getPlayerDbValue: (pid, key) => (db[pid] && key in db[pid] ? db[pid][key] : null),
            setPlayerDbValue: (pid, key, value) => {
                db[pid] = db[pid] || {};
                db[pid][key] = value;
            },
            deletePlayerDbValue: (pid, key) => {
                if (db[pid]) delete db[pid][key];
            },
            getPlayerIds: () => Object.keys(db),
            getEntityType: (id) => (String(id).charAt(0) === "p" ? "Player" : "Mob"),
            getEntityName: (id) => String(id),
            getHealth: () => 20,
            getMaxHealth: () => 20,
            getPosition: () => [0, 64, 0],
            getItemSlot: () => null,
            getMoonstoneChestItems: () => [],
            playSound: () => {},
            setClientOption: () => {},
            createShopItem: () => {},
            createShopItemForPlayer: () => {},
            updateShopItemForPlayer: () => {},
            ...extra,
        },
        { get: (t, k) => (k in t ? t[k] : () => undefined) },
    );
}

/* Corps d'un appel : de la parenthese ouvrante a la fermante correspondante,
   chaines comprises. */
function callBody(text, openIndex) {
    let depth = 1;
    let i = openIndex + 1;
    while (i < text.length && depth > 0) {
        const ch = text[i];
        if (ch === '"' || ch === "'" || ch === "`") {
            const quote = ch;
            i++;
            while (i < text.length && text[i] !== quote) {
                if (text[i] === "\\") i++;
                i++;
            }
        } else if (ch === "(" || ch === "[" || ch === "{") depth++;
        else if (ch === ")" || ch === "]" || ch === "}") depth--;
        i++;
    }
    return text.slice(openIndex + 1, i - 1);
}

/* Bundle ES des modules du jeu, importe comme un vrai module. */
function loadModules(entry, extraExports) {
    const built = buildSync({
        stdin: {
            contents:
                `export * from ${JSON.stringify(join(SRC, entry))};` +
                (extraExports ? extraExports.map((p) => `\nexport * from ${JSON.stringify(join(SRC, p))};`).join("") : ""),
            resolveDir: ROOT,
            loader: "js",
        },
        bundle: true,
        write: false,
        format: "esm",
        platform: "browser",
        target: "es2020",
        logLevel: "silent",
    });
    const url = "data:text/javascript;base64," + Buffer.from(built.outputFiles[0].text).toString("base64");
    return import(url);
}

/* ==========================================================================
   1. NAME TAGS — SCHEMA BLOXD
   ==========================================================================
   Schema officiel (ENTITY_SETTINGS.md) :
     { backgroundColor?, content?, subtitle?, subtitleBackgroundColor?,
       minLighting?, healthbar?{display,height,backgroundColour,foregroundColour},
       border?{colour,style,width,applyTo} }
   Tout ce qui n'est pas la est refuse, et le name tag entier avec. */

const NAMETAG_SCHEMA = ["backgroundColor", "content", "subtitle", "subtitleBackgroundColor", "minLighting", "healthbar", "border"];
const HEALTHBAR_SCHEMA = ["display", "height", "backgroundColour", "foregroundColour"];
const BORDER_SCHEMA = ["colour", "style", "width", "applyTo"];

function nameTagProblems(info, label) {
    const bad = [];
    if (!info || typeof info !== "object" || Array.isArray(info)) return [`${label} : pas un objet`];
    for (const key of Object.keys(info)) {
        if (NAMETAG_SCHEMA.indexOf(key) < 0) bad.push(`${label} : cle inconnue « ${key} »`);
    }
    for (const key of ["content", "subtitle"]) {
        if (!(key in info)) continue;
        const parts = info[key];
        if (!Array.isArray(parts)) { bad.push(`${label} : ${key} n'est pas un tableau`); continue; }
        for (const part of parts) {
            if (!part || typeof part !== "object") { bad.push(`${label} : ${key} contient autre chose qu'un segment`); continue; }
            if (typeof part.str !== "string") bad.push(`${label} : ${key} contient un segment sans texte`);
            /* Les icones sont reservees au chat : un name tag ne doit pas en
               contenir, sinon le moteur refuse l'objet. */
            if ("icon" in part) bad.push(`${label} : ${key} contient une icone`);
            if (part.style !== undefined && (typeof part.style !== "object" || part.style === null))
                bad.push(`${label} : ${key} a un style invalide`);
        }
    }
    if (info.healthbar !== undefined) {
        const bar = info.healthbar;
        if (!bar || typeof bar !== "object" || Array.isArray(bar)) bad.push(`${label} : healthbar invalide`);
        else {
            for (const key of Object.keys(bar)) {
                if (HEALTHBAR_SCHEMA.indexOf(key) < 0) bad.push(`${label} : healthbar.${key} inconnu`);
            }
            if ("display" in bar && ["always", "never", "onDamage"].indexOf(bar.display) < 0)
                bad.push(`${label} : healthbar.display « ${bar.display} » refuse`);
        }
    }
    if (info.border !== undefined) {
        const border = info.border;
        if (!border || typeof border !== "object" || Array.isArray(border)) bad.push(`${label} : border invalide (null interdit)`);
        else {
            for (const key of Object.keys(border)) {
                if (BORDER_SCHEMA.indexOf(key) < 0) bad.push(`${label} : border.${key} inconnu`);
            }
            if (typeof border.colour !== "string") bad.push(`${label} : border.colour manquant`);
        }
    }
    return bad;
}

const installed = await (async () => {
    installApi();
    return loadModules("core/team.js", ["utils/lifeform.js", "core/ranks.js"]);
})();

{
    const { sanitizeNameTag, nameTagInfo, applyNameTag } = installed;

    /* a) Le nettoyage jette tout ce qui n'est pas au schema. */
    const hostile = sanitizeNameTag({
        content: [{ str: undefined }, { str: "Vrai nom", style: { color: "red" } }, { icon: "fa-solid fa-skull" }],
        border: null,
        healthbar: { display: "sometimes", height: "huge", backgroundColour: "url(x)" },
        name: "cle inventee",
        fontSize: 12,
    });
    check(hostile !== null, "nameTag : un objet ou seul le texte est valide est rejete en entier");
    if (hostile) for (const problem of nameTagProblems(hostile, "nameTag nettoye")) errors.push(problem);
    if (hostile) {
        check(hostile.content.length === 1, "nameTag : les segments sans texte ou a icone sont conserves");
        check(!("border" in hostile), "nameTag : border:null est conserve");
        check(!("name" in hostile), "nameTag : une cle inventee est conservee");
        check(!("height" in (hostile.healthbar || {})), "nameTag : une hauteur invalide est conservee");
    }

    /* b) Un name tag sans contenu ni sous-titre n'est pas construit : le
          moteur refuserait l'objet (et l'entite garderait le precedent). */
    check(sanitizeNameTag({ healthbar: { display: "never" } }) === null, "nameTag : un objet sans texte est envoye quand meme");
    check(sanitizeNameTag({ content: [] }) !== null, "nameTag : content vide (vanish) doit rester possible");

    /* c) Les objets fabriques par le jeu passent le schema. */
    check(nameTagProblems(sanitizeNameTag(nameTagInfo("GARP", "the Marine Protector", "#ff0000", "#22130a", null, "700")), "boss").length === 0,
        "nameTag : le name tag d'un boss ne passe pas le schema");

    /* d) applyNameTag envoie, et n'envoie jamais un objet vide. */
    const applied = [];
    const baseApi = globalThis.api;
    globalThis.api = new Proxy(
        { setTargetedPlayerSettingForEveryone: (id, key, value) => applied.push({ id, key, value }) },
        { get: (t, k) => (k in t ? t[k] : () => undefined) },
    );
    check(applyNameTag("m1", { content: [{ str: "GARP" }] }) === true, "nameTag : applyNameTag n'envoie pas un objet valide");
    check(applyNameTag("m1", { border: { colour: "red" } }) === false, "nameTag : applyNameTag envoie un objet sans texte");
    check(applied.length === 1 && applied[0].key === "nameTagInfo", "nameTag : mauvais nom de reglage envoye");
    globalThis.api = baseApi;

    /* e) Aucun fichier ne construit un name tag a la main : tout passe par
          sanitizeNameTag / applyNameTag / nameTagInfo. */
    for (const file of FILES) {
        const name = rel(file);
        /* `utils/lifeform.js` EST le nettoyage : c'est lui qui appelle l'API. */
        if (name === "src/utils/lifeform.js") continue;
        const text = readFileSync(file, "utf8");
        const re = /(setTargetedPlayerSettingForEveryone|setOtherEntitySetting)\s*\(/g;
        let m;
        while ((m = re.exec(text))) {
            const body = callBody(text, m.index + m[0].length - 1);
            if (body.indexOf("nameTagInfo") === -1) continue;
            check(
                /sanitizeNameTag\s*\(/.test(body),
                `${name} : name tag envoye sans passer par sanitizeNameTag`,
            );
        }
    }
}

/* b bis) LE NAME TAG DU JOIN, TEL QU'IL PART VRAIMENT.
   C'est le chemin qui posait le probleme : `api.getEntityName` peut rendre
   undefined au tout premier tick, et le moteur refusait alors le name tag
   entier. On rejoue trois cas : nom normal, nom absent, equipage present. */
{
    const { updateNameTag } = installed;
    const sentTags = [];
    const baseApi = globalThis.api;
    for (const key of Object.keys(db)) delete db[key];
    db.p1 = { team: "PIRATES", "crew:name": "Straw Hats", lvl: 12 };
    db.p2 = { team: "NONE", lvl: 3 };
    const makeApi = (names) =>
        new Proxy(
            {
                now: () => Date.now(),
                log: () => {},
                getPlayerDbValue: (pid, key) => (db[pid] && key in db[pid] ? db[pid][key] : null),
                setPlayerDbValue: () => {},
                getPlayerIds: () => Object.keys(db),
                getEntityType: () => "Player",
                getEntityName: (id) => names[id],
                setTargetedPlayerSettingForEveryone: (id, key, value) => sentTags.push({ id, key, value }),
            },
            { get: (t, k) => (k in t ? t[k] : () => undefined) },
        );

    /* a) nom lisible + equipage */
    globalThis.api = makeApi({ p1: "Luffy", p2: undefined });
    sentTags.length = 0;
    updateNameTag("p1");
    check(sentTags.length === 1, "name tag : updateNameTag n'envoie rien au join");
    if (sentTags.length) {
        for (const problem of nameTagProblems(sentTags[0].value, "join")) errors.push(problem);
        const text = JSON.stringify(sentTags[0].value);
        check(text.indexOf("Luffy") >= 0, "name tag : le pseudo n'est pas dans le name tag");
        check(text.indexOf("Straw Hats") >= 0, "name tag : l'equipage n'est pas dans le name tag");
    }

    /* b) un leave dans le meme tick fait lever `getEntityName` : on ne pose
          rien, et surtout on n'envoie pas un nom vide ou bidon a la place. */
    sentTags.length = 0;
    globalThis.api = makeApi({ p1: "Luffy", p2: undefined });
    globalThis.api.getEntityName = () => {
        throw new Error("player left");
    };
    updateNameTag("p2");
    check(sentTags.length === 0, "name tag : un joueur parti au meme tick recoit quand meme un name tag");

    /* c) un nom vide ne doit pas remplacer un pseudo par un faux nom */
    sentTags.length = 0;
    globalThis.api = makeApi({ p1: "Luffy", p2: "" });
    updateNameTag("p2");
    check(sentTags.length === 0, "name tag : un nom vide est envoye au moteur");
    globalThis.api = baseApi;
}

/* ==========================================================================
   2. PRIME : ANTI-FARM ET MONTANTS
   ========================================================================== */

{
    const { handleBountyKill, getBounty, setBounty } = installed;
    const money = (pid) => Number(db[pid].money || 0) || 0;
    const reset = () => {
        for (const key of Object.keys(db)) delete db[key];
        sent.length = 0;
    };

    const player = (pid, { lvl = 1, money = 0, team = "PIRATES", bounty = 0 }) => {
        db[pid] = { lvl: lvl, money: money, team: team, bounty: bounty };
    };
    const canKill = (a, b) => { handleBountyKill(a, b); };

    /* a) 40 niveaux d'ecart : la victime ne perd RIEN, le tueur gagne ~5 %. */
    reset();
    player("big", { lvl: 120, money: 0 });
    player("small", { lvl: 20, money: 4000 });
    canKill("big", "small");
    check(money("small") === 4000, `prime : une cible trop faible a perdu ${4000 - money("small")} Coins`);
    check(getBounty("big") === 200, `prime : 5 % attendus (200), obtenu ${getBounty("big")}`);
    check(money("big") === 0, "prime : de l'argent frais a ete donne au tueur (il doit aller en prime)");

    /* b) Meme paire dans la fenetre : plus rien. */
    const before = getBounty("big");
    canKill("big", "small");
    check(getBounty("big") === before, "prime : la meme paire repaie dans la fenetre");

    /* c) 39 niveaux d'ecart : vol normal (10 %, plafond 1000). */
    reset();
    player("k", { lvl: 60, money: 0 });
    player("v", { lvl: 21, money: 4000 });
    canKill("k", "v");
    check(money("k") === 400, `prime : vol attendu 400 (10 % de 4000), obtenu ${money("k")}`);
    check(money("v") === 3600, `prime : la victime devait perdre 400, perdu ${4000 - money("v")}`);

    /* d) Le plafond de vol tient bon. */
    reset();
    player("k2", { lvl: 60, money: 0 });
    player("v2", { lvl: 55, money: 500000 });
    canKill("k2", "v2");
    check(money("k2") === 1000, `prime : plafond de vol 1000 attendu, obtenu ${money("k2")}`);

    /* e) Un Marine encaisse la prime, plafonne, et une seule fois par paire. */
    reset();
    player("marine", { lvl: 80, team: "MARINES", money: 0 });
    player("pirate", { lvl: 80, team: "PIRATES", money: 0, bounty: 50000 });
    canKill("marine", "pirate");
    check(money("marine") === 10000, `prime : encaissement plafonne 10000 attendu, obtenu ${money("marine")}`);
    check(getBounty("pirate") === 0, "prime : la prime du pirate devrait repartir a 0");
    const collected = money("marine");
    setBounty("pirate", 50000);
    canKill("marine", "pirate");
    check(money("marine") === collected, "prime : la meme paire de marine encaisse deux fois");

    /* f) Marine contre Marine : rien du tout. */
    reset();
    player("m1", { lvl: 50, team: "MARINES", money: 1000 });
    player("m2", { lvl: 50, team: "MARINES", money: 1000, bounty: 500 });
    canKill("m1", "m2");
    check(money("m1") === 1000 && getBounty("m2") === 500, "prime : un marine a gagne quelque chose sur un marine");

    /* g) Le tueur ne peut pas etre sa propre victime. */
    reset();
    player("self", { lvl: 50, money: 1000, bounty: 0 });
    canKill("self", "self");
    check(money("self") === 1000, "prime : un joueur s'est tue lui-meme pour de l'argent");
}

/* ==========================================================================
   3. CHAT : LECTURE SEULE POUR LE STAFF
   ========================================================================== */

{
    const { handleChat } = installed;
    for (const key of Object.keys(db)) delete db[key];
    sent.length = 0;

    /* p1 = OWNER (lit tout), p2 = pirate dans un equipage, p3 = marine. */
    db.p1 = { lvl: 50, team: "PIRATES" };
    db.p2 = { lvl: 50, team: "PIRATES", "crew:name": "Straw Hats", "crew:role": "CAPTAIN" };
    db.p3 = { lvl: 50, team: "MARINES", "crew:name": "Marines Elite", "crew:role": "CAPTAIN" };

    const officials = { p1: "K4miNoK4mi", p2: "Pirate", p3: "Marine" };
    const chatChannels = [];
    globalThis.api = new Proxy(
        {
            now: () => Date.now(),
            log: () => {},
            sendMessage: (pid, msg) => sent.push({ pid, msg }),
            broadcastMessage: (msg) => sent.push({ pid: "*", msg }),
            getPlayerDbValue: (pid, key) => (db[pid] && key in db[pid] ? db[pid][key] : null),
            setPlayerDbValue: (pid, key, value) => {
                db[pid] = db[pid] || {};
                db[pid][key] = value;
            },
            getPlayerIds: () => Object.keys(db),
            getEntityType: () => "Player",
            getEntityName: (id) => officials[id] || String(id),
            setClientOption: (pid, option, value) => {
                if (option === "chatChannels") chatChannels.push({ pid, channels: value });
            },
        },
        { get: (t, k) => (k in t ? t[k] : () => undefined) },
    );

    const textOf = (msg) => (Array.isArray(msg) ? msg.map((s) => (s && s.str) || "").join("") : String(msg || ""));

    /* a) Un equipier parle a son equipage : seuls les membres le recoivent. */
    sent.length = 0;
    handleChat("p2", "all hands on deck", "CREW");
    const toP2 = sent.filter((e) => e.pid === "p2");
    const toP3 = sent.filter((e) => e.pid === "p3");
    check(toP2.length >= 1 && /all hands on deck/.test(textOf(toP2[0].msg)), "chat : un equipier ne recoit pas son propre message d'equipage");
    check(toP3.length === 0, "chat : un message d'equipage est parti vers un autre equipage");

    /* b) Le staff recoit une COPIE (prefixee par le canal). */
    const copy = sent.filter((e) => e.pid === "p1");
    check(copy.length === 1, `chat : le staff recoit ${copy.length} copie(s) au lieu d'une`);
    if (copy.length) check(/\[Crew Straw Hats\]/.test(textOf(copy[0].msg)), "chat : la copie du staff n'indique pas le canal");

    /* c) Le staff n'ecrit PAS dans un equipage dont il n'est pas membre. */
    sent.length = 0;
    handleChat("p1", "obey me", "CREW");
    const leaked = sent.filter((e) => /obey me/.test(textOf(e.msg)));
    check(leaked.length === 0, "chat : le staff a ecrit dans un equipage dont il n'est pas membre");
    const refusal = sent.filter((e) => e.pid === "p1").map((e) => textOf(e.msg)).join(" ");
    check(/read-only/i.test(refusal), "chat : le refus d'ecriture en equipage n'est pas explique au staff");

    /* d) Un canal inconnu ne fait jamais tomber le message dans le global. */
    sent.length = 0;
    handleChat("p2", "channel test", "SOMETHING_ELSE");
    const globalLeak = sent.filter((e) => e.pid === "p3");
    check(globalLeak.length === 0, "chat : un canal inconnu est retombe dans le global");

    /* e) Les boutons de canal gardent leurs couleurs : le Global retrouve le
          bleu fonce d'origine (#2671d7), pas le bleu clair de la palette
          (MARINE), et l'equipage garde la sienne. Un canal ajoute a la main
          sans couleur s'affiche gris : on verifie ce que le client recoit. */
    chatChannels.length = 0;
    installed.setupChatChannels("p2");
    const sentChannels = chatChannels.length ? chatChannels[chatChannels.length - 1].channels : [];
    const globalBtn = sentChannels.find((c) => c.channelName === installed.CHAT_CHANNEL.GLOBAL);
    const crewBtn = sentChannels.find((c) => c.channelName === installed.CHAT_CHANNEL.CREW);
    check(!!globalBtn, "chat : le bouton du canal Global n'est pas envoye au client");
    if (globalBtn) check(globalBtn.elementBgColor === "#2671d7", `chat : le canal Global n'est plus en bleu fonce (#2671d7) mais en ${globalBtn.elementBgColor}`);
    check(!!crewBtn, "chat : le bouton du canal Equipage manque pour un joueur en equipage");
    if (crewBtn) check(String(crewBtn.elementBgColor).toLowerCase() !== "#2671d7", "chat : l'equipage a herite du bleu du Global");
}

/* ==========================================================================
   4. BOSS : AUCUN CROWD CONTROL
   ==========================================================================
   Meme regle que le dome, mais pour TOUTES les capacites : la garde vit dans
   utils/combat.js (`setBossGuard`), donc un fruit, une arme ou une invocation
   ne peut ni ralentir, ni affaiblir, ni deplacer un boss. On rejoue les deux
   chemins avec le vrai module. */

{
    const combat = await (async () => {
        const built = buildSync({
            stdin: { contents: `export * from ${JSON.stringify(join(SRC, "utils/combat.js"))};`, resolveDir: ROOT, loader: "js" },
            bundle: true, write: false, format: "esm", platform: "browser", target: "es2020", logLevel: "silent",
        });
        return import("data:text/javascript;base64," + Buffer.from(built.outputFiles[0].text).toString("base64"));
    })();

    const BOSS = "mBoss";
    const mob = "mPlain";
    const effects = [];
    const positions = [];
    globalThis.api = new Proxy(
        {
            now: () => Date.now(),
            log: () => {},
            getPlayerDbValue: () => null,
            setPlayerDbValue: () => true,
            getPlayerIds: () => [],
            getMobIds: () => [BOSS, mob],
            isAlive: () => true,
            getEntityType: (id) => (id === BOSS || id === mob ? "Mob" : "Player"),
            getEntityName: (id) => id,
            getHealth: () => 100,
            getPosition: () => [0, 64, 0],
            applyEffect: (id, name) => effects.push({ id, name }),
            setPosition: (id, x, y, z) => positions.push({ id, x, y, z }),
        },
        { get: (t, k) => (k in t ? t[k] : () => undefined) },
    );

    combat.setBossGuard((id) => id === BOSS);

    /* a) Un effet de controle est refuse sur le boss, accepte sur un mob. */
    effects.length = 0;
    check(combat.eff(BOSS, "Slowness", 1600, { inbuiltLevel: 1 }) === false, "boss : Slowness est applique a un boss");
    check(combat.eff(BOSS, "Weakness", 1600, { inbuiltLevel: 1 }) === false, "boss : Weakness est applique a un boss");
    combat.eff(mob, "Slowness", 1600, { inbuiltLevel: 1 });
    check(effects.filter((e) => e.id === BOSS).length === 0, "boss : un effet de controle est passe");
    check(effects.filter((e) => e.id === mob).length === 1, "boss : les mobs ordinaires ne sont plus ralentis");

    /* b) Ses buffs passent : seul le controle est bloque. */
    effects.length = 0;
    combat.eff(BOSS, "Speed", 4000, { inbuiltLevel: 2 });
    check(effects.some((e) => e.id === BOSS && e.name === "Speed"), "boss : le boss ne peut plus recevoir ses propres buffs");

    /* c) Une capacite ne peut pas le deplacer (Control Domain, Shambles...). */
    positions.length = 0;
    combat.teleport(BOSS, 10, 70, 10);
    check(positions.length === 0, "boss : une capacite a deplace un boss");
    combat.teleport(mob, 10, 70, 10);
    check(positions.filter((p) => p.id === mob).length === 1, "boss : les mobs ordinaires ne sont plus deplacables");

    /* d) Le boss qui se deplace lui-meme n'est pas bloque. */
    positions.length = 0;
    combat.withEffectSource(BOSS, "bossrush", () => combat.teleport(BOSS, 5, 65, 5));
    check(positions.some((p) => p.id === BOSS), "boss : le boss ne peut plus se deplacer lui-meme");

    combat.setBossGuard(null);
}

/* ==========================================================================
   5. ZERO EMOJI
   ==========================================================================
   Le chat affiche un carre vide pour un emoji. Seuls les signes
   typographiques (cadres de commentaires, « ● », « ✦ », fleches) sont
   autorises : ils s'affichent partout et font partie de la mise en page. */

{
    const EMOJI = /\p{Extended_Pictographic}|[\u{1F000}-\u{1FAFF}]|\uFE0F/u;
    for (const file of FILES) {
        const name = rel(file);
        let text = readFileSync(file, "utf8");
        if (name === "src/core/theme.js") {
            const start = text.indexOf("export const ICON = {");
            if (start >= 0) text = text.slice(0, start) + text.slice(text.indexOf("};", start) + 2);
        }
        const lines = text.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
            const m = EMOJI.exec(lines[i]);
            if (m) errors.push(`${name}:${i + 1} : emoji « ${m[0]} » (utiliser une icone Bloxd)`);
        }
    }
}

/* ==========================================================================
   6. ITEM DE DASH
   ==========================================================================
   Le dash mobile passe par un item tenu en main. Cet item doit etre une
   MATIERE : « Snowdash » propulsait le joueur de lui-meme, et ce dash-la ne
   peut pas etre annule sur mobile — le joueur partait deux fois, ou partait
   sans payer de stamina. On verifie donc le nom retenu, le fait qu'un ancien
   nom soit ignore, et le balayage des anciens items au join. */

{
    /* data.js est charge DANS LE MEME bundle : isMobilePlayer doit etre la meme
       instance que celle que stamina interroge (deux bundles = deux memoires). */
    const stamina = await loadModules("gameplay/stamina.js", ["utils/data.js"]);

    check(stamina.DASH_ITEM === "Moonstone Dust", `item de dash : « ${stamina.DASH_ITEM} » au lieu de « Moonstone Dust »`);
    check(stamina.DASH_ITEM !== "Snowdash", "item de dash : « Snowdash » est revenu (item qui se deplace tout seul)");

    /* Le clic ne reconnait QUE l'item de dash. */
    check(stamina.handleDashItemClick("pDash", "Snowdash") === false, "item de dash : l'ancien item declenche encore un dash");
    check(stamina.handleDashItemClick("pDash", "Moonstone Dust") === true, "item de dash : le clic sur l'item ne declenche pas le dash");

    /* L'item est a usage unique : aucun balayage des anciens items au join.
       Un « Snowdash » residuel ne declenche plus rien (verifie dessus) et ne
       coute donc rien de plus qu'un slot que le joueur peut jeter. */
    check(typeof stamina.dropLegacyDashItem === "undefined", "item de dash : le balayage des anciens items est de retour");

    /* ── LE DASH MOBILE N'A PLUS D'ITEM A TENIR (demande 90) ───────────────
       Sortir « Moonstone Dust » pour dasher obligeait a le tenir en main : le
       slot etait perdu, et le tap qui sert a parler aux PNJ partait en dash.
       Le dash mobile passe donc par un BOUTON tactile, qui ne depend pas de ce
       que le joueur a en main. On verifie l'option posee, son retrait sur PC,
       et le fait qu'un releachement ne dashe pas. */
    {
        const options = [];
        let impulses = 0;
        installApi({
            isMobile: (id) => id === "pMob",
            setClientOption: (id, key, value) => options.push({ id, key, value }),
            getPlayerFacingInfo: () => ({ dir: [0, 0, 1] }),
            applyImpulse: () => { impulses++; },
            getPlayerIds: () => ["pMob", "pPc"],
        });
        stamina.setDevice("pMob", true);
        stamina.setDevice("pPc", false);

        options.length = 0;
        check(stamina.setupDashButton("pMob") === true, "dash mobile : le bouton tactile n'est pas pose sur mobile");
        check(
            options.some((o) => o.id === "pMob" && o.key === "touchscreenActionButton" && o.value),
            "dash mobile : le client option touchscreenActionButton n'est pas rempli",
        );
        options.length = 0;
        check(stamina.setupDashButton("pPc") === false, "dash mobile : un joueur PC recoit le bouton tactile");
        check(
            options.some((o) => o.id === "pPc" && o.key === "touchscreenActionButton" && o.value === null),
            "dash mobile : le bouton tactile n'est pas retire sur PC",
        );

        stamina.staminaJoin("pMob");
        impulses = 0;
        check(stamina.handleDashButton("pMob", false) === false, "dash mobile : le relachement du bouton est traite comme un appui");
        check(impulses === 0, `dash mobile : ${impulses} dash(s) au relachement du bouton`);
        stamina.handleDashButton("pMob", true);
        check(impulses === 1, "dash mobile : l'appui sur le bouton tactile ne dashe pas");
        stamina.handleDashButton("pMob", true);
        check(impulses === 1, `dash mobile : ${impulses} dash(s) pour un seul appui (anti-repetition)`);
        check(stamina.handleDashButton("pPc", true) === false, "dash mobile : le bouton tactile dashe aussi sur PC");
        check(impulses === 1, "dash mobile : un appui sur PC a consomme de la stamina");
        stamina.staminaLeave("pMob");
    }

    /* ── AUCUN LOG QUAND UN JOUEUR PART ────────────────────────────────────
       Un depart au milieu d'un tick fait lever les fonctions de l'API
       (setClientOptions sur un joueur deconnecte, sidebar d'un joueur qui n'a
       plus de session...). C'est normal : la stamina ne doit RIEN ecrire dans
       la console pour autant. On compte les api.log. */
    {
        const logs = [];
        let live = ["pLive"];
        installApi({
            log: (msg) => logs.push(String(msg)),
            getPlayerIds: () => live.slice(),
            getInventoryItemAmount: () => 1,
            setClientOptions: () => {
                /* Le moteur refuse un joueur qui n'est plus la. */
                throw new Error("player not found");
            },
        });
        stamina.setStaminaUpdateHook(() => {
            throw new Error("sidebar: no such player");
        });

        stamina.staminaJoin("pLive");
        stamina.trySpendStamina("pLive", 13);
        stamina.tickStamina();

        /* Maintenant il part : plus personne dans la liste du moteur, mais son
           etat est encore la le temps d'un tick. */
        live = [];
        stamina.trySpendStamina("pLive", 13);
        stamina.tickStamina();
        stamina.staminaLeave("pLive");

        check(logs.length === 0, `stamina : ${logs.length} log(s) pendant un depart (${logs[0] || ""})`);
        stamina.setStaminaUpdateHook(null);
    }

    /* ── LA PORTE DES AIR-JUMPS N'EST ENVOYEE QUE SI ELLE CHANGE ───────────
       C'etait l'appel le plus frequent du jeu (a chaque changement de
       stamina) : sans cache, une seule erreur de l'API se repetait sans fin. */
    {
        const calls = [];
        installApi({
            getPlayerIds: () => ["pGate"],
            setClientOptions: (pid, opts) => calls.push(opts.airJumpCount),
        });
        stamina.staminaJoin("pGate");
        check(calls.length === 1, `stamina : ${calls.length} envoi(s) de airJumpCount au join au lieu de 1`);
        stamina.trySpendStamina("pGate", 13);
        check(calls.length === 1, "stamina : airJumpCount renvoye alors qu'il n'a pas change");
        stamina.staminaLeave("pGate");
    }
}

/* ==========================================================================
   7. AUCUN PSEUDO DANS LA LOGIQUE
   ==========================================================================
   Les noms de la table STAFF ne doivent apparaitre que dans core/ranks.js.
   Ailleurs, une decision se prend sur le RANG (isOwner, hasPermission…), jamais
   sur un pseudo : sinon retirer un admin demande de modifier du code de jeu. */

{
    const ranksSrc = readFileSync(join(SRC, "core/ranks.js"), "utf8");
    const table = ranksSrc.slice(ranksSrc.indexOf("export const STAFF = {"));
    const names = [];
    for (const m of table.matchAll(/"([^"]+)"\s*:\s*"[A-Z]+"/g)) names.push(m[1]);
    check(names.length > 0, "aucun pseudo lu dans la table STAFF");

    for (const file of FILES) {
        const name = rel(file);
        if (name === "src/core/ranks.js") continue;
        const text = readFileSync(file, "utf8");
        for (const pseudo of names) {
            const at = text.indexOf('"' + pseudo + '"');
            if (at >= 0) errors.push(`${name} : pseudo « ${pseudo} » en dur (utiliser le rang)`);
        }
    }
}

/* ==========================================================================
   8. ANCIENNE UI : LES ITEMS D'ILE DU PANNEAU SETTINGS
   ==========================================================================
   Le panneau a deja eu un item par ile ("isle_ju", "isle_pv"...). Ces items
   ne sont plus crees, mais un client qui les a encore en boutique doit pouvoir
   cliquer dessus. On rejoue le vrai handleSettingsShop : le clic bascule l'ile,
   exactement comme les items actuels. */

{
    const ui = await loadModules("core/UI.js");
    const baseApi = globalThis.api;
    const db = {};
    installApi({
        getPlayerDbValue: (pid, key) => (db[pid] && key in db[pid] ? db[pid][key] : null),
        setPlayerDbValue: (pid, key, value) => { db[pid] = db[pid] || {}; db[pid][key] = value; },
        getPlayerIds: () => ["pUI"],
        getEntityName: () => "Tester",
        getVariation: () => "sea1",
        matchmakeToVariation: () => {},
        clearDirectionArrow: () => {},
        setDirectionArrow: () => {},
        createShopItemForPlayer: () => {},
        updateShopItemForPlayer: () => {},
        configureShopCategoryForPlayer: () => {},
    });

    const arrowOff = () => ((db.pUI && db.pUI.arrowOff) || "");

    /* 1. Un item d'ile de l'ancien format masque l'ile... */
    const first = ui.handleSettingsShop("pUI", "settings", "isle_ju", null, null);
    check(first === true, "ancienne UI : le clic sur un item d'ile n'est plus reconnu");
    check(arrowOff() === "JU", `ancienne UI : la flèche n'a pas basculé (arrowOff = « ${arrowOff()} »)`);

    /* 2. ... et le clic suivant la remontre. */
    ui.handleSettingsShop("pUI", "settings", "isle_ju", null, null);
    check(!arrowOff(), "ancienne UI : le second clic ne remet pas la flèche");

    /* 3. Une cle inconnue reste, elle, sans effet. */
    const before = arrowOff();
    const junk = ui.handleSettingsShop("pUI", "settings", "isle_zz", null, null);
    check(junk === false && arrowOff() === before, "ancienne UI : une ile inconnue est acceptee");

    globalThis.api = baseApi;
}

/* ==========================================================================
   9. LES TEINTES DE LA SIDEBAR D'AVANT
   ==========================================================================
   La sidebar a retrouve ses couleurs d'origine (demande 88). Deux d'entre elles
   sont hors palette — le cyan #00BFFF du titre et de la quete, l'orange #FF8C00
   du niveau — et le passage a la palette les ramenait sur MARINE / DANGER :
   l'interface se recolorait toute seule, sans qu'aucune ligne de UI.js ne
   change. On verifie donc le RESULTAT de themeColor(), pas la constante. */

{
    const theme = await loadModules("core/theme.js");
    check(theme.themeColor("#00BFFF") === "#00BFFF", `sidebar : le cyan du titre derive vers ${theme.themeColor("#00BFFF")}`);
    check(theme.themeColor("#FF8C00") === "#FF8C00", `sidebar : l'orange du niveau derive vers ${theme.themeColor("#FF8C00")}`);
    /* Et la palette continue de faire son travail partout ailleurs. */
    check(theme.themeColor("#ff4444") === theme.C.DANGER, "palette : un rouge de danger n'est plus ramene sur DANGER");
    check(theme.themeColor("#00ffff") === theme.C.XP, "palette : un cyan n'est plus ramene sur XP");
}

/* ==========================================================================
   10. PNJ SOUS LE DOIGT (MOBILE)
   ==========================================================================
   Un ecran tactile n'a pas de visee d'entite : onPlayerClick arrive avec un
   `targetEId` NUL, et le clic ne trouvait donc aucun PNJ — les recruteurs ne
   repondaient pas sur mobile (demande 90). npcNearPoint retrouve le PNJ le
   plus proche du point touche. On verifie qu'il trouve bien un PNJ, qu'il
   ignore tout ce qui n'est pas un PNJ et qu'il ne prend pas une cible
   lointaine. */

{
    const npcs = await loadModules("gameplay/NPCs.js");
    const NEAR = { npc1: [10.5, 65, 10.5], npc2: [13, 65, 10], mob1: [10.5, 65, 10.5], far: [90, 65, 90] };
    const isNPC = (id) => id === "npc1" || id === "npc2";
    installApi({
        getEntitiesInRect: (min, max) => Object.keys(NEAR).filter((id) => {
            const p = NEAR[id];
            return p[0] >= min[0] && p[0] <= max[0] && p[1] >= min[1] && p[1] <= max[1] && p[2] >= min[2] && p[2] <= max[2];
        }),
        getEntityType: (id) => (isNPC(id) ? "NPC" : "Mob"),
        getPosition: (id) => NEAR[id] || null,
    });

    check(npcs.npcNearPoint(10, 65, 10) === "npc1", "mobile : le PNJ sous le doigt n'est pas trouve");
    /* Un mob au meme endroit ne doit jamais etre pris pour un PNJ. */
    check(npcs.npcNearPoint(10, 65, 10) !== "mob1", "mobile : un mob ordinaire est pris pour un PNJ");
    /* Loin de tout : aucune cible inventee. */
    check(npcs.npcNearPoint(200, 65, 200) === null, "mobile : un PNJ est trouve a 200 blocs du doigt");
    /* Point de clic invalide : on ne devine pas. */
    check(npcs.npcNearPoint(null, null, null) === null, "mobile : un clic sans position trouve quand meme un PNJ");
}

/* ==========================================================================
   11. CHANGEMENT DE TEAM : QUETE DE LA NOUVELLE TEAM, KILLS CONSERVES
   ==========================================================================
   Chez un recruteur, la quete suit la nouvelle team : meme quete (donc meme
   palier, donc meme niveau), mais la cible et le marqueur sont ceux de la
   nouvelle team, et la progression deja faite est CONSERVEE (demande 90).
   Sans quete en cours, on n'en lance pas une a la place du joueur. */

{
    /* UI en tete du bundle : c'est l'ordre d'initialisation de Bloxd (UI lit la
       table des quetes au chargement). L'inverse laisse `quests` undefined. */
    const quest = await loadModules("core/UI.js", ["gameplay/quest.js", "utils/data.js"]);
    installApi({});

    db.pQuest = { lvl: 5, team: "PIRATES", questId: "starter1", questProgress: 4 };
    check(quest.refreshQuestTeam("pQuest") === true, "team : la quete n'est pas remappee au changement de team");
    check(
        quest.playerQuest.pQuest && quest.playerQuest.pQuest.targetMob[0] === "Pirate 1",
        "team : la cible de la quete n'est pas celle des pirates",
    );

    /* Le joueur devient marine : la cible et le marqueur changent... */
    db.pQuest.team = "MARINES";
    check(quest.refreshQuestTeam("pQuest") === true, "team : la quete ne suit pas le passage chez les marines");
    check(
        quest.playerQuest.pQuest && quest.playerQuest.pQuest.targetMob[0] === "Marine 1",
        `team : la cible de la quete est restee « ${quest.playerQuest.pQuest && quest.playerQuest.pQuest.targetMob[0]} »`,
    );
    check(
        JSON.stringify(quest.playerQuest.pQuest.position) === JSON.stringify([1054.5, -912, -294.5]),
        "team : le marqueur de la quete n'est pas celui des marines",
    );
    /* ...mais les kills deja faits restent acquis. */
    check(quest.questProgress.pQuest === 4, `team : la progression est passee de 4 a ${quest.questProgress.pQuest}`);
    check(db.pQuest.questProgress === 4, `team : la progression sauvegardee est passee a ${db.pQuest.questProgress}`);
    check(db.pQuest.questId === "starter1", `team : la quete a change d'identifiant (${db.pQuest.questId})`);

    /* Aucune quete en cours : rien n'est lance d'office. */
    db.pNoQuest = { lvl: 5, team: "PIRATES" };
    check(quest.refreshQuestTeam("pNoQuest") === false, "team : une quete est lancee alors que le joueur n'en avait pas");
    check(db.pNoQuest.questId === undefined, "team : une quete a ete ecrite en base sans que le joueur en demande une");
}

/* ==========================================================================
   12. MACHINE A FRUITS : L'ARGENT D'ABORD, LE FRUIT ENSUITE
   ==========================================================================
   Le joueur s'est plaint de tirages ou le PNJ « ne prend pas l'argent »
   (demande 90). On rejoue donc des tirages COMPLETS, minuteur compris, avec
   une api simulee qui compte les items donnes :
     a) un tirage encaisse EXACTEMENT le prix affiche, puis donne le fruit ;
     b) un sac plein (giveItem echoue) rembourse integralement : jamais de
        fruit gratuit, jamais d'argent perdu ;
     c) deux clics pendant l'animation ne font pas deux tirages ;
     d) apres un tirage, la machine n'est pas bloquee (on peut relancer).
   ========================================================================== */

{
    const inv = {};
    const given = [];
    let giveAmount = 1;
    installApi({
        getInventoryItemAmount: (pid, name) => (inv[pid] && inv[pid][name]) || 0,
        giveItem: (pid, name, amount) => {
            given.push({ pid, name, amount });
            if (giveAmount < 1) return giveAmount;
            inv[pid] = inv[pid] || {};
            inv[pid][name] = (inv[pid][name] || 0) + amount;
            return amount;
        },
    });
    const fruit = await loadModules("fruit/index.js", ["utils/timer.js", "utils/data.js"]);
    const run = (steps) => { for (let i = 0; i < steps; i++) fruit.step(); };
    const price = fruit.fruitRollPrice(12, 0);

    /* a) Un tirage : premier clic = annonce, second clic = tirage. */
    db.pFruit = { money: 10000, lvl: 12, team: "PIRATES" };
    check(fruit.rollFruit("pFruit", 1) === null, "machine a fruits : le premier clic lance le tirage sans confirmation");
    fruit.rollFruit("pFruit", 1);
    run(400);
    check(
        db.pFruit.money === 10000 - price,
        `machine a fruits : solde ${db.pFruit.money} au lieu de ${10000 - price} apres un tirage a ${price}`,
    );
    check(
        given.length === 1 && given[0].pid === "pFruit" && given[0].amount === 1,
        "machine a fruits : l'argent est encaisse mais le fruit n'est pas donne",
    );

    /* c) Deux clics de plus pendant l'animation : un seul tirage. */
    db.pFruit.money = 10000;
    fruit.rollFruit("pFruit", 1);
    fruit.rollFruit("pFruit", 1);
    const paidAfterStart = db.pFruit.money;
    given.length = 0;
    fruit.rollFruit("pFruit", 1);
    fruit.rollFruit("pFruit", 1);
    run(400);
    check(
        db.pFruit.money === paidAfterStart - price,
        `machine a fruits : ${paidAfterStart - db.pFruit.money} car. debites pour un seul tirage (${price} attendus)`,
    );
    check(given.length === 1, `machine a fruits : ${given.length} fruit(s) donnes pour un seul tirage`);

    /* d) La machine n'est pas bloquee apres un tirage : on peut relancer. */
    fruit.rollFruit("pFruit", 1);
    const restarted = fruit.rollFruit("pFruit", 1);
    check(typeof restarted === "string", "machine a fruits : impossible de relancer apres un tirage");
    run(400);

    /* b) Sac plein : giveItem ne donne rien -> remboursement integral. */
    giveAmount = 0;
    db.pFruitFull = { money: 5000, lvl: 12, team: "PIRATES" };
    fruit.rollFruit("pFruitFull", 1);
    fruit.rollFruit("pFruitFull", 1);
    run(400);
    check(
        db.pFruitFull.money === 5000,
        `machine a fruits : sac plein, le joueur a perdu ${5000 - db.pFruitFull.money} car. sans fruit`,
    );
}

/* ==========================================================================
   BILAN
   ========================================================================== */

if (errors.length) {
    console.error(`Regles du jeu (${errors.length} probleme(s)) :`);
    for (const e of errors.slice(0, 40)) console.error("  - " + e);
    if (errors.length > 40) console.error(`  … et ${errors.length - 40} autre(s)`);
    process.exit(1);
}
console.log(
    `Regles : ${checked} verifications (name tags, prime anti-farm, chat lecture seule, boss sans CC, zero emoji, item de dash, aucun pseudo en dur, ancienne UI, chat Global en bleu fonce, PNJ sous le doigt, quete au changement de team, machine a fruits payee avant remise).`,
);
