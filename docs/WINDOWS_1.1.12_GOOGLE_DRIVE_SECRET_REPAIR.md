# Windows 1.1.12 — Google Drive local OAuth secret repair

## Why this release exists

The Google Drive Desktop OAuth client is correct, but Google returned `client_secret is missing` during token exchange. The previous Windows implementation had local secret support; a later repair removed it from the Google Drive flow.

## Change

- Restores optional `client_secret` submission for the authorization-code and refresh-token exchanges.
- Adds a **Google Client Secret** field in **גיבוי ו־Google Drive**.
- The value is saved only on the Windows machine using Electron/Windows secure storage.
- No client secret is committed to GitHub, bundled in the installer, shown in diagnostics, or sent to any service other than Google's token endpoint.
- Retains PKCE, the loopback redirect, encrypted refresh-token storage, narrow `drive.file` scope, and conflict protection.

## Manual verification

1. Install 1.1.12 over the existing Windows application.
2. In **גיבוי ו־Google Drive**, enter the Gmail address and the Client Secret from the Desktop OAuth client.
3. Click **שמירה והתחברות עם Google** and approve in the system browser.
4. Confirm the status is **מסונכרן**, then create a small change and use **סנכרן עכשיו**.

Never paste the Client Secret into GitHub or a chat.
