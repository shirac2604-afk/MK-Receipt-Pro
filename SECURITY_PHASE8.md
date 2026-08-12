# Security Phase 8 — Secrets & Supply Chain

Status: in progress.

Goals:
- prevent committed secrets and credentials;
- keep build artifacts/signing material out of Git;
- pin third-party GitHub Actions to immutable commit SHAs;
- audit production dependencies for known vulnerabilities;
- keep CI permissions minimal.

Rules:
- Never commit `.env`, service-role/secret keys, passwords, tokens, Android keystores/signing credentials, production DB dumps, customer data, APK/AAB/EXE/MSI artifacts or private attachments.
- `.env.example` may contain placeholders only.
- GitHub Actions should use immutable action SHAs rather than floating tags.
- Read-only audit workflows use `contents: read` and do not receive project secrets.
- Dependency findings are reviewed before upgrades; do not run `npm audit fix --force` automatically.
