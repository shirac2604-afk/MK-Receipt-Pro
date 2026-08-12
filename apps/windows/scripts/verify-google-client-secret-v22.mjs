import fs from "node:fs";
const s=fs.readFileSync("apps/desktop/electron/main/GoogleDriveSyncService.ts","utf8");
const p=JSON.parse(fs.readFileSync("package.json","utf8"));
const c=JSON.parse(fs.readFileSync("resources/google/oauth-client.json","utf8"));
const checks=[
 [s.includes("resolveClientSecret"),"secret resolver"],
 [s.includes("client_secret:clientSecret"),"secret in code exchange"],
 [s.includes("refresh_token:this.decryptRefreshToken()"),"refresh flow retained"],
 [s.includes("GOOGLE_OAUTH_CLIENT_SECRET_NOT_CONFIGURED"),"missing-secret guard"],
 [p.scripts["google:configure"]==="node scripts/set-google-oauth-secret.mjs","local configure command"],
 [c.clientSecret==="","secret not embedded"],
 [p.version==="1.1.0-dev.22","version"]
];
let ok=0;for(const[x,l]of checks){console.log(x?"PASS":"FAIL",l);if(x)ok++}
console.log(`${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
