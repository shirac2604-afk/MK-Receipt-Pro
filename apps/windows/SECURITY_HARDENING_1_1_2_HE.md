# MK Receipt Pro Windows 1.1.2 — Security Hardening

- Phone, business number and money fields are sanitized at input time.
- Email and phone validation before save/receipt issue.
- Server-aligned max lengths for customer, receipt, business and notes fields.
- Expense payment method changed from free text to a closed allowed list.
- Existing production mutex/offline protections retained.
- Supabase database constraints are already active on the live project.
