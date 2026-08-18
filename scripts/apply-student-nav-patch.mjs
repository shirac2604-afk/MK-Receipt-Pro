import fs from "node:fs";

const path="apps/windows/apps/desktop/renderer/src/main.tsx";
let source=fs.readFileSync(path,"utf8");

function replaceOnce(label,needle,replacement){
  const count=source.split(needle).length-1;
  if(count!==1)throw new Error(`${label}: expected exactly one match, found ${count}`);
  source=source.replace(needle,replacement);
}

replaceOnce(
  "student imports",
  'import type {AboutInfo} from "../../electron/preload/preload";\nimport "./styles.css";',
  'import type {AboutInfo} from "../../electron/preload/preload";\nimport {StudentsContainer} from "./students/StudentsContainer";\nimport {LessonsScreen} from "./students/LessonsScreen";\nimport "./students/students.css";\nimport "./students/lessons.css";\nimport "./styles.css";'
);

replaceOnce(
  "View union",
  'type View="dashboard"|"receipt"|"history"|"customers"|"expenses"|"reports"|"backups"|"tax"|"health"|"errors"|"help"|"about"|"settings"|"qa";',
  'type View="dashboard"|"receipt"|"history"|"customers"|"students"|"lessons"|"expenses"|"reports"|"backups"|"tax"|"health"|"errors"|"help"|"about"|"settings"|"qa";'
);

replaceOnce(
  "sidebar student navigation",
  '<button className={`nav-item ${view==="customers"?"active":""}`} onClick={()=>onView("customers")}>♙ לקוחות</button><button className={`nav-item ${view==="expenses"?"active":""}`} onClick={()=>onView("expenses")}>▦ הוצאות</button>',
  '<button className={`nav-item ${view==="customers"?"active":""}`} onClick={()=>onView("customers")}>♙ לקוחות</button><button className={`nav-item ${view==="students"?"active":""}`} onClick={()=>onView("students")}>👥 תלמידים</button><button className={`nav-item ${view==="lessons"?"active":""}`} onClick={()=>onView("lessons")}>📅 השיעורים שלי</button><button className={`nav-item ${view==="expenses"?"active":""}`} onClick={()=>onView("expenses")}>▦ הוצאות</button>'
);

replaceOnce(
  "app student routes",
  ':view==="customers"?<CustomersScreen setToast={setToast} onNewReceipt={()=>setView("receipt")}/>:view==="expenses"?<ExpensesScreen setToast={setToast}/>',
  ':view==="customers"?<CustomersScreen setToast={setToast} onNewReceipt={()=>setView("receipt")}/>:view==="students"?<StudentsContainer/>:view==="lessons"?<LessonsScreen/>:view==="expenses"?<ExpensesScreen setToast={setToast}/>'
);

fs.writeFileSync(path,source,"utf8");
console.log("Student navigation patch applied successfully.");
