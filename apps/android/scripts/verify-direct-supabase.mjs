import fs from "node:fs";
const cfg=fs.readFileSync("src/config/supabasePublic.ts","utf8");
const sup=fs.readFileSync("src/lib/supabase.ts","utf8");
const auth=fs.readFileSync("src/screens/AuthScreen.tsx","utf8");
const diag=fs.readFileSync("src/services/SupabaseDiagnostics.ts","utf8");
const checks=[
 [cfg.includes("https://ymcmmvnfrfntmllytpyu.supabase.co"),"Staging project URL embedded"],
 [!cfg.includes("https://noimclnzzuxcszdotmby.supabase.co"),"Production project is excluded from Phase 15 build"],
 [cfg.includes("sb_publishable_"),"publishable key embedded"],
 [!cfg.includes("eyJ") && !cfg.includes("sb_secret_"),"no secret/admin key pattern"],
 [sup.includes("SUPABASE_URL"),"client uses direct URL"],
 [sup.includes("SUPABASE_PUBLISHABLE_KEY"),"client uses direct publishable key"],
 [diag.includes("/auth/v1/settings"),"live auth diagnostics endpoint"],
 [auth.includes("בדיקת חיבור Supabase"),"diagnostic shown on auth error"]
];
let ok=0;
for(const [p,l] of checks){console.log(p?"PASS":"FAIL",l);if(p)ok++}
console.log(`Direct Supabase fix: ${ok}/${checks.length}`);
if(ok!==checks.length)process.exit(1);
