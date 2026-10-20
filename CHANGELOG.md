# Changelog

## 0.0.0 — 20 Oct 2026 (scaffold, unreleased)

- Module scaffold:
  - `module.json` declares the "Inner Tempest" sourcebook flag and requires TRG Prime 3.663.5.
  - The entry script checks the system on `ready`.
  - Registration is empty.
- Pack and zip tooling adapted from Pillars of Faith 0.11.1. The zip build reads the archive back, as TRG Prime's own does.
- Planning documents:
  - The rules audit.
  - The core dependencies.
  - The implementation matrix and automation report, both generated from `tools/inventory/inventory.txt`.
  - The progress file.
