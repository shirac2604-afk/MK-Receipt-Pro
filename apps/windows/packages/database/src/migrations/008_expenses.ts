import type { Migration } from "../types";

export const migration008: Migration = {
  version: 8,
  name: "expenses",
  checksum: "sha256:mk-receipt-expenses-v1",
  up(sql) {
    sql(`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        expense_date TEXT NOT NULL,
        supplier_name TEXT NOT NULL,
        amount_agorot INTEGER NOT NULL CHECK (amount_agorot > 0),
        category TEXT NOT NULL,
        payment_method TEXT,
        notes TEXT,
        attachment_path TEXT,
        attachment_original_name TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT
    `);
    sql(`CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date)`);
    sql(`CREATE INDEX IF NOT EXISTS idx_expenses_supplier ON expenses(supplier_name)`);
  },
  verify(tableExists) {
    if (!tableExists("expenses")) throw new Error("Migration verification failed: missing table expenses");
  },
};
