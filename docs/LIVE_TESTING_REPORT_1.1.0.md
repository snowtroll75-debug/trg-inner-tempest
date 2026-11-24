# Live testing report — Inner Tempest 1.1.0 (Block 11)

24 November 2026. Foundry VTT 14, TRG Prime 3.712.1, Inner Tempest 1.0.5 installed. Tested in the separate **Test** world as Gamemaster.

## Method

- **The code:** the 1.1.0 Block 11 code was injected into the running page as a blob module, with root-relative imports rewritten to the page origin, and registered against the live core API. Nothing was installed, and the live module files were not changed.
- **The actors and combat:** test actors "ZZ B11" were created, a Gymnast holding all nine feats plus a Rapier and unarmed attacks. A real combat was then run against a Goblin, a Kobold and two Orcs, all core monsters.
- **One artefact of the injection:** the module's `core()` loader can't resolve the system's files from a blob, so for the first Effortless Motion test the free Step used the `armMove` fallback rather than the core's compound Step leg. The installed module loads from `/systems/trg-prime/…` and is unaffected. It is still worth re-checking after installing (audit §8).
- **Cleanup:**
  - The combat, the three tokens, the three ZZ actors and the 52 chat messages were deleted.
  - The page was reloaded to drop the injected code.

## Results

| # | Step | Expected | Seen | Verdict |
|---|---|---|---|---|
| 1 | Round 1: Rebound Assault with no movement yet | Refused before any AP is spent | Refused with the "needs a Movement action first" message; AP unchanged | Pass |
| 2 | Stride | 1 AP | 1 AP | Pass |
| 3 | Rebound Assault against two targets | 2 AP; both Strikes at MAP 0; count 0→2 | Both at MAP 0; count 0→2; AP 2→0 | Pass |
| 4 | Round 2: Pinnacle free Tumble past the Goblin | 0 AP; Effortless Motion's advantage pre-ticked; Perfect Balance offered as a tick | As expected | Pass |
| 5 | Tumble result (critical) | Tumbling Reversal +1 and advantage; Pinnacle mark | All three effects applied, with the "After the Tumble" card | Pass |
| 6 | Rapier Strike against the Goblin | Rows: TR +1, Pinnacle +3; stacking keeps +3; advantage consumed | As expected; the advantage effect was deleted after the roll | Pass |
| 7 | That Strike critically hit | Pinnacle reaction offer | Offered | Pass |
| 8 | Accept: unarmed reaction Strike | Current MAP (agile, second attack, −4); count stays 1; reaction spent | −4; count 1; reaction spent | Pass |
| 9 | Rebound Assault after the Tumble | Qualifies (Tumble is Movement); both at −5; count 1→3; no second Pinnacle offer | As expected | Pass |
| 10 | Round 3: Effortless Motion free Step | 5 ft at 0 AP; a second use refused | As expected (fallback path, see Method) | Pass |
| 11 | Round 2's effects at round 3 | Gone at the end of the Gymnast's turn | Gone | Pass |
| 12 | Redirection Stance | 1 AP; stance effect up | As expected | Pass |
| 13 | An Orc misses the Gymnast in melee | Redirection offer to the Gymnast | Offered | Pass |
| 14 | Accept | Reaction spent; Flat-Footed on that Orc only, stamped to end at the end of its next turn | As expected | Pass |
| 15 | The end of the Orc's turn | Flat-Footed stays until the end of its next turn | **Removed at the end of this same turn** by the core's `_onEndTurn` blanket Flat-Footed removal | **Core conflict** (audit §5) |
| 16 | Redirection Flat-Footed applied off the Orc's turn | Expires at the end of the Orc's next turn | Expired then | Pass |

## Not covered live

These were covered by the harness only:
- Offensive Momentum end to end, including the d4 rider against a precision-immune creature.
- Whirlwind Kip's reaction Strike.
- Perfect Balance's defender-side disadvantage.
- Redirection's Trip on a fumble.
- Vaulting Momentum's substitution and eligibility gate.

Audit §8 lists the checks to make once the packaged 1.1.0 is installed.

## Second pass: the installed 1.1.0 (24 November 2026, after Graham installed it)

- **Setup:**
  - Test world, as Gamemaster, on TRG Prime 3.712.1 with Inner Tempest 1.1.0 installed. Nothing was injected.
  - A fresh "ZZ B11 Gymnast": level 17 Fighter with the Gymnast archetype, the nine feats, a Rapier and Unarmed Strike.
  - Fiends & Fables opponents: Kobold Sneak, Goblin Warrior, Skeleton Warrior and Rat Swarm.
  - Where a test needed a critical or a fumble, the dice were forced through `CONFIG.Dice.randomUniform` and restored straight after.

| # | Check | Seen | Verdict |
|---|---|---|---|
| 17 | Compendium | 158 feats in the Inner Tempest folder; the nine with their ids, jade class/general art, categories and traits as printed; the only "Flowing Step" is the spell | Pass |
| 18 | Vaulting Momentum's eligibility | Refused when created in the same batch as the Gymnast archetype, with a warning; accepted once the archetype was on the sheet | Pass (see note) |
| 19 | Effortless Motion, installed | The core's compound Step leg (`countsAs: "step"`, 5 ft); the token moved 5 ft at 0 AP; a second use refused | Pass (§8 item 2 closed) |
| 20 | Offensive Momentum: Long Jump (Acrobatics through Vaulting Momentum) against the Rat Swarm | The choice list offered both jumps under Acrobatics; the check succeeded (26 against DC 10) and 2 AP were spent; **but** the card said the check was "waiting on the GM's DC", and no move or Strike buttons followed. The conviction prompt held the roll past the moment the Use read it | **Fail.** Fixed in 1.1.1 |
| 21 | Whirlwind Kip | Stance 1 AP; a critical free Tumble offered the reaction Strike; accepted: Unarmed Strike at MAP 0 (count 0→1), reaction 2→1, Tumbling Reversal's advantage taken | Pass (§8 item 4 closed, through Tumble) |
| 22 | Pinnacle offer after that critical | Offered on the marked Kobold | Pass |
| 23 | Perfect Balance | The Goblin Warrior's Trip Attack from its sheet against the Gymnast was rolled at **disadvantage**, the card naming Perfect Balance | Pass (§8 item 5 closed) |
| 24 | Redirection Stance on a fumble | The Skeleton's Broadsword fumbled; the offer named the fumble; accepted: the reaction was spent, the Skeleton was flat-footed with the turn-end stamp, then the free Trip was offered and rolled at 0 AP (success; the Skeleton prone) | Pass (§8 item 6 closed) |

- **Note on 18:** creating the archetype and Vaulting Momentum in one call checks eligibility before the archetype is on the sheet. Through the picker, one at a time, it can't arise.
- **Not covered:** a player-owned Gymnast (§8 item 7). Only one client was available.
