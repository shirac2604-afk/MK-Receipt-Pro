export interface Report26DocumentType {
  code: string;
  label: string;
}

export interface Report26AuditIssue {
  code: string;
  severity: "error" | "warning";
  message: string;
  expected?: unknown;
  actual?: unknown;
}

export interface Report26AuditInput {
  expectedDocumentTypes: readonly Report26DocumentType[];
  renderedDocumentTypes: readonly Report26DocumentType[];
  documentCounts: Record<string, number>;
  documentAmountsAgorot: Record<string, number>;
  c100Count: number;
  c100AmountAgorot: number;
  activeReceiptCount: number;
  cancelledReceiptCount: number;
  activeAmountAgorot: number;
  cancelledAmountAgorot: number;
}

export interface Report26AuditResult {
  valid: boolean;
  generatedAt: string;
  expectedOrder: string[];
  renderedOrder: string[];
  receiptSummary: {
    totalCount: number;
    activeCount: number;
    cancelledCount: number;
    totalAmountAgorot: number;
    activeAmountAgorot: number;
    cancelledAmountAgorot: number;
    cancellationPolicy: "included-to-match-exported-c100";
  };
  zeroDocumentTypes: string[];
  issues: Report26AuditIssue[];
}

export function auditReport26(input: Report26AuditInput): Report26AuditResult {
  const issues: Report26AuditIssue[] = [];
  const expectedOrder = input.expectedDocumentTypes.map((item) => item.code);
  const renderedOrder = input.renderedDocumentTypes.map((item) => item.code);

  if (JSON.stringify(expectedOrder) !== JSON.stringify(renderedOrder)) {
    issues.push({
      code: "REPORT26_DOCUMENT_ORDER",
      severity: "error",
      message: "סדר סוגי המסמכים בדוח 2.6 אינו תואם לרשימה הרשמית.",
      expected: expectedOrder,
      actual: renderedOrder
    });
  }

  for (const expected of input.expectedDocumentTypes) {
    const rendered = input.renderedDocumentTypes.find((item) => item.code === expected.code);
    if (!rendered) {
      issues.push({
        code: "REPORT26_DOCUMENT_MISSING",
        severity: "error",
        message: `סוג מסמך ${expected.code} חסר בדוח 2.6.`
      });
      continue;
    }
    if (rendered.label !== expected.label) {
      issues.push({
        code: "REPORT26_DOCUMENT_LABEL",
        severity: "error",
        message: `תיאור סוג מסמך ${expected.code} אינו תואם לרשימה הרשמית.`,
        expected: expected.label,
        actual: rendered.label
      });
    }
  }

  const expectedCodes = new Set(expectedOrder);
  for (const code of Object.keys(input.documentCounts)) {
    if (!expectedCodes.has(code)) {
      issues.push({
        code: "REPORT26_UNKNOWN_DOCUMENT",
        severity: "error",
        message: `דוח 2.6 מכיל סוג מסמך לא מוכר: ${code}.`
      });
    }
  }

  if ((input.documentCounts["400"] ?? 0) !== input.c100Count) {
    issues.push({
      code: "REPORT26_RECEIPT_COUNT",
      severity: "error",
      message: "כמות הקבלות בקוד 400 אינה תואמת למספר רשומות 100C.",
      expected: input.c100Count,
      actual: input.documentCounts["400"] ?? 0
    });
  }

  if ((input.documentAmountsAgorot["400"] ?? 0) !== input.c100AmountAgorot) {
    issues.push({
      code: "REPORT26_RECEIPT_AMOUNT",
      severity: "error",
      message: "הסכום בקוד 400 אינו תואם לסכום שדה 1223 ברשומות 100C.",
      expected: input.c100AmountAgorot,
      actual: input.documentAmountsAgorot["400"] ?? 0
    });
  }

  if (input.activeReceiptCount + input.cancelledReceiptCount !== input.c100Count) {
    issues.push({
      code: "REPORT26_STATUS_COUNT",
      severity: "error",
      message: "סך הקבלות הפעילות והמבוטלות אינו תואם לכמות 100C.",
      expected: input.c100Count,
      actual: input.activeReceiptCount + input.cancelledReceiptCount
    });
  }

  if (input.activeAmountAgorot + input.cancelledAmountAgorot !== input.c100AmountAgorot) {
    issues.push({
      code: "REPORT26_STATUS_AMOUNT",
      severity: "error",
      message: "פירוט הסכומים הפעילים והמבוטלים אינו תואם לסכום 100C.",
      expected: input.c100AmountAgorot,
      actual: input.activeAmountAgorot + input.cancelledAmountAgorot
    });
  }

  for (const item of input.expectedDocumentTypes) {
    if (item.code === "400") continue;
    const count = input.documentCounts[item.code] ?? 0;
    const amount = input.documentAmountsAgorot[item.code] ?? 0;
    if (count !== 0 || amount !== 0) {
      issues.push({
        code: "REPORT26_UNSUPPORTED_NONZERO",
        severity: "error",
        message: `סוג מסמך ${item.code} אינו מנוהל בתוכנה ולכן חייב להופיע באפס.`,
        expected: { count: 0, amountAgorot: 0 },
        actual: { count, amountAgorot: amount }
      });
    }
  }

  if (input.cancelledReceiptCount > 0) {
    issues.push({
      code: "REPORT26_CANCELLED_INCLUDED",
      severity: "warning",
      message: "קבלות מבוטלות נכללות בכמות ובסכום של קוד 400 כדי לשמור התאמה מלאה לכל רשומות 100C; הן מסומנות כמבוטלות בשדה 1228. יש לאמת מדיניות זו בבדיקה המקצועית לפני ההגשה.",
      actual: { count: input.cancelledReceiptCount, amountAgorot: input.cancelledAmountAgorot }
    });
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    generatedAt: new Date().toISOString(),
    expectedOrder,
    renderedOrder,
    receiptSummary: {
      totalCount: input.c100Count,
      activeCount: input.activeReceiptCount,
      cancelledCount: input.cancelledReceiptCount,
      totalAmountAgorot: input.c100AmountAgorot,
      activeAmountAgorot: input.activeAmountAgorot,
      cancelledAmountAgorot: input.cancelledAmountAgorot,
      cancellationPolicy: "included-to-match-exported-c100"
    },
    zeroDocumentTypes: input.expectedDocumentTypes.filter((item) => item.code !== "400").map((item) => item.code),
    issues
  };
}
