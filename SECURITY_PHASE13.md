# Security Phase 13 — Authenticated Password Change

## Status

The Android and Windows source trees now contain a dedicated password-change flow for a user who is already signed in. No APK, Windows installer, Supabase Auth setting or Production deployment was changed in this phase.

## Controls added

- The current Supabase user is fetched from the server before a password change.
- The current password is verified with `signInWithPassword`; a session alone is not enough.
- The reauthenticated user ID must match the user ID that started the operation.
- Windows also forces a fresh active-device check before reauthentication.
- Only after those checks does the client call `updateUser({password:newPassword})`.
- The new password must be different, contain 8–128 characters, avoid a small offline common-password list and not contain the email name.
- Password inputs are masked, bounded to 128 characters, cleared after success and never persisted or included in application logs.
- Electron exposes one typed IPC operation. Authentication errors returned to the renderer are mapped to fixed Hebrew messages rather than raw Supabase errors.
- Both release gates include a dedicated password-change verifier.

## Recovery boundary

“Forgot password” was intentionally not implemented in this phase. Phase 15 supersedes this recovery boundary only: it uses the Staging-only callback `mkreceiptpro://auth/recovery` for the installed Android and Windows applications. Both clients keep `detectSessionInUrl:false` and establish the recovery session only after explicit route, type, length and user verification.

The recovery session is non-persistent, validates the authenticated user before `updateUser`, and globally signs out after success. On Windows the main process owns the callback and no recovery token crosses preload/IPC. Do not broaden the custom protocol or Android callback surface without a separate trust model and cross-platform manual tests.

## Supabase rollout boundary

Keep Supabase Secure Password Change and minimum-password Production settings unchanged until these source changes have been built and manually tested in Staging. After both clients are released and the recent-auth flow is verified, evaluate the server setting in Staging first and then Production.

## Automated evidence

- `python3 scripts/verify-security-phase13.py`
- Android: `npm run verify:password-change`
- Windows: `npm run check:password-change`
- Android and Windows TypeScript checks
- `git diff --check`

## Manual release checks

1. Correct current password plus an accepted new password succeeds on Android and Windows.
2. Wrong current password is rejected without changing the password.
3. Mismatched confirmation, unchanged password, short, overlong, common and email-derived passwords are rejected.
4. A remotely revoked Windows device cannot change the password.
5. After success, sign out and verify that the old password fails and the new password succeeds on each released client.
