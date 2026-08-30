import fs from "node:fs";

const screen=fs.readFileSync("src/screens/ReceiptsScreen.tsx","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const app=JSON.parse(fs.readFileSync("app.json","utf8"));
const checks=[
  [pkg.version==="1.0.10"&&app.expo.version==="1.0.10"&&app.expo.android?.versionCode===11,"Android upgrade version"],
  [/return <>\s*<FlatList/.test(screen),"receipt list is the root scroll surface"],
  [screen.includes("ListHeaderComponent={<View>"),"issue form is inside the list header"],
  [screen.includes("contentContainerStyle={s.list}"),"scroll content has protected padding"],
  [screen.includes("<Text style={s.history}>היסטוריית קבלות</Text>"),"history heading scrolls with the list"],
  [!screen.includes("<View style={s.screen}>"),"no non-scroll parent traps the receipt list"]
];
let passed=0;
for(const [ok,label] of checks){console.log(ok?"PASS":"FAIL",label);if(ok)passed++;}
console.log(`Receipt history scroll: ${passed}/${checks.length}`);
if(passed!==checks.length)process.exit(1);
