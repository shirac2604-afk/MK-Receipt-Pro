import fs from "node:fs";
const required=["packages/tax-open/src/OpenFormatByteComplianceValidator.ts","scripts/tax-open-byte-audit.mjs","docs/TAX_OPEN_BYTE_AUDIT_RC11.md"];
for(const file of required)if(!fs.existsSync(file))throw new Error(`Missing ${file}`);
const service=fs.readFileSync("packages/tax-open/src/OpenFormatService.ts","utf8");
if(!service.includes("auditOpenFormatBytes"))throw new Error("OpenFormatService does not run byte audit");
if(!service.includes("OPEN-FORMAT-BYTE-AUDIT.json"))throw new Error("Byte audit output missing");
console.log("✓ Tax Open byte-level validator and integration are present");
