import fs from "node:fs";
const p="apps/windows/apps/desktop/renderer/src/students/LessonsScreen.tsx";
let s=fs.readFileSync(p,"utf8");
const a='if(payment==="paid")setNotice("התשלום נשמר בהצלחה במצב הבדיקה.")await load()';
const b='if(payment==="paid")setNotice("התשלום נשמר בהצלחה במצב הבדיקה.");await load()';
if(!s.includes(a))throw new Error("syntax marker not found");
s=s.replace(a,b);
fs.writeFileSync(p,s,"utf8");
