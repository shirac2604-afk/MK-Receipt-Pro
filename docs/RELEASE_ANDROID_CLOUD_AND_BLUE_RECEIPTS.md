# Combined release — Android cloud fixes and blue receipt template

## Included changes

### Android cloud branding and student management

- The Android dashboard renders the existing business logo from the authorized private cloud branding bucket.
- The Android **Students** tab now uses the shared, tenant-scoped cloud student repository.
- Android can load, add, edit, and archive active students for the currently authenticated business.
- No Supabase migration, policy, bucket setting, secret, or production configuration was changed.

See [Android cloud branding and student management](ANDROID_CLOUD_STUDENTS_AND_BRANDING_FIX.md) for the data-boundary and manual cross-device verification plan.

### Blue receipt template

The user-approved blue receipt layout is included for both Android and Windows receipt output:

- blue document separator and total section;
- clearer customer, business, payment and amount sections;
- the existing legal wording for an exempt business remains;
- receipt data, numbering, amounts, and business information are not changed;
- receipt template version is advanced to version 2 where applicable.

The receipt layout change is display-only. It does not alter accounting logic or previously generated receipts.

### Expo SDK 57 patch alignment

The Android build dependencies were aligned with the versions required by the installed Expo SDK:

| Dependency | Version |
| --- | --- |
| expo | ~57.0.17 |
| expo-file-system | ~57.0.6 |
| expo-image-picker | ~57.0.14 |
| expo-notifications | ~57.0.15 |
| expo-secure-store | ~57.0.2 |
| expo-sharing | ~57.0.16 |
| expo-sqlite | ~57.0.2 |
| react-native | 0.86.3 |

The package lockfile was regenerated together with these updates. This resolves the previously blocking `expo-doctor` patch-version drift and does not intentionally introduce a framework-major or API change.

## Validation

The pull request CI must pass:

- Expo doctor;
- Android release gate, including TypeScript;
- Android security checks;
- receipt source parity checks;
- Windows type and recovery checks.

## Release test after APK creation

1. Install the APK as an upgrade over the existing Android app.
2. Confirm the app opens and the existing signed-in account is retained.
3. Confirm the dashboard displays the business logo.
4. Add a clearly named test student, then verify it appears in Windows after refresh.
5. Generate a test receipt and confirm it uses the blue template and has the correct existing receipt details.
6. Archive the test student and verify that it disappears from active lists after refresh.

## Rollback

If an unexpected issue occurs before an APK is distributed, close the pull request without merging. After a release, restore the previous application build; no database rollback is needed because this release does not change the Supabase schema or data.
