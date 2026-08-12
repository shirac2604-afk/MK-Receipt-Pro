# Windows Cloud 3.3 – Expenses + Attachments

גרסה זו מחברת את מסך ההוצאות של Windows ל-Supabase כאשר חשבון הענן מחובר.

- רשימת הוצאות משותפת ל-Windows ול-Android.
- יצירה, עריכה ומחיקה בענן.
- אסמכתאות נשמרות ב-bucket `expense-attachments`.
- פתיחת אסמכתה מהענן מורידה עותק זמני למחשב ופותחת אותו.
- Dashboard ודוחות שמשתמשים ב-`expenses:list` מקבלים כעת את נתוני ההוצאות מהענן.
- כאשר אין חיבור לענן, ההתנהגות המקומית הקיימת נשמרת.

בדיקה: `npm run check:cloud-expenses`
