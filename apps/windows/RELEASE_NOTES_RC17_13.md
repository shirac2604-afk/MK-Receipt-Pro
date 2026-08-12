# 1.0.0-rc.17.13

## Fixed

- Fixed Windows path generation in `scripts/generate-build-metadata.mjs`.
- Replaced URL pathname parsing with `fileURLToPath`, so project paths containing Hebrew or spaces work correctly.
- Prevented invalid paths such as `C:\\C:\\Users\\...` during installer metadata generation.
