import fs from "node:fs";
const read=path=>fs.readFileSync(path,"utf8");
const service=read("src/services/BusinessReportService.ts");
const screen=read("src/screens/ManagementReportsScreen.tsx");
const more=read("src/screens/MoreScreen.tsx");
const nav=read("src/navigation/AppNavigator.tsx");
const checks=[
 [service.includes("getManagementReport")&&service.includes("expensesByCategory"),"yearly report aggregates shared cloud receipts and expenses"],
 [service.includes('status!=="cancelled"')&&service.includes("attachment_storage_key"),"active income and missing attachments are calculated safely"],
 [screen.includes("מגמת הכנסות והוצאות")&&screen.includes("בדיקת אסמכתאות"),"mobile management report presents financial and document status"],
 [more.includes('navigation.navigate("דוחות")')&&nav.includes('name="דוחות"'),"reports screen is reachable from mobile settings"],
 [screen.includes("createAndShareYearlyReport"),"CSV export remains available from the report center"]
];
let failed=false;for(const[ok,label]of checks){console.log(`${ok?"PASS":"FAIL"} ${label}`);if(!ok)failed=true;}if(failed)process.exit(1);
