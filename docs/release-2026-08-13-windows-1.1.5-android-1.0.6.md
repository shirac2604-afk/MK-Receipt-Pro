# Production Release — Windows 1.1.5 / Android 1.0.6

Release date: 2026-08-13

## Source of truth

- Main merge commit: `31fe996843c70f3447df0c5324071f4dde19dec0`
- Windows version: `1.1.5`
- Android version: `1.0.6`
- Android versionCode: `8`
- Android package: `il.mkreceiptpro.android`
- Windows appId: `il.co.mkreceipt.desktop`

## Security and hardening included

- Expo SDK 56 / React Native 0.85.3 Android upgrade and release gates.
- Android SecureStore/session, signed URL, attachment boundary, device management and build-asset safety hardening.
- `uuid` dependency override to patched 11.1.1.
- Documented `image-size` / Metro upstream exception with CI policy and source-asset mitigation.
- Windows Electron sender pinning, IPC/file capability controls, production hardening and device-management checks.
- Windows Google OAuth changed to desktop public-client + PKCE without bundling or sending a client secret.
- Static secret scanning expanded to cover Google OAuth client secrets.
- Tenant isolation validated in an isolated Supabase staging project across reads, writes, storage and sensitive RPC boundaries.

## Windows release artifact

Expected installer name: `Maptehot-LaHatzlaha-1.1.5-Setup.exe`

SHA-256:

`21532af25f60ad12f87f7476019653d9ac1c394cb7e140692ae642972c312e9d`

The current Windows installer is intentionally built without code signing because no signing certificate / Trusted Signing credential is configured in the repository. The package is technically valid, but Windows SmartScreen may warn users until signing is added.

## Android production artifact

Production store build profile: `production` in `apps/android/eas.json` (AAB).

Build from `apps/android` with the existing EAS account and Android signing credentials:

`npx eas-cli build --platform android --profile production`

The production AAB must be signed with the same application signing lineage already associated with the existing app. Do not create or replace signing credentials during release unless intentionally rotating keys through the store-supported process.

## Verification status

Release candidate passed:

- Windows TypeScript
- Windows production hardening gates
- Windows file-capability and intrusion hardening gates
- Windows NSIS production build
- Windows dependency audit
- Android Expo Doctor
- Android full `release:check`
- Android TypeScript
- Android dependency audit policy
- Static secret/workflow pinning gate

Post-merge Supply Chain verification is required on `main` before publishing the final binaries.
