from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "supabase/migrations/20260823211133_security_phase10_receipt_write_boundary.sql"
RLS = ROOT / "apps/android/cloud/sql/002_auth_rls.sql"
ISSUANCE = ROOT / "apps/android/cloud/sql/004_receipt_issuance.sql"
ANDROID_REPOSITORY = ROOT / "apps/android/src/data/supabase/ReceiptRepository.ts"
WINDOWS_CLOUD = ROOT / "apps/windows/apps/desktop/electron/main/SupabaseCloudService.ts"

def read(path: Path) -> str:
    if not path.exists():
        raise SystemExit(f"Missing required file: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")

def require(text: str, needle: str, label: str) -> None:
    if needle not in text:
        raise SystemExit(f"Security Phase 10 check failed: {label}")

migration = read(MIGRATION)
rls = read(RLS)
issuance = read(ISSUANCE)
android = read(ANDROID_REPOSITORY)
windows = read(WINDOWS_CLOUD)

for table in ("receipts", "receipt_sequences", "receipt_number_reservations"):
    require(migration, f"revoke insert, update, delete on table public.{table} from anon, authenticated;", f"direct writes revoked for {table}")

for policy in (
    "receipts_insert_member",
    "receipts_update_member",
    "receipt_sequences_insert_member",
    "receipt_sequences_update_member",
    "receipt_number_reservations_insert_member",
    "receipt_number_reservations_update_member",
):
    require(migration, f"drop policy if exists {policy}", f"legacy policy removed: {policy}")

require(migration, "create or replace function public.link_receipt_pdf_storage_key", "authorized PDF-link RPC migration")
require(migration, "from storage.objects o", "PDF object existence check")
require(migration, "revoke all on function public.link_receipt_pdf_storage_key", "PDF RPC anonymous access revoked")
require(rls, "array['devices','customers','expenses','receipt_templates','sync_mutations']", "generic RLS excludes financial receipt tables")
for table in ("receipts", "receipt_sequences", "receipt_number_reservations"):
    require(rls, f"revoke insert, update, delete on table {table} from anon, authenticated;", f"fresh setup revokes direct writes for {table}")
require(issuance, "create or replace function public.link_receipt_pdf_storage_key", "fresh cloud setup contains PDF-link RPC")
require(android, 'supabase.rpc("link_receipt_pdf_storage_key"', "Android uses authorized PDF-link RPC")
require(windows, 'this.client.rpc("link_receipt_pdf_storage_key"', "Windows uses authorized PDF-link RPC")

if '.from("receipts")\n    .update' in android:
    raise SystemExit("Security Phase 10 check failed: Android still updates receipts directly")
if '.from("receipts").update' in windows:
    raise SystemExit("Security Phase 10 check failed: Windows still updates receipts directly")

print("✓ Security Phase 10: financial receipt writes are RPC-only and PDF links are constrained")
