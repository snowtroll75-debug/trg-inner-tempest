/**
 * Inner Tempest — Block 7 (0.8.0): the archetypes of Chapter 5, the
 * abilities they print, and the core archetypes the book opens to the five
 * classes (FA-22).
 *
 * As ruled on 25 October 2026 (B7-1 to B7-8, docs/INNER_TEMPEST_RULINGS_2026-10-25.md;
 * docs/INNER_TEMPEST_BLOCK7_AUDIT.md), on TRG Prime 3.671.0. Dragon Tamer is
 * built with the Dragon Companions in Block 10 (B7-1); the other twenty are
 * here.
 *
 * THE PRINTED TEXT IS THE BOOK'S, read from tools/content/book-text-block7.json
 * (cut from the docx by tools/content/extract-book-block7.mjs), never retyped.
 * Each item's description is that text followed by what TRG Prime does with
 * it. The progression line is the book's own, which TRG Prime 3.671.0 reads
 * as printed (C1).
 *
 * FLAGS under the system's scope (`flags.trg-prime`): `itAutomation` (which
 * Use acts), `classFeatAccess` (3.670.0; B7-3), `classSkills` (3.671.0 C4),
 * `unarmedDamage` (Brawler), `unarmedAbilityWeapons` (3.671.0 C6; Zen
 * Archer), `conditionals`, `itPathMagic` and `grantInnate` (spells stamped
 * with the Monastic Path, Block 3), `itForm` (Twin Dragon), `itFormExtra`
 * and `itArtExtra` (a form or art an archetype gave, not one of the class's
 * table).
 */
import fs from "node:fs";
import { feat, ability, conditional, classSkillEffect, resistanceEffect, declaredEffect } from "./builders.mjs";
import { md } from "./markdown.mjs";

const BOOK = JSON.parse(fs.readFileSync(new URL("./book-text-block7.json", import.meta.url), "utf8"));

/** The book's text for an archetype as HTML: its class-trait line in bold, then each paragraph as printed. */
function printed(key) {
  const s = BOOK.archetypes[key];
  if (!s) throw new Error(`Block 7: the book has no archetype "${key}"`);
  return [...(s.traits ? [md(`**${s.traits}**`)] : []), ...s.lines.map((l) => md(clean(l)))].join("\n");
}
/** The book's text for one of the abilities an archetype prints. */
function printedAbility(key) {
  const s = BOOK.abilities[key];
  if (!s) throw new Error(`Block 7: the book has no ability "${key}"`);
  return [...(s.traits ? [md(`**${s.traits}**`)] : []), ...s.lines.map((l) => md(clean(l)))].join("\n");
}
/** The docx's ordinals come through as <sup>: "5<sup>th</sup>" is printed "5th". */
const clean = (t) => String(t).replace(/<\/?sup>/g, "");

const HOW = { auto: "Automated", partly: "Partly automated", manual: "Not automated" };
const ARCH = "Archetype";

/** The Zen Archer's bows, by the system's names (the Bow group also holds the crossbows). */
export const ZEN_ARCHER_BOWS = Object.freeze(["Longbow", "Short Bow", "Composite Longbow", "Composite Shortbow"]);

/**
 * An archetype from the book. `traits` is the class-trait line written out
 * ("MARTIAL OATHBLADE" is "Martial, Oathblade"); `prerequisites` is what the
 * core's parser reads, checked against the book's line (`printedAs` where
 * they differ); the progression line is the book's, verbatim.
 */
function A(name, { traits = "", prerequisites, printedAs, kind = "auto", how, flags = {}, effects = [], grantedFeats = "", grantedAbilities = "", grantedSpells = "" }) {
  const key = name.toUpperCase();
  const book = BOOK.archetypes[key];
  if (!book) throw new Error(`Block 7: the book has no archetype "${key}"`);
  if (book.prerequisites !== (printedAs ?? prerequisites)) throw new Error(`Block 7: ${name}'s prerequisites are "${book.prerequisites}" in the book`);
  const wantTraits = book.traits.split(" ").filter(Boolean).map((t) => t.charAt(0) + t.slice(1).toLowerCase()).join(", ");
  if (wantTraits !== traits) throw new Error(`Block 7: ${name}'s traits are "${wantTraits}" in the book, not "${traits}"`);
  const description = `${printed(key)}\n${md(`*${HOW[kind]}:* ${how}`)}`;
  const item = feat({ name, category: ARCH, traits, prerequisites, description, flags, effects, grantedFeats, grantedAbilities, grantedSpells });
  item.system.progressionRequirements = book.progression;
  return item;
}

/** One of the abilities an archetype prints, as its own item (granted with the archetype). */
function B(name, { traits = "", kind = "auto", how, flags = {}, effects = [], usesPerDay = "", category = "Class" }) {
  const key = name.toUpperCase();
  const book = BOOK.abilities[key];
  if (!book) throw new Error(`Block 7: the book has no ability "${key}"`);
  const want = book.traits.split(" ").filter(Boolean).map((t) => t.charAt(0) + t.slice(1).toLowerCase()).join(", ");
  if (want !== traits) throw new Error(`Block 7: ${name}'s traits are "${want}" in the book, not "${traits}"`);
  const item = ability({ name, traits, usesPerDay, flags, effects, description: `${printedAbility(key)}\n${md(`*${HOW[kind]}:* ${how}`)}` });
  item.system.category = category;
  return item;
}

const DISCIPLE_FEATS = "While you have this archetype, class feats with the Disciple trait are offered to you (Graham's B7-3); not the core feats the book opens to the Disciple, and not every Martial feat.";

const ARCHETYPES = [
  A("Brawler", { prerequisites: "Non-Disciple",
    how: `your unarmed attacks deal 1d6 with Versatile B; at BAB 3 and every 3 after, +1 to the total; magical at BAB 3, cold iron and silver at 8, adamantine at 16 — all applied for you, as the Disciple's Powerful Fists are. ${DISCIPLE_FEATS} Progression: character level 10 (Graham's B7-2).`,
    flags: { unarmedDamage: { die: "1d6", versatile: "B", perBAB: { every: 3, value: 1 }, countsAs: { magical: 3, "cold iron": 8, silver: 8, adamantine: 16 }, label: "Powerful Fists (Brawler)" }, classFeatAccess: ["Disciple"] } }),
  A("Formbinder", { traits: "Kensai", prerequisites: "BAB +2",
    how: "Combat Form's Use, while you hold one form, asks whether to add the new form beside it or replace it: two forms held as one stance, the second activated through Combat Form as usual, and one form activated each turn. Where both forms give a bonus to the same thing (the same check, the same save, your DB), only the greater applies, worked out roll by roll. A Blended Form fills both places (Graham's B7-7). You also know Twin Dragon, entered through Combat Form like your other forms.",
    grantedAbilities: "Twin Dragon" }),
  A("Harmony Warden", { traits: "Adept", prerequisites: "Inner Discipline, Meditation 2 ranks",
    how: "+4 class to Refocus, Healing Trance and Power Recovery checks is offered as a tick-box on those checks (\"in a wilderness environment\", the GM's call). Press Use once a day for the trance: 10 minutes, then choose a Verdant spell of the Utility category whose base PP is no greater than 2 (4 at 5th level, 6 at 10th, and so on; Graham's B7-4), cast at once as an innate spell with your Monastic Path's ability. The usual innate limit applies.",
    kind: "partly",
    flags: { itAutomation: "harmonyWarden", conditionals: [conditional({ kind: "modifier", value: 4, type: "class", label: "Harmony Warden", scope: "In a wilderness environment (the GM's call) — tick if so", auto: false, when: { actions: ["refocus", "healingTrance", "powerRecovery"] } })] } }),
  A("Iaijutsu Master", { traits: "Martial, Oathblade", prerequisites: "Oathblade, Perception 2 ranks",
    how: "+25 class bonus to Initiative when you roll it with a sword sheathed: a weapon of the Sword group you carry and are not wielding (Graham's B7-5), applied for you. You gain Drawn Verdict.",
    flags: { conditionals: [conditional({ kind: "modifier", value: 25, type: "class", label: "Iaijutsu Master", scope: "Initiative with a sword sheathed", auto: true, when: { checkTypes: ["initiative"], sheathedGroups: ["sword"] } })] },
    grantedAbilities: "Drawn Verdict" }),
  A("Inner Adept", { prerequisites: "Meditation 2 ranks, Non-Disciple, Non-Mystic",
    how: `you gain Inner Discipline. Press Use to choose your class skill (Meditation or Mental Focus) and a Monastic Path: the Path's tradition and magical ability score are recorded on this feat for your innate spells and magical techniques, without the Path's class skill. A Path that differs from your class's tradition is refused (a Kensai's, Ghostwalker's or Oathblade's chosen tradition, a core caster's). ${DISCIPLE_FEATS} Progression: your chosen class skill at 10 ranks.`,
    kind: "partly",
    flags: { itAutomation: "innerAdept", classFeatAccess: ["Disciple"] },
    grantedFeats: "Inner Discipline" }),
  A("Jade Physician", { traits: "Disciple", prerequisites: "Medicine 2 ranks",
    how: "Medicine is a class skill while you have this feat. +2 class to Treat Injury, Treat Toxin and Treat Wounds checks, applied for you. You gain Restorative Palm.",
    flags: { classSkills: ["Medicine"], conditionals: [conditional({ kind: "modifier", value: 2, type: "class", label: "Jade Physician", scope: "Treat Injury, Treat Toxin and Treat Wounds", auto: true, when: { actions: ["treatInjury", "treatToxin", "treatWounds"] } })] },
    grantedAbilities: "Restorative Palm" }),
  A("Lotus Enchanter", { traits: "Adept", prerequisites: "Inner Discipline, Deception 2 ranks, Diplomacy 2 ranks",
    how: "Mystic Essence's list also offers specialist spells with the Enchantment trait. An Enchantment spell Mystic Essence gives you carries +1 class to its innate attack checks and save DCs (TRG Prime 3.671.0).",
    flags: { itEssenceTraits: ["Enchantment"] } }),
  A("Night Lotus", { traits: "Expert", prerequisites: "Medicine 2 ranks",
    how: "Medicine is a class skill while you have this feat, and you resist poison. You gain Night Lotus Venom.",
    flags: { classSkills: ["Medicine"] }, effects: [(id, n) => resistanceEffect(id, n, "poison")],
    grantedAbilities: "Night Lotus Venom" }),
  A("Oathbound", { traits: "Martial", prerequisites: "Non-Disciple, Non-Oathblade, Mental Focus 1 rank",
    how: "Mental Focus is a class skill while you have this feat. The katana and the wakizashi are martial weapons for you (TRG Prime 3.671.0). You gain Bound Challenge.",
    flags: { classSkills: ["Mental Focus"] },
    effects: [declaredEffect("katana and wakizashi", "The katana and wakizashi are martial weapons for you, not exotic.", { weaponCategoryAs: { names: ["Katana", "Wakizashi"], category: "martial" } })],
    grantedAbilities: "Bound Challenge" }),
  A("Onmyoji Necromancer", { traits: "Adept", prerequisites: "Inner Discipline, Medicine 2 ranks, Religion 2 ranks",
    how: "Mystic Essence's list also offers specialist spells with the Soul trait. A Soul spell Mystic Essence gives you carries +1 class to its innate attack checks and save DCs (TRG Prime 3.671.0).",
    flags: { itEssenceTraits: ["Soul"] } }),
  A("Ronin", { traits: "Oathblade", prerequisites: "Oathblade, Survival 2 ranks",
    how: "Deception is a class skill while you have this feat. You gain Wandering Creed, which replaces your Sworn Oath at each daily preparation, and Turning the Blade.",
    flags: { classSkills: ["Deception"] },
    grantedAbilities: "Wandering Creed, Turning the Blade" }),
  A("Shadowdancer", { prerequisites: "Inner Discipline, Stealth 2 ranks, Non-Rogue",
    how: "+2 class to Stealth checks. You gain the Stealthy Strike feat and the Shadowy Step feat (IT-M14 as answered).",
    effects: [(id, n) => classSkillEffect(id, n, ["Stealth"], 2)],
    grantedFeats: "Stealthy Strike, Shadowy Step" }),
  A("Shugenja", { traits: "Adept", prerequisites: "Learned Caster, Arcana 2 ranks, Nature 2 ranks, Religion 2 ranks",
    how: "for learned casters only (the Cleric, Druid and Wizard; ruling IT-C9), read by TRG Prime 3.671.0. Press Use to choose your element once, then at each daily preparation choose two spells, of any tradition, with one of your element's traits (not specialist spells): they are granted as innate spells with the Focus trait until your next daily preparation. The usual innate limit applies.",
    kind: "partly",
    flags: { itAutomation: "shugenja" } }),
  A("Soul Weapon Master", { traits: "Disciple, Kensai, Oathblade", prerequisites: "Mental Focus 2 ranks",
    how: "at a daily preparation you are asked which melee weapon to bond (ten minutes' meditation), or press Use. While bonded: +1 to its damage total at BAB 3 and every 3 after; magical at BAB 3, cold iron and silver at 8, adamantine at 16 (TRG Prime 3.671.0); and Flurry of Blows, Stunning Fist, Inner Strike and every other ability used with unarmed strikes may be used with it — the abilities, not the fists' damage (Graham's B7-6). A lost or discarded bond waits for your next daily preparation.",
    kind: "partly",
    flags: { itAutomation: "soulWeaponMaster" } }),
  A("Steel Disciple", { traits: "Martial", prerequisites: "BAB +2, Martial Weapon Proficiency",
    how: "press Use to choose your class skill (Acrobatics, Athletics, Meditation or Mental Focus) and one Kensai Combat Form. The form is added to your abilities; its Use enters it as a stance (1 AP, the system's stance rules), with no Combat Form to expend. While you have this archetype, class feats with the Kensai trait are offered to you (Graham's B7-3). Progression: BAB 12.",
    kind: "partly",
    flags: { itAutomation: "steelDisciple", classFeatAccess: ["Kensai"] } }),
  A("Tanuki Trickster", { prerequisites: "Inner Discipline, Deception 4 ranks",
    how: "+2 class to Deception checks. Shape Of The Humanoid and Mirage Entity are granted as innate spells with the Focus trait, cast with your Monastic Path's tradition and ability; without a Path, your class's chosen Magical Tradition and its ability (IT-M6). The usual innate limit applies.",
    effects: [(id, n) => classSkillEffect(id, n, ["Deception"], 2)],
    flags: { grantInnate: true, itPathMagic: { allowance: 0 } },
    grantedSpells: "Shape Of The Humanoid, Mirage Entity" }),
  A("Twin Path", { traits: "Mystic", prerequisites: "Mystic, Meditation 4 ranks",
    how: "press Use to choose a second Mystical Discipline: its special ability is added, and its 1st-level additional spells as innate spells with the Focus trait, cast with your Path's tradition and ability (outside Mystical Power's count). Its later spells are not. When both disciplines' abilities would modify one roll, choose which applies; they do not stack.",
    kind: "partly",
    flags: { itAutomation: "twinPath", itPathMagic: { allowance: 1 } } }),
  A("Veilborn", { traits: "Ghostwalker", prerequisites: "Mental Focus 2 ranks",
    how: "press Use to learn one more Ghost Art with the Focus trait whose level you meet (it is not counted against Ghost Arts' table). +2 class to Refocus checks to restore an expended Ghost Art, applied for you (TRG Prime 3.671.0). After Shadow Double, Veiled Body, Empty Presence or Shadow Passage — and Smoke Veil when you are inside it — +1 class to your DB until the beginning of your next turn.",
    flags: { itAutomation: "veilborn", conditionals: [conditional({ kind: "modifier", value: 2, type: "class", label: "Veilborn", scope: "Refocus to restore an expended Ghost Art", auto: true, when: { actions: ["refocus"], restores: ["Ghost Art"] } })] } }),
  A("Way of the Geisha", { prerequisites: "Diplomacy 2 ranks",
    how: "you gain the Affable feat, and +2 class to Artistry, Diplomacy and Perform checks.",
    effects: [(id, n) => classSkillEffect(id, n, ["Artistry", "Diplomacy", "Perform"], 2)],
    grantedFeats: "Affable" }),
  A("Zen Archer", { traits: "Martial", prerequisites: "Inner Discipline, Mental Focus 1 rank",
    how: `you are proficient with the longbow, short bow and composite bows, and you gain Perfect Shot. Flurry of Blows and every other ability used with unarmed strikes may be used with a bow (not a crossbow); an ability that needs a melee attack still needs one (Graham's B7-6). You count as having the Archer archetype for class feats with the Archer trait.`,
    flags: { unarmedAbilityWeapons: { names: [...ZEN_ARCHER_BOWS] } },
    effects: [declaredEffect("bows", "Proficient with the longbow, short bow and composite bows.", { weaponProficientName: [...ZEN_ARCHER_BOWS] })],
    grantedFeats: "Perfect Shot" })
];

/* ------------------------------------------------------------------ */
/* The abilities the archetypes print                                   */
/* ------------------------------------------------------------------ */

const TWIN_DRAGON_PARTS = [
  { label: "+1 DB after your first hit each round", flags: { itTwinDragonStrike: true } },
  { label: "+1 base damage after your first avoided attack each round", flags: { itTwinDragonAvoid: true } }
];

const ABILITIES = [
  (() => {
    const item = B("Twin Dragon", {
      how: "a Combat Form, entered through Combat Form like your others (1 AP, a stance). The first time each round your Strike hits, +1 class to your DB until the start of your next turn; the first time each round an attack misses you, +1 to your damage until the end of your next turn (untyped, so it adds to a form's class bonuses). It is not counted against Combat Form's table.",
      flags: { itForm: { parts: TWIN_DRAGON_PARTS }, itAutomation: "combatFormItem", itFormExtra: "Formbinder" }
    });
    item.system.category = "Combat Form";
    item.system.sourceClass = "Kensai";
    return item;
  })(),
  B("Drawn Verdict", { traits: "Attack, Flourish, Focus, Technique",
    how: "press Use with your Challenge on the target, the target within reach and a sword sheathed: 1 AP draws it (it becomes wielded) and Strikes the challenged target. The target is offered no reaction to the Strike (TRG Prime 3.671.0). If it deals damage, the target cannot use reactions until the beginning of its next turn. At the end of your turn, if you made no further Strike, you are asked whether to sheathe it (free). Then it is expended until a Refocus.",
    flags: { itAutomation: "drawnVerdict" } }),
  B("Restorative Palm", { traits: "Focus, Healing, Technique",
    how: "target a living creature other than you within reach and press Use (2 AP): restore 4 Hit Points per level, or stop Bleeding by 1 per two levels, or a new saving throw against one of its poisons or diseases (its stage save, now). Constructs and undead are refused. The target is then immune to Restorative Palm for 1 hour; it is expended until a Refocus.",
    flags: { itAutomation: "restorativePalm" } }),
  B("Night Lotus Venom", { traits: "Focus, Manipulate, Poison, Technique",
    how: "press Use with a piercing or slashing weapon (or ammunition) in hand: 1 AP coats it until the end of your next turn or the first creature it damages. That creature saves Fortitude against your Level DC: Critical unaffected; Success (and a Partial; IT-m24) −5 feet to Speed until the start of your next turn; Failure Slowed 1 until the end of its next turn; Fumble or Blunder Paralyzed until the start of its next turn, then Slowed 1 to the end of that turn. −1 circumstance to the save when the Strike also dealt Unseen Assault. Expended until a Refocus.",
    flags: { itAutomation: "nightLotusVenom" } }),
  B("Bound Challenge", { traits: "Flourish, Mental",
    how: "target a creature you can see and press Use: 1 AP and a conviction point. It is the Oathblade's Challenge in every other respect (IT-M13 as answered): your class bonus to melee attack and damage and Armour Rending against it, −2 to your DB against everyone else, one target, and the same end conditions.",
    flags: { itAutomation: "boundChallenge" } }),
  B("Wandering Creed",
    { how: "at each daily preparation you are asked which Sworn Oath to hold until the next (or press Use): the oath you held is set aside and the chosen one added, with no narrative change needed. One oath at a time.",
      flags: { itAutomation: "wanderingCreed" } }),
  B("Turning the Blade", { traits: "Flourish, Mental, Technique",
    how: "offered as your reaction when a creature other than your challenged target damages you with a Strike: your Challenge moves to it, with your Sworn Oath, without Challenge being ready and without expending it.",
    flags: { itAutomation: "turningTheBlade" } })
];

export const BLOCK7_FEATS = ARCHETYPES;
export const BLOCK7_ABILITIES = ABILITIES;

/* ------------------------------------------------------------------ */
/* FA-22: the core archetypes each class may also take                  */
/* ------------------------------------------------------------------ */

/**
 * The printed lists, as `registerFeatAccess("archetype", …)` takes them
 * (TRG Prime 3.671.0 C2). "DISCIPLE/GHOSTWALKER" is two classes.
 */
export function existingArchetypeAccess() {
  const out = {};
  const names = { DISCIPLE: "Disciple", GHOSTWALKER: "Ghostwalker", KENSAI: "Kensai", MYSTIC: "Mystic", OATHBLADE: "Oathblade" };
  for (const [key, line] of Object.entries(BOOK.existing)) {
    const list = line.replace(/\.$/, "").replace(/ (and|&) /g, ", ").split(/,\s*/).map((x) => x.trim()).filter(Boolean);
    for (const cls of key.split("/")) out[names[cls]] = [...(out[names[cls]] ?? []), ...list];
  }
  return out;
}
