import fs from "node:fs";

const service=fs.readFileSync("src/auth/AuthService.ts","utf8");
const context=fs.readFileSync("src/context/AuthContext.tsx","utf8");
const screen=fs.readFileSync("src/screens/MoreScreen.tsx","utf8");
const policy=fs.readFileSync("src/auth/passwordPolicy.ts","utf8");
const config=fs.readFileSync("app.json","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));

const checks=[
  [service.includes("async changePassword(currentPassword:string,newPassword:string)"),"password change is centralized in AuthService"],
  [service.includes("supabase.auth.getUser()")&&service.includes("supabase.auth.signInWithPassword"),"current user and current password are verified"],
  [service.includes("verified.user.id!==current.user.id"),"reauthenticated identity must match the active identity"],
  [service.includes("supabase.auth.updateUser({password:newPassword})"),"password update uses the authenticated Supabase user"],
  [policy.includes("MIN_NEW_PASSWORD_LENGTH=8")&&policy.includes("MAX_PASSWORD_LENGTH=128"),"new password length is bounded"],
  [context.includes("changePassword:(currentPassword:string,newPassword:string)"),"AuthContext exposes only the dedicated operation"],
  [screen.includes("newPasswordConfirmation")&&screen.includes('secureTextEntry'),"Android UI confirms and masks the new password"],
  [!config.includes('"scheme"')&&!config.includes('"intentFilters"'),"password recovery does not add Android deep-link configuration"],
  [String(pkg.scripts?.["release:check"]||"").includes("verify:password-change"),"Android release gate includes password-change checks"]
];

for(const [ok,label] of checks)console.log(`${ok?"PASS":"FAIL"} ${label}`);
const passed=checks.filter(([ok])=>ok).length;
console.log(`Android password change: ${passed}/${checks.length}`);
if(passed!==checks.length)process.exit(1);
