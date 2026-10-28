# Inner Tempest 1.0.0 — Block 10: Dragon Companions

27 October 2026. The book's last block: the Dragon Companions chapter and the Dragon Tamer archetype, as ruled on 27 October (B10-1 to B10-14, every proposal adopted; `docs/INNER_TEMPEST_RULINGS_2026-10-27-B10.md`).

- **Needs TRG Prime 3.674.0.** Install the system first.
- **No migration.** Nothing changes for a world without a dragon.

## What you get

**A new compendium, "Inner Tempest: Dragon Companions"** (it-dragons). It extends none of the system's packs, so no dragon is offered as an animal companion.
- **The Dragon Companion class.** It carries the Dragon Companion Table, and its rows run to level 30, so a dragon the GM raises still reads its own row.
  - BAB and BDB +1 a level; every save 5 + level.
  - 12 + Con hit points a level, beside the system's size base.
  - 8 + Intelligence skill points a level (B10-8).
  - A general feat at 1st level and every 2 levels after.
  - Caster level is its level − 3; 4 PP and BSB +1 a level.
  - An arcane instinctive caster on Charisma.
- **The four base dragons** (Cold, Earth, Fire, Light), as base creatures:
  - their printed scores, size and speeds, and their senses;
  - their natural armour (the printed DR over the DR multiplier, interpretation 4);
  - breath, High Magic, bite and claws.
- **Their four eggs.**

Other compendiums gain:
- each dragon's **Bite** (with 1d6 of its element) and the dragons' **Claws**, at Medium; the system resizes them (B10-10);
- the **four breath weapons** and **High Magic**;
- **Dragon Tamer** (Archetype) and the four **Dragon Companion feats**.

Every printed number and paragraph is read from the book's text (`tools/content/book-text-block10.json`), never retyped.

## How it plays

**The egg.** Carry it. Each daily preparation counts a day of bonding, whether or not your table runs a world clock. A second preparation on a day the clock has already moved into is refused, and the card says so. At 28 days (or the number the GM sets on the egg) it is ready.

**Dragon Tamer's Use** checks Inner Discipline, 8 Arcana ranks, the Dragon Lore specialist skill (B10-11) and a ready egg. It then hatches the dragon as a linked companion actor:
- at its base level, with its printed feats (the light dragon's fourth, Lightning Reflexes, free: B10-9);
- with its printed skill ranks (B10-7), languages, immunities and weakness;
- the egg is consumed.

A master keeps an animal companion beside the dragon: one of each kind (B10-12).

**Growth.** The dragon gains a level each time you do (B10-1). The acting GM keeps it in step with the table whenever its level moves, and at world load:
- **Size:** it grows (core C3), and its tokens grow with it.
- **"Draconic Growth" effect:**
  - land and fly speed;
  - Str, Con, Dex and the three mental scores, from the table alone (B10-2);
  - its class bonus as a status bonus to DB.
- **Attacks:** Wings at +6, Tail Slap at +10, Crush at +16. The tail takes Sweep at +20 (B10-3).
- **Breath length:** grows on the table's line and cone columns.
- **Specials:** gained at the dragon's own level, from the system's Creature Codex.
  - Elemental specials go by their printed name ("Freezing Aura").
  - Wild Stride comes from the core feats, free.
- **A lower level** (a GM's correction) takes back what the growth gave, Sweep included.
- **Earth dragon:** it has wings and Wing Buffet, but no fly speed (B10-4).

**Breath.**
- A 2 AP Focus ability: one use, which Refocus restores.
- A die a level of its base die (core C5), with a basic Reflex save at the level DC.

**Spells.** The block's own count at its base level, then one more a level (B10-6, core C10). High Magic means:
- spells from any tradition;
- DCs +2, Heighten free, Fumble +50.

**Wing Buffet** before the Wings arrive uses the core Wings at the dragon's size (B10-5, core C11).

**The feats:**
- **Deflecting Wings:** offered as a reaction before an attack on a Large dragon. +2 circumstance to DB against that attack.
- **Draconic Spell:** Use picks an arcane spell; it is added as an innate spell with the Focus trait.
- **Imitate Sound:** +4 is offered on Deception, ticked when the dragon mimics a sound.
- **Tail Lash:** Use is a reaction tail Strike at −2.

The core cannot read "Large Size", "Tail Attack" or "Light Dragon" as prerequisites. A dragon that takes the feat too early is warned on the screen of whoever added it.

**Losing a dragon** (B10-13):
- **Its death breaks the bond.** The acting GM sees every death the system knows, through Dying or the dead skull.
  - Soul Drain equal to its level, held by the bond: no rest or cure heals it (core C8).
  - Refocus checks at −2.
  - A point comes back every 7 days, by the clock or by daily preparations, whichever is more.
  - With the last point the −2 ends. The bond is then closed for good: one bond per lifetime.
- **Restored to life within a week** (the day it is restored is recorded), it re-bonds at the next daily preparation. After a week it goes insane, which is the GM's to play.
- **Separation** is the GM's toggle on the Dragon Tamer Use: Soul Drain of half its level, held, and the −2. Reunited, the next daily preparation's hour of meditation restores the bond.

## Corrections to the audit

- **The light dragon's DB** from the rules is **24**, which is what the book prints; the audit said 23. Only the **fire dragon** differs: **22** from the rules against 23 printed, as B10-10 ruled.
- **The light dragon's skill ranks** total **45**, exactly its budget; the audit said 46. Only the fire dragon overspends (66 of 48), which ships as printed (B10-7).

## Not modelled

- **The printed EL figures** (Cold 4, Earth 3, Fire 5, Light 4) are on each base dragon's sheet text only. The book gives no rule for how EL grows.
- **Left to the table:**
  - "Heard a language for an hour";
  - the hour's meditation itself;
  - the insane dragon;
  - re-spending lost feats.

## Review

An independent review found two bugs, six risks and some harness weaknesses. All were acted on except the player's permission to create the dragon's actor, which needs a live check:
- **A dead dragon could break the bond again** after full recovery (a spell striking its body). The bond is now closed for good.
- **Deaths by Fatigue 20 or Constitution −5** drew only the dead skull and were missed. The skull is now watched too.
- **The egg and the weekly recovery stalled on a table without a world clock.** Each daily preparation now counts.
- **Two overlapping growth runs** could duplicate grants. Runs are now queued per dragon.
- **"Within a week" was judged at the master's next preparation.** It is now judged from the recorded day of restoration.
- **Separated again before the reunion's meditation** laid the penalty twice. Now nothing is laid twice.
- **Sweep was never taken back.** It is now.
- **Core:** Soul Drain cards said "no longer suffering" while the hold kept it. The rest card counted held drain as healed. A release could raise drain the GM had already healed. All three are fixed in TRG Prime 3.674.0.

## Harness

- **`verify-block10`:** 116 checks; **`mutate-block10`:** 109 mutations, all caught.
- **Blocks 1 to 9 and the weapons** re-pinned to 1.0.0 and 3.674.0. Block 7's archetype count leaves Dragon Tamer to Block 10, and Block 1 counts the new pack.
