/**
 * Builds docs/INNER_TEMPEST_IMPLEMENTATION_MATRIX.md and
 * docs/INNER_TEMPEST_AUTOMATION_REPORT.md from tools/inventory/inventory.txt.
 *
 * inventory.txt is the single source of truth: edit it, then re-run
 *   node tools/inventory/build-docs.mjs
 * Never hand-edit the generated documents.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const SRC = path.join(HERE, "inventory.txt");

const FIELDS = ["id", "chapter", "feature", "category", "mechanics", "deps", "auto", "impl", "blocker"];

export function parseInventory(text) {
  const rows = [];
  const sections = [];
  let section = "";
  for (const raw of text.split("\n")) {
    const lineText = raw.trimEnd();
    if (!lineText) continue;
    if (lineText.startsWith("## ")) { section = lineText.slice(3).trim(); sections.push(section); continue; }
    if (lineText.startsWith("#")) continue;
    const parts = lineText.split("|");
    if (parts.length !== FIELDS.length) throw new Error(`inventory: ${parts.length} fields, expected ${FIELDS.length}: ${lineText}`);
    const row = Object.fromEntries(FIELDS.map((k, i) => [k, parts[i].trim()]));
    row.section = section;
    if (!/^[ABCD]$/.test(row.auto)) throw new Error(`inventory: bad automation class "${row.auto}" on ${row.id}`);
    rows.push(row);
  }
  const ids = new Set();
  for (const r of rows) { if (ids.has(r.id)) throw new Error(`inventory: duplicate id ${r.id}`); ids.add(r.id); }
  return { rows, sections };
}

/** Test evidence each category of feature needs before it can be marked Tested. */
const VALIDATION = [
  [/^Race$/, "Pack loads; racial AE totals on a level-1 actor; languages & lore granted; sourcebook = Inner Tempest"],
  [/^Heritage$/, "Picker filtered by race; AE/conditional totals; granted abilities/spells resolve"],
  [/Racial ability/, "Grant resolves; effect totals or action card driven live"],
  [/^Background$/, "Bonus feat resolves; skill bonuses applied; specialist lore granted; wealth"],
  [/^Class$/, "Progression rows L1-L20 match table; HP/skills/proficiency; grants at each level; sequential & direct level change"],
  [/Class feature|Discipline ability|Archetype ability|Technique|Feat action/, "Granted at the right level; activation spends AP/Focus; outcome applied; Refocus restores; removal on loss"],
  [/Ghost Art|Combat Form|Mystic discipline|Sworn Oath/, "Selectable via choice; activation & effects; Focus spend/restore; stance exclusivity where relevant"],
  [/Skill action/, "Offered on the skill; DC & degree outcomes; requirements gate; reaction timing where applicable"],
  [/Racial feat|Class feat|General feat|Companion feat/, "Picker eligibility (prereqs, traits); passive totals or active workflow; usage limits; removal"],
  [/^Archetype$/, "Archetype picker gates & progression requirement; grants; class/tier unlocks"],
  [/Feat access/, "Each listed core feat offered to the right race/class and to no other"],
  [/Companion|Creature ability|Natural weapon/, "Companion creation & levelling vs table; abilities granted at table levels"],
  [/^Armour/, "Pack stats vs table; DR/ACP/MaxDex applied when worn; traits"],
  [/^Weapon$/, "Pack stats vs table; attack/damage/traits; proficiency by class"],
  [/Weapon trait/, "Trait behaviour driven in a live Strike"],
  [/^Spell/, "Pack stats vs book; cast as prepared & as innate; save/attack/damage/effect/duration"],
  [/Rune|Specific|Wondrous/, "Pack stats; invest/activate; frequency/Focus; effect applied"],
  [/Subsystem|Rule|Trait|Language|Reference|Rule text/, "Rule-level harness checks + live scenario"]
];
const validationFor = (cat) => (VALIDATION.find(([re]) => re.test(cat))?.[1]) ?? "Live test";

/** What each automation class drops to if the named core dependency is NOT taken. */
const DEGRADE = { D1: "C", D2: "C", D3: "B", D4: "C", D5: "C", D7: "B", D8: "C", D9: "B", D10: "D", D11: "C", D12: "C", D13: "C", D14: "C" };
const RANK = { A: 0, B: 1, C: 2, D: 3 };
export function withoutCore(row) {
  let worst = row.auto;
  for (const d of row.blocker.match(/\bD\d+\b/g) ?? []) {
    const to = DEGRADE[d];
    if (to && RANK[to] > RANK[worst]) worst = to;
  }
  return worst;
}
const statusFor = (row) => (row.blocker.match(/IT-C\d+/) ? `Blocked (${row.blocker.match(/IT-C\d+/g).join(", ")})` : "Not started");
const esc = (s) => String(s).replace(/\|/g, "/");

function matrix({ rows, sections }) {
  const counts = { A: 0, B: 0, C: 0, D: 0 };
  rows.forEach((r) => counts[r.auto]++);
  const blocked = rows.filter((r) => /IT-C\d+/.test(r.blocker)).length;
  const out = [];
  out.push("# Inner Tempest — Implementation Matrix");
  out.push("");
  out.push("_Generated from `tools/inventory/inventory.txt` by `tools/inventory/build-docs.mjs`. Do not edit by hand._");
  out.push("");
  out.push(`**Source:** TRG_Inner_Tempest_1_1.docx (v1.1). **Target system:** TRG Prime 3.663.5 + the core dependencies in INNER_TEMPEST_CORE_DEPENDENCIES.md.`);
  out.push("");
  out.push(`**${rows.length} features inventoried.** Target automation (with core dependencies): A ${counts.A} · B ${counts.B} · C ${counts.C} · D ${counts.D}. Blocked on a Critical ruling: ${blocked}. Implemented: 0. Tested: 0.`);
  out.push("");
  out.push("Legend:");
  out.push("- **Automation:** A = fully automated · B = automated with a user decision · C = partially automated (justified in the Automation Report) · D = manual or descriptive (justified).");
  out.push("- **Implementation:** PACK:<pack> = compendium entry · AE = transferred Active Effect · COND = conditional bonus · AUTO = registered feat automation · SA = registered skill action · RX = reaction (core D8) · STANCE = core stance helper (D7) · RIDER = strike damage rider · INNATE = granted innate spell · CHOICE = sub-pick (abilityChoices) · GRANT = levelled grant.");
  out.push("- **Blocker:** an audit entry (IT-…) that needs your ruling, or a core dependency (D…).");
  out.push("- **Status:** Not started · In progress · Implemented · Tested · Blocked.");
  out.push("");
  for (const section of sections) {
    const sr = rows.filter((r) => r.section === section);
    if (!sr.length) continue;
    out.push(`## ${section}`);
    out.push("");
    out.push("| ID | Chapter | Feature | Category | Mechanics | Dependencies | Automation | Implementation | Validation | Blocker | Status |");
    out.push("|---|---|---|---|---|---|---|---|---|---|---|");
    for (const r of sr) {
      out.push(`| ${r.id} | ${esc(r.chapter)} | ${esc(r.feature)} | ${esc(r.category)} | ${esc(r.mechanics)} | ${esc(r.deps)} | ${r.auto} | ${esc(r.impl)} | ${esc(validationFor(r.category))} | ${esc(r.blocker) || "—"} | ${statusFor(r)} |`);
    }
    out.push("");
  }
  return out.join("\n");
}

/** Why each C/D feature cannot go higher. Keep in step with the inventory. */
export const JUSTIFICATIONS = {
  "SYS-09": "D — rule text about detection; no game action to automate.",
  "SYS-10": "D — setting terminology; the book states it has no mechanical value.",
  "SYS-12": "C — the Meditation substitution and gate are automated; the creation itself runs through core crafting, whose item-design step is GM-adjudicated.",
  "H-08": "D — free movement across air between surfaces is a positioning rule; Foundry has no surface model to validate it.",
  "H-11": "D — reveals GM-held information (precious metal nearby); the card prompts the GM.",
  "GA-05": "D — tracking difficulty and trail concealment are GM-run exploration rules.",
  "GA-08": "C — Focus spend, AP and the card are automated; wall pathing isn't modelled by Foundry movement.",
  "GA-13": "C — Focus/AP, no-reactions and no-attack effect automated; passing through 1-inch gaps is a map judgement.",
  "KF-01": "C — the delay is a card-timing tool only; its mechanical payoff is undefined (IT-M10).",
  "FR-07": "D — as Shinryu: unsupported-air positioning.",
  "FR-14": "D — the book makes it a GM story boon.",
  "FR-21": "D — as Treasure Sense.",
  "FR-24": "D — silent signalling is roleplay.",
  "FR-30": "C — Fluid Form's advantage carries over automatically; whether the target is a valid Studied Target is checked against core's study flag, the likeness itself is narrative.",
  "FR-32": "D — purifying water is narrative; the +2 Nature conditional is offered.",
  "FR-46": "C — Focus/AP automated; crossing liquids and gaps is positioning.",
  "FC-04": "D — 'cross open ground without becoming observed' is a GM stealth judgement.",
  "FC-09": "C — the +5 ft is shown on jump results; 'adjacent to a wall while falling' is a map judgement.",
  "FC-49": "C — the module suppresses Aid bonuses it can see from allies' declared Aid actions; reactions and abilities from third parties aren't all tagged by source.",
  "FC-53": "D — as Between Glances.",
  "FG-02": "C — the -2 is applied in the Create dialog; choosing the quality is a GM call.",
  "FG-03": "C — the Very Hard note is shown; unlearned Artistry specialties aren't modelled as separate skills.",
  "FG-08": "C — the crit-at-full-speed rider is shown; Squeeze time is narrative.",
  "FG-21": "C — the feat flag lets the Ambush/Sniping actions accept spells; whether the attack qualifies is checked, the stealth situation is GM-run.",
  "DC-08": "D — undefined in the book (IT-C5).",
  "DC-09": "D — profiles not given (IT-C5).",
  "DC-15": "C — the reaction is offered; its tail attack profile is undefined (IT-C5).",
  "SP-03": "C — suppresses aging penalties only where the optional aging macro is used.",
  "SP-05": "C — range doubling is written to the ammunition; Foundry has no per-projectile range state, so the card reminds.",
  "SP-13": "D — divination misdirection is GM-adjudicated.",
  "SP-15": "C — the card computes whether a roll of 10 would succeed for checks the system can pre-evaluate; for others it prompts.",
  "SP-18": "C — the egg item and death prompt are automated; resurrection placement is a GM act.",
  "SP-21": "D — revealing tracks is GM information.",
  "AP-01": "C — optional macro sets age-category modifiers; birthdays and lifespans are campaign facts the GM enters.",
  "AP-02": "D — reference table."
};

function report({ rows }) {
  const out = [];
  const counts = (key) => rows.reduce((acc, r) => { const k = key(r); acc[k] = (acc[k] ?? 0) + 1; return acc; }, {});
  const target = counts((r) => r.auto);
  const degraded = counts((r) => withoutCore(r));
  out.push("# Inner Tempest — Automation Report");
  out.push("");
  out.push("_Generated from `tools/inventory/inventory.txt`. Nothing below has been implemented yet; this is the planned coverage, to be replaced feature by feature with tested results._");
  out.push("");
  out.push("## Planned coverage");
  out.push("");
  out.push("| Class | With core dependencies D1–D14 | Without them (module-only) |");
  out.push("|---|---|---|");
  for (const k of ["A", "B", "C", "D"]) out.push(`| ${k} | ${target[k] ?? 0} | ${degraded[k] ?? 0} |`);
  out.push(`| **Total** | ${rows.length} | ${rows.length} |`);
  out.push("");
  out.push("No feature is claimed as automated until its harness checks and live test pass. A feature that only posts its description to chat is class D, never A.");
  out.push("");
  out.push("## Features below A/B, with the reason");
  out.push("");
  const low = rows.filter((r) => r.auto === "C" || r.auto === "D");
  for (const r of low) {
    const why = JUSTIFICATIONS[r.id];
    if (!why) throw new Error(`report: no justification for ${r.id} (${r.auto})`);
    out.push(`- **${r.id} ${r.feature}** — ${why}`);
  }
  out.push("");
  out.push("## Features whose class depends on a core change");
  out.push("");
  out.push("| ID | Feature | With core | Without | Dependency |");
  out.push("|---|---|---|---|---|");
  for (const r of rows) {
    const w = withoutCore(r);
    if (w !== r.auto) out.push(`| ${r.id} | ${esc(r.feature)} | ${r.auto} | ${w} | ${(r.blocker.match(/\bD\d+\b/g) ?? []).join(", ")} |`);
  }
  out.push("");
  return out.join("\n");
}

if (process.argv[1] && process.argv[1].endsWith("build-docs.mjs")) {
  const inv = parseInventory(fs.readFileSync(SRC, "utf8"));
  const docs = path.join(ROOT, "docs");
  fs.mkdirSync(docs, { recursive: true });
  fs.writeFileSync(path.join(docs, "INNER_TEMPEST_IMPLEMENTATION_MATRIX.md"), matrix(inv) + "\n");
  fs.writeFileSync(path.join(docs, "INNER_TEMPEST_AUTOMATION_REPORT.md"), report(inv) + "\n");
  console.log(`build-docs: ${inv.rows.length} features in ${inv.sections.length} sections`);
}
