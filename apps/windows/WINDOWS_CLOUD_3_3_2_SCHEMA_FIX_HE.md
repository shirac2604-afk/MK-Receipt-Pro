# Cloud 3.3.2 — Expense schema fix

תיקון התאמה בין Windows ל-Supabase:
- attachment_path הישן נשאר רק במסד המקומי של Windows.
- בענן משתמשים ב-attachment_storage_key.
- attachment_original_name נשאר ללא שינוי.
- אין צורך בהרצת SQL חדש.
