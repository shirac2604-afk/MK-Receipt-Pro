import fs from "node:fs";
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const repo=fs.readFileSync("src/data/supabase/ReceiptRepository.ts","utf8");
const fmt=fs.readFileSync("src/services/ErrorFormatter.ts","utf8");
const nav=fs.readFileSync("src/navigation/AppNavigator.tsx","utf8");
const app=fs.readFileSync("App.tsx","utf8");
const checks=[
 [pkg.version==="1.0.0-foundation.7.1","version 7.1"],
 [fmt.includes("details:"),"Supabase details formatting"],
 [fmt.includes("hint:"),"Supabase hint formatting"],
 [repo.includes("שלב הקצאת מספר קבלה נכשל"),"reservation-stage diagnostics"],
 [repo.includes("שלב הנפקת הקבלה בענן נכשל"),"RPC-stage diagnostics"],
 [nav.includes("useSafeAreaInsets"),"safe-area hook"],
 [nav.includes("Math.max(insets.bottom,10)"),"Android bottom inset"],
 [app.includes("SafeAreaProvider"),"safe-area provider"]
];
let ok=0;
for(const [p,l] of checks){console.log(p?"PASS":"FAIL",l);if(p)ok++}
console.log(`Foundation 7.1 fixes: ${ok}/${checks.length}`);
if(ok!==checks.length)process.exit(1);
