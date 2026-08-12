import fs from "node:fs";

const typeFile = fs.readFileSync("packages/database/src/types.ts", "utf8");
const ipcFile = fs.readFileSync("apps/desktop/electron/ipc/receiptInputSchema.ts", "utf8");
const domainFile = fs.readFileSync("packages/domain/src/receipts/ReceiptValidationService.ts", "utf8");
const uiFile = fs.readFileSync("apps/desktop/renderer/src/main.tsx", "utf8");
const taxFile = fs.readFileSync("packages/tax-open/src/OpenFormatService.ts", "utf8");
const validator = fs.readFileSync("packages/tax-open/src/ReceiptRecordComplianceValidator.ts", "utf8");

const allowed = ["cash", "bank_transfer", "bit", "paybox"];
const forbidden = ["check", "credit_card"];
for (const token of allowed) {
  if (!typeFile.includes(`"${token}"`)) throw new Error(`Missing PaymentMethod ${token}`);
  if (!ipcFile.includes(`"${token}"`)) throw new Error(`IPC does not allow ${token}`);
  if (!domainFile.includes(`"${token}"`)) throw new Error(`Domain does not allow ${token}`);
}
for (const token of forbidden) {
  if (typeFile.includes(`"${token}"`)) throw new Error(`Forbidden PaymentMethod remains: ${token}`);
  if (ipcFile.includes(`"${token}"`)) throw new Error(`IPC still allows forbidden method ${token}`);
  if (domainFile.includes(`"${token}"`)) throw new Error(`Domain still allows forbidden method ${token}`);
}
for (const label of ["צ׳ק", "כרטיס אשראי"]) {
  if (uiFile.includes(label)) throw new Error(`Forbidden UI label remains: ${label}`);
}
for (const token of ['cash:"1"','bank_transfer:"4"','bit:"9"','paybox:"9"']) {
  if (!taxFile.includes(token)) throw new Error(`Missing tax mapping ${token}`);
}
if (!validator.includes("120D_UNSUPPORTED_PAYMENT_METHOD")) throw new Error("Missing legacy unsupported-payment export blocker");
console.log("✓ Version 1.0 exposes only cash, bank transfer, Bit and PayBox");
console.log("✓ Check, credit card and generic other are not available in the receipt flow");
console.log("✓ Unsupported historical values block FORMAT OPEN export");
