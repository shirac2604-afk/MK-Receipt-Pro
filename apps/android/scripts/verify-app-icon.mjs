import fs from "node:fs";
const app=JSON.parse(fs.readFileSync("app.json","utf8"));
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const expo57=typeof pkg.dependencies?.expo==="string"&&/^\^?57\./.test(pkg.dependencies.expo.replace(/^~/,""));
const production=/^\d+\.\d+\.\d+$/.test(pkg.version)&&pkg.version===app.expo?.version&&expo57&&pkg.dependencies?.["react-native"]==="0.86.3";
const checks=[
 [production,"Android release version/context"],
 [app.expo.icon==="./assets/app-icon.png","standard app icon configured"],
 [fs.existsSync("assets/app-icon.png"),"standard app icon exists"],
 [app.expo.android?.adaptiveIcon?.foregroundImage==="./assets/adaptive-icon-foreground.png","adaptive foreground configured"],
 [app.expo.android?.adaptiveIcon?.backgroundColor==="#F6F7F9","adaptive background configured"],
 [fs.existsSync("assets/adaptive-icon-foreground.png"),"adaptive foreground exists"],
[app.expo.android?.versionCode===11,"Android versionCode 11"],
];
let ok=0; for(const [pass,label] of checks){console.log(pass?"PASS":"FAIL",label); if(pass)ok++;}
console.log(`Android app icon: ${ok}/${checks.length}`); if(ok!==checks.length) process.exit(1);
