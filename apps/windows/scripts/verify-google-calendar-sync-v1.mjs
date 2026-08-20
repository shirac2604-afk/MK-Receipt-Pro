import fs from "node:fs";

const read=path=>fs.readFileSync(path,"utf8");
const main=read("apps/desktop/electron/main/main.ts");
const handlers=read("apps/desktop/electron/ipc/googleCalendarHandlers.ts");
const cloud=read("apps/desktop/electron/main/SupabaseCloudService.ts");
const calendar=read("apps/desktop/electron/main/GoogleCalendarService.ts");
const lessons=read("apps/desktop/renderer/src/students/LessonsScreen.tsx");

const checks=[
 [main.includes("const listLessonsForGoogleCalendar=async"),"single lesson source"],
 [main.includes("STUDENT_TEST_MODE?localStudentStore.listLessonsForSync")&&main.includes(":supabaseCloud.listLessonsForGoogleCalendar"),"test and cloud sources remain separated"],
 [main.includes("registerGoogleCalendarHandlers(googleCalendar,listLessonsForGoogleCalendar)"),"manual sync receives the shared source"],
 [main.includes("const lessons=await listLessonsForGoogleCalendar"),"automatic sync awaits the shared source"],
 [handlers.includes("GoogleCalendarLessonSource")&&handlers.includes("await listLessonsForSync"),"IPC sync awaits an injected source"],
 [!handlers.includes("LocalStudentTestStore"),"IPC no longer hard-codes test data"],
 [cloud.includes("async listLessonsForGoogleCalendar")&&cloud.includes('from("lessons")'),"cloud source lists real lessons"],
 [calendar.includes("sendUpdates=none"),"calendar sync does not invite students"],
 [calendar.includes("sendOAuthPage")&&calendar.includes("this.writeTokens")&&calendar.includes("if(oauthResponse)sendOAuthPage(oauthResponse,200"),"OAuth success waits for secure token storage"],
 [calendar.includes("rememberError")&&calendar.includes("lastError"),"OAuth failures survive restart for diagnosis"],
 [calendar.includes('const redirectUri=`http://127.0.0.1:${address.port}`')&&calendar.includes('if(url.pathname!=="/")'),"OAuth uses the documented root loopback redirect"],
 [calendar.includes("clientSecretPath")&&calendar.includes("safeStorage.encryptString(clientSecret)")&&calendar.includes("clientSecretConfigured"),"Client Secret is encrypted locally and never exposed in status"],
 [calendar.includes('body.set("client_secret",clientSecret)')&&handlers.includes("google-calendar:set-client-secret")&&lessons.includes("שמור Client Secret")&&lessons.includes("!googleStatus.clientSecretConfigured"),"token exchange supports a locally saved Client Secret"],
 [lessons.includes("const refreshed=await window.mkApi.googleCalendar.getStatus().catch(()=>null)")&&lessons.includes("refreshed.data.lastError?\"\":fallback"),"failed OAuth refreshes the visible diagnostic"],
 [lessons.includes('code.slice("GOOGLE_TOKEN_EXCHANGE_FAILED:".length)')&&lessons.includes("קוד Google:"),"token exchange failures expose a safe Google diagnostic"],
];

let failed=0;
for(const [ok,label] of checks){console.log(`${ok?"PASS":"FAIL"} ${label}`);if(!ok)failed++;}
console.log(`Google Calendar sync contract: ${checks.length-failed}/${checks.length}`);
if(failed)process.exit(1);
