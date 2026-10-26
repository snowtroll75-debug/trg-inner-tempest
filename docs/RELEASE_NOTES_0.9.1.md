# Inner Tempest 0.9.1: fixes from the 0.9.0 live test

26 October 2026.

Needs **TRG Prime 3.672.0**, as 0.9.0 did. There is no system change. Install over 0.9.0.

## Fixed

1. **Root raised a Trip's DC twice.**
   - The system meets a Trip at the higher of the target's Acrobatics and Fortitude DCs, and a row naming either DC raises that Trip once.
   - Root carried two rows, one on each DC, and both were counted. In the live test a Trip against a rooted goblin (Fortitude DC 16, Acrobatics DC 9, Root warped to +4) met DC 24 instead of 20.
   - Root now has one row: a Shove, Trip or Reposition meets its Fortitude DC +2, and a Trip the higher of the two DCs +2, once. Warped, the bonus still stops at +4.
2. **Arrows Flight's cast card printed the book text as HTML tags.**
   - The spell had no row for the system to apply (its projectiles are chosen after the cast). The system therefore took it for a spell it cannot automate and printed its description under the result. The module's descriptions are HTML, so the card showed the tags as text.
   - Arrows Flight now carries a note saying what happens next, and the description is no longer printed. None of the other twelve Block 8 spells are affected.
3. **Root's line on the cast card** now reads "… anyone rolls against to move or trip it" (it read "… to resisting being moved or tripped").

## Checks

- `verify-block8`: 123 checks (120 before).
  - Root's rows are now laid on a stand-in creature and read through the system's own Trip, Shove, Reposition and Disarm DCs: +2, +2, +2 and nothing.
  - Arrows Flight's card no longer gets the description.
- `mutate-block8`: 66 mutations, all caught. The new mutations include the Acrobatics row coming back and Arrows Flight losing its note.
- Every module harness ran green: `verify-block1` to `verify-block8` and `verify-weapons`. Blocks 3 to 8 and the weapons are re-pinned to 0.9.1, and `mutate-block4`, `-6`, `-7` and `-8` were rerun.
