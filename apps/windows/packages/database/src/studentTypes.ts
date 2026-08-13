import type { PaymentMethod } from "./types";

export type LessonKind = "individual" | "group";
export type LessonStatus = "scheduled" | "completed" | "cancelled";
export type AttendanceStatus = "scheduled" | "attended" | "absent" | "cancelled" | "late_cancelled";
export type LessonPaymentStatus = "unpaid" | "paid" | "waived" | "refunded";
export type ReminderAudience = "student" | "guardian";
export type ReminderChannel = "whatsapp" | "sms" | "email" | "in_app";
export type ReminderStatus = "pending" | "sending" | "sent" | "failed" | "cancelled";

export interface StudentRecord {
  id: string;
  businessId: string;
  displayName: string;
  phone: string | null;
  email: string | null;
  schoolName: string | null;
  schoolGrade: string | null;
  focusNotes: string | null;
  defaultPriceAgorot: number;
  payerCustomerId: string | null;
  reminderEnabled: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudentCreateInput {
  displayName: string;
  phone?: string;
  email?: string;
  schoolName?: string;
  schoolGrade?: string;
  focusNotes?: string;
  defaultPriceAgorot?: number;
  payerCustomerId?: string;
  reminderEnabled?: boolean;
}

export interface StudentGuardianRecord {
  id: string;
  businessId: string;
  studentId: string;
  displayName: string;
  relationship: string | null;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
  receivesReminders: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudentWithGuardian extends StudentRecord {
  primaryGuardian: StudentGuardianRecord | null;
}

export interface StudentSaveInput {
  id?: string;
  displayName: string;
  phone?: string;
  email?: string;
  schoolName?: string;
  schoolGrade?: string;
  focusNotes?: string;
  defaultPriceAgorot: number;
  payerCustomerId?: string;
  reminderEnabled: boolean;
  guardianName?: string;
  guardianRelationship?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  guardianReceivesReminders: boolean;
}

export interface StudentGroupRecord {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LessonSeriesRecord {
  id: string;
  businessId: string;
  kind: LessonKind;
  studentId: string | null;
  groupId: string | null;
  title: string;
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  localStartTime: string;
  durationMinutes: number;
  recurrenceIntervalWeeks: number;
  startsOn: string;
  endsOn: string | null;
  defaultPriceAgorot: number;
  parentReminderMinutes: number;
  studentReminderMinutes: number;
  active: boolean;
}

export interface LessonSeriesSaveInput {
  studentId: string;
  title: string;
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  localStartTime: string;
  durationMinutes: number;
  recurrenceIntervalWeeks: number;
  startsOn: string;
  endsOn?: string;
  defaultPriceAgorot: number;
  parentReminderMinutes: number;
  studentReminderMinutes: number;
}

export interface LessonRecord {
  id: string;
  businessId: string;
  seriesId: string | null;
  kind: LessonKind;
  studentId: string | null;
  groupId: string | null;
  title: string;
  startsAt: string;
  endsAt: string;
  status: LessonStatus;
  lessonSummary: string | null;
  homework: string | null;
}

export interface LessonParticipantRecord {
  id: string;
  businessId: string;
  lessonId: string;
  studentId: string;
  payerCustomerId: string | null;
  attendanceStatus: AttendanceStatus;
  paymentStatus: LessonPaymentStatus;
  amountAgorot: number;
  paymentMethod: PaymentMethod | null;
  paidAt: string | null;
  receiptId: string | null;
  receiptRequestedAt: string | null;
  receiptError: string | null;
}

export interface LessonParticipantUpdateInput {
  attendanceStatus?: AttendanceStatus;
  paymentStatus?: LessonPaymentStatus;
  amountAgorot?: number;
  paymentMethod?: PaymentMethod | null;
  paidAt?: string | null;
}

export interface LessonCalendarItem {
  lesson: LessonRecord;
  participant: LessonParticipantRecord;
  student: StudentRecord;
  guardian: StudentGuardianRecord | null;
}

export interface LessonParticipantActionInput {
  participantId: string;
  attendanceStatus: AttendanceStatus;
  paymentStatus: LessonPaymentStatus;
  paymentMethod?: PaymentMethod | null;
  amountAgorot: number;
}

export interface LessonReminderRecord {
  id: string;
  businessId: string;
  lessonId: string;
  studentId: string;
  guardianId: string | null;
  audience: ReminderAudience;
  channel: ReminderChannel;
  scheduledFor: string;
  status: ReminderStatus;
  sentAt: string | null;
  attemptCount: number;
  lastError: string | null;
}

export interface ReceiptEligibility {
  eligible: boolean;
  reason:
    | "eligible"
    | "not_attended"
    | "not_paid"
    | "missing_paid_at"
    | "missing_payment_method"
    | "zero_amount"
    | "missing_payer"
    | "receipt_already_issued"
    | "receipt_already_requested";
}
