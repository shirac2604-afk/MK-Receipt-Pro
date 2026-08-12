# Foundation 6 — אסמכתאות להוצאות

נוסף:
- צילום אסמכתא מהמצלמה
- בחירת תמונה מהגלריה
- העלאה ל Supabase Storage פרטי
- נתיב לפי business_id / expense_id
- קישור האסמכתא להוצאה
- פתיחת אסמכתא באמצעות Signed URL זמני
- RLS על storage.objects לפי business_id

## לפני בדיקה
1. ב Supabase Dashboard > Storage צור bucket בשם:
   expense-attachments
2. השאר אותו PRIVATE.
3. ב SQL Editor הרץ:
   cloud/sql/003_expense_attachments_storage.sql

לאחר מכן אפשר לבדוק צילום/גלריה ושמירת הוצאה.
