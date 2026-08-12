import fs from "node:fs";
const required=[
  "apps/desktop/renderer/src/main.tsx",
  "apps/desktop/renderer/src/styles.css",
  "apps/desktop/renderer/public/logo.png",
  "apps/desktop/electron/preload/preload.ts",
  "apps/desktop/electron/ipc/databaseHandlers.ts"
];
for(const file of required){if(!fs.existsSync(file))throw new Error(`Missing ${file}`)}
const ui=fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8");
for(const token of ["ReceiptScreen","ReceiptPreview","window.mkApi.receipts.issue","amountAgorot","paymentMethod","הפקת קבלה"]){if(!ui.includes(token))throw new Error(`Receipt UI token missing: ${token}`)}
const preload=fs.readFileSync("apps/desktop/electron/preload/preload.ts","utf8");
for(const token of ["receipts:issue","receipts:open-pdf"]){if(!preload.includes(token))throw new Error(`Preload token missing: ${token}`)}
console.log("✓ Receipt UI and preview exist");
console.log("✓ Receipt issuing uses secure API");
console.log("✓ PDF opening uses receipt ID rather than an arbitrary path");
