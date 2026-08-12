import fs from "node:fs";
import packageJson from "../package.json" with { type: "json" };

const required = [
  "resources/installer/app-icon.ico",
  "resources/legal/LICENSE-he.txt",
  "resources/release/build.json",
  "resources/release/RELEASE-NOTES-he.md",
  "docs/INSTALLER_RELEASE_0.14.0.md",
];

for (const file of required) {
  if (!fs.existsSync(file) || fs.statSync(file).size === 0) {
    throw new Error(`חסר קובץ Release: ${file}`);
  }
}

if (!/^1\.0\.0-rc\.\d+(?:\.\d+)?$/.test(packageJson.version)) throw new Error(`מספר גרסת RC אינו תקין: ${packageJson.version}`);
if (packageJson.build.appId !== "il.co.mkreceipt.desktop") throw new Error("App ID השתנה");
if (packageJson.build.productName !== "מפתחות להצלחה") throw new Error("שם המוצר אינו תקין");
if (packageJson.build.nsis.deleteAppDataOnUninstall !== false) throw new Error("הסרה עלולה למחוק נתונים");
if (packageJson.build.nsis.oneClick !== false) throw new Error("המתקין אינו במצב אשף");

console.log(`✓ גרסה ${packageJson.version}`);
console.log("✓ זהות המוצר וה־App ID תקינים");
console.log("✓ מתקין NSIS מוגדר");
console.log("✓ נתוני העסק נשמרים בהסרה");
console.log("✓ אייקון, רישיון ו־Build metadata קיימים");
