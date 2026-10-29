# Inner Tempest module — progress file

This is the durable record that lets work resume across sessions. Update it at the end of every working session. Status here must match `docs/INNER_TEMPEST_IMPLEMENTATION_MATRIX.md`, which is generated from `tools/inventory/inventory.txt`.

## Current state — 28 Oct 2026 (session 7: Block 10 done; 1.0.1 and core 3.674.1 published; 1.0.2 and 3.674.2 built)

- **Hurling (core 3.674.0, rebuilt):** copies the 3.666.1 repair never reached (Fiends & Fables creatures, compendium casters) read their printed "1d6 + magical ability score"; confirmed live (Human Ghost +5).
- **Live test of 1.0.0 on 3.674.0** (`live-testing-report-3.674.0.md`): Block 10 works live (hatching as GM, growth, breath, death and held Soul Drain, rest, weekly recovery, restoration, separation, Draconic Spell, Imitate Sound warning, Deflecting Wings on the player's screen). Faults: F1 a player cannot create the companion; F2 a new companion at template HP; F3 High Magic tied with F&F's; F4 the breath's length undone by codex inheritance; F5 DB 2 above the printed blocks; F6 Hurling's old "added by hand" note.
- **Graham:** "Printed block for dragon db. Build fixes 1-5 and amend text on point 6".
- **1.0.1 built:** no DB from the growth (the printed blocks are the system's creature rule); the breath copy opts out of codex inheritance. `verify-block10` 117, `mutate-block10` 110/110.
- **Core 3.674.1 built:** companion creation through the GM relay; full HP at creation; compendium source kept; Hurling's note amended. `verify-block10-core` 48, `mutate-block10-core` 78/78.
- **Retested live** (`live-testing-report-3.674.1.md`): F1–F6 all fixed. One cosmetic fault: the hatching card said Will +12 against the sheet's +14. Fixed: the core's `createCompanionFor` takes `beforeCard`, where the module sets the dragon's printed feats, ranks and fields (`verify-block10` 118, `mutate-block10` 111/111; `verify-block10-core` 49, `mutate-block10-core` 79/79).
- **Published with Graham's approval** ("Do the one line fix and then push"): core v3.674.1 (`7dcd229` 3.674.0, `95356e8` 3.674.1) and Inner Tempest v1.0.1 (`a489cb5`). Releases created by the workflows at 12:20Z.
- **Republished as core 3.674.2 and Inner Tempest 1.0.2** (Graham: "update the version number of the two zips, otherwise it will not trigger updates"): the card fix had gone out under numbers already installed. Every pin moved; all suites green.
- **Block 10 done.**
- **Bookkeeping (Graham: "lets do the bookkeeping"):** the three "In progress" lines (SYS-04, SYS-13, SYS-11) closed as Implemented; twelve built features that had no status line recorded (RA-01 to RA-09, CL-06, FC-14a, SYS-02, and SYS-12, which is Block 9's Monastic Items route); SYS-09 and SYS-10 recorded Not started (they need a journal entry and there is no journal pack: Graham to decide). Implemented 407 of 409.
- **Tested live is now counted, not fixed at 0:** a status line's `live` lists the reports that record the feature exercised in the world, each with a verbatim quote (checked against the report). 219 of 409; the matrix ends with the evidence table. Ten borderline cases left out (only partly seen, a tick never applied, or a fix never retested).
- **Published as 1.0.3** (Graham: "I would like it pushed now so create an updated version to do this"): the bookkeeping only; every block re-pinned.
- **1.0.4 built:** the fifteen compendiums in one "Inner Tempest" folder (`packFolders`), as Pillars of Faith (Graham, 29 Oct: they arrived without a root folder). `verify-block10` 119, `mutate-block10` 113; all suites green.

## Earlier — 27 Oct 2026 (session 7: Block 10 built — 1.0.0 on core 3.674.0)

- **Block 10 audited and ruled** (`docs/INNER_TEMPEST_BLOCK10_AUDIT.md`; B10-1 to B10-14 and interpretations 1–7, all adopted: "Go with your recommendations", `docs/INNER_TEMPEST_RULINGS_2026-10-27-B10.md`). Found while building: the light dragon's derived DB is 24 (as printed) and its ranks 45 (its budget); only the fire dragon differs (DB 22 against 23; ranks 66 of 48).
- **1.0.0 built:** a new it-dragons pack (the class with the table, rows 1–30; the four base dragons; four eggs), bites and claws in it-companions, four breaths and High Magic in it-abilities, Dragon Tamer and the four companion feats in it-feats; `module/block10-automations.mjs` (kind registration, growth reconciler, hatching, egg bonding, losing a dragon, the feats). Book text in `tools/content/book-text-block10.json` (`tools/content/extract-book-block10.mjs`).
- **Core 3.674.0:** C1–C12 and F. Pair `verify/mutate-block10-core` 39 and 66.
- **Harnesses:** `verify-block10` 116, `mutate-block10` 109/109; Blocks 1 to 9 and the weapons re-pinned to 1.0.0 and 3.674.0; every module suite green.
- **Independent review:** two bugs (a bond broken twice; deaths by the skull alone) and six risks (clockless tables, overlapping growth runs, restoration timing, re-separation, Sweep, the Soul Drain cards), all fixed.
- **Next:** core sweep on the staged 3.674.0, zips, Graham installs, live test. **Nothing pushed.**

## Earlier — 27 Oct 2026 (session 7: Block 9 live-tested; 0.10.1 and core 3.673.1 built)

- **Live test of 0.10.0 on 3.673.0** (`live-testing-report-3.673.0.md`): Block 9 works live; two faults. **F1** (module): the Sash of Serenity's advantage, a tick-box, was never asked on a forced save. **F2** (core): a weapon card's "Now X HP" left out Guarded's heal. Graham: "Yes please" to building both fixes.
- **0.10.1 built:** a kind chosen at the Sash's Use is taken on the next save of that kind and spent; "any" stays a tick-box. `verify-block9` 83, `mutate-block9` 94/94; Blocks 3 to 9 and the weapons re-pinned to 0.10.1.
- **Core 3.673.1 built:** the weapon card counts Guarded's heal, as the spell card did. `verify-block9-core` 68, `mutate-block9-core` 91/91.
- **Graham's answers, 27 Oct:** the Harmonious Do-maru's DB is +1; the Spiritblade's fumble DC is 11 (both as built); "Fix timed rune message".
- **0.10.2 built:** the two GM notes record the rulings. `verify-block9` 84, `mutate-block9` 96/96.
- **Core 3.673.2 built:** a rune timer ended by either clock no longer adds "… expires" to its own ending. `verify-block9-core` 71, `mutate-block9-core` 98/98.
- **Live test of 3.673.2 and 0.10.2** (`live-testing-report-3.673.2.md`): the three fixes work live (Guarded's heal across clients, the Sash on a forced save, one card per rune timer). F3 (core, cosmetic): "Includes critical bonus dice" printed when Guarded had kept the dice off; fixed as **core 3.673.3** (`verify-block9-core` 73, `mutate-block9-core` 103/103; full sweep 651/651).
- **Pushed, 27 Oct (Graham: "Put the fix in first and then push"):** core 3.673.0 to 3.673.3 as four commits on main; module 0.10.2 (Block 9 with 0.10.1 and 0.10.2) as one commit. Each repo's "Publish Foundry …" workflow published the release for the pushed head (v3.673.3, latest; v0.10.2), as for earlier blocks; the intermediate 3.673.0 to 3.673.2 have commits but no release of their own. A cloud session cannot create releases itself (GitHub answers 403), and needs not: pushing main is the release step.

## Earlier — 26 Oct 2026 (session 7: Block 9 built)

- **Block 9 audited and ruled** (`docs/INNER_TEMPEST_BLOCK9_AUDIT.md`; B9-1 to B9-11 and interpretations 1–8, all adopted, `docs/INNER_TEMPEST_RULINGS_2026-10-26-B9.md`). Found while building: v1.2 does print Mindful's effect (B9-4 needs no answer); the Harmonious Do-maru's DB +0 against its Potency I is put to Graham.
- **0.10.0 on core 3.673.0 built:** five packs (it-armour 9, it-runes 19, it-specific-items 2, it-wondrous 6, it-gear 1), eleven registered runes, five wondrous Uses, the Monastic Items Create route, and the Appendix's aging (`module/aging.mjs`, `module/aging-workflow.mjs`; world setting "Aging (Appendix)"). Book text in `tools/content/book-text-block9.json` (`tools/content/extract-book-block9.mjs`).
- **Core 3.673.0:** C1–C10 of the audit, plus C7b (Mindful's turn-start expiry), C11 (`releaseItemSpell` helper) and C12 (per-tier declared values; one rune name on armour and weapons), and Q (asking a creature's own player). Pair `verify/mutate-block9-core` 66 and 86.
- **Harnesses:** `verify-block9` 82, `mutate-block9` 91/91; Blocks 1 to 8 and the weapons re-pinned to 0.10.0 and 3.673.0.
- **Independent review:** seven findings (the relay outwaited by a player's answer, a late yes spending the day, Harmony Edge at a deadly critical, Guarded on spell criticals, Tranquil Quiver's usage, an unmeasured distance, the burner put out by hand), all fixed.
- **Core sweep on the staged 3.673.0:** 651 harnesses, 642 passed; the 9 failures (anchors on lines Block 9 changed, and `tierValued` recorded as a deliberate keep) re-anchored and re-run on the stage, all green. **Zips built:** `trg-prime-3.673.0.zip`, `trg-inner-tempest-0.10.0.zip`.
- **Next:** Graham installs, live test. **Nothing pushed.**

## Previous state — 26 Oct 2026 (session 6: Block 8 published)

- **Block 8 audited and ruled** (`docs/INNER_TEMPEST_BLOCK8_AUDIT.md`; B8-1 to B8-9, all proposals adopted, `docs/INNER_TEMPEST_RULINGS_2026-10-26.md`). B8-9: Burst of Speed, Timeless Motion and Water Bolt finished now; Dragon Fear, Aura of Heat and Burning Stride wait for a core block after Block 10.
- **0.9.0 on core 3.672.0 built:** the Grimoire's other 13 spells; magical Focus abilities marked. Core seams C1–C13 with `verify/mutate-block8-core`. Independent review: ten findings, all fixed (among them Foretell Failure asked before anything is spent, via `TRGCheck.preview`).
- **Tested live** (`LIVE_TESTING_REPORT_3.672.0` in the project): Block 8 works, cross-client paths included. Two module defects (Root's Trip DC counted twice; Arrows Flight's card printed HTML) and Root's wording fixed as **0.9.1**; a core wording fix (a save DC named by its key) as **3.672.1**. Both retested or swept green.
- **Pushed with Graham's approval:** core 3.672.0 and 3.672.1, Inner Tempest 0.9.1. **Block 8 done.** Next: Block 9 (magic items and the aging appendix; Age Resistance's mark waits for it).

## Previous state — 25 Oct 2026 (session 5: 0.8.1 built)

- **Published on GitHub** with Graham's approval: core 3.670.1 (`snowtroll75-debug/trpg-prime`), Inner Tempest 0.7.1 in its new repository `snowtroll75-debug/trg-inner-tempest` (a push to `main` that raises the version publishes the release), Fiends & Fables 0.45.2. Manifest: `https://raw.githubusercontent.com/snowtroll75-debug/trg-inner-tempest/main/module.json`.
- **Block 7 audited and ruled** (`docs/INNER_TEMPEST_BLOCK7_AUDIT.md`; B7-1 to B7-8, all proposals adopted, `docs/INNER_TEMPEST_RULINGS_2026-10-25.md`). Book text in `tools/content/book-text-block7.json` (`tools/content/extract-book-block7.mjs`).
- **0.8.0 on TRG Prime 3.671.0 built:** twenty archetypes (Dragon Tamer to Block 10), seven abilities, FA-22. Core seams C1–C16 with `verify/mutate-block7-core` 55 and 69. Module `verify-block7` 225, `mutate-block7` 114; Blocks 1 to 6 and the weapons re-pinned and green. Independent review: nine findings, all fixed (core pair now 59/74).
- **Core sweep on the staged 3.671.0:** 645 harnesses, 635 passed; the 10 failures (five pairs pinned to lines Block 7 changed, the uncalled-exports ratchet) re-anchored and re-run on the stage, all green. **Zips built:** `trg-prime-3.671.0.zip`, `trg-inner-tempest-0.8.0.zip`.
- **0.8.0 on 3.671.0 tested live** (`LIVE_TESTING_REPORT_3.671.0`): Block 7 works; two module defects (Drawn Verdict's sheathe never offered; a form's own Use skipped Formbinder's question). **0.8.1 built** (module only): `verify-block7` 228, `mutate-block7` 118.
- **0.8.1 retested live:** both fixes pass. **Block 7 done.** Pushed to GitHub with Graham's approval: core 3.671.0 (`snowtroll75-debug/trpg-prime`) and Inner Tempest 0.8.1 (`snowtroll75-debug/trg-inner-tempest`). The 3.671.0 `system.json` had lost its manifest and download links, so core **3.671.1** was republished with them (Graham's approval) and a `verify/mutate-release-links` pair now keeps them set. Lesson: the dev tree's `system.json` must carry the links; check the published asset, not only the commit.
- **To test live:** Wandering Creed beside Sworn Oath (the oath now counts as Sworn Oath's choice); Restorative Palm on another player's character (GM relay); Veilborn's +2 in the Refocus dialog.

## Earlier — 25 Oct 2026 (session 5: 0.7.1 built)

- **0.7.0 tested live on 3.670.0** (`live-testing-report-3.670.0`): every Block 6 feat reachable live works. Two defects (Drunken Strike's Feint asked for Deception training; a Stride straight away from an adjacent enemy provoked nothing, core and older) and two text lines.
- **Graham:** fix both and the text. **0.7.1 on TRG Prime 3.670.1** built: core pair `verify/mutate-fixes-3670-1` 12 and 9; module `verify-block6` 183, `mutate-block6` 85.
- **0.7.1 on 3.670.1 tested live** (`live-testing-report-3.670.1`): all four fixes pass; no new defects. **Block 6 done. Nothing pushed.**

## Earlier — 24 Oct 2026 (session 5: Block 6 built)

- **0.6.2 tested live** on 3.669.2 (`live-testing-report-3.669.2`): every fix confirmed.
- **Block 6 audited and ruled** (`docs/INNER_TEMPEST_BLOCK6_AUDIT.md`; B6-1 to B6-10, all proposals adopted, in `docs/INNER_TEMPEST_RULINGS_2026-10-24.md`). Book text in `tools/content/book-text-block6.json` (`tools/content/extract-book-block6.mjs`).
- **0.7.0 built** on TRG Prime **3.670.0**: the fourteen remaining class feats (`tools/content/block6.mjs`, `module/block6-automations.mjs`), Drunken Strike, FC-55's 33 core class feat entries, Elemental Fist in Inner Strike and Stunning Fist in Flurry (Block 3), the Mystic's `innateMetamagic` mark. Inventory FC-08 to FC-55 recorded in `tools/inventory/status.json`.
- **Core 3.670.0:** C1–C12 (unarmed-scoped traits, set damage types, bleed bonus, longer Step, first difficult square, Pack Attack from an effect, first Move free, mapSteps, trade-off waivers, preset modifiers, declared class trait access, innate Metamagic), and `missed` on `trgPrimeStrikeResolved`. Core pair `verify/mutate-block6-core` 39 and 49.
- **Independent review** before release: ten findings, all fixed (both release notes). Lessons: the cast workflow reads every innate spell as PP 0 and never a cantrip; `hits: false` on the Strike hook is not a miss; TRG Prime's ranged modes are "missile" and "thrown".
- **Harnesses:** `verify-block6` 181, `mutate-block6` 84/84; Blocks 1–5 and the weapons re-pinned, green, every mutation caught.
- **Not yet tested live. Nothing pushed.**

## Earlier — 24 Oct 2026 (session 5: 0.6.2 built)

- **0.6.0 tested live** twice (`live-testing-report-it-0.6.0`, part 2 as a player with Test PC 1 on localhost:30000 beside the GM on 127.0.0.1:30000). Graham's B5-5: a Blunder gets Fortune's Reversal.
- **0.6.2 built** on TRG Prime **3.669.2** after the 0.6.1 live test (`live-testing-report-3.669.1`) and rulings B5-6 (Aid Another's ticks in its own dialog) and B5-7: Many-Faceted Vigilance opts Compound Eyes out of codex inheritance while held; every reaction offer asks the system's refusal first; Resist Dying spends through the system; Foundry 14 deletions. Lesson: a value the system prepares can differ from the value saved, so check the prepared one (the 0.6.1 harness checked the saved row).
- **0.6.1 built** on TRG Prime **3.669.1**: the Raptorial Blade's AR on its trait line; Awaken the Animism's typed Speed bonuses; Mist Veil's and Spirit Beacon's switches held in combat; Forgeheart and Many-Faceted Vigilance raise the existing tick; reactions spent through the system (Battle Readiness); Spirit Roar's shared conviction die; Hive Coordination on Aid Another; a start-up pass for 0.6.0 characters.
- **Core 3.669.1:** B5-5; reaction refusal before a reroll; one conviction ask per shared roll and none on an exact first; no AP for a paused player's move; Aid Another's action key. Pair `verify/mutate-fixes-3669-1` 16 and 18.
- **Not yet tested live. Nothing pushed.**

## Earlier — 24 Oct 2026 (session 5: Block 5 built)

- **0.6.0 built** on TRG Prime **3.669.0** (Block 5): the 47 racial feats of Chapter 5 (`tools/content/block5.mjs`, `module/block5-automations.mjs`), FR-48's 33 core racial feat entries opened to the four races with heritage limits, Water Bolt (B5-1) and Draconic Armament's Bite and Claw. Inventory FR-01 to FR-48 recorded in `tools/inventory/status.json`.
- **Core 3.669.0:** C1–C9 of the audit, plus the conviction refund (B5-3), switched ally auras, registered light sources (Living Lantern and Spirit Beacon light the token), placed light circles (Foxfire), and the light cleanup now redraws the brightest light left. Core pair `verify/mutate-block5-core` 51 and 58; the older text harnesses named in the 3.669.0 notes re-anchored.
- **Foxfire is light circles, not tokens** (a token would be read as a creature); asked of Graham in `docs/RELEASE_NOTES_0.6.0.md` with two other questions.
- **Independent review** before release: six module findings and six core findings, all fixed (listed in both release notes). Elemental Attunement is now innate spells only, as printed.
- **Harnesses:** `verify-block5` 542, `mutate-block5` 66/66; Blocks 1–4 and the weapons re-pinned and green, every mutation caught.
- **Not yet tested live. Nothing pushed.**

## Earlier — 24 Oct 2026 (session 5: Block 5 audited and ruled)

- **Block 4 done:** 0.5.1 on core 3.668.2 passed live (live-testing-report-it-0.5.1, live-testing-report-3.668.2). Graham's three answers after 0.5.1 kept it as built; Double Slice fixed in core 3.668.2.
- **Block 5 audit** (`docs/INNER_TEMPEST_BLOCK5_AUDIT.md`): the 47 racial feats and the 33 core racial feat entries opened to the four races. Book text in `tools/content/book-text-block5.json` (`tools/content/extract-book-block5.mjs`). Core work C1–C9 planned for TRG Prime 3.669.0.
- **Rulings B5-1 to B5-4** (`docs/INNER_TEMPEST_RULINGS_2026-10-24.md`): Water Bolt in Block 5; spell lists by trait plus four fixes; Adaptive Mind as conviction's Advantage refunded on success; Foxfire as three light tokens.

## Earlier — 23 Oct 2026 (session 5: 0.5.1 built)

- **0.5.0 live-tested on 3.668.0** (live-testing-report-it-0.5.0): the three classes work in play. Two module defects (Combat Form's learning spent its use; Misdirecting Whisper spent on a refused Feint) and one cosmetic core label, all fixed in 0.5.1 / 3.668.1.
- **Graham's four answers** recorded in `docs/INNER_TEMPEST_RULINGS_2026-10-23.md` ("After 0.5.0"): Deflect Arrow keeps Evade; add Chapter 6's weapons (weapons only); Iron Tortoise includes the Trip; Form Reversal not counted as the Flourish.
- **0.5.1 built** on TRG Prime **3.668.1**: the sixteen Chapter 6 weapons (new `it-weapons` pack, cut from the docx by `tools/content/extract-book-weapons.mjs` into `tools/content/book-text-weapons.json`), the two fixes, the Trip. Core 3.668.1: `ownsFocusUse`, the penalty label, Backswing, Brace and Twin. Core pair `verify/mutate-it-fixes-3668-1` 22 and 30; module pair `verify/mutate-weapons` 117 and 33.
- **An independent review** before the sweep found four core defects (Twin worsening Dying, Backswing missing rune damage and multi-Strike feats, the label regression), all fixed in 3.668.1.
- **Three questions for Graham** in `docs/RELEASE_NOTES_0.5.1.md`. **Not yet tested live. Nothing pushed.**

## Earlier — 23 Oct 2026 (session 5: Block 4 built)

- **0.5.0 built** on TRG Prime **3.668.0** (Block 4): the Ghostwalker, the Kensai and the Oathblade, fifteen Ghost Arts, twelve Combat Forms, four Sworn Oaths and the 28 class feats (B4-1). Rulings B4-1 to B4-4 and Black Lotus in `docs/INNER_TEMPEST_RULINGS_2026-10-23.md`; the audit's interpretations, as built, in `docs/INNER_TEMPEST_BLOCK4_AUDIT.md`; four questions for Graham in `docs/RELEASE_NOTES_0.5.0.md`.
- **Book text** is cut from the docx by `tools/content/extract-book-block4.mjs` into `tools/content/book-text-block4.json` and printed from there, never retyped.
- **Core 3.668.0:** scaled values, three new scopes (weapon group, range band, target state), a group's trait, a reaction-attack penalty, a defence row against all but one, declared AR, ambush dice, per-Strike options, the held blow, `trgPrimeStrikeResolved` and `trgPrimeAmbushDealt`, and helpers `mapPenalty`, `rollWeaponDamage`, `traitCheck`, `heldStrikeDue`, `landHeldStrike`, `enterStance`'s `waiveWait`, a flat rider. Core pair `verify/mutate-block4-core` 54 and 56; fourteen older text harnesses re-anchored.
- **An independent review** of the new automations before any live run found nine defects, all fixed and checked (release notes, "Found before the live test").
- **Harnesses:** `verify-block4` 1360 and `mutate-block4` 81/81; Blocks 1 to 3 green. Core full sweep on a clean stage: see the 3.668.0 release notes.
- **Not yet tested live. Nothing pushed.**

## Earlier — 23 Oct 2026 (session 5: 0.4.1 live-tested)

- **Live test of 0.4.1 on core 3.667.2** (live-testing-report-it-0.4.1): the three 0.4.1 fixes pass. Inner Strike's type buttons re-type the rider free, even with no use left. Burst Step's card reads "now 60 ft". Shadowy Stance's card says 1 minute.
- **One new defect, fixed in 0.4.2 on core 3.667.3:** Inner Strike's +1 status to unarmed attacks never applied. It was a tick-box, and a weapon attack opens no dialog. The core's new `attackForms` axis lets it apply automatically on unarmed melee attacks.
- **The same gap elsewhere:** tick-boxes were never offered on rolls that open no dialog. Graham ruled "Attacks + Spellcraft": core 3.667.3 asks them before a weapon attack or a Spellcraft check (Spirit Stance's possession clause, Echoes Beyond, Maintain Clarity on a Concentrate or Mental spell). Forced saves stay as they were, so Observe Technique and Root the Body on a forced save remain hand rulings. See `docs/RELEASE_NOTES_0.4.2.md`.
- **0.4.2 on 3.667.3 live-tested** (live-testing-report-3.667.3): Inner Strike's +1 applies on the fists and not on a sword; the tick-box prompt works on attacks (Spirit Stance, ticked, unticked, Shift), keeps its answer through Alter the Thread, offers Echoes Beyond, works on Spellcraft, and stays quiet on a forced save. Its row layout was fixed in core 3.667.4. **Nothing pushed.**

## Earlier — 23 Oct 2026 (session 5: Block 3 live-tested)

- **Live test of 0.4.0 on core 3.667.0** (live-testing-report-3.667.0): the Disciple and Mystic work in play. Five defects were found and fixed in **0.4.1 on core 3.667.1**: techniques arriving 1 of 2 under Deep Focus (core), Resolve giving no conviction point (core), Inner Strike's type change costing a use, Burst Step's card Speed, Shadowy Stance's card. The Alter the Thread ordering was confirmed by Graham: the attacker's conviction comes first (core 3.667.2).

## Earlier — 22 Oct 2026 (session 5: Block 3 built)

- **0.4.0 built** on TRG Prime **3.667.0** (Block 3): the Disciple and the Mystic, the four Monastic Paths, the five Mystical Disciplines, Inner Discipline and its techniques, the eleven Technique class feats (B3-1) and the eleven Grimoire spells the disciplines grant (B3-1). Rulings B3-1 to B3-5 in `docs/INNER_TEMPEST_RULINGS_2026-10-22.md`; interpretations in `docs/INNER_TEMPEST_BLOCK3_AUDIT.md` and five for Graham in `docs/RELEASE_NOTES_0.4.0.md`.
- **Core 3.667.0:** stat rows (Disciple's Dodge, Incredible Movement, Serene Defence), the unarmed profile (Powerful Fists, Monastic weapons), Versatile B, the strike series (Flurry), the attack reroll (Alter the Thread), the innate PP allowance (B3-2), `trgPrimeDamageApplied`, declared-effect stat rows and conditionals, helpers `runStrikeSeries`, `countsAsUnarmed`, `basicSaveHit`. Core pair `verify/mutate-block3-core` 53 checks, 52 mutations.
- **Harnesses:** `verify-block3` 1034 checks against `tools/content/book-text-block3.json` (cut from the docx by `tools/content/extract-book-block3.mjs`; completeness as well as verbatim), `mutate-block3` 102/102. Blocks 1 and 2 re-anchored: 378/54, 205/93.
- **Found while building:** the first transcription missed the three GREATER MASTERY blocks (Bounding Step, Inner Sight, Inner Strike), a sentence of Aura of Heat and the disciplines' full text; all fixed, and the harness now fails on a truncated paragraph.
- **Not yet tested live. Nothing pushed.** The Grimoire's other fourteen spells stay in Block 8.

## Earlier — 22 Oct 2026 (session 4: after Graham's game)

- **0.3.3 built** on TRG Prime **3.666.1**. After the session of 21–22 October Graham reported that core's Nimble Dodge was never offered to the player; TRG Prime 3.666.1 adds a defence offer and 0.3.2 registered Evade and Impact Absorption with it.
- **Live test of 3.666.1 with 0.3.2** (live-testing-report-3.666.1, GM and a real player client): Graham's three core defects all fixed. Two module defects found and fixed in **0.3.3**: Evade's dodge arrived after the attack read the DB (the resolution hook is not awaited; the offer now waits), and Impact Absorption, an ability, was never offered (abilities are now looked up). `verify-block2` 205, `mutate-block2` 93/93; `verify-block1` 374, `mutate-block1` 54/54. **0.3.3 live-tested 22 Oct (live-testing-report-it-0.3.3): both fixes pass, GM- and player-answered; no defects. Nothing pushed.**

## Earlier — 21 Oct 2026 (session 3: Block 2 built)

- **Block 1 done** and passed live on TRG Prime 3.665.1 with Inner Tempest 0.2.0 (live-testing reports 3.665.0 and 3.665.1).
- **Block 2 live-tested on 21 Oct** (live-testing-report-3.666.0): four module defects found and fixed in Inner Tempest **0.3.1**; core 3.666.0 and F&F 0.45.2 passed. Built as Inner Tempest **0.3.0** (the seventeen Chapter 4 skill actions) on TRG Prime **3.666.0** (one-attack defences with Nimble Dodge fixed, the save-bonus reaction, list DC rows, the Dying Check's scope, declared time ladders, action traits on checks, ward zones, helpers and hooks, `outcomesApplied`, and the multiple attack penalty in combat only). `verify-block2` 194 green, `mutate-block2` 75/75; `verify-block1` 374, `mutate-block1` 54/54; core `verify/mutate-block2-core` 40 checks and 37 mutations, `verify/mutate-map-combat-only` 17 and 12. The full core sweep ran on a clean stage (3.665.1 release plus exactly the changed files). **Nothing pushed; the module tree is uncommitted.**
- **Shipped:** see the matrix. Block 2's interpretations for Graham to confirm are listed at the end of `docs/INNER_TEMPEST_BLOCK2_AUDIT.md`.

## Inputs (attach these again in a new session)

- The book: `TRG_Inner_Tempest_1_2.docx` (v1.2) and Graham's *Inner Tempest Responses*. Convert with `pandoc -t gfm --wrap=none`; strip the `<img>` tags for reading.
- The system: `trg-prime-3.664.0.zip` (or 3.663.5 plus this session's core changes), which includes `tools/`. Run `npm install` in it before any harness.
- Companion modules, for regression checks: `trg-pillars-of-faith-0.11.1.zip` and `fiends-and-fables-prime-0.45.0.zip`.
- Run harnesses with `TRG_PRIME_ROOT=<path>/trg-prime`.

## Documents

| File | What |
|---|---|
| `docs/INNER_TEMPEST_RULES_AUDIT.md` | 9 Critical, 27 Major, 41 Minor and 8 Improvement entries. Each keeps the published rule, the interim build and the proposed amendment separate. |
| `docs/INNER_TEMPEST_CORE_DEPENDENCIES.md` | D1–D15, the system APIs the module needs. |
| `docs/INNER_TEMPEST_IMPLEMENTATION_MATRIX.md` | All 406 features. *Generated.* |
| `docs/INNER_TEMPEST_AUTOMATION_REPORT.md` | Planned A/B/C/D coverage, with and without the core work, and a justification for every C and D feature. *Generated.* |
| `tools/inventory/inventory.txt` | The source of truth for the two generated files. Rebuild with `node tools/inventory/build-docs.mjs`. |

## Decisions taken (by Graham)

- 20 Oct 2026: Inner Tempest is a separate companion module. It uses the Focus framework, with no Chi pool. Nothing is pushed or published without approval.
- 21 Oct 2026 (`docs/INNER_TEMPEST_RULINGS_2026-10-21.md`): Spirit Stance as built; another Lore when Spirit Lore is duplicated; Tianzhi heritage languages (Aeolian, Thanatos, Ignic, Aqualis, Gaian); a Shove or Trip against a Tsuchi at disadvantage; D1 approved; drakes get no Sweep; the slashing tails stay.

## Waiting on Graham

1. **Install core 3.668.0 and Inner Tempest 0.5.0** for the Block 4 live test; answer the four questions in `docs/RELEASE_NOTES_0.5.0.md`; confirm the five readings (`docs/RELEASE_NOTES_0.4.0.md`).
2. **Confirm Block 2's five interpretations** (end of `docs/INNER_TEMPEST_BLOCK2_AUDIT.md`): Elemental Ward's Blunder lasts 10 minutes; Observe Technique's DB applies to that creature's next attack; Steel the Mind is declared from the sheet until Inner Discipline (Block 3); out of combat "until your next turn" is 6 seconds; an unused declared defence ends at your next turn.
3. Whether a GitHub repo should be created for the module, and when.

## Planned block order

This follows the Pillars of Faith rhythm: audit and take rulings, then implement, then add verify and mutate harnesses, then run the sweep, then zip, then live-test in TRG V14. Only after that does the next block start.

| Block | Content | Needs core |
|---|---|---|
| 0 (core 3.664.0) | **Done:** D2, D3, D4 (part), D5, D6, D7, D16 and the Block 1 additions. **Still to do:** D1, D8, D9, D10–D15, D17–D19 | n/a |
| 1 | **Done (0.1.0):** 4 races, 20 heritages, racial abilities, 11 backgrounds, Scree Cant, the 23 General feats. Armour and weapons move to Block 9 with the gear | — |
| 2 | **Done (0.3.1, on core 3.666.0):** the 17 skill actions; core's Refocus matches the book. Passed live | B2-1 to B2-7 (3.666.0) |
| 3 | **Built (0.4.0, on core 3.667.0), awaiting live test:** Disciple and Mystic, Monastic Paths, Mystic disciplines, Inner Discipline and its techniques, the 11 Technique class feats, the 11 Grimoire spells the disciplines grant | B3-1 to B3-5 (3.667.0) |
| 4 | Ghostwalker (Ghost Arts), Kensai (Combat Forms), Oathblade (Challenge, Oaths) | D7, D8, D9 |
| 5 | Racial feats (47) and existing-feat access | D4, D8 |
| 6 | Class feats (54; Inner Discipline and the 11 Technique feats shipped in Block 3) and general feats (22) | D7, D8, D14 |
| 7 | **Done (0.8.1, on core 3.671.0):** 20 archetypes (Dragon Tamer to Block 10, B7-1), 7 abilities, FA-22. Passed live | C1–C16 (3.671.0) |
| 8 | **Done (0.9.1, on core 3.672.0):** the Grimoire's other 13 spells; Burst of Speed, Timeless Motion and Water Bolt finished (B8-9). Passed live | C1–C13 (3.672.0) |
| 9 | Magic items and the aging appendix | D6 |
| 10 | Dragon Companions | D10, plus the IT-C5 rulings |

**Planned packs:** it-races, it-heritages, it-backgrounds, it-classes, it-abilities, it-feats, it-spells, it-companions, it-armour, it-weapons, it-runes, it-specific-items, it-wondrous. Each carries `flags.trg-prime.extends`.

## Core facts learnt (3.663.5) that the build relies on

- **Focus:** "expended" means the item's per-day uses are spent (`system.usesValue` below `itemUsesMax`). Refocus restores **one** use to **one** chosen item (`combat/refocus.mjs`), and its result ladder is the book's Chapter 7 version. Daily preparation refills uses, but not the rune or wondrous Focus flags (D6).
- **Stances:** `enterFeatStance` is private (`feats-workflow.mjs:1607`). It allows one stance (two with Stance Mastery) and a one-round wait between stances, and creates an effect flagged `featStance`.
- **Flourish:** core enforces once per turn (`traits.mjs`).
- **Innate:** DC = 10 + ability + level; attack = ability + level; full warp; caster level = level. That matches Chapter 7. There is no per-spell ability override (D5).
- **Companions:** hard-wired to "Animal Companion", one per master (D10).
- **The system has no TypeDataModels.** It is `template.json`-based, so transferred effects do reach template fields. Effects apply before derivation.
- There is no `CONFIG.TRG_PRIME`; it is `CONFIG.TRG`. There is no `_evaluateExternalFeatOptionPrereqs`. Feat gating by trait goes through `registerFeatGate`.
- Core names that differ from the book: Stabilise, Self Healing, Fireball, Perform, Intimidate, Shape Of The Humanoid, Short Bow. Shadow Step is a spell, not a feat.

## Session log

- **20 Oct 2026, session 1:** read the whole book; mapped the system (three agents plus direct reads); cross-referenced every core name the book uses against the packs; wrote the audit, the core dependencies, the inventory and generated docs, and the scaffold.
- **20 Oct 2026, session 2:** took Graham's rulings and v1.2; built core 3.664.0 (Focus/innate declarations, D16, stances for modules, trait axes, helpers, daily firsts, derives) with harness pairs; built Block 1 (0.1.0) with verify/mutate; regenerated the matrix and report with shipped status. Lesson: sweep a snapshot copy, never the dev tree.
- **21 Oct 2026, session 3:** live-tested 3.664.0 + IT 0.1.0 + F&F 0.45.1 in Graham's world (built-in browser, world restored after). Three module bugs found and fixed as 0.1.1 with harness checks and mutations. Lesson: a check whose DC the GM sets afterwards resolves twice, so anything on `trgPrimeActionResolved` must ignore the degree-less first pass.
- **21 Oct 2026, session 3 (cont.):** took Graham's rulings (docs/INNER_TEMPEST_RULINGS_2026-10-21.md); built core 3.665.0 (D1 with migration, defence disadvantage rows, specialistAlternative) and Inner Tempest 0.2.0. Lesson: D1 reached 25 F&F creature abilities, not only the five core feats the dependency named; scan every installed module's packs before widening a core rule.
- **21 Oct 2026, session 3 (cont.):** live-tested 3.665.0 + IT 0.2.0 (all rulings pass; migration found nothing to change). Found D1 counted but never spent or refused at the Use button; fixed as core 3.665.1 (gate in useFeat), driven live against the real handlers, sweep 605/605. Lesson: a new count on an existing item must be checked against that item's own Use handler, not only against the counter.
- **21 Oct 2026, session 3 (cont.):** live-tested 3.665.1: defaulted Focus uses are spent at the Use button, refused when spent, restored by Refocus; printed counts untouched. Block 1 is done.
- **21 Oct 2026, session 3 (cont.):** Graham approved Block 2 and ruled on it (Evade declared when targeted, "fix all three" with Nimble Dodge and Impact Absorption, Root the Body raises the DC, a real ward zone, Resist Dying a Reaction on falling, Maintain Clarity a tick, Read Intent's flanking described; the multiple attack penalty in combat only; another Lore for the Elemental backgrounds on a Tianzhi). Built core 3.666.0 and Inner Tempest 0.3.0 with harnesses. Lesson: a module action whose code applies its rows must stop the core's generic text readers too, or a verbatim book row is applied twice (`outcomesApplied`).
- **21 Oct 2026, session 3 (cont.):** natural attacks always ready (core 3.666.0, Graham's request); F&F 0.45.2 (golem Slams). Live-tested Block 2: four module defects fixed as 0.3.1. Lessons: a uuid is not a flag key (Foundry splits it on its dots), so harness fakes must store flags as Foundry does; core's `conditionExpiresRound` is a round clock, not a turn clock.
- **21 Oct 2026, session 3 (cont.):** re-tested 0.3.1 live: all four fixes pass. Block 2 is done. Noted for the next release: Read Intent's Critical card repeats its flanking sentence.
