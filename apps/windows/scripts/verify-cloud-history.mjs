import fs from "node:fs";
const svc=fs.readFileSync("apps/desktop/electron/main/SupabaseCloudService.ts","utf8");
const ipc=fs.readFileSync("apps/desktop/electron/ipc/databaseHandlers.ts","utf8");
const ui=fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const checks=[
 [pkg.version==="1.1.1-cloud.3.1","version"],
 [svc.includes("async searchReceipts(filters:ReceiptSearchFilters)"),"cloud receipt search"],
 [svc.includes("pdf_storage_key"),"cloud PDF key"],
 [svc.includes("createSignedUrl(key,300)"),"private signed PDF URL"],
 [svc.includes("downloadReceiptPdf"),"cloud PDF download for sharing"],
 [ipc.includes("supabaseCloud.searchReceipts(filters)"),"history IPC cloud source"],
 [ipc.includes("supabaseCloud.getReceiptPdfUrl"),"open cloud PDF"],
 [ipc.includes("supabaseCloud.downloadReceiptPdf"),"share cloud PDF"],
 [ui.includes("cloudHistory"),"cloud history UI state"],
 [ui.includes("ביטול קבלה בענן יתווסף בשלב הבא"),"safe cloud cancellation guard"]
];
let ok=0;for(const[p,l]of checks){console.log(p?"PASS":"FAIL",l);if(p)ok++}console.log(`Cloud receipt history: ${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
