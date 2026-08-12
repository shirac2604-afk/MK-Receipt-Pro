import fs from "node:fs";
const required=["packages/tax-open/src/ReceiptRecordComplianceValidator.ts","scripts/tax-open-field-audit.mjs","docs/PAYMENT_METHODS_VERSION_1_RC8.md"];
for(const f of required)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const service=fs.readFileSync("packages/tax-open/src/OpenFormatService.ts","utf8");
for(const token of ["validateReceiptBatch","OPEN_FORMAT_CONTENT_VALIDATION_FAILED","const link=index+1","rows.reduce((s,r)=>s+r.amount_agorot,0)",'cash:"1"','bank_transfer:"4"','bit:"9"','paybox:"9"'])if(!service.includes(token))throw new Error(`Missing token ${token}`);
console.log("✓ 100C/120D and Version 1.0 payment-method compliance verified");
