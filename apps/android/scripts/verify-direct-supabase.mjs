import fs from "node:fs";
const cfg=fs.readFileSync(process.env.SUPABASE_CONFIG_PATH??"src/config/supabasePublic.ts","utf8");
const sup=fs.readFileSync("src/lib/supabase.ts","utf8");
const auth=fs.readFileSync("src/screens/AuthScreen.tsx","utf8");
const diag=fs.readFileSync("src/services/SupabaseDiagnostics.ts","utf8");
const stagingCfg=fs.readFileSync("src/config/supabasePublic.staging.ts","utf8");
const expectStaging=process.env.PHASE15_EXPECT_STAGING==="1";
const checks=[
 [expectStaging?cfg.includes("https://ymcmmvnfrfntmllytpyu.supabase.co"):cfg.includes("https://noimclnzzuxcszdotmby.supabase.co"),expectStaging?"Staging project selected":"Production default selected"],
 [expectStaging?!cfg.includes("https://noimclnzzuxcszdotmby.supabase.co"):!cfg.includes("https://ymcmmvnfrfntmllytpyu.supabase.co"),"selected build excludes the other project"],
 [stagingCfg.includes("https://ymcmmvnfrfntmllytpyu.supabase.co")&&!stagingCfg.includes("https://noimclnzzuxcszdotmby.supabase.co"),"isolated Staging config excludes Production"],
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
