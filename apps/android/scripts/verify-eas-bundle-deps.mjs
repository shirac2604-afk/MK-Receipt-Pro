import fs from "node:fs";
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const appConfig=JSON.parse(fs.readFileSync("app.json","utf8"));
const app=fs.readFileSync("App.tsx","utf8");
const phase8b=pkg.version==="1.0.6-security.8b"&&pkg.dependencies?.expo==="~56.0.0"&&pkg.dependencies?.["react-native"]==="0.85.3";
const productionContext=appConfig.expo?.version==="1.0.5"&&appConfig.expo?.android?.versionCode===7;
const checks=[
 [phase8b&&productionContext,"Android Phase 8B release context"],
 [pkg.dependencies?.["expo-status-bar"]==="~56.0.4","expo-status-bar declared for Expo SDK 56"],
 [app.includes('from "expo-status-bar"'),"StatusBar import covered by dependency"],
 [pkg.dependencies?.expo==="~56.0.0","Expo SDK 56"],
 [pkg.dependencies?.["react-native"]==="0.85.3","React Native 0.85.3"],
];
let ok=0;
for(const [pass,label] of checks){console.log(pass?"PASS":"FAIL",label); if(pass)ok++;}
console.log(`EAS bundle dependency audit: ${ok}/${checks.length}`);
if(ok!==checks.length) process.exit(1);
