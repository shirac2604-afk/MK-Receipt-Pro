# Database Foundation 0.2.0

## Implemented

- SQLite database stored under Electron `userData`.
- Initial schema migration with checksum tracking.
- SQLite `STRICT` tables.
- Foreign keys enabled.
- WAL journal mode.
- `synchronous=FULL` and five-second busy timeout.
- `BEGIN IMMEDIATE` transactions with rollback.
- Foundation business-settings repository.
- Secure IPC handlers for database health and settings.
- Database health panel in the renderer.
- Automated migration, integrity and rollback smoke tests.

## Initial tables

- `schema_migrations`
- `business_settings`
- `app_settings`
- `receipt_sequences`
- `audit_log`
- `health_checks`

Receipt, customer and template tables will be added with the Receipt Core migrations so their constraints are implemented together with the domain rules.
