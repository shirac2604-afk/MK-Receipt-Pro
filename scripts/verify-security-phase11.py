from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "supabase/migrations/20260825110300_security_phase11_rpc_surface.sql"

failures = []
sql = MIGRATION.read_text(encoding="utf-8").lower()
normalized = re.sub(r"\s+", " ", sql)

required = {
    "future function execution is opt-in": (
        "alter default privileges for role postgres in schema public "
        "revoke execute on functions from public, anon, authenticated;"
    ),
    "legacy consume RPC is closed": (
        "revoke execute on function public.consume_receipt_reservation(uuid) "
        "from public, anon, authenticated;"
    ),
}

for label, statement in required.items():
    if statement not in normalized:
        failures.append(label)

client_roots = [
    ROOT / "apps/android/src",
    ROOT / "apps/windows/apps",
]
client_text = "\n".join(
    path.read_text(encoding="utf-8", errors="ignore")
    for client_root in client_roots
    for path in client_root.rglob("*")
    if path.is_file() and path.suffix in {".ts", ".tsx", ".js", ".mjs", ".cjs"}
)

if "consume_receipt_reservation" in client_text:
    failures.append("legacy consume RPC still has an application caller")

for active_rpc in (
    "issue_receipt_from_reservation",
    "cancel_receipt_cloud",
    "register_device",
    "reserve_receipt_number",
    "revoke_device",
):
    if active_rpc not in client_text:
        failures.append(f"active RPC lost its application caller: {active_rpc}")
    if f"revoke execute on function public.{active_rpc}" in normalized:
        failures.append(f"phase 11 must not close active RPC: {active_rpc}")

if failures:
    print("Security Phase 11 FAIL")
    for failure in failures:
        print("FAIL", failure)
    sys.exit(1)

print("Security Phase 11 RPC surface: PASS")
