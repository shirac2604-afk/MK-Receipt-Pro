import fs from "node:fs";
const path="apps/windows/apps/desktop/renderer/src/main.tsx";
let s=fs.readFileSync(path,"utf8");
function patch(label,a,b){const n=s.split(a).length-1;if(n!==1)throw new Error(`${label}: expected 1 match, got ${n}`);s=s.replace(a,b)}
patch("import",'import {LessonsScreen} from "./students/LessonsScreen";','import {LessonsScreen} from "./students/LessonsScreen";\nimport {OpenPaymentsScreen} from "./students/OpenPaymentsScreen";');
patch("css",'import "./students/lessons.css";','import "./students/lessons.css";\nimport "./students/open-payments.css";');
patch("view",'type View="dashboard"|"receipt"|"history"|"customers"|"students"|"lessons"|"expenses"','type View="dashboard"|"receipt"|"history"|"customers"|"students"|"lessons"|"open-payments"|"expenses"');
patch("nav",'<button className={`nav-item ${view==="lessons"?"active":""}`} onClick={()=>onView("lessons")}>📅 השיעורים שלי</button><button className={`nav-item ${view==="expenses"?"active":""}`}','<button className={`nav-item ${view==="lessons"?"active":""}`} onClick={()=>onView("lessons")}>📅 השיעורים שלי</button><button className={`nav-item ${view==="open-payments"?"active":""}`} onClick={()=>onView("open-payments")}>₪ תשלומים פתוחים</button><button className={`nav-item ${view==="expenses"?"active":""}`}');
const renderNeedles=['view==="lessons"?<LessonsScreen/>','view==="lessons"&&<LessonsScreen/>','view==="lessons" ? <LessonsScreen/>'];
let done=false;for(const a of renderNeedles){if(s.includes(a)){const b=a.replace('<LessonsScreen/>','<LessonsScreen/>:view==="open-payments"?<OpenPaymentsScreen/>');s=s.replace(a,b);done=true;break}}
if(!done){const a='view==="lessons"?<LessonsScreen/>:';if(s.includes(a)){s=s.replace(a,'view==="lessons"?<LessonsScreen/>:view==="open-payments"?<OpenPaymentsScreen/>:');done=true}}
if(!done)throw new Error("render: lessons render marker not found");
fs.writeFileSync(path,s,"utf8");
