import fs from "node:fs";
const repo=fs.readFileSync("src/data/supabase/BusinessRepository.ts","utf8");
const dashboard=fs.readFileSync("src/screens/DashboardScreen.tsx","utf8");
const receipts=fs.readFileSync("src/services/ReceiptPdfService.ts","utf8");
const checks=[
 [repo.includes('import {COMPANY_BRAND}')&&repo.includes('let logoDataUrl:string|null=COMPANY_BRAND.logoDataUrl'),"business profile retains embedded brand logo as a persistent fallback"],
 [repo.includes("if(data.logo_storage_key)")&&repo.includes("getBusinessLogoDataUrl(data.logo_storage_key)"),"saved cloud logo remains preferred when available"],
 [dashboard.includes("profile.logoDataUrl")&&receipts.includes("business.logoDataUrl"),"dashboard and receipt rendering use the persistent business profile logo"]
];
let passed=0;for(const [ok,label] of checks){console.log(ok?"PASS":"FAIL",label);if(ok)passed++;}
console.log(`Branding persistence: ${passed}/${checks.length}`);if(passed!==checks.length)process.exit(1);
