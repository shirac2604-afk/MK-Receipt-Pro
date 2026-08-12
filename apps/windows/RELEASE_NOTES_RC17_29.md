# 1.0.0-rc.17.29 — Registration dossier audit

- Added strict validation of the official simulator PDF.
- Requires valid Preflight, PDF print audit and Open Format header audit.
- Blocks readiness when software registration number is temporary (`00000000`).
- Blocks readiness when manufacturer number in `TXT.INI` is missing.
- Adds `11-REGISTRATION-READINESS.json` to the dossier.
- Fixes the checklist so reports 2.6 and 5.4 are checked as PDF files.
- Includes the core Open Format audit files in the dossier.
