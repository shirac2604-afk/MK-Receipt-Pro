# Android Production RC1.1 — Pre-APK audit

תוקן לפני בניית APK:
- בדיקות release אינן מקובעות עוד לגרסת foundation ישנה.
- React Native עודכן ל-0.81.5 בהתאם ל-Expo SDK 54.
- נוסף regression audit שמכסה את התקלות שכבר עלו בפיתוח Windows/Android:
  - לחיצה כפולה על הנפקה/ביטול
  - undefined receipt id
  - SQL ambiguous id
  - attachment_storage_key
  - PDF storage/recovery
  - offline/network errors
  - safe bottom navigation
  - APK/AAB build profiles

הערה: לפני EAS build יש להריץ npm install מחדש, מאחר שחבילת המקור אינה כוללת node_modules.
