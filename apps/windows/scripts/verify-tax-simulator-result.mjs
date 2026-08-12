import fs from "node:fs";
const required=[
 "packages/tax-open/src/SimulatorOfficialResultService.ts",
 "apps/desktop/electron/ipc/databaseHandlers.ts",
 "apps/desktop/electron/preload/preload.ts",
 "apps/desktop/renderer/src/main.tsx"
];
for(const file of required)if(!fs.existsSync(file))throw new Error(`Missing ${file}`);
const service=fs.readFileSync(required[0],"utf8");
const ui=fs.readFileSync(required[3],"utf8");
const handlers=fs.readFileSync(required[1],"utf8");
for(const token of ["OFFICIAL-SIMULATOR-REPORT.pdf","OFFICIAL-SIMULATOR-RESULT.json","matchesExport","SIMULATOR_RESULT_REPORT_MUST_BE_PDF"])if(!service.includes(token))throw new Error(`Service token missing: ${token}`);
for(const token of ["tax-open:import-simulator-result","showOpenDialog","extensions:[\"pdf\"]"])if(!handlers.includes(token))throw new Error(`IPC token missing: ${token}`);
for(const token of ["צירוף דוח התוצאה ובדיקת התאמה","בחירת PDF ושמירת תוצאת הסימולטור","officialResult.discrepancies"])if(!ui.includes(token))throw new Error(`UI token missing: ${token}`);
console.log("✓ Official simulator result import structure verified");
