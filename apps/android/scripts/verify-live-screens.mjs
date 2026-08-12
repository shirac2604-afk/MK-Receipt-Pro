import fs from "node:fs";
const files=[
 "src/context/BusinessContext.tsx",
 "src/hooks/useLiveDataRepository.ts",
 "src/screens/CustomersScreen.tsx",
 "src/screens/ExpensesScreen.tsx",
 "src/components/AppBootstrap.tsx",
 "FOUNDATION5_LIVE_SCREENS_HE.md"
];
let ok=0;
for(const f of files){const p=fs.existsSync(f);console.log(p?"PASS":"FAIL",f);if(p)ok++}
const c=fs.readFileSync("src/screens/CustomersScreen.tsx","utf8");
const e=fs.readFileSync("src/screens/ExpensesScreen.tsx","utf8");
const b=fs.readFileSync("src/context/BusinessContext.tsx","utf8");
const checks=[
 [c.includes("repo.customers()"),"live customer load"],
 [c.includes("repo.addCustomer"),"live customer create"],
 [e.includes("repo.expenses()"),"live expense load"],
 [e.includes("repo.addExpense"),"live expense create"],
 [b.includes("getMyBusiness"),"business membership resolution"],
 [b.includes("ensureAndroidDevice"),"Android device registration"],
 [c.includes("RefreshControl"),"customer pull-to-refresh"],
 [e.includes("RefreshControl"),"expense pull-to-refresh"]
];
for(const [p,n] of checks){console.log(p?"PASS":"FAIL",n);if(p)ok++}
console.log(`Live screens: ${ok}/${files.length+checks.length}`);
if(ok!==files.length+checks.length)process.exit(1);
