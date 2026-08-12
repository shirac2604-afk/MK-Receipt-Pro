# 1.0.0-rc.17.37

## Tax simulator compatibility fix

- Changed the central record code in `INI.TXT` from `000A` to `000A`, following the official simulator error message.
- Updated the production exporter, 2,002-record fixture generator, preflight checks, byte-level checks, header audit, documentation, and generated test fixtures.
- No receipt, customer, backup, or PDF business logic was changed.

## Verified locally

- Generated 2,002 fixed-length records.
- Preflight passed.
- Byte-level audit passed.
- Header audit passed with `000A / 100A / 900Z`.
- Summary cross-check passed.
- Project integrity passed 15/15.
- RC candidate validation passed 17/17.
