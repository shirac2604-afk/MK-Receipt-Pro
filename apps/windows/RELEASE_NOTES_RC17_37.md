# RC 17.37 — Fixed-width and simulator alignment

- Added a byte/offset audit for INI.TXT and BKMVDATA.TXT.
- The audit verifies record lengths, CRLF, field offsets, record totals, business number, primary ID and INI summaries.
- Registration fixture produces exactly 2,002 records and uses a non-zero temporary registration value for simulator testing only.
- Accounting type for the receipts-only fixture/export is marked as single-entry (1), not irrelevant (0).
- Format constant is emitted in the byte order currently required for the next official simulator verification: `&OF1.31&`.
- No receipt, customer or backup logic was changed.
