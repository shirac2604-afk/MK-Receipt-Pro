# Password recovery — Staging activation and test plan

## Scope

Phase 15 adds a password-recovery flow for the Android and Windows clients. It uses a short-lived, non-persistent Supabase Auth client only for recovery. The normal application session is not reused for that flow.

The code can be requested only with an email address, then verified with the same normalized address and a numeric one-time password (OTP). The client does not configure a custom URL scheme, intent filter, redirect URL or callback handler.

## Staging-only activation

Before functional testing, configure the **Staging** Supabase project's Authentication > Email Templates > Reset Password template to include the recovery token as `{{ .Token }}`. This is an administrative configuration step; it is deliberately not automated by the client or this repository.

Do not apply this template change to Production until the staging checks below have passed, a fresh review approves the production change, and the recovery PR is explicitly approved for merge.

## Required test cases

Test both Android and Windows against Staging:

1. Request a code for a known account and an unknown address. The UI must show the same neutral success text.
2. Enter a wrong or expired code. The password must remain unchanged and the client must not retain a recovery session.
3. Submit passwords that violate the existing 8–128 character/common-password/email-derived-password policy. The update must be refused.
4. Complete recovery with the correct email, code and compliant password. Verify that the old password no longer works and the new one does.
5. Verify that the prior normal session and the temporary recovery session are both signed out after a successful update.
6. Request repeated codes and submit repeated invalid codes. Confirm the client-side cooldown/window messages appear. These controls are only a load-reduction measure; Supabase Auth server-side rate limits remain the authoritative protection.

If global sign-out fails after a password update, treat the recovery as incomplete: do not claim success, clear the local session, and ask the user to request a new code.

## Explicit non-goals

- No Production Supabase setting is changed by this phase.
- No deep link, custom callback protocol, Android intent filter or redirect allowlist is added.
- No account-existence information is shown to the person requesting a code.
- No recovery code, password or session token is logged or stored persistently.
