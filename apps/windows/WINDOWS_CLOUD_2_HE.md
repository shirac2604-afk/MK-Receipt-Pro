# Windows Cloud 2 — מספור קבלות משותף

- Windows מחייב חיבור ל-Supabase לפני הנפקת קבלה.
- המספר נשמר אטומית בענן באמצעות reserve_receipt_number.
- ההנפקה בענן נעשית באמצעות issue_receipt_from_reservation.
- אותו מספר נשמר בעותק המקומי של Windows לצורך PDF והיסטוריה מקומית.
- PDF של Windows מועלה ל-receipt-documents וה-pdf_storage_key נשמר בקבלה בענן.
- Android ו-Windows חולקים לכן את אותו רצף מספור מרכזי.

הערה: Cloud 2 מטפל בהנפקה ובמספור. סנכרון דו-כיווני מלא של רשימות לקוחות/הוצאות/היסטוריה יגיע בשלב הבא.
