import fs from "node:fs";

const source=fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8");
const initial=source.match(/const initial:BusinessSettingsInput=\{[^;]+\};/s)?.[0]??"";
const fields=["businessName","ownerName","businessNumber","phone","email","address","slogan"];
for(const field of fields){
  if(!initial.includes(`${field}:\"\"`))throw new Error(`Renderer privacy defaults failed: ${field} must start empty`);
}
console.log("✓ First-run business and contact fields are blank until the user enters them");
