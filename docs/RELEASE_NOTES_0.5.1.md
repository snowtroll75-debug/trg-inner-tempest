# Inner Tempest 0.5.1: Chapter 6's weapons, and fixes from the 0.5.0 live test

23 October 2026.

Needs **TRG Prime 3.668.1**. Install that first. On an older system the module warns at start-up, and Combat Form's learning step and the new weapon traits do not work.

Built to Graham's answers to the four questions in the 0.5.0 notes (`docs/INNER_TEMPEST_RULINGS_2026-10-23.md`, "After 0.5.0"):
1. Deflect Arrow keeps needing Evade.
2. Chapter 6's weapons are added, weapons only.
3. Iron Tortoise includes the Trip.
4. Form Reversal does not count as your turn's Flourish.

## Chapter 6's weapons

A new compendium, **Inner Tempest: Weapons**, holds the sixteen weapons from Chapter 6's tables. It extends the system's Weapons pack, so they appear beside the core weapons.

| Table | Weapons |
|---|---|
| Simple | Hanbo, Katar |
| Martial | Bo Staff, Fighting Fan, Jutte, Kama, Kusarigama, Nunchaku, Sai, Tonfa |
| Exotic | Butterfly Sword, Meteor Hammer, Naginata, Nodachi, Tetsubo, Wakizashi |

**How they were made:**
- **The table and text are read from the book,** never retyped:
  - price, level, damage, size, fumble DC, weight, group and traits;
  - each weapon's description;
  - the book's paragraph for any Chapter 6 trait it carries.
- **Two traits are written the way the system reads them:**
  - "Versatile - S" is written "Versatile S";
  - the Meteor Hammer's "Reach (15 ft.)" is written "Reach", with a 15-foot reach set on the weapon (the Whip's pattern). Each such weapon's description keeps the traits as printed.
- **Exotic weapons carry the Exotic trait,** as the core pack's exotic weapons do.
- **The Fighting Fan prints no weight,** so it weighs 0.
- **The icons** are the nearest of TRG Prime's own weapon images. The module ships no art.

**The traits, in play:**
- **Monastic** (twelve weapons): what applies to an unarmed strike applies to them (since TRG Prime 3.667.0).
- **Backswing** (the Nunchaku): a Strike that misses, or hits and inflicts no damage, does not count towards your multiple attack penalty. Its runes' damage counts as damage inflicted.
  - In Double Slice, or a compound action that counts its Strikes afterwards, such a Strike is not counted.
  - A feat that prices the whole action costs nothing when none of its Strikes inflicted damage.
- **Brace** (the Nodachi): a Strike made through Ready against a mounted target gains +2 circumstance and one more die of base damage.
- **Twin** (the Tonfa and the Butterfly Sword): in Double Slice with two Twin weapons, when both swings hit and inflict damage, each deals 1 more damage after the pair. Nothing more is dealt if the pair has already dropped the target, so it does not worsen Dying.
- **Parry, Reach, Trip, Disarm, Shove, Keen, Deadly, Concealable, Versatile and AR** work as on any core weapon.

**Who is proficient,** as the system now reads it:

| Class | Proficient with |
|---|---|
| Disciple, Mystic and Ghostwalker | The simple weapons, and every Monastic weapon, including the exotic Butterfly Sword and Meteor Hammer |
| Ghostwalker and Oathblade | The Wakizashi as well (registered at 0.5.0) |
| Kensai and Oathblade | The simple and martial weapons |

## Fixes from the 0.5.0 live test

- **Combat Form's learning step spent its use.**
  - **What happened:** the system's Use button spent the use whenever the handler posted a card, and learning a form posts one. The next press was then refused.
  - **Now:** Combat Form declares that it manages its own use (TRG Prime 3.668.1). Learning is free, even while Combat Form is expended. Entering a form still needs the use and spends it.
- **Misdirecting Whisper spent its AP and use when the Feint was refused.**
  - **What happened:** a Ghostwalker untrained in Deception lost both, the card said the Feint was rolled, and the advantage effect was left behind.
  - **Now:** the check is rolled first. The AP and the use are spent only when the check was rolled. A refusal spends nothing and removes the advantage. The AP is still checked before the roll.
- **Flow Strike's penalty line** read "Multiple Attack Penalty (attack 2) −10". It now reads "Multiple Attack Penalty (Flow Strike) −10" (core).

## Graham's answers, built

- **Iron Tortoise:** "All attempts to push or move you" now includes the Trip. Shove, Reposition and Trip against you are rolled at disadvantage, and the form's text says so.
- **Deflect Arrow and Form Reversal:** unchanged, as ruled.
- **The Wakizashi** is now in the pack, so the Ghostwalker's and Oathblade's proficiency by name has a weapon to match.

## Not automated, said on the items

- **The Butterfly Sword:** "Both weapons can be drawn as a single Interact (1 AP) action and separated as a Free (0 AP) action", and a rune that works "only if the weapons are wielded together", are the GM's.

## For Graham

1. **The Butterfly Sword: one sword, or the pair?** The table prints one price (20 gp) and weight (1 lb), and the text calls them "these paired short swords". The pack item is one sword, so Double Slice and Twin need two on the character, at 20 gp each. Is 20 gp the price of the pair? If so, the item should be the pair, and Double Slice needs a way to use one item as two weapons.
2. **Backswing and a held blow.** Black Lotus's held blow deals its damage at the start of the target's turn. A held blow with the Nunchaku counts towards the penalty when it is made, because its damage is still to come. Should it be taken back if the landed blow inflicts nothing?
3. **Twin: any two Twin weapons, or a matched pair?** "These weapons are used as a pair." Twin now applies to any two Twin weapons, so a Tonfa with a Butterfly Sword qualifies. Should it need two of the same weapon?

## Checks

- **New harness pair `verify/mutate-weapons`:** 117 checks and 33 mutations, all caught. Covered:
  - every cell of the three tables, read into its field;
  - every description and trait paragraph printed, and nothing else claiming to be printed;
  - reach, versatile, Monastic and AR as the system reads them;
  - the three new traits;
  - each class's proficiency, through the system's own rules;
  - the pack, the registered traits and the versions;
  - the three fixes and Iron Tortoise's Trip.
- **All five pairs were run against the staged TRG Prime 3.668.1.**
- **Blocks 1 to 4:** re-pinned to 0.5.1 on 3.668.1, and Iron Tortoise's check turned round to include the Trip. Results: 380/54, 205/93, 1040/111, 1360/81, all caught. Block 1 gained two checks, for the new pack.
