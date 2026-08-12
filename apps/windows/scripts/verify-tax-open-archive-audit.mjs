import fs from "node:fs";
const service=fs.readFileSync("packages/tax-open/src/OpenFormatService.ts","utf8");
for(const token of ["INI.TXT","BKMVDATA.TXT","OPEN-FORMAT-SIMULATOR-FILES-AUDIT.json","compressed:false"]){
  if(!service.includes(token))throw new Error(`Missing simulator-file token ${token}`);
}
for(const forbidden of ["BKMVDATA.zip","TXT.BKMVDATA","TXT.INI","auditOpenFormatArchive({"]){
  if(service.includes(forbidden))throw new Error(`Legacy simulator format remains: ${forbidden}`);
}
console.log("✓ Direct simulator file names are enforced");
