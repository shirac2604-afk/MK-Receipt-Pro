import fs from "node:fs";
const types=fs.readFileSync("packages/database/src/types.ts","utf8");
const repo=fs.readFileSync("packages/database/src/repositories/ReceiptRepository.ts","utf8");
const db=fs.readFileSync("packages/database/src/DatabaseService.ts","utf8");
const ipc=fs.readFileSync("apps/desktop/electron/ipc/databaseHandlers.ts","utf8");
const pre=fs.readFileSync("apps/desktop/electron/preload/preload.ts","utf8");
const app=fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8");
const checks=[
 [types.includes("CustomerUpdateInput"),"update type"],
 [types.includes("CustomerDuplicateMatch"),"duplicate type"],
 [repo.includes("findCustomerDuplicates"),"duplicate repository"],
 [repo.includes("updateCustomer(input"),"update repository"],
 [!repo.includes("lower(display_name)=lower(?)"),"no silent customer merge"],
 [db.includes("findCustomerDuplicates"),"duplicate service"],
 [db.includes("updateCustomer(input"),"update service"],
 [ipc.includes("customers:find-duplicates"),"duplicate IPC"],
 [ipc.includes("customers:update"),"update IPC"],
 [pre.includes("findDuplicates:"),"duplicate preload"],
 [pre.includes("update:(input:CustomerUpdateInput)"),"update preload"],
 [app.includes("עריכת פרטים"),"edit UI"],
 [app.includes("הערה פנימית"),"notes UI"],
 [app.includes("נמצאו כרטיסים עם אותו טלפון או אימייל"),"duplicate warning UI"],
 [app.includes("שמור בכל זאת"),"explicit override"],
 [app.includes("כרטיס הלקוח הקיים נטען"),"receipt duplicate prevention"],
 [pre.includes('foundationVersion:"1.1.0-dev.10"'),"version"]
];
let ok=0;for(const[c,l]of checks){console.log(c?"PASS":"FAIL",l);if(c)ok++}console.log(`${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
