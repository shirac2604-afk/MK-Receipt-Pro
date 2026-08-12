# MK Receipt Pro

מערכת פרטית לניהול עסק, קבלות, לקוחות, הוצאות, מסמכי PDF וסנכרון ענן בין Windows ל-Android.

> **מסמך זה הוא נקודת הכניסה לפרויקט.** בכל חזרה לפרויקט יש לקרוא קודם את README, אחר כך `CHANGELOG.md`, `WORKFLOW.md`, `SECURITY.md`, `SECURITY_PHASE7.md`, `SECURITY_PHASE8.md` ו-`SOURCE_BACKUP_MANIFEST.md`.

## מצב נוכחי — 12.08.2026

### גרסאות אחרונות
- **Windows Production שנבדק ידנית: 1.1.4 — Security Device Management**
- **Windows source/security baseline: 1.1.5-security.5 — Local File Capabilities**
- **Android Production: 1.0.5 — Security Device Management**
- **Android source hardening: 1.0.5 + Phase 6 — Image & Session Boundaries**
- Backend: **Supabase** — Auth + PostgreSQL + RLS + RPC + Storage

Windows 1.1.5-security.5 כבר מוזג ל-`main` ועבר בדיקות אוטומטיות, אך טרם הוכרז כ-Production עד להשלמת בדיקה ידנית, build והתקנה. Android נשאר בגרסה 1.0.5; Phase 6 הוא hardening נוסף של קוד המקור ולא release חדש.

### סטטוס פונקציונלי
- סנכרון Windows ↔ Android עובד לשני הכיוונים.
- פרטי עסק ולוגו מסונכרנים.
- קבלות והוצאות מסונכרנות.
- ביטול קבלה עובד משני המכשירים.
- יצירת לקוח חדש ב-Windows עובדת.
- בחירת לקוח קיים ב-Android תוקנה באמצעות רשימה inline.
- איפוס נתונים נבדק: קבלות/הוצאות/לקוחות נמחקים, פרטי העסק והלוגו נשמרים, המספר הבא חוזר ל-1001.
- ניהול מכשירים מאובטח נוסף ב-Phase 4.
- Phase 5 הקשיח בחירת קבצים מקומיים ב-Windows באמצעות one-time capabilities, canonical paths, מגבלת גודל ו-magic bytes.
- Phase 6 הקשיח תמונות/לוגו ב-Android באמצעות MIME allowlist, decoded-size limits, magic bytes, signed URL pinning והגנת redirect.
- Auth ב-Android נשאר ב-SecureStore עם `detectSessionInUrl:false`; אין כרגע custom scheme או Android intent filter ל-deep links.
- Phase 7 הכין שכבת Tenant/Storage hardening ו-Staging audit; המיגרציה החדשה **לא הוחלה על Production**.
- Phase 8 הוסיף Dependency/Supply-Chain audit ל-Windows ול-Android.

## ארכיטקטורה

```text
MK-Receipt-Pro/
├── apps/
│   ├── windows/     # Electron + TypeScript + Vite
│   └── android/     # Expo + React Native
├── supabase/
│   ├── migrations/  # migrations / RLS / RPC / security hardening
│   └── SECURITY_PHASE7_STAGING_AUDIT.sql
├── security/
│   └── android-npm-audit-baseline.json
├── scripts/
├── incoming/        # one-time verified source import only
├── README.md
├── CHANGELOG.md
├── WORKFLOW.md
├── SECURITY.md
├── SECURITY_PHASE7.md
├── SECURITY_PHASE8.md
└── SOURCE_BACKUP_MANIFEST.md
```

שתי האפליקציות משתמשות באותו Supabase. הפרדת הנתונים בין עסקים מבוססת על `business_id`, RLS ו-`user_has_business_access()`.

## גיבוי קוד המקור ויכולת שחזור

גרסאות המקור המדויקות שנבדקו ונשמרו כארכיוני בסיס הן:

- Android 1.0.5: `MK-Receipt-Pro-Android-1.0.5-SECURITY-DEVICE-MGMT-FULL.zip`
  - SHA-256: `8a2847b7aab7bb7608bc4ff2e72464fb953d12aac2cdfa216d1e6923e3732485`
  - 120 קבצים בארכיון המאומת.
- Windows 1.1.4: `MK-Receipt-Pro-Windows-1.1.4-SECURITY-DEVICE-MGMT-FULL.zip`
  - SHA-256: `01091a8e359fd905b2c1a8ef467136298e1ad34765ae17ad2828f8a3b53583e7`
  - 362 קבצים בארכיון המאומת.

הפרטים נשמרים גם ב-`SOURCE_BACKUP_MANIFEST.md`. קוד המקור של שתי האפליקציות נמצא בפועל תחת `apps/android` ו-`apps/windows`; `main` כולל hardening נוסף מעבר לארכיוני הבסיס.

קיים workflow בשם `.github/workflows/import-source-archives.yml` לשחזור מבוקר מהארכיונים המאומתים. כאשר שני הארכיונים המדויקים מועלים לתיקיית `incoming/`, GitHub Actions מאמת SHA-256, מחלץ אותם, מסיר build/cache/secrets, מוחק את קובצי ה-ZIP ומבצע commit של קוד המקור.

**כלל יושרה:** ארכיוני ZIP הם נקודת שחזור חתומה לגרסאות המוצהרות בלבד. `main` הוא source of truth לקוד העדכני יותר.

## אבטחה — מצב נוכחי

בוצעו שמונה שלבי עבודה/ביקורת אבטחתיים:

1. **Supabase/RPC hardening** — ביטול anonymous EXECUTE לפונקציות רגישות, `auth.uid()` והרשאות עסק, `search_path` קשיח.
2. **Input & Database Validation** — אימות טלפון, אימייל, סכומים, מספר עוסק, תאריכים, אורכי שדות וערכים מותרים גם ב-UI וגם ב-PostgreSQL.
3. **Intrusion Hardening** — Electron IPC/preload/navigation/URLs/files, Android SecureStore, signed URL host validation ו-upload restrictions.
4. **Device Management / Tenant Isolation readiness** — `revoke_device` מאובטח, owner/admin בלבד והגנת המכשיר הפעיל.
5. **Windows Local File Capabilities** — sender pinning ל-renderer הארוז המדויק, one-time approvals, canonical path validation, מגבלת 10MB ובדיקת magic bytes.
6. **Android Image & Session Boundaries** — shared image validator ל-JPEG/PNG/WebP, decoded-size/magic bytes, signed URL pinning, no-redirect downloads ו-SecureStore session.
7. **Tenant / Storage Boundary Audit** — migration מוכן ל-Staging שמחייב Storage keys להתחיל ב-`business_id` של הרשומה, audit SQL ל-RLS/Policies/RPC/Storage ומטריצת A/B. **לא הוחל על Production ולא נחשב Tenant Isolation PASS עד בדיקת Staging אמיתית.**
8. **Dependency & Supply-Chain Audit** — Windows runtime audit נקי; Android כולל Known-Risk dependency baseline מפורש ומנוטר, ללא `npm audit fix --force` וללא שדרוג Major אוטומטי.

### Phase 8 — מצב תלויות

#### Windows
`npm audit --omit=dev` על dependency graph טרי: **0 vulnerabilities**.

#### Android
ב-Expo SDK 54 הנוכחי נמצאו: **0 Critical, 11 High, 7 Moderate**. הממצאים הגבוהים נמצאים בעיקר בשרשרת Expo/Metro/React Native, כולל build/bundling packages. הם מתועדים ב-`SECURITY_PHASE8.md` וב-`security/android-npm-audit-baseline.json`.

ה-CI אינו מסתיר אותם: הוא נכשל אם מופיע Critical כלשהו, אם מספר ה-High עולה מעל 11, או אם מופיעה חבילת High חדשה שאינה ב-baseline שנבדק. Baseline הוא חריג מנוטר — **לא remediation**.

בוצע גם ניסוי CI זמני של Expo SDK 57: לאחר התאמת config זמנית בלבד, Expo Doctor עבר 20/20, TypeScript וכל בדיקות האבטחה של Android עברו, אך `npm audit` עדיין הראה **11 High**. לכן SDK upgrade לא בוצע בקוד האמיתי רק לצורך שינוי דוח audit.

### כללי אבטחה שאסור להפר
- לעולם לא להכניס `service_role`, secret key, password, production token, keystore או signing credential ל-GitHub.
- publishable/anon key בצד לקוח מותר רק עם RLS תקין.
- לא להסתמך על UI validation בלבד; validation משמעותי חייב להתקיים גם בשרת/DB או ב-trusted process לפי סוג הפעולה.
- renderer אינו סמכות לנתיב קובץ מקומי.
- MIME מדווח אינו מספיק כדי לאשר תמונה; יש לבדוק גם decoded size ו-magic bytes.
- signed storage URL שנפתח מחוץ ל-Supabase SDK חייב לעבור host/path validation.
- אין להוסיף Android deep-link scheme/intent filter בלי threat model ובדיקות ייעודיות.
- כל `SECURITY DEFINER` חייב לכלול authentication, authorization ו-`search_path` קשיח.
- אין לבצע penetration test הרסני על Production.
- אין להשתמש אוטומטית ב-`npm audit fix --force`.
- אין למחוק קבלות/לקוחות/מכשירים אמיתיים ב-SQL ידני כאשר קיימת פעולה אפליקטיבית מאובטחת.

## Supabase — מצב Security
- RLS פעיל בטבלאות העסקיות המרכזיות לפי הבדיקות שבוצעו מול ה-live project.
- Policies של customers, receipts, expenses, devices, sequences/reservations משתמשות בהרשאת business.
- Storage מופרד לפי `business_id` ומוגן ב-policies לפי הבדיקה החיה שבוצעה.
- `consume_receipt_reservation` דורשת auth + business access.
- `cancel_receipt_cloud`, `consume_receipt_reservation` ו-`user_has_business_access` אינם זמינים ל-anon.
- `businesses UPDATE` מוגבל ל-owner/admin.
- `revoke_device` זמין ל-authenticated owner/admin בלבד ומגן על המכשיר הפעיל.
- migrations שהוחלו ב-Production מגובות תחת `supabase/migrations/`.
- Phase 7 migration נמצא ב-repo אך **אינו מסומן Applied to Production**; יש להריץ קודם ב-Staging.
- ה-repository אינו מכיל את כל היסטוריית ה-schema/RLS/Storage המקורית, ולכן אין להסיק Tenant Isolation PASS מה-source בלבד.
- עדיין מומלץ להפעיל **Leaked Password Protection** ב-Supabase Auth לאחר בדיקת השפעה.

## ניהול מכשירים — משימה ידנית עתידית
ב-Production נמצאו 4 רשומות devices למרות שבפועל קיימים 3 מכשירים. יש להסיר דרך מסך "מכשירים מחוברים" את **Android שנרשם ב-9.8.2026** באמצעות RPC `revoke_device`, ולא DELETE ידני. לאחר הניתוק המונה אמור לרדת מ-4 ל-3.

## בדיקות שכבר עברו

### Windows
- Production Hardening
- Sidebar UI
- Security Input
- Customer Create — 11/11
- Intrusion Hardening — 10/10
- Device Management — 10/10
- File Capability Hardening — 10/10
- Electron + Renderer TypeScript — PASS
- `git diff --check` — PASS
- Phase 8 runtime dependency audit — **0 vulnerabilities**

### Android
- Security / Release checks
- Regression audit
- Production hardening
- App icon
- EAS bundle dependencies
- Intrusion Hardening — 10/10
- Device Management — 8/8
- Android Boundary Hardening — 11/11
- TypeScript — PASS
- Phase 8 dependency gate — PASS against reviewed known-risk baseline; **11 High remain known and unresolved**.
- Ephemeral Expo SDK 57 compatibility evaluation: Expo Doctor 20/20, TypeScript PASS, Security 8/8, Intrusion 10/10, Devices 8/8, Boundaries 11/11; dependency highs remained 11.

### Supabase / Phase 7
- Static tenant/storage gate — PASS.
- Merge-marker scan — PASS.
- Phase 7 secret scan — PASS.
- Real authenticated A/B Tenant Isolation test — **PENDING Staging**.

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
```

`release:check` כולל גם `verify:android-boundary-hardening`.

Build APK:
```powershell
$env:EAS_NO_VCS="1"
npx eas-cli@latest build -p android --profile production-apk
```

### Dependency audit
מתבצע אוטומטית באמצעות `.github/workflows/security-phase8-dependencies.yml`. Windows משתמש strict gate; Android משתמש reviewed baseline שמוגדר ב-`security/android-npm-audit-baseline.json`.

## Google Play
- APK משמש להתקנה ישירה; ל-Google Play יש לבנות AAB.
- יש לשמור על package ID ועל signing/Keystore יציבים.
- לפני פרסום: להשלים Tenant Isolation tests בסביבה מבודדת, Data Safety, Privacy Policy ו-Play release readiness.

## המשימות הבאות — לפי סדר
1. להמשיך לעקוב אחרי advisories של Android ולבדוק upstream remediation תואם, בלי `--force` ובלי downgrade אוטומטי.
2. לבצע בדיקה ידנית של Windows 1.1.5-security.5: צירוף/החלפת אסמכתה, בחירת לוגו חדש ושמירת לוגו קיים.
3. לבצע Windows build/install verification ורק לאחר PASS לקדם את 1.1.5 לגרסת Production.
4. לבצע בדיקה ידנית של Android Phase 6 flows לפני release חדש.
5. לבצע ידנית Device Management ולנתק את Android של 9.8 כאשר מוכנים לכך.
6. אם תתאפשר בעתיד סביבת Staging ללא עלות מתאימה, להריץ `supabase/SECURITY_PHASE7_STAGING_AUDIT.sql` ומטריצת User A/Business A מול User B/Business B.
7. רק לאחר Staging PASS לשקול החלת Phase 7 Storage-key binding migration על Production.
8. להפעיל Leaked Password Protection לאחר בדיקה.
9. לאחר PASS מלא להכין Google Play release ו-Windows production release.

## כלל עבודה לגרסאות
- לא עורכים את גרסת ה-Production היציבה ישירות.
- שינוי → branch/version חדש → בדיקות → regression → security checks → build → בדיקה ידנית → release.
- כל שינוי משמעותי חייב להיכנס גם ל-`CHANGELOG.md`.
- כל שינוי בתהליך העבודה/פקודות חייב להיכנס ל-`WORKFLOW.md`.
- כל שינוי אבטחה חייב להיכנס ל-`SECURITY.md`.
- Known-risk security baseline חייב להיות מפורש, מנוטר ומתועד; אסור להפוך warning ל-PASS ללא רישום והצדקה.
- כל גרסת מקור שמוכרזת כבסיס ארכיוני חייבת להיות מזוהה ב-SHA-256 ב-`SOURCE_BACKUP_MANIFEST.md`.

## קבצים שאסור להעלות
`.env`, secrets, service-role keys, keystores, signing credentials, production tokens, APK/AAB/EXE installers, logs עם מידע רגיש, customer data או production database dumps.
