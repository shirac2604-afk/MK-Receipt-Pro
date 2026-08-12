import fs from "node:fs";
const app=fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8");
const service=fs.readFileSync("packages/application/src/reports/ReportService.ts","utf8");
const pre=fs.readFileSync("apps/desktop/electron/preload/preload.ts","utf8");
const checks=[
 [app.includes("הצהרת עוסק פטור"),"VAT card"],
 [app.includes("מס הכנסה"),"income tax card"],
 [app.includes("מחזור לפי הקבלות הפעילות במערכת"),"turnover display"],
 [app.includes("אינה קובעת אילו הוצאות מוכרות"),"no deductibility guessing"],
 [app.includes("ההגשה עצמה מתבצעת במערכות הרשמיות"),"official filing notice"],
 [service.includes("01-מע״מ-הצהרת-עוסק-פטור"),"VAT folder"],
 [service.includes("02-מס-הכנסה-דיווח-שנתי"),"income tax folder"],
 [service.includes("נתוני-מחזור-לעוסק-פטור"),"VAT turnover CSV"],
 [service.includes("00-קראי-לפני-הגשה.txt"),"VAT readme"],
 [service.includes("מסמכים-חסרים"),"missing docs kept"],
 [pre.includes('foundationVersion:"1.1.0-dev.13"'),"version"]
];
let ok=0;
for(const [pass,label] of checks){console.log(pass?"PASS":"FAIL",label);if(pass)ok++}
console.log(`${ok}/${checks.length}`);
if(ok!==checks.length)process.exit(1);
