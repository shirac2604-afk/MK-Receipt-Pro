import fs from "node:fs";import path from "node:path";
const folder=path.join("test-output","tax-open-simulator-fixture");
if(!fs.existsSync(path.join(folder,"REPORT-5.4.html"))){console.log("Fixture missing; generating it first");await import("./tax-open-simulator-fixture.mjs");}
const html=fs.readFileSync(path.join(folder,"REPORT-5.4.html"),"utf8");
for(const token of ["הפקת קבצים במבנה אחיד","100B","110B","100C","120D","סה״כ רשומות נתונים"]){if(!html.includes(token))throw new Error(`missing ${token}`)}
const c=(html.match(/<td>100C<\/td>/g)||[]).length;const d=(html.match(/<td>120D<\/td>/g)||[]).length;if(c!==1||d!==1)throw new Error("record rows duplicated");
console.log("✓ Report 5.4 fixture contains receipt and accounting sample summaries");
