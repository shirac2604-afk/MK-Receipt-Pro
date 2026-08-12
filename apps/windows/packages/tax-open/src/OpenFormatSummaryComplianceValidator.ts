export interface OpenFormatSummaryModel {
  recordCounts: Record<string, number>;
  totalRecords: number;
  documentCounts: Record<string, number>;
  documentAmountsAgorot: Record<string, number>;
}

export interface OpenFormatSummaryIssue {
  code: string;
  severity: "error" | "warning";
  message: string;
  expected?: number;
  actual?: number;
}

export interface OpenFormatSummaryAudit {
  valid: boolean;
  generatedAt: string;
  iniCounts: Record<string, number>;
  dataCounts: Record<string, number>;
  report26: {
    documentCounts: Record<string, number>;
    documentAmountsAgorot: Record<string, number>;
    totalDocuments: number;
    totalAmountAgorot: number;
  };
  report54: {
    recordCounts: Record<string, number>;
    totalRecords: number;
  };
  issues: OpenFormatSummaryIssue[];
}

function addMismatch(
  issues: OpenFormatSummaryIssue[],
  code: string,
  message: string,
  expected: number,
  actual: number
): void {
  if (expected !== actual) {
    issues.push({ code, severity: "error", message, expected, actual });
  }
}

export function auditOpenFormatSummaries(input: {
  iniCounts: Record<string, number>;
  dataCounts: Record<string, number>;
  totalRecords: number;
  report26DocumentCounts: Record<string, number>;
  report26DocumentAmountsAgorot: Record<string, number>;
  report54RecordCounts: Record<string, number>;
  report54TotalRecords: number;
}): OpenFormatSummaryAudit {
  const issues: OpenFormatSummaryIssue[] = [];
  const iniSummaryCodes = ["100C", "D110", "120D", "100B", "110B", "M100"];

  for (const code of iniSummaryCodes) {
    addMismatch(
      issues,
      `INI_DATA_COUNT_${code}`,
      `כמות ${code} ב-INI.TXT אינה תואמת לכמות בקובץ הנתונים.`,
      input.dataCounts[code] ?? 0,
      input.iniCounts[code] ?? 0
    );
  }

  for (const code of iniSummaryCodes) {
    addMismatch(
      issues,
      `REPORT54_DATA_COUNT_${code}`,
      `כמות ${code} בדוח 5.4 אינה תואמת לקובץ הנתונים.`,
      input.dataCounts[code] ?? 0,
      input.report54RecordCounts[code] ?? 0
    );
  }

  addMismatch(
    issues,
    "REPORT54_TOTAL_RECORDS",
    "סך הרשומות בדוח 5.4 אינו תואם לקובץ הנתונים.",
    input.totalRecords,
    input.report54TotalRecords
  );

  const c100Count = input.dataCounts["100C"] ?? 0;
  addMismatch(
    issues,
    "REPORT26_RECEIPT_COUNT",
    "כמות הקבלות (מסמך 400) בדוח 2.6 אינה תואמת לכמות 100C.",
    c100Count,
    input.report26DocumentCounts["400"] ?? 0
  );

  const nonReceiptDocuments = Object.entries(input.report26DocumentCounts)
    .filter(([code]) => code !== "400")
    .reduce((sum, [, count]) => sum + count, 0);
  if (nonReceiptDocuments !== 0) {
    issues.push({
      code: "REPORT26_UNSUPPORTED_DOCUMENT_COUNT",
      severity: "error",
      message: "דוח 2.6 כולל מסמכים שאינם נתמכים בפרופיל Receipt Only.",
      expected: 0,
      actual: nonReceiptDocuments
    });
  }

  const totalDocuments = Object.values(input.report26DocumentCounts).reduce((sum, count) => sum + count, 0);
  const totalAmountAgorot = Object.values(input.report26DocumentAmountsAgorot).reduce((sum, amount) => sum + amount, 0);

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    generatedAt: new Date().toISOString(),
    iniCounts: input.iniCounts,
    dataCounts: input.dataCounts,
    report26: {
      documentCounts: input.report26DocumentCounts,
      documentAmountsAgorot: input.report26DocumentAmountsAgorot,
      totalDocuments,
      totalAmountAgorot
    },
    report54: {
      recordCounts: input.report54RecordCounts,
      totalRecords: input.report54TotalRecords
    },
    issues
  };
}
