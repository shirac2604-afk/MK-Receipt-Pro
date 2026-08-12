import fs from "node:fs";
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const cloud=fs.readFileSync("apps/desktop/electron/main/SupabaseCloudService.ts","utf8");
const ipc=fs.readFileSync("apps/desktop/electron/ipc/databaseHandlers.ts","utf8");
const repo=fs.readFileSync("packages/database/src/repositories/ReceiptRepository.ts","utf8");
const checks=[
 [pkg.version==="1.1.1-cloud.3.2","version 3.2"],
 [cloud.includes("async listCustomers()"),"cloud customer list"],
 [cloud.includes("async getCustomerProfile"),"cloud customer profile"],
 [cloud.includes("async findCustomerDuplicates"),"cloud duplicate detection"],
 [cloud.includes("async updateCustomer"),"cloud customer update"],
 [cloud.includes("ensureCustomerForReceipt"),"receipt customer linkage"],
 [cloud.includes("p_customer_id:customerId"),"cloud customer id in receipt"],
 [ipc.includes("supabaseCloud.listCustomers()"),"customers IPC cloud switch"],
 [ipc.includes("supabaseCloud.getReceiptCoreStatus()"),"dashboard core cloud switch"],
 [ipc.includes("supabaseCloud.getRangeReport(filters)"),"dashboard income cloud switch"],
 [cloud.includes("async getAnnualReport"),"annual cloud report"],
 [repo.includes("input.customerId?.trim()||crypto.randomUUID()"),"local mirror keeps cloud customer id"]
];
let ok=0;for(const[p,l]of checks){console.log(p?"PASS":"FAIL",l);if(p)ok++}console.log(`Cloud customers + dashboard: ${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
