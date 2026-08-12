import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { writeZip } from "../../diagnostics/src/ZipArchive";

export interface TaxRegistrationDossierContext {
  productName:string; version:string; buildNumber:string; channel:string; businessId:string;
  manufacturerName:string; manufacturerBusinessNumber:string; contactName:string; contactEmail:string;
}
export interface TaxRegistrationDossierResult {
  dossierFolder:string; zipPath:string; manifestPath:string; declarationPath:string; checklistPath:string;
  fileSize:number; sha256:string; includedFiles:string[]; ready:boolean; missingItems:string[];
}
function hash(filePath:string):string{return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");}
function copyIfExists(source:string,target:string,items:string[]):void{if(fs.existsSync(source)&&fs.statSync(source).isFile()){fs.copyFileSync(source,target);items.push(path.basename(target));}}
function clean(value:string):string{return (value??"").replace(/[\r\n]+/g," ").trim();}
function readJson(filePath:string):any{try{return JSON.parse(fs.readFileSync(filePath,"utf8"));}catch{return null;}}
function isPdf(filePath:string):boolean{if(!fs.existsSync(filePath)||!fs.statSync(filePath).isFile()||fs.statSync(filePath).size<100)return false;const head=fs.readFileSync(filePath).subarray(0,5).toString("ascii");return head==="%PDF-";}

export class TaxRegistrationDossierService {
  create(submissionFolder:string,context:TaxRegistrationDossierContext):TaxRegistrationDossierResult {
    const source=path.resolve(submissionFolder);
    if(!fs.existsSync(source)||!fs.statSync(source).isDirectory())throw new Error("TAX_DOSSIER_SUBMISSION_FOLDER_MISSING");
    const officialResultPath=path.join(source,"SIMULATOR-RESULTS","OFFICIAL-SIMULATOR-RESULT.json");
    const officialReportPath=path.join(source,"SIMULATOR-RESULTS","OFFICIAL-SIMULATOR-REPORT.pdf");
    if(!fs.existsSync(officialResultPath)||!fs.existsSync(officialReportPath))throw new Error("TAX_DOSSIER_OFFICIAL_RESULT_MISSING");
    if(!isPdf(officialReportPath))throw new Error("TAX_DOSSIER_OFFICIAL_REPORT_INVALID_PDF");
    const official=readJson(officialResultPath);
    if(official?.status!=="passed"||official?.matchesExport!==true)throw new Error("TAX_DOSSIER_SIMULATOR_NOT_APPROVED");

    const parent=path.dirname(source);
    const dossierFolder=path.join(parent,"TAX-REGISTRATION-DOSSIER");
    fs.rmSync(dossierFolder,{recursive:true,force:true});fs.mkdirSync(dossierFolder,{recursive:true});
    const included:string[]=[];
    const mapping:[string,string][]=[
      [officialReportPath,"01-OFFICIAL-SIMULATOR-REPORT.pdf"],
      [officialResultPath,"02-OFFICIAL-SIMULATOR-RESULT.json"],
      [path.join(source,"REPORT-2.6.pdf"),"03-REPORT-2.6.pdf"],
      [path.join(source,"REPORT-2.6.html"),"03B-REPORT-2.6.html"],
      [path.join(source,"REPORT-5.4.pdf"),"04-REPORT-5.4.pdf"],
      [path.join(source,"REPORT-5.4.html"),"04B-REPORT-5.4.html"],
      [path.join(source,"OPEN-FORMAT-PRINT-PDF-AUDIT.json"),"04C-OPEN-FORMAT-PRINT-PDF-AUDIT.json"],
      [path.join(source,"INI.TXT"),"05-INI.TXT"],
      [path.join(source,"BKMVDATA.TXT"),"06-BKMVDATA.TXT"],
      [path.join(source,"PREFLIGHT-RESULT.json"),"07-PREFLIGHT-RESULT.json"],
      [path.join(source,"SUBMISSION-MANIFEST.json"),"08-SUBMISSION-MANIFEST.json"],
      [path.join(source,"OPEN-FORMAT-PRODUCTION-AUDIT.json"),"08A-OPEN-FORMAT-PRODUCTION-AUDIT.json"],
      [path.join(source,"OPEN-FORMAT-HEADER-AUDIT.json"),"08B-OPEN-FORMAT-HEADER-AUDIT.json"],
      [path.join(source,"OPEN-FORMAT-BYTE-AUDIT.json"),"08C-OPEN-FORMAT-BYTE-AUDIT.json"],
      [path.join(source,"OPEN-FORMAT-SIMULATOR-FILES-AUDIT.json"),"08D-OPEN-FORMAT-SIMULATOR-FILES-AUDIT.json"],
      [path.join(source,"OPEN-FORMAT-SUMMARY-AUDIT.json"),"08E-OPEN-FORMAT-SUMMARY-AUDIT.json"],
      [path.join(source,"OPEN-FORMAT-RECEIPT-RECORD-AUDIT.json"),"08F-OPEN-FORMAT-RECEIPT-RECORD-AUDIT.json"]
    ];
    for(const [from,name] of mapping)copyIfExists(from,path.join(dossierFolder,name),included);

    const missingItems:string[]=[];
    if(!fs.existsSync(path.join(source,"REPORT-2.6.pdf")))missingItems.push("פלט 2.6 כקובץ PDF");
    if(!fs.existsSync(path.join(source,"REPORT-5.4.pdf")))missingItems.push("פלט 5.4 כקובץ PDF");
    if(!fs.existsSync(path.join(source,"INI.TXT")))missingItems.push("INI.TXT");
    if(!fs.existsSync(path.join(source,"BKMVDATA.TXT")))missingItems.push("BKMVDATA.TXT");
    if(!isPdf(officialReportPath))missingItems.push("דוח סימולטור רשמי תקין בפורמט PDF");
    const preflight=readJson(path.join(source,"PREFLIGHT-RESULT.json"));
    if(preflight?.valid!==true)missingItems.push("בדיקת Preflight תקינה");
    const printAudit=readJson(path.join(source,"OPEN-FORMAT-PRINT-PDF-AUDIT.json"));
    if(printAudit?.valid!==true)missingItems.push("בדיקת PDF תקינה לדוחות 2.6 ו־5.4");
    const headerAudit=readJson(path.join(source,"OPEN-FORMAT-HEADER-AUDIT.json"));
    if(headerAudit?.structurallyValid!==true)missingItems.push("בדיקת כותרות המבנה האחיד תקינה");
    const registrationNumber=clean(String(headerAudit?.parsed?.softwareRegistrationNumber??""));
    if(!/^\d{8}$/.test(registrationNumber)||registrationNumber==="00000000")missingItems.push("מספר רישום תוכנה תקף בשדה 1006");
    const headerManufacturer=clean(String(headerAudit?.parsed?.manufacturerBusinessNumber??""));
    if(!/^\d{9}$/.test(headerManufacturer)||headerManufacturer==="000000000")missingItems.push("מספר יצרן תקף בקובץ INI.TXT");
    if(Number(official?.totalRecords??0)<2000)missingItems.push("דוח סימולטור רשמי הכולל לפחות 2,000 רשומות");
    if(!clean(context.manufacturerName))missingItems.push("שם יצרן התוכנה");
    if(!/^\d{9}$/.test(clean(context.manufacturerBusinessNumber)))missingItems.push("מספר עוסק/תאגיד של יצרן התוכנה בן 9 ספרות");
    if(!clean(context.contactName))missingItems.push("שם איש או אשת קשר");
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean(context.contactEmail)))missingItems.push("כתובת דוא״ל תקינה לאיש הקשר");

    const declaration=`הצהרת יצרן תוכנה — קיום מודול ממשק פתוח\r\n\r\nשם התוכנה: ${clean(context.productName)}\r\nגרסה: ${clean(context.version)}\r\nBuild: ${clean(context.buildNumber)}\r\nערוץ הפצה: ${clean(context.channel)}\r\nמזהה עסק פנימי: ${clean(context.businessId)}\r\n\r\nשם היצרן: ${clean(context.manufacturerName)||"להשלמה"}\r\nמספר עוסק/תאגיד של היצרן: ${clean(context.manufacturerBusinessNumber)||"להשלמה"}\r\nאיש/אשת קשר: ${clean(context.contactName)||"להשלמה"}\r\nדוא״ל: ${clean(context.contactEmail)||"להשלמה"}\r\n\r\nאני מצהיר/ה כי בתוכנה כלול מודול בשם "ממשק פתוח / FORMAT OPEN", המפיק קבצים במבנה אחיד גרסה 1.31 וכן את פלטי האימות הנלווים בהתאם לאפיון שיושם בגרסה זו.\r\n\r\nהצהרה זו היא מסמך הכנה לבקשת הרישום ואינה תחליף לחתימה, לאימות מקצועי או לטופס המקוון של רשות המסים.\r\n\r\nשם וחתימה: ____________________\r\nתאריך: ____________________\r\n`;
    const declarationPath=path.join(dossierFolder,"09-OPEN-FORMAT-MODULE-DECLARATION.txt");fs.writeFileSync(declarationPath,declaration,"utf8");included.push(path.basename(declarationPath));

    const checklist=`תיק הגשה לרישום תוכנה — רשימת בדיקה\r\n\r\n[${fs.existsSync(officialReportPath)?"X":" "}] פלט סימולטור רשמי\r\n[${fs.existsSync(path.join(source,"REPORT-2.6.pdf"))?"X":" "}] פלט לפי סעיף 2.6 כ־PDF\r\n[${fs.existsSync(path.join(source,"REPORT-5.4.pdf"))?"X":" "}] פלט לפי נספח 5.4 כ־PDF\r\n[X] הצהרת קיום מודול ממשק פתוח\r\n[ ] מילוי הבקשה הדיגיטלית באתר רשות המסים\r\n[ ] בדיקה מקצועית בידי מומחה לניהול ספרים ומערכות מידע\r\n[ ] חתימה על ההצהרה והמסמכים לפי הצורך\r\n\r\nפרטים שעדיין חסרים בתיק המקומי:\r\n${missingItems.length?missingItems.map(x=>`- ${x}`).join("\r\n"):"- אין פרטי זיהוי חסרים שניתן לבדוק אוטומטית."}\r\n\r\nהערה: תעודת רישום אינה מהווה אישור לנכונות ביצועי התוכנה או לעמידתה בהוראות ניהול פנקסים.\r\n`;
    const checklistPath=path.join(dossierFolder,"10-SUBMISSION-CHECKLIST.txt");fs.writeFileSync(checklistPath,checklist,"utf8");included.push(path.basename(checklistPath));

    const readiness={format:"MK_TAX_REGISTRATION_READINESS",formatVersion:1,createdAt:new Date().toISOString(),ready:missingItems.length===0,officialSimulator:{status:official?.status,matchesExport:official?.matchesExport,totalRecords:Number(official?.totalRecords??0),reportPdfValid:isPdf(officialReportPath)},openFormat:{preflightValid:preflight?.valid===true,printPdfAuditValid:printAudit?.valid===true,headersStructurallyValid:headerAudit?.structurallyValid===true,softwareRegistrationNumber:registrationNumber,manufacturerBusinessNumber:headerManufacturer},identity:{manufacturerName:clean(context.manufacturerName),manufacturerBusinessNumber:clean(context.manufacturerBusinessNumber),contactName:clean(context.contactName),contactEmail:clean(context.contactEmail)},missingItems,disclaimer:"הבדיקה אוטומטית ואינה מחליפה בדיקה מקצועית או החלטת רשות המסים."};
    const readinessPath=path.join(dossierFolder,"11-REGISTRATION-READINESS.json");fs.writeFileSync(readinessPath,JSON.stringify(readiness,null,2),"utf8");included.push(path.basename(readinessPath));

    const manifest={format:"MK_TAX_REGISTRATION_DOSSIER",formatVersion:1,createdAt:new Date().toISOString(),software:{productName:context.productName,version:context.version,buildNumber:context.buildNumber,channel:context.channel,businessId:context.businessId},officialSimulator:{status:official.status,matchesExport:official.matchesExport,importedAt:official.importedAt},ready:missingItems.length===0,missingItems,files:included.sort().map(name=>({name,size:fs.statSync(path.join(dossierFolder,name)).size,sha256:hash(path.join(dossierFolder,name))})),disclaimer:"תיק זה מיועד להכנת הבקשה בלבד ואינו מהווה אישור או רישום."};
    const manifestPath=path.join(dossierFolder,"00-DOSSIER-MANIFEST.json");fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2),"utf8");included.unshift(path.basename(manifestPath));
    const entries=included.map(name=>({name,content:fs.readFileSync(path.join(dossierFolder,name))}));
    const zipPath=path.join(parent,"TAX-REGISTRATION-DOSSIER.zip");writeZip(zipPath,entries);
    return{dossierFolder,zipPath,manifestPath,declarationPath,checklistPath,fileSize:fs.statSync(zipPath).size,sha256:hash(zipPath),includedFiles:included,ready:missingItems.length===0,missingItems};
  }
}
