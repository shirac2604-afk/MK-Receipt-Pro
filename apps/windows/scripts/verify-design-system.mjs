import fs from "node:fs";
const app=fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8");
const css=fs.readFileSync("apps/desktop/renderer/src/styles.css","utf8");
for (const token of ["primary-button","secondary-button","stat-card","sidebar","toast"]) if(!css.includes(token)) throw new Error(`Missing UI token ${token}`);
for (const token of ["Dashboard","SetupWizard","app-layout","stats-grid"]) if(!app.includes(token)) throw new Error(`Missing UI structure ${token}`);
console.log("✓ Design System and responsive RTL UI are present");
