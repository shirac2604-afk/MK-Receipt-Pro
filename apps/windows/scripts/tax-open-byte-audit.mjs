import fs from "node:fs";
import path from "node:path";

const root = path.resolve("test-output/tax-open-simulator-fixture");
const ini = fs.readFileSync(path.join(root, "INI.TXT"));
const data = fs.readFileSync(path.join(root, "BKMVDATA.TXT"));
const issues = [];

function splitCrlf(buffer) {
  const records=[]; let start=0;
  for(let i=0;i<buffer.length-1;i+=1){if(buffer[i]===13&&buffer[i+1]===10){records.push(buffer.subarray(start,i));start=i+2;i+=1;}}
  if(start<buffer.length)records.push(buffer.subarray(start));
  return records.filter((record,index,all)=>!(index===all.length-1&&record.length===0));
}
function ascii(buffer,start,end){return buffer.subarray(start,end).toString("latin1")}
function digits(buffer,start,end){return buffer.subarray(start,end).every(byte=>byte>=48&&byte<=57)}
function spaces(buffer,start,end){return buffer.subarray(start,end).every(byte=>byte===32)}
function checkFile(name,buffer,lengths){
  if(buffer[0]===0xef&&buffer[1]===0xbb&&buffer[2]===0xbf)issues.push(`${name}: UTF-8 BOM`);
  if(!(buffer.at(-2)===13&&buffer.at(-1)===10))issues.push(`${name}: missing final CRLF`);
  for(let i=0;i<buffer.length;i+=1){if(buffer[i]===10&&(i===0||buffer[i-1]!==13))issues.push(`${name}: bare LF at ${i}`);if(buffer[i]===13&&(i+1>=buffer.length||buffer[i+1]!==10))issues.push(`${name}: bare CR at ${i}`);if(!(buffer[i]<=127||(buffer[i]>=224&&buffer[i]<=250)))issues.push(`${name}: invalid byte 0x${buffer[i].toString(16)} at ${i}`)}
  const records=splitCrlf(buffer);records.forEach((record,index)=>{const code=ascii(record,0,4);const expected=name==="INI.TXT"&&index>0?19:lengths[code];if(record.length!==expected)issues.push(`${name} record ${index+1} ${code}: ${record.length} != ${expected}`)});return records;
}
const lengths={"A000":466,"A100":95,"C100":444,"D120":222,"B100":317,"B110":376,"Z900":110};
const iniRecords=checkFile("INI.TXT",ini,lengths);const dataRecords=checkFile("BKMVDATA.TXT",data,lengths);
const a000=iniRecords[0];if(!digits(a000,9,24)||!digits(a000,24,33)||!digits(a000,33,48))issues.push("A000 numeric zero-padding failed");if(!spaces(a000,4,9)||!spaces(a000,204,214))issues.push("A000 space-padding failed");
let hebrew=0;for(const byte of Buffer.concat([ini,data]))if(byte>=224&&byte<=250)hebrew+=1;if(hebrew===0)issues.push("No ISO-8859-8 Hebrew bytes found");
for(let i=0;i<dataRecords.length;i+=1){const record=dataRecords[i],code=ascii(record,0,4);if(!digits(record,4,13)||!digits(record,13,22))issues.push(`${code} record ${i+1}: numeric padding failed`);if(code==="A100"&&!spaces(record,45,95))issues.push("A100 future field not spaces");if(code==="Z900"&&!spaces(record,60,110))issues.push("Z900 future field not spaces");if(code==="D120"&&(!digits(record,45,95)||!spaces(record,162,222)))issues.push(`D120 record ${i+1}: conditional/future padding failed`)}
if(issues.length)throw new Error(issues.slice(0,30).join("\n"));
const result={valid:true,iniRecords:iniRecords.length,dataRecords:dataRecords.length,iniBytes:ini.length,dataBytes:data.length,hebrewBytes:hebrew,crlf:true,bom:false,invalidBytes:0};
fs.writeFileSync(path.join(root,"BYTE-LEVEL-AUDIT.json"),JSON.stringify(result,null,2),"utf8");
console.log(`✓ Byte-level audit passed: ${dataRecords.length} data records, ${hebrew} Hebrew ISO-8859-8 bytes`);
