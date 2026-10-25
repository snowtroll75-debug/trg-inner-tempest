#!/usr/bin/env node
/**
 * mutate-block7 — the mutation half of verify-block7. Each mutation breaks
 * one printed rule, one ruling, one declaration the system reads or one
 * wire of Block 7; verify-block7 must fail on every one. Files are restored
 * after each run, and on any exit.
 *
 *   TRG_PRIME_ROOT=../core/trg-prime node tools/mutate-block7.mjs
 *
 * The printed text is read from the book extract, never typed, so the
 * mutations here go at what is authored: fields, declarations, the pure
 * decisions and the wiring. The core's Block 7 seams have their own pair in
 * the system (verify/mutate-block7-core).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const f = (...p) => path.join(ROOT, ...p);
const C = f("tools", "content", "block7.mjs"), A = f("module", "block7-automations.mjs");
const REG = f("module", "registration.mjs"), SCRIPT = f("scripts", "inner-tempest.mjs"), MANIFEST = f("module.json");
const B3 = f("module", "block3-automations.mjs"), B4 = f("module", "block4-automations.mjs"), B5 = f("module", "block5-automations.mjs"), B6 = f("module", "block6-automations.mjs");

const MUTATIONS = [
  // A — the archetypes and abilities, as printed
  { name: "Formbinder loses the Kensai", file: C, from: "A(\"Formbinder\", { traits: \"Kensai\",", to: "A(\"Formbinder\", { traits: \"\"," },
  { name: "Iaijutsu Master loses the Oathblade", file: C, from: "traits: \"Martial, Oathblade\", prerequisites: \"Oathblade, Perception 2 ranks\"", to: "traits: \"Martial\", prerequisites: \"Oathblade, Perception 2 ranks\"" },
  { name: "Shugenja forgets Learned Caster", file: C, from: "prerequisites: \"Learned Caster, Arcana 2 ranks, Nature 2 ranks, Religion 2 ranks\"", to: "prerequisites: \"Arcana 2 ranks, Nature 2 ranks, Religion 2 ranks\"" },
  { name: "Brawler forgets Non-Disciple", file: C, from: "A(\"Brawler\", { prerequisites: \"Non-Disciple\",", to: "A(\"Brawler\", { prerequisites: \"\"," },
  { name: "the progression line is not the book's", file: C, from: "  item.system.progressionRequirements = book.progression;", to: "  item.system.progressionRequirements = \"\";" },
  { name: "Drawn Verdict is no Flourish", file: C, from: "B(\"Drawn Verdict\", { traits: \"Attack, Flourish, Focus, Technique\",", to: "B(\"Drawn Verdict\", { traits: \"Attack, Focus, Technique\"," },
  { name: "Restorative Palm is no Healing", file: C, from: "B(\"Restorative Palm\", { traits: \"Focus, Healing, Technique\",", to: "B(\"Restorative Palm\", { traits: \"Focus, Technique\"," },
  { name: "FA-22: the Kensai loses the Vanguard", file: REG, from: "  Kensai: Object.freeze([\"Mastermind\", \"Vanguard\"]),", to: "  Kensai: Object.freeze([\"Mastermind\"])," },
  { name: "FA-22: the Mystic gains the Archer", file: REG, from: "  Mystic: Object.freeze([\"Mastermind\", \"Runemage\"]),", to: "  Mystic: Object.freeze([\"Mastermind\", \"Runemage\", \"Archer\"])," },
  { name: "FA-22: the Ghostwalker is not the Disciple's twin", file: REG, from: "  Ghostwalker: Object.freeze([\"Assassin\", \"Mastermind\"]),", to: "  Ghostwalker: Object.freeze([\"Mastermind\"])," },
  // B — the declarations the system reads
  { name: "Brawler's fists are 1d4", file: C, from: "unarmedDamage: { die: \"1d6\", versatile: \"B\",", to: "unarmedDamage: { die: \"1d4\", versatile: \"B\"," },
  { name: "Brawler's fists turn magical at BAB 5", file: C, from: "countsAs: { magical: 3, \"cold iron\": 8, silver: 8, adamantine: 16 }, label: \"Powerful Fists (Brawler)\" }", to: "countsAs: { magical: 5, \"cold iron\": 8, silver: 8, adamantine: 16 }, label: \"Powerful Fists (Brawler)\" }" },
  { name: "Brawler opens no Disciple feats (B7-3)", file: C, from: "label: \"Powerful Fists (Brawler)\" }, classFeatAccess: [\"Disciple\"] } }),", to: "label: \"Powerful Fists (Brawler)\" } } })," },
  { name: "Steel Disciple opens the Disciple's feats, not the Kensai's", file: C, from: "flags: { itAutomation: \"steelDisciple\", classFeatAccess: [\"Kensai\"] } }),", to: "flags: { itAutomation: \"steelDisciple\", classFeatAccess: [\"Disciple\"] } })," },
  { name: "Jade Physician gives no Medicine", file: C, from: "flags: { classSkills: [\"Medicine\"], conditionals: [conditional({ kind: \"modifier\", value: 2, type: \"class\", label: \"Jade Physician\"", to: "flags: { conditionals: [conditional({ kind: \"modifier\", value: 2, type: \"class\", label: \"Jade Physician\"" },
  { name: "Ronin's class skill is Stealth", file: C, from: "flags: { classSkills: [\"Deception\"] },\n    grantedAbilities: \"Wandering Creed, Turning the Blade\"", to: "flags: { classSkills: [\"Stealth\"] },\n    grantedAbilities: \"Wandering Creed, Turning the Blade\"" },
  { name: "Jade Physician's bonus reaches every Medicine check", file: C, from: "auto: true, when: { actions: [\"treatInjury\", \"treatToxin\", \"treatWounds\"] } })", to: "auto: true, when: { checkTypes: [\"skill\"] } })" },
  { name: "Harmony Warden's +4 is applied unasked", file: C, from: "tick if so\", auto: false, when: { actions: [\"refocus\", \"healingTrance\", \"powerRecovery\"] }", to: "tick if so\", auto: true, when: { actions: [\"refocus\", \"healingTrance\", \"powerRecovery\"] }" },
  { name: "Harmony Warden's bonus is +2", file: C, from: "conditional({ kind: \"modifier\", value: 4, type: \"class\", label: \"Harmony Warden\"", to: "conditional({ kind: \"modifier\", value: 2, type: \"class\", label: \"Harmony Warden\"" },
  { name: "Iaijutsu Master's +25 with the sword drawn too (B7-5)", file: C, from: "when: { checkTypes: [\"initiative\"], sheathedGroups: [\"sword\"] } })", to: "when: { checkTypes: [\"initiative\"] } })" },
  { name: "Iaijutsu Master's bonus is +20", file: C, from: "conditional({ kind: \"modifier\", value: 25, type: \"class\", label: \"Iaijutsu Master\"", to: "conditional({ kind: \"modifier\", value: 20, type: \"class\", label: \"Iaijutsu Master\"" },
  { name: "Veilborn's +2 reaches any Refocus", file: C, from: "auto: true, when: { actions: [\"refocus\"], restores: [\"Ghost Art\"] } })", to: "auto: true, when: { actions: [\"refocus\"] } })" },
  { name: "Night Lotus resists fire", file: C, from: "effects: [(id, n) => resistanceEffect(id, n, \"poison\")],", to: "effects: [(id, n) => resistanceEffect(id, n, \"fire\")]," },
  { name: "Oathbound's katana stays exotic", file: C, from: "weaponCategoryAs: { names: [\"Katana\", \"Wakizashi\"], category: \"martial\" }", to: "weaponCategoryAs: { names: [\"Wakizashi\"], category: \"martial\" }" },
  { name: "Zen Archer's abilities reach no bow", file: C, from: "    flags: { unarmedAbilityWeapons: { names: [...ZEN_ARCHER_BOWS] } },\n", to: "\n" },
  { name: "Zen Archer's abilities reach a crossbow", file: C, from: "    flags: { unarmedAbilityWeapons: { names: [...ZEN_ARCHER_BOWS] } },", to: "    flags: { unarmedAbilityWeapons: { names: [...ZEN_ARCHER_BOWS, \"Light Crossbow\"] } }," },
  { name: "Zen Archer is not proficient with the short bow", file: C, from: "export const ZEN_ARCHER_BOWS = Object.freeze([\"Longbow\", \"Short Bow\", \"Composite Longbow\", \"Composite Shortbow\"]);", to: "export const ZEN_ARCHER_BOWS = Object.freeze([\"Longbow\", \"Composite Longbow\", \"Composite Shortbow\"]);" },
  { name: "Shadowdancer's Stealth is +1", file: C, from: "effects: [(id, n) => classSkillEffect(id, n, [\"Stealth\"], 2)],", to: "effects: [(id, n) => classSkillEffect(id, n, [\"Stealth\"], 1)]," },
  { name: "the Geisha forgets Perform", file: C, from: "classSkillEffect(id, n, [\"Artistry\", \"Diplomacy\", \"Perform\"], 2)", to: "classSkillEffect(id, n, [\"Artistry\", \"Diplomacy\"], 2)" },
  { name: "Shadowdancer grants a feat that does not exist", file: C, from: "grantedFeats: \"Stealthy Strike, Shadowy Step\" }),", to: "grantedFeats: \"Stealthy Strike, Shadow Step\" })," },
  { name: "Tanuki Trickster's spell is misnamed", file: C, from: "grantedSpells: \"Shape Of The Humanoid, Mirage Entity\" }),", to: "grantedSpells: \"Shape of the Humanoid, Mirage Entity\" })," },
  { name: "Twin Dragon is not a Combat Form", file: C, from: "    item.system.category = \"Combat Form\";", to: "    item.system.category = \"Ability\";" },
  { name: "Twin Dragon counts against the Kensai's table", file: C, from: "itAutomation: \"combatFormItem\", itFormExtra: \"Formbinder\" }", to: "itAutomation: \"combatFormItem\" }" },
  // C — the pure decisions
  { name: "Harmony Warden's ceiling never rises (B7-4)", file: A, from: "  return 2 + 2 * Math.floor(Math.max(0, int(level)) / 5);", to: "  return 2;" },
  { name: "Harmony Warden takes a save spell", file: A, from: "  if (norm(spellSystem?.category) !== \"utility\") return false;\n  if (spellSystem?.specialist === true) return false;\n  const pp", to: "  if (spellSystem?.specialist === true) return false;\n  const pp" },
  { name: "Harmony Warden takes a specialist spell", file: A, from: "  if (norm(spellSystem?.category) !== \"utility\") return false;\n  if (spellSystem?.specialist === true) return false;", to: "  if (norm(spellSystem?.category) !== \"utility\") return false;" },
  { name: "Harmony Warden takes an arcane spell", file: A, from: "  if (!(traditions.includes(\"verdant\") || traditions.includes(\"all\"))) return false;", to: "" },
  { name: "Shugenja's Fire forgets Light", file: A, from: "  Fire: Object.freeze([\"Fire\", \"Light\"]),", to: "  Fire: Object.freeze([\"Fire\"])," },
  { name: "Shugenja takes a specialist spell", file: A, from: "  if (!want.length || spellSystem?.specialist === true) return false;", to: "  if (!want.length) return false;" },
  { name: "Mystic Essence opens a plain spell", file: A, from: "  if (spellSystem?.specialist !== true || !traits.length) return false;", to: "  if (!traits.length) return false;" },
  { name: "Mystic Essence opens a specialist above its PP", file: A, from: "  return Math.max(0, int(spellSystem?.ppCost)) <= Math.max(0, int(level));\n}", to: "  return true;\n}" },
  { name: "an opened spell's bonus is +2", file: A, from: "return { attack: 1, dc: 1, type: \"class\", label: item.name };", to: "return { attack: 2, dc: 2, type: \"class\", label: item.name };" },
  { name: "Restorative Palm restores 2 per level", file: A, from: "export function restorativePalmHealing(level) { return 4 * Math.max(1, int(level)); }", to: "export function restorativePalmHealing(level) { return 2 * Math.max(1, int(level)); }" },
  { name: "Restorative Palm stops Bleeding 1 per level", file: A, from: "return Math.max(1, Math.floor(Math.max(1, int(level)) / 2)); }", to: "return Math.max(1, int(level)); }" },
  { name: "Restorative Palm heals the undead", file: A, from: "  return !/\\b(construct|undead)\\b/.test(t);", to: "  return !/\\b(construct)\\b/.test(t);" },
  { name: "Restorative Palm reads no creature type", file: A, from: "[system?.details?.traits, system?.details?.creatureType, system?.details?.grantedTraits]", to: "[system?.details?.traits, system?.details?.grantedTraits]" },
  { name: "Night Lotus Venom's save is Reflex", file: A, from: "export const NIGHT_LOTUS_LADDER = Object.freeze({\n  save: \"fortitude\",", to: "export const NIGHT_LOTUS_LADDER = Object.freeze({\n  save: \"reflex\"," },
  { name: "Night Lotus Venom's Failure spares the Slowed", file: A, from: "    failure: [{ key: \"slowed\", value: 1, rounds: 2 }],", to: "    failure: []," },
  { name: "Night Lotus Venom's Fumble is not Paralyzed", file: A, from: "    fumble: [{ key: \"paralyzed\", value: null, rounds: 1 }, { key: \"slowed\", value: 1, rounds: 2 }]", to: "    fumble: [{ key: \"slowed\", value: 1, rounds: 2 }]" },
  { name: "a Partial is not the Success row (IT-m24)", file: A, from: "    partial: \"a −5-foot circumstance penalty to Speed until the beginning of the poisoner's next turn.\",", to: "    partial: \"unaffected.\"," },
  { name: "the venom coats a club", file: A, from: "  if ([\"piercing\", \"slashing\"].includes(type)) return true;", to: "  if ([\"piercing\", \"slashing\", \"bludgeoning\"].includes(type)) return true;" },
  { name: "the venom coats a weapon only carried", file: A, from: "  if (item.type !== \"weapon\" || !(item.system?.equipped || item.system?.natural)) return false;", to: "  if (item.type !== \"weapon\") return false;" },
  { name: "the venom ignores Versatile", file: A, from: "  return /\\bversatile\\s*[ps]\\b/i.test(String(item.system?.traits ?? \"\"));", to: "  return false;" },
  { name: "the Soul-Bound Weapon turns magical at BAB 5", file: A, from: "countsAs: { magical: 3, \"cold iron\": 8, silver: 8, adamantine: 16 }, label: \"Soul-Bound Weapon\" }", to: "countsAs: { magical: 5, \"cold iron\": 8, silver: 8, adamantine: 16 }, label: \"Soul-Bound Weapon\" }" },
  { name: "the Soul-Bound Weapon reaches no unarmed ability", file: A, from: "    unarmedAbilityWeapons: { itemIds: [weaponId] },\n", to: "" },
  { name: "Formbinder's DB rows never compete (C15)", file: B4, from: "out.statBonuses = f.statBonuses.map((r) => ({ ...r, stackGroup: `formbinder:stat:${norm(r?.target)}` }));", to: "out.statBonuses = f.statBonuses.map((r) => ({ ...r }));" },
  { name: "Formbinder's modifier rows never compete", file: B4, from: "? { ...c, stackGroup: sig(c) } : c));", to: "? { ...c } : c));" },
  { name: "Formbinder's groups ignore the subject", file: B4, from: "return `formbinder:${norm(row?.kind || \"modifier\")}:${list(w.checkTypes)}|${list(w.subjects)}|${list(w.actions)}`;", to: "return `formbinder:${norm(row?.kind || \"modifier\")}:${list(w.checkTypes)}||${list(w.actions)}`;" },
  { name: "Formbinder's stance is a Blended Form", file: B4, from: "  if (names.length > 1 && formbinder) return `Formbinder: ${names.join(\" + \")}`;", to: "" },
  { name: "Twin Path takes every discipline spell", file: A, from: "    .filter((e) => e.level === int(level)).map((e) => e.name);", to: "    .map((e) => e.name);" },
  { name: "Twin Path forgets Still Mind", file: A, from: "[\"Inner Flame\", \"Dragon Soul\", \"Still Mind\", \"Starborn Flow\", \"Thousand Reflections\"]", to: "[\"Inner Flame\", \"Dragon Soul\", \"Starborn Flow\", \"Thousand Reflections\"]" },
  { name: "Wandering Creed forgets the Oath of Fealty", file: A, from: "\"Oath of Vengeance\", \"Oath of Fealty\"]);", to: "\"Oath of Vengeance\"]);" },
  { name: "Veilborn's DB forgets Smoke Veil", file: B4, from: "\"Shadow Passage\", \"Smoke Veil\"]);", to: "\"Shadow Passage\"]);" },
  { name: "the Path is read with the feat's name", file: B3, from: "return { name: String(p.name ?? item.name ?? \"\"),", to: "return { name: String(item.name ?? \"\")," },
  { name: "IT-M6's fallback ignores a class's tradition", file: B3, from: "    if (t && typeof t === \"object\" && t.tradition && t.ability) return { name:", to: "    if (false) return { name:" },
  { name: "an unchosen tradition is taken", file: B3, from: "    if (t && typeof t === \"object\" && t.tradition && t.ability) return { name:", to: "    if (t && typeof t === \"object\") return { name:" },
  { name: "Mystical Power offers a specialist spell", file: B3, from: "  if (spellSystem?.specialist === true) return false;", to: "" },
  { name: "Flurry reaches no declared weapon", file: B3, from: "  return flurryWeapon(item) || declaredAbilityWeapon([...Array.from(actor?.items ?? []), ...Array.from(actor?.effects ?? [])], item);", to: "  return flurryWeapon(item);" },
  { name: "a declared weapon is told by group alone", file: B3, from: "    if (name && list(spec.names).some((n) => norm(n) === name)) return true;", to: "" },
  // D — registration
  { name: "Zen Archer counts as nothing (C3)", file: A, from: "  \"Zen Archer\": { countsAs: [\"Archer\"] }", to: "  \"Zen Archer\": {}" },
  { name: "Shugenja is not registered", file: A, from: "\"Soul Weapon Master\": {}, \"Steel Disciple\": {},", to: "\"Steel Disciple\": {}," },
  { name: "Restorative Palm has no Use", file: A, from: "  \"restorative palm\": restorativePalm,\n", to: "" },
  { name: "Twin Dragon has no Use", file: A, from: "  \"twin dragon\": formItemUse(\"Twin Dragon\")\n", to: "" },
  { name: "Steel Disciple's skill choice forgets Athletics", file: A, from: "options: Object.freeze([\"acrobatics\", \"athletics\", \"meditation\", \"mentalFocus\"])", to: "options: Object.freeze([\"acrobatics\", \"meditation\", \"mentalFocus\"])" },
  { name: "Inner Adept's choice is Mental Focus alone", file: A, from: "options: Object.freeze([\"meditation\", \"mentalFocus\"])", to: "options: Object.freeze([\"mentalFocus\"])" },
  { name: "FA-22 is not registered", file: REG, from: "  for (const [cls, archetypes] of Object.entries(EXISTING_ARCHETYPES)) api.registerFeatAccess?.(\"archetype\", cls, [...archetypes], moduleId);\n", to: "" },
  { name: "the archetypes are not registered", file: REG, from: "  for (const [name, spec] of Object.entries(BLOCK7_ARCHETYPES)) api.registerArchetype?.(name, { ...spec }, moduleId);\n", to: "" },
  { name: "the class-skill grants are not registered", file: REG, from: "  for (const grant of BLOCK7_CLASS_SKILL_GRANTS) api.registerClassSkillGrant?.({ ...grant, options: [...grant.options] }, moduleId);\n", to: "" },
  // E — wiring
  { name: "Night Lotus Venom hears no Unseen Assault", file: SCRIPT, from: "onAmbushDealtB7(ctx)", to: "void (ctx)" },
  { name: "Drawn Verdict's damage is never read", file: SCRIPT, from: "onStrikeResolvedB7(ctx)", to: "void (ctx)" },
  { name: "Turning the Blade is never offered", file: SCRIPT, from: "onDamageAppliedB7(ctx)", to: "void (ctx)" },
  { name: "no daily preparation for Block 7", file: SCRIPT, from: "onDailyPreparationB7(ctx)", to: "void (ctx)" },
  { name: "Drawn Verdict's sword is never sheathed", file: SCRIPT, from: "onTurnEndedB7(ctx)", to: "void (ctx)" },
  { name: "Bound Challenge with no conviction left", file: B4, from: "  if (spend === \"conviction\" && int(actor.system?.resources?.conviction?.value) <= 0) { ui.notifications.warn", to: "  if (false) { ui.notifications.warn" },
  { name: "Bound Challenge costs no conviction", file: B4, from: "  if (spend === \"conviction\") await actor.update({ \"system.resources.conviction.value\": int(actor.system?.resources?.conviction?.value) - 1 });", to: "" },
  { name: "Formbinder activates two forms a turn", file: B4, from: "      if (!formbinderTurnFree(actor)) { ui.notifications.warn(\"Formbinder: you have already activated a form this turn.\"); return false; }\n      const done = await enterForm(actor, [current[0], names[0]], { formbinder: true });", to: "      const done = await enterForm(actor, [current[0], names[0]], { formbinder: true });" },
  { name: "an archetype's form counts against the table", file: B4, from: "export const learnedForms = (actor) => knownForms(actor).filter((i) => !i.flags?.[SYSTEM_ID]?.itFormExtra);", to: "export const learnedForms = (actor) => knownForms(actor);" },
  { name: "Veilborn's extra art counts against the table", file: B4, from: "filter((i) => i.flags?.[SYSTEM_ID]?.itArtLevel && !i.flags?.[SYSTEM_ID]?.itArtExtra).length;", to: "filter((i) => i.flags?.[SYSTEM_ID]?.itArtLevel).length;" },
  { name: "Steel Disciple's form needs a Combat Form", file: B4, from: "      if (item?.flags?.[SYSTEM_ID]?.itFormExtra === \"Steel Disciple\" && !ownedNamed(actor, \"Combat Form\")) return enterForm(actor, [name], { spendCombatForm: false });\n", to: "" },
  { name: "Form Reversal answers Drawn Verdict", file: B4, from: "    if (!ctx.noReactions && melee && ownedNamed(target, \"Form Reversal\")", to: "    if (melee && ownedNamed(target, \"Form Reversal\")" },
  { name: "Waiting Blade answers Drawn Verdict", file: B5, from: "&& !ctx.noReactions) {", to: ") {" },
  { name: "Snake Stance answers Drawn Verdict", file: B6, from: "  if (ctx.noReactions) return;\n", to: "" },
  { name: "Mystic Essence opens no specialist", file: B6, from: "|| essenceOpens(e.system, opened, level)));", to: "));" },
  { name: "Mystic Essence's spell carries no bonus", file: B6, from: "  const bonus = norm(item.name) === \"mystic essence\" ? essenceBonus(data.system, items) : null;", to: "  const bonus = null;" },
  { name: "a chosen tradition stamps nothing waiting", file: B4, from: "await stampOwedSpells(actor);", to: "void (actor);" },
  { name: "Drawn Verdict lets the target react", file: A, from: "noReactions: true, optionLabel: \"Drawn Verdict\"", to: "noReactions: false, optionLabel: \"Drawn Verdict\"" },
  { name: "Restorative Palm grants no immunity", file: A, from: "await h().grantTemporaryImmunity(target, \"Restorative Palm\", 3600);", to: "void 3600;" },
  { name: "Night Lotus Venom's save ignores Unseen Assault", file: A, from: "const dc = h().levelDC(levelOf(attacker)) + (unseen ? 1 : 0);", to: "const dc = h().levelDC(levelOf(attacker));" },
  { name: "Turning the Blade answers a spell", file: A, from: "  if (context?.kind !== \"strike\") return;\n", to: "" },
  // F — found in review
  { name: "Drawn Verdict's reach is read unawaited", file: A, from: "const distance = Number(await h().distanceBetween(mine, theirs));", to: "const distance = Number(h().distanceBetween(mine, theirs));" },
  { name: "Restorative Palm's touch is read unawaited", file: A, from: "if (mine && theirs && Number(await h().distanceBetween(mine, theirs)) > 5) {", to: "if (mine && theirs && Number(h().distanceBetween(mine, theirs)) > 5) {" },
  { name: "Restorative Palm writes to the target here", file: A, from: "    await asOwner(target, \"b7Palm\", { healerUuid: actor.uuid, pick, level });", to: "    await palmOnTarget(target, { healerUuid: actor.uuid, pick, level });" },
  { name: "the palm's owner op is not registered", file: A, from: ", ownerOps: { b7Palm: palmOnTarget } });", to: " });" },
  { name: "Drawn Verdict spends on a cancelled Strike", file: A, from: "    if (!check) { await sword.update({ \"system.equipped\": false }); return false; }\n", to: "" },
  { name: "Wandering Creed's oath leaves Sworn Oath unanswered", file: A, from: "const granted = await grantAbility(actor, ownedNamed(actor, \"Sworn Oath\") ?? item, pick, \"Oathblade\");", to: "const granted = await grantAbility(actor, item, pick, \"Oathblade\");" },
  { name: "Block 4 asks a Ronin's Fealty at the same time", file: B4, from: "  if (ownedNamed(actor, \"Wandering Creed\")) return null;\n", to: "" },
  { name: "a newly chosen Fealty names no Sworn Charge", file: A, from: "  if (granted.flags?.[SYSTEM_ID]?.itOath === \"Oath of Fealty\") await fealtyChargeQuestion(actor, granted);\n", to: "" },
  { name: "a lost bond is replaced the next day", file: A, from: "  if (bondedId) { ui.notifications.warn(\"Soul Weapon Master: your bonded weapon is lost;", to: "  if (bondedId && item.getFlag(MODULE_ID, \"bondDay\") === dayKey()) { ui.notifications.warn(\"Soul Weapon Master: your bonded weapon is lost;" },
  { name: "the venom rides any weapon", file: A, from: "  return Boolean(coating.coatedId) && String(weapon.id ?? weapon._id ?? \"\") === String(coating.coatedId);", to: "  return true;" },
  { name: "the coated ammunition rides a melee Strike", file: A, from: "  if (coating.ammo) return norm(weapon.system?.attackMode) === \"missile\";", to: "  if (coating.ammo) return true;" },
  { name: "the hook ignores the coated weapon", file: A, from: "ownEffects(attacker, \"nightLotusVenom\").some((e) => !e.disabled && venomRides(e.flags?.[MODULE_ID] ?? {}, weapon))", to: "ownEffects(attacker, \"nightLotusVenom\").some((e) => !e.disabled)" },
  { name: "Harmony Warden's card before the cast", file: A, from: "    const cast = await h().castInnateOnce(actor, data, { ability, tradition: \"verdant\" });\n", to: "    await card(actor, \"Harmony Warden\", [\"You cast it.\"]);\n    const cast = await h().castInnateOnce(actor, data, { ability, tradition: \"verdant\" });\n" },
  { name: "the sheathe is read by the combat's turn again (live test)", file: A, from: "  if (!sheatheOwed(dv, combat, combatant)) return;", to: "  if (dv.further || dv.turn !== turnKeyOf(combat)) return;" },
  { name: "the sheathe is owed to anyone's turn end", file: A, from: "  return dv.combatId === combat.id && Boolean(dv.combatantId) && dv.combatantId === combatant.id;", to: "  return dv.combatId === combat.id;" },
  { name: "a Strike after Drawn Verdict still owes the sheathe", file: A, from: "  if (!dv || dv.further || !combat || !combatant) return false;", to: "  if (!dv || !combat || !combatant) return false;" },
  { name: "a form's own Use replaces the held form unasked (live test)", file: B4, from: "      return enterChosenForm(actor, [name]);", to: "      return enterForm(actor, [name]);" },
  // versions
  { name: "the module is 0.8.0", file: MANIFEST, from: "\"version\": \"0.8.1\"", to: "\"version\": \"0.8.0\"" },
  { name: "the module takes TRG Prime 3.670.1", file: SCRIPT, from: "const REQUIRED_SYSTEM = \"3.671.0\";", to: "const REQUIRED_SYSTEM = \"3.670.1\";" }
];

const originals = new Map();
for (const m of MUTATIONS) if (!originals.has(m.file)) originals.set(m.file, fs.readFileSync(m.file, "utf8"));
const restore = () => { for (const [file, text] of originals) fs.writeFileSync(file, text); };
process.on("SIGINT", () => { restore(); process.exit(130); });
process.on("SIGTERM", () => { restore(); process.exit(143); });

function run() {
  try { execFileSync(process.execPath, [f("tools", "verify-block7.mjs")], { stdio: ["ignore", "pipe", "pipe"], env: process.env }); return true; }
  catch { return false; }
}

const results = [];
try {
  if (!run()) { console.error("mutate-block7: verify-block7 already fails on an unmodified tree."); process.exit(2); }
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
console.log(bad.length ? `\nmutate-block7: FAILED — ${bad.length} of ${results.length} not caught.` : `\nmutate-block7: OK — all ${results.length} mutations caught, tree restored.`);
if (bad.length) process.exitCode = 1;
