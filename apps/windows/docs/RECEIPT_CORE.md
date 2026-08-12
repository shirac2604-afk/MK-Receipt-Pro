# Receipt Core 0.3.0

This milestone adds the first real receipt domain implementation:

- `customers` and `receipts` tables via migration 002.
- Money stored as integer agorot.
- Atomic sequential numbering inside `BEGIN IMMEDIATE` transactions.
- Immutable business, client and receipt snapshots.
- SHA-256 content hashes.
- A first `IssueReceiptService` separated from Electron and React.
- Narrow IPC methods for reading core status and issuing a demo receipt.

The demo button creates a real local test receipt. It is intended only for validating this development foundation.
