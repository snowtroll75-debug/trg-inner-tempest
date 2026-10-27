# Inner Tempest 0.10.2: Graham's answers on two items

27 October 2026. Two GM notes changed to record Graham's rulings. Nothing changes in play: both rulings confirm what was built.

- **Needs TRG Prime 3.673.0**, as before. TRG Prime 3.673.2, released alongside, ends a timed rune's double expiry card (Harmony, Graceful Wind, the Incense Burner).
- **Install over 0.10.0 or 0.10.1.** It carries 0.10.1's Sash of Serenity fix.

## Changed

- **Harmonious Do-maru: DB +1.** The book prints DB +0, but the item's Potency I gives +1. Graham ruled that Potency I applies. The GM note no longer suggests removing it, and records the ruling.
- **Spiritblade: fumble DC 11.** This is the Nodachi's 12, less 1 for Balanced. Graham confirmed it, and the GM note says so.
- Both answers are added to `docs/INNER_TEMPEST_RULINGS_2026-10-26-B9.md`.

## Checks

- **`verify-block9`:** 84 checks (83 at 0.10.1). New: both notes carry the rulings, and the Do-maru's note no longer offers to remove Potency I.
- **`mutate-block9`:** 96 mutations, all caught (94 at 0.10.1).
- **Every module harness ran green:** `verify-block1` to `verify-block9` and `verify-weapons`, and their mutation pairs.
- **Re-pinned to 0.10.2:** Blocks 3 to 9 and the weapons.
- **Packs:** rebuilt.
