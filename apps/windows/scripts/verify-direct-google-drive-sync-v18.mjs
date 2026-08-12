import fs from "node:fs";
const svc=fs.readFileSync("apps/desktop/electron/main/GoogleDriveSyncService.ts","utf8");
const main=fs.readFileSync("apps/desktop/electron/main/main.ts","utf8");
const ipc=fs.readFileSync("apps/desktop/electron/ipc/databaseHandlers.ts","utf8");
const pre=fs.readFileSync("apps/desktop/electron/preload/preload.ts","utf8");
const app=fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8");
const db=fs.readFileSync("packages/database/src/DatabaseService.ts","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const checks=[
 [svc.includes("code_challenge_method\",\"S256"),"PKCE S256"],
 [svc.includes("127.0.0.1"),"loopback redirect"],
 [svc.includes("https://www.googleapis.com/auth/drive.file"),"narrow Drive scope"],
 [svc.includes("safeStorage.encryptString"),"encrypted refresh token"],
 [svc.includes("lastLocalHash"),"local state fingerprint"],
 [svc.includes("remoteModifiedTime"),"remote version tracking"],
 [svc.includes("גם הענן וגם המחשב השתנו"),"conflict prevention"],
 [db.includes("setAutomaticCloudSyncHook"),"automatic sync hook"],
 [db.includes("automaticCloudSyncHook?.()"),"hook on business changes"],
 [main.includes("initializeAndSync"),"startup synchronization"],
 [ipc.includes("cloud-sync:connect"),"IPC connect"],
 [ipc.includes("cloud-sync:force-push"),"conflict resolution IPC"],
 [pre.includes("cloudSync:Object.freeze"),"renderer bridge"],
 [app.includes("התחבר לחשבון Google"),"connect UI"],
 [app.includes("השתמש בגרסת הענן"),"cloud resolution UI"],
 [app.includes("השתמש בגרסת המחשב הזה"),"local resolution UI"],
 [pkg.version==="1.1.0-dev.18","package version"]
];
let ok=0;for(const [pass,label] of checks){console.log(pass?"PASS":"FAIL",label);if(pass)ok++}
console.log(`${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
