import fs from "node:fs";
const sql=fs.readFileSync("cloud/sql/004_receipt_issuance.sql","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const checks=[
 [pkg.version==="1.0.0-foundation.7.2","version 7.2"],
 [sql.includes("from receipt_number_reservations r"),"reservation alias"],
 [sql.includes("where r.id = p_reservation_id"),"qualified reservation id"],
 [sql.includes("r.receipt_number"),"qualified receipt number"],
 [sql.includes("r.status"),"qualified status"],
 [sql.includes("update receipt_sequences s"),"sequence alias"],
 [sql.includes("s.last_issued_number"),"qualified sequence field"],
 [sql.includes("from customers c"),"customer alias"],
 [sql.includes("v_receipt_id::uuid"),"explicit return value"]
];
let ok=0;
for(const [p,l] of checks){console.log(p?"PASS":"FAIL",l);if(p)ok++}
console.log(`SQL 42702 fix: ${ok}/${checks.length}`);
if(ok!==checks.length)process.exit(1);
