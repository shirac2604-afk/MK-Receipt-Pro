import fs from "node:fs";
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const pdf=fs.readFileSync("src/services/ReceiptPdfService.ts","utf8");
const brand=fs.readFileSync("src/branding/CompanyBrand.ts","utf8");
const checks=[[pkg.version==="1.0.0-foundation.7.5","version 7.5"],[brand.includes('companyName:"מפתחות להצלחה"'),"company brand retained"],[brand.includes("data:image/png;base64,"),"logo retained"],[!brand.includes("MK Receipt Pro"),"product name removed from brand"],[!pdf.includes("productName"),"product name removed from PDF"],[!pdf.includes("MK Receipt Pro"),"MK Receipt Pro absent from PDF"],[pdf.includes("COMPANY_BRAND.logoDataUrl"),"company logo still shown"],[pdf.includes("${escapeHtml(business.businessName)}"),"business remains primary"]]; let ok=0; for(const [p,l] of checks){console.log(p?"PASS":"FAIL",l); if(p)ok++} console.log(`Branding clean v7.5: ${ok}/${checks.length}`); if(ok!==checks.length) process.exit(1);
