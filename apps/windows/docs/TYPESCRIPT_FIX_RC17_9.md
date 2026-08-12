# TypeScript Fix — 1.0.0-rc.17.9

תוקנו שבע שגיאות TypeScript שדווחו בבדיקת `npm run typecheck`:

- שדות אופציונליים ב־IssueReceiptInput נשלחים רק כאשר יש ערך.
- שדות אופציונליים ב־ReceiptSearchFilters נשלחים רק כאשר יש ערך.
- נוסף Guard לסיור הראשוני כאשר אינדקס השלב אינו קיים.
- ערכי BusinessSettingsInput מאותחלים כמחרוזות ולא כ־undefined.

לא שונתה לוגיקת הקבלות, המספור, PDF, לקוחות או רשות המסים.
