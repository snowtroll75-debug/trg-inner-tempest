# Inner Tempest 1.1 — Rules Audit (preliminary)

**Source:** `TRG_Inner_Tempest_1_1.docx` (Version 1.1), read in full: Chapters 1–9, the appendix and the index.
**Compared against:** TRG Prime system 3.663.5, meaning its packs and its rule code. Pillars of Faith 0.11.1 and Fiends & Fables Prime 0.45.0 were used for name resolution. The Core rulebook text was not supplied, so every Core comparison below is against the system as it is built. Where the build encodes an earlier ruling of yours, I say so.
**Status:** preliminary. Nothing here has been adopted. Each entry keeps three things separate: **Published** (what the book says), **Interim build** (what I would implement if you give no ruling, chosen as the least invasive reading), and **Proposed amendment** (my recommendation, for your decision).
**Page numbers** come from the book's own index. Where the index has no entry, I give the chapter and section instead.

Severity scale:

- **Critical**: implementation is blocked, or the rule produces invalid behaviour as written.
- **Major**: inconsistent results, a contradiction, or a significant balance problem.
- **Minor**: wording, an editorial slip, or a small inconsistency.
- **Improvement**: an optional design suggestion.

## Summary

| Severity | Count | Blocking |
|---|---|---|
| Critical | 9 | 9 (each has an interim reading; see the entries) |
| Major | 27 | 0. Each builds to the interim reading and is reversible. |
| Minor | 41 | 0 |
| Improvement | 8 | 0 |

**The nine rulings that block building** are IT-C1 to IT-C9. Each one has an interim reading, so work outside the affected feature can carry on meanwhile.

---

## Critical

### IT-C1 · Spirit Stance does not exist — Critical · Blocks: Spirit Warrior background
- **Where:** Ch2 Backgrounds, Spirit Warrior (p15).
- **Published:** the bonus feat is "Spirit Stance". The book's closing note says every background bonus feat is described in Chapter 5.
- **Issue:** no feat called Spirit Stance appears anywhere in the book: not in Chapter 5, not in the index, not as a stance. It is not in the core packs, Pillars of Faith or Fiends & Fables either. The index does list a "Shadow Stance" (pp10, 56), and the only matching feat is Shadowy Stance.
- **Core comparison:** a background grants its bonus feat by name, and the system resolves that name against the feat packs. An unknown name grants nothing.
- **Impact:** the Spirit Warrior background cannot be built as printed.
- **Interim build:** the background ships with Spirit Stance **unresolved**. The grant is left empty and flagged on the item, so nothing is invented.
- **Proposed amendment:** (a) supply the Spirit Stance text; or (b) substitute an existing stance that fits a "spirit warrior" (Shadowy Stance or Crane Stance), granted without prerequisites as all granted feats are.

### IT-C2 · Tianzhi "racial element" is never defined; Hikari has none — Critical · Blocks: 5 Tianzhi feats
- **Where:** Ch2 Tianzhi (p13); Ch5 Elemental Attunement, Elemental Infusion, Elemental Power, Elemental Supremacy, Elemental Ascendant (p42).
- **Published:**
  - The race text: "Tianzhi society is organized around elemental clans, each dedicated to one of the five elements." Its Core Languages are "Low Tongue, One language based upon their heritage".
  - The five feats key off "your racial element" and "your elemental type".
- **Issue:**
  1. No heritage names its element. One is implied for four of them (Fuukaze air, Kasai fire, Suiryoku water, Tsuchi earth). Hikari's is spirit or light, and is never stated.
  2. "Five elements" doesn't match the four implied ones.
  3. No heritage names its language.
  4. Elemental Infusion deals "+1d4 damage of your elemental type", but air, earth and water are not damage types.
  5. The spell lists include spells with no elemental trait for any heritage. In the core packs Restoration is Essence/Healing/Soul, Remove Disease likewise, Restore Senses likewise, Endure Elements is Warding, and Water Breathing is Alteration. That leaves no reading under which those picks are legal, though they are clearly intended for someone (Hikari?).
- **Core comparison:** core spells carry element traits (Air, Earth, Fire, Water, Cold, Electricity, Acid). Feat pickers can filter on them, so the mechanism exists once the element is defined.
- **Impact:** none of the five Tianzhi element feats can validate a pick or apply damage, and the race's language choice cannot be offered.
- **Interim build:**
  - Each heritage records an element: Fuukaze Air, Kasai Fire, Suiryoku Water, Tsuchi Earth, and **Hikari unresolved**.
  - Infusion damage maps each element to a damage type, using the same pairs the book's Shugenja table and Elemental Fist use: Air→electricity, Earth→bludgeoning, Fire→fire, Water→cold.
  - The race's heritage language is left as a free choice.
- **Proposed amendment:**
  - Define each heritage's element, damage type and language in the heritage text. Suggested: Fuukaze Air/electricity, Kasai Fire/fire, Suiryoku Water/cold, Tsuchi Earth/bludgeoning or acid, and Hikari "Spirit" using positive or essence damage, with the Healing/Soul spells on its list.
  - Change "five elements" to match.

### IT-C3 · Mystic "eligible spell" per level has no cap — Critical · Blocks: Mystic level-up
- **Where:** Ch3 Mystic, Mystical Power (p26).
- **Published:** "At 1st level… any two cantrips… and any two spells with a base PP of 2… Each time you gain a level, you may add one additional eligible spell to your innate repertoire."
- **Issue:** "eligible" is never defined after 1st level. Read literally, a 2nd-level Mystic could take a PP 16 spell as an innate spell with the Focus trait, cast at maximum warp, every Refocus.
- **Core comparison:**
  - Core innate spells always cast at full warp with caster level equal to character level (casting.mjs). So the base PP cap is the only thing holding the power in check.
  - Mystic Essence (Ch5) gives the rule the book probably meant: "base PP is no greater than your level +1".
- **Impact:** level-up automation can't validate the pick, and the class's power ceiling is undefined.
- **Interim build:** use Mystic Essence's rule for every Mystical Power pick after 1st level: the spell's tradition is the Path's, and its base PP is at most level + 1.
- **Proposed amendment:** add "An eligible spell is one from your Monastic Path's tradition whose base PP is no greater than your Mystic level +1."

### IT-C4 · Class feature levels are mostly unstated — Critical · Blocks: automatic grants for all five classes
- **Where:** Ch3, all five classes (pp17–32).
- **Published:**
  - Only some abilities name a level: Disciple's Dodge "at 1st level", Incredible Movement 4th, Combat Form "at 1st level", the Sworn Oath at 1st, and Mystical Discipline at 1st.
  - These name no level:
    - Disciple: Powerful Fists, Disciple's Resolve, Flurry of Blows, Deep Focus, Monastic Path.
    - Ghostwalker: Ghostwalk, Unseen Assault, Vanishing Retreat.
    - Kensai: Flow Strike, Considered Mind, Weapon Discipline (its level is given).
    - Mystic: Alter the Thread, Mystical Resolve, Monastic Path.
    - Oathblade: Challenge, Unwavering Purpose, Oathblade's Resolve.
  - The class tables have no features column.
- **Core comparison:** core classes record every ability with its level (Fighter's `classAbilities`: "1: Warrior's Resolve, 1: Martial Training, 2: Battle Readiness, …"), and level-up grants come from that list.
- **Impact:** level-up cannot be automated without a level for every feature.
- **Interim build:** every unstated ability is granted at 1st level. This is the natural reading, since each class's text runs in order and starts with the 1st-level options.
- **Proposed amendment:** add a "Special" column to each class table (core style), or confirm "all class abilities without a stated level are gained at 1st".

### IT-C5 · Dragon companion progression is incomplete — Critical · Blocks: companion advancement past base +2
- **Where:** Ch5 Dragon Companions (pp60–66).
- **Published:**
  - The Dragon Companion Table adds Wings at Base+6, Tail at +10, Crush at +16 and Sweep at +20.
  - It says "Crush and Sweep attacks are explained in the dragon companion ability descriptions at the end of this chapter".
  - Breath weapon: "The amount of damage the breath weapon inflicts, and its range are detailed here".
  - Size rises by +1 at +2, +2 at +4, +3 at +8 and +4 at +16.
  - The HP table lists Tiny to Huge.
- **Issue:**
  1. **Sweep** is never described. It is also not in the core or Fiends & Fables codex (the core *weapon* trait Sweep is a different thing).
  2. **Wing and tail attack profiles** (damage, traits) are never given, yet Wing Buffet uses "the dragon's wing attack damage".
  3. **Breath damage progression** is missing. The table gives only line and cone length; each base block gives just one starting figure (4d8, 4d8, 6d8, 5d10).
  4. A Small dragon at +16 is Gargantuan and a Medium (earth) one is Colossal, but the **HP size table stops at Huge**.
  5. The fly speed column is "Base +5…", but the earth dragon has **no base fly speed**.
  6. The bite and claw progression "with size" isn't tabulated. Core has a size-step die ladder (companion.mjs), so that one is solvable.
- **Core comparison:**
  - Core companions advance from a progression table (companions pack plus companion.mjs).
  - Core's creature codex already has Crush, Draconic Assault, Draconic Shifting, the elemental auras, bloods and strikes, Frightful Aura, Reflective Scales, Scorching and Slowing Breath, Snowvision, Spell Resilience, Wing Buffet, Ice Climb, Smokevision and Flyby Attack, all of which can be reused.
- **Impact:** a dragon companion can be built and played at its base level. Advancement past Base+2 needs the missing data.
- **Interim build:**
  - Ship the four base dragons as playable stat blocks.
  - Automate the table's columns that are defined: size, speeds, ability increments, breath length, BAB, BDB, saves, HP, skills and spells.
  - Leave Wings, Tail, Sweep and breath-damage scaling **unresolved and visible**, and stop HP size growth at Huge, each with a GM note.
- **Proposed amendment:**
  - Supply wing and tail profiles (suggested: Wings 1d6 B, Agile; Tail 1d8 B, Reach +5 ft, size-scaled), breath dice (+1 die per 2 levels, mirroring Celestial Breath), and Sweep text.
  - Extend the HP table (Gargantuan 120, Colossal 160?).
  - State that the earth dragon gains a fly speed from Base+1 as 20 ft + the table.

### IT-C6 · Shugenja grants spells with no power cap — Critical · Blocks: Shugenja archetype
- **Where:** Ch5 Archetypes, Shugenja (p50).
- **Published:** "Each day during your daily preparations you may select two spells from any tradition which has the associated trait for your chosen element. You cast these spells as innate with the focus trait."
- **Issue:** there is no base PP limit. A 2nd-level Shugenja could take Incendiary Cloud (PP 16) as an innate spell at full warp, restored by Refocus. Every other spell-granting option in the book is capped: Mystic Essence at level+1, Harmony Warden at PP 2 rising by 2 every 5 levels, and the Tianzhi ladder at 2/4/6.
- **Core comparison:** innate spells cast at maximum warp at character level, so the cap is the only check.
- **Impact:** the build can't validate picks, and the archetype is unbalanced.
- **Interim build:** cap at base PP ≤ character level + 1 (Mystic Essence's rule), and flag the cap as an interim one.
- **Proposed amendment:** "two spells … whose base PP is no greater than your level +1".

### IT-C7 · Draconic Spell (companion feat) grants any arcane spell — Critical · Blocks: that feat
- **Where:** Ch5 Companion Feats (p65).
- **Published:** "The dragon companion may select any one arcane spell and add it as an innate spell with the focus trait." It is repeatable.
- **Issue:** the same uncapped-innate problem as IT-C6, on a creature that already uses High Magic.
- **Interim build:** cap at base PP ≤ the companion's caster level + 1. The book says "caster [level] equal to their level −3".
- **Proposed amendment:** "…any one arcane spell whose base PP is no greater than its caster level +1".

### IT-C8 · Tanuki Trickster grants a spell that doesn't exist — Critical · Blocks: that archetype
- **Where:** Ch5 Archetypes, Tanuki Trickster (p51).
- **Published:** "you gain Humanoid Form and Mirage Entity as innate spells with the Focus trait, using the tradition and magical ability score of your Monastic Path."
- **Issue:**
  1. There is no "Humanoid Form" spell. Core has the spell **Shape Of The Humanoid** (PP 4; arcane, ethereal, verdant) and a Druid feat called "Humanoid Shape".
  2. The archetype only needs Inner Discipline and Deception 4. Most characters who take it (Ghostwalker, Kensai, Oathblade, other core classes) **have no Monastic Path**, so the tradition and ability score are undefined. See IT-M6.
- **Interim build:** grant Shape Of The Humanoid. Tradition and ability follow IT-M6's interim rule.
- **Proposed amendment:** rename to "Shape of the Humanoid", and give a fallback for characters without a Path (see IT-M6).

### IT-C9 · Learned Caster: Shugenja prerequisite — Critical (resolved by core) · Blocks: nothing once confirmed
- **Where:** Ch5 Archetypes, Shugenja (p50).
- **Published:** "Prerequisites Learned Caster, Arcana 2 ranks, Nature 2 ranks, Religion 2 ranks".
- **Issue:** "Learned Caster" is not a feat. It is a core caster category (prerequisites.mjs lists it among the unparsed clauses). So none of the five Inner Tempest classes can ever qualify: none of them is a Learned Caster, and the Mystic is innate-only. The archetype sits in an Inner Tempest book but is reachable only by core casters (Wizard, Cleric, and so on).
- **Impact:** that is probably intended, but it is worth confirming, because the archetype's flavour ("secluded temples… meditate") suggests Mystics were meant to take it.
- **Interim build:** gate on core Learned Caster. The system's prerequisite parser fails open on this clause, so the module adds an explicit gate.
- **Proposed amendment:** if Mystics should qualify, change the prerequisite to "Learned Caster or Mystic".

---

## Major

### IT-M1 · Refocus outcomes differ between Chapter 4 and Chapter 7 — Major
- **Where:** Ch4 Special Actions, Refocus (p35); Ch7 Refocus Results / Focus & Refocus Reference (p73).
- **Published:**
  - Ch4: Partial = "fail… but may attempt to Refocus that ability again next turn"; Failure = "cannot attempt… again for 1 minute".
  - Ch7: Partial = "must wait 1 minute before using it can be used again"; Failure = "cannot attempt… again for 10 minutes".
- **Core comparison:** **core 3.663.5 implements the Ch7 ladder** (refocus.mjs `REFOCUS_LADDER`): Partial restores after one minute and blocks re-attempts for that minute; Failure blocks for ten minutes. Core's own Refocus is in its skill-actions data.
- **Impact:** the two chapters give different results for the same roll.
- **Interim build:** use core's existing behaviour (the Ch7 ladder). The module adds no Refocus of its own.
- **Proposed amendment:** correct Ch4 to the Ch7 text, and fix Ch7's garbled Partial sentence to read "…must wait 1 minute before it can be used again".

### IT-M2 · Refocus restores one use in core, all uses in this book — Major
- **Where:** Ch3 Disciple, Deep Focus (p17); Ch5 Ghost Art Mastery (p54); Ch7 Additional Uses (p72).
- **Published:** "When you successfully Refocus a technique, all of the uses granted to that technique by Deep Focus are restored."
- **Core comparison:** core `restoredUses(current, max)` restores **one** use per successful Refocus (your earlier ruling: "one chosen item, +1 use").
- **Impact:** a Disciple's techniques have two uses, and core would hand back one per Refocus, not both.
- **Interim build:** the module flags Inner Tempest Focus abilities "restore all uses on Refocus". This needs a small core hook (see Core Dependencies D3). Core abilities keep +1.
- **Proposed amendment:** none to the book. Confirm the book's rule applies only to abilities with extra uses from Deep Focus or Ghost Art Mastery.

### IT-M3 · Inner Flame's Flame Within is Focus but stacks — Major
- **Where:** Ch3 Mystic, Inner Flame (p27).
- **Published:** "FOCUS TECHNIQUE · Free (0 AP); Trigger you take damage. You gain a +1-circumstance bonus to attack checks for 1 round (stacking up to +3). This resets when you end your turn without taking or dealing damage."
- **Issue:** a Focus ability is expended on use, so it can never trigger a second time to stack, unless the Mystic Refocuses (1 AP each) between hits. The stacking and reset text describes an always-on ability.
- **Interim build:** as printed: Focus, expended, +1 per trigger, capped at +3, reset as stated. The Mystic Refocuses to stack. This works, but it is clumsy.
- **Proposed amendment:** remove the Focus trait. Flame Within becomes a passive that triggers once per round, stacks to +3 and resets as written.

### IT-M4 · Inner Discipline's prerequisite locks most technique content to 10th level — Major (balance or design)
- **Where:** Ch5 Inner Discipline (p54), and every feat or action that needs it.
- **Published:** "Prerequisites Wis 4, Mental Focus 10 ranks; Special Prerequisite mentor".
- **Issue:**
  - Skill ranks cap at 1 per level, so anyone not granted the feat needs 10th level.
  - Disciples, Mystics (as a granted feat) and Inner Adepts (an archetype grant) skip the prerequisite.
  - Ghostwalkers, Kensai and Oathblades, the book's own classes, cannot use Evade, Wall Run, Resist Dying, Steel the Mind or Deflect Arrow (which needs Evade), or take about twenty technique feats and archetypes, until 10th level unless they spend an archetype pick on Inner Adept. Several of those options name them in their traits (Deflect Arrow: DISCIPLE KENSAI OATHBLADE).
  - Racial feats (Adaptive Mind, Elemental Infusion) also need it.
- **Core comparison:** core skill caps are one rank per level.
- **Interim build:** as printed.
- **Proposed amendment:** lower it to "Wis 2, Mental Focus 2 ranks", or grant Inner Discipline to all five Inner Tempest classes at 1st (only Disciple and Mystic get it now).

### IT-M5 · Save DC terms are inconsistent and one is undefined — Major
- **Where:** passim. Kensai forms say "triggered saving throws use your Attack DC" (p24). Inner Blast uses a "Technique Save DC" (p54). Stunning Fist uses a "Meditation DC" (p56). Most racial techniques use "your Level DC".
- **Published:** Ch7 defines Technique Save DC as 10 + Path ability + level, but only for characters with a Path (p72).
- **Core comparison:** core defines Level DC and Attack DC (combat/action.mjs). "Meditation DC" isn't a core term. The nearest core reading is a skill DC (10 + Meditation total?).
- **Impact:** the save DC for Stunning Fist, Inner Blast (without a Path) and several others is ambiguous.
- **Interim build:**
  - Technique Save DC = 10 + magical ability + level. The ability is the Path's, or the class's stated magical ability (Ghostwalker Wis, Kensai Int, Oathblade Cha). Otherwise Wis.
  - "Meditation DC" = Technique Save DC.
  - Attack DC and Level DC as in core.
- **Proposed amendment:** standardise on Technique Save DC for every technique save, and define its ability for classes without a Path.

### IT-M6 · "Your Monastic Path" is used by characters who have none — Major
- **Where:** Abundant Step, Inner Blast and Inner Strike (as magical), Inner Magic, and Tanuki Trickster (pp51–55); Ch3 "Other classes" (p33).
- **Published:** the effect "uses the tradition of your Monastic Path". Only Disciples, Mystics and Inner Adepts have one. Ghostwalkers, Kensai and Oathblades instead "select one magical tradition" with a fixed ability (Wis, Int, Cha).
- **Issue:** Kensai and Oathblades who qualify for these feats (through Inner Discipline) have a tradition but no Path. Core classes have neither.
- **Interim build:** "your Monastic Path's tradition and ability" falls back as follows:
  1. The character's Path, if they have one.
  2. Otherwise the Inner Tempest class's chosen Magical Tradition and stated ability.
  3. Otherwise, for a core caster, its class tradition and magical ability.
  4. Otherwise the player picks a Path when the feat is taken, as Inner Adept already says.
- **Proposed amendment:** add a single sentence to Ch7 stating that fallback.

### IT-M7 · Kensai Flourish clashes: Perfect Tempo can never trigger — Major
- **Where:** Ch3 Kensai, Combat Form and Flow Strike (p23); Ch5 Perfect Tempo, Form Reversal, Echo Form and Disciplined Follow-Through (pp53–55).
- **Published:** Combat Form is "CONCENTRATE FLOURISH FOCUS STANCE". Flow Strike is "ATTACK FLOURISH 0 AP". Perfect Tempo is "FLOURISH KENSAI 0 AP; Trigger You hit an enemy using Flow Strike".
- **Core comparison:** core enforces the Flourish trait as "can only be attempted once per turn" (traits.mjs).
- **Impact:**
  - A Kensai who changes form can't Flow Strike that turn.
  - **Perfect Tempo can never be used**, because it triggers on a Flow Strike, which is already that turn's Flourish.
  - Weapon Discipline and Disciplined Follow-Through are passive abilities tagged Flourish, which makes no sense mechanically.
- **Interim build:** core's rule applies as printed. The passive abilities are built without the Flourish trait, since a passive can't be "attempted".
- **Proposed amendment:** remove Flourish from Perfect Tempo, Weapon Discipline and Disciplined Follow-Through, and consider removing it from Combat Form.

### IT-M8 · Flow Strike has no frequency limit and can retrigger itself — Major
- **Where:** Ch3 Kensai, Flow Strike (p23).
- **Published:** "0 AP; Trigger you successfully hit… make an additional attack… as if your third strike… The attack does not count towards your MAP."
- **Issue:** the extra attack can itself hit and retrigger Flow Strike. Only the Flourish once-per-turn rule (IT-M7) stops an infinite chain, and the book never states that limit.
- **Interim build:** once per turn (Flourish). The follow-up does not retrigger.
- **Proposed amendment:** add "Frequency once per turn; the additional attack does not trigger Flow Strike."

### IT-M9 · Ember Reaver's damage escalation is uncapped — Major (balance)
- **Where:** Ch3 Kensai forms (p24).
- **Published:** "Each consecutive round in this form adds +1 to weapon damage (resets if you change forms)."
- **Issue:** a Kensai who holds the form for a long fight gains +10 damage per hit by round 10, with no cap.
- **Interim build:** as printed, uncapped, and tracked per round by the module.
- **Proposed amendment:** cap at +Int modifier (or +3).

### IT-M10 · Black Lotus's first benefit has no mechanical effect — Major (ambiguous)
- **Where:** Ch3 Kensai forms (p24).
- **Published:** "Once per round, may delay your damage and critical rolls until the start of the enemy's turn."
- **Issue:** delaying the rolls doesn't change the expected result unless something happens in between (a buff, the target's reaction, a Vulnerable condition…). The book never says what the delay is for.
- **Interim build:** the damage and critical rolls are held on the chat card until the start of the target's turn. That is purely a timing tool and changes no numbers.
- **Proposed amendment:** state the payoff, for example "…and the target is flat-footed against that damage", or replace the benefit.

### IT-M11 · Combat Forms switched without Refocus — Major (ambiguous)
- **Where:** Ch5 Form Reversal (p53), Echo Form (p53) and Formbinder (p47); Ch3 Combat Form (p23).
- **Published:** Combat Form is expended on activation, and you can't change forms until you Refocus it. Form Reversal ("Reaction… You may immediately change your active Combat Form") never says whether Combat Form must be ready, or whether it becomes expended.
- **Interim build:** Form Reversal changes forms **without** needing or expending Combat Form. It carries no Focus trait of its own, and it is a Flourish reaction, so it can be used once per round.
- **Proposed amendment:** state it explicitly, either way.

### IT-M12 · Two different abilities are both called "Echo Form" — Major
- **Where:** Ch3 Mystic Thousand Reflections, Echo Form (p29); Ch5 Kensai class feat Echo Form (p53).
- **Issue:** one name, two unrelated abilities. They collide in compendium lookup, in prerequisite text, and on chat cards.
- **Interim build:** both are built, with distinct internal IDs and display names "Echo Form (Thousand Reflections)" and "Echo Form (Kensai)".
- **Proposed amendment:** rename the Kensai feat, for example "Lingering Form".

### IT-M13 · Oathbound's Bound Challenge lacks Challenge's limits — Major
- **Where:** Ch5 Archetypes, Oathbound (p49).
- **Published:** "You gain … the Challenge ability", then a different ability, **Bound Challenge**. It costs a conviction point (not Focus) and gives the same bonuses, but has **no end conditions, no one-target limit**, and no statement on whether it is Challenge for the purposes of feats that require Challenge (Formal Declaration and so on).
- **Interim build:** Bound Challenge follows Challenge's one-target rule and end conditions, costs 1 conviction point instead of Focus, and counts as Challenge for feats that need it.
- **Proposed amendment:** add those three sentences.

### IT-M14 · Shadowdancer grants "the Shadow Step feat", which is a spell — Major
- **Where:** Ch5 Archetypes, Shadowdancer (p50).
- **Published:** "Finally, you gain the Shadow Step feat."
- **Core comparison:** core has no Shadow Step feat. It has a **Shadow Step spell**.
- **Interim build:** grant Shadow Step as an innate spell with the Focus trait, using the IT-M6 fallback for tradition and ability.
- **Proposed amendment:** "you gain Shadow Step as an innate spell with the Focus trait".

### IT-M15 · Aura of Heat's damage contradicts itself — Major
- **Where:** Ch8 Aura of Heat (p75).
- **Published:** the header says "**Base Damage** 2d6", the body says "take **5d10** fire damage", and the dying flare deals 6d10.
- **Interim build:** 5d10, as the body says, with Base Damage 2d6 recorded for the warp and base-damage machinery. Innate casts are already at maximum warp.
- **Proposed amendment:** reconcile. As a PP 14 spell, 5d10 per round in a sustained aura with a free fire resistance is strong, so the 2d6 base (scaling with warps) may be what was meant.

### IT-M16 · Rise of the Phoenix has no limit on eggs — Major
- **Where:** Ch8 Rise of the Phoenix (p77); Ch3 Mystic Inner Flame at 11th.
- **Published:** "Duration unlimited… Should you die, the egg hatches and you're resurrected with full hit points."
- **Issue:** with no "only one egg" clause, an Inner Flame Mystic gets it as an innate spell with the Focus trait (restored daily) and can lay a resurrection egg every day.
- **Interim build:** one egg per caster. Laying a new one ends the old one.
- **Proposed amendment:** "If you cast this spell again, any previous egg you created crumbles to ash."

### IT-M17 · Disrupt Soul has no duration — Major
- **Where:** Ch8 Disrupt Soul (p76).
- **Published:** "Duration varies". The text then gives a save per casting and never a duration.
- **Interim build:** Sustained, up to 1 minute, matching Spiritual Distraction, its PP 6 sibling. Critical success also ends it, as written.
- **Proposed amendment:** state "Duration 1 minute" or "Sustained (1 minute)".

### IT-M18 · Burning Stride has no range or target — Major
- **Where:** Ch8 Burning Stride (p76).
- **Published:** "You bond a fire spirit to the target…". There is no Range or Targets line.
- **Interim build:** Range 30 feet; Targets 1 creature (Disrupt Soul and Spiritual Distraction use the same).
- **Proposed amendment:** add the line.

### IT-M19 · Elemental Ward is both "permanent" and timed — Major
- **Where:** Ch4 Nature, Elemental Ward (p38).
- **Published:** "The ward is permanent until it is physically disrupted", followed by a result table of 8 h / 1 h / 10 minutes.
- **Interim build:** the result table's duration applies, and physical disruption ends the ward early.
- **Proposed amendment:** reword the first sentence to "…lasts until physically disrupted or its duration expires".

### IT-M20 · Several spell and feat names don't match core — Major (lookup)
- **Where:** Ch2 Hikari (p13), Ch5 Elemental Power (p42), Elemental Ascendant (p42), Way of the Geisha (p51), the Dragon Companion skills (p60), Ch3 Ghostwalker skills (p19).
- **Published → core name:**
  - "Stabilize" → **Stabilise**
  - "Self-Healing" → **Self Healing**
  - "Fire Ball" → **Fireball**
  - "Performance" → **Perform** (skill)
  - "Intimidation" → **Intimidate**
  - "Crafting"/"Craft"/"Create": the core skill is **Crafting**, and Create is its action
- **Impact:** grants and prerequisites resolve by name, so each of these would silently fail.
- **Interim build:** an explicit alias table maps each to the core name. A harness check proves every mapped name resolves.
- **Proposed amendment:** correct the spellings in the book.

### IT-M21 · Racial abilities referred to by names they don't have — Major
- **Where:** Ch5 Bear's Endurance (p41), Lantern Signal (p43), Spirit Beacon (p45).
- **Published:** Bear's Endurance modifies "Impact Stance". The Mujina heritage ability is **Impact Absorption** (p8). Lantern Signal and Spirit Beacon use "your Living Lantern", but the Hotaru light (p12) is **unnamed** ("You emit dim light within 10 feet").
- **Interim build:** Bear's Endurance modifies Impact Absorption. The Hotaru light ability is built under the name "Living Lantern".
- **Proposed amendment:** correct Bear's Endurance, and name the Hotaru ability "Living Lantern" in Ch2.

### IT-M22 · Dragon companion stat blocks don't match the stated HP formula — Major
- **Where:** Ch5 base creatures (pp62–63).
- **Published:** "12 + Con per level", plus the size base (Small 20, Medium 30).
- **Arithmetic:**

  | Dragon | Formula | Printed | Difference |
  |---|---|---|---|
  | Cold (S, L4, Con 2) | 20 + 4×14 = 76 | 91 | +15 |
  | Earth (M, L4, Con 1) | 30 + 4×13 = 82 | 97 | +15 |
  | Fire (S, L6, Con 2) | 20 + 6×14 = 104 | 119 | +15 |
  | Light (S, L5, Con 1) | 20 + 5×13 = 85 | 100 | +15 |

  All four are exactly +15, so an unstated term is consistent across the blocks. The saves (5 + level + ability + feats) and PP (4/level + Cha) all check out.
- **Core comparison:** the core Wyrm creature type (creature-types pack) lists no HP bonus.
- **Interim build:** the formula is size base + 15 + level × (12 + Con), which reproduces all four printed blocks. The +15 is flagged.
- **Proposed amendment:** state the +15 (a "wyrm vitality" term?), or correct the blocks.

### IT-M23 · Dragon companion initiative is inconsistent — Major
- **Where:** pp62–63.
- **Published:** Cold Dex 3 → +30; Earth Dex 3 → +20; Fire Dex 3 → +20; Light Dex 6 with Improved Initiative → +60.
- **Issue:** two blocks with the same Dex differ by 10, and Light's Improved Initiative appears to add nothing.
- **Interim build:** initiative is derived by core from the actor's statistics, so the printed figures are not copied. Core's derived value will differ from at least two of the blocks.
- **Proposed amendment:** confirm core's derivation is authoritative for companions.

### IT-M24 · Harmony Warden gets the same Refocus bonus as Inner Discipline holders — Major (stacking)
- **Where:** Ch5 Harmony Warden (p47); Centred runes, Prayer Beads and Tianzhi Discipline.
- **Issue:** Refocus bonuses come from many sources: +4 class (Harmony Warden, wilderness), +2 class (Veilborn), +2 racial (Tianzhi Discipline), +1 to +3 item (Centred armour and weapon runes), Guide the Breath (circumstance), advantage (Prayer Beads), and an automatic Critical (Tianzhi Discipline). Class bonuses from two archetypes would add up to +6, and one of them only needs a wilderness.
- **Core comparison:** core typed-bonus stacking takes the highest of each type, so two class bonuses would not stack. The armour and weapon Centred runes are both item bonuses, so they don't stack either.
- **Interim build:** core stacking rules apply unchanged.
- **Proposed amendment:** none needed if core stacking is intended. Noted so you can confirm.

### IT-M25 · Tianzhi Discipline auto-Criticals the first Refocus each day — Major (balance)
- **Where:** Ch5 Tianzhi Discipline (p45).
- **Published:** "+2 racial bonus to Refocus… the first Refocus check that you make each day is treated as a Critical result without the need for a roll."
- **Issue:** at 1st level this is a free immediate restore once a day, on top of a +2. Centred Recovery (a general feat) gives a +1 degree improvement instead. Taking both gives two daily guarantees.
- **Interim build:** as printed.
- **Proposed amendment:** consider "improve the result by one degree", matching Centred Recovery.

### IT-M26 · Many-Faceted Vigilance: +10 Initiative with no prerequisite — Major (balance)
- **Where:** Ch5 Many-Faceted Vigilance (p43).
- **Published:** Compound Eyes rises from +1 to +2 on visual Perception, **and +10 racial Initiative**, with no prerequisite.
- **Comparison in book:** Kamiri heritage +5 Initiative, Ren +5, Steel Viper Int×5, Iaijutsu +25 (sheathed). A Kamiri who takes it has two racial bonuses to Initiative; core takes the highest of a type, so only +10 would count.
- **Interim build:** as printed, with core stacking.
- **Proposed amendment:** none, or +5. Your call on the Initiative scale.

### IT-M27 · Parry redefines a core weapon trait — Major
- **Where:** Ch6 Weapon traits (p69).
- **Published:** "While wielding this weapon, you can use it in your off-hand, gaining a +1-shield bonus to DB… if this weapon is 2-handed, you always gain the shield bonus."
- **Core comparison:** core already has **Parry** (Chapter 6 of the Core). Core enforces "the bonus is lost if the weapon is used to attack with" (attack-workflow.mjs, `attackedThisTurn`). The book's text drops that clause and adds the two-handed note.
- **Impact:** two definitions of one trait. If the module overwrote core's definition it would change every core Parry weapon too.
- **Interim build:** core's Parry rule applies to Inner Tempest weapons unchanged. The book's two-handed note is recorded as a clarification only. The Bo Staff is the only two-handed Parry weapon here.
- **Proposed amendment:** delete Parry from the book's trait list, or state it as a reminder of the core rule.

---

## Minor

| ID | Where (page) | Published | Issue | Interim build | Proposed amendment |
|---|---|---|---|---|---|
| IT-m1 | Ch2 intro (p6) | "Racial feats can be found for these new races in Chapter 6" | They are in Chapter 5 | n/a | → "Chapter 5" |
| IT-m2 | Ch2 Elemental Harmonist (p14) | Skills "Culture, Mediation, Nature" | "Mediation" → Meditation | Meditation | Fix spelling |
| IT-m3 | Ch2 Grey Seeker (p15) | Two skill bonuses (Meditation, Planes); heading "SPECIALTY SKILL" | Every other background has three | Two, as printed | Add a third skill; "SPECIALIST SKILL" |
| IT-m4 | Ch2 Ren (p8) | "+5 racial bonus to speed and initiative checks" | "Speed" isn't a check; is it +5 ft Speed? | +5 ft Speed and +5 Initiative | "+5 ft to Speed and a +5 racial bonus to Initiative" |
| IT-m5 | Ch2 Scree (p11) vs Ryukari/Mujina | "base natural DR of 2" vs "Base DR 1" | Two terms for one stat? | Both write the actor's natural Base DR | Use one term |
| IT-m6 | Ch2 Tianzhi | No adulthood age, lifespan or starting age | The other three new races give all three; the appendix lists "Not stated" | Age fields left blank | Supply them |
| IT-m7 | Ch2 Tianzhi Martial Affinity (p13) | "+1 racial AB and DB when in any combat stance (GM discretion)" | "Combat stance" undefined | Applies while any Stance-trait effect is active (core feat stances, Kensai forms, Inner Tempest stances); GM toggle to override | Say "while in a stance (an effect with the Stance trait)" |
| IT-m8 | Ch3 Disciple Powerful Fists (p17); Brawler (p47); Soul Weapon Master (p50) | "this is total unarmed damage and not base. Your base damage die still increase in the usual way" | Muddled; "total" means a flat bonus after multipliers? | +1 flat damage per 3 BAB, applied after base dice, never doubled | Reword: "a flat bonus to the damage total" |
| IT-m9 | Ch3 Kensai key abilities (p23) | "Dexterity (min +2), Intelligence (min +2)" | The class layout says one score has a minimum | Both enforced as warnings | Pick one |
| IT-m10 | Ch3 Kensai Weapon Discipline (p23) | Tagged "ATTACK FLOURISH" | A passive with action traits | Built without traits | Remove traits |
| IT-m11 | Ch3 Mystic Alter the Thread (p26) | "cannot reroll an unmodified 01, 66 or 100" | Attack checks are d20 in core; 01/66/100 are d100 (critical and fumble tables) | Rerolls follow core's d20 rules; the clause is ignored for d20 attacks | Delete, or restate for d20 |
| IT-m12 | Ch3 Oathblade (p30) | Unwavering Purpose and Oathblade's Resolve sit under "The available Sworn Oaths are detailed below" | They read as oaths | Built as class abilities | Move them above Sworn Oath |
| IT-m13 | Ch3 Oathblade table (p32) | A stray empty 8th column | Editorial | n/a | Remove |
| IT-m14 | Ch3 Ghost Arts (p21) | Shadow Double, Body of Mist, Empty Presence have unbolded trait lines | Editorial | n/a | Bold them |
| IT-m15 | Ch3 Ghostwalker Caltrop Blossom (p21) | Critical and Success both "unaffected" | Fine, but there's no Partial row | Partial = Failure without the speed penalty? | Add Partial |
| IT-m16 | Ch4 Interpret Style (p35) | "Target one target that you can see takes at least one attack or move action whilst in a combat stance" | Garbled | Target a creature you saw attack or move while in a stance since your last turn | Reword |
| IT-m17 | Ch4 Mental Focus (p37) | Heading "MAINTAIN THE CLARITY", body "Maintain Clarity" | Name mismatch | "Maintain Clarity" | Pick one |
| IT-m18 | Ch4 Evade (p35) | "You are target by an attack" | Typo | n/a | "targeted" |
| IT-m19 | Ch5 class feats intro (p52) | "class types (Adept, Expert or Warrior)" | Core type is Martial | Martial | Fix |
| IT-m20 | Ch5 Inner Discipline (p54) | Burst Step trigger "an action with the Move trait" | Core trait is **Movement** (also Bounding Step "FOCUS MOVE") | Movement | Fix |
| IT-m21 | Ch5 Wolf Stance (p57) | "you the effects of the Pack Attack creature ability" | Missing verb; core codex has Pack Attack | Gain Pack Attack while in the stance | "you gain the effects of" |
| IT-m22 | Ch5 Monkey Stance (p55) | "take no penalty or using these actions for 1 AP" | Typo | "for" | Fix |
| IT-m23 | Ch5 Twin Dragon (p47) | "you gain a +1 base damage the end of your next turn" | Missing "until" | "until the end of your next turn" | Fix |
| IT-m24 | Ch5 Night Lotus Venom (p49) | No Partial row | Degree gap | Partial = Success | Add Partial |
| IT-m25 | Ch5 existing-feat lists (p46, p57) | "Tianzhi also gain access…" heads all four races' lists; "Disciples and Mystics also gain access…" heads all five classes' lists | Wrong lead-ins | Built per the sub-headings | Fix lead-ins |
| IT-m26 | Ch5 Radiant Insight (p59); Ch8 Foretell Failure (p77) | "Divine Tradition", "divine" | The core tradition is **divinity** | divinity | Fix |
| IT-m27 | Ch5 Dragon base-creature format (p61) | "Senses" heading used twice (the second is Languages); "imitative" | Editorial | n/a | Fix |
| IT-m28 | Ch5 Earth dragon (p62) | Breath named "Cave Dragon Breath"; magic line says "A cave dragon" | Name mismatch | "Earth Dragon Breath" | Fix |
| IT-m29 | Ch5 Cold dragon (p62) | "Level 4 (EL 4)" while Earth L4 is EL 3, Fire L6 EL 5, Light L5 EL 4 | EL pattern = level −1 elsewhere | EL 3 | Fix |
| IT-m30 | Ch5 Cold dragon spells (p62) | "4 x Cantrip, 2 additional spell" vs Earth (same level and CL) "4 additional spells" | Inconsistent | As printed per dragon | Confirm |
| IT-m31 | Ch5 Snowvision (p65) vs Cold table "Snow Vision" | Two spellings | Core codex has **Snowvision** | Snowvision | Fix table |
| IT-m32 | Ch6 Starting Gear (p67) | "classes and backgrounds introduced in Echoes of Steel" | Wrong book | n/a | "Inner Tempest" |
| IT-m33 | Ch6 Do-maru (p67) | ACP "2" | Sign missing; every other medium armour is negative | −2 | Fix |
| IT-m34 | Ch6 weapon table (p69) | "Kusirigama" | Spelling → Kusarigama | Kusarigama (alias kept) | Fix |

Further minor items I'll fold into the build without needing a ruling:

- **IT-m35** Ch2 Fuku says "Conviction Pool +1"; Forgeheart refers to "Crafting" while the heritage says "Craft". Both resolve to the core names.
- **IT-m36** Ch7's innate DC example prints "+19" for a DC.
- **IT-m37** Ch8 Water Bolt is a "bolt" with touch range.
- **IT-m38** Ch8 Burst of Speed and Tranquil Mastery have no Range/Target line. Built as touch, 1 willing creature.
- **IT-m39** Ch8 Flowing Step gives the duration both as "end of your turn" and "for one round". Built as end of turn.
- **IT-m40** The index has the stray entry "very tough mudder 52", lists "SHADOW STANCE" for Shadowy Stance, and omits Formbinder, Inner Adept and Steel Disciple.
- **IT-m41** Ch9 Magic Items' heading isn't styled as a chapter heading in the docx.

---

## Improvement (optional design notes)

| ID | Where | Note |
|---|---|---|
| IT-I1 | Ch3 Mystic HP 8 + Con | Core adepts get 4–6 HP per level (Wizard 4, Cleric/Druid 6). An adept with 8 equals the Rogue and Bard. Fine if it's intended for a melee-capable adept. |
| IT-I2 | Ch3 Steel Viper | "+Int × 5 Initiative… may be applied retrospectively" is awkward at the table. Suggest "if you are in this form when you roll Initiative". |
| IT-I3 | Ch3 Rising Phoenix | "+2 per Int mod" to Climb and Jump is up to +10 at Int 5; every other form's skill bonus is +Int or less. |
| IT-I4 | Ch5 Formless Cut | +4 AB, ignores stance bonuses, flat-foots the target, +Int damage, and has no Focus trait or frequency. Strongest repeatable Kensai strike. Consider Focus. |
| IT-I5 | Ch5 Snake Stance | Reaction strike that "ignores MAP" with no once-per-round limit (the Reactions resource is the only limit). |
| IT-I6 | Ch6 armour prices | Tatami-Do (heavy, L2) costs 350 gp, the same as Kusari (medium, L2). Haramaki (5 gp, DR 1) out-protects Shozoku (100 gp, DR 0). Both may be intended (Shozoku's value is its Hide bonus). |
| IT-I7 | Ch9 Centred weapon rune | No tiers, levels or prices are given ("based upon the level of the rune"), yet the Spiritblade carries "Centred II". The interim build mirrors the armour tiers (L4 / L8 / L12; +1 / +2 / +3; 750 / 4,200 / 16,000 gp). |
| IT-I8 | Appendix aging | Not in core today. It could be automated as age-category ability modifiers derived from the actor's age and race lifespan. That is optional; it is listed in the inventory as C (assisted). |
