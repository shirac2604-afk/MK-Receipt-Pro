# Security Phase 12 — Auth, Device Session and Cloud Attachments

## Status

Source hardening is complete. No Android APK, Windows installer or Supabase Production configuration was changed in this phase.

## Controls added

- Android sign-up requires at least eight characters and rejects a small offline set of common passwords and passwords derived from the email name.
- Existing sign-in remains compatible: every nonempty password is sent to Supabase, so the new registration rule does not block an older valid password.
- `AuthService.signUp` repeats the policy check so the UI is not the only application-layer control.
- Windows checks the current device row before sensitive cloud service operations, with a ten-second cache and a single in-flight validation.
- The Electron main process forces a device validation every 15 seconds even when the backup/account screen is not open.
- A revoked Windows device is signed out locally and its cached connected state is cleared.
- Cloud expense attachments are limited to 10 MB and accepted only when their bytes match PDF, PNG, JPEG or WebP signatures.
- The local filename extension is derived from verified content, not cloud metadata. Downloads are written through a unique temporary file and renamed before use.
- The IPC boundary revalidates the downloaded file before calling `shell.openPath`.

## Supabase FREE plan rollout

Leaked-password protection remains unavailable on the current FREE plan and is not treated as an active control.

The Supabase minimum-password setting should be raised from 6 to 8 only after the next Android source release has been built, installed and checked. Roll out to Staging first, then Production. This keeps the server policy aligned with the app while avoiding an uncoordinated Production change.

Do not enable secure password-change options until a dedicated password-change and recent-authentication flow exists in the clients.

## Automated evidence

- `python3 scripts/verify-security-phase12.py`
- Android: `npm run verify:auth-password-policy`
- Windows: `npm run check:cloud-session-hardening`
- Phase 12 GitHub Actions workflow runs the static gate on relevant changes.

## Release boundary

The changes are source-ready, not a published production release. Before release: run both TypeScript checks, the existing Android and Windows security regression gates, manual existing-user sign-in, new-account rejection/acceptance tests, remote device revocation, and safe/unsafe cloud attachment tests.
