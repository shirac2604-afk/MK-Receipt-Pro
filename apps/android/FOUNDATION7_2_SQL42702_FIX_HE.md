# Foundation 7.2 — תיקון PostgreSQL 42702

השגיאה נבעה משמות לא חד־משמעיים בתוך פונקציית PostgreSQL:
id / status / receipt_number / issued_at הם גם שמות עמודות וגם שמות פלט של RETURNS TABLE.

התיקון:
- לכל קריאת עמודה נוסף alias מפורש.
- receipt_number_reservations נקראת r.
- receipt_sequences נקראת s.
- customers נקראת c.
- RETURN QUERY מחזיר משתנים מקומיים מפורשים.

אין צורך למחוק נתונים, ליצור מחדש טבלאות או ליצור bucket חדש.
מספיק להריץ מחדש את cloud/sql/004_receipt_issuance.sql.
