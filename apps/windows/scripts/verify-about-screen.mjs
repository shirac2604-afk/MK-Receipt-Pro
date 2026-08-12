import fs from "node:fs";
const files=["apps/desktop/renderer/src/main.tsx","apps/desktop/electron/preload/preload.ts","apps/desktop/electron/ipc/databaseHandlers.ts","apps/desktop/renderer/src/styles.css"];
for(const f of files)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const ui=fs.readFileSync(files[0],"utf8"),pre=fs.readFileSync(files[1],"utf8"),handlers=fs.readFileSync(files[2],"utf8");
for(const token of ["AboutScreen","מזהה עסק","העתקת מידע טכני","view===\"about\""])if(!ui.includes(token))throw new Error(`About UI missing ${token}`);
for(const token of ["getAbout","openFolder","copyTechnicalInfo"])if(!pre.includes(token))throw new Error(`Preload missing ${token}`);
for(const token of ["app:get-about","app:open-folder","app:copy-technical-info","getOrCreateBusinessId"])if(!handlers.includes(token))throw new Error(`Handler missing ${token}`);
console.log("✓ About screen, build info, business ID and secure folder actions exist");
