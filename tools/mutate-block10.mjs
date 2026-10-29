#!/usr/bin/env node
/**
 * mutate-block10 — the mutation half of verify-block10. Each mutation breaks
 * one printed rule, one ruling, one row the system reads or one wire of
 * Block 10; verify-block10 must fail on every one. Files are restored after
 * each run, and on any exit.
 *
 *   TRG_PRIME_ROOT=../core/trg-prime node tools/mutate-block10.mjs
 *
 * The printed text and numbers are read from the book extract, never typed,
 * so the mutations go at what is authored: the readings, the rules turned
 * into rows, the decisions and the wiring. The core's Block 10 seams have
 * their own pair in the system (verify/mutate-block10-core).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const f = (...p) => path.join(ROOT, ...p);
const C = f("tools", "content", "block10.mjs"), A = f("module", "block10-automations.mjs"), REG = f("module", "registration.mjs"), SCRIPT = f("scripts", "inner-tempest.mjs"),
  MANIFEST = f("module.json"), STATUS = f("tools", "inventory", "status.json"), FOUND = f("tools", "content", "foundation.mjs"), INV = f("tools", "inventory", "inventory.txt");

const MUTATIONS = [
  // A — the book, as read and turned into rows
  { name: "the table's minus is read as a plus", file: C, from: "return m[1] ? (m[1] === \"-\" ? -1 : 1) * Number(m[2]) : 0;", to: "return m[1] ? Number(m[2]) : 0;" },
  { name: "the table's land and fly columns are swapped", file: C, from: "gained, size: baseCell(c[1]), land: baseCell(c[2]), fly: baseCell(c[3]),", to: "gained, size: baseCell(c[1]), land: baseCell(c[3]), fly: baseCell(c[2])," },
  { name: "the line and cone are swapped", file: C, from: "line: feetCell(c[9]), cone: feetCell(c[10])", to: "line: feetCell(c[10]), cone: feetCell(c[9])" },
  { name: "BAB lags a level", file: C, from: "return { level: L, bab: L, bdb: L,", to: "return { level: L, bab: L - 1, bdb: L," },
  { name: "saves are 4 + level", file: C, from: "fortitude: 5 + L, reflex: 5 + L, will: 5 + L,", to: "fortitude: 4 + L, reflex: 5 + L, will: 5 + L," },
  { name: "a general feat every level", file: C, from: "bonusFeats: Math.ceil(L / 2),", to: "bonusFeats: L," },
  { name: "the caster level is the level", file: C, from: "casterLevel: L > 3 ? L - 3 : null,", to: "casterLevel: L," },
  { name: "3 PP a level", file: C, from: "pp: 4 * L, bsb: L };", to: "pp: 3 * L, bsb: L };" },
  { name: "10 HP a level", file: C, from: "    hitPoints: 12,\n    skillPoints: 8,", to: "    hitPoints: 10,\n    skillPoints: 8," },
  { name: "skill points from Wisdom", file: C, from: "item.system.skillPointAbility = \"intelligence\";", to: "item.system.skillPointAbility = \"wisdom\";" },
  { name: "the rows stop at 20", file: C, from: "for (let L = 21; L <= 30; L += 1)", to: "for (let L = 21; L <= 20; L += 1)" },
  { name: "the class's rule paragraphs are dropped", file: C, from: "out.push(md(`**${heading}**\\n\\n${rules(heading).join(\"\\n\\n\")}`));", to: "out.push(md(`**${heading}**`));" },
  { name: "the natural armour is the printed DR", file: C, from: "naturalDR: Number(dr[1]) / mult,", to: "naturalDR: Number(dr[1])," },
  { name: "the DR multiplier steps at 5", file: C, from: "v >= 6 ? 2 : 1;", to: "v >= 5 ? 2 : 1;" },
  { name: "the scores sit on a base of 1", file: C, from: "{ key: `system.attributes.${key}.base`, mode: 5, value: \"0\", priority: 10 },", to: "{ key: `system.attributes.${key}.base`, mode: 5, value: \"1\", priority: 10 }," },
  { name: "the light dragon's fourth feat costs a pick", file: C, from: "const FREE_FEATS = { LIGHT: [\"Lightning Reflexes\"] };", to: "const FREE_FEATS = {};" },
  { name: "a skill printed without its comma is lost", file: C, from: "matchAll(/([A-Za-z][A-Za-z ]*?)\\s*[+-]\\d+\\s*\\((\\d+)\\)/g)", to: "matchAll(/(?:^|, )([A-Za-z][A-Za-z ]*?)\\s*[+-]\\d+\\s*\\((\\d+)\\)/g)" },
  { name: "the light dragon's immunities keep the print's missing comma", file: C, from: "String(s ?? \"\").split(/[,\\s]+/)", to: "String(s ?? \"\").split(/,\\s*/)" },
  { name: "a block's special line is not split into feats and specials", file: C, from: "const baseSpecials = special.filter((s) => !CORE_FEATS.has(s));", to: "const baseSpecials = [];" },
  { name: "an egg needs a fortnight", file: C, from: "flags: { itDragonEgg: { dragon: d.name, days: 0, required: 28 } }", to: "flags: { itDragonEgg: { dragon: d.name, days: 0, required: 14 } }" },
  { name: "the race's block omits its description", file: C, from: "    `*${b.description}*`\n", to: "" },
  { name: "Dragon Tamer's progression is dropped", file: C, from: "item.system.progressionRequirements = tamer.progression;", to: "" },
  { name: "Dragon Tamer is a General feat", file: C, from: "name: \"Dragon Tamer\", category: \"Archetype\",", to: "name: \"Dragon Tamer\", category: \"General\"," },
  { name: "a companion feat's lines are dropped", file: C, from: "${fields ? `\\n\\n${fields}` : \"\"}\\n\\n${b.lines.join(\"\\n\\n\")}`)", to: "${fields ? `\\n\\n${fields}` : \"\"}`)" },
  { name: "Draconic Spell is not repeatable", file: C, from: "  companionFeat(\"DRACONIC SPELL\", {\n    repeatable: true,", to: "  companionFeat(\"DRACONIC SPELL\", {" },
  // B — what the system reads
  { name: "C4 BROKEN: the companion feats name no kind", file: C, from: "flags: { companionKind: \"dragon\", ...flags }", to: "flags: { ...flags }" },
  { name: "C5 BROKEN: the breath is a fixed 4d8", file: C, from: "damage: { perLevel: d.breath.die, type: d.breath.type },", to: "damage: { formula: `4${d.breath.die}`, type: d.breath.type }," },
  { name: "the breath is not remembered as a breath", file: C, from: "intro: `A ${d.breath.feet}-foot ${d.breath.shape} — target the creatures in it.`, breath: true },", to: "intro: `A ${d.breath.feet}-foot ${d.breath.shape} — target the creatures in it.` }," },
  { name: "the breath costs 1 AP", file: C, from: "activation: { kind: \"action\", ap: b.ap, save: \"reflex\" },", to: "activation: { kind: \"action\", ap: 1, save: \"reflex\" }," },
  { name: "the breath arrives spent", file: C, from: "name: d.breath.name, sourceRace: d.name, traits: d.breath.traits, usesPerDay: \"1\",", to: "name: d.breath.name, sourceRace: d.name, traits: d.breath.traits, usesPerDay: \"\"," },
  { name: "the bite has no elemental secondary", file: C, from: "item.flags[SYSTEM_ID] = { creatureAttack: { secondary: { ...d.bite.secondary } } };", to: "item.flags[SYSTEM_ID] = {};" },
  { name: "the bite is the printed Small die at Medium", file: C, from: "name: `Bite (${d.name})`, damage: \"1d8\",", to: "name: `Bite (${d.name})`, damage: \"1d6\"," },
  { name: "High Magic opens no tradition", file: C, from: "flags: { creatureAbility: { derives: { learnTraditions: \"any\" }, source: \"Inner Tempest, Chapter 5\" } }", to: "flags: { creatureAbility: { source: \"Inner Tempest, Chapter 5\" } }" },
  { name: "C1 BROKEN: the kind is Animal", file: A, from: "  creatureType: \"Wyrm\",", to: "  creatureType: \"Animal\"," },
  { name: "C6 BROKEN: size steps change Str/Dex too", file: A, from: "  sizeAbilityMods: false,\n  abilityPoints: false,", to: "  abilityPoints: false," },
  { name: "B10-1 BROKEN: its level is the master's", file: A, from: "  return base + Math.max(0, masterLevel - hatched);", to: "  return Math.max(base, masterLevel);" },
  { name: "growth reads the absolute level", file: A, from: "  const gained = Math.max(0, int(level) - int(base.baseLevel));", to: "  const gained = Math.max(0, int(level));" },
  { name: "the earth dragon flies", file: A, from: "    fly: base.fly > 0 ? int(row.fly) : 0,", to: "    fly: int(row.fly)," },
  { name: "the breath's length is always the cone", file: A, from: "    breathFeet: base.breath?.shape === \"line\" ? int(row.line) : int(row.cone),", to: "    breathFeet: int(row.cone)," },
  { name: "specials read levels gained", file: A, from: "    specials: (base.specials ?? []).filter(([at]) => int(at) <= int(level)).map(([, name]) => name)", to: "    specials: (base.specials ?? []).filter(([at]) => int(at) <= int(level) - int(base.baseLevel)).map(([, name]) => name)" },
  { name: "the growth adds a DB of its own over the printed block's", file: A, from: "  for (const k of [\"intelligence\", \"wisdom\", \"charisma\"]) add(`system.attributes.${k}.untyped`, growth.mental);\n", to: "  for (const k of [\"intelligence\", \"wisdom\", \"charisma\"]) add(`system.attributes.${k}.untyped`, growth.mental);\n  add(\"system.combat.defence.status\", 2);\n" },
  { name: "the breath stays under the codex's inheritance", file: A, from: "    await breath.update({ [`flags.${SYSTEM_ID}.creatureAbility.area.intro`]: intro, [`flags.${SYSTEM_ID}.codexInherit`]: false });", to: "    await breath.update({ [`flags.${SYSTEM_ID}.creatureAbility.area.intro`]: intro });" },
  { name: "the mental increments reach Intelligence only", file: A, from: "  for (const k of [\"intelligence\", \"wisdom\", \"charisma\"]) add(`system.attributes.${k}.untyped`, growth.mental);", to: "  add(\"system.attributes.intelligence.untyped\", growth.mental);" },
  { name: "B10-3 BROKEN: no Sweep at +20", file: A, from: ", ...(growth.sweep ? { extraTraits: [\"Sweep\"] } : {}) });", to: " });" },
  { name: "the elemental names are looked up as they are", file: A, from: "  if (m) return { pack: \"trg-prime.creature-abilities\", name: `Elemental ${m[2].charAt(0).toUpperCase()}${m[2].slice(1).toLowerCase()}`, rename: String(name).trim() };\n", to: "" },
  { name: "Wild Stride is looked for in the codex", file: A, from: "  if (norm(name) === \"wild stride\") return { pack: \"trg-prime.feats\", name: \"Wild Stride\" };\n", to: "" },
  { name: "B10-5 BROKEN: Wing Buffet gets no fallback", file: A, from: "    if (area && norm(w.name) === \"wing buffet\") data.flags[SYSTEM_ID].creatureAbility.area = withWingsFallback(area);", to: "" },
  { name: "the fallback is the Medium Wings", file: A, from: "export const WINGS_FALLBACK = Object.freeze({ name: \"Wings\", damage: \"1d6\", size: \"small\", damageType: \"bludgeoning\" });", to: "export const WINGS_FALLBACK = Object.freeze({ name: \"Wings\", damage: \"1d6\", size: \"medium\", damageType: \"bludgeoning\" });" },
  { name: "B10-6 BROKEN: spells known stop at the block's count", file: A, from: "  return { firstPicks: int(base?.spells), pickFrom: int(base?.baseLevel) + 1, pickStep: 1, firstPickExact: false };", to: "  return { firstPicks: int(base?.spells), pickFrom: 99, pickStep: 1, firstPickExact: false };" },
  // C — the decisions
  { name: "the hatchling is set up after the card", file: A, from: "    beforeCard: (made) => setUpHatchling(made, base)\n  });\n  if (!companion) return false;\n", to: "  });\n  if (!companion) return false;\n  await setUpHatchling(companion, base);\n" },
  { name: "the bond is cleared, not closed, after recovery", file: A, from: "      await endBond(master, { state: \"broken\", dragonId: bond.dragonId });", to: "      await endBond(master);" },
  { name: "a closed bond is broken again", file: A, from: "    if (ours && [\"dead\", \"broken\"].includes(bond.state)) return;", to: "    if (ours && bond.state === \"dead\") return;" },
  { name: "a closed bond still offers a separation", file: A, from: "  if (bond?.state === \"broken\") { ui.notifications.info(`Dragon Tamer: your bond with ${dragon.name} is broken for good — a bond is for life, and only once.`); return false; }\n", to: "" },
  { name: "only Dying is watched", file: A, from: "  if (!(effect.statuses?.has?.(\"dying\") || effect.statuses?.has?.(\"dead\"))) return Promise.resolve();", to: "  if (!effect.statuses?.has?.(\"dying\")) return Promise.resolve();" },
  { name: "the restoration is not recorded", file: A, from: "        await master.setFlag(MODULE_ID, BOND_FLAG, { ...bond, restoredDays: bondDays(bond, now), restoredAt: now });", to: "" },
  { name: "restored in time is within 8", file: A, from: "export const restoredInTime = (days) => int(days) <= 7;", to: "export const restoredInTime = (days) => int(days) <= 8;" },
  { name: "a broken bond's days follow the clock only", file: A, from: "  return Math.max(int(bond?.preps), Math.floor(Math.max(0, Number(now) - Number(bond?.since ?? now)) / DAY));", to: "  return Math.floor(Math.max(0, Number(now) - Number(bond?.since ?? now)) / DAY);" },
  { name: "a broken bond's preparations are not counted", file: A, from: "    if (dayCounts(bond, now)) Object.assign(next, { preps: int(bond.preps) + 1, lastDay: Math.floor(now / DAY), lastTime: now });", to: "" },
  { name: "separated again lays it twice", file: A, from: "  if (pick === \"apart\" && bond?.state === \"reunited\") {", to: "  if (false) {" },
  { name: "a refused egg day says nothing", file: A, from: "    if (!update) { lines.push(`<strong>${esc(egg.name)}</strong>: this day's bonding is already counted — advance the world clock to the next day.`); continue; }", to: "    if (!update) continue;" },
  { name: "runs on one dragon are not queued", file: A, from: "  const run = before.catch(() => null).then(() => reconcileDragonNow(companion));", to: "  const run = reconcileDragonNow(companion);" },
  { name: "Sweep is never taken back", file: A, from: "      const gone = added.filter((t) => !(w.extraTraits ?? []).includes(t));", to: "      const gone = [];" },
  { name: "the egg bonds twice on a day the clock moved into", file: A, from: "  return !(sameDay && Number(last.lastTime) !== t);", to: "  return true;" },
  { name: "the egg is ready at 27", file: A, from: "  return Boolean(f) && int(f.days) >= Math.max(1, int(f.required) || 28);", to: "  return Boolean(f) && int(f.days) >= Math.max(1, int(f.required) || 28) - 1;" },
  { name: "a disrupted bond's drain rounds down", file: A, from: "export const apartDrain = (level) => Math.ceil(Math.max(0, int(level)) / 2);", to: "export const apartDrain = (level) => Math.floor(Math.max(0, int(level)) / 2);" },
  { name: "a point back every 6 days", file: A, from: "const WEEK = 7 * DAY;", to: "const WEEK = 6 * DAY;" },
  { name: "Refocus is −1", file: A, from: "conditionals: [{ kind: \"modifier\", value: -2, type: \"untyped\", label, scope: \"Refocus (the dragon bond)\"", to: "conditionals: [{ kind: \"modifier\", value: -1, type: \"untyped\", label, scope: \"Refocus (the dragon bond)\"" },
  { name: "Dragon Lore is not asked", file: A, from: "  if (!hasDragonLore(actor)) missing.push(\"the Dragon Lore specialist skill\");\n", to: "" },
  { name: "Arcana 6 ranks will do", file: A, from: "  if (int(actor.system?.skills?.arcana?.ranks) < 8) missing.push(\"Arcana 8 ranks\");", to: "  if (int(actor.system?.skills?.arcana?.ranks) < 6) missing.push(\"Arcana 8 ranks\");" },
  { name: "Imitate Sound for any dragon", file: A, from: "    return norm(base?.data?.key) === \"light\" ? \"\" : \"Imitate Sound needs a light dragon.\";", to: "    return \"\";" },
  { name: "Tail Lash without a tail", file: A, from: "  if (name === \"tail lash\" && !Array.from(actor.items ?? []).some((i) => i.type === \"weapon\" && /tail/i.test(i.name))) return \"Tail Lash needs a tail attack (Base +10).\";\n", to: "" },
  { name: "the hatchling's immunities are not written", file: A, from: "  if (base?.immunities) out[\"system.combat.immunities\"] = String(base.immunities);\n", to: "" },
  // D — the Foundry half
  { name: "a player's client grows the dragon", file: A, from: "  if (!actingGM() || actor?.type !== \"companion\" || norm(actor.system?.companion?.kind) !== DRAGON_KIND) return Promise.resolve();\n  if (!foundry.utils.hasProperty(changes ?? {}, \"system.identity.level\")) return Promise.resolve();", to: "  if (actor?.type !== \"companion\" || norm(actor.system?.companion?.kind) !== DRAGON_KIND) return Promise.resolve();\n  if (!foundry.utils.hasProperty(changes ?? {}, \"system.identity.level\")) return Promise.resolve();" },
  { name: "every update grows the dragon", file: A, from: "  if (!foundry.utils.hasProperty(changes ?? {}, \"system.identity.level\")) return Promise.resolve();\n  return reconcileDragon(actor);", to: "  return reconcileDragon(actor);" },
  { name: "the growth never takes back", file: A, from: "  if (stale.length) await companion.deleteEmbeddedDocuments(\"Item\", stale);", to: "" },
  { name: "the size is not recorded", file: A, from: "    await companion.update({ \"system.companion.grownSize\": growth.size });", to: "" },
  { name: "Wild Stride costs a pick", file: A, from: "    if (data.type === \"feat\" && cls) data.flags[SYSTEM_ID] = { ...(data.flags[SYSTEM_ID] ?? {}), grantedBy: { sourceId: cls.id, sourceName: cls.name, actorId: companion.id } };", to: "" },
  { name: "High Magic is not kept on", file: A, from: "  if (companion.flags?.[SYSTEM_ID]?.highMagic !== true) flagged[`flags.${SYSTEM_ID}.highMagic`] = true;", to: "" },
  { name: "the hatching records no level", file: A, from: "[MODULE_ID]: { [DRAGON_FLAG]: { base: species, baseLevel: int(base.baseLevel), hatchedAt: masterLevel } },", to: "[MODULE_ID]: { [DRAGON_FLAG]: { base: species, baseLevel: int(base.baseLevel) } }," },
  { name: "the hatching offers every dragon", file: A, from: "kind: DRAGON_KIND, only: [species], title: \"Dragon Tamer\",", to: "kind: DRAGON_KIND, title: \"Dragon Tamer\"," },
  { name: "the egg survives the hatching", file: A, from: "  await actor.deleteEmbeddedDocuments(\"Item\", [egg.id]);", to: "" },
  { name: "B10-9 BROKEN: every printed feat costs a pick", file: A, from: "    if ((base.freeFeats ?? []).map(norm).includes(norm(name)) && race) {", to: "    if (false) {" },
  { name: "the death is claimed after the first await", file: A, from: "  breaking.add(victim.id);\n  try {\n    const master = masterOf(victim);", to: "  try {\n    await null;\n    breaking.add(victim.id);\n    const master = masterOf(victim);" },
  { name: "the dragon is taken for dead without asking", file: A, from: "    if (!(await deadNow(victim))) {\n      if (ours", to: "    if (false) {\n      if (ours" },
  { name: "B10-13 BROKEN: the death's drain is half its level", file: A, from: "    await api.holdSoulDrain(master, SOUL_DEATH, level);", to: "    await api.holdSoulDrain(master, SOUL_DEATH, apartDrain(level));" },
  { name: "the weekly point is released but not healed", file: A, from: "const released = await api.releaseSoulDrain(master, SOUL_DEATH, { amount: due, heal: true });", to: "const released = await api.releaseSoulDrain(master, SOUL_DEATH, { amount: due });" },
  { name: "the weeks already counted are counted again", file: A, from: "    const due = Math.floor(bondDays(next, now) / 7) - int(bond.weeks);", to: "    const due = Math.floor(bondDays(next, now) / 7);" },
  { name: "the −2 outlives the last point", file: A, from: "    if (!left) {\n      // ONE BOND", to: "    if (false) {\n      // ONE BOND" },
  { name: "restored within a week is still broken", file: A, from: "    if (alive && restoredInTime(restoredDays)) {", to: "    if (false) {" },
  { name: "the insanity is said every day", file: A, from: "    if (alive && !bond.insane) {", to: "    if (alive) {" },
  { name: "a player may separate the bond", file: A, from: "  if (!game.user?.isGM) { ui.notifications.info(`Dragon Tamer: you are bonded to ${dragon.name}. The GM marks a separation from this button.`); return false; }\n", to: "" },
  { name: "the reunion heals the Soul Drain", file: A, from: "    await api.releaseSoulDrain(master, SOUL_APART, {});\n    await endBond(master);\n    return [", to: "    await api.releaseSoulDrain(master, SOUL_APART, { heal: true });\n    await endBond(master);\n    return [" },
  { name: "Deflecting Wings for any size", file: A, from: "    find: (actor) => (largeOrBigger(actor) ? Array.from(actor?.items ?? []).find((i) => i.type === \"feat\" && norm(i.name) === \"deflecting wings\") ?? null : null),", to: "    find: (actor) => Array.from(actor?.items ?? []).find((i) => i.type === \"feat\" && norm(i.name) === \"deflecting wings\") ?? null," },
  { name: "Deflecting Wings lasts past the attack", file: A, from: "changes: [{ key: \"system.combat.defence.circumstance\", type: \"custom\", value: \"2\", priority: 20 }], system: { oneAttack: true }", to: "changes: [{ key: \"system.combat.defence.circumstance\", type: \"custom\", value: \"2\", priority: 20 }], system: {}" },
  { name: "Tail Lash at −1", file: A, from: "extraModifiers: [{ label: \"Tail Lash\", value: -2, type: \"circumstance\" }]", to: "extraModifiers: [{ label: \"Tail Lash\", value: -1, type: \"circumstance\" }]" },
  { name: "Draconic Spell takes any tradition", file: A, from: "Array.from(index).filter((e) => /\\barcane\\b/i.test(String(e.system?.tradition ?? \"\")) && !e.system?.specialist && !owned.has(norm(e.name)))", to: "Array.from(index).filter((e) => !e.system?.specialist && !owned.has(norm(e.name)))" },
  { name: "Draconic Spell's spell is not innate", file: A, from: "  data.system.innate = true;\n  // A Focus", to: "  // A Focus" },
  { name: "Draconic Spell's spell arrives spent", file: A, from: "  data.system.usesValue = 1;\n", to: "" },
  // E — wiring
  { name: "the kind is not registered", file: A, from: "  api.registerCompanionKind?.({ ...DRAGON_KIND_SPEC }, moduleId);\n", to: "" },
  { name: "Dragon Tamer is not an archetype", file: A, from: "  api.registerArchetype?.(\"Dragon Tamer\", {}, moduleId);\n", to: "" },
  { name: "Block 10 is not registered", file: REG, from: "  registerBlock10(api, moduleId);\n", to: "" },
  { name: "no growth on a level change", file: SCRIPT, from: "Hooks.on(\"updateActor\", (actor, changes) => { onActorUpdatedB10(actor, changes)", to: "Hooks.on(\"updateToken\", (actor, changes) => { onActorUpdatedB10(actor, changes)" },
  { name: "no death on the skull or Dying lifting", file: SCRIPT, from: "for (const hook of [\"createActiveEffect\", \"updateActiveEffect\", \"deleteActiveEffect\"]) Hooks.on", to: "for (const hook of [\"createActiveEffect\", \"updateActiveEffect\"]) Hooks.on" },
  { name: "the world's dragons are not brought into step", file: SCRIPT, from: "    reconcileAllDragons().catch", to: "    Promise.resolve().catch" },
  { name: "the module accepts 3.674.1", file: SCRIPT, from: "const REQUIRED_SYSTEM = \"3.674.2\";", to: "const REQUIRED_SYSTEM = \"3.674.1\";" },
  { name: "the manifest accepts 3.674.1", file: MANIFEST, from: "\"minimum\": \"3.674.2\"", to: "\"minimum\": \"3.674.1\"" },
  { name: "the manifest says 1.0.3", file: MANIFEST, from: "\"version\": \"1.0.4\"", to: "\"version\": \"1.0.3\"" },
  { name: "THE DEFECT: the packs have no root folder", file: MANIFEST, from: "  \"packFolders\": [", to: "  \"packFoldersX\": [" },
  { name: "a pack is left out of the folder", file: MANIFEST, from: "        \"it-dragons\",\n", to: "" },
  { name: "the dragons' pack extends the companions", file: MANIFEST, from: "      \"path\": \"packs/it-dragons\",\n      \"type\": \"Item\",\n      \"system\": \"trg-prime\"\n", to: "      \"path\": \"packs/it-dragons\",\n      \"type\": \"Item\",\n      \"system\": \"trg-prime\",\n      \"flags\": { \"trg-prime\": { \"extends\": \"companions\" } }\n" },
  { name: "the feats are not built", file: FOUND, from: ", ...BLOCK7_FEATS, ...BLOCK10_FEATS] },", to: ", ...BLOCK7_FEATS] }," },
  { name: "Dragon Tamer's status line is missing", file: STATUS, from: "  \"FA-02\": {\n    \"status\": \"Implemented\",", to: "  \"FA-02\": {\n    \"status\": \"Planned\"," },
  { name: "the inventory files the dragons with the companions", file: INV, from: "DC-03|Ch5 p62|Cold Dragon (base)|Companion|Stat block p62|D10|A|PACK:it-dragons race item|D10", to: "DC-03|Ch5 p62|Cold Dragon (base)|Companion|Stat block p62|D10|A|PACK:it-companions race item|D10" }
];

const VERIFY = f("tools", "verify-block10.mjs");
function run() { try { execFileSync(process.execPath, [VERIFY], { stdio: ["ignore", "pipe", "pipe"], env: process.env }); return true; } catch { return false; } }

const originals = new Map([...new Set(MUTATIONS.map((m) => m.file))].map((file) => [file, fs.readFileSync(file, "utf8")]));
const restore = () => { for (const [file, text] of originals) fs.writeFileSync(file, text); };
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restore(); process.exit(130); });
process.on("exit", restore);

const results = [];
if (!run()) { process.stderr.write("mutate-block10: verify-block10 already fails on an unmodified tree.\n"); process.exit(2); }
for (const mu of MUTATIONS) {
  const original = originals.get(mu.file);
  const n = original.split(mu.from).length - 1;
  if (n !== 1) { results.push({ name: mu.name, state: n === 0 ? "ANCHOR MISSING" : `ANCHOR AMBIGUOUS (${n})` }); continue; }
  fs.writeFileSync(mu.file, original.replace(mu.from, mu.to));
  const survived = run();
  fs.writeFileSync(mu.file, original);
  results.push({ name: mu.name, state: survived ? "SURVIVED" : "caught" });
}
restore();
const bad = results.filter((r) => r.state !== "caught");
for (const r of results) process.stdout.write(`  ${r.state === "caught" ? "caught  " : r.state.padEnd(8)}  ${r.name}\n`);
process.stdout.write(bad.length ? `\nmutate-block10: FAILED — ${bad.length} of ${results.length} not caught.\n` : `\nmutate-block10: OK — all ${results.length} mutations caught, files restored.\n`);
if (bad.length) process.exitCode = 1;
