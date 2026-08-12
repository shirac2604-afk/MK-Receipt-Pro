# MK Receipt Pro

מערכת פרטית לניהול עסק, קבלות, לקוחות, הוצאות, מסמכי PDF וסנכרון ענן בין Windows ל-Android.

> **מסמך זה הוא נקודת הכניסה לפרויקט.** בכל חזרה לפרויקט יש לקרוא קודם את README, אחר כך `CHANGELOG.md`, `WORKFLOW.md`, `SECURITY.md` ו-`SOURCE_BACKUP_MANIFEST.md`.

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
- Phase 5 הקשיח את בחירת הקבצים המקומיים ב-Windows באמצעות one-time capabilities, canonical paths, מגבלת גודל ו-magic bytes.
- Phase 6 הקשיח תמונות/לוגו ב-Android באמצעות MIME allowlist, decoded-size limits, magic bytes, signed URL pinning והגנת redirect.
- Auth ב-Android נשאר ב-SecureStore עם `detectSessionInUrl:false`; אין כרגע custom scheme או Android intent filter ל-deep links.

## ארכיטקטורה

```text
MK-Receipt-Pro/
├── apps/
│   ├── windows/     # Electron + TypeScript + Vite
│   └── android/     # Expo + React Native
├── supabase/
│   └── migrations/  # migrations / RLS / RPC / security hardening
├── incoming/        # one-time verified source import only
├── README.md
├── CHANGELOG.md
├── WORKFLOW.md
├── SECURITY.md
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

הפרטים נשמרים גם ב-`SOURCE_BACKUP_MANIFEST.md`. קוד המקור של שתי האפליקציות כבר נמצא בפועל תחת `apps/android` ו-`apps/windows`; `main` כולל hardening נוסף מעבר לארכיוני הבסיס: Windows Phase 5 ו-Android Phase 6.

קיים workflow בשם `.github/workflows/import-source-archives.yml` לשחזור מבוקר מהארכיונים המאומתים. כאשר שני הארכיונים המדויקים מועלים לתיקיית `incoming/`, GitHub Actions מאמת SHA-256, מחלץ אותם ל-`apps/android` ו-`apps/windows`, מסיר build/cache/secrets, מוחק את קובצי ה-ZIP ומבצע commit של קוד המקור הניתן לעיון.

**כלל יושרה:** ארכיוני ZIP הם נקודת שחזור חתומה לגרסאות המוצהרות בלבד. `main` הוא source of truth לקוד העדכני יותר לאחר hardening נוסף.

## אבטחה — מצב נוכחי

בוצעו שישה שלבי hardening:

1. **Supabase/RPC hardening** — ביטול anonymous EXECUTE לפונקציות רגישות, `auth.uid()` והרשאות עסק, `search_path` קשיח.
2. **Input & Database Validation** — אימות טלפון, אימייל, סכומים, מספר עוסק, תאריכים, אורכי שדות וערכים מותרים גם ב-UI וגם ב-PostgreSQL.
3. **Intrusion Hardening** — Electron IPC/preload/navigation/URLs/files, Android SecureStore, signed URL host validation ו-upload restrictions.
4. **Device Management / Tenant Isolation readiness** — `revoke_device` מאובטח, owner/admin בלבד, הגנת המכשיר הפעיל, הכנה ל-Staging ולבדיקת A מול B.
5. **Windows Local File Capabilities** — sender pinning ל-renderer הארוז המדויק, one-time approvals לקובצי משתמש, canonical path validation, מגבלת 10MB ובדיקת magic bytes לפני שימוש בקובץ.
6. **Android Image & Session Boundaries** — shared image validator ל-JPEG/PNG/WebP, בדיקת decoded size ו-magic bytes, hardening של לוגו/אסמכתאות, signed URL pinning ו-no-redirect downloads; session נשאר SecureStore ללא URL token detection.

### כללי אבטחה שאסור להפר
- לעולם לא להכניס `service_role`, secret key, password, production token, keystore או signing credential ל-GitHub.
- publishable/anon key בצד לקוח מותר רק עם RLS תקין.
- לא להסתמך על UI validation בלבד; validation משמעותי חייב להתקיים גם בשרת/DB או ב-trusted process לפי סוג הפעולה.
- renderer אינו סמכות לנתיב קובץ מקומי; קבצים רגישים חייבים לעבור dialog ו-validation ב-main process.
- MIME מדווח אינו מספיק כדי לאשר תמונה; ב-Android יש לבדוק גם גודל לאחר decode ו-magic bytes.
- signed storage URL שנפתח מחוץ ל-Supabase SDK חייב לעבור host/path validation.
- אין להוסיף Android deep-link scheme/intent filter בלי threat model ובדיקות ייעודיות.
- כל `SECURITY DEFINER` חייב לכלול authentication, authorization ו-`search_path` קשיח.
- אין לבצע penetration test הרסני על Production.
- אין למחוק קבלות/לקוחות/מכשירים אמיתיים באמצעות SQL ידני כאשר קיימת פעולה אפליקטיבית מאובטחת.

## Supabase — מצב Security
- RLS פעיל בטבלאות העסקיות המרכזיות.
- Policies של customers, receipts, expenses, devices, sequences/reservations משתמשות בהרשאת business.
- Storage מופרד לפי `business_id` ומוגן ב-policies.
- `consume_receipt_reservation` הוקשחה ודורשת auth + business access.
- `cancel_receipt_cloud`, `consume_receipt_reservation` ו-`user_has_business_access` אינם זמינים ל-anon.
- `businesses UPDATE` מוגבל ל-owner/admin.
- נוסף RPC `revoke_device` — authenticated owner/admin בלבד; לא ניתן לנתק את המכשיר הפעיל כאשר `current_device_id` נמסר.
- migrations שהוחלו ב-Production מגובות תחת `supabase/migrations/`.
- עדיין מומלץ להפעיל **Leaked Password Protection** ב-Supabase Auth לאחר בדיקת השפעה.

## ניהול מכשירים — משימה ידנית עתידית
ב-Production נמצאו 4 רשומות devices למרות שבפועל קיימים 3 מכשירים. יש להסיר דרך מסך "מכשירים מחוברים" את **Android שנרשם ב-9.8.2026** באמצעות RPC `revoke_device`, ולא באמצעות DELETE ידני. לאחר הניתוק המונה אמור לרדת מ-4 ל-3. פעולה זו אינה חלק מבדיקות ה-static hardening ואינה תבוצע אוטומטית.

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

## Google Play
- APK משמש להתקנה ישירה; ל-Google Play יש לבנות AAB.
- יש לשמור על package ID ועל signing/Keystore יציבים.
- לפני פרסום: להשלים Staging, Tenant Isolation tests, Data Safety, Privacy Policy ו-Play release readiness.

## המשימות הבאות — לפי סדר
1. לבצע static audit נוסף ל-Supabase tenant/storage boundaries ללא שינוי בנתוני Production.
2. להקים Supabase Development/Staging Branch ללא נתוני Production לפני בדיקות cross-tenant אקטיביות.
3. ליצור User A/Business A ו-User B/Business B ולבצע Tenant Isolation Test אמיתי ב-Staging.
4. לבדוק cross-tenant customers/receipts/expenses/storage/RPC, business_id tampering, invalid sessions ו-reservation misuse ב-Staging.
5. לבצע בדיקה ידנית של Windows 1.1.5-security.5: צירוף/החלפת אסמכתה, בחירת לוגו חדש ושמירת לוגו קיים.
6. לבצע Windows build/install verification ורק לאחר PASS לקדם את 1.1.5 לגרסת Production.
7. לבצע בדיקה ידנית של Android Phase 6: צילום/גלריה, upload אסמכתאה, בחירת לוגו וטעינת לוגו מהענן.
8. לבצע ידנית Device Management ולנתק את Android של 9.8 כאשר מוכנים לכך.
9. להפעיל Leaked Password Protection לאחר בדיקה.
10. לאחר PASS מלא להכין Google Play release ו-Windows production release.

## כלל עבודה לגרסאות
- לא עורכים את גרסת ה-Production היציבה ישירות.
- שינוי → branch/version חדש → בדיקות → regression → security checks → build → בדיקה ידנית → release.
- כל שינוי משמעותי חייב להיכנס גם ל-`CHANGELOG.md`.
- כל שינוי בתהליך העבודה/פקודות חייב להיכנס ל-`WORKFLOW.md`.
- כל שינוי אבטחה חייב להיכנס ל-`SECURITY.md`.
- כל גרסת מקור שמוכרזת כבסיס ארכיוני חייבת להיות מזוהה ב-SHA-256 ב-`SOURCE_BACKUP_MANIFEST.md`.

## קבצים שאסור להעלות
`.env`, secrets, service-role keys, keystores, signing credentials, production tokens, APK/AAB/EXE installers, logs עם מידע רגיש, customer data או production database dumps.
