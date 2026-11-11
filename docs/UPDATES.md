# Updates

Block Pirate V3, release by release.

The repository has **no git tags**: the versions below are the milestones the pull-request
history falls into, in the order the pull requests were merged. Every line comes from a real
merge in this repository (**285 commits**, **114 pull requests**, 2026-10-26 → 2026-11-11).
**V3.0.0 is the commit the repository was created with.**

| Version | Date | Headline |
|---|---|---|
| [V3.0.0](#v300) | 2026-10-26 | The V2 sources, rebuilt as V3 |
| [V3.0.1](#v301) | 2026-10-26 | 101 fruit abilities |
| [V3.0.2](#v302) | 2026-10-27 | Mythical fruits, sounds, particles |
| [V3.0.3](#v303) | 2026-10-27 | Four fighting styles |
| [V3.0.4](#v304) | 2026-10-27 | First balance pass |
| [V3.0.5](#v305) | 2026-10-27 | Bloxd ids, callbacks, kill credit |
| [V3.1.0](#v310) | 2026-10-28 | Bounty, chat, PvP protection |
| [V3.1.1](#v311) | 2026-10-29 | Ranks, anti-farm, versioned build |
| [V3.2.0](#v320) | 2026-10-30 | Lobby, seas, teams |
| [V3.2.1](#v321) | 2026-10-30 | Admin tools, effects, crowd control |
| [V3.3.0](#v330) | 2026-10-31 | Fruit items, shops, Settings |
| [V3.3.1](#v331) | 2026-11-02 | Settings dropdowns, glitches |
| [V3.4.0](#v340) | 2026-11-03 | The Saber Quest |
| [V3.4.1](#v341) | 2026-11-05 | Saber Quest, second pass |
| [V3.5.0](#v350) | 2026-11-06 | Loot, vouchers, bosses |
| [V3.5.1](#v351) | 2026-11-07 | Items centralised, tutorial |
| [V3.6.0](#v360) | 2026-11-07 | Code Blocks and censorship |
| [V3.6.1](#v361) | 2026-11-08 | HUD bars and logs |
| [V3.7.0](#v370) | 2026-11-08 | Items or buttons |
| [V3.7.1](#v371) | 2026-11-08 | Interface, name tags, chat |
| [V3.8.0](#v380) | 2026-11-09 | Sidebar back to its old self |
| [V3.8.1](#v381) | 2026-11-11 | Mobile controls |
| [V3.9.0](#v390) | 2026-11-11 | The mobile dash, for good |
| [V3.9.1](#v391) | 2026-11-11 | Documentation |

---

## V3.0.0

*2026-10-26 — the V2 sources, rebuilt as V3.*

### Created the new server from the V2 code

- Initial commit: the V2 game sources uploaded as they were.
- Sources sorted into `src/` and `code-blocks/` instead of one flat folder.
- **32 Code Blocks packed into 5**, World Code minified, Control and Gravity fixed.
- Readable multi-file World Code: `fruit/func-abilities.js` made autonomous, `index.js`
  formatted, and `world.js` generated at the repository root for a direct copy-paste into
  Bloxd.

### Bloxd compatibility

- Every import and export in `./src` normalised, so Bloxd accepts the modules.
- Critical sequences spaced out inside the 5 Code Blocks to stay out of Bloxd's chat filter.
- Code Block chunk warmed up one tick before being read (the first read used to come back
  empty).

---

## V3.0.1

*2026-10-26 — the fruit roster.*

### Fruits

- **101 new abilities across all 41 fruits**, scaled by rarity: 3 for Common, 4 for
  Uncommon and Rare, 5 for Legendary and Mythical.

### Code Blocks

- Fixed the `=G , f=` sequence that Bloxd censored in `pack-07`.

---

## V3.0.2

*2026-10-27 — combat fixes and Mythical fruits.*

### Abilities

- Bigger ability hitboxes; **Control Domain** cycle nerfed; third page in the admin
  inventory.
- Mob kill attribution fixed for abilities (`isMobEntityType` + `onEntityDeleted`).
- Player mesh attachments kept, NPCs no longer pushed around by abilities.

### Mythical fruits

- The fruit is **kept on death**.
- Mythical fruits get transformations, auras and animations, and **every ability has a
  sound**.
- Meshes replaced with particles: Concrete Wheel, Full Punch, Elastic Punch, Spectral
  Prison, Tiger Form and the Mythical forms.

### Code Blocks

- Longer transformation durations, and the `g(f)` censorship fixed in `pack-05`.

---

## V3.0.3

*2026-10-27 — the fighting styles.*

### Four styles, eight attacks

- **Combat**, **Dark Step**, **Electric** and **Water Kung-Fu**, each with its teacher NPC.
- Empty-hand `M1` punches for each style, 8 abilities, and the style shown in the sidebar.
- Handlers run natively inside `fightingStyles.js`, and the held item is matched by its
  item type.

---

## V3.0.4

*2026-10-27 — first balance pass.*

### Balance

- Nerf of the 101 abilities and of the fighting styles, with per-rarity caps.

### Dash and admin

- No more punches during a dash, plus a hands-back animation.
- Clicking an ability that is still cooling down now plays the style's punch.
- Admin: money, and a level / XP menu.
- No more `ApiError` when a player disconnects.

---

## V3.0.5

*2026-10-27 — Bloxd ids and callbacks.*

### Stability

- Sidebar, leaderboard and name tag stopped updating: the `isValidPlayerId` dependency is
  gone, the join is tolerant step by step, and disconnect `ApiError`s are swallowed.
- Bloxd ids are **negative integers stored as strings**: every format guard removed
  (sidebar, name tag, heal, kill) along with the faulty knockback filter that was pushing
  players around.

### Exploits

- Despawn anti-exploit: credit for a kill needs the killer **within 64 blocks** of the
  target; a kill confirmed by `onPlayerKilledMob` is still paid without a test.

---

## V3.1.0

*2026-10-28 — money, chat and PvP.*

### Bounty

- A pirate who kills steals **10% of the victim's money** (max 1,000) and adds it to his own
  bounty.
- A marine who kills a pirate **collects the bounty** (max 10,000), which drops back to 0.
- Every fruit give now carries its **real description and enchantment tier** (pickup,
  machine, default description).
- Leaderboard shows **Bounty** instead of the fruit, refreshes the killer and the victim
  after a kill, and its ordering is fixed.

### Chat

- Admins write in their **real channel** (their team colour for them and their team, nothing
  for the others); the permission now only means *read the other channels* with the tag, and
  channels are normalised.

### PvP

- **5 minutes of protection** against the player who just killed you, granted on manual and
  on automatic respawn.
- A fruit can be dropped again, so it can be given to another player.
- A fruit ability can no longer trigger a fighting style (Crimson Beam vs Grapple Rush): the
  **item name** decides.

---

## V3.1.1

*2026-10-29 — ranks, anti-farm, and a versioned build.*

### Progression

- Single colour palette, Bloxd icons, and a **40-level anti-farm** rule.
- Ranks and permissions refactored; new code `TYFOR40MEMBERS` with its rewards.
- Fixed `InternalError: Argument too large` (text styling too big).

### Build

- The compact World Code is **versioned in `world-code/`** and visible on GitHub.
- 512k World Code, stale ids and marine-vs-marine fixed.

---

## V3.2.0

*2026-10-30 — lobby, seas and teams.*

### Seas

- Lobby plus **per-sea variations**, mob name tags, team chat.
- `sea1` / `sea2` variations and an API without blocks or pads.

### Structure

- Global functions for the Code Blocks, admin teleport blocked inside the lobby, inventory
  colours.
- **30-file cap** for the World Code (mute moved into `team.js`, the bridge into
  `index.js`).
- A **100-block neutral zone** in the lobby: no abilities, no damage.

---

## V3.2.1

*2026-10-30 — admin tools, effects and crowd control.*

### Moderation

- **Mute** a player from the admin panel: list, unmute, durations. A muted player always
  stays visible in the list (and can be demoted).
- **Freeze** a player from the admin panel.
- **Announcement** button: coloured zones with `*text*<colour>`.
- Admin panel filtered by permission, player teleport for the TESTER rank, only valid icons.

### Interface fixes

- Vanish fix, join/leave inventory colours restored, capacities kept apart.

### Effects and crowd control

- An ability no longer stacks with **itself**; non-existent effects removed, regen nerfed,
  stable manifest.
- Warp points, dash while in a boat, crowd-control immunity, regen curve.
- **Control Domain** no longer controls an admin or the owner.
- Crowd control is decided by the **origin of a movement**, not by a 2.5-second window.
- **Control dome**: nobody is placed inside a wall anymore, and mobs are held inside.

---

## V3.3.0

*2026-10-31 — fruit items, shops and Settings.*

### Fruits

- Fruit items are now **fish** (`Boulder Bass`, `Embermark Wrasse`…), and existing
  inventories are migrated on join.
- No more errors when a player leaves in the middle of a roll.

### Shops

- **One confirmation for every purchase** (second click within 3 seconds).
- **Team recruiter NPCs**, and the anti-farm bounty can no longer create money.
- Settings shop: island arrows, **Respawn** and **PvP protection** for everyone, one colour
  per island, each arrow hiding itself once used.

### Skylands

- Skylands compressed, Garp, the coconut and haki; new Skylands quests.

---

## V3.3.1

*2026-11-02 — Settings and glitches.*

### Settings

- **Two dropdowns** for the arrows, and nothing of it in the lobby.

### Fixes

- Two glitches closed: the admin clear was paying XP, and a quest could be paid twice.
- Variation-less mode: the world **is** sea 1.

---

## V3.4.0

*2026-11-03 — the Saber Quest, the last big quest of sea 1.*

### The quest

- Built end to end: the Rich Man, the Mob Leader, the water point, the sealed way, the
  Saber Expert.
- Real items (`Cup of Water`, `Ancient Relic`, `Gold Dust`, `Haki Fragment`), described for
  the player, with their launching NPC.
- Real boss fights, and the Haki Fragment buyback on both sides.
- The Cup is sealed on the spot and identified by its **original item only**
  (`Bucket` / `Water Bucket`); an empty bucket always fills.
- The door and the curtain really open (`setBlockRect`).

### Wild fruits

- A block appears and you click it: **18 spawn points, three per island**.

---

## V3.4.1

*2026-11-05 — the Saber Quest, second pass.*

- The Mob Leader really attacks, and the Saber Expert (level 200) telegraphs on the ground.
- The quest can be **resumed after a disconnect**, without a single database write.
- The step is saved under the key `s`, plates are never saved, and the key is deleted on
  victory.
- A diagnostic message when the player has no bucket at the water point, and the Cup keeps
  its display name.

---

## V3.5.0

*2026-11-06 — loot, vouchers and bosses.*

### Loot

- **Fruit Vouchers** (the five Lottery Tickets, renamed, 10% to 50% off).
- Mob loot at 4% / 6% / 9% by rank, with items reserved for the bosses.

### Bosses

- Anti one-shot by **tiers** (1/2, 1/3, 1/4, 1/5) with a 9% cap per hit.
- The Mob Leader's Gold Grit drops **only once**.

### Build

- **64-file cap** for the World Code; the Saber Quest briefly split into 8 files, then back
  to one file under the "generic file" rule.
- Small-level protection: below 50 against above 100.

---

## V3.5.1

*2026-11-07 — items centralised, tutorial.*

### Items

- Item names and descriptions are **centralised** in one table, set once on join; the Haki
  pod can no longer be dropped.
- Mutualisation: message segments, entity tools and data tables shared instead of copied.
- `BOSS_MOBS` stays private to `loot.js` (callers go through `forgetBossMob`); the control
  dome no longer puts anyone in a wall and holds mobs.

### Players

- **Tutorial**: a welcome plus 4 guided steps for a new player.

---

## V3.6.0

*2026-11-07 — Code Blocks and censorship.*

### Bloxd censorship

- Not a single censurable pattern left in the Code Blocks.
- `*b` becomes `*1*b`; the spaces are kept **and** `* 1 *` is added; `b , f` becomes `b ,f`
  (the comma glued to the `f` is the one that survives).
- A Code Block coming from an older version **spots itself**.

---

## V3.6.1

*2026-11-08 — HUD bars and logs.*

- Native `ProgressBar` bars instead of character bars, with an honest sidebar budget.
- Bars are **250 × 24 px**, and no call is lost while the game is starting.
- Code Block loading is bounded, and `FA.status()` can be reported back.
- **One state = one log line**: no more log spam at startup, no repeating log line, cyan XP
  bar.

---

## V3.7.0

*2026-11-08 — items or buttons.*

### Controls

- Dash on `Q` (PC) and a `Snowdash` item (mobile); abilities on `Z X C V F`.
- PC: **`Swap Orb`** and **`Void Net`**, with the buttons that depend on the held item and on
  the fruit.
- One icon per attack type on the PC buttons.
- **Items / Buttons** choice in Settings, items by default.
- Command items: no native action, clean names, drop blocked.

### Items

- Item renaming: names and descriptions live **only** in `customItem.js`.
- Complete official icon lists, with a check that actually bites.

---

## V3.7.1

*2026-11-08 — interface, name tags, chat.*

### Look and feel

- Cleaner interface: icons, registers, cards, readable numbers; dialogue and boss messages
  cleaned up.

### Players

- Name tags readable as long as the id exists; **no emoji** anywhere (only the typographic
  signs `✦`, `●`, `─`); boss immune to crowd control.
- Team line in the sidebar, and the boss dome.

---

## V3.8.0

*2026-11-09 — the sidebar back to its old self.*

- Mobile dash item goes from `Snowdash` to **`Moonstone Dust`**, and the item is made
  **inert** (a material with no effect of its own).
- Stamina: no log at all, and no more sweep of the old dash item.
- Cleanup: nothing temporary left in the code.
- Legacy UI: the Settings panel recognises its island items again, so an old client keeps
  working.
- **Global chat in dark blue**, sidebar back in its original order, then its old style, then
  the original sidebar again, identically, **without the team line**.

---

## V3.8.1

*2026-11-11 — mobile controls.*

- Dash on mobile without an item; **touch NPCs** (the NPC under the finger answers); quest on
  team change; fruit machine.
- Touch buttons by default on mobile, and the **reset removes the fighting style**.
- Both command items open the buttons, mobile included.
- Then: **mobile = items + a single button** (the dash), no touch buttons, so normal taps
  stop dashing.

---

## V3.9.0

*2026-11-11 — the mobile dash, for good.*

### What was tried

- 1. The dash stops being the action button and becomes a single custom button.
- 2. Discovery: `customButtons` are **keyboard keys** — Bloxd only fires
  `onPlayerPressedButton`, so a button placed there never works on a touch screen. Back to
  the on-screen button, plus a temporary probe logging every touch callback.
- 3. The probe said it all: pressing the dash button is the **only** case where
  `onTouchscreenActionButton` fires. Punching, breaking a block, talking to an NPC, jumping
  or touching the side of the screen never dash.

### Where it landed

- The **on-screen dash button is the only entry** for the dash on mobile; the probe was
  removed, and `npm run check` now refuses to let it come back.
- `onPlayerPressedButton` ignores any press coming from a touch screen.

---

## V3.9.1

*2026-11-11 — documentation.*

### New documents

- `docs/UPDATES.md`: this changelog.
- `docs/FRUITS.fr.md` / `docs/FRUITS.en.md`: all 41 fruits, 181 abilities, cooldowns and
  descriptions. The English file has one code block per fruit, ready to paste into Discord.
- `docs/ITEMS.fr.md` / `docs/ITEMS.en.md`: command items, quest items, vouchers, weapons,
  boats and fruit items.
- `docs/FIGHTING-STYLES.fr.md` / `docs/FIGHTING-STYLES.en.md`: the four styles and their
  eight attacks.
