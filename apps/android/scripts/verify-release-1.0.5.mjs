import fs from "node:fs";

const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
const a = JSON.parse(fs.readFileSync("app.json", "utf8"));

const isProductionPackage = p.version === "1.0.5";
const isSecurityExpo56Experiment =
  p.version === "1.0.6-security.8b" &&
  typeof p.dependencies?.expo === "string" &&
  p.dependencies.expo.startsWith("~56.");

const checks = [
  [isProductionPackage || isSecurityExpo56Experiment, "package version/context"],
  [a.expo.version === "1.0.5", "app version 1.0.5"],
  [a.expo.android.versionCode === 7, "versionCode 7"],
  [Boolean(p.scripts["verify:device-management"]), "device management audit"],
];

let ok = 0;
for (const [passed, name] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
  if (passed) ok++;
}

console.log(`Android 1.0.5 production-regression gate: ${ok}/${checks.length}`);
if (ok !== checks.length) process.exit(1);
