import fs from "node:fs";
const sql=fs.readFileSync("cloud/sql/007_final_parity_cancel.sql","utf8");
const repo=fs.readFileSync("src/data/supabase/ReceiptRepository.ts","utf8");
const screen=fs.readFileSync("src/screens/ReceiptsScreen.tsx","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const checks=[
 [pkg.version==="1.0.0-foundation.8.4.1","version 8.4.1"],
 [sql.includes("update public.receipts as r"),"qualified UPDATE alias"],
 [sql.includes("where r.id = p_receipt_id"),"qualified receipt id"],
 [sql.includes("revision = r.revision + 1"),"qualified revision"],
 [repo.includes('rpc("cancel_receipt_cloud"'),"shared cancellation RPC"],
 [screen.includes("ביטול קבלה"),"cancellation UI"]
];
let ok=0; for(const [pass,label] of checks){console.log(pass?"PASS":"FAIL",label);if(pass)ok++;}
console.log(`Android final parity fix: ${ok}/${checks.length}`); if(ok!==checks.length)process.exit(1);
