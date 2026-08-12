# הגדרת Google OAuth Client Secret

גרסה 1.1.0-dev.22

Google החזירה `client_secret is missing`, ולכן MK Receipt Pro שולחת כעת גם את ה־Client Secret בבקשת הטוקן וברענון הטוקן.

## חשוב
ה־Client Secret שהופיע קודם בצילום מסך נחשב חשוף. אין להשתמש בו בגרסה הסופית.

מומלץ ליצור או להוריד Credential חדש ב־Google Cloud, ואז להגדיר את ה־Client Secret החדש **רק במחשב שלך**.

לאחר חילוץ הפרויקט לתיקייה:

```powershell
npm run google:configure
```

הדביקי את ה־Client Secret החדש כאשר PowerShell מבקש אותו.

הערך נשמר בקובץ המקומי:

`resources/google/oauth-client.json`

אין לשלוח את ה־Client Secret בצ'אט ואין לפרסם אותו במאגר קוד ציבורי.

לאחר מכן:

```powershell
npm install
npm start
```

ולנסות שוב התחברות עם Google.
