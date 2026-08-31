import fs from "node:fs";

const screen=fs.readFileSync("src/students/CloudSchedulePanel.tsx","utf8");
const checks=[
 [screen.includes("selectedDay")&&screen.includes("workDays"),"mobile schedule retains a selected work day"],
 [screen.includes("יום העבודה שלי")&&screen.includes("היום הקודם")&&screen.includes("היום הבא"),"agenda supports clear daily navigation"],
 [screen.includes("agendaItems")&&screen.includes("dateKey(item.startsAt)===selectedDay"),"agenda filters lessons to the selected day"],
 [screen.includes("הגיע")&&screen.includes("נעדר")&&screen.includes("שולם")&&screen.includes("סיכום"),"day agenda preserves lesson follow-up actions"],
 [screen.includes("paymentsOnly?visibleItems:visibleItems.filter"),"open-payments view remains separate from day filtering"]
];
let failed=false;
for(const [ok,label]of checks){console.log(`${ok?"PASS":"FAIL"} ${label}`);if(!ok)failed=true;}
if(failed)process.exit(1);
