import fs from "node:fs";

const service=fs.readFileSync("src/services/LocalBackupService.ts","utf8");
const screen=fs.readFileSync("src/screens/MoreScreen.tsx","utf8");
const checks=[
 [service.includes("restorePickedLocalBackup")&&screen.includes("restoreLocalBackup"),"mobile local backup exposes a restore action"],
 [service.includes("payload.businessId!==businessId")&&service.includes("LOCAL_BACKUP_DIFFERENT_BUSINESS"),"restore rejects a backup from another business"],
 [service.includes('upsert(chunk,{onConflict:"id",ignoreDuplicates:true})'),"restore adds missing rows without overwriting existing rows"],
 [service.includes("LOCAL_BACKUP_TENANT_MISMATCH")&&service.includes("row.business_id===businessId"),"every restored row is tenant-scoped"],
 [service.includes("LOCAL_BACKUP_TOO_LARGE")&&service.includes("offset+=500"),"restore bounds backup size and writes in safe chunks"],
 [screen.includes("נתונים קיימים לא ישתנו")&&screen.includes("שחזור בטוח מגיבוי"),"screen explains the non-destructive restore rule"]
];
let failed=false;
for(const [ok,label]of checks){console.log(`${ok?"PASS":"FAIL"} ${label}`);if(!ok)failed=true;}
if(failed)process.exit(1);
