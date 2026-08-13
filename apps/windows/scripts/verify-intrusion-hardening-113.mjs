import fs from "node:fs";
const read=p=>fs.readFileSync(p,"utf8");
const main=read("apps/desktop/electron/main/main.ts");
const sec=read("apps/desktop/electron/ipc/security.ts");
const handlers=read("apps/desktop/electron/ipc/databaseHandlers.ts");
const pkg=JSON.parse(read("package.json"));
const tests=[
 ["version",pkg.version==="1.1.5"],
 ["packaged build ignores dev server",main.includes('!app.isPackaged ? process.env.VITE_DEV_SERVER_URL : undefined')],
 ["production devtools disabled",main.includes('devTools: !app.isPackaged')],
 ["permissions denied",main.includes('setPermissionRequestHandler')&&main.includes('setPermissionCheckHandler')],
 ["drag navigation disabled",main.includes('navigateOnDragDrop: false')],
 ["IPC file sender narrowed",sec.includes('path.basename(filePath).toLowerCase() === "index.html"')&&!sec.includes('senderUrl.startsWith("file://")')],
 ["external hosts allowlisted",main.includes('"wa.me"')&&main.includes('"accounts.google.com"')&&main.includes('"noimclnzzuxcszdotmby.supabase.co"')],
 ["signed PDF host validated",handlers.includes('url.pathname.startsWith("/storage/v1/object/sign/")')],
 ["external opens centralized",handlers.includes('async function openTrustedExternal')],
 ["tax folder cannot execute file",handlers.includes('fs.statSync(folder).isDirectory()')]
];
let pass=0;for(const [name,ok] of tests){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)pass++;}
console.log(`Windows intrusion hardening: ${pass}/${tests.length}`);if(pass!==tests.length)process.exit(1);
