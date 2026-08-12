import fs from "node:fs";
const ui=fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8");
const css=fs.readFileSync("apps/desktop/renderer/src/styles.css","utf8");
const checks=[
 [ui.includes('type View="dashboard"|"receipt"|"history"|"reports"|"backups"|"health"|"errors"|"help"'),"נוסף מסך עזרה"],
 [ui.includes("function HelpScreen"),"מרכז העזרה קיים"],
 [ui.includes("function ProductTour"),"סיור ראשון קיים"],
 [ui.includes("quick-actions-grid"),"פעולות מהירות בדף הבית קיימות"],
 [css.includes(".dashboard-hero")&&css.includes(".help-grid")&&css.includes(".tour-overlay"),"עיצוב הליטוש קיים"]
];
let failed=false;for(const[c,m] of checks){console.log(`${c?"✓":"✗"} ${m}`);if(!c)failed=true}if(failed)process.exit(1);
