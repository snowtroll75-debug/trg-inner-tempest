# Live testing report: Inner Tempest 0.4.1

23 October 2026. Tested in Graham's world "TRG V14" (Foundry 14.367), at 127.0.0.1:30000, in the built-in browser as Testing Dude (GM). Installed: TRG Prime 3.667.2 and Inner Tempest 0.4.1.

**Result:** the three 0.4.1 fixes pass. The test found one new defect, Inner Strike's +1 to unarmed attacks, now fixed in Inner Tempest 0.4.2 with TRG Prime 3.667.3. It also showed the same gap in other tick-boxes. Graham ruled on it, and 3.667.3 now asks them on attacks and Spellcraft.

## Set-up

ZZ Disciple, 16th level (XP 160,000), Devoted path, with Inner Strike, Shadowy Stance and an Unarmed Strike. Also ZZ Target, an NPC. Inner Strike and Shadowy Stance arrived at 2 of 2 uses under Deep Focus, the 3.667.1 fix again.

## The 0.4.1 fixes

**Inner Strike's type is changed free.**
- **Use:** the type picker offered Force, Aligned, Negative and Positive. Force was chosen.
  - The effect read "Inner Strike (4d6 force)", and the use went 2 → 1.
  - The card carried the four type buttons.
- **Negative pressed** (a real mouse click): the effect became "Inner Strike (4d6 negative)", with the rider's type negative.
  - The use stayed at 1 of 2, and no new card was posted.
  - The notice read "Inner Strike: 4d6 negative on your Strikes from now".
- **With no use left:** the uses were set to 0 of 2 and Positive pressed. The effect re-typed to positive.
- **A Strike against ZZ Target:** the damage card read "Inner Strike — 13 positive damage (4d6)".

**Burst Step's card**
- It reads "+10 ft to your Speed (now 60 ft)".
- The Speed breakdown agrees: base 30, Incredible Movement +20 and Burst Step +10 make 60. With Burst Step disabled it is 50.

**Shadowy Stance's card**
- It reads "Shadowy Stance lasts 1 minute, then ends by itself", under the core's stance line.
- The use went 2 → 1, and the effect is set to end 60 seconds on.
- World time was not advanced, so as not to move the campaign calendar. The 3.667.0 test saw it end.

## Defect found: Inner Strike's +1 to unarmed attacks never applied

**What happened.** The Strike above listed "BAB and ability +16" and no Inner Strike +1. The card had said the +1 is "ticked on the roll".

**Why.**
- The +1 was a tick-box (`auto: false`).
- Tick-boxes are offered only in the check dialog, which opens for checks rolled from the sheet and for skill actions.
- A weapon attack never opens it, with or without Shift. So the +1 was never offered.

**Fixed in Inner Tempest 0.4.2 with TRG Prime 3.667.3.**
- **The core:** a weapon attack's check now carries its form ("unarmed" for the fists, a gauntlet or a Monastic weapon).
- **The module:** scopes the +1 to unarmed melee attacks and applies it automatically.

## The same gap elsewhere: ruled and built

These were found by reading the code, not live-tested. A tick-box was never offered on a roll that opens no dialog: a weapon attack, a Spellcraft check or a forced save. In Inner Tempest that left Spirit Stance's possession clause, Echoes Beyond, Observe Technique, Maintain Clarity and Root the Body on a forced save unoffered.

**Graham's ruling:** "Please build the proposed fix", for "Attacks + Spellcraft".
- **TRG Prime 3.667.3** asks the matching tick-boxes in one small prompt before a weapon attack or a Spellcraft check.
- **Forced saves stay as they were.** 62 save tick-boxes across the core, Pillars of Faith and Inner Tempest are written as "tick if this save is against X", and asking them on every forced save would be noise.

## Console

No errors from either release. The only errors were Foundry's own: a server reconnection after the install, and window-size warnings.

## Cleanup

Removed: the ZZ folder, ZZ Disciple and ZZ Target, the ZZ scene, and the 14 chat messages the test posted. Chat is back to its 229 messages, ending at the same message as before. No Gamemaster messages were touched. The GM view is on Oldwatch Main, and the viewport is reset.
