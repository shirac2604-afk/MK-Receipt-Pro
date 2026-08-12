import fs from "node:fs";
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const app=JSON.parse(fs.readFileSync("app.json","utf8"));
const screen=fs.readFileSync("src/screens/ReceiptsScreen.tsx","utf8");
const checks=[["version 1.0.2",pkg.version==="1.0.2"&&app.expo.version==="1.0.2"],["versionCode 4",app.expo.android.versionCode===4],["inline customer panel",screen.includes("inlineCustomerPanel")],["customer rows pressable",screen.includes("onPress={()=>selectCustomer(customer)}")],["no customer picker modal",!screen.includes("visible={customerPickerOpen}")],["customer id stored",screen.includes("customerId:selectedCustomerId")],["cloud customers loaded",screen.includes("liveRepo.customers()")],["picker toggle",screen.includes("setCustomerPickerOpen(open=>!open)")]];
let pass=0;for(const[n,ok]of checks){console.log(`${ok?"PASS":"FAIL"} ${n}`);if(ok)pass++;}console.log(`Android 1.0.2 release: ${pass}/${checks.length}`);if(pass!==checks.length)process.exit(1);
