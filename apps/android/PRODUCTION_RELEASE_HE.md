# MK Receipt Pro — Android Production RC1

בסיס: Foundation 8.5 Production Hardening לאחר Production Reset מאומת.

## בדיקה לפני Build

```powershell
npm install
npx expo install expo-print expo-sharing expo-status-bar react-native@0.81.5
npm run release:check
```

## APK להתקנה ישירה בטלפון

בפעם הראשונה בלבד:

```powershell
npx eas-cli@latest login
```

לאחר מכן:

```powershell
npx eas-cli@latest build -p android --profile production-apk
```

EAS יחזיר קישור לקובץ APK לאחר סיום ה־build.

## AAB להפצה ב־Google Play

```powershell
npx eas-cli@latest build -p android --profile production
```

זה יוצר Android App Bundle (`.aab`).

## הערה

ה־APK/AAB הוא אפליקציה עצמאית ואינו תלוי ב־Expo Go. בפעם הראשונה EAS עשוי לבקש ליצור/לקשר פרויקט Expo ולנהל מפתח חתימה Android.
