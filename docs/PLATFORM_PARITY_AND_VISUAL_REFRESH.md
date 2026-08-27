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
| Students and guardians | Available | Add full guardian controls |
| Groups | Available | Add cloud group management |
| Lessons calendar and recurring series | Available | Add cloud calendar and series management |
| Attendance, lesson notes and open payments | Available | Add cloud lesson controls |
| Reminder workflow | Available | Add the same cloud reminder controls, with native notifications as an additional Android convenience |
| Google Calendar | Available | Add the same account/status/sync workflow through the shared lesson data, while Android may additionally write to the phone calendar |
| Reports, backup/restore, diagnostics and tax tools | Available | Add mobile-safe screens or guided exports; no silent reduction of the business workflow |

## Data rule

Students, groups, lesson series, lessons, participants, lesson notes, payments and reminders use the existing tenant-scoped cloud records (`business_id`). The old Android-only lesson store must not be treated as the source of truth for the shared schedule.

## Delivery rule

Each parity increment must include:

1. Android and Windows implementation or an explicit, documented native equivalent.
2. Type and security checks.
3. A GitHub pull request with a feature matrix update and test results.
4. Upgrade artifacts only after the related checks pass.
