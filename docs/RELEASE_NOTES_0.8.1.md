# Inner Tempest 0.8.1: fixes from the 0.8.0 live test

25 October 2026.

Needs **TRG Prime 3.671.0** (unchanged). Install over 0.8.0.

The live test of 0.8.0 on 3.671.0 (`live-testing-report-3.671.0`) found Block 7 working but these two:

1. **Drawn Verdict's sheathe is offered at the end of your turn.** It never was: by the time the system announces a turn's end, the combat already points at the next turn, so the turn Drawn Verdict was used in never matched. It is now read by whose turn ended.
2. **A form's own Use asks Formbinder's question.** Pressing a form's own Use (Twin Dragon's, say) while holding one form replaced it without asking whether to add it beside. Combat Form's Use and a form's own Use now go one way: add or replace, and one form activated each turn.

## Checks

- **`verify-block7` 228 checks, `mutate-block7` 118 mutations:**
  - the sheathe is owed to that combatant's turn end, and not after a further Strike;
  - a form's own Use goes through the same Formbinder path.
- **Blocks 1 to 6 and the weapons,** re-pinned to 0.8.1.
