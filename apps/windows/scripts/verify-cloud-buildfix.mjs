import fs from "node:fs";
const ipc=fs.readFileSync("apps/desktop/electron/ipc/databaseHandlers.ts","utf8");
const main=fs.readFileSync("apps/desktop/electron/main/main.ts","utf8");
const checks=[
 [ipc.includes("supabaseCloud:SupabaseCloudService"),"SupabaseCloudService parameter"],
 [ipc.includes("supabaseCloud.getStatus()"),"cloud status IPC"],
 [ipc.includes("supabaseCloud.signIn("),"cloud sign-in IPC"],
 [main.includes("registerDatabaseHandlers(databaseService,cloudSync,supabaseCloud)"),"main passes service"]
];
let ok=0;for(const [p,l] of checks){console.log(p?"PASS":"FAIL",l);if(p)ok++}
console.log(`Cloud build fix: ${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
