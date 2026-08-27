# Android full update build baseline

## Purpose

This document records the approved Android update build requested on 2026-08-27.

The APK must be built from the current `main` baseline at commit:

```
6c7f283fd6a73b21ec824563bcb92bda87dbf21f
```

This produces an in-place update for the existing Android application identity:

```
il.mkreceiptpro.android
```

The Android EAS profile uses remotely managed versioning with automatic incrementing. The generated APK therefore receives a higher Android build number and is installable over the existing app when it is signed by the same Expo/Android credentials.

## Included source

The build uses all Android-relevant changes merged into `main` through this baseline, including:

- authentication and session hardening;
- password change and reset-link recovery flow;
- Android package and source-integrity checks;
- current cloud-account and shared-business-cloud functionality;
- existing receipt, student, calendar, reminder, attachment and privacy safeguards.

The Windows-only Google Drive OAuth repair is intentionally not presented as an Android feature. It remains in the shared repository but affects only the Windows desktop client.

## Required release gate

Run the existing **Android Production APK** GitHub Actions workflow from `main`.

It performs:

1. `npm ci`;
2. `npm run release:check`;
3. signed internal Android APK submission through Expo EAS using the configured `EXPO_TOKEN`.

The workflow itself does not publish a GitHub artifact because Expo EAS hosts the signed APK. Record the Expo APK download URL and the completed workflow run in the related pull request after the build completes.

## Manual acceptance

Before treating the release as complete:

1. Install the APK over the existing Android application.
2. Confirm that existing local data opens normally.
3. Sign in to the shared business cloud using the same account used on Windows.
4. Confirm password recovery opens through the reset link.
5. Create and remove a non-financial test item; do not use a receipt as a test record.
