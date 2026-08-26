import fs from "node:fs";

const service=fs.readFileSync("src/auth/AuthService.ts","utf8");
const screen=fs.readFileSync("src/screens/AuthScreen.tsx","utf8");
const config=fs.readFileSync("app.json","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));

const checks=[
  [service.includes("createEphemeralRecoveryClient")&&service.includes("persistSession:false")&&service.includes("autoRefreshToken:false"),"recovery client does not persist a session"],
  [service.includes("resetPasswordForEmail(email,{redirectTo:PASSWORD_RESET_REDIRECT_URL})")&&service.includes("PASSWORD_RESET_REDIRECT_URL"),"recovery request uses the controlled HTTPS reset page"],
  [!service.includes("verifyOtp")&&!service.includes("RECOVERY_TOKEN_RE"),"Android recovery no longer verifies an OTP locally"],
  [screen.includes("שחזור סיסמה באמצעות קישור מאובטח")&&screen.includes("נשלח אליה קישור מאובטח"),"Android UI explains the secure reset-link flow"],
  [screen.includes("אין להזין כאן קוד שחזור"),"Android UI does not request a recovery code"],
  [!config.includes('"scheme"')&&!config.includes('"intentFilters"'),"recovery does not add an Android deep link"],
  [String(pkg.scripts?.["release:check"]||"").includes("verify:password-recovery"),"Android release gate includes password recovery checks"]
];

for(const [ok,label] of checks)console.log(`${ok?"PASS":"FAIL"} ${label}`);
const passed=checks.filter(([ok])=>ok).length;
console.log(`Android password recovery: ${passed}/${checks.length}`);
if(passed!==checks.length)process.exit(1);
