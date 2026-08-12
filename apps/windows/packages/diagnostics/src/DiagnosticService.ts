import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import type { DatabaseHealthReport, ErrorLogRecord, FullHealthReport, SecurityStatus } from "../../database/src/types";
import { writeZip } from "./ZipArchive";

export interface DiagnosticPreview {
  included: string[];
  excluded: string[];
  recentErrorCount: number;
  estimatedSizeBytes: number;
}

export interface DiagnosticPackageResult {
  filePath: string;
  fileName: string;
  fileSize: number;
  sha256: string;
  createdAt: string;
}

interface DiagnosticContext {
  productName: string;
  version: string;
  buildNumber: string;
  channel: string;
  builtAt: string;
  databaseVersion: number;
  pdfTemplateVersion: number;
  appId: string;
  businessId: string;
}

interface DiagnosticDependencies {
  getDatabaseHealth(): DatabaseHealthReport;
  runHealthCheck(): FullHealthReport;
  getSecurityStatus(): SecurityStatus;
  listErrors(): ErrorLogRecord[];
}

const sha256 = (data: Buffer): string => createHash("sha256").update(data).digest("hex");
const json = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

function sanitizeErrors(errors: ErrorLogRecord[]): Array<Record<string, unknown>> {
  return errors.slice(0, 100).map((error) => ({
    errorCode: error.errorCode,
    severity: error.severity,
    module: error.module,
    resolved: error.resolved,
    createdAt: error.createdAt,
  }));
}

export class DiagnosticService {
  constructor(private readonly deps: DiagnosticDependencies) {}

  preview(): DiagnosticPreview {
    const errors = sanitizeErrors(this.deps.listErrors());
    return {
      included: [
        "גרסת התוכנה ופרטי Build",
        "גרסת Windows וארכיטקטורת המחשב",
        "תוצאות בדיקת תקינות",
        "מצב PIN ונעילה אוטומטית",
        "קודי תקלות טכניים אחרונים ללא תוכן אישי",
        "Checksum לאימות שלמות החבילה",
      ],
      excluded: [
        "שמות לקוחות ופרטי קשר",
        "סכומים, תיאורי שירות ואמצעי תשלום",
        "קבלות, קובצי PDF ומסד הנתונים",
        "PIN, סיסמאות, מפתחות הצפנה ו־Tokens",
        "מספר העוסק, כתובת העסק ופרטי מיתוג אישיים",
      ],
      recentErrorCount: errors.length,
      estimatedSizeBytes: Buffer.byteLength(json(errors), "utf8") + 16_384,
    };
  }

  create(targetFile: string, context: DiagnosticContext): DiagnosticPackageResult {
    const finalPath = targetFile.toLowerCase().endsWith(".zip") ? targetFile : `${targetFile}.zip`;
    fs.mkdirSync(path.dirname(finalPath), { recursive: true });
    if (fs.existsSync(finalPath)) throw new Error("DIAGNOSTIC_FILE_EXISTS");

    const createdAt = new Date().toISOString();
    const database = this.deps.getDatabaseHealth();
    const health = this.deps.runHealthCheck();
    const security = this.deps.getSecurityStatus();
    const errors = sanitizeErrors(this.deps.listErrors());

    const system = {
      platform: process.platform,
      release: os.release(),
      architecture: process.arch,
      cpuModel: os.cpus()[0]?.model ?? "unknown",
      cpuCount: os.cpus().length,
      totalMemoryBytes: os.totalmem(),
      freeMemoryBytes: os.freemem(),
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    const app = {
      productName: context.productName,
      version: context.version,
      buildNumber: context.buildNumber,
      channel: context.channel,
      builtAt: context.builtAt,
      databaseVersion: context.databaseVersion,
      pdfTemplateVersion: context.pdfTemplateVersion,
      appId: context.appId,
      businessId: context.businessId,
      createdAt,
    };
    const db = {
      status: database.status,
      schemaVersion: database.schemaVersion,
      sqliteIntegrity: database.sqliteIntegrity,
      foreignKeysEnabled: database.foreignKeysEnabled,
      journalMode: database.journalMode,
      tableCount: database.tableCount,
      appliedMigrations: database.appliedMigrations,
      checkedAt: database.checkedAt,
    };
    const privacy = {
      statement: "החבילה אינה כוללת נתוני לקוחות, קבלות, PDF, סכומים, PIN או מסד נתונים.",
      generatedLocally: true,
      uploadedAutomatically: false,
    };

    const files = [
      { name: "app.json", content: json(app) },
      { name: "system.json", content: json(system) },
      { name: "database-health.json", content: json(db) },
      { name: "full-health.json", content: json(health) },
      { name: "security.json", content: json(security) },
      { name: "errors.json", content: json(errors) },
      { name: "privacy.json", content: json(privacy) },
      { name: "README.txt", content: "MK Receipt Pro diagnostic package\r\nGenerated locally. No personal customer or receipt data is included.\r\n" },
    ];
    const manifest = files.map((file) => ({
      name: file.name,
      size: Buffer.byteLength(file.content, "utf8"),
      sha256: createHash("sha256").update(file.content, "utf8").digest("hex"),
    }));
    files.push({ name: "manifest.json", content: json({ format: "MK_RECEIPT_DIAGNOSTIC", formatVersion: 1, createdAt, files: manifest }) });

    const tmp = `${finalPath}.tmp`;
    try {
      writeZip(tmp, files);
      fs.renameSync(tmp, finalPath);
      const content = fs.readFileSync(finalPath);
      return { filePath: finalPath, fileName: path.basename(finalPath), fileSize: content.length, sha256: sha256(content), createdAt };
    } catch (error) {
      fs.rmSync(tmp, { force: true });
      throw error;
    }
  }
}
