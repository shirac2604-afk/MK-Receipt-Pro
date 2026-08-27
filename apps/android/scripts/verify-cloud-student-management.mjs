import fs from "node:fs";
const nav=fs.readFileSync("src/navigation/AppNavigator.tsx","utf8");
const screen=fs.readFileSync("src/screens/StudentCloudScreen.tsx","utf8");
const repo=fs.readFileSync("src/data/supabase/StudentCloudRepository.ts","utf8");
const dashboard=fs.readFileSync("src/screens/DashboardScreen.tsx","utf8");
const checks=[
 [nav.includes("StudentCloudScreen")&&!nav.includes("component={StudentDataProtectionScreen}"),"students tab routes to cloud screen"],
 [screen.includes("listCloudStudents")&&screen.includes("saveCloudStudent")&&screen.includes("archiveCloudStudent"),"student UI uses cloud repository"],
 [!screen.includes("StudentLocalStore"),"student UI does not use local student storage"],
 [repo.includes('.eq("business_id",businessId)')&&repo.includes("active:false"),"tenant-scoped student operations"],
 [dashboard.includes("logoDataUrl")&&dashboard.includes("<Image"),"dashboard renders cloud logo"]
];
let passed=0;for(const [ok,label] of checks){console.log(ok?"PASS":"FAIL",label);if(ok)passed++}
console.log(`Cloud students and branding: ${passed}/${checks.length}`);
if(passed!==checks.length)process.exit(1);