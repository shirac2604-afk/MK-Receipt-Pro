import fs from "node:fs";
import path from "node:path";
import type { DatabaseConnection } from "../../database/src/DatabaseConnection";
import type { FullHealthReport, HealthCheckItem, ErrorLogRecord, SecurityStatus } from "../../database/src/types";
export class HealthService {
  constructor(private readonly db:DatabaseConnection, private readonly userDataPath:string, private readonly documentsPath:string){}
  runFullCheck():FullHealthReport{
    const checks:HealthCheckItem[]=[];
    const dbHealth=this.db.healthCheck();
    checks.push({key:"database",label:"מסד הנתונים",status:dbHealth.status,message:dbHealth.sqliteIntegrity==="ok"?"מסד הנתונים תקין":"נמצאה בעיית תקינות"});
    const dup=this.db.prepare("SELECT COUNT(*) AS c FROM (SELECT receipt_number FROM receipts GROUP BY receipt_number HAVING COUNT(*)>1)").get() as unknown as {c:number};
    const seq=this.db.prepare("SELECT next_number,last_issued_number FROM receipt_sequences WHERE sequence_key='receipt'").get() as unknown as {next_number:number;last_issued_number:number}|undefined;
    const max=this.db.prepare("SELECT COALESCE(MAX(receipt_number),0) AS m FROM receipts").get() as unknown as {m:number};
    const seqOk=!!seq && dup.c===0 && seq.last_issued_number===max.m && seq.next_number===max.m+1;
    checks.push({key:"sequence",label:"רצף הקבלות",status:seqOk?"healthy":"critical",message:seqOk?"הרצף תקין ואין מספרים כפולים":"זוהתה אי־התאמה ברצף"});
    const pdfRows=this.db.prepare("SELECT original_pdf_path,original_pdf_hash,cancellation_pdf_path,cancellation_pdf_hash FROM receipts").all() as unknown as any[];
    let missing=0; for(const r of pdfRows){if(r.original_pdf_path&&!fs.existsSync(r.original_pdf_path))missing++; if(r.cancellation_pdf_path&&!fs.existsSync(r.cancellation_pdf_path))missing++;}
    checks.push({key:"pdf",label:"קובצי PDF",status:missing?"warning":"healthy",message:missing?`${missing} קבצים חסרים`:"כל הקבצים הרשומים קיימים"});
    const latest=this.db.prepare("SELECT created_at,status FROM backups ORDER BY created_at DESC LIMIT 1").get() as unknown as {created_at:string;status:string}|undefined;
    const age=latest?(Date.now()-new Date(latest.created_at).getTime())/86400000:999;
    checks.push({key:"backup",label:"גיבוי",status:!latest?"warning":age>7?"warning":"healthy",message:!latest?"עדיין לא נוצר גיבוי":age>7?"הגיבוי האחרון ישן משבעה ימים":"קיים גיבוי עדכני"});
    let diskStatus:"healthy"|"warning"="healthy", diskMessage="שטח האחסון זמין";
    try{const st=fs.statfsSync(this.userDataPath);const free=st.bavail*st.bsize; if(free<5*1024**3){diskStatus="warning";diskMessage=`נותרו ${(free/1024**3).toFixed(1)} GB פנויים`;}}catch{}
    checks.push({key:"disk",label:"שטח אחסון",status:diskStatus,message:diskMessage});
    const critical=checks.filter(c=>c.status==="critical").length, warning=checks.filter(c=>c.status==="warning").length;
    const overallStatus: FullHealthReport["overallStatus"] = critical?"critical":warning?"warning":"healthy"; const score=Math.max(0,100-critical*30-warning*10);
    const report={overallStatus,score,checkedAt:new Date().toISOString(),checks};
    this.db.prepare("INSERT INTO health_checks(id,overall_status,score,results_json,created_at) VALUES(lower(hex(randomblob(16))),?,?,?,?)").run(overallStatus,score,JSON.stringify(checks),report.checkedAt);
    return report;
  }
  listErrors(limit=100):ErrorLogRecord[]{return (this.db.prepare("SELECT * FROM error_logs ORDER BY created_at DESC LIMIT ?").all(limit) as unknown as any[]).map(r=>({id:r.id,errorCode:r.error_code,severity:r.severity,module:r.module,userMessage:r.user_message,technicalMessage:r.technical_message,resolved:Boolean(r.resolved),createdAt:r.created_at}));}
  logError(module:string,error:unknown,userMessage?:string):void{const e=error instanceof Error?error:new Error(String(error));this.db.prepare("INSERT INTO error_logs(id,error_code,severity,module,user_message,technical_message,context_json,resolved,created_at) VALUES(lower(hex(randomblob(16))),?,'error',?,?,?,?,0,?)").run(e.message,module,userMessage??null,e.message,"{}",new Date().toISOString());}
  securityStatus():SecurityStatus{const s=this.db.prepare("SELECT pin_hash,auto_lock_minutes FROM business_settings WHERE id='primary'").get() as unknown as {pin_hash:string|null;auto_lock_minutes:number}|undefined;return{pinConfigured:Boolean(s?.pin_hash),autoLockMinutes:s?.auto_lock_minutes??0};}
}
