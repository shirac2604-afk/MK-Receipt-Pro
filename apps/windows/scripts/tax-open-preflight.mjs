import fs from "node:fs";
import path from "node:path";

const folder = path.resolve(process.argv[2] ?? path.join(process.cwd(), "test-output", "tax-open-simulator-fixture"));
const issues = [];
const counts = {};
const lengths = { "A100":95, "C100":444, "D110":339, "D120":222, "B100":317, "B110":376, "M100":298, "Z900":110 };
function decode(buffer){let out="";for(const byte of buffer){if(byte<=0x7f)out+=String.fromCharCode(byte);else if(byte>=0xe0&&byte<=0xfa)out+=String.fromCharCode(0x05d0+byte-0xe0);else out+=" ";}return out;}
const iniPath=path.join(folder,"INI.TXT"), dataPath=path.join(folder,"BKMVDATA.TXT");
if(!fs.existsSync(iniPath))issues.push("INI.TXT missing");
if(!fs.existsSync(dataPath))issues.push("BKMVDATA.TXT missing");
if(issues.length)throw new Error(issues.join("; "));
const raw=fs.readFileSync(dataPath), text=decode(raw);
if(!text.endsWith("\r\n"))issues.push("DATA does not end with CRLF");
const lines=text.split("\r\n").filter(Boolean);let seq=1,business,exportId;
for(let i=0;i<lines.length;i++){const line=lines[i],code=line.slice(0,4);counts[code]=(counts[code]??0)+1;if(!lengths[code])issues.push(`unknown code ${code} at ${i+1}`);else if(line.length!==lengths[code])issues.push(`${code} length ${line.length} at ${i+1}`);if(Number(line.slice(4,13))!==seq)issues.push(`sequence mismatch at ${i+1}`);seq++;const b=line.slice(13,22);if(!business)business=b;else if(b!==business)issues.push(`business mismatch at ${i+1}`);if(code==="A100"||code==="Z900"){const id=line.slice(22,37);if(!exportId)exportId=id;else if(id!==exportId)issues.push("export id mismatch");}}
if(lines[0]?.slice(0,4)!=="A100")issues.push("first record is not A100");
if(lines.at(-1)?.slice(0,4)!=="Z900")issues.push("last record is not Z900");
const declared=Number(lines.at(-1)?.slice(45,60));if(declared!==lines.length)issues.push(`Z900 total ${declared} != ${lines.length}`);
const summaryToData={"C100":"C100","110D":"D110","D120":"D120","B100":"B100","B110":"B110","100M":"M100"};
const ini=decode(fs.readFileSync(iniPath)).split("\r\n").filter(Boolean);if(ini[0]?.length!==466||ini[0]?.slice(0,4)!=="A000")issues.push("A000 invalid");if(Number(ini[0]?.slice(9,24))!==lines.length)issues.push("A000 total mismatch");for(const s of ini.slice(1)){if(s.length!==19)issues.push("INI summary length");const code=s.slice(0,4),count=Number(s.slice(4,19));const dataCode=summaryToData[code]??code;if(count!==(counts[dataCode]??0))issues.push(`${code} INI count mismatch`);}
const result={valid:issues.length===0,totalRecords:lines.length,counts,issues,minimumRecordTargetReached:lines.length>=2000};
fs.writeFileSync(path.join(folder,"PREFLIGHT-RESULT.json"),JSON.stringify(result,null,2));
if(issues.length){console.error(result);process.exit(1);}console.log(`✓ Preflight passed: ${lines.length} records`);console.log(counts);
