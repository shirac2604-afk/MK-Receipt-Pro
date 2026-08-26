# Phase 15 — Staging upgrade builds

## Fixed target

The Phase 15 branch targets only Supabase project `MK-Receipt-Pro-Phase9-Staging` (`ymcmmvnfrfntmllytpyu`). It must not contact the Production project (`noimclnzzuxcszdotmby`) while password recovery is tested.

The exact callback is `mkreceiptpro://auth/recovery`. It was allowlisted in the Staging project's Auth URL Configuration on 2026-08-26.

## Windows

Run the manual GitHub Actions workflow **Phase 15 Staging Windows Installer**. It copies the dedicated Staging configuration only inside the runner, preserves the stable app ID `il.co.mkreceipt.desktop`, creates an unsigned internal NSIS installer, and uploads a SHA-256 checksum. The artifact expires after seven days.

This is an in-place upgrade for a device that already has the Windows app. Because it uses Staging, sign in with a Staging account after the upgrade; do not use it as a Production installer.

## Android

The Android source default remains Production. The manual **Phase 15 Staging Android APK** workflow copies the isolated Staging configuration only inside its runner and retains the stable package ID `il.mkreceiptpro.android`. Run it after the repository secret `EXPO_TOKEN` is configured for the `shirac` Expo account. Its output is an internal APK profile (`production-apk`), not a Play Store submission.

## Release boundary

No Production Auth setting, Supabase URL, app identifier, or `main` branch is changed by these builds. After both manual recovery tests pass, review separately before any Production release.

## Personal Production build

Password recovery is deliberately disabled and hidden in the personal Production Android and Windows builds. It remains available only in the isolated Staging build configurations; Production does not need the recovery redirect URL.
