import fs from "node:fs";
const files={
 service:"packages/tax-open/src/OpenFormatService.ts",
 ipc:"apps/desktop/electron/ipc/databaseHandlers.ts",
 package:"packages/tax-open/src/SimulatorSubmissionPackageService.ts",
 types:"packages/database/src/types.ts",
};
for(const [name,file] of Object.entries(files)){if(!fs.existsSync(file))throw new Error(`Missing ${name}: ${file}`)}
const service=fs.readFileSync(files.service,"utf8");
const ipc=fs.readFileSync(files.ipc,"utf8");
const pack=fs.readFileSync(files.package,"utf8");
const types=fs.readFileSync(files.types,"utf8");
const checks=[
 [service.includes('source:"application_database"'),"database source marker"],
 [service.includes('fixture:false'),"fixture false marker"],
 [service.includes('OPEN-FORMAT-PRODUCTION-AUDIT.json'),"production audit output"],
 [service.includes('FROM receipts WHERE payment_date>=?'),"real receipt query"],
 [ipc.includes('REPORT-2.6.pdf')&&ipc.includes('REPORT-5.4.pdf'),"both PDF reports"],
 [pack.includes('OPEN-FORMAT-PRODUCTION-AUDIT.json'),"submission includes production audit"],
 [types.includes('report26PdfPath?:string'),"report 2.6 PDF type"],
];
for(const [ok,label] of checks){if(!ok)throw new Error(`Production export check failed: ${label}`)}
console.log(`Production Open Format audit: ${checks.length}/${checks.length} passed`);
