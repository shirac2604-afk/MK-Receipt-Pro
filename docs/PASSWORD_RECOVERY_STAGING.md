# Password recovery — Staging activation and test plan

## Scope

Phase 15 uses the Supabase password-reset link flow for Android and Windows. The clients request a reset email through a short-lived, non-persistent Auth client. The password itself is changed only on the dedicated HTTPS reset page after Supabase authenticates the recovery link.

The clients do not verify recovery OTPs locally and do not add an Android URL scheme, intent filter or custom callback protocol.

## Staging-only activation

The Staging Supabase project must allow this exact redirect URL in Authentication > URL Configuration:

`https://ymcmmvnfrfntmllytpyu.supabase.co/functions/v1/password-reset`

The reset email then redirects to the deployed `password-reset` Edge Function, which presents the new-password form and calls `updateUser` using the temporary recovery session.

Do not add this redirect URL to Production during Phase 15. Do not change Production Auth settings until the Staging checks below pass and a fresh review explicitly approves the production change.

## Required test cases

Test both Android and Windows against Staging:

1. Request a reset link for a known account and for an unknown address. The UI must use neutral wording and must not reveal whether the account exists.
2. Open the email link in a normal browser. The HTTPS reset page must show a password form only after the recovery session is established.
3. Submit a password that violates the existing 8–128 character/common-password/email-derived-password policy. The reset must be refused.
4. Submit a compliant password. Confirm that the new password works and the old password no longer works.
5. Confirm that the reset page signs out its recovery session after a successful update and does not persist credentials or recovery tokens.
6. Request repeated reset links. Confirm the client cooldown is enforced; Supabase Auth server-side rate limiting remains the authoritative protection.
7. Repeat the flow on both platforms and confirm no Android deep link or Windows custom protocol is required.

## Explicit non-goals

- No Production Supabase setting is changed by this phase.
- No Android deep link, custom callback protocol or intent filter is added.
- No password or reset token is stored persistently by the clients.
- No account-existence information is shown to the person requesting recovery.
- No APK/installer is a new application; the eventual release must be an in-place upgrade of the existing package identities.
