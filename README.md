# MK Receipt Pro

מערכת פרטית לניהול עסק, קבלות, לקוחות, הוצאות, מסמכי PDF וסנכרון ענן בין Windows ל-Android.

> **זהו דף הבית של הפרויקט.** בכל חזרה לפרויקט יש לקרוא קודם את README, אחר כך `CHANGELOG.md`, `WORKFLOW.md`, `SECURITY.md`, `SECURITY_PHASE7.md`, `SECURITY_PHASE8.md` ו-`SOURCE_BACKUP_MANIFEST.md`.

## מצב נוכחי — 26.08.2026

### Phase 15 — שחזור סיסמה (מוכן ל־Staging בלבד)

- הענף `security/phase15-password-recovery` מכיל שחזור באמצעות קישור האיפוס המובנה של Supabase עבור Android ו-Windows. הקישור פותח את האפליקציה המותקנת ומציג בחירת סיסמה חדשה רק לאחר אימות session ההתאוששות; אין הזנת קוד.
- callback יחיד ומוגבל מוגדר בשתי הפלטפורמות: `mkreceiptpro://auth/recovery`. ב-Staging בלבד יש להוסיף אותו ל־Supabase Redirect URLs; אין שינוי ב-Production.
- ה־callback מאומת בקוד: scheme/host/path מדויקים, `type=recovery`, מגבלות אורך, `getUser()` ו־session בזיכרון בלבד. ב־Windows ה־URL והטוקנים אינם עוברים דרך preload/IPC.
- לפני כל הפעלה יש לקרוא ולבצע את [תוכנית הבדיקה ל־Staging](docs/PASSWORD_RECOVERY_STAGING.md). אין למזג ל־`main` או לשנות Production ללא בדיקות Staging ואישור מפורש מחדש.

### כלל תיעוד GitHub

כל שינוי מתועד ב־GitHub לפני שהוא נחשב הושלם: commit ברור, PR עם בדיקות והשפעת השדרוג, ועדכון `CHANGELOG.md` והמסמך הרלוונטי. הכלל המלא נמצא ב־[`docs/CHANGE_DOCUMENTATION_POLICY.md`](docs/CHANGE_DOCUMENTATION_POLICY.md).

### גרסאות
- **Windows Production שנבדק ידנית:** 1.1.4 — Security Device Management.
- **Windows source/security baseline:** 1.1.5-security.5 — Phase 5 Local File Capabilities. מוזג ל-`main`, עבר CI, עדיין דורש build/install ובדיקה ידנית לפני קידום ל-Production.
- **Android Production:** 1.0.5 — Security Device Management.
- **Android source hardening:** 1.0.5 + Phase 6 Image & Session Boundaries. Phase 6 הוא hardening של המקור ולא release חדש.
- **Backend:** Supabase — Auth + PostgreSQL + RLS + RPC + Storage.
- **GitHub `main` הוא source of truth** לקוד העדכני. ארכיוני ZIP הם נקודות שחזור לגרסאות בסיס בלבד.

## מצב פונקציונלי מאומת
- סנכרון Windows ↔ Android עובד לשני הכיוונים.
- פרטי עסק ולוגו מסונכרנים.
- קבלות, הוצאות, ביטול קבלה ו-PDF cloud flow עובדים.
- יצירת לקוח חדש ב-Windows תוקנה ונבדקה.
- בחירת לקוח קיים ב-Android תוקנה באמצעות רשימה inline.
- איפוס נתונים נבדק: אין קבלות/הוצאות/לקוחות, פרטי העסק והלוגו נשמרים, המספר הבא חוזר ל-1001.
- ניהול מכשירים מאובטח קיים בשתי האפליקציות דרך RPC `revoke_device`.

## מבנה הפרויקט
```text
MK-Receipt-Pro/
├── apps/
│   ├── windows/              # Electron + TypeScript + Vite
│   └── android/              # Expo + React Native
├── supabase/
│   ├── migrations/           # migrations/security hardening
│   └── SECURITY_PHASE7_STAGING_AUDIT.sql
├── scripts/
├── .github/workflows/
├── README.md
├── CHANGELOG.md
├── WORKFLOW.md
├── SECURITY.md
├── SECURITY_PHASE7.md
├── SECURITY_PHASE8.md
└── SOURCE_BACKUP_MANIFEST.md
```

## גיבוי ושחזור
נקודות השחזור הארכיוניות שאומתו בעבר:
- Android 1.0.5 — `MK-Receipt-Pro-Android-1.0.5-SECURITY-DEVICE-MGMT-FULL.zip`
  - SHA-256: `8a2847b7aab7bb7608bc4ff2e72464fb953d12aac2cdfa216d1e6923e3732485`
- Windows 1.1.4 — `MK-Receipt-Pro-Windows-1.1.4-SECURITY-DEVICE-MGMT-FULL.zip`
  - SHA-256: `01091a8e359fd905b2c1a8ef467136298e1ad34765ae17ad2828f8a3b53583e7`

הקוד כבר יובא ל-GitHub. **Workflow הייבוא החד-פעמי הוסר ב-Phase 8** כדי למנוע החזרה בטעות של `apps/windows` ו-`apps/android` לגרסאות הארכיון הישנות ולמחוק hardening חדש. גם workflow הכתיבה החד-פעמי של Phase 5 הוסר לאחר שסיים את תפקידו.

## אבטחה — שלבים שבוצעו
1. **Phase 1 — Supabase/RPC:** ביטול anonymous EXECUTE לפונקציות רגישות, `auth.uid()`, הרשאות עסק ו-`search_path` קבוע.
2. **Phase 2 — Input & Database Validation:** טלפון, אימייל, סכומים, מספר עוסק, תאריכים, אורכי שדות וערכים מורשים נאכפים גם ב-UI וגם ב-PostgreSQL.
3. **Phase 3 — Intrusion Hardening:** Electron IPC/preload/navigation/URLs/files; Android SecureStore, signed URL host validation ו-upload restrictions.
4. **Phase 4 — Device Management:** `revoke_device` מאובטח, owner/admin בלבד, הגנה מפני ניתוק המכשיר הפעיל; `businesses UPDATE` מוגבל ל-owner/admin.
5. **Phase 5 — Windows Local File Capabilities:** renderer אינו סמכות לנתיב קובץ; one-time file capabilities, `realpath`, מגבלת 10MB, extension + magic bytes, sender pinning ל-renderer הארוז.
6. **Phase 6 — Android Image & Session Boundaries:** JPEG/PNG/WebP allowlist, decoded-size + magic bytes, לוגו ואסמכתאות עוברים validation, signed URL pinning, no redirects; session נשאר SecureStore ו-`detectSessionInUrl:false`.
7. **Phase 7 — Tenant / Storage Boundary:** RLS נבדק ב-Production בקריאה בלבד; הטבלאות העסקיות המרכזיות עם RLS; Storage buckets private וה-policies בודקות business prefix. הוכן migration נוסף שקושר DB storage keys ל-`business_id`, אך הוא **לא הוחל על Production** ומיועד Staging-first. בדיקת A/B אמיתית עדיין דורשת Staging.
8. **Phase 8 — Secrets & Supply Chain:** `.gitignore` מגן על `.env`, keys, keystores, APK/AAB/EXE וכו'; `.env.example` מכיל placeholders בלבד; הוסף static secrets gate; כל GitHub Actions הפעילים נעוצים ל-commit SHA; workflows ישנים בעלי `contents: write` הוסרו; נוספה סריקת `npm audit` נפרדת ל-Windows ול-Android.

## Phase 8 — תוצאות Supply Chain עדכניות
- Static secrets / blocked files / action pinning: **PASS**.
- לא נמצאו בקוד הנוכחי קובצי `.env`, private keys, keystore, APK/AAB/EXE או דפוסי secret שהסריקה מזהה.
- `.env.example` מכיל רק `YOUR_PROJECT` ו-`YOUR_PUBLISHABLE_KEY` placeholders.
- GitHub Actions פעילים משתמשים ב-`actions/checkout` נעוץ ל-SHA `11d5960a326750d5838078e36cf38b85af677262` ולא ב-floating `@v4`.
- **Windows production dependency audit: PASS / 0 vulnerabilities** ב-`npm audit --omit=dev --audit-level=high`. במהלך `npm install` קיימות אזהרות על dev/build transitive packages ישנים, אך production audit עבר 0.
- **Android שודרג בצורה מבוקרת ל-Expo 57 ו-React Native 0.86.2.** השדרוג עבר Expo Doctor, release gate מלא, TypeScript, EAS APK ובדיקה ידנית. Gate האספקה מאפשר רק advisory IDs מתועדים של `image-size` וחוסם כל ממצא חדש או שינוי במדיניות.
- **אין להריץ `npm audit fix --force` על Android.** ממצאים חדשים נבדקים בענף נפרד עם compatibility review, בדיקות מלאות ובדיקת מכשיר.
- **שלמות lockfiles:** Android ו-Windows משתמשים ב-lockfiles מלאים ותקינים; Phase 14 מריץ JSON integrity ו-`npm ci` כדי למנוע תיקון שקט או שכתוב של dependency state ב-CI.

## Supabase — מצב Security
- RLS פעיל ב-`businesses`, `business_members`, `customers`, `receipts`, `expenses`, `devices`, `receipt_sequences`, `receipt_number_reservations`.
- Policies עסקיים משתמשים ב-`user_has_business_access(business_id)`; INSERT/UPDATE כוללים `WITH CHECK` במקומות המרכזיים.
- `businesses UPDATE` מוגבל ל-owner/admin.
- Storage buckets המרכזיים private; policies בודקות business UUID מתוך נתיב האובייקט.
- בדיקת קריאה בלבד מצאה 0 storage-key references שחוצים business prefix עבור לוגו, אסמכתאות ו-PDF קבלות/ביטולים.
- `consume_receipt_reservation`, `cancel_receipt_cloud` ו-`revoke_device` הוקשחו לפי auth/authorization; anon EXECUTE בוטל לפונקציות הרגישות שנבדקו.
- Phase 7 migration הוא Staging-first ואינו מסומן Applied to Production.
- Leaked Password Protection עדיין מומלץ להפעלה לאחר בדיקת השפעה.

## בדיקות אוטומטיות שכבר עברו
### Windows
- Production Hardening
- Sidebar UI
- Security Input
- Customer Create — 11/11
- Intrusion Hardening — 10/10
- Device Management — 10/10
- File Capability Hardening — 10/10
- Electron + Renderer TypeScript — PASS
- Supply-chain production dependency audit — 0 vulnerabilities

### Android
- Release / Regression / Production checks
- App Icon / EAS bundle dependencies
- Intrusion Hardening — 10/10
- Device Management — 8/8
- Android Boundary Hardening — 11/11
- TypeScript — PASS
- Supply-chain audit — **PASS תחת מדיניות advisory מתועדת**; Expo 57 פעיל, advisory IDs בלתי צפויים נכשלים, ונתיבי asset מושפעים חסומים ב-build gate.

## פקודות בדיקה
### Windows
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

### Android
```powershell
npm install
npm run release:check
npm audit --omit=dev --audit-level=high
```

Build APK:
```powershell
$env:EAS_NO_VCS="1"
npx eas-cli@latest build -p android --profile production-apk
```

## כללי עבודה שלא שוברים
- לא משנים Production stable ישירות כאשר מדובר בשינוי אפליקטיבי משמעותי: branch/version → tests → regression/security → build → בדיקה ידנית → release.
- GitHub `main` הוא מקור האמת; ZIPים אינם תחליף לקוד המקור.
- לעולם לא commit: `.env`, service-role/secret keys, passwords/tokens, keystores/signing credentials, production DB dumps, customer data, private attachments או installers.
- publishable/anon key בצד לקוח מותר רק עם RLS תקין.
- UI validation אינו מספיק; validation משמעותי חייב להיות גם ב-DB/trusted process.
- `SECURITY DEFINER`: auth + authorization + fixed `search_path`.
- לא מבצעים penetration tests הרסניים על Production.
- לא מריצים dependency `--force` upgrade בלי branch ובדיקות מלאות.

## משימות פעילות — לפי סדר
1. להשלים את Phase 14: lockfile integrity, exact `npm ci`, TypeScript ו-supply-chain CI.
2. לבצע בדיקה ידנית של שינוי הסיסמה ב-Staging ב-Android וב-Windows לפני שינוי הגדרות Auth ב-Production.
3. לתכנן שחזור סיסמה נפרד עם קוד/קישור מאומת, הגבלת ניסיונות ובדיקות lifecycle; אין להוסיף deep link לא מאומת.
4. לאחר השלמת Security/Release readiness להכין Google Play AAB, Data Safety, Privacy Policy ו-Windows Production release.

## מסמכי המשך
- `CHANGELOG.md` — היסטוריית שינויים.
- `WORKFLOW.md` — כללי פיתוח/בדיקות/Release.
- `SECURITY.md` — baseline אבטחה.
- `SECURITY_PHASE7.md` — Tenant/Storage isolation plan.
- `SECURITY_PHASE8.md` — Secrets & Supply Chain rules.
- `SOURCE_BACKUP_MANIFEST.md` — hashes של ארכיוני השחזור.
