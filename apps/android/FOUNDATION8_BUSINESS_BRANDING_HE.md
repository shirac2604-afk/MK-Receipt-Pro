# Foundation 8 — פרטי עסק ולוגו בענן

נוסף מסך הגדרות עסק פעיל ב-Android.

המשתמש יכול לעדכן:
- שם העסק
- שם בעל העסק
- מספר עוסק
- סטטוס עוסק פטור / מורשה
- טלפון
- אימייל
- כתובת
- סלוגן
- לוגו העסק מהגלריה

הלוגו נשמר ב-Supabase Storage פרטי ב-bucket בשם business-branding.
פרטי העסק נשמרים בטבלת businesses.

ReceiptPdfService מקבל את הלוגו כ-data URL פרטי שהורד מה-Storage, ולכן הקבלה מציגה את לוגו העסק בראש המסמך.
הלוגו הקבוע של מפתחות להצלחה נשאר מיתוג החברה בצד.

## לפני בדיקה
1. Supabase > Storage > צור bucket בשם business-branding והשאר PRIVATE.
2. SQL Editor > הרץ cloud/sql/005_business_branding.sql.
3. הפעל את Android Foundation 8.
4. לשונית עוד > הגדרות העסק > הזן פרטים ובחר לוגו > שמור.
5. הפק קבלת בדיקה חדשה.
