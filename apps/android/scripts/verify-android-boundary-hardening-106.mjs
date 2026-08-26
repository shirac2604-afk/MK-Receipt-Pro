import fs from "node:fs";

const safeImage=fs.readFileSync("src/security/SafeImage.ts","utf8");
const expense=fs.readFileSync("src/services/ExpenseAttachmentService.ts","utf8");
const branding=fs.readFileSync("src/services/BusinessBrandingService.ts","utf8");
const supabase=fs.readFileSync("src/lib/supabase.ts","utf8");
const app=JSON.parse(fs.readFileSync("app.json","utf8"));
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));

const expo=app.expo||{};
const checks=[
 ["session uses SecureStore",supabase.includes('expo-secure-store')&&supabase.includes('AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY')],
 ["session URL detection disabled",supabase.includes('detectSessionInUrl:false')],
 ["only the bounded recovery scheme is registered",expo.scheme==="mkreceiptpro"&&!expo.android?.intentFilters],
 ["shared image MIME allowlist",safeImage.includes('image/jpeg')&&safeImage.includes('image/png')&&safeImage.includes('image/webp')],
 ["image magic-byte validation",safeImage.includes('0x89,0x50,0x4e,0x47')&&safeImage.includes('0xff&&bytes[1]===0xd8')&&safeImage.includes('"RIFF"')&&safeImage.includes('"WEBP"')],
 ["decoded byte size validation",safeImage.includes('buffer.byteLength<=0||buffer.byteLength>maxBytes')],
 ["expense validates decoded image",expense.includes('decodeAndValidateImage')&&expense.includes('MAX_ATTACHMENT_BYTES')],
 ["logo validates upload content",branding.includes('decodeAndValidateImage')&&branding.includes('MAX_LOGO_BYTES')],
 ["logo signed URL pinned",branding.includes('assertTrustedSupabaseSignedUrl(data.signedUrl)')],
 ["logo fetch forbids redirects",branding.includes('fetch(trustedUrl,{redirect:"error"})')],
 ["release gate enabled",String(pkg.scripts?.["release:check"]||"").includes('verify:android-boundary-hardening')]
];
for(const [name,ok] of checks)console.log(`${ok?"PASS":"FAIL"} ${name}`);
const passed=checks.filter(([,ok])=>ok).length;
console.log(`Android boundary hardening: ${passed}/${checks.length}`);
if(passed!==checks.length)process.exit(1);
