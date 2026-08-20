import type { LessonParticipantRecord, LessonSeriesRecord, ReceiptEligibility } from "./studentTypes";

export function getReceiptEligibility(participant: LessonParticipantRecord): ReceiptEligibility {
  if (participant.receiptId) return { eligible: false, reason: "receipt_already_issued" };
  if (participant.receiptRequestedAt) return { eligible: false, reason: "receipt_already_requested" };
  if (participant.attendanceStatus !== "attended") return { eligible: false, reason: "not_attended" };
  if (participant.paymentStatus !== "paid") return { eligible: false, reason: "not_paid" };
  if (!participant.paidAt) return { eligible: false, reason: "missing_paid_at" };
  if (!participant.paymentMethod) return { eligible: false, reason: "missing_payment_method" };
  if (participant.amountAgorot <= 0) return { eligible: false, reason: "zero_amount" };
  if (!participant.payerCustomerId) return { eligible: false, reason: "missing_payer" };
  return { eligible: true, reason: "eligible" };
}

function parseDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("INVALID_DATE_ONLY");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) throw new Error("INVALID_DATE_ONLY");
  return date;
}

function formatDateOnly(date: Date): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/**
 * Generates date-only occurrences for a recurring lesson series.
 * Conversion to an exact starts_at timestamp is deliberately left to the client/server
 * timezone boundary so Israel DST cannot shift the intended local lesson time.
 */
export function generateWeeklyOccurrenceDates(
  series: Pick<LessonSeriesRecord, "weekday" | "startsOn" | "endsOn" | "recurrenceIntervalWeeks">,
  horizonEnd: string,
): string[] {
  const startsOn = parseDateOnly(series.startsOn);
  const horizon = parseDateOnly(horizonEnd);
  const configuredEnd = series.endsOn ? parseDateOnly(series.endsOn) : null;
  const effectiveEnd = configuredEnd && configuredEnd < horizon ? configuredEnd : horizon;
  if (effectiveEnd < startsOn) return [];

  let first = startsOn;
  const startWeekday = first.getUTCDay();
  const daysUntilConfiguredWeekday = (series.weekday - startWeekday + 7) % 7;
  first = addDays(first, daysUntilConfiguredWeekday);
  if (first > effectiveEnd) return [];

  const stepDays = Math.max(1, series.recurrenceIntervalWeeks) * 7;
  const result: string[] = [];
  for (let cursor = first; cursor <= effectiveEnd; cursor = addDays(cursor, stepDays)) {
    result.push(formatDateOnly(cursor));
  }
  return result;
}

export function shouldCreateParentReminder(enabled: boolean, receivesReminders: boolean): boolean {
  return enabled && receivesReminders;
}
