import fs from "node:fs";
import path from "node:path";

export interface OpenFormatPathAudit {
  valid: boolean;
  targetRoot: string;
  openFormatRoot: string;
  businessFolderName: string;
  productionFolderName: string;
  finalFolderPath: string;
  productionDateTime: string;
  collisionMinutesAdvanced: number;
  checks: Array<{ code: string; passed: boolean; message: string }>;
}

function two(value: number): string {
  return String(value).padStart(2, "0");
}

function businessDigits(value: string): string {
  return value.replace(/\D/g, "").padStart(9, "0").slice(-9);
}

export function buildBusinessFolderName(businessNumber: string, productionDate: Date): string {
  const digits = businessDigits(businessNumber);
  return `${digits.slice(0, 8)}.${String(productionDate.getFullYear()).slice(-2)}`;
}

export function buildProductionFolderName(productionDate: Date): string {
  return `${two(productionDate.getMonth() + 1)}${two(productionDate.getDate())}${two(productionDate.getHours())}${two(productionDate.getMinutes())}`;
}

export function allocateOpenFormatFolder(input: {
  targetRoot: string;
  businessNumber: string;
  productionDate?: Date;
}): { folderPath: string; effectiveProductionDate: Date; audit: OpenFormatPathAudit } {
  const originalDate = new Date(input.productionDate ?? new Date());
  originalDate.setSeconds(0, 0);
  const businessFolderName = buildBusinessFolderName(input.businessNumber, originalDate);
  const openFormatRoot = path.join(input.targetRoot, "OPENFRMT");
  const businessRoot = path.join(openFormatRoot, businessFolderName);

  let effectiveDate = new Date(originalDate);
  let collisionMinutesAdvanced = 0;
  let productionFolderName = buildProductionFolderName(effectiveDate);
  let folderPath = path.join(businessRoot, productionFolderName);

  // The official specification requires a second export in the same minute to
  // use the following minute value, rather than a suffix such as "-1".
  while (fs.existsSync(folderPath)) {
    collisionMinutesAdvanced += 1;
    effectiveDate = new Date(originalDate.getTime() + collisionMinutesAdvanced * 60_000);
    productionFolderName = buildProductionFolderName(effectiveDate);
    folderPath = path.join(businessRoot, productionFolderName);
  }

  fs.mkdirSync(folderPath, { recursive: true });

  const expectedBusinessPattern = /^\d{8}\.\d{2}$/;
  const expectedProductionPattern = /^\d{8}$/;
  const checks = [
    { code: "ROOT_FOLDER_NAME", passed: path.basename(openFormatRoot) === "OPENFRMT", message: "ספריית השורש נקראת OPENFRMT." },
    { code: "BUSINESS_FOLDER_PATTERN", passed: expectedBusinessPattern.test(businessFolderName), message: "שם ספריית העסק הוא 8 ספרות, נקודה ושתי ספרות שנת הפקה." },
    { code: "BUSINESS_NUMBER_WITHOUT_CHECK_DIGIT", passed: businessFolderName.slice(0, 8) === businessDigits(input.businessNumber).slice(0, 8), message: "שמונה הספרות הראשונות נלקחו ממספר העוסק ללא ספרת הביקורת." },
    { code: "PRODUCTION_FOLDER_PATTERN", passed: expectedProductionPattern.test(productionFolderName), message: "שם ספריית ההפקה הוא MMDDhhmm ללא תוספות." },
    { code: "NO_SUFFIX_COLLISION_FORMAT", passed: !productionFolderName.includes("-"), message: "בהפקה כפולה לא נעשה שימוש בסיומת -1 או דומה." },
    { code: "FOLDER_CREATED", passed: fs.existsSync(folderPath), message: "תיקיית ההפקה נוצרה בפועל." }
  ];

  const audit: OpenFormatPathAudit = {
    valid: checks.every((item) => item.passed),
    targetRoot: input.targetRoot,
    openFormatRoot,
    businessFolderName,
    productionFolderName,
    finalFolderPath: folderPath,
    productionDateTime: effectiveDate.toISOString(),
    collisionMinutesAdvanced,
    checks
  };

  return { folderPath, effectiveProductionDate: effectiveDate, audit };
}

export function auditExistingOpenFormatFolder(input: {
  folderPath: string;
  targetRoot: string;
  businessNumber: string;
}): OpenFormatPathAudit {
  const relative = path.relative(input.targetRoot, input.folderPath).split(path.sep);
  const openIndex = relative.indexOf("OPENFRMT");
  const businessFolderName = openIndex >= 0 ? relative[openIndex + 1] ?? "" : "";
  const productionFolderName = openIndex >= 0 ? relative[openIndex + 2] ?? "" : "";
  const expectedBusinessPrefix = businessDigits(input.businessNumber).slice(0, 8);
  const checks = [
    { code: "PATH_INSIDE_TARGET", passed: !path.relative(input.targetRoot, input.folderPath).startsWith(".."), message: "הנתיב נמצא בתוך יעד השמירה שנבחר." },
    { code: "ROOT_FOLDER_NAME", passed: openIndex >= 0, message: "הנתיב כולל ספרייה בשם OPENFRMT." },
    { code: "BUSINESS_FOLDER_PATTERN", passed: /^\d{8}\.\d{2}$/.test(businessFolderName), message: "שם ספריית העסק תקין." },
    { code: "BUSINESS_NUMBER_PREFIX", passed: businessFolderName.slice(0, 8) === expectedBusinessPrefix, message: "ספריית העסק תואמת למספר העוסק ללא ספרת ביקורת." },
    { code: "PRODUCTION_FOLDER_PATTERN", passed: /^\d{8}$/.test(productionFolderName), message: "שם ספריית ההפקה במבנה MMDDhhmm." },
    { code: "NO_EXTRA_PATH_LEVEL", passed: relative.length === openIndex + 3, message: "אין רמת ספרייה נוספת מתחת לספריית ההפקה." },
    { code: "REQUIRED_FILES", passed: ["INI.TXT", "BKMVDATA.TXT"].every((name) => fs.existsSync(path.join(input.folderPath, name))), message: "קובצי ההפקה העיקריים נמצאים בתיקייה." }
  ];
  return {
    valid: checks.every((item) => item.passed),
    targetRoot: input.targetRoot,
    openFormatRoot: path.join(input.targetRoot, "OPENFRMT"),
    businessFolderName,
    productionFolderName,
    finalFolderPath: input.folderPath,
    productionDateTime: "",
    collisionMinutesAdvanced: 0,
    checks
  };
}
