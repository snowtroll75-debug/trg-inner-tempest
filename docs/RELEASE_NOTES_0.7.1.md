# Inner Tempest 0.7.1: fixes from the 0.7.0 live test

25 October 2026.

Needs **TRG Prime 3.670.1**. Install that first.

The live test of 0.7.0 on 3.670.0 (`live-testing-report-3.670.0`) found everything in Block 6 working but these, fixed with Graham's leave the same day:

1. **Drunken Strike's Feint needs no Deception training.** A Disciple with no Deception ranks hit and the Feint was refused as "a Trained action". Your attack total is the Feint check (B6-3), so nothing is rolled with Deception; TRG Prime 3.670.1 no longer asks for the training. Nothing changes in this module's Drunken Strike.
2. **Moving straight away from an enemy now provokes,** which is what Mantis Stance's free first Move is measured against. Found while testing it; fixed in TRG Prime 3.670.1 for every creature.
3. **Monkey Stance's waived jump** now reads "(waived)" on the outcome card instead of "(+2 DC)" (TRG Prime 3.670.1).
4. **Disciplined Flurry's question** reads "spends your reaction and this technique's use" (it read "reactionand").

## Checks

- **`verify-block6` 183 checks, `mutate-block6` 85 mutations** (the 0.7.1 section: Disciplined Flurry's wording and the system's training rule for a Feint met by an attack's total).
- **Blocks 1 to 5 and the weapons,** re-pinned to 0.7.1 and 3.670.1: 380/55, 205/93, 1040/111, 1360/81, 572/108, 117/33, all green and every mutation caught.
