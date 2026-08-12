import fs from "node:fs";
const app=fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8");
const sync=fs.readFileSync("apps/desktop/electron/main/GoogleDriveSyncService.ts","utf8");
const report=fs.readFileSync("packages/application/src/reports/ReportService.ts","utf8");
const preload=fs.readFileSync("apps/desktop/electron/preload/preload.ts","utf8");
const checks=[
 [app.includes("הפקת קבלה"),"receipts"],
 [app.includes("הוצאות"),"expenses"],
 [app.includes("לקוחות"),"customers"],
 [app.includes("מרכז דיווחים"),"reports"],
 [app.includes("התחברות עם Google"),"Google login"],
 [sync.includes("client_secret:clientSecret"),"OAuth"],
 [sync.includes("lastLocalHash"),"conflict protection"],
 [report.includes("01-מע״מ-הצהרת-עוסק-פטור"),"VAT package"],
 [preload.includes('foundationVersion:"1.1.0-rc.2"'),"visible version"],
];
let ok=0;
for(const [pass,label] of checks){console.log(pass?"PASS":"FAIL",label);if(pass)ok++}
console.log(`RC2 regression: ${ok}/${checks.length}`);
if(ok!==checks.length)process.exit(1);
