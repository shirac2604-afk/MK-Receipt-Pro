import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const outputRoot = path.join(root, "test-output", "tax-open-simulator-fixture");
fs.rmSync(outputRoot, { recursive: true, force: true });
fs.mkdirSync(outputRoot, { recursive: true });

const BUSINESS = "039375365";
const EXPORT_ID = "314159265358979";
const OF_CONSTANT = "&OF1.31&";
const REGISTRATION_TEST_VALUE = "00000001"; // Simulator fixture only; never final submission.
const RECEIPT_COUNT = 1000;
const JOURNAL_ENTRY_COUNT = 2;
const ACCOUNT_COUNT = 2;

const alpha = (value, length, fill = " ") => String(value ?? "").slice(0, length).padEnd(length, fill);
const numeric = (value, length) => String(value ?? "").replace(/\D/g, "").slice(-length).padStart(length, "0");
const signedAmount = (agorot, length = 15) => `${agorot < 0 ? "-" : "+"}${String(Math.abs(Math.trunc(agorot))).padStart(length - 1, "0").slice(-(length - 1))}`;

function fixedRecord(length, fields) {
  const record = Array(length).fill(" ");
  for (const field of fields) {
    const rendered = field.type === "num"
      ? numeric(field.value, field.length)
      : field.type === "amount"
        ? signedAmount(Number(field.value ?? 0), field.length)
        : alpha(field.value, field.length);
    if (rendered.length !== field.length) throw new Error(`field ${field.id} rendered ${rendered.length} != ${field.length}`);
    for (let i = 0; i < field.length; i += 1) record[field.start + i] = rendered[i];
  }
  return record.join("");
}

const isoDate = (day) => {
  const start = new Date(Date.UTC(2024, 0, 1));
  start.setUTCDate(start.getUTCDate() + (day % 550));
  return `${start.getUTCFullYear()}${String(start.getUTCMonth() + 1).padStart(2, "0")}${String(start.getUTCDate()).padStart(2, "0")}`;
};

function encodeIso88598(text) {
  const bytes = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 32;
    if (cp <= 0x7f) bytes.push(cp);
    else if (cp >= 0x05d0 && cp <= 0x05ea) bytes.push(0xe0 + cp - 0x05d0);
    else bytes.push(0x20);
  }
  return Buffer.from(bytes);
}

function a100(sequence) {
  return fixedRecord(95, [
    { id:1100,start:0,length:4,type:"str",value:"A100" },
    { id:1101,start:4,length:9,type:"num",value:sequence },
    { id:1102,start:13,length:9,type:"num",value:BUSINESS },
    { id:1103,start:22,length:15,type:"num",value:EXPORT_ID },
    { id:1104,start:37,length:8,type:"str",value:OF_CONSTANT },
    { id:1105,start:45,length:50,type:"str",value:"" },
  ]);
}

function c100(sequence, receiptNumber, date, amount) {
  return fixedRecord(444, [
    {id:1200,start:0,length:4,type:"str",value:"C100"},
    {id:1201,start:4,length:9,type:"num",value:sequence},
    {id:1202,start:13,length:9,type:"num",value:BUSINESS},
    {id:1203,start:22,length:3,type:"num",value:400},
    {id:1204,start:25,length:20,type:"str",value:receiptNumber},
    {id:1205,start:45,length:8,type:"num",value:date},
    {id:1206,start:53,length:4,type:"num",value:1200},
    {id:1207,start:57,length:50,type:"str",value:`לקוח בדיקה ${receiptNumber}`},
    {id:1208,start:107,length:50,type:"str",value:""},
    {id:1209,start:157,length:10,type:"str",value:""},
    {id:1210,start:167,length:30,type:"str",value:""},
    {id:1211,start:197,length:8,type:"str",value:""},
    {id:1212,start:205,length:30,type:"str",value:"ישראל"},
    {id:1213,start:235,length:2,type:"str",value:"IL"},
    {id:1214,start:237,length:15,type:"str",value:"0500000000"},
    {id:1215,start:252,length:9,type:"num",value:0},
    {id:1216,start:261,length:8,type:"num",value:date},
    {id:1217,start:269,length:15,type:"amount",value:0},
    {id:1218,start:284,length:3,type:"str",value:""},
    {id:1219,start:287,length:15,type:"amount",value:0},
    {id:1220,start:302,length:15,type:"amount",value:0},
    {id:1221,start:317,length:15,type:"amount",value:0},
    {id:1222,start:332,length:15,type:"amount",value:0},
    {id:1223,start:347,length:15,type:"amount",value:amount},
    {id:1224,start:362,length:12,type:"amount",value:0},
    {id:1225,start:374,length:15,type:"str",value:`C${numeric(receiptNumber,14)}`},
    {id:1226,start:389,length:10,type:"str",value:""},
    {id:1228,start:399,length:1,type:"str",value:""},
    {id:1230,start:400,length:8,type:"num",value:date},
    {id:1231,start:408,length:7,type:"str",value:""},
    {id:1233,start:415,length:9,type:"str",value:"TEST"},
    {id:1234,start:424,length:7,type:"num",value:receiptNumber},
    {id:1235,start:431,length:13,type:"str",value:""},
  ]);
}

function d120(sequence, receiptNumber, date, amount) {
  const paymentCodes = ["1", "4", "9", "9"];
  const paymentCode = paymentCodes[receiptNumber % paymentCodes.length];
  return fixedRecord(222, [
    {id:1300,start:0,length:4,type:"str",value:"D120"},
    {id:1301,start:4,length:9,type:"num",value:sequence},
    {id:1302,start:13,length:9,type:"num",value:BUSINESS},
    {id:1303,start:22,length:3,type:"num",value:400},
    {id:1304,start:25,length:20,type:"str",value:receiptNumber},
    {id:1305,start:45,length:4,type:"num",value:1},
    {id:1306,start:49,length:1,type:"num",value:paymentCode},
    {id:1307,start:50,length:10,type:"num",value:0},
    {id:1308,start:60,length:10,type:"num",value:0},
    {id:1309,start:70,length:15,type:"num",value:0},
    {id:1310,start:85,length:10,type:"num",value:0},
    {id:1311,start:95,length:8,type:"num",value:0},
    {id:1312,start:103,length:15,type:"amount",value:amount},
    {id:1313,start:118,length:1,type:"num",value:0},
    {id:1314,start:119,length:20,type:"str",value:""},
    {id:1315,start:139,length:1,type:"num",value:0},
    {id:1320,start:140,length:7,type:"str",value:""},
    {id:1322,start:147,length:8,type:"num",value:date},
    {id:1323,start:155,length:7,type:"num",value:receiptNumber},
    {id:1324,start:162,length:60,type:"str",value:""},
  ]);
}

function b100(sequence, transactionNumber, lineNumber, accountKey, counterAccountKey, operationSign, amount, date) {
  return fixedRecord(317, [
    {id:1350,start:0,length:4,type:"str",value:"B100"},
    {id:1351,start:4,length:9,type:"num",value:sequence},
    {id:1352,start:13,length:9,type:"num",value:BUSINESS},
    {id:1353,start:22,length:10,type:"num",value:transactionNumber},
    {id:1354,start:32,length:5,type:"num",value:lineNumber},
    {id:1355,start:37,length:8,type:"num",value:1},
    {id:1356,start:45,length:15,type:"str",value:"RECEIPT"},
    {id:1357,start:60,length:20,type:"str",value:"1"},
    {id:1358,start:80,length:3,type:"num",value:400},
    {id:1359,start:83,length:20,type:"str",value:""},
    {id:1360,start:103,length:3,type:"num",value:0},
    {id:1361,start:106,length:50,type:"str",value:"תנועת בדיקה לסימולטור"},
    {id:1362,start:156,length:8,type:"num",value:date},
    {id:1363,start:164,length:8,type:"num",value:date},
    {id:1364,start:172,length:15,type:"str",value:accountKey},
    {id:1365,start:187,length:15,type:"str",value:counterAccountKey},
    {id:1366,start:202,length:1,type:"num",value:operationSign},
    {id:1367,start:203,length:3,type:"str",value:"ILS"},
    {id:1368,start:206,length:15,type:"amount",value:amount},
    {id:1369,start:221,length:15,type:"amount",value:0},
    {id:1370,start:236,length:12,type:"amount",value:0},
    {id:1371,start:248,length:10,type:"str",value:""},
    {id:1372,start:258,length:10,type:"str",value:""},
    {id:1374,start:268,length:7,type:"str",value:""},
    {id:1375,start:275,length:8,type:"num",value:date},
    {id:1376,start:283,length:9,type:"str",value:"TEST"},
    {id:1377,start:292,length:25,type:"str",value:""},
  ]);
}

function b110(sequence, accountKey, accountName, trialBalanceCode, trialBalanceDescription, openingBalance, totalDebit, totalCredit) {
  return fixedRecord(376, [
    {id:1400,start:0,length:4,type:"str",value:"B110"},
    {id:1401,start:4,length:9,type:"num",value:sequence},
    {id:1402,start:13,length:9,type:"num",value:BUSINESS},
    {id:1403,start:22,length:15,type:"str",value:accountKey},
    {id:1404,start:37,length:50,type:"str",value:accountName},
    {id:1405,start:87,length:15,type:"str",value:trialBalanceCode},
    {id:1406,start:102,length:30,type:"str",value:trialBalanceDescription},
    {id:1407,start:132,length:50,type:"str",value:""},
    {id:1408,start:182,length:10,type:"str",value:""},
    {id:1409,start:192,length:30,type:"str",value:""},
    {id:1410,start:222,length:8,type:"str",value:""},
    {id:1411,start:230,length:30,type:"str",value:"ישראל"},
    {id:1412,start:260,length:2,type:"str",value:"IL"},
    {id:1413,start:262,length:15,type:"str",value:""},
    {id:1414,start:277,length:15,type:"amount",value:openingBalance},
    {id:1415,start:292,length:15,type:"amount",value:totalDebit},
    {id:1416,start:307,length:15,type:"amount",value:totalCredit},
    {id:1417,start:322,length:4,type:"num",value:0},
    {id:1419,start:326,length:9,type:"num",value:0},
    {id:1421,start:335,length:7,type:"str",value:""},
    {id:1422,start:342,length:15,type:"amount",value:0},
    {id:1423,start:357,length:3,type:"str",value:"ILS"},
    {id:1424,start:360,length:16,type:"str",value:""},
  ]);
}

function z900(sequence, total) {
  return fixedRecord(110, [
    {id:1150,start:0,length:4,type:"str",value:"Z900"},
    {id:1151,start:4,length:9,type:"num",value:sequence},
    {id:1152,start:13,length:9,type:"num",value:BUSINESS},
    {id:1153,start:22,length:15,type:"num",value:EXPORT_ID},
    {id:1154,start:37,length:8,type:"str",value:OF_CONSTANT},
    {id:1155,start:45,length:15,type:"num",value:total},
    {id:1156,start:60,length:50,type:"str",value:""},
  ]);
}

function a000(total, folder) {
  return fixedRecord(466, [
    {id:1000,start:0,length:4,type:"str",value:"A000"},
    {id:1001,start:4,length:5,type:"str",value:""},
    {id:1002,start:9,length:15,type:"num",value:total},
    {id:1003,start:24,length:9,type:"num",value:BUSINESS},
    {id:1004,start:33,length:15,type:"num",value:EXPORT_ID},
    {id:1005,start:48,length:8,type:"str",value:OF_CONSTANT},
    {id:1006,start:56,length:8,type:"num",value:REGISTRATION_TEST_VALUE},
    {id:1007,start:64,length:20,type:"str",value:"Maptehot"},
    {id:1008,start:84,length:20,type:"str",value:"1.0.0-rc.17.45"},
    {id:1009,start:104,length:9,type:"num",value:BUSINESS},
    {id:1010,start:113,length:20,type:"str",value:"מפתחות להצלחה"},
    {id:1011,start:133,length:1,type:"num",value:2},
    {id:1012,start:134,length:50,type:"str",value:folder},
    {id:1013,start:184,length:1,type:"num",value:2},
    {id:1014,start:185,length:1,type:"num",value:1},
    {id:1015,start:186,length:9,type:"num",value:0},
    {id:1016,start:195,length:9,type:"num",value:0},
    {id:1017,start:204,length:10,type:"str",value:""},
    {id:1018,start:214,length:50,type:"str",value:"מפתחות להצלחה"},
    {id:1019,start:264,length:50,type:"str",value:"נחל דליות"},
    {id:1020,start:314,length:10,type:"str",value:"39"},
    {id:1021,start:324,length:30,type:"str",value:"באר שבע"},
    {id:1022,start:354,length:8,type:"str",value:"8486275"},
    {id:1023,start:362,length:4,type:"num",value:0},
    {id:1024,start:366,length:8,type:"num",value:"20240101"},
    {id:1025,start:374,length:8,type:"num",value:"20260802"},
    {id:1026,start:382,length:8,type:"num",value:"20260802"},
    {id:1027,start:390,length:4,type:"num",value:"1200"},
    {id:1028,start:394,length:1,type:"num",value:0},
    {id:1029,start:395,length:1,type:"num",value:1},
    {id:1030,start:396,length:20,type:"str",value:"NONE"},
    {id:1032,start:416,length:3,type:"str",value:"ILS"},
    {id:1034,start:419,length:1,type:"num",value:0},
    {id:1035,start:420,length:46,type:"str",value:""},
  ]);
}

const summary = (code, count) => fixedRecord(19, [
  {id:1050,start:0,length:4,type:"str",value:code},
  {id:1051,start:4,length:15,type:"num",value:count},
]);

const records = [];
let sequence = 1;
records.push(a100(sequence++));
let totalAgorot = 0;
for (let index = 1; index <= RECEIPT_COUNT; index += 1) {
  const amount = 10000 + (index % 19) * 500;
  totalAgorot += amount;
  const date = isoDate(index);
  records.push(c100(sequence++, index, date, amount));
  records.push(d120(sequence++, index, date, amount));
}
const journalDate = "20260802";
records.push(b100(sequence++, 1, 1, "CASH_ACCOUNT", "INCOME_ACCOUNT", 1, 18000, journalDate));
records.push(b100(sequence++, 1, 2, "INCOME_ACCOUNT", "CASH_ACCOUNT", 2, 18000, journalDate));
records.push(b110(sequence++, "CASH_ACCOUNT", "קופה", "1000", "מזומנים ושווי מזומנים", 0, 18000, 0));
records.push(b110(sequence++, "INCOME_ACCOUNT", "הכנסות", "4000", "הכנסות מקבלות", 0, 0, 18000));
records.push(z900(sequence, records.length + 1));
const totalRecords = records.length;
if (totalRecords !== 2006) throw new Error(`Expected 2006 records, got ${totalRecords}`);

const dataText = `${records.join("\r\n")}\r\n`;
const dataPath = path.join(outputRoot, "BKMVDATA.TXT");
fs.writeFileSync(dataPath, encodeIso88598(dataText));
const iniLines = [
  a000(totalRecords, outputRoot),
  summary("B100", JOURNAL_ENTRY_COUNT),
  summary("B110", ACCOUNT_COUNT),
  summary("C100", RECEIPT_COUNT),
  summary("D120", RECEIPT_COUNT),
];
fs.writeFileSync(path.join(outputRoot, "INI.TXT"), encodeIso88598(`${iniLines.join("\r\n")}\r\n`));

const formatIls = (agorot) => new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", minimumFractionDigits: 2 }).format(agorot / 100);
const documentTypes = [["100","הזמנה"],["200","תעודת משלוח"],["205","תעודת משלוח סוכן"],["210","תעודת החזרה"],["300","חשבונית/חשבונית עסקה"],["305","חשבונית מס"],["310","חשבונית ריכוז"],["320","חשבונית מס / קבלה"],["330","חשבונית מס זיכוי"],["340","חשבונית שריון"],["345","חשבונית סוכן"],["400","קבלה"],["405","קבלה על תרומות"],["406","קבלה על פיקדון"],["410","יציאה מקופה"],["420","הפקדת בנק"],["500","הזמנת רכש"],["600","תעודת משלוח רכש"],["610","החזרת רכש"],["700","חשבונית מס רכש"],["710","זיכוי רכש"],["800","יתרת פתיחה"],["810","כניסה כללית למלאי"],["820","יציאה כללית מהמלאי"],["830","העברה בין מחסנים"],["840","עדכון בעקבות ספירה"],["900","דוח ייצור-כניסה"],["910","דוח ייצור-יציאה"]];
const report26Rows=documentTypes.map(([code,label])=>`<tr><td>${code}</td><td>${label}</td><td>${code==="400"?RECEIPT_COUNT:0}</td><td>${code==="400"?formatIls(totalAgorot):"0"}</td></tr>`).join("");
fs.writeFileSync(path.join(outputRoot, "REPORT-2.6.html"), `<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><title>דוח 2.6 — נתוני בדיקה</title><body><h1>פלט לאימות נתונים — סעיף 2.6</h1><p><strong>נתוני דמה בלבד. אין להגישם כמסמכי העסק.</strong></p><table border="1" cellspacing="0" cellpadding="6"><tr><th>מספר מסמך</th><th>סוג מסמך</th><th>כמות</th><th>סכום</th></tr>${report26Rows}</table></body></html>`, "utf8");
fs.writeFileSync(path.join(outputRoot, "REPORT-5.4.html"), `<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><title>דוח 5.4 — נתוני בדיקה</title><body><h1>הפקת קבצים במבנה אחיד</h1><p><strong>נתוני דמה בלבד.</strong></p><table border="1" cellspacing="0" cellpadding="6"><tr><th>קוד</th><th>תיאור</th><th>כמות</th></tr><tr><td>100B</td><td>תנועות הנהלת חשבונות</td><td>${JOURNAL_ENTRY_COUNT}</td></tr><tr><td>110B</td><td>חשבונות הנהלת חשבונות</td><td>${ACCOUNT_COUNT}</td></tr><tr><td>100C</td><td>כותרת מסמך</td><td>${RECEIPT_COUNT}</td></tr><tr><td>120D</td><td>פרטי קבלה</td><td>${RECEIPT_COUNT}</td></tr><tr><td colspan="2">סה״כ רשומות נתונים</td><td>${RECEIPT_COUNT * 2 + JOURNAL_ENTRY_COUNT + ACCOUNT_COUNT}</td></tr></table></body></html>`, "utf8");

const hash = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const result = {generatedAt:new Date().toISOString(),fixtureOnly:true,warning:"נתוני דמה בלבד. אין להשתמש במספר העסק או בלקוחות לצורך הגשה אמיתית.",receiptCount:RECEIPT_COUNT,totalRecords,totalAmountAgorot:totalAgorot,counts:{"100A":1,"100B":JOURNAL_ENTRY_COUNT,"110B":ACCOUNT_COUNT,"100C":RECEIPT_COUNT,"120D":RECEIPT_COUNT,"900Z":1},files:{ini:{name:"INI.TXT",sha256:hash(path.join(outputRoot,"INI.TXT"))},data:{name:"BKMVDATA.TXT",sha256:hash(dataPath)}}};
fs.writeFileSync(path.join(outputRoot, "SIMULATOR-FIXTURE-SUMMARY.json"), JSON.stringify(result, null, 2), "utf8");
console.log(`✓ Generated ${totalRecords} XML-layout fixed-width records for simulator preflight`);
console.log(`✓ Output: ${outputRoot}`);
