/**
 * Inner Tempest — the Appendix's aging rules (Block 9, 0.10.0). Pure; no
 * Foundry. The Foundry half is module/aging-workflow.mjs.
 *
 * WHAT IT DECIDES, FROM THE SHEET'S AGE AND RACE (interpretation 7):
 *
 *   the race's row       the Racial Age Categories table, transcribed below
 *                        and held against the book by tools/verify-block9.mjs
 *   the Natural Lifespan the GM's figure for this character when set (a
 *                        flag the sheet offers the GM, B9-10), otherwise the
 *                        race's: its stated lifespan, or the middle of its
 *                        range; none for the immortal and the unknown
 *   the thresholds       "Middle Aged begins at 50% of Natural Lifespan, Old
 *                        at 70% and Venerable at 85%", rounded to the nearest
 *                        year — EXCEPT where the table prints the race's own
 *                        (Dwarf, Halfling, Human, Kornargon, Tianzhi): those
 *                        stand, unless the GM sets a lifespan other than the
 *                        printed one ("The GM may adjust these ages for
 *                        individual creatures"). Tianzhi prints categories and
 *                        no lifespan, so its categories always stand.
 *   the category         Juvenile below adulthood; Adult to Middle Aged; and
 *                        on. The immortal (Ascendan, Elves) are never older
 *                        than Adult; an Orc, whose lifespan is unknown, is not
 *                        either until the GM gives one.
 *   the modifiers        the Effects of Aging table, which REPLACE each other
 *                        ("they are not added together"). Age Resistance
 *                        suppresses the Strength, Dexterity and Constitution
 *                        penalties; its bonuses, and a Juvenile's Dexterity
 *                        +1 and Wisdom −1, remain (interpretation 8).
 *
 * The modifiers ride one effect, "Age: <Category>", flagged
 * `flags.trg-prime.age` so TRG Prime 3.673.0 leaves them out of maximum HP and
 * the skill budget (C10, B9-11) while every other figure follows them.
 */

export const AGE_CATEGORIES = Object.freeze(["juvenile", "adult", "middleAged", "old", "venerable"]);
export const AGE_LABELS = Object.freeze({ juvenile: "Juvenile", adult: "Adult", middleAged: "Middle Aged", old: "Old", venerable: "Venerable" });
const ABILITIES = Object.freeze(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]);
const PHYSICAL = Object.freeze(["strength", "dexterity", "constitution"]);

/** The Effects of Aging table. */
export const AGE_EFFECTS = Object.freeze({
  juvenile: Object.freeze({ strength: -1, dexterity: 1, constitution: -1, intelligence: 0, wisdom: -1, charisma: 0 }),
  adult: Object.freeze({ strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 }),
  middleAged: Object.freeze({ strength: -1, dexterity: -1, constitution: -1, intelligence: 1, wisdom: 1, charisma: 1 }),
  old: Object.freeze({ strength: -2, dexterity: -2, constitution: -2, intelligence: 2, wisdom: 2, charisma: 2 }),
  venerable: Object.freeze({ strength: -3, dexterity: -3, constitution: -3, intelligence: 3, wisdom: 3, charisma: 3 })
});

/** "Middle Aged begins at 50% of Natural Lifespan, Old at 70% and Venerable at 85%." */
export const THRESHOLD_SHARES = Object.freeze({ middleAged: 0.5, old: 0.7, venerable: 0.85 });

/**
 * The Racial Age Categories table. `thresholds` where the book prints the
 * race's own; `lifespan` a number, a [low, high] range, or null; `minimum`
 * for Ryukari's "350+"; `immortal` for the two that never age past Adult.
 */
export const RACE_AGES = Object.freeze({
  Ascendan: Object.freeze({ adult: 70, immortal: true, lifespan: null }),
  Dwarf: Object.freeze({ adult: 40, thresholds: Object.freeze({ middleAged: 175, old: 245, venerable: 298 }), lifespan: 350 }),
  Elf: Object.freeze({ adult: 20, immortal: true, lifespan: null }),
  Gnome: Object.freeze({ adult: 40, lifespan: Object.freeze([500, 600]) }),
  Halfling: Object.freeze({ adult: 20, thresholds: Object.freeze({ middleAged: 75, old: 105, venerable: 128 }), lifespan: 150 }),
  Human: Object.freeze({ adult: 15, thresholds: Object.freeze({ middleAged: 45, old: 63, venerable: 77 }), lifespan: 90 }),
  Kornargon: Object.freeze({ adult: 19, thresholds: Object.freeze({ middleAged: 60, old: 84, venerable: 95 }), lifespan: 120 }),
  Orc: Object.freeze({ adult: 14, lifespan: null }),
  Miraku: Object.freeze({ adult: 18, lifespan: Object.freeze([220, 280]) }),
  Ryukari: Object.freeze({ adult: 25, lifespan: 350, minimum: true }),
  Scree: Object.freeze({ adult: 10, lifespan: Object.freeze([70, 100]) }),
  Tianzhi: Object.freeze({ adult: 20, thresholds: Object.freeze({ middleAged: 50, old: 71, venerable: 91 }), lifespan: null })
});

const round = (n) => Math.floor(Number(n) + 0.5);

/** "45", "45 years", "about 45" → 45; anything without a number → null. */
export function parseAge(text) {
  const m = /(\d+(?:\.\d+)?)/.exec(String(text ?? ""));
  if (!m) return null;
  const n = Math.floor(Number(m[1]));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** The race's row by name ("Orc ‡" and case are forgiven), or null. */
export function raceAgeRow(name) {
  const want = String(name ?? "").replace(/[^A-Za-z ]/g, "").trim().toLowerCase();
  const key = Object.keys(RACE_AGES).find((k) => k.toLowerCase() === want);
  return key ? { race: key, ...RACE_AGES[key] } : null;
}

/** The race's own lifespan: its stated one, its range's middle, or null. */
export function defaultLifespan(row) {
  if (!row || row.immortal) return null;
  if (Array.isArray(row.lifespan)) return round((row.lifespan[0] + row.lifespan[1]) / 2);
  return Number.isFinite(Number(row.lifespan)) && row.lifespan !== null ? Number(row.lifespan) : null;
}

/** The lifespan that stands: the GM's (a positive number) or the race's. */
export function lifespanOf(row, chosen = null) {
  if (!row || row.immortal) return null;
  const own = Math.floor(Number(chosen));
  if (chosen !== null && chosen !== undefined && chosen !== "" && Number.isFinite(own) && own > 0) return own;
  return defaultLifespan(row);
}

/**
 * The ages each category begins at: {adult, middleAged, old, venerable},
 * null for one the creature never reaches.
 */
export function ageThresholds(row, chosen = null) {
  if (!row) return null;
  const out = { adult: row.adult, middleAged: null, old: null, venerable: null };
  if (row.immortal) return out;
  const lifespan = lifespanOf(row, chosen);
  const gmSet = chosen !== null && chosen !== undefined && chosen !== "" && Number(chosen) > 0;
  const printedStands = row.thresholds && (row.lifespan === null || !gmSet || Number(chosen) === Number(row.lifespan));
  if (printedStands) return { ...out, ...row.thresholds };
  if (!lifespan) return out;
  for (const [cat, share] of Object.entries(THRESHOLD_SHARES)) out[cat] = round(lifespan * share);
  return out;
}

/** The category this age falls in, or null when there is no age or race. */
export function ageCategory(age, thresholds) {
  if (!thresholds || age === null || age === undefined || !Number.isFinite(Number(age))) return null;
  const a = Number(age);
  if (a < thresholds.adult) return "juvenile";
  if (thresholds.middleAged === null || a < thresholds.middleAged) return "adult";
  if (thresholds.old === null || a < thresholds.old) return "middleAged";
  if (thresholds.venerable === null || a < thresholds.venerable) return "old";
  return "venerable";
}

/**
 * The effect's changes for a category: one untyped change per ability the
 * table moves. `resisted` (Age Resistance) drops the physical penalties.
 */
export function ageChanges(category, { resisted = false } = {}) {
  const row = AGE_EFFECTS[category];
  if (!row) return [];
  const out = [];
  for (const ability of ABILITIES) {
    const value = row[ability];
    if (!value) continue;
    if (resisted && value < 0 && PHYSICAL.includes(ability)) continue;
    out.push({ key: `system.attributes.${ability}.untyped`, type: "custom", value: String(value) });
  }
  return out;
}

/**
 * Everything the workflow needs for one creature: {race, lifespan,
 * thresholds, category, changes, reachedLifespan}, or null when the sheet
 * gives no age or the race is not on the table.
 */
export function agingFor({ age, race, chosenLifespan = null, resisted = false } = {}) {
  const years = parseAge(age);
  const row = raceAgeRow(race);
  if (years === null || !row) return null;
  const thresholds = ageThresholds(row, chosenLifespan);
  const category = ageCategory(years, thresholds);
  const lifespan = lifespanOf(row, chosenLifespan);
  return {
    race: row.race, age: years, lifespan, thresholds, category,
    changes: ageChanges(category, { resisted }),
    reachedLifespan: Boolean(lifespan && years >= lifespan)
  };
}

/** The effect's name. */
export const ageEffectName = (category) => `Age: ${AGE_LABELS[category] ?? category}`;
