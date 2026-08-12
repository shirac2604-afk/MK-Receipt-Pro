import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { writeZip } from "../../diagnostics/src/ZipArchive";

export interface SimulatorSubmissionPackageResult {
  packageFolder:string;
  zipPath:string;
  manifestPath:string;
  instructionsPath:string;
  fileSize:number;
  sha256:string;
  includedFiles:string[];
}

function sha256(filePath:string):string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function readableMissingName(name:string):string {
  return name.replace(/_/g," ");
}

function readJson(filePath:string):unknown {
  try{return JSON.parse(fs.readFileSync(filePath,"utf8"));}catch{return null;}
}

function ensureExpectedExportFolder(folderPath:string):string {
  const normalized=path.resolve(folderPath);
  if(!normalized.split(path.sep).includes("OPENFRMT"))throw new Error("SIMULATOR_PACKAGE_INVALID_EXPORT_FOLDER");
  for(const name of ["INI.TXT","BKMVDATA.TXT"]){
    if(!fs.existsSync(path.join(normalized,name)))throw new Error(`SIMULATOR_PACKAGE_MISSING_${name.replace(/[^A-Z0-9]/gi,"_")}`);
  }
  const report26Available=["REPORT-2.6.pdf","REPORT-2.6.html"].some(name=>fs.existsSync(path.join(normalized,name)));
  const report54Available=["REPORT-5.4.pdf","REPORT-5.4.html"].some(name=>fs.existsSync(path.join(normalized,name)));
  if(!report26Available)throw new Error("SIMULATOR_PACKAGE_MISSING_REPORT_2_6");
  if(!report54Available)throw new Error("SIMULATOR_PACKAGE_MISSING_REPORT_5_4");
  return normalized;
}

function ensurePreflightFile(source:string):string {
  const existing=path.join(source,"PREFLIGHT-RESULT.json");
  if(fs.existsSync(existing))return existing;
  const summaryPath=path.join(source,"EXPORT-SUMMARY.json");
  const summary=readJson(summaryPath) as {validation?:{valid?:boolean;errors?:string[];warnings?:string[]};counts?:Record<string,number>;documentCount?:number;totalAmountAgorot?:number;createdAt?:string}|null;
  if(!summary)throw new Error("SIMULATOR_PACKAGE_MISSING_EXPORT_SUMMARY");
  const preflight={
    valid:summary.validation?.valid===true,
    generatedAt:new Date().toISOString(),
    source:"production-export",
    totalRecords:Number(summary.counts?.total??0),
    documentCount:Number(summary.documentCount??0),
    totalAmountAgorot:Number(summary.totalAmountAgorot??0),
    counts:summary.counts??{},
    issues:Array.isArray(summary.validation?.errors)?summary.validation?.errors:[],
    warnings:Array.isArray(summary.validation?.warnings)?summary.validation?.warnings:[],
  };
  fs.writeFileSync(existing,JSON.stringify(preflight,null,2),"utf8");
  if(!preflight.valid)throw new Error(`SIMULATOR_PACKAGE_PREFLIGHT_FAILED_${preflight.issues.join("|").slice(0,320)}`);
  return existing;
}

export class SimulatorSubmissionPackageService {
  create(exportFolder:string):SimulatorSubmissionPackageResult {
    const source=ensureExpectedExportFolder(exportFolder);
    ensurePreflightFile(source);
    const packageFolder=path.join(source,"SIMULATOR-SUBMISSION");
    fs.rmSync(packageFolder,{recursive:true,force:true});
    fs.mkdirSync(path.join(packageFolder,"SIMULATOR-RESULTS"),{recursive:true});

    const copyNames=[
      "INI.TXT","BKMVDATA.TXT","REPORT-2.6.html","REPORT-2.6.pdf","REPORT-5.4.html","REPORT-5.4.pdf",
      "PREFLIGHT-RESULT.json","OPEN-FORMAT-PRODUCTION-AUDIT.json","OPEN-FORMAT-HEADER-AUDIT.json",
      "OPEN-FORMAT-BYTE-AUDIT.json","OPEN-FORMAT-SIMULATOR-FILES-AUDIT.json","OPEN-FORMAT-SUMMARY-AUDIT.json",
      "OPEN-FORMAT-PATH-AUDIT.json","OPEN-FORMAT-REPORT-2.6-AUDIT.json","OPEN-FORMAT-REPORT-5.4-AUDIT.json","OPEN-FORMAT-PRINT-PDF-AUDIT.json",
      "EXPORT-SUMMARY.json"
    ];
    for(const name of copyNames){
      const from=path.join(source,name);
      if(fs.existsSync(from))fs.copyFileSync(from,path.join(packageFolder,name));
    }

    const instructions=`חבילת בדיקה לסימולטור רשות המסים\r\n\r\n1. יש להעלות לסימולטור הרשמי את INI.TXT ואת BKMVDATA.TXT.\r\n2. לפני ההעלאה יש לוודא שקובץ PREFLIGHT-RESULT.json מסומן valid=true.\r\n3. לאחר הרצת הסימולטור יש לשמור את הדוח המסכם בתיקיית SIMULATOR-RESULTS.\r\n4. יש לצרף לבקשת הרישום את פלט הסימולטור התקין, דוח 2.6 ודוח 5.4.\r\n5. חבילה זו היא כלי הכנה בלבד ואינה מהווה אישור או רישום.\r\n`;
    const instructionsPath=path.join(packageFolder,"README-SIMULATOR.txt");
    fs.writeFileSync(instructionsPath,instructions,"utf8");
    fs.writeFileSync(path.join(packageFolder,"SIMULATOR-RESULTS","PUT-OFFICIAL-REPORT-HERE.txt"),"יש לשמור כאן את דוח הסימולטור הרשמי לאחר הבדיקה.\r\n","utf8");

    const files=fs.readdirSync(packageFolder,{withFileTypes:true}).filter(entry=>entry.isFile()).map(entry=>entry.name).sort();
    const manifest={
      format:"MK_TAX_SIMULATOR_SUBMISSION",
      formatVersion:2,
      createdAt:new Date().toISOString(),
      sourceFolder:source,
      files:files.map(name=>({name,size:fs.statSync(path.join(packageFolder,name)).size,sha256:sha256(path.join(packageFolder,name))})),
      officialSimulatorReportIncluded:false,
      note:"הדוח הרשמי מתווסף רק לאחר הרצת הסימולטור באתר רשות המסים."
    };
    const manifestPath=path.join(packageFolder,"SUBMISSION-MANIFEST.json");
    fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2),"utf8");

    const zipEntries=fs.readdirSync(packageFolder,{withFileTypes:true}).filter(entry=>entry.isFile()).map(entry=>({name:entry.name,content:fs.readFileSync(path.join(packageFolder,entry.name))}));
    zipEntries.push({name:"SIMULATOR-RESULTS/PUT-OFFICIAL-REPORT-HERE.txt",content:fs.readFileSync(path.join(packageFolder,"SIMULATOR-RESULTS","PUT-OFFICIAL-REPORT-HERE.txt"))});
    const zipPath=path.join(source,"SIMULATOR-SUBMISSION.zip");
    try{writeZip(zipPath,zipEntries);}catch(error){
      const detail=error instanceof Error?error.message:"UNKNOWN";
      throw new Error(`SIMULATOR_PACKAGE_ZIP_FAILED_${readableMissingName(detail).slice(0,240)}`);
    }
    return {packageFolder,zipPath,manifestPath,instructionsPath,fileSize:fs.statSync(zipPath).size,sha256:sha256(zipPath),includedFiles:zipEntries.map(item=>item.name)};
  }
}
