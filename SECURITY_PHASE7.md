# Security Phase 7 — Tenant / Storage Boundary Audit

Status: **PASS — Phase 9 Staging validation completed on 2026-08-13**.

## What was reviewed

- Sensitive RPCs hardened in Phase 1/4 use authenticated tenant checks and fixed `search_path`.
- Android expense attachments use `${businessId}/${expenseId}/...`.
- Android business branding uses `${businessId}/logo`.
- The repository does not contain the original full schema/RLS/Storage policy migration history; the current `supabase/migrations` directory contains reconstructed/applied security migrations only. Therefore the live Production catalog was inspected directly before the isolated Staging test was created.

## Production read-only audit evidence

Before Staging testing, the live Supabase catalog was inspected with read-only queries:

- RLS was enabled on all eight core tenant tables: `businesses`, `business_members`, `customers`, `receipts`, `expenses`, `devices`, `receipt_sequences`, and `receipt_number_reservations`.
- Effective table policies for tenant data used `user_has_business_access(business_id)` and UPDATE policies included `WITH CHECK` where applicable.
- Storage policies for `business-branding`, `expense-attachments`, and `receipt-documents` scoped access to the first path component (`business_id`).
- All relevant Storage buckets were private.
- Storage-key invariant audit returned zero violations for business logos, expense attachments, and receipt PDF references.
- Sensitive `SECURITY DEFINER` RPCs were inspected and contained explicit `auth.uid()` / tenant or admin authorization checks and fixed `search_path` values.

## Phase 9 isolated Staging proof

A separate Supabase project named `MK-Receipt-Pro-Phase9-Staging` was created so destructive authorization tests did not run against Production data. Because the repository does not include the original complete schema migration history, the authorization surfaces used for the test were reconstructed from the live Production catalog: core tenant tables, current RLS policies, current sensitive RPC definitions/grants, private Storage buckets, and current Storage policies.

The test used two independent identities and tenants: User A / Business A and User B / Business B.

### Results

1. **Cross-tenant SELECT — PASS**
   - User A saw only Business A, Customer A, Expense A, Receipt A, Device A and A-prefixed Storage objects.
   - User B saw only the corresponding Business B records.

2. **Cross-tenant INSERT — PASS**
   - User A attempting to insert a customer under Business B was rejected by RLS.

3. **Tenant reassignment / UPDATE tampering — PASS**
   - User A attempting to change an A customer row from Business A to Business B was rejected by the UPDATE `WITH CHECK` policy.

4. **Legitimate same-tenant writes — PASS**
   - User A could create a Customer A row and an A-prefixed Storage object.

5. **Cross-tenant Storage — PASS**
   - User A could list only A-prefixed objects across the tested private buckets.
   - User A attempting to insert an object under the Business B prefix was rejected by Storage RLS.
   - Supabase private-bucket signed URL/download authorization uses Storage RLS; the tested SELECT boundary therefore covers the authorization predicate used for private object retrieval/signed access.

6. **Receipt RPC tenant boundary — PASS**
   - User A attempting `cancel_receipt_cloud` against Business B was rejected with `BUSINESS_ACCESS_DENIED`.
   - User A attempting `consume_receipt_reservation` for Business B was rejected with `BUSINESS_ACCESS_DENIED`.
   - User A attempting `reserve_receipt_number` for Business B was rejected with `BUSINESS_ACCESS_DENIED`.
   - User A attempting `issue_receipt_from_reservation` for Business B was rejected with `BUSINESS_ACCESS_DENIED`.

7. **Device administration boundary — PASS**
   - The exact admin predicate used by `revoke_device` evaluated false for User A against Business B. The function body additionally scopes the target device by both `id` and `business_id`.

8. **Missing/invalid identity — PASS**
   - An authenticated database role with no `auth.uid()` saw zero customers, expenses, receipts, devices, or Storage objects.
   - Sensitive receipt reservation RPC access was rejected with `BUSINESS_ACCESS_DENIED`.

## Remaining platform recommendation

Supabase Security Advisor reports Leaked Password Protection as disabled. Supabase documents this feature as available on the Pro plan and above. It is recommended if the project is upgraded, but it is not treated as a tenant-isolation release blocker because authorization boundaries above do not depend on password leak screening.

## Production rule

Tenant Isolation may now be recorded as **PASS for the currently inspected Production authorization model**, with the evidence above. Any future change to RLS policies, Storage policies, tenant membership logic, or sensitive SECURITY DEFINER RPCs must re-run the two-tenant matrix before release.
