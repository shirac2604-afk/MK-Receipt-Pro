import fs from "node:fs";
import path from "node:path";

const workflow=fs.readFileSync(path.resolve("../..", ".github/workflows/student-module-windows-production-build.yml"),"utf8");
const checks=[
 [workflow.includes("CSC_LINK: ${{ secrets.CSC_LINK }}")&&workflow.includes("CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}"),"signing secrets are passed only to the production build"],
 [workflow.includes("Require Windows code-signing credentials"),"unsigned production builds are blocked"],
 [workflow.includes("Get-AuthenticodeSignature")&&workflow.includes("$signature.Status -ne \"Valid\""),"built installer signature is verified before upload"]
];
for(const [ok,label] of checks)if(!ok)throw new Error(`Windows signing contract failed: ${label}`);
console.log("✓ Production workflow requires and verifies an Authenticode-signed Windows installer");
