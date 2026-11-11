# Items — Block Pirate

Everything a player can carry: what it is, what it does, where it comes from and what it
costs. Every entry sits in its own code block — copy one and paste it straight into Discord.

## How to read this document

Bloxd gives every item two names:

- the **item name** (`Small Black Pod`, `Swap Orb`…): the technical id. It never changes,
  and the code always recognises an item by it.
- the **display name** (`Armament Haki`, `Fruit Abilities`…) and its **description**: what
  the player actually reads in their inventory. Both are set once, on join, from a single
  table — so an item already in a chest, picked up from the floor, handed back by a Code
  Block or sold by an NPC always shows the right name.

## Quick inventory

| Category | Items |
|---|---|
| Command | `Armament Haki`, `Fruit Abilities`, `Fighting Style Capacities`, `Dash` (leftover) |
| Saber Quest | `Cup of Water`, `Ancient Relic`, `Gold Dust`, `Haki Fragment` |
| Discounts | 5 `Fruit Voucher` (10% to 50%) |
| Weapons | 7 weapons, one name per team |
| Boats | 3 boats |
| Fruits | 41 fish items + one item per ability |

---

## Command items

### Armament Haki

```
ARMAMENT HAKI  —  item: Small Black Pod
"Click to arm or release your Armament Haki. It cannot be dropped."

What it does
- Click to arm it, click again to release it.
- While armed, EVERY hit you land deals +25% damage.
- Learnt from the Haki Seller: 14,000 coins + 1 Haki Fragment.
- Cannot be dropped: lose it and a player who knows Haki could never arm it again.
```

### Fruit Abilities

```
FRUIT ABILITIES  —  item: Swap Orb
"Hold it in your hand to use the powers of your Devil Fruit. It cannot be dropped."

What it does
- PC ONLY. Held in hand, it gives you your fruit's buttons: Z X C V F
  (one per ability, with its attack-type icon and its name).
- Without it, abilities are items — the default for everyone.
- Mobile players NEVER get it: those are keyboard keys, and a touch screen has none.
- Cannot be dropped, thrown, placed or charged.
```

### Fighting Style Capacities

```
FIGHTING STYLE CAPACITIES  —  item: Void Net
"Hold it in your hand to punch and to use your Fighting Style attacks. It cannot be dropped."

What it does
- PC ONLY. Held in hand, left click is your punch (M1) and Z / X are the two
  attacks of your fighting style.
- Same rules as the orb: never given to mobile, cannot be dropped, no native action.
```

### Dash (leftover)

```
DASH  —  item: Moonstone Dust
"Click to dash forward. It costs stamina and cannot be dropped."

About it
- LEFTOVER from older versions. The dash is no longer an item: on mobile it is
  the on-screen button, on PC right click or Q.
- PC: clicking it still dashes once, then the item is taken away.
- MOBILE: clicking it removes it WITHOUT dashing anyone.
- Deliberately inert (a material, no effect of its own): an item that propels
  you makes a second dash that mobile cannot cancel.
```

---

## Saber Quest items

```
CUP OF WATER  —  item: Water Bucket
"A cup full of fresh water. Someone must be thirsty."
A bucket filled at the quest's water point.

ANCIENT RELIC  —  item: Magmaward Fuel
"An ancient Relic bearing the marks of time. It opens what no blade can cut,
 right where it's marked"
Opens the sealed way in the Saber Quest.

GOLD DUST  —  item: Gold Grit
"A heap of stolen coins and treasure, all that the Mob Leader could carry.
 The Rich Man wants it back."
Loot from the Mob Leader.

HAKI FRAGMENT  —  item: Black Carpet
"A shard of Armament Haki, torn from a boss. Pick it up to grow stronger."
Sold to the Haki Buyer for 100 to 300 coins each, and used as the toll to
learn Armament Haki.
```

- **Haki Fragment**: the price is rolled on the first click and held for 3 seconds so the
  confirmation shows the same number twice.
- **Gold Dust** and **Ancient Relic** are quest steps: they are given, never sold, and never
  appear in loot tables (a duplicate would block the quest).

---

## Fruit Vouchers

Five default Bloxd items (the *Lottery Tickets*), renamed. A voucher in your inventory
**cuts the price of the fruit machine**; the **best** one is used, and it is only spent when
the fruit is actually handed over.

```
FRUIT VOUCHERS (fruit machine discount)
Common Fruit Voucher      — Common Lottery Ticket     — 10% off
Uncommon Fruit Voucher    — Uncommon Lottery Ticket   — 20% off
Rare Fruit Voucher        — Rare Lottery Ticket       — 30% off
Epic Fruit Voucher        — Epic Lottery Ticket       — 40% off
Legendary Fruit Voucher   — Legendary Lottery Ticket  — 50% off

Roll price: 500 + 35 x level, minus the voucher.
```

---

## Weapons

Seven weapons, and the display name depends on the **team**: the same item is called one
thing for Pirates, another for Marines and another for a player with no team. Changing team
**converts** the weapon (basic stays basic, advanced stays advanced).

```
WEAPONS (display name — item — team — price)

Basic Sword        — Wood Sword    — Pirates      — 60
Rusty Sword        — Wood Sword    — No team      — 30
Basic Spear        — Wood Spear    — Marines      — 60
Advanced Sword     — Stone Sword   — Pirates      — 230
Advanced Spear     — Stone Spear   — No team      — 200
Flintlock          — M1911         — Marines      — 260
Sand Dagger        — Stone Dagger  — Desert       — 230

Descriptions
Basic Sword     "The first sword every Pirate is handed."
Rusty Sword     "A rusted sword, the first blade of a fighter with no side to swear to."
Basic Spear     "The first spear every Marine is handed."
Advanced Sword  "The blade of a Pirate who has already drawn blood."
Advanced Spear  "A long spear for a fighter with no side to swear to."
Flintlock       "A slow hand cannon that hits hard from a distance."
Sand Dagger     "A short blade cut from the rock of the desert."
```

---

## Boats

```
BOATS (display name — item — price)

Normal Boat     — Boat           — 500
                "A classic boat, made to sail every sea."
Advanced Boat   — Obsidian Boat  — 1,000
                "A sturdier boat, made to sail every sea."
Luxury Boat     — Speedboat      — 5,000
                "The fastest boat of the three, made to sail every sea."
```

---

## Devil Fruits

```
DEVIL FRUIT ITEMS

- 41 fish items, one per fruit (Boulder Bass, Embermark Wrasse, Seahorse...).
  The full list, rarity by rarity, is in FRUITS.en.md, with the item name next
  to the fruit name.
- One item per ability: Rocket Launch, Gravity Planet, King's Roar... The item
  name IS the ability name, and its description is the ability's explanation.
  Hold it and click to cast (or Z X C V F with the orb on PC).
- Ability and style items can NEVER be dropped: they come back on respawn and
  when you eat a new fruit or learn a new style.
```

---

## Items that can never be dropped

```
CANNOT BE DROPPED
- every Devil Fruit ability item and every fighting style item
- the two command items (Swap Orb, Void Net) and the leftover Moonstone Dust
- the Armament Haki pod
- the Saber Quest items

Everything else can be dropped — including a fruit, because that is the only
way to give one to another player.
```
