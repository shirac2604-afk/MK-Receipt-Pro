# MK Receipt Pro 1.1.0-dev.7 — Single rolling backup

- Automatic local backup uses one fixed file: `MK-Receipt-Pro-Auto-Latest.mkrbackup`.
- When a local Google Drive sync folder is configured, automatic backup mirrors to one fixed file: `MK-Receipt-Pro-Google-Drive-Latest.mkrbackup`.
- A dedicated **גבה עכשיו ל־Google Drive** action updates that same cloud file.
- Manual backup remains user-selected and is not copied automatically to Google Drive.
- Transfer and pre-restore recovery packages remain explicit separate safety artifacts.
- Automatic backup is refreshed after data-changing operations, avoiding reliance on a clean application shutdown.
