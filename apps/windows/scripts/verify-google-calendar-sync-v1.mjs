import fs from "node:fs";

const read=path=>fs.readFileSync(path,"utf8");
const main=read("apps/desktop/electron/main/main.ts");
const handlers=read("apps/desktop/electron/ipc/googleCalendarHandlers.ts");
const cloud=read("apps/desktop/electron/main/SupabaseCloudService.ts");
const calendar=read("apps/desktop/electron/main/GoogleCalendarService.ts");

const checks=[
 [main.includes("const listLessonsForGoogleCalendar=async"),"single lesson source"],
 [main.includes("STUDENT_TEST_MODE?localStudentStore.listLessonsForSync")&&main.includes(":supabaseCloud.listLessonsForGoogleCalendar"),"test and cloud sources remain separated"],
 [main.includes("registerGoogleCalendarHandlers(googleCalendar,listLessonsForGoogleCalendar)"),"manual sync receives the shared source"],
 [main.includes("const lessons=await listLessonsForGoogleCalendar"),"automatic sync awaits the shared source"],
 [handlers.includes("GoogleCalendarLessonSource")&&handlers.includes("await listLessonsForSync"),"IPC sync awaits an injected source"],
 [!handlers.includes("LocalStudentTestStore"),"IPC no longer hard-codes test data"],
 [cloud.includes("async listLessonsForGoogleCalendar")&&cloud.includes('from("lessons")'),"cloud source lists real lessons"],
 [calendar.includes("sendUpdates=none"),"calendar sync does not invite students"],
];

let failed=0;
for(const [ok,label] of checks){console.log(`${ok?"PASS":"FAIL"} ${label}`);if(!ok)failed++;}
console.log(`Google Calendar sync contract: ${checks.length-failed}/${checks.length}`);
if(failed)process.exit(1);
