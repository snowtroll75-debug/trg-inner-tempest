# Inner Tempest — Block 11 audit: the Gymnast expansion (v1.4)

24 November 2026. Module 1.0.5 → **1.1.0**. Needs **TRG Prime 3.712.1**.

Source: *Inner Tempest* v1.4. Graham's instruction was to treat it "as law". The text of the nine feats is extracted from the book by `tools/content/extract-book-block11.mjs` into `tools/content/book-text-block11.json`. Nothing is retyped.

## 1. Audit before building

- **The installed module:**
  - Installed 1.0.5 is GitHub 1.0.4 plus the jade artwork overlay.
  - The packs were rebuilt from source and came out byte-identical to the installed files. That rebuild is the baseline, in commits `5bbd1ad` and `3bc5ef3`.
- **The core Gymnast archetype:**
  - It is the system's own archetype, untouched.
  - Its feats keep their ids. No duplicate archetype was created.
  - The new Gymnast class feats carry the core's `gymnast` archetype trait, so the core picker gates them exactly as it gates the core's own Gymnast feats.
- **The naming safeguards:**
  - The Grimoire spell **Flowing Step** (PP 4) is unchanged. Its document is hash-pinned in `verify-block11` A-section (`af2995…f771`).
  - The Oathblade's **Challenge** is unchanged and hash-pinned too (`a0b397…c5f9`).
  - The feat the book once called Flowing Step ships only as **Effortless Motion**.
  - No document in any pack named "Flowing Step" is a feat.
- **Echoes of Steel:** not opened or modified.
- **Other rule amendments in v1.4:**
  - The v1.4 text was diffed against the extractions used for Blocks 5–8 and 10.
  - Apart from the nine feats, only formatting and pandoc artefacts differ. No other rule changed, so no other content was rebuilt.

## 2. The nine feats as printed

| Feat | Category | Traits | Prerequisites | Action |
|---|---|---|---|---|
| Effortless Motion | Class | Expert | Acrobatics 10 | Passive + free Step once per round |
| Offensive Momentum | Class | Flourish, Gymnast | Vaulting Momentum, Acrobatics 8 | 2 AP |
| Perfect Balance | Class | Expert | Acrobatics 8 | Passive |
| Pinnacle of Motion | Class | Gymnast | Acrobatics 16 | Passive + reaction |
| Rebound Assault | Class | Attack, Flourish, Gymnast, Movement | Vaulting Momentum | 2 AP |
| Redirection Stance | Class | Gymnast, Stance | Acrobatics 10 | 1 AP + reaction |
| Tumbling Reversal | Class | Gymnast | Acrobatics 4 | Passive |
| Vaulting Momentum | **General** | Gymnast | Acrobatics 6, Athletics 3 | Passive (skill substitution) |
| Whirlwind Kip | Class | Gymnast, Stance | Acrobatics 10 | 1 AP + reaction |

- **Classifications:** kept exactly as printed. On Rebound Assault the word CLASS sits mid-way along the trait line. The extractor finds the category word wherever it falls and never turns it into a trait.
- **Picker gating:**
  - The General picker does not gate on archetype traits. Vaulting Momentum is therefore gated with `registerFeatEligibility`: it needs the Gymnast archetype, and the check runs in the picker and at creation.
- **Ids and artwork:**
  - Ids are deterministic (`stableId("feats:"+name)`).
  - Art is the established jade set: `assets/feats/class.png` for Class and `general.png` for General.
  - The ids were appended to `artwork.json` without reordering it.

## 3. What is automated, and how

"Automated" below means the behaviour was implemented, exercised through the real core workflows in `verify-block11`, and (where marked **live**) seen in a Foundry combat in the Test world.

| Feat | Automated | Left to the player or GM |
|---|---|---|
| **Effortless Motion** | <ul><li>Advantage on Acrobatics checks with the Movement trait: an automatic conditional (**live**: pre-ticked on the Tumble).</li><li>Advantage on other Acrobatics checks: a tickable row.</li><li>The free Step: a Use arms the core's compound Step leg (`countsAs: "step"`) at 0 AP, once per round (**live**: 5 ft at 0 AP; the second use was refused).</li></ul> | Nothing else. |
| **Offensive Momentum** | <ul><li>The Use makes the chosen check at no extra cost and then spends 2 AP.</li><li>It arms the movement leg and posts Strike buttons.</li><li>A Strike pressed from the card adds the d4 precision dice through a temporary damage rider.</li><li>The rider respects precision immunity and resistance and is removed afterwards.</li></ul> | Which check to make, and where to move. |
| **Perfect Balance** | <ul><li>A tickable advantage row for checks and saving throws against being knocked prone or moved.</li><li>A defender-side `defenceDC` disadvantage on Shove, Trip and Reposition aimed at the feat's owner, on the Tsuchi pattern.</li></ul> | "Ignore narrow surfaces / uneven ground…" (B11-2). |
| **Pinnacle of Motion** | <ul><li>Once per round, a free Tumble at 0 AP.</li><li>A successful Tumble marks the creature tumbled past as flat-footed to your attacks until the end of your turn. This is a circumstance bonus equal to its Dexterity plus dodge, and none if it is already flat-footed to you.</li><li>A critical hit on a marked creature offers one unarmed reaction Strike at your current MAP, with the count frozen, once per round. The reaction is spent.</li></ul> All **live**: the free Tumble, the mark, the +3 row on the next Strike (the Goblin's Dexterity plus dodge), and the reaction Strike rolled at −4 (agile, second attack) with the count unchanged. | Choosing targets. |
| **Rebound Assault** | <ul><li>Refused without a Movement-trait action earlier this turn.</li><li>Refused unless there are exactly two different targets within reach.</li><li>Weapon and reach are checked before anything is spent.</li><li>2 AP. The first Strike is at the current MAP and does not advance it; the second Strike advances it by two.</li></ul> **Live:** refused with no movement; at count 0, both Strikes at MAP 0 and the count went 0→2; after the Pinnacle Tumble, both at −5 and the count went 1→3. | Choosing the two targets. |
| **Redirection Stance** | <ul><li>Entering the stance costs 1 AP through the core stance API (**live**).</li><li>When an adjacent creature misses you with a melee Strike, you're offered the reaction: it applies Flat-Footed to that attacker until the end of its next turn (**live**, but see the core conflict in section 5).</li><li>On a fumble, the core Trip is added at 0 AP.</li></ul> | Nothing else; the core conflict in section 5 needs a ruling. |
| **Tumbling Reversal** | <ul><li>After a successful Tumble past a creature: +1 circumstance to attacks against it until the end of your turn.</li><li>On a critical Tumble: advantage on your next attack against it as well. The advantage is spent by that attack and gone at the end of the turn if unused.</li></ul> **Live:** both appeared, and the advantage was consumed by the Rapier Strike. | — |
| **Vaulting Momentum** | <ul><li>The skill substitution: Acrobatics for Athletics on the jumps the book names.</li><li>The archetype eligibility gate.</li></ul> | — |
| **Whirlwind Kip** | <ul><li>Entering the stance costs 1 AP.</li><li>A critical success on a Tumble or Escape check while in the stance offers a reaction Strike at normal MAP, spending the reaction.</li></ul> | The +2 DB against opportunity attacks (B11-6). |

## 4. Rulings needed (the unambiguous part is built; the authored wording is kept)

- **B11-1, Offensive Momentum:**
  - **Dice:** the core's precision dice are hard-coded d6, so the d4s go through a damage rider. The core damage chain treats them as precision for immunity and resistance.
  - **Long Jump:** its movement leg is taken as Speed plus the check total.
  - **The 10 ft:** "moved at least 10 ft" is read from the core's `movementThisTurn`.
  - **Ruling wanted:** confirm these readings.
- **B11-2, Perfect Balance:** "ignore narrow surfaces / uneven ground" has no core terrain seam, so it is left to the GM.
- **B11-3, Pinnacle of Motion:**
  - **What the mark covers:** "Flat-Footed against all your attacks" is built as a bonus on your own attacks against that creature: its Dexterity plus dodge, as a circumstance bonus, the way the core types flat-footed-to-you. It is not the condition itself. It therefore does not reach maneuver DCs or other creatures' attacks.
  - **Stacking:** core stacking keeps only the greater of it and Tumbling Reversal's +1, as circumstance bonuses do. Seen live: +3 kept, so Tumbling Reversal adds nothing while the mark stands.
  - **"Current MAP":** read as the count frozen after the critical, on the Cleave precedent.
  - **Ruling wanted:** should Pinnacle impose the real Flat-Footed condition instead?
- **B11-4, Rebound Assault:**
  - **When the movement must come:** "after a Movement action" is read as a Movement-trait action earlier this turn with its own AP, not necessarily the immediately preceding one.
  - **What counts:** Stand counts, because it has the Movement trait as printed. Step counts through the core's step record.
  - **Movement legs:** an ability's movement leg (such as Offensive Momentum's) prompts the player.
  - **Ruling wanted:** confirm, or tighten to "immediately after".
- **B11-5, Whirlwind Kip:** its reaction Strike uses normal MAP, because it happens on your own turn. Confirm.
- **B11-6, Whirlwind Kip's +2 DB against opportunity attacks:**
  - The core has no `defenceDC` axis for attacks of opportunity, so it is GM-manual.
  - A core seam would let it be automated.
- **B11-7, Expert-trait feats for a Martial Gymnast:**
  - Effortless Motion and Perfect Balance carry the Expert tier trait as printed.
  - The picker therefore offers them only to characters with Expert access. A Gymnast of another tier won't see them.
  - Confirm that this is intended.

## 5. Core conflict found in the live test: Flat-Footed expires too early

- **The behaviour:**
  - `module/documents/combat.mjs` (`_onEndTurn`, ~line 1667) removes any Flat-Footed from a creature at the end of that creature's own turn, from whatever source ("as it always has").
  - When an Orc missed on its own turn and the Gymnast used Redirection Stance, the Flat-Footed carried the correct `endsAtTurnEndOf {of: Orc, castTurn: this turn}` stamp ("until the end of its next turn"), but the core stripped it at the end of that same turn.
  - Applied on another creature's turn, the stamp expired correctly at the end of the Orc's next turn.
- **Also affected:** any core or module effect that grants Flat-Footed "until the end of its next turn" to a creature during its own turn, including the core's own repaired spell text.
- **Ruling wanted:** either the core rule is intended and Redirection Stance's duration should be read under it, or the core should skip the blanket removal when the effect carries an `endsAtTurnEndOf` clock that hasn't run out. This is a core change and was not made here.

## 6. Core files the module reads at call time

The block reads these through `core(rel)`, each with a fallback:
- the compound-action workflow (`armCompoundLeg`, `stepDistance`)
- `data/basic-actions.mjs` (Trip)
- `creature-traits`, `defences` and `creature-type-rules` (precision immunity and resistance)
- geometry for reach

Exported core helpers for these would remove the dependency on file paths.

## 7. Tests

- **`verify-block11`:** 186 checks, all green. It stubs Foundry and drives the real core modules: conditionals, defence DCs, picker filters, prerequisites, feats, the module API, the attack and action workflows, damage riders, movement, effect durations and reaction feats. Coverage:
  - the book text and classifications
  - the hash pins
  - eligibility at levels 1, 5, 10, 15 and 20
  - the pure decisions
  - behaviour through the real workflows
  - version pins
- **`mutate-block11`:** 75 mutations, all caught.
- **Every earlier block's harness:**
  - Re-pinned to 1.1.0 and 3.712.1, as is the established practice.
  - All green except the pre-existing **mutate-block8** survivor (the Root stacking item, documented in the core compatibility doc).
  - **verify-block5 and mutate-block5:**
    - They read `book/it12.md`, which is not in this tree, so they are BLOCKED as they stand.
    - Pointed at the v1.4 text through a temporary symlink, they ran green: 572 checks and 108 mutations, all caught.
    - The symlink was then removed.
- **Live test:** see `LIVE_TESTING_REPORT_1.1.0.md`.

## 8. Manual verification still worth doing in a real world

The live test ran with the Block 11 code injected into the page. The packaged module itself has not been installed. After installing 1.1.0 in the Test world:

1. Check the feat sheets: the nine feats are in the Inner Tempest feat compendium with jade art, Vaulting Momentum under General, and none called Flowing Step.
2. Effortless Motion's free Step: confirm it reaches the core's compound Step leg. In the injected test it used the `armMove` fallback, because blob imports can't resolve the core path.
3. Offensive Momentum, end to end: check, movement, Strike button, d4 rider, against a precision-immune creature as well.
4. Whirlwind Kip: critically succeed on an Escape check while in the stance, then accept the offer. A Tumble was exercised only in the harness.
5. Perfect Balance: have an NPC Trip the Gymnast and check that the defender-side disadvantage applies.
6. Redirection Stance on a fumble, to see the Trip added.
7. Run a player-owned Gymnast with a GM present, to check that the offers reach the owning player.

## 9. Rulings received (24 November 2026) and 1.1.1

Graham answered the questions put in the 1.1.0 report:

| # | Question | Ruling | Effect |
|---|---|---|---|
| 1 | The core's end-of-turn Flat-Footed removal vs Redirection Stance (§5) | "The core should apply unless a local rule overrides it" | Core 3.712.2 keeps a Flat-Footed with its own turn clock; Redirection's lasts to the end of the attacker's next turn |
| 2 | Pinnacle of Motion: bonus or the real condition (B11-3) | The real condition, so sneak attack and the like trigger | 1.1.1 lays Flat-Footed until the end of the Gymnast's turn; Tumbling Reversal's +1 now counts beside it |
| 3 | Rebound Assault's "after a Movement action" (B11-4) | Keep the reading | Unchanged |
| 4 | Offensive Momentum's d4 rider and Long Jump leg (B11-1) | Yes to both | Unchanged |
| 5 | Whirlwind Kip's reaction Strike at normal MAP (B11-5) | Yes | Unchanged |
| 6 | Expert trait on Effortless Motion and Perfect Balance (B11-7) | Yes, intended | Unchanged |

Still with the GM, and not ruled on:
- Perfect Balance's terrain clause (B11-2).
- Whirlwind Kip's +2 DB against opportunity attacks (B11-6).

The 1.1.0 live re-test also found that **Offensive Momentum** lost its Strike whenever the check was held by the conviction prompt. 1.1.1 waits for the held result (see `RELEASE_NOTES_1.1.1.md`).
