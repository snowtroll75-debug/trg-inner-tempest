# Live testing report: Inner Tempest 1.1.1 on TRG Prime 3.712.2

24 November 2026, from about 12:40. Test world, Foundry v14.367. Both versions were confirmed installed: TRG Prime 3.712.2 and Inner Tempest 1.1.1.

## Setup

**Two clients:**
- **GM:** Testing Dude, at `localhost:30000`. Ran the monsters and the turn order.
- **Player:** PC Tester, at `127.0.0.1:30000`. Owned and played the Gymnast; every Gymnast action and every reaction answer came from the player's screen.

**Rig:**
- **Gymnast:** "ZZ B11 Gymnast", a level 17 Fighter with the Gymnast archetype, the nine feats, Acrobatics 16 and an Unarmed Strike.
- **Opponents:** Skeleton Warrior, Goblin Warrior, Kobold Sneak and Rat Swarm, from Fiends & Fables.
- A combat on the Caves scene.
- Dice were forced through `CONFIG.Dice.randomUniform` where a test needed a miss, and restored afterwards.

## Results

| # | Check | Seen | Verdict |
|---|---|---|---|
| 1 | **Redirection Stance, the core fix (ruling 1).** In round 1 the player entered the stance; on the **Skeleton's own turn** its Broadsword missed the Gymnast | The offer appeared **on the player's screen**. Accepting spent the reaction (2→1), and the Skeleton was flat-footed, laid on the GM's side, stamped `endsAtTurnEndOf {of: Skeleton, castTurn: "1:<its combatant>"}` | Pass |
| 2 | …the end of the Skeleton's round-1 turn | **Still flat-footed.** On 3.712.1 it was removed here | **Pass (fixed)** |
| 3 | …through the Goblin's, Kobold's and Rat's turns and the Gymnast's round-2 turn | Still flat-footed | Pass |
| 4 | …the end of the Skeleton's round-2 turn | Removed: "Flat-Footed expires" | Pass |
| 5 | **Pinnacle of Motion, the real condition (ruling 2).** Round 2: the player's free Tumble (0 AP) against the Goblin, a critical | The Goblin gained the real **Flat-Footed** condition, laid through the GM and stamped `endsAtTurnEndOf {of: the Gymnast, castTurn: ""}`. Tumbling Reversal's +1 and advantage, and the Pinnacle mark, went on the Gymnast | Pass |
| 6 | The Strike that followed (from Offensive Momentum, below) | Tumbling Reversal's +1 now applied **beside** the condition, not displaced by it. A critical hit offered the Pinnacle reaction on the player's screen | Pass |
| 7 | Pinnacle's reaction Strike, taken | Unarmed Strike at the current penalty (−4, agile, attack 2); the attack count stayed at 1; reaction 2→1 | Pass |
| 8 | The end of the Gymnast's turn | "Flat-Footed expires on Goblin Warrior"; the effect is gone | Pass |
| 9 | **Offensive Momentum, end to end, from the player.** Long Jump (Acrobatics through Vaulting Momentum), then a 10 ft move, then a Strike against the Goblin | The check cost 0 AP and the action 2; the move went at 0 AP on the armed leg (`movementThisTurn` 10 ft); the card's Strike carried **+1d4 precision**: "14 Subdual (5d4 + 2 + 1d4) … Offensive Momentum (precision) +1d4". The rider was removed after the Strike | Pass |
| 10 | **Offensive Momentum after a held check (the 1.1.1 fix).** Round 3: a Tumble the conviction prompt held | AP and the card waited for the player's answer. After "No", the action's 2 AP were spent, the 30 ft movement leg was armed, and the card offered the Strike at "a critical: +2d4". In 1.1.0 this lost the Strike | **Pass (fixed)** |
| 11 | The Tumble made inside Offensive Momentum | Also triggered Tumbling Reversal and Pinnacle on the Kobold; its Flat-Footed expired with the Goblin's at the end of the Gymnast's turn | Pass |
| 12 | Offensive Momentum against the Rat Swarm (immune to precision), round 1 | See the note below: the game was paused, so the move wasn't recorded and the card reported 0 ft. The immunity path was covered live on neither run; the harness covers it | Not shown |

## Notes

- **The paused game (test 12).**
  - The world was paused when the test began.
  - A player's token moved by script while paused did move, but the core deliberately records nothing for a paused player's move, because Foundry refuses a drag in that state.
  - So the Gymnast's 10 ft wasn't counted, and the card said "You moved 0 ft". Unpaused, the same steps worked (test 9).
  - This is an artefact of the scripted move, not a defect.
- **Prone counts as flat-footed.** `hasCondition("flatFooted")` is true for a prone creature. After the Goblin was knocked prone it still read as flat-footed at the end of the Gymnast's turn, though Pinnacle's own effect had gone.
- **Conviction prompt.** The prompt appears only on some rolls, so the held path was reached by forcing the dice.
- **Not covered live:**
  - Pinnacle on a creature already flat-footed for another reason (covered by the harness).
  - Whirlwind Kip from the player's screen (covered by the GM's run on 1.1.0).
- **Console:** nothing from the system or the module. Eldritch Arts logged its known `teleport` deprecation warning on token moves.

## Cleanup

- **Deleted:**
  - the combat;
  - the five test tokens and the five ZZ B11 actors;
  - the 77 messages posted by Gamemaster, Testing Dude and PC Tester since 12:06 today, all from these tests.
- **Remaining:** 281 messages; the actors Character, Kharon, Syn, Valmorius and Valmorius 2.
- **Game state:** paused again, as found.
- **Clients:** the player's tab was closed, which logged PC Tester out. The forced dice were restored.
