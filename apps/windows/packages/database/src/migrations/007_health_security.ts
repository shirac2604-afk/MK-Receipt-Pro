import type { Migration } from "../types";
export const migration007: Migration = {
  version: 7,
  name: "health_security",
  checksum: "sha256:mk-receipt-health-security-v1",
  up(sql) {
    sql(`CREATE TABLE IF NOT EXISTS error_logs (
      id TEXT PRIMARY KEY,
      error_code TEXT,
      severity TEXT NOT NULL CHECK(severity IN ('info','warning','error','critical')),
      module TEXT NOT NULL,
      user_message TEXT,
      technical_message TEXT,
      context_json TEXT NOT NULL DEFAULT '{}',
      resolved INTEGER NOT NULL DEFAULT 0 CHECK(resolved IN (0,1)),
      created_at TEXT NOT NULL
    ) STRICT`);
    sql(`CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at)`);
  },
  verify(tableExists) { if (!tableExists("error_logs")) throw new Error("Migration verification failed: missing table error_logs"); },
};
