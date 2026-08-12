# WORKFLOW — MK Receipt Pro

מסמך זה מגדיר איך עובדים על הפרויקט בכל פעם שחוזרים אליו.

## 1. לפני שמתחילים שינוי
1. לקרוא `README.md`.
2. לקרוא את החלק האחרון ב-`CHANGELOG.md`.
3. לקרוא `SECURITY.md` אם השינוי נוגע ל-Auth, Supabase, IPC, files, URLs, Storage, dependencies או נתוני לקוחות.
4. אם עובדים על Tenant/Storage לקרוא גם `SECURITY_PHASE7.md`.
5. אם עובדים על npm/Expo/React Native/Electron dependencies לקרוא גם `SECURITY_PHASE8.md`.
6. לוודא מהי גרסת Production/Stable האחרונה ומהו source baseline החדש יותר, אם קיים.
7. לא לערוך ישירות גרסה יציבה בלי branch/version מתאים.

## 2. מבנה רצוי
```text
apps/windows
apps/android
supabase/migrations
supabase/SECURITY_PHASE7_STAGING_AUDIT.sql
security
scripts
README.md
CHANGELOG.md
WORKFLOW.md
SECURITY.md
SECURITY_PHASE7.md
SECURITY_PHASE8.md
```

## 3. כללי גרסאות
- Windows: להעלות version בכל release משמעותי.
- Android: להעלות גם `version` וגם `versionCode` כאשר נוצר release חדש.
- Android package ID לא משתנה.
- signing/Keystore נשמרים מחוץ ל-repository.
- אין להסיר אפליקציה קיימת לצורך update אם אותו signing/package מאפשר התקנה מעליה.
- source/security baseline חדש אינו Production עד שעבר בדיקה ידנית, build והתקנה.
- Major upgrade של Expo/React Native אינו תיקון אוטומטי; הוא דורש branch ובדיקות מלאות.

## 4. תהליך שינוי
1. להבין את התקלה/דרישה.
2. לזהות את כל השכבות המושפעות: UI, local service, IPC/preload, Supabase client, RPC, DB, Storage, dependency/build chain.
3. לבצע שינוי מינימלי שלא שובר פונקציות קיימות.
4. להוסיף/לעדכן automated verification script.
5. להריץ regression + security checks.
6. לבצע בדיקה ידנית של ה-flow שתוקן כאשר מדובר בשינוי אפליקטיבי.
7. לעדכן `CHANGELOG.md`.
8. אם השתנה security model — לעדכן `SECURITY.md` ומסמך Phase מתאים.
9. commit ל-GitHub / PR.
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

בשינוי שנוגע לבחירת קבצים, אסמכתאות, לוגו או filesystem, ה-renderer אינו סמכות לנתיב מקומי: הקובץ חייב להגיע דרך Electron dialog, לעבור validation ב-main process ולהיות מוגן ב-one-time capability כאשר ה-flow דורש זאת.

Phase 8 dependency gate ל-Windows הוא strict: כל High או Critical ב-`npm audit --omit=dev` חוסם את ה-CI.

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

בשינוי שנוגע לתמונה/אסמכתה/לוגו, אין להסתמך על MIME בלבד. יש לבדוק MIME allowlist, גודל לאחר decode ו-magic bytes. signed URL שנפתח/נמשך מחוץ ל-Supabase SDK חייב לעבור trusted host/path validation; הורדה רגישה לא אמורה לעקוב אחרי redirect ללא בדיקה.

אין להוסיף `scheme` או `android.intentFilters` בלי threat model ובדיקת deep-link מפורשת. Auth נשאר עם `detectSessionInUrl:false` כל עוד אין flow מתוכנן ומאובטח לקבלת token מ-URL.

Build APK:
```powershell
$env:EAS_NO_VCS="1"
npx eas-cli@latest build -p android --profile production-apk
```

ל-Google Play יש להשתמש ב-production AAB profile ולא ב-APK.

### Android dependency rule
- להריץ/להסתמך על `.github/workflows/security-phase8-dependencies.yml` לפני release.
- `security/android-npm-audit-baseline.json` הוא Known-Risk baseline, לא תיקון.
- כל Critical, High חדש או High count מעל baseline מחייבים עצירה ובדיקה.
- אסור `npm audit fix --force` אוטומטי.
- Expo/React Native upgrade: branch נפרד → Node תואם → `expo install --fix` → Expo Doctor → TypeScript → כל security gates → build → בדיקה ידנית.

## 7. Supabase workflow
- DDL / functions / policies / constraints: לבצע באמצעות migration מתועד.
- לפני constraint חדש לבדוק שהנתונים הקיימים אינם מפרים אותו.
- Production data לא משמש לבדיקות חדירה הרסניות.
- לבדיקות Tenant Isolation להשתמש ב-Staging/Development environment בלבד.
- SECURITY DEFINER: auth + authorization + fixed search_path.
- RLS חייב להישאר פעיל בכל טבלה חשופה עם נתונים עסקיים.
- Storage policies חייבות לאכוף business ownership ולא להסתמך רק על נתיב שהלקוח שולח.
- Phase 7 migration הוא Staging-first ואינו Applied to Production עד החלטה מפורשת לאחר audit + A/B tests.
- אין להכריז Tenant Isolation PASS על סמך static code review בלבד.

## 8. Validation
כל validation משמעותי צריך להיות לפחות בשתי שכבות:
- UI: למנוע קלט שגוי ולתת הודעה ידידותית.
- Server/DB או trusted main process: לדחות payload לא תקין גם אם ה-UI נעקף.

דוגמאות: טלפון, אימייל, סכום, מספר עוסק, תאריך, payment method, status, file type/size/path/content signature, Storage key tenant prefix.

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
- לעדכן מסמך Phase ייעודי אם קיים.
- לשמור migration תחת `supabase/migrations` כאשר יש שינוי DB.
- לשמור Known-Risk exception בצורה מפורשת ומכונתית, לא כהשתקה של CI.

## 11. בדיקות ידניות קריטיות לפני Release
- Login/session.
- Windows ↔ Android sync.
- Create/select/update customer.
- Issue receipt.
- Cancel receipt.
- Expense + attachment, כולל בחירה מחדש לאחר כישלון/ביטול.
- Business details/logo, כולל בחירת לוגו חדש ושמירת/טעינת לוגו קיים.
- PDF persistence/opening.
- Device list/revoke.
- Receipt numbering/reservation.
- Offline/network friendly errors.
- לאחר dependency/framework upgrade: כל ה-flows לעיל + APK/AAB install/update test.

## 12. המשימה הפעילה נכון ל-12.08.2026
1. לעקוב אחרי advisories של Android ולמצוא remediation upstream תואם בלי `--force` ובלי downgrade אוטומטי.
2. לבצע בדיקה ידנית של Windows 1.1.5-security.5 עבור Expense attachment, logo selection ושמירת לוגו קיים.
3. לבצע Windows build/install verification ורק לאחר PASS לשקול קידום 1.1.5 ל-Production.
4. לבצע בדיקה ידנית ל-Android Phase 6: מצלמה/גלריה, אסמכתאה, לוגו וטעינת לוגו מהענן.
5. לבדוק Device Management ולנתק דרך הממשק את Android של 9.8 רק בפעולה יזומה ולא SQL ידני.
6. כאשר תהיה סביבת Staging מתאימה ללא עלות לא רצויה: להריץ Phase 7 audit ומטריצת A/B.
7. רק לאחר Staging PASS לשקול החלת Phase 7 Storage-key binding migration על Production.
