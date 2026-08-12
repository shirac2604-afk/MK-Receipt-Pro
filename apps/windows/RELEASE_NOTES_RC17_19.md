# 1.0.0-rc.17.19

## Automatic backup retention

- Automatic receipt backups now use one rolling file: `MK-Receipt-Pro-Auto-Latest.mkrbackup`.
- The previous verified file is retained until the replacement backup passes validation.
- Only the latest automatic backup record remains in the database.
- Manual, transfer and pre-restore backups remain separate and are never overwritten by the automatic backup.
