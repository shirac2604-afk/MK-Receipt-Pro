import fs from "node:fs";
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const app=JSON.parse(fs.readFileSync("app.json","utf8"));
const screen=fs.readFileSync("src/screens/ReceiptsScreen.tsx","utf8");
const errors=fs.readFileSync("src/services/ErrorFormatter.ts","utf8");
const expo57=typeof pkg.dependencies?.expo==="string"&&/^\^?57\./.test(pkg.dependencies.expo.replace(/^~/,""));
const validVersionContext=/^\d+\.\d+\.\d+$/.test(pkg.version)&&pkg.version===app.expo?.version&&expo57&&pkg.dependencies?.["react-native"]==="0.86.3"&&app.expo?.android?.versionCode===12;
const checks=[[validVersionContext,"version/context"],[screen.includes("issueLock=useRef(false)"),"issue lock"],[screen.includes("cancelLock=useRef(false)"),"cancel lock"],[screen.includes("issueLock.current=true"),"immediate issue lock"],[screen.includes("issueLock.current=false"),"issue lock release"],[screen.includes("cancelLock.current=true"),"cancel lock acquire"],[screen.includes("cancelLock.current=false"),"cancel lock release"],[errors.includes("אין חיבור פעיל לענן"),"friendly offline error"],[errors.includes("בדוק את החיבור לאינטרנט"),"friendly network error"]];let ok=0;for(const[p,l]of checks){console.log(p?"PASS":"FAIL",l);if(p)ok++}console.log(`Android production hardening: ${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
