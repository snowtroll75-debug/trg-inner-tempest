# Changelog

## 0.8.1 — 25 Oct 2026 (fixes from the 0.8.0 live test)

Needs **TRG Prime 3.671.0**. See `docs/RELEASE_NOTES_0.8.1.md`.

- **Drawn Verdict's sheathe** is offered at the end of your turn (it was never offered: the turn was read from the combat, which had already moved on).
- **A form's own Use asks Formbinder's question** (add or replace, one a turn), as Combat Form's Use does.
- **Harness:** `verify-block7` 228, `mutate-block7` 118; Blocks 1 to 6 and the weapons re-pinned to 0.8.1.

## 0.8.0 — 25 Oct 2026 (Block 7: the archetypes)

Needs **TRG Prime 3.671.0**. Rulings B7-1 to B7-8 (`docs/INNER_TEMPEST_RULINGS_2026-10-25.md`). See `docs/RELEASE_NOTES_0.8.0.md`.

- **Twenty archetypes** (Dragon Tamer follows with the Dragon Companions in Block 10, B7-1), offered by the system's archetype picker, their progression lines read by the system (B7-2).
- **Seven abilities** they print as items: Twin Dragon, Drawn Verdict, Restorative Palm, Night Lotus Venom, Bound Challenge, Wandering Creed, Turning the Blade.
- **FA-22:** the core archetypes opened to the five classes; the system's tier rule kept (B7-8).
- **Formbinder** holds two forms, the greater of overlapping bonuses applying (core 3.671.0 `stackGroup`); a blend fills both places (B7-7).
- **A Strike its target cannot react to** (Drawn Verdict) stays silent for Form Reversal, Shadow Counter, Waiting Blade and Snake Stance.
- **IT-M6:** a class's chosen Magical Tradition stamps the innate spells waiting for one.
- **Fixed (Block 6):** Mystic Essence and Mystical Power no longer offer specialist spells.
- **Fixed in review, before release:** nine findings (release notes), among them Restorative Palm on another player's character, the reach and touch checks, Steel Disciple's Kensai feats, Veilborn's Refocus bonus in the dialog, and Wandering Creed beside Sworn Oath.
- **Harness:** new `verify-block7` 225 checks, `mutate-block7` 114 mutations; Blocks 1 to 6 and the weapons re-pinned to 0.8.0 and 3.671.0.

## 0.7.1 — 25 Oct 2026 (fixes from the 0.7.0 live test)

Needs **TRG Prime 3.670.1**. See `docs/RELEASE_NOTES_0.7.1.md`.

- **Drunken Strike's Feint** no longer needs Deception training (core 3.670.1: a Feint met by the attack's total asks for none).
- **Moving straight away from an enemy provokes** (core 3.670.1), as Mantis Stance's free first Move is measured against.
- **Monkey Stance's waived jump** reads "(waived)" on its card (core 3.670.1).
- **Disciplined Flurry's question** reads "spends your reaction and this technique's use".
- **Harness:** `verify-block6` 183, `mutate-block6` 85; Blocks 1 to 5 and the weapons re-pinned to 0.7.1 and 3.670.1.
- **Published on GitHub** (`snowtroll75-debug/trg-inner-tempest`): `module.json` gains `url`, `manifest` and `download`, so Foundry can install from the manifest link and offer later releases as updates. A push to `main` that raises the version publishes the release (`.github/workflows/release.yml`); `build-zip` leaves `.github/` out of the zip.

## 0.7.0 — 24 Oct 2026 (Block 6: the remaining class feats)

Needs **TRG Prime 3.670.0**. Rulings B6-1 to B6-10 (`docs/INNER_TEMPEST_RULINGS_2026-10-24.md`). See `docs/RELEASE_NOTES_0.7.0.md`.

- **The eight stances** (Crane, Dragon, Drunken, Mantis, Monkey, Snake, Tiger, Wolf), entered under the system's stance rules, their benefits on the stance's effect; the Path checked where the book asks for one.
- **Drunken Strike** (its total stands as the Feint), **Perfect Shot** and **Perfect Strike** (advantage, counted twice), **Inner Magic** and **Mystic Essence** (one Path spell each; Inner Magic opens the Mystic-trait feats).
- **Elemental Fist** in Inner Strike (four elements and their traits); **Stunning Fist** in Flurry of Blows.
- **FC-55:** the core class feats opened to the five classes (33 entries, 21 feats).
- **The Mystic's Metamagic** on its innate spells, from the free budget; its spells already made are marked at start-up.
- **The miss reactions** (Snake Stance, Waiting Blade, Steel Viper, Echoing Crane, Form Reversal, Shadow Counter) answer a miss as the system announces it; **thrown-mode weapons** are ranged for every picker.
- **Fixed in review, before release:** seven findings (release notes).
- **Harness:** new `verify-block6` 181 checks, `mutate-block6` 84 mutations, all caught. Blocks 1 to 5 and the weapons re-pinned: 380/55, 205/93, 1040/111, 1360/81, 572/108, 117/33.

## 0.6.2 — 24 Oct 2026 (fixes from the 0.6.1 live test)

Needs **TRG Prime 3.669.2** (Aid Another's ticks in its own dialog, B5-6; the declared exact first; a Blunder named; defence reactions offered only when they could be spent). See `docs/RELEASE_NOTES_0.6.2.md`.

- **Many-Faceted Vigilance** raises Compound Eyes to +2: the copy opts out of the system's codex inheritance while the feat is held (B5-7). Characters saved under 0.6.1 are mended at start-up; a compendium refresh is raised again at once.
- **Reactions are asked only when they could be spent** (Battle Readiness): Waiting Blade, Form Reversal, Shadow Counter, Disciplined Flurry, Vanishing Retreat and Resist Dying; Guardian's Intercession through the system. Resist Dying spends through the system.
- **Block 5's deletions** use Foundry 14's operator, not the deprecated `-=`.
- **Harness:** `verify-block5` 572 checks, `mutate-block5` 108 mutations, all caught.

## 0.6.1 — 24 Oct 2026 (fixes from the Block 5 live tests)

Needs **TRG Prime 3.669.1** (which carries Graham's B5-5: a Blunder gets Fortune's Reversal). See `docs/RELEASE_NOTES_0.6.1.md`.

- **Raptorial Blade's AR applies:** "AR 1" on its trait line (the system reads it there), "AR 2" with Raptorial Refinement.
- **Awaken the Animism:** the Ren's Speed +10 and the Orochi's Swim +10 now apply.
- **Mist Veil** (and Spirit Beacon) no longer end early when the world clock runs in real time.
- **Forgeheart and Many-Faceted Vigilance** raise the heritage's and Compound Eyes' tick to +2 instead of adding a second one.
- **Reactions** spend through the system, with Battle Readiness's Attack-or-Martial rule.
- **Spirit Roar** asks for conviction once; **Hive Coordination** is asked on Aid Another.
- **Characters made under 0.6.0** are brought into step when the GM loads the world.

## 0.6.0 — 24 Oct 2026 (Block 5: the racial feats)

Needs **TRG Prime 3.669.0**. Rulings B5-1 to B5-4 (`docs/INNER_TEMPEST_RULINGS_2026-10-24.md`).

- **The 47 racial feats of Chapter 5**, each with a Use, an offer, a declaration the system reads, a tick or a card (see `docs/RELEASE_NOTES_0.6.0.md`).
- **FR-48:** the core racial feats opened to the four races, heritage limits included (core 3.669.0).
- **Water Bolt** in the Spells pack (B5-1); **Draconic Bite and Claw** in the Natural Attacks pack.
- **Living Lantern** lights the token and the light level; **Impact Absorption** gives +2 with Bear's Endurance; **Wing Burst** may end in the air with Wings Unfurled; **Predator's Pounce's** Strike asks for Predator's Momentum.
- **Foxfire's motes are light circles, not tokens** (B5-4 built differently; a question for Graham).
- **Fixed in review, before release:** Spirit Roar paid only once its first roll is made; Waiting Blade offered on a reaction's miss; Web Snare's new web replaces the old on the same creature; Foxfire's circles found by their scene; Elemental Attunement limited to innate spells (core 3.669.0); Guardian's Intercession refused when expended or held fast.
- **Harness:** new `verify-block5` 542 checks, `mutate-block5` 66 mutations, all caught. Blocks 1 to 4 and the weapons re-pinned: 380/54, 205/93, 1040/111, 1360/81, 117/33.

## 0.5.1 — 23 Oct 2026 (Chapter 6's weapons; fixes from the 0.5.0 live test)

Needs **TRG Prime 3.668.1**. Graham's answers to the 0.5.0 questions (`docs/INNER_TEMPEST_RULINGS_2026-10-23.md`).

- **Chapter 6's sixteen weapons** in a new Inner Tempest: Weapons pack (extends the system's), read from the book's tables and text. Backswing, Brace and Twin are run by the system (3.668.1); Monastic since 3.667.0.
- **Combat Form's learning step** no longer spends its use (it declares `ownsFocusUse`, core 3.668.1).
- **Misdirecting Whisper** rolls first and spends its AP and use only when the check was rolled; a refusal removes the advantage.
- **Iron Tortoise** includes the Trip (Graham). Deflect Arrow and Form Reversal unchanged, as ruled.
- **Backswing, Brace and Twin** registered as traits.
- **Harness:** new `verify-weapons` 117 checks, `mutate-weapons` 33 mutations, all caught. Blocks 1 to 4 re-pinned: 380/54, 205/93, 1040/111, 1360/81.
- **Three questions for Graham** in `docs/RELEASE_NOTES_0.5.1.md`: the Butterfly Sword as one item or the pair, Backswing with a held blow, and Twin with two different Twin weapons.

## 0.5.0 — 23 Oct 2026 (Block 4: the Ghostwalker, the Kensai and the Oathblade)

Needs **TRG Prime 3.668.0**. Rulings B4-1 to B4-4 and Black Lotus (`docs/INNER_TEMPEST_RULINGS_2026-10-23.md`).

- **Three classes:** the Ghostwalker, the Kensai and the Oathblade, with their tables, proficiencies, wealth (0, 1, 2), 1st-level feat and a Magical Tradition choice.
- **Fifteen Ghost Arts** (learned with Ghost Arts' Use), **twelve Combat Forms** (learned and entered with Combat Form's Use), **four Sworn Oaths** (chosen with Sworn Oath's Use).
- **Unseen Assault** (core ambush dice, B4-3), **Vanishing Retreat**, **Flow Strike**, **Weapon Discipline** (untyped, B4-2), **Challenge** and the oaths, run by hooks on the resolved Strike, the ambush, damage and the turn.
- **The 28 class feats** (B4-1), each with a button, an offer, a declaration or a card.
- **Found in review before the live test, fixed:** nine defects (see `docs/RELEASE_NOTES_0.5.0.md`).
- **Harness:** new `verify-block4` 1360 checks, `mutate-block4` 81 mutations, all caught. Blocks 1 to 3 re-anchored: 378/54, 205/93, 1040/111.
- **Four questions for Graham** in the release notes: Deflect Arrow without Evade, the wakizashi, Iron Tortoise and the Trip, Form Reversal's Flourish.

## 0.4.2 — 23 Oct 2026 (a fix from the 0.4.1 live test)

Needs **TRG Prime 3.667.3**, which gives a weapon attack's check its attack form (unarmed, natural or weapon).

- **Inner Strike's +1 status to unarmed attacks never applied.** It was a tick-box, and a weapon attack opens no dialog to offer one. It is now scoped to unarmed melee attacks (your fists, a gauntlet, a Monastic weapon) and applied automatically. The card says "applied on the roll".
- **Tick-boxes on attacks and Spellcraft** (core 3.667.3, Graham's ruling "Attacks + Spellcraft"): Spirit Stance's possession clause, Echoes Beyond and Maintain Clarity (on a Concentrate or Mental spell) are now asked before the dice. Observe Technique and Root the Body on a forced save stay unoffered, as forced saves are out of scope.
- **Harness:** `verify-block3` 1040 checks, `mutate-block3` 111 mutations, all caught; Blocks 1 and 2 re-anchored to 3.667.3, all caught.

## 0.4.1 — 23 Oct 2026 (fixes from the 0.4.0 live test)

Needs **TRG Prime 3.667.1**, which fixes two core gaps the test found: a Disciple's techniques arrived with one use of two, and Disciple's Resolve and Mystical Resolve gave no conviction point.

- **Inner Strike's type is chosen free.** The card said to press Use again to change the type, which spent another use and was refused with none left. Its card now carries Force, Aligned, Negative and Positive buttons that re-type the running rider, free, as often as wanted ("choose … each time you Strike").
- **Burst Step's card** said "now 70 ft" for a Speed of 60: it added the 10 twice. Only the card was wrong.
- **Shadowy Stance's card** says it lasts 1 minute (the core stance card says it lasts until you leave it).
- **Harness:** `verify-block3` 1039 checks, `mutate-block3` 108 mutations, all caught; Blocks 1 and 2 unchanged.

## 0.4.0 — 22 Oct 2026 (Block 3: the Disciple and the Mystic)

Needs **TRG Prime 3.667.0**.

- **The Disciple and the Mystic** (new Classes pack): tables, skills, proficiencies (Monastic weapons included), Chapter 6 wealth, Inner Discipline at 1st.
- **The four Monastic Paths**, chosen with Monastic Path's Use: class skill, and the tradition and ability of the Mystic's spells and magical techniques.
- **The five Mystical Disciplines**: each special ability, and nine spells each by level as innate Focus spells, cast with the Path, up to base PP = level + 1 (B3-2).
- **Disciple abilities:** Powerful Fists (1d6, Versatile B, +1 total per 3 BAB, magical / cold iron and silver / adamantine by BAB), Disciple's Dodge and Incredible Movement (unarmoured), Flurry of Blows (DR once, one critical injury, MAP as normal), Deep Focus, Resolve.
- **Mystic abilities:** Alter the Thread (the defender's conviction reroll of any attack roll, B3-5), Mystical Power's picker, Mystical Resolve; Flame Within (B3-3), Dragon's Pulse, Centred Awareness, Echoes Beyond, Echo Form.
- **Inner Discipline** and its three techniques (Disciplined Flurry's third Strike counts for the penalty afterwards, B3-4); the eleven Technique class feats, with Greater Mastery for Bounding Step, Inner Sight and Inner Strike; Steel the Mind offered as a reaction.
- **The eleven Grimoire spells the disciplines grant** (new Spells pack).
- **Harness:** `verify-block3` 1034 checks, against the book extract `tools/content/book-text-block3.json`; `mutate-block3` 102 mutations, all caught. `verify-block1` 378 / `mutate-block1` 54 and `verify-block2` 205 / `mutate-block2` 93, re-anchored, all caught.
- See `docs/RELEASE_NOTES_0.4.0.md`.

## 0.3.3 — 22 Oct 2026 (a fix from the 0.3.2 live test)

Needs **TRG Prime 3.666.1** (unchanged).

- **Evade taken from the defence offer gave its dodge too late.** Found live: Evade was offered beside Nimble Dodge and taken, the check succeeded and the +2 dodge went on, but the attack had already read the DB (17, not 19). The system fires its "action resolved" hook without waiting for listeners, so the Evade check returned, and the attack went on, while this module was still laying the effect. Each resolution is now remembered until it settles, and taking Evade from the offer waits for its own effect before the attack goes on. Nimble Dodge and Impact Absorption were unaffected: their effects are laid before their Use returns.
- **Impact Absorption was never offered.** It is an ability on the sheet (the Ryukari's), and the system's default lookup for a defence offer finds feats only. It, and Evade's Inner Discipline, are now looked up as a feat or an ability.
- **Harness:** `verify-block2` 205 checks (G6, G7, and F1 now asks for the tracked hook); `mutate-block2` 93 mutations, all caught.

## 0.3.2 — 22 Oct 2026 (Evade and Impact Absorption offered before the roll)

Needs **TRG Prime 3.666.1**.

- **Evade and Impact Absorption are offered to the defender before the attack is rolled.** Both are declared "when you are targeted" (ruled 21 October), but the attack is rolled on the attacker's client, so the defender's player was never asked in time: the same gap Graham found in core's Nimble Dodge after the session of 21–22 October. Both are now registered with TRG Prime 3.666.1's defence offer. Before every attack they answer, the defender's player (or the GM, for a creature nobody connected plays) is asked; a yes runs the module's own Evade check or Impact Absorption's Use on that player's client, and the attack reads the raised DB or DR.
  - Evade is offered to a creature with Inner Discipline against any attack; Impact Absorption against a Strike only, and not when its Focus use is spent.
  - Nothing is offered with no reaction left in combat, or while a condition forbids reactions.
- **Harness:** `verify-block2` 202 checks (section G); `mutate-block2` 87 mutations, all caught. `verify-block1` 374, `mutate-block1` 54, all caught.

## 0.3.1 — 21 Oct 2026 (Block 2, fixes from the live test)

Needs **TRG Prime 3.666.0** (unchanged).

- **A Fumble's lockout against one creature was never enforced, nor was Read Intent's once a round.** Both were stored under the creature's uuid, and Foundry reads the dots in a uuid as a path, so the record was written somewhere it was never read. Found live: a fumbled Recognise Discipline and a fumbled Observe Technique could be tried again at once against the same creature. The key no longer carries dots.
- **"Until the beginning of your next turn" ended at the start of the round.** The system's round clock removes such effects at the first turn of the round, whoever's it is, so a creature acting fourth lost Read Intent's DB, Steady Heart's saves, Evade, Root the Body, Steel the Mind and Maintain Clarity three turns early. They now end as the bearer's own turn begins; the system's sweep a round later is the backstop.
- **Resist Dying could not be taken from its card.** A dying creature is unconscious and flat-footed, and the system refuses every Reaction to a flat-footed creature. As ruled, it is taken at the moment of falling: the card rolls it at no cost and spends the reaction itself. With no reaction left in combat it is still refused.
- **A refused press left the Resist Dying button dead.** It is live again after a refusal or a cancelled roll.
- **Harness:** `verify-block2` 197 checks (its fake actors now store flags as Foundry does, dots and all); `mutate-block2` 82 mutations, all caught.

## 0.3.0 — 21 Oct 2026 (Block 2: Chapter 4, Skills & Actions)

Needs **TRG Prime 3.666.0**.

- **The seventeen Chapter 4 skill actions**, under their skills on the Skills tab: Evade, Interpret Style, Root the Body, Wall Run, Recognise Discipline, Centred Balance, Guide the Breath, Steady Heart, Resist Dying, Maintain Clarity, Steel the Mind, Elemental Ward, Read the Elements, Read Spiritual Echo, Observe Technique, Read Devotion and Read Intent. Requirements, triggers, outcome rows and text are the book's, verbatim; the Bonus Check actions print the table's result.
- **What they do, applied for you:** Evade's dodge and Root the Body's braced DC last the one attack they answer; Interpret Style's AB and DB last while the target keeps its stance or until the battle ends; Centred Balance, Guide the Breath, Steel the Mind and Resist Dying put their Bonus Check on the next check they name (Guide the Breath on the ally, through the GM); Steady Heart lowers frightened and adds its save bonuses; Maintain Clarity offers its points as a tick (ruled) and applies its Fumble; Wall Run arms the move; Elemental Ward asks the element and draws a real 10-ft ward zone for its duration (a Blunder's grants weakness); Read the Elements' Critical gives an hour of Nature for Track; Observe Technique and Read Intent bonus your defences against that creature.
- **Enforced:** the feat each Requirement names (Inner Discipline, Inner Balance, Elemental Warding), targets, Guide the Breath's 10 ft and expended Focus ability (never yourself), Read Intent's 30 ft and once a round per creature, and every Fumble or Failure lockout (10 minutes, to your next turn, or to your next daily preparation). Location lockouts are described.
- **Rulings (21 Oct 2026):** Evade, Root the Body and Steel the Mind are declared when the trigger arrives; Resist Dying is a Reaction when you gain the dying condition, offered on a card; Read Intent's flanking clause is described on the card.
- **Impact Absorption** now lasts the one weapon attack it answers (Graham: "fix all three"); it used to last the round and ask to be deleted by hand.
- **Inner Balance and Elemental Warding** say where their action is.
- **Harness:** `verify-block2` 194 checks (the book verbatim, the system's own ladder, conditional, defence-row and one-attack code, and the automations driven against fake actors); `mutate-block2` 75 mutations, all caught. `verify-block1` 374, `mutate-block1` 54, all caught.

## 0.2.0 — 21 Oct 2026 (Block 1, Graham's rulings of 21 October)

Needs **TRG Prime 3.665.0**.

- **Tianzhi languages.** Each heritage now names its language: Fuukaze Aeolian, Hikari Thanatos, Kasai Ignic, Suiryoku Aqualis, Tsuchi Gaian. The race keeps Low Tongue and no longer offers an open pick.
- **Tsuchi against Shove and Trip.** A Shove Attack or Trip Attack against a Tsuchi is rolled at disadvantage, and the attacker's card says why. The Tsuchi's own advantage on its checks and saves to avoid being knocked prone or moved stays a tick.
- **Spirit Warrior and Spiritwalker on a Miraku.** The race already gives Spirit Lore, so the background offers another Lore: Apply Grants says so, and the background's Use asks for it. A character of any other race is asked nothing.
- **Unchanged by ruling:** Spirit Stance (strikes are magical against the incorporeal, whose resistance still applies).
- **Docs:** `docs/INNER_TEMPEST_RULINGS_2026-10-21.md`; D1 and the two new declarations recorded as shipped in the core-dependencies doc; the matrix and report regenerated.
- **Harness:** `verify-block1` 372 checks (section G for the rulings, run against the core's own functions); `mutate-block1` 51 mutations (10 new; the old "the Tianzhi language slot closes" retired, because the slot no longer exists), all caught.
- **Question:** the Tianzhi race also grants Elemental Lore, which the Elemental Guardian and Elemental Harmonist backgrounds grant too. Should they offer an alternative as well?

## 0.1.1 — 21 Oct 2026 (Block 1, fixes from the live test)

Needs **TRG Prime 3.664.0** (unchanged).

- **Swim and climb Speeds were 0.** The Orochi's, Zennyo's and Suiryoku's swim Speeds and the Joro's climb Speed were written as an upgrade of the whole movement entry, which Foundry ignores. They now raise the entry's base, which is what the total is summed from. Found live: the Zennyo swam at 0.
- **Ancestral Guidance settled before the DC was set.** When the GM sets the reroll's DC on the card, the core resolves the check twice, once without a degree and once with it. The module settled on the first, said "no conviction is spent" and kept the point even when the reroll succeeded. It now waits for the degree. Found live: a reroll of 17 against DC 15 cost nothing.
- **Stunning Reflexes used up the turn when it was refused.** If the core refused the Stunned Manoeuvre (no Mental Focus ranks) or the dialog was cancelled, the once-a-turn mark stayed. It is now taken back.
- **Harness:** `verify-block1` 357 checks (5 new, three of them running the real code against a fake actor); `mutate-block1` 42 mutations (4 new), all caught.

## 0.1.0 — 20 Oct 2026 (Block 1, for live testing)

Needs **TRG Prime 3.664.0**.

- **Races (4):** Miraku, Ryukari, Scree and Tianzhi, from the v1.2 text. Ability modifiers, size, speed, languages, specialist Lores and racial abilities are granted as the core races' are. Power Points 0, registered. The Appendix age row is printed on each race (the core has no age fields).
- **Heritages (20):** every printed mechanic is data: ability and skill bonuses, Base DR, speeds, Initiative, resistances, a Conviction Pool point, carrying strength, falls 20 ft shorter (Ren), water-breathing (Zennyo), five-fold breath (Suiryoku), heat immunity (Zenki), and the racial cantrips. The cantrips are innate with the Focus trait and cast with the ability the heritage names (Charisma for Kitsune, Wisdom for the others). Each Tianzhi heritage records its element and damage type (IT-C2).
- **Racial abilities (13)** and **natural attacks (2):** Fluid Form, Spirit Awareness, Impact Absorption, Predator's Pounce, Treasure Sense, Scaled Hide, Dragon-Bound Resolve, Chitinous Carapace, Compound Eyes, Wing Burst, Living Lantern (the Hotaru light, named per IT-M21), Martial Affinity, Natural Chi; Raptorial Blade and Sting.
- **Scree Cant**, an uncommon language.
- **Backgrounds (11)**, with Chapter 6's wealth. The book's "Lore (X)" specialist skills are named "X Lore", as the core's are.
- **General feats (23)**, including Spirit Stance (IT-C1). Elemental Warding and Inner Balance open Chapter 4 actions that arrive in Block 2.
- **Automations:** Fluid Form, Impact Absorption, Predator's Pounce (a free move, then a paid Strike from the card), Wing Burst, Living Lantern, Natural Chi, Spirit Stance (a core stance), Elemental Balance, Stunning Reflexes (a free Stunned Manoeuvre), and Ancestral Guidance (a reroll offered on the card, conviction spent only on a Success or better).
- **Harness:** `tools/verify-block1.mjs` (352 checks) and `tools/mutate-block1.mjs` (38 mutations, all caught). Both read TRG Prime 3.664.0 and normalise every declaration with the system's own functions.
- **Shipped below target** (see the Automation Report): Leap, Meditative Recovery, Artisan's Enchantment, Artistic Diversity, Contortionist and Veiled Essence are descriptive until the core changes D14, D17, D18 and D19 land. Tsuchi's advantage against Shove and Trip and the Tianzhi heritage language wait on Graham.

## 0.0.0 — 20 Oct 2026 (scaffold, unreleased)

- Module scaffold:
  - `module.json` declares the "Inner Tempest" sourcebook flag and requires TRG Prime 3.663.5.
  - The entry script checks the system on `ready`.
  - Registration is empty.
- Pack and zip tooling adapted from Pillars of Faith 0.11.1. The zip build reads the archive back, as TRG Prime's own does.
- Planning documents:
  - The rules audit.
  - The core dependencies.
  - The implementation matrix and automation report, both generated from `tools/inventory/inventory.txt`.
  - The progress file.
