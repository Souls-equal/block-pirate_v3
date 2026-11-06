// gameplay/saber/index.js
/* ══════════════════════════════════════════════════════════════════════════
   LA SABER QUEST — la derniere grande quete de la Sea 1.

   Un dossier, huit fichiers, chacun avec un seul sujet :

     config.js   les constantes : items, points du monde, etapes, cle "s"
     kit.js      les outils : distances, inventaire, messages, telegraphies
     state.js    l'etape : relue en base, ecrite a chaque palier
     arrows.js   les fleches (Secret Island, structure qu'on vient d'ouvrir)
     world.js    ce que le joueur touche : porte, rideau, eau, mur, 3 PNJ
     leader.js   le Mob Leader (niveau 200) et son Gold Grit
     expert.js   le Saber Expert (niveau 200) et ses neuf attaques
     index.js    ce fichier : le join, le leave, les morts, la fermeture

   DEROULEMENT (l'etape est un seul nombre en base, cle "s")

     0  rien
     1  JUNGLE   les cinq boutons caches sont tous presses : la porte
                [1329,-915,318] + [1329,-914,318] s'ouvre. Derriere, une
                Torch (donnee par un Code Block) qui ne peut pas etre lachee.
     2  DESERT   avec la Torch, le rideau [612,-904/-902,1760/1762] brule :
                le passage s'ouvre ET la Torch est retiree. Derriere, une Cup
                (item Bucket, donnee par un Code Block).
     3  EAU      cliquer l'eau [2534,-897,449] remplit la Cup.
     4  OLD MAN  sans eau "I'm so thirsty...", avec l'eau il remercie et
                envoie vers son fils.
     5  RICH MAN il donne l'objectif (Mob Leader) et pose une fleche vers
                Secret Island.
     6  MOB LEADER  mob de niveau 200, lance par un Code Block avec
                spawnMobLeader(x, y, z) ; a sa mort il lache un "Gold Grit".
     7  RICH MAN il reprend l'or et donne la relique "Magmaward Fuel".
     8  MUR      avec la relique, cliquer le mur [1318..1320,-911..909,321]
                teleporte derriere, dans la salle de Shanks.
     9  SHANKS   parler au PNJ lance le duel du SABER EXPERT. Le vaincre
                termine la quete.

   Ce fichier ne contient plus QUE le cycle de vie du joueur et la repartition
   des morts : chaque boss traite sa propre mort (killLeader / killSaber), donc
   ajouter un troisieme boss ne touche pas au reste.
   ══════════════════════════════════════════════════════════════════════════ */

import { C } from "../../core/theme";
import { deleteStat } from "../../utils/data";
import { at as soundAt } from "../../utils/fx";
import { DB_BUTTONS_OLD, DB_STEP_OLD, S } from "./config";
import { armSecretArrow, clearSecretArrow, clearStructArrow } from "./arrows";
import { despawnIfAlive, tell } from "./kit";
import { parkQuest, resumeQuest, stepOf } from "./state";
import { closeStruct, startHousekeeping, stopHousekeeping } from "./world";
import { endSaberFight, killSaber, saberFighter, saberMobId, stopSaber } from "./expert";
import { killLeader, leaderMobId, stopLeader } from "./leader";

/* Branche dans onPlayerKilledMob : renvoie true si le mob etait a nous.
   L'ordre n'a pas d'importance (les deux tests sont des comparaisons d'id). */
export function saberKilledMob(playerId, mobId) {
    if (!mobId) return false;
    if (killLeader(playerId, mobId)) return true;
    if (killSaber(mobId)) return true;
    return false;
}

/* Branche dans onWorldAttemptDespawnMob : nos boss ne doivent pas etre
   nettoyes par le monde au milieu d'un combat. */
export function saberPreventDespawn(mobId) {
    if (!mobId) return null;
    if (saberMobId() === mobId) return "preventDespawn";
    if (leaderMobId() === mobId) return "preventDespawn";
    return null;
}

export function saberJoin(playerId) {
    if (!playerId) return false;
    startHousekeeping();
    /* Les deux cles des versions precedentes sont effacees : `sq` (etape) et
       `sqB` (plaques) ne servent plus a rien, tout tient maintenant dans `s`. */
    try { deleteStat(playerId, DB_STEP_OLD); } catch (e) {}
    try { deleteStat(playerId, DB_BUTTONS_OLD); } catch (e) {}

    resumeQuest(playerId);

    /* La fleche de quete suit l'etape : elle pointe Secret Island tant que la
       chasse est en cours, et disparait des que le joueur a l'or (il doit
       revenir au Rich Man) ou la relique. */
    if (stepOf(playerId) === S.HUNT) armSecretArrow(playerId);
    else clearSecretArrow(playerId);
    return true;
}

export function saberLeave(playerId) {
    if (!playerId) return false;
    clearSecretArrow(playerId);
    clearStructArrow(playerId, "door");
    clearStructArrow(playerId, "curtain");
    /* Le duel appartient a un joueur : s'il part, on range l'arene. */
    if (saberFighter() === playerId) endSaberFight(null);
    parkQuest(playerId);
    return true;
}

/* Fermeture du monde : on range tout ce qui tourne encore, et on remet les
   deux structures dans leur etat d'origine. */
export function saberClose() {
    stopSaber();
    stopLeader();
    stopHousekeeping();
    closeStruct("door");
    closeStruct("curtain");
    return true;
}
