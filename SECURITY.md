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

## Windows local-file capability rule

The renderer must never be treated as authoritative for a local filesystem path. A path used for an expense attachment or logo must originate from an Electron-owned file dialog, pass canonical path/type/size/content-signature validation, and consume a one-time approval in the main process before it can be read or uploaded.

Existing stored logo paths may be reused when they resolve to the same canonical file already stored by the application. A new or changed logo path requires a fresh dialog selection.

## Release status

- Windows 1.1.4 remains the latest manually verified Production build.
- Windows 1.1.5-security.5 is the current hardened source baseline after Phase 5 and must still pass manual flow testing, build and installation verification before being promoted to Production.
- Phase 5 automated gate: File Capability Hardening 10/10, Electron + renderer TypeScript PASS, `git diff --check` PASS.

## Do not commit

Never commit service-role keys, secret keys, passwords, auth tokens, `.env` files, Android keystores, signing credentials, generated APK/AAB files, Windows installers, production backups or customer data.

## Release rule

Security-sensitive changes should pass the project security and regression checks before release packaging. Windows releases that touch file selection or file ingestion must also pass `npm run check:file-capability-hardening`.
