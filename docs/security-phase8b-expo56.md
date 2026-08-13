# Security Phase 8B — Android Expo SDK 56

## Scope

Phase 8B is a controlled Android security/toolchain experiment. It upgrades the Android app to Expo SDK 56 while keeping `main` unchanged until the branch passes all automated and manual gates.

## Version context

- Package version: `1.0.6-security.8b`
- Expo SDK: `~56.0.0`
- React: `19.2.3`
- React Native: `0.85.3`
- Production app metadata remains:
  - app version `1.0.5`
  - Android `versionCode` 7

## Dependency security work

### uuid

The transitive `uuid` advisory was reached through Expo configuration tooling. An isolated experiment pinned the transitive dependency with:

```json
"overrides": {
  "uuid": "11.1.1"
}
```

The experiment and the final Phase 8B branch both passed Expo Doctor, the complete release gate, TypeScript, and GitHub Actions.

Audit impact:

- Before override: 19 vulnerabilities — 11 high, 8 moderate
- After override: 11 vulnerabilities — 11 high, 0 moderate

### image-size / Metro

The remaining 11 high-severity npm audit findings are all descendants of `image-size` through Metro/Expo build tooling.

The affected parser paths concern ICNS and JXL/HEIF formats. There is currently no patched `image-size` release available for these advisories, so this branch deliberately does not use `npm audit fix --force`, Expo downgrade, or a speculative major-version override.

## Mitigation for remaining image-size findings

A repository scan found no `.icns`, `.jxl`, `.heif`, or `.heic` source assets.

Phase 8B adds `scripts/verify-build-asset-safety.mjs`, integrated into `release:check`. The gate fails if any of those formats enter the Android source tree. This reduces reachability of the known vulnerable parser paths during Metro asset processing while an upstream patch is unavailable.

Runtime user-upload paths are separate from Metro source-asset processing and remain protected by the existing Android hardening controls, including MIME allowlisting, magic-byte validation, decoded-size limits, signed-URL host/path checks, and redirect blocking where applicable.

## Validation status

Completed successfully:

- `npx expo-doctor` — 21/21
- `npm run release:check` — PASS
- TypeScript `tsc --noEmit` — PASS
- GitHub Actions Phase 8B workflow — PASS
- APK build — PASS
- Manual device regression test — PASS

Release gates cover production regression, security hardening, production hardening, app icon, EAS dependencies, intrusion hardening, device management, Android boundary hardening, and build-asset safety.

## Merge posture

As of 2026-08-13, the Phase 8B branch is ahead of `main` with no divergence from newer `main` commits. The diff is limited to Android Expo/toolchain configuration, verification scripts, security mitigation, and CI.

The remaining npm audit findings are accepted only as upstream build-tooling findings with an explicit source-asset mitigation. They are not considered fixed, and should continue to be monitored for an upstream `image-size` / Metro / Expo patch.

Do not run `npm audit fix --force` on this branch.
