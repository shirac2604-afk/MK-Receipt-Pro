# Platform parity and visual refresh

## Product decision

MK Receipt Pro is one business system, not a reduced mobile companion. Windows and Android must expose the same business workflows and use the same business data. Native operating-system integrations may differ only where the platform requires it.

## Shared visual language

Both clients use the approved visual direction:

- deep navy navigation and primary structure;
- powder-blue primary actions;
- warm off-white page background and white rounded work surfaces;
- right-to-left Hebrew hierarchy and clear status feedback.

Windows adapts this language to a wide work area and sidebar. Android adapts it to touch targets and a bottom dock; it is not a stretched desktop layout.

## Functional parity target

| Workflow | Windows | Android target |
| --- | --- | --- |
| Business profile, branding, devices and cloud status | Available | Available |
| Receipts, PDF history and cancellations | Available | Available |
| Customers and expenses | Available | Available |
| Students and guardians | Available | Available in shared cloud |
| Groups | Available | Available in shared cloud |
| Lessons calendar and recurring series | Available | Available in shared cloud |
| Attendance, lesson notes and open payments | Available | Available in shared cloud |
| Reminder workflow | Available | Shared-schedule teacher-device notifications; no external sending yet |
| Google Calendar | Available | Shared schedule syncs to the device calendar; a Google calendar on the device is supported |
| Reports, backup/restore, diagnostics and tax tools | Available | Yearly receipts/expenses CSV and local data export; diagnostics and validated restore are pending |

## Data rule

Students, groups, lesson series, lessons, participants, lesson notes, payments and reminders use the existing tenant-scoped cloud records (`business_id`). The old Android-only lesson store must not be treated as the source of truth for the shared schedule.

## Current increment

- Android now has cloud-backed group management (create, edit, membership and archive) and a lesson calendar with recurring individual and group series, attendance, payment state and lesson notes.
- Windows keeps its existing lesson, group, reminder and payment workflows, and its shared style layer now uses the same navy, powder-blue and warm off-white system as Android.
- Android now records each student's primary guardian, contact details and explicit reminder consent in the shared cloud record. The controls configure eligibility only; this increment does not send a reminder from Android.
- The Android recurring-lesson form now stores separate lead times for parent and student reminders, including an explicit no-reminder option; these are the same cloud series settings used by Windows.
- Android can now schedule teacher-only device notifications from the shared lesson calendar. It never sends WhatsApp, SMS or email to a student or guardian.
- Android can now export the current year's shared receipts and expenses as a CSV file through the system share sheet.
- Android's student, group, recurring-lesson, attendance, notes and payment controls now use the shared cloud records and are available in the app. The legacy local student hub is not part of the live navigation and must not be extended.
- The remaining Android parity work is: an external reminder delivery workflow, diagnostics and validated restore. These are deliberately separate from the current shared-data workflows.

## Local backup rule

- Windows always has a local backup destination. When no folder was selected during setup, the application creates and uses `Documents/MK Receipt Pro/Backups` instead of silently disabling automatic backups.
- Android offers an explicit local data export through the system share sheet. It contains the business records that the signed-in user may read; it does not claim to contain receipt PDFs or expense attachments stored separately in cloud storage.
- Automatic import and restore are intentionally not enabled on Android until they can validate a backup and protect receipt-number sequencing as strictly as Windows does.

## Delivery rule

Each parity increment must include:

1. Android and Windows implementation or an explicit, documented native equivalent.
2. Type and security checks.
3. A GitHub pull request with a feature matrix update and test results.
4. Upgrade artifacts only after the related checks pass.
