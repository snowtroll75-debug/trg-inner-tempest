# Inner Tempest — Automation Report

_Generated from `tools/inventory/inventory.txt`. Nothing below has been implemented yet; this is the planned coverage, to be replaced feature by feature with tested results._

## Planned coverage

| Class | With core dependencies D1–D14 | Without them (module-only) |
|---|---|---|
| A | 236 | 193 |
| B | 135 | 133 |
| C | 18 | 56 |
| D | 17 | 24 |
| **Total** | 406 | 406 |

No feature is claimed as automated until its harness checks and live test pass. A feature that only posts its description to chat is class D, never A.

## Features below A/B, with the reason

- **SYS-09 Focus & magic detection rules** — D — rule text about detection; no game action to automate.
- **SYS-10 Chi terminology (no mechanics)** — D — setting terminology; the book states it has no mechanical value.
- **SYS-12 Monastic item creation via Meditation** — C — the Meditation substitution and gate are automated; the creation itself runs through core crafting, whose item-design step is GM-adjudicated.
- **H-08 Shinryu** — D — free movement across air between surfaces is a positioning rule; Foundry has no surface model to validate it.
- **H-11 Treasure Sense (Fuku)** — D — reveals GM-held information (precious metal nearby); the card prompts the GM.
- **GA-05 No Trace** — D — tracking difficulty and trail concealment are GM-run exploration rules.
- **GA-08 Spider Path** — C — Focus spend, AP and the card are automated; wall pathing isn't modelled by Foundry movement.
- **GA-13 Body of Mist** — C — Focus/AP, no-reactions and no-attack effect automated; passing through 1-inch gaps is a map judgement.
- **KF-01 Black Lotus** — C — the delay is a card-timing tool only; its mechanical payoff is undefined (IT-M10).
- **FR-07 Celestial Footing** — D — as Shinryu: unsupported-air positioning.
- **FR-14 Fateful Coincidence** — D — the book makes it a GM story boon.
- **FR-21 Hoardkeeper's Eye** — D — as Treasure Sense.
- **FR-24 Lantern Signal** — D — silent signalling is roleplay.
- **FR-30 Perfected Form** — C — Fluid Form's advantage carries over automatically; whether the target is a valid Studied Target is checked against core's study flag, the likeness itself is narrative.
- **FR-32 Purifying Touch** — D — purifying water is narrative; the +2 Nature conditional is offered.
- **FR-46 Wind-Borne Motion** — C — Focus/AP automated; crossing liquids and gaps is positioning.
- **FC-04 Between Glances** — D — 'cross open ground without becoming observed' is a GM stealth judgement.
- **FC-09 Dancing Leaf** — C — the +5 ft is shown on jump results; 'adjacent to a wall while falling' is a map judgement.
- **FC-49 Solitary Supremacy** — C — the module suppresses Aid bonuses it can see from allies' declared Aid actions; reactions and abilities from third parties aren't all tagged by source.
- **FC-53 Walk the Empty Space** — D — as Between Glances.
- **FG-02 Artisan's Enchantment** — C — the -2 is applied in the Create dialog; choosing the quality is a GM call.
- **FG-03 Artistic Diversity** — C — the Very Hard note is shown; unlearned Artistry specialties aren't modelled as separate skills.
- **FG-08 Contortionist** — C — the crit-at-full-speed rider is shown; Squeeze time is narrative.
- **FG-21 Veiled Essence** — C — the feat flag lets the Ambush/Sniping actions accept spells; whether the attack qualifies is checked, the stealth situation is GM-run.
- **DC-08 Sweep (dragon attack)** — D — undefined in the book (IT-C5).
- **DC-09 Wings / Tail natural attacks** — D — profiles not given (IT-C5).
- **DC-15 Tail Lash** — C — the reaction is offered; its tail attack profile is undefined (IT-C5).
- **SP-03 Age Resistance** — C — suppresses aging penalties only where the optional aging macro is used.
- **SP-05 Arrows Flight** — C — range doubling is written to the ammunition; Foundry has no per-projectile range state, so the card reminds.
- **SP-13 False Future** — D — divination misdirection is GM-adjudicated.
- **SP-15 Foretell Failure** — C — the card computes whether a roll of 10 would succeed for checks the system can pre-evaluate; for others it prompts.
- **SP-18 Rise of the Phoenix** — C — the egg item and death prompt are automated; resurrection placement is a GM act.
- **SP-21 Skyborne Pathways** — D — revealing tracks is GM information.
- **AP-01 Character aging (categories, modifiers, lifespans)** — C — optional macro sets age-category modifiers; birthdays and lifespans are campaign facts the GM enters.
- **AP-02 Racial age table (core + new races)** — D — reference table.

## Features whose class depends on a core change

| ID | Feature | With core | Without | Dependency |
|---|---|---|---|---|
| SYS-01 | Focus trait (ready/expended, individual tracking) | A | C | D1 |
| SYS-03 | Additional uses restored together | A | C | D2 |
| SYS-04 | Innate spells: 0 PP, max warp, CL = level, attack = ability + level, DC = 10 + ability + level | A | C | D5 |
| RA-08 | Martial Affinity (Tianzhi) | A | B | D7 |
| RA-09 | Natural Chi (Tianzhi) | B | C | D5 |
| H-01 | Kitsune | A | C | D5 |
| H-03 | Impact Absorption (Mujina) | B | C | D8 |
| CL-07 | Class "Magical Tradition" choice (Ghostwalker Wis, Kensai Int, Oathblade Cha) | B | C | D5 |
| CF-D1 | Powerful Fists | A | C | D12 |
| CF-D2 | Disciple's Dodge | A | B | D9 |
| CF-D6 | Deep Focus | A | C | D1 |
| CF-D8 | Incredible Movement | A | B | D9 |
| GA-09 | Falling Shadow | B | C | D8 |
| GA-11 | Shadow Double | B | C | D8 |
| CF-K1 | Combat Form (activation) | A | B | D7 |
| CF-K3 | Considered Mind | A | B | D3 |
| MD-05a | Echo Form (Thousand Reflections) | B | C | D8 |
| CF-O3 | Unwavering Purpose | A | B | D3 |
| SA-01 | Evade (Acrobatics) | B | C | D8 |
| SA-03 | Root the Body (Athletics) | B | C | D8 |
| SA-11 | Steel the Mind (Mental Focus) | B | C | D8 |
| FR-04 | Bear's Endurance | B | C | D8 |
| FR-19 | Guardian's Intercession | B | C | D8 |
| FR-39 | Tianzhi Discipline | A | C | D4 |
| FA-01 | Brawler | A | C | D12 |
| FA-02 | Dragon Tamer | B | D | D10 |
| FA-03 | Formbinder | A | B | D7 |
| FA-15 | Soul Weapon Master | B | C | D11, D12 |
| FA-21 | Zen Archer | B | C | D11 |
| FC-05 | Blended Form | A | B | D7 |
| FC-08 | Crane Stance | A | B | D7 |
| FC-10 | Deflect Arrow | B | C | D8 |
| FC-13 | Dragon Stance | A | B | D7 |
| FC-14 | Drunken Stance | A | B | D7 |
| FC-23 | Formless Cut | A | C | D14 |
| FC-24 | Ghost Art Mastery | A | C | D1 |
| FC-28c | Guarded Centre | B | C | D8 |
| FC-36 | Mantis Stance | A | B | D7 |
| FC-37 | Monkey Stance | A | B | D7 |
| FC-43 | Shadowy Stance | A | B | D7 |
| FC-51 | Tiger Stance | A | B | D7 |
| FC-54 | Wolf Stance | A | B | D7 |
| FG-07 | Centred Recovery | A | C | D4 |
| FG-20 | Tranquil Mind | A | B | D7 |
| DC-01 | Acquiring a dragon (egg + 28-day bonding) | B | C | D14 |
| DC-02 | Dragon Companion class/progression | A | D | D10 |
| DC-03 | Cold Dragon (base) | A | D | D10 |
| DC-04 | Earth Dragon (base) | A | D | D10 |
| DC-05 | Fire Dragon (base) | A | D | D10 |
| DC-06 | Light Dragon (base) | A | D | D10 |
| DC-07 | Companion specials (Crush, Draconic Assault, Draconic Shifting, elemental Aura/Blood/Strikes, Frightful Aura, Reflective Scales, Scorching/Slowing Breath, Snowvision, Spell Resilience, Wild Stride, Wing Buffet, Ice Climb, Smokevision, Flyby Attack) | A | D | D10 |
| DC-12 | Deflecting Wings | B | C | D8 |
| WP-08 | Nunchaku | A | C | D13 |
| WP-10 | Tonfa | A | C | D13 |
| WP-11 | Butterfly Sword | A | C | D13 |
| WP-14 | Nodachi | A | C | D13 |
| WT-01 | Monastic (weapon trait) | A | C | D11 |
| WT-02 | Backswing | A | C | D13 |
| WT-03 | Brace | A | C | D13 |
| WT-05 | Twin | A | C | D13 |
| SP-17 | Reflective Mind | B | C | D8 |
| SP-20 | Serene Defence | A | B | D7 |
| SP-24 | Tranquil Mastery | B | C | D4 |

