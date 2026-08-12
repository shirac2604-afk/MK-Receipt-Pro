import fs from "node:fs";
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const screen=fs.readFileSync("src/screens/ReceiptsScreen.tsx","utf8");
const workflow=fs.readFileSync("src/services/ReceiptDocumentWorkflow.ts","utf8");
const pdf=fs.readFileSync("src/services/ReceiptPdfService.ts","utf8");
const repo=fs.readFileSync("src/data/supabase/ReceiptRepository.ts","utf8");
const checks=[[pkg.version==="1.0.0-foundation.8.2","version 8.2"],[workflow.includes("uploadReceiptPdf"),"PDF upload workflow"],[workflow.includes("setPdfStorageKey"),"save PDF key"],[workflow.includes("openStoredReceiptPdf"),"open stored PDF"],[pdf.includes("createSignedUrl"),"signed URL"],[pdf.includes("Date.now()"),"orphan-safe storage key"],[screen.includes("צור PDF מחדש"),"regenerate UI"],[screen.includes("פתח PDF"),"open UI"],[screen.includes("מעלה PDF לענן"),"progress UI"],[repo.includes("Promise<Receipt>"),"updated receipt returned"]];
let ok=0;for(const[p,l]of checks){console.log(p?"PASS":"FAIL",l);if(p)ok++}console.log(`PDF recovery v8.2: ${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
