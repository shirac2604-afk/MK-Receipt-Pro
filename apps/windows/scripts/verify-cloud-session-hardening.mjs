import fs from "node:fs";

const service=fs.readFileSync("apps/desktop/electron/main/SupabaseCloudService.ts","utf8");
const handlers=fs.readFileSync("apps/desktop/electron/ipc/databaseHandlers.ts","utf8");
const main=fs.readFileSync("apps/desktop/electron/main/main.ts","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));

const checks=[
  [service.includes("assertCurrentDeviceActive")&&service.includes('is("revoked_at",null)'),"active device is revalidated server-side"],
  [service.includes("activeDeviceValidatedAt")&&service.includes("activeDeviceCheck"),"device validation is cached and single-flight"],
  [service.includes('throw new Error("CLOUD_DEVICE_REVOKED")'),"revoked device fails closed"],
  [main.includes("deviceRevocationTimer")&&main.includes("assertCurrentDeviceActive(0)"),"main process performs global revocation polling"],
  [service.includes("MAX_CLOUD_EXPENSE_ATTACHMENT_BYTES=10*1024*1024"),"cloud attachment size is bounded"],
  [service.includes("verifyCloudExpenseAttachment(bytes)")&&service.includes('toString("ascii")==="%PDF-"')&&service.includes('toString("ascii")==="WEBP"'),"cloud attachment content signature is verified"],
  [service.includes("crypto.randomUUID()")&&!service.includes('path.extname(expense.attachmentOriginalName??expense.attachmentPath)'),"download name and extension are not cloud-controlled"],
  [handlers.includes('const verifiedPath=validateUserFile(filePath,"expense")')&&handlers.includes("shell.openPath(verifiedPath)"),"IPC revalidates every attachment before OS open"],
  [String(pkg.scripts?.["release:production:win"]||"").includes("check:cloud-session-hardening"),"Windows release gate includes session hardening"]
];

for(const [ok,label] of checks)console.log(`${ok?"PASS":"FAIL"} ${label}`);
const passed=checks.filter(([ok])=>ok).length;
console.log(`Windows cloud session hardening: ${passed}/${checks.length}`);
if(passed!==checks.length)process.exit(1);
