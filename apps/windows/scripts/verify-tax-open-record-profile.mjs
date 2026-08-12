import fs from "node:fs";
const files=[
  "packages/tax-open/src/OpenFormatRecordProfile.ts",
  "packages/tax-open/src/OpenFormatService.ts",
  "packages/tax-open/src/OpenFormatPreflightValidator.ts",
  "docs/TAX_OPEN_D110_DECISION_RC9.md"
];
for(const file of files) if(!fs.existsSync(file)) throw new Error(`missing ${file}`);
const service=fs.readFileSync(files[1],"utf8");
if(!service.includes('alpha("C100",4)')||!service.includes('alpha("D120",4)')) throw new Error("C100/D120 emitters missing");
if(service.includes('alpha("D110",4)')) throw new Error("D110 must not be emitted in receipt-only profile");
const preflight=fs.readFileSync(files[2],"utf8");
if(!preflight.includes("validateReceiptOnlyRecordCounts")) throw new Error("receipt-only profile is not enforced");
console.log("✓ Receipt-only Open Format profile is documented and enforced");
