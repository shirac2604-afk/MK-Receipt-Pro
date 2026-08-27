# Windows 1.1.9 — Production upgrade

## Purpose

This is the in-place Windows update for the daily-work application after the Phase 15 Staging installer proved unsuitable for normal cloud and Google use.

## Cloud target

The manual GitHub Actions workflow **Windows 1.1.9 Production Upgrade** copies `SupabaseCloudConfig.production.ts` only inside its runner. The produced installer uses the existing Production Supabase project and stable Windows app ID `il.co.mkreceipt.desktop`.

## Google OAuth

The bundled Google OAuth identifier is a Desktop public client ID. It supports the loopback + PKCE flow without a packaged client secret. No client secret, refresh token, password, or user data is stored in GitHub or in the installer.

The Google Cloud OAuth consent screen must permit the account used for the application. If it is in Testing mode, add the account as a test user in Google Cloud before attempting connection.

## Installation and verification

1. Download the artifact only from the successful GitHub Actions run.
2. Verify the setup executable against `SHA256SUMS.txt`.
3. Close MK Receipt Pro and install over the existing Windows application. Do not uninstall first.
4. Sign in to the existing Production cloud account and confirm customers, receipts and expenses are visible.
5. Connect Google Drive and verify the authorization completes without `client_secret is missing`.
6. Confirm the Android application remains connected to the same business.
7. Test password recovery separately before treating it as production-ready.

## Boundaries

- This workflow makes no Supabase schema or Auth-dashboard change.
- The installer is an update to the existing app, not a second application.
- The release is not complete until the CI run and the above manual checks are recorded in the PR.
