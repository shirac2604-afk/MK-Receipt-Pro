import fs from "node:fs";
const required=["packages/backup/src/BackupService.ts","packages/database/src/migrations/006_backup_recovery.ts"];
for(const file of required)if(!fs.existsSync(file))throw new Error(`Missing ${file}`);
const preload=fs.readFileSync("apps/desktop/electron/preload/preload.ts","utf8");
const ui=fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8");
if(!preload.includes("backups:create")||!ui.includes("אמינות ושחזור"))throw new Error("Backup API or UI missing");
console.log("✓ Backup service, secure IPC and recovery UI exist");
