import fs from "node:fs";
const types=fs.readFileSync("packages/database/src/types.ts","utf8");
const svc=fs.readFileSync("apps/desktop/electron/main/GoogleDriveSyncService.ts","utf8");
const ipc=fs.readFileSync("apps/desktop/electron/ipc/databaseHandlers.ts","utf8");
const pre=fs.readFileSync("apps/desktop/electron/preload/preload.ts","utf8");
const app=fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8");
const config=JSON.parse(fs.readFileSync("resources/google/oauth-client.json","utf8"));
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const checks=[
 [types.includes("CloudSyncConnectInput { email:string; }"),"email connect type"],
 [types.includes("accountEmail:string|null"),"connected email status"],
 [svc.includes("resolveClientId()"),"hidden build-time client id"],
 [svc.includes('process.env.MK_GOOGLE_OAUTH_CLIENT_ID'),"env client id option"],
 [svc.includes('"login_hint",normalizedEmail'),"Gmail login hint"],
 [svc.includes("openid email https://www.googleapis.com/auth/drive.file"),"identity + narrow Drive scopes"],
 [svc.includes("openidconnect.googleapis.com/v1/userinfo"),"verified Google account email"],
 [ipc.includes('cloudSync.connect(typeof input?.email==="string"?input.email:"")'),"email IPC"],
 [app.includes("כתובת Gmail"),"Gmail field"],
 [app.includes("התחברות עם Google"),"simple login button"],
 [!app.includes("Google OAuth Client ID"),"no client id in user UI"],
 [app.includes("הסיסמה מוזנת רק באתר Google"),"password safety text"],
 [pkg.version==="1.1.0-dev.19","package version"],
 [pre.includes('foundationVersion:"1.1.0-dev.19"'),"app version"],
 [typeof config.clientId==="string","build config file"]
];
let ok=0;for(const[pass,label]of checks){console.log(pass?"PASS":"FAIL",label);if(pass)ok++}
console.log(`${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
