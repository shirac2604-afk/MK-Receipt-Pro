# WORKFLOW — MK Receipt Pro

מסמך זה מגדיר איך עובדים על הפרויקט בכל פעם שחוזרים אליו.

## 1. לפני שמתחילים שינוי
1. לקרוא `README.md`.
2. לקרוא את החלק האחרון ב-`CHANGELOG.md`.
3. לקרוא `SECURITY.md` אם השינוי נוגע ל-Auth, Supabase, IPC, files, URLs, Storage או נתוני לקוחות.
4. לוודא מהי גרסת Production/Stable האחרונה.
5. לא לערוך ישירות גרסה יציבה בלי יצירת version/branch מתאים.

## 2. מבנה רצוי
```text
apps/windows
apps/android
supabase/migrations
scripts
README.md
CHANGELOG.md
WORKFLOW.md
SECURITY.md
```

## 3. כללי גרסאות
- Windows: להעלות version בכל release משמעותי.
- Android: להעלות גם `version` וגם `versionCode`.
- Android package ID לא משתנה.
- signing/Keystore נשמרים מחוץ ל-repository.
- אין להסיר אפליקציה קיימת לצורך update אם אותו signing/package מאפשר התקנה מעליה.

## 4. תהליך שינוי
1. להבין את התקלה/דרישה.
2. לזהות את כל השכבות המושפעות: UI, local service, IPC/preload, Supabase client, RPC, DB, Storage.
3. לבצע שינוי מינימלי שלא שובר פונקציות קיימות.
4. להוסיף/לעדכן automated verification script.
5. להריץ regression + security checks.
6. לבצע בדיקה ידנית של ה-flow שתוקן.
7. לעדכן `CHANGELOG.md`.
8. אם השתנה security model — לעדכן `SECURITY.md`.
9. commit ל-GitHub.
10. רק לאחר PASS לבנות APK/Windows release.

## 5. Windows checks
```powershell
npm install
npm run check:production-hardening
npm run check:sidebar-ui
npm run check:security-input
npm run check:customer-create
npm run check:intrusion-hardening
npm run check:device-management
npm run start
```

אין להסתפק ב-build. יש לבדוק ידנית את המסך/פעולה ששונו.

## 6. Android checks
```powershell
npm install
npm run release:check
```

Build APK:
```powershell
$env:EAS_NO_VCS="1"
npx eas-cli@latest build -p android --profile production-apk
```

ל-Google Play יש להשתמש ב-production AAB profile ולא ב-APK.

## 7. Supabase workflow
- DDL / functions / policies / constraints: לבצע באמצעות migration מתועד.
- לפני constraint חדש לבדוק שהנתונים הקיימים אינם מפרים אותו.
- Production data לא משמש לבדיקות חדירה הרסניות.
- לבדיקות Tenant Isolation להשתמש ב-Staging/Development Branch.
- SECURITY DEFINER: auth + authorization + fixed search_path.
- RLS חייב להישאר פעיל בכל טבלה חשופה עם נתונים עסקיים.

## 8. Validation
כל validation משמעותי צריך להיות לפחות בשתי שכבות:
- UI: למנוע קלט שגוי ולתת הודעה ידידותית.
- Server/DB: לדחות payload לא תקין גם אם ה-UI נעקף.

דוגמאות: טלפון, אימייל, סכום, מספר עוסק, תאריך, payment method, status, file type/size.

## 9. Secrets
לעולם לא commit:
- `.env`
- Supabase service-role/secret keys
- passwords/tokens
- Android keystore / signing credentials
- production database dumps
- customer data
- private attachments
- logs עם מידע רגיש

## 10. GitHub
GitHub הוא source of truth לקוד ולתיעוד. ZIPים הם גיבוי/הפצה בלבד.

בכל פעם שמסיימים שלב:
- לוודא שהקוד העדכני נמצא ב-repo.
- לעדכן README אם השתנה המצב הנוכחי.
- לעדכן CHANGELOG.
- לשמור migration תחת `supabase/migrations`.

## 11. בדיקות ידניות קריטיות לפני Release
- Login/session.
- Windows ↔ Android sync.
- Create/select/update customer.
- Issue receipt.
- Cancel receipt.
- Expense + attachment.
- Business details/logo.
- PDF persistence/opening.
- Device list/revoke.
- Receipt numbering/reservation.
- Offline/network friendly errors.

## 12. המשימה הפעילה נכון ל-12.08.2026
1. לבדוק Device Management ב-Windows 1.1.4 / Android 1.0.5.
2. לנתק דרך הממשק את Android של 9.8 ולוודא count=3.
3. לוודא שכל source code של שתי הגרסאות האחרונות נמצא ב-GitHub.
4. להקים Supabase Staging.
5. לבצע Tenant Isolation A מול B.
6. להמשיך penetration tests מבוקרים.
