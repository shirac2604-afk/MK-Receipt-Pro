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
- Android auth remains URL-independent: `detectSessionInUrl:false`, SecureStore uses `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`, and the current Expo configuration exposes no custom `scheme` or Android `intentFilters` deep-link entry point.

## Windows local-file capability rule

The renderer must never be treated as authoritative for a local filesystem path. A path used for an expense attachment or logo must originate from an Electron-owned file dialog, pass canonical path/type/size/content-signature validation, and consume a one-time approval in the main process before it can be read or uploaded.

Existing stored logo paths may be reused when they resolve to the same canonical file already stored by the application. A new or changed logo path requires a fresh dialog selection.

## Android image and URL boundary rule

A MIME value supplied by an Android picker or HTTP response is not sufficient proof of file type. User images and downloaded business logos must pass the shared image validator: MIME allowlist, decoded byte-size limit and matching JPEG/PNG/WebP magic bytes.

Supabase signed storage URLs used outside the Supabase SDK must pass `assertTrustedSupabaseSignedUrl` before opening/fetching. Security-sensitive downloads should reject redirects and validate the returned content before rendering it.

Do not add an Android custom URL scheme or intent filter without designing and testing a dedicated deep-link trust model first. Auth tokens must not be accepted implicitly from incoming URLs.

## Release status

- Windows 1.1.4 remains the latest manually verified Windows Production build.
- Windows 1.1.5-security.5 is the current hardened Windows source baseline after Phase 5 and must still pass manual flow testing, build and installation verification before being promoted to Production.
- Android 1.0.5 remains the current Android Production version. Phase 6 is additional source hardening layered onto the 1.0.5 code in `main`; it has not been declared a new Production release.
- Phase 5 automated gate: File Capability Hardening 10/10, Electron + renderer TypeScript PASS, `git diff --check` PASS.
- Phase 6 automated gate: Android Boundary Hardening 11/11, Intrusion Hardening regression 10/10, Device Management regression 8/8, TypeScript PASS.

## Do not commit

Never commit service-role keys, secret keys, passwords, auth tokens, `.env` files, Android keystores, signing credentials, generated APK/AAB files, Windows installers, production backups or customer data.

## Release rule

Security-sensitive changes should pass the project security and regression checks before release packaging. Windows releases that touch file selection or file ingestion must also pass `npm run check:file-capability-hardening`. Android `npm run release:check` must include `verify:android-boundary-hardening` before release packaging.
