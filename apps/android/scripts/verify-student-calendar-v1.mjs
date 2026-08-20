import fs from "node:fs";
const read=(p)=>fs.readFileSync(p,"utf8");
const pkg=JSON.parse(read("package.json"));
const app=JSON.parse(read("app.json"));
const service=read("src/students/DeviceCalendarSyncService.ts");
const panel=read("src/students/DeviceCalendarPanel.tsx");
const hub=read("src/screens/StudentHubScreen.tsx");
const store=read("src/students/StudentLocalStore.ts");
const checks=[
 [pkg.dependencies?.["expo-calendar"]==="~57.0.1","Expo Calendar SDK 57 dependency"],
 [app.expo.android?.permissions?.includes("READ_CALENDAR")&&app.expo.android?.permissions?.includes("WRITE_CALENDAR"),"Android calendar permissions"],
 [service.includes("eventIds:Record<string,string>")&&service.includes("config.eventIds[lesson.id]"),"lesson-to-event idempotency map"],
 [service.includes("ExpoCalendarEvent.get")&&service.includes("event.update"),"existing event update path"],
 [service.includes("calendar.createEvent")&&service.includes("config.eventIds[lesson.id]=newId"),"new event create and link path"],
 [service.includes("CALENDAR_NOT_SELECTED")&&service.includes("calendarId"),"explicit selected calendar boundary"],
 [panel.includes("requestCalendars")&&panel.includes("selectCalendar")&&panel.includes("סנכרן עכשיו"),"in-app calendar connection controls"],
 [hub.includes("<DeviceCalendarPanel lessons={lessons}/>")&&(hub.includes("אין הפקת קבלות")||hub.includes("קבלות אינן מופקות")),"student hub calendar UI remains receipt-isolated"],
 [store.includes("payment:\"unpaid\"")&&!store.includes("receiptId"),"mobile student store has no receipt linkage"],
];
let ok=0;for(const[pass,label]of checks){console.log(pass?"PASS":"FAIL",label);if(pass)ok++;}
console.log(`Android student calendar contract: ${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
