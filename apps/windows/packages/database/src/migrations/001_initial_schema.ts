import type { Migration } from "../types";

export const initialSchemaMigration: Migration = {
  version: 1,
  name: "initial_schema",
  checksum: "sha256:mk-receipt-initial-schema-v1",
  up(sql) {
    sql(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        migration_name TEXT NOT NULL,
        applied_at TEXT NOT NULL,
        checksum TEXT NOT NULL
      ) STRICT
    `);

    sql(`
      CREATE TABLE IF NOT EXISTS business_settings (
        id TEXT PRIMARY KEY,
        business_name TEXT NOT NULL,
        owner_name TEXT NOT NULL,
        business_number TEXT NOT NULL,
        tax_status TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        slogan TEXT,
        setup_completed INTEGER NOT NULL DEFAULT 0 CHECK (setup_completed IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT
    `);

    sql(`
      CREATE TABLE IF NOT EXISTS app_settings (
        setting_key TEXT PRIMARY KEY,
        setting_value TEXT,
        updated_at TEXT NOT NULL
      ) STRICT
    `);

    sql(`
      CREATE TABLE IF NOT EXISTS receipt_sequences (
        sequence_key TEXT PRIMARY KEY,
        next_number INTEGER NOT NULL CHECK (next_number > 0),
        last_issued_number INTEGER NOT NULL DEFAULT 0 CHECK (last_issued_number >= 0),
        updated_at TEXT NOT NULL,
        CHECK (next_number > last_issued_number)
      ) STRICT
    `);

    sql(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        event_data_json TEXT NOT NULL,
        previous_hash TEXT,
        entry_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
      ) STRICT
    `);

    sql(`
      CREATE TABLE IF NOT EXISTS health_checks (
        id TEXT PRIMARY KEY,
        overall_status TEXT NOT NULL CHECK (overall_status IN ('healthy', 'warning', 'critical')),
        score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
        results_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      ) STRICT
    `);

    sql(`CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at)`);
  },
  verify(tableExists) {
    const requiredTables = [
      "schema_migrations",
      "business_settings",
      "app_settings",
      "receipt_sequences",
      "audit_log",
      "health_checks",
    ];

    for (const tableName of requiredTables) {
      if (!tableExists(tableName)) {
        throw new Error(`Migration verification failed: missing table ${tableName}`);
      }
    }
  },
};
