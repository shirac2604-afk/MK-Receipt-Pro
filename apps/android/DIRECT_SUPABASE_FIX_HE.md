# Foundation 5.1 — Direct Supabase Connection Fix

גרסת בדיקה זו אינה תלויה בקובץ .env לצורך Supabase.

ה Project URL וה Publishable Key הציבוריים של פרויקט MK Receipt Pro
מוגדרים בקובץ src/config/supabasePublic.ts.

אין בקוד:
- Database password
- service_role key
- secret key

מסך ההתחברות כולל כעת בדיקת חיבור ל /auth/v1/settings ומציג HTTP status
אם ניסיון הכניסה נכשל.
