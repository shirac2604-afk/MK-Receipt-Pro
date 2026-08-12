import fs from "node:fs";
const service=fs.readFileSync("src/services/ExpenseAttachmentService.ts","utf8");
const screen=fs.readFileSync("src/screens/ExpensesScreen.tsx","utf8");
const sql=fs.readFileSync("cloud/sql/003_expense_attachments_storage.sql","utf8");
const repo=fs.readFileSync("src/data/supabase/LiveDataRepository.ts","utf8");
const app=JSON.parse(fs.readFileSync("app.json","utf8"));
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const checks=[
 [pkg.version==="1.0.0-foundation.6","version 6"],
 [pkg.dependencies["base64-arraybuffer"]!=null,"base64 arraybuffer dependency"],
 [service.includes("requestCameraPermissionsAsync"),"camera permission"],
 [service.includes("launchCameraAsync"),"camera capture"],
 [service.includes("launchImageLibraryAsync"),"gallery picker"],
 [service.includes("decode(attachment.base64)"),"ArrayBuffer upload"],
 [service.includes('.from(BUCKET)'),"Storage bucket"],
 [service.includes("createSignedUrl"),"private signed URL"],
 [repo.includes("setExpenseAttachment"),"expense attachment DB link"],
 [screen.includes("צילום אסמכתא"),"camera UI"],
 [screen.includes("בחירה מהגלריה"),"gallery UI"],
 [sql.includes("user_has_business_access"),"business-scoped storage RLS"],
 [sql.includes("bucket_id='expense-attachments'"),"private bucket policies"],
 [JSON.stringify(app.expo.plugins).includes("expo-image-picker"),"image picker app config"]
];
let ok=0;
for(const [p,l] of checks){console.log(p?"PASS":"FAIL",l);if(p)ok++}
console.log(`Attachments v6: ${ok}/${checks.length}`);
if(ok!==checks.length)process.exit(1);
