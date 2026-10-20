#!/usr/bin/env node
/**
 * build-zip — the shippable module: module.json, scripts/, module/,
 * packs/ (compiled), packs-source/ (reviewable), tools/ (the harness),
 * docs/, README, CHANGELOG. Never node_modules. Output:
 * ../trg-inner-tempest-<version>.zip, whose ROOT is the module folder
 * (Foundry installs a zip into a folder named for the module id).
 *
 * After zipping, the archive is read back: the first entry must be the
 * module folder, every declared pack must be present, and nothing
 * excluded may have leaked in. (Copied from TRG Prime's own build-zip
 * read-back check; Pillars of Faith's zip has no read-back.)
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NAME = path.basename(ROOT);
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8"));
if (NAME !== manifest.id) throw new Error(`build-zip: folder "${NAME}" must be named for the module id "${manifest.id}"`);
const outDir = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : path.dirname(ROOT);
const out = path.join(outDir, `${manifest.id}-${manifest.version}.zip`);

const required = ["module.json", "README.md", "CHANGELOG.md", ...manifest.esmodules, ...manifest.packs.map((p) => `${p.path}/CURRENT`)];
for (const file of required) {
  if (!fs.existsSync(path.join(ROOT, file))) throw new Error(`build-zip: ${file} is missing`);
}

const EXCLUDE = ["node_modules", ".git", ".DS_Store", "LOCK", ".harness.lock", ".harness.snapshot.json"];
fs.rmSync(out, { force: true });
execFileSync("zip", ["-qr", out, NAME,
  "-x", `${NAME}/node_modules/*`, `${NAME}/.git/*`, "*/.DS_Store", "*/packs/*/LOCK",
  `${NAME}/tools/.harness.lock`, `${NAME}/tools/.harness.snapshot.json`], { cwd: path.dirname(ROOT) });

const entries = execFileSync("unzip", ["-Z1", out], { encoding: "utf8" }).split("\n").filter(Boolean);
if (entries[0] !== `${NAME}/`) throw new Error(`build-zip: archive root is "${entries[0]}", expected "${NAME}/"`);
for (const file of required) {
  if (!entries.includes(`${NAME}/${file}`)) throw new Error(`build-zip: ${file} did not make it into the archive`);
}
const leaked = entries.filter((e) => EXCLUDE.some((x) => e.split("/").includes(x)));
if (leaked.length) throw new Error(`build-zip: excluded files leaked in: ${leaked.slice(0, 5).join(", ")}`);
console.log(`build-zip: ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB, ${entries.length} entries, root ${NAME}/)`);
