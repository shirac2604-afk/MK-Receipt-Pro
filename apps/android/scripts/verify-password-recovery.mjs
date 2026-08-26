import fs from "node:fs";

const service=fs.readFileSync("src/auth/AuthService.ts","utf8");
const screen=fs.readFileSync("src/screens/AuthScreen.tsx","utf8");
const config=fs.readFileSync("app.json","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));

const checks=[
  [service.includes("createEphemeralRecoveryClient")&&service.includes("persistSession:false")&&service.includes("autoRefreshToken:false"),"recovery client does not persist a session"],
  [service.includes("resetPasswordForEmail(email)")&&!service.includes("redirectTo:"),"recovery request does not add a callback URL"],
  [service.includes('verifyOtp({email,token,type:"recovery"})')&&service.includes("verifiedEmail!==email"),"recovery code and email identity are verified together"],
  [service.includes("validateNewPassword(email,newPassword)")&&service.includes('updateUser({password:newPassword})'),"recovered password uses the existing policy before update"],
  [service.includes('signOut({scope:"global"})')&&service.includes('supabase.auth.signOut({scope:"local"})'),"successful recovery invalidates sessions and clears the local client"],
  [service.includes("MAX_RECOVERY_REQUESTS_PER_WINDOW")&&service.includes("MAX_RECOVERY_VERIFY_ATTEMPTS_PER_WINDOW"),"local request and verification throttles are present"],
  [screen.includes("שחזור סיסמה באמצעות קוד מהאימייל")&&screen.includes("secureTextEntry")&&screen.includes("one-time-code"),"Android UI masks the new password and accepts an OTP"],
  [!config.includes('"scheme"')&&!config.includes('"intentFilters"'),"recovery does not add an Android deep link"],
  [String(pkg.scripts?.["release:check"]||"").includes("verify:password-recovery"),"Android release gate includes password recovery checks"]
];

for(const [ok,label] of checks)console.log(`${ok?"PASS":"FAIL"} ${label}`);
const passed=checks.filter(([ok])=>ok).length;
console.log(`Android password recovery: ${passed}/${checks.length}`);
if(passed!==checks.length)process.exit(1);
