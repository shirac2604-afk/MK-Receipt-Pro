# 1.1.0-dev.21 — Google OAuth diagnostics

- Preserves the Google OAuth token endpoint error code and error description.
- User sees Google's actual OAuth error instead of only HTTP 400.
- Does not log or display access tokens, refresh tokens, authorization codes, or PKCE verifier.
- Google Client ID remains embedded from dev.20.
