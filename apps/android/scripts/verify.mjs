import fs from "node:fs";
const req=["App.tsx","src/navigation/AppNavigator.tsx","src/domain/types.ts","src/config/features.ts","WINDOWS_ANDROID_PARITY.md"];
let ok=0;
for(const p of req){const pass=fs.existsSync(p);console.log(pass?"PASS":"FAIL",p);if(pass)ok++}
const f=fs.readFileSync("src/config/features.ts","utf8");
for(const key of ["issue_receipt","cancel_receipt","expenses","reporting_center","google_drive_sync","backup_restore"]){
 const pass=f.includes(`"${key}"`); console.log(pass?"PASS":"FAIL",key); if(pass)ok++;
}
console.log(`Android foundation: ${ok}/${req.length+6}`);
if(ok!==req.length+6)process.exit(1);
