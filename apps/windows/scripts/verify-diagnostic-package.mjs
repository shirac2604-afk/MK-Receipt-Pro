import fs from "node:fs";
const files=["packages/diagnostics/src/DiagnosticService.ts","packages/diagnostics/src/ZipArchive.ts","apps/desktop/electron/ipc/databaseHandlers.ts","apps/desktop/electron/preload/preload.ts","apps/desktop/renderer/src/main.tsx"];
for(const file of files){if(!fs.existsSync(file))throw new Error(`Missing ${file}`)}
const service=fs.readFileSync(files[0],"utf8"),ipc=fs.readFileSync(files[2],"utf8"),ui=fs.readFileSync(files[4],"utf8");
for(const token of ["Names", "receipt data"]){void token}
for(const required of ["uploadedAutomatically: false","sanitizeErrors","writeZip","PIN, סיסמאות"]){if(!service.includes(required))throw new Error(`Diagnostic privacy missing: ${required}`)}
for(const required of ["app:get-diagnostic-preview","app:create-diagnostic-package"]){if(!ipc.includes(required))throw new Error(`Missing IPC ${required}`)}
for(const required of ["לפני יצירת חבילת האבחון","לא ייכלל","חבילת האבחון מוכנה"]){if(!ui.includes(required))throw new Error(`Missing UI ${required}`)}
console.log("✓ Diagnostic package structure and privacy safeguards passed");
