import fs from "node:fs";
const screen=fs.readFileSync("src/screens/ReceiptsScreen.tsx","utf8");
const dash=fs.readFileSync("src/screens/DashboardScreen.tsx","utf8");
const app=JSON.parse(fs.readFileSync("app.json","utf8"));
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const checks=[
 [pkg.version==="1.0.1","full release version"],
 [app.expo.version==="1.0.1" && app.expo.android.versionCode===3,"Android versionCode 3"],
 [screen.includes("בחירת לקוח קיים"),"existing-customer picker UI"],
 [screen.includes("liveRepo.customers()"),"customers loaded from cloud"],
 [screen.includes("selectCustomer(customer)"),"customer row pressable"],
 [screen.includes("customerId:selectedCustomerId"),"receipt stores customer_id"],
 [screen.includes("clientPhone,clientEmail"),"customer contact copied"],
 [screen.indexOf("issueLock.current=true") > screen.indexOf("if(!clientName.trim()"),"validation before issue lock"],
 [!dash.includes('fontWeight:"850"') && !dash.includes("fontWeight:'850'"),"valid React Native font weights"]
];
let pass=0;for(const [ok,label] of checks){console.log(ok?"PASS":"FAIL",label);if(ok)pass++;}
console.log(`Android 1.0.1 release: ${pass}/${checks.length}`);if(pass!==checks.length)process.exit(1);
