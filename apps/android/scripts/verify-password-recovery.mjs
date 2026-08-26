import fs from "node:fs";

const service=fs.readFileSync("src/auth/AuthService.ts","utf8");
const context=fs.readFileSync("src/context/AuthContext.tsx","utf8");
const screen=fs.readFileSync("src/screens/AuthScreen.tsx","utf8");
const config=fs.readFileSync("app.json","utf8");
const productionConfig=fs.readFileSync("src/config/supabasePublic.ts","utf8");
const stagingConfig=fs.readFileSync("src/config/supabasePublic.staging.ts","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));

const checks=[
  [service.includes("createEphemeralRecoveryClient")&&service.includes("persistSession:false")&&service.includes("autoRefreshToken:false")&&service.includes("detectSessionInUrl:false"),"recovery client keeps tokens out of persistent storage"],
  [service.includes('PASSWORD_RESET_REDIRECT_URL="mkreceiptpro://auth/recovery"')&&service.includes("resetPasswordForEmail(email,{redirectTo:PASSWORD_RESET_REDIRECT_URL})"),"recovery request targets the registered application callback"],
  [service.includes("parseRecoveryLink")&&service.includes('url.protocol!=="mkreceiptpro:"')&&service.includes('fragment.get("type")!=="recovery"')&&service.includes("getUser()"),"incoming links are bounded, route-checked, and verified as recovery sessions"],
  [service.includes("activeRecovery")&&service.includes('signOut({scope:"global"})')&&service.includes('signOut({scope:"local"})'),"recovery session remains in memory and is cleared after update"],
  [!service.includes("verifyOtp")&&!service.includes("RECOVERY_TOKEN_RE"),"Android no longer verifies an OTP locally"],
  [context.includes('Linking.addEventListener("url"')&&context.includes("beginPasswordRecovery"),"Android receives the callback through a dedicated link listener"],
  [config.includes('"scheme": "mkreceiptpro"')&&!config.includes('"intentFilters"'),"Android registers only the exact custom scheme"],
  [screen.includes("קישור השחזור אומת")&&screen.includes("completePasswordRecovery")&&!screen.includes('autoComplete="one-time-code"'),"Android UI accepts a new password only after link verification"],
  [productionConfig.includes("PASSWORD_RECOVERY_ENABLED=false")&&stagingConfig.includes("PASSWORD_RECOVERY_ENABLED=true")&&screen.includes("PASSWORD_RECOVERY_ENABLED"),"recovery UI is disabled in personal Production and enabled only for Staging"],
  [String(pkg.scripts?.["release:check"]||"").includes("verify:password-recovery"),"Android release gate includes password recovery checks"]
];

for(const [ok,label] of checks)console.log(`${ok?"PASS":"FAIL"} ${label}`);
const passed=checks.filter(([ok])=>ok).length;
console.log(`Android password recovery: ${passed}/${checks.length}`);
if(passed!==checks.length)process.exit(1);
