import fs from "node:fs";

const service=fs.readFileSync("apps/desktop/electron/main/SupabaseCloudService.ts","utf8");
const main=fs.readFileSync("apps/desktop/electron/main/main.ts","utf8");
const handlers=fs.readFileSync("apps/desktop/electron/ipc/databaseHandlers.ts","utf8");
const preload=fs.readFileSync("apps/desktop/electron/preload/preload.ts","utf8");
const renderer=fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8");
const recoveryRenderer=fs.readFileSync("apps/desktop/renderer/src/PasswordRecovery.tsx","utf8");
const indexHtml=fs.readFileSync("apps/desktop/renderer/index.html","utf8");
const globalTypes=fs.readFileSync("apps/desktop/renderer/src/global.d.ts","utf8");
const types=fs.readFileSync("packages/database/src/types.ts","utf8");
const productionConfig=fs.readFileSync("apps/desktop/electron/main/SupabaseCloudConfig.production.ts","utf8");
const stagingConfig=fs.readFileSync("apps/desktop/electron/main/SupabaseCloudConfig.staging.ts","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));

const checks=[
  [service.includes("createEphemeralRecoveryClient")&&service.includes("persistSession:false")&&service.includes("autoRefreshToken:false")&&service.includes("detectSessionInUrl:false"),"recovery client does not persist, refresh, or automatically consume URL sessions"],
  [service.includes('PASSWORD_RESET_REDIRECT_URL="mkreceiptpro://auth/recovery"')&&service.includes("resetPasswordForEmail(email,{redirectTo:PASSWORD_RESET_REDIRECT_URL})"),"recovery request targets the registered application callback"],
  [service.includes("parseRecoveryLink")&&service.includes('url.protocol!=="mkreceiptpro:"')&&service.includes('url.hostname!=="auth"')&&service.includes('url.pathname!=="/recovery"')&&service.includes('fragment.get("type")!=="recovery"')&&service.includes("getUser()"),"main process validates and verifies the recovery callback"],
  [service.includes("activeRecovery")&&service.includes('signOut({scope:"global"})')&&service.includes('signOut({scope:"local"})'),"recovery session is memory-only and cleared after update"],
  [service.includes("MAX_RECOVERY_REQUESTS_PER_WINDOW")&&!service.includes("verifyOtp")&&!service.includes("RECOVERY_TOKEN_RE"),"local throttle remains without OTP recovery"],
  [main.includes('RECOVERY_PROTOCOL="mkreceiptpro"')&&main.includes("requestSingleInstanceLock")&&main.includes("second-instance")&&main.includes("beginPasswordRecovery"),"Windows registers and safely receives a single-instance callback"],
  [JSON.stringify(pkg.build?.protocols||[]).includes("mkreceiptpro"),"Windows installer registers the recovery protocol"],
  [handlers.includes('"cloud-account:password-recovery-status"')&&handlers.includes('"cloud-account:complete-password-recovery"')&&handlers.includes('"cloud-account:request-password-recovery"'),"trusted IPC exposes recovery request, status and password update without a raw link channel"],
  [preload.includes("requestPasswordRecovery")&&preload.includes("getPasswordRecoveryStatus")&&preload.includes("completePasswordRecovery")&&!preload.includes("beginPasswordRecovery"),"preload exposes only guarded recovery operations and never raw recovery credentials"],
  [globalTypes.includes("requestPasswordRecovery")&&globalTypes.includes("getPasswordRecoveryStatus")&&globalTypes.includes("completePasswordRecovery")&&!globalTypes.includes("access_token")&&!globalTypes.includes("refresh_token"),"renderer type boundary exposes only the guarded recovery API"],
  [types.includes("SupabaseCloudPasswordRecoveryRequestInput")&&types.includes("SupabaseCloudPasswordRecoveryCompleteInput")&&!types.includes("access_token")&&!types.includes("refresh_token"),"IPC types carry recovery request/password data but never recovery tokens"],
  [indexHtml.includes('/src/PasswordRecovery.tsx'),"Windows renderer entry loads the dedicated recovery UI"],
  [recoveryRenderer.includes("requestPasswordRecovery")&&recoveryRenderer.includes("getPasswordRecoveryStatus")&&recoveryRenderer.includes("completePasswordRecovery")&&recoveryRenderer.includes("autoComplete=\"new-password\"")&&!recoveryRenderer.includes('autoComplete=\"one-time-code\"')&&!recoveryRenderer.includes("verifyOtp")&&!recoveryRenderer.includes("access_token")&&!recoveryRenderer.includes("refresh_token"),"Windows recovery UI uses the guarded API, verifies readiness by status, and has no OTP/token input"],
  [productionConfig.includes("PASSWORD_RECOVERY_ENABLED=false")&&stagingConfig.includes("PASSWORD_RECOVERY_ENABLED=true")&&handlers.includes('"cloud-account:password-recovery-enabled"')&&handlers.includes("AUTH_RECOVERY_DISABLED")&&preload.includes("isPasswordRecoveryEnabled")&&globalTypes.includes("isPasswordRecoveryEnabled")&&recoveryRenderer.includes("isPasswordRecoveryEnabled")&&recoveryRenderer.includes("if(!enabled)return null"),"recovery UI is disabled in personal Production and enabled only for Staging"],
  [!renderer.includes("beginPasswordRecovery")&&!renderer.includes("verifyOtp")&&!renderer.includes("access_token")&&!renderer.includes("refresh_token"),"main application renderer remains token-blind"],
  [String(pkg.scripts?.["release:production:win"]||"").includes("check:password-recovery"),"Windows release gate includes password recovery checks"]
];

for(const [ok,label] of checks)console.log(`${ok?"PASS":"FAIL"} ${label}`);
const passed=checks.filter(([ok])=>ok).length;
console.log(`Windows password recovery: ${passed}/${checks.length}`);
if(passed!==checks.length)process.exit(1);
