import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root=path.join(process.cwd(),"test-output","tax-open-simulator-fixture");
const iniPath=path.join(root,"INI.TXT");
const dataPath=path.join(root,"BKMVDATA.TXT");
for(const file of [iniPath,dataPath]){
  if(!fs.existsSync(file))throw new Error(`Missing ${path.basename(file)}`);
  if(!fs.statSync(file).isFile()||fs.statSync(file).size===0)throw new Error(`Invalid ${path.basename(file)}`);
}
if(fs.existsSync(path.join(root,"BKMVDATA.zip")))throw new Error("Legacy BKMVDATA.zip must not be created");
if(fs.existsSync(path.join(root,"TXT.BKMVDATA")))throw new Error("Legacy TXT.BKMVDATA must not be created");
if(fs.existsSync(path.join(root,"TXT.INI")))throw new Error("Legacy TXT.INI must not be created");
const digest=crypto.createHash("sha256").update(fs.readFileSync(dataPath)).digest("hex");
console.log(`✓ Simulator files are INI.TXT and BKMVDATA.TXT (${fs.statSync(dataPath).size} bytes, sha256 ${digest.slice(0,16)}…)`);
