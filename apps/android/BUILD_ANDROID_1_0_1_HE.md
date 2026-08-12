# בניית MK Receipt Pro Android 1.0.1

זוהי חבילת מקור מלאה. אין צורך ב-APPLY_UPDATE.

## בדיקות
```powershell
npm install
npm run release:check
```

## APK
```powershell
$env:EAS_NO_VCS="1"
npx eas-cli@latest build -p android --profile production-apk
```

ה-build צריך להשתמש ב-Keystore הקיים ב-Expo. אין ליצור Keystore חדש.

ה-APK יותקן מעל הגרסה הקיימת משום ש-package id נשאר il.mkreceiptpro.android ו-versionCode עלה ל-3.
