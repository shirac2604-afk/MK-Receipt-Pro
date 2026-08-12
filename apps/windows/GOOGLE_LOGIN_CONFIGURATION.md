# Google Login configuration

Version 1.1.0-dev.20

The Google OAuth Desktop Client ID for MK Receipt Pro is configured in the build.

End-user flow:
1. Enter Gmail address.
2. Click "התחברות עם Google".
3. Google opens in the browser.
4. Approve access.
5. MK Receipt Pro stores the approved account connection securely.

The Google Client Secret is not used or stored in MK Receipt Pro.

Scopes:
- openid
- email
- https://www.googleapis.com/auth/drive.file
