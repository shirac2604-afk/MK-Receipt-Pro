import fs from "node:fs";
const nav=fs.readFileSync("src/navigation/AppNavigator.tsx","utf8");
const app=fs.readFileSync("App.tsx","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const checks=[
 [pkg.version==="1.0.0-foundation.5.3","version 5.3"],
 [pkg.dependencies["@expo/vector-icons"]!=null,"vector icons dependency"],
 [pkg.dependencies["expo-font"]!=null,"expo font dependency"],
 [nav.includes("tabBarIcon"),"tab icons configured"],
 [nav.includes("home-outline"),"home icon"],
 [nav.includes("receipt-outline"),"receipt icon"],
 [nav.includes("people-outline"),"customers icon"],
 [nav.includes("wallet-outline"),"expenses icon"],
 [app.includes("useFonts"),"font preload"],
 [app.includes("Ionicons.font"),"Ionicons font preload"]
];
let ok=0;
for(const [pass,label] of checks){console.log(pass?"PASS":"FAIL",label);if(pass)ok++}
console.log(`Icons 5.3: ${ok}/${checks.length}`);
if(ok!==checks.length)process.exit(1);
