# Password recovery — Staging activation and test plan

## Scope

Phase 15 uses Supabase's password-reset link for Android and Windows. Each client sends the request through a short-lived, non-persistent Auth client; the email link then opens the installed app through the exact callback `mkreceiptpro://auth/recovery`.

The app accepts only that scheme, host and path, requires `type=recovery`, bounds both tokens, establishes the recovery session in memory, verifies its user with Supabase, applies the existing password policy, then globally signs out sessions after a successful update. The renderer never receives the recovery URL or its tokens on Windows.

## Staging-only activation

In the **Staging** Supabase project, open Authentication → URL Configuration and add this exact redirect URL to the additional redirect allowlist:

`mkreceiptpro://auth/recovery`

Keep custom SMTP disabled: it is not required for this personal Staging flow. Keep the default Reset Password email as a link using `{{ .ConfirmationURL }}`, not the OTP variable `{{ .Token }}`.

Do not add this callback to Production or change Production Auth settings in this phase. Do not merge to `main` until the Staging checks below pass and a fresh review explicitly approves it.

## Required test cases

Test Android and Windows independently after installing the new build on that platform:

1. Request a reset link for a known account and an unknown address. The UI must use neutral wording and not reveal whether an account exists.
2. Open the email link on the same platform. It must open MK Receipt Pro directly and show the new-password form only after the recovery session is verified.
3. Try a short, overlong, common, or email-derived password. The app must refuse it.
4. Submit a compliant password. Confirm that the new password works and the old password no longer works.
5. Confirm that the app clears the recovery session after completion and that every existing sign-in is disconnected.
6. Request repeated reset links. Confirm the local one-minute cooldown; Supabase Auth server-side limits remain authoritative.
7. If an email-security scanner consumes a link before it is opened, request a fresh link. Do not reuse or share a reset link.

## Explicit non-goals

- No Production Supabase setting is changed.
- No custom SMTP or Gmail configuration is needed.
- No reset token or recovery session is stored persistently.
- No reset token is exposed through Electron preload/IPC.
- No APK or Windows installer is created by this change; each existing package must later be rebuilt and tested as an in-place upgrade.
