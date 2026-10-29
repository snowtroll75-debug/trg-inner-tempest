#!/usr/bin/env node
/**
 * verify-block3 — Inner Tempest Block 3 (0.4.0): the Disciple and the
 * Mystic, the four Monastic Paths, the five Mystical Disciplines and their
 * abilities, Inner Discipline and its three techniques, the eleven Technique
 * class feats and the eleven Grimoire spells, checked against the book,
 * against the system that reads them, and by driving the pure decisions.
 *
 *   TRG_PRIME_ROOT=../core/trg-prime node tools/verify-block3.mjs
 *
 * Needs TRG Prime 3.667.0 at TRG_PRIME_ROOT (default ../core/trg-prime
 * beside this module's parent).
 *
 *   A  The book (tools/content/book-text-block3.json, cut from the v1.2
 *      docx by tools/content/extract-book-block3.mjs): every paragraph an
 *      item prints is the book's, and every paragraph the book gives the
 *      item is printed; the class tables, wealth, fields, traits, the
 *      discipline tables and the spells' statistics
 *   B  The system reads the declarations: unarmed profile, stat rows,
 *      Deep Focus, conviction, Alter the Thread, the innate allowance,
 *      declared spell effects, conditionals, riders, Steel the Mind
 *   C  Resolution: every grant resolves the way the system matches it
 *   D  The pure decisions: Paths, Technique Save DC, Dragon's Pulse, Flame
 *      Within, Mystical Power, the Path stamp, the Flurry's weapons
 *   E  Registration: classes, traits, the Technique gate, automations and
 *      reaction offers, through a recording api and through the system's own
 *   F  Wiring: the hooks, the helpers the automations call, versions, packs
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

const B3 = await import("./content/block3.mjs");
const { PACKS } = await import("./content/foundation.mjs");
const auto3 = await import("../module/block3-automations.mjs");
const reg = await import("../module/registration.mjs");
const book = JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "content", "book-text-block3.json"), "utf8"));

const up = await import(sys("module", "combat", "unarmed-profile.mjs"));
const sr = await import(sys("module", "stat-rows.mjs"));
const fd = await import(sys("module", "focus-declarations.mjs"));
const ar = await import(sys("module", "combat", "attack-reroll.mjs"));
const de = await import(sys("module", "magic", "declared-effect.mjs"));
const cond = await import(sys("module", "conditionals.mjs"));
const riders = await import(sys("module", "magic", "strike-riders.mjs"));
const sto = await import(sys("module", "combat", "strike-type-options.mjs"));
const sbr = await import(sys("module", "magic", "save-bonus-reactions.mjs"));
const kinds = await import(sys("module", "magic", "effect-kinds.mjs"));
const uses = await import(sys("module", "uses.mjs"));
const grants = await import(sys("module", "grants.mjs"));
const api = await import(sys("module", "module-api.mjs"));
const wealthRules = await import(sys("module", "starting-wealth.mjs"));
const prof = await import(sys("module", "proficiency-rules.mjs"));

const ALL = [...B3.BLOCK3_CLASSES, ...B3.BLOCK3_ABILITIES, ...B3.BLOCK3_FEATS, ...B3.BLOCK3_SPELLS];
const F = (doc) => doc?.flags?.["trg-prime"] ?? {};
const named = (name, list = ALL) => list.find((d) => d.name === name);
const classAbilityOf = (name, cls) => B3.BLOCK3_ABILITIES.find((d) => d.name === name && d.system.sourceClass === cls);
const descOf = (doc) => String(doc.system.description?.value ?? doc.system.description ?? "");
const list = (s) => String(s ?? "").split(",").map((x) => x.trim()).filter(Boolean);

/* ------------------------------------------------------------------ *
 * A. The book
 * ------------------------------------------------------------------ */

/**
 * The comparison form: markup, emphasis, typographic quotes and dashes,
 * punctuation and every space gone, lower case. The book's own slips that
 * pandoc kept ("is1d6", "be-come", "6<sup>th</sup>") compare equal to
 * their corrected reading, which is all this form forgives.
 */
const flat = (s) => String(s ?? "")
  .replace(/<\/?sup>/g, "").replace(/<[^>]+>/g, " ")
  .replace(/[*_\\]/g, "").replace(/[’‘]/g, "'").replace(/[“”]/g, "\"").replace(/[–—]/g, "-")
  .replace(/(\w)-(\w)/g, "$1$2").replace(/[.,;:]/g, "").replace(/\s+/g, "").toLowerCase();
const BOOK = flat(book.text);

/** An item's printed paragraphs, before its *Automated* line; tables apart. */
function printedParagraphs(doc) {
  const html = descOf(doc).replace(/<table>[\s\S]*?<\/table>/g, "");
  const printed = html.split(/<p>\s*<em>(?:Automated|Partly automated|Not automated):/)[0];
  return printed.split(/<\/p>/).map((p) => p.trim()).filter(Boolean);
}
/** A paragraph without its leading run of ALL-CAPS bold labels ("FOCUS TECHNIQUE", "SPECIAL ABILITY"). */
const unlabelled = (p) => p.replace(/^<p>/, "").replace(/^(\s*<strong>[A-Z][A-Z'’ \-]*<\/strong>\s*)+/, "");

const SECTION_OF = {
  "Monastic Path": (doc) => `Monastic Path|${doc.system.sourceClass}`,
  "Mystical Discipline": () => ["Mystical Discipline", "Mystical Disciplines"]
};
for (const doc of ALL) {
  if (doc.type === "class") continue;
  const paras = printedParagraphs(doc);
  ok(`A ${doc.name}${doc.system.sourceClass ? ` (${doc.system.sourceClass})` : ""}: prints the book's text`, paras.length > 0);
  for (const p of paras) {
    const body = flat(unlabelled(p));
    if (!body) continue;
    ok(`A ${doc.name}: "${p.replace(/<[^>]+>/g, "").slice(0, 60)}…" is the book's`, BOOK.includes(body));
  }
  // COMPLETENESS: every paragraph the book gives this item is printed — a
  // truncated paragraph passes the line above and fails here.
  const keys = [SECTION_OF[doc.name]?.(doc) ?? doc.name].flat();
  const section = keys.flatMap((k) => book.sections[k] ?? []);
  ok(`A ${doc.name}: the book has a section for it`, section.length > 0, keys.join(", "));
  const printedFlat = flat(paras.join(" "));
  for (const p of section) {
    // A list item (Inner Discipline's techniques) is printed without its bullet.
    const want = flat(p.replace(/^-\s+/, ""));
    if (!want) continue;
    ok(`A ${doc.name}: prints the book's "${p.replace(/<[^>]+>|\*/g, "").slice(0, 60)}…"`, printedFlat.includes(want));
  }
}

// THE CLASSES: the fields as printed, the table row by row, the wealth.
for (const cls of B3.BLOCK3_CLASSES) {
  const b = book.classes[cls.name];
  const s = cls.system;
  ok(`A ${cls.name}: the book's class block was read`, Boolean(b?.description?.length));
  equal(`A ${cls.name}: class type`, s.classType, b.classType[0]);
  equal(`A ${cls.name}: key ability scores`, s.keyAbilityScores, b.keyAbilityScores[0]);
  equal(`A ${cls.name}: proficiencies`, s.proficiencies, b.proficiencies[0]);
  equal(`A ${cls.name}: class skills`, s.classSkills, b.classSkills[0]);
  equal(`A ${cls.name}: hit points ("${b.hitPoints[0]}")`, s.hitPoints, Number(/^(\d+)/.exec(b.hitPoints[0])[1]));
  equal(`A ${cls.name}: skill points ("${b.skillPoints[0]}")`, s.skillPoints, Number(/^(\d+)/.exec(b.skillPoints[0])[1]));
  equal(`A ${cls.name}: the bonus feats paragraph`, F(cls).bonusFeatsNote, b.bonusFeats[0]);
  equal(`A ${cls.name}: the minimum ability ("Wisdom (min +2)")`, F(cls).minimumAbilities, { wisdom: 2 });
  equal(`A ${cls.name}: wealth (Chapter 6)`, Number(s.wealth), book.wealth[cls.name]);
  equal(`A ${cls.name}: the class table, twenty rows of BAB, BDB, Fort, Ref, Will, Bonus Feats`,
    s.progression.map((r) => [r.bab, r.bdb, r.fortitude, r.reflex, r.will, r.bonusFeats]), book.tables[cls.name]);
  ok(`A ${cls.name}: no spellcasting progression ("You do not gain a normal spellcasting progression")`, s.progression.every((r) => r.casterLevel === 0 && r.pp === 0 && r.bsb === 0) && !s.magicalTradition && !s.casterStyle);
  const printed = flat(descOf(cls));
  for (const p of [...b.description, ...b.magicalTradition, ...(cls.name === "Disciple" ? ["You do not gain a normal spellcasting progression. Your Monastic Path determines the magical tradition and magical ability score of any innate spells or magical techniques you gain from Disciple abilities or feats."] : [])]) {
    ok(`A ${cls.name}: prints the book's "${p.slice(0, 50)}…"`, printed.includes(flat(p)));
  }
  for (const p of printedParagraphs(cls)) ok(`A ${cls.name}: "${p.replace(/<[^>]+>/g, "").slice(0, 50)}…" is the book's`, BOOK.includes(flat(unlabelled(p))));
}

// THE CLASS ABILITIES each class lists, in the book's order and levels.
const BOOK_CLASS_ABILITIES = {
  // Chapter 3: Disciple's Dodge "At 1st level", Incredible Movement "At 4th
  // level"; the rest print no level and arrive at 1st (IT-C4, ruled 20 Oct).
  Disciple: [[1, "Powerful Fists"], [1, "Disciple's Dodge"], [1, "Disciple's Resolve"], [1, "Flurry of Blows"], [1, "Deep Focus"], [1, "Monastic Path"], [4, "Incredible Movement"]],
  Mystic: [[1, "Alter the Thread"], [1, "Mystical Discipline"], [1, "Mystical Power"], [1, "Mystical Resolve"], [1, "Monastic Path"]]
};
for (const cls of B3.BLOCK3_CLASSES) {
  equal(`A ${cls.name}: its class abilities, as listed`, list(cls.system.classAbilities).map((e) => [Number(e.split(":")[0]), e.split(":").slice(1).join(":").trim()]), BOOK_CLASS_ABILITIES[cls.name]);
  for (const [lvl, name] of BOOK_CLASS_ABILITIES[cls.name]) {
    const a = classAbilityOf(name, cls.name);
    ok(`A ${cls.name} → ${name}: a class ability of the ${cls.name}, at level ${lvl}`, Boolean(a) && a.system.level === lvl && F(a).classAbility?.class === cls.name && F(a).classAbility?.level === lvl);
  }
  equal(`A ${cls.name}: Inner Discipline at 1st ("You gain the Inner Discipline feat")`, cls.system.grantedFeats, "1: Inner Discipline");
}

// THE PATHS: the tradition, ability and skill each prints.
for (const [name, p] of Object.entries(B3.PATHS)) {
  const doc = named(name);
  const line = book.sections[name].find((x) => /^Your magical tradition is/.test(x));
  const m = /^Your magical tradition is (\w+), your magical ability score is (\w+), and you gain (\w+) as a class skill\.$/.exec(line ?? "");
  ok(`A ${name}: the book's tradition line was read`, Boolean(m), line);
  if (!m) continue;
  equal(`A ${name}: tradition, ability and class skill as printed`, [p.tradition, p.ability, p.skill], [m[1].toLowerCase(), m[2].toLowerCase(), m[3]]);
  equal(`A ${name}: the item declares them (itPath)`, F(doc).itPath, { tradition: p.tradition, ability: p.ability, skill: p.skill });
  equal(`A ${name}: Chapter 7's ability score agrees`, book.fields[name]["Ability Score"], m[2]);
  const skillChange = (doc.effects ?? []).flatMap((e) => e.changes ?? []).map((c) => c.value);
  ok(`A ${name}: ${p.skill} becomes a class skill (its effect)`, (doc.effects ?? []).length === 1 && JSON.stringify(doc.effects).includes(p.skill), JSON.stringify(skillChange));
  equal(`A ${name}: a Monastic Path ability`, doc.system.category, "Monastic Path");
}
equal("A the Monastic Path choices are the four Paths, for both classes",
  ["Disciple", "Mystic"].map((c) => F(classAbilityOf("Monastic Path", c)).abilityChoices), [Object.keys(B3.PATHS), Object.keys(B3.PATHS)]);
equal("A Mystical Discipline's choices are the five disciplines", F(classAbilityOf("Mystical Discipline", "Mystic")).abilityChoices, B3.DISCIPLINE_NAMES);

// THE DISCIPLINES: the five tables as printed, and the grants they become.
const spellKey = (s) => String(s).replace(/\*/g, "").replace(/\s*\(\d+\)\s*$/, "").replace(/[’‘']/g, "").trim().toLowerCase();
for (const name of B3.DISCIPLINE_NAMES) {
  equal(`A ${name}: the table as printed`, B3.DISCIPLINE_TABLES[name], book.tables[name]);
  const fromTable = book.tables[name].flatMap(([lvl, row]) => row.split(/,\s*/).map((s) => [lvl, spellKey(s)]));
  equal(`A ${name}: its grants are the table's spells at the table's levels`, B3.DISCIPLINE_SPELLS[name].map(([lvl, s]) => [lvl, spellKey(s)]), fromTable);
  const doc = named(name);
  equal(`A ${name}: the item grants them`, doc.system.grantedSpells, B3.DISCIPLINE_SPELLS[name].map(([lvl, s]) => `${lvl}: ${s}`).join(", "));
  const html = descOf(doc);
  ok(`A ${name}: the description prints the table`, book.tables[name].every(([lvl, row]) => html.includes(`<td>${row}</td>`)) && (html.match(/<tr>/g) ?? []).length === book.tables[name].length + 1);
  // "1st: the listed bonus cantrip and base PP 2 spell … At 3rd level and
  // then every two levels thereafter, you gain the next listed spell."
  equal(`A ${name}: a cantrip and a PP 2 spell at 1st, then one at each odd level to 15th`, book.tables[name].map(([lvl, row]) => [lvl, row.split(/,\s*/).length]), [[1, 2], [3, 1], [5, 1], [7, 1], [9, 1], [11, 1], [13, 1], [15, 1]]);
  const specialAbility = B3.BLOCK3_ABILITIES.find((a) => a.name === doc.system.grantedAbilities);
  ok(`A ${name}: grants its special ability (${doc.system.grantedAbilities}), a Mystic ability`, Boolean(specialAbility) && specialAbility.system.sourceClass === "Mystic");
  equal(`A ${name}: innate, with the Path's magic and the +1 allowance (B3-2)`, [F(doc).grantInnate, F(doc).itPathMagic], [true, { allowance: 1 }]);
}

// TRAITS as printed: a feat's or ability's trait line.
const traitWords = (s) => String(s ?? "").toUpperCase().replace("FLOURISHTECHNIQUE", "FLOURISH TECHNIQUE").split(/[\s,]+/).filter(Boolean).sort();
for (const doc of [...B3.BLOCK3_FEATS, ...B3.BLOCK3_ABILITIES]) {
  const printed = book.fields[doc.name]?.traits;
  if (printed === undefined) continue;
  if (doc.name === "Inner Discipline") {
    equal("A Inner Discipline: the Technique trait, not Focus (the feat is never used; its techniques carry Focus)", traitWords(doc.system.traits), ["TECHNIQUE"]);
    continue;
  }
  equal(`A ${doc.name}: traits as printed`, traitWords(doc.system.traits), traitWords(printed));
}
for (const t of B3.INNER_DISCIPLINE_TECHNIQUES) {
  equal(`A ${t}: "a separate ability with the Focus trait", a technique`, [traitWords(named(t).system.traits), named(t).system.category], [["FOCUS", "TECHNIQUE"], "Technique"]);
}
equal("A Inner Discipline grants its three techniques", list(named("Inner Discipline").system.grantedAbilities), B3.INNER_DISCIPLINE_TECHNIQUES);

// PREREQUISITES as printed.
for (const doc of B3.BLOCK3_FEATS) {
  const f = book.fields[doc.name] ?? {};
  const want = [f.Prerequisites, f["Special Prerequisite"] ? `Special: ${f["Special Prerequisite"].replace(/^You/, "you")}` : ""].filter(Boolean).join(". ");
  equal(`A ${doc.name}: prerequisites as printed`, doc.system.prerequisites, want);
  equal(`A ${doc.name}: a class feat`, doc.category ?? doc.system.category ?? "Class", "Class");
}
equal("A the eleven Technique feats are the book's", B3.TECHNIQUE_FEAT_NAMES, B3.BLOCK3_FEATS.filter((f) => f.name !== "Inner Discipline").map((f) => f.name));

// THE SPELLS' STATISTICS.
const CATEGORY_WORDS = { SAVE: "save", UTILITY: "utility", ATTACK: "attack" };
const ALL_TRADITIONS = ["arcane", "divinity", "ethereal", "verdant"];
for (const spell of B3.BLOCK3_SPELLS) {
  const f = book.fields[spell.name];
  const s = spell.system;
  ok(`A ${spell.name}: the book's statistics were read`, Boolean(f?.Tradition && f?.Cast));
  if (!f) continue;
  equal(`A ${spell.name}: base PP`, s.ppCost, f.pp);
  // "Tradition all" is written as the four, which TRG Prime's choosers read.
  equal(`A ${spell.name}: tradition`, list(s.tradition).sort(), f.Tradition === "all" ? ALL_TRADITIONS : list(f.Tradition).sort());
  const words = traitWords(f.traits);
  const category = words.map((w) => CATEGORY_WORDS[w]).find(Boolean) ?? "utility";
  equal(`A ${spell.name}: traits (the category word is the category)`, traitWords(s.traits), words.filter((w) => !CATEGORY_WORDS[w]));
  equal(`A ${spell.name}: category`, s.category, category);
  const cast = /^(\S+)(?:\s+AP)?\s*(?:\(([^)]*)\))?/.exec(f.Cast);
  const castAP = cast[1] === "R" ? "Reaction" : /^\d+$/.test(cast[1]) && /AP/.test(f.Cast) ? Number(cast[1]) : f.Cast.replace(/\s*\(.*\)$/, "");
  equal(`A ${spell.name}: cast ("${f.Cast}")`, s.castAP, castAP);
  const comps = String(/\(([^)]*)\)/.exec(f.Cast)?.[1] ?? "").split(/,\s*/).filter(Boolean);
  equal(`A ${spell.name}: components`, ["somatic", "verbal", "material", "focus"].filter((k) => s.components[k]), ["somatic", "verbal", "material", "focus"].filter((k) => comps.includes(k)));
  equal(`A ${spell.name}: duration`, s.duration, f.Duration ?? "");
  equal(`A ${spell.name}: range`, s.range, f.Range ?? "");
  equal(`A ${spell.name}: targets`, s.targets, f.Targets ?? f.Target ?? "");
  if (f.Area) equal(`A ${spell.name}: area`, s.area, f.Area);
  equal(`A ${spell.name}: saving throw`, s.defence, f["Saving Throw"] ?? "");
  equal(`A ${spell.name}: base damage`, s.baseDamage, f["Base Damage"] ?? "");
  if (/^Sustained/.test(f.Duration ?? "")) equal(`A ${spell.name}: sustained`, [s.sustained, s.sustainType], [true, "sustain"]);
}
equal("A Breath of the Dragon's cone is its text's (no Area line)", named("Breath of the Dragon").system.area, "30-foot cone");
equal("A Reflective Mind's trigger is the book's", flat(descOf(named("Reflective Mind"))).includes(flat(book.fields["Reflective Mind"].Trigger)), true);
equal("A Rise of the Phoenix is cast in 1 hour", named("Rise of the Phoenix").system.castAP, "1 hour");

/* ------------------------------------------------------------------ *
 * B. The system reads the declarations
 * ------------------------------------------------------------------ */

// POWERFUL FISTS through the system's unarmed profile.
const fistsRows = up.declaredUnarmedRows([classAbilityOf("Powerful Fists", "Disciple")]);
const FISTS = { natural: true, category: "unarmed", damageType: "subdual", damage: "1d4", traits: "" };
const prof0 = up.unarmedProfile(FISTS, fistsRows, 0);
equal("B Powerful Fists at BAB 0: the fists roll 1d6 and gain Versatile B, nothing else yet", prof0 && [prof0.damage, prof0.versatile, prof0.flat, prof0.magical, prof0.materials], ["1d6", "B", 0, false, []]);
equal("B …BAB 2: still no flat damage", up.unarmedProfile(FISTS, fistsRows, 2).flat, 0);
const prof3 = up.unarmedProfile(FISTS, fistsRows, 3);
equal("B …BAB 3: +1 total damage, magical", [prof3.flat, prof3.magical, prof3.materials], [1, true, []]);
const prof8 = up.unarmedProfile(FISTS, fistsRows, 8);
equal("B …BAB 8: +2, cold iron and silver", [prof8.flat, prof8.magical, prof8.materials.sort()], [2, true, ["cold iron", "silver"]]);
const prof16 = up.unarmedProfile(FISTS, fistsRows, 16);
equal("B …BAB 16: +5, adamantine too", [prof16.flat, prof16.materials.sort()], [5, ["adamantine", "cold iron", "silver"]]);
const MONASTIC = { natural: false, category: "Simple", damageType: "bludgeoning", damage: "1d6", traits: "Monastic, Finesse" };
const profM = up.unarmedProfile(MONASTIC, fistsRows, 9);
equal("B …a Monastic weapon keeps its own die and trait, and takes the flat damage and what it counts as (Chapter 6)", [profM.damage, profM.versatile, profM.flat, profM.magical, profM.materials.sort()], [null, null, 3, true, ["cold iron", "silver"]]);
equal("B …a claw is not an unarmed attack", up.unarmedProfile({ natural: true, category: "unarmed", damageType: "slashing", damage: "1d6" }, fistsRows, 9), null);
equal("B …nor a longsword", up.unarmedProfile({ natural: false, category: "Martial", damageType: "slashing", damage: "1d8", traits: "" }, fistsRows, 9), null);
equal("B …a gauntlet the system calls unarmed takes the flat damage", up.unarmedProfile({ natural: false, unarmed: true, category: "Simple", damageType: "bludgeoning", damage: "1d4" }, fistsRows, 3)?.flat, 1);
const W = up.withUnarmedProfile(FISTS, prof0);
equal("B …the Strike reads 1d6 with Versatile B", [W.damage, W.traits], ["1d6", "Versatile B"]);
// THE FLURRY'S WEAPONS ARE THE SYSTEM'S UNARMED STRIKES.
for (const [label, s] of [["the fists", FISTS], ["a Monastic weapon", MONASTIC], ["a gauntlet", { unarmed: true }], ["a claw", { natural: true, category: "unarmed", damageType: "slashing" }], ["a longsword", { category: "Martial", damageType: "slashing" }]]) {
  equal(`B Flurry of Blows strikes with ${label} exactly when the system counts it as unarmed`, auto3.flurryWeapon({ type: "weapon", system: s }), up.countsAsUnarmed(s));
}
equal("B …only a weapon", auto3.flurryWeapon({ type: "equipment", system: FISTS }), false);

// DISCIPLE'S DODGE, INCREDIBLE MOVEMENT, SERENE DEFENCE through stat rows.
const dodgeRows = sr.declaredStatRows([classAbilityOf("Disciple's Dodge", "Disciple")]);
const wis = (n) => ({ wisdom: { total: n } });
equal("B Disciple's Dodge: Wisdom as a dodge bonus to Defence", sr.statRowEntries(dodgeRows, { attributes: wis(3), level: 1 }), [{ path: "system.combat.defence", entry: { label: "Disciple's Dodge", value: 3, type: "dodge", source: "statRow" } }]);
equal("B …not in armour", sr.statRowEntries(dodgeRows, { attributes: wis(3), wearingArmour: true }), []);
equal("B …not encumbered", sr.statRowEntries(dodgeRows, { attributes: wis(3), encumbered: true }), []);
equal("B …a negative Wisdom adds nothing", sr.statRowEntries(dodgeRows, { attributes: wis(-1) }), []);
const moveRows = sr.declaredStatRows([classAbilityOf("Incredible Movement", "Disciple")]);
equal("B Incredible Movement: +10 status Speed at 4th, +15 at 10th, +20 at 16th", [3, 4, 9, 10, 15, 16, 20].map((level) => sr.statRowEntries(moveRows, { level })[0]?.entry.value ?? 0), [0, 10, 10, 15, 15, 20, 20]);
equal("B …a status bonus to land Speed", [sr.statRowEntries(moveRows, { level: 4 })[0].path, sr.statRowEntries(moveRows, { level: 4 })[0].entry.type], ["system.combat.movement.land", "status"]);
equal("B …not in armour, but encumbrance does not stop it", [sr.statRowEntries(moveRows, { level: 4, wearingArmour: true }).length, sr.statRowEntries(moveRows, { level: 4, encumbered: true }).length], [0, 1]);
const serene = named("Serene Defence").system.effects.find((e) => e.kind === "declare");
const sereneSpec = de.normaliseDeclaredEffect(serene, { spellName: "Serene Defence" });
ok("B Serene Defence's declaration is one the system accepts", Boolean(sereneSpec));
const sereneEffect = sereneSpec ? de.declaredEffectData(sereneSpec) : null;
equal("B …and the effect it makes adds Wisdom as dodge, armoured or not", sereneEffect ? sr.statRowEntries(sr.declaredStatRows([sereneEffect]), { attributes: wis(4), wearingArmour: true }).map((e) => [e.path, e.entry.value, e.entry.type]) : null, [["system.combat.defence", 4, "dodge"]]);

// REFLECTIVE MIND: advantage on the save against the mental effect.
const reflective = named("Reflective Mind").system.effects.find((e) => e.kind === "declare");
const reflectiveSpec = de.normaliseDeclaredEffect(reflective, { spellName: "Reflective Mind" });
ok("B Reflective Mind's declaration is one the system accepts", Boolean(reflectiveSpec));
const reflectiveEffect = reflectiveSpec ? de.declaredEffectData(reflectiveSpec) : null;
const reflectiveRows = reflectiveEffect ? cond.collectConditionals([], [reflectiveEffect]) : [];
equal("B …one advantage row, applied for you and spent once", reflectiveRows.map((r) => [r.kind, r.auto, r.oneShot]), [["advantage", true, true]]);
equal("B …it reaches a save against a mental effect and nothing else", reflectiveRows.length ? [
  cond.matchesCheck(reflectiveRows[0], { checkType: "save", traits: ["mental"] }),
  cond.matchesCheck(reflectiveRows[0], { checkType: "save", traits: ["fire"] }),
  cond.matchesCheck(reflectiveRows[0], { checkType: "skill", traits: ["mental"] })
] : null, [true, false, false]);

// EVERY SPELL EFFECT KIND IS ONE THE SYSTEM APPLIES.
for (const spell of B3.BLOCK3_SPELLS) {
  for (const e of spell.system.effects) ok(`B ${spell.name}: effect kind "${e.kind}" is handled`, kinds.HANDLED_EFFECT_KINDS.includes(e.kind));
}

// DEEP FOCUS: one more use for every Focus technique.
const deep = classAbilityOf("Deep Focus", "Disciple");
const techniqueAbilities = B3.BLOCK3_ABILITIES.filter((a) => /\bfocus\b/i.test(a.system.traits) && /\btechnique\b/i.test(a.system.traits));
const techniqueFeats = B3.BLOCK3_FEATS.filter((f) => /\bfocus\b/i.test(f.system.traits));
ok("B there are Focus techniques to count", techniqueAbilities.length >= 6 && techniqueFeats.length === 11);
for (const t of [...techniqueAbilities, ...techniqueFeats]) {
  equal(`B ${t.name}: one Focus use by itself, two with Deep Focus, all restored by a Refocus`, [uses.focusDefaultUses(t.system, t.type), fd.focusExtraUses(t, [deep]), fd.refocusRestoresAll(t, [deep])], [1, 1, true]);
}
const focusSpell = { name: "Fire Bolt", type: "spell", system: { traits: "Fire, Focus", innate: true, usesPerDay: "" } };
equal("B …an innate Focus spell is not a technique: one use, Deep Focus or not", [uses.focusDefaultUses(focusSpell.system, "spell"), fd.focusExtraUses(focusSpell, [deep])], [1, 0]);
equal("B …Flame Within has no Focus trait: never counted, never expended (IT-M3)", [uses.focusDefaultUses(named("Flame Within").system, "ability"), fd.focusExtraUses(named("Flame Within"), [deep])], [null, 0]);
equal("B …Inner Discipline itself holds no use", uses.focusDefaultUses(named("Inner Discipline").system, "feat"), null);

// RESOLVE: +1 conviction, by declaration.
equal("B Disciple's Resolve and Mystical Resolve: +1 conviction pool each", [fd.declaredConvictionBonus([classAbilityOf("Disciple's Resolve", "Disciple")]), fd.declaredConvictionBonus([classAbilityOf("Mystical Resolve", "Mystic")])], [1, 1]);

// ALTER THE THREAD through the system's offer.
const alter = ar.attackRerollSource([{ name: "Longsword" }, classAbilityOf("Alter the Thread", "Mystic")]);
equal("B Alter the Thread declares the reroll", alter?.label, "Alter the Thread");
equal("B …offered with conviction to spend; not on a Chaos result, not against your own attack, not without conviction (B3-5)", [
  ar.attackRerollOffer({ declared: true, conviction: { ok: true } }).offer,
  ar.attackRerollOffer({ declared: true, conviction: { ok: true }, chaos: true }).offer,
  ar.attackRerollOffer({ declared: true, conviction: { ok: true }, attackerIsDefender: true }).offer,
  ar.attackRerollOffer({ declared: true, conviction: { ok: false, reason: "spent this round" } }).reason
], [true, false, false, "spent this round"]);

// THE INNATE ALLOWANCE (B3-2): each discipline spell castable at the level that grants it.
for (const name of B3.DISCIPLINE_NAMES) {
  for (const [lvl, row] of book.tables[name]) {
    for (const s of row.split(/,\s*/)) {
      const pp = Number(/\((\d+)\)\s*$/.exec(s)[1]);
      const stamped = { flags: { "trg-prime": { innatePPAllowance: auto3.pathStamp({ name: "Primal", tradition: "verdant", ability: "constitution" }, 1)["flags.trg-prime.innatePPAllowance"] } } };
      equal(`B ${name}: ${s.replace(/\*/g, "")} castable at level ${lvl} with the Path's +1 (B3-2)`, fd.innateLevelRefusal({ actorType: "character", basePP: pp, castLevel: lvl, allowance: fd.innatePPAllowanceOf(stamped) }), null);
      if (pp > lvl) ok(`B ${name}: …and not without it`, fd.innateLevelRefusal({ actorType: "character", basePP: pp, castLevel: lvl }) !== null);
    }
  }
}
equal("B Mystical Power's 1st-level PP 2 picks are castable at 1st with the stamp's +1, and nothing above", [
  fd.innateLevelRefusal({ actorType: "character", basePP: 2, castLevel: 1, allowance: 1 }),
  fd.innateLevelRefusal({ actorType: "character", basePP: 4, castLevel: 1, allowance: 1 }) !== null
], [null, true]);

// THE OTHER DECLARATIONS.
const steel = sbr.normaliseSaveBonusReaction(F(named("Inner Discipline")).saveBonusReaction, "Inner Discipline");
equal("B Steel the Mind (held over from Block 2) rides on Inner Discipline: Mental Focus before a Will save against an Emotion or Mental effect", steel ? [steel.skill, steel.saves, steel.traits] : null, ["mentalFocus", ["will"], ["emotion", "mental"]]);
const flameRows = [1, 2, 3].map((n) => cond.normaliseConditional(auto3.flameWithinRow(n), { name: "Flame Within" }));
equal("B Flame Within's row: +N circumstance on attack checks, applied for you", flameRows.map((r) => r && [r.kind, r.value, r.type, r.auto]), [["modifier", 1, "circumstance", true], ["modifier", 2, "circumstance", true], ["modifier", 3, "circumstance", true]]);
equal("B …it reaches attack checks only", flameRows[0] ? [cond.matchesCheck(flameRows[0], { checkType: "attack" }), cond.matchesCheck(flameRows[0], { checkType: "save" })] : null, [true, false]);
for (const type of ["force", "aligned", "negative", "positive"]) {
  const f = auto3.innerStrikeFlags(type);
  const rider = riders.normaliseStrikeRider(f.strikeRider);
  equal(`B Inner Strike (${type}): a 1d6 ${type} rider on every Strike this turn`, rider && [rider.dice, rider.damageType, rider.scope, rider.once], ["1d6", type, "any", false]);
  const row = cond.normaliseConditional(f.conditionals[0], { name: "Inner Strike" });
  // APPLIED, NOT TICKED (0.4.2; found live on 0.4.1): scoped by the system's
  // `attackForms` axis (3.667.3) to an unarmed melee attack.
  equal(`B Inner Strike (${type}): +1 status to an unarmed melee attack roll, applied for you`, row && [row.value, row.type, row.auto,
    cond.matchesCheck(row, { checkType: "attack", attackMode: "melee", attackForm: "unarmed" }),
    cond.matchesCheck(row, { checkType: "attack", attackMode: "melee", attackForm: "weapon" }),
    cond.matchesCheck(row, { checkType: "attack", attackMode: "melee" }),
    cond.matchesCheck(row, { checkType: "attack", attackMode: "ranged", attackForm: "unarmed" })], [1, "status", true, true, false, false, false]);
}
// GREATER MASTERY (Chapter 5): the three Block 3 feats that print one.
equal("B the Greater Mastery blocks are Bounding Step's, Inner Sight's and Inner Strike's", Object.entries(book.sections).filter(([, paras]) => paras.some((x) => /GREATER MASTERY/.test(x))).map(([k]) => k).sort(), ["Bounding Step", "Inner Sight", "Inner Strike"]);
equal("B Inner Strike: 1d6, +1d6 at 8th, 12th and 16th, to 4d6", [1, 7, 8, 11, 12, 15, 16, 20].map(auto3.innerStrikeDice), ["1d6", "1d6", "2d6", "2d6", "3d6", "3d6", "4d6", "4d6"]);
equal("B …and the rider the system reads carries it", riders.normaliseStrikeRider(auto3.innerStrikeFlags("force", 16).strikeRider)?.dice, "4d6");
equal("B Inner Sight: Nightvision for 1 minute; 10 minutes from 8th; Darkvision from 12th", [1, 7, 8, 11, 12].map((l) => auto3.innerSightFor(l)), [
  { seconds: 60, sense: "Nightvision" }, { seconds: 60, sense: "Nightvision" }, { seconds: 600, sense: "Nightvision" }, { seconds: 600, sense: "Nightvision" }, { seconds: 600, sense: "Darkvision" }
]);
const coreAbilityNames = new Set((await packIndex("abilities") ?? []).map((e) => e.name));
ok("B …both senses are abilities the system ships", ["Nightvision", "Darkvision"].every((n) => coreAbilityNames.has(n)));
const shadow = auto3.shadowyStanceFlags();
equal("B Shadowy Stance: essence offered on any Strike", sto.declaredStrikeTypeOptions([{ flags: { "trg-prime": shadow } }]).map((o) => [o.type, o.scope]), [["essence", ["any"]]]);
const escapeRow = cond.normaliseConditional(shadow.conditionals[0], { name: "Shadowy Stance" });
equal("B …+2 circumstance on Escape, applied for you", escapeRow && [escapeRow.value, escapeRow.type, escapeRow.auto, cond.matchesCheck(escapeRow, { checkType: "skill", actionKey: "escape" }), cond.matchesCheck(escapeRow, { checkType: "skill", actionKey: "climb" })], [2, "circumstance", true, true, false]);

/* ------------------------------------------------------------------ *
 * C. Resolution
 * ------------------------------------------------------------------ */

async function packIndex(pack) {
  const { ClassicLevel } = await import("classic-level");
  const dir = path.join(SYSTEM_ROOT, "packs", pack);
  if (!fs.existsSync(dir)) return null;
  const db = new ClassicLevel(dir, { valueEncoding: "json" });
  const out = [];
  try { for await (const [k, v] of db.iterator()) if (k.startsWith("!items!") && !k.slice(7).includes(".")) out.push({ name: v.name, system: { sourceClass: v.system?.sourceClass ?? "" }, pack: `trg-prime.${pack}` }); }
  finally { await db.close(); }
  return out;
}
const coreAbilities = await packIndex("abilities"), coreFeats = await packIndex("feats"), coreSpells = await packIndex("spells");
ok("C the system's packs were read", Boolean(coreAbilities?.length && coreFeats?.length && coreSpells?.length));
const moduleIndex = (docs) => docs.map((d) => ({ name: d.name, system: { sourceClass: d.system.sourceClass ?? "" }, pack: "trg-inner-tempest" }));
const packDocs = (name) => PACKS.find((p) => p.name === name).docs;
const abilityIndex = [...moduleIndex(packDocs("it-abilities")), ...(coreAbilities ?? [])];
const featIndex = [...moduleIndex(packDocs("it-feats")), ...(coreFeats ?? [])];
const spellIndex = [...moduleIndex(packDocs("it-spells")), ...(coreSpells ?? [])];
for (const cls of B3.BLOCK3_CLASSES) {
  const names = list(cls.system.classAbilities).map((e) => e.split(":").slice(1).join(":").trim());
  const { resolved, unresolved } = grants.matchGrants(names, abilityIndex, { sourceClass: cls.name, preferPackage: "trg-inner-tempest" });
  equal(`C ${cls.name}: every class ability resolves`, unresolved, []);
  ok(`C ${cls.name}: …each to the ${cls.name}'s own (Monastic Path is printed by both classes)`, resolved.every((r) => r.entry.system.sourceClass === cls.name), resolved.map((r) => `${r.requested}:${r.entry.system.sourceClass}`).join(", "));
  equal(`C ${cls.name}: Inner Discipline resolves`, grants.matchGrants(["Inner Discipline"], featIndex, { sourceClass: cls.name }).unresolved, []);
}
for (const name of B3.DISCIPLINE_NAMES) {
  const doc = named(name);
  const spells = list(doc.system.grantedSpells).map((e) => e.split(":").slice(1).join(":").trim());
  equal(`C ${name}: every granted spell resolves, to one spell`, grants.matchGrants(spells, spellIndex, { preferPackage: "trg-inner-tempest" }).unresolved, []);
  equal(`C ${name}: its special ability resolves`, grants.matchGrants([doc.system.grantedAbilities], abilityIndex, { sourceClass: "Mystic" }).unresolved, []);
}
equal("C Inner Discipline's three techniques resolve", grants.matchGrants(list(named("Inner Discipline").system.grantedAbilities), abilityIndex).unresolved, []);
const clash = (docs, index) => docs.filter((d) => index.some((e) => e.pack.startsWith("trg-prime.") && e.name.replace(/[’‘']/g, "").toLowerCase() === d.name.replace(/[’‘']/g, "").toLowerCase())).map((d) => d.name);
equal("C no Block 3 ability shares a name with a core ability", clash(B3.BLOCK3_ABILITIES, abilityIndex), []);
equal("C no Block 3 feat shares a name with a core feat", clash(B3.BLOCK3_FEATS, featIndex), []);
equal("C the eleven spells are new (none is a core spell)", clash(B3.BLOCK3_SPELLS, spellIndex), []);
const newInTable = Object.values(book.tables).filter((r) => typeof r[0]?.[1] === "string").flatMap((rows) => rows.flatMap(([, row]) => row.split(/,\s*/))).filter((s) => s.includes("*")).map(spellKey);
equal("C the spells the tables mark new (*) are the eleven this block ships", [...new Set(newInTable)].sort(), B3.BLOCK3_SPELLS.map((s) => spellKey(s.name)).sort());

/* ------------------------------------------------------------------ *
 * D. The pure decisions
 * ------------------------------------------------------------------ */

const primal = named("Primal");
equal("D the Path is read off the Path ability", auto3.pathOf([{ name: "Longsword" }, primal]), { name: "Primal", tradition: "verdant", ability: "constitution", skill: "Nature" });
equal("D …none without one", auto3.pathOf([{ name: "Longsword" }]), null);
equal("D a technique uses the Path's ability; without a Path, the selected magical ability; otherwise Wisdom (IT-M6)", [auto3.techniqueAbility([primal], "charisma"), auto3.techniqueAbility([], "charisma"), auto3.techniqueAbility([], ""), auto3.techniqueAbility([], "luck")], ["constitution", "charisma", "wisdom", "wisdom"]);
equal("D Technique Save DC = 10 + the Path's ability + level", [auto3.techniqueSaveDC(3, 5), auto3.techniqueSaveDC(-1, 1), auto3.techniqueSaveDC(undefined, 0)], [18, 10, 10]);
equal("D Dragon's Pulse: Wisdom (min 1), +1 at 6th, 12th, 18th", [[-1, 1], [0, 5], [3, 5], [3, 6], [3, 11], [3, 12], [4, 18], [4, 20]].map(([w, l]) => auto3.dragonsPulseDamage(w, l)), [1, 1, 3, 4, 4, 5, 7, 7]);
equal("D Flame Within rises by 1 to +3", [0, 1, 2, 3, 7].map(auto3.flameWithinNext), [1, 2, 3, 3, 3]);
equal("D …and resets only after a turn with no damage taken or dealt (B3-3)", [{}, { took: 1 }, { dealt: 2 }, { took: 0, dealt: 0 }].map(auto3.flameWithinResets), [true, false, false, true]);
equal("D Mystical Power at 1st: two cantrips, two PP 2 spells", auto3.mysticalPowerOwed(1, []), { cantrip: 2, pp2: 2, eligible: 0 });
equal("D …at 4th with all of 1st chosen: three eligible spells", auto3.mysticalPowerOwed(4, [{ slot: "cantrip" }, { slot: "cantrip" }, { slot: "pp2" }, { slot: "pp2" }]), { cantrip: 0, pp2: 0, eligible: 3 });
equal("D …never negative", auto3.mysticalPowerOwed(2, [{ slot: "eligible" }, { slot: "eligible" }]), { cantrip: 2, pp2: 2, eligible: 0 });
const daze = { tradition: "arcane, divinity, ethereal", ppCost: 0, traits: "Cantrip, Enchantment, Mental" };
const guidance = { tradition: "divinity, ethereal, verdant", ppCost: 0, traits: "Insight" };
const mageArmour = { tradition: "arcane, ethereal", ppCost: 2, traits: "Warding" };
const fireball = { tradition: "arcane, verdant", ppCost: 6, traits: "Fire, Invocation" };
equal("D Mystical Power's cantrips: PP 0 AND the Cantrip trait, of the Path's tradition (Guidance is no cantrip)", [
  auto3.mysticalPowerFits(daze, "cantrip", { tradition: "arcane" }),
  auto3.mysticalPowerFits(guidance, "cantrip", { tradition: "divinity" }),
  auto3.mysticalPowerFits(daze, "cantrip", { tradition: "verdant" })
], [true, false, false]);
equal("D …its PP 2 spells: base PP 2 of the Path's tradition, no cantrip", [
  auto3.mysticalPowerFits(mageArmour, "pp2", { tradition: "ethereal" }),
  auto3.mysticalPowerFits(mageArmour, "pp2", { tradition: "verdant" }),
  auto3.mysticalPowerFits(daze, "pp2", { tradition: "arcane" })
], [true, false, false]);
equal("D …an eligible spell: the Path's tradition, base PP no greater than the level", [
  auto3.mysticalPowerFits(fireball, "eligible", { tradition: "verdant", level: 6 }),
  auto3.mysticalPowerFits(fireball, "eligible", { tradition: "verdant", level: 5 }),
  auto3.mysticalPowerFits(fireball, "eligible", { tradition: "divinity", level: 9 })
], [true, false, false]);
equal("D the Path stamp: tradition, ability, the mark, and the allowance only when given", [auto3.pathStamp({ name: "Devoted", tradition: "divinity", ability: "wisdom" }, 1), auto3.pathStamp({ name: "Devoted", tradition: "divinity", ability: "wisdom" }, 0), auto3.pathStamp(null, 1)], [
  { "system.tradition": "divinity", "flags.trg-prime.castingAbilityOverride": "wisdom", "flags.trg-inner-tempest.pathStamped": "Devoted", "flags.trg-prime.innatePPAllowance": 1 },
  { "system.tradition": "divinity", "flags.trg-prime.castingAbilityOverride": "wisdom", "flags.trg-inner-tempest.pathStamped": "Devoted" },
  null
]);
// The stamp's ability is one the system's innate casting reads.
equal("D …which the system's innate casting reads", fd.innateAbilityKey({ flags: { "trg-prime": { castingAbilityOverride: "constitution" } } }, "intelligence", { constitution: { total: 2 }, intelligence: { total: 4 } }), "constitution");

/* ------------------------------------------------------------------ *
 * E. Registration
 * ------------------------------------------------------------------ */

const calls = [];
const fake = new Proxy({}, { get: (_, method) => (...args) => { calls.push([method, ...args]); return true; } });
reg.registerContent(fake, "trg-inner-tempest");
const called = (m) => calls.filter((c) => c[0] === m);
// BLOCK 3'S OWN (re-anchored at 0.5.0, when Block 4 added three classes and two reactions).
equal("E the classes registered: Disciple wealth -2, Mystic -1 (Chapter 6)", called("registerClass").filter((c) => ["Disciple", "Mystic"].includes(c[1])).map((c) => [c[1], c[2].wealth]), [["Disciple", book.wealth.Disciple], ["Mystic", book.wealth.Mystic]]);
// Re-anchored at 0.5.1: Chapter 6's weapons bring Backswing, Brace and Twin.
equal("E the traits registered: Technique (Chapter 7), Monastic (Chapter 6), and from 0.5.1 Chapter 6's Backswing, Brace and Twin", called("registerTraits").map((c) => c[1]), [["Technique", "Monastic", "Backswing", "Brace", "Twin"]]);
equal("E Inner Discipline opens the Technique trait", called("registerFeatGate").map((c) => [c[1], c[2]]), [["Technique", ["Inner Discipline"]]]);
const automationNames = called("registerFeatAutomation").map((c) => c[1]);
const shipped = new Set(PACKS.flatMap((p) => p.docs.map((d) => d.name.toLowerCase())));
for (const [name, entry] of Object.entries(auto3.BLOCK3_AUTOMATIONS)) {
  ok(`E automation "${name}" names an item this module ships, and has a hint and a Use`, shipped.has(name) && typeof entry.use === "function" && Boolean(entry.hint));
  ok(`E automation "${name}" is registered`, automationNames.includes(name));
}
for (const doc of ALL.filter((d) => F(d).itAutomation)) ok(`E ${doc.name}: its Use is registered`, Boolean(auto3.BLOCK3_AUTOMATIONS[doc.name.toLowerCase()]));
for (const doc of ALL.filter((d) => /\bfocus\b/i.test(d.system.traits ?? "") && d.type !== "spell")) {
  ok(`E ${doc.name}: a Focus ${doc.type} has a Use`, Boolean(auto3.BLOCK3_AUTOMATIONS[doc.name.toLowerCase()]));
}
const offers = called("registerDefenceOffer").map((c) => c[1]);
equal("E the reactions offered when an attack targets you: Block 2's two and Guarded Centre and Echo Form", offers.slice(0, 4), ["Evade", "Impact Absorption", "Guarded Centre", "Echo Form (Thousand Reflections)"]);
for (const [name, spec] of Object.entries(auto3.BLOCK3_DEFENCE_OFFERS)) {
  ok(`E ${name}: offered against any attack, with find, requires and use`, spec.against === "attack" && ["find", "requires", "use"].every((k) => typeof spec[k] === "function") && shipped.has(name.toLowerCase()));
}
// THROUGH THE SYSTEM'S OWN API: what the registrations do there.
reg.registerContent({ ...Object.fromEntries(Object.keys(api).filter((k) => typeof api[k] === "function").map((k) => [k, api[k]])), registerFeatAutomation() {}, registerPassiveAutomation() {}, registerDefenceOffer() {}, registerSkillActions() {} }, "trg-inner-tempest");
ok("E the system knows both classes", api.registeredClassNames().includes("disciple") && api.registeredClassNames().includes("mystic"));
equal("E …and their wealth, through its own wealth rule", B3.BLOCK3_CLASSES.map((c) => wealthRules.classWealth({ type: "class", name: c.name, system: { ...c.system, wealth: "" } }).value), [-2, -1]);
equal("E …and the printed wealth on the class item agrees", B3.BLOCK3_CLASSES.map((c) => wealthRules.classWealth({ type: "class", name: c.name, system: c.system, flags: {} }).value), [-2, -1]);
const discipleProf = prof.classProficiencyEntry("Disciple")?.entry;
const mysticProf = prof.classProficiencyEntry("Mystic")?.entry;
equal("E Disciple proficiency: simple weapons and Monastic weapons, no armour", discipleProf && [discipleProf.weaponCategories, discipleProf.weaponRules.map((r) => [r.kind, r.value]), discipleProf.armourCategories], [["Simple"], [["trait", "Monastic"]], []]);
equal("E Mystic proficiency: simple weapons, Monastic weapons, light armour", mysticProf && [mysticProf.weaponCategories, mysticProf.weaponRules.map((r) => [r.kind, r.value]), mysticProf.armourCategories], [["Simple"], [["trait", "Monastic"]], ["Light"]]);
ok("E the system knows the Technique and Monastic traits", ["technique", "monastic"].every((t) => api.registeredTraits().includes(t)));
equal("E a Technique feat is gated behind Inner Discipline", api.featGateBlock("Focus, Technique", [], "Inner Strike")?.needs, ["inner discipline"]);
equal("E …and open to whoever holds it", api.featGateBlock("Focus, Technique", ["Inner Discipline"], "Inner Strike"), null);
equal("E Inner Discipline is not kept behind its own gate", api.featGateBlock(named("Inner Discipline").system.traits, [], "Inner Discipline"), null);

/* ------------------------------------------------------------------ *
 * F. Wiring, versions, packs
 * ------------------------------------------------------------------ */

const script = fs.readFileSync(path.join(ROOT, "scripts", "inner-tempest.mjs"), "utf8");
for (const [hook, fn] of [["trgPrimeDamageApplied", "onDamageApplied"], ["trgPrimeTurnEnded", "onTurnEndedFlame"], ["preCreateItem", "onPreCreateSpell"], ["createItem", "onPathCreated"]]) {
  ok(`F ${fn} listens on ${hook}`, new RegExp(`Hooks\\.on\\("${hook}",[^\\n]*${fn}\\(`).test(script));
}
ok("F the GM relay for Flame Within is registered at ready", /Hooks\.once\("ready",[\s\S]*registerBlock3Socket\(\)/.test(script));
const block3Src = fs.readFileSync(path.join(ROOT, "module", "block3-automations.mjs"), "utf8");
const coreHelpersSrc = fs.readFileSync(path.join(SYSTEM_ROOT, "module", "module-api-workflow.mjs"), "utf8") + fs.readFileSync(path.join(SYSTEM_ROOT, "module", "feats-workflow.mjs"), "utf8");
for (const helper of [...new Set([...block3Src.matchAll(/h\(\)\.([a-zA-Z]+)/g)].map((m) => m[1]))]) {
  ok(`F the system's module helpers offer ${helper}`, new RegExp(`(^|[\\s{,])${helper}(:|,|\\s*$|\\s*\\()`, "m").test(coreHelpersSrc.slice(coreHelpersSrc.indexOf("MODULE_HELPERS = Object.freeze"))) || new RegExp(`\\n\\s+${helper}(:|,)`).test(coreHelpersSrc.slice(coreHelpersSrc.indexOf("helpers: Object.freeze"))));
}
// FOUND IN THE LIVE TEST OF 0.4.0 (fixed in 0.4.1).
ok("F Inner Strike's card offers the four types as buttons, free to press", /data-it-action="innerStrikeType" data-type="\$\{key\}"/.test(block3Src) && /const types = innerStrikeTypes\(Array\.from\(actor\.items \?\? \[\]\)\);/.test(block3Src) && /types\.map\(\(\[key, label\]\) =>/.test(block3Src) && /flags: \{ \[MODULE_ID\]: \{ innerStrike: \{ actorUuid: actor\.uuid \} \} \}/.test(block3Src));
ok("F …and a press re-types the running rider, without AP or a use", /export async function pressInnerStrikeType\(message, type\) \{/.test(block3Src) && /\[`flags\.\$\{SYSTEM_ID\}\.strikeRider\.damageType`\]: type/.test(block3Src) && !/pressInnerStrikeType[\s\S]{0,1200}(spendUse|spendAP)\(/.test(block3Src.slice(block3Src.indexOf("export async function pressInnerStrikeType"), block3Src.indexOf("const shadowyStance"))));
const autoSrc3 = fs.readFileSync(path.join(ROOT, "module", "automations.mjs"), "utf8");
ok("F …the card's buttons are bound, and stay live", /else if \(kind === "innerStrikeType"\) \{\s*const \{ pressInnerStrikeType \} = await import\("\.\/block3-automations\.mjs"\);\s*await pressInnerStrikeType\(message, button\.dataset\.type\);\s*button\.disabled = false;/.test(autoSrc3));
ok("F Burst Step's card reads the Speed it gave, not ten more", block3Src.includes("(now ${landSpeed(actor)} ft)") && !block3Src.includes("landSpeed(actor) + 10"));
// FOUND IN THE LIVE TEST OF 0.4.1 (fixed in 0.4.2).
ok("F Inner Strike's card says the +1 is applied on the roll, not ticked", block3Src.includes("to unarmed attack rolls (applied on the roll) and") && !/ticked on the roll|tick if this is one/.test(block3Src.slice(block3Src.indexOf("export function innerStrikeFlags"), block3Src.indexOf("const shadowyStance"))));
ok("F Shadowy Stance's card says it lasts 1 minute", /extraLines: \[h\(\)\.line\("<em>Shadowy Stance lasts 1 minute, then ends by itself\.<\/em>"\)\],/.test(block3Src));
const dying = fs.readFileSync(path.join(SYSTEM_ROOT, "module", "combat", "dying-workflow.mjs"), "utf8");
ok("F the system announces applied damage (trgPrimeDamageApplied) with the actor, amount, source and context", /Hooks\.callAll\("trgPrimeDamageApplied"/.test(dying) && ["actor", "amount", "sourceUuid", "context"].every((k) => new RegExp(`trgPrimeDamageApplied[\\s\\S]{0,400}\\b${k}\\b`).test(dying)));
const attackWf = fs.readFileSync(path.join(SYSTEM_ROOT, "module", "combat", "attack-workflow.mjs"), "utf8");
ok("F …and a Strike's damage says it is a Strike, melee or not (Dragon's Pulse)", /context:\s*\{\s*kind:\s*"strike",\s*melee:/.test(attackWf));
const systemJson = JSON.parse(fs.readFileSync(path.join(SYSTEM_ROOT, "system.json"), "utf8"));
const [sa, sb] = String(systemJson.version).split(".").map(Number);
const sc = Number(String(systemJson.version).split(".")[2]);
// THE PIN MOVES WITH EACH BLOCK (re-anchored at 0.5.0, Block 4 on 3.668.0; at 0.5.1 on 3.668.1; at 0.6.0, Block 5 on 3.669.0).
ok("F the system at TRG_PRIME_ROOT is 3.669.0 or later", sa > 3 || (sa === 3 && sb >= 669), systemJson.version);
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8"));
equal("F the module is 1.0.4, built for 3.674.2", [manifest.version, manifest.relationships.systems[0].compatibility.minimum], ["1.0.4", "3.674.2"]);
ok("F the script refuses an older system", script.includes('const REQUIRED_SYSTEM = "3.674.2";'));
for (const [name, ext] of [["it-classes", "classes"], ["it-spells", "spells"]]) {
  const entry = manifest.packs.find((p) => p.name === name);
  ok(`F module.json declares ${name} extending ${ext}`, entry?.flags?.["trg-prime"]?.extends === ext && entry?.path === `packs/${name}` && entry?.type === "Item");
}
{
  const dir = path.join(ROOT, "packs-source", "it-spells");
  // Re-anchored at 0.6.0: Block 5 adds Water Bolt (B5-1) beside them.
  // 0.9.0: and Block 8's thirteen (the Grimoire's rest).
  ok(`F packs-source/it-spells holds the ${B3.BLOCK3_SPELLS.length} built, Block 5's Water Bolt and Block 8's thirteen`, fs.existsSync(dir) && fs.readdirSync(dir).length === B3.BLOCK3_SPELLS.length + 1 + 13);
}
// Block 4 (0.5.0) adds its classes to it-classes beside Block 3's.
for (const [name, docs] of [["it-classes", B3.BLOCK3_CLASSES], ["it-abilities", B3.BLOCK3_ABILITIES], ["it-feats", B3.BLOCK3_FEATS]]) {
  const dir = path.join(ROOT, "packs-source", name);
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))) : [];
  ok(`F packs-source/${name} carries every Block 3 ${name.slice(3)}`, docs.every((d) => files.some((f) => f._id === d._id && f.name === d.name)));
}
ok("F every Block 3 id is unique", new Set(ALL.map((d) => d._id)).size === ALL.length);

/* ------------------------------------------------------------------ */

// A check that silently stopped running (a loop over an empty list, a
// section the book extract lost) shows here.
const EXPECTED = 1040;
equal("Z the suite ran every check it is meant to", checks + 1, EXPECTED);
if (failures.length) { console.log(`verify-block3: ${checks} checks — ${failures.length} FAILED\n`); for (const f of failures) console.log(`  ✗ ${f}`); process.exitCode = 1; }
else console.log(`verify-block3: ${checks} checks — all green.`);
