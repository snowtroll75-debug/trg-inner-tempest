# Live testing report: TRG Prime 3.671.0 and Inner Tempest 0.8.0

25 October 2026, evening. World "TRG V14" (Foundry 14.367), as the GM (Testing Dude at 127.0.0.1:30000), and as the player Test PC 1 (localhost:30000) for Restorative Palm.

**The cast:** sixteen ZZ actors (a Kensai, two Fighters, two Oathblades, a Disciple Jade Physician owned by Test PC 1, a Rogue, a Druid, a Wizard, a Ghostwalker, a Disciple, a Mystic and a second Mystic, two Bugbears), on a test scene, with a combat taken to round 7.

**Result:** Block 7 works live. Two module defects found, both fixed as **Inner Tempest 0.8.1** (no core change). No console errors from either release.

## Passed

**The archetype picker:**
- A Kensai is offered Formbinder, Brawler and Steel Disciple, and the core Vanguard and Mastermind (FA-22) beside the tier rule's Archer and Armour Master (B7-8).
- An Oathblade is offered Iaijutsu Master and Ronin once it has the ranks.
- Steel Disciple's progression "BAB +12." holds back a second archetype at BAB 10 ("aren't met yet") and lets one through at BAB 12 (C1, the trailing full stop).
- Shugenja is offered to a Wizard (learned), and not to the same Wizard holding Enigma (instinctive; review fix).

**Class feats opened by an archetype** (review fix):
- A Fighter with Steel Disciple is offered Blended Form, Deflect Arrow, Disciplined Follow-Through, Extra Form and Form Reversal.
- With Brawler as well: Dancing Leaf, Stunning Fist and the six stances. Shadowy Step stays out (it needs Stealth 5).
- A Zen Archer Fighter is newly offered Far Shot and Quick Reload (it counts as Archer, C3).

**Steel Disciple:** the class-skill choice (Athletics made a class skill) and the Kensai form (Iron Tortoise). Its Use entered it as a stance with no Combat Form.

**Ronin:**
- Deception became a class skill.
- At daily preparation Wandering Creed asked for the oath. Oath of Fealty replaced Oath of Honour, stamped as Sworn Oath's choice, then the Sworn Charge question followed (one question, not two).
- Sworn Oath's Use then said "you chose Oath of Fealty" and granted nothing.
- A second daily preparation kept Fealty and asked "Keep them?".

**Iaijutsu Master:**
- Initiative with the katana sheathed: "+25 Iaijutsu Master Class". With it drawn: no +25.
- **Drawn Verdict:**
  - refused a target 15 feet away ("not within your sword's reach"; review fix);
  - a cancelled attack put the katana back and spent no AP or use (review fix);
  - made, it drew the katana, struck with no reaction offered (no critical replacement on a critical), dealt 20 and left "Drawn Verdict: no reactions" on the Bugbear;
  - the system's reaction refusal read it.

**Turning the Blade:**
- With the Challenge on Foe B, Foe A's Greatsword hit for 15.
- The reaction was offered; taken, the Challenge moved to Foe A with Oath of Fealty, and the reaction was spent.

**Restorative Palm, from the player's client, on a character the player does not own** (review fix):
- Bleeding 1 → 0, the card posted by the GM's client, the hour's immunity recorded on the target, 2 AP and a use spent.
- A second Use was refused: "immune to Restorative Palm for 1 hour".

**Formbinder:**
- Combat Form owed 4 forms, not counting Twin Dragon.
- A second form the same turn was refused ("already activated a form this turn") with nothing spent.
- The next turn: "Formbinder: Echoing Crane + Iron Tortoise". DB +3 from Echoing Crane; Iron Tortoise's +1 shown not applied (the greater of the two, C15).

**Twin Dragon:** a hit gave "+1 class bonus to DB until the start of your next turn"; an attack that missed gave "+1 damage until the end of your next turn".

**Night Lotus Venom:**
- Coated the dagger (named on the card).
- Delivered on the dagger's critical: Fortitude against DC 24, a Fumble, Paralyzed then Slowed 1. The coating was spent.
- Night Lotus gave poison resistance and Medicine as a class skill.

**Soul Weapon Master:**
- Bonded the katana.
- Flurry of Blows used it: two Strikes with the katana's own die, "Soul-Bound Weapon +3: total damage" at BAB 10, DR once, one injury.

**Brawler's fists:**
- The Unarmed Strike offered Versatile.
- Its damage was "5d6 + 3 + 4": d6 dice, the BAB die and the critical's two, and "Powerful Fists (Brawler) +4" at BAB 12.

**Shugenja:**
- Element Fire: the list held Fire and Light spells of any tradition.
- Burning Hands and Flare were granted as Focus innate spells.
- A daily preparation replaced them with Fairy Fire and Fire Bolt.

**Harmony Warden:**
- The trance listed Verdant Utility spells up to PP 6 at 10th level. Jump was cast once as an innate spell; the card followed the cast.
- On Refocus the +4 is an unticked "wilderness" row.

**Veilborn:**
- Learned Veiled Body outside the table.
- Using it gave "Veilborn (+1 DB)".
- The Refocus dialog offered "+2 class — Veilborn" pre-ticked, and the roll carried it (review fix: the dialog now knows what is restored).

**Tanuki Trickster** on a Kensai with no Path:
- The two spells waited ("pathOwed").
- Choosing the Magical Tradition (arcane) stamped them with arcane and Intelligence (IT-M6).

**Oathbound:** Mental Focus a class skill, and the katana martial and proficient. Bound Challenge cost 1 AP and a conviction point (4 → 3).

**Twin Path:** Inner Flame as the second discipline, giving Flame Within and its 1st-level spells, Orb Of Fire and Circle Of Warmth.

**Lotus Enchanter:**
- Mystic Essence offered 21 Enchantment specialist spells (and no other specialists).
- Cloud Mind was granted with "+1 class, Lotus Enchanter". Cast, its DC was 24 "(Lotus Enchanter +1)".

## Found, and fixed in 0.8.1

1. **Drawn Verdict's sheathe was never offered.** By the time a turn's end is announced the combat already points at the next turn, so the record of the turn Drawn Verdict was used in never matched. It is now read by the combatant whose turn ended.
2. **A form's own Use replaced the held form without Formbinder's question** (Twin Dragon's Use dropped the pair). Combat Form's Use and a form's own Use now share one path: the add-or-replace question and the one-a-turn rule.

## Console

No errors from either release. Present: the lost-connection errors from the server restart before I joined, the invalid-package warnings for old folders, Foundry's own "pull to scene" error when I pulled Test PC 1 before giving it the scene, and the screen-size warnings of the hidden pane.

## Clean-up

- **Deleted:**
  - the combat (Borin Slatevein's Oath of Fealty partner effect went with it);
  - the ZZ B7 scene, the sixteen ZZ actors and the ZZ Test folder;
  - 149 chat messages, all posted by Testing Dude or Test PC 1.
- **Chat** is back at 229 messages, ending at fCCjtxxEB8fzcJEU.
- **Pause and clock:** paused, and the world clock set back to 11896839452.
- **View:** Oldwatch Main, the viewport reset. Macros unchanged at 4.
- **The player session** (Test PC 1) was closed.

## Retest of 0.8.1 (same evening)

Installed by Graham. Inner Tempest 0.8.1 on TRG Prime 3.671.0; no registration problems; no console errors from either release.
1. **Drawn Verdict's sheathe:**
   - Drawn Verdict hit ZZ Foe A. At the end of the Iaijutsu Master's turn: "You made no further Strike after Drawn Verdict. Sheathe Katana (Free, 0 AP)?".
   - Answered Yes: the katana was carried again, unwielded, and the record cleared.
2. **A form's own Use and Formbinder:**
   - Holding Echoing Crane, Twin Dragon's own Use asked "Add Twin Dragon beside it, or replace it?". Added the same turn, it was refused ("already activated a form this turn").
   - Added the next turn: "Formbinder: Echoing Crane + Twin Dragon".

Both pass. Clean-up as before: the combat, the retest scene, the three ZZ actors and the folder deleted; 20 chat messages by Testing Dude deleted (chat back at 229, ending at fCCjtxxEB8fzcJEU); paused, clock 11896839452; Oldwatch Main; macros 4.
