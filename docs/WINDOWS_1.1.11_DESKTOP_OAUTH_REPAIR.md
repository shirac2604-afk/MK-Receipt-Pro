# Windows 1.1.11 — Desktop OAuth client repair

## Reason

After 1.1.10 correctly removed the legacy Calendar OAuth fallback, Google still returned client_secret is missing. That response identifies the configured OAuth client as a confidential web client. Version 1.1.11 replaces it with the public client ID supplied for the Google Cloud Desktop app credential.

## Scope

- Google Drive OAuth client ID only.
- No client secret is stored or distributed.
- No Supabase configuration, schema, authentication setting, or business data changes.
- Installer remains an in-place update.

## Manual verification

1. Install the 1.1.11 setup file over the current app.
2. Select the Google connection button.
3. Approve the Google consent page.
4. Confirm Google Drive changes to connected and completes its first sync.
