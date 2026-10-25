# Inner Tempest Block 7: audit (archetypes)

25 October 2026. Read against:
- **the book:** v1.2, Chapter 5 "Archetype Feats", lines 3118–3560 of `it12.md`, cut into `tools/content/book-text-block7.json` by `tools/content/extract-book-block7.mjs` (21 archetypes, 9 abilities, 4 class lists; the build prints from there, never retyped);
- **Graham's responses** to the rules audit (IT-C6, C8, C9, M6, M13, M14, M24) and the rulings of 20 to 24 October (B6-10 for Perfect Shot);
- **TRG Prime 3.670.1**, the system as released today. Every system claim below was read in its source; the two that decide most of the plan (the progression parser and the archetype picker) were also run.

## Scope

| Group | Entries | Inventory |
|---|---|---|
| The 21 archetypes | Brawler, Dragon Tamer, Formbinder, Harmony Warden, Iaijutsu Master, Inner Adept, Jade Physician, Lotus Enchanter, Night Lotus, Oathbound, Onmyoji Necromancer, Ronin, Shadowdancer, Shugenja, Soul Weapon Master, Steel Disciple, Tanuki Trickster, Twin Path, Veilborn, Way of the Geisha, Zen Archer | FA-01 to FA-21 |
| The nine abilities printed inside them | Powerful Fists (Brawler), Twin Dragon (Formbinder), Drawn Verdict (Iaijutsu Master), Restorative Palm (Jade Physician), Night Lotus Venom (Night Lotus), Bound Challenge (Oathbound), Wandering Creed and Turning the Blade (Ronin), Soul-Bound Weapon (Soul Weapon Master) | FA-01, 03, 05a, 07a, 09a, 10, 12, 12a, 15 |
| Core archetypes opened to the five classes | Disciple/Ghostwalker: Assassin, Mastermind. Kensai: Mastermind, Vanguard. Mystic: Mastermind, Runemage. Oathblade: Archer, Armour Master, Cavalier, Champion | FA-22 |
| The progression requirements | 21 printed lines | FA-23 |

**The book's rules for archetypes** (the section's introduction):
- once you take an archetype, you must meet its progression requirements before you take another;
- a class feat may carry an archetype as a trait, and is then open to holders of that archetype;
- an archetype may only be taken with a class feat pick.

**The class traits under an archetype's name** are read as the system reads core archetypes: any one of them admits you. A class name admits that class and a tier (Martial, Adept, Expert) admits every class of that tier. Six archetypes print none (Brawler, Dragon Tamer, Inner Adept, Shadowdancer, Tanuki Trickster, Way of the Geisha) and are open to any class that meets the prerequisites. The five classes' tiers are Disciple, Kensai and Oathblade Martial; Ghostwalker Expert; Mystic Adept.

## What the system already has (TRG Prime 3.670.1)

| Need | What exists | Where |
|---|---|---|
| An archetype item | `system.category: "Archetype"`, `prerequisites`, `progressionRequirements`, `traits`; class and tier traits gate the archetype picker, any-of | `picker-filters.mjs:914-948` |
| One archetype at a time | The picker hides every archetype while one taken with an ordinary pick has unmet progression | `picker-filters.mjs:696-745` |
| Only with a class feat pick | Counted against the class picks (shown, not refused) | `feats.mjs:154-163` |
| "You may learn feats of class X" | `registerArchetype(name, { classGrants, tierGrants })`. The archetype's name also gates class feats that carry it as a trait (Perfect Shot's Zen Archer, B6-10) | `module-api.mjs:340`, `feats.mjs:1002`, `picker-filters.mjs:857` |
| A class skill from a feat | `registerClassSkillGrant({ name, flag, label, options })`, one per feat, chosen at the feat's Use | `module-api.mjs:878`, `class-skills.mjs:141` |
| A weapon proficiency from an effect | `weaponProficientName` (one name per effect), `weaponGroupProficiency` | `proficiency-rules.mjs:875-902` |
| Powerful Fists | `unarmedDamage { die, versatile, perBAB, countsAs }` on any item or effect (D12) | `combat/unarmed-profile.mjs:17` |
| Unarmed abilities with a Monastic weapon | `countsAsUnarmed` (D11) | `combat/unarmed-profile.mjs:67` |
| Stances from a module | `helpers.enterStance`, `activeStances`, `stanceConditionals` (D7) | `feats-workflow.mjs:1607`, `stance-declarations.mjs` |
| Innate spells from a feat | `system.grantedSpells` + `flags.trg-prime.grantInnate` (Focus added), `grantedSpellAbility` | `grants-workflow.mjs:430-445` |
| One chosen spell | `helpers.chooseSpell(actor, item, { tradition, ppCost, traitsAny, innate })`, one spell per source item | `feats-workflow.mjs:1591` |
| Daily preparation | the `trgPrimeDailyPreparation` hook (no step registry) | `uses-workflow.mjs:747` |
| Healing, Bleeding | `helpers.healActor`, `helpers.reduceCondition(actor, "bleeding", n)` | `magic/spell-effects.mjs:413`, `feats-workflow.mjs:1643` |
| Initiative bonuses | conditionals with `checkTypes: ["initiative"]`; `trgPrimeInitiativeRolled` | `documents/combat.mjs:135-213` |
| Poison resistance | `system.combat.resistances` from an effect | `defence-lists.mjs` |
| Bonus stacking | **Class bonuses stack** across sources; only armour, circumstance and the like take the highest | `dice/resolution.mjs:234-244` |
| Core items the archetypes name | Affable, Stealthy Strike (Expert, Thief), Stance Mastery, Quick Draw (feats); Shape Of The Humanoid and Mirage Entity (spells, PP 4, Utility category); Treat Wounds, Treat Injury, Treat Toxin, Healing Trance and Power Recovery (actions) | packs, `combat/action-workflow.mjs`, `rest/rest-workflow.mjs` |
| Module pieces this block reuses | Challenge, Sworn Oaths, Combat Forms and the Blended Form merge, Ghost Arts (Block 4); Monastic Paths and `pathOf`, Mystical Disciplines, Flurry of Blows (Block 3); Mystic Essence's picker, Perfect Shot (Block 6); Shadowy Step (Block 4); Unseen Assault (core ambush dice, 3.668.0) | `module/block3/4/6-automations.mjs` |

## Not in the system yet: core work for TRG Prime 3.671.0

| # | For | Gap, and what is proposed |
|---|---|---|
| C1 | FA-23 (13 of the 21 lines) | **The progression parser reads only 8 of the book's 21 lines.** `parseProgressionClause` (run against every line) fails, and so never blocks, on "&" ("Deception & Diplomacy skills +10 ranks", four lines), the plural "skills", "BAB +12." (trailing full stop), "Level +10" (Brawler) and "Gained class skill +10 ranks" (Inner Adept). Proposed: read "&" as "and" (both skills), the plural, and the full stop; "Level +N" as B7-2 rules; and "Gained class skill" as the skill the archetype's own class-skill grant chose (C4). |
| C2 | FA-22 | **The archetype picker never reads `registerFeatAccess`.** Opening core archetypes to a module class works for class feats only. Vanguard, Mastermind and Runemage are class-traited, so the book's lists cannot reach them. Proposed: the archetypeFeat branch honours `registerFeatAccess("archetype", className, names)`. |
| C3 | Brawler, Inner Adept, Steel Disciple, Zen Archer | **`registerArchetype` takes only `classGrants` and `tierGrants`.** A classGrant also brings the class's whole registered access list and its specialist spells, which is more than these archetypes print (B7-3). Proposed: `classFeatTraits: ["Disciple"]`, opening class feats that carry the trait and nothing else; and `countsAsArchetype: ["Archer"]` for Zen Archer's "feats available to the archer archetype". |
| C4 | Jade Physician, Night Lotus, Oathbound, Ronin, Inner Adept, Steel Disciple | **One class-skill grant per feat, and only at the Use button.** Proposed: a fixed class skill declared on the feat (derived while it is held, no button), alongside a choice grant; the progression parser reads the choice (C1). |
| C5 | Oathbound, Zen Archer | **An exotic weapon counted as martial for one holder** (katana, wakizashi), and several named proficiencies on one effect (longbow, shortbow, the composite bows; the Bow group would add the crossbows). Proposed: an effect-declared `weaponCategoryAs: { names, category: "martial" }`, and `weaponProficientName` as a list. |
| C6 | Soul Weapon Master, Zen Archer | **"Any ability that may be used with unarmed strikes … may also be used with" one weapon, or with bows.** `countsAsUnarmed` is per weapon item, for every rule. Proposed: an effect-declared `unarmedAbilityWeapons: { itemIds, groups }` read by the unarmed-only abilities (Flurry of Blows and the rest), and not by the unarmed damage profile (B7-6). |
| C7 | Soul Weapon Master | **Powerful Fists' scaling for one bonded weapon.** `unarmedDamage` reaches only the fists and every strike that counts as unarmed. Proposed: `weaponScaling { itemId, perBAB, countsAs }`, the same shape scoped to one item. |
| C8 | Iaijutsu Master | **"A sword sheathed."** Items are only equipped or stowed. Proposed: a conditional axis `when.sheathed: ["sword"]` and a helper `sheathedWeapons(actor, group)`, under the definition B7-5 rules. |
| C9 | Drawn Verdict | **"The target cannot use reactions triggered by … this Strike"** and **"cannot use reactions until the beginning of its next turn."** Proposed: a per-Strike `noReactions` option and a timed no-reactions state, both refused by the core's `reactionRefusal`. |
| C10 | Restorative Palm | **"Immune to its effects for 1 hour."** The temporary-immunity helpers are not exposed outside area effects. Proposed: `helpers.grantTemporaryImmunity(target, key, seconds)` and `temporaryImmunityRefusal`. |
| C11 | Restorative Palm | **"A new saving throw against one poison or disease currently affecting it."** No helper rolls an affliction's stage save on demand. Proposed: `helpers.rollAfflictionSave(actor, affliction)`, the same save and ladder as at its interval. |
| C12 | Harmony Warden | **"Cast any one … spell … as an innate spell", once a day, chosen when cast.** Spells are granted, not cast from a list. Proposed: `helpers.castInnateOnce(actor, spell, { ability, tradition })`, which casts a spell document as innate without keeping it. |
| C13 | Veilborn | **"+2 to Refocus checks made to restore an expended Ghost Art."** A conditional cannot see which item a Refocus is for. Proposed: an axis on the Refocus check for the item being restored (`when.refocusItems: { flags }`). |
| C14 | Lotus Enchanter, Onmyoji Necromancer | **"+1 class bonus to its innate spell attack checks and save DCs"** for one granted spell. If a spell copy cannot already declare its own attack and DC bonus (to be confirmed when built), proposed: `spellBonus { attack, dc, type }` read from the spell copy. |

## How each archetype will be built

The archetype items go in `it-feats` (category Archetype), with the printed prerequisites and progression line and the class traits. Each is registered with `registerArchetype`. A in the last column means fully automatic; B means automatic with a choice or a GM tick-box.

| Archetype | Build | Core | Class |
|---|---|---|---|
| Brawler | `unarmedDamage` as the Disciple's Powerful Fists (d6, Versatile B, +1 per 3 BAB, magical 3, cold iron and silver 8, adamantine 16); Disciple feats (B7-3) | C1, C3 | A |
| Dragon Tamer | B7-1 | — | — |
| Formbinder | Combat Form's Use offers "add to your form" while one is held: the two forms become one stance, merged keeping **the greater** of any bonus both give (class bonuses stack in the system, so the merge does this). One form a turn; each still spends Combat Form. Twin Dragon is a new form: the first Strike that hits each round gives +1 DB until your next turn, and the first attack that misses you each round gives +1 base damage until the end of your next turn (from `trgPrimeStrikeResolved`) | — | B |
| Harmony Warden | +4 class on Refocus, Healing Trance and Power Recovery behind a "wilderness" tick-box; the daily trance picks a Verdant Utility spell under the ceiling and casts it (B7-4) | C12 | B |
| Iaijutsu Master | +25 class Initiative while a sword is sheathed; Drawn Verdict wields the sword and Strikes the challenged target with no reactions, and on damage the target loses its reactions until its next turn; Focus; the free sheathe offered at turn end if no other Strike followed | C8, C9 | A |
| Inner Adept | grants Inner Discipline; Meditation or Mental Focus as a class skill; Disciple feats; a Monastic Path chosen at its Use (stored as the Path `pathOf` reads, without its class skill) | C1, C3, C4 | B |
| Jade Physician | Medicine class skill; +2 class on Treat Injury, Treat Toxin and Treat Wounds; Restorative Palm (2 AP touch, a living creature other than you: 4 HP per level, or Bleeding −1 per two levels, or a new affliction save; 1-hour immunity; Focus) | C4, C10, C11 | A |
| Lotus Enchanter / Onmyoji Necromancer | Mystic Essence's list gains specialist spells with the Enchantment / Soul trait; +1 class to that spell's innate attack and DC | C14 | A |
| Night Lotus | Medicine class skill; poison resistance; Night Lotus Venom: 1 AP coat (piercing or slashing weapon, or ammunition), until the end of your next turn or the first damage; Fortitude at your Level DC with the printed ladder; −1 circumstance with Unseen Assault; Focus | C4 | A |
| Oathbound | Mental Focus class skill; Bound Challenge is Block 4's Challenge for 1 conviction instead of Focus (IT-M13 as answered); katana and wakizashi martial | C4, C5 | A |
| Ronin | Deception class skill; Wandering Creed asks for a Sworn Oath at each daily preparation and replaces the fixed one; Turning the Blade offered as a reaction when a creature other than the challenged one damages you | C4 | B |
| Shadowdancer | +2 class Stealth; grants Stealthy Strike and Shadowy Step (IT-M14 as answered) | — | A |
| Shugenja | learned casters only (IT-C9); an element chosen once; two spells with that element's traits chosen at each daily preparation, granted innate with Focus | — | B |
| Soul Weapon Master | the bond, made at a daily preparation with a melee weapon; a lost bond waits for the next one; the weapon's scaling; unarmed abilities with it | C6, C7 | B |
| Steel Disciple | one Combat Form chosen, entered as a stance (no Combat Form use); a class skill from four; Kensai feats | C1, C3, C4 | B |
| Tanuki Trickster | +2 class Deception; Shape Of The Humanoid and Mirage Entity innate with Focus, ability and tradition from the Path (IT-M6's fallback) | — | A |
| Twin Path | a second Mystical Discipline: its special ability and its 1st-level additional spells, outside Mystical Power's count; where both abilities would modify one roll, you are asked which | — | B |
| Veilborn | an extra Ghost Art with the Focus trait; +2 class to Refocus one; +1 class DB until your next turn after an art that conceals, makes invisible or teleports | C13 | A |
| Way of the Geisha | grants Affable; +2 class Artistry, Diplomacy and Perform | — | A |
| Zen Archer | longbow, shortbow and the composite bows; grants Perfect Shot; unarmed abilities with a bow; counts as Archer for Archer-trait class feats | C3, C5, C6 | A |
| FA-22 | `registerFeatAccess("archetype", …)` for the four printed lists | C2 | A |

## Questions for Graham

| # | Question | Proposal |
|---|---|---|
| B7-1 | **Dragon Tamer** gives a Dragon Companion, which is Block 10. Ship the archetype now (doing nothing until Block 10) or with the companions? | **With the Dragon Companions in Block 10.** Its egg prerequisite and the companion are built together there. |
| B7-2 | **Brawler's "Level +10".** Every other line reads "+10" as a total ("BAB +10" is BAB 10; "+10 ranks" is 10 ranks), and the system reads them that way. Character level 10, or ten levels after taking Brawler? | **Character level 10**, as the other twenty read. |
| B7-3 | **"You may also learn feats which are available only to the Disciple (Martial) class"** (Brawler, Inner Adept) and **"feats which have the Kensai (Martial) trait"** (Steel Disciple). | **Class feats with the Disciple / Kensai trait**, as you ruled for Inner Magic (B6-7). Not the core feats the book opens to the Disciple, and not every Martial feat. |
| B7-4 | **Harmony Warden:** "any one PP 2 Verdant spell which has the utility trait … At 5th level and every 5 levels thereafter the PP of the spell increases by two." The system's spells carry Utility as their category, not a trait. And does the PP rise mean a bigger spell, or the same spell cast with more PP? | **A Verdant spell of the Utility category, chosen when you enter the trance, with base PP up to 2 (4 at 5th level, 6 at 10th…)**, under the usual innate limit. |
| B7-5 | **Iaijutsu Master:** what is "a sword sheathed"? | **You carry a weapon of the Sword group that you are not wielding** (on you, not packed away). Drawn Verdict draws it as part of its 1 AP. |
| B7-6 | **Soul-Bound Weapon and Zen Archer:** "any ability that may be used with unarmed strikes (such as Flurry of Blows) may also be used with" it. Does that bring Powerful Fists' damage too? | **Abilities only** (Flurry of Blows, Stunning Fist, Inner Strike, Elemental Fist and the like), not the fists' damage die, scaling or materials. The Soul-Bound Weapon has its own scaling. An ability that needs a melee attack still needs one, so with a bow only the abilities that work at range apply. |
| B7-7 | **Formbinder and Blended Form:** can a Formbinder hold a blend and another form, three forms in all? | **No: a blend fills both of Formbinder's places.** |
| B7-8 | **The core archetypes by tier:** the system already opens every Martial archetype to a Martial class (Armour Master and Cavalier to the Disciple and Kensai, which the book lists for the Oathblade only), and Expert ones to the Ghostwalker. Keep that? | **Keep it.** The book's lists add to the system's tier rule; they do not replace it. |

## Interpretations (they stand unless Graham says otherwise)

1. **Shugenja's spells** are any spell, of any tradition, carrying either of the element's traits, but not specialist spells (Lotus Enchanter and Onmyoji name specialist spells when they mean them). They refresh at each daily preparation.
2. **Restorative Palm's "new saving throw"** is the affliction's own stage save, rolled now, with its usual ladder. Its 1-hour immunity covers all three uses.
3. **Night Lotus Venom** has no Partial row; a Partial is treated as the Success row (IT-m24).
4. **Inner Adept's Path** must match the character's tradition where the class has one (a Kensai's or Oathblade's chosen tradition, a core caster's class tradition); otherwise any Path.
5. **Iaijutsu Master's +25** is a class bonus and stacks with other class bonuses to Initiative (Steel Viper's), as the system stacks class bonuses.
6. **Harmony Warden's +4** is offered as a "wilderness" tick-box on those three checks, for the GM's call. It stacks with Veilborn's +2 (IT-M24: intended).
7. **Veilborn's +1 DB** follows these Ghost Arts: the concealing, invisible and teleporting ones, listed by name when built.
8. **Oathbound's katana and wakizashi** are martial for the holder; a Martial class is proficient with martial weapons, so it is proficient with them.
9. **The class-trait lines** are any-of, as the system reads core archetypes: "MARTIAL OATHBLADE" admits a Martial class or the Oathblade (Iaijutsu Master's prerequisite then asks for the Oathblade).

## Releases

- **TRG Prime 3.671.0:** C1–C14, with a verify/mutate pair.
- **Inner Tempest 0.8.0:** the 20 archetypes (Dragon Tamer per B7-1) and FA-22, with `verify-block7` / `mutate-block7`, then the usual review, sweep and live test.
