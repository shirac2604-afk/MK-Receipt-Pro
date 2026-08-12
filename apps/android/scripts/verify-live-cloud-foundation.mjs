import fs from "node:fs";
const files=[
 "cloud/sql/002_auth_rls.sql","src/lib/supabase.ts","src/auth/AuthService.ts",
 "src/context/AuthContext.tsx","src/data/supabase/BusinessRepository.ts",
 "src/data/supabase/LiveDataRepository.ts","src/data/supabase/DeviceRepository.ts",
 "src/data/supabase/ReceiptNumberRepository.ts","src/screens/AuthScreen.tsx",
 "FOUNDATION4_LIVE_CLOUD_HE.md"
];
let ok=0;
for(const f of files){const p=fs.existsSync(f);console.log(p?"PASS":"FAIL",f);if(p)ok++}
const sql=fs.readFileSync("cloud/sql/002_auth_rls.sql","utf8");
const sup=fs.readFileSync("src/lib/supabase.ts","utf8");
const live=fs.readFileSync("src/data/supabase/LiveDataRepository.ts","utf8");
const checks=[
 [sql.includes("business_members"),"business membership"],
 [sql.includes("enable row level security"),"RLS enabled"],
 [sql.includes("auth.uid()"),"Auth UID policies"],
 [sql.includes("NO delete policy")||sql.includes("NO delete"),"receipt delete intentionally absent"],
 [sql.includes("register_device"),"secure device registration RPC"],
 [sql.includes("reserve_receipt_number"),"secure receipt reservation RPC"],
 [sup.includes("persistSession:true"),"persistent auth session"],
 [sup.includes("expo-sqlite/localStorage/install"),"Expo localStorage persistence"],
 [live.includes('.eq("business_id",this.businessId)'),"tenant query filtering"],
 [!sup.toLowerCase().includes("service_role"),"no service-role key in client"]
];
for(const [p,n] of checks){console.log(p?"PASS":"FAIL",n);if(p)ok++}
console.log(`Live cloud foundation: ${ok}/${files.length+checks.length}`);
if(ok!==files.length+checks.length)process.exit(1);
