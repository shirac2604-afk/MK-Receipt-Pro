import type { Migration } from "../types";

export const migration010: Migration = {
  version: 10,
  name: "tax_authority_transmissions",
  checksum: "sha256:mk-tax-authority-transmissions-v1",
  up(sql) {
    sql(`
      CREATE TABLE IF NOT EXISTS tax_authority_transmissions (
        id TEXT PRIMARY KEY,
        environment TEXT NOT NULL CHECK (environment IN ('sandbox','production')),
        case_number TEXT NOT NULL,
        start_period TEXT NOT NULL,
        end_period TEXT NOT NULL,
        transmission_unique_id TEXT,
        file_unique_id TEXT NOT NULL UNIQUE,
        file_name TEXT NOT NULL,
        file_kind TEXT NOT NULL CHECK (file_kind IN ('INI','BKM','OTHER')),
        status TEXT NOT NULL CHECK (status IN ('Pending','Uploaded','Approved','Rejected','Error')),
        description TEXT NOT NULL DEFAULT '',
        error_code INTEGER,
        error_message TEXT,
        uploaded_at TEXT,
        status_updated_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT
    `);
    sql(`CREATE INDEX IF NOT EXISTS idx_tax_transmissions_status ON tax_authority_transmissions(status)`);
    sql(`CREATE INDEX IF NOT EXISTS idx_tax_transmissions_period ON tax_authority_transmissions(start_period,end_period)`);
    sql(`CREATE INDEX IF NOT EXISTS idx_tax_transmissions_case ON tax_authority_transmissions(case_number)`);
  },
  verify(tableExists) {
    if (!tableExists("tax_authority_transmissions")) throw new Error("Migration verification failed: missing table tax_authority_transmissions");
  },
};
