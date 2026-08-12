# 1.1.0-dev.22 — Google OAuth Desktop client secret support

- Sends `client_secret` during authorization-code exchange.
- Sends `client_secret` during refresh-token exchange.
- Secret is intentionally not embedded in the downloadable project.
- Adds a local configuration command: `npm run google:configure`.
- Retains PKCE, narrow Drive scope, encrypted refresh token storage and conflict protection.
