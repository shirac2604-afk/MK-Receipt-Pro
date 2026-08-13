import { describe, expect, it } from "vitest";
import { generateWeeklyOccurrenceDates, getReceiptEligibility } from "./studentAutomation";
import type { LessonParticipantRecord } from "./studentTypes";

const baseParticipant: LessonParticipantRecord = {
  id: "participant-1",
  businessId: "business-1",
  lessonId: "lesson-1",
  studentId: "student-1",
  payerCustomerId: "customer-1",
  attendanceStatus: "attended",
  paymentStatus: "paid",
  amountAgorot: 12000,
  paymentMethod: "bit",
  paidAt: "2026-08-13T12:00:00.000Z",
  receiptId: null,
  receiptRequestedAt: null,
  receiptError: null,
};

describe("student receipt automation", () => {
  it("allows a receipt only after attendance and payment are complete", () => {
    expect(getReceiptEligibility(baseParticipant)).toEqual({ eligible: true, reason: "eligible" });
  });

  it("does not receipt a paid student who did not attend", () => {
    expect(getReceiptEligibility({ ...baseParticipant, attendanceStatus: "absent" })).toEqual({
      eligible: false,
      reason: "not_attended",
    });
  });

  it("does not receipt an attended student who is still unpaid", () => {
    expect(getReceiptEligibility({
      ...baseParticipant,
      paymentStatus: "unpaid",
      paidAt: null,
      paymentMethod: null,
    })).toEqual({ eligible: false, reason: "not_paid" });
  });

  it("blocks duplicate receipt issuance", () => {
    expect(getReceiptEligibility({ ...baseParticipant, receiptId: "receipt-1" })).toEqual({
      eligible: false,
      reason: "receipt_already_issued",
    });
  });

  it("blocks a second concurrent receipt request", () => {
    expect(getReceiptEligibility({ ...baseParticipant, receiptRequestedAt: "2026-08-13T12:00:01.000Z" })).toEqual({
      eligible: false,
      reason: "receipt_already_requested",
    });
  });
});

describe("recurring lesson generation", () => {
  it("generates weekly dates on the configured weekday", () => {
    expect(generateWeeklyOccurrenceDates({
      weekday: 2,
      startsOn: "2026-08-13",
      endsOn: null,
      recurrenceIntervalWeeks: 1,
    }, "2026-09-10")).toEqual([
      "2026-08-18",
      "2026-08-25",
      "2026-09-01",
      "2026-09-08",
    ]);
  });

  it("supports every-two-weeks series", () => {
    expect(generateWeeklyOccurrenceDates({
      weekday: 4,
      startsOn: "2026-08-13",
      endsOn: null,
      recurrenceIntervalWeeks: 2,
    }, "2026-09-30")).toEqual([
      "2026-08-13",
      "2026-08-27",
      "2026-09-10",
      "2026-09-24",
    ]);
  });

  it("respects an explicit series end date", () => {
    expect(generateWeeklyOccurrenceDates({
      weekday: 0,
      startsOn: "2026-08-16",
      endsOn: "2026-08-30",
      recurrenceIntervalWeeks: 1,
    }, "2026-12-31")).toEqual([
      "2026-08-16",
      "2026-08-23",
      "2026-08-30",
    ]);
  });
});
