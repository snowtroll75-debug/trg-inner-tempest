# Inner Tempest rulings: Block 9 (26 October 2026)

Graham, 26 October 2026, on the Block 9 audit (`docs/INNER_TEMPEST_BLOCK9_AUDIT.md`): **"Go with your recommendations."** Every proposal is adopted, and so are the interpretations.

| # | Ruling |
|---|---|
| B9-1 | **Do-maru:** Full, but not the arms. It covers the torso and legs, so a critical to the arms reads the unarmoured row. |
| B9-2 | **Soulful Strike:** the secondary critical's −3 (II) and −1 (III) are the energy runes' −40 and −20 on the injury roll. |
| B9-3 | **Harmony Edge:** advantage on the critical injury roll, keeping the result worse for the target. Against a minor critical's disadvantage the two cancel, and it is rolled once. |
| B9-4 | **Mindful:** v1.2 prints no effect. It ships priced and inscribable, its Engage (1 AP) a Focus use, and the card says the effect is the GM's until the text is supplied. |
| B9-5 | **Monastic Items:** the crafter still needs Magical Crafting (or Brew Potion), with Meditation replacing the skill, DC +2, Meditation ranks at least the item's level, and no charged items. The crafter ticks that the effect is a technique or innate spell they know. |
| B9-6 | **Lotus Blossom:** per character. The second elixir drunk in a day, from any bottle, deals a serious poison critical before its effects. |
| B9-7 | **Mystic Incense Burner:** a 30-foot aura from the bearer's space for the hour, reaching every creature, the bearer included. Each lighting uses one Incense (5 gp). |
| B9-8 | **Spiritblade:** as R14. The dice are stored bare as 1d10 (Potency III adds its own), with the Nodachi's fumble DC of 12. The printed AB is what the sheet derives. |
| B9-9 | **Harmonious Do-maru:** the printed values win. The item carries ACP −1, Max Dex 7, DR 3, HP 55 and 15 lb. |
| B9-10 | **Aging:** a world setting, on by default while Inner Tempest is active. A character with no age set is unaffected. |
| B9-11 | **Aging and HP:** age modifiers leave max HP and the skill budget alone, now and at later levels (core C10). |

**Interpretations 1 to 8 stand**, as written in the audit.

**Module version:** 0.10.0, since Block 10 remains.

## Found while building (26 October 2026)

- **B9-4 needs no answer: v1.2 does print Mindful's effect.** It sits on the same line as an image tag in the docx, and the audit's extract dropped the line with the image: "Add your Wisdom ability score to your next attack roll with the weapon, which must be made before the beginning of your next turn. The rune then becomes expended and can be restored with Refocus." The rune is built from that text (Engage, Focus; +Wisdom offered on the next attack, spent when ticked, lifted at the start of your next turn; core 3.673.0 C7b). The ruling's "the effect is the GM's" no longer applies.
- **Harmonious Do-maru's printed DB +0** disagrees with its own Potency I (+1 item DB on armour). B9-9's "the print wins" covered ACP, Max Dex, HP and weight; the rune is kept as printed, so the sheet shows DB +1. Put to Graham in the 0.10.0 release notes.
- **Interpretation 5 (Guarded) reads slightly differently in the build.** The critical's extra dice are rolled separately and not dealt at all, so DR never meets them; half of what they rolled is healed.

## Graham's answers, 27 October 2026

After the live test of 0.10.0:
- **Harmonious Do-maru: DB +1.** Potency I applies over the printed DB +0. That is what was built; the GM note now records the ruling instead of suggesting Potency I be removed.
- **Spiritblade: fumble DC 11.** The Nodachi's 12, less 1 for Balanced. That is what was built; the GM note records it.
- **The Sash of Serenity (F1, 0.10.1):** a kind chosen at the Use is taken on the next save of that kind, forced or not ("Yes please" to the proposed fix).
- **A timed rune's two expiry cards:** "Fix timed rune message". Fixed in core 3.673.2: the clock no longer adds "… expires" to a rune timer's own ending.

