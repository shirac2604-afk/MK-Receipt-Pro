# Security Phase 8 — Secrets & Supply Chain

Status: **static secret/workflow hardening complete; Android dependency remediation pending**.

## Completed controls
- `.gitignore` blocks `.env`, keys, keystores, APK/AAB/EXE/MSI artifacts and logs.
- `.env.example` is placeholder-only.
- Static current-tree gate checks blocked filenames and common secret patterns.
- All active third-party GitHub Actions are pinned to immutable commit SHAs.
- Read-only security workflows use `contents: read`.
- The one-time source-import workflow was retired after import completion because re-running it could replace the current hardened source with older archive baselines.
- The completed Phase 5 write workflow was retired to reduce standing `contents: write` automation.
- Windows and Android production dependency audits run independently.

## Audit results — 2026-08-12
- Static secrets / blocked files / action pinning: **PASS**.
- Windows `npm audit --omit=dev --audit-level=high`: **PASS / 0 vulnerabilities**.
- Android `npm audit --omit=dev --audit-level=high`: **FAIL — 18 vulnerabilities (11 High, 7 Moderate)**.
- Android findings are primarily in Expo/Metro transitive dependencies including `image-size`, `postcss` and `uuid`.
- npm's all-fixes path proposes Expo 57, which is a breaking SDK change from the current Expo 54 baseline.

## Android remediation rule
Do **not** run `npm audit fix --force` on the production baseline. Remediation requires a dedicated branch, Expo compatibility review, dependency alignment, `release:check`, TypeScript, EAS APK build and manual device installation/testing before merge or release.

## Secrets/history note
The current-tree scan is clean for the patterns covered by the Phase 8 gate. A clean current tree does not by itself prove that no secret ever existed in all historical Git objects. If a real secret is ever suspected to have been committed, rotate/revoke it first and then perform dedicated history remediation.

## Permanent rules
- Never commit `.env`, service-role/secret keys, passwords, tokens, Android keystores/signing credentials, production DB dumps, customer data, APK/AAB/EXE/MSI artifacts or private attachments.
- `.env.example` may contain placeholders only.
- GitHub Actions use immutable action SHAs rather than floating tags.
- Dependency findings are reviewed before upgrades; never apply breaking `--force` fixes automatically.
