# MK Receipt Pro — Student Management V1

## Product direction

Student management is an integrated module inside MK Receipt Pro, not a separate application. It shares the existing business identity, Supabase tenant boundary, customer/receipt system and later both Windows and Android clients.

## Core workflow

1. Create a student and link one or more parents/guardians.
2. Select the financial payer by linking the student to an existing MK Receipt Pro customer (`payer_customer_id`).
3. Create an individual or group recurring lesson series.
4. The application generates lesson occurrences automatically into the calendar.
5. Reminder jobs are created for the configured contacts.
6. At/after the lesson, attendance and payment are recorded per student.
7. Automatic receipt eligibility is true only when the same participant is both `attended` and `paid`, has a payer customer and does not already have a receipt.
8. Receipt issuance must be idempotent: one lesson participant may link to at most one receipt.
9. Pedagogical summary/homework/progress stay attached to the student and lesson, while the financial receipt stays attached to the payer customer.

## V1 screens

- Today / dashboard
- Students
- Student profile
- Groups
- Calendar / lessons
- Lesson detail
- Open payments

## Student profile

- Name
- School grade / school (optional)
- Subjects / focus notes
- Parent/guardian contacts
- Payer customer link
- Default lesson price
- Reminder preferences
- Active goals
- Lesson history
- Homework / next step
- Payment and receipt history

## Lesson model

Lessons may be individual or group. Payment and attendance are participant-level, not lesson-level, so one group lesson can contain students with different attendance/payment/receipt states.

Attendance states:
- scheduled
- attended
- absent
- cancelled
- late_cancelled

Payment states:
- unpaid
- paid
- waived
- refunded

## Receipt automation rule — V1

A participant becomes eligible for automatic receipt issuance when all are true:

- attendance_status = `attended`
- payment_status = `paid`
- paid_at is present
- amount_agorot > 0
- payer_customer_id is present
- receipt_id is null

The database will enforce unique receipt linkage. The application/server flow must also use the existing atomic receipt reservation/issuance protections before attaching the resulting receipt ID.

A paid late cancellation is intentionally NOT auto-receipted in V1 until a business setting explicitly enables that policy.

## Recurring lessons

A recurring series stores weekday, local start time, duration, start/end dates and recurrence interval. Occurrences are generated ahead of time and carry a `series_id`. Generation must be idempotent using a unique `(series_id, starts_at)` constraint.

Initial implementation target: generate the next 90 days when a series is created/edited and extend the horizon when the app opens.

## Reminders

Defaults for V1:
- parent/guardian: 24 hours before lesson
- student: 2 hours before lesson when a student contact method exists and reminders are enabled

Reminder delivery state is recorded separately so retries cannot duplicate a successfully delivered reminder. Actual external WhatsApp/SMS delivery is a later integration; V1 first builds the scheduling/outbox boundary.

## Security

Every new cloud table is tenant-scoped by `business_id`, has RLS enabled, and uses `public.user_has_business_access(business_id)` for both `USING` and `WITH CHECK` policies.

Cross-tenant IDs are additionally constrained through composite `(business_id, id)` foreign keys where practical so a row from Business A cannot reference a student/customer/group from Business B even if application validation fails.

## Future integration

The module is deliberately structured so Windows and Android can share the same Supabase data. The existing receipt engine remains the only receipt authority; the student module requests issuance and stores the resulting `receipt_id` rather than implementing a second receipt system.
