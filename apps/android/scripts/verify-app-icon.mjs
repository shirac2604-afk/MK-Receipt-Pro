import fs from "node:fs";
const app=JSON.parse(fs.readFileSync("app.json","utf8"));
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const phase8b=pkg.version==="1.0.6-security.8b"&&pkg.dependencies?.expo?.startsWith("~56.")&&pkg.dependencies?.["react-native"]==="0.85.3";
const production=pkg.version==="1.0.5";
const checks=[
 [production||phase8b,"Android release version/context"],
 [app.expo.version==="1.0.5","app version 1.0.5"],
 [app.expo.icon==="./assets/app-icon.png","standard app icon configured"],
 [fs.existsSync("assets/app-icon.png"),"standard app icon exists"],
 [app.expo.android?.adaptiveIcon?.foregroundImage==="./assets/adaptive-icon-foreground.png","adaptive foreground configured"],
 [app.expo.android?.adaptiveIcon?.backgroundColor==="#F6F7F9","adaptive background configured"],
 [fs.existsSync("assets/adaptive-icon-foreground.png"),"adaptive foreground exists"],
 [app.expo.android?.versionCode===7,"Android versionCode 7"],
];
let ok=0; for(const [pass,label] of checks){console.log(pass?"PASS":"FAIL",label); if(pass)ok++;}
console.log(`Android app icon: ${ok}/${checks.length}`); if(ok!==checks.length) process.exit(1);
