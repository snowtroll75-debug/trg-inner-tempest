# Inner Tempest 0.6.2: fixes from the 0.6.1 live test

24 October 2026.

Needs **TRG Prime 3.669.2**. Install that first. On an older system the module warns at start-up.

These fix what the live test of 0.6.1 found (`live-testing-report-3.669.1`). Graham's rulings of the same afternoon are B5-6 (Aid Another's ticks in its own dialog, built in the system) and B5-7 (the fix below for Many-Faceted Vigilance), and "fix the smaller things".

**Characters saved under 0.6.1 are mended when the GM loads the world.** A Kabuto with Many-Faceted Vigilance gets its +2. Nothing else is touched.

## Fixed

**1. Many-Faceted Vigilance raises Compound Eyes to +2** (B5-7).
- **Found live:** Compound Eyes stayed at +1, on a new Kabuto and after removing and re-adding the feat.
- **The cause:** Compound Eyes is an ability copied from this module's pack. TRG Prime lays a pack entry's declarations over every ability copy of the same name each time the item is prepared (its codex inheritance, since 3.631.0). 0.6.1's +2 was saved on the item, and the item the roll reads showed the pack's +1. Forgeheart's Zenki is a heritage, which inheritance does not touch, so it worked.
- **Now:**
  - **While the feat is held,** the copy opts out of inheritance (`codexInherit: false`, the system's own setting for a copy meant to differ), and its row is +2.
  - **Removing the feat** puts the +1 back and takes the opt-out off, if this module set it.
  - **Found in review, and fixed:**
    - a compendium refresh, which rewrites the item, is raised again at once;
    - with the row gone too, removing the feat still clears the record.
- **One consequence:** while the feat is held, that copy of Compound Eyes does not pick up later changes to the pack's entry. Removing the feat, or the next release that changes the entry, brings it back in step.

**2. A reaction is asked only when it could be spent.**
- **Found live:** a Fighter whose only reaction left was Battle Readiness's (an Attack or Martial reaction only) was asked about Guardian's Intercession, and refused when it answered. Nothing wrong was spent, but the question should not have come.
- **Now:**
  - **Guardian's Intercession:** through the system's defence offer (3.669.2).
  - **Waiting Blade, Form Reversal, Shadow Counter, Disciplined Flurry and Vanishing Retreat:** each is asked only when its reaction could be spent, read with its own traits. Waiting Blade (Attack) is still asked on Battle Readiness's reaction.
  - **Resist Dying:** its button is refused the same way, and it now spends the reaction through the system rather than writing the pool itself.

**3. From the system (3.669.2):**
- **Hive Coordination's +2** is asked in Aid Another's own dialog (B5-6).
- **Fortune's Reversal on a Blunder** says "blundered" and "the blunder is rerolled".
- **Tianzhi Discipline's first Refocus** shows "Critical — Declared — the dice do not count", not the unread dice's degree.

**Also:** the module's Block 5 deletions use Foundry 14's deletion operator. The older spelling still worked, but logged a deprecation warning each time (found in review).

## Checks

- **`verify-block5`:** 572 checks (553 before), and `mutate-block5` 108 mutations (87 before), all caught. The new checks:
  - **Many-Faceted Vigilance:** driven through the system's own codex inheritance, so the item the roll reads is what is checked;
  - **the 0.6.1 mending, the removal and the refresh;**
  - **`reactionOpen`**, driven, and every offer that uses it.
- **`mutate-block2`:** two anchors moved to Resist Dying's new lines, meaning unchanged; 93 caught.
- **Blocks 1 to 4 and the weapons:** re-pinned to 0.6.2 and 3.669.2; 380/55, 205/93, 1040/111, 1360/81, 117/33, all green and all caught.
- **Independent review** of the diff: no blocking defects. Its findings for this module are fixed above.
