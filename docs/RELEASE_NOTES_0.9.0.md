# Inner Tempest 0.9.0: Block 8, the Grimoire

26 October 2026.

Needs **TRG Prime 3.672.0**. Install that first. On an older system the module warns at start-up, and the new spells' rows are not read.

Built to Graham's rulings of 26 October (B8-1 to B8-9, `docs/INNER_TEMPEST_RULINGS_2026-10-26.md`; all nine proposals adopted) and the Block 8 audit (`docs/INNER_TEMPEST_BLOCK8_AUDIT.md`).

## What is new

**The Grimoire's other thirteen spells**, in the Spells pack beside Block 3's eleven and Water Bolt, so Chapter 8 is complete. Each prints the book's text (its trait line, its labelled lines and every paragraph, read from the docx) followed by what the system does with it. Casters of their traditions learn and cast them normally; the Mystic's options grant them as innate spells.

**Three of Block 3's spells finished** (B8-9): Burst of Speed's second round, Timeless Motion's movement that provokes nothing, Water Bolt's push.

**Disrupt Soul's magical Focus abilities.** The seven the book calls magical are marked: Abundant Step and Inner Blast ("This is a magical technique"), and the Ghost Arts Shadow Double, Veiled Body, Body of Mist, Shadow Passage and Empty Presence ("This Ghost Art is magical"). Characters made before 0.9.0 are read by name.

## How they work

| Spell | What the system does |
|---|---|
| **Ability Inversion** | The target saves Will. Success or Partial: its highest and lowest ability scores switch until the end of its next turn; Failure, for 1 minute; Fumble or Blunder, for 1 hour; Critical, unaffected. The totals switch (B8-1), so every number they feed follows; a tie is the caster's choice, asked. |
| **Acidic Touch** | For 1 minute your unarmed Strikes deal 1d6 secondary acid, and every melee Strike you hit with makes the target save Fortitude at your spell save DC (B8-2): Failure Sickened 1, Fumble or Blunder Sickened 2, until removed. Nothing is rolled when you cast it. |
| **Age Resistance** | Marks you until your next daily preparation (a month, or for good, warped). The aging rules come with Block 9 and read the mark (B8-8); until then set aside the physical aging penalties by hand. |
| **Arrows Flight** | Once cast, choose a stack of arrows, bolts, sling bullets, darts or shuriken (B8-3; with the +4 PP warp, any ammunition or thrown weapon) and how many, up to 30: they are split off as their own stack, its range increments doubled for 10 minutes (1 hour warped). Target an ally to enchant theirs; the GM's client does the split when you do not own them. An expired stack can be enchanted again. |
| **Boundless Vision** | You cannot be flanked while you sustain it. The sight is the table's. |
| **Disrupt Soul** | The target is marked with your spell save DC (B8-4). Each time it casts a spell (once the casting is paid for) or spends a use of a magical Focus ability it saves Fortitude, rolled for it: Critical, unaffected and the spell ends; Success, 2d8 essence; Failure, 2d8 + 1d8 per PP it spent (B8-5), or + 1d8 per four levels (at least 1d8) for a casting that spent no PP (an innate spell, an item's, a cantrip) or a Focus ability; Fumble or Blunder, as Failure and an essence critical of a basic save's severity. |
| **False Future** | The text: divinations, and the Will saves, are the GM's. |
| **Flowing Step** | Until the end of your turn: advantage on Reflex saves; difficult terrain costs nothing extra and formidable costs as difficult. A zone's own Speed penalty still applies. |
| **Foretell Failure** | Your next d20 check first says whether a 10 on the die would succeed, with all its modifiers. A **skill action** is asked before it spends anything: if a 10 would succeed it is taken; if not you may take a different action, and nothing is spent. A DC the GM sets afterwards is put to the GM, and the action waits (B8-6). A **Strike, a save or a casting's check** is told at its roll, where it is already under way (a Strike has spent its AP and its target has been offered reactions by then). |
| **Root** | A Shove, Trip or Reposition against the target meets its Fortitude DC +2 circumstance, and a Trip its Acrobatics DC too; +1 for each +1 PP bought, to +4. The same bonus is a tick-box on its Acrobatics checks to balance or stay standing on earth, sand or stone. |
| **Skyborne Pathways** | The text: Track at soft terrain's DC, the GM's. |
| **Spiritual Distraction** | The target is marked with your spell save DC (B8-4). Each time it casts it saves Will, rolled for it before its spell check: Critical, unaffected and the spell ends; Success, unaffected; Partial −2, Failure −4, Fumble or Blunder −10 circumstance to that check. |
| **Tranquil Mastery** | For 1 hour the target's Refocus asks for a second spent Focus ability with the first, before the roll (B8-7). A Critical restores both now, a Success both at the start of its next turn; lower results touch only the first. |
| **Burst of Speed** | +20 ft for the first round, then −10 ft for the second (in combat). |
| **Timeless Motion** | Quickened for 1 minute; the first move of each of your turns provokes no reactions. Keeping the extra action to movement is the table's. |
| **Water Bolt** | On a serious or deadly critical the target is pushed 5 feet straight away from you; a wall stops it, as a Shove does. |

**Left for later (B8-9):** Dragon Fear's start-of-turn aura saves, Aura of Heat's sustained repeats and Burning Stride's movement fire need new system machinery, planned as their own core block after Block 10.

## Found in review

An independent review, before release, found these; all are fixed (the system's own are in TRG Prime 3.672.0's notes).
1. **Disrupt Soul's critical was rolled by the caster**, from the cursed creature's client, which seldom owns the caster: the injury failed with a permission error and its card never posted. The cursed creature rolls it now.
2. **A casting that spent no PP but was not innate** (a cantrip, an item's spell) took only 2d8 on a Failure, the same as a Success. It takes the per-four-levels line, as "costs no PP" says.
3. **A refunded cast** (its target picker cancelled) was answered by Disrupt Soul as if paid. It is not now.
4. **Arrows Flight** offered nothing on a stack whose enchantment had run out, and on an ally's quiver it used your own. Both fixed.
5. **Root's balance tick** was offered on every skill check and save; it is on Acrobatics, as interpretation 3 says.

## Checks

- New harness pair `verify-block8` (120 checks) / `mutate-block8` (63 mutations, all caught).
- `verify-block3` (the spells pack's count) and `verify-block5` (Water Bolt's push, now a row) re-anchored; Blocks 3 to 7 and the weapons re-pinned to 0.9.0 and 3.672.0.
