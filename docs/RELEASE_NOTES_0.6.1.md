# Inner Tempest 0.6.1: fixes from the Block 5 live tests

24 October 2026.

Needs **TRG Prime 3.669.1**. Install that first. On an older system the module warns at start-up.

These fix what the live tests of 0.6.0 found (`live-testing-report-it-0.6.0` and its part 2), including as a player. Graham's ruling B5-5 (a Blunder gets Fortune's Reversal too) is in the system, 3.669.1.

**Characters made under 0.6.0 are brought into step when the GM loads the world.** The Raptorial Blade gains its AR on its trait line, and Forgeheart's and Many-Faceted Vigilance's ticks are raised. Nothing else is touched, and nothing changes when nothing needs to. Characters on an unlinked token only are fixed the next time their blade or feat is added. Otherwise, press Raptorial Refinement's Use, or remove and re-add the feat.

## Fixed

**1. The Raptorial Blade's Armour Rending now applies.**
- **The cause:** TRG Prime reads a weapon's AR from its trait line ("AR 1"), as every core weapon prints it. The blade had its AR only in the item's field, so it never applied, since 0.1.
- **Now:**
  - the blade's traits carry "AR 1";
  - Raptorial Refinement makes it "AR 2" (with Versatile P);
  - removing the feat puts "AR 1" back.

**2. Awaken the Animism's Speed bonuses now apply:** the Ren's +10 feet Speed, and the Orochi's +10 feet Swim. They were written to the whole Speed entry (an object), which added nothing. They are now untyped bonuses, as Block 3's Speed bonuses are.

**3. Mist Veil's concealment lasts to the start of your next turn.**
- **The cause:** with Simple Calendar's clock running in real time while the game is unpaused, the mist's switch carried a 12-second world-time limit. The next aura refresh after that lifted every Concealed, long before your next turn.
- **Now:** in combat, the mist's effect ends at the start of your next turn, and the switch with it. Out of combat the seconds stand.
- **Spirit Beacon's switch** had the same exposure (a minute of world seconds), and is held the same way: its effect's ten rounds end it.

**4. Forgeheart and Many-Faceted Vigilance raise the existing tick.**
- **The book:** "the racial bonus granted by your Zenki heritage [Compound Eyes] … increases from +1 to +2".
- **Before:** each feat added its own +2 tick beside the heritage's or ability's +1, so ticking both gave +3.
- **Now:** while you have the feat, the Zenki heritage's Crafting tick and Compound Eyes' visual Perception tick are +2. Removing the feat puts them back to +1.

**5. Reactions follow Battle Readiness.** This module's reaction feats wrote the reaction pool themselves, so a Fighter could spend Battle Readiness's extra reaction on any of them. They now spend through the system (3.669.1), read with the feat's traits; that extra reaction only serves an Attack or Martial one.
- **Still allowed:** Waiting Blade (Attack).
- **Not on that extra reaction:** Guardian's Intercession, Fortune's Reversal and the other non-Attack, non-Martial reactions.

**6. Spirit Roar asks for conviction once.** One Demoralise is met by every enemy. The first enemy's check is the one asked; the others meet its +1d6 when spent (3.669.1).

**7. Hive Coordination's +2 is asked on Aid Another** (3.669.1 names the action), not only on Aid Offensive and Aid Defensive.

## Checks

- **`verify-block5`:** 553 checks (542 before), and `mutate-block5` 87 mutations (66 before), all caught. The new checks:
  - the blade's AR text;
  - the typed Speed bonuses;
  - the switch in and out of combat;
  - the raised ticks, and their wiring and start-up pass;
  - the reaction spend;
  - Spirit Roar's shared die, and Hive's Aid Another.
- **`verify/mutate-block1`:** 380 checks and 55 mutations, the blade's AR text added.
- **Blocks 2 to 4 and the weapons:** re-pinned to 0.6.1 and 3.669.1; 205/93, 1040/111, 1360/81, 117/33, all green and all caught.
