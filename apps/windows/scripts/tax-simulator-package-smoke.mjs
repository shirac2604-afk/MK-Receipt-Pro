import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const source=path.resolve("test-output/tax-open-simulator-fixture");
for(const name of ["INI.TXT","BKMVDATA.TXT","REPORT-2.6.html","REPORT-5.4.html","PREFLIGHT-RESULT.json"]){if(!fs.existsSync(path.join(source,name)))throw new Error(`Missing fixture ${name}`)}
const output=path.join(source,"SIMULATOR-SUBMISSION-SMOKE");fs.rmSync(output,{recursive:true,force:true});fs.mkdirSync(path.join(output,"SIMULATOR-RESULTS"),{recursive:true});
for(const name of ["INI.TXT","BKMVDATA.TXT","REPORT-2.6.html","REPORT-5.4.html","PREFLIGHT-RESULT.json","SIMULATOR-FIXTURE-SUMMARY.json"]){const f=path.join(source,name);if(fs.existsSync(f))fs.copyFileSync(f,path.join(output,name))}
const names=fs.readdirSync(output).filter(name=>fs.statSync(path.join(output,name)).isFile());
const manifest={files:names.map(name=>({name,sha256:crypto.createHash("sha256").update(fs.readFileSync(path.join(output,name))).digest("hex")}))};
fs.writeFileSync(path.join(output,"SUBMISSION-MANIFEST.json"),JSON.stringify(manifest,null,2));
if(manifest.files.length<5)throw new Error("Submission package incomplete");
console.log(`✓ Simulator submission smoke package created with ${manifest.files.length} files`);
