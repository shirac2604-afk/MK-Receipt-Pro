import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const source = fs.readFileSync("packages/database/src/migrations/001_initial_schema.ts", "utf8");
const statements = [...source.matchAll(/sql\(`([\s\S]*?)`\);/g)].map((match) => match[1]);
if (statements.length < 6) throw new Error("לא נמצאו כל פקודות ה-Migration");

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mk-receipt-smoke-"));
const databasePath = path.join(directory, "smoke.sqlite");
const db = new DatabaseSync(databasePath);

try {
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("BEGIN IMMEDIATE");
  for (const statement of statements) db.exec(statement);
  db.prepare(`INSERT INTO schema_migrations(version, migration_name, applied_at, checksum) VALUES (?, ?, ?, ?)`)
    .run(1, "initial_schema", new Date().toISOString(), "sha256:mk-receipt-initial-schema-v1");
  db.exec("COMMIT");

  const integrity = db.prepare("PRAGMA integrity_check").get();
  const tables = db.prepare(`SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`).get();
  if (Object.values(integrity)[0] !== "ok") throw new Error("SQLite integrity_check נכשל");
  if (tables.count < 6) throw new Error("לא נוצרו כל הטבלאות");

  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("INSERT INTO app_settings(setting_key, setting_value, updated_at) VALUES (?, ?, ?)")
      .run("theme", "dark", new Date().toISOString());
    throw new Error("rollback-test");
  } catch {
    db.exec("ROLLBACK");
  }
  const count = db.prepare("SELECT COUNT(*) AS count FROM app_settings").get();
  if (count.count !== 0) throw new Error("Rollback לא פעל");

  console.log(`✓ SQLite Migration smoke test עבר (${tables.count} טבלאות)`);
  console.log("✓ Transaction Rollback עבר");
  console.log("✓ PRAGMA integrity_check עבר");
} finally {
  db.close();
  fs.rmSync(directory, { recursive: true, force: true });
}
