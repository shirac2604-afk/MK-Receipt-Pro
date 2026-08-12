import fs from "node:fs";
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const app=JSON.parse(fs.readFileSync("app.json","utf8"));
const checks=[["version 1.0.4",pkg.version==="1.0.4"&&app.expo.version==="1.0.4"],["versionCode 6",app.expo.android.versionCode===6],["stable package",app.expo.android.package==="il.mkreceiptpro.android"]];
let pass=0;for(const[n,ok]of checks){console.log(`${ok?"PASS":"FAIL"} ${n}`);if(ok)pass++;}console.log(`Android 1.0.4 release: ${pass}/${checks.length}`);if(pass!==checks.length)process.exit(1);
