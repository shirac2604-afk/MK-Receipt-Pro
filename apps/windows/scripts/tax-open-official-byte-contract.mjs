import fs from "node:fs";
import path from "node:path";

const folder = path.resolve(process.argv[2] ?? path.join(process.cwd(), "test-output", "tax-open-simulator-fixture"));
const decodeAscii = (buffer, start, end) => buffer.subarray(start, end).toString("latin1");
const split = (buffer) => {
  const out=[]; let start=0;
  for(let i=0;i<buffer.length-1;i++) if(buffer[i]===13&&buffer[i+1]===10){out.push(buffer.subarray(start,i));start=i+2;i++;}
  return out.filter(x=>x.length>0);
};
const ini=split(fs.readFileSync(path.join(folder,"INI.TXT")));
const data=split(fs.readFileSync(path.join(folder,"BKMVDATA.TXT")));
const errors=[];
const expect=(actual, expected, label)=>{if(actual!==expected)errors.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)};
expect(decodeAscii(ini[0],0,4),"A000","INI central code");
expect(decodeAscii(ini[0],48,56),"&OF1.31&","INI format constant");
expect(decodeAscii(data[0],0,4),"A100","opening code");
expect(decodeAscii(data[0],37,45),"&OF1.31&","opening format constant");
expect(decodeAscii(data.at(-1),0,4),"Z900","closing code");
expect(decodeAscii(data.at(-1),37,45),"&OF1.31&","closing format constant");
const physicalCodes=new Set(data.map(r=>decodeAscii(r,0,4)));
for(const code of ["A100","C100","D120","B100","B110","Z900"]) if(!physicalCodes.has(code)) errors.push(`missing physical code ${code}`);
for(const forbidden of ["100A","100C","120D","100B","110B","900Z"]) if(physicalCodes.has(forbidden)) errors.push(`BiDi-reversed code leaked into bytes: ${forbidden}`);
const summaries=ini.slice(1).map(r=>decodeAscii(r,0,4));
expect(JSON.stringify(summaries),JSON.stringify(["B100","B110","C100","D120"]),"INI summary physical codes");
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log("✓ Official visual-schema byte contract passed (BiDi-safe)");
