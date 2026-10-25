# Inner Tempest Block 6: audit (class feats)

24 October 2026. Read against:
- **the book:** v1.2, Chapter 5 "Class Feats", lines 3561–4158 of `it12.md`, cut into `tools/content/book-text-block6.json` by `tools/content/extract-book-block6.mjs`;
- **the rulings** of 20 to 24 October;
- **TRG Prime 3.669.2.**

## Scope

The plan's Block 6 was "class feats (54) and general feats (22)". Most of that has shipped:

| Group | Shipped | Left for Block 6 |
|---|---|---|
| General feats | All 23, Block 1 (0.1.0) | none |
| Class feats | 40: Inner Discipline and the 11 Technique feats (Block 3), the 28 Ghostwalker, Kensai and Oathblade feats (Block 4) | **14** (below) |
| Core class feats opened to the five classes | none | **FC-55** (below) |

**The fourteen:**

| Group | Feats | Inventory |
|---|---|---|
| Disciple and Mystic stances | Crane, Dragon, Drunken, Mantis, Monkey, Snake, Tiger, Wolf | FC-08, 13, 14, 36, 37, 48, 51, 54 |
| Inner Discipline and Monastic Path | Elemental Fist, Inner Magic, Mystic Essence | FC-16, 30, 38 |
| Two-attack Strikes | Perfect Shot, Perfect Strike | FC-39, 40 |
| Flurry of Blows | Stunning Fist | FC-50 |

**FC-55: the existing core feats.** The book opens core class feats to the five classes, one list each: 34 entries, which are 21 distinct core feats plus "Metamagic Feats". These are not yet registered; only the racial lists are (Block 5).

**The book's rule for class feats** (the section's introduction): a feat with a class, class-type or archetype trait needs one of them; a feat with none is open to any class whose character meets its prerequisites. So Elemental Fist and Inner Magic, which print no trait line, are open to anyone with Inner Strike or Inner Discipline.

## What the system already has (TRG Prime 3.669.2)

**Stances:**
- **`helpers.enterStance`** (`feats-workflow.mjs:1719`) does the core's stance rules for a module's stance:
  - the 1 AP cost;
  - one stance at a time, and Stance Mastery's second;
  - the wait between stances;
  - Reactive Stance's free entry at initiative, which offers every owned feat with the Stance trait.
- **Spirit Stance** (Block 1) and Shadowy Stance (Block 3) use it.
- **A stance's benefits ride on its effect:**
  - typed changes (`system.combat.defence.circumstance`, `attack.circumstance`, `saves.reflex.circumstance`, `skills.<key>.circumstance`);
  - scoped tick-boxes (`conditionals`);
  - action bonuses (`stanceActionMods`, read by `resolveAction`: `highJump`, `longJump`).

**Attacks:**
- **A reaction Strike without the multiple attack penalty:** `rollWeaponAttack(…, { isReaction: true })`, after the `trgPrimeStrikeResolved` miss hook. This is Waiting Blade's pattern (Block 5).
- **Advantage on one Strike:** an `auto`, `oneShot` advantage tick-box on an effect (Shared Purpose's pattern).
- **Flourish:** `traitGate` and `recordTraitUsage`, as Flurry of Blows does.
- **Flurry of Blows** is the module's own (Block 3): `runStrikeSeries` returns each Strike's check (`attackOutcome.hits`, `damageTaken`).
- **Sweep** (+1 circumstance on a second target this turn) and **Deadly** (the critical bands one step closer) are read from the weapon's traits.

**Conditions and saves:**
- **Stunned** is a valued condition.
- **Saves with a degree ladder:** `helpers.runAreaEffect` with `scope: "targets"`.
- **Pack Attack:** +1d6 precision when two allies threaten the target, the core's rule.
- **Feint:** a skill action (Deception, against the higher of the target's Level DC and Sense Motive DC); a success leaves the target flat-footed. Shadow Counter (Block 4) resolves one through `resolveAction`.

**Spells and feat access:**
- **Innate spells:** Mystical Power's picker (Block 3) already chooses a Path-tradition spell by slot (cantrip; base PP no greater than level), and stamps the Path's tradition and ability.
- **Class feat access:** `registerFeatAccess("class", "Disciple", [names])` is supported; the picker honours it.
- **The 21 listed core feats all exist** (category Class). "Metamagic Feats" is not a category; it is the Metamagic trait, on 25 feats.
  - **Already open by tier:** Mobility, Nimble Dodge and Surprise Attack (Expert) to the Ghostwalker; Accurate Spell (Adept) to the Mystic.
  - **Already open to everyone:** Lunging Stance has no class trait.

## Not in the system yet: core work for TRG Prime 3.670.0

| # | Needed by | What |
|---|---|---|
| C1 | Mantis Stance, Dragon Stance, Elemental Fist | **A trait on every unarmed attack, or every attack, from an effect.** `weaponTraitGrants` is scoped by weapon group only. The fists, gauntlets and every natural attack are all "Brawling", and a Monastic weapon may be in any group. Proposed: `scope: "unarmed"` (the core's own `countsAsUnarmed`) or `"any"`. |
| C2 | Tiger Stance, Wolf Stance | **A damage type an effect sets, not offers.** `strikeTypeOption` asks before every Strike. Proposed: `strikeTypeOption.replace: true`, with the same scopes. |
| C3 | Tiger Stance | **"Any bleed damage that you inflict … is increased by 1."** No declaration exists; Savage Strikes and the rest are by name. Proposed: a declared `bleedBonus` read wherever bleeding lands from this attacker (critical injuries, strike riders). |
| C4 | Tiger Stance | **"You can Step 10 feet"** while your Speed is at least 20 feet. A longer Step comes only from named feats. Proposed: an effect-declared `stepFeet` with a minimum Speed. |
| C5 | Dragon Stance | **"Ignore the first square of difficult terrain while Striding."** Only "ignore all" exists. Proposed: `ignoresFirstDifficultSquare`, per Stride. |
| C6 | Wolf Stance | **Pack Attack from an effect.** It is read from ability items only. Proposed: also from applied effects (`derives.packAttack`). |
| C7 | Mantis Stance | **"One Move action each turn that does not provoke reactions."** Exists only as permanent immunity or a one-shot flag. Proposed: an effect-declared once-per-turn allowance read where attacks of opportunity are offered. |
| C8 | Perfect Shot, Perfect Strike | **A Strike that "counts as two attacks" for the multiple attack penalty.** The step of 2 is hard-coded for Power Attack. Proposed: `rollWeaponAttack(…, { mapSteps: 2 })`, shared with a mount as the core's own count is. |
| C9 | Monkey Stance | **"Take no penalty for using these actions for 1 AP."** The jumps' 1-AP option carries +2 to the DC from the trade-offs table; waivers are by feat name. Proposed: a declarable waiver by action. |
| C10 | Drunken Strike | **A Feint resolved from a given total** (depends on B6-3). `resolveAction` has preset dice, but no preset total. |
| C11 | Inner Magic | **"You may also learn feats which are available only to the Mystic."** Class and tier grants come only from owned Archetype feats. Proposed: from any owned feat that declares them. |
| C12 | FC-55 (Mystic: "Metamagic Feats where compatible with innate spells") | **Metamagic on an innate spell.** The cast workflow offers none for an innate spell or a cantrip. Depends on B6-8. |

## How each feat will be built

**A** automated; **B** automated with a tick-box or a card the player acts on; **C** the card states the rule; **D** text only.

| Feat | Plan | Class |
|---|---|---|
| Crane Stance | Stance (1 AP): +2 circumstance DB; High Jump and Long Jump +5 (interpretation 2). Devoted or Primal Path checked at Use. | A |
| Dragon Stance | Stance: +2 circumstance AB; Sweep on your attacks (C1, B6-2); the first square of difficult terrain on each Stride ignored (C5). Primal or Transcendent Path. | A |
| Drunken Stance | Stance: +2 circumstance DB, and **Drunken Strike** (Attack, Flourish, 1 AP) while in it: a melee Strike at −2 circumstance; if it deals damage, it is a Feint against the target (C10, B6-3). Devoted or Primal Path. | A |
| Elemental Fist | Inner Strike's type list gains electricity (Air), bludgeoning (Earth), fire (Fire) and cold (Water); the chosen element's trait is on your attacks while Inner Strike lasts (C1). | A |
| Inner Magic | Use: one cantrip of your Path's tradition, innate with Focus, cast with the Path's ability (Mystical Power's picker). Mystic feats opened (C11, B6-7). Prerequisites: Inner Discipline, Level 4, Non-Mystic. | A |
| Mantis Stance | Stance: Deadly on your unarmed attacks (C1); +2 circumstance Reflex; one Move action each turn triggers no reactions (C7, B6-4). | A |
| Monkey Stance | Stance: +2 circumstance Acrobatics and Climbing; +2 circumstance High Jump and Long Jump; the 1-AP jump without its penalty (C9, B6-5). | A |
| Mystic Essence | Use: one spell of your Path's tradition with base PP no greater than your level, innate with Focus (Mystical Power's picker). | A |
| Perfect Shot | Use (Attack, Flourish, 2 AP): a ranged Strike with advantage, counting as two attacks (C8). Archer, Ranger or Zen Archer (B6-10). | A |
| Perfect Strike | Use (Attack, Flourish, 2 AP): a melee Strike with advantage, counting as two attacks (C8). Fighter or Disciple. | A |
| Snake Stance | Stance: when a creature misses you with a melee Strike, you are asked for a reaction melee Strike against it, at no multiple attack penalty (Waiting Blade's pattern; B6-9). Inner Discipline; Devoted or Illuminator Path. | B |
| Stunning Fist | In Flurry of Blows: both Strikes at one creature, either hits and deals damage → its Fortitude against your Technique DC; stunned 1 on a Failure, stunned 3 on a Fumble (B6-6). | A |
| Tiger Stance | Stance: your attacks deal slashing (C2, B6-1); +1 to bleed you inflict (C3); Step 10 feet while your Speed is at least 20 (C4). | A |
| Wolf Stance | Stance: your attacks deal piercing (C2, B6-1); Pack Attack (C6). | A |
| FC-55 | `registerFeatAccess("class", …)` for each list (B6-8 for Metamagic). | A |

**The prerequisites, as the core reads them:**
- **Perfect Shot and Perfect Strike** print "Dex 1, Wis 1, BAB +8". The core's parser reads "Dex +1, Wis +1, BAB +8", so they are written that way. As printed they would pass open.
- **A Monastic Path is not a feat**, so the core cannot check "Devoted or Primal Monastic Path". It is checked when the stance is entered, as Shadowy Stance's is.

**FC-55, per class:**

| Class | Opened by registration | Already open |
|---|---|---|
| Disciple | Combat Awareness, Combat Grapple, Evasion, Guarded Move, Reactive Stance, Stance Mastery, Superior Evasion | — |
| Ghostwalker | Combat Awareness, Distracting Strike, Evasion, Reactive Stance, Superior Evasion | Mobility, Nimble Dodge, Surprise Attack (Expert) |
| Kensai | Combat Awareness, Combat Grapple, Disarm Stance, Distracting Strike, Duelling Riposte, Mobility | — |
| Mystic | Combat Reflexes, Injury Relief, Reactive Stance, Stance Mastery, the Metamagic feats (B6-8) | Accurate Spell (Adept), whose bonus must reach Mystic innate spells |
| Oathblade | Combat Awareness, Disrupting Stance, Furious Focus, Reactive Stance, Resolve, Superior Resolve | Lunging Stance (no class trait) |

## Questions for Graham

| # | Question | Proposal |
|---|---|---|
| B6-1 | Tiger Stance "your attacks inflict slashing damage", Wolf Stance "your attacks deal piercing damage": every attack (a sword too), or your unarmed attacks? And always, or offered each Strike? | **Your unarmed attacks** (fists, gauntlets, Monastic weapons) deal that type while in the stance, without asking; a weapon keeps its own. The stances are unarmed styles, and Mantis Stance names unarmed attacks outright. |
| B6-2 | Dragon Stance "your attacks gaining the sweep trait": every attack, or unarmed? | **Unarmed attacks**, as B6-1 ("formidable leg strikes"). |
| B6-3 | Drunken Strike: "If the attack inflicts damage, it is classed as a feint against your target using your total Attack Roll as the Feint DC." | **Your attack total stands as your Feint check**, against the target's usual Feint DC (the higher of its Level DC and its Sense Motive DC, Hard). Feint's own degrees apply: a Success leaves the target flat-footed. The alternative reading: the target rolls Sense Motive against your attack total. |
| B6-4 | Mantis Stance "may take one Move action each turn that does not provoke reactions": chosen, or the first? | **The first Move action each turn** in the stance triggers no reactions, automatically. |
| B6-5 | Monkey Stance "take no penalty for using these actions for 1 AP". | **The 1-AP High Jump and Long Jump carry no +2 to their DC.** |
| B6-6 | Stunning Fist uses "your Technique DC", which the book defines only for the Kensai's Combat Forms. | **10 + your Monastic Path's ability + your level**, the DC Block 3's techniques use. A Blunder stuns 3, as a Fumble does. |
| B6-7 | Inner Magic: "you may also learn feats which are available only to the Mystic (Adept) class". | **Feats with the Mystic trait** (Mystic Essence and the like), not every Adept feat. |
| B6-8 | The Mystic's "Metamagic Feats where compatible with innate spells": innate spells take no metamagic in TRG Prime. | **The Metamagic feats are opened to the Mystic, and work on its innate spells** (not cantrips), paid from the spell's PP as for a learned caster. A feat that needs a spellbook or preparation is not compatible. This is core work C12. |
| B6-9 | Snake Stance's reaction has no traits of its own. Battle Readiness's extra reaction serves only an Attack or Martial reaction. | **It is a Strike, so it has the Attack trait**, and Battle Readiness's reaction may take it. |
| B6-10 | Perfect Shot names the Zen Archer, an archetype of Block 7. | **The trait is kept,** and the feat opens to a Zen Archer when Block 7 registers the archetype. Until then, Archer (core archetype) and Ranger. |

## Interpretations (they stand unless Graham says otherwise)

1. **Stances:**
   - none of the eight has the Focus trait, so none uses a Focus use;
   - each is entered for 1 AP under the core's own stance rules (one at a time, Stance Mastery, Reactive Stance);
   - each lasts until replaced or ended.
2. **"Reduce the difficulty … by 5"** (Crane) is +5 to the High Jump and Long Jump check. The jump DC is computed from the distance, so a +5 on the check is the same arithmetic.
3. **Circumstance bonuses do not stack.** With Stance Mastery, Monkey's +2 to jumps and Crane's +5 are the same type, so only the higher applies. (Crane's −5 to difficulty is not a bonus; on that reading Crane's +5 and Monkey's +2 would both apply. Graham may say.)
4. **Elemental Fist's trait** lasts as long as that Inner Strike, to the end of your turn.
5. **Mystic Essence** is taken once (the book says nothing of repeating it). Lotus Enchanter (Block 7) adds Enchantment spells to its choices.
6. **Perfect Shot and Perfect Strike:** the advantage is on that Strike only. The second count for the penalty is added after it.
7. **Stunning Fist:**
   - It needs both Strikes of one Flurry at the same creature.
   - It is tried automatically when either hits and deals damage. There is no cost, so there is no reason to decline.
   - A Success or better has no effect.
8. **Tiger Stance's 20-foot Speed** is your land Speed at that moment, penalties included.
9. **Dragon Stance's first square** is per Stride action.
10. **Wolf Stance's Pack Attack** is the core's rule: +1d6 precision when at least two allies threaten the target.

## Releases

- **TRG Prime 3.670.0:** C1 to C12, after the rulings.
- **Inner Tempest 0.7.0:** the fourteen feats and FC-55.
