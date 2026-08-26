import fs from "node:fs";

const service=fs.readFileSync("apps/desktop/electron/main/SupabaseCloudService.ts","utf8");
const policy=fs.readFileSync("apps/desktop/electron/main/passwordPolicy.ts","utf8");
const handlers=fs.readFileSync("apps/desktop/electron/ipc/databaseHandlers.ts","utf8");
const preload=fs.readFileSync("apps/desktop/electron/preload/preload.ts","utf8");
const renderer=fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));

const checks=[
  [service.includes("async changePassword(currentPassword:string,newPassword:string)"),"password change is centralized in the Electron main process"],
  [service.includes("assertCurrentDeviceActive(0)")&&service.includes("this.client.auth.getUser()"),"active device and current user are revalidated"],
  [service.includes("this.client.auth.signInWithPassword")&&service.includes("verified.user.id!==current.user.id"),"current password and identity are verified"],
  [service.includes("this.client.auth.updateUser({password:newPassword})"),"password update uses the authenticated Supabase user"],
  [policy.includes("MIN_NEW_PASSWORD_LENGTH=8")&&policy.includes("MAX_PASSWORD_LENGTH=128"),"new password length is bounded"],
  [handlers.includes('"cloud-account:change-password"')&&handlers.includes("AUTH_CURRENT_PASSWORD_INVALID"),"trusted IPC route returns sanitized auth errors"],
  [preload.includes("changePassword:(input:SupabaseCloudPasswordChangeInput)"),"preload exposes a typed minimal operation"],
  [renderer.includes("newPasswordConfirmation")&&renderer.includes('autoComplete="new-password"'),"Windows UI confirms and masks the new password"],
  [service.includes("async requestPasswordRecovery")&&service.includes('PASSWORD_RESET_REDIRECT_URL="mkreceiptpro://auth/recovery"')&&service.includes("async completePasswordRecovery"),"password recovery uses the dedicated Phase 15 application-link flow"],
  [String(pkg.scripts?.["release:production:win"]||"").includes("check:password-change"),"Windows release gate includes password-change checks"]
];

for(const [ok,label] of checks)console.log(`${ok?"PASS":"FAIL"} ${label}`);
const passed=checks.filter(([ok])=>ok).length;
console.log(`Windows password change: ${passed}/${checks.length}`);
if(passed!==checks.length)process.exit(1);
