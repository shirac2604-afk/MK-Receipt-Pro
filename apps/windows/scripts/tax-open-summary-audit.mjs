import fs from "node:fs";
import path from "node:path";

const folder = path.resolve(process.argv[2] ?? path.join(process.cwd(), "test-output", "tax-open-simulator-fixture"));
const decode = (buffer) => {
  let out = "";
  for (const byte of buffer) {
    if (byte <= 0x7f) out += String.fromCharCode(byte);
    else if (byte >= 0xe0 && byte <= 0xfa) out += String.fromCharCode(0x05d0 + byte - 0xe0);
    else out += " ";
  }
  return out;
};

const issues = [];
const dataLines = decode(fs.readFileSync(path.join(folder, "BKMVDATA.TXT"))).split("\r\n").filter(Boolean);
const iniLines = decode(fs.readFileSync(path.join(folder, "INI.TXT"))).split("\r\n").filter(Boolean);
const fixtureSummary = JSON.parse(fs.readFileSync(path.join(folder, "SIMULATOR-FIXTURE-SUMMARY.json"), "utf8"));
const report26 = fs.readFileSync(path.join(folder, "REPORT-2.6.html"), "utf8");
const report54 = fs.readFileSync(path.join(folder, "REPORT-5.4.html"), "utf8");

const dataCounts = {};
for (const line of dataLines) dataCounts[line.slice(0, 4)] = (dataCounts[line.slice(0, 4)] ?? 0) + 1;
const iniCounts = {};
for (const line of iniLines.slice(1)) iniCounts[line.slice(0, 4)] = Number(line.slice(4, 19));

const summaryToData={"C100":"C100","110D":"D110","D120":"D120","B100":"B100","B110":"B110","100M":"M100"};
for (const [summaryCode,dataCode] of Object.entries(summaryToData)) {
  const expected = dataCounts[dataCode] ?? 0;
  const actual = iniCounts[summaryCode] ?? 0;
  if (expected !== actual) issues.push(`${summaryCode}: INI.TXT=${actual}, DATA ${dataCode}=${expected}`);
}

const receiptCount = dataCounts["C100"] ?? 0;
const d120Count = dataCounts["D120"] ?? 0;
const b100Count = dataCounts["B100"] ?? 0;
const b110Count = dataCounts["B110"] ?? 0;
const report54ExpectedTotal = receiptCount + d120Count + b100Count + b110Count;
const expectedDocumentOrder=["100","200","205","210","300","305","310","320","330","340","345","400","405","406","410","420","500","600","610","700","710","800","810","820","830","840","900","910"];
const report26Codes=[...report26.matchAll(/<tr><td>(\d{3})<\/td><td>/g)].map(match=>match[1]);
if(JSON.stringify(report26Codes)!==JSON.stringify(expectedDocumentOrder))issues.push("Report 2.6 document order mismatch");
if (!report26.includes(`<td>400</td><td>קבלה</td><td>${receiptCount}</td>`)) issues.push("Report 2.6 receipt count mismatch");
for(const code of expectedDocumentOrder){
  if(code==="400")continue;
  const pattern=new RegExp(`<td>${code}</td><td>[^<]+</td><td>0</td><td>0</td>`);
  if(!pattern.test(report26))issues.push(`Report 2.6 zero row mismatch for ${code}`);
}
if (!report54.includes(`<td>100B</td><td>תנועות הנהלת חשבונות</td><td>${b100Count}</td>`)) issues.push("Report 5.4 100B mismatch");
if (!report54.includes(`<td>110B</td><td>חשבונות הנהלת חשבונות</td><td>${b110Count}</td>`)) issues.push("Report 5.4 110B mismatch");
if (!report54.includes(`<td>100C</td><td>כותרת מסמך</td><td>${receiptCount}</td>`)) issues.push("Report 5.4 100C mismatch");
if (!report54.includes(`<td>120D</td><td>פרטי קבלה</td><td>${d120Count}</td>`)) issues.push("Report 5.4 120D mismatch");
if (!report54.includes(`<td colspan="2">סה״כ רשומות נתונים</td><td>${report54ExpectedTotal}</td>`)) issues.push("Report 5.4 total mismatch");
if (report54.includes("<td>100A</td>") || report54.includes("<td>900Z</td>")) issues.push("Report 5.4 must not summarize opening/closing records");
if (fixtureSummary.totalRecords !== dataLines.length) issues.push("Fixture totalRecords mismatch");
if (fixtureSummary.totalAmountAgorot <= 0) issues.push("Fixture total amount missing");

const result = {
  valid: issues.length === 0,
  generatedAt: new Date().toISOString(),
  fileTotalRecords: dataLines.length,
  report54SummaryTotal: report54ExpectedTotal,
  dataCounts,
  iniCounts,
  report26: { documentType: "400", count: receiptCount, totalAmountAgorot: fixtureSummary.totalAmountAgorot },
  report54: { "B100": b100Count, "B110": b110Count, "C100": receiptCount, "D120": d120Count, total: report54ExpectedTotal },
  issues
};
fs.writeFileSync(path.join(folder, "OPEN-FORMAT-SUMMARY-AUDIT.json"), JSON.stringify(result, null, 2), "utf8");
if (!result.valid) {
  console.error(result);
  process.exit(1);
}
console.log(`✓ Summary audit passed: DATA=${dataLines.length}, report 5.4=${report54ExpectedTotal}`);
