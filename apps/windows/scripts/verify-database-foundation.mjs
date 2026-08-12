import fs from "node:fs";

const requiredFiles = [
  "packages/database/src/DatabaseConnection.ts",
  "packages/database/src/DatabaseService.ts",
  "packages/database/src/migrations/001_initial_schema.ts",
  "packages/database/src/repositories/BusinessSettingsRepository.ts",
  "apps/desktop/electron/ipc/databaseHandlers.ts",
  "tests/database/database.test.ts",
];

let failed = false;
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`✗ חסר קובץ: ${file}`);
    failed = true;
  }
}

const main = fs.readFileSync("apps/desktop/electron/main/main.ts", "utf8");
const preload = fs.readFileSync("apps/desktop/electron/preload/preload.ts", "utf8");
const migration = fs.readFileSync("packages/database/src/migrations/001_initial_schema.ts", "utf8");

const checks = [
  [main.includes("databaseService.initialize"), "מסד הנתונים מאותחל בתהליך הראשי"],
  [preload.includes("database:get-health"), "בדיקת התקינות חשופה דרך API מצומצם"],
  [migration.includes("schema_migrations"), "טבלת Migrations קיימת"],
  [migration.includes("receipt_sequences"), "טבלת רצף המספור קיימת"],
  [migration.includes("STRICT"), "הטבלאות הראשוניות משתמשות ב־SQLite STRICT"],
];

for (const [passed, label] of checks) {
  if (passed) console.log(`✓ ${label}`);
  else { console.error(`✗ ${label}`); failed = true; }
}

if (failed) process.exit(1);
console.log("✓ Database Foundation תקין מבחינת מבנה");
