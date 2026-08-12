import fs from "node:fs";
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const svc=fs.readFileSync("apps/desktop/electron/main/SupabaseCloudService.ts","utf8");
const ipc=fs.readFileSync("apps/desktop/electron/ipc/databaseHandlers.ts","utf8");
const sql=fs.readFileSync("cloud/sql/007_final_parity_cancel.sql","utf8");
const checks=[
 [pkg.version==="1.1.1-cloud.3.5","version"],
 [svc.includes('rpc("cancel_receipt_cloud"'),"cloud cancel RPC"],
 [svc.includes("CLOUD_CONNECTION_REQUIRED_FOR_CANCELLATION"),"online cancellation guard"],
 [ipc.includes("supabaseCloud.cancelReceipt"),"IPC routes cancellation to cloud"],
 [sql.includes("for update"),"row lock"],
 [sql.includes("if v_status='cancelled'"),"idempotent cancellation"],
 [sql.includes("revision=revision+1"),"revision update"],
 [sql.includes("user_has_business_access"),"business access check"]
];let ok=0;for(const [p,l] of checks){console.log(p?"PASS":"FAIL",l);if(p)ok++}console.log(`Windows final parity: ${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
