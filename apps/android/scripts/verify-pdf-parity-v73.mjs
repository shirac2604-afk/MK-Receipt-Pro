import fs from "node:fs";
const pdf=fs.readFileSync("src/services/ReceiptPdfService.ts","utf8");
const business=fs.readFileSync("src/data/supabase/BusinessRepository.ts","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const checks=[
 [/^\\d+\\.\\d+\\.\\d+$/.test(pkg.version),"release version"],
 [pdf.includes('@page{size:A4;margin:10mm}'),"A4 parity"],
 [pdf.includes("#4d76b8"),"blue receipt accent"],
 [pdf.includes("document-line")&&pdf.includes("border-bottom:3px solid #4d76b8"),"blue document line"],
 [pdf.includes("מסמך תקבול לעוסק פטור"),"document subtitle"],
 [pdf.includes("לכבוד:"),"client section"],
 [pdf.includes("מאת:"),"business section"],
 [pdf.includes("סכום שהתקבל")&&pdf.includes("סה״כ"),"total table"],
 [pdf.includes("עוסק פטור אינו רשאי להוציא חשבונית מס."),"legal footer"],
 [pdf.includes("Maptehot LaHatzlaha"),"technical footer"],
 [business.includes("phone,email,address,slogan"),"full business profile"]
];
let ok=0;
for(const [p,l] of checks){console.log(p?"PASS":"FAIL",l);if(p)ok++}
console.log(`Blue receipt PDF parity: ${ok}/${checks.length}`);
if(ok!==checks.length)process.exit(1);
