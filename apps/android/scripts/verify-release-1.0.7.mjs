import fs from "node:fs";

const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const app=JSON.parse(fs.readFileSync("app.json","utf8"));
const expo57=typeof pkg.dependencies?.expo==="string"&&/^\^?57\./.test(pkg.dependencies.expo.replace(/^~/,""));
const visibleVersion=/^\d+\.\d+\.\d+$/.test(pkg.version)&&pkg.version===app.expo?.version;

const checks=[
  [visibleVersion,"matching semantic package/app version"],
  [expo57,"Expo SDK 57"],
  [pkg.dependencies?.["react-native"]==="0.86.3","React Native 0.86.3"],
  [app.expo?.android?.versionCode===10,"versionCode 10"],
  [app.expo?.android?.package==="il.mkreceiptpro.android","stable Android package id"],
  [Boolean(pkg.scripts["verify:student-local-privacy"]),"student local privacy audit"],
  [Boolean(pkg.scripts["verify:device-management"]),"device management audit"]
];

let passed=0;
for(const [ok,label] of checks){console.log(ok?"PASS":"FAIL",label);if(ok)passed+=1;}
console.log(`Android release gate: ${passed}/${checks.length}`);
if(passed!==checks.length)process.exit(1);
