import fs from "node:fs";
const main=fs.readFileSync("apps/desktop/electron/main/main.ts","utf8");
const sync=fs.readFileSync("apps/desktop/electron/main/GoogleDriveSyncService.ts","utf8");
const repo=fs.readFileSync("packages/database/src/repositories/ReceiptRepository.ts","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const checks=[
 [pkg.version==="1.1.0-rc.2","RC2 version"],
 [main.includes('MK-Receipt-Pro-Production'),"new local production namespace"],
 [main.includes('app.setPath("userData",cleanUserDataPath)'),"production userData selected"],
 [sync.includes('MK-Receipt-Pro-Production-Sync.mkrbackup'),"new production Drive file"],
 [!sync.includes('const FILE_NAME="MK-Receipt-Pro-Sync-Latest.mkrbackup"'),"old test Drive file ignored"],
 [repo.includes("COALESCE(MAX(receipt_number),1000)"),"fresh receipt sequence baseline"],
 [repo.includes("const nextNumber=lastIssued+1"),"first fresh receipt becomes 1001"],
];
let ok=0;
for(const [pass,label] of checks){console.log(pass?"PASS":"FAIL",label);if(pass)ok++}
console.log(`Clean start RC2: ${ok}/${checks.length}`);
if(ok!==checks.length)process.exit(1);
