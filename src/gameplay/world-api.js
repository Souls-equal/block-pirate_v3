// gameplay/world-api.js
//
// PONT VERS LES CODE BLOCKS
//
// En Bloxd, une fonction n'est visible depuis un autre Code Block que si elle
// est ecrite SANS declaration (affectation globale) :
//
//     launch = (playerId) => {}      // utilisable dans les autres Code Blocks
//     export function launch() {}    // exportee (module)
//     function launch() {}           // privee a ce fichier
//
// variations.js est un module : ses fonctions y sont locales, donc invisibles
// depuis un Code Block. On les recopie ici sous leur nom GLOBAL, sans
// declaration, pour que tes Code Blocks puissent simplement appeler :
//
//     launch(playerId);                 // couloir -> hub
//     chooseTeam(playerId, "PIRATES");  // hub -> mer
//     continueJourney(playerId);        // hub -> sa mer, a sa position
//     enterSea(playerId, 2);            // aller dans la mer 2
//
// IMPORTANT : ne jamais ecrire `const launch = ...` ni `function launch() {}`
// ici : le nom redeviendrait prive a ce fichier et le Code Block ne le verrait
// plus. C'est exactement le piege que ce fichier sert a eviter.

import {
    launch as bpLaunch,
    chooseTeam as bpChooseTeam,
    continueJourney as bpContinue,
    enterSea as bpEnterSea,
} from "./variations";

launch = (playerId) => bpLaunch(playerId);

chooseTeam = (playerId, teamId) => bpChooseTeam(playerId, teamId);

continueJourney = (playerId) => bpContinue(playerId);

enterSea = (playerId, seaNumber) => bpEnterSea(playerId, seaNumber);
