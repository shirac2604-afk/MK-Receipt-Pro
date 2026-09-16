import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const read=(relative)=>fs.readFileSync(path.resolve(here,relative),"utf8");
const privacy=read("../../../docs/legal/privacy-policy-he.md");
const terms=read("../../../docs/legal/terms-of-use-he.md");
const support=read("../../../docs/legal/support-he.md");
const androidSettings=read("../src/screens/MoreScreen.tsx");
const androidLegal=read("../src/screens/LegalDocumentsScreen.tsx");
const androidAuth=read("../src/screens/AuthScreen.tsx");
const windowsAbout=read("../../windows/apps/desktop/renderer/src/main.tsx");

const required=[
 [privacy,"מדיניות הפרטיות"],
 [terms,"תנאי השימוש"],
 [support,"מדריך התמיכה"],
 [androidSettings,"תמיכה Android"],
 [windowsAbout,"תמיכה Windows"]
];
const details=["מפתח להצלחה","shirac2604@gmail.com","052-527-5122"];

for(const [content,label] of required){
 for(const detail of details){
  if(!content.includes(detail))throw new Error(`Commercial readiness failed: ${label} missing ${detail}`);
 }
 if(content.includes("[כתובת התמיכה]")||content.includes("[שם העסק/החברה]"))throw new Error(`Commercial readiness failed: ${label} still contains a placeholder`);
}

if(!androidSettings.includes("contactSupport"))throw new Error("Commercial readiness failed: Android support action missing");
if(!androidSettings.includes("מסמכים משפטיים")||!androidLegal.includes("תנאי שימוש")||!androidLegal.includes("מדיניות פרטיות"))throw new Error("Commercial readiness failed: Android legal documents screen missing");
if(!androidAuth.includes("acceptedLegal")||!androidAuth.includes("נדרש אישור"))throw new Error("Commercial readiness failed: signup legal consent missing");
console.log("✓ Commercial legal, support and signup-consent details are complete in documents, Android and Windows");
