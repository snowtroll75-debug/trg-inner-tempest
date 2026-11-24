# Inner Tempest 1.1.1

24 November 2026. This release applies Graham's rulings on the Block 11 audit and fixes Offensive Momentum, which the live test of 1.1.0 found broken.

- **Needs TRG Prime 3.712.2.** That release keeps a Flat-Footed with its own turn clock past its owner's turn end.
- No migration.

## Changed by ruling (24 November 2026)

- **Pinnacle of Motion lays the real Flat-Footed condition.** Ruling 2: "otherwise other things that trigger on flat-footed (such as sneak attack) will not kick in."
  - **Before:** a per-attacker bonus.
  - **Now:** after a successful Tumble, the creature tumbled past gains Flat-Footed until the end of the Gymnast's turn, on the core's turn-end clock in the Gymnast's name.
  - **Already flat-footed:** nothing is added, and nothing of the other rule's is touched.
  - **The mark on the Gymnast:** still records which creature the reaction Strike may answer, and carries no bonus of its own.
  - **Stacking:** Tumbling Reversal's +1 circumstance now counts beside it.
- **Redirection Stance's Flat-Footed lasts until the end of the attacker's next turn**, including when the miss came on the attacker's own turn. Ruling 1: "the core should apply unless a local rule overrides it". The fix is in the core (3.712.2); the module's stamp is unchanged.
- **Confirmed as built:**
  - Rebound Assault: any Movement action earlier in the turn; Stand counts (ruling 3).
  - Offensive Momentum: d4 precision through a damage rider; Long Jump's leg is Speed plus the check total (ruling 4).
  - Whirlwind Kip's reaction Strike at normal MAP (ruling 5).
  - Effortless Motion and Perfect Balance keep the Expert trait as printed (ruling 6).

## Fixed: Offensive Momentum after a held check

- **Found live in 1.1.0:**
  - When the check was held (the conviction prompt, or a DC the GM sets afterwards), the Use read the result before it existed.
  - Its card said the check was waiting. No movement was armed and no Strike buttons appeared, though the 2 AP were spent.
- **Now:** the Use waits for the core's announcement of the degree for that creature and action, up to ten minutes, and then continues as normal. A degree-less first announcement, or another creature's, is not taken as the answer.

## Harness

- **`verify-block11`:** 188 checks, all green.
  - Pinnacle's turn clock, and its standing against core 3.712.2's turn-end rule.
  - The condition laid on each creature tumbled past, and not twice.
  - The held-check wait.
- **`mutate-block11`:** 81 mutations, all caught.
- **Every block re-pinned to 1.1.1 / 3.712.2.** All green, except the one pre-existing mutate-block8 survivor (Root stacking).
- **Block 5:** run against the v1.4 text: 572 checks and 108 mutations.
