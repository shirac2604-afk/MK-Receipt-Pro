import fs from "node:fs";
const src=fs.readFileSync("packages/tax-open/src/TaxRegistrationDossierService.ts","utf8");
for(const token of ["11-REGISTRATION-READINESS.json","TAX_DOSSIER_OFFICIAL_REPORT_INVALID_PDF","מספר רישום תוכנה תקף בשדה 1006","REPORT-2.6.pdf","OPEN-FORMAT-HEADER-AUDIT.json"]){
  if(!src.includes(token))throw new Error(`missing dossier token: ${token}`);
}
console.log("Tax registration dossier audit: PASSED");
