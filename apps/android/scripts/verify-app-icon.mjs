import fs from "node:fs";
const app=JSON.parse(fs.readFileSync("app.json","utf8"));
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const expo57=typeof pkg.dependencies?.expo==="string"&&/^\^?57\./.test(pkg.dependencies.expo.replace(/^~/,""));
const production=pkg.version==="1.0.6"&&expo57&&pkg.dependencies?.["react-native"]==="0.86.2";
const checks=[
 [production,"Android 1.0.6 release version/context"],
 [app.expo.version==="1.0.6","app version 1.0.6"],
 [app.expo.icon==="./assets/app-icon.png","standard app icon configured"],
 [fs.existsSync("assets/app-icon.png"),"standard app icon exists"],
 [app.expo.android?.adaptiveIcon?.foregroundImage==="./assets/adaptive-icon-foreground.png","adaptive foreground configured"],
 [app.expo.android?.adaptiveIcon?.backgroundColor==="#F6F7F9","adaptive background configured"],
 [fs.existsSync("assets/adaptive-icon-foreground.png"),"adaptive foreground exists"],
 [app.expo.android?.versionCode===8,"Android versionCode 8"],
];
let ok=0; for(const [pass,label] of checks){console.log(pass?"PASS":"FAIL",label); if(pass)ok++;}
console.log(`Android app icon: ${ok}/${checks.length}`); if(ok!==checks.length) process.exit(1);
