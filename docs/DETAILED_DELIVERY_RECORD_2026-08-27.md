# Detailed delivery record — 2026-08-27

## Scope and source baseline

This record documents the completed delivery work for MK Receipt Pro as of 2026-08-27.

| Item | Recorded value |
| --- | --- |
| Repository | `shirac2604-afk/MK-Receipt-Pro` |
| Android application ID | `il.mkreceiptpro.android` |
| Windows desktop application ID | `il.co.mkreceipt.desktop` |
| Android full-update baseline | `0f8addf2db38aec81df2a40c21c2b47f7a5ecf85` |
| Windows Google Drive repair baseline | `6c7f283fd6a73b21ec824563bcb92bda87dbf21f` |
| Production backend change | None performed in this delivery |

The two application IDs are preserved. Both installers are intended to update the existing application in place, not create a second installation.

## Windows delivery — 1.1.12

### User-reported issue

Google Drive authorization in the Windows application failed with:

```
invalid_request — client_secret is missing (HTTP 400)
```

The supplied Google OAuth client was verified as a **Desktop** client. The configured Google project still required a client secret in its token exchange.

### Implemented repair

PR [#21](https://github.com/shirac2604-afk/MK-Receipt-Pro/pull/21) restored support for an optional local Google OAuth client secret in the Windows desktop client.

The implementation:

- adds a local secure-storage path for the secret;
- encrypts the value through Electron `safeStorage`;
- allows the Windows Google Drive settings screen to save the secret locally;
- submits `client_secret` only when a local value is configured;
- includes the optional secret in both authorization-code exchange and refresh-token exchange;
- keeps the secret out of GitHub, the application package, and logs.

Relevant source areas are:

- `apps/windows/apps/desktop/electron/main/GoogleDriveSyncService.ts`
- `apps/windows/apps/desktop/electron/ipc/databaseHandlers.ts`
- `apps/windows/apps/desktop/electron/preload/preload.ts`
- `apps/windows/apps/desktop/renderer/src/main.tsx`

### Windows build evidence

| Item | Result |
| --- | --- |
| Pull request checks | 8 of 8 passed before merge |
| Windows staging installer workflow | Run `33059049801` — success |
| Windows installer artifact | Artifact `9640940458` |
| User verification | Google authorization succeeded after enabling Google Drive API in the matching Google Cloud project |

The Windows repair is Windows-only. It does not add Google Drive synchronization to Android.

## Android full-update delivery

### Included source

The Android APK build is sourced from the current `main` baseline and includes all Android-relevant work merged through the recorded commit, including:

- authentication and session hardening;
- password-change protections;
- password recovery through reset link;
- Android source-integrity and package-boundary safeguards;
- shared business-cloud account functionality;
- existing receipt, student, calendar, reminder, attachment, and local-privacy functionality.

The Windows Google Drive OAuth secret repair remains platform-specific and is not represented as an Android feature.

### Upgrade compatibility

| Requirement | Status |
| --- | --- |
| Existing Android package kept | Yes — `il.mkreceiptpro.android` |
| Signed internal APK profile | Yes — Expo EAS `production-apk` |
| Automatic Android build number increment | Enabled through EAS remote versioning |
| Installation over existing app | Intended, provided the existing app uses the same application ID and signing credentials |

The build configuration is in:

- `apps/android/app.json`
- `apps/android/eas.json`
- `.github/workflows/android-production-apk.yml`

### GitHub release gate

PR [#22](https://github.com/shirac2604-afk/MK-Receipt-Pro/pull/22) added the Android build baseline and acceptance procedure. It was merged as commit:

```
0f8addf2db38aec81df2a40c21c2b47f7a5ecf85
```

The required Supply Chain check completed successfully:

| Check | Run | Result |
| --- | --- | --- |
| Security Phase 8 Supply Chain | `33061095839` | Success |

The user then started the existing **Android Production APK** workflow from `main`.

| Build action | Run | Result |
| --- | --- | --- |
| Android Production APK GitHub Actions workflow | `33061357010` | Success |
| Dependency installation | Passed |
| `npm run release:check` | Passed |
| Expo token availability check | Passed |
| Signed internal APK submitted to Expo EAS | Submitted successfully |

Expo EAS build record:

- [Android APK build status](https://expo.dev/accounts/shirac/projects/mk-receipt-pro-android/builds/370baec8-2fd6-4e70-8c1d-856d48377833)

### Current APK status

GitHub completed the submission successfully. Expo EAS performs the actual Android compilation after that submission.

**The APK must not be described as downloadable or installation-tested until the Expo build page reports completion.** After it completes, record the final APK URL and the Android manual-installation result in this document or in the related pull-request discussion.

## Required manual acceptance after the APK completes

1. Download the final APK from the Expo build page.
2. Install it over the existing Android application; do not uninstall the existing app first.
3. Verify the existing local data opens normally.
4. Sign in to the shared business cloud with the same account used on Windows.
5. Confirm the password-recovery path opens through the reset link.
6. Create and remove a non-financial test item, then refresh the other platform to confirm the shared-cloud path. Do not use a receipt as a test record.
7. Record the outcome and any error text in PR #22.

## Important separation of services

| Service | Platform | Purpose |
| --- | --- | --- |
| Google Drive Sync | Windows | Backup/sync feature repaired in Windows 1.1.12 |
| Shared business cloud | Windows and Android | Shared application data through the same business account |
| Expo EAS | Android build service | Produces the signed internal APK |

A successful Google Drive connection on Windows does not by itself move business data into Android. Both devices must be connected to the same shared-business-cloud account for shared data.

## Documentation rule

For this repository, every future source, configuration, security, workflow, build, or delivery change must include a corresponding GitHub record: a pull request, release note or technical document, and a completion comment with the relevant build/check evidence.
