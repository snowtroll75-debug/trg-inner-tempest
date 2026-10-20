# Inner Tempest — Core Dependencies

These are the changes the TRG Prime **system** would need so that the Inner Tempest **module** can automate the book without patching core files or deep-importing private functions.

It is written against TRG Prime 3.663.5, after reading its module API (`module/module-api*.mjs`), its Focus, Refocus, innate, stance, reaction, companion, grant and picker code, and Pillars of Faith 0.11.1's use of the API. Nothing here has been built.

Every item is a **reusable API**, not an Inner Tempest special case, so later books can use it too. That follows the 16 Sep architecture ruling, under which the system gained the companion-module API rather than modules patching internals.

**Proposed vehicle:** one core release, *TRG Prime 3.664.0, "companion API: Focus, stances, reactions, companions"*. It would carry D1–D10, with D11–D15 following as each block needs them. Inner Tempest 0.1.0 would then pin `minimum: 3.664.0`.

Each entry gives the following, in this order:

- **Gap:** what's missing in 3.663.5, with file references.
- **Book need:** which Inner Tempest features need it.
- **Proposal:** the smallest API that closes the gap.
- **Without it:** what the module would have to do instead, and the automation class that would get.

---

## Tier 1: the Focus framework (the book's central mechanic)

### D1 · Focus abilities without a use count are never spent or refocused
- **Gap:**
  - A feat or ability with the Focus trait and a blank `usesPerDay` has a maximum of null. It is never spent, never blocked and never offered to Refocus (`uses-workflow.mjs:89-103`).
  - `focusInnateDefaultUses` (`uses.mjs:121`) only covers innate spells.
  - Core already has five feats in this state: Ebon Bind, Ferocious Charge, Injury Relief, Primal Shape and Void Step.
- **Book need:**
  - Every technique, which is about 110 abilities.
  - Deep Focus (+1 use to *every* Focus technique).
  - Ghost Art Mastery (+1 use to one chosen art).
- **Proposal:**
  1. Extend the Focus default to every item type: a Focus-trait item with a blank `usesPerDay` has a maximum of 1. This also fixes the five core feats.
  2. Add an effect flag that `itemUsesMax` reads: `flags.trg-prime.focusExtraUses = [{value, traits?, names?}]`. With no filter it applies to all Focus items, otherwise to Focus items carrying one of `traits` or named in `names`.
- **Without it:** the module ships `usesPerDay: "1"` on every technique, which works today. Deep Focus would then have to *store* `bonusUses` on each item, which is a stored value that should be derived. Deep Focus drops to C.

### D2 · Refocus can only restore one use
- **Gap:** `restoredUses(current, max)` (`combat/refocus.mjs:86`) always gives back +1. That follows your earlier "one chosen item, +1 use" ruling.
- **Book need:** Ch3 Deep Focus, Ch5 Ghost Art Mastery, and Ch7 "Additional Uses": "A successful Refocus restores all uses of that individual technique."
- **Proposal:** an item flag `flags.trg-prime.refocusRestoresAll: true`. When it is set, `restoredUses` returns `max`. Core abilities keep +1.
- **Without it:** a Deep Focus Disciple has to Refocus twice per technique. That is a rules deviation (C).

### D3 · Refocus can't use a different ability score
- **Gap:**
  - No ability swap exists that is scoped to one action.
  - `registerSkillSubstitution` changes the skill, not the ability.
  - `skillAbilitySwap` only works on creature abilities.
- **Book need:** Kensai Considered Mind ("may use your Intelligence modifier instead of Wisdom"); Oathblade Unwavering Purpose (Charisma).
- **Proposal:** an effect flag `flags.trg-prime.actionAbilityOptions = [{action: "refocus", abilities: ["intelligence"]}]`, read where the check's ability is chosen. It offers the higher ability, or a choice in the roll dialog. It is generic over action keys.
- **Without it:** the module adds a conditional bonus of (Int − Wis). That gives the same total but labels the roll wrongly (B).

### D4 · Refocus can't be modified per day, and can't restore a second ability
- **Gap:**
  - `registerDegreeUpgrades` maps one fixed degree to another every time. Nothing counts "the first Refocus each day".
  - `trgPrimeActionResolved` doesn't say which item was refocused (`refocusTarget`).
  - `refocusAlsoRestores` restores a fixed list of names, not a second item the player chooses.
- **Book need:**
  - Tianzhi Discipline: "the first Refocus each day is treated as a Critical without a roll".
  - Centred Recovery: "the first time each day … improve the result by one degree".
  - Tranquil Mastery (spell): a successful Refocus "may choose a second expended Focus ability".
  - Dragon bond broken: Refocus "Hard (DC +2)".
- **Proposal:**
  1. Add `refocusTarget` (item id) to the `trgPrimeActionResolved` payload.
  2. Add a pre-roll hook, `trgPrimeActionDegree(actor, action, degree, context)`, that may return an adjusted degree, with core passing a daily counter in `context`. Or add a declarative effect flag `refocusDailyDegree: {mode: "auto"|"improve", step: 1}` that core counts against `performDailyPreparation`.
  3. Accept `refocusAlsoRestores: {choose: 1}` to mean "the player chooses one more expended Focus item".
- **Without it:** the module would have to wrap the Refocus card, which means a deep import. Those three features would be C.

### D5 · One spell can't have its own magical ability
- **Gap:** core reads one actor-wide `system.magic.castingAbility` (`cast-workflow.mjs:2409`, `3197`). Pillars of Faith writes `flags.trg-prime.castingAbilityOverride`, but **core never reads it**.
- **Book need:**
  - Every racial innate cantrip ("Wisdom is your magical ability score for this spell").
  - All Mystic, Disciple and Inner Adept innate spells (the Path's ability).
  - Ghostwalker (Wis), Kensai (Int) and Oathblade (Cha) magical techniques.
  - Tianzhi Natural Chi (Wis).
  - That covers about 120 innate grants.
- **Proposal:** honour `castingAbilityOverride` (and an optional `traditionOverride`) on a spell item in `innateSaveFor`, `innateAttackFor` and the spell-attack path. That fixes Pillars of Faith's flag as well.
- **Without it:** the DCs and attacks are wrong whenever the actor's casting ability differs from the spell's. For a Mystic with a Primal path that is Con versus Wis, so it is wrong for most characters (C).

### D6 · Daily preparation leaves rune and wondrous Focus expended
- **Gap:** `performDailyPreparation` doesn't clear `runeState.focusExpended` or `wondrousFocusExpended` (`uses-workflow.mjs:258-414`). Only Refocus clears them. This is a **core bug** that already affects core Focus runes.
- **Book need:** Ch4 and Ch7 "Daily preparation restores all expended Focus abilities". The book's Focus runes are Harmony, Mindful and Tranquil Quiver.
- **Proposal:** clear both flags in daily preparation.
- **Without it:** the module would have to clear them itself on a daily-preparation hook (B). The core bug would remain.

## Tier 2: combat mechanics

### D7 · Stances can't be entered from a module
- **Gap:** `enterFeatStance` (`feats-workflow.mjs:1607`) handles everything: the one-round wait, replacing the previous stance, Stance Mastery's second stance, Reactive Stance's free entry, and `stanceActionMods`. It **is not exported or in helpers**.
- **Book need:**
  - 9 Disciple/Mystic stances.
  - 12 Kensai Combat Forms, plus Twin Dragon.
  - Steel Disciple's form.
  - Serene Defence (a spell with the Stance trait).
  - Formbinder (two forms active) and Blended Form.
  - Tianzhi Martial Affinity and Tranquil Mind ("while in a stance").
- **Proposal:**
  1. Add `helpers.enterStance(actor, item, {name, apCost, changes, conditionals, stanceActionMods, keep})`, where `keep` lets Formbinder hold 2.
  2. Add `helpers.activeStances(actor)`.
  3. Add a `Stance` predicate to the conditional `when` (e.g. `when.inStance: true`).
- **Without it:** the module copies the private flag protocol (`featStance`, `featSource`, `lastStanceRound`). That is fragile, and it breaks silently if core changes it (B, at risk).

### D8 · No way to register a reaction
- **Gap:**
  - `REACTION_FEATS` is a frozen table (`reaction-feats.mjs:144`).
  - Detection runs *after* an attack resolves (`reaction-feat-detection.mjs`).
  - There is no pre-resolution hook where a defender can add to Defence against *this* attack, or to *this* save.
- **Book need:** about 25 reactions. Each one is listed below with when it must fire:

  | Reaction | Fires |
  |---|---|
  | Evade, Guarded Centre, Shadow Double, Echo Form (Thousand Reflections), Deflect Arrow, Guardian's Intercession (retargets), Deflecting Wings | Before the hit is decided |
  | Impact Absorption, Bear's Endurance | Before damage |
  | Root the Body, Steel the Mind, Reflective Mind (spell) | Before a save |
  | Fortune's Reversal | After a fumble |
  | Waiting Blade, Snake Stance, Shadow Counter, Form Reversal, Tail Lash | After a miss or a Strike |
  | Turning the Blade, Vanishing Retreat | After damage |
  | Falling Shadow | On a fall |
  | Harmony Edge, Guarded rune, Karmic Resilience | On a critical or on dying |

- **Proposal:** `api.registerReaction(name, {trigger, timing: "beforeHit"|"beforeDamage"|"beforeSave"|"afterResolve", eligible(actor, ctx), offer(actor, ctx) → {dbBonus?, saveBonus?, reroll?, retarget?, run?}})`.
  - Core calls it from the same places it calls its own reactions.
  - Core spends the Reactions resource through `spendReaction`, after the player or GM confirms. The book's acceptance rule is that a reaction must not fire without an authorised decision.
- **Without it:** the after-the-fact reactions (miss, damage, crit) can run off the existing `trgPrimeStrikeRolled`, `trgPrimeCriticalInjury` and similar hooks (B). The **before-the-hit and before-the-save reactions can't be automated** (D). They would become manual "declare before rolling" buttons that queue a pending modifier (C).

### D9 · No hook for derived values
- **Gap:** `prepareDerivedData` (`actor.mjs:2850`) offers no extension point. Transferred effects apply *before* derivation, so anything that depends on derived state (armour worn, encumbrance, class bonus, BAB) can't be expressed. `PP_GRANTS` isn't registrable.
- **Book need:**
  - Disciple's Dodge: Wis to DB *only while unarmoured and unencumbered*.
  - Incredible Movement: status Speed while not armoured, scaling by level.
  - Powerful Fists, Soul-Bound Weapon and Brawler: damage scaling by BAB.
  - Weapon Discipline (class bonus −1).
  - The Kensai forms' "+1 per 2 Int".
  - Ember Reaver's per-round escalation.
  - Dragon companion derived HP and speeds.
- **Proposal:** `api.registerDerived(fn(actor, systemData))`, run at a defined point after class progression and armour resolution. It may only call `actor.addBonus(...)`, so it can't overwrite slots and the Appendix-1 stacking rules still apply.
- **Without it:** these become roll-dialog conditionals (`auto: true`). The rolls come out right but the sheet's static DB and Speed don't show them (B or C, depending on the feature).

### D10 · Companions are hard-wired to the Animal Companion
- **Gap** (`companion.mjs`, `companion-workflow.mjs`):
  - The class name "Animal Companion", the creature type "Animal" and the `companions` pack are all constants.
  - `createCompanionFor` refuses any second companion, and it isn't in helpers.
  - Every `race` item in the companions pack shows up in the Animal Companion chooser.
  - Level is always the master's level.
  - The companion feat ladders are hard-coded.
- **Book need:** Dragon Companions (Ch5):
  - a distinct class with its own progression (BAB/BDB = level, all saves 5 + level, 12 + Con HP plus a size base, 8 skill points, general feats on the PC schedule);
  - base level 4–6 plus master levels gained;
  - the Wyrm type and the Minion trait;
  - High Magic;
  - four base dragons;
  - Dragon Tamer owners who may *also* have an animal companion (from a core class).
- **Proposal:**
  1. `api.registerCompanionKind(kind, {className, creatureType, pack, levelFrom: (master, companion) => number, featPool: "general"|"bonusFeats", chooserFilter})`.
  2. `helpers.createCompanionFor(master, feat, {kind, only})`.
  3. Allow one companion **per kind**.
  4. Exclude other kinds' base creatures from each chooser.
- **Without it:** dragon companions would be an Actor pack the GM drags out by hand, with no levelling (D). This is the largest single dependency.

## Tier 3: equipment, proficiency and prerequisites (needed as the gear and feat blocks land)

### D11 · Monastic weapons and unarmed-only abilities
- **Gap:** weapon trait behaviour is hard-coded (`traits.mjs:363`), and core abilities that are gated on unarmed Strikes check `system.unarmed`.
- **Book need:** "Any ability, feat or spell which can only be applied to an unarmed strike can also be used with a monastic weapon". Soul Weapon Master and Zen Archer extend the same rule to their weapons.
- **Proposal:** one core predicate, `countsAsUnarmed(weapon, actor)`: true for an unarmed Strike, for a weapon with the **Monastic** trait, or for a weapon an effect names in `flags.trg-prime.unarmedEquivalent`. Core's unarmed checks would use it.
- **Without it:** the module's own abilities (Flurry, Stunning Fist, Inner Strike) honour Monastic themselves. Core unarmed abilities won't (C).

### D12 · Unarmed damage can't be changed
- **Gap:** core's Unarmed Strike is 1d4 (Brawling, Agile, Finesse). There's no effect flag to change the die, add a flat per-BAB bonus, or set the materials it counts as when bypassing DR (magical, cold iron, silver, adamantine).
- **Book need:** Powerful Fists (Disciple, Brawler) and Soul-Bound Weapon. Dragon Stance, Tiger Stance and Wolf Stance change the damage type.
- **Proposal:** effect flags `unarmedDamage: {die, versatile, flatPerBAB: {every: 3, value: 1}}`, `strikeCountsAs: {magical: {bab: 3}, coldIron: {bab: 8}, silver: {bab: 8}, adamantine: {bab: 16}}` (scoped to unarmed, Monastic, or a named weapon), and `unarmedDamageType`.
- **Without it:** a damage rider adds the difference. The die-size change shows on the card but not as the weapon's base die, and the material bypass goes back to the GM (C).

### D13 · New weapon traits with behaviour
- **Gap:** `registerTraits` reaches only the immunity and resistance vocabulary.
- **Book need:**
  - **Backswing:** the multiple attack penalty only counts attacks that hit and damage. This changes core's attack counter.
  - **Brace:** a Ready attack against a mounted target gets +2 circumstance and +1 base die.
  - **Twin:** Double Slice with both hits gives +1 base damage each.
  - **Parry:** already core (see IT-M27).
- **Proposal:** implement Backswing, Brace and Twin in core as Appendix traits, so they also become available to later books.
- **Without it:** Twin and Brace work as module riders (B). **Backswing can't be done** (D), because only core advances the attack counter.

### D14 · Modules can't add prerequisite types
- **Gap:** clauses the parser doesn't recognise pass (`prerequisites.mjs`), and modules can't add an evaluator.
- **Book need:**
  - "Kitsune Heritage", "Devoted or Primal Monastic Path", "Oath of Fealty".
  - "Non-Disciple" (already supported).
  - "BSB 2+ or Inner Discipline".
  - Dragon Tamer's "unhatched dragon egg".
  - "Learned Caster" (IT-C9).
  - "any three Kensai feats".
- **Proposal:** `api.registerPrerequisiteClause(pattern, (actor, match) => boolean|null)`, where null means "can't tell, fail open". It keeps core's rule that an unrecognised clause never wrongly excludes a feat.
- **Without it:** those feats show up for characters who can't take them. The module adds a warning when one is taken (C).

### D15 · Housekeeping that Pillars of Faith also needs
- Add `progressionRequirements` to the feat schema in `template.json`. It works today only because template types keep extra fields.
- Gate feats on `system.level` (Level N prerequisites), or keep writing "Level N" into the prerequisites text, which Inner Tempest will do.
- Add an effect flag for **armour and shield category proficiency**. Inner Tempest's three classes are covered by `registerClass({proficiency})`; this is only needed if a later feat grants armour proficiency.

---

## Items the module can do today (no core change)

- Races, heritages, backgrounds, classes, feats, spells, weapons, armour, runes and wondrous items: these use pack federation (`flags.trg-prime.extends`) and the `sourcebook` flag.
- Languages (Scree Cant: `registerLanguage`), registered traits (Focus, Technique, Morph, Shadow, Chance, Translocation, Teleportation; descriptive), and class registration (proficiency, wealth).
- Archetypes (`registerArchetype` with `classGrants`/`tierGrants`); feat access for the core feats the book opens (`registerFeatAccess`); and feat gates (`registerFeatGate`).
- The 17 new skill actions (`registerSkillActions`), except the reactions among them (D8).
- Feat and ability automations (`registerFeatAutomation`), strike riders, conditionals, `abilityChoices` (Ghost Arts, Combat Forms, disciplines, oaths and paths), granted innate spells, specialist skills, starting wealth, and the Refocus-only bonuses (`conditionals.when.actions: ["refocus"]`).
- Per-encounter limits (Ambusher's Patience, Spirit Roar, Formal Declaration, Challenge ending with the encounter): module flags, reset on Foundry's `deleteCombat` and `combatRound` hooks. No core change is needed.
- The aging appendix (optional): a module macro that sets age-category ability modifiers from the actor's age and the race's lifespan.

## Order of dependence

| Block | Needs |
|---|---|
| Foundations (races, heritages, backgrounds, gear) | D5 for racial innate spells; D11 and D13 for weapons |
| Classes and techniques | D1, D2, D3, D5, D7, D9 |
| Reactions and skill actions | D8 |
| Feats | D1, D4, D7, D8, D14 |
| Dragon companions | D10 (and IT-C5's rulings) |
