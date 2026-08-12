import type { Migration } from "../types";

export const receiptCoreMigration: Migration = {
  version: 2,
  name: "receipt_core",
  checksum: "sha256:mk-receipt-core-v2",
  up(sql) {
    sql(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        notes TEXT,
        is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT
    `);

    sql(`
      CREATE TABLE IF NOT EXISTS receipts (
        id TEXT PRIMARY KEY,
        receipt_number INTEGER NOT NULL UNIQUE CHECK (receipt_number > 0),
        document_type TEXT NOT NULL DEFAULT 'receipt' CHECK (document_type = 'receipt'),
        payment_date TEXT NOT NULL,
        issued_at TEXT NOT NULL,
        client_name TEXT NOT NULL,
        client_phone TEXT,
        client_email TEXT,
        description TEXT NOT NULL,
        amount_agorot INTEGER NOT NULL CHECK (amount_agorot > 0),
        payment_method TEXT NOT NULL,
        reference_number TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
        cancelled_at TEXT,
        cancellation_reason TEXT,
        customer_id TEXT,
        business_snapshot_json TEXT NOT NULL,
        client_snapshot_json TEXT NOT NULL,
        receipt_snapshot_json TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      ) STRICT
    `);

    sql(`CREATE INDEX IF NOT EXISTS idx_receipts_number ON receipts(receipt_number)`);
    sql(`CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(payment_date)`);
    sql(`CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status)`);
    sql(`CREATE INDEX IF NOT EXISTS idx_receipts_client_name ON receipts(client_name)`);
    sql(`CREATE INDEX IF NOT EXISTS idx_receipts_customer_id ON receipts(customer_id)`);
    sql(`CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(display_name)`);
  },
  verify(tableExists) {
    for (const tableName of ["customers", "receipts"]) {
      if (!tableExists(tableName)) {
        throw new Error(`Migration verification failed: missing table ${tableName}`);
      }
    }
  },
};
