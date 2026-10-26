# code-blocks/ — blocs de fruits du monde

Chaque fichier correspond à **un Code Block** du monde, à coller tel quel
(« 1 fruit = 1 Code Block »). Le nom de fichier encode la coordonnée Z du bloc :
`z<z>-<fruit>.js`.

## Comment le moteur lit ces blocs

D'après le chargeur (`src/fruit/func-abilities.js`), les blocs sont lus aux positions :

- `x = 100000`, `y = 100000`
- `z = 100002 + 2 × i` (`i` = index du bloc, 0 → 100002, 1 → 100004, …)
- maximum 256 blocs, et 16 000 caractères par bloc (au-delà, le bloc est ignoré)

**L'ordre compte** : les blocs sont évalués dans l'ordre croissant de `z`, et certains
blocs dépendent de l'état laissé par les précédents (`globalThis.__CT__` pour Control,
`globalThis.__GV__` pour Gravity). Le tri alphabétique des fichiers respecte cet ordre.

Ne pas modifier la première ni la dernière ligne d'un fichier (elles ferment le
`(FA => { … })(globalThis.FA)` attendu par le chargeur).

| z | Fichier | Contenu |
| --- | --- | --- |
| `100002` | `z100002-spring.js` | SPRING (Domain of Speed + Wind Blade) |
| `100004` | `z100004-flame.js` | FLAME (Crimson Beam + Meteor Shower) |
| `100006` | `z100006-lightning.js` | LIGHTNING (Chain Lightning + Thunder Strike) |
| `100008` | `z100008-dark.js` | DARK (Void Vortex + Void Anchor) |
| `100010` | `z100010-ice.js` | ICE (Geyser Burst) |
| `100012` | `z100012-blizzard.js` | BLIZZARD (Frostfall + Shatterfrost) |
| `100014` | `z100014-quakes.js` | QUAKES (Seismic Stomp) |
| `100016` | `z100016-light.js` | LIGHT (Shot) |
| `100018` | `z100018-rocket.js` | ROCKET (Rocket Launch + Jump Beacon) |
| `100020` | `z100020-blade.js` | BLADE (attaques) + nettoyage paint |
| `100022` | `z100022-paintballs.js` | PAINTBALLS (plomberie partagée : throwers + impacts) |
| `100024` | `z100024-dought.js` | DOUGHT (Full Punch + Concrete Wheel + Growing Ray) |
| `100026` | `z100026-portal.js` | PORTAL (Portal Step + Portal Rift) |
| `100028` | `z100028-smoke.js` | SMOKE (Choking Fog + Smoke Shroud) |
| `100030` | `z100030-rubber.js` | RUBBER (Elastic Punch) |
| `100032` | `z100032-diamond.js` | DIAMOND (Crystal Recovery) |
| `100034` | `z100034-ghost.js` | GHOST (Bouclier immunité + Phasing + Spectral Prison) |
| `100036` | `z100036-pain.js` | PAIN (Pulse of Pain) |
| `100038` | `z100038-gas.js` | GAS (Tomato Tether) |
| `100040` | `z100040-song.js` | SONG (Dissonant Wave + Petal Refrain) |
| `100042` | `z100042-tiger-mark.js` | TIGER (Predator Mark + Claw Rip) |
| `100044` | `z100044-tiger-form.js` | TIGER (Tiger Form) |
| `100046` | `z100046-creation.js` | CREATION (Manifest Golem) |
| `100048` | `z100048-magma.js` | MAGMA (Magma Rings + Lava Jet + poches de lave) |
| `100050` | `z100050-control-domain-1.js` | CONTROL 1/2 — état partagé (`__CT__`) |
| `100052` | `z100052-control-domain-2.js` | CONTROL 2/2 — `onPlayerClickControlDomain` |
| `100054` | `z100054-control-slash.js` | CONTROL (Control Slash) |
| `100056` | `z100056-gravity-1.js` | GRAVITY 1/4 — état, constantes et ciblage |
| `100058` | `z100058-gravity-2.js` | GRAVITY 2/4 — meshes, effets et dégâts de la salve |
| `100060` | `z100060-gravity-3.js` | GRAVITY 3/4 — Barrage |
| `100062` | `z100062-gravity-4.js` | GRAVITY 4/4 — Grab, Planet et Leave |
| `100064` | `z100064-control-shambles.js` | CONTROL (Shambles + leave) |
