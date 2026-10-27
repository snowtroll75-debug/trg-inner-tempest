# Inner Tempest 0.10.1: the Sash of Serenity on a forced save

27 October 2026. One fix, found while live testing 0.10.0.

- **Needs TRG Prime 3.673.0**, as 0.10.0 did. TRG Prime 3.673.1, released alongside, fixes the other live-test fault (Guarded's heal on the weapon card); this release does not need it.
- **Install over 0.10.0.**

## Fixed

**The Sash of Serenity's advantage was never taken on a forced save.**
- In the live test, the Sash's minute was running with "One Reflex save" chosen. A Reflex save forced on the wearer was rolled without the advantage, and nobody was asked.
- The advantage was a tick-box. A forced save asks no tick-boxes (Graham's ruling of 23 October), and most saves are forced, so the Sash almost never reached one.
- **Now the choice is made when the Sash is used.**
  - **Fortitude, Reflex or Will:** the advantage is taken on the wearer's next save of that kind within the minute, whether forced or rolled from the sheet, and is then spent. That ends the minute.
  - **"One saving throw of your choice":** this cannot be guessed, so it stays a tick-box. It is offered on saves rolled from the sheet and spent on the one ticked. The Use's card says a forced save will not ask, and that choosing a kind avoids this.
- Graham confirmed this reading of "advantage on one saving throw of your choice" on 27 October.
- The Use's question, its card and the item's sheet text say which way it works.

## Checks

- **`verify-block9`:** 83 checks (82 before).
  - The new check drives the Sash's minute through the system's own automatic route. A chosen Reflex is taken on a Reflex save and spent. It is not taken on a Will save. "Any" is never taken unasked.
  - The Use check now also reads the card.
- **`mutate-block9`:** 94 mutations, all caught (91 before).
  - New: the chosen kind stays a tick-box; "any" is taken unasked; the card still says to tick it.
  - The two Sash mutations from 0.10.0 are re-anchored to the new line.
- **Every module harness ran green:** `verify-block1` to `verify-block9` and `verify-weapons`, and `mutate-block1` to `mutate-block9` and `mutate-weapons`.
- **Re-pinned to 0.10.1:** Blocks 3 to 9 and the weapons.
- **Packs:** rebuilt for the Sash's sheet text.
