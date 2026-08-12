export interface OpenFormatProducerIdentity {
  softwareRegistrationNumber: string;
  softwareName: string;
  softwareEdition: string;
  manufacturerBusinessNumber: string;
  manufacturerName: string;
}

export interface OpenFormatHeaderAuditIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
}

export interface OpenFormatHeaderAuditResult {
  structurallyValid: boolean;
  submissionReady: boolean;
  issues: OpenFormatHeaderAuditIssue[];
  parsed: {
    totalRecords: number;
    businessNumber: string;
    exportId: string;
    softwareRegistrationNumber: string;
    softwareName: string;
    softwareEdition: string;
    manufacturerBusinessNumber: string;
    manufacturerName: string;
    softwareType: string;
    outputPath: string;
    bookkeepingType: string;
    balanceLevel: string;
    fromDate: string;
    toDate: string;
    processDate: string;
    processTime: string;
    languageCode: string;
    charsetCode: string;
    compressionName: string;
    currency: string;
    branchIndicator: string;
  };
}

const isDigits = (value: string, length: number) => new RegExp(`^\\d{${length}}$`).test(value);
const trim = (value: string) => value.trim();

export function producerIdentityFromEnvironment(version: string): OpenFormatProducerIdentity {
  return {
    softwareRegistrationNumber: (process.env.MK_TAX_SOFTWARE_REGISTRATION_NUMBER ?? "00000000").replace(/\D/g, "").slice(-8).padStart(8, "0"),
    softwareName: process.env.MK_TAX_SOFTWARE_NAME ?? "Maptehot",
    softwareEdition: process.env.MK_TAX_SOFTWARE_EDITION ?? version,
    manufacturerBusinessNumber: (process.env.MK_TAX_MANUFACTURER_NUMBER ?? "000000000").replace(/\D/g, "").slice(-9).padStart(9, "0"),
    manufacturerName: process.env.MK_TAX_MANUFACTURER_NAME ?? "מפתחות להצלחה",
  };
}

export function auditOpenFormatHeaders(
  a000: string,
  a100: string,
  z900: string,
  expectedTotalRecords: number,
): OpenFormatHeaderAuditResult {
  const issues: OpenFormatHeaderAuditIssue[] = [];
  const error = (code: string, message: string) => issues.push({ severity: "error", code, message });
  const warning = (code: string, message: string) => issues.push({ severity: "warning", code, message });

  if (a000.length !== 466) error("A000_LENGTH", `אורך A000 הוא ${a000.length} במקום 466.`);
  if (a100.length !== 95) error("A100_LENGTH", `אורך A100 הוא ${a100.length} במקום 95.`);
  if (z900.length !== 110) error("Z900_LENGTH", `אורך Z900 הוא ${z900.length} במקום 110.`);
  if (a000.slice(0, 4) !== "A000") error("A000_CODE", "קוד הרשומה התחילית אינו A000.");
  if (a100.slice(0, 4) !== "A100") error("A100_CODE", "קוד רשומת הפתיחה אינו A100.");
  if (z900.slice(0, 4) !== "Z900") error("Z900_CODE", "קוד רשומת הסגירה אינו Z900.");

  const parsed = {
    totalRecords: Number(a000.slice(9, 24)),
    businessNumber: a000.slice(24, 33),
    exportId: a000.slice(33, 48),
    softwareRegistrationNumber: a000.slice(56, 64),
    softwareName: trim(a000.slice(64, 84)),
    softwareEdition: trim(a000.slice(84, 104)),
    manufacturerBusinessNumber: a000.slice(104, 113),
    manufacturerName: trim(a000.slice(113, 133)),
    softwareType: a000.slice(133, 134),
    outputPath: trim(a000.slice(134, 184)),
    bookkeepingType: a000.slice(184, 185),
    balanceLevel: a000.slice(185, 186),
    fromDate: a000.slice(366, 374),
    toDate: a000.slice(374, 382),
    processDate: a000.slice(382, 390),
    processTime: a000.slice(390, 394),
    languageCode: a000.slice(394, 395),
    charsetCode: a000.slice(395, 396),
    compressionName: trim(a000.slice(396, 416)),
    currency: a000.slice(416, 419),
    branchIndicator: a000.slice(419, 420),
  };

  const a100Business = a100.slice(13, 22);
  const a100ExportId = a100.slice(22, 37);
  const z900Business = z900.slice(13, 22);
  const z900ExportId = z900.slice(22, 37);
  const z900Total = Number(z900.slice(45, 60));

  if (parsed.totalRecords !== expectedTotalRecords) error("A000_TOTAL", `A000 מצהיר על ${parsed.totalRecords} רשומות במקום ${expectedTotalRecords}.`);
  if (z900Total !== expectedTotalRecords) error("900Z_TOTAL", `900Z מצהיר על ${z900Total} רשומות במקום ${expectedTotalRecords}.`);
  if (!isDigits(parsed.businessNumber, 9) || parsed.businessNumber === "000000000") error("BUSINESS_NUMBER", "מספר העוסק ב־A000 אינו מספר תקין בן 9 ספרות.");
  if (a100Business !== parsed.businessNumber || z900Business !== parsed.businessNumber) error("BUSINESS_NUMBER_MATCH", "מספר העוסק אינו זהה ב־A000, A100 ו־Z900.");
  if (!isDigits(parsed.exportId, 15) || parsed.exportId === "000000000000000") error("EXPORT_ID", "המזהה הראשי אינו מספר ייחודי תקין בן 15 ספרות.");
  if (a100ExportId !== parsed.exportId || z900ExportId !== parsed.exportId) error("EXPORT_ID_MATCH", "המזהה הראשי אינו זהה ב־A000, A100 ו־Z900.");
  if (a000.slice(48, 56) !== "&OF1.31&" || a100.slice(37, 45) !== "&OF1.31&" || z900.slice(37, 45) !== "&OF1.31&") error("FORMAT_CONSTANT", "קבוע המבנה &OF1.31& אינו זהה בשלוש הרשומות.");
  if (parsed.softwareType !== "2") error("SOFTWARE_TYPE", "המערכת הרב־שנתית חייבת להיות מסומנת בסוג תוכנה 2.");
  if (!["0", "1", "2"].includes(parsed.bookkeepingType)) error("BOOKKEEPING_TYPE", "סוג הנהלת החשבונות חייב להיות 0, 1 או 2.");
  if (parsed.bookkeepingType === "2" && !["1", "2"].includes(parsed.balanceLevel)) error("BALANCE_LEVEL", "בהנהלת חשבונות כפולה יש לציין איזון ברמת תנועה (1) או מנה (2).");
  if (!isDigits(parsed.fromDate, 8) || !isDigits(parsed.toDate, 8) || parsed.fromDate > parsed.toDate) error("DATE_RANGE", "טווח התאריכים ב־A000 אינו תקין.");
  if (!isDigits(parsed.processDate, 8) || !isDigits(parsed.processTime, 4)) error("PROCESS_TIME", "תאריך או שעת תחילת ההפקה אינם תקינים.");
  if (parsed.languageCode !== "0") error("LANGUAGE", "קוד השפה צריך להיות 0 עבור עברית.");
  if (parsed.charsetCode !== "1") error("CHARSET", "קוד סט התווים צריך להיות 1 עבור ISO-8859-8 ב־Windows.");
  if (!parsed.compressionName) error("COMPRESSION", "שם תוכנת/שיטת הכיווץ חסר.");
  if (parsed.currency !== "ILS") error("CURRENCY", "המטבע המוביל צריך להיות ILS.");
  if (!["0", "1"].includes(parsed.branchIndicator)) error("BRANCH_INDICATOR", "סימון סניפים חייב להיות 0 או 1.");
  if (!parsed.outputPath) error("OUTPUT_PATH", "נתיב שמירת הקבצים חסר ב־A000.");
  if (!parsed.softwareName) error("SOFTWARE_NAME", "שם התוכנה חסר.");
  if (!parsed.softwareEdition) error("SOFTWARE_EDITION", "מהדורת התוכנה חסרה.");
  if (!parsed.manufacturerName) error("MANUFACTURER_NAME", "שם יצרן התוכנה חסר.");

  if (parsed.softwareRegistrationNumber === "00000000") warning("TEMP_REGISTRATION_NUMBER", "מספר רישום התוכנה הוא ערך זמני. ניתן להשתמש בו רק להכנה ובדיקה, לא כתיק הגשה סופי ללא הנחיה מפורשת מרשות המסים.");
  if (parsed.manufacturerBusinessNumber === "000000000") warning("MISSING_MANUFACTURER_NUMBER", "מספר העוסק/תאגיד של יצרן התוכנה טרם הוגדר.");

  const structurallyValid = !issues.some((issue) => issue.severity === "error");
  const submissionReady = structurallyValid && !issues.some((issue) => issue.code === "TEMP_REGISTRATION_NUMBER" || issue.code === "MISSING_MANUFACTURER_NUMBER");
  return { structurallyValid, submissionReady, issues, parsed };
}
