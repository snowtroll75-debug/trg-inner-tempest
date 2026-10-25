# Inner Tempest Block 5: audit (racial feats)

24 October 2026. Read against the book (v1.2, Chapter 5 "Racial Feats", lines 2468–3117 of `it12.md`, cut into `tools/content/book-text-block5.json` by `tools/content/extract-book-block5.mjs`), the rulings of 20 to 23 October, and TRG Prime **3.668.2**.

## Scope

| Group | Features | Inventory |
|---|---|---|
| Racial feats (47) | 1 Human, 1 Human/Kornargon, 15 Miraku, 13 Ryukari, 12 Scree, 7 Tianzhi | FR-01 to FR-47 |
| Existing core racial feats opened to the four races | 8 Miraku, 5 Ryukari, 9 Scree, 11 Tianzhi entries; 25 distinct feats; some limited to one heritage, e.g. "Bestial Resilience (Mujina)" | FR-48 |

Racial feat picks (1st, 5th, every 5 levels) are the core's own.

**Already ruled:** the Tianzhi elements and their spell traits (IT-C2, stored on each heritage as `itElement`); Natural Chi is a cantrip with a chosen tradition, cast with Wisdom; Impact Absorption is declared when targeted (B2-1); a Focus ability is restored individually by Refocus.

## What the system already has

- **Racial feat access:** `registerFeatAccess("race", race, names)` opens a core feat to a race, which is enough for Adaptive Mind (Human) and Fateful Coincidence (Human, Kornargon). Feats are filtered by `sourceRace` (any of a comma list). Repeatable feats exist (`system.repeatable`).
- **Area and target saves with a ladder:** `creatureAbility.area` with `save`, `basic`, `damage`, `radiusFeet`, `scope: "area" | "targets"`, and per-degree `conditions`. Any feat that carries it gets a Use button. A cone is done as `scope: "targets"`.
- **Escape against a DC:** an effect flagged `escapeDC` is what Escape rolls against, and a success removes it.
- **Strike riders:** secondary damage on the next hit, once per round, by weapon name, with a condition and a save.
- **Auras that move with the token:** `auras: [{ kind: "ally", radius, allyEffect, enemyEffect, includeSelf }]` with conditionals, statuses (concealed) and changes.
- **Daily firsts:** `dailyFirst: [{ action, set: "critical" }]`, cleared at daily preparation.
- **Speeds:** a Fly Speed equal to land Speed (`creatureAbility.derives.movement`), +10 ft to a speed (movement pool change), a Swim Speed.
- **Defences:** fire resistance and +1 Base Natural DR by effect change; "+2 against Shove and Trip" and disadvantage by `defenceDC`.
- **Tick-boxes** on skill checks, saves and attacks (3.667.3), and declared damage bonuses.
- **The Strike hooks** (`trgPrimeStrikeResolved`, `trgPrimeStrikeRolled`, `trgPrimeDamageApplied`) for "when you damage a creature with your Sting" and "a creature misses you".
- **The scaled values of 3.668.0** (`"wisdom-constitution"`), for "use your Wisdom modifier in place of … if it is higher".

## Not in the system yet: core work for TRG Prime 3.669.0

| # | Needed by | What |
|---|---|---|
| C1 | FR-48 (Bestial Resilience (Mujina), Fire-Like Blood (Zenki), …) | **Feat access limited to a heritage.** `registerFeatAccess` opens a feat to a whole race; the book limits 20 of its 33 entries to one heritage. |
| C2 | Elemental Power, Supremacy, Ascendant | **A spell choice from a named list, filtered by trait, granted with a set tradition.** `spellChoice` filters only by PP and tradition, and the spell keeps its own tradition. The book: one spell from a list "which has a trait that matches your racial element", innate with Focus, "using the tradition and magical ability score established by your Natural Chi". |
| C3 | Blinding Majesty, Celestial Breath, Valley Chill, Web Snare, Paralysing Venom, Serpent's Venom | **Area saves for a module.** `runDeclaredAreaEffect` is not in the helpers; an emanation cannot **exclude allies** ("You may exclude any number of allies"); and "until the beginning of *your* next turn" (the source's turn) has no clock. |
| C4 | Fortune's Reversal | **A reroll offered after your own fumble,** on an attack (the confirmed fumble), a skill check or a save, before the result is used. No seam exists: `trgPrimeCheckResolved` fires after the degree is final, and the attack fumble has only Devotion. |
| C5 | Guardian's Intercession | **An ally taking an attack.** "An adjacent ally is targeted … You become the target of the triggering attack instead", +1 circumstance DB and Base DR. Defence offers ask only the targeted creature, and the target is fixed by then. |
| C6 | Immovable Plating | **Forced movement reduced by a declaration** ("reduce the distance moved by 5 feet, to a minimum of 0"). The push takes its feet as given. |
| C7 | Spirit Roar | **One Demoralise roll against several creatures.** "Make a single Demoralise check and compare the result against the Level DC of each enemy within the area." Demoralise resolves one target. |
| C8 | Tianzhi Discipline, Tianzhi Meditation | **Two more daily firsts:** "treated as a Critical result without the need for a roll" (the core's `set` still rolls and keeps the better), and "advantage on your first … check each day". |
| C9 | Foxfire, Spirit Beacon | **A light a module declares.** The light sources are a fixed core table with dim = radius and bright = half. Spirit Beacon is bright 20 ft and dim 20 ft more. |

## How each feat will be built

**A** automated; **B** automated with a tick-box or a card the player acts on; **C** the card states the rule; **D** text only.

| Feat | Plan | Class |
|---|---|---|
| Adaptive Mind (Human) | Depends on B5-3. Opened to Humans. | B |
| Ancestral Communion | Tick-box: advantage on Recall Knowledge with Spirit Lore about spirits, haunts, possession. Second paragraph on the card. | B |
| Awaken the Animism | Use (1 AP, 1 min, Focus): an effect by heritage. Kitsune: advantage on Bluff and Feint. Mujina: Base DR +1. Ren: Speed +10 (the shorter fall said on the card). Byakko: +2 damage on melee Strikes. Orochi: Swim +10, advantage on Escape and on saves against poison. | A |
| Bear's Endurance | Impact Absorption gives +2 Base DR instead of +1 (interpretation 8). The +2 against prone or moved by that attack is a tick-box. | A/B |
| Blinding Majesty | Use (2 AP): 10-ft emanation, Reflex against your Level DC, allies excluded (C3); dazzled or blinded by degree. | A |
| Celestial Breath | Use (2 AP): a 15-ft cone (the targeted creatures), basic Reflex, 1d6 per 2 levels (minimum 2d6), type and traits by heritage. | A |
| Celestial Footing | Text: what Shinryu's air movement now allows. | D |
| Draconic Armament | Use: choose Bite or Claw; the natural attack is added. Taken a second time, the other. | A |
| Elemental Infusion | Use (1 AP, 1 min, Focus): +1d4 of your element on melee Strikes (a strike rider). | A |
| Elemental Power, Supremacy, Ascendant | Use: choose a spell from the list matching your element (C2, B5-1, B5-2). | A |
| Elemental Attunement | Tick-box +2 racial on Recall Knowledge about your element; +1 racial to innate spell attacks and DCs for spells with your element's trait. | A/B |
| Fateful Coincidence (Human, Kornargon) | Opened to both. A once-per-session note. | D |
| Forgeheart | Fire resistance; the Zenki's Crafting tick-box becomes +2. | A |
| Fortified Carapace | +1 Base Natural DR. | A |
| Fortune's Reversal | Offered as your reaction on your own fumble: reroll, keep the second (C4). | A |
| Foxfire | Use (1 AP, 1 min, Focus): three motes of dim light 10 ft. B5-4. | B/C |
| Guardian's Intercession | Offered when an adjacent ally is targeted by a physical attack: Step if needed, become the target, +1 DB and +1 Base DR (C5). | A |
| Hive Coordination | Tick-box +2 racial on Aid when the ally understands Scree Cant. | B |
| Hoardkeeper's Eye | Treasure Sense at 60 ft; the rest on the card. | C |
| Immovable Plating | +2 against Shove and Trip (`defenceDC`), a tick-box on saves against being knocked prone or moved; forced movement 5 ft shorter (C6). | A/B |
| Keeper of Endings | Undead Lore as a specialist skill; tick-box +2 racial on Occultism and Religion about undead, haunts and decay. | A/B |
| Lantern Signal | Text. | D |
| Magma Channel | Use (1 AP, Focus): the next melee hit this turn +1d6 secondary fire, magical (a strike rider). | A |
| Many-Faceted Vigilance | Compound Eyes' tick-box becomes +2; +10 racial to initiative. | A |
| Many Tailed Cunning | Two tick-boxes on Bluff. | B |
| Mist Veil | Use (2 AP, Focus): a 10-ft aura of concealment both ways that moves with you, to the start of your next turn. | A |
| Paralysing Venom | Offered when your Sting damages a creature: Fortitude, Speed penalty or Slowed 1 by degree. | A |
| Perfected Form | Fluid Form's text. | C |
| Predator's Momentum | Predator's Pounce's Strike: tick-box "you Strode at least 20 feet" for +1 circumstance and +1d6 precision once. | B |
| Purifying Touch | Text, and a tick-box +2 on Nature about unsafe water. | C |
| Raptorial Refinement | Your Raptorial Blade becomes AR 2 with Versatile P. | A |
| Serpent's Venom | Use (1 AP, Focus): the next melee hit before your next turn ends: Fortitude, Sickened 1 or 2, and poison damage on a fumble. | A |
| Silk Spinner | Text (the rope); tick-box +2 racial on Crafting with silk, thread, rope or webbing. | B |
| Spirit Beacon | Use (1 AP, 1 min, Focus): light (C9) and an ally aura with the two circumstance tick-boxes. | A/B |
| Spirit Roar | Use (1 AP, Focus): one Demoralise against each enemy within 15 ft, each then immune to it for the encounter (C7). | A |
| Spiritual Resilience | +2 racial on saves against Soul effects, a tick-box for possession; a tick-box "against a spirit, haunt or incorporeal creature" for Wisdom in place of Con or Dex. | A/B |
| Tianzhi Discipline | +2 racial on Refocus; the first Refocus each day a Critical without a roll (C8). | A |
| Tianzhi Meditation | +1 racial on Meditation; advantage on the first trance each day (C8). | A |
| Tianzhi Scholar | +1 racial on Meditation and Nature; +2 racial on your racial specialist skill. | A |
| Valley Chill | Use (2 AP, Focus): 10-ft emanation, Fortitude; Speed penalties, −1 Reflex, Slowed 1, to the start of your next turn (C3). | A |
| Waiting Blade | Offered when a creature within reach misses you with a melee Strike: a Raptorial Blade Strike (your reaction). | A |
| Web Snare | Use (2 AP, Focus): one creature within 30 ft, Reflex; Speed penalties or Immobilized with an Escape DC; flat-footed on a fumble; one creature at a time. | A |
| Weightless Footwork | Advantage on Balance; the rest on the card. | B |
| Wind-Borne Motion | Use (1 AP, Focus): a Stride armed to your Speed; the rest on the card. | B |
| Wings Unfurled | A Fly Speed equal to your land Speed; Wing Burst need not end on a surface. | A |

## Interpretations (they stand unless Graham says otherwise)

1. **The opened core feats keep the book's heritage in brackets as a limit** (C1). A core heritage named in a core prerequisite is read as the bracketed heritage: Fire-Like Blood's "Azgar heritage or Elarni heritage" is read as Zenki (Ryukari) and Kasai (Tianzhi).
2. **Fortune's Reversal on an attack:** "you fumble an attack check" is a confirmed fumble (the fumble check failed). The reroll is of the attack check, before the fumble table is rolled; if the reroll is again a fumble risk, its own fumble check follows.
3. **Durations follow the core's round reading** (revised as built, 0.6.0): "until the beginning of its next turn" or "of your next turn" is one round, "until the end of its next turn" two, on the creature affected, as the core's area rail already counts its conditions. The caster's own effects (Mist Veil, Serpent's Venom) end on the caster's own turn.
4. **Celestial Breath's cone** is the creatures you target, as the core does breath weapons.
5. **Awaken the Animism (Ren)** — "treat falls as an additional 20 feet shorter" is said on the card; falls are not automated by distance.
6. **Magma Channel's "gains the Magical trait"** makes the Strike magical for resistances, as a rune's damage is.
7. **Waiting Blade's Strike** is a reaction, so the core applies no multiple attack penalty to it ("Apply your multiple attack penalty normally if one applies").
8. **Bear's Endurance** names "Impact Stance"; the Mujina's reaction is Impact Absorption, and it is read as that.

## For Graham

- **B5-1 Water Bolt.** Elemental Power lists "Water Bolt (new spell)", which is in the Grimoire (Chapter 8, Block 8). Proposed: bring Water Bolt into Block 5, as Block 3 brought the discipline spells.
- **B5-2 The Tianzhi spell lists and the elements.** Matching by trait, as printed, leaves gaps: Water Walk and Water Breathing carry no Water trait; Endure Elements carries no element; Magic Stone (Essence, Soul) matches Hikari, not Tsuchi, so a Tsuchi has nothing to choose for Elemental Power. Proposed: match by trait, plus Water Walk and Water Breathing for Suiryoku, Magic Stone for Tsuchi, and Endure Elements for every element.
- **B5-3 Adaptive Mind.** "When you use a conviction point to reroll a Mental Focus skill check" — the core's conviction spends have no reroll; the nearest is Advantage (two dice, keep the higher), spent before the roll. Proposed: read it as conviction's Advantage on a Mental Focus check, refunded when the result is a success or better.
- **B5-4 Foxfire.** A player cannot place lights on the scene. Proposed: the card creates the three motes as small light tokens the player can move, removed after 1 minute; or, simpler, the card states the rule and the GM places them.

## As built (0.6.0, on TRG Prime 3.669.0)

- **B5-4 Foxfire is drawn as light circles, not tokens.** The ruling asked for three small light tokens. This system reads every token with an actor as a creature: flanking, reactive strikes, area saves and the reaction scans (some forty places) would count a mote as a combatant, and a mote drawn as a token of its caster would catch a Fireball or offer the caster's reactions. So each mote is a placed circle (a Region, as Inner Sanctum's is) that raises the light level a step where it stands, placed with the area aim (Escape stops early) and moved with it, a Free Action once a turn, up to 30 feet, within 60 feet of you. They are removed after 1 minute. **For Graham to confirm.**
- **Spirit Beacon's light** is two registered sources: bright (three steps, as the core's Luminance reads "bright light") within 20 feet, dim (one step) within 40; the token's glow is drawn 40 and 20.
- **Living Lantern** now has a registered light (one step, dim to 10 feet, no bright ring); before 0.6.0 its card asked the table to set the token's light by hand.
- **Elemental Attunement's** +1 reaches only innate spells with the element's traits, their attacks and their save DCs: core 3.669.0 names an innate spell's attack (`innateSpellAttack`) and lets a DC bonus be `innateOnly` (found in review; the first build reached prepared spells).
- **Guardian's Intercession** is refused while its Focus use is spent or you are not able to move (its printed Requirement). The Step beside the ally is by hand.
- **Fortune's Reversal on an attack** rerolls the attack roll alone, offered as soon as the fumble check confirms the fumble (found in review: the first build re-ran the whole Strike).

