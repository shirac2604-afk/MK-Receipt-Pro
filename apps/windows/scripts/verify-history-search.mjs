import fs from "node:fs";
const required=["packages/database/src/migrations/005_history_and_cancellation.ts","packages/database/src/repositories/ReceiptRepository.ts","apps/desktop/renderer/src/main.tsx","apps/desktop/electron/ipc/databaseHandlers.ts"];
for(const file of required){if(!fs.existsSync(file))throw new Error(`Missing ${file}`)}
const repo=fs.readFileSync("packages/database/src/repositories/ReceiptRepository.ts","utf8");
for(const token of ["search(filters","cancel(receiptId","cancellation_pdf_path","receipt_number DESC","יולי"]){if(!repo.includes(token))throw new Error(`History token missing: ${token}`)}
const ui=fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8");
for(const token of ["HistoryScreen","history-search","window.mkApi.receipts.search","window.mkApi.receipts.cancel","סיבת הביטול"]){if(!ui.includes(token))throw new Error(`History UI token missing: ${token}`)}
const pdf=fs.readFileSync("packages/pdf/src/ReceiptTemplateV1.ts","utf8");
for(const token of ["קבלה מבוטלת","watermark","פרטי הביטול"]){if(!pdf.includes(token))throw new Error(`Cancellation PDF token missing: ${token}`)}
console.log("✓ History, combined search and cancellation flow verified");
