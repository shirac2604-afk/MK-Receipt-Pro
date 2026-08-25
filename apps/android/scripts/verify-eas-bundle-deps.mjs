import fs from "node:fs";
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const appConfig=JSON.parse(fs.readFileSync("app.json","utf8"));
const app=fs.readFileSync("App.tsx","utf8");
const expo57=typeof pkg.dependencies?.expo==="string"&&/^\^?57\./.test(pkg.dependencies.expo.replace(/^~/,""));
const production=/^\d+\.\d+\.\d+$/.test(pkg.version)&&expo57&&pkg.dependencies?.["react-native"]==="0.86.2";
const productionContext=pkg.version===appConfig.expo?.version&&appConfig.expo?.android?.versionCode===9;
const checks=[
 [production&&productionContext,"Android release context"],
 [pkg.dependencies?.["expo-status-bar"]==="~57.0.1","expo-status-bar declared for Expo SDK 57"],
 [app.includes('from "expo-status-bar"'),"StatusBar import covered by dependency"],
 [expo57,"Expo SDK 57"],
 [pkg.dependencies?.["react-native"]==="0.86.2","React Native 0.86.2"],
];
let ok=0;
for(const [pass,label] of checks){console.log(pass?"PASS":"FAIL",label); if(pass)ok++;}
console.log(`EAS bundle dependency audit: ${ok}/${checks.length}`);
if(ok!==checks.length) process.exit(1);
