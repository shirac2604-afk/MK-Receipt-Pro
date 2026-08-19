import fs from "node:fs";
const path="apps/android/src/screens/StudentHubScreen.tsx";
let s=fs.readFileSync(path,"utf8");
function patch(label,a,b){const n=s.split(a).length-1;if(n!==1)throw new Error(`${label}: expected 1 match, got ${n}`);s=s.replace(a,b)}
patch("import",'import {DeviceCalendarPanel} from "../students/DeviceCalendarPanel";','import {DeviceCalendarPanel} from "../students/DeviceCalendarPanel";\nimport {ReminderSimulationPanel} from "../students/ReminderSimulationPanel";');
patch("panel",'<DeviceCalendarPanel lessons={lessons}/>','<DeviceCalendarPanel lessons={lessons}/>\n   <ReminderSimulationPanel lessons={lessons} students={students}/>');
fs.writeFileSync(path,s,"utf8");
