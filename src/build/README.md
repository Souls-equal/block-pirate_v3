# src/build/ — modules manquants

`src/index.js` importe trois modules d'ici :

| Module | Symboles attendus |
| --- | --- |
| `layer.js` | `tickLayer`, `onPlayerJoinLayer`, `onPlayerClickLayer` |
| `path.js` | `tickPath`, `onPlayerJoinPath`, `onPlayerClickPath` |
| `sphere.js` | `tick1`, `onPlayerJoin1`, `onPlayerClick1` |

Ces trois fichiers **ne sont pas présents dans le dépôt** : ils étaient déjà absents avant
le rangement (rien n'a été supprimé) et ils ne peuvent pas être reconstruits à partir du
reste du code. Tant qu'ils manquent, un bundle de `src/index.js` échouera sur ces trois
imports — `node tools/check-imports.mjs` les signale comme « attendus ».

Dès qu'ils sont ajoutés ici, le graphe de modules est complet.
