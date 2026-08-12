/**
 * Version 1.0 supports receipt documents only (document type 400).
 * For this profile each receipt is exported as:
 * - one 100C document header
 * - one 120D payment detail for the single supported payment line
 * D110 is not emitted because the official receipt example describes 100C + 120D,
 * and the application does not issue an invoice/item document.
 */
export const RECEIPT_ONLY_OPEN_FORMAT_PROFILE = Object.freeze({
  documentType: "400",
  emittedRecords: Object.freeze(["100A", "100C", "120D", "900Z"] as const),
  forbiddenRecords: Object.freeze(["D110", "100B", "110B", "M100"] as const),
  paymentLinesPerReceipt: 1,
});

export function validateReceiptOnlyRecordCounts(counts: Record<string, number>): string[] {
  const issues: string[] = [];
  const c100 = counts["100C"] ?? 0;
  const d120 = counts["120D"] ?? 0;
  if ((counts["D110"] ?? 0) !== 0) issues.push("בפרופיל קבלות בלבד אין להפיק רשומות D110.");
  if ((counts["100B"] ?? 0) !== 0 || (counts["110B"] ?? 0) !== 0) issues.push("התוכנה אינה מנהלת הנהלת חשבונות ולכן אין להפיק 100B/110B.");
  if ((counts["M100"] ?? 0) !== 0) issues.push("התוכנה אינה מנהלת מלאי ולכן אין להפיק M100.");
  if (c100 !== d120) issues.push("בקבלה בעלת שורת תשלום אחת נדרשת התאמה של 1:1 בין 100C ל-120D.");
  return issues;
}
