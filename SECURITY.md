# MK Receipt Pro Security

## Current hardening baseline

- Supabase RLS enabled across business data tables based on the live checks already performed.
- Anonymous execution removed from sensitive SECURITY DEFINER RPCs.
- `consume_receipt_reservation` requires authenticated business access and a fixed search path.
- PostgreSQL input constraints protect phone, email, amounts, required fields, payment methods and status values.
- Android stores Supabase auth sessions in SecureStore.
- Windows uses Electron sandboxing, context isolation, disabled Node integration, sender validation and bounded IPC payloads.
- Phase 3 adds stricter IPC sender validation, production-only DevTools restrictions, denied browser permissions, external URL allowlists, signed Supabase URL pinning and attachment MIME/size checks.
- Phase 4 adds authenticated owner/admin device revocation with protection against revoking the current device.
- Phase 5 hardens Windows local-file capabilities: exact packaged renderer pinning, one-time file capabilities, canonical paths, 10MB limit and extension + magic-byte validation.
- Phase 6 hardens Android image/content boundaries with JPEG/PNG/WebP allowlist, decoded-size limits, magic-byte validation, signed URL pinning and redirect rejection.
- Android auth remains URL-independent: `detectSessionInUrl:false`, SecureStore uses device-only storage, and no custom URL scheme / Android intent filter is currently configured.
- Phase 7 prepares tenant/storage reference binding and a Staging audit. The Phase 7 migration is stored in GitHub but is **not applied to Production** and does not constitute a successful A/B tenant-isolation test.
- Phase 8 adds dependency/supply-chain monitoring. Windows currently has zero npm runtime audit findings. Android has a reviewed known-risk baseline of 11 high findings in the Expo/Metro/React Native dependency graph; these findings remain unresolved and monitored.

## Windows local-file capability rule

The renderer must never be treated as authoritative for a local filesystem path. A path used for an expense attachment or logo must originate from an Electron-owned file dialog, pass canonical path/type/size/content-signature validation, and consume a one-time approval in the main process before it can be read or uploaded.

Existing stored logo paths may be reused when they resolve to the same canonical file already stored by the application. A new or changed logo path requires a fresh dialog selection.

## Android image and URL boundary rule

A MIME value supplied by an Android picker or HTTP response is not sufficient proof of file type. User images and downloaded business logos must pass the shared image validator: MIME allowlist, decoded byte-size limit and matching JPEG/PNG/WebP magic bytes.

Supabase signed storage URLs used outside the Supabase SDK must pass `assertTrustedSupabaseSignedUrl` before opening/fetching. Security-sensitive downloads should reject redirects and validate returned content before rendering it.

Do not add an Android custom URL scheme or intent filter without designing and testing a dedicated deep-link trust model first. Auth tokens must not be accepted implicitly from incoming URLs.

## Tenant and Storage boundary rule

RLS and Storage policies remain the primary tenant authorization boundary. Database rows that reference Storage objects should additionally be bound to their own `business_id` prefix. The Phase 7 migration implements this as defense in depth, but it is Staging-first and must not be represented as Production protection until deliberately applied and validated.

The repository does not contain the complete original schema/RLS/Storage migration history. Therefore static repository review alone cannot prove tenant isolation. A real User A / Business A versus User B / Business B authenticated test remains required in an isolated Staging environment before declaring Tenant Isolation PASS.

## Dependency / supply-chain rule

- `npm audit fix --force` must never run automatically.
- Do not downgrade or major-upgrade Expo/React Native solely because an npm audit fix recommendation points to a semver-major version.
- Windows dependency audit is strict: any high or critical runtime finding blocks the gate.
- Android has a reviewed known-risk baseline in `security/android-npm-audit-baseline.json`. The baseline is not remediation.
- Android CI must fail if a Critical appears, the High count exceeds the reviewed maximum, or a new High package appears outside the reviewed set.
- Any Expo/React Native major upgrade requires a dedicated branch, compatible Node version, `expo install --fix`, Expo Doctor, TypeScript, all project security/regression gates, APK/AAB build and manual device testing.
- Dependency advisories are part of the software supply chain even when the affected package is primarily build/bundling tooling.

## Phase 8 findings

Current Android Expo SDK 54 audit: **0 critical, 11 high, 7 moderate**.

An isolated CI evaluation of Expo SDK 57 aligned React/React Native and passed Expo Doctor 20/20 after temporarily removing the obsolete `androidNavigationBar` config field. TypeScript and all existing Android security gates also passed. The SDK 57 dependency graph still reported **11 high** findings, so the major upgrade was not committed as a vulnerability-remediation change.

See `SECURITY_PHASE8.md` for the detailed findings and acceptance rules.

## Release status

- Windows 1.1.4 remains the latest manually verified Windows Production build.
- Windows 1.1.5-security.5 is the hardened Windows source baseline after Phase 5 and must still pass manual flow testing, build and installation verification before Production promotion.
- Android 1.0.5 remains the current Android Production version. Phase 6 is additional source hardening layered onto 1.0.5 in `main`; it has not been declared a new Production release.
- Phase 5 gate: File Capability Hardening 10/10, Electron + renderer TypeScript PASS, `git diff --check` PASS.
- Phase 6 gate: Android Boundary Hardening 11/11, Intrusion 10/10, Device Management 8/8, TypeScript PASS.
- Phase 7 static gate / merge marker scan / secret scan: PASS. Authenticated A/B Staging test: PENDING.
- Phase 8 dependency gate: Windows strict PASS with zero findings; Android monitored-baseline PASS while 11 known High findings remain unresolved.

## Do not commit

Never commit service-role keys, secret keys, passwords, auth tokens, `.env` files, Android keystores, signing credentials, generated APK/AAB files, Windows installers, production backups, customer data or sensitive logs.

## Release rule

Security-sensitive changes must pass project security and regression checks before packaging. Windows releases touching file ingestion must pass `npm run check:file-capability-hardening`. Android `npm run release:check` must include `verify:android-boundary-hardening`. Dependency auditing must be reviewed before Production packaging, and a known-risk baseline must never be described as a fixed vulnerability.
