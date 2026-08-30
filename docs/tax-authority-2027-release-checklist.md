# Tax Authority API 2027 — HOLD / Release Checklist

Status: **PREPARED, NOT CONNECTED, DO NOT MERGE YET**

Target window: before 2027-01-01.
Source baseline: Israel Tax Authority API instructions, edition 1.0 / March 2026.

## What is already prepared

- API contract and validation for upload-link requests.
- Sandbox and production endpoint configuration from the March 2026 specification.
- OAuth2 Bearer-token provider boundary. No credentials are embedded in source code.
- Resumable upload flow: signed URL initiation, Location session URL, PUT chunks and Content-Range.
- 1 MB chunk support.
- Status lookup by fileUniqueId and status mapping for Uploaded / Approved / Rejected.
- Local persistence foundation for transmission identifiers and statuses.
- No persistence of access tokens, refresh tokens, signUrl or upload session URLs.
- Offline orchestration tests using mocks.
- Production guard remains closed.
- Current 2026 open-format generation and reports are unchanged.

## Explicit HOLD conditions

Do not merge this branch into main and do not include it in the current installer while any item below is unresolved:

- Production API availability has not been reconfirmed from a current Tax Authority publication.
- OAuth scopes / authentication procedure have not been reconfirmed.
- Production status endpoint has not been reconfirmed.
- Sandbox has not been confirmed to accept the actual INI.TXT and BKMVDATA.TXT payloads.
- End-to-end upload has not been executed in an officially supported test environment.

## Final verification before release

1. Obtain the newest Tax Authority API document and compare it to edition 1.0 / 3.2026.
2. Reconfirm upload-link URLs for Sandbox and Production.
3. Reconfirm the file-status endpoint and request/response schema.
4. Reconfirm OAuth2 flow, scopes, callback requirements and token lifetime rules.
5. Reconfirm accepted file names, MIME types and maximum sizes for INI.TXT and BKMVDATA.TXT.
6. Reconfirm resumable upload status codes and chunk-size rules.
7. Run the official Sandbox end-to-end flow with non-production test data.
8. Verify that fileUniqueId values returned by the API are persisted and later resolve to Uploaded/Approved/Rejected.
9. Verify a rejected-file response and that its description/error information is retained locally.
10. Run TypeScript typecheck, Vitest, database migration tests, Windows build and security workflows.
11. Run `node scripts/verify-tax-authority-2027-prep.mjs` from `apps/windows`.
12. Review the diff against main and confirm no current receipt/open-format behavior changed unintentionally.
13. Only after all checks pass: connect the feature to application IPC/UI behind an explicit feature flag.
14. Build a release candidate, test on a clean Windows installation, and only then merge/release.

## Release-blocking security rules

- Never commit OAuth client secrets, access tokens or refresh tokens.
- Never store access/refresh tokens in the application database.
- Never store signed upload URLs or resumable upload session URLs as long-term state.
- Production must remain disabled by default until final approval/revalidation.
- Current 2026 tax-report flow must remain operational and independently testable.

## Intended future UI statuses

When the feature is eventually connected to the application, expose only business-safe status information:

- ממתין לשידור — Pending
- הועלה — Uploaded
- אושר — Approved
- נדחה — Rejected
- שגיאה — Error

Do not expose OAuth tokens, signed URLs, raw authorization headers or internal credentials in the renderer.
