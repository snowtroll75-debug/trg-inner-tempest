# TRG Prime: Inner Tempest

A companion module for the **TRG Prime** system on Foundry VTT. It implements the *Inner Tempest* sourcebook (v1.1):

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

**0.0.0, a scaffold.** No content ships yet. The audit, core-dependency list and implementation matrix are in `docs/`, and `docs/PROGRESS.md` records where the build stands.

## Requirements

- Foundry VTT 14 (verified 14.367)
- TRG Prime 3.663.5 or later. Building the classes and reactions needs the core APIs listed in `docs/INNER_TEMPEST_CORE_DEPENDENCIES.md`, so the minimum version will rise to the core release that carries them.

## Installing

Install the zip through Foundry's *Install Module* dialog, or unzip it into `Data/modules/`. The archive's root folder is `trg-inner-tempest/`. Then enable the module in a TRG Prime world.

Content from this module joins the system's own pickers and grants. Every picker has a *Sourcebook* filter; choose "Inner Tempest" to see only this book's entries.

## Building from source

```bash
npm install
node tools/inventory/build-docs.mjs   # regenerate the matrix & automation report
node tools/build-packs.mjs            # author packs-source/ JSON and compile packs/
node tools/build-zip.mjs              # ../trg-inner-tempest-<version>.zip
```

Harnesses read the system from `TRG_PRIME_ROOT` (default `../../sys/trg-prime`).

## Known limitations

See `docs/INNER_TEMPEST_AUTOMATION_REPORT.md` for each feature's planned automation class, and the reason behind every C (partial) and D (manual) feature.
