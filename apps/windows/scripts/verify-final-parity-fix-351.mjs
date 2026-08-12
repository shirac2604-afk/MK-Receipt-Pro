import fs from "node:fs";
const sql=fs.readFileSync("cloud/sql/007_final_parity_cancel.sql","utf8");
const ui=fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8");
const svc=fs.readFileSync("apps/desktop/electron/main/SupabaseCloudService.ts","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const checks=[
 [pkg.version==="1.1.1-cloud.3.5.1","version 3.5.1"],
 [sql.includes("update public.receipts as r"),"qualified UPDATE alias"],
 [sql.includes("where r.id = p_receipt_id"),"qualified receipt id"],
 [sql.includes("revision = r.revision + 1"),"qualified revision"],
 [!ui.includes("ביטול קבלה בענן יתווסף בשלב הבא"),"removed disabled cloud note"],
 [ui.includes('title="ביטול קבלה"'),"visible history cancel action"],
 [ui.includes('onClick={()=>void cancel()}>בטל קבלה</button>'),"cancel enabled in details"],
 [svc.includes('rpc("cancel_receipt_cloud"'),"shared cancellation RPC"]
];
let ok=0; for(const [pass,label] of checks){console.log(pass?"PASS":"FAIL",label);if(pass)ok++;}
console.log(`Windows final parity fix: ${ok}/${checks.length}`); if(ok!==checks.length)process.exit(1);
