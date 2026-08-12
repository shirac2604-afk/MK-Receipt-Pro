# MK Receipt Pro Android 1.0.3 — Security Hardening

- Supabase Auth session moved to Expo SecureStore, with one-time migration from AsyncStorage.
- Phone fields accept only digits and + ( ) - spaces, max 20 characters.
- Business number accepts digits only, 5–15 digits.
- Email validation and max 254 characters.
- Receipt/expense amounts sanitized to numeric decimal input.
- Server-aligned length limits for names, descriptions, notes, address and slogan.
- Dates validated as YYYY-MM-DD.
- Supabase database constraints are already active on the live project.
