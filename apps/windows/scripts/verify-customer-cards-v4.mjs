import fs from "node:fs";
const checks=[
 ["types",fs.readFileSync("packages/database/src/types.ts","utf8").includes("interface CustomerProfile")],
 ["repository",fs.readFileSync("packages/database/src/repositories/ReceiptRepository.ts","utf8").includes("getCustomerProfile")],
 ["ipc",fs.readFileSync("apps/desktop/electron/ipc/databaseHandlers.ts","utf8").includes("customers:get-profile")],
 ["preload",fs.readFileSync("apps/desktop/electron/preload/preload.ts","utf8").includes("getProfile")],
 ["view",fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8").includes("function CustomersScreen")],
 ["history",fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8").includes("היסטוריית קבלות")],
 ["prefill",fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8").includes("mk-customer-prefill")],
 ["stats",fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8").includes("סך תקבולים פעילים")],
 ["css",fs.readFileSync("apps/desktop/renderer/src/styles.css","utf8").includes("customer-layout")],
 ["version",JSON.parse(fs.readFileSync("package.json","utf8")).version==="1.1.0-dev.4"]
];
for(const [name,ok] of checks)console.log(`${ok?"PASS":"FAIL"} ${name}`);if(checks.some(x=>!x[1]))process.exit(1);console.log(`${checks.length}/${checks.length} customer-card checks passed`);
