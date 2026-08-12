import fs from "node:fs";
const required=["packages/pdf/src/ReceiptPdfService.ts","packages/pdf/src/ReceiptTemplateV1.ts","packages/database/src/migrations/003_pdf_engine.ts","resources/branding/logo.png"];
for(const file of required){ if(!fs.existsSync(new URL(`../${file}`,import.meta.url))) throw new Error(`Missing ${file}`); }
const service=fs.readFileSync(new URL("../packages/pdf/src/ReceiptPdfService.ts",import.meta.url),"utf8");
for(const token of ["printToPDF","קבלה-${model.receiptNumber}-${fileSuffix}.pdf","PDF_EXISTING_FILE_CONFLICT","sha256"]){ if(!service.includes(token)) throw new Error(`Missing PDF safeguard: ${token}`); }
console.log("✓ PDF Engine structure and safeguards verified");
