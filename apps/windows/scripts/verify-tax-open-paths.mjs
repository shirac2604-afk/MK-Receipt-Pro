import fs from "node:fs";
const service="packages/tax-open/src/OpenFormatPathService.ts";
if(!fs.existsSync(service)) throw new Error("OpenFormatPathService missing");
const text=fs.readFileSync(service,"utf8");
for(const token of ["OPENFRMT","buildBusinessFolderName","buildProductionFolderName","collisionMinutesAdvanced","60_000","NO_SUFFIX_COLLISION_FORMAT","OPEN-FORMAT-PATH-AUDIT.json"]){
  const source=token==="OPEN-FORMAT-PATH-AUDIT.json"?fs.readFileSync("packages/tax-open/src/OpenFormatService.ts","utf8"):text;
  if(!source.includes(token)) throw new Error(`Missing ${token}`);
}
const main=fs.readFileSync("packages/tax-open/src/OpenFormatService.ts","utf8");
if(main.includes("`${stamp}-${suffix}`")) throw new Error("Old -suffix collision behavior remains");
console.log("✓ OPENFRMT path allocation and audit are wired");
