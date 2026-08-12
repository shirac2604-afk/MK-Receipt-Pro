# MK Receipt Pro / מפתחות להצלחה — Windows Production RC1

בסיס: Cloud 3.6 Production Hardening לאחר Production Reset מאומת.

## בדיקה לפני Build

```powershell
npm install
npm run check:production-hardening
npm run start
```

## יצירת מתקין Windows

סגור את התוכנה ואז הרץ:

```powershell
npm run release:production:win
```

המתקין ייווצר בתיקייה:

```text
release\
```

שם הקובץ מתחיל ב־`Maptehot-LaHatzlaha-` ומסתיים ב־`Setup.exe`.

## מצב Production שנשמר

- Supabase משותף ל־Windows ו־Android
- מספור קבלות אטומי ומשותף
- קבלות/PDF, לקוחות, הוצאות ואסמכתאות מסונכרנים
- פרטי עסק ולוגו מסונכרנים
- ביטול קבלה משותף
- הגנות מפני לחיצה כפולה ופעולות ענן ללא חיבור
- נתוני הבדיקה אינם חלק מהקוד; המידע העסקי נשמר בענן
