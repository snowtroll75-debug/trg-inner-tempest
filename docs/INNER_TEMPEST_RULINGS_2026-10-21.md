# Inner Tempest: rulings of 21 Oct 2026, and how each is built

**Source:** Graham's answers to the questions in the live-testing report for Inner Tempest 0.1.0 and the release notes for 0.1.0 and Fiends & Fables 0.45.1.

| Question | Ruling | Build |
|---|---|---|
| Spirit Stance against the incorporeal: strikes are magical, but the incorporeal resistance to all damage still halves them | **Yes**, as built. | No change. Ethereal Sight remains the feat that also ignores that resistance. |
| A Miraku with the Spirit Warrior background gains Spirit Lore twice | **Offer an alternative Lore.** | TRG Prime 3.665.0 `specialistAlternative`. Spirit Warrior and Spiritwalker (which also grants Spirit Lore) declare it. While the race supplies Spirit Lore, Apply Grants says so and the background's Use asks for another Lore. A non-Miraku is asked nothing. |
| The Tianzhi heritage language (IT-C2 named elements, not languages) | **Use the suggestions, with Thanatos for Hikari.** | Fuukaze Aeolian, Hikari Thanatos, Kasai Ignic, Suiryoku Aqualis, Tsuchi Gaian, as each heritage's own language. The race keeps Low Tongue and loses its open pick. |
| Tsuchi's advantage against Shove and Trip, which roll against a static DC | **Grant the check disadvantage.** | TRG Prime 3.665.0 defence row `kind: "disadvantage"`: a Shove Attack or Trip Attack against a Tsuchi is rolled at disadvantage, and the attacker's card says why. The Tsuchi's own advantage tick on its checks and saves is kept. |
| D1: Focus items with no use count | **Yes** (approved as a core change). | TRG Prime 3.665.0 `focusDefaultUses`, with a migration. |
| Fiends & Fables: do drakes get Sweep on their tails? | **No.** | Frost Drake and Earth Drake unchanged. |
| Fiends & Fables: the Cold and Cave Dragon Sovereigns' slashing tails | **No, leave as is.** | Unchanged. |

## Later the same day (after the 3.665.1 live test)

| Question | Ruling | Build |
|---|---|---|
| Start Block 2? | **Yes.** | Block 2: the Chapter 4 skill actions. |
| The multiple attack penalty outside combat: attack-trait actions kept counting with no turn to reset them | **Combat only.** | TRG Prime 3.666.0: an actor's attacks count towards, and take, the penalty only while it is a combatant in a started combat. Every reader and writer of the counter goes through one rule, and a combat clears every combatant's counter as it begins. |
| The Tianzhi race and the Elemental Guardian and Elemental Harmonist backgrounds all grant Elemental Lore | **Offer another Lore**, as for Spirit Lore. | The two backgrounds declare `specialistAlternative`, and the prompt names the duplicated Lore. |

## Later still (before the Block 2 live test)

| Question | Ruling | Build |
|---|---|---|
| Natural attacks (Unarmed Strike, Claw, Bite…) had to be equipped before a character could use them | **Always armed, and no hand taken.** | TRG Prime 3.666.0: a natural attack on a character, companion or familiar is read as equipped everywhere, worked out rather than stored, and the sheet shows a fixed fist in place of the equip button. A creature keeps its stored state, which its Change Shape forms switch; a form on a character still sets aside the strikes it lists. A fumble's "you drop it" passes a natural attack by. |
| Does a natural attack count as the "other weapon" for Double Slice and for Parry's "while another weapon is equipped"? | **Yes.** | As built in 3.666.0; pinned by `verify-natural-ready` E1–E2. |
| Fiends & Fables: the Stone, Clay, Flesh and Iron Golems' Slam is stored unequipped, and they have no other attack | **A data error: fix it.** | Fiends & Fables Prime 0.45.2: the four Slams are equipped. |
