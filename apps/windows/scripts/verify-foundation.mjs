import fs from "node:fs";
import path from "node:path";

const required = [
  "package.json",
  "tsconfig.base.json",
  "apps/desktop/electron/main/main.ts",
  "apps/desktop/electron/preload/preload.ts",
  "apps/desktop/renderer/index.html",
  "apps/desktop/renderer/src/main.tsx",
  "apps/desktop/renderer/src/styles.css",
  "tests/foundation.test.ts",
];

for (const file of required) {
  if (!fs.existsSync(path.resolve(file))) {
    console.error(`✗ חסר קובץ: ${file}`);
    process.exit(1);
  }
}

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
if (pkg.build?.appId !== "il.co.mkreceipt.desktop") {
  console.error("✗ App ID אינו קבוע");
  process.exit(1);
}

const main = fs.readFileSync("apps/desktop/electron/main/main.ts", "utf8");
const securityChecks = [
  ["nodeIntegration", /nodeIntegration\s*:\s*false/],
  ["contextIsolation", /contextIsolation\s*:\s*true/],
  ["sandbox", /sandbox\s*:\s*true/],
  ["webSecurity", /webSecurity\s*:\s*true/],
];
for (const [name, check] of securityChecks) {
  if (!check.test(main)) {
    console.error(`✗ חסרה הגדרת אבטחה: ${name}`);
    process.exit(1);
  }
}

console.log("✓ מבנה הפרויקט תקין");
console.log("✓ App ID קבוע");
console.log("✓ הגדרות האבטחה המרכזיות קיימות");
console.log("✓ קובצי Electron, React, TypeScript והבדיקות קיימים");
