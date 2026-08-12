import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import packageJson from "../package.json" with { type: "json" };

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const outputDir = path.join(root, "resources", "release");
fs.mkdirSync(outputDir, { recursive: true });

let commit = "unavailable";
try {
  commit = execSync("git rev-parse --short HEAD", { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
} catch {}

const build = {
  productName: "מפתחות להצלחה",
  internalName: "MK Receipt Pro",
  version: packageJson.version,
  channel: packageJson.version.includes("-") ? "release-candidate" : "development",
  buildNumber: process.env.BUILD_NUMBER ?? "local",
  commit,
  builtAt: new Date().toISOString(),
  appId: packageJson.build.appId,
  schemaVersion: 9,
  pdfTemplateVersion: 1,
  backupFormatVersion: 1,
};

fs.writeFileSync(path.join(outputDir, "build.json"), JSON.stringify(build, null, 2) + "\n", "utf8");
console.log(`✓ build metadata generated for ${build.productName} ${build.version}`);
