import fs from "node:fs";
const required=["packages/database/src/migrations/004_onboarding_settings.ts","packages/application/src/SettingsService.ts","apps/desktop/electron/ipc/settingsInputSchema.ts"];
for(const file of required){if(!fs.existsSync(file))throw new Error(`Missing ${file}`)}
const preload=fs.readFileSync("apps/desktop/electron/preload/preload.ts","utf8");
const ui=fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8");
if(!preload.includes("completeSetup")||!preload.includes("selectFolder"))throw new Error("Onboarding API missing");
if(!ui.includes("SetupWizard")||!ui.includes("מספר הקבלה הראשון"))throw new Error("Onboarding UI missing");
console.log("✓ Onboarding API and wizard exist");
