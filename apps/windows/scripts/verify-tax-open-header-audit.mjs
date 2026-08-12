import fs from "node:fs";
const files=["packages/tax-open/src/OpenFormatHeaderComplianceValidator.ts","scripts/tax-open-header-audit.mjs"];
for(const f of files)if(!fs.existsSync(f))throw new Error(`missing ${f}`);
const src=fs.readFileSync(files[0],"utf8");
for(const token of ["TEMP_REGISTRATION_NUMBER","MISSING_MANUFACTURER_NUMBER","submissionReady","A000_TOTAL","EXPORT_ID_MATCH"]){if(!src.includes(token))throw new Error(`missing ${token}`)}
console.log("✓ Open Format header audit structure verified");
