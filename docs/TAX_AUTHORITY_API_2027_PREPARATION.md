# הכנה לדרישות שידור מבנה אחיד — 1.1.2027

מסמך עבודה פנימי עבור MK-Receipt-Pro.

## מקור הדרישה
הנחיות רשות המסים: "הנחיות בדבר שידור קובץ במבנה אחיד — תיאור ה-API's", מהדורה 1.0 / 3.2026.

## עקרונות שלא משתנים
- מנגנון הפקת INI.TXT ו-BKMVDATA.TXT הקיים נשאר מקור האמת.
- אין לשנות את מבנה הרשומות, הקידוד, הספירות או דוחות 2.6/5.4 כחלק מהוספת השידור.
- השידור מתבצע רק לאחר שכל בדיקות המבנה האחיד הקיימות עברו בהצלחה.
- יכולת השידור החדשה תהיה feature-gated ו-disabled by default עד בדיקת Sandbox מלאה.

## רצף העבודה החדש
1. הפקת INI ו-BKM במנגנון הקיים.
2. פנייה מזוהה ב-OAuth2 לשירות GetUrlsForUploadingFiles.
3. קבלת uniqueId ושני אובייקטי files — אחד ל-INI ואחד ל-BKM.
4. עבור כל קובץ: POST ללא body ל-signUrl עם headers שהתקבלו, לצורך התחלת Resumable Upload.
5. שמירת LOCATION שהוחזר מה-POST.
6. PUT של תוכן הקובץ ל-LOCATION.
7. בקבצים מעל 2MB: העלאה ב-chunks של 1,048,576 bytes.
8. שמירת fileUniqueId לכל קובץ.
9. בדיקת סטטוס בשירות Status-File-Get עד Approved או Rejected.
10. במקרה Rejected: שמירת description והצגתו למשתמש.

## סטטוסים
- Uploaded — הקובץ הועלה וממתין לעיבוד.
- Approved — הקובץ נקלט ואושר.
- Rejected — הקובץ נקלט אך נדחה; יש להציג description.

## סביבות
### Sandbox
- Upload links endpoint מוגדר וזמין במפרט.
- Status endpoint מוגדר וזמין במפרט.
- לפי המפרט, ב-Sandbox ניתן להעלות רק PDF עד 1MB; לכן בדיקות אינטגרציה יבוצעו עם payload בדיקה ייעודי ולא עם קובצי Production אמיתיים.

### Production
- כתובת שירות קבלת קישורי ההעלאה מופיעה במפרט.
- במסמך נכתב כי סביבת Production תופעל/תעודכן בהמשך.
- אין להפעיל שידור Production אוטומטי לפני אישור כתובות, הרשאות OAuth ותהליך קליטה עדכני מרשות המסים.

## אבטחה
- OAuth token לא יישמר בקוד או בקבצי repository.
- signUrl ו-LOCATION הם קישורים זמניים; אין לרשום אותם ללוגים רגילים.
- אין להעביר קבצים ל-host שאינו תואם ל-host שאושר בתשובת רשות המסים/Google upload flow.
- יש להגביל גודל קובץ לפי x-goog-content-length-range לפני תחילת השידור.
- יש לשמור audit מקומי ללא token, signUrl או מידע סודי.

## שלבי מימוש
### Phase A — הושלם בענף ההכנה
- מודל טיפוסים ל-request/response.
- endpoints ל-Sandbox ו-Production לפי מסמך 3.2026.
- validation ל-caseNumber ותקופות.
- סטטוסים Uploaded/Approved/Rejected.
- guard שמונע שידור כשה-feature disabled.
- guard שמונע שימוש ב-Production כל עוד פרטי Production אינם מאומתים במלואם.

### Phase B — הבא
- OAuth adapter נפרד.
- HTTP client לקבלת upload links.
- resumable upload client עם בדיקת host, headers וגודל.
- status polling ידני/מבוקר.
- audit trail מקומי.

### Phase C — לפני 1.1.2027
- בדיקות Sandbox מלאות.
- בדיקת הרשאות לחשבון בפועל.
- אימות מפרט עדכני מול רשות המסים.
- הפעלת Production רק לאחר אישור מפורש.

## הגשה נוכחית — 2026
דרישות ה-API החדשות אינן משנות את תיק ההגשה הנוכחי שכבר עבר סימולטור. דוחות 2.6 ו-5.4 ממשיכים לזהות במפורש את התוכנה "כהן שירה" ואת המהדורה 1.0.0-rc.17.45-b100.
