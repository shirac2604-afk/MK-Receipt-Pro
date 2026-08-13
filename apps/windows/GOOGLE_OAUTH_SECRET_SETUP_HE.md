# Google OAuth ב-Windows — Public Client + PKCE

Phase 9A

MK Receipt Pro משתמשת ב-OAuth מסוג Desktop/Installed App. בזרימה זו האפליקציה פועלת כ-public client ולכן אינה שומרת ואינה אורזת `client_secret` בתוך קוד המקור או המתקין.

## ההגדרה הנוכחית

- ה-`clientId` הציבורי נמצא ב-`resources/google/oauth-client.json`.
- ההתחברות משתמשת ב-PKCE (`S256`) וב-loopback redirect על `127.0.0.1`.
- החלפת authorization code ו-refresh token מתבצעת ללא `client_secret`.
- refresh token של המשתמש נשמר מוצפן באמצעות Electron `safeStorage`.

## אסור להוסיף Client Secret

אין להוסיף `clientSecret` ל-`resources/google/oauth-client.json`, לקוד, ל-`.env`, ל-GitHub או לחבילת ההפצה.

הפקודה הישנה `npm run google:configure` אינה משמשת עוד להגדרת secret ותיכשל בכוונה אם תרוץ.

אם קיים credential ישן שנחשף בעבר, אפשר לבטל/לסובב אותו ב-Google Cloud בלי לפגוע בזרימה החדשה, משום שהאפליקציה אינה תלויה בו עוד.

## בדיקה לפני Release

```powershell
npm install
npm run typecheck
npm run check:file-capability-hardening
npm start
```

לאחר מכן יש לבדוק התחברות חדשה ל-Google Drive, סנכרון, סגירה ופתיחה מחדש של האפליקציה, וסנכרון נוסף באמצעות ה-refresh token המוצפן.
