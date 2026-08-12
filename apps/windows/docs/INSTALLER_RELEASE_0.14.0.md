# Installer & Release 0.14.0

## זהות מוצר
- Product name: מפתחות להצלחה
- Internal name: MK Receipt Pro
- App ID: `il.co.mkreceipt.desktop`
- Executable: `MaptehotLaHatzlaha.exe`

## התנהגות המתקין
- NSIS assisted installer.
- התקנה למשתמש הנוכחי (`perMachine: false`).
- אפשרות לשינוי תיקיית ההתקנה.
- קיצורי דרך בשולחן העבודה ובתפריט התחל.
- הפעלה בסיום ההתקנה.
- נתוני המשתמש אינם נמחקים בהסרה.

## Build
```powershell
npm install
npm run dist:win
```

המתקין ייווצר בתיקיית `release` בשם:
`Maptehot-LaHatzlaha-0.14.0-Setup.exe`

## הערת חתימה
Build פנימי יכול להיות לא חתום. לפני הפצה לעסקים נוספים יש לחתום דיגיטלית על המתקין והיישום.
