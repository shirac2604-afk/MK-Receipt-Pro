# Foundation Decisions

- Electron Main, Preload ו-Renderer מופרדים.
- `nodeIntegration` כבוי.
- `contextIsolation`, `sandbox` ו-`webSecurity` פעילים.
- Renderer מקבל API מצומצם דרך `contextBridge`.
- App ID קבוע: `il.co.mkreceipt.desktop`.
- הנתונים העתידיים יישמרו מחוץ לתיקיית ההתקנה.
