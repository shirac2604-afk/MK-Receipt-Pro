import fs from "node:fs";
const files = [
  "apps/desktop/electron/ipc/security.ts",
  "apps/desktop/electron/ipc/receiptInputSchema.ts",
  "apps/desktop/electron/preload/preload.ts",
  "packages/shared/src/api.ts",
];
for (const file of files) if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
const preload=fs.readFileSync(files[2],"utf8");
if (/exposeInMainWorld\([^)]*ipcRenderer/.test(preload)) throw new Error("ipcRenderer exposed");
if (!preload.includes("contextBridge")) throw new Error("contextBridge missing");
const handlers=fs.readFileSync("apps/desktop/electron/ipc/databaseHandlers.ts","utf8");
for (const token of ["assertTrustedSender","assertPayloadSize","withTimeout","parseIssueReceiptInput","ApiResult"]) if(!handlers.includes(token)) throw new Error(`Missing ${token}`);
console.log("✓ Secure IPC API, validation and result envelope are present");
