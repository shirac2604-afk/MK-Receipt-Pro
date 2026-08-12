import fs from "node:fs";
const required=[
 "cloud/sql/001_shared_database.sql",
 "src/config/cloud.ts",
 "src/data/cloud/CloudApiClient.ts",
 "src/data/cloud/CloudSyncRepository.ts",
 "src/services/SharedDataService.ts",
 "SHARED_DATABASE_SETUP_HE.md",
 "CLOUD_SECURITY_RULES_HE.md"
];
let ok=0;
for(const f of required){const pass=fs.existsSync(f);console.log(pass?"PASS":"FAIL",f);if(pass)ok++}
const sql=fs.readFileSync("cloud/sql/001_shared_database.sql","utf8");
const api=fs.readFileSync("src/data/cloud/CloudApiClient.ts","utf8");
const security=fs.readFileSync("CLOUD_SECURITY_RULES_HE.md","utf8");
const checks=[
 [sql.includes("create table if not exists customers"),"customers table"],
 [sql.includes("create table if not exists expenses"),"expenses table"],
 [sql.includes("create table if not exists receipts"),"receipts table"],
 [sql.includes("for update"),"atomic row lock for numbering"],
 [sql.includes("reserve_receipt_number"),"receipt reservation RPC"],
 [sql.includes("unique (business_id, receipt_number)"),"duplicate receipt number protection"],
 [api.includes("/rest/v1/customers"),"customer cloud client"],
 [api.includes("/rest/v1/expenses"),"expense cloud client"],
 [api.includes("/rest/v1/rpc/reserve_receipt_number"),"reservation cloud client"],
 [security.includes("אין Service Role Key"),"client secret protection rule"]
];
for(const [pass,label] of checks){console.log(pass?"PASS":"FAIL",label);if(pass)ok++}
console.log(`Cloud foundation: ${ok}/${required.length+checks.length}`);
if(ok!==required.length+checks.length)process.exit(1);
