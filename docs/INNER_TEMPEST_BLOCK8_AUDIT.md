# Inner Tempest Block 8: audit (the Grimoire)

26 October 2026. Read against:
- **The book:** v1.2, Chapter 8 "Grimoire", lines 5399–5848 of `it12.md`. The thirteen spells are cut into `tools/content/book-text-block8.json` by `tools/content/extract-book-block8.mjs`, and the build prints from there, never retyped.
- **Graham's earlier rulings:** IT-m24 (a rung the book does not print reads as the next one up, so a missing Partial is the Success row), and the rulings of 20 to 25 October.
- **TRG Prime 3.671.1**, the system as released. Every system claim below was read in its source.

## Scope

Chapter 8 prints 25 spells. Twelve are already built: eleven in Block 3 and Water Bolt in Block 5 (B5-1). Block 8 builds the other thirteen.

| Spell | PP | Category | Inventory |
|---|---|---|---|
| Ability Inversion | 12 | Save | SP-01 |
| Acidic Touch | 6 | Save | SP-02 |
| Age Resistance | 10 | Utility | SP-03 |
| Arrows Flight | 2 | Utility | SP-05 |
| Boundless Vision | 4 | Utility | SP-07 |
| Disrupt Soul | 18 | Save | SP-11 |
| False Future | 8 | Utility | SP-13 |
| Flowing Step | 4 | Utility | SP-14 |
| Foretell Failure | 6 | Utility | SP-15 |
| Root | 2 | Utility | SP-19 |
| Skyborne Pathways | 8 | Utility | SP-21 |
| Spiritual Distraction | 6 | Save | SP-22 |
| Tranquil Mastery | 12 | Utility | SP-24 |

The chapter's own rule: these spells are learned and cast normally by casters of their traditions, or gained as innate spells (with the Focus trait, no PP, restored by Refocus) through the Mystic and other Inner Tempest options. So they go in the Spells pack, which the system already federates with its own, as Block 3's eleven did. No core spell shares a name with any of the thirteen.

**Bookkeeping:** Water Bolt (SP-25) has no line in `status.json`; it gets one.

## What the system already has (TRG Prime 3.671.1)

| Need | What exists | Where |
|---|---|---|
| A spell from data | `system.effects` rows of 120 kinds, run by the cast pipeline: saves, damage, conditions, durations, sustain, warps | `magic/effect-kinds.mjs`, `magic/spell-effects.mjs` |
| Timed flags on a creature | `declare` rows carrying `statBonuses`, `conditionals`, `strikeRider` and five others, with `rounds` | `magic/declared-effect.mjs` |
| Advantage on a save | a `conditional` of kind advantage, `checkTypes: ["save"]`, `subjects: ["reflex"]` | `conditionals.mjs` |
| Ignoring difficult terrain; formidable as difficult | the flag `ignoresDifficultTerrain` on an item or effect (Wild Stride's rule) | `combat/passive-feats.mjs:274`, `combat/movement-workflow.mjs:217` |
| A bonus against being shoved, tripped or moved | `defenceDC` rows (the Storgar's ruling: the defender's DC rises) | `combat/defence-dc.mjs` |
| Unarmed damage added to Strikes | `strikeRider` rows: dice, type, `scope: "unarmed"`, secondary damage | `magic/strike-riders.mjs` |
| A condition on a hit, with a save | `strikeRider.condition` and `conditionSave: { save, dc }`, **one value**, Success resists (Tangleweed) | `magic/strike-riders-workflow.mjs:262` |
| A penalty to someone's next spell check | Spell Drain's waiting rung on the caster, added before the roll | `magic/cast-workflow.mjs:2512` |
| A cast, announced | `trgPrimeSpellCast` {actor, spell, degree, targets}, fired **before** the PP cost is known | `magic/cast-workflow.mjs:2784` |
| Basic-save critical severity | `basicSavingThrow(degree, margin)` | `dice/resolution.mjs:194` |
| Flank immunity | a creature type's `noFlanking`, or an **item's** `creatureAbility.derives.cannotBeFlanked` (not an effect's) | `creature-ability-rules.mjs:41`, `combat/attack-workflow.mjs:1014` |
| Range increments | `effectiveRangeIncrement(weapon, ammo)` = base + the ammunition's `rangeIncrementBonus` (feet, not a multiple) | `combat/ammunition.mjs:211` |
| Refocus | one expended Focus ability named before the check. The outcome restores it now (Critical), at your next turn (Success), or bars it | `combat/action-workflow.mjs:3260`, `combat/refocus-workflow.mjs` |
| A temporary immunity | `tempImmunity` rows; helpers `temporaryImmunityRefusal` and `grantTemporaryImmunity` (3.671.0) | `temporary-immunity.mjs` |
| Start-of-turn area saves (Dragon Fear's kind) | **none**; core spells of that shape (Portal Maelstrom) print it as a note | — |
| Aging | **none**; it is the book's appendix, Block 9 | — |

## Not in the system yet: core work for TRG Prime 3.672.0

| # | For | Gap, and what is proposed |
|---|---|---|
| C1 | Ability Inversion | **Nothing swaps two ability scores.** Proposed: a spell row `abilitySwap` with a duration per save rung. On each target it swaps the highest and lowest ability totals (the caster is asked on a tie) through an effect that adds the difference to each, so every derived number follows. |
| C2 | Acidic Touch | **A rider's condition save has one value and no DC from a spell.** Proposed: `conditionSave.ladder` (a value per rung: Failure Sickened 1, Fumble Sickened 2), and a rider laid by a spell takes the caster's spell save DC when it names none. |
| C3 | Arrows Flight | **Range can only grow by a fixed number of feet.** Proposed: `rangeIncrementMultiplier` on ammunition or a thrown weapon (from its own flag), read by `effectiveRangeIncrement`. |
| C4 | Boundless Vision | **Flank immunity comes only from items.** Proposed: an applied effect with `creatureAbility.derives.cannotBeFlanked` gives it, as Pack Attack's did (3.670.0). |
| C5 | Spiritual Distraction, Disrupt Soul | **Nothing can answer a casting before its check, and nothing is told the PP a casting spent.** Proposed: (a) `registerSpellCheckGate(fn)`, awaited before the Spellcraft check, which may add modifiers and post lines; (b) the hook `trgPrimeSpellSettled` {actor, spell, degree, ppSpent, innate, level} once the cost is paid. |
| C6 | Spiritual Distraction, Disrupt Soul | **A module cannot leave its own mark on a spell's target.** Proposed: a spell row `moduleMark` {module, key}. It places an effect on each target carrying that module's data stamped with the caster (uuid, name, level) and the cast's save DC, and it ends with the spell (sustained), as the system's own effects do. A spell with a printed save that is rolled only later (these two) declares `saveAtCast: false`, so no save is rolled on casting. |
| C7 | Tranquil Mastery | **Refocus restores one ability.** Proposed: an effect flag `refocusExtra`. Refocus then asks for a second expended Focus ability after the first. A Critical restores both now and a Success both at your next turn; any lower result touches only the first. |
| C8 | Foretell Failure | **Nothing previews a roll.** Proposed: a one-shot flag `foretell` on the caster, spent by their next d20 check whose DC is known. Before the roll the card says whether a 10 on the die would succeed. If it would, the check is rolled (you must take it). If it would not, you are asked whether to take it anyway or stop. With a DC the GM sets afterwards, the card says the GM answers. |
| C9 | Flowing Step | **A `declare` row cannot carry `ignoresDifficultTerrain`**, and `terrainFreedom` also grants immunity to zone Speed penalties, which the spell does not. Proposed: allow the flag on a `declare` row. |

## The thirteen, one by one

| Spell | What the book prints | Needs | Planned |
|---|---|---|---|
| Ability Inversion | Will; the target's highest and lowest ability scores swap (caster's choice on ties). Critical unaffected; Success until the end of its next turn; Failure 1 minute; Fumble 1 hour | C1 | A |
| Acidic Touch | 1 minute: your unarmed Strikes deal 1d6 secondary acid; a successful melee attack makes the target save Fortitude: Success unaffected, Failure Sickened 1, Fumble Sickened 2 | C2 | A |
| Age Resistance | until your next daily preparation, aging's physical penalties do not apply; warps to 1 month (+4) or unlimited (+10) | Block 9's aging | C now (a marker the aging rules read in Block 9) |
| Arrows Flight | touch, up to 30 projectiles no bigger than an arrow, range increments doubled for 10 minutes; warps 1 hour (+2), large projectiles (+4) | C3 | B (you choose the stack; up to 30 are split off and marked) |
| Boundless Vision | Sustained: you see everything within 100 feet in line of sight; you cannot be flanked | C4 | A for the flanking; the sight is the table's |
| Disrupt Soul | Sustained, 30 ft, a living creature. Each time it casts a spell or uses a magical Focus ability it saves Fortitude. Critical: unaffected, and the spell ends. Success: 2d8 essence. Failure: 2d8 essence + 1d8 per PP spent (an innate spell or magical Focus ability: + 1d8 per four levels, at least 1d8). Fumble: as Failure, and an essence critical, its severity as a basic save's | C5, C6 | A |
| False Future | touch, until your next daily preparation, divinations see the future you describe; Will to avoid; Sense Magic Incredibly Hard | — | D (the text) |
| Flowing Step | 1 AP, until the end of your turn: advantage on Reflex saves; difficult terrain no penalty, formidable as difficult | C9 | A |
| Foretell Failure | 1 AP, cast just before a d20 action: you learn whether a 10 would succeed; if so you must take the action, if not you may do something else | C8 | B |
| Root | touch, 1 minute: +2 circumstance to resist being moved or tripped, and on checks to balance or stay standing on earth, sand or stone; warps +1 each (max +4), 10 minutes (+2) | — | A (the defence rows); the balance bonus is a tick-box (the ground is the GM's call) |
| Skyborne Pathways | 8 hours: aerial tracks from the past day, followed at soft terrain's Track DC; warps | — | D (the text) |
| Spiritual Distraction | Sustained, 30 ft, a living creature. Each time it casts a spell it saves Will. Critical: unaffected, and the spell ends. Success: unaffected. Partial −2, Failure −4, Fumble −10 circumstance to that spell check | C5, C6 | A |
| Tranquil Mastery | 10 minutes, touch, 1 hour: a successful Refocus may restore a second expended Focus ability (Critical both now, Success both at the start of its next turn); lower results only the first | C7 | A |

## Magical Focus abilities (for Disrupt Soul)

"A magical ability with the Focus trait" is one the book calls magical. Chapter 1 says: "If an ability is magical, it possesses the appropriate tradition or magical traits", and the Ghost Arts say "This Ghost Art is magical". Nothing in the module marks these today. Block 8 marks each one the book calls magical with `itMagical`, read from its printed text: the Ghost Arts that say so, the Path's magical techniques and the discipline abilities. Disrupt Soul answers when one of them is used: its use spent, or its effect laid on.

## Questions for Graham

| # | Question | Proposal |
|---|---|---|
| B8-1 | **Ability Inversion:** which numbers swap? A creature's ability is its total (base, racial and other bonuses together). | **The totals.** For the duration the highest takes the lowest's total and the reverse; bonuses gained during the spell still add on top. On a tie the caster chooses, as printed. A Partial is the Success row (IT-m24); a Blunder is the Fumble row. |
| B8-2 | **Acidic Touch:** the acid is on "your unarmed strikes", but the save follows "a successful melee attack". Any melee Strike, or only the unarmed ones? | **Any melee Strike that hits** (as printed), at your spell save DC, once per hit. Sickened stays until it is removed, as the condition does. |
| B8-3 | **Arrows Flight:** what is "no bigger than a normal arrow"? | **Arrows, bolts, sling bullets, darts and shuriken**; up to 30 of one stack are split off and marked for the duration. Larger projectiles (a javelin, a thrown spear) need the +4 PP warp. |
| B8-4 | **Disrupt Soul and Spiritual Distraction:** the save at each casting. Whose DC, and who rolls? | **The DC of the casting that laid the spell**, recorded on the target. The system rolls the target's save as the casting begins (Distraction, before the spell check) or once it is paid for (Disrupt Soul), and the card says so. "The spell ends" on a Critical ends Distraction or Disrupt Soul itself. |
| B8-5 | **Disrupt Soul, "1d8 per PP spent":** the PP the casting actually cost (a Partial's lower cost included), or the spell's printed PP? | **The PP actually spent**, as the words say. An innate spell or magical Focus ability uses the per-four-levels line. |
| B8-6 | **Foretell Failure** with a DC the GM sets after the roll: there is nothing to compare a 10 against. | **The card asks the GM** to say whether a 10 succeeds, and the check waits for the answer. With a known DC (an attack against Defence, a save, a fixed DC) the system answers. |
| B8-7 | **Tranquil Mastery:** when is the second ability chosen? | **With the first, before the roll**, as Refocus already names its ability before the check, so the result cannot pick it. |
| B8-8 | **Age Resistance:** aging is the appendix, which comes with Block 9. | **Ship the spell now**, marking the creature for its duration, warps included. Block 9's aging rules read the mark, and until then the card says the physical aging penalties are set aside by hand. |
| B8-9 | **Block 3's partly automated spells.** Air Step, Aura of Heat, Burning Stride, Burst of Speed, Dragon Fear, Timeless Motion and Water Bolt still leave pieces to the table (the release notes list them). Upgrade them now, or later? | **Three small ones now:** Burst of Speed's second round (−10 ft), Timeless Motion's movement that provokes nothing, and Water Bolt's 5-foot push on a serious or deadly critical. **Dragon Fear's start-of-turn aura save, Aura of Heat's sustained repeats and Burning Stride's movement fire need new core machinery** (an area that saves each turn; damage on a Movement action). Do those as their own core block after Block 10, so Block 8 stays the Grimoire. |

## Interpretations (they stand unless Graham says otherwise)

1. **Boundless Vision's sight** (seeing everything within 100 feet in line of sight) is the table's; only the flank immunity is mechanical.
2. **Flowing Step's terrain:** difficult terrain costs nothing extra and formidable costs as difficult, by the system's existing Wild Stride rule. It does not lift a zone's own Speed penalty.
3. **Root's** "resist being moved or tripped" raises your DC against Shove, Trip, Reposition and every action the system marks as forced movement. The balance and stand-your-ground bonus is a tick-box on Acrobatics, because the ground is the GM's call.
4. **Foretell Failure's** "must take the action": once the card says a 10 succeeds, the check is rolled without a choice.
5. **Disrupt Soul's essence critical** on a Fumble has the severity a basic save's failure margin gives (`basicSavingThrow`).
6. **Acidic Touch's 1d6** is secondary acid damage, added and resisted as the system already handles a strike rider's damage (Flaming Weapon's, for one).

## Releases

- **TRG Prime 3.672.0:** C1–C9, with a verify/mutate pair, the full sweep, and the release links checked (3.671.1's pair).
- **Inner Tempest 0.9.0:** the thirteen spells, the `itMagical` marks, B8-9's three upgrades if adopted, and Water Bolt's status line. With `verify-block8` / `mutate-block8`, then the usual review, sweep and live test.
