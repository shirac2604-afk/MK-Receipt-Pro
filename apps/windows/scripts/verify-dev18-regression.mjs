import fs from "node:fs";
const app=fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8");
const pre=fs.readFileSync("apps/desktop/electron/preload/preload.ts","utf8");
const db=fs.readFileSync("packages/database/src/DatabaseService.ts","utf8");
const checks=[
 [app.includes("תבניות לתקבולים חוזרים"),"templates"],
 [app.includes("עריכת פרטים"),"customers"],
 [app.includes("כל אמצעי התשלום"),"history filters"],
 [app.includes("צ'קליסט אישי"),"filing checklist"],
 [app.includes("הצהרת עוסק פטור"),"VAT reporting"],
 [pre.includes("createGoogleDrive"),"legacy backup API retained"],
 [pre.includes("cloudSync:Object.freeze"),"new cloud sync API"],
 [db.includes("createCloudSyncSnapshot"),"cloud snapshot"],
 [pre.includes('foundationVersion:"1.1.0-dev.18"'),"version"]
];
let ok=0;for(const [pass,label] of checks){console.log(pass?"PASS":"FAIL",label);if(pass)ok++}
console.log(`${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
