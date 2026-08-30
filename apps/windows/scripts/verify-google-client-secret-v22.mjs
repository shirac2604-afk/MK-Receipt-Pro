import fs from "node:fs";
const s=fs.readFileSync("apps/desktop/electron/main/GoogleDriveSyncService.ts","utf8");
const p=JSON.parse(fs.readFileSync("package.json","utf8"));
const c=JSON.parse(fs.readFileSync("resources/google/oauth-client.json","utf8"));
const checks=[
 [s.includes("interface OAuthCredentials"),"credentials are resolved only in the main process"],
 [s.includes("client_secret:credentials.clientSecret"),"code exchange uses the packaged Desktop credential"],
 [s.includes("refresh_token:this.decryptRefreshToken()")&&s.includes("client_secret:credentials.clientSecret"),"refresh flow uses the same Desktop credential"],
 [!s.includes("setClientSecret("),"no user-entered secret surface"],
 [p.scripts["google:configure"]==="node scripts/set-google-oauth-secret.mjs","legacy command remains isolated"],
 [c.clientSecret==="","secret is not committed"],
 [p.version==="1.1.14","version"]
];
let ok=0;for(const[x,l]of checks){console.log(x?"PASS":"FAIL",l);if(x)ok++}
console.log(`${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
