# Security Phase 7 — Tenant / Storage Boundary Audit

Status: **static hardening prepared; Staging validation required before Production**.

## What was reviewed

- Sensitive RPCs already hardened in Phase 1/4 use authenticated tenant checks and fixed `search_path`.
- Android expense attachments use `${businessId}/${expenseId}/...`.
- Android business branding uses `${businessId}/logo`.
- The repository does not contain the original full schema/RLS/Storage policy migration history; the current `supabase/migrations` directory contains reconstructed/applied security migrations only. Therefore the repository alone cannot prove the complete live RLS/Storage policy state.

## Phase 7 defense in depth

`20260812110000_security_phase7_storage_key_binding.sql` adds NOT VALID constraints that require stored object references to begin with the row's own business UUID. This prevents a compromised or buggy client from persisting a cross-business Storage reference even when it can edit its own row.

The constraints are intentionally `NOT VALID`: new/updated rows are protected, while existing rows can first be audited without risking a Production migration failure. Validate them in Staging after the invariant queries return zero violations.

## Required Staging proof

Run `supabase/SECURITY_PHASE7_STAGING_AUDIT.sql`, inspect every RLS/Storage policy and SECURITY DEFINER grant, then perform a real two-user test:

1. User A / Business A and User B / Business B.
2. Cross-tenant SELECT/INSERT/UPDATE/DELETE for customers, receipts, expenses and devices must fail or return no rows.
3. Tampering `business_id` must be rejected by RLS `WITH CHECK`.
4. Storage upload/download/update/delete/signed-URL creation for the other business prefix must fail.
5. Receipt reservation consume/cancel and device revoke against the other business must fail.
6. Invalid/expired sessions must have no tenant access.

## Production rule

Do not claim Tenant Isolation PASS from static source review alone. Do not run destructive cross-tenant tests against Production data. Promote the Phase 7 migration only after Staging policy inspection and the authenticated A/B matrix pass.
