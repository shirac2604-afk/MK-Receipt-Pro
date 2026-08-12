import fs from "node:fs";
const app=fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8");
const pre=fs.readFileSync("apps/desktop/electron/preload/preload.ts","utf8");
const repo=fs.readFileSync("packages/database/src/repositories/ReceiptRepository.ts","utf8");
const service=fs.readFileSync("packages/application/src/reports/ReportService.ts","utf8");
const checks=[
 [app.includes("תבניות לתקבולים חוזרים"),"recurring templates"],
 [app.includes("shareCustomerReceipt"),"receipt sharing"],
 [app.includes("עריכת פרטים"),"customer editing"],
 [app.includes("שמור בכל זאת"),"duplicate override"],
 [app.includes("כל אמצעי התשלום"),"advanced history filters"],
 [app.includes("הוצאות"),"expenses"],
 [pre.includes("createGoogleDrive"),"Google Drive backup"],
 [repo.includes("findCustomerDuplicates"),"duplicate detection"],
 [service.includes("סיכום-חודשי"),"monthly report"],
 [service.includes("הוצאות-לפי-קטגוריה"),"expense categories"],
 [service.includes("מסמכים-חסרים"),"missing documents"],
 [service.includes("01-מע״מ-הצהרת-עוסק-פטור"),"VAT track"],
 [service.includes("02-מס-הכנסה-דיווח-שנתי"),"income tax track"],
 [pre.includes('foundationVersion:"1.1.0-dev.13"'),"dev13 version"]
];
let ok=0; for(const [pass,label] of checks){console.log(pass?"PASS":"FAIL",label); if(pass)ok++}
console.log(`${ok}/${checks.length}`); if(ok!==checks.length)process.exit(1);
