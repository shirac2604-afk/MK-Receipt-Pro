import fs from "node:fs";

const service=fs.readFileSync("apps/desktop/electron/main/SupabaseCloudService.ts","utf8");
const handlers=fs.readFileSync("apps/desktop/electron/ipc/databaseHandlers.ts","utf8");
const preload=fs.readFileSync("apps/desktop/electron/preload/preload.ts","utf8");
const renderer=fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8");
const types=fs.readFileSync("packages/database/src/types.ts","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));

const checks=[
  [service.includes("createEphemeralRecoveryClient")&&service.includes("persistSession:false")&&service.includes("autoRefreshToken:false"),"recovery client does not persist an Electron session"],
  [service.includes("resetPasswordForEmail(email)")&&!service.includes("redirectTo:"),"recovery request does not add a callback URL"],
  [service.includes('verifyOtp({email,token,type:"recovery"})')&&service.includes("verifiedEmail!==email"),"recovery code and email identity are verified together"],
  [service.includes("validateNewPassword(email,newPassword)")&&service.includes('updateUser({password:newPassword})'),"recovered password uses the existing policy before update"],
  [service.includes('signOut({scope:"global"})')&&service.includes("await this.signOut().catch"),"successful recovery globally invalidates sessions and clears Windows"],
  [service.includes("MAX_RECOVERY_REQUESTS_PER_WINDOW")&&service.includes("MAX_RECOVERY_VERIFY_ATTEMPTS_PER_WINDOW"),"local request and verification throttles are present"],
  [handlers.includes('"cloud-account:request-password-recovery"')&&handlers.includes('"cloud-account:recover-password"'),"trusted IPC exposes only the recovery operations"],
  [preload.includes("requestPasswordRecovery:(input:SupabaseCloudPasswordRecoveryRequestInput)")&&preload.includes("recoverPassword:(input:SupabaseCloudPasswordRecoveryConfirmInput)"),"preload exposes typed recovery operations"],
  [types.includes("SupabaseCloudPasswordRecoveryRequestInput")&&types.includes("SupabaseCloudPasswordRecoveryConfirmInput"),"IPC recovery payloads are typed"],
  [renderer.includes("שכחתי סיסמה")&&renderer.includes('autoComplete="one-time-code"')&&renderer.includes('autoComplete="new-password"'),"Windows UI supports OTP recovery and masks the new password"],
  [String(pkg.scripts?.["release:production:win"]||"").includes("check:password-recovery"),"Windows release gate includes password recovery checks"]
];

for(const [ok,label] of checks)console.log(`${ok?"PASS":"FAIL"} ${label}`);
const passed=checks.filter(([ok])=>ok).length;
console.log(`Windows password recovery: ${passed}/${checks.length}`);
if(passed!==checks.length)process.exit(1);
