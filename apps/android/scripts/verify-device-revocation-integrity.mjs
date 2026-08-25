import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const migration=read("supabase/migrations/20260825080000_device_revocation_preserves_receipt_history.sql");
const indexMigration=read("supabase/migrations/20260825081500_device_revocation_reservation_index.sql");
const deviceRepository=read("apps/android/src/data/supabase/DeviceRepository.ts");
const dashboardRepository=read("apps/android/src/data/supabase/DashboardRepository.ts");
const source=read("apps/android/cloud/sql/002_auth_rls.sql");

const checks=[
  [migration.includes("add column if not exists revoked_at"),"revocation timestamp migration"],
  [migration.includes("set revoked_at = now()"),"device is soft-revoked"],
  [!migration.includes("delete from public.devices"),"receipt-linked device is never deleted"],
  [migration.includes("set status = 'cancelled'")&&migration.includes("r.status = 'reserved'"),"only pending reservations are cancelled"],
  [migration.includes("for update")&&migration.includes("for key share"),"revocation and reservation race protection"],
  [migration.includes("DEVICE_REVOKED")&&migration.includes("where public.devices.revoked_at is null"),"revoked device cannot re-register"],
  [indexMigration.includes("receipt_number_reservations_device_id_idx"),"reservation foreign-key index"],
  [source.includes("and d.revoked_at is null"),"fresh cloud SQL rejects revoked device reservations"],
  [deviceRepository.includes('.is("revoked_at",null)'),"revoked devices hidden from Android device list"],
  [dashboardRepository.includes('.is("revoked_at",null)'),"Android active-device count excludes revoked devices"]
];

let passed=0;
for(const [condition,label] of checks){
  console.log(`${condition?"PASS":"FAIL"} ${label}`);
  if(condition)passed++;
}
console.log(`Android device-revocation integrity: ${passed}/${checks.length}`);
if(passed!==checks.length)process.exit(1);
