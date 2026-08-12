import fs from "node:fs";
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const dash=fs.readFileSync("src/screens/DashboardScreen.tsx","utf8");
const more=fs.readFileSync("src/screens/MoreScreen.tsx","utf8");
const dev=fs.readFileSync("src/data/supabase/DeviceRepository.ts","utf8");
const repo=fs.readFileSync("src/data/supabase/DashboardRepository.ts","utf8");
const checks=[
 [pkg.version==="1.0.0-foundation.8.3","version 8.3"],
 [dash.includes("פעולות מהירות"),"real main menu"],
 [dash.includes('go("קבלות")')&&dash.includes('go("לקוחות")')&&dash.includes('go("הוצאות")'),"quick navigation"],
 [dash.includes("הקבלה הבאה"),"shared next receipt"],
 [repo.includes('from("receipt_sequences")'),"cloud next number"],
 [repo.includes('from("devices")'),"device count"],
 [dev.includes("listBusinessDevices"),"device listing"],
 [more.includes("חשבון ענן ומכשירים"),"cloud account UI"],
 [more.includes("המכשיר הזה"),"current device marker"],
 [more.includes("התנתקות מהמכשיר הזה"),"per-device sign out"],
 [more.includes("אותו רצף קבלות"),"multi-device guidance"]
];
let ok=0;for(const [p,l] of checks){console.log(p?"PASS":"FAIL",l);if(p)ok++}
console.log(`Android main menu + multi-device: ${ok}/${checks.length}`);
if(ok!==checks.length)process.exit(1);
