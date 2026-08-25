# Changelog — MK Receipt Pro

כל שינוי משמעותי בפרויקט חייב להירשם כאן. הרשומות מסודרות מהחדש לישן.

## 2026-08-25 — Security Phase 14 / Source and lockfile integrity

- Restored complete Android and Windows npm lockfiles after both committed files were found to contain tool-output truncation markers and invalid JSON.
- Aligned lockfile package metadata with Android `1.0.8` and Windows `1.1.7` while preserving the current direct dependency sets.
- Added a repository-wide tracked JSON and truncation-marker verifier.
- Added a dedicated Phase 14 workflow with exact `npm ci` installs and TypeScript checks for both applications.
- Changed the existing Phase 8 supply-chain workflow from `npm install` to `npm ci`, preventing CI from silently repairing or rewriting damaged lockfiles.
- Aligned four Android Expo SDK 57 packages to the compatible patch versions reported by `expo-doctor` and regenerated the lockfile on GitHub Actions.
- Updated the student-reminder gate to validate the Expo Notifications SDK 57 version family instead of pinning a stale patch number.
- No APK, Windows installer, Supabase setting or Production deployment was changed.

## 2026-08-25 — Security Phase 13 / Authenticated password change

- Added a signed-in password-change flow to Android and Windows.
- Both clients require the current password, revalidate the current Supabase user and require the reauthenticated user ID to match before calling `updateUser`.
- Windows additionally forces an active-device check before the operation.
- New passwords are bounded to 8–128 characters and use the Phase 12 common/email-derived checks.
- Added masked confirmation UI, sanitized IPC errors, release-gate verifiers and a dedicated GitHub Actions workflow.
- Password recovery remains deferred until a verified deep-link/callback trust model is designed.
- No build, Supabase Auth setting or Production deployment was changed.

## 2026-08-25 — Security Phase 12 / Auth and cloud session hardening

- Android registration now uses an eight-character minimum, basic offline common-password checks and email-derived password rejection; existing sign-in compatibility is preserved.
- Windows now revalidates the active device before sensitive cloud operations and through a 15-second main-process monitor, so remote revocation clears the local connected session outside the backup screen.
- Cloud expense downloads now enforce a 10 MB limit, PDF/PNG/JPEG/WebP signatures, content-derived extensions, controlled atomic writes and a second IPC validation before Windows opens the file.
- Added Phase 12 static verification and a dedicated GitHub Actions gate.
- No Android/Windows build and no Supabase Production configuration change were performed in this source phase.

## 2026-08-25 — Google Drive connection and durable device disconnection

- Google Drive uses the configured Google Calendar Desktop OAuth client ID before the packaged fallback.
- OAuth remains a public-client PKCE flow; no Google client secret is copied into the Drive service.
- Token refresh remains bound to the client ID that originally issued the refresh token.
- Disconnecting Drive cancels queued sync work, waits for an active sync, and leaves Google Calendar connected.
- Device removal now creates a revocation tombstone instead of deleting a row that the remote computer could recreate.
- Revoked devices are hidden from the active-device list, cannot register again silently, and cannot reserve receipt numbers.
- Windows checks for revocation every 30 seconds and signs out the revoked computer locally; reconnecting requires an explicit password sign-in.
- Android and Windows sign-out now use local-session scope so disconnecting one device does not log out every device.
- Direct insert/update/delete access to `devices` is denied; guarded RPCs own the lifecycle.
- Supabase migration verified on `MK-Receipt-Pro-Phase9-Staging`.
- Google Drive connection checks: 9/9; Windows device management checks: 16/16; Android device management checks: 10/10.


## 2026-08-25 — Device revocation preserves receipt history
- ניתוק מכשיר אינו מוחק עוד את רשומת המכשיר, הזמנות מספרי קבלה או קבלות קיימות.
- המכשיר מסומן כמנותק, ולכן אינו יכול להתחבר מחדש או לשמור מספרי קבלה חדשים.
- רק הזמנות מספר שעדיין ממתינות מבוטלות בעת הניתוק; הזמנות ששימשו לקבלות נשמרות לצורכי היסטוריה ובקרה.
- רשימות וספירת המכשירים ב-Windows וב-Android מציגות מכשירים פעילים בלבד.

## 2026-08-12 — Security Phase 6 / Android Image & Session Boundaries
### Android 1.0.5 source hardening
- Android נשאר בגרסה 1.0.5; לא בוצע bump לגרסת Production בשלב זה.
- נוסף validator משותף לתמונות עם whitelist ל-JPEG/PNG/WebP.
- נוספה בדיקת גודל לאחר decode ולא רק לפי אורך base64.
- נוספה בדיקת magic bytes ל-PNG, JPEG ו-WebP כדי למנוע הסתמכות על MIME מדווח בלבד.
- אסמכתאות הוצאות נבדקות בעת בחירה ושוב לפני upload.
- מסלול לוגו העסק הוקשח באותן בדיקות MIME/size/content.
- הורדת לוגו מ-Supabase משתמשת כעת ב-host/path pinning הקיים של signed URLs.
- redirects נחסמים בהורדת לוגו, וה-response נבדק לפי content-type, גודל ותוכן לפני יצירת data URL.
- Session נשאר ב-SecureStore עם `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` ו-`detectSessionInUrl:false`.
- אומת שאין כרגע `scheme` או `android.intentFilters`, ולכן אין נקודת כניסה מותאמת של Android deep link.
- סקריפט Intrusion Hardening הישן עודכן כדי לבדוק baseline אבטחה ולא להיכשל על version hardcoded ישן.
- Android Boundary Hardening: 11/11.
- Intrusion Hardening regression: 10/10.
- Device Management regression: 8/8.
- TypeScript: PASS.
- GitHub Actions workflow: SUCCESS.
- השינוי מוזג ל-`main` דרך PR #3.

### Release status
- Android 1.0.5 נשארת גרסת ה-Production הנוכחית.
- Phase 6 הוא hardening נוסף של קוד המקור ב-`main`; לפני build/release חדש יש לבצע בדיקה ידנית של צילום/גלריה, העלאת אסמכתאה, בחירת לוגו וטעינת לוגו מהענן.

## 2026-08-12 — Security Phase 5 / Windows Local File Capabilities
### Windows 1.1.5-security.5
- הוקשח גבול האמון בין Electron renderer ל-main process עבור קבצים מקומיים.
- sender validation ב-Production מוצמד כעת לקובץ ה-renderer הארוז המדויק (`dist/index.html`) ולא לכל `file://` דומה.
- בחירת אסמכתאות להוצאות ולוגו יוצרת הרשאת קובץ חד-פעמית (one-time capability) שנצרכת בעת הפעולה.
- נתיב קובץ שלא נבחר דרך dialog של האפליקציה נדחה גם אם renderer מנסה להעבירו ישירות.
- נוסף canonical path validation באמצעות `realpath` כדי למנוע עקיפות נתיב.
- נוספה מגבלת גודל של 10MB לקבצים שנכנסים דרך flows אלה.
- נוספה בדיקת extension + magic bytes עבור PDF, PNG, JPEG ו-WebP.
- תוקנו שגיאות TypeScript קיימות ב-renderer שנחשפו בבדיקת typecheck המלאה, ללא שינוי לוגיקה עסקית מכוון.
- נוסף `check:file-capability-hardening` ל-release gate של Windows.
- File Capability Hardening: 10/10.
- Electron + Renderer TypeScript: PASS.
- `git diff --check`: PASS.
- GitHub Actions workflow: SUCCESS.
- השינוי מוזג ל-`main` דרך PR #2.

### Release status
- 1.1.5-security.5 הוא baseline קוד מאובטח לאחר Phase 5.
- Windows 1.1.4 נשארת גרסת ה-Production האחרונה שנבדקה ידנית עד לבדיקת flow, build והתקנה של 1.1.5.

## 2026-08-12 — Security Phase 4 / Device Management
### Windows 1.1.4
- נוסף מסך/רשימת מכשירים מחוברים.
- מוצגים platform, תאריך רישום ו-last seen.
- נוסף כפתור ניתוק למכשירים אחרים.
- המכשיר הפעיל מוגן מניתוק עצמי.
- החיבור לניתוק עובר דרך RPC מאובטח ולא DELETE ישיר.
- Device Management checks: 10/10.

### Android 1.0.5
- נוסף ניהול מכשירים מאובטח.
- owner/admin בלבד יכולים לנתק מכשיר.
- המכשיר הנוכחי מוגן.
- Device Management checks: 8/8.

### Supabase
- נוסף `revoke_device(p_business_id, p_device_id, p_current_device_id)`.
- SECURITY DEFINER עם `search_path=public`.
- דורש `auth.uid()`.
- דורש role של owner/admin באותו business.
- anon EXECUTE חסום; authenticated EXECUTE מותר.
- תוקנה policy כפולה של `businesses UPDATE`; עדכון פרטי עסק מוגבל ל-owner/admin.

### Pending
- להסיר דרך הממשק את Android שנרשם ב-9.8.2026 ולוודא שהמונה יורד מ-4 ל-3.
- להקים Supabase Staging ולבצע Tenant Isolation Test.

## 2026-08-12 — Security Phase 3 / Intrusion Hardening
### Windows 1.1.3
- IPC sender validation הוקשח.
- DevTools והרשאות browser נחסמו ב-Production.
- dev server נחסם באפליקציה ארוזה.
- external URLs צומצמו ל-hosts מורשים.
- `open-folder` הוקשח כדי שלא ישמש לפתיחת executable file.
- PDF/external links עוברים validation.
- Intrusion Hardening: 10/10.

### Android 1.0.4
- HTTPS + host validation לקישורי Supabase חתומים.
- whitelist ל-JPEG/PNG/WebP uploads.
- מגבלת גודל לאסמכתאות.
- Auth session נשאר ב-SecureStore.
- Intrusion Hardening: 10/10.

## 2026-08-12 — Security Phase 2 / Input & Database Validation
### Supabase
- נוספו PostgreSQL constraints לשדות רגישים.
- טלפון, אימייל, סכומים, מספר עוסק, שדות חובה, payment methods/statuses ואורכי שדות נאכפים ב-DB.
- לפני הוספת constraints נבדק שהנתונים הקיימים עוברים את הכללים.

### Android 1.0.3
- Input validation ב-UI.
- Supabase Auth session הועבר מ-AsyncStorage ל-expo-secure-store.
- נוסף migration של session קיים ומחיקתו מהאחסון הישן.
- Security 8/8; Regression 15/15; Production 9/9; App Icon 7/7; EAS deps 5/5.

### Windows 1.1.2
- Input validation מקביל.
- payment method בהוצאה הוגבל לרשימה סגורה.
- Production 8/8; Sidebar 8/8; Security Input 8/8.

### Customer Create Fix
- התברר שאין Create אמיתי תחת לשונית לקוחות.
- נוסף UI -> preload -> IPC -> service -> Supabase.
- validation + duplicate check.
- Customer Create 11/11.
- המשתמש בדק ואישר שעובד.

## 2026-08-12 — Security Phase 1 / Supabase RPC
- `consume_receipt_reservation` נמצאה כ-SECURITY DEFINER עם הרשאות רחבות מדי.
- נוספה בדיקת auth + business access.
- `search_path=public`.
- בוטל anon EXECUTE ל-`consume_receipt_reservation`, `cancel_receipt_cloud`, `user_has_business_access`.
- Security Advisor נבדק מחדש והאזהרות האנונימיות הרלוונטיות נעלמו.
- Leaked Password Protection עדיין מומלץ להפעלה.

## Android 1.0.2
- תיקון בחירת לקוח קיים במסך קבלה חדשה.
- ניסיון קודם עם Modal לא עבד בטלפון.
- המנגנון הוחלף לרשימת לקוחות inline בתוך מסך הקבלה.
- Release 8/8 לאחר תיקון regression scripts ישנים.

## Android build setup
- EAS Build הוגדר.
- נוצר Android Keystore בענן Expo/EAS.
- בעת Git לא זמין נעשה שימוש ב-`EAS_NO_VCS=1`.
- APK production נבנה והותקן בהצלחה.

## Windows fixes מוקדמים
- תוקן TypeScript `duplicates[0]` possibly undefined.
- תוקנה בעיית `expenses.attachment_path` / schema cache.
- נוספה/תוקנה גישה לפרטי העסק ב-Windows.
- ביטול קבלה נוסף ל-Windows ונבדק משני המכשירים.
- Sidebar תוקן כך שרק הפריט הפעיל נראה selected.
- בדיקת איפוס: אין קבלות/הוצאות/לקוחות, פרטי עסק ולוגו נשמרים, next receipt number = 1001.

## כלל תחזוקה
בכל release חדש יש להוסיף כאן: version, מה השתנה, migrations, בדיקות אוטומטיות, בדיקות ידניות, known issues והשלב הבא.
