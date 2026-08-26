import { app, BrowserWindow, clipboard, dialog, ipcMain, shell, type IpcMainInvokeEvent } from "electron";
import type { DatabaseService } from "../../../../packages/database/src/DatabaseService";
import type { GoogleDriveSyncService } from "../main/GoogleDriveSyncService";
import type { SupabaseCloudService } from "../main/SupabaseCloudService";
import { apiFailure, apiSuccess, type ApiResult } from "../../../../packages/shared/src/api";
import { parseIssueReceiptInput } from "./receiptInputSchema";
import { parseBusinessSettingsInput } from "./settingsInputSchema";
import { assertPayloadSize, assertTrustedSender, withTimeout } from "./security";
import { SUPABASE_URL } from "../main/SupabaseCloudConfig";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

const MAX_USER_FILE_BYTES = 10 * 1024 * 1024;
const approvedExpenseAttachmentPaths = new Set<string>();
const approvedImagePaths = new Set<string>();
const SUPABASE_STORAGE_HOST = new URL(SUPABASE_URL).hostname.toLowerCase();

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

function normalizeWhatsAppPhone(rawPhone: string): string | null {
  let digits = rawPhone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `972${digits.slice(1)}`;
  if (!digits.startsWith("972") && digits.length === 9) digits = `972${digits}`;
  return /^\d{10,15}$/.test(digits) ? digits : null;
}

function assertTrustedExternalTarget(rawUrl:string):string {
  let url:URL;
  try{url=new URL(rawUrl)}catch{throw new Error("INVALID_INPUT")}
  if(url.protocol==="mailto:")return url.toString();
  if(url.protocol!=="https:")throw new Error("INVALID_INPUT");
  const host=url.hostname.toLowerCase();
  if(host==="wa.me")return url.toString();
  if(host===SUPABASE_STORAGE_HOST && url.pathname.startsWith("/storage/v1/object/sign/"))return url.toString();
  throw new Error("INVALID_INPUT");
}

async function openTrustedExternal(rawUrl:string):Promise<void>{
  await shell.openExternal(assertTrustedExternalTarget(rawUrl));
}

async function renderHtmlFileToPdf(htmlPath:string,pdfPath:string):Promise<void>{
  const pdfWindow=new BrowserWindow({show:false,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
  const tempPath=`${pdfPath}.tmp`;
  try{
    await pdfWindow.loadURL(pathToFileURL(htmlPath).toString());
    const data=await pdfWindow.webContents.printToPDF({pageSize:"A4",printBackground:true,preferCSSPageSize:true,margins:{top:0,bottom:0,left:0,right:0}});
    if(data.length<1000)throw new Error("OPEN_FORMAT_REPORT54_PDF_FAILED");
    fs.writeFileSync(tempPath,data);
    fs.renameSync(tempPath,pdfPath);
  }finally{
    pdfWindow.destroy();
    try{fs.rmSync(tempPath,{force:true});}catch{}
  }
}

function getOrCreateBusinessId(): string {
  const configDir = path.join(app.getPath("userData"), "config");
  const filePath = path.join(configDir, "business-id.json");
  fs.mkdirSync(configDir, { recursive: true });
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as { businessId?: string };
    if (typeof parsed.businessId === "string" && parsed.businessId.length > 8) return parsed.businessId;
  } catch {}
  const businessId = `MLH-${crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase().match(/.{1,4}/g)?.join("-")}`;
  fs.writeFileSync(filePath, JSON.stringify({ businessId }, null, 2), "utf8");
  return businessId;
}
function readBuildMetadata(): any {
  const candidates = [path.join(process.resourcesPath, "release", "build.json"), path.join(process.cwd(), "resources", "release", "build.json")];
  for (const filePath of candidates) { try { return JSON.parse(fs.readFileSync(filePath, "utf8")); } catch {} }
  return {};
}
function getAboutInfo(databaseService: DatabaseService) {
  const build = readBuildMetadata();
  const health = databaseService.getHealth();
  const backup = databaseService.getBackupOverview();
  return {
    productName: "מפתחות להצלחה", version: app.getVersion(), buildNumber: String(build.buildNumber ?? "local"),
    channel: String(build.channel ?? "development"), builtAt: String(build.builtAt ?? ""), databaseVersion: health.schemaVersion,
    pdfTemplateVersion: Number(build.pdfTemplateVersion ?? 1), appId: String(build.appId ?? "il.co.mkreceipt.desktop"),
    businessId: getOrCreateBusinessId(), dataFolder: app.getPath("userData"), backupFolder: backup.backupFolder,
    receiptsFolder: path.join(app.getPath("documents"), "מפתחות להצלחה", "קבלות"), healthStatus: health.status,
  };
}

let lastDiagnosticPath: string | null = null;
let errorSink: ((module:string,error:unknown)=>void) | null = null;
function errorResult(error: unknown): ApiResult<never> {
  const code = error instanceof Error ? error.message : "UNKNOWN_ERROR";
  if (code === "UNTRUSTED_IPC_SENDER") return apiFailure("UNTRUSTED_IPC_SENDER", "הבקשה נחסמה מטעמי אבטחה.", false);
  if (code === "INVALID_INPUT" || code === "UNAPPROVED_FILE_PATH") return apiFailure("INVALID_INPUT", "אחד הפרטים או הקבצים אינו תקין. בחר את הקובץ מחדש דרך התוכנה ונסה שוב.");
  if (code === "OPERATION_TIMEOUT") return apiFailure("OPERATION_TIMEOUT", "הפעולה ארכה זמן רב מדי והופסקה בבטחה.");
  if (code === "RECEIPT_NOT_FOUND") return apiFailure("RECEIPT_NOT_FOUND", "הקבלה לא נמצאה.", false);
  if (code === "CUSTOMER_NOT_FOUND") return apiFailure("CUSTOMER_NOT_FOUND", "הלקוח לא נמצא.", false);
  if (code === "RECEIPT_ALREADY_CANCELLED") return apiFailure("RECEIPT_ALREADY_CANCELLED", "הקבלה כבר מבוטלת.", false);
  if (code === "INVALID_CANCELLATION_REASON") return apiFailure("INVALID_CANCELLATION_REASON", "יש להזין סיבת ביטול בת חמישה תווים לפחות.");
  if (code === "PDF_NOT_FOUND") return apiFailure("PDF_NOT_FOUND", "קובץ ה־PDF עדיין אינו זמין.");
  if (code === "PDF_OPEN_FAILED") return apiFailure("PDF_OPEN_FAILED", "לא ניתן לפתוח את קובץ ה־PDF.");
  if (code === "INVALID_BACKUP_FILE") return apiFailure("INVALID_BACKUP_FILE", "קובץ הגיבוי אינו תקין ולכן לא בוצע שחזור.");
  if (code === "RESTORE_SEQUENCE_ROLLBACK_BLOCKED") return apiFailure("RESTORE_SEQUENCE_ROLLBACK_BLOCKED", "לא ניתן לשחזר גיבוי שמחזיר את רצף הקבלות לאחור.", false);
  if (code === "BACKUP_VERIFICATION_FAILED") return apiFailure("BACKUP_VERIFICATION_FAILED", "הגיבוי נוצר אך לא עבר בדיקת תקינות.");
  if (code === "REGISTRATION_FIXTURE_SCRIPT_MISSING") return apiFailure("OPEN_FORMAT_ERROR", "מחולל חבילת הבדיקה אינו זמין בגרסה זו.", false);
  if (code.startsWith("REGISTRATION_FIXTURE_")) return apiFailure("OPEN_FORMAT_ERROR", `יצירת חבילת 2,006 הרשומות נכשלה: ${code}`, false);
  if (code === "OPEN_FORMAT_INVALID_DATE_RANGE") return apiFailure("OPEN_FORMAT_ERROR", "טווח התאריכים אינו תקין.");
  if (code === "OPEN_FORMAT_INVALID_BUSINESS_NUMBER") return apiFailure("OPEN_FORMAT_ERROR", "יש להשלים מספר עוסק בן 9 ספרות לפני ההפקה.");
  if (code.startsWith("OPEN_FORMAT_OUTPUT_PATH_TOO_LONG")) return apiFailure("OPEN_FORMAT_ERROR", "נתיב ההפקה ארוך מדי. בחר כונן או תיקייה קצרה, למשל D:\\ או כונן USB.", false);
  if (code.startsWith("OPEN_FORMAT_TARGET_NOT_WRITABLE")) return apiFailure("OPEN_FORMAT_ERROR", "אין הרשאת כתיבה בשורש הכונן שנבחר. בחר כונן USB, כונן D או תיקייה קצרה אחרת.", false);
  if (code.startsWith("OPEN_FORMAT_CONTENT_VALIDATION_FAILED")) return apiFailure("OPEN_FORMAT_ERROR", code.replace("OPEN_FORMAT_CONTENT_VALIDATION_FAILED:", "נמצאו קבלות שאינן מתאימות לייצוא:"), false);
  if (code === "SIMULATOR_PACKAGE_INVALID_EXPORT_FOLDER") return apiFailure("OPEN_FORMAT_ERROR", "תיקיית ההפקה אינה תיקיית OPENFRMT תקינה. הפק מחדש את המבנה האחיד ונסה שוב.", false);
  if (code.startsWith("SIMULATOR_PACKAGE_MISSING_")) {
    const missing=code.replace("SIMULATOR_PACKAGE_MISSING_","").replace(/_/g,".");
    return apiFailure("OPEN_FORMAT_ERROR", `לא ניתן להכין את חבילת הסימולטור: הקובץ ${missing} חסר בתיקיית ההפקה. פתח את תיקיית ההפקה ובדוק שהפקת הדוחות הסתיימה.`, false);
  }
  if (code.startsWith("SIMULATOR_PACKAGE_PREFLIGHT_FAILED_")) return apiFailure("OPEN_FORMAT_ERROR", `בדיקת ה־Preflight נכשלה: ${code.replace("SIMULATOR_PACKAGE_PREFLIGHT_FAILED_","").replace(/\|/g,"; ")}`, false);
  if (code.startsWith("SIMULATOR_PACKAGE_ZIP_FAILED_")) return apiFailure("OPEN_FORMAT_ERROR", `יצירת קובץ ה־ZIP נכשלה: ${code.replace("SIMULATOR_PACKAGE_ZIP_FAILED_","")}`, false);
  if (code.startsWith("SIMULATOR_PACKAGE_")) return apiFailure("OPEN_FORMAT_ERROR", `הכנת חבילת הסימולטור נכשלה. קוד תקלה: ${code}`, false);
  if (code === "OPEN_FORMAT_REPORT_PDF_TOO_SMALL") return apiFailure("OPEN_FORMAT_ERROR", "דוחות 2.6 או 5.4 לא נוצרו כ־PDF תקין. נסה להפיק מחדש את המבנה האחיד.", false);
  if (code.startsWith("OPEN_FORMAT_")) return apiFailure("OPEN_FORMAT_ERROR", `הפקת המבנה האחיד נכשלה: ${code}`, false);
  if (code === "RESTORE_POSTCHECK_FAILED") return apiFailure("RESTORE_POSTCHECK_FAILED", "השחזור לא עבר בדיקת תקינות. גיבוי הבטיחות נשמר.", false);
  if (code === "GOOGLE_EMAIL_INVALID") return apiFailure("DATABASE_OPERATION_FAILED", "כתובת ה-Gmail שהוזנה אינה תקינה.", false);
  if (code === "GOOGLE_OAUTH_APP_NOT_CONFIGURED") return apiFailure("DATABASE_OPERATION_FAILED", "החיבור ל-Google עדיין לא הוגדר בגרסת התוכנה הזו. יש להגדיר פעם אחת את מזהה האפליקציה בבנייה.", false);
  if (code === "GOOGLE_OAUTH_CLIENT_SECRET_NOT_CONFIGURED") return apiFailure("DATABASE_OPERATION_FAILED", "חסר Google OAuth Client Secret. יש להריץ פעם אחת npm run google:configure במחשב זה.", false);
  if (code === "SECURE_STORAGE_UNAVAILABLE") return apiFailure("DATABASE_OPERATION_FAILED", "לא ניתן לאחסן את הרשאת Google בצורה מאובטחת במחשב זה.", false);
  if (code === "GOOGLE_DRIVE_NOT_CONNECTED") return apiFailure("DATABASE_OPERATION_FAILED", "Google Drive אינו מחובר במחשב זה.", false);
  if (code.includes("GOOGLE_OAUTH_ACCESS_DENIED")) return apiFailure("DATABASE_OPERATION_FAILED", "החיבור ל-Google Drive בוטל בחלון Google.", false);
  if (code.startsWith("GOOGLE_TOKEN_EXCHANGE_FAILED_")) {
    const parts=code.split("|");
    const statusPart=parts[0]?.replace("GOOGLE_TOKEN_EXCHANGE_FAILED_","")||"";
    const googleError=parts[1]||"unknown_error";
    const description=parts[2]||"";
    return apiFailure("DATABASE_OPERATION_FAILED", `Google דחתה את שלב קבלת ההרשאה. שגיאה: ${googleError}${description?` — ${description}`:""}${statusPart?` (HTTP ${statusPart})`:""}`, false);
  }
  if (/^GOOGLE_DRIVE_[A-Z_]+_FAILED_403$/.test(code)) return apiFailure("DATABASE_OPERATION_FAILED", "Google אישרה את החשבון, אך Google Drive API אינו זמין לפרויקט OAuth הזה. יש להפעיל את Google Drive API באותו פרויקט Google Cloud ולנסות שוב.", false);
  if (code === "GOOGLE_TOKEN_REFRESH_FAILED_400"||code === "GOOGLE_TOKEN_REFRESH_FAILED_401") return apiFailure("DATABASE_OPERATION_FAILED", "הרשאת Google Drive פגה או בוטלה. נתק את החיבור במחשב הזה והתחבר מחדש.", false);
  if (code.startsWith("GOOGLE_")) return apiFailure("DATABASE_OPERATION_FAILED", `פעולת Google Drive לא הושלמה. קוד: ${code}`, true);
  if (code === "CLOUD_CREDENTIALS_REQUIRED") return apiFailure("DATABASE_OPERATION_FAILED", "יש להזין אימייל וסיסמה לחשבון הענן.", false);
  if (code.startsWith("CLOUD_AUTH_FAILED:")) return apiFailure("DATABASE_OPERATION_FAILED", "ההתחברות לחשבון הענן נכשלה. בדוק אימייל וסיסמה.", false);
  if (code === "AUTH_CURRENT_PASSWORD_REQUIRED") return apiFailure("INVALID_INPUT", "יש להזין את הסיסמה הנוכחית.", false);
  if (code === "AUTH_CURRENT_PASSWORD_INVALID") return apiFailure("DATABASE_OPERATION_FAILED", "הסיסמה הנוכחית אינה נכונה.", false);
  if (code === "AUTH_PASSWORD_UNCHANGED") return apiFailure("INVALID_INPUT", "הסיסמה החדשה חייבת להיות שונה מהסיסמה הנוכחית.", false);
  if (code === "AUTH_PASSWORD_TOO_SHORT") return apiFailure("INVALID_INPUT", "הסיסמה החדשה חייבת להכיל לפחות 8 תווים.", false);
  if (code === "AUTH_PASSWORD_TOO_LONG") return apiFailure("INVALID_INPUT", "הסיסמה החדשה יכולה להכיל עד 128 תווים.", false);
  if (code === "AUTH_PASSWORD_TOO_COMMON") return apiFailure("INVALID_INPUT", "הסיסמה החדשה נפוצה מדי. יש לבחור סיסמה אחרת.", false);
  if (code === "AUTH_PASSWORD_CONTAINS_EMAIL") return apiFailure("INVALID_INPUT", "הסיסמה החדשה לא יכולה לכלול את החלק הראשון של כתובת האימייל.", false);
  if (code === "AUTH_SESSION_REQUIRED"||code === "AUTH_IDENTITY_CHANGED") return apiFailure("DATABASE_OPERATION_FAILED", "החיבור לחשבון השתנה. יש להתנתק ולהתחבר מחדש לפני שינוי הסיסמה.", false);
  if (code === "AUTH_PASSWORD_CHANGE_FAILED") return apiFailure("DATABASE_OPERATION_FAILED", "שינוי הסיסמה לא הושלם. הסיסמה הקיימת נשארה ללא שינוי.", true);
  if (code === "AUTH_RECOVERY_REQUEST_COOLDOWN") return apiFailure("DATABASE_OPERATION_FAILED", "אם קיימת כתובת חשבון תואמת, אפשר לבקש קוד נוסף בעוד דקה.", false);
  if (code === "AUTH_RECOVERY_REQUEST_LIMIT") return apiFailure("DATABASE_OPERATION_FAILED", "בוצעו יותר מדי בקשות לשחזור. יש לנסות שוב מאוחר יותר.", false);
  if (code === "AUTH_RECOVERY_REQUEST_FAILED") return apiFailure("DATABASE_OPERATION_FAILED", "לא ניתן להתחיל כרגע את תהליך השחזור. יש לנסות שוב מאוחר יותר.", true);
  if (code === "AUTH_RECOVERY_CODE_INVALID") return apiFailure("DATABASE_OPERATION_FAILED", "הקוד אינו תקין או שפג תוקפו. יש לבקש קוד חדש.", false);
  if (code === "AUTH_RECOVERY_VERIFY_LIMIT") return apiFailure("DATABASE_OPERATION_FAILED", "בוצעו יותר מדי ניסיונות עם קוד שחזור. יש לבקש קוד חדש.", false);
  if (code === "AUTH_RECOVERY_UPDATE_FAILED") return apiFailure("DATABASE_OPERATION_FAILED", "לא ניתן היה לעדכן את הסיסמה. הסיסמה הקודמת נשארה ללא שינוי.", true);
  if (code === "AUTH_RECOVERY_GLOBAL_SIGNOUT_FAILED") return apiFailure("DATABASE_OPERATION_FAILED", "הסיסמה עודכנה, אך לא ניתן היה להשלים את ניתוק המכשירים. יש לבקש קוד חדש ולנסות שוב.", true);
  if (code === "CLOUD_NO_BUSINESS_MEMBERSHIP") return apiFailure("DATABASE_OPERATION_FAILED", "החשבון מחובר אך אינו משויך לעסק בענן.", false);
  if (code === "CLOUD_DEVICE_REVOKED") return apiFailure("DATABASE_OPERATION_FAILED", "המחשב הזה נותק מהעסק. כדי לחבר אותו מחדש יש להתחבר שוב עם אימייל וסיסמה.", false);
  if (code.startsWith("CLOUD_")) return apiFailure("DATABASE_OPERATION_FAILED", `פעולת הענן לא הושלמה: ${code}`, true);

  return apiFailure("DATABASE_OPERATION_FAILED", "לא הצלחנו להשלים את הפעולה. הנתונים הקיימים לא שונו.");
}
async function handle<T>(event: IpcMainInvokeEvent, action: () => T | Promise<T>, payload?: unknown): Promise<ApiResult<T>> {
  const startedAt = Date.now();
  try { assertTrustedSender(event); assertPayloadSize(payload); const data = await withTimeout(Promise.resolve().then(action)); console.info(`[IPC] success ${Date.now()-startedAt}ms`); return apiSuccess(data); }
  catch(error){ console.warn("[IPC] failure", error); try{errorSink?.("IPC",error)}catch{} return errorResult(error); }
}
export function registerDatabaseHandlers(databaseService: DatabaseService, cloudSync:GoogleDriveSyncService, supabaseCloud:SupabaseCloudService): void {
  errorSink=(module,error)=>databaseService.recordError(module,error);
  let receiptIssueInFlight=false;
  const receiptCancelInFlight=new Set<string>();
  ipcMain.handle("app:get-about", (event) => handle(event, () => getAboutInfo(databaseService)));
  ipcMain.handle("app:open-folder", (event,input) => handle(event, async () => {
    const about=getAboutInfo(databaseService); const kind=input?.kind;
    const folder=kind==="data"?about.dataFolder:kind==="backups"?about.backupFolder:kind==="receipts"?about.receiptsFolder:null;
    if(!folder) throw new Error("INVALID_INPUT"); fs.mkdirSync(folder,{recursive:true}); const message=await shell.openPath(folder); if(message)throw new Error("DATABASE_OPERATION_FAILED"); return true;
  }, input));
  ipcMain.handle("app:get-diagnostic-preview", (event) => handle(event, () => databaseService.getDiagnosticPreview()));
  ipcMain.handle("app:create-diagnostic-package", (event) => handle(event, async () => {
    const result=await dialog.showSaveDialog({title:"שמירת חבילת אבחון",defaultPath:`Maptehot-Diagnostic-${new Date().toISOString().slice(0,10)}.zip`,filters:[{name:"ZIP",extensions:["zip"]}]});
    if(result.canceled||!result.filePath)return null;
    const created=databaseService.createDiagnosticPackage(result.filePath,getAboutInfo(databaseService)); lastDiagnosticPath=created.filePath; return created;
  }));
  ipcMain.handle("app:open-diagnostics-folder", (event) => handle(event, async () => {
    if(lastDiagnosticPath&&fs.existsSync(lastDiagnosticPath)){shell.showItemInFolder(lastDiagnosticPath);return true;}
    const folder=path.join(app.getPath("documents"),"MK Receipt Pro","Diagnostics"); fs.mkdirSync(folder,{recursive:true}); const message=await shell.openPath(folder); if(message)throw new Error("DATABASE_OPERATION_FAILED"); return true;
  }));
  ipcMain.handle("app:copy-technical-info", (event) => handle(event, () => {
    const a=getAboutInfo(databaseService); clipboard.writeText([a.productName,`Version: ${a.version}`,`Build: ${a.buildNumber}`,`Database: ${a.databaseVersion}`,`PDF: ${a.pdfTemplateVersion}`,`Channel: ${a.channel}`,`Windows: ${process.platform} ${process.arch}`,`Business ID: ${a.businessId}`].join("\n")); return true;
  }));

  ipcMain.handle("tax-open:create-registration-fixture", (event) => handle(event, async () => {
    const scriptPath=app.isPackaged
      ? path.join(process.resourcesPath,"scripts","tax-open-simulator-fixture.mjs")
      : path.join(process.cwd(),"scripts","tax-open-simulator-fixture.mjs");
    if(!fs.existsSync(scriptPath)) throw new Error("REGISTRATION_FIXTURE_SCRIPT_MISSING");
    const workingRoot=path.join(app.getPath("documents"),"מפתחות להצלחה","חבילת סימולטור 2006");
    fs.mkdirSync(workingRoot,{recursive:true});
    await new Promise<void>((resolve,reject)=>{
      const child=spawn(process.execPath,[scriptPath],{cwd:workingRoot,env:{...process.env,ELECTRON_RUN_AS_NODE:"1"},windowsHide:true,stdio:["ignore","pipe","pipe"]});
      let stderr=""; child.stderr.on("data",d=>stderr+=String(d));
      child.on("error",reject); child.on("exit",code=>code===0?resolve():reject(new Error(`REGISTRATION_FIXTURE_FAILED_${code}_${stderr.slice(0,200)}`)));
    });
    const output=path.join(workingRoot,"test-output","tax-open-simulator-fixture");
    for(const required of ["INI.TXT","BKMVDATA.TXT","SIMULATOR-FIXTURE-SUMMARY.json"]){if(!fs.existsSync(path.join(output,required)))throw new Error(`REGISTRATION_FIXTURE_MISSING_${required}`)}
    const summary=JSON.parse(fs.readFileSync(path.join(output,"SIMULATOR-FIXTURE-SUMMARY.json"),"utf8")) as {totalRecords?:number};
    if(summary.totalRecords!==2006)throw new Error("REGISTRATION_FIXTURE_WRONG_RECORD_COUNT");
    const message=await shell.openPath(output); if(message)throw new Error("REGISTRATION_FIXTURE_OPEN_FAILED");
    return output;
  }));
  ipcMain.handle("tax-open:export", (event,input) => handle(event, async () => {
    const result=await dialog.showOpenDialog({title:"בחר כונן או תיקייה קצרה להפקת המבנה האחיד",properties:["openDirectory","createDirectory"]});
    if(result.canceled||!result.filePaths[0])return null;
    const selectedPath=result.filePaths[0];
    const targetRoot=process.platform==="win32"?path.parse(selectedPath).root:selectedPath;
    const probePath=path.join(targetRoot,`.mk-open-format-write-test-${process.pid}`);
    try{fs.mkdirSync(probePath,{recursive:false});fs.rmSync(probePath,{recursive:true,force:true});}
    catch{throw new Error("OPEN_FORMAT_TARGET_NOT_WRITABLE");}
    const exported=databaseService.exportOpenFormat({fromDate:typeof input?.fromDate==="string"?input.fromDate:"",toDate:typeof input?.toDate==="string"?input.toDate:"",targetRoot});
    const report26PdfPath=path.join(exported.folderPath,"REPORT-2.6.pdf");
    const report54PdfPath=path.join(exported.folderPath,"REPORT-5.4.pdf");
    await renderHtmlFileToPdf(exported.report26Path,report26PdfPath);
    await renderHtmlFileToPdf(exported.report54Path,report54PdfPath);
    const report26Size=fs.statSync(report26PdfPath).size;
    const report54Size=fs.statSync(report54PdfPath).size;
    if(report26Size<1000||report54Size<1000)throw new Error("OPEN_FORMAT_REPORT_PDF_TOO_SMALL");
    const printAudit={
      valid:true,generatedAt:new Date().toISOString(),pageSize:"A4",source:"same-html-template",
      reports:{
        report26:{html:path.basename(exported.report26Path),pdf:path.basename(report26PdfPath),pdfSize:report26Size},
        report54:{html:path.basename(exported.report54Path),pdf:path.basename(report54PdfPath),pdfSize:report54Size}
      },issues:[]
    };
    fs.writeFileSync(path.join(exported.folderPath,"OPEN-FORMAT-PRINT-PDF-AUDIT.json"),JSON.stringify(printAudit,null,2),"utf8");
    exported.report26PdfPath=report26PdfPath;
    exported.report54PdfPath=report54PdfPath;
    return exported;
  },input));
  ipcMain.handle("tax-open:create-simulator-package", (event,input) => handle(event, async () => {
    const folder=typeof input?.folderPath==="string"?input.folderPath:""; if(!folder||!fs.existsSync(folder))throw new Error("INVALID_INPUT");
    return databaseService.createSimulatorSubmissionPackage(folder);
  },input));
  ipcMain.handle("tax-open:save-simulator-summary-pdf", (event,input) => handle(event, async () => {
    const folder=typeof input?.submissionFolder==="string"?input.submissionFolder:"";
    if(!folder||!fs.existsSync(folder))throw new Error("INVALID_INPUT");
    const save=await dialog.showSaveDialog({title:"שמירת סיכום תוצאת הסימולטור כ־PDF חדש",defaultPath:`Simulator-Result-Summary-${new Date().toISOString().slice(0,10)}.pdf`,filters:[{name:"PDF",extensions:["pdf"]}]});
    if(save.canceled||!save.filePath)return null;
    const count=(key:string)=>Math.max(0,Math.trunc(Number(input?.counts?.[key])||0));
    const status=input?.status==="passed"?"תקינה":"לא תקינה / נמצאו שגיאות";
    const notes=typeof input?.notes==="string"?input.notes.trim():"";
    const esc=(value:unknown)=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]??ch));
    const rows=["100A","100C","D110","120D","100B","110B","M100","900Z"].map(code=>`<tr><td>${code}</td><td>${count(code).toLocaleString("he-IL")}</td></tr>`).join("");
    const html=`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><style>@page{size:A4;margin:15mm}body{font-family:Arial,sans-serif;color:#111827;line-height:1.5}h1{font-size:22px;margin:0 0 8px}.warning{background:#fff7ed;border:1px solid #fdba74;padding:10px;border-radius:8px;margin:14px 0}.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px 0}.box{border:1px solid #d1d5db;padding:10px;border-radius:8px}table{width:100%;border-collapse:collapse;margin-top:14px}th,td{border:1px solid #9ca3af;padding:8px;text-align:right}th{background:#f3f4f6}footer{margin-top:24px;font-size:11px;color:#6b7280}</style></head><body><h1>סיכום מקומי של תוצאת הסימולטור</h1><div class="warning"><strong>מסמך מקומי בלבד.</strong> מסמך זה אינו דוח רשמי של רשות המסים ואינו מחליף את ה־PDF שמופק באתר הסימולטור.</div><div class="meta"><div class="box"><strong>תוצאה:</strong> ${esc(status)}</div><div class="box"><strong>סך רשומות:</strong> ${Math.max(0,Math.trunc(Number(input?.totalRecords)||0)).toLocaleString("he-IL")}</div></div><table><thead><tr><th>קוד רשומה</th><th>כמות</th></tr></thead><tbody>${rows}</tbody></table>${notes?`<h2>הערות</h2><p>${esc(notes)}</p>`:""}<footer>הופק על ידי מפתחות להצלחה • ${new Date().toLocaleString("he-IL")}</footer></body></html>`;
    const tempHtml=path.join(app.getPath("temp"),`mk-simulator-summary-${crypto.randomUUID()}.html`);
    try{fs.writeFileSync(tempHtml,html,"utf8");await renderHtmlFileToPdf(tempHtml,save.filePath);return save.filePath;}finally{try{fs.rmSync(tempHtml,{force:true});}catch{}}
  },input));
  ipcMain.handle("tax-open:import-simulator-result", (event,input) => handle(event, async () => {
    const folder=typeof input?.submissionFolder==="string"?input.submissionFolder:"";
    if(!folder||!fs.existsSync(folder))throw new Error("INVALID_INPUT");
    const selected=await dialog.showOpenDialog({title:"בחירת דוח הסימולטור הרשמי",properties:["openFile"],filters:[{name:"PDF",extensions:["pdf"]}]});
    if(selected.canceled||!selected.filePaths[0])return null;
    const count=(key:string)=>Math.max(0,Math.trunc(Number(input?.counts?.[key])||0));
    return databaseService.importSimulatorOfficialResult(folder,selected.filePaths[0],{status:input?.status==="passed"?"passed":"failed",totalRecords:Math.max(0,Math.trunc(Number(input?.totalRecords)||0)),counts:{"100A":count("100A"),"100C":count("100C"),"D110":count("D110"),"120D":count("120D"),"100B":count("100B"),"110B":count("110B"),"M100":count("M100"),"900Z":count("900Z")},notes:typeof input?.notes==="string"?input.notes:""});
  },input));
  ipcMain.handle("tax-open:create-registration-dossier", (event,input) => handle(event, async () => {
    const folder=typeof input?.submissionFolder==="string"?input.submissionFolder:""; if(!folder||!fs.existsSync(folder))throw new Error("INVALID_INPUT");
    const about=getAboutInfo(databaseService);
    return databaseService.createTaxRegistrationDossier(folder,{productName:about.productName,version:about.version,buildNumber:about.buildNumber,channel:about.channel,businessId:about.businessId,manufacturerName:typeof input?.manufacturerName==="string"?input.manufacturerName:"",manufacturerBusinessNumber:typeof input?.manufacturerBusinessNumber==="string"?input.manufacturerBusinessNumber:"",contactName:typeof input?.contactName==="string"?input.contactName:"",contactEmail:typeof input?.contactEmail==="string"?input.contactEmail:""});
  },input));
  ipcMain.handle("tax-open:open-folder", (event,input) => handle(event, async () => {
    const folder=typeof input?.folderPath==="string"?input.folderPath:""; if(!folder||!fs.existsSync(folder)||!fs.statSync(folder).isDirectory())throw new Error("INVALID_INPUT");
    const message=await shell.openPath(folder); if(message)throw new Error("DATABASE_OPERATION_FAILED"); return true;
  },input));
  ipcMain.handle("qa:run", (event) => handle(event, () => databaseService.runQaReport()));
  ipcMain.handle("qa:export", (event,input) => handle(event, async () => {
    const report=databaseService.runQaReport();
    const result=await dialog.showSaveDialog({title:"ייצוא דוח QA",defaultPath:`QA-Report-${new Date().toISOString().slice(0,10)}.json`,filters:[{name:"QA Report",extensions:["json"]}]});
    if(result.canceled||!result.filePath)return null; return databaseService.exportQaReport(report,result.filePath);
  },input));
  ipcMain.handle("database:get-health", (event) => handle(event, () => databaseService.getHealth()));
  ipcMain.handle("health:run-full", (event) => handle(event, () => databaseService.runFullHealthCheck()));
  ipcMain.handle("health:get-security-status", (event) => handle(event, () => databaseService.getSecurityStatus()));
  ipcMain.handle("errors:list", (event) => handle(event, () => databaseService.listErrorLogs()));
  ipcMain.handle("database:get-business-settings", (event) => handle(event, () => supabaseCloud.getStatus().connected?supabaseCloud.getBusinessSettings(databaseService.getBusinessSettings()):databaseService.getBusinessSettings()));
  ipcMain.handle("settings:get-onboarding-status", (event) => handle(event, () => databaseService.getOnboardingStatus()));
  ipcMain.handle("settings:complete-setup", (event,input) => handle(event, async () => {
    const parsed=parseBusinessSettingsInput(input);
    const current=databaseService.getBusinessSettings();
    let safeLogoPath=parsed.logoPath;
    if(safeLogoPath&&!sameCanonicalFile(safeLogoPath,current?.logoPath)){safeLogoPath=consumeApprovedUserFile(safeLogoPath,"image");}
    const secured={...parsed,...(safeLogoPath?{logoPath:safeLogoPath}:{})};
    const local=databaseService.completeSetup(secured);
    if(supabaseCloud.getStatus().connected){await supabaseCloud.saveBusinessSettings(secured); return await supabaseCloud.getBusinessSettings(local)??local;}
    return local;
  }, input));
  ipcMain.handle("settings:verify-pin", (event,input) => handle(event, () => databaseService.verifyPin(typeof input?.pin === "string" ? input.pin : ""), input));
  ipcMain.handle("dialogs:select-image", (event) => handle(event, async () => { const result=await dialog.showOpenDialog({ properties:["openFile"], filters:[{name:"תמונות",extensions:["png","jpg","jpeg","webp"]}] }); if(result.canceled||!result.filePaths[0])return null; return approveUserFile(result.filePaths[0],"image"); }));
  ipcMain.handle("dialogs:select-folder", (event) => handle(event, async () => { const result=await dialog.showOpenDialog({ properties:["openDirectory","createDirectory"] }); return result.canceled ? null : result.filePaths[0] ?? null; }));
  ipcMain.handle("customers:list", (event) => handle(event, () => supabaseCloud.getStatus().connected?supabaseCloud.listCustomers():databaseService.listCustomers()));
  ipcMain.handle("customers:create", (event,input) => handle(event, () => {const customer={displayName:String(input?.displayName||""),phone:typeof input?.phone==="string"?input.phone:undefined,email:typeof input?.email==="string"?input.email:undefined,notes:typeof input?.notes==="string"?input.notes:undefined};return supabaseCloud.getStatus().connected?supabaseCloud.createCustomer(customer):databaseService.createCustomer(customer)}, input));
  ipcMain.handle("customers:get-profile", (event,input) => handle(event, () => supabaseCloud.getStatus().connected?supabaseCloud.getCustomerProfile(typeof input?.id==="string"?input.id:""):databaseService.getCustomerProfile(typeof input?.id==="string"?input.id:""), input));
  ipcMain.handle("customers:find-duplicates", (event,input) => handle(event, () => {const query={phone:typeof input?.phone==="string"?input.phone:undefined,email:typeof input?.email==="string"?input.email:undefined,excludeId:typeof input?.excludeId==="string"?input.excludeId:undefined};return supabaseCloud.getStatus().connected?supabaseCloud.findCustomerDuplicates(query):databaseService.findCustomerDuplicates(query)}, input));
  ipcMain.handle("customers:update", (event,input) => handle(event, () => {const customer={id:String(input?.id||""),displayName:String(input?.displayName||""),phone:typeof input?.phone==="string"?input.phone:undefined,email:typeof input?.email==="string"?input.email:undefined,notes:typeof input?.notes==="string"?input.notes:undefined};return supabaseCloud.getStatus().connected?supabaseCloud.updateCustomer(customer):databaseService.updateCustomer(customer)}, input));
  ipcMain.handle("templates:list", (event) => handle(event, () => databaseService.listReceiptTemplates()));
  ipcMain.handle("templates:add", (event,input) => handle(event, () => databaseService.addReceiptTemplate({name:String(input?.name||""),customerId:typeof input?.customerId==="string"?input.customerId:undefined,description:String(input?.description||""),amountAgorot:Number(input?.amountAgorot)||0,paymentMethod:String(input?.paymentMethod||"") as any}), input));
  ipcMain.handle("templates:delete", (event,input) => handle(event, () => databaseService.deleteReceiptTemplate(String(input?.id||"")), input));
  ipcMain.handle("receipts:get-core-status", (event) => handle(event, () => supabaseCloud.getStatus().connected?supabaseCloud.getReceiptCoreStatus():databaseService.getReceiptCoreStatus()));
  ipcMain.handle("receipts:issue", (event,input) => handle(event, async () => {
    if(receiptIssueInFlight)throw new Error("RECEIPT_ISSUE_ALREADY_IN_PROGRESS");
    receiptIssueInFlight=true;
    try{
      const parsed=parseIssueReceiptInput(input);
      const cloudStatus=supabaseCloud.getStatus();
      if(!cloudStatus.connected)throw new Error("CLOUD_CONNECTION_REQUIRED_FOR_RECEIPT");
      const cloudReceipt=await supabaseCloud.issueReceipt(parsed);
      const localResult=await databaseService.issueReceipt(parsed,cloudReceipt.receiptNumber);
      if(localResult.pdfCreated&&localResult.pdfPath){
        try{await supabaseCloud.uploadReceiptPdf(cloudReceipt.id,cloudReceipt.receiptNumber,localResult.pdfPath)}
        catch(error){console.warn("Cloud receipt PDF upload failed",error);return {...localResult,warningCode:error instanceof Error?error.message:"CLOUD_RECEIPT_PDF_UPLOAD_FAILED"};}
      }
      return localResult;
    }finally{receiptIssueInFlight=false;}
  }, input));
  ipcMain.handle("receipts:search", (event,input) => handle(event, () => {
    const filters={query:typeof input?.query==="string"?input.query:"",status:["active","cancelled","all"].includes(input?.status)?input.status:"all",paymentMethod:["cash","bank_transfer","bit","paybox","all"].includes(input?.paymentMethod)?input.paymentMethod:"all",sort:["newest","oldest","amount_desc","amount_asc","number_desc","number_asc"].includes(input?.sort)?input.sort:"newest",...(typeof input?.fromDate==="string"?{fromDate:input.fromDate}:{}),...(typeof input?.toDate==="string"?{toDate:input.toDate}:{}),...(Number.isFinite(input?.minAmountAgorot)?{minAmountAgorot:Number(input.minAmountAgorot)}:{}),...(Number.isFinite(input?.maxAmountAgorot)?{maxAmountAgorot:Number(input.maxAmountAgorot)}:{})} as any;
    return supabaseCloud.getStatus().connected?supabaseCloud.searchReceipts(filters):databaseService.searchReceipts(filters);
  }, input));
  ipcMain.handle("receipts:cancel", (event,input) => handle(event, async () => {
    const receiptId=typeof input?.receiptId==="string"?input.receiptId:"";
    const reason=typeof input?.reason==="string"?input.reason:"";
    if(receiptCancelInFlight.has(receiptId))throw new Error("RECEIPT_CANCEL_ALREADY_IN_PROGRESS");
    receiptCancelInFlight.add(receiptId);
    try{
      if(!supabaseCloud.getStatus().connected)throw new Error("CLOUD_CONNECTION_REQUIRED_FOR_CANCELLATION");
      return await supabaseCloud.cancelReceipt(receiptId,reason);
    }finally{receiptCancelInFlight.delete(receiptId);}
  }, input));

  ipcMain.handle("reports:get-range", (event,input) => handle(event, () => {const filters={fromDate:typeof input?.fromDate==="string"?input.fromDate:undefined,toDate:typeof input?.toDate==="string"?input.toDate:undefined};return supabaseCloud.getStatus().connected?supabaseCloud.getRangeReport(filters):databaseService.getRangeReport(filters)}, input));
  ipcMain.handle("reports:get-annual", (event,input) => handle(event, () => {const year=Number(input?.year)||new Date().getFullYear();return supabaseCloud.getStatus().connected?supabaseCloud.getAnnualReport(year):databaseService.getAnnualReport(year)}, input));
  ipcMain.handle("reports:export-csv", (event,input) => handle(event, async () => { const result=await dialog.showSaveDialog({title:"ייצוא דוח CSV",defaultPath:`MK-Receipt-Pro-Report-${new Date().toISOString().slice(0,10)}.csv`,filters:[{name:"CSV",extensions:["csv"]}]}); if(result.canceled||!result.filePath)return null; return databaseService.exportReportCsv({fromDate:typeof input?.fromDate==="string"?input.fromDate:undefined,toDate:typeof input?.toDate==="string"?input.toDate:undefined},result.filePath); }, input));
  ipcMain.handle("reports:export-accountant", (event,input) => handle(event, async () => { const result=await dialog.showOpenDialog({title:"בחר תיקייה לחבילת רואה החשבון",properties:["openDirectory","createDirectory"]}); if(result.canceled||!result.filePaths[0])return null; const folder=await databaseService.exportAccountantPackage(Number(input?.year)||new Date().getFullYear(),result.filePaths[0]); const message=await shell.openPath(folder); if(message)throw new Error("ACCOUNTANT_PACKAGE_OPEN_FAILED"); return folder; }, input));

  ipcMain.handle("expenses:add", (event,input) => handle(event, () => {
    const attachmentSourcePath=typeof input?.attachmentSourcePath==="string"?consumeApprovedUserFile(input.attachmentSourcePath,"expense"):undefined;
    const expense={expenseDate:String(input?.expenseDate||""),supplierName:String(input?.supplierName||""),amountAgorot:Number(input?.amountAgorot)||0,category:String(input?.category||""),paymentMethod:typeof input?.paymentMethod==="string"?input.paymentMethod:undefined,notes:typeof input?.notes==="string"?input.notes:undefined,...(attachmentSourcePath?{attachmentSourcePath}:{})};
    return supabaseCloud.getStatus().connected?supabaseCloud.addExpense(expense):databaseService.addExpense(expense);
  }, input));
  ipcMain.handle("expenses:list", (event,input) => handle(event, () => {const filters={fromDate:typeof input?.fromDate==="string"?input.fromDate:undefined,toDate:typeof input?.toDate==="string"?input.toDate:undefined,category:typeof input?.category==="string"?input.category:undefined,query:typeof input?.query==="string"?input.query:undefined};return supabaseCloud.getStatus().connected?supabaseCloud.listExpenses(filters):databaseService.listExpenses(filters)}, input));
  ipcMain.handle("expenses:update", (event,input) => handle(event, () => {const attachmentSourcePath=typeof input?.attachmentSourcePath==="string"?consumeApprovedUserFile(input.attachmentSourcePath,"expense"):undefined;const expense={id:String(input?.id||""),expenseDate:String(input?.expenseDate||""),supplierName:String(input?.supplierName||""),amountAgorot:Number(input?.amountAgorot)||0,category:String(input?.category||""),paymentMethod:typeof input?.paymentMethod==="string"?input.paymentMethod:undefined,notes:typeof input?.notes==="string"?input.notes:undefined,...(attachmentSourcePath?{attachmentSourcePath}:{}),removeAttachment:Boolean(input?.removeAttachment)};return supabaseCloud.getStatus().connected?supabaseCloud.updateExpense(expense):databaseService.updateExpense(expense)}, input));
  ipcMain.handle("expenses:delete", (event,input) => handle(event, () => supabaseCloud.getStatus().connected?supabaseCloud.deleteExpense(String(input?.id||"")):databaseService.deleteExpense(String(input?.id||"")), input));
  ipcMain.handle("expenses:select-attachment", (event) => handle(event, async () => { const result=await dialog.showOpenDialog({title:"בחירת קבלה או חשבונית הוצאה",properties:["openFile"],filters:[{name:"מסמכי הוצאה",extensions:["pdf","png","jpg","jpeg","webp"]}]}); if(result.canceled||!result.filePaths[0])return null; return approveUserFile(result.filePaths[0],"expense"); }));
  ipcMain.handle("expenses:open-attachment", (event,input) => handle(event, async () => { const id=String(input?.id||""); const filePath=supabaseCloud.getStatus().connected?await supabaseCloud.openExpenseAttachment(id):databaseService.getExpenseAttachmentPath(id); if(!filePath||!fs.existsSync(filePath))throw new Error("INVALID_INPUT"); const verifiedPath=validateUserFile(filePath,"expense"); const message=await shell.openPath(verifiedPath); if(message)throw new Error("DATABASE_OPERATION_FAILED"); return true; }, input));

  ipcMain.handle("cloud-account:get-status", (event) => handle(event, () => supabaseCloud.getStatus()));
  ipcMain.handle("cloud-account:connect", (event,input) => handle(event, () => supabaseCloud.signIn(String(input?.email||""),String(input?.password||"")), input));
  ipcMain.handle("cloud-account:change-password", (event,input) => handle(event, () => supabaseCloud.changePassword(String(input?.currentPassword||""),String(input?.newPassword||"")), input));
  ipcMain.handle("cloud-account:request-password-recovery", (event,input) => handle(event, () => supabaseCloud.requestPasswordRecovery(String(input?.email||"")), input));
  ipcMain.handle("cloud-account:recover-password", (event,input) => handle(event, () => supabaseCloud.completePasswordRecovery(String(input?.email||""),String(input?.token||""),String(input?.newPassword||"")), input));
  ipcMain.handle("cloud-account:disconnect", (event) => handle(event, () => supabaseCloud.signOut()));
  ipcMain.handle("cloud-account:refresh", (event) => handle(event, () => supabaseCloud.refresh()));
  ipcMain.handle("cloud-account:list-devices", (event) => handle(event, () => supabaseCloud.listDevices()));
  ipcMain.handle("cloud-account:revoke-device", (event,input) => handle(event, () => supabaseCloud.revokeDevice(String(input?.deviceId||"")), input));

  ipcMain.handle("cloud-sync:get-status", (event) => handle(event, () => cloudSync.getStatus()));
  ipcMain.handle("cloud-sync:connect", async (event,input) => {
    try{assertTrustedSender(event);assertPayloadSize(input);return apiSuccess(await cloudSync.connect(typeof input?.email==="string"?input.email:""))}
    catch(error){console.warn("[IPC] cloud connect failure",error);try{errorSink?.("GoogleDriveSync",error)}catch{}return errorResult(error)}
  });
  ipcMain.handle("cloud-sync:disconnect", (event) => handle(event, () => cloudSync.disconnect()));
  ipcMain.handle("cloud-sync:sync-now", (event) => handle(event, () => cloudSync.syncNow()));
  ipcMain.handle("cloud-sync:pull", (event) => handle(event, () => cloudSync.pullLatest()));
  ipcMain.handle("cloud-sync:force-push", (event) => handle(event, () => cloudSync.forcePush()));
  ipcMain.handle("backups:get-overview", (event) => handle(event, () => databaseService.getBackupOverview()));
  ipcMain.handle("backups:create", (event) => handle(event, async () => { const result=await dialog.showSaveDialog({title:"יצירת גיבוי",defaultPath:`MK-Receipt-Pro-Backup-${new Date().toISOString().slice(0,10)}.mkrbackup`,filters:[{name:"MK Receipt Backup",extensions:["mkrbackup"]}]}); if(result.canceled||!result.filePath)return null; return databaseService.createBackup(result.filePath,"manual"); }));
  ipcMain.handle("backups:create-google-drive", (event) => handle(event, () => databaseService.createGoogleDriveBackup()));
  ipcMain.handle("backups:create-transfer", (event) => handle(event, async () => { const result=await dialog.showSaveDialog({title:"חבילת מעבר למחשב חדש",defaultPath:`MK-Receipt-Pro-Transfer-${new Date().toISOString().slice(0,10)}.mkrbackup`,filters:[{name:"MK Receipt Backup",extensions:["mkrbackup"]}]}); if(result.canceled||!result.filePath)return null; return databaseService.createBackup(result.filePath,"transfer"); }));
  ipcMain.handle("backups:inspect", (event) => handle(event, async () => { const result=await dialog.showOpenDialog({title:"בדיקת גיבוי",properties:["openFile"],filters:[{name:"MK Receipt Backup",extensions:["mkrbackup"]}]}); if(result.canceled||!result.filePaths[0])return null; return databaseService.inspectBackup(result.filePaths[0]); }));
  ipcMain.handle("backups:restore", (event) => handle(event, async () => { const result=await dialog.showOpenDialog({title:"שחזור מגיבוי",properties:["openFile"],filters:[{name:"MK Receipt Backup",extensions:["mkrbackup"]}]}); if(result.canceled||!result.filePaths[0])return null; return databaseService.restoreBackup(result.filePaths[0]); }));
  ipcMain.handle("backups:open-folder", (event) => handle(event, async () => { const folder=databaseService.getBackupOverview().backupFolder; if(!folder)throw new Error("BACKUP_DESTINATION_UNAVAILABLE"); const message=await shell.openPath(folder); if(message)throw new Error("BACKUP_DESTINATION_UNAVAILABLE"); return true; }));


  ipcMain.handle("receipts:share-email", (event,input) => handle(event, async () => {
    const receiptId=typeof input?.receiptId === "string" ? input.receiptId : "";
    if(supabaseCloud.getStatus().connected){
      const {receipt,filePath}=await supabaseCloud.downloadReceiptPdf(receiptId);
      if(!receipt.clientEmail)throw new Error("INVALID_INPUT");
      shell.showItemInFolder(filePath); clipboard.writeText(filePath);
      const subject=`קבלה מספר ${receipt.receiptNumber} - מפתחות להצלחה`;
      const body=[`שלום ${receipt.clientName},`,`מצורפת קבלה מספר ${receipt.receiptNumber}.`,`קובץ ה-PDF סומן בתיקייה כדי שניתן יהיה לצרף אותו להודעה.`,`בברכה, מפתחות להצלחה`].join("\n");
      await openTrustedExternal(`mailto:${encodeURIComponent(receipt.clientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
      return true;
    }
    const receipt=databaseService.getReceiptById(receiptId);
    if(!receipt||!receipt.clientEmail)throw new Error("INVALID_INPUT");
    const filePath=databaseService.getReceiptPdfPath(receiptId,"original");
    if(!filePath||!fs.existsSync(filePath))throw new Error("PDF_NOT_FOUND");
    shell.showItemInFolder(filePath); clipboard.writeText(filePath);
    const subject=`קבלה מספר ${receipt.receiptNumber} - מפתחות להצלחה`;
    const body=[`שלום ${receipt.clientName},`,`מצורפת קבלה מספר ${receipt.receiptNumber}.`,`קובץ ה-PDF סומן בתיקייה כדי שניתן יהיה לצרף אותו להודעה.`,`בברכה, מפתחות להצלחה`].join("\n");
    await openTrustedExternal(`mailto:${encodeURIComponent(receipt.clientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    return true;
  }, input));

  ipcMain.handle("receipts:share-whatsapp", (event,input) => handle(event, async () => {
    const receiptId=typeof input?.receiptId === "string" ? input.receiptId : "";
    if(supabaseCloud.getStatus().connected){
      const {receipt,filePath}=await supabaseCloud.downloadReceiptPdf(receiptId);
      if(!receipt.clientPhone)throw new Error("INVALID_INPUT");
      const phone=normalizeWhatsAppPhone(receipt.clientPhone); if(!phone)throw new Error("INVALID_INPUT");
      shell.showItemInFolder(filePath); clipboard.writeText(filePath);
      const text=[`שלום ${receipt.clientName},`,`הופקה עבורך קבלה מספר ${receipt.receiptNumber}.`,`קובץ ה-PDF סומן בתיקייה וניתן לצרף אותו לשיחה.`].join("\n");
      await openTrustedExternal(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`); return true;
    }
    const receipt=databaseService.getReceiptById(receiptId);
    if(!receipt||!receipt.clientPhone)throw new Error("INVALID_INPUT");
    const phone=normalizeWhatsAppPhone(receipt.clientPhone); if(!phone)throw new Error("INVALID_INPUT");
    const filePath=databaseService.getReceiptPdfPath(receiptId,"original");
    if(!filePath||!fs.existsSync(filePath))throw new Error("PDF_NOT_FOUND");
    shell.showItemInFolder(filePath); clipboard.writeText(filePath);
    const text=[`שלום ${receipt.clientName},`,`הופקה עבורך קבלה מספר ${receipt.receiptNumber}.`,`קובץ ה-PDF סומן בתיקייה וניתן לצרף אותו לשיחה.`].join("\n");
    await openTrustedExternal(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`); return true;
  }, input));

  ipcMain.handle("receipts:open-pdf", (event,input) => handle(event, async () => {
    const receiptId=typeof input?.receiptId === "string" ? input.receiptId : "";
    const kind=input?.kind==="cancellation"?"cancellation":"original";
    if(supabaseCloud.getStatus().connected){const url=await supabaseCloud.getReceiptPdfUrl(receiptId,kind);await openTrustedExternal(url);return true;}
    const filePath=databaseService.getReceiptPdfPath(receiptId,kind); if(!filePath)throw new Error("PDF_NOT_FOUND");
    const message=await shell.openPath(filePath); if(message)throw new Error("PDF_OPEN_FAILED"); return true;
  }, input));
}
