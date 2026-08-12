# Incoming source archives

This folder is used only for the one-time import of the two verified release-source archives into the browsable GitHub source tree.

Expected files:

- `MK-Receipt-Pro-Android-1.0.5-SECURITY-DEVICE-MGMT-FULL.zip`
  - SHA-256: `8a2847b7aab7bb7608bc4ff2e72464fb953d12aac2cdfa216d1e6923e3732485`
- `MK-Receipt-Pro-Windows-1.1.4-SECURITY-DEVICE-MGMT-FULL.zip`
  - SHA-256: `01091a8e359fd905b2c1a8ef467136298e1ad34765ae17ad2828f8a3b53583e7`

When both exact archives are uploaded, `.github/workflows/import-source-archives.yml` verifies their hashes, extracts them into `apps/android` and `apps/windows`, removes local/private/build artifacts, deletes the ZIP files, and commits the source tree.

Do not use this folder for APK, AAB, EXE, keystores, `.env`, secrets or production data.
