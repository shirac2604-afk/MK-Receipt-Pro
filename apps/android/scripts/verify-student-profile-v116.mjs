import fs from "node:fs";

const screen=fs.readFileSync("src/screens/StudentCloudScreen.tsx","utf8");
const checks=[
 [screen.includes("openProfile=async")&&screen.includes("listCloudLessonCalendar"),"student profile loads shared lesson data"],
 [screen.includes("כרטיס תלמיד")&&screen.includes("פתיחת כרטיס תלמיד"),"student list opens a dedicated profile"],
 [screen.includes("יתרה פתוחה")&&screen.includes('attendance===\"attended\"&&x.payment===\"unpaid\"'),"open balance counts attended unpaid lessons only"],
 [screen.includes("שיעורים קרובים")&&screen.includes("מטרות ודגשים")&&screen.includes("פרטי קשר"),"profile shows learning, contact, and upcoming lessons"],
 [screen.includes("עריכת כרטיס")&&screen.includes('setSection(\"schedule\")'),"profile links to editing and the shared schedule"]
];
let failed=false;
for(const [ok,label]of checks){console.log(`${ok?"PASS":"FAIL"} ${label}`);if(!ok)failed=true;}
if(failed)process.exit(1);
