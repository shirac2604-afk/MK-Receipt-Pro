import fs from "node:fs";
const s=fs.readFileSync("apps/desktop/electron/main/GoogleDriveSyncService.ts","utf8");
const i=fs.readFileSync("apps/desktop/electron/ipc/databaseHandlers.ts","utf8");
const p=fs.readFileSync("apps/desktop/electron/preload/preload.ts","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const checks=[
 [s.includes("error_description"),"Google error description captured"],
 [s.includes("tokenPayload.error"),"Google error code captured"],
 [i.includes("Google דחתה את שלב קבלת ההרשאה"),"clear user error"],
 [!i.includes("refresh_token"),"no token in UI mapping"],
 [pkg.version==="1.1.0-dev.21","package version"],
 [p.includes('foundationVersion:"1.1.0-dev.21"'),"app version"]
];
let ok=0;for(const[x,l]of checks){console.log(x?"PASS":"FAIL",l);if(x)ok++}
console.log(`${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
