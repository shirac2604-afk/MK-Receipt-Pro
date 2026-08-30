import fs from "node:fs";
const s=fs.readFileSync("apps/desktop/electron/main/GoogleDriveSyncService.ts","utf8");
const p=JSON.parse(fs.readFileSync("package.json","utf8"));
const c=JSON.parse(fs.readFileSync("resources/google/oauth-client.json","utf8"));
const checks=[
 [!s.includes("readClientSecret"),"no secret resolver"],
 [!s.includes("client_secret"),"no secret in code exchange"],
 [s.includes("refresh_token:this.decryptRefreshToken()"),"refresh flow retained"],
 [!s.includes("GOOGLE_OAUTH_CLIENT_SECRET_NOT_CONFIGURED"),"no missing-secret guard"],
 [p.scripts["google:configure"]==="node scripts/set-google-oauth-secret.mjs","legacy command remains isolated"],
 [!("clientSecret" in c)||c.clientSecret==="","secret not embedded"],
 [p.version==="1.1.13","version"]
];
let ok=0;for(const[x,l]of checks){console.log(x?"PASS":"FAIL",l);if(x)ok++}
console.log(`${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
