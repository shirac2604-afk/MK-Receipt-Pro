import fs from "node:fs";
const screen=fs.readFileSync("src/screens/MoreScreen.tsx","utf8");
const service=fs.readFileSync("src/services/BusinessReportService.ts","utf8");
const backup=fs.readFileSync("src/services/LocalBackupService.ts","utf8");
const checks=[
 [screen.includes("createAndShareYearlyReport")&&screen.includes("ייצוא דוח"),"settings exposes yearly CSV report export"],
 [service.includes("supabase.from(\"receipts\")")&&service.includes("supabase.from(\"expenses\")")&&service.includes("text/csv"),"report exports shared cloud receipts and expenses as CSV"],
 [backup.includes("createAndShareLocalBackup")&&backup.includes("MK_RECEIPT_MOBILE_BACKUP"),"local backup export remains available"]
];
let passed=0;for(const [ok,label] of checks){console.log(ok?"PASS":"FAIL",label);if(ok)passed++;}
console.log(`Mobile reports: ${passed}/${checks.length}`);if(passed!==checks.length)process.exit(1);
