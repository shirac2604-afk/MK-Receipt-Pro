# Security Phase 3 — Android Intrusion Hardening

גרסה: 1.0.4

- קישורי Storage חתומים נבדקים לפני פתיחה: HTTPS + host קבוע + signed storage path.
- אותה בדיקה חלה על PDF קבלה ועל אסמכתאות הוצאה.
- העלאת אסמכתאות מוגבלת ל-JPEG/PNG/WebP.
- גודל Base64 של אסמכתא מוגבל.
- שם קובץ אסמכתא מוגבל באורך.
- Supabase Auth נשאר ב-SecureStore עם THIS_DEVICE_ONLY.
