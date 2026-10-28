#!/usr/bin/env node
/**
 * verify-block9 — Inner Tempest Block 9 (0.10.0; 0.10.1's Sash): Chapter 6's armour, Chapter
 * 9's magic items, Monastic Items and the Appendix's aging, checked against
 * the book, against the system that reads them, and by driving the
 * decisions.
 *
 *   TRG_PRIME_ROOT=../core/trg-prime node tools/verify-block9.mjs
 *
 * Needs TRG Prime 3.673.0 at TRG_PRIME_ROOT.
 *
 *   A  The book (tools/content/book-text-block9.json, cut from the v1.2 docx by
 *      tools/content/extract-book-block9.mjs): every armour number and
 *      paragraph, every rune's, tier's and item's level, price and text, the
 *      aging tables
 *   B  The system reads them: the armour's coverage and helm, the runes'
 *      declarations (each through the core's own reader), the specific items'
 *      runes, the wondrous abilities, the aura, the Create route, the age
 *      effect's shift
 *   C  The decisions: fear and charm, the Lotus's hour, the Sash's choice, the
 *      Incense, the Beads, the age categories race by race
 *   D  Registration and the Foundry half, driven with stand-ins: the Uses, the
 *      day's turn, the age effect kept in step
 *   E  Wiring: the hooks, versions, packs, status lines
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SYSTEM_ROOT = process.env.TRG_PRIME_ROOT ?? path.resolve(ROOT, "..", "core", "trg-prime");
const sys = (...p) => new URL(`file://${path.join(SYSTEM_ROOT, ...p)}`).href;

let checks = 0;
const failures = [];
function ok(label, condition, detail = "") { checks += 1; if (!condition) failures.push(`${label}${detail ? ` — ${detail}` : ""}`); }
function equal(label, actual, expected) { ok(label, JSON.stringify(actual) === JSON.stringify(expected), `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }

const B9 = await import("./content/block9.mjs");
const { PACKS } = await import("./content/foundation.mjs");
const { md } = await import("./content/markdown.mjs");
const auto9 = await import("../module/block9-automations.mjs");
const aging = await import("../module/aging.mjs");
const reg = await import("../module/registration.mjs");
const book = JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "content", "book-text-block9.json"), "utf8"));

const api = await import(sys("module", "module-api.mjs"));
const decl = await import(sys("module", "rune-declarations.mjs"));
const runeActions = await import(sys("module", "rune-actions.mjs"));
const catalogue = await import(sys("module", "rune-catalogue.mjs"));
const conditionals = await import(sys("module", "conditionals.mjs"));
const deathGuard = await import(sys("module", "combat", "death-guard.mjs"));
const hitLocation = await import(sys("module", "combat", "hit-location.mjs"));
const armourDesc = await import(sys("module", "armour-descriptions.mjs"));
const wondrousFx = await import(sys("module", "wondrous-effects.mjs"));
const auras = await import(sys("module", "creature-auras.mjs"));
const create = await import(sys("module", "create-crafting.mjs"));
const ageMods = await import(sys("module", "age-modifiers.mjs"));
const effectKinds = await import(sys("module", "magic", "effect-kinds.mjs")).catch(() => null);
const systemJson = JSON.parse(fs.readFileSync(path.join(SYSTEM_ROOT, "system.json"), "utf8"));

const strip = (html) => String(html).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const has = (doc, line) => strip(doc.system.description).includes(strip(md(line)));
const F = (doc) => doc.flags?.["trg-prime"] ?? {};
const num = (t) => (String(t).trim() === "-" ? null : Number(String(t).replace(/[,+]/g, "").replace(/\s*(gp|lbs?)$/i, "")));
const byName = (list, name) => list.find((d) => d.name === name);

/* ------------------------------------------------------------------ *
 * A. The book
 * ------------------------------------------------------------------ */

equal("A the nine armours, in the table's order", B9.BLOCK9_ARMOUR.map((d) => d.name), book.armour.rows.map((r) => r.name));
for (const row of book.armour.rows) {
  const d = byName(B9.BLOCK9_ARMOUR, row.name);
  const s = d.system;
  equal(`A ${row.name}: every number is the table's`,
    [s.itemLevel, s.price, s.penalty, s.maxDexBonus, s.dr, s.hp.max, s.speedPenalty, s.weight, s.traits, s.category],
    [num(row.level), num(row.price), num(row.acp), num(row.maxDex) ?? -1, num(row.dr) ?? 0, num(row.hp), num(row.speed) ?? 0, num(row.weight), row.traits,
      { "LIGHT ARMOUR": "Light", "MEDIUM ARMOUR": "Medium", "HEAVY ARMOUR": "Heavy", OTHER: "Other" }[row.section]]);
  const heading = row.name === "Oni-Mask" ? "ONI MASK" : row.name.toUpperCase();
  equal(`A ${row.name}: every paragraph the book prints is in its description`, book.armour.descriptions[heading].filter((l) => !has(d, l)), []);
}

const runeSource = {
  centredArmour: ["armourRunes", "CENTRED"], guarded: ["armourRunes", "GUARDED"], harmony: ["armourRunes", "HARMONY"], gracefulWind: ["armourRunes", "GRACEFUL WIND"],
  karmicResilience: ["armourRunes", "KARMIC RESILIENCE"], staunching: ["armourRunes", "STAUNCHING"], centredWeapon: ["weaponRunes", "CENTRED"],
  harmonyEdge: ["weaponRunes", "HARMONY EDGE"], mindful: ["weaponRunes", "MINDFUL"], soulfulStrike: ["weaponRunes", "SOULFUL STRIKE"], tranquilQuiver: ["weaponRunes", "TRANQUIL QUIVER"]
};
equal("A every rune the chapter prints is registered, armour's six and weapons' five",
  [Object.keys(book.magic.armourRunes.entries), Object.keys(book.magic.weaponRunes.entries)],
  [auto9.RUNES.filter((r) => runeSource[r.key][0] === "armourRunes").map((r) => runeSource[r.key][1]), auto9.RUNES.filter((r) => runeSource[r.key][0] === "weaponRunes").map((r) => runeSource[r.key][1])]);
{
  const wrong = [];
  for (const rune of auto9.RUNES) {
    const e = book.magic[runeSource[rune.key][0]].entries[runeSource[rune.key][1]];
    const words = e.traits.split(/\s+/).map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(", ");
    if (rune.traits !== words) wrong.push(`${rune.key} traits`);
    if (Array.isArray(rune.tiers)) {
      const tiers = Object.values(e.tiers);
      if (tiers.length !== rune.tiers.length) wrong.push(`${rune.key} tier count`);
      rune.tiers.forEach((t, i) => { if (num(tiers[i]?.fields.Level) !== t.level || num(tiers[i]?.fields.Price) !== t.price) wrong.push(`${rune.key} ${t.tier}`); });
    } else {
      if (num(e.fields.Level) !== rune.level) wrong.push(`${rune.key} level`);
      if (rune.price != null && num(e.fields.Price) !== rune.price) wrong.push(`${rune.key} price`);
      if (rune.armourPrice != null && (num(e.fields["Armour Price"]) !== rune.armourPrice || num(e.fields["Shield Price"]) !== rune.shieldPrice)) wrong.push(`${rune.key} prices`);
    }
    if ((e.fields.Activate ?? "") !== (rune.activate ?? "")) wrong.push(`${rune.key} activate`);
  }
  equal("A each rune's traits, levels, prices and activation are the book's, tier by tier", wrong, []);
}
equal("A nineteen rune items, every tier, each holding its book text and tier lines",
  [B9.BLOCK9_RUNES.length, B9.BLOCK9_RUNES.filter((d) => {
    const rune = auto9.RUNES.find((r) => r.key === F(d).rune.key);
    const e = book.magic[runeSource[rune.key][0]].entries[runeSource[rune.key][1]];
    const tierLines = Array.isArray(rune.tiers) ? Object.values(e.tiers)[F(d).rune.tier - 1].lines : [];
    return ![...e.lines, ...tierLines, e.flavour].every((l) => has(d, l));
  }).map((d) => d.name)], [19, []]);
equal("A Centred is two items per tier, named for what they go on", B9.BLOCK9_RUNES.filter((d) => /^Centred/.test(d.name)).map((d) => [d.name, d.system.price]),
  [["Centred I (Armour)", 750], ["Centred II (Armour)", 4200], ["Centred III (Armour)", 16000], ["Centred I (Weapon)", 350], ["Centred II (Weapon)", 1400], ["Centred III (Weapon)", 6000]]);
ok("A Mindful's effect is printed in v1.2 (beside an image; B9-4 corrected) and the rune carries it",
  book.magic.weaponRunes.entries.MINDFUL.lines.some((l) => /^Add your Wisdom ability score to your next attack roll with the weapon/.test(l))
  && /Add your Wisdom ability score/.test(auto9.RUNES.find((r) => r.key === "mindful").effect));
{
  const e = book.magic.specificArmour.entries["HARMONIOUS DO-MARU"];
  const d = byName(B9.BLOCK9_SPECIFIC, "Harmonious Do-maru");
  equal("A the Harmonious Do-maru: the printed level, price, weight, ACP, Max Dex, DR and HP (B9-9), and every paragraph",
    [d.system.itemLevel, d.system.price, d.system.weight, d.system.penalty, d.system.maxDexBonus, d.system.dr, d.system.hp.max, e.lines.filter((l) => !has(d, l))],
    [num(e.fields.Level), num(e.fields.Price), num(e.fields.Weight), num(e.fields.ACP), num(e.fields["MAX DEX"]), num(e.fields.DR), num(e.fields.HP), []]);
}
{
  const e = book.magic.specificWeapon.entries.SPIRITBLADE;
  const d = byName(B9.BLOCK9_SPECIFIC, "Spiritblade");
  equal("A the Spiritblade: the printed level, price, weight, every paragraph, and Fear (DC 20) on a critical; R14 (B9-8): a Master Nodachi, 1d10 bare, Balanced, the Nodachi's fumble DC",
    [d.system.itemLevel, d.system.price, d.system.weight, e.lines.filter((l) => !has(d, l)), F(d).specificItem.onCritical, d.system.damage, d.system.quality, d.system.superiorTraits, d.system.fumbleDC, `${d.system.damage}+${{ master: 2 }[d.system.quality]} S` === e.fields.Damage],
    [num(e.fields.Level), num(e.fields.Price), num(e.fields.Weight), [], { spell: "Fear", dc: 20, ap: 1 }, "1d10", "master", "Balanced", 12, true]);
}
equal("A the six wondrous items, in the book's order, each at its printed level, price and weight, with every paragraph",
  B9.BLOCK9_WONDROUS.map((d) => { const e = book.magic.wondrous.entries[d.name.toUpperCase()]; return [d.name, d.system.itemLevel === num(e.fields.Level), d.system.price === num(e.fields.Price), d.system.weight === (num(e.fields.Weight) ?? 0), [...e.lines, e.flavour].every((l) => has(d, l))]; }),
  Object.keys(book.magic.wondrous.entries).map((h) => [B9.BLOCK9_WONDROUS.find((d) => d.name.toUpperCase() === h)?.name, true, true, true, true]));
equal("A Incense: 5 gp a use, a common level 0 item", [B9.BLOCK9_GEAR[0].name, B9.BLOCK9_GEAR[0].system.price, B9.BLOCK9_GEAR[0].system.itemLevel], ["Incense", 5, 0]);
equal("A Monastic Items: the four rules the book prints are the route's (Meditation, Hard +2, the ticks; the ranks are Create's own)",
  [book.magic.monastic.length, auto9.MONASTIC_ROUTE.skill, auto9.MONASTIC_ROUTE.dcStep, auto9.MONASTIC_ROUTE.requires, auto9.MONASTIC_ROUTE.itemTypes, auto9.MONASTIC_ROUTE.ticks.length],
  [5, "meditation", 2, ["Inner Discipline"], ["magical"], 3]);
{
  const sign = (t) => (t === "-" ? 0 : Number(t));
  equal("A the Effects of Aging table, row by row",
    book.appendix.effects.map((r) => [r.category, sign(r.str), sign(r.dex), sign(r.con), sign(r.int), sign(r.wis), sign(r.cha)]),
    aging.AGE_CATEGORIES.map((c) => [aging.AGE_LABELS[c], ...["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"].map((a) => aging.AGE_EFFECTS[c][a])]));
  equal("A the Age Categories table's shares: 50%, 70%, 85%",
    book.appendix.categories.slice(2).map((r) => Number(/(\d+)%/.exec(r.age)[1]) / 100), Object.values(aging.THRESHOLD_SHARES));
  const read = (t) => (t === "—" ? null : Number(/^(\d+)/.exec(t)?.[1] ?? NaN));
  const rows = book.appendix.races.map((r) => {
    const name = r.race.replace(/[^A-Za-z]/g, "");
    const mine = aging.RACE_AGES[name];
    const printedFixed = /^\d+$/.test(r.middle) || /^\d+$/.test(r.venerable.replace("+", ""));
    const t = aging.ageThresholds(aging.raceAgeRow(name));
    return [name, Number(r.adult) === mine.adult,
      /Immortal/.test(r.lifespan) === Boolean(mine.immortal),
      // A printed figure: the threshold the table gives; a range: computed inside it.
      r.middle === "—" ? t.middleAged === null : printedFixed && !/[–*§]/.test(r.middle) ? t.middleAged === read(r.middle) : t.middleAged >= read(r.middle) && (!/–/.test(r.middle) || t.middleAged <= Number(r.middle.split("–")[1].replace(/\D/g, "")))];
  });
  equal("A the Racial Age Categories table: every race, adulthood, the immortal, and each Middle Aged threshold (printed, or within its range)",
    rows, book.appendix.races.map((r) => [r.race.replace(/[^A-Za-z]/g, ""), true, true, true]));
  equal("A the printed thresholds that stand: Dwarf, Halfling, Human, Kornargon, Tianzhi (Old printed 71 - 90, Venerable 91+)",
    ["Dwarf", "Halfling", "Human", "Kornargon", "Tianzhi"].map((n) => Object.values(aging.ageThresholds(aging.raceAgeRow(n)))),
    [[40, 175, 245, 298], [20, 75, 105, 128], [15, 45, 63, 77], [19, 60, 84, 95], [20, 50, 71, 91]]);
}

/* ------------------------------------------------------------------ *
 * B. The system reads them
 * ------------------------------------------------------------------ */

api.resetModuleRegistry?.();
equal("B TRG Prime takes every rune, none refused", [api.registerRunes(auto9.RUNES.map((r) => structuredClone(r)), "trg-inner-tempest"), api.registrationProblems?.() ?? []], [11, []]);
const worn = (name, runes, extra = {}) => ({ id: name, name, type: "armour", system: { equipped: true, category: "Medium", runes, ...extra }, flags: {} });
const held = (name, runes, extra = {}) => ({ id: name, name, type: "weapon", system: { equipped: true, runes, damage: "1d8", damageType: "piercing", attackMode: "missile", ...extra }, flags: {} });
const disciple = { type: "class", name: "Disciple" };
{
  const offer = (item) => decl.runeDeclaredBonuses(item, [item]).conditionals.map((c) => [c.value, c.type, c.when.actions[0], c.auto]);
  equal("B Centred: +1/+2/+3 item, pre-ticked on Refocus, on armour and on a weapon alike (C12)",
    [offer(worn("A", "Centred I")), offer(worn("A", "Centred III")), offer(held("W", "Centred II"))],
    [[[1, "item", "refocus", true]], [[3, "item", "refocus", true]], [[2, "item", "refocus", true]]]);
  equal("B the specific items' runes are read off their own lines",
    [catalogue.fieldToRunes("weapon", byName(B9.BLOCK9_SPECIFIC, "Spiritblade").system.runes).map((r) => [r.key, r.tier]), catalogue.fieldToRunes("armour", byName(B9.BLOCK9_SPECIFIC, "Harmonious Do-maru").system.runes).map((r) => [r.key, r.tier])],
    [[["potency", 3], ["centredWeapon", 2], ["soulfulStrike", 2]], [["potency", 1], ["harmony", 1]]]);
}
{
  const act = (item, key) => runeActions.runeActionsFor(item).find((a) => a.key === key);
  const harmony = act(worn("A", "Harmony"), "harmony");
  const shield = act({ id: "S", name: "S", type: "shield", system: { equipped: true, runes: "Harmony" }, flags: {} }, "harmony");
  const byClass = (rows, classes) => rows.map((r) => decl.classValued(r, classes)).map((r) => [r.key, r.value]);
  equal("B Harmony: Engage 1 AP, Focus, a minute; +2 dodge DB and +2 resistance to each save, +3 for a Disciple or Mystic (C3); on a shield too",
    [harmony.apCost, harmony.focus, harmony.durationSeconds, byClass(harmony.effect.changes, []), byClass(harmony.effect.changes, ["mystic"]).map((r) => r[1]), Boolean(shield)],
    [1, true, 60, [["system.combat.defence.dodge", "2"], ["system.combat.saves.fortitude.resistance", "2"], ["system.combat.saves.reflex.resistance", "2"], ["system.combat.saves.will.resistance", "2"]], ["3", "3", "3", "3"], true]);
  const wind = act(worn("A", "Graceful Wind"), "gracefulWind");
  equal("B Graceful Wind: Engage 1 AP, once a day, a minute of +30 ft status land Speed and +2 resistance Reflex",
    [wind.apCost, wind.focus, wind.durationSeconds, wind.effect.changes.map((c) => [c.key, c.value])],
    [1, false, 60, [["system.combat.movement.land.status", "30"], ["system.combat.saves.reflex.resistance", "2"]]]);
  const mindful = act(held("W", "Mindful"), "mindful");
  const fx = runeActions.nextStrikeEffect({ name: "Katana" }, mindful, { conditionals: mindful.effect.conditionals, expiresRound: 3 });
  const row = conditionals.normaliseConditional(fx.flags["trg-prime"].conditionals[0], { id: "e", name: "Katana — Mindful", kind: "effect" }, 0, { wisdom: 4 });
  equal("B Mindful: Engage (Focus), no minute; +Wisdom offered on the next attack, spent when ticked, lifted at the next turn (C7b)",
    [mindful.apCost, mindful.focus, mindful.durationSeconds, fx.flags["trg-prime"].conditionExpiresRound, row?.value, row?.type, row?.oneShot, row?.auto],
    [1, true, 0, 3, 4, "untyped", true, false]);
  const quiver = act(held("W", "Tranquil Quiver"), "tranquilQuiver");
  const qfx = runeActions.nextStrikeEffect({ name: "Bow" }, quiver, { conditionals: quiver.effect.conditionals });
  const sword = { id: "K", name: "Katana", type: "weapon", system: { equipped: true, runes: "Tranquil Quiver", damage: "1d10", damageType: "slashing", attackMode: "melee" }, flags: {} };
  equal("B Tranquil Quiver: any ranged weapon only (no button on a katana); +2 status on the next ranged attack and a once-rider of 1d6 precision beyond 30 ft (C7)",
    [act(sword, "tranquilQuiver") ?? null, quiver.focus, qfx.flags["trg-prime"].conditionals[0].value, qfx.flags["trg-prime"].conditionals[0].when.attackModes, qfx.flags["trg-prime"].strikeRider.once, qfx.flags["trg-prime"].strikeRider.beyondFeet, qfx.flags["trg-prime"].strikeRider.precision],
    [null, true, 2, ["ranged"], true, 30, true]);
  const soulful = runeActions.runeActionsFor(held("W", "Soulful Strike II")).find((a) => a.declaredEnergy);
  equal("B Soulful Strike: a Command button switching an energy rune (C6); force 1d6/2d6/3d6, a secondary critical −40/−20 at II/III (B9-2)",
    [Boolean(soulful), soulful?.apCost, decl.registeredEnergyRune("soulfulStrike")?.type, decl.registeredEnergyRune("soulfulStrike")?.tiers.map((t) => [t.dice, t.secondaryCritical])],
    [true, 1, "force", [["1d6", null], ["2d6", -40], ["3d6", -20]]]);
}
{
  const carriers = decl.runeDeathGuardCarriers([worn("A", "Karmic Resilience"), disciple]);
  const spec = deathGuard.declaredDeathGuards(carriers)[0];
  const plain = deathGuard.declaredDeathGuards(decl.runeDeathGuardCarriers([worn("A", "Karmic Resilience"), { type: "class", name: "Kensai" }]))[0];
  equal("B Karmic Resilience: a guard offered to its own player as a reaction, once a day, not against massive damage; +4 to dying checks for a Disciple, +2 for a Kensai, for a minute (C1)",
    [spec?.offer, spec?.reaction, spec?.askOwner, spec?.frequency, spec?.notOutright, spec?.grants?.seconds, spec?.grants?.conditionals[0].value, plain?.grants?.conditionals[0].value, spec?.grants?.conditionals[0].type, spec?.grants?.conditionals[0].when.actions],
    [true, true, true, "daily", true, 60, 4, 2, "circumstance", ["dyingCheck"]]);
  const ease = (r) => decl.runeBleedEasing([worn("A", r)]);
  equal("B Staunching I/II/III: the Light check 2/3/4 easier; a DC 16 check at Moderate (II) and at any band (III) (C2)",
    [ease("Staunching I").reduction, ease("Staunching II").reduction, ease("Staunching III").reduction,
      decl.bleedReduceReaches(ease("Staunching I").reduceCheck, "moderate"), decl.bleedReduceReaches(ease("Staunching II").reduceCheck, "moderate"), decl.bleedReduceReaches(ease("Staunching II").reduceCheck, "severe"), decl.bleedReduceReaches(ease("Staunching III").reduceCheck, "severe")],
    [2, 3, 4, false, true, false, true]);
  equal("B Guarded and Harmony Edge: once a day each, read off the worn armour and the wielded weapon (C4, C5)",
    [decl.runeCriticalGuard([worn("A", "Guarded")], 0)?.frequency, decl.runeCriticalGuard([worn("A", "Guarded", { equipped: false })], 0), decl.runeCriticalAdvantage(held("W", "Harmony Edge"), 0)?.frequency],
    ["daily", null, "daily"]);
}
{
  const domaru = byName(B9.BLOCK9_ARMOUR, "Do-maru");
  const covers = (d) => ["chest", "arms", "legs", "headNeck"].map((l) => hitLocation.armourPieceCoversLocation(d, l));
  equal("B coverage: the Do-maru the torso and legs, not the arms (B9-1); the Yoroi all four; the helmets the head",
    [covers(domaru), covers(byName(B9.BLOCK9_ARMOUR, "Yoroi")), covers(byName(B9.BLOCK9_ARMOUR, "Jingasa")), covers(byName(B9.BLOCK9_SPECIFIC, "Harmonious Do-maru"))],
    [[true, false, true, false], [true, true, true, true], [false, false, false, true], [true, false, true, false]]);
  equal("B the Yoroi's Helm costs −1 Perception; the masks and hats print none",
    ["Yoroi", "Oni-Mask", "Jingasa"].map((n) => armourDesc.armourPerceptionPenalty(byName(B9.BLOCK9_ARMOUR, n))), [-1, 0, 0]);
  const items = [{ ...byName(B9.BLOCK9_ARMOUR, "Shozoku"), id: "s", system: { ...byName(B9.BLOCK9_ARMOUR, "Shozoku").system, equipped: true } },
    { ...byName(B9.BLOCK9_ARMOUR, "Oni-Mask"), id: "o", system: { ...byName(B9.BLOCK9_ARMOUR, "Oni-Mask").system, equipped: true } }];
  const found = conditionals.collectConditionals(items, [], [], {});
  equal("B Shozoku's +2 on Hide and the Oni-Mask's +1 item on Intimidate are offered while worn (interpretation 1)",
    found.map((c) => [c.source, c.value, c.type, c.auto]), [["Shozoku", 2, "circumstance", false], ["Oni-Mask", 1, "item", false]]);
}
{
  const inv = (d) => ({ ...d, id: d._id, system: { ...d.system, invested: true, equipped: true } });
  const fx = (name) => wondrousFx.wondrousBonusesFor(inv(byName(B9.BLOCK9_WONDROUS, name)));
  equal("B the wondrous items as the system reads them: the Beads' +1 status Wisdom, the Sash's +1 dodge DB, the Robe's DR 1 as armour",
    [fx("Enlightened Prayer Beads").bonuses.map((b) => [b.target, b.entry.value, b.entry.type]), fx("Sash of Serenity").bonuses.map((b) => [b.target, b.entry.value, b.entry.type]), fx("Monastic Robe of Resilience").baseDR.map((b) => b.value)],
    [[["system.attributes.wisdom", 1, "status"]], [["system.combat.defence", 1, "dodge"]], [1]]);
  equal("B every Use names a registered automation", B9.BLOCK9_WONDROUS.flatMap((d) => F(d).wondrous.abilities.filter((a) => a.kind === "use").map((a) => [d.name, Boolean(auto9.ITEM_AUTOMATIONS[a.automation]), a.frequency])),
    [["Enlightened Prayer Beads", true, "daily"], ["Lotus Blossom", true, "daily"], ["Mystic Incense Burner", true, "atWill"], ["Restorative Mat", true, "daily"], ["Sash of Serenity", true, "daily"]]);
  ok("B the Robe takes armour runes, like Travellers clothing", F(byName(B9.BLOCK9_WONDROUS, "Monastic Robe of Resilience")).runeBearing === "armour");
  const sash = conditionals.collectConditionals([inv(byName(B9.BLOCK9_WONDROUS, "Sash of Serenity")), inv(byName(B9.BLOCK9_WONDROUS, "Restorative Mat"))], [], [], {});
  const fearSave = { checkType: "save", subject: "will", traits: ["fear", "emotion"] };
  equal("B the Sash's +2 is taken on a fear save and offered on another (not taken); the Mat's +2 is offered on Meditation",
    [conditionals.automaticSelections(sash, fearSave).modifiers.map((m) => [m.value, m.type]), conditionals.automaticSelections(sash, { checkType: "save", subject: "will", traits: [] }).modifiers.length, sash.filter((c) => !c.auto && conditionals.matchesCheck(c, { checkType: "save", subject: "will", traits: [] })).map((c) => c.value),
      sash.filter((c) => !c.auto && conditionals.matchesCheck(c, { checkType: "skill", subject: "meditation" })).map((c) => [c.source, c.value])],
    [[[2, "resistance"]], 0, [2], [["Restorative Mat", 2]]]);
}
{
  const burner = byName(B9.BLOCK9_WONDROUS, "Mystic Incense Burner");
  const unlit = auras.aurasOf([{ ...burner, id: "b" }], 5);
  const lit = auras.aurasOf([{ ...burner, id: "b", flags: { "trg-prime": { ...F(burner), runeState: { lit: true } } } }], 5);
  equal("B the burner's aura: nothing unlit; lit, 30 feet over every creature, you included, laying the offers (C9, B9-7)",
    [unlit.length, lit.length, lit[0]?.radius ?? auras.auraRadiusFeet(lit[0] ?? {}), lit[0]?.includeSelf, Boolean(lit[0]?.allyEffect), Boolean(lit[0]?.enemyEffect), lit[0]?.allyEffect?.conditionals.length],
    [0, 1, 30, true, true, true, 3]);
}
{
  const route = create.normaliseCreateRoute(auto9.MONASTIC_ROUTE);
  equal("B Monastic Items is a route the system takes: Meditation, Magical items, for a holder of Inner Discipline, +2 (C8)",
    [route?.skill, route?.itemTypes, route?.dcStep, create.createRouteFor([route], "meditation", ["Inner Discipline"])?.key, create.createRouteFor([route], "meditation", ["Flurry of Blows"])],
    ["meditation", ["magical"], 2, "monasticItems", null]);
}
{
  const s = aging.agingFor({ age: "70", race: "Human" });
  const effect = { flags: { "trg-prime": { age: s.category } }, changes: s.changes };
  const shift = ageMods.ageShiftOf([effect]);
  equal("B the age effect's changes are what TRG Prime takes back out of HP and the skill budget (C10)",
    [s.category, s.changes.map((c) => [c.key, c.value, c.type]).slice(0, 2), shift.constitution, shift.intelligence, ageMods.withoutAge(1, shift, "constitution")],
    ["old", [["system.attributes.strength.untyped", "-2", "custom"], ["system.attributes.dexterity.untyped", "-2", "custom"]], -2, 2, 3]);
}

/* ------------------------------------------------------------------ *
 * C. The decisions
 * ------------------------------------------------------------------ */

equal("C fear and charm: Frightened, or an effect whose source is Fear or Charm; a Fleeing from elsewhere and a blessing stay",
  auto9.fearOrCharmEffectIds([{ id: "a", statuses: ["frightened"] }, { id: "b", statuses: ["fleeing"], sourceTraits: "Enchantment, Fear" }, { id: "c", sourceTraits: ["charm"] },
    { id: "d", statuses: ["fleeing"], sourceTraits: "" }, { id: "e", sourceTraits: "Blessing" }]), ["a", "b", "c"]);
{
  const rows = auto9.lotusConditionals("Lotus Blossom").map((r, i) => conditionals.normaliseConditional(r, { id: "x", name: "L", kind: "effect" }, i, {}));
  equal("C the Lotus's hour: advantage taken on a save against fear or charm, offered on another (the table decides)",
    [conditionals.automaticSelections(rows, { checkType: "save", subject: "will", traits: ["charm"] }).kinds, conditionals.automaticSelections(rows, { checkType: "save", subject: "will", traits: [] }).kinds, rows.filter((r) => !r.auto && conditionals.matchesCheck(r, { checkType: "save", subject: "fortitude", traits: [] })).length],
    [["advantage"], [], 1]);
}
{
  // Graham's answers of 27 October 2026 (0.10.2): the Harmonious Do-maru's DB
  // is +1 (Potency I applies), and the Spiritblade's fumble DC is 11.
  const dm = strip(byName(B9.BLOCK9_SPECIFIC, "Harmonious Do-maru").system.description);
  const sb = strip(byName(B9.BLOCK9_SPECIFIC, "Spiritblade").system.description);
  ok("L2 the GM notes carry Graham's answers: the Do-maru's DB is +1, the Spiritblade's fumble DC 11; neither is put as a question",
    /ruled on 27 October 2026 that the DB is \+1/.test(dm) && !/may remove Potency I/.test(dm) && /fumble DC is 11/.test(sb));
}
equal("C the Sash: any save, or one kind; spent once used",
  [auto9.serenityConditional("S").when, auto9.serenityConditional("S", "reflex").when, auto9.serenityConditional("S", "will").oneShot, auto9.serenityConditional("S").auto],
  [{ checkTypes: ["save"] }, { checkTypes: ["save"], subjects: ["reflex"] }, true, false]);
{
  // 0.10.1 (F1, found live): a forced save asks no tick-box, so a kind chosen
  // at the Use is TAKEN on the next save of that kind, and spent; "any" stays
  // a tick-box. Driven through the core's own automatic route.
  const fx = (choice) => ({ id: "fx", name: "Sash — Serenity", flags: { "trg-prime": { conditionals: [auto9.serenityConditional("Sash", choice)] } } });
  const auto = (choice, subject) => conditionals.automaticSelections(conditionals.collectConditionals([], [fx(choice)], [], {}), { checkType: "save", subject, traits: [] });
  equal("L1 a chosen kind is taken on the next save of that kind, forced or not, and spent; another kind, or \"any\", takes nothing unasked",
    [auto("reflex", "reflex").kinds, (auto("reflex", "reflex").spent ?? []).map((x) => x.sourceId), auto("reflex", "will").kinds, auto("any", "reflex").kinds,
      ["fortitude", "reflex", "will"].map((k) => auto9.serenityConditional("S", k).auto), auto9.serenityConditional("S", "will").scope],
    [["advantage"], ["fx"], [], [], [true, true, true], "Your next will save within the minute"]);
}
equal("C the Incense burned is the first with any left; none is none",
  [auto9.incenseOf([{ type: "gear", name: "Incense", system: { quantity: 0 } }, { type: "gear", name: "incense", system: { quantity: 3 }, id: "two" }])?.id, auto9.incenseOf([{ type: "consumable", name: "Incense", system: { quantity: 2 } }])],
  ["two", null]);
equal("C the Beads: advantage on the next Refocus, taken automatically, once", auto9.beadsPending("B"), { kind: "advantage", label: "B", scope: "Your next Refocus (Mental Focus) check today", oneShot: true, auto: true, actions: ["refocus"] });
{
  const cat = (age, race, lifespan = null, resisted = false) => aging.agingFor({ age, race, chosenLifespan: lifespan, resisted });
  equal("C the categories: a Human at 14, 15, 44, 45, 63, 77; an Elf at 900; an Orc at 60, and at 60 with a GM's 50",
    [cat("14", "Human").category, cat("15 years", "Human").category, cat("44", "Human").category, cat("45", "Human").category, cat("63", "Human").category, cat("77", "Human").category,
      cat("900", "Elf").category, cat("60", "Orc ‡").category, cat("60", "Orc", 50).category],
    ["juvenile", "adult", "adult", "middleAged", "old", "venerable", "adult", "adult", "venerable"]);
  equal("C a range: a Miraku's lifespan is 250 unless the GM says, its thresholds 125/175/213, or from the GM's 280 140/196/238",
    [cat("130", "Miraku").lifespan, Object.values(cat("130", "Miraku").thresholds), Object.values(cat("130", "Miraku", 280).thresholds), cat("130", "Miraku", 280).category],
    [250, [18, 125, 175, 213], [18, 140, 196, 238], "adult"]);
  equal("C a printed row stands at its own lifespan and moves with another; Tianzhi's always stands",
    [Object.values(cat("90", "Kornargon").thresholds), Object.values(cat("90", "Kornargon", 120).thresholds), Object.values(cat("90", "Kornargon", 100).thresholds), Object.values(cat("60", "Tianzhi", 200).thresholds)],
    [[19, 60, 84, 95], [19, 60, 84, 95], [19, 50, 70, 85], [20, 50, 71, 91]]);
  equal("C the modifiers replace each other; Age Resistance lifts only Str/Dex/Con penalties (interpretation 8)",
    [cat("50", "Human").changes.map((c) => Number(c.value)), cat("80", "Human", null, true).changes.map((c) => [c.key.split(".")[2], Number(c.value)]), cat("10", "Human", null, true).changes.map((c) => [c.key.split(".")[2], Number(c.value)])],
    [[-1, -1, -1, 1, 1, 1], [["intelligence", 3], ["wisdom", 3], ["charisma", 3]], [["dexterity", 1], ["wisdom", -1]]]);
  equal("C no age, an unknown race, or an Adult: nothing to lay; the lifespan reached is told",
    [cat("", "Human"), cat("40", "Lizardfolk"), cat("30", "Human").changes, cat("95", "Human").reachedLifespan, cat("89", "Human").reachedLifespan, cat("5000", "Elf").reachedLifespan],
    [null, null, [], true, false, false]);
}

/* ------------------------------------------------------------------ *
 * D. Registration, and the Foundry half driven with stand-ins
 * ------------------------------------------------------------------ */

const calls = [];
const fake = new Proxy({}, { get: (_, name) => (...args) => { calls.push([name, ...args]); return true; } });
reg.registerContent(fake, "trg-inner-tempest");
equal("D registration: the eleven runes, the five Uses and the Monastic route",
  [calls.filter((c) => c[0] === "registerRunes").map((c) => [c[1].length, c[2]]), calls.filter((c) => c[0] === "registerItemAutomation").map((c) => c[1]), calls.filter((c) => c[0] === "registerCreateRoute").map((c) => [c[1].key, c[2]])],
  [[[11, "trg-inner-tempest"]], ["beadsRefocus", "lotusBlossom", "incenseBurner", "restorativeMat", "sashSerenity"], [["monasticItems", "trg-inner-tempest"]]]);

const said = { cards: [], temp: [], crits: [], created: [], deleted: [], pending: [], timers: [], released: [], flags: {}, chats: [] };
let pick = null;
const helpersStub = {
  line: (t) => `<p>${t}</p>`,
  postCard: async (actor, title, lines) => { said.cards.push([title, lines.join(" ")]); },
  grantTempHP: async (actor, n) => { said.temp.push(n); return n; },
  rollCriticalInjury: async (roller, opts) => { said.crits.push([opts.damageType, opts.severity]); },
  createEffectsOn: async (actor, data) => { said.created.push(...data); },
  addPendingModifier: async (actor, entry) => { said.pending.push(entry); },
  chooseFromList: async () => pick,
  releaseItemSpell: async (actor, item, ref, opts) => { said.released.push([ref.name, ref.pp, opts.apPaid]); return { cast: true, missing: false }; }
};
const warned = [];
globalThis.ui = { notifications: { warn: (m) => warned.push(m) } };
globalThis.game = {
  trgPrime: { modules: { helpers: helpersStub, startItemTimer: async (actor, item, spec) => { said.timers.push([item.name, spec.key, spec.state, spec.durationSeconds]); } } },
  time: { worldTime: 1000 }, user: { id: "g", isGM: true }, users: Object.assign([{ id: "g", isGM: true }], { activeGM: { id: "g" } }),
  actors: [], settings: { get: () => true }
};
globalThis.fromUuid = async () => null;
const mkActor = (extra = {}) => {
  const a = {
    name: "Ana", id: "a", uuid: "Actor.a", documentName: "Actor", system: { identity: { level: 7 } }, effects: [], items: [], flags: {},
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; },
    async setFlag(scope, key, v) { this.flags[scope] = { ...(this.flags[scope] ?? {}), [key]: v }; said.flags[`${scope}.${key}`] = v; },
    async unsetFlag(scope, key) { if (this.flags[scope]) delete this.flags[scope][key]; said.flags[`${scope}.${key}`] = undefined; },
    async deleteEmbeddedDocuments(type, ids) { said.deleted.push(...ids); this.effects = this.effects.filter((e) => !ids.includes(e.id)); },
    async createEmbeddedDocuments(type, data) { said.created.push(...data); this.effects.push(...data.map((d, i) => ({ id: `new${this.effects.length + i}`, disabled: false, ...d }))); },
    ...extra
  };
  return a;
};
const bottle = { name: "Lotus Blossom", id: "l", uuid: "Item.l", img: "i", flags: {} };
{
  const actor = mkActor({ effects: [{ id: "f", name: "Frightened", statuses: new Set(["frightened"]), flags: {} }, { id: "k", name: "Bless", statuses: new Set(), flags: { "trg-prime": { sourceTraits: "Blessing" } } }] });
  await auto9.ITEM_AUTOMATIONS.lotusBlossom.use(actor, bottle);
  const first = [said.temp.slice(), said.crits.slice(), said.deleted.slice(), said.created.at(-1)?.flags["trg-prime"].spellEffectEnd, actor.getFlag("trg-inner-tempest", auto9.LOTUS_FLAG)];
  await auto9.ITEM_AUTOMATIONS.lotusBlossom.use(actor, { ...bottle, id: "l2" });
  equal("D the Lotus: 7 temporary HP at 7th, Frightened ended and the blessing kept, an hour of advantage; a second bottle that day rolls a serious poison critical first (B9-6)",
    [first, said.crits], [[[7], [], ["f"], 4600, true], [["poison", "serious"]]]);
  await auto9.onDailyPreparationB9({ actor });
  ok("D …and the day begins again at daily preparation", actor.getFlag("trg-inner-tempest", auto9.LOTUS_FLAG) === undefined);
}
{
  const incense = { type: "gear", name: "Incense", system: { quantity: 2 }, async update(d) { this.system.quantity = d["system.quantity"]; }, async delete() { said.deleted.push("incense"); } };
  const actor = mkActor({ items: [incense] });
  const burner = { name: "Mystic Incense Burner", flags: {} };
  const ran = await auto9.ITEM_AUTOMATIONS.incenseBurner.use(actor, burner);
  const again = await auto9.ITEM_AUTOMATIONS.incenseBurner.use(actor, { ...burner, flags: { "trg-prime": { runeState: { lit: true } } } });
  incense.system.quantity = 1;
  await auto9.ITEM_AUTOMATIONS.incenseBurner.use(actor, burner);
  const none = await auto9.ITEM_AUTOMATIONS.incenseBurner.use(mkActor(), burner);
  const stopped = [];
  globalThis.game.trgPrime.modules.stopItemTimer = async (a, item, key) => { stopped.push([item.name, key]); return true; };
  pick = "out";
  const putOut = await auto9.ITEM_AUTOMATIONS.incenseBurner.use(actor, { ...burner, flags: { "trg-prime": { runeState: { lit: true } } } });
  pick = null;
  equal("D the burner: one Incense burned for an hour lit (C9); while lit its Use only puts it out, burning nothing; the last is used up; none, nothing",
    [ran, said.timers[0], again, said.deleted.includes("incense"), none, said.timers.length, putOut, stopped], [true, ["Mystic Incense Burner", "incense", "lit", 3600], false, true, false, 2, false, [["Mystic Incense Burner", "incense"]]]);
}
{
  pick = "Restoration";
  const out = await auto9.ITEM_AUTOMATIONS.restorativeMat.use(mkActor(), { name: "Restorative Mat" });
  pick = null;
  const refused = await auto9.ITEM_AUTOMATIONS.restorativeMat.use(mkActor(), { name: "Restorative Mat" });
  equal("D the Mat: the chosen spell released from the mat at 8 PP, its ten minutes already spent (C11); no choice, no use",
    [out, said.released, refused], [true, [["Restoration", 8, true]], false]);
}
{
  pick = "will";
  said.created.length = 0;
  await auto9.ITEM_AUTOMATIONS.sashSerenity.use(mkActor(), { name: "Sash of Serenity", id: "s" });
  const fx = said.created[0];
  equal("D the Sash: a minute's advantage on the chosen save, taken on it and spent; the card says so",
    [fx.flags["trg-prime"].spellEffectEnd, fx.flags["trg-prime"].conditionals[0].when, fx.flags["trg-prime"].conditionals[0].oneShot, fx.flags["trg-prime"].conditionals[0].auto,
      /your next <strong>Will<\/strong> save/.test(said.cards.at(-1)?.[1] ?? ""), /forced or rolled from the sheet/.test(said.cards.at(-1)?.[1] ?? "")],
    [1060, { checkTypes: ["save"], subjects: ["will"] }, true, true, true, true]);
}
{
  const actor = mkActor({ items: [{ name: "Enlightened Prayer Beads", flags: { "trg-prime": { wondrous: { abilities: [{ kind: "use", automation: "beadsRefocus" }] } } } }] });
  await auto9.ITEM_AUTOMATIONS.beadsRefocus.use(actor, { name: "Enlightened Prayer Beads" });
  actor.flags["trg-prime"] = { pendingModifiers: [{ label: "Enlightened Prayer Beads", actions: ["refocus"] }, { label: "Treat Disease", actions: [] }] };
  await auto9.onDailyPreparationB9({ actor });
  equal("D the Beads queue their advantage; an unspent one lapses at daily preparation, and nothing else does",
    [said.pending.at(-1).actions, actor.flags["trg-prime"].pendingModifiers.map((r) => r.label)], [["refocus"], ["Treat Disease"]]);
}
{
  const flow = await import("../module/aging-workflow.mjs");
  globalThis.ChatMessage = { create: async (m) => { said.chats.push(m); } };
  said.created.length = 0; said.deleted.length = 0;
  const actor = mkActor({ system: { identity: { age: "50", race: "Human", level: 3 } } });
  await flow.reconcileAging(actor);
  const first = said.created.map((e) => [e.name, e.flags["trg-prime"].age, e.changes.length]);
  await flow.reconcileAging(actor);
  const steady = said.created.length;
  actor.system.identity.age = "70";
  await flow.reconcileAging(actor);
  const old = [said.deleted.length, said.created.at(-1).name];
  actor.effects.push({ id: "ar", disabled: false, flags: { "trg-inner-tempest": { ageResistance: { dc: null } } } });
  await flow.reconcileAging(actor);
  const resisted = said.created.at(-1).changes.map((c) => c.value);
  actor.system.identity.age = "30";
  await flow.reconcileAging(actor);
  const adult = actor.effects.filter((e) => e.flags?.["trg-inner-tempest"]?.aging).length;
  actor.system.identity.age = "91";
  await flow.reconcileAging(actor);
  await flow.reconcileAging(actor);
  equal("D the age effect: laid once, kept, replaced when the category moves, lightened by Age Resistance, lifted for an Adult; the GM told once at the lifespan",
    [first, steady, old, resisted, adult, said.chats.length, said.chats[0]?.whisper],
    [[["Age: Middle Aged", "middleAged", 6]], 1, [1, "Age: Old"], ["2", "2", "2"], 0, 1, ["g"]]);
  globalThis.game.settings.get = () => false;
  await flow.reconcileAging(actor);
  globalThis.game.settings.get = () => true;
  ok("D the setting off lifts it (B9-10)", actor.effects.filter((e) => e.flags?.["trg-inner-tempest"]?.aging).length === 0);
  globalThis.game.user = { id: "p", isGM: false };
  const before = said.created.length;
  await flow.reconcileAging(mkActor({ system: { identity: { age: "80", race: "Human" } } }));
  ok("D only the acting GM writes", said.created.length === before);
}

/* ------------------------------------------------------------------ *
 * E. Wiring
 * ------------------------------------------------------------------ */

const script = fs.readFileSync(path.join(ROOT, "scripts", "inner-tempest.mjs"), "utf8");
ok("E the hooks: daily preparation, the setting at init, the actor, its race, Age Resistance, the sheet, and the world on load",
  /Hooks\.on\("trgPrimeDailyPreparation", \(ctx\) => \{ onDailyPreparationB9\(ctx\)/.test(script) && /Hooks\.once\("init", \(\) => registerAgingSetting\(\)\);/.test(script)
  && /Hooks\.on\("updateActor", \(actor, changes\) => \{ onActorUpdatedAging\(actor, changes\)/.test(script)
  && /for \(const hook of \["createItem", "deleteItem"\]\) Hooks\.on\(hook, \(item\) => \{ onItemChangedAging\(item\)/.test(script)
  && /for \(const hook of \["createActiveEffect", "deleteActiveEffect"\]\) Hooks\.on\(hook, \(effect\) => \{ onEffectChangedAging\(effect\)/.test(script)
  && /Hooks\.on\("renderTRGActorSheet", \(app, element\) => \{ try \{ onRenderActorSheetAging\(app, element\);/.test(script)
  && /reconcileAllAging\(\)\.catch/.test(script));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8"));
equal("E the module is 1.0.2, built for 3.674.2, downloaded from its own release", [manifest.version, manifest.relationships.systems[0].compatibility.minimum, manifest.download],
  ["1.0.2", "3.674.2", "https://github.com/snowtroll75-debug/trg-inner-tempest/releases/download/v1.0.2/trg-inner-tempest.zip"]);
ok("E the script refuses an older system", script.includes('const REQUIRED_SYSTEM = "3.674.2";'));
{
  const [sa, sb] = String(systemJson.version).split(".").map(Number);
  ok("E the system at TRG_PRIME_ROOT is 3.673.0 or later", sa > 3 || (sa === 3 && sb >= 673), systemJson.version);
}
{
  const want = { "it-armour": ["armour", B9.BLOCK9_ARMOUR], "it-runes": ["runes", B9.BLOCK9_RUNES], "it-specific-items": ["specific-items", B9.BLOCK9_SPECIFIC], "it-wondrous": ["wondrous", B9.BLOCK9_WONDROUS], "it-gear": ["gear", B9.BLOCK9_GEAR] };
  equal("E five packs, each beside its core pack in the manifest and the build",
    Object.entries(want).map(([name, [ext, docs]]) => {
      const pack = PACKS.find((p) => p.name === name);
      const m = manifest.packs.find((p) => p.name === name);
      const dir = path.join(ROOT, "packs-source", name);
      const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
      return [name, pack?.extends === ext && pack.docs === docs, m?.flags?.["trg-prime"]?.extends === ext, docs.every((d) => files.some((f) => f.endsWith(`_${d._id}.json`)))];
    }), Object.keys(want).map((n) => [n, true, true, true]));
}
{
  const status = JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "inventory", "status.json"), "utf8"));
  const ids = ["GE-01", ...Array.from({ length: 9 }, (_, i) => `AR-0${i + 1}`), ...Array.from({ length: 20 }, (_, i) => `MI-${String(i + 1).padStart(2, "0")}`), "AP-01", "AP-02"];
  equal("E a status line for each: the armour, the twenty magic-item lines (Monastic Items' new one), the appendix and starting wealth",
    ids.map((id) => [id, status[id]?.status, status[id]?.achieved]), ids.map((id) => [id, "Implemented", id === "MI-16" ? "B" : "A"]));
  ok("E the inventory carries Monastic Items' line", /^MI-20\|Ch9 p79\|Monastic Items \(crafting\)\|/m.test(fs.readFileSync(path.join(ROOT, "tools", "inventory", "inventory.txt"), "utf8")));
}

const EXPECTED = 84;
equal("Z the suite ran every check it is meant to", checks + 1, EXPECTED);
if (failures.length) { console.log(`verify-block9: ${checks} checks — ${failures.length} FAILED\n`); for (const x of failures) console.log(`  ✗ ${x}`); process.exitCode = 1; }
else console.log(`verify-block9: ${checks} checks — all green.`);
