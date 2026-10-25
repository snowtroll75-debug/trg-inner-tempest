# Inner Tempest Block 2 audit: Chapter 4, Skills & Actions (v1.2)

21 October 2026. v1.2 rewrote Chapter 4: eleven of its seventeen actions are new since v1.1, which the rules audit of 20 October covered. This audit checks the v1.2 text against TRG Prime 3.665.1 (core read in full for this; file and line references are in the working notes) and says how each action would be built.

## Refocus (special action)

The v1.2 text matches core's Refocus degree by degree: Critical now, Success at your next turn, Partial after 1 minute, Failure barred 10 minutes, Fumble until daily preparation, Blunder adds 1d4 mental per level (basic Will). **Nothing to change.**

## What core already gives a module

- **Registration.** `registerSkillActions` takes key, name, skills, traits, AP cost, check type, `against` (the target's Level DC, your own Level DC, a fixed DC, or the GM's), difficulty, outcome text per degree, a required feat, and variants. Actions appear under their skill on the sheet.
  - The **required feat is enforced only by the sheet's chooser**, not by the action itself.
- **Hooks.** Two hooks let a module refuse an action before anything is spent (`trgPrimeActionAttempt`) and act on the degree after the card (`trgPrimeActionResolved`, which fires again when the GM sets a DC late).
- **Bonus Check table** (CRB p.63): Heroic 4, Critical 3, Success 2, Partial 1, Failure 0, Fumble −1, Blunder −2. **No action applies it as data;** each use is code.
- **Scoped bonuses** ride on an effect as conditionals (by check type, skill, action key, traits, target or source) or as defence rows (DB and DCs, by attacker or action), with a round or world-clock expiry. Effects can be put on another creature through the GM.
- **Frightened** can be reduced through the status, as Rally does.
- **Movement** a module pays for can be armed (`armMove`).
- **Lockouts** ("cannot try again for 10 minutes") have no generic field. A module records them and refuses in the attempt hook (the Pillars of Faith pattern).

## Gaps found (core changes proposed for 3.666.0)

| ID | Gap | Needed by | Proposal |
|---|---|---|---|
| B2-1 | No defender reaction before a hit is decided. The Strike builds DB as a constant and rolls; nothing can add to it for *this* attack. | Evade | **Recommended:** Evade is declared when you are targeted (before the attacker rolls). It rolls Acrobatics and puts a one-attack dodge bonus on your DB; core consumes a defence row marked `oneShot` after the attack it applied to. **Alternative:** a true interrupt that pauses the attacker's roll and asks the defender's player across clients. That is much more core work, and is fragile when the defender's player is away. |
| B2-2 | The pre-save reaction seam grants **advantage only**. | Steel the Mind, Root the Body | Extend it to a "bonus check" reaction: roll the named skill against your own Level DC and add the Bonus Check result as a circumstance bonus to *this* save. It is offered only when the save matches (Steel the Mind: a Will save against Emotion or Mental), and spends the reaction. |
| B2-3 | Shove and Trip roll against a static DC, so a bonus to "the check to avoid being moved" has nothing to land on (the Storgar and Tsuchi problem). | Root the Body | As Storgar was ruled: Root the Body's bonus raises your Fortitude (and Acrobatics) DC against that one Shove or Trip, through the same `oneShot` defence row as B2-1. |
| B2-4 | The Dying Check carries no scope, so nothing can target it alone. | Resist Dying | Give it an action key (`dyingCheck`) that conditionals can name. |
| B2-5 | Time choices (10 min / 1 min −2 / 1 round −5 / 1 AP −10) are keyed to core actions only. | Centred Balance, Elemental Ward | Let an action declare its own `timeLadder` rungs, read by the existing ladder dialog. |
| B2-6 | An action's own traits never reach its roll, so "Concentrate and Mental actions" cannot be scoped. | Maintain Clarity | Pass the action's traits on its check. Before shipping, every existing traits-scoped conditional is checked so none starts applying where it did not. |
| B2-7 | No fixed ground zone made by a non-spell action. Ally auras follow their emitter. | Elemental Ward | A zone a module can place (a Region at a point, radius, duration on the world clock) whose occupants get an effect while inside, reusing the spell-zone code. |
| — | `bonusCheckModifier` is not in the module helpers. | most | Expose it, so the module does not keep a second copy of the table. |

## The seventeen actions

The class column is the automation target (A full, B with a player choice, C partial, D described).

| Action | Skill | Build | Class |
|---|---|---|---|
| Evade | Acrobatics | Reaction; Inner Discipline. Declared when targeted (B2-1): roll against your Level DC, Bonus Check → dodge bonus to DB against the next attack on you this round, consumed by it. | B |
| Interpret Style | Artistry | 3 AP vs the target's Level DC; Bonus Check ÷ 2 (round up) → circumstance AB and DB against that target. **Ends when the target leaves its stance or the combat ends** (the module watches the stance effect). One instance: a new use replaces the old. | A |
| Root the Body | Athletics | Reaction. Before a save to avoid prone or forced movement, offered as a tick on the save (core cannot tell such a save apart); against a Shove or Trip, the DC rises by the bonus (B2-3). The teleport exclusion is in the text. | B |
| Wall Run | Climbing | 1 AP, Flourish and Movement (core's trait gate); Inner Discipline. The GM sets the Climb DC; then a move is armed: your Speed, half, or 10 ft; Fumble: prone. | B |
| Recognise Discipline | Culture | 1 AP vs the target's Level DC; the information is the outcome text. Fumble: refused against that creature for 10 minutes. | A |
| Centred Balance | Meditation | Inner Balance; 10 min with the time ladder (B2-5); the GM sets the DC of the check you will make; Bonus Check → a one-shot circumstance bonus to your next Acrobatics, Athletics, Climbing, Mental Focus, Perception or Sense Motive check. | B |
| Guide the Breath | Meditation | 1 AP vs the ally's Level DC; the ally must have a spent Focus ability; not on yourself. Bonus Check → a one-shot circumstance bonus to the ally's next Refocus, expiring at the end of their next turn. Two uses do not stack (same type). | A |
| Steady Heart | Meditation | 1 AP vs your Level DC; frightened or under an Emotion/Fear effect. Critical: frightened −2 and +2 circumstance to saves against Emotion and Fear until your next turn. Success: −1. Partial: +2 to your next such save before your next turn. Fumble: no Steady Heart until your next turn. | A |
| Resist Dying | Mental Focus | 1 AP; Inner Discipline; Bonus Check → a bonus to your next Dying Check (B2-4). **See Q4: when can a dying creature use it?** | B |
| Maintain Clarity | Mental Focus | 1 AP vs your Level DC. Core does not know which penalties come from distraction, so the 4/2/1 is offered as a tick on your Concentrate and Mental checks until your next turn, to offset a distraction penalty (B2-6). Fumble: −1 circumstance to them, applied. | C |
| Steel the Mind | Mental Focus | Reaction before a Will save against Emotion or Mental; Inner Discipline. Offered on that save (B2-2) with a Bonus Check → circumstance bonus to it. | A |
| Elemental Ward | Nature | Elemental Warding; DC 20; the time ladder (1 min −2, 1 h +2); pick acid/cold/electricity/fire. A 10-ft zone at your position (B2-7), lasting 8 h, 1 h or 10 min by degree; Blunder: weakness instead. Failure and Fumble lockouts recorded. | B |
| Read the Elements | Nature | 1 min; the GM sets the DC (the responsible creature's or effect's level). Information by degree. Critical: Nature for Track on that creature for an hour (a temporary grant registered as a skill substitution, removed after the hour). | B |
| Read Spiritual Echo | Occultism | 1 min; the GM's DC; information by degree. | A |
| Observe Technique | Perception | 1 AP vs the target's Level DC. Critical: +2 circumstance to your next DB or save against that creature before the end of your next turn. Fumble: refused against it until your next turn. **The requirement (a stance, Combat Form or Focus ability since your previous turn) is printed, not checked:** core keeps no record of Focus use. | B |
| Read Devotion | Religion | 1 min; the GM's DC; information by degree. | A |
| Read Intent | Sense Motive | 1 AP, 30 ft vs the target's Level DC. Critical: +2 circumstance to DB and saves against the target until your next turn. Success: choose DB or saves, +2. Partial: +1 DB. Fumble: −1 DB. Once each round per creature (enforced). **"The target cannot provide flanking against you"** has nothing in core to hang on (Q8). | B |

**Location lockouts are described, not enforced.** Core has no identity for "this location", so "here again for 1 hour" (Read the Elements, Read Spiritual Echo, Read Devotion) is left to the table; creature and self lockouts are enforced.

## Graham's rulings (21 October 2026)

| Question | Ruling | Build |
|---|---|---|
| 1. Evade | **Declared when targeted.** Graham also asked how core's Nimble Dodge is handled, since the Core Rulebook was signed off as fully automated. **It was not:** Nimble Dodge is declared the same way, but its +2 dodge stayed until deleted by hand, and it never spent the reaction its card claimed. Inner Tempest's Impact Absorption has the same gap. | **Fix all three** (Graham): one core mechanism, an effect that lasts for the next attack against you only, removed by that attack, with the reaction actually spent. Nimble Dodge is corrected in core. |
| 2. Root the Body against Shove or Trip | **Raise the DC** against that one attempt, as Storgar. Against a save, add to the save. | A one-attempt defence row; a pending bonus for your next check or save to avoid prone or forced movement. |
| 3. Elemental Ward | **A real zone.** | Core B2-7. |
| 4. Resist Dying | The dying rules changed (a character used to keep 1 AP unless unconscious); Graham asked for suggestions and chose **a reaction on falling**. **Reaction; Trigger:** you gain the dying condition. Mental Focus against your Level DC; the Bonus Check result is added to your next Dying Check. | Core B2-4 scope on the Dying Check; the module offers the reaction when Dying arrives. |
| 5. Maintain Clarity | **Offered as a tick.** | As planned. |
| 6. Read Intent's flanking clause | **Described on the card.** | As planned. |

## Built (Inner Tempest 0.3.0 on TRG Prime 3.666.0, 21 October 2026)

All seventeen are registered (`module/skill-actions.mjs`) and automated (`module/skill-action-automations.mjs`) as planned above, on the core changes B2-1 to B2-7 (shipped in 3.666.0; see `INNER_TEMPEST_CORE_DEPENDENCIES.md`). Graham's "fix all three" is done: core's Nimble Dodge and the module's Evade and Impact Absorption last the one attack they answer.

**Two seams found while building, added to 3.666.0:**

- `trgPrimeTurnEnded`, for "before the end of your next turn" (Guide the Breath, Observe Technique). The core swept only at a turn's start.
- `outcomesApplied: true` on an action. Maintain Clarity's Fumble prints "-1 circumstance penalty", which the core's outcome reader would have queued a second time, unscoped. The flag also stops the core's "clear it by hand" line on actions that lay no condition.

**Built by interpretation, for Graham to confirm:**

1. **Elemental Ward's Blunder** prints no duration ("the ward grants Weakness instead"). It lasts a Success's 10 minutes, the ward the drawer believes they made.
2. **Observe Technique's Critical** says "your next DB check or saving throw against that ability". The core cannot tell one of a creature's abilities from another. So the DB half applies to that creature's next attack, whatever it is. The save half is a tick.
3. **Steel the Mind** is declared from the Skills tab before the Will save, and its bonus is applied to that save. Core 3.666.0 can offer it automatically before every matching save (`saveBonusReaction`), but that declaration belongs on the Inner Discipline feat, which ships with the classes in Block 3.
4. **Out of combat**, an effect that lasts "until your next turn" lasts one round (6 seconds) of world time.
5. **An unused declared defence** (Evade, Root the Body, Steel the Mind) ends at the start of your next turn.
