# Inner Tempest Block 4: audit (Ghostwalker, Kensai, Oathblade)

23 October 2026. Read against the book (v1.2, Chapter 3 lines 880–1947 of `it12.md`), the rulings of 20 to 22 October, and TRG Prime **3.667.3**.

## Scope

| Group | Features | Inventory |
|---|---|---|
| Classes | Ghostwalker (Expert), Kensai (Martial), Oathblade (Martial): class items, tables, skills, proficiencies, HP, wealth | CL-02, CL-03, CL-05 |
| Magical Tradition | Each class chooses one at 1st, for its magical techniques and innate spells: Ghostwalker with Wisdom, Kensai with Intelligence, Oathblade with Charisma | CL-07 |
| Ghostwalker | Ghostwalk, Unseen Assault, Vanishing Retreat, Ghost Arts (2 at 1st, +1 at 4, 8, 12, 16 and 20), bonus feats (Weapon Finesse and a class feat) | CF-G1 to CF-G5 |
| Ghost Arts (15) | False Face, Ghost Step, Hollow Breath, Misdirecting Whisper, No Trace, Silent Needles, Smoke Veil, Spider Path, Falling Shadow, Caltrop Blossom, Shadow Double, Veiled Body, Body of Mist, Shadow Passage, Empty Presence | GA-01 to GA-15 |
| Kensai | Combat Form (2 at 1st, +1 at 4, 8, 12, 16 and 20), Flow Strike, Considered Mind, Weapon Discipline, bonus feats (Weapon Finesse and a class feat) | CF-K1 to CF-K5 |
| Combat Forms (12) | Black Lotus, Crashing Tide, Dread Wolf, Echoing Crane, Ember Reaver, Flickering Flame, Gale Cutter, Ghost Fox, Iron Tortoise, Rising Phoenix, Steel Viper, Stone Serpent | KF-01 to KF-12 |
| Oathblade | Challenge, Sworn Oath, Unwavering Purpose, Oathblade's Resolve, bonus feats (Quick Draw and a class feat) | CF-O1 to CF-O5 |
| Sworn Oaths (4) | Honour, Guardianship, Vengeance, Fealty | — |

**Already ruled:**
- every class ability with no stated level is gained at 1st (IT-C4);
- a Focus ability is restored individually by Refocus (Block 0);
- reactions to being attacked are declared when targeted (B2-1, 21 October);
- the Technique DC (IT-M5).

## What the system already has

- **Class items and registration:** `registerClass` for proficiency and wealth, as for the Disciple and the Mystic. Weapon Finesse and Quick Draw are core feats. All eleven Weapon Discipline groups exist on core weapons.
- **Refocus with another ability:** Considered Mind (Int) and Unwavering Purpose (Cha) use `actionAbilityOptions` (D3).
- **Conviction:** Oathblade's Resolve uses `convictionPool` (Fuku, the Resolves).
- **Stances:** `helpers.enterStance` (D7) for the Combat Forms, with a Focus item expended on entry.
- **Strike series:** `helpers.runStrikeSeries` (Flurry of Blows), for Silent Needles' two thrown Strikes with DR once.
- **Strike riders:** once per round (`oncePerRound`), by target type or trait, on a critical. These suit Unseen Assault's precision dice.
- **Tick-boxes on attacks (3.667.3):** a situational bonus can now be asked before a weapon attack. That suits "moved 10 ft before attacking" (Crashing Tide) and "jumped into melee" (Rising Phoenix).
- **Damage tick-boxes:** declared damage bonuses are already asked on the damage (`declaredDamageBonus`).
- **A defender's disadvantage on actions against it:** built for the Tsuchi (3.665.0). Iron Tortoise's "push or move you at disadvantage" and Gale Cutter's grapple and restrain use it. (0.5.1: Iron Tortoise covers Shove, Reposition and Trip; Graham ruled on 23 October that a Trip is included.)
- **Hooks:**
  - a creature slain (`trgPrimeCreatureSlain`) and damage applied (`trgPrimeDamageApplied`);
  - a turn ended (`trgPrimeTurnEnded`) and initiative rolled;
  - a strike rolled, and daily preparation.
- **Conditions and reactions:**
  - flat-footed, concealed and invisible conditions;
  - attacks of opportunity (`opportunity.mjs`);
  - fall reactions (Arrest a Fall and Catfall), the model for Falling Shadow.
- **Hazards:** the peril automation (`registerPerilAutomation`), for Caltrop Blossom.

## Not in the system yet: core work for TRG Prime 3.668.0

| # | Needed by | What |
|---|---|---|
| C1 | Weapon Discipline | **A weapon-group scope** (`attackGroups`) on conditionals, filled by the weapon attack and its damage, beside 3.667.3's attack form. Also **a trait a group gains** (Finesse when wielded one-handed) and **a free hand by declaration** (for Disarm and Shove). |
| C2 | Weapon Discipline, Echoing Crane, the "+1 per 2 Int" forms, Rising Phoenix, Steel Viper | **Scaled values.** `valueFrom` today names one figure or a difference. Needed: class bonus − 1, half Int (minimum 1), 2 × Int and 5 × Int. |
| C3 | Challenge | **A defence row for everyone but one creature.** Challenge gives −2 circumstance to DB against every creature *except* the challenged one. Defence rows can name the attacker (`sourceUuids`) but cannot exclude one. |
| C4 | Challenge, Oath of Vengeance, Oath of Fealty | **Armour Rending by declaration, against one target.** AR today is a weapon trait, plus ammunition. Challenge gives AR equal to the class bonus against the challenged target. |
| C5 | Unseen Assault | **A strike rider with eligibility:** only against a flat-footed target, and only with an agile or finesse melee weapon, a thrown weapon, or a ranged weapon within its first increment. Riders cannot yet say any of these. |
| C6 | Flow Strike | **One extra Strike after a hit:** made at the third-attack penalty, without advancing the multiple attack penalty, and offered on the hit. Gale Cutter changes the penalty to −5. |
| C7 | Black Lotus | **Damage held until the target's turn.** The damage and critical are rolled now and applied when the target's turn starts. |
| C8 | Flickering Flame | **A penalty to reaction attacks against the bearer** (−5), read by the attack of opportunity. |

| C9 | Shadowy Step, Formless Cut (B4-1) | **Per-Strike options:** "the target is treated as flat-footed" (or flanked) for this Strike, and "ignores the target's stance or form bonuses" for this Strike. |

**Added while building (3.668.0):**
- the target-state scope (`targetStates`: flat-footed, isolated, duel), for Ghost Fox, Dread Wolf and Oath of Honour;
- the `trgPrimeStrikeResolved` and `trgPrimeAmbushDealt` hooks;
- half damage from the damage roll's preset (Steel Viper), and `helpers.rollWeaponDamage`;
- `helpers.traitCheck` (a quiet Flourish check for Flow Strike);
- `enterStance`'s `waiveWait` (Form Reversal);
- a flat strike rider (Ember Reaver's +Int fire).

Weapon Discipline's free hand needs nothing: the system does not check free hands for Disarm or Shove.

The rest is module work on these and on the existing helpers:
- Ghost Arts as Focus abilities with a picker.
- The forms as stances behind one Combat Form Focus item.
- Challenge as an effect on both creatures, ended by the slain, damage and combat-end hooks.
- The oaths as effects and hooks.

## Interpretations I will build unless you rule otherwise

1. **Ghost Arts and Combat Forms are chosen from a picker,** on the Ghost Arts and Combat Form items. The count is 2 at 1st and +1 at 4th, 8th, 12th, 16th and 20th, plus Extra Ghost Art or Extra Form if taken. Each Ghost Art is its own Focus item with its own use. Combat Form is **one** Focus item: using it offers your known forms.
2. **Combat Form, while expended:** you stay in your form. You can leave it, but you can't enter another until Combat Form is restored.
3. **"Class bonus" in a form** is the bonus type *class*. "+1 per 2 Int mod (min +1)" is half Int rounded down, minimum 1. Rising Phoenix's "+2 per Int mod" is 2 × Int.
4. **Flow Strike** has the Flourish trait, so it follows core's one-Flourish-per-turn rule. Its penalty is the weapon's own third-attack penalty (−10, or less with Agile), and it does not advance the penalty.
5. **Unseen Assault's dice:** 1d6, +1d6 at 5th, 9th, 13th and 17th (5d6 at 17th). Once per round. Vanishing Retreat is offered after it deals damage.
6. **Dread Wolf's "a creature not adjacent to any ally"** means not adjacent to any of **its own** allies (a lone enemy). It is read from token positions and dispositions. The Oath of Honour's "none of your allies adjacent to your challenged target" is read the same way.
7. **Steel Viper's initiative** (+5 × Int) raises your current initiative when you enter the form during a combat ("may be applied retrospectively"), and lowers it again when you leave.
8. **Black Lotus:** ~~the damage and any critical injury are rolled on the hit and held~~. **Ruled 23 October: held, landed by button.** Nothing is rolled on the hit; at the start of the target's turn a card offers Land the blow, which rolls the critical and the damage. The landing does not carry riders, precision dice or declared AR.
9. **Challenge's AR** adds to the weapon's own AR, as ammunition's does (Graham's earlier ruling for ammunition).
10. **Echoing Crane's "+1 to your next weapon attack this round"** lasts until the end of the current round.
11. **Oath of Fealty's Sworn Charge** is designated at daily preparation. The charge's +1, AR 1 and +2 apply only while the charge is conscious and within 30 ft.
12. **Mundane Ghost Arts move and hide by hand.** Ghost Step, Spider Path, Body of Mist and Shadow Passage spend their AP and use, and arm the player's next token move. *As built:* Smoke Veil and Caltrop Blossom post their area, DC, dice and duration on a card; they do not place the area.

## The class feats brought in by B4-1 (28)

| Class | Feats |
|---|---|
| Ghostwalker | Ambusher's Patience, Between Glances, Dancing Leaf, Extra Ghost Art, Fleeting Shadow, Ghost Art Mastery, Ghost Blade, Shadow Counter, Shadowy Step, Smoke Eyes, Walk the Empty Space |
| Kensai | Blended Form, Deflect Arrow, Disciplined Follow-Through, Echoed Form, Extra Form, Fluid Blending, Form Reversal, Formless Cut, Perfect Tempo |
| Oathblade | Claim the Next Foe, Deflect Arrow, Distant Honour, Formal Declaration, Guarded Commitment, Shared Purpose, Shelter Under Oath, Solitary Supremacy, Unpaid Debt |

**Interpretations for the feats, unless you rule otherwise:**

13. **Blended Form:** two of your known forms become one form with both forms' benefits. Fluid Blending re-picks them at daily preparation. **Echoed Form** keeps one of the previous form's two benefits, your choice, for 3 rounds.
14. **Form Reversal** changes form without needing Combat Form unexpended, and without expending it. *As built:* the one-round wait between stances is waived (core `waiveWait`), and its Flourish is not counted against your turn's (asked of Graham in the 0.5.0 notes).
15. **Extra Form and Extra Ghost Art** can be taken once per 3 levels. Each adds one pick to the class picker.
16. **Ghost Art Mastery** gives one chosen Focus Ghost Art a second use (`focusExtraUses` by name), restored together by Refocus.
17. **Shadow Counter's Feint** counts as your Deception, so its flat-footed enables Unseen Assault automatically (B4-3).
18. **Ambusher's Patience:** +2d6 precision on the first Unseen Assault against each creature per encounter, when that creature had not detected you. It is automatic when you are undetected by it, and asked otherwise.
19. **Shelter Under Oath:** an aura of +2 circumstance to allies' saves against effects whose source is the challenged target. It applies when the save names its source.
20. **Solitary Supremacy, Between Glances, Walk the Empty Space and Dancing Leaf's wall clause** are described on their cards and ruled by hand. They concern Aid from the target's allies, observation and positioning, which the system does not track.
21. **Deflect Arrow** is offered when you take Evade against a ranged attack with a hand free: +4 circumstance DB against that attack. *As built:* Evade needs Inner Discipline, so a Kensai or Oathblade without it can't use the feat (asked of Graham in the 0.5.0 notes).

## Rulings (taken 23 October; see `INNER_TEMPEST_RULINGS_2026-10-23.md`)

- **B4-1 Scope.** A 1st-level character in each class must take a class feat, and their own class feats are Block 6. Those are 28 feats: 11 Ghostwalker, 9 Kensai and 9 Oathblade, with Deflect Arrow shared by the Kensai and the Oathblade. Three are also open to the Disciple or Mystic: Dancing Leaf, Deflect Arrow and Shadowy Step. **Proposal:** as with B3-1, bring these three classes' own class feats into Block 4. Leave the Disciple and Mystic stances, and the existing core feats opened to the classes (FC-55), to Block 6.
- **B4-2 Class bonuses stacking.** Weapon Discipline adds "your class bonus − 1" to attack and damage. Every Combat Form modifier "is class bonus". Under the stacking rules two class bonuses don't stack. So Crashing Tide's +1 class to attack does nothing while Weapon Discipline applies. **Proposal:** Weapon Discipline's bonus is untyped, so the forms' bonuses add to it. **Alternative:** both are class bonuses and the higher applies.
- **B4-3 Unseen Assault's trigger.** "Flat-footed to you as a direct result of your own Stealth, Deception or Ghostwalker abilities." The system knows the target is flat-footed, not always why. **Proposal:**
  - **Automatic** when you are hidden from or undetected by the target, or the target is flat-footed from your own Feint or Ghost Art.
  - **Asked as a tick-box** when it is flat-footed for another reason.
  - **Never** from flanking alone.
- **B4-4 Ember Reaver.** "Each consecutive round in this form adds +1 to weapon damage (resets if you change forms)" has no cap. **Proposal:** capped at your Int modifier, and reset when combat ends. **Alternative:** uncapped until you change form or combat ends.

Once these are ruled, Block 4 is built as TRG Prime 3.668.0 (C1 to C9) and Inner Tempest 0.5.0. Then come harness pairs on both, a full sweep, and a live test.
