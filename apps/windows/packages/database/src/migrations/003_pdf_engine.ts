import type { Migration } from "../types";

export const pdfEngineMigration: Migration = {
  version: 3,
  name: "pdf_engine",
  checksum: "sha256:mk-pdf-engine-v3",
  up(sql) {
    sql(`ALTER TABLE receipts ADD COLUMN original_pdf_path TEXT`);
    sql(`ALTER TABLE receipts ADD COLUMN original_pdf_hash TEXT`);
    sql(`ALTER TABLE receipts ADD COLUMN original_pdf_size INTEGER`);
    sql(`ALTER TABLE receipts ADD COLUMN pdf_template_version INTEGER NOT NULL DEFAULT 1`);
    sql(`ALTER TABLE receipts ADD COLUMN pdf_created_at TEXT`);
  },
  verify(tableExists) {
    if (!tableExists("receipts")) throw new Error("Migration verification failed: missing table receipts");
  },
};
