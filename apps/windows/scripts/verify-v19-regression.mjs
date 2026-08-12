import fs from "node:fs";
const app=fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8");
const svc=fs.readFileSync("apps/desktop/electron/main/GoogleDriveSyncService.ts","utf8");
const pre=fs.readFileSync("apps/desktop/electron/preload/preload.ts","utf8");
const checks=[
 [app.includes("תבניות לתקבולים חוזרים"),"templates"],
 [app.includes("עריכת פרטים"),"customers"],
 [app.includes("כל אמצעי התשלום"),"history filters"],
 [app.includes("צ'קליסט אישי"),"filing checklist"],
 [app.includes("הצהרת עוסק פטור"),"VAT center"],
 [app.includes("השתמש בגרסת הענן"),"conflict cloud choice"],
 [app.includes("השתמש בגרסת המחשב הזה"),"conflict local choice"],
 [svc.includes("lastLocalHash"),"conflict protection"],
 [svc.includes("safeStorage.encryptString"),"encrypted token"],
 [pre.includes("cloudSync:Object.freeze"),"cloud API retained"]
];
let ok=0;for(const[pass,label]of checks){console.log(pass?"PASS":"FAIL",label);if(pass)ok++}
console.log(`${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
