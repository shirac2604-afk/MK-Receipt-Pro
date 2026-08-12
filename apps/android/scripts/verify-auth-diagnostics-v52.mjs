import fs from "node:fs";
const sup=fs.readFileSync("src/lib/supabase.ts","utf8");
const screen=fs.readFileSync("src/screens/AuthScreen.tsx","utf8");
const diag=fs.readFileSync("src/services/SupabaseDiagnostics.ts","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const checks=[
 [pkg.version==="1.0.0-foundation.5.2","version 5.2"],
 [pkg.dependencies["@react-native-async-storage/async-storage"]!=null,"AsyncStorage dependency"],
 [sup.includes("AsyncStorage"),"AsyncStorage auth persistence"],
 [sup.includes("processLock"),"Supabase process lock"],
 [sup.includes("startAutoRefresh"),"AppState auto refresh"],
 [diag.includes("/auth/v1/settings"),"raw auth endpoint diagnostic"],
 [diag.includes("supabase.auth.getSession"),"auth-client diagnostic"],
 [screen.includes("Android Foundation 5.2"),"visible version marker"],
 [screen.includes("Raw fetch:"),"visible raw fetch status"],
 [screen.includes("Auth client:"),"visible auth client status"]
];
let ok=0;
for(const [p,l] of checks){console.log(p?"PASS":"FAIL",l);if(p)ok++}
console.log(`Auth diagnostics 5.2: ${ok}/${checks.length}`);
if(ok!==checks.length)process.exit(1);
