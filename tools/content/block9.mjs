/**
 * Inner Tempest — Block 9 (0.10.0): Chapter 6's armour and Chapter 9's magic
 * items, as ruled on 26 October 2026 (B9-1 to B9-11 and interpretations 1–8,
 * docs/INNER_TEMPEST_RULINGS_2026-10-26-B9.md), on TRG Prime 3.673.0.
 *
 * THE PRINTED TEXT AND NUMBERS ARE THE BOOK'S, read from
 * tools/content/book-text-block9.json (cut from the docx by
 * tools/content/extract-book-block9.mjs), never retyped: each armour's table
 * row and paragraphs, each rune's, item's and tier's labelled lines and
 * paragraphs. Each item is written in the shape the matching TRG Prime pack
 * keeps, so the system's own readers apply it:
 *
 *   armour          the core Armour pack's fields (category, ACP, Max Dex, DR,
 *                   HP, Speed, coverage, helmet), and a conditional on worn
 *                   gear for Shozoku and the Oni-Mask (interpretation 1)
 *   runes           gear + `flags.trg-prime.rune {key, tier, on, automation}`;
 *                   the behaviour is the registered rune's
 *                   (module/block9-automations.mjs RUNES, read here, so the
 *                   pack and the registration cannot disagree)
 *   specific items  armour/weapon built from the Chapter 6 base, with quality,
 *                   runes and `specificItem` (the core specific-items shape;
 *                   its printed figures are final, B9-9)
 *   wondrous        gear + `wondrous {base, tier, abilities[]}`, conditionals,
 *                   auras, `runeBearing`
 */
import fs from "node:fs";
import { SYSTEM_ID, stableId } from "./builders.mjs";
import { md } from "./markdown.mjs";
import { CHAPTER6_WEAPONS } from "./weapons.mjs";
import { RUNES, incenseAura } from "../../module/block9-automations.mjs";

export const BOOK9 = JSON.parse(fs.readFileSync(new URL("./book-text-block9.json", import.meta.url), "utf8"));

const STATS = { coreVersion: "14", systemId: SYSTEM_ID, systemVersion: "3.673.0", createdTime: 1789000000000, modifiedTime: 1789000000000, lastModifiedBy: null, compendiumSource: null, duplicateSource: null };
const ROMAN = ["I", "II", "III"];
const HOW = { auto: "Automated", partly: "Partly automated", manual: "Not automated" };
const how = (kind, text) => md(`*${HOW[kind]}:* ${text}`);
const number = (text) => {
  const t = String(text ?? "").trim();
  if (t === "-" || t === "") return null;
  const n = Number(t.replace(/[,+]/g, "").replace(/\s*(gp|lbs?|ft\.?)$/i, ""));
  if (!Number.isFinite(n)) throw new Error(`Block 9: cannot read "${t}" as a number`);
  return n;
};
const titleCase = (s) => String(s).toLowerCase().replace(/(^|[\s-])([a-z])/g, (m, p, c) => p + c.toUpperCase()).replace(/\bOf\b/g, "of");
const traitWords = (line) => String(line ?? "").split(/\s+/).filter(Boolean).map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(", ");

function doc(seed, name, type, img, system, flags = {}, effects = []) {
  return {
    _id: stableId(seed), name, img, type, system, effects, folder: null, sort: 0, ownership: { default: 0 },
    flags: { [SYSTEM_ID]: { bookChapter: 9, ...flags } }, _stats: { ...STATS }
  };
}

/** The book's entry under a Chapter 9 heading. */
export function entry9(section, heading) {
  const e = BOOK9.magic[section]?.entries?.[heading];
  if (!e) throw new Error(`book-text-block9.json has no ${section} / ${heading}`);
  return e;
}

/** The labelled lines as the book prints them. */
function fieldsLine(fields, keys) {
  return keys.filter((k) => fields[k] !== undefined).map((k) => `**${k}** ${fields[k]}`).join("; ");
}

/* ------------------------------------------------------------------ */
/* Chapter 6: the armour                                                */
/* ------------------------------------------------------------------ */

const CATEGORY = { "LIGHT ARMOUR": "Light", "MEDIUM ARMOUR": "Medium", "HEAVY ARMOUR": "Heavy", OTHER: "Other" };
/** The description heading where it is not the table's name in capitals. */
const ARMOUR_HEADING = { "Oni-Mask": "ONI MASK" };
/** The nearest of TRG Prime's own armour images (the module ships no art). */
const ARMOUR_ICON = {
  Haramaki: "padded", Shozoku: "leather", Kikko: "scale", "Do-maru": "lamellar", Kusari: "full-chainmail",
  "Tatami-Do": "banded", Yoroi: "full-platemail", "Oni-Mask": "full-helmet", Jingasa: "metal-helmet"
};
/** The two head pieces in OTHER: helmets, read by the hit-location table. */
const HELMETS = new Set(["Oni-Mask", "Jingasa"]);

/** What TRG Prime does with each armour, beyond the table. */
const ARMOUR_NOTES = {
  Shozoku: how("auto", "the +2 circumstance bonus is offered on Hide (Stealth) checks while it is worn; tick it in shadowy areas (interpretation 1: the shadows are the GM's call)."),
  "Do-maru": how("auto", "Full, but not the arms (B9-1): it covers the torso and the legs, so a critical to the arms, where the shoulders are, reads the unarmoured row."),
  "Oni-Mask": how("auto", "a helmet. The +1 item bonus is offered on Intimidate checks while it is worn; tick it when the intimidation is visual (interpretation 1)."),
  Jingasa: how("auto", "a helmet, read by the critical table's head location."),
  Yoroi: how("auto", "Full and Helm: it covers the torso, arms, legs and head, and its helm's −1 item penalty to Perception is the system's own (Helm).")
};

const ARMOUR_CONDITIONALS = {
  Shozoku: [{ kind: "modifier", value: 2, type: "circumstance", label: "Shozoku", scope: "Hide (Stealth) checks in shadowy areas", auto: false, when: { checkTypes: ["skill"], actions: ["hide"] } }],
  "Oni-Mask": [{ kind: "modifier", value: 1, type: "item", label: "Oni-Mask", scope: "Visual based Intimidate checks", auto: false, when: { checkTypes: ["skill"], subjects: ["intimidate"] } }]
};

function armourItem(row) {
  const category = CATEGORY[row.section];
  if (!category) throw new Error(`Block 9: unknown armour section ${row.section}`);
  const traits = row.traits === "-" ? [] : row.traits.split(",").map((t) => t.trim());
  const full = traits.includes("Full");
  const body = category !== "Other";
  const paragraphs = BOOK9.armour.descriptions[ARMOUR_HEADING[row.name] ?? row.name.toUpperCase()];
  if (!paragraphs?.length) throw new Error(`Block 9: no description for ${row.name}`);
  const hp = number(row.hp);
  const printed = `**${category}**; **Lvl** ${row.level}; **Price** ${row.price} gp; **ACP** ${row.acp}; **MAX DEX** ${row.maxDex}; **DR** ${row.dr}; **HP** ${row.hp}; **Speed** ${row.speed}; **Wt.** ${row.weight} lbs; **Traits** ${row.traits}`;
  const description = [md(printed), ...paragraphs.map((p) => md(p)), ...(ARMOUR_NOTES[row.name] ? [ARMOUR_NOTES[row.name]] : [])].join("\n");
  const flags = {};
  if (ARMOUR_CONDITIONALS[row.name]) flags.conditionals = ARMOUR_CONDITIONALS[row.name];
  return doc(`armour:${row.name}`, row.name, "armour", `systems/trg-prime/assets/armour/${ARMOUR_ICON[row.name]}.png`, {
    quantity: 1, weight: number(row.weight), price: number(row.price), equipped: false, invested: false,
    hp: { value: hp, max: hp },
    traits: row.traits,
    description,
    category,
    material: traits.includes("Metal") ? "Metal" : "",
    isHelmet: HELMETS.has(row.name) || traits.includes("Helm"),
    dr: number(row.dr) ?? 0,
    hardness: 0,
    penalty: number(row.acp) ?? 0,
    proficiency: "",
    maxDexBonus: number(row.maxDex) ?? -1,
    speedPenalty: number(row.speed) ?? 0,
    itemLevel: number(row.level),
    coversTorso: body,
    // B9-1: the Do-maru is Full but leaves the shoulders, so not the arms.
    coversArms: body && full && row.name !== "Do-maru",
    coversLegs: body && full
  }, flags);
}

export const BLOCK9_ARMOUR = BOOK9.armour.rows.map(armourItem);

/* ------------------------------------------------------------------ */
/* The runes                                                            */
/* ------------------------------------------------------------------ */

/** Where each rune's text sits, and how the system carries it. */
const RUNE_SOURCE = {
  centredArmour: ["armourRunes", "CENTRED"], guarded: ["armourRunes", "GUARDED"], harmony: ["armourRunes", "HARMONY"],
  gracefulWind: ["armourRunes", "GRACEFUL WIND"], karmicResilience: ["armourRunes", "KARMIC RESILIENCE"], staunching: ["armourRunes", "STAUNCHING"],
  centredWeapon: ["weaponRunes", "CENTRED"], harmonyEdge: ["weaponRunes", "HARMONY EDGE"], mindful: ["weaponRunes", "MINDFUL"],
  soulfulStrike: ["weaponRunes", "SOULFUL STRIKE"], tranquilQuiver: ["weaponRunes", "TRANQUIL QUIVER"]
};
/** The core rune pack's `automation` word for each. */
const RUNE_AUTOMATION = {
  centredArmour: "conditional", centredWeapon: "conditional", guarded: "event", harmony: "action", gracefulWind: "action",
  karmicResilience: "event", staunching: "event", harmonyEdge: "event", mindful: "action", soulfulStrike: "action", tranquilQuiver: "action"
};
/** The tier headings the book prints ("SOULFUL I" over Soulful Strike). */
const TIER_HEADING = { soulfulStrike: "SOULFUL" };
const FIELD_ORDER = ["Level", "Price", "Armour Price", "Shield Price", "Usage", "Activate", "Trigger", "Frequency", "Requirement"];

function runeItem(rune, tierIndex = null) {
  const [section, heading] = RUNE_SOURCE[rune.key];
  const e = entry9(section, heading);
  const tiered = Array.isArray(rune.tiers) && tierIndex !== null;
  const tierHeading = tiered ? `${TIER_HEADING[rune.key] ?? heading} ${ROMAN[tierIndex]}` : null;
  const tier = tiered ? e.tiers[tierHeading] : null;
  if (tiered && !tier) throw new Error(`Block 9: the book has no ${tierHeading}`);
  const kindWord = rune.on.includes("weapon") ? "Weapon" : "Armour";
  // ONE NAME, TWO RUNES (C12): Centred is printed for armour and for weapons,
  // at two prices; the pack items say which.
  const both = rune.key.startsWith("centred");
  const name = `${rune.name}${tiered ? ` ${ROMAN[tierIndex]}` : ""}${both ? ` (${kindWord})` : ""}`;
  const level = tiered ? rune.tiers[tierIndex].level : rune.level;
  const price = tiered ? rune.tiers[tierIndex].price : (rune.price ?? rune.armourPrice);
  if (tiered && (number(tier.fields.Level) !== level || number(tier.fields.Price) !== price)) throw new Error(`Block 9: ${name}'s level or price is not the book's`);
  if (!tiered && rune.armourPrice != null && (number(e.fields["Armour Price"]) !== rune.armourPrice || number(e.fields["Shield Price"]) !== rune.shieldPrice)) throw new Error(`Block 9: ${name}'s prices are not the book's`);
  if (!tiered && rune.price != null && number(e.fields.Price) !== rune.price) throw new Error(`Block 9: ${name}'s price is not the book's`);
  const description = [
    md(`**${e.traits}**`),
    md(fieldsLine(e.fields, FIELD_ORDER)),
    ...(e.flavour ? [md(`*${e.flavour}*`)] : []),
    ...e.lines.map((l) => md(l)),
    ...(tier ? [md(`**${tierHeading}**`), md(fieldsLine(tier.fields, ["Level", "Price"])), ...tier.lines.map((l) => md(l))] : []),
    md(`*On the sheet:* ${rune.note}`)
  ].join("\n");
  return doc(`rune:${name}`, name, "gear", "icons/svg/book.svg", {
    quantity: 1, weight: 0, price, equipped: false, invested: false,
    hp: { value: 0, max: 0 },
    traits: traitWords(e.traits),
    description,
    slot: "", uses: 0, itemSize: "medium", itemLevel: level, heldHands: 0, formulae: "", spellbookContainer: false
  }, { rune: { key: rune.key, tier: tiered ? tierIndex + 1 : 1, on: [...rune.on], automation: RUNE_AUTOMATION[rune.key] } });
}

export const BLOCK9_RUNES = RUNES.flatMap((rune) => (Array.isArray(rune.tiers) ? rune.tiers.map((_, i) => runeItem(rune, i)) : [runeItem(rune)]));

/* ------------------------------------------------------------------ */
/* The specific armour and weapon                                       */
/* ------------------------------------------------------------------ */

/** "Potency I" → {key, label, tier, printed}; null for a trait that is no rune. */
const RUNE_NAMES = { Potency: "potency", Harmony: "harmony", Centred: "centredWeapon", Soulful: "soulfulStrike" };
const RUNE_FIELD_NAMES = { potency: "Potency", harmony: "Harmony", centredWeapon: "Centred", soulfulStrike: "Soulful Strike" };
function runeOf(printed) {
  const m = /^([A-Za-z ]+?) (I|II|III)$/.exec(printed) ?? /^([A-Za-z ]+)$/.exec(printed);
  const key = m ? RUNE_NAMES[m[1].trim()] : null;
  if (!key) return null;
  const tier = m[2] ? ROMAN.indexOf(m[2]) + 1 : 1;
  return { key, label: RUNE_FIELD_NAMES[key], tier, printed };
}

function specificParts(traitLine) {
  const all = traitLine.split(",").map((t) => t.trim()).filter(Boolean);
  const runes = all.map(runeOf).filter(Boolean).sort((a, b) => (a.key === "potency" ? -1 : b.key === "potency" ? 1 : 0));
  const runeText = runes.map((r) => (r.key === "harmony" ? r.label : `${r.label} ${ROMAN[r.tier - 1]}`)).join(", ");
  return { all, runes, runeText, printedBonus: runes.find((r) => r.key === "potency")?.tier ?? 0 };
}

function specificBody(e, extra) {
  return [
    md(`**${e.traits}**`),
    md(fieldsLine(e.fields, ["Level", "Price", "Usage", "Weight"])),
    ...(e.flavour ? [md(`*${e.flavour}*`)] : []),
    ...e.lines.filter((l) => /following statistics/.test(l)).map((l) => md(l)),
    md(fieldsLine(e.fields, ["ACP", "MAX DEX", "DR", "DB", "HP", "AB", "Damage", "Size", "Fumble", "Traits"])),
    md(fieldsLine(e.fields, ["Activate", "Frequency"])),
    ...e.lines.filter((l) => !/following statistics/.test(l)).map((l) => md(l)),
    ...extra
  ].join("\n");
}

function harmoniousDomaru() {
  const e = entry9("specificArmour", "HARMONIOUS DO-MARU");
  const base = BLOCK9_ARMOUR.find((i) => i.name === "Do-maru");
  const t = specificParts(e.fields.Traits);
  const system = structuredClone(base.system);
  Object.assign(system, {
    price: number(e.fields.Price), itemLevel: number(e.fields.Level), weight: number(e.fields.Weight),
    penalty: number(e.fields.ACP), maxDexBonus: number(e.fields["MAX DEX"]), dr: number(e.fields.DR),
    hp: { value: number(e.fields.HP), max: number(e.fields.HP) },
    quality: "expert", superiorTraits: "", runes: t.runeText, traits: t.all.join(", ")
  });
  system.description = specificBody(e, [
    how("auto", "a specific armour (B9-9): an Expert Do-maru with Potency I and Harmony, carrying the printed ACP −1, Max Dex 7, DR 3, HP 55 and 15 lb as final. Like the Do-maru it covers the torso and the legs, not the arms (B9-1). Press Harmony on it (Engage, 1 AP): 1 minute of +2 dodge DB and +2 resistance to saves, +3 for a Disciple or Mystic; Refocus restores it."),
    md("*Note for the GM:* the book prints DB +0, while its Potency I gives armour its +1 item bonus to DB. Graham ruled on 27 October 2026 that the DB is +1: Potency I applies, as the sheet shows.")
  ]);
  return doc("specific:Harmonious Do-maru", "Harmonious Do-maru", "armour", base.img, system, {
    specificItem: { runes: t.runes, runeText: t.runeText, traits: t.all, quality: "expert", material: "", printedItemBonus: t.printedBonus }
  });
}

function spiritblade() {
  const e = entry9("specificWeapon", "SPIRITBLADE");
  const base = CHAPTER6_WEAPONS.find((w) => w.name === "Nodachi");
  if (!/Nodachi/.test(e.flavour)) throw new Error("Block 9: the Spiritblade is no longer printed as a Nodachi");
  const t = specificParts(e.fields.Traits);
  const own = base.system.traits.split(",").map((s) => s.trim());
  // The printed traits the Nodachi does not have, and are no rune: its
  // superior traits (Balanced).
  const superior = t.all.filter((x) => !runeOf(x) && !own.includes(x));
  const system = structuredClone(base.system);
  Object.assign(system, {
    price: number(e.fields.Price), itemLevel: number(e.fields.Level), weight: number(e.fields.Weight),
    // R14 (B9-8): the printed "1d10+2" is the base die and the Master quality's
    // +2; the die is stored bare and the fumble DC is the Nodachi's.
    damage: "1d10", quality: "master", material: "", superiorTraits: superior.join(", "), runes: t.runeText,
    traits: [...new Set([...own, ...t.all])].join(", ")
  });
  system.description = specificBody(e, [
    how("auto", "a specific weapon (B9-8): a Master Nodachi (the printed 1d10+2 is its die and Master's +2) with the superior trait Balanced and Potency III, Centred II and Soulful Strike II; its attack bonus is what the sheet derives, and its fumble DC is the Nodachi's 12, less 1 for Balanced. On a critical hit you are offered Fear (DC 20) on the creature struck (Command, 1 AP), as Da Big Itter's Fear is. Soulful Strike II is switched on and off on the weapon (Command, 1 AP)."),
    md("*Note for the GM:* the book prints \"Fumble 3\"; it is read as the Nodachi's own fumble DC (B9-8). Graham ruled on 27 October 2026 that Balanced still takes 1 from it, so the fumble DC is 11.")
  ]);
  return doc("specific:Spiritblade", "Spiritblade", "weapon", base.img, system, {
    specificItem: { runes: t.runes, runeText: t.runeText, traits: t.all, quality: "master", material: "", printedItemBonus: t.printedBonus,
      onCritical: { spell: "Fear", dc: 20, ap: 1 } }
  });
}

export const BLOCK9_SPECIFIC = [harmoniousDomaru(), spiritblade()];

/* ------------------------------------------------------------------ */
/* The wondrous items                                                   */
/* ------------------------------------------------------------------ */

const use = (automation, label, activation, frequency) => ({ kind: "use", automation, activation, frequency, label });
const SAVE_VS = (traits) => ({ checkTypes: ["save"], traits });

function wondrous(heading, { slot = "", abilities = [], conditionals = [], extraFlags = {}, system = {}, sheet, img = "icons/svg/item-bag.svg" }) {
  const e = entry9("wondrous", heading);
  const name = titleCase(heading);
  const held = /held/i.test(e.fields.Usage ?? "");
  const description = [
    md(`**${e.traits}**`),
    md(fieldsLine(e.fields, ["Level", "Price", "Usage", "Weight", "Activate"])),
    ...(e.flavour ? [md(`*${e.flavour}*`)] : []),
    ...e.lines.map((l) => md(l)),
    how(sheet[0], sheet[1])
  ].join("\n");
  return doc(`wondrous:${name}`, name, "gear", img, {
    quantity: 1, weight: number(e.fields.Weight) ?? 0, price: number(e.fields.Price), equipped: false, invested: false,
    hp: { value: 0, max: 0 },
    traits: traitWords(e.traits),
    description,
    slot, uses: 0, itemSize: "medium", itemLevel: number(e.fields.Level), heldHands: held ? 1 : 0, formulae: "", spellbookContainer: false,
    ...system
  }, {
    wondrous: { base: "", tier: "", slotInferred: Boolean(slot), activate: e.fields.Activate ?? "", frequency: "", abilities },
    ...(conditionals.length ? { conditionals } : {}),
    ...extraFlags
  });
}

export const BLOCK9_WONDROUS = [
  wondrous("ENLIGHTENED PRAYER BEADS", {
    slot: "neck",
    abilities: [
      { kind: "stat", value: 1, bonusType: "status", stat: "wisdom", target: "system.attributes.wisdom", label: "Enlightened Prayer Beads" },
      use("beadsRefocus", "Steadied Mind", "Free (0 AP)", "daily")
    ],
    sheet: ["auto", "invested, +1 status to Wisdom. Its Use (free, once a day) readies advantage on your next Refocus that day, taken automatically on that roll (interpretation 4); an unused one lapses at your daily preparation."]
  }),
  wondrous("LOTUS BLOSSOM", {
    abilities: [use("lotusBlossom", "Drink the Elixir", "Interact (2 AP)", "daily")],
    sheet: ["auto", "its Use (Interact, 2 AP; the bottle refills at your daily preparation): temporary HP equal to your level; Frightened, and any effect of a Fear or Charm source, ends; for 1 hour advantage on saves against fear and charm (taken automatically where the save's traits say so, offered otherwise). A second elixir the same day, from any bottle (B9-6), rolls a serious poison critical on you first."]
  }),
  wondrous("MONASTIC ROBE OF RESILIENCE", {
    abilities: [{ kind: "baseDR", value: 1, label: "Monastic Robe of Resilience" }],
    extraFlags: { runeBearing: "armour" },
    system: { gearCategory: "Clothing" },
    sheet: ["auto", "invested, DR 1 as armour (the higher of it and worn armour's counts). It takes armour runes like Travellers clothing, and they count only while no body armour is worn. That the robes cannot be worn with armour is the table's to keep."]
  }),
  wondrous("MYSTIC INCENSE BURNER", {
    abilities: [use("incenseBurner", "Light the Incense", "", "atWill")],
    extraFlags: { auras: incenseAura("Mystic Incense Burner") },
    sheet: ["auto", "its Use burns one Incense from your gear and lights it for 1 hour (B9-7): every creature within 30 feet of you, you included, gains +1 resistance to Will saves against fear and charm (automatic where the save's traits say so, offered otherwise) and +2 status to Meditation, offered on the check (interpretation 3). Use it again while it burns to put it out."]
  }),
  wondrous("RESTORATIVE MAT", {
    abilities: [use("restorativeMat", "Restorative Meditation", "Meditate (10 minutes)", "daily")],
    conditionals: [{ kind: "modifier", value: 2, type: "status", label: "Restorative Mat", scope: "Meditation checks made whilst sat upon the mat", auto: false, when: { checkTypes: ["skill"], subjects: ["meditation"] } }],
    sheet: ["auto", "+2 status is offered on Meditation checks while it is in use (equipped); tick it when you sit on it (interpretation 3). Its Use (10 minutes, once a day, not in an encounter) releases Cure or Restoration at 8 PP from the mat, as an item's spell: none of your own PP. Target yourself."]
  }),
  wondrous("SASH OF SERENITY", {
    slot: "waist",
    abilities: [
      { kind: "dbBonus", value: 1, bonusType: "dodge", target: "system.combat.defence", label: "Sash of Serenity" },
      use("sashSerenity", "Serenity", "", "daily")
    ],
    conditionals: [
      { kind: "modifier", value: 2, type: "resistance", label: "Sash of Serenity", scope: "Saving throws against fear effects", auto: true, when: SAVE_VS(["fear"]) },
      { kind: "modifier", value: 2, type: "resistance", label: "Sash of Serenity (the table decides)", scope: "Saving throws against fear effects", auto: false, when: { checkTypes: ["save"], not: { traits: ["fear"] } } }
    ],
    sheet: ["auto", "invested, +1 dodge DB; +2 resistance on saves against fear (automatic where the save's traits say so, offered otherwise). Its Use (once a day): for 1 minute, advantage on one save. Choose a kind (Fortitude, Reflex or Will) and it is taken on your next save of that kind, forced or not; choose any save, and it is offered on the saves you roll from the sheet and spent on the one you tick."]
  })
];

/* ------------------------------------------------------------------ */
/* Incense                                                              */
/* ------------------------------------------------------------------ */

const incenseLine = BOOK9.magic.wondrous.entries["MYSTIC INCENSE BURNER"].lines.find((l) => /^Incense for the burner/.test(l));
if (!incenseLine) throw new Error("Block 9: the Incense line is gone from the Mystic Incense Burner");
export const BLOCK9_GEAR = [
  doc("gear:Incense", "Incense", "gear", "icons/svg/fire.svg", {
    quantity: 1, weight: 0, price: number(/(\d+) gp/.exec(incenseLine)[1]), equipped: false, invested: false,
    hp: { value: 0, max: 0 }, traits: "",
    description: [md(incenseLine), how("auto", "one is burned each time the Mystic Incense Burner is lit (its Use).")].join("\n"),
    slot: "", uses: { value: 0, max: 0 }, itemSize: "T", itemLevel: 0, heldHands: 0, formulae: "", gearCategory: "Goods", gearCategoryInferred: true
  })
];
