# RC2 build-check correction

The release-candidate verifier still referenced rc.1 after the clean-start promotion to rc.2.
This patch changes only the expected version in `scripts/verify-release-candidate.mjs`.

No application logic, receipt data, clean-start storage, Google Drive sync behavior, or installer configuration was changed.
