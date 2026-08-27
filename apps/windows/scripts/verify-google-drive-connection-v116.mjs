import fs from "node:fs";

const service=fs.readFileSync("apps/desktop/electron/main/GoogleDriveSyncService.ts","utf8");
const ui=fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8");
const ipc=fs.readFileSync("apps/desktop/electron/ipc/databaseHandlers.ts","utf8");
const checks=[
 [service.includes('path.join(this.resourcesPath,"google","oauth-client.json")')&&!service.includes('"student-module","google-calendar-config.json"'),"uses packaged Desktop OAuth client instead of legacy Calendar configuration"],
 [service.includes("code_challenge_method\",\"S256"),"OAuth PKCE remains enabled"],
 [service.includes("const clientId=this.state.clientId"),"refresh uses the token's original client ID"],
 [service.includes("if(this.pushTimer){clearTimeout(this.pushTimer);this.pushTimer=null;}"),"disconnect cancels queued uploads"],
 [service.includes("if(this.running)await this.running.catch"),"disconnect waits for active sync"],
 [service.includes("void this.syncNow().catch"),"scheduled sync errors are handled"],
 [service.includes("if(oauthServer?.listening)oauthServer.close()"),"OAuth listener always closes"],
 [ipc.includes("Google Drive API אינו זמין"),"Drive API 403 has an actionable message"],
 [ui.includes("Google Calendar יישאר מחובר"),"disconnect scope is clear to the user"]
];
let ok=0;
for(const [passed,name] of checks){console.log(`${passed?"PASS":"FAIL"} ${name}`);if(passed)ok++;}
console.log(`Google Drive connection: ${ok}/${checks.length}`);
if(ok!==checks.length)process.exit(1);
