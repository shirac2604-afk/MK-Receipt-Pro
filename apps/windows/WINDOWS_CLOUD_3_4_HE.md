# Windows Cloud 3.4 — Business Profile + Logo Sync

1. הרץ פעם אחת ב-Supabase SQL Editor את `supabase/005_business_profile_sync.sql`.
2. `npm install`
3. `npm run check:cloud-business` — צפוי 8/8.
4. `npm run start`

כאשר חשבון הענן מחובר, Windows קורא ושומר את פרטי העסק בטבלת `businesses`. לוגו אישי נשמר ב-bucket הפרטי `business-assets` ומורד למטמון המקומי של Windows לצורך מסמכים חדשים.

הגדרות מקומיות שאינן מיועדות לסנכרון (PIN, תיקיית גיבוי, Google Drive וחתימה מקומית) נשארות מקומיות למחשב.
