import fs from "node:fs";
const source=fs.readFileSync("packages/qa/src/QaService.ts","utf8");
const counts=[...source.matchAll(/count:(\d+)/g)].map(m=>Number(m[1])); const total=counts.reduce((a,b)=>a+b,0);
if(total<150)throw new Error(`Expected at least 150 QA tests, found ${total}`);
if(!source.includes('mode:result?"automatic":"manual"'))throw new Error("Automatic/manual separation missing");
if(!source.includes('criticalFailure'))throw new Error("Release gate missing");
console.log(`✓ QA catalog contains ${total} documented checks`); console.log("✓ Automatic and manual tests are separated"); console.log("✓ Critical failure release gate exists");
