import fs from "node:fs";
import path from "node:path";
import { validateReceiptOnlyRecordCounts } from "./OpenFormatRecordProfile";

export interface OpenFormatPreflightIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  recordNumber?: number;
}

export interface OpenFormatPreflightResult {
  valid: boolean;
  totalRecords: number;
  counts: Record<string, number>;
  issues: OpenFormatPreflightIssue[];
}

const RECORD_LENGTHS: Record<string, number> = {
  "A100": 95,
  "C100": 444,
  "D110": 339,
  "D120": 222,
  "B100": 317,
  "B110": 376,
  "M100": 298,
  "Z900": 110,
};

function decodeIso88598(buffer: Buffer): string {
  let output = "";
  for (const byte of buffer) {
    if (byte <= 0x7f) output += String.fromCharCode(byte);
    else if (byte >= 0xe0 && byte <= 0xfa) output += String.fromCharCode(0x05d0 + byte - 0xe0);
    else output += " ";
  }
  return output;
}

function numericSlice(line: string, from: number, length: number): string {
  return line.slice(from, from + length);
}

/**
 * Performs a strict local preflight before the official Tax Authority simulator.
 * It does not replace the simulator and does not imply official approval.
 */
export function validateOpenFormatFolder(folderPath: string): OpenFormatPreflightResult {
  const issues: OpenFormatPreflightIssue[] = [];
  const counts: Record<string, number> = {};
  const iniPath = path.join(folderPath, "INI.TXT");
  const dataPath = path.join(folderPath, "BKMVDATA.TXT");

  if (!fs.existsSync(iniPath)) {
    issues.push({ severity: "error", code: "INI_MISSING", message: "INI.TXT לא נמצא." });
  }
  if (!fs.existsSync(dataPath)) {
    issues.push({ severity: "error", code: "DATA_MISSING", message: "BKMVDATA.TXT לא נמצא לצורך בדיקת טרום־סימולטור." });
  }
  if (issues.some((issue) => issue.severity === "error")) {
    return { valid: false, totalRecords: 0, counts, issues };
  }

  const raw = fs.readFileSync(dataPath);
  const text = decodeIso88598(raw);
  if (!text.endsWith("\r\n")) {
    issues.push({ severity: "error", code: "DATA_CRLF_END", message: "הקובץ אינו מסתיים ב־CRLF." });
  }
  const lines = text.split("\r\n").filter((line) => line.length > 0);
  let expectedSequence = 1;
  let businessNumber: string | undefined;
  let exportId: string | undefined;

  for (const [index, line] of lines.entries()) {
    const recordNumber = index + 1;
    const code = line.slice(0, 4);
    counts[code] = (counts[code] ?? 0) + 1;
    const expectedLength = RECORD_LENGTHS[code];
    if (!expectedLength) {
      issues.push({ severity: "error", code: "UNKNOWN_RECORD", message: `סוג רשומה לא מוכר: ${code}`, recordNumber });
      continue;
    }
    if (line.length !== expectedLength) {
      issues.push({ severity: "error", code: "RECORD_LENGTH", message: `${code}: אורך ${line.length} במקום ${expectedLength}.`, recordNumber });
    }
    const sequence = Number(numericSlice(line, 4, 9));
    if (sequence !== expectedSequence) {
      issues.push({ severity: "error", code: "RECORD_SEQUENCE", message: `מספר רשומה ${sequence} במקום ${expectedSequence}.`, recordNumber });
    }
    expectedSequence += 1;
    const currentBusiness = numericSlice(line, 13, 9);
    if (!businessNumber) businessNumber = currentBusiness;
    else if (currentBusiness !== businessNumber) {
      issues.push({ severity: "error", code: "BUSINESS_NUMBER_MISMATCH", message: "מספר העוסק אינו אחיד בין הרשומות.", recordNumber });
    }
    if (code === "A100" || code === "Z900") {
      const currentExportId = numericSlice(line, 22, 15);
      if (!exportId) exportId = currentExportId;
      else if (currentExportId !== exportId) {
        issues.push({ severity: "error", code: "EXPORT_ID_MISMATCH", message: "המזהה הראשי אינו זהה ברשומות הפתיחה והסגירה.", recordNumber });
      }
    }
  }

  if (lines[0]?.slice(0, 4) !== "A100") {
    issues.push({ severity: "error", code: "OPENING_RECORD", message: "הרשומה הראשונה אינה A100." });
  }
  if (lines.at(-1)?.slice(0, 4) !== "Z900") {
    issues.push({ severity: "error", code: "CLOSING_RECORD", message: "הרשומה האחרונה אינה Z900." });
  }
  if ((counts["A100"] ?? 0) !== 1 || (counts["Z900"] ?? 0) !== 1) {
    issues.push({ severity: "error", code: "BOUNDARY_COUNT", message: "נדרשות רשומת פתיחה אחת ורשומת סגירה אחת." });
  }
  if ((counts["C100"] ?? 0) !== (counts["D120"] ?? 0)) {
    issues.push({ severity: "error", code: "RECEIPT_DETAIL_COUNT", message: "כמות C100 אינה תואמת לכמות D120 במדגם של קבלה בעלת אמצעי תשלום אחד." });
  }
  const logicalCounts = {
    "100A": counts["A100"] ?? 0,
    "100C": counts["C100"] ?? 0,
    "120D": counts["D120"] ?? 0,
    "100B": counts["B100"] ?? 0,
    "110B": counts["B110"] ?? 0,
    "M100": counts["M100"] ?? 0,
    "900Z": counts["Z900"] ?? 0,
  };
  for (const message of validateReceiptOnlyRecordCounts(logicalCounts)) {
    issues.push({ severity: "error", code: "RECEIPT_ONLY_PROFILE", message });
  }
  if (lines.length < 2000) {
    issues.push({ severity: "warning", code: "SIMULATOR_MIN_RECORDS", message: `נוצרו ${lines.length} רשומות בלבד; להגשת בדיקת הסימולטור נדרש מדגם מתאים לפי הנחיות השירות.` });
  }

  const closing = lines.at(-1);
  if (closing?.slice(0, 4) === "Z900") {
    const declaredTotal = Number(closing.slice(45, 60));
    if (declaredTotal !== lines.length) {
      issues.push({ severity: "error", code: "CLOSING_TOTAL", message: `רשומת Z900 מצהירה על ${declaredTotal} רשומות, בפועל ${lines.length}.` });
    }
  }

  const iniRaw = decodeIso88598(fs.readFileSync(iniPath));
  const iniLines = iniRaw.split("\r\n").filter(Boolean);
  if (iniLines[0]?.length !== 466 || iniLines[0]?.slice(0, 4) !== "A000") {
    issues.push({ severity: "error", code: "INI_A000", message: "רשומת A000 בקובץ INI.TXT אינה תקינה." });
  }
  const iniTotal = Number(iniLines[0]?.slice(9, 24) ?? 0);
  if (iniTotal !== lines.length) {
    issues.push({ severity: "error", code: "INI_TOTAL", message: `INI.TXT מצהיר על ${iniTotal} רשומות, בפועל ${lines.length}.` });
  }
  for (const summary of iniLines.slice(1)) {
    if (summary.length !== 19) {
      issues.push({ severity: "error", code: "INI_SUMMARY_LENGTH", message: "אורך רשומת סיכום ב־INI.TXT אינו 19." });
      continue;
    }
    const code = summary.slice(0, 4);
    const declared = Number(summary.slice(4, 19));
    if (declared !== (counts[code] ?? 0)) {
      issues.push({ severity: "error", code: "INI_SUMMARY_COUNT", message: `${code}: סיכום ${declared}, בפועל ${counts[code] ?? 0}.` });
    }
  }

  return {
    valid: !issues.some((issue) => issue.severity === "error"),
    totalRecords: lines.length,
    counts,
    issues,
  };
}
