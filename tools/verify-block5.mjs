#!/usr/bin/env node
/**
 * verify-block5 — Inner Tempest Block 5 (0.6.0): the 47 racial feats of
 * Chapter 5, the core racial feats opened to the four races (FR-48), Water
 * Bolt (Graham's B5-1) and Draconic Armament's attacks, checked against the
 * book, against the system that reads them, and by driving the pure
 * decisions.
 *
 *   TRG_PRIME_ROOT=../core/trg-prime node tools/verify-block5.mjs
 *
 * Needs TRG Prime 3.669.2 at TRG_PRIME_ROOT.
 *
 *   A  The book (tools/content/book-text-block5.json, cut from the v1.2
 *      docx by tools/content/extract-book-block5.mjs): every paragraph a
 *      feat prints is its own, its traits, race and prerequisites; the
 *      "Existing racial feats" lists; Water Bolt
 *   B  The system reads the declarations: conditionals, defence rows, the
 *      conviction refund, the fumble reroll, the daily firsts, the push
 *      made shorter, the Fly Speed, the specialist skill, the sense, the
 *      switched ally auras, the lights, the riders, the save ladders, the
 *      Focus uses, the fall reduction, the spell DC bonus
 *   C  The pure decisions: the element lists against the system's spells
 *      (B5-2), the breath and venom dice, Awaken the Animism by heritage,
 *      the speed ladders, Web Snare's hold, Foxfire's turn, Draconic
 *      Armament, Spirit Roar's immunity, Raptorial Refinement, Bear's
 *      Endurance
 *   D  Registration: every Use, the passive hints, the reaction for an
 *      ally, FR-48 through the system's own access test (heritage limits
 *      included), the light sources
 *   E  Wiring: the hooks, the helpers the automations call, the core's
 *      Block 5 seams, versions, packs
 *   G  0.6.2, from the live test of 0.6.1: Many-Faceted Vigilance's tick
 *      through the core's codex inheritance, and every reaction asked only
 *      when it could be spent
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

const B5 = await import("./content/block5.mjs");
const { PACKS } = await import("./content/foundation.mjs");
const { md } = await import("./content/markdown.mjs");
const auto5 = await import("../module/block5-automations.mjs");
const auto1 = await import("../module/automations.mjs");
const reg = await import("../module/registration.mjs");
const book = JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "content", "book-text-block5.json"), "utf8"));

const cond = await import(sys("module", "conditionals.mjs"));
const dd = await import(sys("module", "combat", "defence-dc.mjs"));
const refund = await import(sys("module", "conviction-refund.mjs"));
const fumble = await import(sys("module", "fumble-reroll.mjs"));
const firsts = await import(sys("module", "daily-firsts.mjs"));
const fm = await import(sys("module", "combat", "forced-movement.mjs"));
const gs = await import(sys("module", "combat", "granted-speeds.mjs"));
const sg = await import(sys("module", "specialist-grants.mjs"));
const senses = await import(sys("module", "senses.mjs"));
const ca = await import(sys("module", "creature-auras.mjs"));
const aae = await import(sys("module", "ally-aura-effects.mjs"));
const acond = await import(sys("module", "aura-conditionals.mjs"));
const api = await import(sys("module", "module-api.mjs"));
const ls = await import(sys("module", "light-sources.mjs"));
const riders = await import(sys("module", "magic", "strike-riders.mjs"));
const magic = await import(sys("module", "combat", "magical-attacks.mjs"));
const pe = await import(sys("module", "peril-effect.mjs"));
const uses = await import(sys("module", "uses.mjs"));
const fd = await import(sys("module", "focus-declarations.mjs"));
const sdc = await import(sys("module", "magic", "spell-dc-bonus.mjs"));
const dof = await import(sys("module", "combat", "defence-offer.mjs"));
const systemJson = JSON.parse(fs.readFileSync(path.join(SYSTEM_ROOT, "system.json"), "utf8"));

const F = (doc) => doc.flags?.["trg-prime"] ?? {};
const byName = Object.fromEntries(B5.BLOCK5_FEATS.map((d) => [d.name, d]));
const strip = (html) => String(html).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

/* ------------------------------------------------------------------ *
 * A. The book
 * ------------------------------------------------------------------ */

equal("A forty-seven racial feats, as the chapter prints", [B5.BLOCK5_FEATS.length, Object.keys(book.feats).length], [47, 47]);
for (const [KEY, entry] of Object.entries(book.feats)) {
  const doc = B5.BLOCK5_FEATS.find((d) => d.name.toUpperCase().replace(/’/g, "'") === KEY);
  ok(`A ${KEY}: built`, Boolean(doc));
  if (!doc) continue;
  const desc = doc.system.description;
  const missing = entry.lines.filter((l) => !/^\|/.test(l)).filter((l) => !desc.includes(md(l)));
  ok(`A ${doc.name}: every paragraph the book prints`, missing.length === 0, missing.join(" / ").slice(0, 160));
  equal(`A ${doc.name}: the trait line`, doc.system.traits.toUpperCase().split(", ").join(" "), entry.traits);
  const pre = entry.lines.find((l) => /^\*\*Prerequisites\*\*/.test(l));
  equal(`A ${doc.name}: prerequisites as printed`, doc.system.prerequisites, pre ? pre.replace(/^\*\*Prerequisites\*\*\s*/, "") : "");
  ok(`A ${doc.name}: a racial feat of its race`, doc.system.category === "Racial" && doc.system.sourceRace.length > 0 && doc.system.sourceRace.split(", ").every((r) => entry.traits.includes(r.toUpperCase())));
  ok(`A ${doc.name}: says what the system does`, /\*?(Automated|Partly automated|Not automated):/.test(strip(desc)));
}
{
  const breath = byName["Celestial Breath"].system.description;
  ok("A Celestial Breath's heritage table is kept as a table", /<table>/.test(breath) && ["Shinryu", "Zennyo", "Fuku", "Kura", "Zenki"].every((h) => breath.includes(h)));
}
equal("A Fateful Coincidence is a Human's and a Kornargon's", byName["Fateful Coincidence"].system.sourceRace, "Human, Kornargon");
equal("A Draconic Armament may be taken twice; nothing else here may", B5.BLOCK5_FEATS.filter((d) => d.system.repeatable).map((d) => d.name), ["Draconic Armament"]);
equal("A FR-48: the registration is the book's \"Existing racial feats\", parsed", reg.EXISTING_RACIAL_FEATS, B5.existingFeatAccess());
equal("A FR-48: 33 entries, 25 distinct feats, 20 limited to a heritage", (() => {
  const all = Object.values(reg.EXISTING_RACIAL_FEATS).flat();
  return [all.length, new Set(all.map((e) => (typeof e === "string" ? e : e.name))).size, all.filter((e) => typeof e === "object").length];
})(), [33, 25, 20]);
{
  const wb = B5.BLOCK5_SPELLS[0];
  equal("A Water Bolt as the Grimoire prints it (B5-1): PP 2, arcane and verdant, 2 AP, 30 feet, 4d4 bludgeoning, base 1d4", [wb.name, wb.system.ppCost, wb.system.tradition, wb.system.castAP, wb.system.range, wb.system.targets, wb.system.damage?.formula, wb.system.damage?.type, wb.system.baseDamage, wb.system.traits, wb.system.category], ["Water Bolt", 2, "arcane, verdant", 2, "30 feet", "1 creature", "4d4", "bludgeoning", "1d4", "Attack, Invocation, Water", "attack"]);
  // 0.9.0 (B8-9): the push is a row TRG Prime 3.672.0 applies on a serious or deadly critical.
  ok("A Water Bolt says its push on a serious critical, and makes it", /serious or greater/.test(wb.system.description)
    && wb.system.effects.some((e) => e.kind === "forcedMove" && e.feet === 5 && e.direction === "away" && JSON.stringify(e.onAttack) === "[\"critical\"]" && e.minCriticalSeverity === "serious"));
  const twelve = fs.readFileSync(path.join(ROOT, "..", "book", "it12.md"), "utf8").includes("**WATER BOLT PP 2**");
  ok("A Water Bolt's heading is the book's (it12.md), when the book is beside the module", twelve || !fs.existsSync(path.join(ROOT, "..", "book", "it12.md")));
}
equal("A Draconic Armament's two attacks, as printed", B5.BLOCK5_NATURAL_ATTACKS.map((w) => [w.name, w.system.damage, w.system.damageType, w.system.traits, w.system.natural]), [["Draconic Bite", "1d6", "piercing", "Finesse, Unarmed", true], ["Draconic Claw", "1d4", "slashing", "Agile, Finesse, Unarmed", true]]);

/* ------------------------------------------------------------------ *
 * B. The system reads the declarations
 * ------------------------------------------------------------------ */

let condCount = 0;
for (const doc of B5.BLOCK5_FEATS) {
  for (const [i, raw] of (F(doc).conditionals ?? []).entries()) {
    condCount += 1;
    ok(`B ${doc.name}: conditional ${i + 1} is one the system accepts`, Boolean(cond.normaliseConditional(raw, { id: doc._id, name: doc.name }, i, { wisdom: 4, constitution: 1, dexterity: 2 })));
  }
}
equal("B every racial-bonus conditional is typed as the system's \"race\"", B5.BLOCK5_FEATS.flatMap((d) => F(d).conditionals ?? []).filter((c) => c.type === "racial").length, 0);
// 18 since 0.6.1: Forgeheart and Many-Faceted Vigilance raise the heritage's and ability's own ticks.
ok("B there are conditionals to check", condCount >= 18, String(condCount));
{
  const swap = (F(byName["Spiritual Resilience"]).conditionals ?? []).filter((c) => /^wisdom-/.test(c.valueFrom ?? ""));
  equal("B Spiritual Resilience: Wisdom stands in only when it is higher (+3 over Con 1; nothing against Con 5)", [swap.length, cond.normaliseConditional(swap[0], { id: "sr", name: "SR" }, 0, { wisdom: 4, constitution: 1 })?.value, cond.normaliseConditional(swap[0], { id: "sr", name: "SR" }, 0, { wisdom: 4, constitution: 5 })], [2, 3, null]);
}
{
  const ip = F(byName["Immovable Plating"]);
  const row = dd.normaliseDefenceDC(ip.defenceDC[0], { id: "x", name: "Immovable Plating" });
  ok("B Immovable Plating: Shove and Trip meet the Fortitude DC +2", row && row.value === 2 && row.dc === "fortitudeDC" && ["shoveattack", "tripattack"].every((a) => row.actions.includes(a)));
  const fx = byName["Immovable Plating"].effects.map((e) => ({ flags: e.flags }));
  equal("B Immovable Plating: a push is 5 feet shorter, never below 0", [fm.forcedMovementReduction(fx), fm.reducedPushFeet(10, fm.forcedMovementReduction(fx)), fm.reducedPushFeet(5, fm.forcedMovementReduction(fx))], [5, 5, 0]);
}
{
  const am = [{ type: "feat", name: "Adaptive Mind", flags: F(byName["Adaptive Mind"]) ? { "trg-prime": F(byName["Adaptive Mind"]) } : {} }];
  const r = (subject, degree, type = "skill") => refund.convictionRefundRow(am, { checkType: type, subject, degree })?.label ?? null;
  equal("B Adaptive Mind: the point comes back on a Mental Focus Success or better, and only then (B5-3)", [r("mentalFocus", "success"), r("mentalFocus", "critical"), r("mentalFocus", "heroic"), r("mentalFocus", "partial"), r("mentalFocus", "failure"), r("perception", "success"), r("mentalFocus", "success", "save")], ["Adaptive Mind", "Adaptive Mind", "Adaptive Mind", null, null, null, null]);
}
{
  const fr = [{ type: "feat", name: "Fortune's Reversal", flags: { "trg-prime": F(byName["Fortune's Reversal"]) }, system: byName["Fortune's Reversal"].system }];
  equal("B Fortune's Reversal answers a fumbled attack, skill check and save, at the cost of a reaction", ["attack", "skill", "save", "damage"].map((k) => fumble.fumbleRerollRows(fr, k).map((r) => [r.label, r.reaction])), [[["Fortune's Reversal", true]], [["Fortune's Reversal", true]], [["Fortune's Reversal", true]], []]);
  equal("B …and has the one Focus use a Refocus restores", uses.focusDefaultUses(byName["Fortune's Reversal"].system, "feat"), 1);
}
{
  const td = byName["Tianzhi Discipline"].effects.map((e) => ({ name: e.name, flags: e.flags }));
  equal("B Tianzhi Discipline: the day's first Refocus is a Critical without a roll — even a better roll is read as Critical", [firsts.dailyFirstDegree(td, "refocus", "failure"), firsts.dailyFirstDegree(td, "refocus", "heroic")?.degree, firsts.dailyFirstDegree(td, "refocus", "failure", true)], [{ degree: "critical", from: "failure", labels: ["Tianzhi Discipline"], exact: true }, "critical", null]);
  const tm = byName["Tianzhi Meditation"].effects.map((e) => ({ name: e.name, flags: e.flags }));
  equal("B Tianzhi Meditation: advantage on the first of the three trances each day, one between them", [firsts.dailyFirstAdvantage(tm, "cleansingTrance", {})?.slot, firsts.dailyFirstAdvantage(tm, "healingTrance", {})?.slot, firsts.dailyFirstAdvantage(tm, "clearMind", { dailyFirsts: { tianzhiMeditation: true } }), firsts.dailyFirstAdvantage(tm, "refocus", {})], ["tianzhiMeditation", "tianzhiMeditation", null, null]);
  const med = tm.find((e) => /skill bonuses/.test(e.name));
  ok("B Tianzhi Meditation: +1 racial on Meditation", Boolean(byName["Tianzhi Meditation"].effects.find((e) => e.changes.some((c) => c.key === "system.skills.meditation.racial" && c.value === "1"))) && !med?.flags?.["trg-prime"]?.dailyFirst);
}
equal("B Wings Unfurled: a Fly Speed equal to your land Speed", gs.grantedSpeeds([{ flags: { "trg-prime": F(byName["Wings Unfurled"]) } }], ["land", "fly", "swim", "climb", "burrow"]), [{ key: "fly", feet: 0, orLand: true }]);
equal("B Keeper of Endings: Undead Lore as a specialist skill", sg.specialistNamesFor(byName["Keeper of Endings"]), ["Undead Lore"]);
{
  const s = senses.sensesOf([{ name: "Hoardkeeper's Eye", flags: { "trg-prime": F(byName["Hoardkeeper's Eye"]) } }], 0);
  equal("B Hoardkeeper's Eye: Treasure Sense at 60 feet", s.map((x) => [x.category, x.rangeFeet]), [["tertiary", 60]]);
}
ok("B Forgeheart: fire resistance", byName.Forgeheart.effects.some((e) => e.changes.some((c) => c.key === "system.combat.resistances" && /fire/.test(c.value))));
ok("B Fortified Carapace: Base Natural DR +1, added at the natural slot", byName["Fortified Carapace"].effects.some((e) => e.changes.some((c) => c.key === "system.combat.naturalArmourBase.natural" && c.mode === 2 && c.value === "1")));
ok("B Many-Faceted Vigilance: +10 racial to initiative", byName["Many-Faceted Vigilance"].effects.some((e) => e.changes.some((c) => c.key === "system.combat.initiative.race" && c.value === "10")));
ok("B Tianzhi Scholar: +1 racial on Meditation and Nature", byName["Tianzhi Scholar"].effects.some((e) => ["meditation", "nature"].every((k) => e.changes.some((c) => c.key === `system.skills.${k}.racial` && c.value === "1"))));

/* The switched ally auras: Spirit Beacon and Mist Veil. */
{
  const beacon = ca.aurasOf([{ id: "sb", name: "Spirit Beacon", type: "feat", flags: { "trg-prime": F(byName["Spirit Beacon"]) } }], 5);
  const mist = ca.aurasOf([{ id: "mv", name: "Mist Veil", type: "feat", flags: { "trg-prime": F(byName["Mist Veil"]) } }], 5);
  equal("B Spirit Beacon: an ally aura of 20 feet, its emitter included, live only while switched on", beacon.map((a) => [a.kind, a.radius, a.includeSelf, a.emitterState]), [["ally", 20, true, "spirit-beacon"]]);
  equal("B Mist Veil: 10 feet, its emitter included, live only while switched on", mist.map((a) => [a.kind, a.radius, a.includeSelf, a.emitterState]), [["ally", 10, true, "mist-veil"]]);
  const emitter = (states) => [{ id: "E", name: "Hotaru", centreFeet: { x: 0, y: 0 }, widthFeet: 5, disposition: 1, states, auras: beacon.map((a) => ({ ...a, allyEffect: aae.allyEffectOf(a.allyEffect ?? F(byName["Spirit Beacon"]).auras[0].allyEffect) })) }];
  const subjects = [{ id: "E", centreFeet: { x: 0, y: 0 }, widthFeet: 5, disposition: 1 }, { id: "A", centreFeet: { x: 15, y: 0 }, widthFeet: 5, disposition: 1 }, { id: "far", centreFeet: { x: 40, y: 0 }, widthFeet: 5, disposition: 1 }];
  const on = aae.wantedAllyGrants({ subjects, emitters: emitter(["spirit-beacon"]) });
  const off = aae.wantedAllyGrants({ subjects, emitters: emitter([]) });
  equal("B Spirit Beacon's grant reaches you and an ally in the bright light, not one beyond — and nobody while it is off (3.669.0)", [on.get("E").length, on.get("A").length, on.get("far").length, off.get("E").length, off.get("A").length], [1, 1, 0, 0, 0]);
  const rows = acond.allyConditionalsInForce({ subject: { id: "A", centreFeet: { x: 15, y: 0 }, disposition: 1 }, emitters: [{ id: "E", name: "Hotaru", centreFeet: { x: 0, y: 0 }, widthFeet: 5, disposition: 1, states: [], auras: [{ ...beacon[0], kind: "ally", grants: { kind: "modifier", value: 2, scope: "x" } }] }] });
  equal("B …and a switched ally aura's conditionals hold off too (3.669.0)", rows.length, 0);
  const mistEffect = aae.allyEffectOf(F(byName["Mist Veil"]).auras[0].allyEffect);
  equal("B Mist Veil conceals those within, friend or foe", [mistEffect.statuses, aae.allyEffectOf(F(byName["Mist Veil"]).auras[0].enemyEffect).statuses], [["concealed"], ["concealed"]]);
  const beaconFx = aae.allyEffectOf(F(byName["Spirit Beacon"]).auras[0].allyEffect);
  equal("B Spirit Beacon's two ticks: +2 circumstance on the three skills, +1 on saves", beaconFx.conditionals.map((c) => [c.value, c.type, c.when.checkTypes[0], c.auto]), [[2, "circumstance", "skill", false], [1, "circumstance", "save", false]]);
  ok("B …each a conditional the system accepts", beaconFx.conditionals.every((c, i) => cond.normaliseConditional(c, { id: "sb", name: "Spirit Beacon" }, i)));
  equal("B the Use's switch is on for the minute (and a round's grace), and the mist's to the next turn — out of combat", [auto5.beaconFlags(100).auraSwitch, auto5.mistFlags(100).auraSwitch, auto5.beaconFlags(100).lightSource], [{ state: "spirit-beacon", until: 166 }, { state: "mist-veil", until: 112 }, "spirit-beacon"]);
  equal("B …and in combat held for an hour, the effect's own round-based end taking it away (0.6.1; found live: the real-time clock ran the seconds out)", [auto5.beaconFlags(100, true).auraSwitch.until, auto5.mistFlags(100, true).auraSwitch.until], [3700, 3700]);
}

/* The lights (3.669.0 registerLightSources). */
{
  api.resetModuleRegistry();
  const n = api.registerLightSources(auto5.LIGHT_SOURCES.map((l) => ({ ...l })), "trg-inner-tempest", Object.keys(ls.LIGHT_SOURCES));
  equal("B the three lights register, with no problem", [n, api.registrationProblems()], [3, []]);
  equal("B a registered light is a light source the system knows", ["living-lantern", "spirit-beacon", "spirit-beacon-dim", "torch", "nothing"].map((k) => ls.isLightSourceKey(k)), [true, true, true, true, false]);
  const cfg = (k) => { const c = ls.foundryLightConfig(k); return [c.dim, c.bright]; };
  equal("B Living Lantern draws dim to 10 feet, no bright ring; Spirit Beacon bright 20 and dim 40", [cfg("living-lantern"), cfg("spirit-beacon"), cfg("spirit-beacon-dim")], [[10, 0], [40, 20], [40, 0]]);
  equal("B and the ladder: dim is a step, Spirit Beacon's bright three (Luminance's reading), and the brightest is drawn", [ls.applyLightSource(4, "living-lantern"), ls.applyLightSource(4, "spirit-beacon"), ls.applyLightSource(4, "spirit-beacon-dim"), ls.brightestSourceKey(["spirit-beacon-dim", "spirit-beacon"])], [5, 7, 5, "spirit-beacon"]);
  equal("B a core light cannot be replaced; the clash is reported", [api.registerLightSources({ key: "torch", steps: 9, radiusFeet: 99 }, "x", Object.keys(ls.LIGHT_SOURCES)), api.registrationProblems().length, ls.lightSource("torch").steps], [0, 1, 2]);
  equal("B Living Lantern's effect carries the registered key", auto1.LIVING_LANTERN_LIGHT, "living-lantern");
  api.resetModuleRegistry();
}

/* The strike riders and the magical Strike. */
{
  const inf = riders.normaliseStrikeRider(auto5.infusionFlags("cold").strikeRider);
  equal("B Elemental Infusion: 1d4 of the element on every melee Strike, not spent", [inf?.dice, inf?.damageType, inf?.scope, inf?.once], ["1d4", "cold", "melee", false]);
  const mg = riders.normaliseStrikeRider(auto5.MAGMA_FLAGS.strikeRider);
  equal("B Magma Channel: 1d6 fire on the next melee hit, spent by the hit", [mg?.dice, mg?.damageType, mg?.scope, mg?.once, mg?.spendOnHit], ["1d6", "fire", "melee", true, true]);
  equal("B …and the Strike is magical", magic.declaredMagicalAttacks([{ flags: { "trg-prime": auto5.MAGMA_FLAGS } }]).map((m) => m.label), ["Magma Channel"]);
}

/* The save ladders through the system's area rail. */
{
  const clock = { combatRound: 3, worldTime: 0 };
  const tags = (title, degree) => pe.perilEffectOutcome(pe.perilEffectSpec({ save: auto5.SAVE_LADDERS[title].save, scope: "targets", outcomes: { ...auto5.SAVE_LADDERS[title].outcomes }, conditions: { ...auto5.SAVE_LADDERS[title].conditions } }), degree, clock).tags.map((t) => [t.key, t.value, t.expiresRound ?? null, t.expiresTime ?? null]);
  equal("B Blinding Majesty: dazzled a round, two rounds, a minute; blinded a round and dazzled a minute on a Fumble; nothing on a Critical", ["critical", "success", "partial", "failure", "fumble"].map((d) => tags("Blinding Majesty", d)), [[], [["dazzled", null, 4, null]], [["dazzled", null, 5, null]], [["dazzled", null, null, 60]], [["blinded", null, 4, null], ["dazzled", null, null, 60]]]);
  equal("B Paralysing Venom: Slowed 1 for two rounds; Paralysed a round then Slowed on a Fumble", ["failure", "fumble", "blunder"].map((d) => tags("Paralysing Venom", d)), [[["slowed", 1, 5, null]], [["paralyzed", null, 4, null], ["slowed", 1, 5, null]], [["paralyzed", null, 4, null], ["slowed", 1, 5, null]]]);
  equal("B Serpent's Venom: Sickened 1 or 2, nothing on a Success", ["success", "partial", "failure", "fumble"].map((d) => tags("Serpent's Venom", d).map(([k, v]) => [k, v])), [[], [["sickened", 1]], [["sickened", 2]], [["sickened", 2]]]);
  equal("B Valley Chill: Slowed 1 to the start of your next turn on a Fumble only", ["failure", "fumble"].map((d) => tags("Valley Chill", d)), [[], [["slowed", 1, 4, null]]]);
  equal("B the ladders' saves: Reflex, Fortitude, Fortitude, Fortitude, Reflex", ["Blinding Majesty", "Valley Chill", "Paralysing Venom", "Serpent's Venom", "Web Snare"].map((t) => auto5.SAVE_LADDERS[t].save), ["reflex", "fortitude", "fortitude", "fortitude", "reflex"]);
}

/* The Focus uses, the fall reduction, the spell DC. */
for (const doc of B5.BLOCK5_FEATS.filter((d) => /\bFocus\b/.test(d.system.traits))) {
  equal(`B ${doc.name}: one Focus use, restored by Refocus`, uses.focusDefaultUses(doc.system, "feat"), 1);
}
{
  const ren = auto5.awakenBenefit("Ren");
  equal("B Awaken the Animism (Ren): falls a further 20 feet shorter, beside the Ren's own 20", fd.declaredFallReduction([{ flags: { "trg-prime": { fallReduction: { value: 20, label: "Ren" } } } }, { flags: { "trg-prime": ren.flags } }]).feet, 40);
  const at = auto5.attunementFlags({ element: "Flame", damageType: "fire", spellTraits: ["fire"] });
  equal("B Elemental Attunement: +1 racial to an innate fire spell's save DC, not a cold one's", [sdc.declaredSpellDCBonuses([{ flags: { "trg-prime": at } }], "Fire, Invocation", { innate: true }).map((r) => [r.value, r.type]), sdc.declaredSpellDCBonuses([{ flags: { "trg-prime": at } }], "Cold, Invocation", { innate: true })], [[[1, "race"]], []]);
  equal("B …and nothing to a prepared fire spell's (innate spells only; found in review)", sdc.declaredSpellDCBonuses([{ flags: { "trg-prime": at } }], "Fire, Invocation"), []);
  equal("B …its attack bonus asks for an innate spell's attack, with the element's trait", [at.conditionals[1].when.checkTypes, at.conditionals[1].when.actions, at.conditionals[1].when.traits], [["attack"], ["innateSpellAttack"], ["fire"]]);
  ok("B …and its rows are conditionals the system accepts", at.conditionals.every((c, i) => cond.normaliseConditional(c, { id: "ea", name: "Elemental Attunement" }, i)));
  equal("B …and nothing without an element", auto5.attunementFlags(null), null);
}

/* ------------------------------------------------------------------ *
 * C. The pure decisions
 * ------------------------------------------------------------------ */

async function packDocs(pack) {
  const { ClassicLevel } = await import("classic-level");
  const dir = path.join(SYSTEM_ROOT, "packs", pack);
  if (!fs.existsSync(dir)) return null;
  const db = new ClassicLevel(dir, { valueEncoding: "json" });
  const out = [];
  try { for await (const [k, v] of db.iterator()) if (k.split("!")[1] && !k.split("!")[1].includes(".")) out.push(v); }
  finally { await db.close(); }
  return out;
}
const coreSpells = await packDocs("spells");
const coreFeats = await packDocs("feats");
ok("C the system's spells and feats were read", Boolean(coreSpells?.length && coreFeats?.length));
const spells = [...(coreSpells ?? []), ...B5.BLOCK5_SPELLS];
const ELEMENTS = {
  Fuukaze: { element: "Wind", damageType: "electricity", spellTraits: ["air", "electricity"] },
  Hikari: { element: "Spirit", damageType: "essence", spellTraits: ["essence", "healing", "soul"] },
  Kasai: { element: "Flame", damageType: "fire", spellTraits: ["fire"] },
  Suiryoku: { element: "Water", damageType: "cold", spellTraits: ["water", "cold"] },
  Tsuchi: { element: "Earth", damageType: "acid", spellTraits: ["earth", "acid"] }
};
const offered = (feat, heritage) => {
  const spec = auto5.elementSpellSpec(feat, heritage, ELEMENTS[heritage]);
  const names = new Set(spec.names.map((n) => n.toLowerCase()));
  const also = new Set(spec.alsoNames.map((n) => n.toLowerCase()));
  return spells.filter((s) => names.has(String(s.name).toLowerCase()))
    .filter((s) => also.has(String(s.name).toLowerCase()) || String(s.system.traits ?? "").split(",").map((t) => t.trim().toLowerCase()).some((t) => spec.traitsAny.includes(t)))
    .map((s) => s.name).sort();
};
for (const [feat, list] of Object.entries(auto5.ELEMENT_SPELL_LISTS)) {
  const missing = list.names.filter((n) => !spells.some((s) => String(s.name).toLowerCase() === n.toLowerCase()));
  equal(`C ${feat}: every spell the book lists is in the system's spells (or this module's)`, missing, []);
  const wrongPP = list.names.filter((n) => { const s = spells.find((x) => String(x.name).toLowerCase() === n.toLowerCase()); return s && Number(s.system.ppCost) !== list.pp; });
  equal(`C ${feat}: every one is PP ${list.pp}, as printed`, wrongPP, []);
  for (const heritage of Object.keys(ELEMENTS)) ok(`C ${feat}: a ${heritage} has something to choose (B5-2)`, offered(feat, heritage).length > 0, JSON.stringify(offered(feat, heritage)));
}
equal("C Elemental Power by element (B5-2: Magic Stone for the Tsuchi; Water Bolt for the Suiryoku)", Object.keys(ELEMENTS).map((h) => [h, offered("Elemental Power", h)]), [
  ["Fuukaze", ["Breeze Strike", "Obscuring Mist"]], ["Hikari", ["Magic Stone", "Restoration", "Self Healing"]], ["Kasai", ["Burning Hands"]],
  ["Suiryoku", ["Ice Slick", "Obscuring Mist", "Water Bolt"]], ["Tsuchi", ["Magic Stone"]]]);
equal("C Elemental Supremacy by element (B5-2: Water Breathing for the Suiryoku, Endure Elements for all)", Object.keys(ELEMENTS).map((h) => [h, offered("Elemental Supremacy", h)]), [
  ["Fuukaze", ["Endure Elements", "Whispering Wind"]], ["Hikari", ["Endure Elements", "Restore Senses"]], ["Kasai", ["Endure Elements", "Fire Bolt"]],
  ["Suiryoku", ["Cold Bolt", "Endure Elements", "Icy Spray", "Water Breathing"]], ["Tsuchi", ["Acid Bolt", "Endure Elements"]]]);
equal("C Elemental Ascendant by element (B5-2: Water Walk for the Suiryoku)", Object.keys(ELEMENTS).map((h) => [h, offered("Elemental Ascendant", h)]), [
  ["Fuukaze", ["Line Of Lightning", "Wall Of Wind"]], ["Hikari", ["Remove Disease"]], ["Kasai", ["Fireball", "Searing Ray"]],
  ["Suiryoku", ["Cold Ball", "Crashing Torrent", "Water Walk"]], ["Tsuchi", ["Earth Bind", "Stone Call"]]]);
{
  const spec = auto5.elementSpellSpec("Elemental Power", "Kasai", ELEMENTS.Kasai);
  equal("C the choice is innate, with the Focus trait, cast with Wisdom (Natural Chi's)", [spec.innate, spec.castingAbility, /Natural Chi/.test(spec.note)], [true, "wisdom", true]);
  equal("C …and refused without an element", [auto5.elementSpellSpec("Elemental Power", "Kitsune", null), auto5.elementSpellSpec("Nothing", "Kasai", ELEMENTS.Kasai)], [null, null]);
}
equal("C the heritage and its element are read off the heritage item", auto5.heritageOf([{ type: "feat", name: "x" }, { type: "heritage", name: "Kasai", flags: { "trg-prime": { itElement: { element: "Flame", damageType: "fire", spellTraits: ["Fire"] } } } }]), { name: "Kasai", element: { element: "Flame", damageType: "fire", spellTraits: ["fire"] } });
equal("C Celestial Breath: 1d6 per two levels, at least 2d6", [1, 4, 5, 6, 9, 20].map(auto5.breathDice), [2, 2, 2, 3, 4, 10]);
equal("C Celestial Breath's table, as printed", Object.entries(auto5.CELESTIAL_BREATH).map(([h, b]) => [h, b.type, b.traits.join(" ")]), [["Shinryu", "electricity", "Air Electricity"], ["Zennyo", "cold", "Cold Water"], ["Fuku", "acid", "Acid Earth"], ["Kura", "cold", "Cold Shadow"], ["Zenki", "fire", "Fire"]]);
ok("C …and the table is the book's", ["| Shinryu      | Electricity | Air, Electricity      |", "| Zenki        | Fire        | Fire                  |"].every((l) => book.feats["CELESTIAL BREATH"].lines.includes(l)));
equal("C Serpent's Venom: 1d6 per three levels, at least 1d6", [1, 3, 5, 6, 12, 20].map(auto5.venomDice), [1, 1, 1, 2, 4, 6]);
equal("C Awaken the Animism: a benefit for each of the five Miraku heritages, none for another", ["Kitsune", "Mujina", "Ren", "Byakko", "Orochi", "Zenki"].map((h) => Boolean(auto5.awakenBenefit(h))), [true, true, true, true, true, false]);
equal("C Awaken the Animism's changes: Mujina Base DR +1, Ren Speed +10, Orochi Swim +10", ["Mujina", "Ren", "Orochi"].map((h) => auto5.awakenBenefit(h).changes.map((c) => [c.key, c.value])), [[["system.combat.naturalArmourBase.natural", "1"]], [["system.combat.movement.land.untyped", "10"]], [["system.combat.movement.swim.untyped", "10"]]]);
equal("C …the Speed bonuses typed, into the Speed's untyped slot (0.6.1; found live: the movement entry is an object, and a plain add reached nothing)", ["Ren", "Orochi"].map((h) => auto5.awakenBenefit(h).changes[0].type), ["custom", "custom"]);
for (const h of ["Kitsune", "Byakko", "Orochi"]) ok(`C Awaken the Animism (${h}): its conditionals are ones the system accepts`, auto5.awakenBenefit(h).flags.conditionals.every((c, i) => cond.normaliseConditional(c, { id: "aa", name: "Awaken" }, i)));
equal("C Awaken the Animism (Byakko): +2 on melee damage only", auto5.awakenBenefit("Byakko").flags.conditionals.map((c) => [c.value, c.when.checkTypes, c.when.attackModes]), [[2, ["damage"], ["melee"]]]);
equal("C the speed ladders as printed", [auto5.SPEED_LADDERS["Paralysing Venom"], auto5.SPEED_LADDERS["Web Snare"], auto5.SPEED_LADDERS["Valley Chill"]], [
  { success: { feet: 5, rounds: 1 }, partial: { feet: 5, rounds: 2 } }, { success: { feet: 5, rounds: 1 }, partial: { feet: 10, rounds: 2 } },
  { success: { feet: 5, rounds: 1 }, partial: { feet: 10, rounds: 1 }, failure: { feet: 10, reflex: 1, rounds: 1 }, fumble: { feet: 10, reflex: 1, rounds: 1 } }]);
equal("C a rung read through the fallbacks: a Heroic is a Critical, a Blunder a Fumble", [auto5.ladderRung(auto5.SPEED_LADDERS["Valley Chill"], "blunder"), auto5.ladderRung(auto5.SPEED_LADDERS["Valley Chill"], "heroic"), auto5.ladderRung(auto5.SPEED_LADDERS["Web Snare"], "failure")], [{ feet: 10, reflex: 1, rounds: 1 }, null, null]);
{
  const sc = auto5.slowingChanges(10, 1);
  equal("C a Speed penalty is a circumstance one, and Valley Chill's Reflex a conditional", [sc.changes, sc.conditionals.map((c) => [c.value, c.type, c.when.subjects])], [[{ key: "system.combat.movement.land.circumstance", type: "custom", value: "-10", priority: 20 }], [[-1, "circumstance", ["reflex"]]]]);
  ok("C …that the system accepts", cond.normaliseConditional(sc.conditionals[0], { id: "vc", name: "Valley Chill" }, 0) !== null);
}
equal("C Web Snare holds on a Failure, and flat-footed too on a Fumble", ["critical", "success", "partial", "failure", "fumble", "blunder"].map(auto5.webSnareStatuses), [[], [], [], ["immobilised"], ["immobilised", "flatFooted"], ["immobilised", "flatFooted"]]);
{
  const combat = { id: "C1", round: 2, turn: 3 };
  equal("C Foxfire's move: once each turn", [auto5.foxfireMoveSpent(null, combat), auto5.foxfireMoveSpent({ combatId: "C1", round: 2, turn: 3 }, combat), auto5.foxfireMoveSpent({ combatId: "C1", round: 2, turn: 2 }, combat), auto5.foxfireMoveSpent({ combatId: "C1", round: 2, turn: 3 }, null)], [false, true, false, false]);
}
equal("C Draconic Armament: one attack a copy, the other at the second", [auto5.draconicOnOffer([], 1), auto5.draconicOnOffer(["Draconic Claw"], 1), auto5.draconicOnOffer(["Draconic Claw"], 2), auto5.draconicOnOffer(["Draconic Claw", "Draconic Bite"], 2)], [["Draconic Bite", "Draconic Claw"], [], ["Draconic Bite"], []]);
equal("C Spirit Roar: immune in the same encounter, not the next", [auto5.spiritRoarImmune({ combatId: "C1", uuids: ["Actor.a"] }, "C1", "Actor.a"), auto5.spiritRoarImmune({ combatId: "C1", uuids: ["Actor.a"] }, "C2", "Actor.a"), auto5.spiritRoarImmune({ combatId: "C1", uuids: ["Actor.a"] }, "C1", "Actor.b"), auto5.spiritRoarImmune(null, "C1", "Actor.a")], [true, false, false, false]);
equal("C Raptorial Refinement: AR 2 and Versatile P, once", [auto5.refinedBlade({ armourRending: 1, traits: "Agile, Finesse" }), auto5.refinedBlade({ armourRending: 1, traits: "Agile, Finesse, Versatile P" })], [{ armourRending: 2, traits: "Agile, Finesse, Versatile P, AR 2" }, { armourRending: 2, traits: "Agile, Finesse, Versatile P, AR 2" }]);
equal("C the blade's AR is on its trait line, where the system reads it (0.6.1; found live): added, replaced, never doubled", [auto5.bladeTraitsWithAR("Agile, Finesse", 1), auto5.bladeTraitsWithAR("Agile, Finesse, AR 1", 2), auto5.bladeTraitsWithAR("AR 1, Agile", 1), auto5.refinedBlade({ armourRending: 1, traits: "Agile, Finesse, AR 1" }).traits], ["Agile, Finesse, AR 1", "Agile, Finesse, AR 2", "Agile, AR 1", "Agile, Finesse, Versatile P, AR 2"]);
equal("C Forgeheart and Many-Faceted Vigilance raise the heritage's and the ability's own tick to +2 (0.6.1; the book: \"increases from +1 to +2\")", [auto5.RAISED_TICKS.forgeheart, auto5.RAISED_TICKS["many-faceted vigilance"]], [{ itemType: "heritage", itemName: "Zenki", label: "Zenki", value: 2 }, { itemType: "ability", itemName: "Compound Eyes", label: "Compound Eyes", value: 2 }]);
equal("C …the labelled modifier row only", auto5.raisedTickRows([{ kind: "modifier", label: "Zenki", value: 1 }, { kind: "advantage", label: "Zenki" }, { kind: "modifier", label: "Other", value: 1 }], "Zenki", 2), [{ kind: "modifier", label: "Zenki", value: 2 }, { kind: "advantage", label: "Zenki" }, { kind: "modifier", label: "Other", value: 1 }]);
equal("C …and neither feat carries a tick of its own beside it", [byName.Forgeheart.flags?.["trg-prime"]?.conditionals ?? null, byName["Many-Faceted Vigilance"].flags?.["trg-prime"]?.conditionals ?? null], [null, null]);
equal("C Bear's Endurance: Impact Absorption's Base DR is 2 instead of 1", [auto1.impactAbsorptionDR(false), auto1.impactAbsorptionDR(true)], [1, 2]);

/* ------------------------------------------------------------------ *
 * D. Registration
 * ------------------------------------------------------------------ */

const calls = [];
const fake = new Proxy({}, { get: (_, name) => (...args) => { calls.push([name, ...args]); return true; } });
reg.registerContent(fake, "trg-inner-tempest");
const called = (n) => calls.filter((c) => c[0] === n);
for (const doc of B5.BLOCK5_FEATS) {
  const k = doc.name.toLowerCase();
  const handled = Boolean(auto5.BLOCK5_AUTOMATIONS[k]) || Boolean(auto5.BLOCK5_PASSIVE_HINTS[k]) || /Not automated/.test(doc.system.description);
  ok(`D ${doc.name}: its Use does something, works by itself, or says it is the table's`, handled);
}
for (const [k, entry] of Object.entries(auto5.BLOCK5_AUTOMATIONS)) {
  ok(`D ${k}: registered`, called("registerFeatAutomation").some((c) => c[1] === k && c[2] === entry));
  const doc = B5.BLOCK5_FEATS.find((d) => d.name.toLowerCase() === k);
  if (doc && /\bFocus\b/.test(doc.system.traits) && typeof entry.use === "function" && !/^Offered|^Asked/.test(entry.hint)) ok(`D ${k}: spends its own Focus use (the Use button does not spend it again)`, entry.ownsFocusUse === true);
}
ok("D every passive hint is registered", Object.keys(auto5.BLOCK5_PASSIVE_HINTS).every((k) => called("registerPassiveAutomation").some((c) => c[1] === k)));
ok("D no Block 5 automation shadows an earlier one", Object.keys(auto5.BLOCK5_AUTOMATIONS).every((k) => called("registerFeatAutomation").filter((c) => c[1] === k).length === 1));
equal("D Guardian's Intercession is offered for an adjacent ally, against a Strike", (() => { const g = auto5.BLOCK5_DEFENCE_OFFERS["Guardian's Intercession"]; return [g.forAlly, g.against, g.reachFeet, called("registerDefenceOffer").some((c) => c[1] === "Guardian's Intercession")]; })(), [true, "weapon", 5, true]);
{
  dof.registerDefenceOffer("Guardian's Intercession", auto5.BLOCK5_DEFENCE_OFFERS["Guardian's Intercession"], "trg-inner-tempest");
  const row = dof.registeredDefenceOffers().find((r) => r.key === "guardian's intercession");
  equal("D …and the system keeps it as one for an ally", [row?.forAlly, row?.reachFeet, row?.against], [true, 5, "weapon"]);
  equal("D …offered by the ally beside the attacked one, not the attacker, not a foe, not one 10 feet off", dof.interceptorCandidates([{ id: "T", actorId: "t", disposition: 1, distance: 0 }, { id: "M", actorId: "m", disposition: 1, distance: 5 }, { id: "F", actorId: "f", disposition: 1, distance: 10 }, { id: "X", actorId: "x", disposition: -1, distance: 5 }, { id: "A", actorId: "a", disposition: 1, distance: 5 }], { targetId: "T", attackerId: "A", disposition: 1, reachFeet: 5 }).map((c) => c.id), ["M"]);
  equal("D …held when its Focus use is spent", [auto5.BLOCK5_DEFENCE_OFFERS["Guardian's Intercession"].find({ items: [{ type: "feat", name: "Guardian's Intercession" }] })?.name ?? null], ["Guardian's Intercession"]);
  {
    const saved = globalThis.game;
    globalThis.game = { ...(saved ?? {}), trgPrime: { modules: { helpers: { itemUsesMax: (i) => i.max, itemUsesRemaining: (i) => i.left } } } };
    try {
      const who = (held) => ({ hasCondition: (k) => k === held });
      equal("D …refused when it is expended, or you cannot move to the ally (found in review); offered otherwise",
        [auto5.guardianRefusal(who(null), { max: 1, left: 0 }), auto5.guardianRefusal(who("immobilised"), { max: 1, left: 1 }), auto5.guardianRefusal(who("grabbed"), { max: 1, left: 1 }), auto5.guardianRefusal(who(null), { max: 1, left: 1 })],
        ["expended — Refocus restores it", "you are not able to move (immobilised)", "you are not able to move (grabbed)", null]);
    } finally { globalThis.game = saved; }
    ok("D …and the offer asks it", auto5.BLOCK5_DEFENCE_OFFERS["Guardian's Intercession"].requires === undefined ? false : /guardianRefusal\(actor, item\)/.test(String(auto5.BLOCK5_DEFENCE_OFFERS["Guardian's Intercession"].requires)));
  }
}
{
  equal("D FR-48 registered through registerFeatAccess, race by race", called("registerFeatAccess").filter((c) => c[1] === "race").map((c) => [c[1], c[2], c[3].length]), [["race", "Miraku", 8], ["race", "Ryukari", 5], ["race", "Scree", 9], ["race", "Tianzhi", 11]]);
  api.resetModuleRegistry();
  for (const [race, feats] of Object.entries(reg.EXISTING_RACIAL_FEATS)) api.registerFeatAccess("race", race, feats, "trg-inner-tempest");
  const can = (race, feat, heritage) => api.hasRegisteredFeatAccess("race", race, feat, heritage);
  equal("D the system's own test: Animal Sense for any Miraku; Bestial Resilience for a Mujina only; Fire-Like Blood for a Zenki or a Kasai", [can("Miraku", "Animal Sense", "Kitsune"), can("Miraku", "Bestial Resilience", "Mujina"), can("Miraku", "Bestial Resilience", "Ren"), can("Ryukari", "Fire-Like Blood", "Zenki"), can("Tianzhi", "Fire-Like Blood", "Kasai"), can("Tianzhi", "Fire-Like Blood", "Tsuchi"), can("Scree", "Swift Reflexes", "Joro"), can("Tianzhi", "Swift Reflexes", "Kasai")], [true, true, false, true, true, false, true, false]);
  ok("D …with no problem reported", api.registrationProblems().length === 0, JSON.stringify(api.registrationProblems()));
  const coreNames = new Map((coreFeats ?? []).map((f) => [String(f.name).toLowerCase(), f]));
  const names = [...new Set(Object.values(reg.EXISTING_RACIAL_FEATS).flat().map((e) => (typeof e === "string" ? e : e.name)))];
  equal("D every opened feat is a core racial feat", names.filter((n) => coreNames.get(n.toLowerCase())?.system?.category !== "Racial"), []);
  api.resetModuleRegistry();
}
equal("D the lights are registered", called("registerLightSources").map((c) => c[1].map((l) => l.key)), [["living-lantern", "spirit-beacon", "spirit-beacon-dim"]]);

/* ------------------------------------------------------------------ *
 * E. Wiring
 * ------------------------------------------------------------------ */

const script = fs.readFileSync(path.join(ROOT, "scripts", "inner-tempest.mjs"), "utf8");
for (const [hook, fn] of [["trgPrimeStrikeResolved", "onStrikeResolvedB5"], ["createItem", "onItemCreatedB5"], ["deleteItem", "onItemDeletedB5"], ["deleteActiveEffect", "onEffectDeletedB5"]]) {
  ok(`E ${hook} reaches ${fn}`, new RegExp(`Hooks\\.on\\("${hook}", \\([^)]*\\) => \\{ ${fn}\\(`).test(script));
}
const autoSrc = fs.readFileSync(path.join(ROOT, "module", "block5-automations.mjs"), "utf8");
const apiSrc = fs.readFileSync(path.join(SYSTEM_ROOT, "module", "module-api-workflow.mjs"), "utf8");
const mh = fs.readFileSync(path.join(SYSTEM_ROOT, "module", "feats-workflow.mjs"), "utf8");
const used = [...new Set([...autoSrc.matchAll(/\bh\(\)\.([a-zA-Z]+)/g)].map((m) => m[1]))];
const missingHelpers = used.filter((n) => !new RegExp(`\\b${n}\\b\\s*[:(,]`).test(apiSrc) && !new RegExp(`MODULE_HELPERS = Object\\.freeze\\(\\{[\\s\\S]*?\\b${n}\\b`).test(mh));
equal("E every helper the automations call is one the system hands over", missingHelpers, []);
ok("E Predator's Momentum is asked on the Pounce's paid Strike", /const momentum = await predatorsMomentumOptions\(actor\);\s*await helpers\(\)\.rollWeaponAttack\(actor, weapon, \{ apPaid: true, extraModifiers: \[\], \.\.\.momentum \}\);/.test(fs.readFileSync(path.join(ROOT, "module", "automations.mjs"), "utf8")));
ok("E Wing Burst says Wings Unfurled lets you end in the air", /owns\(actor, "Wings Unfurled"\)/.test(fs.readFileSync(path.join(ROOT, "module", "automations.mjs"), "utf8")));
ok("E Living Lantern's effect is a registered light, drawn on the token", /lightSource: LIVING_LANTERN_LIGHT/.test(fs.readFileSync(path.join(ROOT, "module", "automations.mjs"), "utf8")) && /refreshTokenLight\?\.\(actor\)/.test(fs.readFileSync(path.join(ROOT, "module", "automations.mjs"), "utf8")));
ok("E Foxfire's motes go with its effect, and Spirit Beacon's dim ring with its own bright one", /if \(key === "b5:foxfire"\)[\s\S]{0,200}removeLightCircles\(castId, \{ sceneId: effect\.getFlag\(MODULE_ID, "foxfireScene"\) \?\? "" \}\)/.test(autoSrc) && /foxfireScene/.test(autoSrc) && /getFlag\(MODULE_ID, "beaconId"\) === id/.test(autoSrc));
ok("E Spirit Roar is paid once, after its first Demoralise is rolled — a cancelled dialog costs nothing (found in review)", /if \(!check\) break;\n\s*if \(!paid\) \{\n\s*if \(!\(await techniqueBegins\(actor, item, "Spirit Roar", 1\)\)\) break;\n\s*paid = true;/.test(autoSrc) && /if \(!paid\) return false;/.test(autoSrc) && /let dice = null;\n(?:\s*\/\/[^\n]*\n)*\s*let convictionDie = 0;\n\s*let paid = false;\n\s*for \(const \[i, c\] of fresh\.entries\(\)\)/.test(autoSrc) && autoSrc.indexOf('focusReady(item, "Spirit Roar")') < autoSrc.indexOf('techniqueBegins(actor, item, "Spirit Roar", 1)'));
ok("E Waiting Blade is offered on any melee miss, a reaction's too (found in review)", /if \(missedHere\(ctx\) && !held && melee(?: && !ctx\.noReactions)?\) \{\n\s*const wb = ownedNamed\(target, "Waiting Blade"\);/.test(autoSrc));
ok("E Web Snare's old web comes off whoever wore it, the same creature included (found in review)", /if \(before\?\.uuid\) \{\n\s*const prior = await actorFrom\(before\.uuid\);/.test(autoSrc) && /if \(prior && ids\.length\) \{ await asOwner\(prior, "deleteEffects", \{ ids \}\);/.test(autoSrc));
ok("E Spirit Roar's later enemies meet the first one's conviction die and are not asked (0.6.1, TRG Prime 3.669.1)", /\{ presetDice: dice, presetConvictionDie: convictionDie, dcOverride: dc,/.test(autoSrc) && /if \(!dice\) convictionDie = Math\.max\(0, Math\.trunc\(Number\(check\.convictionDie\) \|\| 0\)\);\n\s*dice \?\?= check\.dice \?\? null;/.test(autoSrc));
ok("E the switch knows whether the Use was made in combat", /system: beaconFlags\(now, inCombatNow\(actor\)\), module: \{ beaconId \}/.test(autoSrc) && /system: mistFlags\(now, inCombatNow\(actor\)\)/.test(autoSrc));
ok("E the blade gains its AR text when it arrives, and the ticks are raised and put back with their feat and their item", /if \(item\.type === "weapon" && name === "raptorial blade"\) await bladeARInTraits\(actor\);/.test(autoSrc) && /if \(\(item\.type === "feat" && RAISED_TICKS\[name\]\) \|\| Object\.values\(RAISED_TICKS\)\.some\(\(s\) => s\.itemType === item\.type && s\.itemName === item\.name\)\) await raiseTicks\(actor\);/.test(autoSrc) && /if \(item\.type === "feat" && RAISED_TICKS\[name\]\) await raiseTicks\(actor\);/.test(autoSrc));
ok("E a put-back blade keeps its AR text, and a 0.6.0 feat's own tick is removed", /"system\.traits": bladeTraitsWithAR\(String\(before\.traits \?\? ""\), ar\)/.test(autoSrc) && /own\.filter\(\(r\) => norm\(r\?\.label\) !== featKey\)/.test(autoSrc));
ok("E characters made under 0.6.0 are brought into step by the acting GM at start-up", /if \(game\.user === game\.users\?\.activeGM\) \{\n\s*\(async \(\) => \{ for \(const actor of game\.actors \?\? \[\]\) await reconcileB5Actor\(actor\); \}\)\(\)/.test(script));
ok("E a reaction is spent through the system, with the feat's traits (0.6.1: Battle Readiness's rule)", /if \(typeof h\?\.spendReaction === "function"\) \{\n\s*const feat = typeof traits === "string" \? \{ system: \{ traits \} \} : Array\.from\(actor\.items \?\? \[\]\)\.find\(\(i\) => i\.name === label\);\n\s*return Boolean\(await h\.spendReaction\(actor, label, \{ traits: String\(feat\?\.system\?\.traits \?\? ""\) \}\)\);/.test(fs.readFileSync(path.join(ROOT, "module", "automations.mjs"), "utf8")));
ok("E Hive Coordination's tick is asked on Aid Another too (0.6.1, TRG Prime 3.669.1 names it)", JSON.stringify(byName["Hive Coordination"].flags["trg-prime"].conditionals[0].when.actions) === JSON.stringify(["aidOffensive", "aidDefensive", "aidAnother", "aid"]));
ok("E Waiting Blade's question reaches the defender's player through Block 4's route", /registerSharedOps\(\{ offers: \{ b5WaitingBlade: waitingBladeOffer \} \}\)/.test(autoSrc) && /offerTo\(target, "b5WaitingBlade"/.test(autoSrc));
const [sa, sb] = String(systemJson.version).split(".").map(Number);
const sc = Number(String(systemJson.version).split(".")[2] ?? 0);
ok("E the system at TRG_PRIME_ROOT is 3.669.2 or later", sa > 3 || (sa === 3 && (sb > 669 || (sb === 669 && sc >= 2))), systemJson.version);
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8"));
equal("E the module is 1.0.2, built for 3.674.2", [manifest.version, manifest.relationships.systems[0].compatibility.minimum], ["1.0.2", "3.674.2"]);
ok("E the script refuses an older system", script.includes('const REQUIRED_SYSTEM = "3.674.2";'));
for (const [name, docs] of [["it-feats", B5.BLOCK5_FEATS], ["it-spells", B5.BLOCK5_SPELLS], ["it-companions", B5.BLOCK5_NATURAL_ATTACKS]]) {
  const dir = path.join(ROOT, "packs-source", name);
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))) : [];
  ok(`E packs-source/${name} carries every Block 5 ${name.slice(3)}`, docs.every((d) => files.some((f) => f._id === d._id && f.name === d.name)));
}
const allIds = PACKS.flatMap((p) => p.docs.map((d) => d._id));
ok("E every id across the module is unique", new Set(allIds).size === allIds.length);
equal("E no Block 5 feat shares a name with a core feat", B5.BLOCK5_FEATS.filter((d) => (coreFeats ?? []).some((f) => String(f.name).toLowerCase() === d.name.toLowerCase())).map((d) => d.name), []);

/* ------------------------------------------------------------------ */
/* G  0.6.2: what the live test of 0.6.1 found                          */
/* ------------------------------------------------------------------ */

// G1 — MANY-FACETED VIGILANCE, through the core's own codex inheritance. The
// 0.6.1 Kabuto's +2 was saved on Compound Eyes and the prepared item read the
// pack's +1: an ability copy inherits its entry's flags (TRG Prime 3.631.0).
{
  const codex = await import(sys("module", "codex-inheritance.mjs"));
  const eyesDoc = PACKS.flatMap((p) => p.docs).find((d) => d.name === "Compound Eyes" && d.type === "ability");
  const index = codex.buildCodexIndex([{ pack: "abilities", name: eyesDoc.name, flags: eyesDoc.flags }]);
  const spec = auto5.RAISED_TICKS["many-faceted vigilance"];
  const ids = { moduleId: "trg-inner-tempest", systemId: "trg-prime", stashKey: "raisedTick" };
  const ownOf = (flags) => flags["trg-prime"];
  const DEL = { deletes: true };
  // An update applied to a plain flags object, as Foundry applies it.
  const applied = (flags, update) => {
    const out = structuredClone(flags);
    for (const [key, value] of Object.entries(update ?? {})) {
      const parts = key.split(".").slice(1);
      const last = parts.pop();
      let at = out;
      for (const p of parts) at = at[p] ??= {};
      if (value === DEL) delete at[last];
      else at[last] = value;
    }
    return out;
  };
  const prepared = (flags) => (codex.inheritedCodexFlags({ type: "ability", name: "Compound Eyes", flags }, index) ?? ownOf(flags)).conditionals[0].value;
  const step = (flags, held, isAbility = true) => auto5.raisedTickUpdate({
    held, spec, isAbility, ownRows: ownOf(flags).conditionals, codexInherit: ownOf(flags).codexInherit,
    stash: flags["trg-inner-tempest"]?.raisedTick ?? null, ...ids, deletion: () => DEL
  });
  const fresh = structuredClone(eyesDoc.flags);
  equal("G1 the defect, shown: a row raised on the copy alone still prepares as the pack's +1", prepared(applied(fresh, { "flags.trg-prime.conditionals": auto5.raisedTickRows(ownOf(fresh).conditionals, "Compound Eyes", 2) })), 1);
  const raised = applied(fresh, step(fresh, true));
  equal("G1 a new Kabuto with the feat: the row raised, the copy opted out of inheritance, the +1 and the opt-out stashed",
    [ownOf(raised).conditionals[0].value, ownOf(raised).codexInherit, raised["trg-inner-tempest"].raisedTick], [2, false, { value: 1, codex: true }]);
  equal("G1 …and the item the roll reads is +2", prepared(raised), 2);
  equal("G1 …and a second pass changes nothing", step(raised, true), null);
  const old061 = applied(fresh, { "flags.trg-prime.conditionals": auto5.raisedTickRows(ownOf(fresh).conditionals, "Compound Eyes", 2), "flags.trg-inner-tempest.raisedTick": { value: 1 } });
  const mendUpdate = step(old061, true);
  const mended = applied(old061, mendUpdate);
  equal("G1 a Kabuto saved under 0.6.1 (row raised, stash set, still inheriting) is mended: opted out and the stash marked, the row left",
    [Object.keys(mendUpdate).sort(), prepared(mended), mended["trg-inner-tempest"].raisedTick], [["flags.trg-inner-tempest.raisedTick", "flags.trg-prime.codexInherit"], 2, { value: 1, codex: true }]);
  const removed = applied(raised, step(raised, false));
  equal("G1 the feat removed: the +1 back, the stash and the opt-out gone, the pack's entry inherited again",
    [ownOf(removed).conditionals[0].value, "codexInherit" in ownOf(removed), "raisedTick" in (removed["trg-inner-tempest"] ?? {}), prepared(removed)], [1, false, false, 1]);
  const theirs = applied(fresh, { "flags.trg-prime.codexInherit": false });
  const theirsRaised = applied(theirs, step(theirs, true));
  const theirsRemoved = applied(theirsRaised, step(theirsRaised, false));
  equal("G1 a copy someone else opted out keeps its opt-out when the feat goes", [theirsRaised["trg-inner-tempest"].raisedTick, ownOf(theirsRemoved).codexInherit], [{ value: 1 }, false]);
  const zenki = { "trg-prime": { conditionals: [{ label: "Zenki", kind: "modifier", value: 1 }] } };
  const zenkiStep = auto5.raisedTickUpdate({ held: true, spec: auto5.RAISED_TICKS.forgeheart, isAbility: false, ownRows: zenki["trg-prime"].conditionals, codexInherit: undefined, stash: null, ...ids });
  equal("G1 a heritage (Forgeheart's Zenki) is not inherited, and is only raised", zenkiStep, { "flags.trg-prime.conditionals": [{ label: "Zenki", kind: "modifier", value: 2 }], "flags.trg-inner-tempest.raisedTick": { value: 1 } });
  equal("G1 nothing to raise, nothing written", step({ "trg-prime": { conditionals: [] } }, true), null);
  const rowGone = applied(raised, { "flags.trg-prime.conditionals": [] });
  const rowGoneOff = applied(rowGone, step(rowGone, false));
  equal("G1 the feat gone and the row gone too: the stash and this module's opt-out still go (found in review)", ["codexInherit" in ownOf(rowGoneOff), "raisedTick" in (rowGoneOff["trg-inner-tempest"] ?? {})], [false, false]);
  equal("G1 deletion by Foundry 14's operator, not the `-=` spelling that warns (found in review)", Object.keys(step(raised, false)).some((k) => k.includes("-=")), false);
}
ok("G2 the raise reads the item's own flags, not the prepared ones, and writes through raisedTickUpdate",
  /const own = target\._source\?\.flags\?\.\[SYSTEM_ID\] \?\? target\.flags\?\.\[SYSTEM_ID\] \?\? \{\};\n\s*const update = raisedTickUpdate\(\{\n\s*held, spec, isAbility: target\.type === "ability",\n\s*ownRows: own\.conditionals \?\? \[\], codexInherit: own\.codexInherit,/.test(autoSrc)
  && /if \(update\) await target\.update\(update\);/.test(autoSrc));
ok("G2 the raise is made again when its item is rewritten (a compendium refresh replaces its flags; found in review), and never loops",
  /Hooks\.on\("updateItem", \(item, changes, options, userId\) => \{ onItemUpdatedB5\(item, changes, options, userId\)/.test(script)
  && /export async function onItemUpdatedB5\(item, changes, options, userId\) \{\n\s*if \(userId !== game\.user\?\.id\) return;[\s\S]{0,200}if \(!changes\?\.flags\) return;\n\s*if \(Object\.values\(RAISED_TICKS\)\.some\(\(s\) => s\.itemType === item\.type && s\.itemName === item\.name\)\) await raiseTicks\(actor\);/.test(autoSrc));

// G3 — A REACTION ASKED ONLY WHEN IT COULD BE SPENT (found live: Guardian's
// Intercession asked on Battle Readiness's reaction, then refused).
{
  const saved = globalThis.game;
  const asked = [];
  const actor = { items: [{ name: "Waiting Blade", system: { traits: "Attack, Focus" } }, { name: "Shadow Counter", system: { traits: "Focus" } }], system: { resources: { reactions: { value: 1 } } } };
  try {
    globalThis.game = { combat: null };
    const outOfCombat = await auto1.reactionOpen(actor, "Shadow Counter");
    globalThis.game = { combat: { started: true }, trgPrime: { modules: { helpers: { reactionRefusal: async (_a, traits) => { asked.push(traits); return /Attack|Martial/.test(traits) ? "" : "Only your Battle Readiness reaction remains"; } } } } };
    const blade = await auto1.reactionOpen(actor, "Waiting Blade");
    const counter = await auto1.reactionOpen(actor, "Shadow Counter");
    globalThis.game = { combat: { started: true } };
    const fallbackOne = await auto1.reactionOpen(actor, "Shadow Counter");
    const fallbackNone = await auto1.reactionOpen({ ...actor, system: { resources: { reactions: { value: 0 } } } }, "Shadow Counter");
    equal("G3 reactionOpen: out of combat yes; the system's refusal read with each feat's traits; without the helper, the pool",
      [outOfCombat, blade, counter, asked, fallbackOne, fallbackNone], [true, true, false, ["Attack, Focus", "Focus"], true, false]);
  } finally { globalThis.game = saved; }
}
{
  const src = (f) => fs.readFileSync(path.join(ROOT, "module", f), "utf8");
  ok("G4 Waiting Blade, Form Reversal, Shadow Counter, Disciplined Flurry and Vanishing Retreat are asked only when their reaction could be spent",
    /if \(wb && blade && hasUse\(wb\) && await reactionOpen\(target, "Waiting Blade"\)\) await offerTo/.test(autoSrc)
    && /activeForm\(target\) && await reactionOpen\(target, "Form Reversal"\)\) await offerTo\(target, "formReversal"/.test(src("block4-automations.mjs"))
    && /if \((?:!ctx\.noReactions && )?ownedNamed\(target, "Shadow Counter"\) && await reactionOpen\(target, "Shadow Counter"\)\) await offerTo\(target, "shadowCounter"/.test(src("block4-automations.mjs"))
    && /if \(!\(await reactionOpen\(actor, "Vanishing Retreat"\)\)\) return;/.test(src("block4-automations.mjs"))
    && /hasUse\(disciplined\) && \(!inCombat \|\| await reactionOpen\(actor, "Disciplined Flurry"\)\)\) \{/.test(src("block3-automations.mjs")));
  ok("G4 Resist Dying is refused the same way, and spends through the system",
    /if \(inCombat && !\(await reactionOpen\(actor, "Resist Dying"\)\)\) \{/.test(src("skill-action-automations.mjs"))
    && /if \(inCombat\) await spendReaction\(actor, "Resist Dying"\);/.test(src("skill-action-automations.mjs")));
  const writers = fs.readdirSync(path.join(ROOT, "module")).filter((f) => f.endsWith(".mjs"))
    .filter((f) => /"system\.resources\.reactions\.value"/.test(src(f)));
  equal("G4 no module file writes the reaction pool but the fallback for a system without the helper", writers, ["automations.mjs"]);
  ok("G4 the fallback is the only write there", (src("automations.mjs").match(/"system\.resources\.reactions\.value"/g) ?? []).length === 1);
  const offerWf = fs.readFileSync(path.join(SYSTEM_ROOT, "module", "combat", "defence-offer-workflow.mjs"), "utf8");
  ok("G4 Guardian's Intercession: the system's defence offer reads the reaction with the feat's traits before asking (TRG Prime 3.669.2)",
    /const reactionReason = item \? reactionRefusal\(defender, String\(item\.system\?\.traits \?\? ""\)\) : "";/.test(offerWf));
}

/* ------------------------------------------------------------------ */

const EXPECTED = 572;
equal("Z the suite ran every check it is meant to", checks + 1, EXPECTED);
if (failures.length) { console.log(`verify-block5: ${checks} checks — ${failures.length} FAILED\n`); for (const f of failures) console.log(`  ✗ ${f}`); process.exitCode = 1; }
else console.log(`verify-block5: ${checks} checks — all green.`);
