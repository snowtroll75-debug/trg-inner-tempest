# Inner Tempest module — progress file

This is the durable record that lets work resume across sessions. Update it at the end of every working session. Status here must match `docs/INNER_TEMPEST_IMPLEMENTATION_MATRIX.md`, which is generated from `tools/inventory/inventory.txt`.

## Current state — 20 Oct 2026

- **Stage:** 1 (Discovery) and 2 (Audit) are done. **Stage 3 (Architecture) is drafted and waiting on Graham.**
- **Module:** `trg-inner-tempest` 0.0.0, a scaffold only. It has a manifest with the sourcebook flag, an entry script, an empty registration, pack and zip tooling copied from Pillars of Faith, and the inventory generator. **No content, and nothing released.**
- **Implemented:** 0 of 406 features. **Tested:** 0.
- **Nothing pushed or published.** There is no GitHub repo for this module yet. When one is approved, it would mirror `snowtroll75-debug/trg-pillars-of-faith`.

## Inputs (attach these again in a new session)

- The book: `TRG_Inner_Tempest_1_1.docx` (v1.1). Convert it with `pandoc -t gfm --wrap=none`; strip the `<img>` tags for reading.
- The system: `trg-prime-3.663.5.zip`, which includes `tools/`. Run `npm install` in it before any harness.
- Companion modules, for regression checks: `trg-pillars-of-faith-0.11.1.zip` and `fiends-and-fables-prime-0.45.0.zip`.
- Run harnesses with `TRG_PRIME_ROOT=<path>/trg-prime`.

## Documents

| File | What |
|---|---|
| `docs/INNER_TEMPEST_RULES_AUDIT.md` | 9 Critical, 27 Major, 41 Minor and 8 Improvement entries. Each keeps the published rule, the interim build and the proposed amendment separate. |
| `docs/INNER_TEMPEST_CORE_DEPENDENCIES.md` | D1–D15, the system APIs the module needs. |
| `docs/INNER_TEMPEST_IMPLEMENTATION_MATRIX.md` | All 406 features. *Generated.* |
| `docs/INNER_TEMPEST_AUTOMATION_REPORT.md` | Planned A/B/C/D coverage, with and without the core work, and a justification for every C and D feature. *Generated.* |
| `tools/inventory/inventory.txt` | The source of truth for the two generated files. Rebuild with `node tools/inventory/build-docs.mjs`. |

## Decisions taken (by Graham)

- 20 Oct 2026: Inner Tempest is a separate companion module. It uses the Focus framework, with no Chi pool. Nothing is pushed or published without approval.

## Waiting on Graham

1. Rulings on the **Critical** audit items IT-C1 to IT-C9. Each has an interim reading I can build to if he prefers.
2. Approval of the **core API release** (proposed 3.664.0 = D1–D10), or which parts he wants.
3. Confirmation of the module id `trg-inner-tempest` and the pack names below.
4. Whether a GitHub repo should be created for the module, and when.

## Planned block order

This follows the Pillars of Faith rhythm: audit and take rulings, then implement, then add verify and mutate harnesses, then run the sweep, then zip, then live-test in TRG V14. Only after that does the next block start.

| Block | Content | Needs core |
|---|---|---|
| 0 (core 3.664.0) | Focus and Refocus APIs (D1–D6), stance helper (D7), reaction registration (D8), derived hook (D9) | n/a |
| 1 | Foundations: 4 races, 20 heritages, racial abilities, 11 backgrounds, Scree Cant, traits; armour and weapons | D5; D11/D13 for some weapon traits |
| 2 | Ch4: the 17 skill actions; checking core's Refocus against the book | D8 for 4 reactions |
| 3 | Disciple and Mystic, Monastic Paths, Mystic disciplines, Inner Discipline and its techniques | D1, D2, D3, D5, D7, D9, D12 |
| 4 | Ghostwalker (Ghost Arts), Kensai (Combat Forms), Oathblade (Challenge, Oaths) | D7, D8, D9 |
| 5 | Racial feats (47) and existing-feat access | D4, D8 |
| 6 | Class feats (54) and general feats (22) | D7, D8, D14 |
| 7 | Archetypes (21) | D7, D11, D12 |
| 8 | Grimoire (25 spells) | D4, D8 |
| 9 | Magic items and the aging appendix | D6 |
| 10 | Dragon Companions | D10, plus the IT-C5 rulings |

**Planned packs:** it-races, it-heritages, it-backgrounds, it-classes, it-abilities, it-feats, it-spells, it-companions, it-armour, it-weapons, it-runes, it-specific-items, it-wondrous. Each carries `flags.trg-prime.extends`.

## Core facts learnt (3.663.5) that the build relies on

- **Focus:** "expended" means the item's per-day uses are spent (`system.usesValue` below `itemUsesMax`). Refocus restores **one** use to **one** chosen item (`combat/refocus.mjs`), and its result ladder is the book's Chapter 7 version. Daily preparation refills uses, but not the rune or wondrous Focus flags (D6).
- **Stances:** `enterFeatStance` is private (`feats-workflow.mjs:1607`). It allows one stance (two with Stance Mastery) and a one-round wait between stances, and creates an effect flagged `featStance`.
- **Flourish:** core enforces once per turn (`traits.mjs`).
- **Innate:** DC = 10 + ability + level; attack = ability + level; full warp; caster level = level. That matches Chapter 7. There is no per-spell ability override (D5).
- **Companions:** hard-wired to "Animal Companion", one per master (D10).
- **The system has no TypeDataModels.** It is `template.json`-based, so transferred effects do reach template fields. Effects apply before derivation.
- There is no `CONFIG.TRG_PRIME`; it is `CONFIG.TRG`. There is no `_evaluateExternalFeatOptionPrereqs`. Feat gating by trait goes through `registerFeatGate`.
- Core names that differ from the book: Stabilise, Self Healing, Fireball, Perform, Intimidate, Shape Of The Humanoid, Short Bow. Shadow Step is a spell, not a feat.

## Session log

- **20 Oct 2026, session 1:** read the whole book; mapped the system (three agents plus direct reads); cross-referenced every core name the book uses against the packs; wrote the audit, the core dependencies, the inventory and generated docs, and the scaffold.
