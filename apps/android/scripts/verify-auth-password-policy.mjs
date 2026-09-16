import fs from "node:fs";

const screen=fs.readFileSync("src/screens/AuthScreen.tsx","utf8");
const service=fs.readFileSync("src/auth/AuthService.ts","utf8");
const policy=fs.readFileSync("src/auth/passwordPolicy.ts","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));

const checks=[
  [policy.includes("MIN_NEW_PASSWORD_LENGTH=10"),"new-account minimum is ten characters"],
  [policy.includes("AUTH_PASSWORD_TOO_COMMON"),"common-password rejection"],
  [policy.includes("AUTH_PASSWORD_CONTAINS_EMAIL"),"email-derived password rejection"],
  [service.includes("validateNewPassword(email,password)"),"service enforces the registration policy"],
  [service.includes("validatePasswordNotLeaked(password)"),"service checks registrations against leaked passwords"],
  [service.includes("validatePasswordNotLeaked(newPassword)"),"service checks password changes and recovery against leaked passwords"],
  [policy.includes('"Add-Padding":"true"'),"breach lookup uses padded k-anonymity responses"],
  [policy.includes("HIBP_RANGE_URL"),"breach lookup uses the Pwned Passwords range API"],
  [screen.includes('if(mode==="signup")'),"password quality gate applies only to sign-up"],
  [screen.includes('if(!email.trim()||!password)'),"sign-in accepts every nonempty existing password"],
  [!screen.includes("password.length<6"),"legacy six-character shared gate removed"],
  [String(pkg.scripts?.["release:check"]||"").includes("verify:auth-password-policy"),"Android release gate includes password policy"]
];

for(const [ok,label] of checks)console.log(`${ok?"PASS":"FAIL"} ${label}`);
const passed=checks.filter(([ok])=>ok).length;
console.log(`Android auth password policy: ${passed}/${checks.length}`);
if(passed!==checks.length)process.exit(1);
