import path from "node:path";
import crypto from "node:crypto";
import type { DatabaseHealthReport, BusinessSettingsInput, BusinessSettingsRecord, CustomerRecord, CustomerProfile, CustomerCreateInput, CustomerUpdateInput, CustomerDuplicateQuery, CustomerDuplicateMatch, IssueReceiptInput, IssueReceiptResult, OnboardingStatus, ReceiptCoreStatus, ReceiptSearchFilters, ReceiptSearchResult, ReceiptRecord, CancelReceiptResult, ReportFilters, DateRangeReport, AnnualReport, BackupRecord, BackupInspection, BackupOverview, RestoreResult } from "./types";
import { DatabaseConnection } from "./DatabaseConnection";
import { BusinessSettingsRepository } from "./repositories/BusinessSettingsRepository";
import { ReceiptRepository } from "./repositories/ReceiptRepository";
import { IssueReceiptService } from "../../application/src/receipts/IssueReceiptService";
import { ReceiptPdfService } from "../../pdf/src/ReceiptPdfService";
import { SettingsService } from "../../application/src/SettingsService";
import { ReportRepository } from "./repositories/ReportRepository";
import { ReportService } from "../../application/src/reports/ReportService";
import { BackupService } from "../../backup/src/BackupService";
import fs from "node:fs";
import { HealthService } from "../../application/src/HealthService";
import type { FullHealthReport, ErrorLogRecord, SecurityStatus, DiagnosticPreview, DiagnosticPackageResult, QaReport, QaExportResult } from "./types";
import { DiagnosticService } from "../../diagnostics/src/DiagnosticService";
import { QaService } from "../../qa/src/QaService";
import { OpenFormatService } from "../../tax-open/src/OpenFormatService";
import { SimulatorSubmissionPackageService } from "../../tax-open/src/SimulatorSubmissionPackageService";
import { SimulatorOfficialResultService } from "../../tax-open/src/SimulatorOfficialResultService";
import { TaxRegistrationDossierService } from "../../tax-open/src/TaxRegistrationDossierService";
import type { OpenFormatExportInput, OpenFormatExportResult, ExpenseInput, ExpenseUpdateInput, ExpenseSearchFilters, ExpenseRecord, ExpenseSummary, ReceiptTemplateInput, ReceiptTemplateRecord, PaymentMethod } from "./types";

export class DatabaseService {
  private connection: DatabaseConnection | null = null;
  private settingsRepository: BusinessSettingsRepository | null = null;
  private receiptRepository: ReceiptRepository | null = null;
  private issueReceiptService: IssueReceiptService | null = null;
  private pdfService: ReceiptPdfService | null = null;
  private settingsService: SettingsService | null = null;
  private reportService: ReportService | null = null;
  private backupService: BackupService | null = null;
  private healthService: HealthService | null = null;
  private diagnosticService: DiagnosticService | null = null;
  private qaService: QaService | null = null;
  private openFormatService: OpenFormatService | null = null;
  private userDataPath: string | null = null;
  private documentsPath: string | null = null;
  private resourcesPath: string | null = null;
  private automaticCloudSyncHook: (()=>void) | null = null;

  initialize(userDataPath: string, documentsPath?: string, resourcesPath?: string): void {
    if (this.connection) return;
    this.userDataPath=userDataPath; this.documentsPath=documentsPath ?? path.join(userDataPath,"documents"); this.resourcesPath=resourcesPath ?? null;
    const databasePath = path.join(userDataPath,"database","mk-receipt.sqlite");
    this.connection = new DatabaseConnection(databasePath); this.connection.migrate();
    this.settingsRepository = new BusinessSettingsRepository(this.connection); this.settingsRepository.createFoundationDefaults();
    this.receiptRepository = new ReceiptRepository(this.connection);
    this.issueReceiptService = new IssueReceiptService(this.connection,this.receiptRepository,()=>{ const s=this.settingsRepository?.get(); if(!s) throw new Error("BUSINESS_SETTINGS_MISSING"); return s; });
    this.pdfService = new ReceiptPdfService(this.documentsPath,()=>{
      const configured=this.settingsRepository?.get()?.logoPath;
      if(configured&&fs.existsSync(configured))return configured;
      const candidates=[resourcesPath?path.join(resourcesPath,"branding","logo.png"):null,path.join(process.cwd(),"resources","branding","logo.png")].filter((value):value is string=>Boolean(value));
      return candidates.find(candidate=>fs.existsSync(candidate))??null;
    });
    this.settingsService = new SettingsService(this.connection, this.settingsRepository, path.join(userDataPath, "branding"));
    this.reportService = new ReportService(new ReportRepository(this.connection));
    this.backupService = new BackupService(this.connection,userDataPath,this.documentsPath,()=>{const s=this.settingsRepository?.get();if(!s)throw new Error("BUSINESS_SETTINGS_MISSING");return s;},"1.1.0");
    this.healthService = new HealthService(this.connection,userDataPath,this.documentsPath);
    this.diagnosticService = new DiagnosticService({ getDatabaseHealth:()=>this.getHealth(), runHealthCheck:()=>this.runFullHealthCheck(), getSecurityStatus:()=>this.getSecurityStatus(), listErrors:()=>this.listErrorLogs() });
    this.qaService = new QaService({ getDatabaseHealth:()=>this.getHealth(), runFullHealthCheck:()=>this.runFullHealthCheck(), getReceiptStatus:()=>this.getReceiptCoreStatus(), getBackupOverview:()=>this.getBackupOverview(), appVersion:"1.1.0", buildNumber:"local" });
    this.openFormatService = new OpenFormatService(this.connection,()=>{const b=this.settingsRepository?.get();if(!b)throw new Error("BUSINESS_SETTINGS_MISSING");return b;});
  }


  private validateExpenseInput(input:ExpenseInput):{supplier:string;category:string} {
    const supplier=input.supplierName.trim(); const category=String(input.category||"").trim();
    if(!/^\d{4}-\d{2}-\d{2}$/.test(input.expenseDate)||!supplier||!category||!Number.isInteger(input.amountAgorot)||input.amountAgorot<=0) throw new Error("INVALID_INPUT");
    return {supplier,category};
  }
  private copyExpenseAttachment(expenseId:string,source:string):{path:string;originalName:string} {
    if(!this.userDataPath) throw new Error("Database service is not initialized");
    if(!fs.existsSync(source)||!fs.statSync(source).isFile()) throw new Error("INVALID_INPUT");
    const ext=path.extname(source).toLowerCase(); if(![".pdf",".png",".jpg",".jpeg",".webp"].includes(ext)) throw new Error("INVALID_INPUT");
    const folder=path.join(this.userDataPath,"expenses","attachments"); fs.mkdirSync(folder,{recursive:true});
    const target=path.join(folder,`${expenseId}-${Date.now()}${ext}`); fs.copyFileSync(source,target);
    return {path:target,originalName:path.basename(source)};
  }
  addExpense(input:ExpenseInput):ExpenseRecord {
    const {supplier,category}=this.validateExpenseInput(input);
    const id=crypto.randomUUID(); const now=new Date().toISOString();
    let attachmentPath:string|null=null, attachmentOriginalName:string|null=null;
    if(input.attachmentSourcePath){const copied=this.copyExpenseAttachment(id,input.attachmentSourcePath);attachmentPath=copied.path;attachmentOriginalName=copied.originalName;}
    this.requireConnection().prepare("INSERT INTO expenses(id,expense_date,supplier_name,amount_agorot,category,payment_method,notes,attachment_path,attachment_original_name,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)").run(id,input.expenseDate,supplier,input.amountAgorot,category,input.paymentMethod?.trim()||null,input.notes?.trim()||null,attachmentPath,attachmentOriginalName,now,now);
    this.tryAutomaticBackup(); return this.getExpenseById(id)!;
  }
  updateExpense(input:ExpenseUpdateInput):ExpenseRecord {
    const current=this.getExpenseById(input.id); if(!current) throw new Error("INVALID_INPUT");
    const {supplier,category}=this.validateExpenseInput(input); const now=new Date().toISOString();
    let nextPath=current.attachmentPath, nextOriginal=current.attachmentOriginalName, newCopiedPath:string|null=null;
    if(input.attachmentSourcePath){const copied=this.copyExpenseAttachment(input.id,input.attachmentSourcePath);nextPath=copied.path;nextOriginal=copied.originalName;newCopiedPath=copied.path;}
    else if(input.removeAttachment){nextPath=null;nextOriginal=null;}
    try{
      this.requireConnection().prepare("UPDATE expenses SET expense_date=?,supplier_name=?,amount_agorot=?,category=?,payment_method=?,notes=?,attachment_path=?,attachment_original_name=?,updated_at=? WHERE id=?").run(input.expenseDate,supplier,input.amountAgorot,category,input.paymentMethod?.trim()||null,input.notes?.trim()||null,nextPath,nextOriginal,now,input.id);
    }catch(error){if(newCopiedPath&&fs.existsSync(newCopiedPath))fs.rmSync(newCopiedPath,{force:true});throw error;}
    if(current.attachmentPath&&current.attachmentPath!==nextPath&&fs.existsSync(current.attachmentPath))fs.rmSync(current.attachmentPath,{force:true});
    this.tryAutomaticBackup(); return this.getExpenseById(input.id)!;
  }
  deleteExpense(id:string):boolean {
    const current=this.getExpenseById(id); if(!current) throw new Error("INVALID_INPUT");
    const result=this.requireConnection().prepare("DELETE FROM expenses WHERE id=?").run(id);
    if(Number(result.changes)>0&&current.attachmentPath&&fs.existsSync(current.attachmentPath))fs.rmSync(current.attachmentPath,{force:true});
    this.tryAutomaticBackup(); return Number(result.changes)>0;
  }
  listExpenses(filters:ExpenseSearchFilters={}):ExpenseSummary {
    const clauses:string[]=[]; const params:string[]=[];
    if(filters.fromDate){clauses.push("expense_date>=?");params.push(filters.fromDate)}
    if(filters.toDate){clauses.push("expense_date<=?");params.push(filters.toDate)}
    if(filters.category){clauses.push("category=?");params.push(filters.category)}
    if(filters.query?.trim()){clauses.push("(supplier_name LIKE ? OR notes LIKE ? OR payment_method LIKE ?)");const q=`%${filters.query.trim()}%`;params.push(q,q,q)}
    const where=clauses.length?`WHERE ${clauses.join(" AND ")}`:"";
    const rows=this.requireConnection().prepare(`SELECT * FROM expenses ${where} ORDER BY expense_date DESC, created_at DESC`).all(...params) as unknown as any[];
    const items=rows.map(row=>this.mapExpense(row)); return {items,count:items.length,totalAgorot:items.reduce((sum,item)=>sum+item.amountAgorot,0)};
  }
  getExpenseById(id:string):ExpenseRecord|null { const row=this.requireConnection().prepare("SELECT * FROM expenses WHERE id=?").get(id) as unknown as any; return row?this.mapExpense(row):null; }
  getExpenseAttachmentPath(id:string):string|null { return this.getExpenseById(id)?.attachmentPath??null; }
  private mapExpense(row:any):ExpenseRecord{return{id:row.id,expenseDate:row.expense_date,supplierName:row.supplier_name,amountAgorot:row.amount_agorot,category:row.category,paymentMethod:row.payment_method,notes:row.notes,attachmentPath:row.attachment_path,attachmentOriginalName:row.attachment_original_name,createdAt:row.created_at,updatedAt:row.updated_at};}

  exportOpenFormat(input:OpenFormatExportInput):OpenFormatExportResult { if(!this.openFormatService)throw new Error("Database service is not initialized"); return this.openFormatService.export(input); }
  createSimulatorSubmissionPackage(exportFolder:string){ return new SimulatorSubmissionPackageService().create(exportFolder); }
  importSimulatorOfficialResult(submissionFolder:string,reportPath:string,input:import("../../tax-open/src/SimulatorOfficialResultService").SimulatorOfficialResultInput){ return new SimulatorOfficialResultService().import(submissionFolder,reportPath,input); }
  createTaxRegistrationDossier(submissionFolder:string,context:import("../../tax-open/src/TaxRegistrationDossierService").TaxRegistrationDossierContext){ return new TaxRegistrationDossierService().create(submissionFolder,context); }
  getHealth(): DatabaseHealthReport { return this.requireConnection().healthCheck(); }
  runFullHealthCheck(): FullHealthReport { return this.requireHealth().runFullCheck(); }
  listErrorLogs(): ErrorLogRecord[] { return this.requireHealth().listErrors(); }
  getSecurityStatus(): SecurityStatus { return this.requireHealth().securityStatus(); }
  recordError(module:string,error:unknown,userMessage?:string): void { this.requireHealth().logError(module,error,userMessage); }
  getDiagnosticPreview(): DiagnosticPreview { return this.requireDiagnostic().preview(); }
  createDiagnosticPackage(filePath:string, context:Parameters<DiagnosticService["create"]>[1]): DiagnosticPackageResult { return this.requireDiagnostic().create(filePath,context); }
  runQaReport(): QaReport { return this.requireQa().run(); }
  exportQaReport(report:QaReport,filePath:string): QaExportResult { return this.requireQa().export(report,filePath); }

  getBusinessSettings(): BusinessSettingsRecord | null { return this.requireSettings().get(); }
  getOnboardingStatus(): OnboardingStatus { return this.requireSettingsService().getStatus(); }
  completeSetup(input: BusinessSettingsInput): BusinessSettingsRecord { return this.requireSettingsService().completeSetup(input); }
  verifyPin(pin: string): boolean { return this.requireSettingsService().verifyPin(pin); }
  getReceiptCoreStatus(): ReceiptCoreStatus { return this.requireReceipts().status(); }
  listCustomers(): CustomerRecord[] { return this.requireReceipts().listCustomers(); }
  getCustomerProfile(customerId:string): CustomerProfile { return this.requireReceipts().getCustomerProfile(customerId); }
  findCustomerDuplicates(query:CustomerDuplicateQuery): CustomerDuplicateMatch[] { return this.requireReceipts().findCustomerDuplicates(query); }
  createCustomer(input:CustomerCreateInput): CustomerRecord { const result=this.requireReceipts().createCustomer(input); this.tryAutomaticBackup(); return result; }
  updateCustomer(input:CustomerUpdateInput): CustomerRecord { const result=this.requireReceipts().updateCustomer(input); this.tryAutomaticBackup(); return result; }

  listReceiptTemplates(): ReceiptTemplateRecord[] {
    const rows=this.requireConnection().prepare("SELECT id,name,customer_id,description,amount_agorot,payment_method,created_at,updated_at FROM receipt_templates ORDER BY name COLLATE NOCASE, created_at").all() as unknown as Array<any>;
    return rows.map(row=>({id:row.id,name:row.name,customerId:row.customer_id,description:row.description,amountAgorot:row.amount_agorot,paymentMethod:row.payment_method as PaymentMethod,createdAt:row.created_at,updatedAt:row.updated_at}));
  }
  addReceiptTemplate(input:ReceiptTemplateInput): ReceiptTemplateRecord {
    const name=input.name.trim(), description=input.description.trim();
    if(name.length<2||description.length<2||!Number.isInteger(input.amountAgorot)||input.amountAgorot<=0)throw new Error("INVALID_INPUT");
    if(!["cash","bank_transfer","bit","paybox"].includes(input.paymentMethod))throw new Error("INVALID_INPUT");
    const customerId=input.customerId?.trim()||null;
    if(customerId){const row=this.requireConnection().prepare("SELECT id FROM customers WHERE id=? AND is_archived=0").get(customerId);if(!row)throw new Error("CUSTOMER_NOT_FOUND");}
    const id=crypto.randomUUID(), now=new Date().toISOString();
    this.requireConnection().prepare("INSERT INTO receipt_templates(id,name,customer_id,description,amount_agorot,payment_method,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)").run(id,name,customerId,description,input.amountAgorot,input.paymentMethod,now,now);
    this.tryAutomaticBackup();
    return {id,name,customerId,description,amountAgorot:input.amountAgorot,paymentMethod:input.paymentMethod,createdAt:now,updatedAt:now};
  }
  deleteReceiptTemplate(id:string): boolean {
    if(!id.trim())throw new Error("INVALID_INPUT");
    const result=this.requireConnection().prepare("DELETE FROM receipt_templates WHERE id=?").run(id);
    if(Number(result.changes)>0)this.tryAutomaticBackup();
    return Number(result.changes)>0;
  }
  searchReceipts(filters: ReceiptSearchFilters): ReceiptSearchResult { return this.requireReceipts().search(filters); }
  getReceiptPdfPath(receiptId: string, kind: "original"|"cancellation"="original"): string | null { return this.requireReceipts().getPdfPath(receiptId, kind); }
  getReceiptById(receiptId: string): ReceiptRecord | null { return this.requireReceipts().findById(receiptId); }
  async cancelReceipt(receiptId:string, reason:string):Promise<CancelReceiptResult>{
    if(!this.pdfService) throw new Error("Database service is not initialized");
    if(reason.trim().length<5) throw new Error("INVALID_CANCELLATION_REASON");
    const receipt=this.requireConnection().transaction(()=>this.requireReceipts().cancel(receiptId,reason.trim()));
    try{const model=this.requireReceipts().getPdfModel(receiptId);const pdf=await this.pdfService.createCancellation(model);this.requireReceipts().attachCancellationPdf(receiptId,pdf);this.tryAutomaticBackup();return{receipt:this.requireReceipts().findById(receiptId)!,cancellationPdfCreated:true,cancellationPdfPath:pdf.path};}
    catch(error){return{receipt,cancellationPdfCreated:false,cancellationPdfPath:null,warningCode:error instanceof Error?error.message:"PDF_WRITE_FAILED"};}
  }
  getRangeReport(filters: ReportFilters): DateRangeReport { return this.requireReports().getRange(filters); }
  getAnnualReport(year:number): AnnualReport { return this.requireReports().getAnnual(year); }
  exportReportCsv(filters:ReportFilters,filePath:string):string { return this.requireReports().exportCsv(filters,filePath); }
  async exportAccountantPackage(year:number,targetRoot:string):Promise<string> {
    if(!this.pdfService)throw new Error("Database service is not initialized");
    const rows=this.requireConnection().prepare("SELECT id,original_pdf_path FROM receipts WHERE payment_date>=? AND payment_date<=? ORDER BY receipt_number").all(`${year}-01-01`,`${year}-12-31`) as unknown as Array<{id:string;original_pdf_path:string|null}>;
    for(const row of rows){if(!row.original_pdf_path||!fs.existsSync(row.original_pdf_path)){const model=this.requireReceipts().getPdfModel(row.id);const pdf=await this.pdfService.createOriginal(model);this.requireReceipts().attachOriginalPdf(row.id,pdf);}}
    return this.requireReports().exportAccountantPackage(year,targetRoot);
  }

  setAutomaticCloudSyncHook(hook:(()=>void)|null):void { this.automaticCloudSyncHook=hook; }
  createCloudSyncSnapshot():string {
    if(!this.userDataPath)throw new Error("Database service is not initialized");
    const folder=path.join(this.userDataPath,"cloud-sync");fs.mkdirSync(folder,{recursive:true});
    const target=path.join(folder,"MK-Receipt-Pro-Sync-Latest.mkrbackup");
    this.requireBackup().create(target,"automatic");
    return target;
  }
  restoreCloudSyncSnapshot(filePath:string):RestoreResult { return this.restoreBackup(filePath); }

  getBackupOverview(): BackupOverview {
    const settings=this.requireSettings().get();
    const row=this.requireConnection().prepare("SELECT * FROM backups WHERE status='verified' ORDER BY created_at DESC LIMIT 1").get() as unknown as any;
    const count=this.requireConnection().prepare("SELECT COUNT(*) AS c FROM backups").get() as unknown as {c:number};
    return {backupFolder:settings?.backupFolder??null,googleDriveFolder:settings?.googleDriveFolder??null,latestBackup:row?this.mapBackup(row):null,backupCount:count.c};
  }
  createBackup(targetFile:string,type:BackupRecord["backupType"]="manual"):BackupRecord {
    const record=this.requireBackup().create(targetFile,type);
    const connection=this.requireConnection();
    connection.transaction(()=>{
      // The automatic backup is a rolling single recovery point. Reusing a
      // manually selected target also replaces the previous metadata row for
      // that same file instead of growing the backup table indefinitely.
      if(type==="automatic") connection.prepare("DELETE FROM backups WHERE backup_type='automatic'").run();
      connection.prepare("DELETE FROM backups WHERE file_path=?").run(record.filePath);
      connection.prepare("INSERT INTO backups(id,backup_type,file_path,file_hash,file_size,receipt_count,highest_receipt_number,status,created_at,verified_at) VALUES(?,?,?,?,?,?,?,?,?,?)").run(record.id,record.backupType,record.filePath,record.fileHash,record.fileSize,record.receiptCount,record.highestReceiptNumber,record.status,record.createdAt,record.verifiedAt);
    });
    // When Google Drive is configured, only the rolling automatic backup is
    // mirrored automatically. It always overwrites one fixed cloud file.
    if(type==="automatic"){
      const drive=this.requireSettings().get()?.googleDriveFolder;
      if(drive&&fs.existsSync(drive)){
        const target=path.join(drive,"MK-Receipt-Pro-Google-Drive-Latest.mkrbackup");
        fs.copyFileSync(record.filePath,target);
      }
    }
    return record;
  }
  createGoogleDriveBackup():BackupRecord {
    const drive=this.requireSettings().get()?.googleDriveFolder;
    if(!drive||!fs.existsSync(drive))throw new Error("BACKUP_DESTINATION_UNAVAILABLE");
    return this.createBackup(path.join(drive,"MK-Receipt-Pro-Google-Drive-Latest.mkrbackup"),"manual");
  }
  inspectBackup(filePath:string):BackupInspection { return this.requireBackup().inspect(filePath); }
  restoreBackup(filePath:string):RestoreResult {
    if(!this.userDataPath||!this.documentsPath)throw new Error("Database service is not initialized");
    const inspection=this.requireBackup().inspect(filePath); if(!inspection.valid)throw new Error("INVALID_BACKUP_FILE");
    const current=this.getReceiptCoreStatus(); if(current.receiptCount>0&&inspection.highestReceiptNumber<current.lastIssuedNumber)throw new Error("RESTORE_SEQUENCE_ROLLBACK_BLOCKED");
    const settings=this.requireSettings().get(); const folder=settings?.backupFolder||path.join(this.documentsPath,"MK Receipt Pro","Backups");
    const prePath=path.join(folder,`MK-Receipt-Pro-PreRestore-${new Date().toISOString().replace(/[:.]/g,"-")}.mkrbackup`); this.createBackup(prePath,"pre_restore");
    const temp=path.join(this.userDataPath,"restore-work"); this.requireBackup().extract(filePath,temp);
    this.close();
    const sourceDb=path.join(temp,"database","mk-receipt.sqlite"); const targetDb=path.join(this.userDataPath,"database","mk-receipt.sqlite"); fs.mkdirSync(path.dirname(targetDb),{recursive:true}); fs.copyFileSync(sourceDb,targetDb);
    const sourceReceipts=path.join(temp,"receipts"); const targetReceipts=path.join(this.documentsPath,"מפתחות להצלחה","קבלות"); if(fs.existsSync(sourceReceipts)){fs.rmSync(targetReceipts,{recursive:true,force:true});fs.cpSync(sourceReceipts,targetReceipts,{recursive:true});}
    const sourceExpenses=path.join(temp,"expenses"); const targetExpenses=path.join(this.userDataPath,"expenses"); if(fs.existsSync(sourceExpenses)){fs.rmSync(targetExpenses,{recursive:true,force:true});fs.cpSync(sourceExpenses,targetExpenses,{recursive:true});}
    const sourceBranding=path.join(temp,"branding"); const targetBranding=path.join(this.userDataPath,"branding"); if(fs.existsSync(sourceBranding)){fs.rmSync(targetBranding,{recursive:true,force:true});fs.cpSync(sourceBranding,targetBranding,{recursive:true});}
    fs.rmSync(temp,{recursive:true,force:true}); this.initialize(this.userDataPath,this.documentsPath,this.resourcesPath??undefined);
    const health=this.getHealth(); if(health.status!=="healthy")throw new Error("RESTORE_POSTCHECK_FAILED");
    return {restored:true,receiptCount:inspection.receiptCount,highestReceiptNumber:inspection.highestReceiptNumber,preRestoreBackupPath:prePath};
  }
  private tryAutomaticBackup():void{
    try{
      const folder=this.requireSettings().get()?.backupFolder;
      if(folder){const file=path.join(folder,"MK-Receipt-Pro-Auto-Latest.mkrbackup");this.createBackup(file,"automatic");}
    }catch(error){console.warn("Automatic backup failed",error);}
    try{this.automaticCloudSyncHook?.()}catch(error){console.warn("Cloud sync scheduling failed",error);}
  }
  private mapBackup(row:any):BackupRecord{return{id:row.id,backupType:row.backup_type,filePath:row.file_path,fileHash:row.file_hash,fileSize:row.file_size,receiptCount:row.receipt_count,highestReceiptNumber:row.highest_receipt_number,status:row.status,createdAt:row.created_at,verifiedAt:row.verified_at};}

  async issueReceipt(input: IssueReceiptInput, cloudReceiptNumber?:number): Promise<IssueReceiptResult> {
    if(!this.issueReceiptService || !this.pdfService) throw new Error("Database service is not initialized");
    const issued=this.issueReceiptService.execute(input,cloudReceiptNumber);
    try { const model=this.requireReceipts().getPdfModel(issued.receipt.id); const pdf=await this.pdfService.createOriginal(model); this.requireReceipts().attachOriginalPdf(issued.receipt.id,pdf); const latest=this.requireReceipts().latest(); if(!latest) throw new Error("RECEIPT_NOT_FOUND"); this.tryAutomaticBackup(); return { receipt:latest,nextReceiptNumber:issued.nextReceiptNumber,pdfCreated:true,pdfPath:pdf.path }; }
    catch(error){ return { receipt:issued.receipt,nextReceiptNumber:issued.nextReceiptNumber,pdfCreated:false,pdfPath:null,warningCode:error instanceof Error?error.message:"PDF_WRITE_FAILED" }; }
  }
  close(): void { this.connection?.close(); this.connection=null; this.settingsRepository=null; this.receiptRepository=null; this.issueReceiptService=null; this.pdfService=null; this.settingsService=null; this.reportService=null; this.backupService=null; this.healthService=null; this.diagnosticService=null; this.qaService=null; }
  private requireConnection(){ if(!this.connection) throw new Error("Database service is not initialized"); return this.connection; }
  private requireSettings(){ if(!this.settingsRepository) throw new Error("Database service is not initialized"); return this.settingsRepository; }
  private requireReceipts(){ if(!this.receiptRepository) throw new Error("Database service is not initialized"); return this.receiptRepository; }
  private requireSettingsService(){ if(!this.settingsService) throw new Error("Database service is not initialized"); return this.settingsService; }
  private requireReports(){ if(!this.reportService) throw new Error("Database service is not initialized"); return this.reportService; }
  private requireBackup(){ if(!this.backupService) throw new Error("Database service is not initialized"); return this.backupService; }
  private requireHealth(): HealthService { if(!this.healthService) throw new Error("Database service is not initialized"); return this.healthService; }
  private requireDiagnostic(): DiagnosticService { if(!this.diagnosticService) throw new Error("Database service is not initialized"); return this.diagnosticService; }
  private requireQa(): QaService { if(!this.qaService) throw new Error("Database service is not initialized"); return this.qaService; }

}
