# Inner Tempest 1.0.1

28 October 2026. Fixes from the live test of 1.0.0 on TRG Prime 3.674.0 (`live-testing-report-3.674.0.md`). Graham: "Printed block for dragon db. Build fixes 1-5 and amend text on point 6".

- **Needs TRG Prime 3.674.1.** Install the system first.
- **No migration.** A dragon hatched under 1.0.0 is brought into step when the world loads: its growth effect loses the DB bonus, and its breath copy takes its own length.

## Fixed

**A dragon's DB is the printed block's** (Graham's ruling, 28 October, replacing B10-10's "the system's DB … fire 22").
- **The printed blocks follow the system's own Creature Codex rule for companions:**
  - an "other" bonus of half the level;
  - a status bonus of class bonus − 2.
- **All four blocks match:** Cold 19, Earth 19, Fire 23, Light 24. The fire and light dragons' "Status +1" is that rule.
- **The fault:** the growth effect also added the class bonus as a status bonus, which put every dragon 2 above its block (21 at level 4, 31 at level 10).
- **The fix:** the growth effect no longer adds anything to DB. The race text says so.

**The breath's length grows.**
- **The fault:** the system's codex inheritance laid the compendium entry's "15-foot cone" back over the dragon's own copy, so the length never moved. At Base +6 the card still said 15 feet.
- **The fix:** the copy now opts out of that inheritance and keeps the length the table gives it.

**Also fixed in TRG Prime 3.674.1:**
- **A player can hatch** their dragon: the GM's client creates the actor.
- **A hatchling arrives at full HP.**
- **High Magic is granted:** it had tied with Fiends & Fables' own "High Magic", which also stops the repeated "Apply Grants" cards.

**The hatching card agrees with the sheet.** Found in the retest: the card said Will +12 and the sheet +14. The dragon's printed feats, ranks and fields are now set before TRG Prime 3.674.1 writes the card.

## Harness

- **`verify-block10`:** 118 checks; **`mutate-block10`:** 111 mutations, all caught.
- **The printed DB is now checked against the system's own creature rule,** and matches all four blocks.
- **Blocks 1 to 9 and the weapons** re-pinned to 1.0.1 and 3.674.1.
