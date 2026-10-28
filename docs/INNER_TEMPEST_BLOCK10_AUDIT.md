# Inner Tempest Block 10: audit (Dragon Companions and Dragon Tamer)

27 October 2026. Read against:
- **The book:** v1.2 (`it12.md`):
  - Dragon Tamer (Chapter 5's archetypes, lines 3142–3152);
  - "Dragon Companions" (4355–4997): acquiring a dragon, the companion rules, the Dragon Companion Table, the four base dragons, the companion specials and feats, High Magic, and losing a dragon.
- **Graham's earlier rulings:**
  - IT-C5 (20 October): breath damage is 1 die per level, the die from the base block; the HP table runs Tiny 10 to Colossal 250 (in v1.2); wing and tail attacks are the core's, at the companion's size; Sweep goes on the tail attack; earth dragons cannot fly.
  - IT-M22: the four dragons' HP (76, 82, 104, 85, in v1.2).
  - B7-1: Dragon Tamer ships with the companions, here.
- **TRG Prime 3.673.3**, as released. Every system claim below was read in its source.

## Scope

| Group | Items | Inventory |
|---|---|---|
| **The archetype** | Dragon Tamer (Inner Discipline, Arcana 8 ranks, Dragon Lore; an unhatched egg; Progression: Arcana +10 ranks) | FA-02 |
| **Acquiring a dragon** | the egg; bonding one hour at daily preparation for at least a lunar cycle (about 28 days) | DC-01 |
| **The companion** | the Wyrm type and the Minion trait; level; class skills; 8 skill points a level; general feats; HP; BAB, BDB and saves; the Dragon Companion Table (size, land and fly speed, ability increments, natural attacks, breath length) | DC-02, DC-09, DC-10 |
| **Base dragons** | Cold, Earth, Fire, Light: stat blocks and their levelled special abilities | DC-03 to DC-06 |
| **Companion specials** | Crush, Draconic Assault, Draconic Shifting, the elemental Auras, Bloods and Strikes, Frightful Aura, Reflective Scales, Scorching Breath, Slowing Breath, Snowvision, Spell Resilience, Wild Stride, Wing Buffet; plus Ice Climb, Smokevision and Flyby Attack, which the stat blocks use | DC-07, DC-08 |
| **Companion feats** | Deflecting Wings, Draconic Spell, Imitate Sound, Tail Lash | DC-12 to DC-15 |
| **High Magic** | any tradition, casting DCs +2, free Heighten, Spell Fumble +50 | DC-11 |
| **Losing a dragon** | separation, death, restoration, one bond per lifetime | DC-16 |

**Not in this block:** B8-9's three spell upgrades (Dragon Fear, Aura of Heat, Burning Stride) wait for a core block after Block 10, as ruled.

## What the system already has (TRG Prime 3.673.3)

| Need | What exists | Where |
|---|---|---|
| A companion actor bound to its master | the `companion` actor type; `system.companion.masterId`; a class item for the progression; a base creature as a `race` item | `companion.mjs`, `companion-workflow.mjs` |
| BAB, BDB, saves, PP, caster level and BSB by level | class progression rows (`bab`, `bdb`, `fortitude`, `reflex`, `will`, `bonusFeats`, `casterLevel`, `pp`, `bsb`). Nothing in derivation or casting is closed to companions | `class-progression.mjs:129`, `documents/actor.mjs:1787–1967` |
| **The dragon HP rule exactly** | max HP = size base HP + (HP per level + Con) × level + `hp.other`. The size table carries Tiny 10, Small 20, Medium 30, Large 50, Huge 80, Gargantuan 120, Colossal 250: the book's HP table | `config.mjs:185`, `config.mjs:345` |
| Skill points with an ability | the class's `skillPoints` and `skillPointAbility` | the Animal Companion class |
| A creature's DC | level + 14 (the stat blocks' DC 18, 20 and 19 match) | `dice/resolution.mjs:115` |
| A breath weapon from its Use button | a declared area (`flags.trg-prime.creatureAbility.area`: save, basic, damage, shape, `breath: true`), with Scorching and Slowing Breath reading it afterwards | `creature-area.mjs`, `breath-memory.mjs` |
| A Focus use, restored by Refocus | an ability's uses with the Focus trait: refused when spent, "Refocus restores it" | `creature-activation-workflow.mjs:70` |
| High Magic | `flags.trg-prime.highMagic`: casting DCs +2, Heighten's save reading free, Spell Fumble +50 | `magic/high-magic.mjs` |
| Natural attacks at size | core Bite, Claw, Wings (1d6 B) and Tail Slap (1d8 B); a companion's natural attacks resized along the size ladder | `creature-attacks`, `documents/item.mjs:505` |
| The specials | the codex already has Crush, Draconic Assault, Draconic Shifting, Elemental Aura, Elemental Blood, Elemental Strikes, Frightful Aura, Reflective Scales, Scorching Breath, Slowing Breath, Snowvision, Spell Resilience, Wing Buffet, Ice Climb, Smokevision and Flyby Attack (offered cards and auras). Wild Stride is a core feat | `creature-abilities` pack, `combat/passive-feats.mjs` |
| The Wyrm type | the `Wyrm` creature type (Ryukari's Dragon-Bound Resolve already reads it) | `creature-types` pack |
| Soul Drain | the core condition, with its max-HP effect | core conditions |

## Not in the system yet: core work for TRG Prime 3.674.0

| # | For | Gap, and what is proposed |
|---|---|---|
| C1 | Dragon Tamer | **A master has one companion, and it is an Animal Companion.** `createCompanionFor` refuses any second companion. The class name, the creature type "Animal", the pack, the chooser, the chat titles and the sheet's label are all fixed. Proposed: `registerCompanionKind(kind, { label, className, creatureType, pack, featName, levelFrom, title })`. Then: one companion **per kind**; `createCompanionFor(master, feat, { kind, only })`; each kind's chooser shows only its own base creatures; the labels follow the kind. A Ranger who becomes a Dragon Tamer keeps the wolf (B10-12). |
| C2 | the dragon's level | **A companion's level is always its master's.** `syncCompanionLevels` sets every bound companion to exactly the master's level. Proposed: the kind's `levelFrom(master, companion)`. For dragons it is the base level plus the master's levels gained since hatching (B10-1), read from the level recorded at hatching. |
| C3 | the dragon's size | **A companion's size is recomputed from its starting size and Increase Size picks**, and overwrites anything else. The natural attacks resize the same way. Proposed: `system.companion.grownSize`, which the module sets as the dragon gains levels. `companionCurrentSize` and the natural-attack resize take the larger of it and the picks. The token is resized when the size changes. |
| C4 | the dragon's feats | **A companion's feat picker offers General feats and every companion-trait feat**, so the animal companion feats would be offered to a dragon and the dragon's four to a wolf. Proposed: a companion feat may name its kind (`flags.trg-prime.companionKind`), and the picker offers it only to that kind. The budget already comes from the class's `bonusFeats` column, which can carry the PC schedule (1st, then every 2 levels). |
| C5 | the breath weapon | **A declared area's damage cannot scale with level.** The dice are rolled from a fixed formula, with no roll data. Proposed: `damage.perLevel: "d8"` (dice equal to the user's level, of that die), read where the area is rolled. Alternatively the module rewrites the breath's formula whenever the level changes, with no core change. I propose the core field, because a copied or hand-edited dragon then stays right. |
| C6 | the table's ability increments (if B10-2 is adopted) | **Size changes Strength and Dexterity in the core** (Small −1/+1 … Gargantuan +3/−3). The Dragon Companion Table's own Str and Dex columns already rise and fall with growth. Proposed: a kind may declare `sizeAbilityMods: false`, so its growth changes Str and Dex only through the table. |
| C7 | the ability point banner | **Every actor shows the PC pool of +1 every 3 levels.** "They do not receive the increase gained by a PC every 4 levels". (The core's own pool is every 3 levels; either way the dragon gets none.) Proposed: a kind may declare `abilityPoints: false`. |
| C8 | losing a dragon | **Soul Drain cannot be held by a source.** The book's "cannot be healed until you are reunited" and "cannot be removed by other means while the bond remains broken" need Soul Drain the ordinary cures leave alone, which the module recovers itself. Proposed: Soul Drain may carry a `source` that only that source's owner may lower. I'll check the condition's code while building; if a lock already exists, this falls away. |
| C9 | found in passing | **Animal Soul never finds a companion.** It looks for `flags.trg-prime.companionMaster` or `system.details.masterId`, which companion creation never sets (it sets `system.companion.masterId`). Proposed: read the bound companions through `companionsOf`. This is a core fix independent of the dragons. |

## The companion

| Rule | What the module does |
|---|---|
| **Dragon Companion class** | A class item in a new Inner Tempest pack: BAB = BDB = level; all saves primary, 5 + level; 12 HP per level (the size base and Con are the core's); 8 skill points + Intelligence a level (B10-8); the fifteen class skills; `bonusFeats` on the PC schedule; caster level = level − 3; PP 4 a level + the key ability; BSB +1 a level; the Minion trait. Rows to level 30, so a GM-raised dragon still reads its own row. |
| **Base dragons** | Four `race` items: size, ability scores, speeds, senses, languages, immunities and weakness, the natural Bite and Claw at the printed dice, the base feats, High Magic, and the breath. |
| **Level** | The base level (4, 4, 6, 5) plus the master's levels gained since hatching (C2, B10-1). |
| **Growth** (the Dragon Companion Table) | Read against **levels gained** (Base +1 …), kept in step by the module whenever the level changes, as aging is: size (C3); land speed; fly speed (none for the earth dragon); Str, Con, Dex and the three mental increments; Wings at +6, Tail Slap at +10, Crush at +16, Sweep at +20 (B10-3); breath length (line 30 to 120 ft, cone 15 to 60 ft). |
| **Special abilities** | Each dragon's own table, by its **absolute level** (the Cold dragon's Snowvision at 6, Draconic Assault at 8, …), granted from the core codex by name. |
| **Breath** | A 2 AP area with the Focus trait (one use; Refocus restores it), a basic Reflex save at the creature DC (level + 14), level × the base die (C5, IT-C5). The shape is the base dragon's: Cold and Fire a cone, Earth and Light a line. |
| **High Magic** | The core flag. "Any tradition" is the spell picker's to allow. |
| **Feats** | The base block's feats count as picks made (the book: "already contains any feats … up to and including its current level"). New picks come from General feats and the four Dragon Companion feats (C4). |
| **Command** | As an animal companion's: it rolls its own initiative and acts when commanded. The Minion trait has no further rule in the system. |

## Acquiring a dragon, and Dragon Tamer

- **The egg:** a gear item per base dragon ("Dragon Egg (Cold)", …) in the new pack, carrying its bonding count.
- **Bonding:** while the egg is carried, each daily preparation adds a day (the hour's meditation is the player's to make). The egg says when it is ready: 28 days, which the GM may raise on the egg ("may take longer").
- **Dragon Tamer:**
  - Prerequisites: Inner Discipline, Arcana 8 ranks, and the Dragon Lore specialist skill (B10-11). Its special prerequisite is an egg that has finished bonding.
  - Taking it asks which egg and hatches that dragon (C1). It records the master's level at hatching (C2) and consumes the egg.
  - Its Progression Requirement (Arcana +10 ranks) is the core's archetype rule.

## The companion feats

| Feat | What the module does |
|---|---|
| **Deflecting Wings** (Large) | A reaction when targeted: +2 circumstance DB against that attack, offered as the core's declared defence reactions are. |
| **Draconic Spell** (repeatable) | Choose an arcane spell; it is added as an innate spell with the Focus trait. |
| **Imitate Sound** (Light dragon) | +4 circumstance on Deception to mimic a sound, offered on the check. |
| **Tail Lash** (Large, Tail attack) | A reaction when a creature in reach of the tail Strikes: a tail Strike at −2 circumstance. |

## Losing a dragon

- **Death:**
  - When the dragon dies, the master takes Soul Drain equal to its level, held by the bond (C8), and a −2 on Refocus checks. A −2 on the check is the same as "Hard (DC +2)" on every degree.
  - At each daily preparation the module counts the week. Every 7 days one point of that Soul Drain is recovered, and the −2 ends with the last point.
  - Restored to life within a week, the dragon re-bonds as for a temporary loss. After a week it "goes insane", which is the GM's.
- **Temporary loss** (more than 1 mile per level apart for over a week): a GM toggle on the master. It lays Soul Drain equal to half the dragon's level, rounded up and held, and the −2 on Refocus. Reunited, the next daily preparation's hour of meditation ends the −2 and frees the Soul Drain to heal normally.
- **One bond per lifetime; re-spending lost feats:** told on the card. The GM carries them out.

## Checking the stat blocks against the chapter's rules

I derived each base dragon from the rules above and compared it with its printed block:

| | Cold | Earth | Fire | Light |
|---|---|---|---|---|
| **HP** (size base + level × (12 + Con)) | 76 ✓ | 82 ✓ | 104 ✓ | 85 ✓ |
| **Saves** (5 + level + ability + feats) | ✓ | ✓ | ✓ | ✓ |
| **PP** (4 × level + Cha), **CL** (level − 3), **Spellcraft** (BSB + Cha) | ✓ | ✓ | ✓ | ✓ |
| **DC** (level + 14) | 18 ✓ | 18 ✓ | 20 ✓ | 19 ✓ |
| **Breath** (level × base die) | 4d8 ✓ | 4d8 ✓ | 6d8 ✓ | 5d10 ✓ |
| **Skill ranks** against (8 + Int) × level | 36 of 36 ✓ | 36 of 36 ✓ | **66 of 48** | **46 of 45** |
| **Feats** (1st, then every 2 levels) | 2 of 2 ✓ | 2 of 2 ✓ | 3 of 3 ✓ | **4 of 3** |
| **DB** (10 + BDB, class bonus, Dex) | 19 ✓ | 19 ✓ | 23: **"Status +1" unexplained** | 24: **"Status +1" unexplained** |
| **Bite / Claw at its size** | Small 1d6 / 1d5 | Medium 1d8 / 1d6 | **Small 2d6 / 2d5** | Small 1d6 / 1d5 |
| **Initiative** | +30 | +20 | +20 | +60 |

These are B10-7 to B10-10.

## Questions for Graham

| # | Question | Proposal |
|---|---|---|
| B10-1 | **Level.** "Each time you gain a level, your dragon companion will also gain a level", from a base of 4–6. Dragon Tamer needs Arcana 8 ranks, and ranks are capped at level, so the earliest hatching is at 8th level. A dragon then gains at most 12 levels by the master's 20th. **Base +13 to Base +20 of the table is never reached in play:** Crush (+16), Sweep (+20), the fourth size step, 100–120 ft breath, and the dragons' specials above level 16–18 (Cold's Freezing Blood and Reflective Scales, Fire's Scorching Breath and Spell Resilience, and so on). | **Build it as printed:** base level + levels gained since hatching. The whole table is built, so a dragon the GM raises (or one hatched by an NPC) still grows correctly. If you meant the dragon to reach the top, the alternative is base level + the master's level − 8; tell me. |
| B10-2 | **Size and Strength/Dexterity.** The core changes Str and Dex with every size step (Small −1/+1 … Gargantuan +3/−3). The table's own Str and Dex columns already climb and fall with growth (Str +1 at +1, +2 at +4, …). Do both apply? | **The table alone (C6).** Its columns are the dragon's growth, so the size step does not add its own Str/Dex change on top. The printed base blocks are final at their base size. |
| B10-3 | **Sweep.** The table adds "Sweep" at Base +20; IT-C5 ruled "Sweep goes on the dragon's tail attack". The tail itself arrives at Base +10. | **The Tail Slap gains the Sweep trait at Base +20**, as the table lists it. (From +10 instead, if the ruling meant the tail always has it.) |
| B10-4 | **The earth dragon's wings.** It cannot fly (IT-C5), yet the table gives every dragon Wings at +6, its own table gives it Wing Buffet at 12, and Deflecting Wings needs wings. | **It has wings, but does not fly:** the Wings attack, Wing Buffet and Deflecting Wings as for the others, and no fly speed. |
| B10-5 | **The fire dragon's Wing Buffet at 10** (Base +4) uses "the dragon's wing attack damage", but the Wings attack only arrives at Base +6 (12). | **Wing Buffet uses the core Wings damage at the dragon's size**, whether or not the Wings attack has been granted yet. |
| B10-6 | **Spells known.** The blocks give "4 x Cantrip, N additional spells (max PP X)" (Cold 2, Earth 4, Fire 5, Light 3) and nothing on how that grows. | **+1 spell known for each level gained**, with the maximum PP the system's for its caster level (level − 3). Or tell me the rule, if the Eldritch Arts book has one. |
| B10-7 | **The fire dragon's skill ranks** total 66 against a budget of 48 ((8 + Int 0) × 6). The light dragon's total 46 against 45. | **Ship the ranks as printed** and let the sheet show the overspend, or give me corrected ranks. The cold and earth dragons match exactly, which supports 8 + Int. |
| B10-8 | **Skill points:** "8 skill points per level … in the same way as that of a PC". A PC adds Intelligence. | **8 + Intelligence**, which is what the cold and earth blocks spent. |
| B10-9 | **The light dragon's four feats** at level 5, where the schedule gives three (1st, 3rd, 5th). | **The fourth is the GM's extra** ("some dragon companions may gain access to additional feats"): granted free, and the budget stays at three. |
| B10-10 | **Fire and light dragons' DB "Status +1"**, which the cold dragon (also Small) lacks. Also the fire dragon's Small bite and claw at 2d6 and 2d5, where the other Small dragons have 1d6 and 1d5. | **Derive both from the rules:** the system's DB, so the fire and light dragons show 22 and 23, and one size ladder for the attacks (Small 1d6 / 1d5). Or keep the printed numbers as base-dragon extras; tell me which. |
| B10-11 | **"Dragon Lore"** in Dragon Tamer's prerequisites. | **The Dragon Lore specialist skill**, however gained (Ryukari have it from their race). |
| B10-12 | **A second companion.** A Ranger (or Druid) with an animal companion who becomes a Dragon Tamer. | **Both:** one companion per kind (C1). "One bond per lifetime" means one dragon. |
| B10-13 | **Losing a dragon:** "Hard (DC +2)" on Refocus, the weekly recovery, and "cannot be healed" Soul Drain. | **As above:** death is automated (Soul Drain equal to its level, held; −2 on Refocus; 1 point back each 7 days of daily preparation). Separation is a GM toggle. Insanity and re-spending feats are the GM's. |
| B10-14 | **Release number.** This is the book's last block. | **Inner Tempest 1.0.0** with Block 10, on TRG Prime 3.674.0. B8-9's three spell upgrades follow later as 1.0.x with their core block. |

## Interpretations (they stand unless Graham says otherwise)

1. **Growth reads levels gained; special abilities read the dragon's absolute level**, as the two tables are written ("Base +N", and Level 6, 8, …).
2. **The breath weapon** is a 2 AP basic Reflex area at the creature DC (level + 14). High Magic's "casting DCs +2" does not reach it: it is an ability, not a spell.
3. **Frightful Aura's radius** is 5 feet × the dragon's level, as the codex entry already reads it.
4. **"Base DR increases with BDB just like a PC":** the printed DR is the block's DR at its base level. The base dragon carries it as natural armour DR divided by the core's BDB multiplier (×2 from BDB 6, ×3 from 12, …), so it grows exactly as the core's armour does. That gives Cold 4, Earth 6, Fire 3 (6 at BDB 6) and Light 2.
5. **"Languages … not until it has heard them spoken for at least an hour"** is the table's to track.
6. **Bonding's "one hour each day"** is counted at daily preparation while the egg is carried; the GM may require more days.
7. **The earth dragon's printed "A cave dragon is a High Magic caster"** is read as the earth dragon (m28, still in v1.2).

## Releases

- **TRG Prime 3.674.0:** C1–C9, with a verify/mutate pair, the full sweep, and the release links checked.
- **Inner Tempest 1.0.0** (B10-14):
  - the Dragon Companions pack: the class, the four base dragons, the eggs and the four feats;
  - Dragon Tamer;
  - growth, breath, bonding and losing a dragon.
  With `verify-block10` / `mutate-block10`, then the usual independent review, sweep and live test.
