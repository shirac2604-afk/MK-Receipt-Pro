from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / 'supabase/migrations/20260812110000_security_phase7_storage_key_binding.sql'
AUDIT = ROOT / 'supabase/SECURITY_PHASE7_STAGING_AUDIT.sql'
DOC = ROOT / 'SECURITY_PHASE7.md'
PHASE1 = ROOT / 'supabase/migrations/20260812052256_security_hardening_phase1.sql'
PHASE4 = ROOT / 'supabase/migrations/20260812074322_security_phase4_device_management.sql'
ANDROID_EXPENSE = ROOT / 'apps/android/src/services/ExpenseAttachmentService.ts'
ANDROID_BRANDING = ROOT / 'apps/android/src/services/BusinessBrandingService.ts'

texts = {p: p.read_text(encoding='utf-8') for p in [MIGRATION, AUDIT, DOC, PHASE1, PHASE4, ANDROID_EXPENSE, ANDROID_BRANDING]}
m = texts[MIGRATION]
a = texts[AUDIT]
d = texts[DOC]
p1 = texts[PHASE1]
p4 = texts[PHASE4]
e = texts[ANDROID_EXPENSE]
b = texts[ANDROID_BRANDING]

checks = [
    ('phase7 not marked applied to production', 'NOT marked as applied to Production' in m),
    ('business logo key tenant binding', "logo_storage_key LIKE id::text || '/%'" in m),
    ('expense attachment tenant binding', "attachment_storage_key LIKE business_id::text || '/%'" in m),
    ('receipt pdf tenant binding', "pdf_storage_key LIKE business_id::text || '/%'" in m),
    ('cancellation pdf tenant binding', "cancellation_pdf_storage_key LIKE business_id::text || '/%'" in m),
    ('constraints staged as NOT VALID', m.count('NOT VALID') >= 4),
    ('audit checks RLS catalog', 'relrowsecurity' in a and 'pg_policies' in a),
    ('audit checks security definer and grants', 'prosecdef' in a and 'routine_privileges' in a),
    ('audit checks storage buckets', 'storage.buckets' in a),
    ('audit checks storage key violations', 'not like business_id::text' in a and 'not like id::text' in a),
    ('A/B matrix documented', 'User A / Business A' in d and 'User B / Business B' in d),
    ('phase1 authenticated tenant check retained', 'auth.uid()' in p1 and 'user_has_business_access(v_business)' in p1 and "SET search_path TO 'public'" in p1),
    ('device revoke owner/admin check retained', "bm.role in ('owner','admin')" in p4 and "SET search_path TO 'public'" in p4),
    ('android expense keys start with business id', '`${businessId}/${expenseId}/' in e),
    ('android logo key starts with business id', '`${businessId}/logo`' in b),
]

passed = 0
for name, ok in checks:
    print(('PASS' if ok else 'FAIL'), name)
    passed += int(ok)
print(f'Security Phase 7 static gate: {passed}/{len(checks)}')
if passed != len(checks):
    sys.exit(1)
