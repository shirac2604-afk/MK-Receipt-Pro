import fs from "node:fs";
const s=fs.readFileSync("apps/desktop/electron/main/SupabaseCloudService.ts","utf8");
const p=JSON.parse(fs.readFileSync("package.json","utf8"));
const checks=[
[p.version==="1.1.1-cloud.3.3.2","version"],
[!s.includes("attachment_path"),"no legacy cloud attachment_path"],
[s.includes("attachment_storage_key"),"uses attachment_storage_key"],
[s.includes("attachment_original_name"),"uses attachment_original_name"],
[s.includes('storage.from("expense-attachments")'),"shared storage bucket"],
[s.includes("CLOUD_EXPENSE_ATTACHMENT_UPLOAD_FAILED"),"upload diagnostics"],
[s.includes("CLOUD_EXPENSE_ATTACHMENT_LINK_FAILED"),"link diagnostics"]
];
let ok=0;for(const [pass,label] of checks){console.log(pass?"PASS":"FAIL",label);if(pass)ok++;}
console.log(`Cloud expense schema fix: ${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
