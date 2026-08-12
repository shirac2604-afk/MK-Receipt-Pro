# RC 17.41 — XML layout alignment

- Rebuilt the simulator fixture using explicit Start_Pos/Length layouts supplied by the official simulator XML tables.
- Locked A000, A100, C100, D120, 100B, 110B and Z900 physical offsets and lengths.
- Kept M100 out of the fixture because the application does not manage inventory.
- Added two balanced 100B journal rows and two matching 110B accounts.
- INI summary rows now use 100B, 110B, 100C and 120D, each exactly 19 characters.
- System constant is exactly `&1.31OF&` at offsets 48/37/37.
