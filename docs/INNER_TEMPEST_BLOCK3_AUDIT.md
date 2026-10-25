# Inner Tempest Block 3: audit (Disciple, Mystic, Monastic Paths, Mystical Disciplines, Inner Discipline)

22 October 2026. Read against the book (v1.2), the rulings of 20 and 21 October, and TRG Prime **3.666.4**.

## Scope

| Group | Features | Inventory |
|---|---|---|
| Classes | Disciple, Mystic (class items, tables, skills, proficiencies, HP, wealth) | CL-01, CL-04 |
| Disciple | Powerful Fists, Disciple's Dodge, Disciple's Resolve, Flurry of Blows, bonus feats, Deep Focus, Monastic Path, Incredible Movement | CF-D1 to CF-D8 |
| Mystic | Alter the Thread, bonus feats, Mystical Discipline, Mystical Power, Mystical Resolve, Monastic Path | CF-M1 to CF-M6 |
| Monastic Paths | Devoted, Illuminator, Primal, Transcendent | SYS-07, SYS-08 |
| Disciplines | Inner Flame, Dragon Soul, Still Mind, Starborn Flow, Thousand Reflections, each with its ability and 9 levelled spells | MD-01 to MD-05 |
| Inner Discipline | the feat and its three techniques (Disciplined Flurry, Burst Step, Guarded Centre) | FC-28, FC-28a to c |
| Book-wide | Technique trait, Technique Save DC, Deep Focus restoring all uses, innate spell rules | SYS-03 to SYS-06, SYS-13 |
| Held over from Block 2 | Steel the Mind's reaction, waiting on Inner Discipline | SA-11 |

**Already ruled:**
- every class ability with no stated level is gained at 1st (IT-C4);
- Mystic eligibility is base PP ≤ Mystic level (IT-C3, in v1.2);
- Deep Focus restores all uses (IT-M2);
- Flame Within has no Focus trait (IT-M3, in v1.2);
- Inner Discipline's prerequisites stand (IT-M4);
- the Technique DC (IT-M5);
- the tradition fallback for characters without a Path (IT-M6).

## What the system already has

- **Class items:** the class pack shape, a levelled `classAbilities` list, a progression table with BAB, BDB, saves and bonus feats, and `registerClass` for proficiency and wealth. Pillars of Faith's five classes use the same path.
- **Conviction from the two Resolve abilities:** the `convictionPool` declaration (Fuku, Block 1).
- **Deep Focus:** `focusExtraUses` with `restoresAll` (D2, 3.664.0).
- **Innate spells:** `grantInnate` and `grantedSpellAbility` on a granting item (Hikari, Block 1). An ability item may grant **levelled** spells (Pillars of Faith's disciplines).
- **Reactions when targeted:** `registerDefenceOffer` (3.666.1), used by Evade and Impact Absorption.
- **Reactions before a save:** `saveBonusReaction` (3.666.0), built for Steel the Mind.
- **Stances:** `helpers.enterStance` (D7), for Shadowy Stance.
- **Paired strikes:** core's Double Slice already pairs two Strikes with DR applied once and a single critical. Flurry of Blows is the same shape, except that the multiple attack penalty runs normally.

## Not in the system yet: core work for TRG Prime 3.667.0

| # | Needed by | What |
|---|---|---|
| C1 | Disciple's Dodge, Incredible Movement | **Stat rows that depend on armour and load** (the narrow form of D9). `statBonuses: [{target: "db"\|"speed", type, ability?, value?, byLevel?, when: {unarmoured, unencumbered}}]`, applied in preparation after armour and encumbrance are known, so the sheet's DB and Speed show them. |
| C2 | Powerful Fists | **Unarmed damage** (D12). `unarmedDamage {die, versatile, perBAB: {every: 3, value: 1}}` and `strikeCountsAs {magical: 3, coldIron: 8, silver: 8, adamantine: 16}` (by BAB), on the Unarmed Strike and on Monastic weapons. |
| C3 | Flurry of Blows, Stunning Fist, Inner Strike | **Monastic counts as unarmed** (D11). One predicate, `countsAsUnarmed(weapon)`: true for unarmed Strikes and for weapons with the Monastic trait. No core weapon carries Monastic yet; Block 9's gear will. |
| C4 | Flurry of Blows, Disciplined Flurry | **A strike pair that keeps the multiple attack penalty.** Double Slice's pairing (damage combined, DR once, one critical injury) with the penalty applied to each Strike as normal. Plus an optional third Strike for Disciplined Flurry. |
| C5 | Alter the Thread | **An attacker's reroll paid for by the defender's conviction.** A button on an attack card against a creature that declares it. It spends the defender's conviction, then rolls the attack again and settles the hit from the new roll. A Chaos result cannot be rerolled. |
| C6 | Mystic grants | **The innate PP limit for granted spells.** Depends on ruling B3-2. |
| C7 | Discipline and Mystical Power spells | **A granted innate spell that uses the Path's ability.** `grantedSpellAbility: "path"` resolves to the character's Monastic Path ability when the spell is granted. Today the field holds one fixed ability. |
| C8 | Flame Within, Burst Step | **Hooks for damage taken or dealt, and for actions with the Movement trait.** Core announces strikes, spells and resolved actions, but not damage applied or a Stride or Step taken. |

## Interpretations I will build unless you rule otherwise

1. **Powerful Fists, versatile bludgeoning.** Core's Unarmed Strike deals **subdual** damage. "Versatile bludgeoning" lets the Disciple choose lethal bludgeoning or subdual for each Strike, as Versatile does elsewhere.
2. **Powerful Fists' +1 per 3 BAB** is added to the damage total, after the dice. It is not base damage, so a critical does not multiply it (the book says "total… not base").
3. **Disciple's Dodge** checks armour and encumbrance only; a shield does not switch it off.
4. **Incredible Movement** checks armour only, as printed. It gives +10 ft at 4th, +15 at 10th and +20 at 16th.
5. **Flurry of Blows and Monastic weapons:** Flurry also works with Monastic weapons, by Chapter 6's rule (C3).
6. **Disciplined Flurry.** The third Strike is part of the Flurry, so DR applies once and there is still only one critical injury. It is made at the highest attack bonus, with no multiple attack penalty. Whether it then counts towards the penalty is ruling B3-4.
7. **Guarded Centre and Echo Form last until the start of your next turn,** against every attack, as printed. This differs from Nimble Dodge's one attack because their text says so.
8. **Burst Step's +10 ft applies to the movement that triggered it,** and lasts until your next turn.
9. **Dragon's Pulse** is offered on a hit with a melee attack or a Focus technique. It adds Wisdom (minimum 1) to base damage, +1 at 6th, 12th and 18th, and is then expended.
10. **Centred Awareness and Echoes Beyond** are offered on the check they name, as advantage, and are then expended.
11. **Discipline spells use the Path's tradition and ability,** whatever the core spell's own tradition list says. The Mystic text says so: "the magical tradition and magical ability score of your Mystic spells are determined by your Monastic Path."
12. **Inner Discipline** is a feat whose own Focus trait means nothing further. Its three techniques are separate Focus abilities, each with one use (two with Deep Focus).
13. **Deep Focus** covers techniques, not spells. A Disciple's innate spells (Inner Magic, Mystic Essence) keep one use.
14. **A Mystical Power pick** is offered from a picker on the ability's Use button. It counts 2 cantrips and 2 spells of base PP 2 at 1st, then one more eligible spell for each level after 1st.
15. **Steel the Mind** gets its reaction now that Inner Discipline exists, using `saveBonusReaction`.
16. **Minimum key ability scores** are a warning, as ruled for m9.

## Rulings needed

- **B3-1 Scope.** Two things Block 3 needs live in later blocks:
  - **Discipline spells.** 11 of the 45 discipline spells are new Grimoire spells (Block 8):
    - Inner Flame: Burning Stride, Rise of the Phoenix, Aura of Heat;
    - Dragon Soul: Dragon Fear, Breath of the Dragon;
    - Still Mind: Reflective Mind, Serene Defence;
    - Starborn Flow: Burst of Speed, Air Step, Timeless Motion;
    - Thousand Reflections: Hand of Tide.
    
    A 1st-level Starborn Flow Mystic is owed Burst of Speed straight away.
  - **Technique class feats (11).** A 1st-level Disciple or Mystic must take a Technique class feat, and those are Block 6:
    - available at 1st: Inner Infusion, Inner Rush, Inner Sight, Inner Stamina, Inner Strike, Shadowy Stance;
    - later: Action Before Thought, Abundant Step, Bounding Step, Inner Blast, Inner Mind.
  - **Proposal:** bring both sets into Block 3.
- **B3-2 The innate PP limit against the Mystic's own tables.**
  - Ruling IT-C6/C7 (built as core D16) refuses an innate spell whose base PP is above the character's level.
  - Every discipline grant is one above the level it arrives at: PP 2 at 1st, 4 at 3rd, 6 at 5th, through to 16 at 15th. The 1st-level picks include two PP 2 spells.
  - Under D16, each of these could not be cast until the next level.
  - **Proposal:** the Mystic's discipline spells and its 1st-level PP 2 picks may be cast at base PP up to level + 1. Everything else stays at D16's level.
- **B3-3 Flame Within.**
  - The text says "+1 circumstance to attack checks **for 1 round** (stacking up to +3). This **resets when you end your turn without taking or dealing damage**."
  - **Proposal:** the reset rule governs. Each time you take damage, add +1, up to +3. The bonus stays until you end a turn in which you neither took nor dealt damage. "For 1 round" then adds nothing.
- **B3-4 Disciplined Flurry and the multiple attack penalty.**
  - The third Strike is made "at your highest Combat Bonus".
  - **Proposal:** it takes no penalty itself, but it counts as an attack for the penalty on later Strikes.
- **B3-5 Alter the Thread.**
  - **Proposal:**
    - It is a conviction spend, so it counts towards core's one point per round.
    - It is used after the attack is rolled and before damage.
    - The attacker must take the new roll.
    - It works against any attack roll against you: Strikes and spell attacks.

Once these are ruled, Block 3 is built as TRG Prime 3.667.0 (C1 to C8) and Inner Tempest 0.4.0, with harness pairs on both, a full sweep, and a live test.
