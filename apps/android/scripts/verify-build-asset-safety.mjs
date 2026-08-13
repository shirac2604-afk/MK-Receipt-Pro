import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BLOCKED_EXTENSIONS = new Set([".icns", ".jxl", ".heif", ".heic"]);
const SKIP_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  ".expo",
  ".gradle",
  "build",
  "dist",
]);

const blockedFiles = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRECTORIES.has(entry.name)) continue;

    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (BLOCKED_EXTENSIONS.has(extension)) {
      blockedFiles.push(path.relative(ROOT, fullPath).replaceAll("\\", "/"));
    }
  }
}

walk(ROOT);

const noBlockedAssets = blockedFiles.length === 0;
console.log(noBlockedAssets ? "PASS" : "FAIL", "no Metro image-size risky asset formats in source tree");

if (!noBlockedAssets) {
  for (const file of blockedFiles) console.log(`BLOCKED ${file}`);
  console.error("ICNS/JXL/HEIF/HEIC source assets are blocked until the upstream image-size advisories are patched.");
  process.exit(1);
}

console.log("Android build asset safety: 1/1");
