# Items — Block Pirate

Tout ce que le joueur peut avoir dans son inventaire : ce que c'est, ce que ça fait, où
ça s'obtient et combien ça coûte.

## Comment lire ce document

Bloxd a deux noms pour chaque item :

- le **nom de l'item** (`Small Black Pod`, `Swap Orb`…) : c'est l'identifiant technique,
  il ne change jamais, et le code le reconnaît par lui ;
- le **nom affiché** (`Armament Haki`, `Fruit Abilities`…) et sa **description** : ce que
  le joueur lit dans son inventaire. Ils sont posés une fois pour toutes au join, depuis
  une table unique — un item déjà en banque, ramassé au sol, rendu par un Code Block ou
  vendu par un PNJ affiche donc toujours le bon nom.

Les noms affichés et les descriptions sont en anglais, comme le reste du jeu.

## Inventaire rapide

| Catégorie | Items |
|---|---|
| Commandes | `Armament Haki`, `Fruit Abilities`, `Fighting Style Capacities`, `Dash` (reliquat) |
| Quête du Saber | `Cup of Water`, `Ancient Relic`, `Gold Dust`, `Haki Fragment` |
| Bons de réduction | 5 `Fruit Voucher` (10 à 50 %) |
| Armes | 7 armes, un nom par team |
| Bateaux | 3 bateaux |
| Fruits | 41 items-poissons + un item par capacité |

---

## Items de commande

### Armament Haki — `Small Black Pod`

*Affiche : « Armament Haki » — « Click to arm or release your Armament Haki. It cannot be dropped. »*

Le poing blindé. Un clic pour l'armer, un clic pour le relâcher. Armé, **tous tes coups
portent +25 % de dégâts**. On l'apprend chez le **Haki Seller** pour **14 000 pièces et
1 Haki Fragment** ; l'item qui sert à basculer est alors donné une seule fois.

- Ne peut **jamais** être lâché : perdu, un joueur qui connaît le haki n'aurait plus aucun
  moyen de l'armer.

### Fruit Abilities — `Swap Orb`

*Affiche : « Fruit Abilities » — « Hold it in your hand to use the powers of your Devil Fruit. It cannot be dropped. »*

**PC uniquement.** En main, il ouvre les touches de ton fruit : `Z X C V F` (une touche par
capacité, avec l'icône de son type d'attaque et son nom). Sans lui, les capacités sont des
items, comme par défaut.

- Un mobile ne le reçoit **jamais** : les touches sont des commandes de clavier, un écran
  tactile n'en a pas — il garde ses items de capacité.
- Ne peut pas être lâché, ni lancé, ni posé, ni chargé (aucune action native).

### Fighting Style Capacities — `Void Net`

*Affiche : « Fighting Style Capacities » — « Hold it in your hand to punch and to use your Fighting Style attacks. It cannot be dropped. »*

**PC uniquement.** En main, il rend le coup de poing au clic gauche (`M1`) et ouvre les deux
attaques du style sur `Z` et `X`. Même règles que l'orb : jamais donné à un mobile, jamais
lâchable, aucune action native.

### Dash — `Moonstone Dust`

*Affiche : « Dash » — « Click to dash forward. It costs stamina and cannot be dropped. »*

**Reliquat d'anciennes versions.** Le dash n'est plus un item : sur mobile c'est le bouton à
l'écran, sur PC le clic droit ou `Q`. Un inventaire d'avant peut encore en contenir :

- sur **PC**, le clic dashe encore, puis l'item est retiré ;
- sur **mobile**, il est retiré au premier clic **sans** propulser personne.

Il est volontairement **inerte** (une matière, aucun effet propre) : un item qui propulse
tout seul crée un second dash que le mobile ne peut pas annuler.

---

## Items de la quête du Saber

| Nom affiché | Item réel | Rôle |
|---|---|---|
| **Cup of Water** | `Water Bucket` | Un seau rempli au point d'eau de la quête. |
| **Ancient Relic** | `Magmaward Fuel` | Ouvre ce qu'aucune lame ne coupe, à l'endroit marqué. |
| **Gold Dust** | `Gold Grit` | Le tas de pièces volé par le Mob Leader ; le Rich Man le réclame. |
| **Haki Fragment** | `Black Carpet` | Éclat d'Armament Haki arraché à un boss. |

- Un **Haki Fragment** se revend au **Haki Buyer** pour **100 à 300 pièces chacun** (prix
  annoncé au premier clic, tenu 3 s pour la confirmation), et sert aussi de **péage** pour
  apprendre l'Armament Haki.
- **Gold Dust** et **Ancient Relic** se donnent, ne se vendent pas : ce sont des étapes de
  quête, un doublon bloquerait la suite.
- Ces items de quête ne sont **jamais** dans les tables de butin : ce sont des dons garantis.

---

## Bons de réduction — Fruit Voucher

Cinq items par défaut de Bloxd (les *Lottery Tickets*), renommés. Un bon posé dans
l'inventaire **réduit le prix du tirage de la machine à fruits** ; le **meilleur** est
utilisé, et il n'est consommé qu'au moment où le fruit est réellement remis.

| Nom affiché | Item réel | Réduction |
|---|---|---|
| **Common Fruit Voucher** | `Common Lottery Ticket` | 10 % |
| **Uncommon Fruit Voucher** | `Uncommon Lottery Ticket` | 20 % |
| **Rare Fruit Voucher** | `Rare Lottery Ticket` | 30 % |
| **Epic Fruit Voucher** | `Epic Lottery Ticket` | 40 % |
| **Legendary Fruit Voucher** | `Legendary Lottery Ticket` | 50 % |

Prix du tirage : **500 + 35 × niveau**, moins la réduction du bon.

---

## Armes

Sept armes, dont le nom dépend de la **team** : le même item s'appelle autrement chez les
Pirates, chez les Marines et pour un joueur sans team. Changer de team **convertit** l'arme
(une arme basique reste basique, une avancée reste avancée).

| Nom affiché | Item réel | Team | Prix |
|---|---|---|---|
| **Basic Sword** | `Wood Sword` | Pirates | 60 |
| **Rusty Sword** | `Wood Sword` | Sans team | 30 |
| **Basic Spear** | `Wood Spear` | Marines | 60 |
| **Advanced Sword** | `Stone Sword` | Pirates | 230 |
| **Advanced Spear** | `Stone Spear` | Sans team | 200 |
| **Flintlock** | `M1911` | Marines | 260 |
| **Sand Dagger** | `Stone Dagger` | Désert (vendeur de sable) | 230 |

Descriptions : *« The first sword every Pirate is handed. »* · *« A rusted sword, the first
blade of a fighter with no side to swear to. »* · *« The first spear every Marine is
handed. »* · *« The blade of a Pirate who has already drawn blood. »* · *« A long spear for a
fighter with no side to swear to. »* · *« A slow hand cannon that hits hard from a
distance. »* · *« A short blade cut from the rock of the desert. »*

---

## Bateaux

| Nom affiché | Item réel | Prix | Description |
|---|---|---|---|
| **Normal Boat** | `Boat` | 500 | *A classic boat, made to sail every sea.* |
| **Advanced Boat** | `Obsidian Boat` | 1 000 | *A sturdier boat, made to sail every sea.* |
| **Luxury Boat** | `Speedboat` | 5 000 | *The fastest boat of the three, made to sail every sea.* |

---

## Fruits du Démon

- **41 items-poissons** : un par fruit (`Boulder Bass`, `Embermark Wrasse`, `Seahorse`…).
  La liste complète, rareté par rareté, est dans [`FRUITS.fr.md`](FRUITS.fr.md) ; le nom de
  l'item y figure à côté du nom du fruit.
- **Un item par capacité** : `Rocket Launch`, `Gravity Planet`, `King's Roar`… Le nom de
  l'item **est** le nom de la capacité, et sa description est l'explication de la capacité.
  Prends-le en main et clique pour la lancer (ou `Z X C V F` avec l'orb sur PC).
- Ces items de capacité et de style **ne peuvent pas être lâchés** : ils reviennent au
  respawn et au changement de fruit ou de style.

---

## Items qui ne peuvent pas être lâchés

- Tous les items de **capacité de fruit** et de **style de combat** ;
- les deux items de commande (`Swap Orb`, `Void Net`) et le reliquat `Moonstone Dust` ;
- le pod d'**Armament Haki** ;
- les objets de quête du Saber.

Tout le reste peut tomber au sol — **y compris un fruit**, puisque c'est le seul moyen d'en
faire cadeau à un autre joueur.
