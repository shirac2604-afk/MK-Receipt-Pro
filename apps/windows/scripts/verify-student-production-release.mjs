import fs from "node:fs";

const read=path=>fs.readFileSync(path,"utf8");
const config=read(process.env.STUDENT_RELEASE_CONFIG==="production"?"apps/desktop/electron/main/SupabaseCloudConfig.production.ts":"apps/desktop/electron/main/SupabaseCloudConfig.ts");
const main=read("apps/desktop/electron/main/main.ts");
const provider=read("apps/desktop/electron/main/SupabaseEdgeReminderProvider.ts");
const handlers=read("apps/desktop/electron/ipc/lessonHandlers.ts");
const renderer=read("apps/desktop/renderer/src/students/LessonsScreen.tsx");
const edge=read("../../supabase/functions/lesson-reminder-dispatch/index.ts");

const checks=[
 [config.includes("STUDENT_TEST_MODE=false"),"production mode selected"],
 [config.includes("STUDENT_RECEIPTS_ENABLED=false"),"receipts remain disabled"],
 [config.includes("REMINDER_AUTO_DISPATCH_ENABLED=false"),"automatic reminder delivery remains disabled"],
 [config.includes("noimclnzzuxcszdotmby.supabase.co"),"production cloud selected"],
 [main.includes("new SupabaseEdgeReminderProvider(supabaseCloud.getClient(),!STUDENT_TEST_MODE)"),"production uses the secured reminder provider"],
 [main.includes("if(REMINDER_AUTO_DISPATCH_ENABLED)reminderTimer=setInterval"),"timer is gated by the automatic-delivery switch"],
 [provider.includes("body:{reminderId:r.reminderId}")&&!provider.includes("recipientPhone:r.recipientPhone"),"desktop sends no recipient details to the Edge Function"],
 [edge.includes("client.auth.getUser(token)")&&edge.includes('.eq("status","sending")'),"Edge Function authenticates the caller and requires a claimed reminder"],
 [!edge.includes("payload.recipientPhone")&&!edge.includes("payload.studentName"),"Edge Function resolves recipient details on the server"],
 [handlers.includes("receipt:null"),"student workflow cannot issue receipts"],
 [renderer.includes("אין שליחה אוטומטית"),"user interface states the manual-send rule"]
];

let failed=0;
for(const[ok,label]of checks){console.log(`${ok?"PASS":"FAIL"} ${label}`);if(!ok)failed++;}
console.log(`Student production release contract: ${checks.length-failed}/${checks.length}`);
if(failed)process.exit(1);
