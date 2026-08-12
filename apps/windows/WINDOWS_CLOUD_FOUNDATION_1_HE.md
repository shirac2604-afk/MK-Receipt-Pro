# Windows Cloud Foundation 1

גרסה 1.1.1-cloud.1 מחברת את Windows לאותו Supabase של Android.

בשלב זה נוסף:
- התחברות באותו אימייל וסיסמה של Android
- Session מוצפן באמצעות Electron safeStorage
- זיהוי business_members
- טעינת שם העסק
- רישום המחשב באמצעות register_device כ-platform=windows
- ספירת קבלות, לקוחות והוצאות בענן
- מסך סטטוס בענן מתוך גיבוי ושחזור

Google Drive נשאר פעיל לגיבוי ואינו מוחלף.

חשוב: בשלב cloud.1 פעולות יצירה ב-Windows עדיין נשארות במסד המקומי. אין עדיין להפיק קבלות אמיתיות במקביל מ-Windows ומ-Android. השלב הבא יעביר את הנפקת הקבלה ב-Windows ל-reserve_receipt_number + issue_receipt_from_reservation.
