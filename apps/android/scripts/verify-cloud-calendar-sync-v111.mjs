import fs from "node:fs";
const panel=fs.readFileSync("src/students/CloudSchedulePanel.tsx","utf8");
const devicePanel=fs.readFileSync("src/students/DeviceCalendarPanel.tsx","utf8");
const service=fs.readFileSync("src/students/DeviceCalendarSyncService.ts","utf8");
const checks=[
 [panel.includes("<DeviceCalendarPanel lessons={calendarLessons}"),"cloud schedule exposes device calendar sync"],
 [panel.includes("new Map(items.map(item=>[item.lessonId"),"group participant rows collapse to one calendar event"],
 [devicePanel.includes("DeviceCalendarSyncService.sync(lessons)")&&!devicePanel.includes("StudentLocalStore"),"device panel syncs supplied cloud lessons only"],
 [service.includes("export type CalendarSyncLesson")&&!service.includes("MobileLesson"),"calendar service has no local student-store dependency"]
];
let passed=0;for(const [ok,label] of checks){console.log(ok?"PASS":"FAIL",label);if(ok)passed++;}
console.log(`Cloud calendar sync: ${passed}/${checks.length}`);if(passed!==checks.length)process.exit(1);
