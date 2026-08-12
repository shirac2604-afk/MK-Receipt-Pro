# Security Phase 3 — Windows Intrusion Hardening

גרסה: 1.1.3-security.2

- IPC sender מוגבל ל-renderer הראשי או localhost dev בלבד.
- Build ארוז מתעלם מ-VITE_DEV_SERVER_URL.
- DevTools כבוי ב-Production.
- Browser permissions נדחות כברירת מחדל.
- Drag/drop navigation חסום.
- קישורים חיצוניים מוגבלים ל-mailto, WhatsApp, Google OAuth ו-Supabase של הפרויקט.
- קישור PDF חתום חייב להיות HTTPS, host של Supabase ונתיב Storage חתום.
- פתיחת תיקיית Tax Open דורשת directory אמיתי ולא קובץ.
