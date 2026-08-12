# Tax Authority Open Format — Simulator Fixture RC3

## Purpose

This stage creates a synthetic, privacy-safe dataset for preflight testing of the Israeli Tax Authority Open Format 1.31 output.

## Generated dataset

- 1 A100 opening record
- 1,000 C100 receipt header records
- 1,000 D120 receipt payment-detail records
- 1 Z900 closing record
- Total: 2,002 records

All customers, numbers and amounts are synthetic. The fixture must never be submitted as the real business export.

## Commands

```powershell
npm run test:tax-open-fixture
```

Outputs are written to:

```text
test-output/tax-open-simulator-fixture/
```

## Files

- INI.TXT
- BKMVDATA.TXT
- BKMVDATA.TXT
- REPORT-2.6.html
- REPORT-5.4.html
- SIMULATOR-FIXTURE-SUMMARY.json
- PREFLIGHT-RESULT.json

## Local preflight checks

- Fixed record lengths
- CRLF termination
- Consecutive record sequence
- Opening and closing records
- Consistent business number and export identifier
- Z900 total record count
- INI.TXT A000 total
- INI.TXT summary counts
- Minimum 2,000-record test target

The local preflight does not replace the official Tax Authority simulator and does not constitute approval or registration.
