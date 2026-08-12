import fs from "node:fs";
import path from "node:path";

const folder = path.resolve(process.argv[2] ?? path.join(process.cwd(), "test-output", "tax-open-simulator-fixture"));
const iniPath = path.join(folder, "INI.TXT");
const dataPath = path.join(folder, "BKMVDATA.TXT");
const expectedConstant = "&OF1.31&";
const issues = [];
const add = (code, message, details = {}) => issues.push({ code, message, ...details });

for (const file of [iniPath, dataPath]) if (!fs.existsSync(file)) add("FILE_MISSING", `Missing ${path.basename(file)}`);
if (!issues.length) {
  const ini = fs.readFileSync(iniPath);
  const data = fs.readFileSync(dataPath);
  const split = (buffer) => {
    const lines = buffer.toString("latin1").split("\r\n");
    if (lines.at(-1) === "") lines.pop();
    return lines;
  };
  const iniLines = split(ini), dataLines = split(data);
  if (!ini.includes(Buffer.from("\r\n", "ascii")) || ini.includes(Buffer.from("\n", "ascii")) === false) add("INI_CRLF", "INI.TXT must use CRLF");
  if (!data.includes(Buffer.from("\r\n", "ascii"))) add("DATA_CRLF", "BKMVDATA.TXT must use CRLF");
  if (iniLines[0]?.length !== 466) add("A000_LENGTH", `A000 length ${iniLines[0]?.length ?? 0}, expected 466`);
  if (iniLines[0]?.slice(0,4) !== "A000") add("A000_CODE", `Central code is ${iniLines[0]?.slice(0,4)}`);
  if (iniLines[0]?.slice(48,56) !== expectedConstant) add("A000_CONSTANT", `A000 constant is ${iniLines[0]?.slice(48,56)}`);
  if (iniLines[0]?.slice(56,64) === "00000000") add("REGISTRATION_ZERO", "Fixture registration number must not be zero");
  if (!["0","1","2"].includes(iniLines[0]?.slice(184,185))) add("ACCOUNTING_TYPE", `Invalid accounting type ${iniLines[0]?.slice(184,185)}`);
  const expected = { "A100":95, "C100":444, "D120":222, "B100":317, "B110":376, "Z900":110 };
  for (let i=0;i<dataLines.length;i++) {
    const code=dataLines[i].slice(0,4), wanted=expected[code];
    if (!wanted) add("UNKNOWN_CODE", `Unknown code ${code}`, {line:i+1});
    else if (dataLines[i].length!==wanted) add("RECORD_LENGTH", `${code} line ${i+1} length ${dataLines[i].length}, expected ${wanted}`, {line:i+1,code});
  }
  if (dataLines[0]?.slice(0,4)!=="A100") add("A100_MISSING", "First data record must be A100");
  if (dataLines.at(-1)?.slice(0,4)!=="Z900") add("Z900_MISSING", "Last data record must be Z900");
  if (dataLines[0]?.slice(37,45)!==expectedConstant) add("A100_CONSTANT", `A100 constant is ${dataLines[0]?.slice(37,45)}`);
  if (dataLines.at(-1)?.slice(37,45)!==expectedConstant) add("Z900_CONSTANT", `Z900 constant is ${dataLines.at(-1)?.slice(37,45)}`);
  const totalIni=Number(iniLines[0]?.slice(9,24));
  const totalZ=Number(dataLines.at(-1)?.slice(45,60));
  if (totalIni!==dataLines.length) add("INI_TOTAL", `INI total ${totalIni}, actual ${dataLines.length}`);
  if (totalZ!==dataLines.length) add("Z900_TOTAL", `Z900 total ${totalZ}, actual ${dataLines.length}`);
  const businessIni=iniLines[0]?.slice(24,33), businessA=dataLines[0]?.slice(13,22), businessZ=dataLines.at(-1)?.slice(13,22);
  if (!(businessIni===businessA && businessA===businessZ)) add("BUSINESS_MISMATCH", "Business numbers differ", {businessIni,businessA,businessZ});
  const idIni=iniLines[0]?.slice(33,48), idA=dataLines[0]?.slice(22,37), idZ=dataLines.at(-1)?.slice(22,37);
  if (!(idIni===idA && idA===idZ)) add("EXPORT_ID_MISMATCH", "Primary IDs differ", {idIni,idA,idZ});
  const counts={}; for(const line of dataLines) counts[line.slice(0,4)]=(counts[line.slice(0,4)]??0)+1;
  const iniCounts={}; for(const line of iniLines.slice(1)) iniCounts[line.slice(0,4)]=Number(line.slice(4,19));
  const summaryMap={"B100":"B100","B110":"B110","C100":"C100","D120":"D120"};
  for(const [summaryCode,dataCode] of Object.entries(summaryMap)) if(iniCounts[summaryCode]!==counts[dataCode]) add("SUMMARY_MISMATCH", `${summaryCode} summary ${iniCounts[summaryCode]} actual ${counts[dataCode]}`);
  if (dataLines.length<2000) add("MINIMUM_RECORDS", `Only ${dataLines.length} records; simulator requires at least 2000`);
  const report={valid:issues.length===0,generatedAt:new Date().toISOString(),folder,totalRecords:dataLines.length,expectedConstant,issues};
  fs.writeFileSync(path.join(folder,"OPEN-FORMAT-FIXED-WIDTH-AUDIT.json"),JSON.stringify(report,null,2),"utf8");
}
if(issues.length){console.error(JSON.stringify({valid:false,issues},null,2));process.exit(1)}
console.log("✓ Fixed-width byte/offset audit passed");
