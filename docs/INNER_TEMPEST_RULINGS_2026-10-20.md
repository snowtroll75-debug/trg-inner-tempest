# Inner Tempest: rulings of 20 Oct 2026, and how each is built

**Sources:** Graham's *Inner Tempest Responses* document, and the book revised to **v1.2** (`TRG_Inner_Tempest_1_2.docx`; the index was not updated). I diffed v1.2 against v1.1 to confirm each change. "In v1.2" below means the change is in the document; "**not in v1.2**" means the response describes a change the document does not contain. In that case the ruling is built as stated.

## Critical

| ID | Ruling | Build |
|---|---|---|
| IT-C1 | Spirit Stance was missing from the book; its text has now been supplied. **In v1.2**, as a General feat with the Stance trait. | Built as a feat stance at the core default of 1 AP: +1 circumstance to AB and DB against spirits, incorporeal creatures and possessors; physical Strikes count as magical against them. |
| IT-C2 | A "Tianzhi Elements" text box sets each heritage's element and damage type: Fuukaze Wind (Electricity), Hikari Spirit (Essence), Kasai Flame (Fire), Suiryoku Water (Cold), Tsuchi Earth (Acid). **In v1.2** (text box). | Each heritage records its element and damage type. Element spell picks match the spell's trait (Air, Earth, Fire, Water). Hikari's "Spirit" matches Essence, Healing and Soul. |
| IT-C3 | Eligible means a spell from the Path's tradition with base PP ≤ Mystic level. Mystic Essence uses base PP ≤ level. **In v1.2.** | Picker filter, plus the core innate gate (D16). |
| IT-C4 | Any class ability with no stated level is gained at 1st, as in the core book. | All unstated abilities are granted at level 1. |
| IT-C5 | Breath damage is 1 die per level; the die type comes from the base block. The HP table now runs Tiny 10 to Colossal 250 (**in v1.2**). Wing and tail attacks use the core rules. Sweep goes on the dragon's tail attack (**footnote not in v1.2**). Earth dragons cannot fly (**not in v1.2**). Natural attack size is already core. | Core *Wings* and *Tail Slap* attacks at the companion's size, with the tail given Sweep. Earth dragon: no fly speed. **Fiends & Fables follow-up:** add Sweep to its 8 dragon tail attacks. |
| IT-C6 / C7 | No cap is needed, because innate casting already limits a spell's PP to the caster's level. | **Core 3.663.5 does not enforce that limit:** it refuses no innate cast whose base PP exceeds character level. Core D16 adds the gate. |
| IT-C8 | "Humanoid Form" becomes "Shape of the Humanoid" (**in v1.2**). Every non-casting class selects a tradition at 1st level. | Grant Shape Of The Humanoid. The tradition fallback is the character's selected tradition (the sheet's `magic.tradition`). |
| IT-C9 | Shugenja is for learned casters only. | Explicit gate: the class's caster style must be learned. |

## Major

| ID | Ruling | Build |
|---|---|---|
| IT-M1 | Ch4 Refocus now matches Ch7 and the core rulebook (**in v1.2**). | Core's existing ladder. |
| IT-M2 | "Restore all uses" applies only to extra uses from Deep Focus and Ghost Art Mastery. | `refocusRestoresAll`, set only by those two (D2). |
| IT-M3 | Flame Within loses the Focus trait (**in v1.2**). | Passive, stacking to +3. |
| IT-M4 | Inner Discipline's prerequisites are intended. | As printed. |
| IT-M5 | Technique DC for those abilities (**in v1.2**, for the Kensai forms and Stunning Fist). | Technique DC = 10 + magical ability + level. Inner Blast's "Technique Save DC" is the same thing. |
| IT-M6 | A fallback is wanted. **The sentence is not in v1.2.** | Path, otherwise the character's selected tradition and the class's magical ability. |
| IT-M7 | Flourish removed from Perfect Tempo, Weapon Discipline, Disciplined Follow-Through and Combat Form (**in v1.2**). | As ruled. |
| IT-M8 | Flourish limits Flow Strike to once per turn. | As ruled. |
| IT-M9 | Ember Reaver stays uncapped. | As printed. |
| IT-M10 | Black Lotus: the damage and critical are rolled now and applied at the start of the target's turn, so the Kensai can walk away. | A deferred-damage card that applies at the target's turn start. |
| IT-M11 | Form Reversal and Echoed Form bypass the normal Focus restriction. | As ruled. |
| IT-M12 | The Kensai feat is renamed **Echoed Form** (**in v1.2**). | Renamed. |
| IT-M13 | Bound Challenge: three sentences added (**in v1.2**). | As written. |
| IT-M14 | Shadowdancer grants **Shadowy Step** (**in v1.2**). | Grant the Inner Tempest feat. |
| IT-M15 | Aura of Heat's base damage is 1d10 (**in v1.2**). | Base 1d10; 5d10 per round as printed. |
| IT-M16 | Only one Phoenix egg; a new casting crumbles the old one (**in v1.2**). | As written. |
| IT-M17 | Disrupt Soul is Sustained (1 minute) (**in v1.2**). | As written. |
| IT-M18 | Burning Stride: Range 30 feet; Targets 1 living creature (**in v1.2**). | As written. |
| IT-M19 | Elemental Ward's duration is fixed, and the feat is renamed **Elemental Warding** (**in v1.2**). | Renamed; duration as ruled. |
| IT-M20 | Names now match core (**in v1.2**). Create is an action other skills can use with the right feats. | Core names. |
| IT-M21 | Explanation requested. | Sent: Impact Stance should read Impact Absorption, and Living Lantern is unnamed in the heritage. Built as "Impact Absorption" and "Living Lantern" pending a reply. |
| IT-M22 | All dragon HP reduced by 15 (**in v1.2**: 76, 82, 104, 85). | These match size base + level × (12 + Con). |
| IT-M23 | Withdrawn: core initiative is (Dex + Wis) × 5, so the blocks are correct. | Derived by core. |
| IT-M24, M25, M26 | All intended. | As printed. |
| IT-M27 | Parry deleted from the book; use the core trait (**in v1.2**). | Core Parry. |

## Minor and improvement

- **Corrected in v1.2, confirmed by the diff:** m1, m2, m3 (Grey Seeker keeps two skills), m4, m5 (Scree race only; Kabuto and Fortified Carapace still say "base natural DR"), m8, m10, m11 (a Chaos result can't be rerolled), m14, m16, m17, m18, m19, m20, m21, m22, m23, m25, m26, m27, m31, m32, m33, m34, m36, m37 (Water Bolt now 30 ft), m38, m39, I7 (weapon Centred I/II/III at L3/6/10, 350/1,400/6,000 gp).
- **No partial row means a partial counts as a failure** (m15, m24). This is a general rule.
- **m6:** the Tianzhi age row is in the appendix (Adult 20, Middle 50, Old 71–90, Venerable 91+), but the race entry still has no age line. With lifespan "Not stated", the Old and Venerable values don't follow the 50/70/85% rule. Build: age fields per the appendix row.
- **m7:** "any stance". **m9:** both minimums are warnings. **m29 and m30:** leave as printed.
- **m28:** the breath is renamed; the magic line still says "A cave dragon".
- **m41:** the Chapter 9 heading is still not styled as a chapter heading in v1.2.
- **I1–I6 and I8:** leave as printed. I2: Steel Viper's retroactive initiative is applied by hand when used. I4: Formless Cut is limited by Flourish.
