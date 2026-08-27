# Windows 1.1.10 — Google Drive repair

## Why this update exists

The first 1.1.9 production upgrade selected the correct Desktop OAuth client in the packaged resources, but a legacy Google Calendar configuration stored on the PC could take precedence. That configuration may be a confidential web OAuth client and causes Google to return `invalid_request: client_secret is missing`.

## Fix

Google Drive now always chooses the packaged **Desktop OAuth** client for its PKCE desktop flow. The app does not bundle or require a Google client secret.

## Installation

1. Download the artifact from the **Windows 1.1.10 Google Drive Repair** workflow.
2. Extract the ZIP and optionally verify `SHA256SUMS.txt`.
3. Close MK Receipt Pro and run `Maptehot-LaHatzlaha-1.1.10-Setup.exe` over the existing installation.
4. Open the app and choose **התחברות עם Google**.
5. Complete Google consent, then confirm the status changes to connected.

## Scope

- Production cloud configuration is selected only in the GitHub Actions build runner.
- No Supabase schema, authentication settings, or business data is changed.
- This change and the workflow are documented in GitHub under the repository documentation rule.
