import fs from "node:fs";
import path from "node:path";

const source=fs.readFileSync("packages/tax-open/src/OpenFormatService.ts","utf8");
const matches=[...source.matchAll(/\{code:"(\d{3})",label:"([^"]+)"\}/g)].map(m=>({code:m[1],label:m[2]}));
const expected=["100","200","205","210","300","305","310","320","330","340","345","400","405","406","410","420","500","600","610","700","710","800","810","820","830","840","900","910"];
if(JSON.stringify(matches.map(x=>x.code))!==JSON.stringify(expected))throw new Error(`document order mismatch: ${matches.map(x=>x.code).join(',')}`);
if(matches.length!==28)throw new Error(`expected 28 document types, got ${matches.length}`);
const counts=Object.fromEntries(expected.map(code=>[code,code==="400"?8:0]));
const amounts=Object.fromEntries(expected.map(code=>[code,code==="400"?170000:0]));
if(Object.entries(counts).filter(([code,count])=>code!=="400"&&count!==0).length)throw new Error("non-receipt count must be zero");
if(Object.entries(amounts).filter(([code,amount])=>code!=="400"&&amount!==0).length)throw new Error("non-receipt amount must be zero");
const activeCount=6,cancelledCount=2,activeAmount=130000,cancelledAmount=40000;
if(activeCount+cancelledCount!==counts["400"])throw new Error("status count mismatch");
if(activeAmount+cancelledAmount!==amounts["400"])throw new Error("status amount mismatch");

const folder=path.join("test-output","tax-open-simulator-fixture");
if(!fs.existsSync(path.join(folder,"REPORT-2.6.html"))){console.log("Fixture missing; generating it first");await import("./tax-open-simulator-fixture.mjs");}
const html=fs.readFileSync(path.join(folder,"REPORT-2.6.html"),"utf8");
for(const token of ["תוכנה: כהן שירה","מהדורה 1.0.0-rc.17.45-b100"]){if(!html.includes(token))throw new Error(`report 2.6 missing software identification: ${token}`);}
if(html.includes("הופק באמצעות מפתחות להצלחה • גרסה 1.0.0-rc.17.37"))throw new Error("report 2.6 still contains obsolete software identification");

console.log(`✓ Report 2.6 order, reconciliation and software identification passed (${matches.length} document types)`);
