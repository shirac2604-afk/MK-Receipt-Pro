import fs from "node:fs";
const config=JSON.parse(fs.readFileSync("resources/google/oauth-client.json","utf8"));
const app=fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8");
const pre=fs.readFileSync("apps/desktop/electron/preload/preload.ts","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const svc=fs.readFileSync("apps/desktop/electron/main/GoogleDriveSyncService.ts","utf8");
const checks=[
 [config.clientId==="115968204729-jec5n706vf99ong14c992n85fbi1u54i.apps.googleusercontent.com","Google client configured"],
 [app.includes("כתובת Gmail"),"Gmail field"],
 [app.includes("התחברות עם Google"),"Google sign-in button"],
 [!app.includes("Google OAuth Client ID"),"no client id field"],
 [svc.includes("resolveClientId"),"build config resolver"],
 [svc.includes("safeStorage.encryptString"),"encrypted token"],
 [svc.includes("drive.file"),"Drive file scope"],
 [pkg.version==="1.1.0-dev.20","package version"],
 [pre.includes('foundationVersion:"1.1.0-dev.20"'),"UI version"]
];
let ok=0;
for(const [pass,label] of checks){console.log(pass?"PASS":"FAIL",label);if(pass)ok++;}
console.log(`${ok}/${checks.length}`);
if(ok!==checks.length)process.exit(1);
