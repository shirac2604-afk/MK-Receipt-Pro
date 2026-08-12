import fs from "node:fs";
const required = [
  "packages/database/src/migrations/002_receipt_core.ts",
  "packages/database/src/repositories/ReceiptRepository.ts",
  "packages/application/src/receipts/IssueReceiptService.ts",
  "packages/domain/src/money/MoneyService.ts",
  "packages/domain/src/receipts/ReceiptValidationService.ts",
  "packages/domain/src/receipts/ReceiptSnapshotService.ts",
  "packages/domain/src/receipts/ReceiptHashService.ts",
];
for (const file of required) if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
const migration = fs.readFileSync(required[0], "utf8");
for (const token of ["CREATE TABLE IF NOT EXISTS receipts", "amount_agorot", "receipt_number INTEGER NOT NULL UNIQUE", "business_snapshot_json", "content_hash"]) {
  if (!migration.includes(token)) throw new Error(`Receipt migration missing ${token}`);
}
console.log("✓ Receipt Core structure verified");
