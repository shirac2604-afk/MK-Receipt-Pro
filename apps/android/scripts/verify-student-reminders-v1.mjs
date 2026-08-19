import fs from "node:fs";
const store=fs.readFileSync("src/students/ReminderLocalStore.ts","utf8");
const panel=fs.readFileSync("src/students/ReminderSimulationPanel.tsx","utf8");
const hub=fs.readFileSync("src/screens/StudentHubScreen.tsx","utf8");
const checks=[
 [store.includes('ReminderAudience="student"|"guardian"|"both"'),"student guardian both audiences"],
 [store.includes('leadMinutes:60|180|1440'),"one hour three hours one day lead times"],
 [store.includes('dedupeKey=')&&store.includes('existing.has(dedupeKey)'),"reminder dedupe protection"],
 [store.includes('if(entry.status!=="failed")')&&store.includes('async retry'),"retry failed reminders only"],
 [store.includes('simulateSend')&&store.includes('simulateFailure'),"safe test simulation actions"],
 [!store.includes('fetch(')&&!store.includes('wa.me')&&!store.includes('whatsapp')&&!store.includes('sms:'),"no external delivery path in test store"],
 [panel.includes('מצב בדיקה בלבד')&&panel.includes('אין WhatsApp, SMS או שליחה חיצונית'),"explicit simulation mode UI"],
 [panel.includes('היסטוריית תזכורות')&&panel.includes('נסה שוב'),"history and retry UI"],
 [hub.includes('ReminderSimulationPanel')&&hub.includes('students={students}'),"reminder panel wired to student hub"]
];
let ok=0;for(const[pass,label]of checks){console.log(pass?"PASS":"FAIL",label);if(pass)ok++;}console.log(`Android student reminders: ${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
