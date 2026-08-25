import fs from "node:fs";

const handlers=fs.readFileSync("apps/desktop/electron/ipc/databaseHandlers.ts","utf8");
const security=fs.readFileSync("apps/desktop/electron/ipc/security.ts","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const checks=[
  ["version",/^\d+\.\d+\.\d+$/.test(pkg.version)],
  ["exact packaged renderer",security.includes('path.join(app.getAppPath(), "dist", "index.html")')&&security.includes('return filePath === expectedIndex')],
  ["dev sender only unpackaged",security.includes('!app.isPackaged && url.origin === DEV_ORIGIN')],
  ["file size limit",handlers.includes('MAX_USER_FILE_BYTES = 10 * 1024 * 1024')],
  ["magic bytes",handlers.includes('hasExpectedMagic')&&handlers.includes('%PDF-')&&handlers.includes('WEBP')],
  ["dialog capability approval",handlers.includes('approveUserFile(result.filePaths[0],"expense")')&&handlers.includes('approveUserFile(result.filePaths[0],"image")')],
  ["expense capability consumption",handlers.includes('consumeApprovedUserFile(input.attachmentSourcePath,"expense")')],
  ["logo capability consumption",handlers.includes('consumeApprovedUserFile(safeLogoPath,"image")')],
  ["one time capability",handlers.includes('if(!set.delete(filePath))throw new Error("UNAPPROVED_FILE_PATH")')],
  ["release gate",String(pkg.scripts?.["release:production:win"]||"").includes("check:file-capability-hardening")],
];
for(const [name,ok] of checks)console.log(`${ok?"PASS":"FAIL"} ${name}`);
const passed=checks.filter(([,ok])=>ok).length;
console.log(`Windows file capability hardening: ${passed}/${checks.length}`);
if(passed!==checks.length)process.exit(1);
