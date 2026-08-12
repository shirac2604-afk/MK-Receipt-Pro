import fs from "node:fs";
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const sql=fs.readFileSync("cloud/sql/005_business_branding.sql","utf8");
const svc=fs.readFileSync("src/services/BusinessBrandingService.ts","utf8");
const repo=fs.readFileSync("src/data/supabase/BusinessRepository.ts","utf8");
const screen=fs.readFileSync("src/screens/MoreScreen.tsx","utf8");
const pdf=fs.readFileSync("src/services/ReceiptPdfService.ts","utf8");
const checks=[
 [pkg.version==="1.0.0-foundation.8","version 8"],
 [sql.includes("logo_storage_key"),"logo database field"],
 [sql.includes("business-branding"),"private branding bucket policies"],
 [svc.includes("pickBusinessLogo"),"gallery logo picker"],
 [svc.includes("upsert:true"),"logo replacement"],
 [svc.includes("getBusinessLogoDataUrl"),"private logo data URL"],
 [repo.includes("updateBusinessProfile"),"cloud profile update"],
 [repo.includes("logo_storage_key"),"cloud logo profile load"],
 [screen.includes("הגדרות העסק"),"business settings UI"],
 [screen.includes("בחירת לוגו מהגלריה"),"logo picker UI"],
 [screen.includes("שמירת פרטי העסק"),"business save UI"],
 [pdf.includes("business.logoDataUrl"),"PDF business logo slot"]
];
let ok=0;for(const[p,l]of checks){console.log(p?"PASS":"FAIL",l);if(p)ok++}
console.log(`Business branding v8: ${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
