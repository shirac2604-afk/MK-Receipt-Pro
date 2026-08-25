import fs from "node:fs";
const svc=fs.readFileSync("apps/desktop/electron/main/SupabaseCloudService.ts","utf8");
const ipc=fs.readFileSync("apps/desktop/electron/ipc/databaseHandlers.ts","utf8");
const pre=fs.readFileSync("apps/desktop/electron/preload/preload.ts","utf8");
const ui=fs.readFileSync("apps/desktop/renderer/src/main.tsx","utf8");
const migration=fs.readFileSync("../../supabase/migrations/20260825090000_device_revocation_tombstones.sql","utf8");
const raceHardening=fs.readFileSync("../../supabase/migrations/20260825091500_device_revocation_race_hardening.sql","utf8");
const checks=[
 [svc.includes("async listDevices"),"device list service"],
 [svc.includes('rpc("revoke_device"'),"secure revoke RPC"],
 [svc.includes("targetDeviceId===deviceId"),"current-device service guard"],
 [svc.includes('.is("revoked_at",null)'),"revoked devices hidden"],
 [svc.includes("allowDeviceReenroll"),"explicit sign-in re-enrollment"],
 [svc.includes('signOut({scope:"local"})'),"local-only Windows sign-out"],
 [ipc.includes("cloud-account:revoke-device"),"revoke IPC"],
 [pre.includes("revokeDevice"),"preload API"],
 [ui.includes("cloud-device-list"),"device list UI"],
 [ui.includes("d.id!==status.deviceId"),"current-device UI guard"],
 [ui.includes("30000"),"revocation refresh interval"],
 [migration.includes("revoked_at timestamptz"),"durable revocation tombstone"],
 [migration.includes("raise exception 'DEVICE_REVOKED'"),"revoked key registration blocked"],
 [migration.includes("set revoked_at=now()"),"revoke updates instead of deletes"],
 [migration.includes("and d.revoked_at is null"),"revoked device cannot reserve receipts"],
 [migration.includes("revoke insert, update, delete on table public.devices"),"direct device mutation denied"]
 ,[raceHardening.includes("for key share"),"reservation and revocation share a lock"]
 ,[raceHardening.includes("reservation.status='reserved'"),"pending reservations are cancelled"]
];
let ok=0;
for(const [passed,name] of checks){console.log(`${passed?"PASS":"FAIL"} ${name}`);if(passed)ok++;}
console.log(`Windows device management: ${ok}/${checks.length}`);
if(ok!==checks.length)process.exit(1);
