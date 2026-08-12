# MK Receipt Pro 1.1.0 — הכנה לגרסה סופית

הפרויקט הועלה לגרסה 1.1.0 ושומר על סביבת ההתחלה הנקייה שנבדקה ב RC2.

## חסימה מכוונת לפני Build סופי
ה Google OAuth credential שנחשף בזמן הפיתוח הוסר מהחבילה.

לפני בניית Setup סופי יש ליצור Desktop OAuth Client חדש ב Google Cloud ולהוריד את קובץ ה JSON החדש.

לאחר מכן מריצים במחשב Windows:

npm install

npm run google:import -- "C:\path\to\client_secret_NEW.apps.googleusercontent.com.json"

npm run check:final

npm run final:installer

בדיקת final מסרבת להמשיך אם לא הוטען credential חדש.

## מה נשמר
- סביבת נתונים נקייה MK-Receipt-Pro-Production
- קובץ Google Drive חדש MK-Receipt-Pro-Production-Sync.mkrbackup
- קבלה ראשונה בבסיס חדש 1001
- סנכרון דו מחשבי והגנת התנגשות
- גיבוי ושחזור
- הוצאות ואסמכתאות
- לקוחות
- דוחות ומרכז דיווחים
- מתקין Windows NSIS
