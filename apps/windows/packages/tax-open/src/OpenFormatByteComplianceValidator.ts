export interface ByteAuditIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  file: "INI.TXT" | "BKMVDATA.TXT";
  recordNumber?: number;
  recordCode?: string;
}

export interface OpenFormatByteAuditResult {
  valid: boolean;
  issues: ByteAuditIssue[];
  files: {
    ini: ByteFileAudit;
    data: ByteFileAudit;
  };
}

export interface ByteFileAudit {
  fileName: string;
  byteLength: number;
  recordCount: number;
  hasUtf8Bom: boolean;
  crlfOnly: boolean;
  endsWithCrlf: boolean;
  invalidByteCount: number;
  hebrewByteCount: number;
  recordLengths: Record<string, number[]>;
}

const RECORD_LENGTHS: Record<string, number> = {
  "A000": 466,
  "C100": 444,
  "D120": 222,
  "A100": 95,
  "Z900": 110,
};

function splitCrlf(buffer: Buffer): Buffer[] {
  const records: Buffer[] = [];
  let start = 0;
  for (let i = 0; i < buffer.length - 1; i += 1) {
    if (buffer[i] === 0x0d && buffer[i + 1] === 0x0a) {
      records.push(buffer.subarray(start, i));
      start = i + 2;
      i += 1;
    }
  }
  if (start < buffer.length) records.push(buffer.subarray(start));
  return records;
}

function ascii(buffer: Buffer, start: number, end: number): string {
  return buffer.subarray(start, end).toString("latin1");
}

function allDigits(buffer: Buffer, start: number, end: number): boolean {
  return buffer.subarray(start, end).every((byte) => byte >= 0x30 && byte <= 0x39);
}

function allSpaces(buffer: Buffer, start: number, end: number): boolean {
  return buffer.subarray(start, end).every((byte) => byte === 0x20);
}

function auditFile(fileName: "INI.TXT" | "BKMVDATA.TXT", buffer: Buffer, issues: ByteAuditIssue[]): ByteFileAudit {
  const hasUtf8Bom = buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf;
  if (hasUtf8Bom) issues.push({ severity: "error", code: "UTF8_BOM", message: "הקובץ מכיל BOM של UTF-8.", file: fileName });

  let crlfOnly = true;
  for (let i = 0; i < buffer.length; i += 1) {
    if (buffer[i] === 0x0a && (i === 0 || buffer[i - 1] !== 0x0d)) crlfOnly = false;
    if (buffer[i] === 0x0d && (i + 1 >= buffer.length || buffer[i + 1] !== 0x0a)) crlfOnly = false;
  }
  if (!crlfOnly) issues.push({ severity: "error", code: "LINE_ENDINGS", message: "נמצאו סיומי שורה שאינם CRLF.", file: fileName });

  const endsWithCrlf = buffer.length >= 2 && buffer[buffer.length - 2] === 0x0d && buffer[buffer.length - 1] === 0x0a;
  if (!endsWithCrlf) issues.push({ severity: "error", code: "MISSING_FINAL_CRLF", message: "הקובץ אינו מסתיים ב-CRLF.", file: fileName });

  let invalidByteCount = 0;
  let hebrewByteCount = 0;
  for (const byte of buffer) {
    if (byte >= 0xe0 && byte <= 0xfa) hebrewByteCount += 1;
    const allowed = byte <= 0x7f || (byte >= 0xe0 && byte <= 0xfa);
    if (!allowed) invalidByteCount += 1;
  }
  if (invalidByteCount > 0) issues.push({ severity: "error", code: "INVALID_CHARSET_BYTES", message: `נמצאו ${invalidByteCount} בתים שאינם ASCII או עברית ISO-8859-8.`, file: fileName });

  const records = splitCrlf(buffer).filter((record, index, all) => !(index === all.length - 1 && record.length === 0));
  const recordLengths: Record<string, number[]> = {};
  records.forEach((record, index) => {
    const code = ascii(record, 0, 4);
    recordLengths[code] ??= [];
    recordLengths[code].push(record.length);
    const expected = fileName === "INI.TXT" && index > 0 ? 19 : RECORD_LENGTHS[code];
    if (expected !== undefined && record.length !== expected) {
      issues.push({ severity: "error", code: "RECORD_BYTE_LENGTH", message: `אורך הרשומה הוא ${record.length} בתים במקום ${expected}.`, file: fileName, recordNumber: index + 1, recordCode: code });
    }
    if (expected === undefined) {
      issues.push({ severity: "error", code: "UNKNOWN_RECORD_CODE", message: `קוד רשומה לא מוכר: ${code}.`, file: fileName, recordNumber: index + 1, recordCode: code });
    }
  });

  return { fileName, byteLength: buffer.length, recordCount: records.length, hasUtf8Bom, crlfOnly, endsWithCrlf, invalidByteCount, hebrewByteCount, recordLengths };
}

function auditPaddingAndNumericFields(ini: Buffer, data: Buffer, issues: ByteAuditIssue[]): void {
  const iniRecords = splitCrlf(ini).filter((r) => r.length > 0);
  const dataRecords = splitCrlf(data).filter((r) => r.length > 0);

  const a000 = iniRecords[0];
  if (a000) {
    const numericRanges: Array<[number, number, string]> = [
      [9, 24, "A000_TOTAL"], [24, 33, "A000_BUSINESS"], [33, 48, "A000_EXPORT_ID"], [56, 64, "A000_REGISTRATION"],
      [104, 113, "A000_MANUFACTURER"], [133, 134, "A000_SOFTWARE_TYPE"], [184, 186, "A000_BOOKKEEPING"],
      [186, 195, "A000_COMPANY"], [195, 204, "A000_WITHHOLDING"], [362, 366, "A000_TAX_YEAR"],
      [366, 374, "A000_FROM_DATE"], [374, 382, "A000_TO_DATE"], [382, 390, "A000_PROCESS_DATE"], [390, 396, "A000_PROCESS_META"], [419, 420, "A000_BRANCH"],
    ];
    for (const [start, end, code] of numericRanges) {
      if (!allDigits(a000, start, end)) issues.push({ severity: "error", code, message: `שדה נומרי ב-A000 אינו מכיל ספרות בלבד (עמדות ${start + 1}-${end}).`, file: "INI.TXT", recordNumber: 1, recordCode: "A000" });
    }
    if (!allSpaces(a000, 4, 9)) issues.push({ severity: "error", code: "A000_FUTURE_PADDING", message: "שדה עתידי A000 אינו מרופד ברווחים.", file: "INI.TXT", recordNumber: 1, recordCode: "A000" });
    if (!allSpaces(a000, 204, 214)) issues.push({ severity: "error", code: "A000_FUTURE_PADDING_2", message: "שדה עתידי A000 בעמדות 205-214 אינו מרופד ברווחים.", file: "INI.TXT", recordNumber: 1, recordCode: "A000" });
  }

  dataRecords.forEach((record, index) => {
    const code = ascii(record, 0, 4);
    if (!allDigits(record, 4, 13)) issues.push({ severity: "error", code: "RECORD_SEQUENCE_NUMERIC", message: "מספר הרשומה אינו נומרי.", file: "BKMVDATA.TXT", recordNumber: index + 1, recordCode: code });
    if (!allDigits(record, 13, 22)) issues.push({ severity: "error", code: "BUSINESS_NUMBER_NUMERIC", message: "מספר העוסק אינו נומרי.", file: "BKMVDATA.TXT", recordNumber: index + 1, recordCode: code });
    if (code === "A100" && !allSpaces(record, 45, 95)) issues.push({ severity: "error", code: "A100_FUTURE_PADDING", message: "שדה העתיד ב-A100 אינו מרופד ברווחים.", file: "BKMVDATA.TXT", recordNumber: index + 1, recordCode: code });
    if (code === "Z900" && !allSpaces(record, 60, 110)) issues.push({ severity: "error", code: "Z900_FUTURE_PADDING", message: "שדה העתיד ב-Z900 אינו מרופד ברווחים.", file: "BKMVDATA.TXT", recordNumber: index + 1, recordCode: code });
    if (code === "D120") {
      if (!allDigits(record, 45, 50)) issues.push({ severity: "error", code: "120D_LINE_AND_METHOD_NUMERIC", message: "מספר שורה או אמצעי תשלום ב-120D אינו נומרי.", file: "BKMVDATA.TXT", recordNumber: index + 1, recordCode: code });
      if (!allDigits(record, 50, 95)) issues.push({ severity: "error", code: "120D_CONDITIONAL_ZERO_PADDING", message: "שדות התשלום המותנים ב-120D אינם מרופדים באפסים.", file: "BKMVDATA.TXT", recordNumber: index + 1, recordCode: code });
      if (!allSpaces(record, 162, 222)) issues.push({ severity: "error", code: "120D_FUTURE_PADDING", message: "שדה העתיד ב-120D אינו מרופד ברווחים.", file: "BKMVDATA.TXT", recordNumber: index + 1, recordCode: code });
    }
  });
}

export function auditOpenFormatBytes(ini: Buffer, data: Buffer): OpenFormatByteAuditResult {
  const issues: ByteAuditIssue[] = [];
  const iniAudit = auditFile("INI.TXT", ini, issues);
  const dataAudit = auditFile("BKMVDATA.TXT", data, issues);
  auditPaddingAndNumericFields(ini, data, issues);
  if (iniAudit.hebrewByteCount === 0 && dataAudit.hebrewByteCount === 0) {
    issues.push({ severity: "warning", code: "NO_HEBREW_SAMPLE", message: "לא נמצאו תווי עברית בקובצי הבדיקה; לא ניתן לאמת דוגמת קידוד עברית.", file: "BKMVDATA.TXT" });
  }
  return { valid: !issues.some((issue) => issue.severity === "error"), issues, files: { ini: iniAudit, data: dataAudit } };
}
