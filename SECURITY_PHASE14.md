# Security Phase 14 — Source and Lockfile Integrity

## Status

The Android and Windows npm lockfiles were found to contain tool-output truncation markers and incomplete JSON. The application workflows that used `npm install` could regenerate dependency state and continue, which hid the loss of reproducibility. Phase 14 restores both lockfiles from their last complete Git objects, aligns their package metadata with the current application versions and makes malformed tracked JSON a blocking CI failure.

No application feature, Supabase configuration, installer, APK or Production deployment is changed in this phase.

## Controls added

- Every tracked JSON file must parse successfully.
- Tracked files are rejected if they contain known tool-output truncation markers.
- Android and Windows `package-lock.json` files must use lockfile version 3.
- Lockfile name, version and direct dependency maps must match the corresponding `package.json`.
- A dedicated Phase 14 workflow performs exact `npm ci` installs and TypeScript checks for both applications.
- The existing Phase 8 supply-chain workflow now uses `npm ci` instead of allowing `npm install` to rewrite dependency state.

## Recovery evidence

- Android lockfile restored from the last complete Git object and aligned to package version `1.0.8`.
- Windows lockfile restored from the last complete Git object and aligned to package version `1.1.7`.
- Direct dependencies and development dependencies match the current package manifests.
- The Phase 14 static gate rejects the previously committed corrupted files.

## Automated evidence

- `python3 scripts/verify-source-integrity.py`
- Android: `npm ci --ignore-scripts --no-audit --no-fund` and `npm run check`
- Windows: `npm ci --ignore-scripts --no-audit --no-fund` and `npm run typecheck`
- Existing Phase 8 supply-chain audits
- `git diff --check`

## Release boundary

Passing source-integrity checks restores deterministic dependency installation; it does not by itself publish a release. APK and Windows installer builds remain separate, explicitly approved release actions.
