# Android — cloud branding and student management

## Purpose

This change fixes two functional gaps in the Android application:

1. The business logo already stored in the private cloud storage is now rendered on the Android dashboard.
2. The **Students** tab now manages the shared cloud student list, instead of opening the temporary local-data protection screen.

## Scope and safety

- No Supabase schema, migration, policy, secret, bucket setting, or production configuration is changed.
- No receipt, payment, invoice, or financial calculation is changed.
- The Android app uses the authenticated business identifier supplied by `BusinessContext`.
- Every student read, update, insert, and archive operation is filtered by `business_id`; Supabase Row Level Security remains the server-side authorization boundary.
- The student interface does not use `StudentLocalStore`.

## Existing staging infrastructure verified

The staging project already contains:

- the `students` and `student_guardians` tables;
- the private `business-branding` storage bucket;
- storage policies for selecting, uploading, updating, and deleting the business branding objects.

Therefore this fix consumes the existing secure infrastructure and introduces no database change.

## Android behavior

### Business logo

The dashboard obtains `logoDataUrl` through the existing business profile service. If a logo is available in the authorized private bucket, it is displayed inside the cloud status badge. If it is unavailable, the app keeps the neutral business icon as a safe fallback.

Uploading or replacing the logo remains in the existing business/settings flow.

### Student management

The Android Students tab now supports:

- loading the active shared student list;
- adding a student;
- editing name, phone, school grade, default price, and focus notes;
- archiving a student after confirmation.

Changes are stored in the cloud and are intended to appear in the Windows application for the same business after refresh.

## Validation included

`npm run verify:cloud-students` checks that:

- the Students tab routes to the cloud screen;
- the screen uses the cloud repository;
- no local student store is used;
- repository mutations are tenant-scoped;
- the dashboard renders the cloud logo when available.

## Manual staging verification

1. Sign in to Android and Windows with accounts belonging to the same business.
2. Confirm the Android dashboard displays the uploaded business logo.
3. Open **Students** on Android and confirm the existing cloud students appear.
4. Add a clearly named non-production test student on Android.
5. Refresh the Windows student area and confirm it appears.
6. Archive that test student on Android and confirm it no longer appears after refresh in Windows.

## Rollout

This documentation and the implementation are delivered through a pull request. A new Android APK must be built from the merged commit before the installed Android application receives these changes.
