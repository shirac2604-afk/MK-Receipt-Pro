import fs from "node:fs";

const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const app=JSON.parse(fs.readFileSync("app.json","utf8"));
const expo57=typeof pkg.dependencies?.expo==="string"&&/^\^?57\./.test(pkg.dependencies.expo.replace(/^~/,""));

const checks=[
  [pkg.version==="1.0.7","package version 1.0.7"],
  [expo57,"Expo SDK 57"],
  [pkg.dependencies?.["react-native"]==="0.86.2","React Native 0.86.2"],
  [app.expo?.version==="1.0.7","app version 1.0.7"],
  [app.expo?.android?.versionCode===9,"versionCode 9"],
  [app.expo?.android?.package==="il.mkreceiptpro.android","stable Android package id"],
  [Boolean(pkg.scripts["verify:student-local-privacy"]),"student local privacy audit"],
  [Boolean(pkg.scripts["verify:device-management"]),"device management audit"]
];

let passed=0;
for(const [ok,label] of checks){console.log(ok?"PASS":"FAIL",label);if(ok)passed+=1;}
console.log(`Android 1.0.7 release gate: ${passed}/${checks.length}`);
if(passed!==checks.length)process.exit(1);
