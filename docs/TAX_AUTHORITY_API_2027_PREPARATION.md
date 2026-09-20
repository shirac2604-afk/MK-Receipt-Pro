# הכנה ל-API שידור קובץ במבנה אחיד — 2027

סטטוס: **מוכן כהכנה מוקדמת, מבודד מהתוכנה הנוכחית, HOLD עד חלון ההפצה של 1.1.2027.**

מקור הבסיס: הנחיות רשות המסים "הנחיות בדבר שידור קובץ במבנה אחיד — תיאור ה-API's", מהדורה 1.0 / מרץ 2026.

## עקרון עבודה
מסלול ההגשה והמבנה האחיד הקיים של 2026 נשאר ללא שינוי. כל רכיבי 2027 נמצאים בענף נפרד ואינם מחוברים ל-renderer, ל-IPC, ל-installer או ל-production release הנוכחי.

## רכיבים שהוכנו
1. `TaxAuthorityApi2027.ts`
   - טיפוסי request/response.
   - כתובות Sandbox/Production כפי שפורסמו במפרט הבסיס.
   - validation לתקופות ולמספר תיק.
   - סטטוסים Uploaded / Approved / Rejected.
   - guard שמונע Production כל עוד פרטי ההפעלה אינם מאושרים מחדש.

2. `TaxAuthorityApi2027Client.ts`
   - Bearer token דרך provider חיצוני בלבד.
   - בקשת upload links.
   - התחלת Resumable Upload באמצעות signUrl.
   - קבלת Location והעלאת PUT עם Content-Range.
   - chunks של 1MB.
   - בדיקת מגבלת `x-goog-content-length-range`.
   - קריאת סטטוס לפי `fileUniqueId`.
   - חסימת INI/BKM ב-Sandbox כל עוד המפרט שפורסם מציין PDF בלבד עד 1MB.

3. `TaxAuthority2027PreparationService.ts`
   - orchestrator מבודד להכנת שידור.
   - רישום מזהי הקבצים שהוחזרו.
   - עדכון Uploaded לאחר העלאה מוצלחת.
   - שמירת Error במקרה כשל.
   - רענון סטטוסים ושמירת Approved / Rejected.

4. persistence מקומי
   - migration `010_tax_authority_transmissions`.
   - repository ייעודי.
   - שמירת `transmissionUniqueId`, `fileUniqueId`, תקופה, שם קובץ וסטטוס.
   - אין שמירת `access_token`, `refresh_token`, `signUrl` או resumable upload URL.

5. בדיקות
   - contract tests.
   - HTTP client tests.
   - orchestration tests עם mocks.
   - database persistence/security tests.
   - static isolation/security gate.
   - workflow ייעודי: `Tax Authority 2027 Preparation Gate`.

## מה לא מחובר בכוונה
- אין UI.
- אין IPC.
- אין OAuth אמיתי מול רשות המסים.
- אין שידור INI/BKM ל-Sandbox או Production.
- אין feature flag פעיל בגרסה הנוכחית.
- אין שינוי ב-OpenFormatService, בדוחות 2.6/5.4 או בלוגיקת הקבלות.

## מה יישאר לבצע לפני 1.1.2027
לפני הפצה יש לבצע התאמה אחרונה מול המסמך הרשמי העדכני ביותר של רשות המסים:
- לאמת endpoints.
- לאמת OAuth flow/scopes.
- לאמת status endpoint.
- לוודא תמיכה אמיתית של Sandbox ב-INI.TXT ו-BKMVDATA.TXT.
- לבצע end-to-end רשמי בסביבת בדיקות מאושרת.
- לחבר IPC/UI רק לאחר שכל הבדיקות עברו.
- לבנות release candidate ולהריץ Windows/security checks מלאים.

פירוט מלא נמצא ב-`docs/tax-authority-2027-release-checklist.md`.

## כלל HOLD
**אין למזג את PR #29 ל-main לפני חלון ההפצה של 2027 ולפני אימות מחדש של הדרישות העדכניות.**
