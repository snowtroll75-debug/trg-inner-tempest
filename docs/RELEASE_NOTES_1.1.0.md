# Inner Tempest 1.1.0

24 November 2026. The Gymnast expansion from *Inner Tempest* v1.4.

- **Needs TRG Prime 3.712.1.** No migration. All existing content keeps its ids and text.

## Added: nine Gymnast feats

- **Class feats:**
  - Effortless Motion
  - Offensive Momentum
  - Perfect Balance
  - Pinnacle of Motion
  - Rebound Assault
  - Redirection Stance
  - Tumbling Reversal
  - Whirlwind Kip
- **General feat:** Vaulting Momentum.

The details:
- **Where they live:** the it-feats compendium (158 feats; 395 documents across the packs), with the jade feat art.
- **Classifications and prerequisites:** exactly as printed in v1.4.
- **The core Gymnast archetype is unchanged.** The new feats join it through the core's own `gymnast` trait gate. Vaulting Momentum, a General feat, is gated to Gymnasts by an eligibility rule.
- **Effortless Motion** is the feat once called Flowing Step. The Grimoire spell **Flowing Step** and the Oathblade's **Challenge** are unchanged and hash-pinned in the harness.

## Automation

`docs/INNER_TEMPEST_BLOCK11_AUDIT.md` has the full table of what is automated and what is left to the player or GM. In brief:
- **Rebound Assault:** checks for a Movement action and two targets before spending anything. The first Strike is at the current MAP without advancing it; the second advances it by two. Verified in a live combat.
- **Pinnacle of Motion:** a free Tumble once per round. A successful Tumble marks its target as flat-footed to you. A critical on a marked creature offers an unarmed reaction Strike at the frozen MAP. Verified in a live combat.
- **Tumbling Reversal:** its +1 and its one-shot advantage. Verified live.
- **Effortless Motion:** advantage, and the free Step once per round. Verified live.
- **Redirection Stance and Whirlwind Kip:** stances with reaction offers.
- **Offensive Momentum:** the check, the movement, and Strike buttons that add the d4 precision dice.
- **Perfect Balance:** a tick row, plus disadvantage on Shove, Trip and Reposition used against you.
- **Vaulting Momentum:** its skill substitution.

## Known limitations and rulings wanted

- **Redirection Stance's Flat-Footed ends early** when the miss happens on the attacker's own turn. The core removes every Flat-Footed at the end of its owner's turn (`combat.mjs` `_onEndTurn`). This needs a ruling or a core change (audit §5).
- **GM-manual:**
  - Whirlwind Kip's +2 DB against opportunity attacks (B11-6).
  - Perfect Balance's terrain clause (B11-2).
- **Readings to confirm:** B11-1, B11-3, B11-4, B11-5 and B11-7 in the audit.

## Harness

- **`verify-block11`:** 186 checks, all green.
- **`mutate-block11`:** 75 mutations, all caught.
- **Every block re-pinned to 1.1.0 / 3.712.1.** All green except the pre-existing ones:
  - verify/mutate-block5 BLOCKED (no `book/it12.md`); run against the v1.4 text they are green, with 572 checks and 108 mutations
  - one mutate-block8 survivor (Root stacking)
