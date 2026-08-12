# 1.1.0-dev.18 — Direct Google Drive sync

- OAuth 2.0 Desktop-app connection with PKCE and loopback redirect.
- Uses the narrow `drive.file` scope.
- Refresh token stored with Electron safeStorage.
- One cloud sync bundle managed through Google Drive API.
- Automatic push scheduling after business-data changes.
- Startup comparison of cloud and local state.
- Safe conflict detection: no silent overwrite when both computers changed.
- Manual conflict resolution: use cloud or use this computer.
- Local backup remains available and separate.
