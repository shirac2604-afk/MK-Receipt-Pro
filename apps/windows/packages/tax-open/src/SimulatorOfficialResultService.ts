import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export interface SimulatorOfficialResultInput {
  status:"passed"|"failed";
  totalRecords:number;
  counts:{"100A":number;"100C":number;"D110":number;"120D":number;"100B":number;"110B":number;"M100":number;"900Z":number};
  notes?:string;
}
export interface SimulatorOfficialResultImport {
  reportPath:string;
  storedReportPath:string;
  resultPath:string;
  status:"passed"|"failed";
  matchesExport:boolean;
  discrepancies:string[];
  sha256:string;
  importedAt:string;
}
function sha256(filePath:string):string{return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");}
function safeInt(value:unknown):number{const n=Number(value);return Number.isInteger(n)&&n>=0?n:0;}

export class SimulatorOfficialResultService {
  import(submissionFolder:string,reportPath:string,input:SimulatorOfficialResultInput):SimulatorOfficialResultImport {
    const folder=path.resolve(submissionFolder);
    const report=path.resolve(reportPath);
    if(!fs.existsSync(folder)||!fs.statSync(folder).isDirectory())throw new Error("SIMULATOR_RESULT_FOLDER_MISSING");
    if(!fs.existsSync(report)||!fs.statSync(report).isFile())throw new Error("SIMULATOR_RESULT_REPORT_MISSING");
    if(path.extname(report).toLowerCase()!==".pdf")throw new Error("SIMULATOR_RESULT_REPORT_MUST_BE_PDF");
    const summaryPath=path.join(path.dirname(folder),"SIMULATOR-FIXTURE-SUMMARY.json");
    const exportSummaryPath=path.join(path.dirname(folder),"EXPORT-SUMMARY.json");
    const sourceSummary=fs.existsSync(summaryPath)?summaryPath:exportSummaryPath;
    if(!fs.existsSync(sourceSummary))throw new Error("SIMULATOR_RESULT_EXPORT_SUMMARY_MISSING");
    const summary=JSON.parse(fs.readFileSync(sourceSummary,"utf8")) as any;
    const expectedCounts={
      "100A":safeInt(summary?.counts?.["100A"]),"100C":safeInt(summary?.counts?.["100C"]),"D110":safeInt(summary?.counts?.["D110"]),"120D":safeInt(summary?.counts?.["120D"]),
      "100B":safeInt(summary?.counts?.["100B"]),"110B":safeInt(summary?.counts?.["110B"]),"M100":safeInt(summary?.counts?.["M100"]),"900Z":safeInt(summary?.counts?.["900Z"])
    };
    const declaredCounts={"100A":safeInt(input.counts["100A"]),"100C":safeInt(input.counts["100C"]),"D110":safeInt(input.counts["D110"]),"120D":safeInt(input.counts["120D"]),"100B":safeInt(input.counts["100B"]),"110B":safeInt(input.counts["110B"]),"M100":safeInt(input.counts["M100"]),"900Z":safeInt(input.counts["900Z"])};
    const expectedTotal=safeInt(summary?.counts?.total)||Object.values(expectedCounts).reduce((a,b)=>a+b,0);
    const discrepancies:string[]=[];
    if(safeInt(input.totalRecords)!==expectedTotal)discrepancies.push(`סך הרשומות בדוח (${safeInt(input.totalRecords)}) אינו תואם לסך שהופק (${expectedTotal}).`);
    for(const key of Object.keys(expectedCounts) as Array<keyof typeof expectedCounts>){
      if(declaredCounts[key]!==expectedCounts[key])discrepancies.push(`${key}: בדוח ${declaredCounts[key]}, בהפקה ${expectedCounts[key]}.`);
    }
    if(input.status!=="passed")discrepancies.push("הסימולטור לא סומן כתקין.");
    const resultsFolder=path.join(folder,"SIMULATOR-RESULTS");fs.mkdirSync(resultsFolder,{recursive:true});
    const storedReportPath=path.join(resultsFolder,"OFFICIAL-SIMULATOR-REPORT.pdf");fs.copyFileSync(report,storedReportPath);
    const importedAt=new Date().toISOString();
    const result={format:"MK_OFFICIAL_SIMULATOR_RESULT",formatVersion:1,importedAt,status:input.status,totalRecords:safeInt(input.totalRecords),declaredCounts,expectedTotal,expectedCounts,matchesExport:discrepancies.length===0,discrepancies,notes:(input.notes??"").trim(),report:{fileName:path.basename(storedReportPath),size:fs.statSync(storedReportPath).size,sha256:sha256(storedReportPath)}};
    const resultPath=path.join(resultsFolder,"OFFICIAL-SIMULATOR-RESULT.json");fs.writeFileSync(resultPath,JSON.stringify(result,null,2),"utf8");
    const manifestPath=path.join(folder,"SUBMISSION-MANIFEST.json");
    if(fs.existsSync(manifestPath)){const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));manifest.officialSimulatorReportIncluded=true;manifest.officialSimulatorResult={status:input.status,matchesExport:discrepancies.length===0,importedAt,reportSha256:result.report.sha256};fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2),"utf8");}
    return {reportPath:report,storedReportPath,resultPath,status:input.status,matchesExport:discrepancies.length===0,discrepancies,sha256:result.report.sha256,importedAt};
  }
}
