# TRG Prime: Inner Tempest

A companion module for the **TRG Prime** system on Foundry VTT. It implements the *Inner Tempest* sourcebook (v1.2):

- four races and their twenty heritages
- eleven monastic backgrounds
- five classes (Disciple, Ghostwalker, Kensai, Mystic, Oathblade) built on the Focus trait
- seventeen skill actions
- feats and archetypes
- Dragon Companions
- monastic armour and weapons
- the Grimoire
- magic items

## Status

**0.7.1 — Blocks 1 to 6.** The four races, twenty heritages, their racial abilities and natural attacks, Scree Cant, the eleven backgrounds and the twenty-three General feats (Block 1); Chapter 4's seventeen skill actions (Block 2); the Disciple and the Mystic, the Monastic Paths, the Mystical Disciplines, Inner Discipline, the Technique feats and the Grimoire spells the disciplines grant (Block 3); the Ghostwalker, the Kensai and the Oathblade, and Chapter 6's weapons (Block 4); the racial feats (Block 5); the remaining class feats and the core class feats opened to the five classes (Block 6). Needs TRG Prime 3.670.1. The archetypes, Dragon Companions, armour, the rest of the Grimoire and the magic items follow block by block. The audits, rulings, core-dependency list, implementation matrix and automation report are in `docs/`, and `docs/PROGRESS.md` records where the build stands.

## Requirements

- Foundry VTT 14 (verified 14.367)
- TRG Prime 3.670.1 or later. Later blocks need more of the core APIs listed in `docs/INNER_TEMPEST_CORE_DEPENDENCIES.md`, and the minimum will rise with them.

## Installing

In Foundry's *Add-on Modules* tab, choose *Install Module* and paste this manifest URL:

```
https://raw.githubusercontent.com/snowtroll75-debug/trg-inner-tempest/main/module.json
```

Foundry then offers each new release as an update. To install a particular version by hand, download `trg-inner-tempest.zip` from the [releases](https://github.com/snowtroll75-debug/trg-inner-tempest/releases) and unzip it into `Data/modules/` (the archive's root folder is `trg-inner-tempest/`). Then enable the module in a TRG Prime world.

## Publishing

Pushing to `main` publishes a release when `module.json` carries a version with no release yet: `.github/workflows/release.yml` builds the zip with `tools/build-zip.mjs` and publishes it as `v<version>` with the asset `trg-inner-tempest.zip`. Raise `version` and the version in `download` together; the action refuses a `download` that doesn't name the new tag. A push that doesn't raise the version publishes nothing.

Content from this module joins the system's own pickers and grants. Every picker has a *Sourcebook* filter; choose "Inner Tempest" to see only this book's entries.

## Building from source

```bash
npm install
node tools/inventory/build-docs.mjs   # regenerate the matrix & automation report
node tools/content/extract-book-block3.mjs <it12.md>   # only when the book changes
node tools/build-packs.mjs            # author packs-source/ JSON and compile packs/
node tools/build-zip.mjs              # ../trg-inner-tempest-<version>.zip
```

Harnesses read the system from `TRG_PRIME_ROOT` (default `../core/trg-prime`):

```bash
node tools/verify-block1.mjs   # and verify-block2 … verify-block6, verify-weapons
node tools/mutate-block1.mjs   # and mutate-block2 … mutate-block6, mutate-weapons
```

## Known limitations

See `docs/INNER_TEMPEST_AUTOMATION_REPORT.md` for what each shipped feature reaches against its planned automation class, and the reason behind every C (partial) and D (manual) feature.
