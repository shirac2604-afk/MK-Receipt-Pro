import fs from "node:fs";
const store=fs.readFileSync("src/students/ReminderLocalStore.ts","utf8");
const panel=fs.readFileSync("src/students/ReminderSimulationPanel.tsx","utf8");
const hub=fs.readFileSync("src/screens/StudentHubScreen.tsx","utf8");
const notifications=fs.readFileSync("src/students/TeacherReminderNotificationService.ts","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const app=JSON.parse(fs.readFileSync("app.json","utf8"));
const checks=[
 [store.includes('ReminderAudience="student"|"guardian"|"both"'),"student guardian both audiences"],
 [store.includes('leadMinutes:60|180|1440'),"one hour three hours one day lead times"],
 [store.includes('desired.set(key')&&store.includes('existing.has(dedupeKey)')&&store.includes('existing.set(dedupeKey,entry)')&&store.includes('${lesson.startsAt}'),"reminder dedupe and reschedule protection"],
 [store.includes('if(entry.status!=="failed")')&&store.includes('async retry'),"retry failed reminders only"],
 [store.includes('simulateSend')&&store.includes('simulateFailure'),"safe test simulation actions"],
 [!store.includes('fetch(')&&!store.includes('wa.me')&&!store.includes('whatsapp')&&!store.includes('sms:'),"no external delivery path in test store"],
 [panel.includes('מצב בדיקה בלבד')&&panel.includes('אין WhatsApp, SMS או שליחה חיצונית'),"explicit simulation mode UI"],
 [panel.includes('היסטוריית תזכורות')&&panel.includes('נסה שוב'),"history and retry UI"],
 [hub.includes('ReminderSimulationPanel')&&hub.includes('students={students}'),"reminder panel wired to student hub"],
 [pkg.dependencies?.['expo-notifications']==='~57.0.13',"Expo Notifications SDK 57 dependency"],
 [app.expo.plugins.some(x=>Array.isArray(x)&&x[0]==='expo-notifications'),"Expo Notifications config plugin"],
 [notifications.includes('scheduleNotificationAsync')&&notifications.includes('cancelScheduledNotificationAsync'),"local notification schedule and cancel paths"],
 [notifications.includes('requestPermissionsAsync')&&notifications.includes('setNotificationChannelAsync'),"notification permission and Android channel"],
 [notifications.includes('MAP_KEY')&&notifications.includes('if(map[key])continue'),"local notification idempotency map"],
 [panel.includes('התראה במכשיר למורה')&&panel.includes('אינה שולחת הודעה לתלמיד או להורה'),"teacher-only local notification boundary"]
];
let ok=0;for(const[pass,label]of checks){console.log(pass?"PASS":"FAIL",label);if(pass)ok++;}console.log(`Android student reminders: ${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
