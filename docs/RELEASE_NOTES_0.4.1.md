# Inner Tempest 0.4.1

23 October 2026. Fixes from the live test of 0.4.0 (live-testing-report-3.667.0).

Needs **TRG Prime 3.667.1**. Install that first; it carries the two core fixes:
- **Techniques arrived short.** A Disciple's techniques (and Dragon's Pulse, and the Technique feats) arrived with 1 of their 2 uses under Deep Focus. They now arrive full.
- **No conviction point.** Disciple's Resolve and Mystical Resolve raised the conviction pool but gave no point. They now give it.

## Fixed in the module

- **Inner Strike's damage type is chosen free.**
  - **Before:** its card said to press Use again to change the type. That spent another use, and was refused once none were left.
  - **Now:** the card carries Force, Aligned, Negative and Positive buttons. Each re-types the running 1d6 (to 4d6) rider, free, as often as wanted before a Strike. This matches the book's "choose … each time you Strike".
- **Burst Step's card** read "now 70 ft" when the Speed was 60, because it added the 10 twice. The Speed itself was right.
- **Shadowy Stance's card** now says the stance lasts 1 minute and ends by itself. The core stance card says it lasts until you leave it.

## For Graham

One ordering to confirm, found live.
- **The order:** when an attack is rolled against a Mystic, the attacker's own "spend conviction for +1d6" prompt comes first. Alter the Thread is offered after it.
- **The consequence:** if the attacker spent conviction and the Mystic then rerolls, that +1d6 is lost with the old roll, because the new roll stands.
- **The alternative:** offer Alter the Thread first, so the attacker decides after seeing the final roll. Say if you'd prefer that.

The five readings in the 0.4.0 notes still stand for confirmation.

## Checks

- **`verify-block3`:** 1039 checks, including five for these fixes.
- **`mutate-block3`:** 108 mutations, all caught.
- **Blocks 1 and 2:** `verify-block1` 378 with `mutate-block1` 54, and `verify-block2` 205 with `mutate-block2` 93, all caught.
