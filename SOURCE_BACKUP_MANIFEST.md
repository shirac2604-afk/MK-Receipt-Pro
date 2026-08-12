# Source Backup Manifest

Last verified: **2026-08-12**

This manifest identifies the exact source archives that produced the current working security releases.

## Android

- Release: **1.0.5 — Security Device Management**
- Archive: `MK-Receipt-Pro-Android-1.0.5-SECURITY-DEVICE-MGMT-FULL.zip`
- SHA-256: `8a2847b7aab7bb7608bc4ff2e72464fb953d12aac2cdfa216d1e6923e3732485`
- Files in verified archive: **120**
- Target repository path after import: `apps/android/`

## Windows

- Release: **1.1.4 — Security Device Management**
- Archive: `MK-Receipt-Pro-Windows-1.1.4-SECURITY-DEVICE-MGMT-FULL.zip`
- SHA-256: `01091a8e359fd905b2c1a8ef467136298e1ad34765ae17ad2828f8a3b53583e7`
- Files in verified archive: **362**
- Target repository path after import: `apps/windows/`

## Supabase

Production migration history verified through the connected Supabase project:

1. `20260812052256_security_hardening_phase1`
2. `20260812052331_security_hardening_phase1_revoke_anon`
3. `20260812052942_security_input_validation_phase2`
4. `20260812074322_security_phase4_device_management`

Copies are stored under `supabase/migrations/`.

## Integrity rule

The GitHub source tree must not be declared a complete restore point until both `apps/android/` and `apps/windows/` are populated from archives matching the hashes above. Do not substitute older release ZIPs.

Secrets, `.env`, keystores, signing material, production data, APK/AAB/EXE installers and sensitive logs are intentionally excluded from GitHub.
