import fs from "node:fs";
const service=fs.readFileSync("packages/tax-open/src/OpenFormatService.ts","utf8");
const validator=fs.readFileSync("packages/tax-open/src/Report54ComplianceValidator.ts","utf8");
const ipc=fs.readFileSync("apps/desktop/electron/ipc/databaseHandlers.ts","utf8");
for(const token of ["REPORT-5.4.html","OPEN-FORMAT-REPORT-5.4-AUDIT.json","סה״כ רשומות שהופקו לפי סוגי רשומות בקובץ BKMVDATA.TXT","מספר עוסק מורשה","הנתונים נשמרו בנתיב הבא"]){if(!service.includes(token))throw new Error(`missing ${token}`)}
for(const token of ["REPORT54_ROW_ORDER","REPORT54_DATA_TOTAL","REPORT54_FILE_TOTAL"]){if(!validator.includes(token))throw new Error(`missing validator ${token}`)}
if(!ipc.includes("REPORT-5.4.pdf")||!ipc.includes("renderHtmlFileToPdf"))throw new Error("Report 5.4 PDF generation missing");
console.log("✓ Report 5.4 official layout, audit and PDF output exist");
