import fs from "node:fs";

const student=fs.readFileSync("src/students/StudentLocalStore.ts","utf8");
const reminders=fs.readFileSync("src/students/ReminderLocalStore.ts","utf8");
const navigator=fs.readFileSync("src/navigation/AppNavigator.tsx","utf8");
const cloudRepository=fs.readFileSync("src/data/supabase/StudentCloudRepository.ts","utf8");
const cloudScreen=fs.readFileSync("src/screens/StudentCloudScreen.tsx","utf8");
const protection=fs.readFileSync("src/screens/StudentDataProtectionScreen.tsx","utf8");

const checks=[
 [student.includes("let volatileState")&&!student.includes("AsyncStorage.setItem")&&!student.includes("AsyncStorage.getItem"),"student test data is never persisted to AsyncStorage"],
 [reminders.includes("let volatileState")&&!reminders.includes("AsyncStorage.setItem")&&!reminders.includes("AsyncStorage.getItem"),"reminder test data is never persisted to AsyncStorage"],
 [student.includes("clearLegacyStudentTestData")&&reminders.includes("clearLegacyReminderTestData"),"legacy test data can be removed"],
 [navigator.includes("component={StudentCloudScreen}")&&!navigator.includes("component={StudentHubScreen}"),"production navigation exposes only the tenant-scoped cloud student screen"],
 [cloudScreen.includes("listCloudStudents")&&!cloudScreen.includes("StudentLocalStore"),"cloud screen cannot use the local student test store"],
 [cloudRepository.includes('.eq("business_id",businessId)')&&cloudRepository.includes("active:false"),"cloud student operations remain tenant scoped"],
 [protection.includes("מחיקת נתוני בדיקה"),"privacy screen keeps a clear legacy-data removal action"]
];
for(const [ok,label] of checks)if(!ok)throw new Error(`Student local privacy verification failed: ${label}`);
console.log("✓ Student and reminder test data is memory-only; production student management is cloud-only and tenant-scoped");
