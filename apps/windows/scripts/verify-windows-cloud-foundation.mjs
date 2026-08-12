import fs from "node:fs";
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const main=fs.readFileSync("apps/desktop/electron/main/main.ts","utf8");
const svc=fs.readFileSync("apps/desktop/electron/main/SupabaseCloudService.ts","utf8");
const handlers=fs.readFileSync("apps/desktop/electron/ipc/databaseHandlers.ts","utf8");
const preload=fs.readFileSync("apps/desktop/electron/preload/preload.ts","utf8");
const ui=fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8");
const checks=[
 [pkg.version==="1.1.1-cloud.1","version"],
 [Boolean(pkg.dependencies["@supabase/supabase-js"]),"supabase-js dependency"],
 [svc.includes("safeStorage.encryptString"),"encrypted session storage"],
 [svc.includes("signInWithPassword"),"email/password auth"],
 [svc.includes('.from("business_members")'),"business membership"],
 [svc.includes('.rpc("register_device"'),"Windows device registration"],
 [svc.includes('p_platform:"windows"'),"Windows platform"],
 [handlers.includes('cloud-account:connect'),"IPC connect"],
 [preload.includes("cloudAccount:Object.freeze"),"secure preload API"],
 [ui.includes("SharedCloudAccountCard"),"cloud account UI"],
 [main.includes("new SupabaseCloudService"),"service startup"]
];
let ok=0;for(const[p,l]of checks){console.log(p?"PASS":"FAIL",l);if(p)ok++}console.log(`Windows cloud foundation: ${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
