import fs from "node:fs"; import path from "node:path";
const root=process.cwd(); const required=["packages/qa/src/QaService.ts","apps/desktop/renderer/src/main.tsx","apps/desktop/electron/preload/preload.ts","apps/desktop/electron/ipc/databaseHandlers.ts"];
for(const f of required)if(!fs.existsSync(path.join(root,f)))throw new Error(`Missing ${f}`);
const service=fs.readFileSync(path.join(root,"packages/qa/src/QaService.ts"),"utf8"); const ui=fs.readFileSync(path.join(root,"apps/desktop/renderer/src/main.tsx"),"utf8");
for(const token of ["totalTests","releaseStatus","knownIssues","manual_review"])if(!service.includes(token))throw new Error(`QA service missing ${token}`);
for(const token of ["QaCenter","Ctrl+Shift+Q","window.mkApi.qa.run","Known Issues"])if(!ui.includes(token))throw new Error(`QA UI missing ${token}`);
console.log("✓ QA Center, catalog, release gate and export exist");
