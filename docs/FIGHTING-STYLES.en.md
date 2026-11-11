# Fighting Styles — Block Pirate

The four fighting styles of the game: how you learn them, what they change about your
punches, and their two attacks with their cooldowns. Each style sits in its own code block —
copy one and paste it straight into Discord.

## How it works

- A style is learnt from its **teacher** (an NPC on the sea 1 islands) for coins. **Combat**
  is free: everybody starts with it.
- You can only hold **one style at a time**: learning a new one replaces the old one, and the
  old one is not refunded.
- The style **changes your punch**: empty-handed, left click (`M1`) plays the style's punch
  instead of the basic one. Each style has its own `M1` cooldown (under half a second, see
  the table).
- The style's two **attacks** are items (one per attack): hold one and click. On **PC**, with
  `Fighting Style Capacities` in hand, they move to `Z` and `X` and left click stays the
  style's punch.
- The current style is shown in the **sidebar**, under your health.
- The style is **saved**: it comes back on join and on respawn. Resetting your character
  removes it completely (and takes its items back).

## At a glance

| Style | Teacher | Price | M1 cooldown |
|---|---|---|---|
| **Combat** | Combat Teacher | Free | 380 ms |
| **Dark Step** | Dark Step Teacher | 13,000 | 360 ms |
| **Electric** | Mad Scientist | 22,000 | 380 ms |
| **Water Kung-Fu** | Water Kung-Fu Teacher | 35,000 | 380 ms |

---

## Combat

```
COMBAT — Fighting Style
Teacher: Combat Teacher   Price: FREE   M1 cooldown: 380 ms
The starter style: heavy punches and two close-range attacks that send
people flying.

1. Ground Smash  [6.5 s · Explosion]
   Smash the ground with both fists, blasting and launching all nearby enemies.

2. Grapple Rush  [8.5 s · Rush]
   Dash forward, grab an enemy in your path and slam them down with a heavy
   overhead punch.
```

---

## Dark Step

```
DARK STEP — Fighting Style
Teacher: Dark Step Teacher   Price: 13,000   M1 cooldown: 360 ms
A kicking style. Faster to punch with than Combat, and both attacks move you.

1. Flying Kick  [6.5 s · Rush]
   Leap forward in a blazing curved trajectory and unleash a massive kick upon
   landing.

2. Breakdance  [9 s · Ground zone]
   Spin upside-down on your hands, damaging and knocking back all enemies
   around you.
```

---

## Electric

```
ELECTRIC — Fighting Style
Teacher: Mad Scientist   Price: 22,000   M1 cooldown: 380 ms
The mad scientist's style: electricity, area damage, and a trail that keeps
hitting.

1. Stomp  [8 s · Explosion]
   Launch into the air, slam back into the ground and trigger a large electric
   explosion.

2. Electrical Tackle  [9.5 s · Rush]
   Dash forward leaving a high-voltage electric trail for 6s that shocks foes
   every 1s.
```

---

## Water Kung-Fu

```
WATER KUNG-FU — Fighting Style
Teacher: Water Kung-Fu Teacher   Price: 35,000   M1 cooldown: 380 ms
The most expensive style, and the only ranged one: two water beams.

1. Steam-Charged Fist  [8 s · Beam]
   Fire a wide hydro-steam beam that drags foes into a massive knockback
   explosion at the end.

2. Deadly Shower  [9 s · Beam]
   Shoot a focused water beam that calls down a rapid torrential barrage on the
   target zone.
```

---

## Getting a style

```
HOW TO LEARN A FIGHTING STYLE

1. Find the style's teacher on his island.
2. He states the price: the first click asks for confirmation, the second one
   (within 3 seconds) pays.
3. The style is equipped immediately, its two attack items land in your
   inventory, and the sidebar updates.
4. Talking to the same teacher again later simply refreshes your attack items.
```
