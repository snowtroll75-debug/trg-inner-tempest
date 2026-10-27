# Inner Tempest Block 9: audit (armour, magic items and the aging appendix)

26 October 2026. Read against:
- **The book:** v1.2 (`it12.md`):
  - Chapter 6's armour (lines 5042–5115);
  - Chapter 9 "Magic Items" (5849–6257): Monastic Items, armour runes, specific armour, weapon runes, specific weapon, wondrous items;
  - the Appendix on aging (6259–6380).
- **Graham's earlier rulings:**
  - the core's R14 for specific weapons: a printed damage line is the base plus quality, so the dice are stored bare, and the fumble DC is the base weapon's;
  - Pillars of Faith's Chapter 11 runes, the precedent for a module's runes.
- **TRG Prime 3.672.1**, as released. Every system claim below was read in its source.

## Scope

| Group | Items | Inventory |
|---|---|---|
| **Armour** (Chapter 6; moved here from Block 1) | Haramaki, Shozoku, Kikko, Do-maru, Kusari, Tatami-Do, Yoroi, Oni-Mask, Jingasa | AR-01 to AR-09 |
| **Armour runes** | Centred I–III, Guarded, Harmony (armour or shield), Graceful Wind, Karmic Resilience, Staunching I–III | MI-01 to MI-06 |
| **Specific armour** | Harmonious Do-maru | MI-07 |
| **Weapon runes** | Centred I–III, Harmony Edge, Mindful, Soulful Strike I–III, Tranquil Quiver | MI-08 to MI-12 |
| **Specific weapon** | Spiritblade (a Nodachi) | MI-13 |
| **Wondrous items** | Enlightened Prayer Beads, Lotus Blossom, Monastic Robe of Resilience, Mystic Incense Burner, Restorative Mat, Sash of Serenity | MI-14 to MI-19 |
| **Monastic Items** | crafting magic items with Meditation (Inner Discipline) | new line, MI-20 |
| **Appendix** | character aging; the racial age table | AP-01, AP-02 |

**Bookkeeping:** starting wealth (GE-01) shipped with the backgrounds and classes in Blocks 1 and 3 but has no line in `status.json`; it gets one.

## What the system already has (TRG Prime 3.672.1)

| Need | What exists | Where |
|---|---|---|
| Armour from a module pack | federated packs (`flags.trg-prime.extends`); armour items with category, ACP, max Dex, DR, HP, Speed and traits (Full, Helm, Metal, Rigid) | the Weapons pack's route (Block 4) |
| What a piece covers | `coversTorso`, `coversArms`, `coversLegs`, `isHelmet`, read by the critical table's hit location | `combat/hit-location.mjs:61` |
| A conditional on worn gear (Shozoku, Oni-Mask) | `flags.trg-prime.conditionals` on equipment, counted while worn (3.607.0) | `conditionals.mjs:512` |
| A module's runes | `registerRunes` with `declares`: `bonuses`, `conditionals`, `strikeRider` (tier dice), `afterStrike`, `onCritical`, `saveReroll`, `action` (an Engage button: `frequency` focus, daily, at will or n a day; an effect with `auras`, `conditionals`, `changes`) and more | `module-api.mjs:661`, `rune-declarations.mjs`, `rune-actions.mjs:265` |
| A rune's Focus use, restored by Refocus | `frequency: "focus"`: Refocus offers the expended item (Pillars of Faith's Sanctuary) | `combat/refocus-workflow.mjs:265` |
| Clothing that takes armour runes, but not under armour | `flags.trg-prime.runeBearing: "armour"` on gear; its runes count only with no body armour worn (Travellers clothing, R9) | `rune-bearing.mjs` |
| A weapon's spell on a critical | `specificItem.onCritical = {spell, dc, ap}`: offered at the critical, Command AP, the weapon casts (Da Big Itter's Fear, R15) | `weapon-rune-workflow.mjs:72` |
| Wondrous items | abilities: stat, saveBonus, skillBonus, dbBonus, baseDR, hp, spell, note, `use` (a registered automation; daily or Focus frequency) | `wondrous-effects.mjs`, `wondrous-use-workflow.mjs:183` |
| Auras that reach everyone | an `ally` aura with `allyEffect`, `enemyEffect` and `includeSelf`, from any item's `flags.trg-prime.auras` or a rune's action while it runs | `creature-auras.mjs:388`, `ally-aura-effects.mjs` |
| A once-a-day first use | `dailyFirst` rows (Refocus improved or set) | `daily-firsts.mjs` |
| An innate casting from an item | `castInnateOnce(actor, spell, {allowance})` (module API) | `module-api-workflow.mjs:234` |
| A one-use advantage | an effect's conditional with `oneShot` | `conditionals.mjs:448` |
| Easier bleeding | `bleedFlatCheckReduction` on an **effect** (Sharuk-Dur); only the Light band ends by a flat check ("above it needs Medicine or magic") | `documents/combat.mjs:1916` |
| A save to avoid 0 HP | `deathGuard` on an **effect** ("if damage would reduce you to 0 HP"), offered or rolled, daily | `combat/death-guard.mjs` |
| Energy runes Commanded on and off | the five energy runes (Command, a state, 1d4/2d4/3d4, a secondary critical of −40 and −20) | `rune-damage.mjs:66` |
| Crafting magic items | Create's `magical` type: Arcana, Nature, Occultism or Religion, with Brew Potion or Magical Crafting | `create-crafting.mjs` |
| Aging | **none**: no age category, lifespan or age modifier anywhere | — |
| Max HP and skill points | derived from the **current** Constitution and Intelligence totals × level | `documents/actor.mjs:976`, `class-progression.mjs:313` |

## Not in the system yet: core work for TRG Prime 3.673.0

| # | For | Gap, and what is proposed |
|---|---|---|
| C1 | Karmic Resilience | **A rune cannot guard against Dying.** The death guard reads effects only, and it fires at "would reduce you to 0 HP". Proposed: a rune declares `dyingGuard` {frequency daily, offer}. When its wearer would gain Dying, they are asked. Yes: 1 HP, no Dying, no critical for reaching 0 HP, and then a circumstance bonus to dying checks for 1 minute (C3 for its +2/+4). |
| C2 | Staunching I–III | **A rune cannot ease bleeding, and no flat check touches the bands above Light.** Proposed: a rune declares `bleedFlatCheckReduction` (2, 3, 4 by tier). Tiers II and III also declare `bleedReduceCheck` {dc 16, bands "moderate" or "any"}: at the end of the wearer's turn a DC 16 flat check lowers that bleeding by 1. |
| C3 | Harmony, Karmic Resilience | **A rune's value cannot depend on the wearer's class** ("+2 … increases to +3 if you are a Disciple or Mystic"). Proposed: `classValue: { classes, value }` on a declared bonus, conditional or change, read against the wearer's classes. |
| C4 | Guarded | **Nothing lets the creature struck answer a critical's damage.** Proposed: a rune declares `criticalGuard` {frequency daily}. When a critical hits its wearer, the wearer's owner is asked before damage is applied (through the GM relay when that is another client). Yes: the critical's extra damage (its bonus dice) is not dealt, and the wearer heals half of it, rounded up. |
| C5 | Harmony Edge | **Nothing asks the attacker before the critical injury roll.** Proposed: a weapon rune declares `criticalAdvantage` {frequency daily}. When its wielder scores a critical they are asked, before the injury roll, whether to roll it at advantage (B9-3). |
| C6 | Soulful Strike | **A registered rune cannot be Commanded on and off like an energy rune.** Proposed: a rune declares `energy` {type, tiers [{dice, secondaryCritical}]}. It is read by the energy-rune path: the Command button and its state, the secondary damage and the secondary critical (B9-2 for the scale). |
| C7 | Tranquil Quiver | **A rune's action cannot lay a one-use strike rider, and no rider is gated on distance.** Proposed: a rune action's effect may carry `strikeRider`, spent with its one-shot conditional by the next ranged Strike with that weapon. A rider gains `beyondFeet` (30): it is dealt only when the target is farther than that. |
| C8 | Monastic Items | **Create's skills per item type are fixed.** Proposed: `registerCreateRoute` {itemType "magical", skill "meditation", requires (a feat or ability: Inner Discipline), dcStep +2, ranksAtLeastLevel "meditation", excludes charged items}. The setup dialog offers it to a character who qualifies. |
| C9 | Mystic Incense Burner | **An item's aura cannot run only while lit.** Proposed: an item aura may carry `whileState` (a flag key). It is emitted only while the item's state runs, until a world time, as a rune action's aura already is. |
| C10 | Aging (B9-11) | **The appendix says aging does not change Hit Points or skill points already gained; the system recomputes both from the current totals.** Proposed: a bonus-pool entry typed `age` that HP's Constitution and the skill budget's Intelligence leave out. Everything else derived from the ability follows it. |

## The armour (Chapter 6)

All nine go in a new Armour pack (`it-armour`), federated with the system's own, as the weapons were in Block 4. No core armour shares a name with them.

| Armour | What the book prints | Planned |
|---|---|---|
| Haramaki | Light, L0, 5 gp, ACP 0, Max Dex 10, DR 1, HP 10, 1 lb | A |
| Shozoku | Light, L1, 100 gp, DR 0, HP 8; +2 circumstance to Hide (Stealth) in shadowy areas | A (a tick on Hide: the shadows are the GM's call) |
| Kikko | Medium, L1, 150 gp, ACP −2, Max Dex 5, DR 3, HP 40, 25 lb; Metal, Rigid | A |
| Do-maru | Medium, L1, 200 gp, ACP −2, Max Dex 5, DR 3, HP 50, 20 lb; Full; "ineffective against critical strikes to the shoulders" | A (B9-1) |
| Kusari | Medium, L2, 350 gp, ACP −3, Max Dex 4, DR 4, HP 70, 40 lb; Full, Metal | A |
| Tatami-Do | Heavy, L2, 350 gp, ACP −6, Max Dex 3, DR 4, HP 80, −5 ft, 40 lb; Full, Metal, Rigid | A |
| Yoroi | Heavy, L3, 650 gp, ACP −7, Max Dex 2, DR 6, HP 100, −5 ft, 45 lb; Full, Helm, Metal, Rigid | A |
| Oni-Mask | Other (a helm), L1, 200 gp, HP 25, 8 lb; Metal, Rigid; +1 item to visual Intimidate | A (a tick on Intimidate: "visual" is the GM's call) |
| Jingasa | Other (a helm), L0, 20 gp, HP 10, 4 lb; Metal | A |

## The runes and specific items (Chapter 9)

| Item | What the book prints | Needs | Planned |
|---|---|---|---|
| Centred I–III (armour; weapon) | Item bonus to Refocus (Mental Focus): +1, +2, +3. Armour L4/8/12 for 750/4,200/16,000 gp; weapon L3/6/10 for 350/1,400/6,000 gp | — | A (a declared conditional on Refocus) |
| Guarded | L7, 3,000 gp; Reaction when you take a critical hit, 1/day: negate the critical's extra HP damage and heal half of it | C4 | B |
| Harmony (armour or shield) | L11, 11,000 / 7,700 gp; Focus, Engage 1 AP: +2 dodge DB and +2 resistance to saves for 1 minute (+3 for a Disciple or Mystic); then expended until Refocus | C3 | A |
| Graceful Wind | L6, 2,500 gp; Engage 1 AP, 1/day: +30 ft status land Speed and +2 resistance to Reflex saves for 1 minute | — | A |
| Karmic Resilience | L11, 11,000 gp; Reaction when you gain Dying, 1/day: 1 HP, no Dying, no 0-HP critical; +2 circumstance to dying checks for 1 minute (+4 Disciple or Mystic) | C1, C3 | B |
| Staunching I–III | L6/12/18, 2,000/16,000/180,000 gp; the Light Bleeding flat check becomes 14/13/12; II: a DC 16 flat check reduces Moderate Bleeding by 1; III: any Bleeding | C2 | A |
| Harmonious Do-maru | L11, 13,000 gp, 15 lb; ACP −1, Max Dex 7, DR 3, DB +0, HP 55; Expert, Full, Lightweight, Potency I, Harmony | — | A (B9-9) |
| Harmony Edge | L12, 11,000 gp; Reaction when you inflict a critical hit, 1/day: advantage on the critical roll | C5 | B |
| Mindful | L10, 6,000 gp; Focus; "Activate Engage (1 AP)" and **nothing else: v1.2 prints no effect** | — | B9-4 |
| Soulful Strike I–III | L7/12/17, 2,100/11,000/90,000 gp; Command 1 AP: secondary force 1d6 / 2d6 and a −3 critical / 3d6 and a −1 critical | C6 | A |
| Tranquil Quiver | L10, 6,000 gp, ranged weapons; Focus, Engage 1 AP: the next ranged attack +2 status, and 1d6 precision if the target is more than 30 feet away; then expended until Refocus | C7 | A |
| Spiritblade | L14, 31,000 gp, a Nodachi; AB +15, 1d10+2 S, L, Fumble 3; Balanced, Brace, Centred II, Deadly, Keen, Potency III, Soulful II, Versatile P; Command 1 AP on a critical: Fear (DC 20) on the creature struck | C6 | A (Da Big Itter's rail; B9-8) |

## The wondrous items

| Item | What the book prints | Planned |
|---|---|---|
| Enlightened Prayer Beads | L6, 2,000 gp; invested: +1 status Wisdom; once a day, advantage on a Refocus made while holding or wearing them | A (the stat). The daily advantage is a Use that readies it for the next Refocus (interpretation 4) |
| Lotus Blossom | L8, 5,000 gp; Interact 2 AP, drink: temporary HP equal to your level, end any fear or charm effect, advantage on such saves for 1 hour; refills at daily preparation; a second elixir in one day deals a serious poison critical first | A (a registered Use: B9-6) |
| Monastic Robe of Resilience | L6, 2,500 gp; DR 1; takes armour runes; "cannot be worn with armour" | A (clothing with `runeBearing`; its DR and runes count only with no body armour, as Travellers clothing's do) |
| Mystic Incense Burner | L8, 5,000 gp, 10 lb; lit, a 30-ft radius for 1 hour: +1 resistance to Will saves against fear and charm, +2 status to Meditation; Incense 5 gp a use | B (C9; B9-7) |
| Restorative Mat | L10, 8,000 gp, 20 lb; +2 status to Meditation while sat on it; once a day, 10 minutes' meditation gives Cure or Restoration (8 PP) | A (a tick on Meditation; a Use that casts the chosen spell at 8 PP through `castInnateOnce`) |
| Sash of Serenity | L8, 5,000 gp; invested: +1 dodge DB, +2 resistance to saves against fear; once a day, for 1 minute, advantage on one save of your choice | A (the bonuses; a Use lays a one-shot advantage on any save, for 1 minute) |

## Monastic Items (crafting)

A character with Inner Discipline may make Create checks with Meditation for a magic item whose effects are based on a technique or innate spell they know. The DC is Hard (+2), their Meditation ranks must be at least the item's level, and they cannot make charged items this way. **Needs C8**, and B9-5.

## The aging appendix

| Rule | What the book prints | Planned |
|---|---|---|
| Categories | Juvenile (below adulthood), Adult (to <50% of Natural Lifespan), Middle Aged (50–<70%), Old (70–<85%), Venerable (85%+); thresholds rounded | A: read from the character's age and race |
| Effects | Str/Dex/Con −1/−1/−1 middle aged, −2 old, −3 venerable; Int/Wis/Cha +1/+2/+3; Juvenile Str −1, Dex +1, Con −1, Wis −1. They replace, not add | A: one effect, "Age: Old", on the ability totals (C10) |
| Natural Lifespan | a range is chosen or rolled (secret from the player); at it, death within the year at the GM's time | B: a field on the sheet, defaulting to the range's midpoint; the GM is told when a character reaches it |
| Age Resistance | suppresses the Str/Dex/Con penalties; the Int/Wis/Cha bonuses remain; does not change the category or lifespan | A: Block 8's mark is read |
| Magical and apparent age | an effect that changes biological age recalculates at once; appearance changes nothing | D: the age field is the biological age; change it and the category follows |
| Character creation | an older starting age applies the modifiers; younger than adulthood needs the GM | A for the modifiers; the permission is the table's |
| Racial table | Ascendan, Dwarf, Elf, Gnome, Halfling, Human, Kornargon, Orc, Miraku, Ryukari, Scree, Tianzhi: adulthood, thresholds, lifespan; Ascendan and Elves immortal; Orc unknown | A: the table as data, the core races by name |

## Questions for Graham

| # | Question | Proposal |
|---|---|---|
| B9-1 | **Do-maru:** "Full" says it covers arms and legs, but "ineffective against critical strikes to the shoulders". The system has no shoulders; the nearest location is Arms. | **Full, but not the arms:** it covers the torso and legs, so a critical to the arms reads the unarmoured row. |
| B9-2 | **Soulful Strike's** "secondary critical with a severity of −3 / −1". The system's energy runes print theirs as −40 and −20 on the injury roll. | **Read −3 and −1 as the energy runes' −40 and −20**, since the tiers match (II and III). Otherwise tell me the scale. |
| B9-3 | **Harmony Edge's** "advantage on the attack critical roll": which roll, and what if the critical's own severity already gives disadvantage (a minor one)? | **The critical injury roll.** It is rolled twice and the result worse for the target is kept. Against a minor critical's disadvantage the two cancel, and it is rolled once. |
| B9-4 | **Mindful** prints only "Activate Engage (1 AP)": v1.2 has no effect text. The inventory (from the earlier draft) read "+Wis to your next attack before your next turn; expended until Refocus". | **Tell me the text.** Until then it ships priced and inscribable, with the card saying the effect is the GM's. |
| B9-5 | **Monastic Items:** does the crafter still need Magical Crafting (or Brew Potion), with Meditation replacing the skill? And are "charged items" the Charged Items pack (wands, staves)? | **Yes to both:** "they otherwise follow the normal magic item creation rules". The crafter ticks that the item's effect is a technique or innate spell they know, because the system cannot judge that. |
| B9-6 | **Lotus Blossom:** "more than one of these elixirs in any one day". Per character, across every Lotus Blossom? | **Per character:** the second drink that day, from any bottle, deals the serious poison critical before its effects. |
| B9-7 | **Mystic Incense Burner:** "placed in a room", yet its usage is "worn". | **An aura of 30 feet from the bearer's space for the hour**, reaching every creature (allies, enemies and you). Each lighting uses one Incense (5 gp). |
| B9-8 | **Spiritblade's printed numbers:** AB +15, 1d10+2, Fumble 3. Under R14 the dice are stored bare and the fumble DC is the base weapon's (Nodachi, 12). | **As R14:** 1d10 bare (Potency III adds its own), fumble DC 12; AB is what the sheet derives. Is "Fumble 3" meant as something else? |
| B9-9 | **Harmonious Do-maru:** built as a Do-maru with Expert, Lightweight, Potency I and Harmony. If the system's derived ACP, Max Dex, HP and weight differ from the printed −1, 7, 55 and 15 lb, which wins? | **The print:** the item carries the printed values, and the card says it is a specific armour. |
| B9-10 | **Aging on or off:** it changes every character with an age, core races included. | **A world setting, on by default with Inner Tempest active.** A character with no age set is unaffected. |
| B9-11 | **Aging and HP:** "does not remove Hit Points already gained" (and skill points). The system derives both from the current totals. | **C10: age modifiers leave max HP and the skill budget alone** (a Con penalty removes no HP, and an Int bonus adds no skill points). Levels gained later read them the same way, which keeps one rule rather than tracking the level each category began. |

## Interpretations (they stand unless Graham says otherwise)

1. **Shozoku's shadows and Oni-Mask's "visual" Intimidate** are ticks on the check, because the light and the kind of intimidation are the GM's call.
2. **Centred's requirement** ("at least one ability with the Focus trait") needs nothing extra: without one there is no Refocus to add to.
3. **The Restorative Mat's and the Incense Burner's Meditation bonuses** are ticks on Meditation checks: sitting on the mat and being in the room are the table's to judge.
4. **The Prayer Beads' daily advantage** is a Use (free) that readies advantage on your next Refocus that day, rather than a box offered on every Refocus.
5. **Guarded's "additional HP damage"** is the critical's bonus dice, after DR, as the damage card already separates them.
6. **Karmic Resilience** is offered when damage would leave you Dying, not when it kills you outright (massive damage); the dying-check bonus is circumstance, for 1 minute.
7. **The aging category** is read from the sheet's age and the race's row; birthdays are the table's. Raising the age is how a character enters a new category.
8. **Age Resistance** suppresses only the penalties among Str, Dex and Con (a Juvenile's Dex +1 stays); Int, Wis and Cha are untouched.

## Releases

- **TRG Prime 3.673.0:** C1–C10, with a verify/mutate pair, the full sweep, and the release links checked.
- **Inner Tempest 1.0.0 or 0.10.0** (Graham's call, since Block 10 remains):
  - the Armour pack;
  - the runes, through `registerRunes`;
  - the specific items;
  - the wondrous items;
  - Monastic crafting;
  - aging.
  With `verify-block9` / `mutate-block9`, then the usual review, sweep and live test.
