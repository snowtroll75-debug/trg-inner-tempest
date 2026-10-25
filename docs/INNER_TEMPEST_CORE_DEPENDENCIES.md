# Inner Tempest — Core Dependencies

These are the changes the TRG Prime **system** would need so that the Inner Tempest **module** can automate the book without patching core files or deep-importing private functions.

It was written against TRG Prime 3.663.5 and is kept current as items ship; after reading its module API (`module/module-api*.mjs`), its Focus, Refocus, innate, stance, reaction, companion, grant and picker code, and Pillars of Faith 0.11.1's use of the API. Nothing here has been built.

Every item is a **reusable API**, not an Inner Tempest special case, so later books can use it too. That follows the 16 Sep architecture ruling, under which the system gained the companion-module API rather than modules patching internals.

**Shipped in TRG Prime 3.664.0 (20 Oct 2026),** with Inner Tempest 0.1.0 pinned to it:

| Dependency | Shipped as | Harness |
|---|---|---|
| D2 Refocus restores all | `refocusRestoresAll` rows on a carrier (`focusExtraUses[].restoresAll`) | verify/mutate-focus-declarations |
| D3 another ability for one action | `actionAbilityOptions` rows; best option, as the difference | verify/mutate-focus-declarations |
| D4 (part) first use each day | `dailyFirst` rows: a Refocus degree `improve`/`set`, a Power Recovery `multiplier`; spent on the actor, cleared at daily preparation | verify/mutate-daily-firsts |
| D5 one spell's own ability | `castingAbilityOverride` honoured (attack, save DC, sheet); `grantedSpellAbility` on a granting item; `spellChoice.castingAbility` | verify/mutate-focus-declarations |
| D6 daily preparation clears rune and wondrous Focus | `dailyFocusFlagClears` | verify/mutate-focus-declarations |
| D7 stances from a module | `helpers.enterStance(actor, item, {…, flags})` (the core's own entry), `helpers.activeStances`; `stanceConditionals` and `stanceDefenceDC` read only while a stance is up | verify/mutate-stance-declarations |
| D16 innate PP limit | `innateLevelRefusal`, characters and companions only | verify/mutate-focus-declarations |
| (new) creature-trait axes | conditionals `targetTraits`; defence rows `sourceTraits`; magical attacks `targetTraits` | verify/mutate-stance-declarations |
| (new) a move and a strike a module ability paid for | `helpers.armMove`, `helpers.rollWeaponAttack`; `helpers.traitGate` and `helpers.recordTraitUsage` for Flourish | verify/mutate-stance-declarations |
| (new) heritage natural attacks; heat immunity; breathing water; scoped flat-check increases; Ghost Touch for magical attacks only | `grantedWeapons` on a heritage; derives `heatEnvironmentImmune`, `breathesWater`; `missCheckDCIncrease {value, conditions}`; `ghostTouch {magicalOnly}` | verify/mutate-heritage-derives |
| (new) conviction, falls, carrying | `convictionPool`, `fallReduction`, `carryStrength` declarations | verify/mutate-focus-declarations |

**Shipped in TRG Prime 3.665.0 (21 Oct 2026),** with Inner Tempest 0.2.0 pinned to it, from Graham's rulings of 21 October:

| Dependency | Shipped as | Harness |
|---|---|---|
| D1 Focus items with no count (completed in **3.665.1**: the Use button refuses a spent defaulted use and spends it after a Use that acted) | `focusDefaultUses`: a Focus feat or ability with a blank `usesPerDay` is one use (innate spells keep their own rule). Primed on item and actor creation; a 3.665.0 migration gives items already on sheets and placed creatures their use. Reaches the five core feats, one F&F feat and 25 F&F creature abilities (on 26 creatures). | verify/mutate-focus-default |
| (new) a defender's disadvantage row | `defenceDC` rows with `kind: "disadvantage"` (optionally `dc: "any"`): the attacker's check against that defender is rolled at disadvantage, reconciled with the action's own advantage in one pass, and the card says so (Tsuchi against Shove and Trip) | verify/mutate-defence-disadvantage |
| (new) an alternative to a duplicated specialist skill | `specialistAlternative` on a background: when another item already confers its specialist skill, Apply Grants names it and the background's Use asks for another (Spirit Warrior and Spiritwalker on a Miraku) | verify/mutate-specialist-alternative |

**Shipped in TRG Prime 3.666.0 (21 Oct 2026),** with Inner Tempest 0.3.0 pinned to it, for Block 2 (Chapter 4) as ruled by Graham on 21 October (`docs/INNER_TEMPEST_BLOCK2_AUDIT.md`):

| Dependency | Shipped as | Harness |
|---|---|---|
| D8 (part) a defence that lasts one attack (B2-1, B2-3) | `oneAttack` on an effect: `true`/`{against: "attack"}` (any attack against DB), `{against: "weapon"}`, `{actions: [...]}`, optionally `fromUuids`; every Strike, spell attack, bomb, spiritual weapon and action against the bearer removes what it spends, through the GM relay. **Core's Nimble Dodge fixed with it** (its +2 had stayed until deleted by hand and it never spent its reaction); Evade, Impact Absorption, Root the Body and Observe Technique use it | verify/mutate-block2-core (A) |
| D8 (part) a reaction that rolls a skill before a save (B2-2) | `saveBonusReaction` {label, skill, saves, traits, type} on an item or effect: offered before a matching save, spends the reaction in combat, adds the Bonus Check. For Steel the Mind once Inner Discipline ships (Block 3) | verify/mutate-block2-core (B) |
| B2-3 a defence row against a list of DCs | a Trip (the higher of Acrobatics and Fortitude DC) now meets a row on either | verify/mutate-block2-core (C) |
| B2-4 the Dying Check's scope | the Dying Check carries `actionKey: "dyingCheck"` (Resist Dying) | verify/mutate-block2-core (D) |
| B2-5 an action's own time ladder | `timeLadder {options: [{key, label, modifier, apCost}], defaultKey}` on a registered action (Centred Balance, Elemental Ward) | verify/mutate-block2-core (E) |
| B2-6 an action's traits on its check | a skill action's check carries its own traits (Maintain Clarity's Concentrate and Mental); every existing traits-scoped bonus checked first | verify/mutate-block2-core (F) |
| B2-7 a ward zone | `helpers.placeWardZone(actor, {label, damageType, weakness, seconds, radiusFeet})`: a circle Region whose occupants carry resistance (or weakness) while inside, kept in step by the acting GM, ended on the world clock | verify/mutate-block2-core (G) |
| (new) helpers and hooks | `helpers.bonusCheckModifier`, `helpers.levelDC`, `helpers.reduceCondition` (Rally's floor-respecting reduction); hooks `trgPrimeDailyPreparation` {actor} and `trgPrimeTurnEnded` {actor, combatant, combat} | verify/mutate-block2-core (H) |
| (new) a module that applies its own outcome rows | `outcomesApplied: true` on an action: the generic outcome readers (modifier, heal, push, attitude) leave its text alone; "clear it by hand" is printed only where a condition was laid | verify/mutate-block2-core (H) |
| (ruled) the multiple attack penalty counts only in combat | `attacksCount`/`attackCountOf`/`setAttackCount`; cleared when a combat begins | verify/mutate-map-combat-only |

**Shipped in TRG Prime 3.667.0 (22 Oct 2026),** with Inner Tempest 0.4.0 pinned to it, for Block 3 as ruled by Graham on 22 October (`docs/INNER_TEMPEST_BLOCK3_AUDIT.md`, B3-1 to B3-5):

| Dependency | Shipped as | Harness |
|---|---|---|
| D9 (narrow) a Defence or Speed row that holds only unarmoured or unencumbered | `statBonuses: [{target: "defence"\|"speed", type, ability\|value\|byLevel, when: {unarmoured, unencumbered}}]` on an item or effect, added in preparation once armour and encumbrance are known, into the typed pools (Flat-Footed's dodge filter applies). Disciple's Dodge, Incredible Movement; Serene Defence through a declared spell effect | verify/mutate-block3-core (A) |
| D12 unarmed damage | `unarmedDamage {die, versatile, perBAB: {every, value}, countsAs: {magical, "cold iron", silver, adamantine}}`: the fists' die and Versatile letter (Versatile B now reads as bludgeoning), a flat added to the total, a magical source, and several materials met at once by weakness and bypass | verify/mutate-block3-core (B) |
| D11 (core half) Monastic counts as unarmed | `countsAsUnarmed(weapon)` (fists, a weapon the core calls unarmed, or the Monastic trait), used by the unarmed profile and offered as `helpers.countsAsUnarmed`. Core's own unarmed-only abilities still read `system.unarmed` | verify/mutate-block3-core (B) |
| (new) a series of Strikes that meets DR once | `helpers.runStrikeSeries(actor, strikes, {label, apPaid})`: a later hit on a creature already hit meets no DR; after one critical injury a later critical keeps its dice and rolls none; the multiple attack penalty runs normally, or `mapOverride` per Strike (Disciplined Flurry's 0, which still counts) | verify/mutate-block3-core (C) |
| (new) a defender's conviction reroll | `attackRerollConviction {label}` on an item: offered to the defender's player once a Strike or spell attack (each ray) is rolled against them, before it resolves; not on Chaos; the point is spent on their client; the new roll stands | verify/mutate-block3-core (D) |
| D16 (extended) an innate spell's own allowance | `innatePPAllowance` on the spell copy: castable to base PP = level + allowance (B3-2) | verify/mutate-block3-core (E) |
| (new) damage applied | hook `trgPrimeDamageApplied {actor, amount, isCritical, nonlethal, damageTypes, sourceUuid, sourceName, context}` once HP has moved; a Strike's context `{kind: "strike", melee, damageType, weaponName}`, a spell's `{kind: "spell", spellName}` | verify/mutate-block3-core (F) |
| (new) declared spell effects | a spell's `declare` row may carry `statBonuses` and `conditionals` (Serene Defence, Reflective Mind); `helpers.basicSaveHit` for a module's area technique (Inner Blast) | verify/mutate-block3-core (G) |

Built in the module instead of the core: the Path's tradition and ability on a granted spell (audit C7) is stamped by a `preCreateItem` hook; Burst Step is declared with its Use button (no Movement hook, audit C8).

**Not shipped yet:** the rest of D4 (`refocusTarget` on the resolved hook, "choose a second ability"), D7's `keep` for Formbinder, D8 (other reactions), the general D9, D10, D11's core unarmed-only abilities, D13–D15. Three found while building Block 1:

- **D17 · A DC-conditioned degree floor.** Leap: "automatically succeed if the DC is 20 or less." `registerDegreeUpgrades` maps degree to degree and never sees the DC. Proposal: `degreeFloors: [{actions, maxDC, floor}]` read where the action's degree is settled. Without it: Leap is D.
- **D18 · Create's success modifier.** Artisan's Enchantment lowers it by 2 to add a quality. Proposal: a `createSuccessModifier` declaration read by create-crafting. Without it: D.
- **D19 · A rest variant for Healing Trance.** Meditative Recovery: 10 minutes rather than an hour. Proposal: a rest-workflow option keyed by feat. Without it: D.

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

### D16 · Innate spells above character level are castable — core bug
- **Gap:** an innate cast sets base PP to 0 (`cast-workflow.mjs:1137`) and skips the PP cap (`:1862`). Free warping is capped at character level (`innateWarpBudget`, your ruling of 18 Aug), but nothing refuses an innate cast whose **base** PP exceeds the character's level.
- **Rule (Graham, 20 Oct 2026):** an innate spell can't be cast at a level below its base PP. This is what caps Mystical Power, Mystic Essence, Shugenja and Draconic Spell.
- **Proposal:** in `castSpell`, before any AP is spent, refuse when the spell's base PP is greater than `innateCastLevel` (the granting item's level when it has one, otherwise the character level). Item casts are exempt; their PP was paid at the workbench.
- **Without it:** these four features let a character take a spell above their level and cast it.

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
- **Partly shipped in 3.666.0:** Graham ruled (21 Oct 2026) that a reaction to being attacked is declared when you are targeted, so the before-the-hit and before-damage defences are `oneAttack` effects (above), and the before-the-save ones are `saveBonusReaction`. The general `registerReaction` is still open for the after-the-fact and retargeting reactions of later blocks.

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
