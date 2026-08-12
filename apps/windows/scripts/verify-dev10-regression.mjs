import fs from "node:fs";
const app=fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8");
const ipc=fs.readFileSync("apps/desktop/electron/ipc/databaseHandlers.ts","utf8");
const repo=fs.readFileSync("packages/database/src/repositories/ReceiptRepository.ts","utf8");
const pre=fs.readFileSync("apps/desktop/electron/preload/preload.ts","utf8");
const checks=[
 [app.includes("הוצאות"),"expenses remain"],
 [app.includes("כרטיס לקוח"),"customer cards remain"],
 [app.includes("תבניות לתקבולים חוזרים"),"templates remain"],
 [app.includes("shareCustomerReceipt"),"sharing remains"],
 [app.includes("כל אמצעי התשלום"),"advanced payment filter remains"],
 [app.includes("סכום גבוה לנמוך"),"advanced sort remains"],
 [ipc.includes("paymentMethod:[")||ipc.includes("paymentMethod:"),"advanced filters forwarded by IPC"],
 [pre.includes("createGoogleDrive"),"Google Drive backup remains"],
 [repo.includes("findCustomerDuplicates"),"duplicate detection"],
 [repo.includes("updateCustomer(input"),"customer editing"],
 [!repo.includes("lower(display_name)=lower(?)"),"no silent merge"],
 [pre.includes('foundationVersion:"1.1.0-dev.10"'),"dev10 version"]
];
let ok=0;for(const[c,l]of checks){console.log(c?"PASS":"FAIL",l);if(c)ok++}console.log(`dev10 regression: ${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
