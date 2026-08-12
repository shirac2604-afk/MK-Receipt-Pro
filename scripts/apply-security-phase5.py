from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
WIN = ROOT / "apps" / "windows"

# 1) Pin IPC trust to the exact packaged renderer file.
security = WIN / "apps/desktop/electron/ipc/security.ts"
s = security.read_text(encoding="utf-8")
s = s.replace('import type { IpcMainInvokeEvent } from "electron";', 'import { app, type IpcMainInvokeEvent } from "electron";')
old = '''function isTrustedRendererUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.origin === DEV_ORIGIN) return process.env.VITE_DEV_SERVER_URL === DEV_ORIGIN;
    if (url.protocol !== "file:") return false;
    const filePath = path.normalize(fileURLToPath(url));
    return path.basename(filePath).toLowerCase() === "index.html" && filePath.includes(`${path.sep}dist${path.sep}`);
  } catch {
    return false;
  }
}
'''
new = '''function isTrustedRendererUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (!app.isPackaged && url.origin === DEV_ORIGIN) {
      return process.env.VITE_DEV_SERVER_URL === DEV_ORIGIN;
    }
    if (url.protocol !== "file:") return false;
    const filePath = path.normalize(fileURLToPath(url));
    const expectedIndex = path.normalize(path.join(app.getAppPath(), "dist", "index.html"));
    return filePath === expectedIndex;
  } catch {
    return false;
  }
}
'''
if old not in s and new not in s:
    raise SystemExit("security.ts renderer trust block not found")
s = s.replace(old, new, 1)
security.write_text(s, encoding="utf-8")

# 2) Add one-time file capabilities and magic-byte/size validation at the Electron boundary.
handlers = WIN / "apps/desktop/electron/ipc/databaseHandlers.ts"
s = handlers.read_text(encoding="utf-8")
anchor = 'import { spawn } from "node:child_process";\n\n\n\n\n'
insert = '''import { spawn } from "node:child_process";

const MAX_USER_FILE_BYTES = 10 * 1024 * 1024;
const approvedExpenseAttachmentPaths = new Set<string>();
const approvedImagePaths = new Set<string>();

type UserFileKind = "expense" | "image";

function canonicalExistingFile(rawPath:string):string {
  if(typeof rawPath!=="string"||!rawPath.trim())throw new Error("INVALID_INPUT");
  const resolved=fs.realpathSync.native(path.resolve(rawPath));
  const stat=fs.statSync(resolved);
  if(!stat.isFile()||stat.size<=0||stat.size>MAX_USER_FILE_BYTES)throw new Error("INVALID_INPUT");
  return resolved;
}

function hasExpectedMagic(filePath:string,ext:string):boolean {
  const fd=fs.openSync(filePath,"r");
  try{
    const header=Buffer.alloc(16);
    const bytesRead=fs.readSync(fd,header,0,header.length,0);
    const h=header.subarray(0,bytesRead);
    if(ext===".pdf")return h.length>=5&&h.subarray(0,5).toString("ascii")==="%PDF-";
    if(ext===".png")return h.length>=8&&h.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
    if(ext===".jpg"||ext===".jpeg")return h.length>=3&&h[0]===0xff&&h[1]===0xd8&&h[2]===0xff;
    if(ext===".webp")return h.length>=12&&h.subarray(0,4).toString("ascii")==="RIFF"&&h.subarray(8,12).toString("ascii")==="WEBP";
    return false;
  }finally{fs.closeSync(fd);}
}

function validateUserFile(rawPath:string,kind:UserFileKind):string {
  const filePath=canonicalExistingFile(rawPath);
  const ext=path.extname(filePath).toLowerCase();
  const allowed=kind==="image"?new Set([".png",".jpg",".jpeg",".webp"]):new Set([".pdf",".png",".jpg",".jpeg",".webp"]);
  if(!allowed.has(ext)||!hasExpectedMagic(filePath,ext))throw new Error("INVALID_INPUT");
  return filePath;
}

function approveUserFile(rawPath:string,kind:UserFileKind):string {
  const filePath=validateUserFile(rawPath,kind);
  (kind==="image"?approvedImagePaths:approvedExpenseAttachmentPaths).add(filePath);
  return filePath;
}

function consumeApprovedUserFile(rawPath:string,kind:UserFileKind):string {
  const filePath=validateUserFile(rawPath,kind);
  const set=kind==="image"?approvedImagePaths:approvedExpenseAttachmentPaths;
  if(!set.delete(filePath))throw new Error("UNAPPROVED_FILE_PATH");
  return filePath;
}

function sameCanonicalFile(a:string|undefined|null,b:string|undefined|null):boolean {
  if(!a||!b)return false;
  try{return fs.realpathSync.native(path.resolve(a))===fs.realpathSync.native(path.resolve(b));}catch{return false;}
}

'''
if anchor in s:
    s = s.replace(anchor, insert, 1)
elif "MAX_USER_FILE_BYTES" not in s:
    raise SystemExit("databaseHandlers import anchor not found")

replacements = [
('''  ipcMain.handle("settings:complete-setup", (event,input) => handle(event, async () => { const parsed=parseBusinessSettingsInput(input); const local=databaseService.completeSetup(parsed); if(supabaseCloud.getStatus().connected){await supabaseCloud.saveBusinessSettings(parsed); return await supabaseCloud.getBusinessSettings(local)??local;} return local; }, input));''', '''  ipcMain.handle("settings:complete-setup", (event,input) => handle(event, async () => {
    const parsed=parseBusinessSettingsInput(input);
    const current=databaseService.getBusinessSettings();
    let safeLogoPath=parsed.logoPath;
    if(safeLogoPath&&!sameCanonicalFile(safeLogoPath,current?.logoPath)){safeLogoPath=consumeApprovedUserFile(safeLogoPath,"image");}
    const secured={...parsed,logoPath:safeLogoPath};
    const local=databaseService.completeSetup(secured);
    if(supabaseCloud.getStatus().connected){await supabaseCloud.saveBusinessSettings(secured); return await supabaseCloud.getBusinessSettings(local)??local;}
    return local;
  }, input));'''),
('''  ipcMain.handle("dialogs:select-image", (event) => handle(event, async () => { const result=await dialog.showOpenDialog({ properties:["openFile"], filters:[{name:"תמונות",extensions:["png","jpg","jpeg","webp"]}] }); return result.canceled ? null : result.filePaths[0] ?? null; }));''', '''  ipcMain.handle("dialogs:select-image", (event) => handle(event, async () => { const result=await dialog.showOpenDialog({ properties:["openFile"], filters:[{name:"תמונות",extensions:["png","jpg","jpeg","webp"]}] }); if(result.canceled||!result.filePaths[0])return null; return approveUserFile(result.filePaths[0],"image"); }));'''),
('''  ipcMain.handle("expenses:add", (event,input) => handle(event, () => (supabaseCloud.getStatus().connected?supabaseCloud.addExpense({expenseDate:String(input?.expenseDate||""),supplierName:String(input?.supplierName||""),amountAgorot:Number(input?.amountAgorot)||0,category:String(input?.category||""),paymentMethod:typeof input?.paymentMethod==="string"?input.paymentMethod:undefined,notes:typeof input?.notes==="string"?input.notes:undefined,attachmentSourcePath:typeof input?.attachmentSourcePath==="string"?input.attachmentSourcePath:undefined}):databaseService.addExpense({expenseDate:String(input?.expenseDate||""),supplierName:String(input?.supplierName||""),amountAgorot:Number(input?.amountAgorot)||0,category:String(input?.category||""),paymentMethod:typeof input?.paymentMethod==="string"?input.paymentMethod:undefined,notes:typeof input?.notes==="string"?input.notes:undefined,attachmentSourcePath:typeof input?.attachmentSourcePath==="string"?input.attachmentSourcePath:undefined})), input));''', '''  ipcMain.handle("expenses:add", (event,input) => handle(event, () => {
    const attachmentSourcePath=typeof input?.attachmentSourcePath==="string"?consumeApprovedUserFile(input.attachmentSourcePath,"expense"):undefined;
    const expense={expenseDate:String(input?.expenseDate||""),supplierName:String(input?.supplierName||""),amountAgorot:Number(input?.amountAgorot)||0,category:String(input?.category||""),paymentMethod:typeof input?.paymentMethod==="string"?input.paymentMethod:undefined,notes:typeof input?.notes==="string"?input.notes:undefined,attachmentSourcePath};
    return supabaseCloud.getStatus().connected?supabaseCloud.addExpense(expense):databaseService.addExpense(expense);
  }, input));'''),
('''  ipcMain.handle("expenses:update", (event,input) => handle(event, () => {const expense={id:String(input?.id||""),expenseDate:String(input?.expenseDate||""),supplierName:String(input?.supplierName||""),amountAgorot:Number(input?.amountAgorot)||0,category:String(input?.category||""),paymentMethod:typeof input?.paymentMethod==="string"?input.paymentMethod:undefined,notes:typeof input?.notes==="string"?input.notes:undefined,attachmentSourcePath:typeof input?.attachmentSourcePath==="string"?input.attachmentSourcePath:undefined,removeAttachment:Boolean(input?.removeAttachment)};return supabaseCloud.getStatus().connected?supabaseCloud.updateExpense(expense):databaseService.updateExpense(expense)}, input));''', '''  ipcMain.handle("expenses:update", (event,input) => handle(event, () => {const attachmentSourcePath=typeof input?.attachmentSourcePath==="string"?consumeApprovedUserFile(input.attachmentSourcePath,"expense"):undefined;const expense={id:String(input?.id||""),expenseDate:String(input?.expenseDate||""),supplierName:String(input?.supplierName||""),amountAgorot:Number(input?.amountAgorot)||0,category:String(input?.category||""),paymentMethod:typeof input?.paymentMethod==="string"?input.paymentMethod:undefined,notes:typeof input?.notes==="string"?input.notes:undefined,attachmentSourcePath,removeAttachment:Boolean(input?.removeAttachment)};return supabaseCloud.getStatus().connected?supabaseCloud.updateExpense(expense):databaseService.updateExpense(expense)}, input));'''),
('''  ipcMain.handle("expenses:select-attachment", (event) => handle(event, async () => { const result=await dialog.showOpenDialog({title:"בחירת קבלה או חשבונית הוצאה",properties:["openFile"],filters:[{name:"מסמכי הוצאה",extensions:["pdf","png","jpg","jpeg","webp"]}]}); return result.canceled?null:result.filePaths[0]??null; }));''', '''  ipcMain.handle("expenses:select-attachment", (event) => handle(event, async () => { const result=await dialog.showOpenDialog({title:"בחירת קבלה או חשבונית הוצאה",properties:["openFile"],filters:[{name:"מסמכי הוצאה",extensions:["pdf","png","jpg","jpeg","webp"]}]}); if(result.canceled||!result.filePaths[0])return null; return approveUserFile(result.filePaths[0],"expense"); }));'''),
('''  if (code === "INVALID_INPUT") return apiFailure("INVALID_INPUT", "אחד הפרטים אינו תקין. בדוק את השדות ונסה שוב.");''', '''  if (code === "INVALID_INPUT" || code === "UNAPPROVED_FILE_PATH") return apiFailure("INVALID_INPUT", "אחד הפרטים או הקבצים אינו תקין. בחר את הקובץ מחדש דרך התוכנה ונסה שוב.");'''),
]
for old, new in replacements:
    if old in s:
        s = s.replace(old, new, 1)
    elif new not in s:
        raise SystemExit("Expected databaseHandlers block not found")
handlers.write_text(s, encoding="utf-8")

# 3) Add a regression gate and bump the Windows security version.
pkg_path = WIN / "package.json"
pkg = json.loads(pkg_path.read_text(encoding="utf-8"))
pkg["version"] = "1.1.5-security.5"
pkg.setdefault("scripts", {})["check:file-capability-hardening"] = "node scripts/verify-file-capability-hardening-115.mjs"
release = pkg["scripts"].get("release:production:win", "")
if "check:file-capability-hardening" not in release:
    release = release.replace("npm run check:device-management && npm run build", "npm run check:device-management && npm run check:file-capability-hardening && npm run build")
pkg["scripts"]["release:production:win"] = release
pkg_path.write_text(json.dumps(pkg, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

verifier = WIN / "scripts/verify-file-capability-hardening-115.mjs"
verifier.write_text('''import fs from "node:fs";\n\nconst handlers=fs.readFileSync("apps/desktop/electron/ipc/databaseHandlers.ts","utf8");\nconst security=fs.readFileSync("apps/desktop/electron/ipc/security.ts","utf8");\nconst pkg=JSON.parse(fs.readFileSync("package.json","utf8"));\nconst checks=[\n  ["version",pkg.version==="1.1.5-security.5"],\n  ["exact packaged renderer",security.includes('path.join(app.getAppPath(), "dist", "index.html")')&&security.includes('return filePath === expectedIndex')],\n  ["dev sender only unpackaged",security.includes('!app.isPackaged && url.origin === DEV_ORIGIN')],\n  ["file size limit",handlers.includes('MAX_USER_FILE_BYTES = 10 * 1024 * 1024')],\n  ["magic bytes",handlers.includes('hasExpectedMagic')&&handlers.includes('%PDF-')&&handlers.includes('WEBP')],\n  ["dialog capability approval",handlers.includes('approveUserFile(result.filePaths[0],"expense")')&&handlers.includes('approveUserFile(result.filePaths[0],"image")')],\n  ["expense capability consumption",handlers.includes('consumeApprovedUserFile(input.attachmentSourcePath,"expense")')],\n  ["logo capability consumption",handlers.includes('consumeApprovedUserFile(safeLogoPath,"image")')],\n  ["one time capability",handlers.includes('if(!set.delete(filePath))throw new Error("UNAPPROVED_FILE_PATH")')],\n  ["release gate",String(pkg.scripts?.["release:production:win"]||"").includes("check:file-capability-hardening")],\n];\nfor(const [name,ok] of checks)console.log(`${ok?"PASS":"FAIL"} ${name}`);\nconst passed=checks.filter(([,ok])=>ok).length;\nconsole.log(`Windows file capability hardening: ${passed}/${checks.length}`);\nif(passed!==checks.length)process.exit(1);\n''', encoding="utf-8")

print("Phase 5 patch applied")
