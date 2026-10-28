#!/usr/bin/env node
/**
 * verify-block4 — Inner Tempest Block 4 (0.5.0): the Ghostwalker, the Kensai
 * and the Oathblade, the fifteen Ghost Arts, twelve Combat Forms and four
 * Sworn Oaths, and the 28 class feats (Graham's ruling B4-1), checked against
 * the book, against the system that reads them, and by driving the pure
 * decisions.
 *
 *   TRG_PRIME_ROOT=../core/trg-prime node tools/verify-block4.mjs
 *
 * Needs TRG Prime 3.668.0 at TRG_PRIME_ROOT.
 *
 *   A  The book (tools/content/book-text-block4.json, cut from the v1.2
 *      docx by tools/content/extract-book-block4.mjs): every paragraph an
 *      item prints is its section's, and every paragraph of its section is
 *      printed; trait lines, prerequisites, the class blocks and tables
 *   B  The system reads the declarations: Unseen Assault's dice and the
 *      feats on it, the forms' conditionals, stat and defence rows, Weapon
 *      Discipline, Challenge and the oaths, Ember Reaver's flat rider,
 *      Considered Mind, Unwavering Purpose, Oathblade's Resolve
 *   C  The pure decisions: what is owed, what is offered, the DCs and
 *      dice, Flow Strike's penalty, merging a form, the next-Strike marks,
 *      who answers
 *   D  Registration: classes and their proficiency and wealth, every Use,
 *      the reactions offered when attacked
 *   E  Wiring: the hooks, the helpers the automations call, the core's
 *      Block 4 seams, versions, packs
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

const B4 = await import("./content/block4.mjs");
const { PACKS } = await import("./content/foundation.mjs");
const auto4 = await import("../module/block4-automations.mjs");
const reg = await import("../module/registration.mjs");
const book = JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "content", "book-text-block4.json"), "utf8"));

const cond = await import(sys("module", "conditionals.mjs"));
const sr = await import(sys("module", "stat-rows.mjs"));
const dd = await import(sys("module", "combat", "defence-dc.mjs"));
const rend = await import(sys("module", "combat", "declared-rending.mjs"));
const amb = await import(sys("module", "combat", "ambush-dice.mjs"));
const so = await import(sys("module", "combat", "strike-options.mjs"));
const fd = await import(sys("module", "focus-declarations.mjs"));
const riders = await import(sys("module", "magic", "strike-riders.mjs"));
const uses = await import(sys("module", "uses.mjs"));
const api = await import(sys("module", "module-api.mjs"));
const wealthRules = await import(sys("module", "starting-wealth.mjs"));
const prof = await import(sys("module", "proficiency-rules.mjs"));

const ALL = [...B4.BLOCK4_CLASSES, ...B4.BLOCK4_ABILITIES, ...B4.BLOCK4_FEATS];
const F = (doc) => doc?.flags?.["trg-prime"] ?? {};
const named = (name, list = ALL) => list.find((d) => d.name === name);
const ofClass = (name, cls) => B4.BLOCK4_ABILITIES.find((d) => d.name === name && d.system.sourceClass === cls);
const descOf = (doc) => String(doc.system.description?.value ?? doc.system.description ?? "");
const list = (s) => String(s ?? "").split(",").map((x) => x.trim()).filter(Boolean);

/* ------------------------------------------------------------------ *
 * A. The book
 * ------------------------------------------------------------------ */

/** The comparison form: markup, emphasis, quotes, dashes, punctuation and spaces gone, lower case. */
const flat = (s) => String(s ?? "")
  .replace(/<\/?sup>/g, "").replace(/<[^>]+>/g, " ")
  .replace(/[*_\\]/g, "").replace(/[’‘]/g, "'").replace(/[“”]/g, "\"").replace(/[–—]/g, "-")
  .replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, "\"").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/(\w)-(\w)/g, "$1$2").replace(/[.,;:]/g, "").replace(/\s+/g, "").toLowerCase();

/** An item's printed paragraphs, before its *Automated* line. */
function printedParagraphs(doc) {
  const printed = descOf(doc).split(/<p>\s*<em>(?:Automated|Partly automated|Not automated):/)[0];
  return printed.split(/<\/p>|<\/li>/).map((p) => p.replace(/<\/?(ul|ol)>/g, "").trim()).filter(Boolean);
}

/** Each item and the book section it prints. */
const SECTION = new Map();
const cls4 = { Ghostwalker: ["GHOSTWALK", "UNSEEN ASSAULT", "VANISHING RETREAT", ["Ghost Arts", "Ghostwalker: GHOST ARTS"], ["Magical Tradition", "Ghostwalker: MAGICAL TRADITION"]],
  Kensai: [["Combat Form", "Kensai: COMBAT FORM"], ["Flow Strike", "Kensai: FLOW STRIKE"], ["Considered Mind", "Kensai: CONSIDERED MIND"], ["Weapon Discipline", "Kensai: WEAPON DISCIPLINE"], ["Magical Tradition", "Kensai: MAGICAL TRADITION"]],
  Oathblade: [["Challenge", "Oathblade: CHALLENGE"], ["Sworn Oath", "Oathblade: SWORN OATH"], ["Unwavering Purpose", "Oathblade: UNWAVERING PURPOSE"], ["Oathblade's Resolve", "Oathblade: OATHBLADE'S RESOLVE"], ["Magical Tradition", "Oathblade: MAGICAL TRADITION"]] };
for (const [cls, rows] of Object.entries(cls4)) {
  for (const row of rows) {
    const [name, key] = Array.isArray(row) ? row : [row.charAt(0) + row.slice(1).toLowerCase().replace(/ (\w)/g, (_, c) => ` ${c.toUpperCase()}`), row];
    SECTION.set(ofClass(name, cls), { key, from: "sections" });
  }
}
for (const n of auto4.COMBAT_FORM_NAMES) SECTION.set(named(n), { key: n.toUpperCase(), from: "sections" });
for (const n of Object.keys(auto4.GHOST_ART_LEVELS)) SECTION.set(named(n), { key: n.toUpperCase(), from: "sections" });
for (const n of B4.OATH_NAMES) SECTION.set(named(n), { key: n.toUpperCase(), from: "sections" });
for (const d of B4.BLOCK4_FEATS) SECTION.set(d, { key: d.name.toUpperCase(), from: "feats" });

equal("A every ability and feat Block 4 ships is read against a book section", [...SECTION.keys()].filter(Boolean).length, B4.BLOCK4_ABILITIES.length + B4.BLOCK4_FEATS.length);
for (const [doc, { key, from }] of SECTION) {
  const section = book[from][key];
  ok(`A ${doc?.name ?? key}: an item, and the book has its section`, Boolean(doc) && Boolean(section), key);
  if (!doc || !section) continue;
  const paras = printedParagraphs(doc).map((p) => p.replace(/^<li>/, ""));
  const bookLines = section.lines.map((l) => flat(l.replace(/^-\s+/, "")));
  const traitLine = flat(section.traits);
  for (const p of paras) {
    const body = flat(p);
    if (!body || body === traitLine) continue;
    ok(`A ${doc.name}: "${p.replace(/<[^>]+>/g, "").slice(0, 50)}…" is the book's`, bookLines.some((l) => l === body || l.includes(body) || body.includes(l)) && bookLines.join("").includes(body));
  }
  const printedFlat = flat(paras.join(" "));
  for (const l of section.lines) ok(`A ${doc.name}: prints the book's "${l.replace(/\*/g, "").slice(0, 50)}…"`, printedFlat.includes(flat(l.replace(/^-\s+/, ""))));
  if (section.traits) ok(`A ${doc.name}: prints its trait line`, printedFlat.startsWith(traitLine));
  ok(`A ${doc.name}: says what the system does with it`, /<em>(Automated|Partly automated|Not automated):<\/em>/.test(descOf(doc)));
}

// TRAITS AND PREREQUISITES, read off the book.
const traitWords = (s) => String(s ?? "").toUpperCase().split(/[\s,]+/).filter(Boolean).sort();
for (const [doc, { key, from }] of SECTION) {
  const section = book[from][key];
  if (!doc || !section) continue;
  if (section.traits) equal(`A ${doc.name}: traits as printed`, traitWords(doc.system.traits), traitWords(section.traits));
}
for (const doc of B4.BLOCK4_FEATS) {
  const first = book.feats[doc.name.toUpperCase()].lines[0];
  const printed = /^\*\*Prerequisites\*\*\s*(.*)$/.exec(first)?.[1] ?? "";
  equal(`A ${doc.name}: prerequisites as printed`, doc.system.prerequisites, printed);
  equal(`A ${doc.name}: a class feat`, doc.system.category, "Class");
}
equal("A the 28 class feats B4-1 brought in, and no others", B4.BLOCK4_FEATS.map((d) => d.name.toUpperCase().replace(/’/g, "'")).sort(), Object.keys(book.feats).sort());
equal("A Extra Form, Extra Ghost Art and Ghost Art Mastery may be taken again (\"multiple times\")", B4.BLOCK4_FEATS.filter((d) => d.system.repeatable).map((d) => d.name).sort(), ["Extra Form", "Extra Ghost Art", "Ghost Art Mastery"]);

// THE GHOST ARTS: their levels as printed, their category and class.
for (const [name, level] of Object.entries(auto4.GHOST_ART_LEVELS)) {
  const lines = book.sections[name.toUpperCase()].lines.join(" ");
  const printed = Number(/\*\*Prerequisites\*\* Level (\d+)/.exec(lines)?.[1] ?? 1);
  equal(`A ${name}: level ${level}, as its prerequisites print`, level, printed);
  const doc = named(name);
  equal(`A ${name}: a Ghostwalker Ghost Art, and the item knows its level`, [doc.system.category, doc.system.sourceClass, F(doc).itArtLevel], ["Ghost Art", "Ghostwalker", level]);
  ok(`A ${name}: "This Ghost Art is magical" is said on the card exactly when the book says so`, /This Ghost Art is magical/.test(lines) === /Magical\./.test(descOf(doc)) || /This Ghost Art is magical/.test(lines) === /magical/i.test(descOf(doc).split("Automated")[1] ?? ""));
}
equal("A fifteen Ghost Arts", Object.keys(auto4.GHOST_ART_LEVELS), B4.GHOST_ART_NAMES);
equal("A …the automations' table and the content agree", B4.GHOST_ARTS_BY_LEVEL, auto4.GHOST_ARTS_BY_LEVEL);
equal("A twelve Combat Forms, the automations' list and the content's", auto4.COMBAT_FORM_NAMES, B4.COMBAT_FORM_NAMES);
equal("A …and the forms owed, the same table", B4.COMBAT_FORMS_BY_LEVEL, auto4.COMBAT_FORMS_BY_LEVEL);
equal("A Weapon Discipline's groups, as printed", auto4.WEAPON_DISCIPLINE_GROUPS, book.sections["Kensai: WEAPON DISCIPLINE"].lines[1].split(/,\s*/));
equal("A …the content's list is the same", B4.WEAPON_DISCIPLINE_GROUPS, auto4.WEAPON_DISCIPLINE_GROUPS);
for (const name of auto4.COMBAT_FORM_NAMES) {
  const doc = named(name);
  const parts = F(doc).itForm?.parts ?? [];
  const printed = book.sections[name.toUpperCase()].lines.filter((l) => /^-\s/.test(l));
  equal(`A ${name}: a Kensai Combat Form`, [doc.system.category, doc.system.sourceClass], ["Combat Form", "Kensai"]);
  equal(`A ${name}: two benefits, as printed`, [parts.length, printed.length], [2, 2]);
  ok(`A ${name}: each benefit carries its own declarations (Echoed Form keeps one)`, parts.every((p) => p.label && p.flags && Object.keys(p.flags).length > 0));
}
for (const name of B4.OATH_NAMES) {
  const doc = named(name);
  equal(`A ${name}: an Oathblade Sworn Oath, declared`, [doc.system.category, doc.system.sourceClass, F(doc).itOath], ["Sworn Oath", "Oathblade", name]);
}
equal("A Sworn Oath offers the four oaths", F(ofClass("Sworn Oath", "Oathblade")).abilityChoices, B4.OATH_NAMES);
equal("A …which the book prints", B4.OATH_NAMES.map((n) => n.toUpperCase()), Object.keys(book.sections).filter((k) => /^OATH OF /.test(k)));

// THE CLASSES: fields, table, wealth, minimums, granted feat, abilities.
const WEALTH = { Ghostwalker: 0, Kensai: 1, Oathblade: 2 };
const MINIMUMS = { Ghostwalker: { dexterity: 2 }, Kensai: { dexterity: 2, intelligence: 2 }, Oathblade: { charisma: 2 } };
const GRANTED = { Ghostwalker: "1: Weapon Finesse", Kensai: "1: Weapon Finesse", Oathblade: "1: Quick Draw" };
const ABILITIES = {
  Ghostwalker: ["Ghostwalk", "Unseen Assault", "Vanishing Retreat", "Ghost Arts", "Magical Tradition"],
  Kensai: ["Combat Form", "Flow Strike", "Considered Mind", "Weapon Discipline", "Magical Tradition"],
  Oathblade: ["Challenge", "Sworn Oath", "Unwavering Purpose", "Oathblade's Resolve", "Magical Tradition"]
};
for (const c of B4.BLOCK4_CLASSES) {
  const b = book.classes[c.name];
  const s = c.system;
  equal(`A ${c.name}: class type`, s.classType, b.type);
  equal(`A ${c.name}: key ability scores`, s.keyAbilityScores, b.keyAbilityScores);
  equal(`A ${c.name}: proficiencies`, s.proficiencies, b.proficiencies);
  equal(`A ${c.name}: class skills`, s.classSkills, b.classSkills);
  equal(`A ${c.name}: hit points ("${b.hitPoints}")`, s.hitPoints, Number(/^(\d+)/.exec(b.hitPoints)[1]));
  equal(`A ${c.name}: skill points ("${b.skillPoints}")`, s.skillPoints, Number(/^(\d+)/.exec(b.skillPoints)[1]));
  equal(`A ${c.name}: the bonus feats paragraph`, F(c).bonusFeatsNote, book.sections[`${c.name}: BONUS FEATS`].lines.join(" ").replace(/<\/?sup>/g, ""));
  equal(`A ${c.name}: the minimum abilities ("(min +2)")`, F(c).minimumAbilities, MINIMUMS[c.name]);
  ok(`A ${c.name}: …as the key ability scores print them`, Object.keys(MINIMUMS[c.name]).every((k) => new RegExp(`${k}\\s*\\(min \\+2\\)`, "i").test(b.keyAbilityScores)) && (b.keyAbilityScores.match(/min \+2/g) ?? []).length === Object.keys(MINIMUMS[c.name]).length);
  equal(`A ${c.name}: the feat it grants at 1st`, s.grantedFeats, GRANTED[c.name]);
  ok(`A ${c.name}: …as its bonus feats paragraph says`, book.sections[`${c.name}: BONUS FEATS`].lines.join(" ").includes(`gain the ${GRANTED[c.name].slice(3)} feat`));
  equal(`A ${c.name}: wealth (Chapter 6, as audited)`, Number(s.wealth), WEALTH[c.name]);
  equal(`A ${c.name}: the class table, twenty rows of BAB, BDB, Fort, Ref, Will, Bonus Feats`, s.progression.map((r) => [r.level, r.bab, r.bdb, r.fortitude, r.reflex, r.will, r.bonusFeats]), book.tables[c.name]);
  ok(`A ${c.name}: no spellcasting progression ("You have no normal spellcasting …")`, s.progression.every((r) => r.casterLevel === 0 && r.pp === 0 && r.bsb === 0) && !s.magicalTradition && !s.casterStyle);
  ok(`A ${c.name}: the description prints the book's`, flat(descOf(c)).includes(flat(b.description)));
  equal(`A ${c.name}: its class abilities, all at 1st`, list(s.classAbilities), ABILITIES[c.name].map((n) => `1: ${n}`));
  for (const n of ABILITIES[c.name]) ok(`A ${c.name} → ${n}: a class ability of the ${c.name}`, Boolean(ofClass(n, c.name)) && F(ofClass(n, c.name)).classAbility?.class === c.name);
}
equal("A the Magical Tradition each class names: Wisdom, Intelligence, Charisma", ["Ghostwalker", "Kensai", "Oathblade"].map((c) => F(ofClass("Magical Tradition", c)).itTradition), [{ ability: "wisdom", tradition: "" }, { ability: "intelligence", tradition: "" }, { ability: "charisma", tradition: "" }]);
ok("A …each as its class prints it", /Wisdom as your magical ability/.test(book.sections["Ghostwalker: MAGICAL TRADITION"].lines.join(" ")) && /Intelligence as your magical ability/.test(book.sections["Kensai: MAGICAL TRADITION"].lines.join(" ")) && /Charisma as its magical ability/.test(book.sections["Oathblade: MAGICAL TRADITION"].lines.join(" ")));

/* ------------------------------------------------------------------ *
 * B. The system reads the declarations
 * ------------------------------------------------------------------ */

const scaling = { classBonus: 3, level: 6, halfLevel: 3, strength: 1, dexterity: 4, constitution: 1, intelligence: 3, wisdom: 1, charisma: 2 };
const rowsOf = (raws, name = "X") => (raws ?? []).map((r, i) => cond.normaliseConditional(r, { id: "x", name, kind: "effect" }, i, scaling)).filter(Boolean);
const matches = (rows, ctx) => rows.filter((r) => cond.matchesCheck(r, ctx)).map((r) => [r.kind, r.value ?? 0]);

// UNSEEN ASSAULT
const ua = amb.declaredAmbush([named("Unseen Assault")]);
equal("B Unseen Assault: 1d6 at 1st, 2d6 at 5th, 3d6 at 9th, 4d6 at 13th, 5d6 at 17th; once per round", [ua?.die, ua?.oncePerRound, ...[1, 4, 5, 8, 9, 13, 17, 20].map((l) => amb.ambushDiceCount(ua, l))], ["d6", true, 1, 1, 2, 2, 3, 4, 5, 5]);
ok("B …\"increases by 1d6 at 5th level and every 4 levels thereafter\"", /increases by 1d6 at 5th level and every 4 levels thereafter/.test(book.sections["UNSEEN ASSAULT"].lines.join(" ")));
const extras = amb.declaredAmbushExtras([named("Ghost Blade"), named("Ambusher's Patience")]);
equal("B Ghost Blade: AR 1 from 6th, 2 at 12th, 3 at 18th", [5, 6, 12, 18].map((l) => amb.ambushExtrasFor(extras, { level: l, undetected: false, alreadyAmbushed: true }).ar), [0, 1, 2, 3]);
equal("B Ambusher's Patience: +2d6 against a creature that had not detected you, once per creature", [amb.ambushExtrasFor(extras, { level: 6, undetected: true }).dice, amb.ambushExtrasFor(extras, { level: 6, undetected: true, alreadyAmbushed: true }).dice, amb.ambushExtrasFor(extras, { level: 6, undetected: false }).asks.length], [2, 0, 1]);

// THE FORMS' DECLARATIONS
const formRows = (name) => rowsOf(auto4.mergeFormFlags(F(named(name)).itForm.parts).conditionals, name);
equal("B Black Lotus: +Int (3) to Feint, by itself", matches(formRows("Black Lotus"), { checkType: "skill", actionKey: "feint" }), [["modifier", 3]]);
equal("B Crashing Tide: +1 attack and +Int damage, offered as ticks", formRows("Crashing Tide").map((r) => [r.value, r.auto]), [[1, false], [3, false]]);
equal("B Dread Wolf: +1 attack and +3 damage against an isolated creature, nothing otherwise", [matches(formRows("Dread Wolf"), { checkType: "attack", targetStates: ["isolated"] }), matches(formRows("Dread Wolf"), { checkType: "damage", targetStates: ["isolated"] }), matches(formRows("Dread Wolf"), { checkType: "attack", targetStates: [] })], [[["modifier", 1]], [["modifier", 3]], []]);
const statState = { attributes: { intelligence: { total: 3 } }, level: 6, classBonus: 3 };
equal("B Echoing Crane: class bonus − 1 (2 at class bonus 3) to DB, a class bonus", sr.statRowEntries(sr.declaredStatRows([{ flags: { "trg-prime": auto4.mergeFormFlags(F(named("Echoing Crane")).itForm.parts) } }]), statState).map((e) => [e.path, e.entry.value, e.entry.type]), [["system.combat.defence", 2, "class"]]);
equal("B Flickering Flame: +1 per 2 Int (1 at Int 3) to Reflex saves and Acrobatics", [matches(formRows("Flickering Flame"), { checkType: "save", subject: "reflex" }), matches(formRows("Flickering Flame"), { checkType: "skill", subject: "acrobatics" })], [[["modifier", 1]], [["modifier", 1]]]);
equal("B …minimum +1 at Int 1, +2 at Int 4", [1, 4].map((i) => (F(named("Flickering Flame")).itForm.parts[0].flags.conditionals ?? []).map((r) => cond.normaliseConditional(r, { id: "x", name: "FF", kind: "effect" }, 0, { ...scaling, intelligence: i })?.value)), [[1, 1], [2, 2]]);
equal("B …and −5 to reaction attacks against you", so.reactionAttackPenaltyRows([{ flags: { "trg-prime": auto4.mergeFormFlags(F(named("Flickering Flame")).itForm.parts) } }]).map((r) => r.value), [-5]);
const galeDC = (auto4.mergeFormFlags(F(named("Gale Cutter")).itForm.parts).defenceDC ?? []).map((r) => dd.normaliseDefenceDC(r, { name: "Gale Cutter" }));
equal("B Gale Cutter: grapples against you at disadvantage (a scoped row the system accepts)", galeDC.map((e) => e && [e.kind, e.actions]), [["disadvantage", ["grappleattack"]]]);
equal("B …and advantage on Escape, by itself", matches(formRows("Gale Cutter"), { checkType: "skill", actionKey: "escape" }), [["advantage", 0]]);
equal("B Ghost Fox: +Int to Stealth; +Int damage against a flat-footed target only", [matches(formRows("Ghost Fox"), { checkType: "skill", subject: "stealth" }), matches(formRows("Ghost Fox"), { checkType: "damage", targetStates: ["flatfooted"] }), matches(formRows("Ghost Fox"), { checkType: "damage", targetStates: [] })], [[["modifier", 3]], [["modifier", 3]], []]);
const tortoise = auto4.mergeFormFlags(F(named("Iron Tortoise")).itForm.parts);
equal("B Iron Tortoise: +1 DB per 2 Int (minimum +1)", [sr.statRowEntries(sr.declaredStatRows([{ flags: { "trg-prime": tortoise } }]), statState)[0]?.entry.value, sr.statRowEntries(sr.declaredStatRows([{ flags: { "trg-prime": tortoise } }]), { ...statState, attributes: { intelligence: { total: 1 } } })[0]?.entry.value], [1, 1]);
equal("B …Shove, Reposition and Trip against you at disadvantage (Graham: a Trip is included)", (tortoise.defenceDC ?? []).map((r) => dd.normaliseDefenceDC(r, { name: "Iron Tortoise" })).map((e) => e && [e.kind, e.actions]), [["disadvantage", ["shoveattack", "reposition", "tripattack"]]]);
equal("B Rising Phoenix: +2 per Int to Climbing and to High and Long Jump", [matches(formRows("Rising Phoenix"), { checkType: "skill", subject: "climbing" }), matches(formRows("Rising Phoenix"), { checkType: "skill", actionKey: "longJump" })], [[["modifier", 6]], [["modifier", 6]]]);
equal("B Steel Viper: +5 × Int to initiative", matches(formRows("Steel Viper"), { checkType: "initiative" }), [["modifier", 15]]);
equal("B Stone Serpent: +Int damage from reach only; advantage on Kip Up", [matches(formRows("Stone Serpent"), { checkType: "damage", rangeBand: "reach" }), matches(formRows("Stone Serpent"), { checkType: "damage", rangeBand: "adjacent" }), matches(formRows("Stone Serpent"), { checkType: "skill", actionKey: "kipUp" })], [[["modifier", 3]], [], [["advantage", 0]]]);
ok("B every form's conditional is a class bonus unless the book says otherwise (\"All modifiers … are class bonus\")", auto4.COMBAT_FORM_NAMES.every((n) => (auto4.mergeFormFlags(F(named(n)).itForm.parts).conditionals ?? []).every((r) => r.kind !== "modifier" || r.type === "class")));
ok("B …and every one of them is read by the system", auto4.COMBAT_FORM_NAMES.every((n) => { const raw = auto4.mergeFormFlags(F(named(n)).itForm.parts).conditionals ?? []; return rowsOf(raw).length === raw.length; }));

// WEAPON DISCIPLINE (B4-2: untyped)
const wd = auto4.weaponDisciplineFlags("Sword");
equal("B Weapon Discipline (Sword): class bonus − 1, untyped, to attack and damage with a sword, nothing with an axe", [matches(rowsOf(wd.conditionals), { checkType: "attack", attackGroup: "sword" }), matches(rowsOf(wd.conditionals), { checkType: "damage", attackGroup: "sword" }), matches(rowsOf(wd.conditionals), { checkType: "attack", attackGroup: "axe" }), rowsOf(wd.conditionals).map((r) => r.type)], [[["modifier", 2]], [["modifier", 2]], [], ["untyped", "untyped"]]);
equal("B …Finesse on a sword in one hand, not two, not an axe", [so.traitsWithGroupGrants("Versatile P", [{ flags: { "trg-prime": wd } }], { group: "sword", oneHanded: true }), so.traitsWithGroupGrants("Versatile P", [{ flags: { "trg-prime": wd } }], { group: "sword", oneHanded: false }), so.traitsWithGroupGrants("", [{ flags: { "trg-prime": wd } }], { group: "axe", oneHanded: true })], ["Versatile P, Finesse", "Versatile P", ""]);

// CHALLENGE AND THE OATHS
const ch = auto4.challengeFlags({ targetUuid: "Actor.T", targetName: "Orc", distantHonour: true });
const chRows = rowsOf(ch.conditionals);
equal("B Challenge: class bonus to melee attack and damage against the target only", [matches(chRows, { checkType: "attack", attackMode: "melee", targetUuid: "Actor.T" }), matches(chRows, { checkType: "damage", attackMode: "melee", targetUuid: "Actor.T" }), matches(chRows, { checkType: "attack", attackMode: "melee", targetUuid: "Actor.U" })], [[["modifier", 3]], [["modifier", 3]], []]);
equal("B Distant Honour: also a bow within the first range increment, not beyond, not a crossbow", [matches(chRows, { checkType: "attack", attackMode: "ranged", attackGroup: "bow", rangeBand: "first", targetUuid: "Actor.T" }), matches(chRows, { checkType: "attack", attackMode: "ranged", attackGroup: "bow", rangeBand: "far", targetUuid: "Actor.T" }), matches(chRows, { checkType: "attack", attackMode: "ranged", attackGroup: "crossbow", rangeBand: "first", targetUuid: "Actor.T" })], [[["modifier", 3]], [], []]);
const chRend = rend.declaredRendingRows([{ flags: { "trg-prime": ch } }], scaling);
equal("B Challenge: AR equal to the class bonus on a melee Strike against the target; the bow too with Distant Honour", [rend.declaredRending(chRend, { attackMode: "melee", targetUuid: "Actor.T" }).total, rend.declaredRending(chRend, { attackMode: "melee", targetUuid: "Actor.U" }).total, rend.declaredRending(chRend, { attackMode: "ranged", attackGroup: "bow", rangeBand: "first", targetUuid: "Actor.T" }).total], [3, 0, 3]);
const chDC = dd.normaliseDefenceDC(ch.defenceDC[0], { name: "Challenge" });
equal("B Challenge: −2 to DB against everyone but the target", [chDC?.value, chDC?.notSourceUuids], [-2, ["Actor.T"]]);
equal("B Guarded Commitment: −1", dd.normaliseDefenceDC(auto4.challengeFlags({ targetUuid: "Actor.T", guarded: true }).defenceDC[0], {})?.value, -1);
equal("B Oath of Honour: +2 DB against the target only", (({ value, sourceUuids }) => [value, sourceUuids])(dd.normaliseDefenceDC(auto4.honourDefenceFlags("Actor.T").defenceDC[0], {})), [2, ["Actor.T"]]);
const hon = rowsOf(auto4.honourStrikeFlags("Actor.T").conditionals);
equal("B Oath of Honour: advantage on a melee Strike against the target in a duel, not when an ally is beside it", [matches(hon, { checkType: "attack", attackMode: "melee", targetUuid: "Actor.T", targetStates: ["duel"] }), matches(hon, { checkType: "attack", attackMode: "melee", targetUuid: "Actor.T", targetStates: [] })], [[["advantage", 0]], []]);
const ret = auto4.nextStrikeOathFlags("Actor.T", "Orc", { label: "Retribution", rending: 2 });
equal("B Retribution: advantage, +Cha damage, AR +2 on a melee Strike against the target", [matches(rowsOf(ret.conditionals), { checkType: "attack", attackMode: "melee", targetUuid: "Actor.T" }), matches(rowsOf(ret.conditionals), { checkType: "damage", attackMode: "melee", targetUuid: "Actor.T" }), rend.declaredRending(rend.declaredRendingRows([{ flags: { "trg-prime": ret } }], scaling), { attackMode: "melee", targetUuid: "Actor.T" }).total], [[["advantage", 0]], [["modifier", 2]], 2]);
const guard = auto4.nextStrikeOathFlags("Actor.T", "Orc", { label: "Oath of Guardianship", charismaMin: 1 });
equal("B Guardianship: advantage, and Charisma (2) as damage", rowsOf(guard.conditionals, "G").map((r) => [r.kind, r.value ?? 0]), [["advantage", 0], ["modifier", 2]]);
equal("B …minimum 1 with Charisma 0", guard.conditionals[1].valueMin, 1);
const gt = rowsOf(auto4.guardianshipTargetFlags("Actor.O", "Oathblade").conditionals);
equal("B Guardianship on the target: −2 on attacks against anyone but the Oathblade", [matches(gt, { checkType: "attack", targetUuid: "Actor.A" }), matches(gt, { checkType: "attack", targetUuid: "Actor.O" })], [[["modifier", -2]], []]);
const fe = auto4.fealtyChargeFlags("Actor.T");
equal("B Oath of Fealty on the charge: +1 attack and AR 1 against the target", [matches(rowsOf(fe.conditionals), { checkType: "attack", targetUuid: "Actor.T" }), rend.declaredRending(rend.declaredRendingRows([{ flags: { "trg-prime": fe } }], scaling), { targetUuid: "Actor.T", attackMode: "ranged" }).total], [[["modifier", 1]], 1]);
equal("B Shelter Under Oath: +2 to saves against the target's effects only", [matches(rowsOf(auto4.shelterFlags("Actor.T").conditionals), { checkType: "save", sourceUuid: "Actor.T" }), matches(rowsOf(auto4.shelterFlags("Actor.T").conditionals), { checkType: "save", sourceUuid: "Actor.U" })], [[["modifier", 2]], []]);
const nb = rowsOf(auto4.nextAttackBonusFlags({ value: 1, type: "untyped", label: "Perfect Tempo", scope: "x", notTargetUuid: "Actor.T", auto: false }).conditionals);
equal("B Perfect Tempo: +1 offered against a different enemy, not the one Flow Strike hit", [matches(nb, { checkType: "attack", targetUuid: "Actor.U" }), matches(nb, { checkType: "attack", targetUuid: "Actor.T" })], [[["modifier", 1]], []]);

// THE REST
const ember = riders.normaliseStrikeRider({ dice: "3", flat: true, damageType: "fire", scope: "any", label: "Ember Reaver", once: true, spendOnHit: true });
equal("B Ember Reaver's second hit: a flat 3 fire rider, spent on a hit, kept through the round trip", [ember?.dice, ember?.flat, ember?.spendOnHit, riders.normaliseStrikeRider(ember)?.dice], ["3", true, true, "3"]);
equal("B …a bare number without `flat` is still refused", riders.normaliseStrikeRider({ dice: "3", damageType: "fire" }), null);
equal("B Considered Mind and Unwavering Purpose: Intelligence or Charisma on Refocus only", [F(ofClass("Considered Mind", "Kensai")).actionAbilityOptions, F(ofClass("Unwavering Purpose", "Oathblade")).actionAbilityOptions], [[{ action: "refocus", ability: "intelligence", label: "Considered Mind" }], [{ action: "refocus", ability: "charisma", label: "Unwavering Purpose" }]]);
equal("B Oathblade's Resolve: +1 conviction", fd.declaredConvictionBonus([ofClass("Oathblade's Resolve", "Oathblade")]), 1);
equal("B Ghost Art Mastery's declaration gives the chosen art a second use", fd.focusExtraUses({ type: "ability", name: "Ghost Step", system: { traits: "Focus, Movement, Technique" } }, [{ flags: { "trg-prime": { focusExtraUses: [{ value: 1, names: ["Ghost Step"], restoresAll: true }] } } }]), 1);
for (const doc of [...B4.BLOCK4_ABILITIES, ...B4.BLOCK4_FEATS].filter((d) => /\bfocus\b/i.test(d.system.traits ?? ""))) {
  equal(`B ${doc.name}: Focus, so one use by default`, uses.focusDefaultUses(doc.system, doc.type), 1);
}
ok("B False Face: Int instead of Cha on Disguise, never below nothing", matches(rowsOf(F(named("False Face")).conditionals), { checkType: "skill", actionKey: "disguise" })[0]?.[1] === 1 && rowsOf(F(named("False Face")).conditionals, "FF").length === 1 && F(named("False Face")).conditionals[0].valueMin === 0);

/* ------------------------------------------------------------------ *
 * C. The pure decisions
 * ------------------------------------------------------------------ */

equal("C Ghost Arts owed: 2 at 1st, 3 at 4th, 4 at 8th, 7 at 20th; +1 per Extra Ghost Art", [1, 3, 4, 8, 20].map((l) => auto4.ghostArtsOwed(l)).concat(auto4.ghostArtsOwed(4, 2)), [2, 2, 3, 4, 7, 5]);
equal("C Combat Forms owed: the same ladder; +1 per Extra Form", [1, 4, 12, 16].map((l) => auto4.combatFormsOwed(l)).concat(auto4.combatFormsOwed(1, 1)), [2, 3, 5, 6, 3]);
equal("C the arts on offer at 4th, known ones left out", auto4.artsOnOffer(4, ["Ghost Step", "smoke veil"]), ["False Face", "Hollow Breath", "Misdirecting Whisper", "No Trace", "Silent Needles", "Spider Path", "Caltrop Blossom", "Falling Shadow"]);
equal("C …none above the level", auto4.artsOnOffer(8, []).some((n) => auto4.GHOST_ART_LEVELS[n] > 8), false);
equal("C Caltrop Blossom: 2d6 at 4th, 3d6 at 8th, 4d6 at 12th, 6d6 at 20th", [4, 7, 8, 12, 20].map(auto4.caltropDice), ["2d6", "2d6", "3d6", "4d6", "6d6"]);
equal("C the Technique DC: 10 + Int + level", auto4.techniqueDC(3, 6), 19);
equal("C Flow Strike: the third Strike's penalty; Gale Cutter's −5 when better", [auto4.flowStrikePenalty(-10), auto4.flowStrikePenalty(-8), auto4.flowStrikePenalty(-10, true), auto4.flowStrikePenalty(-4, true)], [-10, -8, -5, -4]);
equal("C Vanishing Retreat: 5 feet, 10 with Fleeting Shadow", [auto4.vanishingStepFeet(false), auto4.vanishingStepFeet(true)], [5, 10]);
equal("C Steel Viper: 5 × Int, never a penalty", [auto4.steelViperShift(3), auto4.steelViperShift(-1)], [15, 0]);
equal("C Ember Reaver: +1 a round, capped at Int (B4-4)", [auto4.emberNext(0, 3), auto4.emberNext(2, 3), auto4.emberNext(3, 3), auto4.emberNext(5, 2)], [1, 3, 3, 2]);
const merged = auto4.mergeFormFlags([{ flags: { conditionals: [1], x: true } }, { flags: { conditionals: [2], defenceDC: [3] } }]);
equal("C a blend joins both forms' rows", merged, { conditionals: [1, 2], x: true, defenceDC: [3] });
equal("C the stance's name: one form, or a blend", [auto4.formStanceName(["Ghost Fox"]), auto4.formStanceName(["Ghost Fox", "Iron Tortoise"])], ["Combat Form: Ghost Fox", "Blended Form: Ghost Fox + Iron Tortoise"]);
equal("C once per round: the same combat and round only", [auto4.usedThisRound({ combatId: "c", round: 2 }, "c", 2), auto4.usedThisRound({ combatId: "c", round: 2 }, "c", 3), auto4.usedThisRound({ combatId: "c", round: 2 }, "d", 2), auto4.usedThisRound(null, "c", 2)], [true, false, false, false]);
const S = (mark, o) => auto4.nextStrikeSpent(mark, o);
equal("C a next-Strike bonus goes with the Strike it was for", [S({ targetUuid: "T", melee: true }, { targetUuid: "T", melee: true }), S({ targetUuid: "T", melee: true }, { targetUuid: "U", melee: true }), S({ targetUuid: "T", melee: true }, { targetUuid: "T", melee: false }), S({ targetUuid: null }, { targetUuid: "U" }), S({ notTargetUuid: "T" }, { targetUuid: "T" }), S(null, {})], [true, false, false, true, false, false]);
equal("C Unpaid Debt: a miss keeps Retribution; damage spends it", [S({ targetUuid: "T", melee: true, keepOnMiss: true }, { targetUuid: "T", melee: true, hits: false }), S({ targetUuid: "T", melee: true, keepOnMiss: true }, { targetUuid: "T", melee: true, hits: true, damageTaken: 0 }), S({ targetUuid: "T", melee: true, keepOnMiss: true }, { targetUuid: "T", melee: true, hits: true, damageTaken: 4 })], [false, false, true]);
const users = [{ id: "gm", active: true, isGM: true, owner: true }, { id: "p1", active: true, isGM: false, owner: true }, { id: "p2", active: true, isGM: false, owner: true, isCharacter: true }, { id: "p3", active: false, isGM: false, owner: true, isCharacter: true }];
equal("C who answers: the player whose character it is, a player who owns it, else the acting GM", [auto4.answererFor({ users, activeGMId: "gm" }), auto4.answererFor({ users: users.filter((u) => u.id !== "p2"), activeGMId: "gm" }), auto4.answererFor({ users: users.filter((u) => u.isGM), activeGMId: "gm" })], ["p2", "p1", "gm"]);

/* ------------------------------------------------------------------ *
 * D. Registration
 * ------------------------------------------------------------------ */

const calls = [];
const fake = new Proxy({}, { get: (_, method) => (...args) => { calls.push([method, ...args]); return true; } });
reg.registerContent(fake, "trg-inner-tempest");
const called = (m) => calls.filter((c) => c[0] === m);
equal("D the classes registered with their wealth", called("registerClass").filter((c) => WEALTH[c[1]] !== undefined).map((c) => [c[1], c[2].wealth]), Object.entries(WEALTH));
const automationNames = called("registerFeatAutomation").map((c) => c[1]);
const shipped = new Set(PACKS.flatMap((p) => p.docs.map((d) => d.name.toLowerCase())));
for (const [name, entry] of Object.entries(auto4.BLOCK4_AUTOMATIONS)) {
  ok(`D automation "${name}" names an item Block 4 ships, with a hint and a Use, and is registered`, ALL.some((d) => d.name.toLowerCase() === name) && typeof entry.use === "function" && Boolean(entry.hint) && automationNames.includes(name));
}
for (const doc of [...B4.BLOCK4_ABILITIES, ...B4.BLOCK4_FEATS]) {
  const handled = Boolean(auto4.BLOCK4_AUTOMATIONS[doc.name.toLowerCase()]) || Boolean(F(doc).abilityChoices);
  ok(`D ${doc.name}: its Use does something, or says what it does`, handled);
}
ok("D no Block 4 automation shadows a Block 1-3 one", Object.keys(auto4.BLOCK4_AUTOMATIONS).every((n) => !calls.some((c) => c[0] === "registerFeatAutomation" && c[1] === n && c !== calls.find((x) => x[0] === "registerFeatAutomation" && x[1] === n))));
const offers = called("registerDefenceOffer").map((c) => c[1]);
// Re-anchored at 0.6.0: Block 5's Guardian's Intercession is registered after them.
equal("D the reactions offered when attacked gain Shadow Double and Deflect Arrow", offers.filter((n) => ["Shadow Double", "Deflect Arrow"].includes(n)), ["Shadow Double", "Deflect Arrow"]);
equal("D Shadow Double against any attack; Deflect Arrow (with Evade) against a Strike", [auto4.BLOCK4_DEFENCE_OFFERS["Shadow Double"].against, auto4.BLOCK4_DEFENCE_OFFERS["Deflect Arrow"].against], ["attack", "weapon"]);
equal("D Deflect Arrow is offered only to one who can Evade (Inner Discipline)", [Boolean(auto4.BLOCK4_DEFENCE_OFFERS["Deflect Arrow"].find({ items: [{ type: "feat", name: "Deflect Arrow" }] })), Boolean(auto4.BLOCK4_DEFENCE_OFFERS["Deflect Arrow"].find({ items: [{ type: "feat", name: "Deflect Arrow" }, { type: "feat", name: "Inner Discipline" }] }))], [false, true]);
// THROUGH THE SYSTEM'S OWN API
reg.registerContent({ ...Object.fromEntries(Object.keys(api).filter((k) => typeof api[k] === "function").map((k) => [k, api[k]])), registerFeatAutomation() {}, registerPassiveAutomation() {}, registerDefenceOffer() {}, registerSkillActions() {} }, "trg-inner-tempest");
ok("D the system knows the three classes", ["ghostwalker", "kensai", "oathblade"].every((n) => api.registeredClassNames().includes(n)));
equal("D …and their wealth, through its own wealth rule", B4.BLOCK4_CLASSES.map((c) => wealthRules.classWealth({ type: "class", name: c.name, system: { ...c.system, wealth: "" } }).value), [0, 1, 2]);
const P = (n) => prof.classProficiencyEntry(n)?.entry;
equal("D Ghostwalker: simple weapons, shortbows, the wakizashi, Monastic weapons; light armour and bucklers", P("Ghostwalker") && [P("Ghostwalker").weaponCategories, P("Ghostwalker").weaponNames, P("Ghostwalker").weaponRules.map((r) => [r.kind, r.value]), P("Ghostwalker").armourCategories, P("Ghostwalker").shieldCategories], [["Simple"], ["Short Bow", "Composite Shortbow", "Wakizashi"], [["trait", "Monastic"]], ["Light"], ["buckler"]]);
equal("D Kensai: simple and martial weapons; light and medium armour and bucklers", P("Kensai") && [P("Kensai").weaponCategories, P("Kensai").armourCategories, P("Kensai").otherTiers, P("Kensai").shieldCategories], [["Simple", "Martial"], ["Light", "Medium"], ["light", "medium"], ["buckler"]]);
equal("D Oathblade: simple and martial weapons, the katana and wakizashi; all armour; no shields", P("Oathblade") && [P("Oathblade").weaponCategories, P("Oathblade").weaponNames, P("Oathblade").armourCategories, P("Oathblade").shieldCategories], [["Simple", "Martial"], ["Katana", "Wakizashi"], ["Light", "Medium", "Heavy"], []]);

/* ------------------------------------------------------------------ *
 * E. Wiring, the core's seams, versions, packs
 * ------------------------------------------------------------------ */

const script = fs.readFileSync(path.join(ROOT, "scripts", "inner-tempest.mjs"), "utf8");
for (const [hook, fn] of [["trgPrimeStrikeResolved", "onStrikeResolved"], ["trgPrimeStrikeRolled", "onStrikeRolled"], ["trgPrimeAmbushDealt", "onAmbushDealt"], ["trgPrimeDamageApplied", "onDamageAppliedB4"], ["trgPrimeTurnEnded", "onTurnEndedB4"], ["trgPrimeDailyPreparation", "onDailyPreparationB4"], ["deleteCombat", "onCombatDeletedB4"], ["deleteActiveEffect", "onEffectDeletedB4"], ["updateToken", "onTokenMovedB4"]]) {
  ok(`E ${fn} listens on ${hook}`, new RegExp(`Hooks\\.on\\("${hook}",[^\\n]*${fn}\\(`).test(script));
}
ok("E Block 4's socket is registered at ready", /Hooks\.once\("ready",[\s\S]*registerBlock4Socket\(\)/.test(script));
const src = fs.readFileSync(path.join(ROOT, "module", "block4-automations.mjs"), "utf8");
const apiSrc = fs.readFileSync(path.join(SYSTEM_ROOT, "module", "module-api-workflow.mjs"), "utf8");
const featsSrc = fs.readFileSync(path.join(SYSTEM_ROOT, "module", "feats-workflow.mjs"), "utf8");
const helperSrc = apiSrc.slice(apiSrc.indexOf("helpers: Object.freeze")) + featsSrc.slice(featsSrc.indexOf("MODULE_HELPERS = Object.freeze"), featsSrc.indexOf("MODULE_HELPERS = Object.freeze") + 6000);
for (const helper of [...new Set([...src.matchAll(/h\(\)\.([a-zA-Z]+)/g)].map((m) => m[1]))]) {
  ok(`E the system's module helpers offer ${helper}`, new RegExp(`\\n\\s+(\\.\\.\\.)?${helper}(:|,|\\s*\\()`).test(helperSrc) || (helper === "skillActions" && /get skillActions\(\)/.test(helperSrc)));
}
ok("E the core's stance entry takes waiveWait (Form Reversal)", /async function enterFeatStance\(actor, item, \{[^}]*waiveWait = false \}\)/.test(featsSrc) && /if \(!waiveWait && round !== null && lastStance !== null && round <= lastStance\) \{/.test(featsSrc));
ok("E …and Form Reversal waives it, at no AP, without Combat Form", /enterForm\(actor, String\(pick\)\.split\("\|"\), \{ apCost: 0, waiveWait: true, spendCombatForm: false \}\)/.test(src));
const aw = fs.readFileSync(path.join(SYSTEM_ROOT, "module", "combat", "attack-workflow.mjs"), "utf8");
ok("E the system announces a resolved Strike with what the automations read", /Hooks\.callAll\("trgPrimeStrikeResolved", \{/.test(aw) && ["attacker", "target", "weapon", "hits", "critical", "melee", "thrown", "isReaction", "optionLabel", "held", "damageTaken"].every((k) => new RegExp(`trgPrimeStrikeResolved[\\s\\S]{0,600}\\b${k}\\b`).test(aw)));
ok("E …and Unseen Assault's damage (trgPrimeAmbushDealt)", /Hooks\.callAll\("trgPrimeAmbushDealt", \{ actor, target: targetActor, weapon,/.test(aw));
ok("E rollWeaponAttack takes the options the automations pass", ["holdDamage = false", "treatAsFlanked = false", "treatAsFlatFooted = false", "ignoreTargetStance = false", "optionLabel = \"\"", "mapFrozen = false", "mapOverride = null", "extraFlatDamage = 0", "apPaid = false", "skipTargetPrompt = false"].every((p) => aw.includes(p)));
ok("E Flow Strike asks quietly (traitCheck) and records the Flourish only when taken", /const quiet = await h\(\)\.traitCheck\(attacker, action\);\s*if \(quiet\?\.blocked\) return;/.test(src) && /if \(!yes\) return;\s*await h\(\)\.recordTraitUsage\(attacker, action\);/.test(src));
ok("E …at the third Strike's penalty, frozen, against the same target", /mapOverride: penalty, mapFrozen: true,/.test(src) && /flowStrikePenalty\(await h\(\)\.mapPenalty\(attacker, weapon, 2\), gale\)/.test(src));
ok("E Steel Viper's half damage through the core's glancing preset", /h\(\)\.rollWeaponDamage\(attacker, weapon, \{ preset: \{ glancing: true, targetToken: tokenOf\(target\)/.test(src));
ok("E Black Lotus holds the blow, and the card's button lands it", /rollWeaponAttack\(actor, weapon, \{ holdDamage: true, optionLabel: "Black Lotus" \}\)/.test(src) && /const landed = await h\(\)\.landHeldStrike\(actor\);\s*if \(message\.isOwner\) await message\.setFlag/.test(src));
// FOUND IN REVIEW, before the live test.
ok("E …the card is posted where the attacker is played, so its player owns it", /await offerTo\(attacker, "heldBlowCard", \{ record, nextName: next\.name \}\);/.test(src) && /heldBlowCard: \(actor, payload\) => postHeldBlowCard\(actor, payload\),/.test(src));
ok("E …a blow held in a combat that ended never blocks the next", /if \(held && held\.combatId === combat\.id\) await c\.actor\.unsetFlag\(SYSTEM_ID, "heldStrike"\);/.test(src) && /if \(pending\) await actor\.unsetFlag\(SYSTEM_ID, "heldStrike"\);/.test(src));
ok("E Ember Reaver counts a hit before a Flow Strike adds the next", src.indexOf('if (inForm(attacker, "itEmberSecondHit") && hits && !held) await emberHit(attacker);') > 0 && src.indexOf('if (inForm(attacker, "itEmberSecondHit") && hits && !held) await emberHit(attacker);') < src.indexOf("await offerFlowStrike(attacker, target, weapon);"));
ok("E Deflect Arrow's +4 only when Evade went ahead", /const evaded = await DEFENCE_OFFERS\.Evade\.use\(actor, item, attack\);\s*if \(!evaded\) return;/.test(src));
equal("E a creature is dropped by the blow that takes it from above 0 to 0 or below, not by more damage once down", [auto4.droppedBy(0, 5), auto4.droppedBy(-3, 5), auto4.droppedBy(-3, 2), auto4.droppedBy(4, 5)], [true, true, false, false]);
ok("E Dread Wolf needs an enemy dropped; Claim the Next Foe the Oathblade's own blow", /dropped && !allied\(source, victim\) && inForm\(source, "itDreadWolf"\)/.test(src) && /if \(dropped && source === oathblade && ownedNamed\(oathblade, "Claim the Next Foe"\)\)/.test(src));
ok("E Steel Viper moves initiative by the difference from what the combatant already carries", /const delta = int\(wanted\) - current;/.test(src) && /initiative: Number\(combatant\.initiative\) \+ delta, \[`flags\.\$\{MODULE_ID\}\.viperShift`\]: int\(wanted\)/.test(src) && /c\.actor\?\.uuid === actor\?\.uuid/.test(src));
ok("E an effect two clients may delete is deleted only if still there", /const live = ids\.filter\(\(id\) => actor\?\.effects\?\.has\?\.\(id\)\);/.test(src) && /await safeDelete\(actor, Array\.from\(actor\.effects \?\? \[\]\)\.filter\(\(e\) => e\.getFlag\?\.\(MODULE_ID, "itChallengePartner"\) === ch\.id\)/.test(src));
ok("E Oath of Honour is re-armed only when the board says no ally is beside the target", /if \(\(await allyAdjacent\(actor, target\)\) !== false\) return false;/.test(src));
const autoSrc = fs.readFileSync(path.join(ROOT, "module", "automations.mjs"), "utf8");
ok("E …the Land the blow and Shadowy Step buttons are bound", /kind === "landHeldStrike" \|\| kind === "shadowyStrike"/.test(autoSrc) && /flags\.landHeldStrike\?\.used/.test(autoSrc));
ok("E a Challenge's oath effects are tagged with its id and end with it", /itChallengePartner: id/.test(src) && /e\.getFlag\?\.\(MODULE_ID, "itChallengePartner"\) === ch\.id/.test(src));
ok("E a Challenge ends with the target down, and Claim the Next Foe is offered", /if \(ch\.targetUuid === victim\.uuid && downed\(victim\)\) \{/.test(src) && /offerTo\(oathblade, "claimNextFoe"/.test(src));
ok("E Ember Reaver resets at combat end (B4-4)", /export async function onCombatDeletedB4\(combat\) \{[\s\S]{0,900}emberStacks`\]: 0/.test(src));
const partFlags = new Set(auto4.COMBAT_FORM_NAMES.flatMap((n) => F(named(n)).itForm.parts.flatMap((p) => Object.keys(p.flags))));
for (const flag of [...new Set([...src.matchAll(/inForm\([a-zA-Z]+, "([a-zA-Z]+)"\)/g)].map((m) => m[1]))]) {
  ok(`E the automations' form flag ${flag} is one a form declares`, partFlags.has(flag));
}
ok("E the forms that act by code declare it, and the code reads it: Black Lotus, Crashing Tide, Dread Wolf, Echoing Crane, Ember Reaver (2), Gale Cutter, Steel Viper (2)", ["itBlackLotus", "itCrashingTide", "itDreadWolf", "itEchoingCrane", "itEmberSecondHit", "itEmberEscalation", "itGaleCutter", "itSteelViperInitiative", "itSteelViperMiss"].every((k) => partFlags.has(k) && new RegExp(`\\b${k}\\b`).test(src)));
ok("E Ghost Art Mastery's extra use rides a transferred effect of the feat (the system reads effects and abilities, not feats)", /item\.createEmbeddedDocuments\("ActiveEffect", \[\{\s*name: `Ghost Art Mastery: \$\{pick\}`, img: item\.img, transfer: true,[\s\S]{0,300}focusExtraUses: \[\{ value: 1, names: \[pick\], restoresAll: true/.test(src));
const carriersSrc = fs.readFileSync(path.join(SYSTEM_ROOT, "module", "declaration-carriers.mjs"), "utf8");
ok("E …which is so: the carriers are applied effects and active abilities", /return \[\.\.\.effects, \.\.\.abilities\];/.test(carriersSrc) && /i\?\.type === "ability"/.test(carriersSrc));
const systemJson = JSON.parse(fs.readFileSync(path.join(SYSTEM_ROOT, "system.json"), "utf8"));
const [sa, sb] = String(systemJson.version).split(".").map(Number);
ok("E the system at TRG_PRIME_ROOT is 3.668.0 or later", sa > 3 || (sa === 3 && sb >= 668), systemJson.version);
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8"));
// Re-pinned at 0.6.0 (Block 5, on 3.669.0).
equal("E the module is 1.0.1, built for 3.674.1", [manifest.version, manifest.relationships.systems[0].compatibility.minimum], ["1.0.1", "3.674.1"]);
ok("E the script refuses an older system", script.includes('const REQUIRED_SYSTEM = "3.674.1";'));
for (const [name, docs] of [["it-classes", B4.BLOCK4_CLASSES], ["it-abilities", B4.BLOCK4_ABILITIES], ["it-feats", B4.BLOCK4_FEATS]]) {
  const dir = path.join(ROOT, "packs-source", name);
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))) : [];
  ok(`E packs-source/${name} carries every Block 4 ${name.slice(3)}`, docs.every((d) => files.some((f) => f._id === d._id && f.name === d.name)));
}
const allIds = PACKS.flatMap((p) => p.docs.map((d) => d._id));
ok("E every id across the module is unique", new Set(allIds).size === allIds.length);

/* ------------------------------------------------------------------ */

const EXPECTED = 1360;
equal("Z the suite ran every check it is meant to", checks + 1, EXPECTED);
if (failures.length) { console.log(`verify-block4: ${checks} checks — ${failures.length} FAILED\n`); for (const f of failures) console.log(`  ✗ ${f}`); process.exitCode = 1; }
else console.log(`verify-block4: ${checks} checks — all green.`);
