/**
 * Inner Tempest — Chapter 6's weapons (0.5.1). Graham, 23 October 2026: "Add
 * the weapons from chapter 6", weapons only.
 *
 * THE PRINTED TABLE AND TEXT ARE THE BOOK'S, read from
 * tools/content/book-text-weapons.json (cut by extract-book-weapons.mjs),
 * never retyped. Each cell is read into the field TRG Prime's weapons pack
 * uses for it:
 *   - Price "6 gp" → 6; Weight "2 lbs" → 2, "-" (the Fighting Fan) → 0
 *   - Damage "1d6 B" → 1d6 bludgeoning (B, P, S)
 *   - Size T, S, M, L → tiny, small, medium, large; FDC → fumbleDC
 *   - the table it sits in → Simple, Martial or Exotic, and Exotic is added to
 *     an exotic weapon's traits, as the core pack writes the Katana and Whip
 * The trait line is the book's, written the way the system reads two of them:
 *   - "Versatile - S" → "Versatile S" (the core's own form; the dash is not read)
 *   - "Reach (15 ft.)" → "Reach" with reachFeet 15 (the Whip's pattern)
 *   - "AR 2" stays in the traits and is also the weapon's armourRending
 *
 * Each description is the book's paragraphs, then the book's text for any of
 * the four Chapter 6 traits the weapon carries, then what TRG Prime does.
 */
import fs from "node:fs";
import { weapon } from "./builders.mjs";
import { md } from "./markdown.mjs";

const BOOK = JSON.parse(fs.readFileSync(new URL("./book-text-weapons.json", import.meta.url), "utf8"));

const TABLE_CATEGORY = { "MELEE SIMPLE WEAPONS": "Simple", "MELEE MARTIAL WEAPONS": "Martial", "MELEE EXOTIC WEAPONS": "Exotic" };
const DAMAGE_TYPE = { B: "bludgeoning", P: "piercing", S: "slashing" };
const SIZE = { T: "tiny", S: "small", M: "medium", L: "large" };
/** The description heading for a weapon, where it is not the table's name in capitals. */
const HEADING = { Kusarigama: "KUSIRIGAMA" };

/**
 * The icon: the nearest of TRG Prime's own weapon images (the module ships no
 * art). Named here so a reviewer sees each choice.
 */
const ICON = {
  Hanbo: "staff", Katar: "dagger", "Bo Staff": "staff", "Fighting Fan": "main-gauche", Jutte: "light-mace",
  Kama: "sickle", Kusarigama: "sickle", Nunchaku: "flail", Sai: "main-gauche", Tonfa: "club",
  "Butterfly Sword": "short-sword", "Meteor Hammer": "flail", Naginata: "glaive", Nodachi: "katana",
  Tetsubo: "greatclub", Wakizashi: "katana"
};

/** What the system does with each Chapter 6 trait. */
const TRAIT_AUTOMATION = {
  Backswing: "*Automated (TRG Prime 3.668.1):* a Strike with it that misses, or hits and inflicts no damage (its runes' damage counts), is taken back off your multiple attack penalty count. In Double Slice, or a compound action that counts its Strikes afterwards, such a Strike is not counted; a feat that prices the whole action costs nothing when none of its Strikes inflicted damage.",
  Brace: "*Automated (TRG Prime 3.668.1):* a Strike made through Ready against a mounted target gains +2 circumstance and one more die of base damage.",
  Monastic: "*Automated (TRG Prime 3.667.0):* an ability, feat or spell that applies to an unarmed strike also applies to it.",
  Twin: "*Automated (TRG Prime 3.668.1):* in Double Slice with two Twin weapons, when both swings hit and inflict damage, each deals 1 more damage of its type after the pair (its DR already met by the swing), unless the pair has already dropped the target."
};

/** "Versatile - S" → "Versatile S"; "Reach (15 ft.)" → "Reach". */
function systemTraits(printed) {
  return printed.split(",").map((t) => t.trim())
    .map((t) => t.replace(/^Versatile\s*-?\s*([BPS])$/, "Versatile $1").replace(/^Reach \((\d+) ft\.\)$/, "Reach"))
    .filter(Boolean);
}

function number(text, unit) {
  const t = String(text).trim();
  if (t === "-") return 0;
  const m = new RegExp(`^(\\d+(?:\\.\\d+)?)\\s*${unit}$`).exec(t);
  if (!m) throw new Error(`Chapter 6 weapons: cannot read "${t}" as ${unit}`);
  return Number(m[1]);
}

function build(row) {
  const category = TABLE_CATEGORY[row.table];
  if (!category) throw new Error(`Chapter 6 weapons: unknown table ${row.table}`);
  const dmg = /^(\d+d\d+) ([BPS])$/.exec(row.damage);
  if (!dmg) throw new Error(`Chapter 6 weapons: cannot read damage "${row.damage}" (${row.name})`);
  if (!SIZE[row.size]) throw new Error(`Chapter 6 weapons: unknown size "${row.size}" (${row.name})`);
  const reach = /Reach \((\d+) ft\.\)/.exec(row.traits);
  const ar = /\bAR (\d+)\b/.exec(row.traits);
  let traits = systemTraits(row.traits);
  if (category === "Exotic" && !traits.includes("Exotic")) traits = [...traits, "Exotic"].sort((a, b) => a.localeCompare(b));
  const heading = HEADING[row.name] ?? row.name.toUpperCase();
  const paragraphs = BOOK.descriptions[heading];
  if (!paragraphs?.length) throw new Error(`Chapter 6 weapons: no description for ${row.name} (${heading})`);
  const own = row.traits.split(",").map((t) => t.trim().replace(/\s.*$/, "")).filter((t) => BOOK.traits[t]);
  const notes = [];
  if (row.traits !== traits.filter((t) => t !== "Exotic").join(", ") || category === "Exotic") notes.push(`*Traits as printed:* ${row.traits}.`);
  if (row.name === "Butterfly Sword") notes.push("*Not automated:* drawing both as one Interact and separating them, and the rune that works only when both are wielded, are the GM's. The pack item is one sword: Double Slice and Twin need two on the character.");
  if (row.name === "Wakizashi") notes.push("*Proficiency:* the Ghostwalker and the Oathblade treat it as a martial weapon (registered with their classes).");
  const description = [
    ...paragraphs.map((p) => md(p)),
    ...own.flatMap((t) => [md(`**${t}:** ${BOOK.traits[t]}`), md(TRAIT_AUTOMATION[t])]),
    ...notes.map((n) => md(n))
  ].join("\n");
  return weapon({
    name: row.name,
    description,
    price: number(row.price, "gp"),
    weight: number(row.weight, "lbs?"),
    damage: dmg[1],
    damageType: DAMAGE_TYPE[dmg[2]],
    size: SIZE[row.size],
    fumbleDC: Number(row.fdc),
    group: row.group,
    category,
    traits: traits.join(", "),
    itemLevel: Number(row.level),
    armourRending: ar ? Number(ar[1]) : 0,
    reachFeet: reach ? Number(reach[1]) : null,
    img: `systems/trg-prime/assets/weapons/${ICON[row.name]}.png`
  });
}

export const CHAPTER6_WEAPONS = BOOK.rows.map(build);
