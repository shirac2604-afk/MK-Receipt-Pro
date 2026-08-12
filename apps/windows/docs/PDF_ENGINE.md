# PDF Engine 0.4.0

- A4 PDF generated from immutable receipt snapshots.
- Hebrew RTL layout using Electron Chromium `printToPDF`.
- Original file saved under `Documents/MK Receipt Pro/Receipts/YYYY/MM`.
- Original PDF is never overwritten.
- Atomic temporary-file write and SHA-256 file hash.
- Database migration 003 stores PDF path, hash, size, template version and creation time.
- PDF failure does not delete or renumber the issued receipt.
