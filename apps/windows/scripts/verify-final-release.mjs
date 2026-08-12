import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const pkg=JSON.parse(read("package.json"));
const oauth=JSON.parse(read("resources/google/oauth-client.json"));
const app=read("apps/desktop/renderer/src/main.tsx");
const preload=read("apps/desktop/electron/preload/preload.ts");
const main=read("apps/desktop/electron/main/main.ts");
const sync=read("apps/desktop/electron/main/GoogleDriveSyncService.ts");
const report=read("packages/application/src/reports/ReportService.ts");
const repo=read("packages/database/src/repositories/ReceiptRepository.ts");

const checks=[
 [pkg.version==="1.1.0","final package version"],
 [preload.includes('foundationVersion:"1.1.0"'),"visible final version"],
 [main.includes("MK-Receipt-Pro-Production"),"clean production namespace"],
 [sync.includes("MK-Receipt-Pro-Production-Sync.mkrbackup"),"production cloud sync file"],
 [repo.includes("COALESCE(MAX(receipt_number),1000)"),"fresh receipt baseline"],
 [app.includes("הפקת קבלה"),"receipts UI"],
 [app.includes("הוצאות"),"expenses UI"],
 [app.includes("לקוחות"),"customers UI"],
 [app.includes("מרכז דיווחים"),"reporting center"],
 [app.includes("התחברות עם Google"),"Google login"],
 [sync.includes("lastLocalHash"),"cloud conflict protection"],
 [sync.includes("safeStorage.encryptString"),"encrypted refresh token"],
 [report.includes("01-מע״מ-הצהרת-עוסק-פטור"),"VAT package"],
 [report.includes("02-מס-הכנסה-דיווח-שנתי"),"income-tax package"],
 [oauth.credentialStatus==="FINAL_ROTATED","NEW Google OAuth credential imported"],
 [typeof oauth.clientId==="string" && oauth.clientId.endsWith(".apps.googleusercontent.com"),"final Google client id"],
 [typeof oauth.clientSecret==="string" && oauth.clientSecret.length>10,"final Google client secret"],
 [pkg.build?.win?.target?.[0]?.target==="nsis","Windows NSIS installer"],
 [pkg.build?.nsis?.deleteAppDataOnUninstall===false,"business data retained on uninstall"]
];

let ok=0;
for(const [pass,label] of checks){
  console.log(pass?"PASS":"FAIL",label);
  if(pass)ok++;
}
console.log(`Final release: ${ok}/${checks.length}`);
if(ok!==checks.length){
  console.error("FINAL BUILD BLOCKED: import a NEW Google OAuth credential before building 1.1.0.");
  process.exit(1);
}
