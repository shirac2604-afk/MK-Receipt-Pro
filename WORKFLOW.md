# WORKFLOW — MK Receipt Pro

מסמך זה מגדיר איך עובדים על הפרויקט בכל פעם שחוזרים אליו.

## 1. לפני שמתחילים שינוי
1. לקרוא `README.md`.
2. לקרוא את החלק האחרון ב-`CHANGELOG.md`.
3. לקרוא `SECURITY.md` אם השינוי נוגע ל-Auth, Supabase, IPC, files, URLs, Storage או נתוני לקוחות.
4. לוודא מהי גרסת Production/Stable האחרונה ומהו source baseline החדש יותר, אם קיים.
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
- Android: להעלות גם `version` וגם `versionCode` כאשר נוצר release חדש.
- Android package ID לא משתנה.
- signing/Keystore נשמרים מחוץ ל-repository.
- אין להסיר אפליקציה קיימת לצורך update אם אותו signing/package מאפשר התקנה מעליה.
- source/security baseline חדש אינו Production עד שעבר בדיקה ידנית, build והתקנה.

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
npm run check:file-capability-hardening
npm run typecheck
npm run start
```

אין להסתפק ב-build. יש לבדוק ידנית את המסך/פעולה ששונו.

בשינוי שנוגע לבחירת קבצים, אסמכתאות, לוגו או נתיבי filesystem, חובה לוודא שה-renderer אינו סמכות לנתיב מקומי: הקובץ חייב להגיע דרך Electron dialog, לעבור validation ב-main process ולהיות מוגן ב-one-time capability כאשר ה-flow דורש זאת.

## 6. Android checks
```powershell
npm install
npm run release:check
```

`release:check` חייב לכלול בין היתר:
- `verify:intrusion-hardening`
- `verify:device-management`
- `verify:android-boundary-hardening`
- TypeScript (`npm run check`)

בשינוי שנוגע לתמונה/אסמכתה/לוגו, אין להסתמך על MIME של ה-picker או השרת בלבד. יש לבדוק MIME allowlist, גודל לאחר decode ו-magic bytes לפני upload/render. signed URL שנפתח או נמשך מחוץ ל-Supabase SDK חייב לעבור trusted host/path validation; הורדה רגישה לא אמורה לעקוב אחרי redirect ללא בדיקה.

אין להוסיף `scheme` או `android.intentFilters` בלי threat model ובדיקת deep-link מפורשת. Auth נשאר עם `detectSessionInUrl:false` כל עוד אין flow מתוכנן ומאובטח לקבלת token מ-URL.

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
- Storage policies חייבות לאכוף business ownership לפי path/object metadata ולא להסתמך רק על נתיב שהלקוח שולח.

## 8. Validation
כל validation משמעותי צריך להיות לפחות בשתי שכבות:
- UI: למנוע קלט שגוי ולתת הודעה ידידותית.
- Server/DB או trusted main process: לדחות payload לא תקין גם אם ה-UI נעקף.

דוגמאות: טלפון, אימייל, סכום, מספר עוסק, תאריך, payment method, status, file type/size/path/content signature.

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
- לעדכן SECURITY כאשר מודל האבטחה השתנה.
- לשמור migration תחת `supabase/migrations` כאשר יש שינוי DB.

## 11. בדיקות ידניות קריטיות לפני Release
- Login/session.
- Windows ↔ Android sync.
- Create/select/update customer.
- Issue receipt.
- Cancel receipt.
- Expense + attachment, כולל בחירה מחדש של קובץ לאחר כישלון/ביטול.
- Business details/logo, כולל בחירת לוגו חדש ושמירת/טעינת לוגו קיים.
- PDF persistence/opening.
- Device list/revoke.
- Receipt numbering/reservation.
- Offline/network friendly errors.

## 12. המשימה הפעילה נכון ל-12.08.2026
1. לבצע static audit נוסף ל-Supabase tenant/storage boundaries בלי לגעת בנתוני Production.
2. להקים Supabase Staging לפני בדיקות cross-tenant אקטיביות.
3. ליצור User A/Business A ו-User B/Business B ולבצע Tenant Isolation Test אמיתי ב-Staging.
4. לבצע בדיקה ידנית של Windows 1.1.5-security.5 עבור Expense attachment, logo selection ושמירת לוגו קיים.
5. לבצע Windows build/install verification ורק לאחר PASS לשקול קידום 1.1.5 ל-Production.
6. לבצע בדיקה ידנית ל-Android Phase 6: מצלמה/גלריה, אסמכתאה, לוגו וטעינת לוגו מהענן.
7. לבדוק Device Management ולנתק דרך הממשק את Android של 9.8 רק בפעולה יזומה ולא באמצעות SQL ידני.
8. להמשיך penetration tests מבוקרים על Staging, לא על Production.
