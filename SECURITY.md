# MK Receipt Pro Security

## Current hardening baseline

- Supabase RLS enabled across business data tables.
- Anonymous execution removed from sensitive SECURITY DEFINER RPCs.
- `consume_receipt_reservation` requires authenticated business access and a fixed search path.
- PostgreSQL input constraints protect phone, email, amounts, required fields, payment methods and status values.
- Android stores Supabase auth sessions in SecureStore.
- Windows uses Electron sandboxing, context isolation, disabled Node integration, sender validation and bounded IPC payloads.
- Phase 3 adds stricter IPC sender validation, production-only DevTools restrictions, denied browser permissions, external URL allowlists, signed Supabase URL pinning and attachment MIME/size checks.

## Do not commit

Never commit service-role keys, secret keys, passwords, auth tokens, `.env` files, Android keystores, signing credentials, generated APK/AAB files, Windows installers, production backups or customer data.

## Release rule

Security-sensitive changes should pass the project security and regression checks before release packaging.
