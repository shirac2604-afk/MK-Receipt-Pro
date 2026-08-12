import fs from "node:fs";

const read = p => fs.readFileSync(p,"utf8");
const pkg=JSON.parse(read("package.json"));
const app=read("apps/desktop/renderer/src/main.tsx");
const preload=read("apps/desktop/electron/preload/preload.ts");
const db=read("packages/database/src/DatabaseService.ts");
const sync=read("apps/desktop/electron/main/GoogleDriveSyncService.ts");
const report=read("packages/application/src/reports/ReportService.ts");

const checks=[
 [pkg.version==="1.1.0-rc.2","RC version"],
 [preload.includes('foundationVersion:"1.1.0-rc.2"'),"visible version"],
 [app.includes("הפקת קבלה"),"receipt issue UI"],
 [app.includes("הוצאות"),"expenses UI"],
 [app.includes("לקוחות"),"customers UI"],
 [app.includes("מרכז דיווחים"),"reporting center"],
 [app.includes("התחברות עם Google"),"Google login UI"],
 [sync.includes("safeStorage.encryptString"),"encrypted Google token storage"],
 [sync.includes("lastLocalHash"),"sync conflict protection"],
 [sync.includes("client_secret:clientSecret"),"Desktop OAuth token exchange"],
 [db.includes("createCloudSyncSnapshot"),"cloud snapshot"],
 [report.includes("01-מע״מ-הצהרת-עוסק-פטור"),"VAT reporting package"],
 [report.includes("02-מס-הכנסה-דיווח-שנתי"),"income-tax package"],
 [pkg.build?.win?.target?.[0]?.target==="nsis","Windows NSIS installer"],
 [pkg.build?.nsis?.createDesktopShortcut===true,"desktop shortcut"],
 [pkg.build?.nsis?.deleteAppDataOnUninstall===false,"uninstall preserves business data"],
];
let ok=0;
for(const [pass,label] of checks){console.log(pass?"PASS":"FAIL",label);if(pass)ok++}
console.log(`Release candidate: ${ok}/${checks.length}`);
if(ok!==checks.length)process.exit(1);
