import fs from "node:fs";
const files={
 renderer:fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8"),
 preload:fs.readFileSync("apps/desktop/electron/preload/preload.ts","utf8"),
 ipc:fs.readFileSync("apps/desktop/electron/ipc/databaseHandlers.ts","utf8"),
 cloud:fs.readFileSync("apps/desktop/electron/main/SupabaseCloudService.ts","utf8"),
 service:fs.readFileSync("packages/database/src/DatabaseService.ts","utf8"),
 repo:fs.readFileSync("packages/database/src/repositories/ReceiptRepository.ts","utf8"),
 types:fs.readFileSync("packages/database/src/types.ts","utf8")
};
const duplicateProtection=
 files.renderer.includes("window.mkApi.customers.findDuplicates")&&
 files.renderer.includes("if(!forceSave)")&&
 files.renderer.includes("if(found.length){setDuplicates(found);setForceSave(true);return}")&&
 files.renderer.includes('forceSave&&duplicates.length?"שמור בכל זאת":"שמור לקוח"');
const checks=[
 [files.renderer.includes("＋ לקוח חדש"),"new customer button"],
 [files.renderer.includes("saveNewCustomer"),"new customer save flow"],
 [files.renderer.includes("customers.create(input)"),"renderer calls create API"],
 [files.preload.includes('create:(input:CustomerCreateInput)'),"secure preload create API"],
 [files.ipc.includes('customers:create'),"IPC customer create handler"],
 [files.cloud.includes('async createCustomer(input:CustomerCreateInput)'),"cloud create method"],
 [files.service.includes('createCustomer(input:CustomerCreateInput)'),"local service create method"],
 [files.repo.includes('createCustomer(input:CustomerCreateInput)'),"local repository create method"],
 [files.types.includes('interface CustomerCreateInput'),"create input type"],
 [duplicateProtection,"duplicate protection"],
 [files.cloud.includes('INVALID_CUSTOMER_PHONE')&&files.cloud.includes('INVALID_CUSTOMER_EMAIL'),"backend validation"]
];
let pass=0;for(const [ok,name] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)pass++;}
console.log(`Windows customer create fix: ${pass}/${checks.length}`);if(pass!==checks.length)process.exit(1);
