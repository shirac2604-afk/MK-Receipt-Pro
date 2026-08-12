import fs from "node:fs";
const read=p=>fs.readFileSync(p,"utf8");
const app=JSON.parse(read("app.json"));
const pkg=JSON.parse(read("package.json"));
const trusted=read("src/security/TrustedExternalUrl.ts");
const expenses=read("src/screens/ExpensesScreen.tsx");
const workflow=read("src/services/ReceiptDocumentWorkflow.ts");
const attach=read("src/services/ExpenseAttachmentService.ts");
const supa=read("src/lib/supabase.ts");
function atLeast104(raw){const m=String(raw||"").match(/^(\d+)\.(\d+)\.(\d+)/);if(!m)return false;const value=Number(m[1])*1_000_000+Number(m[2])*1_000+Number(m[3]);return value>=1_000_004}
const tests=[
 ["version baseline",atLeast104(pkg.version)&&atLeast104(app.expo.version)],
 ["versionCode baseline",Number(app.expo.android.versionCode)>=6],
 ["signed URL HTTPS only",trusted.includes('url.protocol!=="https:"')],
 ["signed URL host pinned",trusted.includes('noimclnzzuxcszdotmby.supabase.co')],
 ["signed URL storage path pinned",trusted.includes('/storage/v1/object/sign/')],
 ["expense URL checked",expenses.includes('assertTrustedSupabaseSignedUrl(url)')],
 ["receipt URL checked",workflow.includes('assertTrustedSupabaseSignedUrl(url)')],
 ["attachment MIME allowlist",attach.includes('ALLOWED_IMAGE_MIMES')&&attach.includes('UNSUPPORTED_ATTACHMENT_TYPE')],
 ["attachment size limit",(attach.includes('MAX_ATTACHMENT_BYTES')||attach.includes('MAX_ATTACHMENT_BASE64_CHARS'))&&attach.includes('ATTACHMENT_TOO_LARGE')],
 ["auth remains SecureStore",supa.includes('SecureStore.setItemAsync')&&supa.includes('AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY')]
];
let pass=0;for(const [name,ok] of tests){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)pass++;}
console.log(`Android intrusion hardening: ${pass}/${tests.length}`);if(pass!==tests.length)process.exit(1);
