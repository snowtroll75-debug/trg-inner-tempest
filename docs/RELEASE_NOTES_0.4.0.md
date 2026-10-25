# Inner Tempest 0.4.0 — Block 3: the Disciple and the Mystic

22 October 2026.

Needs **TRG Prime 3.667.0**. Install that first: on an older system the module warns at start-up, and the new classes' rules do not work.

## What's new

**Two classes.** The **Disciple** and the **Mystic**, in a new Inner Tempest: Classes pack. Each has:
- its class table and fields from Chapter 3;
- its proficiencies (Monastic weapons included) and Chapter 6 wealth (−2 and −1);
- the Inner Discipline feat at 1st.

**The four Monastic Paths:** Devoted, Illuminator, Primal and Transcendent.
- Each class's Monastic Path ability chooses one with its Use button.
- The Path adds its class skill.
- It sets the tradition and ability of the Mystic's spells and of magical techniques.

**The five Mystical Disciplines.** Inner Flame, Dragon Soul, Still Mind, Starborn Flow and Thousand Reflections. Each brings:
- its special ability: Flame Within, Dragon's Pulse, Centred Awareness, Echoes Beyond or Echo Form;
- nine spells, arriving by level as innate spells with the Focus trait.

**Inner Discipline** brings three techniques: Disciplined Flurry, Burst Step and Guarded Centre. It also opens:
- the eleven Technique class feats (the feats with the Technique trait are gated behind it);
- Block 2's Evade, Wall Run, Resist Dying and Steel the Mind. Steel the Mind is now offered as a reaction before a Will save.

**The eleven Grimoire spells the disciplines grant** (ruling B3-1), in a new Inner Tempest: Spells pack. The other fourteen Grimoire spells come with Block 8.

## What each does

**Disciple**
- **Powerful Fists:**
  - Your Unarmed Strike rolls 1d6 and offers bludgeoning as well as subdual.
  - Every Strike that counts as unarmed (the fists, a gauntlet, or a weapon with the Monastic trait) adds +1 total damage per 3 BAB.
  - It counts as magical from BAB 3, cold iron and silver from BAB 8, and adamantine from BAB 16.
- **Disciple's Dodge:** your Wisdom is added to your DB as a dodge bonus while you wear no armour and are unencumbered. A shield does not stop it. Helmets, bracers and greaves are armour items, so they do.
- **Incredible Movement:** +10 ft status Speed from 4th level while you wear no armour; +15 ft at 10th and +20 ft at 16th.
- **Flurry of Blows (Use, 1 AP Flourish):**
  - two Strikes, each at your current multiple attack penalty;
  - a creature hit twice meets its DR on the first hit only;
  - after one critical injury, a later critical keeps its dice but rolls no injury.
- **Disciplined Flurry:** Flurry asks whether to add it when it is ready and you have a reaction. The third Strike takes no penalty but counts towards it afterwards (ruling B3-4).
- **Deep Focus:** every Focus technique has one more use, and a Refocus restores all of them.
- **Resolve:** +1 conviction.

**Mystic**
- **Alter the Thread:**
  - Offered to the defender's player once an attack roll against you is seen, before it resolves.
  - Works against Strikes and spell attacks, and against each ray of a volley.
  - Spending 1 conviction makes the attacker roll again, and the new roll stands (ruling B3-5).
  - Not offered on a Chaos result.
- **Mystical Power (Use):** a picker of your Path's spells.
  - It counts what you are owed: two cantrips and two base PP 2 spells at 1st, then one eligible spell (base PP no greater than your level) for each level after.
  - Your 1st-level PP 2 picks may be cast from 1st level (ruling B3-2).
- **Discipline spells** arrive as you reach their levels. They are cast with your Path's tradition and ability, and each may be cast up to base PP = your level + 1 (ruling B3-2).
- **Flame Within:** +1 to your attack checks each time you take damage, to +3. It resets when you end a turn in which you neither took nor dealt damage (ruling B3-3).
- **Dragon's Pulse:** offered after your melee Strike damages a creature. It deals your Wisdom (minimum 1, +1 at 6th, 12th and 18th) more of the Strike's type, with no DR again.
- **Centred Awareness, Echoes Beyond:** press Use before the check.
  - Centred Awareness's advantage is applied to the trance check.
  - Echoes Beyond's advantage is a tick on your next attack, save or skill check.
- **Guarded Centre, Echo Form:** offered when an attack targets you, beside your other reactions. They give +4 dodge, or Concealed, until your next turn.

**The Technique feats** each have a Use button that spends the AP, the reaction and the Focus use.
- **Inner Blast** rolls once and makes each target save against your Technique Save DC.
- **Inner Strike** adds 1d6 to every Strike this turn: 2d6 from 8th, 3d6 from 12th, 4d6 from 16th.
- **Inner Sight** gives Nightvision for 1 minute; 10 minutes from 8th; Darkvision from 12th.
- **Shadowy Stance** enters the system's stance: essence is offered on your Strikes, and Escape gets +2.
- **Bounding Step** reminds you of the 9th-level DC 25 Acrobatics check.
- **Abundant Step and Inner Rush** arm the token move.

## Not automated, said on the items

- Inner Mind's suspended fear: set the condition aside by hand.
- Bounding Step's landing at the end of each turn.
- Parts of six spells: Air Step, Aura of Heat, Burning Stride, Burst of Speed, Dragon Fear and Timeless Motion.
- Hand of Tide's destinations and Rise of the Phoenix's egg.
- Dragon's Pulse on a Focus technique's damage. It is offered on melee Strikes only.

## Fixed while building

- **Greater Mastery.** Three of the Technique feats print a GREATER MASTERY paragraph: Bounding Step, Inner Sight and Inner Strike. The first transcription missed all three. They are printed and built.
- **Aura of Heat had lost a sentence.** "(instead of the normal fatigued 1…) This resurgence only happens once per casting" is back.
- **The disciplines had shortened text.** Their flavour text, and the Mystical Disciplines rules ("the PP shown in the table is the spell's normal base PP value…"), are now printed in full. Each discipline prints its spell table as the book does.

## For Graham to confirm

These readings fill gaps; the Block 3 audit lists the rest, which stand.

1. **Mystical Power's two PP 2 spells** are taken from your Path's tradition. The book says "any two spells with a base PP of 2"; the cantrips and later picks name the tradition.
2. **"Wearing no armour"** counts any equipped armour item, helmets and bracers included, but not a shield.
3. **Centred Awareness and Echoes Beyond** are declared with Use before the check rather than asked on it.
4. **Flame Within's reset window** runs from the end of your previous turn, so damage taken on enemies' turns keeps it.
5. **Inner Discipline** carries the Technique trait but no Focus use. The feat itself is never used; its three techniques are.

## Checks

- **`verify-block3`, 1034 checks**, against `tools/content/book-text-block3.json`. That file is cut from the v1.2 docx by `tools/content/extract-book-block3.mjs`. The checks cover:
  - every paragraph each item prints is the book's;
  - every paragraph the book gives an item is printed, which catches truncation;
  - the class tables, wealth, traits, prerequisites, discipline tables and spell statistics;
  - every declaration, read by the system's own code;
  - every grant, resolved the way the system matches it;
  - the pure decisions, the registrations and the wiring.
- **`mutate-block3`:** 102 mutations, all caught.
- **Older harnesses** were re-anchored for the version and the new packs, without changing what they test. `verify-block1` 378 and `mutate-block1` 54, all caught. `verify-block2` 205 and `mutate-block2` 93, all caught.
- **Not yet tested live.**
