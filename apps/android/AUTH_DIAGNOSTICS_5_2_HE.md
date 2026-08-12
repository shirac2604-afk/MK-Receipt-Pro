# Android Foundation 5.2 — Auth Diagnostics

מטרת גרסה זו היא לבודד את NETWORK REQUEST FAILED.

שינויים:
- Session storage עבר ל AsyncStorage.
- Supabase client משתמש processLock ו AppState auto-refresh לפי React Native Auth pattern.
- מסך הכניסה מציג Raw Fetch אל /auth/v1/settings.
- מוצג HTTP status בפועל.
- מוצג בנפרד סטטוס Supabase Auth client.
- מספר הגרסה 5.2 מוצג על המסך כדי למנוע בלבול עם cache ישן.

אין מפתחות מנהליים באפליקציה.
