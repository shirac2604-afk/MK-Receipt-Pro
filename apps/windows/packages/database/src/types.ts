export interface Migration {
  version: number;
  name: string;
  checksum: string;
  up(sql: (statement: string) => void): void;
  verify(tableExists: (tableName: string) => boolean): void;
}

export interface DatabaseHealthReport {
  status: "healthy" | "warning" | "critical";
  databasePath: string;
  schemaVersion: number;
  sqliteIntegrity: string;
  foreignKeysEnabled: boolean;
  journalMode: string;
  tableCount: number;
  appliedMigrations: number;
  checkedAt: string;
}

export interface BusinessSettingsRecord {
  id: string;
  businessName: string;
  ownerName: string;
  businessNumber: string;
  taxStatus: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  slogan: string | null;
  setupCompleted: boolean;
  logoPath: string | null;
  signaturePath: string | null;
  brandColor: string;
  backupFolder: string | null;
  googleDriveFolder: string | null;
  pinConfigured: boolean;
  autoLockMinutes: 0 | 5 | 10 | 15 | 30;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = "cash" | "bank_transfer" | "bit" | "paybox";

export interface CustomerRecord {
  id: string;
  displayName: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerProfile {
  customer: CustomerRecord;
  receipts: ReceiptRecord[];
  activeReceiptCount: number;
  cancelledReceiptCount: number;
  activeAmountAgorot: number;
  lastReceiptDate: string | null;
}

export interface CustomerCreateInput {
  displayName: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface CustomerUpdateInput extends CustomerCreateInput {
  id: string;
}

export interface CustomerDuplicateQuery {
  phone?: string;
  email?: string;
  excludeId?: string;
}

export interface CustomerDuplicateMatch {
  customer: CustomerRecord;
  matchedBy: Array<"phone" | "email">;
}


export interface IssueReceiptInput {
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  description: string;
  amountAgorot: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  customerId?: string;
}

export interface ReceiptRecord {
  id: string;
  receiptNumber: number;
  paymentDate: string;
  issuedAt: string;
  clientName: string;
  description: string;
  amountAgorot: number;
  paymentMethod: PaymentMethod;
  status: "active" | "cancelled";
  contentHash: string;
  originalPdfPath: string | null;
  originalPdfHash: string | null;
  cancellationPdfPath?: string | null;
  cancellationPdfHash?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  referenceNumber?: string | null;
}


export interface IssueReceiptCoreResult {
  receipt: ReceiptRecord;
  nextReceiptNumber: number;
}

export interface IssueReceiptResult extends IssueReceiptCoreResult {
  pdfCreated: boolean;
  pdfPath: string | null;
  warningCode?: string;
}

export interface ReceiptCoreStatus {
  receiptCount: number;
  nextReceiptNumber: number;
  lastIssuedNumber: number;
  latestReceipt: ReceiptRecord | null;
}

export interface BusinessSettingsInput {
  businessName: string;
  ownerName: string;
  businessNumber: string;
  taxStatus: "עוסק פטור" | "עוסק מורשה";
  phone?: string;
  email?: string;
  address?: string;
  slogan?: string;
  logoPath?: string;
  signaturePath?: string;
  brandColor?: string;
  backupFolder?: string;
  googleDriveFolder?: string;
  firstReceiptNumber: number;
  pin?: string;
  autoLockMinutes: 0 | 5 | 10 | 15 | 30;
}

export interface OnboardingStatus {
  setupCompleted: boolean;
  businessName: string;
  nextReceiptNumber: number;
  logoConfigured: boolean;
  signatureConfigured: boolean;
  backupConfigured: boolean;
  pinConfigured: boolean;
}

export interface ReceiptSearchFilters {
  query?: string;
  fromDate?: string;
  toDate?: string;
  status?: "active" | "cancelled" | "all";
  paymentMethod?: PaymentMethod | "all";
  minAmountAgorot?: number;
  maxAmountAgorot?: number;
  sort?: "newest" | "oldest" | "amount_desc" | "amount_asc" | "number_desc" | "number_asc";
}

export interface ReceiptSearchResult {
  items: ReceiptRecord[];
  totalItems: number;
  activeAmountAgorot: number;
}

export interface CancelReceiptInput { receiptId: string; reason: string; }
export interface CancelReceiptResult { receipt: ReceiptRecord; cancellationPdfCreated: boolean; cancellationPdfPath: string | null; warningCode?: string; }

export interface ReportFilters { fromDate?: string; toDate?: string; }
export interface MonthlyReportRow { month:string; incomeAgorot:number; activeReceiptCount:number; cancelledReceiptCount:number; }
export interface DateRangeReport { fromDate:string|null; toDate:string|null; incomeAgorot:number; activeReceiptCount:number; cancelledReceiptCount:number; averageReceiptAgorot:number; months:MonthlyReportRow[]; }
export interface AnnualReport extends DateRangeReport { year:number; months:MonthlyReportRow[]; }
export interface ReportReceiptRow { receiptNumber:number; paymentDate:string; clientName:string; description:string; amountAgorot:number; paymentMethod:PaymentMethod; referenceNumber:string|null; status:"active"|"cancelled"; originalPdfPath:string|null; cancellationPdfPath:string|null; }
export interface ReportExpenseRow { id:string; expenseDate:string; supplierName:string; category:string; amountAgorot:number; paymentMethod:string|null; notes:string|null; attachmentPath:string|null; attachmentOriginalName:string|null; }

export type BackupStatus = "created" | "verified" | "failed";
export interface BackupRecord { id:string; backupType:"automatic"|"manual"|"recovery"|"pre_restore"|"migration"|"transfer"; filePath:string; fileHash:string; fileSize:number; receiptCount:number; highestReceiptNumber:number; status:BackupStatus; createdAt:string; verifiedAt:string|null; }
export interface BackupInspection { valid:boolean; filePath:string; formatVersion:number|null; appVersion:string|null; schemaVersion:number|null; createdAt:string|null; backupType:BackupRecord["backupType"]|null; receiptCount:number; highestReceiptNumber:number; businessName:string|null; fileSize:number; errorCode:string|null; }
export interface BackupOverview { backupFolder:string|null; googleDriveFolder:string|null; latestBackup:BackupRecord|null; backupCount:number; }
export interface CloudSyncStatus { connected:boolean; state:"disconnected"|"idle"|"syncing"|"conflict"|"error"; clientIdConfigured:boolean; accountEmail:string|null; remoteFileId:string|null; remoteModifiedTime:string|null; lastSyncAt:string|null; message:string|null; deviceId:string; }
export interface CloudSyncConnectInput { email:string; }
export interface RestoreResult { restored:boolean; receiptCount:number; highestReceiptNumber:number; preRestoreBackupPath:string; }

export interface HealthCheckItem { key:string; label:string; status:"healthy"|"warning"|"critical"; message:string; }
export interface FullHealthReport { overallStatus:"healthy"|"warning"|"critical"; score:number; checkedAt:string; checks:HealthCheckItem[]; }
export interface ErrorLogRecord { id:string; errorCode:string|null; severity:"info"|"warning"|"error"|"critical"; module:string; userMessage:string|null; technicalMessage:string|null; resolved:boolean; createdAt:string; }
export interface SecurityStatus { pinConfigured:boolean; autoLockMinutes:number; }

export interface DiagnosticPreview { included:string[]; excluded:string[]; recentErrorCount:number; estimatedSizeBytes:number; }
export interface DiagnosticPackageResult { filePath:string; fileName:string; fileSize:number; sha256:string; createdAt:string; }


export type QaTestStatus = "passed" | "failed" | "pending" | "blocked";
export type QaSeverity = "critical" | "high" | "medium" | "low";
export interface QaTestItem { id:string; category:string; title:string; mode:"automatic"|"manual"; severity:QaSeverity; status:QaTestStatus; message:string; durationMs?:number; }
export interface QaKnownIssue { id:string; severity:QaSeverity; title:string; description:string; }
export interface QaReport {
  version:string; buildNumber:string; generatedAt:string; totalTests:number; automaticTests:number; manualTests:number; passed:number; failed:number; pending:number; blocked:number; score:number; releaseStatus:"ready"|"blocked"|"manual_review"; tests:QaTestItem[]; knownIssues:QaKnownIssue[];
}
export interface QaExportResult { filePath:string; fileName:string; fileSize:number; sha256:string; }


export type ExpenseCategory = "ציוד" | "פרסום" | "משרד" | "נסיעות" | "תוכנה" | "הכשרה" | "אחר";
export interface ExpenseInput { expenseDate:string; supplierName:string; amountAgorot:number; category:ExpenseCategory|string; paymentMethod?:string; notes?:string; attachmentSourcePath?:string; }
export interface ExpenseUpdateInput extends ExpenseInput { id:string; removeAttachment?:boolean; }
export interface ExpenseSearchFilters { fromDate?:string; toDate?:string; category?:string; query?:string; }
export interface ExpenseRecord { id:string; expenseDate:string; supplierName:string; amountAgorot:number; category:string; paymentMethod:string|null; notes:string|null; attachmentPath:string|null; attachmentOriginalName:string|null; createdAt:string; updatedAt:string; }
export interface ExpenseSummary { totalAgorot:number; count:number; items:ExpenseRecord[]; }

export interface ReceiptTemplateInput { name:string; customerId?:string; description:string; amountAgorot:number; paymentMethod:PaymentMethod; }
export interface ReceiptTemplateRecord { id:string; name:string; customerId:string|null; description:string; amountAgorot:number; paymentMethod:PaymentMethod; createdAt:string; updatedAt:string; }

export interface OpenFormatExportInput { fromDate:string; toDate:string; targetRoot:string; }
export interface OpenFormatRecordCounts { "100A":number; "100C":number; "120D":number; "900Z":number; total:number; }
export interface SimulatorSubmissionPackageResult { packageFolder:string; zipPath:string; manifestPath:string; instructionsPath:string; fileSize:number; sha256:string; includedFiles:string[]; }


export interface SimulatorOfficialResultInput { status:"passed"|"failed"; totalRecords:number; counts:{"100A":number;"100C":number;"D110":number;"120D":number;"100B":number;"110B":number;"M100":number;"900Z":number}; notes?:string; }
export interface SimulatorOfficialResultImport { reportPath:string; storedReportPath:string; resultPath:string; status:"passed"|"failed"; matchesExport:boolean; discrepancies:string[]; sha256:string; importedAt:string; }

export interface OpenFormatExportResult {
  exportId:string; folderPath:string; iniPath:string; dataArchivePath:string; report26Path:string; report54Path:string; report26PdfPath?:string; report54PdfPath?:string;
  fromDate:string; toDate:string; documentCount:number; totalAmountAgorot:number; counts:OpenFormatRecordCounts;
  validation:{valid:boolean; errors:string[]; warnings:string[]}; createdAt:string;
}

export interface TaxRegistrationDossierInput { manufacturerName:string; manufacturerBusinessNumber:string; contactName:string; contactEmail:string; }
export interface TaxRegistrationDossierResult { dossierFolder:string; zipPath:string; manifestPath:string; declarationPath:string; checklistPath:string; fileSize:number; sha256:string; includedFiles:string[]; ready:boolean; missingItems:string[]; }

export interface SupabaseCloudDevice { id:string; platform:"windows"|"android"; displayName:string|null; lastSeenAt:string; createdAt:string; }

export interface SupabaseCloudStatus { connected:boolean; email:string|null; userId:string|null; businessId:string|null; businessName:string|null; deviceId:string|null; receipts:number; customers:number; expenses:number; message:string|null; }
export interface SupabaseCloudConnectInput { email:string; password:string; }
