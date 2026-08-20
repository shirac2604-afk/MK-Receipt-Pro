import fs from "node:fs";
const read=p=>fs.readFileSync(p,"utf8");
const main=read("apps/desktop/electron/main/main.ts");
const sec=read("apps/desktop/electron/ipc/security.ts");
const handlers=read("apps/desktop/electron/ipc/databaseHandlers.ts");
const cloudConfig=read("apps/desktop/electron/main/SupabaseCloudConfig.ts");
const pkg=JSON.parse(read("package.json"));
const exactPackagedRenderer=sec.includes('path.join(app.getAppPath(), "dist", "index.html")')&&sec.includes('return filePath === expectedIndex')&&!sec.includes('senderUrl.startsWith("file://")');
const configuredSupabaseUrl=cloudConfig.match(/SUPABASE_URL="([^"]+)"/)?.[1]??"";
const configuredSupabaseHost=configuredSupabaseUrl?new URL(configuredSupabaseUrl).hostname.toLowerCase():"";
const tests=[
 ["version",pkg.version==="1.1.5"],
 ["packaged build ignores dev server",main.includes('const devServerUrl=!app.isPackaged?process.env.VITE_DEV_SERVER_URL:undefined')&&main.includes('if(devServerUrl==="http://127.0.0.1:5173")')],
 ["production devtools disabled",main.includes('devTools:!app.isPackaged')],
 ["permissions denied",main.includes('setPermissionRequestHandler')&&main.includes('setPermissionCheckHandler')],
 ["drag navigation disabled",main.includes('navigateOnDragDrop:false')],
 ["IPC file sender narrowed",exactPackagedRenderer],
 ["external hosts allowlisted",configuredSupabaseHost.length>0&&main.includes('new URL(SUPABASE_URL).hostname.toLowerCase()')&&main.includes('"wa.me"')&&main.includes('"accounts.google.com"')],
 ["signed PDF host validated",handlers.includes('const SUPABASE_STORAGE_HOST = new URL(SUPABASE_URL).hostname.toLowerCase()')&&handlers.includes('host===SUPABASE_STORAGE_HOST')&&handlers.includes('url.pathname.startsWith("/storage/v1/object/sign/")')],
 ["external opens centralized",handlers.includes('async function openTrustedExternal')],
 ["tax folder cannot execute file",handlers.includes('fs.statSync(folder).isDirectory()')]
];
let pass=0;for(const [name,ok] of tests){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)pass++;}
console.log(`Windows intrusion hardening: ${pass}/${tests.length}`);if(pass!==tests.length)process.exit(1);
