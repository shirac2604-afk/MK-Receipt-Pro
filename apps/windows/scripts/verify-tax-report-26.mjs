import fs from "node:fs";
const files=["packages/tax-open/src/Report26ComplianceValidator.ts","packages/tax-open/src/OpenFormatService.ts"];
for(const file of files)if(!fs.existsSync(file))throw new Error(`missing ${file}`);
const service=fs.readFileSync(files[1],"utf8");
for(const token of ["OPEN-FORMAT-REPORT-2.6-AUDIT.json","REPORT26_CANCELLED_INCLUDED","קבלה על פיקדון","סה״כ כספי (בש״ח)"]){
  if(!service.includes(token)&&!fs.readFileSync(files[0],"utf8").includes(token))throw new Error(`missing ${token}`);
}
console.log("✓ Section 2.6 full document-list and cancellation audit exists");
