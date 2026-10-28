#!/usr/bin/env node
/**
 * mutate-block3 — the mutation half of verify-block3. Each mutation breaks
 * one printed rule, one ruling, one declaration the system reads or one
 * wire of Block 3; verify-block3 must fail on every one. Files are restored
 * after each run, and on any exit.
 *
 *   TRG_PRIME_ROOT=../core/trg-prime node tools/mutate-block3.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const f = (...p) => path.join(ROOT, ...p);
const C = f("tools", "content", "block3.mjs"), A = f("module", "block3-automations.mjs");
const REG = f("module", "registration.mjs"), SCRIPT = f("scripts", "inner-tempest.mjs"), MANIFEST = f("module.json");
const AUTO = f("module", "automations.mjs");

const MUTATIONS = [
  // A — the book: text, tables, fields
  { name: "Powerful Fists loses its last paragraph", file: C, from: " When your BAB reaches 3, your strikes class as magical. When your BAB reaches 8 your unarmed strikes are treated as cold iron and silver and at BAB 16 they are treated as adamantine.\",", to: "\"," },
  { name: "Disciple's Dodge forgets encumbrance", file: C, from: "This bonus is only applied if you are unencumbered and wearing no armour.\",", to: "This bonus is only applied if you are wearing no armour.\"," },
  { name: "Flurry of Blows' critical-injury paragraph is dropped", file: C, from: "\\n\\nBe aware that you may only inflict one critical injury when using this ability, although you still gain additional critical damage from both strikes.\",", to: "\"," },
  { name: "an invented sentence in Deep Focus", file: C, from: "Each technique tracks its uses separately. When", to: "Each technique tracks its uses separately and recovers on a short rest. When" },
  { name: "Mystical Power's eligible spell is level + 1 again (v1.1)", file: C, from: "Be aware that an eligible spell is one from your Monastic Path's tradition whose base PP is no greater than your Mystic level.\\n\\nYou also gain", to: "Be aware that an eligible spell is one from your Monastic Path's tradition whose base PP is no greater than your Mystic level +1.\\n\\nYou also gain" },
  { name: "Inner Flame's second flavour paragraph is lost (a truncation)", file: C, from: "\\n\\nMystics of the Inner Flame walk a dangerous edge between power and destruction, learning to burn away weakness and hesitation. In battle, they become living infernos, radiating heat, energy, and relentless force. In stillness, their hearts smoulder with a deep, controlled intensity.\"", to: "\"" },
  { name: "Aura of Heat's once-per-casting is dropped again", file: C, from: " This resurgence only happens once per casting.\\n\\n**Warping Options**", to: "\\n\\n**Warping Options**" },
  { name: "the Devoted's Chapter 7 line says divinity magic", file: C, from: "recall: \"Religion is used for Recall Knowledge and other checks concerning the path's divine magic.\"", to: "recall: \"Religion is used for Recall Knowledge and other checks concerning the path's divinity magic.\"" },
  { name: "the Illuminator's ability is Wisdom", file: C, from: "Illuminator: { tradition: \"ethereal\", ability: \"charisma\"", to: "Illuminator: { tradition: \"ethereal\", ability: \"wisdom\"" },
  { name: "the Primal's skill is Survival", file: C, from: "Primal: { tradition: \"verdant\", ability: \"constitution\", skill: \"Nature\", recall: \"Nature", to: "Primal: { tradition: \"verdant\", ability: \"constitution\", skill: \"Survival\", recall: \"Nature" },
  { name: "the Disciple's 3rd-level Reflex is 7", file: C, from: "[3, 3, 5, 8, 5, 2], [4, 4, 6, 9, 6, 2]", to: "[3, 3, 5, 7, 5, 2], [4, 4, 6, 9, 6, 2]" },
  { name: "the Mystic's 20th-level BAB is 20", file: C, from: "[15, 15, 22, 22, 25, 7]\n];", to: "[20, 15, 22, 22, 25, 7]\n];" },
  { name: "the Disciple has 8 skill points", file: C, from: "    hitPoints: 10,\n    skillPoints: 6,", to: "    hitPoints: 10,\n    skillPoints: 8," },
  { name: "the Mystic's wealth is 0", file: C, from: "    wealth: \"-1\",", to: "    wealth: \"0\"," },
  { name: "the Mystic gains Stealth", file: C, from: "Mental Focus, Perception, Power Manipulation, Sense Motive\",", to: "Mental Focus, Perception, Power Manipulation, Sense Motive, Stealth\"," },
  { name: "the Disciple's bonus feats name the Adept", file: C, from: "match the appropriate class trait (Martial or Disciple).\",", to: "match the appropriate class trait (Adept or Disciple).\"," },
  { name: "Incredible Movement arrives at 1st", file: C, from: "1: Monastic Path, 4: Incredible Movement\"", to: "1: Monastic Path, 1: Incredible Movement\"" },
  { name: "the Mystic loses Mystical Resolve", file: C, from: "1: Mystical Power, 1: Mystical Resolve, 1: Monastic Path\"", to: "1: Mystical Power, 1: Monastic Path\"" },
  { name: "Inner Flame's 9th-level spell is Fireball", file: C, from: "[9, \"Burning Stride\"], [11, \"Rise of the Phoenix\"]", to: "[9, \"Fireball\"], [11, \"Rise of the Phoenix\"]" },
  { name: "Still Mind's printed table loses its asterisk", file: C, from: "[3, \"Reflective Mind* (4)\"]", to: "[3, \"Reflective Mind (4)\"]" },
  { name: "Dragon Soul's Fly arrives at 7th", file: C, from: "[5, \"Fly\"], [7, \"Dragon Fear\"]", to: "[7, \"Fly\"], [7, \"Dragon Fear\"]" },
  { name: "the disciplines lose the +1 allowance", file: C, from: "flags: { grantInnate: true, itPathMagic: { allowance: 1 } }", to: "flags: { grantInnate: true, itPathMagic: { allowance: 0 } }" },
  { name: "Echo Form loses the Shadow trait", file: C, from: "traits: \"Focus, Shadow, Technique\"", to: "traits: \"Focus, Technique\"" },
  { name: "Inner Discipline carries Focus", file: C, from: "name: \"Inner Discipline\", category: CLASS, traits: \"Technique\",", to: "name: \"Inner Discipline\", category: CLASS, traits: \"Focus, Technique\"," },
  { name: "Inner Discipline loses its mentor", file: C, from: "prerequisites: \"Wis 4, Mental Focus 10 ranks. Special: you must have trained with an appropriate mentor (GM discretion).\",", to: "prerequisites: \"Wis 4, Mental Focus 10 ranks\"," },
  { name: "Abundant Step at Level 5", file: C, from: "prerequisites: \"Inner Discipline, Level 8\",", to: "prerequisites: \"Inner Discipline, Level 5\"," },
  { name: "Inner Mind is not a Disciple feat", file: C, from: "traits: \"Disciple, Focus, Mystic, Technique\"", to: "traits: \"Focus, Mystic, Technique\"" },
  { name: "Air Step costs 2 PP", file: C, from: "name: \"Air Step\", tradition: \"divinity, verdant\", ppCost: 4,", to: "name: \"Air Step\", tradition: \"divinity, verdant\", ppCost: 2," },
  { name: "Aura of Heat needs speech", file: C, from: "    components: { somatic: true, verbal: false, material: false, focus: false },\n    effects: [\n      { kind: \"defence\"", to: "    components: SC,\n    effects: [\n      { kind: \"defence\"" },
  { name: "Burning Stride is a basic save", file: C, from: "targets: \"1 living creature\", duration: \"10 minutes\", defence: \"Fortitude\",", to: "targets: \"1 living creature\", duration: \"10 minutes\", defence: \"Basic Fortitude\"," },
  { name: "Dragon Fear is arcane only", file: C, from: "name: \"Dragon Fear\", tradition: \"arcane, divinity, ethereal, verdant\",", to: "name: \"Dragon Fear\", tradition: \"arcane\"," },
  { name: "Reflective Mind takes 1 AP", file: C, from: "ppCost: 4, castAP: \"Reaction\", traits: \"Warding\"", to: "ppCost: 4, castAP: 1, traits: \"Warding\"" },
  { name: "Serene Defence carries Utility as a trait", file: C, from: "duration: \"Sustained (1 minute)\", traits: \"Stance, Warding\"", to: "duration: \"Sustained (1 minute)\", traits: \"Stance, Utility, Warding\"" },
  { name: "Hand of Tide needs no material", file: C, from: "    components: { somatic: true, verbal: true, material: true, focus: false },", to: "    components: SC," },
  { name: "Breath of the Dragon deals d6s", file: C, from: "baseDamage: \"1d8\", damage: { formula: \"8d8\", type: \"fire\" },", to: "baseDamage: \"1d6\", damage: { formula: \"8d8\", type: \"fire\" }," },
  // B — the declarations the system reads
  { name: "Powerful Fists rolls 1d8", file: C, from: "unarmedDamage: { die: \"1d6\", versatile: \"B\"", to: "unarmedDamage: { die: \"1d8\", versatile: \"B\"" },
  { name: "Powerful Fists' bonus every 4 BAB", file: C, from: "perBAB: { every: 3, value: 1 }", to: "perBAB: { every: 4, value: 1 }" },
  { name: "Powerful Fists is adamantine at 8", file: C, from: "silver: 8, adamantine: 16 }", to: "silver: 8, adamantine: 8 }" },
  { name: "Disciple's Dodge in armour", file: C, from: "ability: \"wisdom\", when: { unarmoured: true, unencumbered: true }, label: \"Disciple's Dodge\"", to: "ability: \"wisdom\", when: { unencumbered: true }, label: \"Disciple's Dodge\"" },
  { name: "Disciple's Dodge is untyped", file: C, from: "target: \"defence\", type: \"dodge\", ability: \"wisdom\", when:", to: "target: \"defence\", type: \"untyped\", ability: \"wisdom\", when:" },
  { name: "Incredible Movement +20 at 10th", file: C, from: "{ level: 10, value: 15 }", to: "{ level: 10, value: 20 }" },
  { name: "Incredible Movement needs no unarmoured body", file: C, from: "{ level: 16, value: 20 }], when: { unarmoured: true }, label", to: "{ level: 16, value: 20 }], label" },
  { name: "Disciple's Resolve gives nothing", file: C, from: "\"+1 to your conviction pool and points.\"),\n    flags: { convictionPool: 1 }\n  }),\n  classAbility({\n    name: \"Flurry of Blows\"", to: "\"+1 to your conviction pool and points.\"),\n    flags: {}\n  }),\n  classAbility({\n    name: \"Flurry of Blows\"" },
  { name: "Deep Focus reaches every Focus ability", file: C, from: "focusExtraUses: [{ value: 1, traits: [\"technique\"], restoresAll: true", to: "focusExtraUses: [{ value: 1, traits: [\"focus\"], restoresAll: true" },
  { name: "Deep Focus restores one use", file: C, from: "traits: [\"technique\"], restoresAll: true, label: \"Deep Focus\"", to: "traits: [\"technique\"], restoresAll: false, label: \"Deep Focus\"" },
  { name: "Alter the Thread declares nothing", file: C, from: "flags: { attackRerollConviction: { label: \"Alter the Thread\" } }", to: "flags: {}" },
  { name: "Reflective Mind reaches every save", file: C, from: "when: { checkTypes: [\"save\"], traits: [\"mental\"] } }] },", to: "when: { checkTypes: [\"save\"] } }] }," },
  { name: "Reflective Mind lasts the round", file: C, from: "auto: true, oneShot: true, when: { checkTypes: [\"save\"], traits: [\"mental\"] }", to: "auto: true, when: { checkTypes: [\"save\"], traits: [\"mental\"] }" },
  { name: "Serene Defence adds Charisma", file: C, from: "statBonuses: [{ target: \"defence\", type: \"dodge\", ability: \"wisdom\", label: \"Serene Defence\" }]", to: "statBonuses: [{ target: \"defence\", type: \"dodge\", ability: \"charisma\", label: \"Serene Defence\" }]" },
  { name: "Steel the Mind reaches Fortitude", file: C, from: "saves: [\"will\"], traits: [\"emotion\", \"mental\"], type: \"circumstance\" }", to: "saves: [\"will\", \"fortitude\"], traits: [\"emotion\", \"mental\"], type: \"circumstance\" }" },
  { name: "a spell effect of a kind the system does not apply", file: C, from: "{ kind: \"condition\", target: \"self\", condition: \"quickened\", value: 1 },", to: "{ kind: \"quicken\", target: \"self\", condition: \"quickened\", value: 1 }," },
  { name: "Flame Within's bonus is status", file: A, from: "return { kind: \"modifier\", value: stacks, type: \"circumstance\", label: \"Flame Within\"", to: "return { kind: \"modifier\", value: stacks, type: \"status\", label: \"Flame Within\"" },
  { name: "Inner Strike's rider is spent on the first Strike", file: A, from: "scope: \"any\", label: \"Inner Strike\", once: false }", to: "scope: \"any\", label: \"Inner Strike\", once: true }" },
  { name: "Inner Strike's +1 reaches missiles", file: A, from: "when: { checkTypes: [\"attack\"], attackModes: [\"melee\"], attackForms: [\"unarmed\"] } }],", to: "when: { checkTypes: [\"attack\"], attackForms: [\"unarmed\"] } }]," },
  { name: "Shadowy Stance's essence reaches only the fists", file: A, from: "strikeTypeOption: { type: \"essence\", label: \"Shadowy Stance\", scope: [\"any\"] },", to: "strikeTypeOption: { type: \"essence\", label: \"Shadowy Stance\", scope: [\"unarmed\"] }," },
  { name: "Shadowy Stance's Escape bonus reaches every skill", file: A, from: "scope: \"Escape checks\", auto: true, when: { actions: [\"escape\"] } }]", to: "scope: \"Escape checks\", auto: true, when: { checkTypes: [\"skill\"] } }]" },
  { name: "Inner Strike's dice never grow", file: A, from: "  return `${1 + [8, 12, 16].filter((at) => lvl >= at).length}d6`;", to: "  return \"1d6\";" },
  { name: "Inner Strike grows from 9th", file: A, from: "[8, 12, 16].filter((at) => lvl >= at)", to: "[9, 12, 16].filter((at) => lvl >= at)" },
  { name: "the rider ignores the level", file: A, from: "    strikeRider: { dice: innerStrikeDice(level), damageType: type,", to: "    strikeRider: { dice: \"1d6\", damageType: type," },
  { name: "Inner Sight stays 1 minute", file: A, from: "  return { seconds: lvl >= 8 ? 600 : 60, sense:", to: "  return { seconds: 60, sense:" },
  { name: "Inner Sight never gives Darkvision", file: A, from: "sense: lvl >= 12 ? \"Darkvision\" : \"Nightvision\" };", to: "sense: \"Nightvision\" };" },
  { name: "Inner Sight loses its Greater Mastery text", file: C, from: "\\n\\n**GREATER MASTERY** At 8th level, the duration increases to 10 minutes.", to: "" },
  { name: "Bounding Step loses its Greater Mastery", file: C, from: "\\n\\n**GREATER MASTERY** At 9th level, at the end of your turn you may attempt a DC 25 Acrobatics check to remain in the air. On a success, you do not fall that turn.", to: "" },
  { name: "Inner Strike's maximum is 5d6", file: C, from: "to a maximum of 4d6.\",", to: "to a maximum of 5d6.\"," },
  // C — resolution
  { name: "the Mystic's Monastic Path is stamped as the Disciple's", file: C, from: "  classAbility({\n    name: \"Monastic Path\", sourceClass: MYSTIC,", to: "  classAbility({\n    name: \"Monastic Path\", sourceClass: DISCIPLE," },
  { name: "Starborn Flow grants a spell that does not exist", file: C, from: "[13, \"Elude Time\"]", to: "[13, \"Elude Thyme\"]" },
  { name: "Thousand Reflections grants an ability that does not exist", file: C, from: "\"Thousand Reflections\": { ability: \"Echo Form (Thousand Reflections)\"", to: "\"Thousand Reflections\": { ability: \"Echo Form\"" },
  // D — the pure decisions
  { name: "the Technique Save DC forgets the level", file: A, from: "  return 10 + Math.trunc(Number(abilityScore) || 0) + Math.max(0, Math.trunc(Number(level) || 0));", to: "  return 10 + Math.trunc(Number(abilityScore) || 0);" },
  { name: "a technique without a Path uses Charisma", file: A, from: "  return ABILITY_KEYS.includes(cast) ? cast : \"wisdom\";", to: "  return ABILITY_KEYS.includes(cast) ? cast : \"charisma\";" },
  { name: "the Path wins over nothing: casting ability first", file: A, from: "  const path = pathOf(items);\n  if (path) return path.ability;\n  const cast", to: "  const path = null;\n  if (path) return path.ability;\n  const cast" },
  { name: "Dragon's Pulse has no minimum", file: A, from: "  return Math.max(1, Math.trunc(Number(wisdom) || 0)) + Math.floor(", to: "  return Math.trunc(Number(wisdom) || 0) + Math.floor(" },
  { name: "Dragon's Pulse rises every 5 levels", file: A, from: "Math.trunc(Number(level) || 0)) / 6);", to: "Math.trunc(Number(level) || 0)) / 5);" },
  { name: "Flame Within stacks to +4", file: A, from: "  return Math.min(3, Math.max(0, Math.trunc(Number(current) || 0)) + 1);", to: "  return Math.min(4, Math.max(0, Math.trunc(Number(current) || 0)) + 1);" },
  { name: "Flame Within resets though damage was dealt (B3-3)", file: A, from: "  return !(Number(record?.took) > 0) && !(Number(record?.dealt) > 0);", to: "  return !(Number(record?.took) > 0);" },
  { name: "Mystical Power owes an eligible spell at 1st", file: A, from: "    eligible: Math.max(0, (lvl - 1) - count(\"eligible\"))", to: "    eligible: Math.max(0, lvl - count(\"eligible\"))" },
  { name: "Guidance counts as a cantrip", file: A, from: "  const cantrip = pp === 0 && /\\bcantrip\\b/i.test(String(spellSystem?.traits ?? \"\"));", to: "  const cantrip = pp === 0;" },
  { name: "any tradition will do", file: A, from: "  if (!want || !(traditions.includes(want) || traditions.includes(\"all\"))) return false;", to: "  if (!want) return false;" },
  { name: "an eligible spell may be a level above", file: A, from: "  if (slot === \"eligible\") return pp <= Math.max(0, Math.trunc(Number(level) || 0));", to: "  if (slot === \"eligible\") return pp <= Math.max(0, Math.trunc(Number(level) || 0)) + 1;" },
  { name: "the stamp casts with the wrong ability flag", file: A, from: "    [`flags.${SYSTEM_ID}.castingAbilityOverride`]: path.ability,", to: "    [`flags.${SYSTEM_ID}.castingAbility`]: path.ability," },
  { name: "the stamp always grants the allowance", file: A, from: "  if (Math.trunc(Number(allowance) || 0) > 0) stamp[`flags.${SYSTEM_ID}.innatePPAllowance`] = Math.trunc(Number(allowance));", to: "  stamp[`flags.${SYSTEM_ID}.innatePPAllowance`] = Math.max(1, Math.trunc(Number(allowance) || 0));" },
  { name: "a claw counts for the Flurry", file: A, from: "  const fists = Boolean(s.natural) && norm(s.category) === \"unarmed\" && norm(s.damageType) === \"subdual\";\n  return fists", to: "  const fists = Boolean(s.natural) && norm(s.category) === \"unarmed\";\n  return fists" },
  { name: "a Monastic weapon does not count for the Flurry", file: A, from: "  return fists || s.unarmed === true || /\\bmonastic\\b/i.test(String(s.traits ?? \"\"));", to: "  return fists || s.unarmed === true;" },
  // E — registration
  { name: "the classes are never registered", file: REG, from: "  for (const [name, spec] of Object.entries(CLASS_REGISTRATIONS)) api.registerClass(name, spec, moduleId);\n", to: "" },
  { name: "the Technique gate is never registered", file: REG, from: "  for (const [trait, feats] of Object.entries(FEAT_GATES)) api.registerFeatGate(trait, feats, moduleId);\n", to: "" },
  { name: "the traits are never registered", file: REG, from: "  api.registerTraits?.(TRAITS, moduleId);\n", to: "" },
  { name: "the Block 3 Uses are never registered", file: REG, from: "  for (const [name, entry] of Object.entries(BLOCK3_AUTOMATIONS)) api.registerFeatAutomation(name, entry, moduleId);\n", to: "" },
  { name: "Guarded Centre and Echo Form are never offered", file: REG, from: "  for (const [name, spec] of Object.entries(BLOCK3_DEFENCE_OFFERS)) api.registerDefenceOffer?.(name, spec, moduleId);\n", to: "" },
  { name: "the Disciple's wealth is -1", file: REG, from: "  Disciple: {\n    wealth: -2,", to: "  Disciple: {\n    wealth: -1," },
  // Re-anchored at 0.5.0: the Ghostwalker's armour line is the same.
  { name: "the Mystic wears no armour", file: REG, from: "      label: \"Mystic\",\n      armourCategories: [\"Light\"], armourNames: [], otherTiers: [\"light\"], armourExclude: [],", to: "      label: \"Mystic\",\n      armourCategories: [], armourNames: [], otherTiers: [], armourExclude: []," },
  { name: "the Disciple cannot use Monastic weapons", file: REG, from: "      weaponRules: [{ kind: \"trait\", value: \"Monastic\", why: \"any weapons that have the monastic trait\" }],", to: "      weaponRules: []," },
  { name: "Inner Discipline opens nothing", file: REG, from: "export const FEAT_GATES = { Technique: [\"Inner Discipline\"] };", to: "export const FEAT_GATES = { Technique: [\"Inner Infusion\"] };" },
  { name: "Guarded Centre is offered only against a Strike", file: A, from: "  \"Guarded Centre\": {\n    summary: \"+4 dodge to your DB until the start of your next turn (spends your reaction and its Focus use).\",\n    against: \"attack\",", to: "  \"Guarded Centre\": {\n    summary: \"+4 dodge to your DB until the start of your next turn (spends your reaction and its Focus use).\",\n    against: \"weapon\"," },
  { name: "Inner Sight has no Use", file: A, from: "  \"inner sight\": innerSight,\n", to: "" },
  { name: "a Use for an item the module does not ship", file: A, from: "  \"shadowy stance\": shadowyStance\n", to: "  \"shadowy stance\": shadowyStance,\n  \"shadow step\": shadowyStance\n" },
  // Found live in 0.4.0, fixed in 0.4.1
  { name: "Inner Strike's card has no type buttons", file: A, from: "      flags: { [MODULE_ID]: { innerStrike: { actorUuid: actor.uuid } } }\n", to: "\n" },
  { name: "changing the type spends the use again", file: A, from: "  const dice = innerStrikeDice(actor.system?.identity?.level);\n  await effect.update({", to: "  const dice = innerStrikeDice(actor.system?.identity?.level);\n  await spendUse(effect, \"Inner Strike\");\n  await effect.update({" },
  { name: "the type press changes nothing", file: A, from: "    [`flags.${SYSTEM_ID}.strikeRider.damageType`]: type,\n", to: "\n" },
  { name: "the buttons are never bound", file: AUTO, from: "        else if (kind === \"innerStrikeType\") {", to: "        else if (kind === \"innerStrikeTypes\") {" },
  { name: "Burst Step's card adds ten again", file: A, from: "(now ${landSpeed(actor)} ft)", to: "(now ${landSpeed(actor) + 10} ft)" },
  // Found live in 0.4.1, fixed in 0.4.2
  { name: "THE LIVE DEFECT: Inner Strike's +1 is a tick-box again", file: A, from: "scope: \"Unarmed attack rolls (your fists, a gauntlet or a Monastic weapon)\", auto: true,", to: "scope: \"Unarmed attack rolls (your fists, a gauntlet or a Monastic weapon)\", auto: false," },
  { name: "Inner Strike's +1 reaches a sword", file: A, from: "attackModes: [\"melee\"], attackForms: [\"unarmed\"] } }],", to: "attackModes: [\"melee\"] } }]," },
  { name: "the card still says the +1 is ticked", file: A, from: "to unarmed attack rolls (applied on the roll) and", to: "to unarmed attack rolls (ticked on the roll) and" },
  { name: "Shadowy Stance's minute is not said", file: A, from: "      extraLines: [h().line(\"<em>Shadowy Stance lasts 1 minute, then ends by itself.</em>\")],\n", to: "" },
  // F — wiring and versions
  { name: "damage is never heard", file: SCRIPT, from: "Hooks.on(\"trgPrimeDamageApplied\", (ctx) => { onDamageApplied(ctx)", to: "Hooks.on(\"trgPrimeDamageDealt\", (ctx) => { onDamageApplied(ctx)" },
  { name: "Flame Within never resets", file: SCRIPT, from: "Hooks.on(\"trgPrimeTurnEnded\", (ctx) => { onTurnEndedFlame(ctx)", to: "Hooks.on(\"trgPrimeTurnStarted\", (ctx) => { onTurnEndedFlame(ctx)" },
  { name: "granted spells are never stamped", file: SCRIPT, from: "Hooks.on(\"preCreateItem\", (document, data) => { try { onPreCreateSpell(document, data); }", to: "Hooks.on(\"createItem\", (document, data) => { try { onPreCreateSpell(document, data); }" },
  { name: "a Path chosen later stamps nothing", file: SCRIPT, from: "Hooks.on(\"createItem\", (item) => { onPathCreated(item)", to: "Hooks.on(\"updateItem\", (item) => { onPathCreated(item)" },
  { name: "the GM relay is never registered", file: SCRIPT, from: "  registerBlock3Socket();\n", to: "" },
  { name: "the module accepts 3.667.4", file: SCRIPT, from: "const REQUIRED_SYSTEM = \"3.674.1\";", to: "const REQUIRED_SYSTEM = \"3.667.4\";" },
  { name: "the manifest accepts 3.667.4", file: MANIFEST, from: "\"minimum\": \"3.674.1\"", to: "\"minimum\": \"3.667.4\"" },
  { name: "the Flurry calls a helper the system does not offer", file: A, from: "await h().runStrikeSeries(actor, strikes,", to: "await h().runStrikes(actor, strikes," }
];

const originals = new Map();
for (const m of MUTATIONS) if (!originals.has(m.file)) originals.set(m.file, fs.readFileSync(m.file, "utf8"));
const restore = () => { for (const [file, text] of originals) fs.writeFileSync(file, text); };
process.on("SIGINT", () => { restore(); process.exit(130); });
process.on("SIGTERM", () => { restore(); process.exit(143); });

function run() {
  try { execFileSync(process.execPath, [f("tools", "verify-block3.mjs")], { stdio: ["ignore", "pipe", "pipe"], env: process.env }); return true; }
  catch { return false; }
}

const results = [];
try {
  if (!run()) { console.error("mutate-block3: verify-block3 already fails on an unmodified tree."); process.exit(2); }
  for (const m of MUTATIONS) {
    const original = originals.get(m.file);
    const n = original.split(m.from).length - 1;
    if (n !== 1) { results.push({ name: m.name, state: n ? `ANCHOR AMBIGUOUS (${n})` : "ANCHOR MISSING" }); continue; }
    fs.writeFileSync(m.file, original.replace(m.from, m.to));
    const survived = run();
    fs.writeFileSync(m.file, original);
    results.push({ name: m.name, state: survived ? "SURVIVED" : "caught" });
  }
} finally { restore(); }
const bad = results.filter((r) => r.state !== "caught");
for (const r of results) console.log(`  ${r.state === "caught" ? "caught  " : r.state.padEnd(8)}  ${r.name}`);
console.log(bad.length ? `\nmutate-block3: FAILED — ${bad.length} of ${results.length} not caught.` : `\nmutate-block3: OK — all ${results.length} mutations caught, tree restored.`);
if (bad.length) process.exitCode = 1;
