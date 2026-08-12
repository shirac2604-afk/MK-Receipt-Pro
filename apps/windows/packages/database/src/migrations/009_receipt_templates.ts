import type { Migration } from "../types";

export const migration009: Migration = {
  version: 9,
  name: "receipt_templates",
  checksum: "sha256:mk-receipt-templates-v1",
  up(sql) {
    sql(`
      CREATE TABLE IF NOT EXISTS receipt_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        customer_id TEXT,
        description TEXT NOT NULL,
        amount_agorot INTEGER NOT NULL CHECK (amount_agorot > 0),
        payment_method TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      ) STRICT
    `);
    sql(`CREATE INDEX IF NOT EXISTS idx_receipt_templates_name ON receipt_templates(name)`);
    sql(`CREATE INDEX IF NOT EXISTS idx_receipt_templates_customer ON receipt_templates(customer_id)`);
  },
  verify(tableExists) {
    if (!tableExists("receipt_templates")) throw new Error("Migration verification failed: missing table receipt_templates");
  },
};
