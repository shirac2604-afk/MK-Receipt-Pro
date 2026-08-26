# MK Receipt Pro Security

## Current hardening baseline

- Supabase RLS enabled across business data tables.
- Anonymous execution removed from sensitive SECURITY DEFINER RPCs.
- `consume_receipt_reservation` requires authenticated business access and a fixed search path.
- PostgreSQL input constraints protect phone, email, amounts, required fields, payment methods and status values.
- Android stores Supabase auth sessions in SecureStore.
- Windows uses Electron sandboxing, context isolation, disabled Node integration, sender validation and bounded IPC payloads.
- Phase 3 adds stricter IPC sender validation, production-only DevTools restrictions, denied browser permissions, external URL allowlists, signed Supabase URL pinning and attachment MIME/size checks.
- Phase 4 adds authenticated owner/admin device revocation with protection against revoking the current device.
- Phase 5 hardens Windows local-file capabilities: the packaged renderer is pinned to the exact `dist/index.html`, user-selected expense attachments and logos receive one-time capabilities, and arbitrary renderer-supplied local paths are rejected.
- Phase 5 also canonicalizes selected paths, enforces a 10MB limit, and verifies both allowed extension and file magic bytes for PDF/PNG/JPEG/WebP before sensitive file use.
- Phase 6 hardens Android image/content boundaries. Expense attachments and business logos are validated using a JPEG/PNG/WebP allowlist, decoded byte limits and file magic bytes before upload/use.
- Phase 6 pins business-logo signed URLs to the trusted Supabase HTTPS host and storage signed-object path, rejects redirects, and validates the downloaded response MIME, decoded size and magic bytes.
- Android keeps `detectSessionInUrl:false` and SecureStore uses `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`. Phase 15 adds only the reviewed `mkreceiptpro` scheme, with no broad Android intent filter; recovery links are parsed and verified explicitly before any session is accepted.
- Phase 12 separates registration password quality from sign-in compatibility. Android sign-up enforces an eight-character minimum plus basic offline common/email-derived password rejection, while existing sign-in passwords remain accepted for Supabase verification.
- Phase 12 revalidates the active Windows device before sensitive cloud service operations and every 15 seconds in the Electron main process, clearing the local cloud session when the device was revoked.
- Phase 12 treats cloud-downloaded expense attachments as untrusted: 10 MB limit, PDF/PNG/JPEG/WebP magic-byte validation, content-derived extension, atomic controlled-directory write and IPC revalidation before OS open.
- Phase 13 adds authenticated password changes to Android and Windows. The clients verify the current password, require the reauthenticated user ID to match the active user, enforce the 8–128 character policy and only then call Supabase `updateUser`.
- Windows password changes also require an immediate active-device validation. Electron exposes a typed IPC operation and maps authentication failures to fixed renderer-safe messages.
- Phase 14 restores complete Android and Windows npm lockfiles after committed tool-output truncation made both files invalid JSON. A repository-wide integrity gate now rejects malformed tracked JSON, truncation markers and package/lock metadata drift.
- Security and type-check workflows that validate dependency state use `npm ci`, so CI fails instead of silently regenerating a damaged lockfile.

## Windows local-file capability rule

The renderer must never be treated as authoritative for a local filesystem path. A path used for an expense attachment or logo must originate from an Electron-owned file dialog, pass canonical path/type/size/content-signature validation, and consume a one-time approval in the main process before it can be read or uploaded.

Existing stored logo paths may be reused when they resolve to the same canonical file already stored by the application. A new or changed logo path requires a fresh dialog selection.

## Android image and URL boundary rule

A MIME value supplied by an Android picker or HTTP response is not sufficient proof of file type. User images and downloaded business logos must pass the shared image validator: MIME allowlist, decoded byte-size limit and matching JPEG/PNG/WebP magic bytes.

Supabase signed storage URLs used outside the Supabase SDK must pass `assertTrustedSupabaseSignedUrl` before opening/fetching. Security-sensitive downloads should reject redirects and validate the returned content before rendering it.

Do not add any Android URL scheme or intent filter beyond the reviewed `mkreceiptpro://auth/recovery` path without a dedicated trust model and cross-platform testing. Auth tokens must never be accepted implicitly from incoming URLs.

## Password recovery (Phase 15 — Staging only)

Password recovery uses an ephemeral Supabase client with `persistSession: false`, `autoRefreshToken: false` and `detectSessionInUrl: false`. Android and Windows request Supabase's normal reset link with the exact Staging callback `mkreceiptpro://auth/recovery`. The callback parser accepts only that scheme, `auth` host and `/recovery` path; it requires `type=recovery`, bounds both credentials, calls `setSession` and `getUser`, then holds the verified recovery session only in memory. It reuses the password policy, globally signs out sessions after a successful update, and clears local recovery state.

On Windows, the Electron main process owns the link and recovery session. The renderer receives only a boolean recovery-ready state and submits a new password through the existing sender-validated, size-bounded IPC route; it never receives the URL, access token or refresh token. Recovery must first be enabled and tested on Staging using the standard `{{ .ConfirmationURL }}` reset-password template. Do not change Production Auth settings or merge this phase until the documented cross-platform Staging checks pass and a fresh approval is given.

The local request cooldown is user-interface load reduction only. It is not a substitute for Supabase Auth server-side rate limits.

## Release status

- Windows 1.1.4 remains the latest manually verified Windows Production build.
- Windows 1.1.5-security.5 is the current hardened Windows source baseline after Phase 5 and must still pass manual flow testing, build and installation verification before being promoted to Production.
- Android 1.0.5 remains the current Android Production version. Phase 6 is additional source hardening layered onto the 1.0.5 code in `main`; it has not been declared a new Production release.
- Phase 5 automated gate: File Capability Hardening 10/10, Electron + renderer TypeScript PASS, `git diff --check` PASS.
- Phase 6 automated gate: Android Boundary Hardening 11/11, Intrusion Hardening regression 10/10, Device Management regression 8/8, TypeScript PASS.

## Do not commit

Never commit service-role keys, secret keys, passwords, auth tokens, `.env` files, Android keystores, signing credentials, generated APK/AAB files, Windows installers, production backups or customer data.

## Release rule

Security-sensitive changes should pass the project security and regression checks before release packaging. Windows releases that touch cloud sessions or file ingestion must pass `npm run check:cloud-session-hardening` and `npm run check:file-capability-hardening`. Android `npm run release:check` must include `verify:auth-password-policy` and `verify:android-boundary-hardening` before release packaging.

Password-management changes must also pass Android `npm run verify:password-change`, Windows `npm run check:password-change`, both TypeScript checks and the Phase 13 static gate before release packaging.

Any dependency, package manifest or lockfile change must pass `python3 scripts/verify-source-integrity.py`, exact Android and Windows `npm ci` installs and the Phase 14 CI gate before release packaging.
