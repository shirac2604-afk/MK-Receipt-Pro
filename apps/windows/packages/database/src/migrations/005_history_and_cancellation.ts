import type { Migration } from "../types";

export const historyAndCancellationMigration: Migration = {
  version: 5,
  name: "history_and_cancellation",
  checksum: "sha256:mk-history-cancellation-v5",
  up(sql) {
    sql(`ALTER TABLE receipts ADD COLUMN cancellation_pdf_path TEXT`);
    sql(`ALTER TABLE receipts ADD COLUMN cancellation_pdf_hash TEXT`);
    sql(`ALTER TABLE receipts ADD COLUMN cancellation_pdf_size INTEGER`);
    sql(`ALTER TABLE receipts ADD COLUMN cancellation_pdf_created_at TEXT`);
    sql(`CREATE INDEX IF NOT EXISTS idx_receipts_issued_at ON receipts(issued_at)`);
    sql(`CREATE INDEX IF NOT EXISTS idx_receipts_amount ON receipts(amount_agorot)`);
  },
  verify(tableExists) {
    if (!tableExists("receipts")) throw new Error("Migration verification failed: missing table receipts");
  },
};
