# 1.0.0-rc.17.15 — Tax Engine Audit

## Fixed
- Corrected Open Format record codes to canonical file values: 000A, 100A, 100C, 120D, 900Z.
- Updated all validators, UI labels, test fixtures, summaries and simulator-result models.
- Corrected unused numeric fields to zero padding.
- Unified local issue date and time formatting.
- Blocked export paths longer than the 50-character field limit.

## Validation
- 2,002-record fixture passed preflight.
- Header, byte, field, archive, path, summary, report 2.6 and report 5.4 checks passed.

## Still external
- Official simulator result.
- Temporary software-registration-number guidance.
- Bit/PayBox code-9 confirmation.
- Professional review of cancelled-document totals in report 2.6.
