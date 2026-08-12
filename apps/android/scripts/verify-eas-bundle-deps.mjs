import fs from "node:fs";
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const app=fs.readFileSync("App.tsx","utf8");
const checks=[
 [pkg.version==="1.0.4","Android 1.0.4 version"],
 [pkg.dependencies?.["expo-status-bar"]==="~3.0.9","expo-status-bar declared for Expo SDK 54"],
 [app.includes('from "expo-status-bar"'),"StatusBar import covered by dependency"],
 [pkg.dependencies?.expo==="~54.0.0","Expo SDK 54"],
 [pkg.dependencies?.["react-native"]==="0.81.5","React Native 0.81.5"],
];
let ok=0;
for(const [pass,label] of checks){console.log(pass?"PASS":"FAIL",label); if(pass)ok++;}
console.log(`EAS bundle dependency audit: ${ok}/${checks.length}`);
if(ok!==checks.length) process.exit(1);
