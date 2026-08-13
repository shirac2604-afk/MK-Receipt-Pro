import fs from "node:fs";

const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
const a = JSON.parse(fs.readFileSync("app.json", "utf8"));

const checks = [
  [p.version === "1.0.6", "package version 1.0.6"],
  [p.dependencies?.expo === "~56.0.0", "Expo SDK 56"],
  [p.dependencies?.["react-native"] === "0.85.3", "React Native 0.85.3"],
  [a.expo.version === "1.0.6", "app version 1.0.6"],
  [a.expo.android?.versionCode === 8, "versionCode 8"],
  [a.expo.android?.package === "il.mkreceiptpro.android", "stable Android package id"],
  [Boolean(p.scripts["verify:device-management"]), "device management audit"],
];

let ok = 0;
for (const [passed, name] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
  if (passed) ok++;
}

console.log(`Android 1.0.6 production release gate: ${ok}/${checks.length}`);
if (ok !== checks.length) process.exit(1);
