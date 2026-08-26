import fs from "node:fs";

const service=fs.readFileSync("apps/desktop/electron/main/SupabaseCloudService.ts","utf8");
const main=fs.readFileSync("apps/desktop/electron/main/main.ts","utf8");
const handlers=fs.readFileSync("apps/desktop/electron/ipc/databaseHandlers.ts","utf8");
const preload=fs.readFileSync("apps/desktop/electron/preload/preload.ts","utf8");
const renderer=fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8");
const types=fs.readFileSync("packages/database/src/types.ts","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));

const checks=[
  [service.includes("createEphemeralRecoveryClient")&&service.includes("persistSession:false")&&service.includes("autoRefreshToken:false")&&service.includes("detectSessionInUrl:false"),"recovery client does not persist, refresh, or automatically consume URL sessions"],
  [service.includes('PASSWORD_RESET_REDIRECT_URL="mkreceiptpro://auth/recovery"')&&service.includes("resetPasswordForEmail(email,{redirectTo:PASSWORD_RESET_REDIRECT_URL})"),"recovery request targets the registered application callback"],
  [service.includes("parseRecoveryLink")&&service.includes('url.protocol!=="mkreceiptpro:"')&&service.includes('fragment.get("type")!=="recovery"')&&service.includes("getUser()"),"main process validates and verifies the recovery callback"],
  [service.includes("activeRecovery")&&service.includes('signOut({scope:"global"})')&&service.includes('signOut({scope:"local"})'),"recovery session is memory-only and cleared after update"],
  [service.includes("MAX_RECOVERY_REQUESTS_PER_WINDOW")&&!service.includes("verifyOtp")&&!service.includes("RECOVERY_TOKEN_RE"),"local throttle remains without OTP recovery"],
  [main.includes('RECOVERY_PROTOCOL="mkreceiptpro"')&&main.includes("requestSingleInstanceLock")&&main.includes("second-instance")&&main.includes("beginPasswordRecovery"),"Windows registers and safely receives a single-instance callback"],
  [JSON.stringify(pkg.build?.protocols||[]).includes("mkreceiptpro"),"Windows installer registers the recovery protocol"],
  [handlers.includes('"cloud-account:password-recovery-status"')&&handlers.includes('"cloud-account:complete-password-recovery"'),"trusted IPC exposes status and password update without a raw link channel"],
  [preload.includes("getPasswordRecoveryStatus")&&preload.includes("completePasswordRecovery")&&!preload.includes("beginPasswordRecovery"),"preload never exposes raw recovery credentials"],
  [types.includes("SupabaseCloudPasswordRecoveryCompleteInput")&&!types.includes("access_token")&&!types.includes("refresh_token"),"IPC types carry a new password but never recovery tokens"],
  [renderer.includes("requestPasswordRecovery")&&!renderer.includes('autoComplete="one-time-code"')&&!renderer.includes("verifyOtp")&&!renderer.includes("access_token")&&!renderer.includes("refresh_token"),"Windows UI offers the secure recovery-link request flow and never accepts OTP or raw recovery tokens"],
  [String(pkg.scripts?.["release:production:win"]||"").includes("check:password-recovery"),"Windows release gate includes password recovery checks"]
];

for(const [ok,label] of checks)console.log(`${ok?"PASS":"FAIL"} ${label}`);
const passed=checks.filter(([ok])=>ok).length;
console.log(`Windows password recovery: ${passed}/${checks.length}`);
if(passed!==checks.length)process.exit(1);
