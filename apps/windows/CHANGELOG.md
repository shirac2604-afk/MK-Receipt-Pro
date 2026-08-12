# 1.0.0-rc.17.29

- הקשחת תיק ההגשה לרשות המסים ובדיקת מוכנות מלאה.
- הוספת 11-REGISTRATION-READINESS.json.
- חסימת מוכנות עם מספר רישום זמני או מספר יצרן חסר.
- תיקון בדיקת דוחות 2.6 ו-5.4 כך שתדרוש PDF.

# Changelog

## 1.0.0-rc.9

- ננעל פרופיל מבנה אחיד לקבלות: 100C + 120D ללא 110D.
- נוספה חסימת Preflight לרשומות שאינן נתמכות.
- נוספו בדיקות ותיעוד להכרעת 110D.

## 0.14.3

- נוסף מרכז QA פנימי בקיצור Ctrl+Shift+Q.
- נוסף קטלוג של 154 בדיקות Release.
- נוספה הפרדה בין בדיקות אוטומטיות לבדיקות ידניות.
- נוספו ציון אוטומטי, Release Gate, Known Issues וייצוא דוח.

## 0.14.2 — Diagnostic Package

- נוספה תצוגת פרטיות לפני יצירת החבילה.
- נוספה חבילת ZIP טכנית ללא נתוני לקוחות או קבלות.
- נוספו Manifest, SHA-256 ומידע Build.
- נוספה תוצאת יצירה ופתיחת תיקיית אבחון.

# Changelog

## 0.14.1
- נוסף מסך אודות מלא.
- נוסף מזהה עסק קבוע.
- נוספו פתיחת תיקיות והעתקת מידע טכני.

# Changelog

## 0.13.0 — Dashboard, Help & Product Polish

- דף בית חדש עם ברכה אישית, תאריך, לוגו ופעולות מהירות.
- מרכז עזרה מובנה עם חיפוש ומדריכים קצרים.
- סיור ראשוני בן ארבעה שלבים לאחר השלמת ההגדרה.
- קיצורי מקלדת מוצגים במרכז העזרה.
- ליטוש רספונסיבי ורכיבי Empty State אחידים.
- יומן התקלות נשאר כלי נפרד ואינו מופיע בדף הבית.

## 1.0.0-rc.1 — Failure QA

### נבדק
- Rollback במקרה של קריסה לפני Commit.
- שמירת קבלה כאשר יצירת PDF נכשלת לאחר Commit.
- מניעת קובצי PDF חלקיים.
- זיהוי שינוי PDF באמצעות SHA-256.
- דחיית גיבוי פגום או בעל Hash שגוי.
- שמירת המסד הנוכחי כאשר שחזור נכשל.
- טיפול בנעילת SQLite ללא מספרי קבלה כפולים.
- זיהוי PDF חסר ושרשרת Audit פגומה.
- חזרה מגיבוי Pre-Restore לאחר כשל מדומה.

## 1.0.0-rc.10
- ביקורת עומק ל-TXT.INI, 100A ו-900Z.
- הפרדה בין תקינות מבנית למוכנות להגשה רשמית.
- פרטי יצרן ומספר רישום תוכנה ניתנים להגדרה ואינם מועתקים מפרטי העסק.

## 1.0.0-rc.13
- Added cross-report summary audit for TXT.INI, TXT.BKMVDATA, report 2.6 and report 5.4.
- Corrected report 5.4 totals to exclude 100A and 900Z from its printed record-type summary.
- Fixed byte audit ordering before removal of the uncompressed data file.

## 1.0.0-rc.15
- נוסף אימות מלא של דוח 2.6, סדר סוגי המסמכים ושורות האפס.
- נוספה הצלבת קבלות מבוטלות מול 100C.

## 1.1.0-dev.10 — Customer management
- Edit customer details and internal notes.
- Duplicate detection by normalized phone/email.
- No automatic merge: user explicitly selects an existing card or creates a new one.
- Duplicate check also runs before creating a new customer from receipt issuance.
- Preserves advanced receipt-history filters from dev.9.


## 1.1.0-dev.13 — VAT / Income Tax split
- Separate VAT exempt-dealer declaration and annual income-tax reporting tracks.
- VAT turnover preparation file.
- Separate export folders for VAT and Income Tax.
- Keeps self-filing safeguards and missing-document checks.
