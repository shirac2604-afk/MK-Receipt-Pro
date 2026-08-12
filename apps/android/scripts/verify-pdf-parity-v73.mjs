import fs from "node:fs";
const pdf=fs.readFileSync("src/services/ReceiptPdfService.ts","utf8");
const business=fs.readFileSync("src/data/supabase/BusinessRepository.ts","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const checks=[
 [pkg.version==="1.0.0-foundation.7.3","version 7.3"],
 [pdf.includes('@page{size:A4;margin:10mm}'),"A4 parity"],
 [pdf.includes("#5146c8"),"Windows primary color"],
 [pdf.includes("linear-gradient(90deg,#5146c8,#7c6ee6,#62c6c2)"),"Windows top accent"],
 [pdf.includes("מסמך תקבול לעוסק פטור"),"document subtitle"],
 [pdf.includes("התקבל מאת"),"client card"],
 [pdf.includes("עוסק פטור לפי חוק מס ערך מוסף"),"business legal card"],
 [pdf.includes("סה״כ התקבל"),"amount panel"],
 [pdf.includes("עוסק פטור אינו רשאי להוציא חשבונית מס."),"legal footer"],
 [pdf.includes("Maptehot LaHatzlaha"),"technical footer"],
 [business.includes("phone,email,address,slogan"),"full business profile"]
];
let ok=0;
for(const [p,l] of checks){console.log(p?"PASS":"FAIL",l);if(p)ok++}
console.log(`PDF parity v7.3: ${ok}/${checks.length}`);
if(ok!==checks.length)process.exit(1);
