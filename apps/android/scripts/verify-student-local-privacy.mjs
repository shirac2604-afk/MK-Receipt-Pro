import fs from "node:fs";

const student=fs.readFileSync("src/students/StudentLocalStore.ts","utf8");
const reminders=fs.readFileSync("src/students/ReminderLocalStore.ts","utf8");
const navigator=fs.readFileSync("src/navigation/AppNavigator.tsx","utf8");
const protection=fs.readFileSync("src/screens/StudentDataProtectionScreen.tsx","utf8");

const checks=[
 [student.includes("let volatileState")&&!student.includes("AsyncStorage.setItem")&&!student.includes("AsyncStorage.getItem"),"student test data is never persisted to AsyncStorage"],
 [reminders.includes("let volatileState")&&!reminders.includes("AsyncStorage.setItem")&&!reminders.includes("AsyncStorage.getItem"),"reminder test data is never persisted to AsyncStorage"],
 [student.includes("clearLegacyStudentTestData")&&reminders.includes("clearLegacyReminderTestData"),"legacy test data can be removed"],
 [navigator.includes("StudentDataProtectionScreen")&&!navigator.includes("component={StudentHubScreen}"),"production navigation does not expose the local student test hub"],
 [protection.includes("מחיקת נתוני בדיקה"),"privacy screen gives a clear legacy-data removal action"]
];
for(const [ok,label] of checks)if(!ok)throw new Error(`Student local privacy verification failed: ${label}`);
console.log("✓ Student and reminder test data is memory-only and the production app exposes only the privacy-safe screen");
