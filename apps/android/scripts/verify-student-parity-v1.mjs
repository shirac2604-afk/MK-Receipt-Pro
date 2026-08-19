import fs from "node:fs";
const store=fs.readFileSync("src/students/StudentLocalStore.ts","utf8");
const screen=fs.readFileSync("src/screens/StudentHubScreen.tsx","utf8");
const checks=[
 [store.includes("participants:MobileLessonParticipant[]")&&store.includes("updateParticipant"),"per-student group attendance/payment"],
 [store.includes("recurrenceIntervalWeeks:0|1|2")&&screen.includes("כל שבועיים"),"weekly and biweekly lesson series"],
 [store.includes("listOpenPayments")&&screen.includes("תשלומים")&&screen.includes("סה״כ פתוח"),"open payments view"],
 [store.includes("saveLessonNotes")&&screen.includes("סיכום ומשימה"),"lesson summary and homework"],
 [screen.includes("guardianName")&&screen.includes("guardianPhone"),"guardian contact fields"],
 [screen.includes("DeviceCalendarPanel")&&store.includes("seriesId"),"calendar-compatible lesson model"],
 [screen.includes("קבלות אינן")&&!screen.includes("הפק קבלה"),"test mode remains receipt isolated"]
];
let ok=0;for(const[pass,label]of checks){console.log(pass?"PASS":"FAIL",label);if(pass)ok++;}
console.log(`Android student parity: ${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
