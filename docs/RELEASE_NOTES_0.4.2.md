# Inner Tempest 0.4.2

23 October 2026. One fix from the live test of 0.4.1 (live-testing-report-it-0.4.1).

Needs **TRG Prime 3.667.3**. Install that first: it carries the core half of this fix.

## Inner Strike's +1 to unarmed attacks never applied

**Found live.**
- **What happened:** a 16th-level Disciple used Inner Strike and then made Strikes with their fists. The rider applied ("Inner Strike — 13 positive damage (4d6)"). The attack card, though, listed no "+1 status" from Inner Strike.
- **The card's promise:** it said the +1 was "ticked on the roll".

**Cause.**
- The +1 was written as a tick-box, because nothing could tell a fist from a sword.
- Only the check dialog offers tick-boxes. A weapon attack never opens that dialog, so the +1 was never offered, and so never applied.

**Fix.**
- **TRG Prime 3.667.3** gives a weapon attack's check its attack form: "unarmed" for your fists, a gauntlet or a Monastic weapon, "natural" for a claw or a bite, and "weapon" otherwise.
- **This release** scopes Inner Strike's +1 status to unarmed melee attacks and applies it automatically. A sword, a claw or a ranged attack gets nothing.
- **The card** now reads "(applied on the roll)".

## The same gap elsewhere: tick-boxes, now asked on attacks and Spellcraft

The live test found a wider gap. A tick-box modifier was offered only in the check dialog. The dialog opens for checks rolled from the sheet and for skill actions; a weapon attack, a Spellcraft check and a forced save never open it.

**Graham's ruling (23 October):** "Please build the proposed fix", scoped to "Attacks + Spellcraft". **TRG Prime 3.667.3** now asks, before the dice, the tick-boxes that a weapon attack or a Spellcraft check matches. No module change is needed for it.

| Ability | Tick-box | Now |
|---|---|---|
| **Spirit Stance** (Block 1) | +1 against a creature possessing another | **Asked on the attack.** While the stance is active, every attack against a non-spirit asks it, as the row is written. |
| **Echoes Beyond** (Block 3) | Advantage on a check that is part of a Focus technique or innate spell | **Asked on an attack or a Spellcraft check,** and spent when ticked. A save or a skill check rolled from the sheet offers it in the dialog, as before. |
| **Observe Technique** (Block 2) | +2 on a save against the observed creature's ability | **Unchanged: forced saves are not asked** (Graham's scope). A save rolled from the sheet names no source, so this row is offered on neither. It stays a hand ruling. |
| **Maintain Clarity** (Block 2) | Cancels a distraction penalty | **Now also asked on a Spellcraft check** whose spell carries Concentrate or Mental. A skill action with those traits offers it in its dialog, as before. |
| **Root the Body** (Block 2) | +N against being knocked prone or moved | **Unchanged:** offered on a check or save rolled from the sheet; not on a forced save. |

## Checks

- **`verify-block3`:** 1040 checks. Inner Strike's row is now asserted automatic, and to match an unarmed melee attack only: not a weapon, not an attack that names no form, and not a ranged one.
- **`mutate-block3`:** 111 mutations, all caught. The three new ones turn the +1 back into a tick-box, let it reach a sword, and put "ticked" back on the card.
- **Blocks 1 and 2:** `verify-block1` 378 with `mutate-block1` 54, and `verify-block2` 205 with `mutate-block2` 93, all caught. Their version anchors were re-pointed to 3.667.3.
