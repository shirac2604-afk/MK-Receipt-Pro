# RC 17.42

- Fixed IPC crash when the receipt sequence row is missing.
- The application now safely reconstructs the sequence from the highest existing receipt number.
- Updated registration fixture validation to expect 2,006 records (including 100B/110B examples).
- No receipt data is deleted or renumbered.
