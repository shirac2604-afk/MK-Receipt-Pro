# MK Receipt Pro Android — Foundation 4

בשלב זה נוספה תשתית ענן חיה עבור Supabase.

## מה נוסף
- Supabase Auth עם Session מתמשך
- מסך כניסה ויצירת חשבון
- business_members לשיוך משתמש לעסק
- Row Level Security לכל טבלאות העסק
- הרשאות Select Insert Update לפי business_id
- אין Delete Policy לקבלות
- RPC מאובטח לרישום מכשיר Android
- RPC מאובטח להקצאת מספר קבלה
- Repository אמיתי ללקוחות והוצאות
- Device ID נפרד לכל התקנת Android

## לפני שימוש
1. צור פרויקט Supabase.
2. ב SQL Editor הרץ לפי הסדר:
   cloud/sql/001_shared_database.sql
   cloud/sql/002_auth_rls.sql
3. צור משתמש באפליקציה או ב Supabase Auth.
4. צור רשומת business אחת.
5. הוסף את המשתמש ל business_members עם role owner.
6. צור קובץ .env לפי .env.example.
7. התקן את תלויות הענן באמצעות npm run cloud:deps.
8. הפעל npm run android.

## בטיחות
אין Service Role Key באפליקציה.
האפליקציה משתמשת רק ב Publishable Key וב JWT של המשתמש.
RLS היא שכבת ההרשאה המחייבת של הנתונים.
