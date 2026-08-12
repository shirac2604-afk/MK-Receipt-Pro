# Security Phase 8 — Dependency & Supply-Chain Audit

Status: **audit completed; Android known-risk baseline requires monitoring; no forced dependency downgrade/major upgrade accepted as a security fix.**

## Results

### Windows

`npm audit --omit=dev` on a fresh dependency graph:

- critical: 0
- high: 0
- moderate: 0
- low: 0
- total: 0

Windows runtime dependency baseline is clean at the time of this audit.

### Android — current Expo SDK 54 baseline

`npm audit --omit=dev` reported:

- critical: 0
- high: 11
- moderate: 7
- total: 18

High findings were associated with the Expo / Metro / React Native dependency chain, including packages such as `@expo/cli`, `@expo/metro`, `metro`, `image-size`, `postcss`, `@react-native/community-cli-plugin` and `react-native`.

The advisories include build/tooling risks such as image parser denial-of-service and PostCSS source-map / CSS processing issues. They must not be described as harmless merely because several affected packages are used by bundling/build tooling: the build pipeline is part of the software supply chain.

## Expo SDK 57 isolated evaluation

A CI-only temporary upgrade was performed. No SDK 57 dependency change was committed to the Android application.

Temporary workspace procedure:

1. Node 22.13.x.
2. Install `expo@^57.0.0`.
3. Run `npx expo install --fix --npm`.
4. Remove the obsolete `androidNavigationBar` field only in the temporary workspace because the SDK 57 app-config schema rejects it.
5. Run Expo Doctor, TypeScript and the existing MK Receipt Pro security gates.
6. Re-run runtime npm audit.

Compatibility results:

- Expo Doctor: 20/20 PASS.
- TypeScript: PASS.
- Android security hardening: 8/8.
- Intrusion hardening: 10/10.
- Device management: 8/8.
- Android boundary hardening: 11/11.

Dependency-audit result after the temporary SDK 57 upgrade:

- critical: 0
- high: 11
- moderate: 8
- total: 19

Therefore a major Expo upgrade does **not** remediate the current high-severity audit baseline by itself. `npm audit` also proposed semver-major and in some cases backward/downgrade-style fixes, so automatic `npm audit fix --force` is explicitly prohibited for this project.

## Android known-high baseline

Until upstream-compatible remediation is available and verified, CI may tolerate only the exact documented high-package set below, while still failing on:

- any critical vulnerability;
- a high count greater than 11;
- a new high-severity package outside the documented set.

Known high package names at this audit:

- `@expo/cli`
- `@expo/metro`
- `@expo/metro-config`
- `@react-native/community-cli-plugin`
- `expo`
- `image-size`
- `metro`
- `metro-config`
- `metro-transform-worker`
- `postcss` (SDK 54 baseline; SDK 57 graph may change this set)
- `react-native`

Because the dependency graph can change between npm installs, the gate must report the complete current set on every run. Any change requires review, not silent acceptance.

## Rules

- Never use `npm audit fix --force` automatically.
- Never downgrade Expo or React Native solely because npm audit suggests a semver-major fix.
- Expo / React Native upgrades require a dedicated branch, Expo Doctor, TypeScript, all project security/regression gates, APK build and manual device testing.
- Dependency advisories must be reviewed periodically and before every Production release.
- The existence of a documented exception is not the same as vulnerability remediation.
