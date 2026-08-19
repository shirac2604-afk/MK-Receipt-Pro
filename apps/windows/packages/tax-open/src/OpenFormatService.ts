import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { DatabaseConnection } from "../../database/src/DatabaseConnection";
import type { BusinessSettingsRecord, OpenFormatExportInput, OpenFormatExportResult, PaymentMethod } from "../../database/src/types";
import { validateReceiptBatch } from "./ReceiptRecordComplianceValidator";
import { auditOpenFormatHeaders, producerIdentityFromEnvironment } from "./OpenFormatHeaderComplianceValidator";
import { auditOpenFormatBytes } from "./OpenFormatByteComplianceValidator";
import { auditOpenFormatSummaries } from "./OpenFormatSummaryComplianceValidator";
import { allocateOpenFormatFolder, auditExistingOpenFormatFolder } from "./OpenFormatPathService";
import { auditReport26, type Report26DocumentType } from "./Report26ComplianceValidator";
import { auditReport54 } from "./Report54ComplianceValidator";
import { auditReceiptRecordFields } from "./ReceiptRecordFieldAudit";

interface ExportReceiptRow {
  id:string; receipt_number:number; payment_date:string; issued_at:string; client_name:string; client_phone:string|null;
  amount_agorot:number; payment_method:PaymentMethod; reference_number:string|null; status:"active"|"cancelled";
}

const OF_CONSTANT="&OF1.31&";
const DOCUMENT_TYPE_RECEIPT="400";
const TAX_REGISTERED_SOFTWARE_NAME="כהן שירה";
const TAX_REGISTERED_SOFTWARE_EDITION="1.0.0-rc.17.45-b100";

function asciiOnly(value:string):string { return value.replace(/[\u200e\u200f]/g,"").replace(/[“”]/g,'"').replace(/[’‘]/g,"'"); }
function alpha(value:unknown,length:number,fill=" "):string { const v=asciiOnly(String(value??"")); return v.slice(0,length).padEnd(length,fill); }
function numeric(value:unknown,length:number):string { const digits=String(value??"").replace(/\D/g,""); return digits.slice(-length).padStart(length,"0"); }
function date8(value:string):string { return value.replace(/\D/g,"").slice(0,8).padEnd(8,"0"); }
function isoDateToTax(value:string):string { const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(value); return m?`${m[1]}${m[2]}${m[3]}`:"00000000"; }
function localDate8(value:string):string { const d=new Date(value); return Number.isNaN(d.getTime())?"00000000":`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`; }
function time4(value:string):string { const d=new Date(value); return Number.isNaN(d.getTime())?"0000":`${String(d.getHours()).padStart(2,"0")}${String(d.getMinutes()).padStart(2,"0")}`; }
function signedAmount(agorot:number,length=15):string { const sign=agorot<0?"-":"+"; return sign+String(Math.abs(Math.trunc(agorot))).padStart(length-1,"0").slice(-(length-1)); }
function customerKey(row:ExportReceiptRow):string { return `C${crypto.createHash("sha256").update(`${row.client_name}|${row.client_phone??""}`).digest("hex").slice(0,14)}`.toUpperCase(); }
function paymentCode(method:PaymentMethod):string { return ({cash:"1",bank_transfer:"4",bit:"9",paybox:"9"} as const)[method]; }
function formatShekels(agorot:number):string { return new Intl.NumberFormat("he-IL",{style:"currency",currency:"ILS",minimumFractionDigits:2}).format(agorot/100); }
function safeBusinessNumber(value:string):string { return numeric(value,9); }

function encodeIso88598(text:string):Buffer {
  const bytes:number[]=[];
  for(const ch of text){ const cp=ch.codePointAt(0)??32; if(cp<=0x7f)bytes.push(cp); else if(cp>=0x05d0&&cp<=0x05ea)bytes.push(0xe0+(cp-0x05d0)); else bytes.push(0x20); }
  return Buffer.from(bytes);
}

function c100(row:ExportReceiptRow,business:BusinessSettingsRecord,recordNumber:number,link:number):string {
  const parts=[
    alpha("C100",4),numeric(recordNumber,9),safeBusinessNumber(business.businessNumber),numeric(DOCUMENT_TYPE_RECEIPT,3),alpha(row.receipt_number,20),
    localDate8(row.issued_at),time4(row.issued_at),alpha(row.client_name,50),alpha("",50),alpha("",10),alpha("",30),alpha("",8),alpha("",30),alpha("",2),
    alpha(row.client_phone??"",15),numeric("",9),isoDateToTax(row.payment_date),alpha("",15),alpha("",3),alpha("",15),alpha("",15),
    alpha("",15),alpha("",15),signedAmount(row.amount_agorot),alpha("",12),alpha(customerKey(row),15),alpha("",10),
    alpha(row.status==="cancelled"?"1":"",1),isoDateToTax(row.payment_date),alpha("",7),alpha(business.ownerName,9),numeric(link,7),alpha("",13)
  ];
  const result=parts.join(""); if(result.length!==444)throw new Error(`OPEN_FORMAT_100C_LENGTH_${result.length}`); return result;
}

function d120(row:ExportReceiptRow,business:BusinessSettingsRecord,recordNumber:number,link:number):string {
  const parts=[
    alpha("D120",4),numeric(recordNumber,9),safeBusinessNumber(business.businessNumber),numeric(DOCUMENT_TYPE_RECEIPT,3),alpha(row.receipt_number,20),numeric(1,4),paymentCode(row.payment_method),
    numeric("",10),numeric("",10),numeric("",15),numeric("",10),numeric("",8),
    signedAmount(row.amount_agorot),numeric("",1),alpha("",20),numeric("",1),alpha("",7),isoDateToTax(row.payment_date),numeric(link,7),alpha("",60)
  ];
  const result=parts.join(""); if(result.length!==222)throw new Error(`OPEN_FORMAT_120D_LENGTH_${result.length}`); return result;
}

function a100(business:BusinessSettingsRecord,exportId:string,recordNumber:number):string {
  const result=[alpha("A100",4),numeric(recordNumber,9),safeBusinessNumber(business.businessNumber),numeric(exportId,15),alpha(OF_CONSTANT,8),alpha("",50)].join("");
  if(result.length!==95)throw new Error(`OPEN_FORMAT_100A_LENGTH_${result.length}`); return result;
}
function z900(business:BusinessSettingsRecord,exportId:string,recordNumber:number,total:number):string {
  const result=[alpha("Z900",4),numeric(recordNumber,9),safeBusinessNumber(business.businessNumber),numeric(exportId,15),alpha(OF_CONSTANT,8),numeric(total,15),alpha("",50)].join("");
  if(result.length!==110)throw new Error(`OPEN_FORMAT_900Z_LENGTH_${result.length}`); return result;
}

interface ParsedBusinessAddress { street:string; houseNumber:string; city:string; postalCode:string; }
function parseBusinessAddress(value:string|undefined|null):ParsedBusinessAddress {
  const raw=String(value??"").trim();
  if(!raw)return {street:"",houseNumber:"",city:"",postalCode:""};
  const parts=raw.split(",").map(part=>part.trim()).filter(Boolean);
  const first=parts[0]??"";
  const last=parts.length>1?(parts.at(-1)??""):"";
  const houseMatch=/^(.*?)(?:\s+)(\d+[א-תA-Za-z\/-]*)$/.exec(first);
  const postalMatch=/^(.*?)(?:\s+)(\d{5,8})$/.exec(last);
  const street=(houseMatch?.[1]??first).trim();
  const houseNumber=(houseMatch?.[2]??"").trim();
  const city=(postalMatch?.[1]??(parts.length>1?last:"")).trim();
  const postalCode=(postalMatch?.[2]??"").trim();
  return {street,houseNumber,city,postalCode};
}

function iniA000(input:OpenFormatExportInput,business:BusinessSettingsRecord,exportId:string,totalRecords:number,outputFolder:string,started:Date):string {
  const address=parseBusinessAddress(business.address); const year=String(started.getFullYear()).slice(-2);
  const environmentProducer=producerIdentityFromEnvironment(TAX_REGISTERED_SOFTWARE_EDITION);
  const producer={
    ...environmentProducer,
    softwareName:process.env.MK_TAX_SOFTWARE_NAME?.trim()||TAX_REGISTERED_SOFTWARE_NAME,
    softwareEdition:process.env.MK_TAX_SOFTWARE_EDITION?.trim()||TAX_REGISTERED_SOFTWARE_EDITION,
    manufacturerBusinessNumber:environmentProducer.manufacturerBusinessNumber==="000000000"?safeBusinessNumber(business.businessNumber):environmentProducer.manufacturerBusinessNumber,
    manufacturerName:environmentProducer.manufacturerName.trim()||business.ownerName||business.businessName,
  };
  const parts=[alpha("A000",4),alpha("",5),numeric(totalRecords,15),safeBusinessNumber(business.businessNumber),numeric(exportId,15),alpha(OF_CONSTANT,8),numeric(producer.softwareRegistrationNumber,8),
    alpha(producer.softwareName,20),alpha(producer.softwareEdition,20),numeric(producer.manufacturerBusinessNumber,9),alpha(producer.manufacturerName,20),numeric(2,1),alpha(outputFolder,50),numeric(1,1),numeric(0,1),
    numeric("",9),numeric("",9),alpha("",10),alpha(business.businessName,50),alpha(address.street,50),alpha(address.houseNumber,10),alpha(address.city,30),alpha(address.postalCode,8),numeric("",4),
    isoDateToTax(input.fromDate),isoDateToTax(input.toDate),`${started.getFullYear()}${String(started.getMonth()+1).padStart(2,"0")}${String(started.getDate()).padStart(2,"0")}`,
    `${String(started.getHours()).padStart(2,"0")}${String(started.getMinutes()).padStart(2,"0")}`,numeric(0,1),numeric(1,1),alpha("NONE",20),alpha("ILS",3),numeric(0,1),alpha("",46)
  ];
  const result=parts.join(""); if(result.length!==466)throw new Error(`OPEN_FORMAT_INI_LENGTH_${result.length}_${year}`); return result;
}
function iniSummary(code:string,count:number):string { const result=alpha(code,4)+numeric(count,15); if(result.length!==19)throw new Error("OPEN_FORMAT_SUMMARY_LENGTH"); return result; }

export const DOCUMENT_TYPES:readonly Report26DocumentType[]=[
  {code:"100",label:"הזמנה"},{code:"200",label:"תעודת משלוח"},{code:"205",label:"תעודת משלוח סוכן"},{code:"210",label:"תעודת החזרה"},{code:"300",label:"חשבונית/חשבונית עסקה"},{code:"305",label:"חשבונית מס"},{code:"310",label:"חשבונית ריכוז"},{code:"320",label:"חשבונית מס / קבלה"},{code:"330",label:"חשבונית מס זיכוי"},{code:"340",label:"חשבונית שריון"},{code:"345",label:"חשבונית סוכן"},{code:"400",label:"קבלה"},{code:"405",label:"קבלה על תרומות"},{code:"406",label:"קבלה על פיקדון"},{code:"410",label:"יציאה מקופה"},{code:"420",label:"הפקדת בנק"},{code:"500",label:"הזמנת רכש"},{code:"600",label:"תעודת משלוח רכש"},{code:"610",label:"החזרת רכש"},{code:"700",label:"חשבונית מס רכש"},{code:"710",label:"זיכוי רכש"},{code:"800",label:"יתרת פתיחה"},{code:"810",label:"כניסה כללית למלאי"},{code:"820",label:"יציאה כללית מהמלאי"},{code:"830",label:"העברה בין מחסנים"},{code:"840",label:"עדכון בעקבות ספירה"},{code:"900",label:"דוח ייצור-כניסה"},{code:"910",label:"דוח ייצור-יציאה"}
];
function htmlEscape(v:string):string{return v.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));}
function reportSoftwareIdentification():string{return `${TAX_REGISTERED_SOFTWARE_NAME} • מהדורה ${TAX_REGISTERED_SOFTWARE_EDITION}`;}
function reportShell(title:string,body:string):string{return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>${title}</title><style>@page{size:A4;margin:12mm 12mm 14mm}*{box-sizing:border-box}html,body{margin:0;padding:0}body{font-family:Arial,sans-serif;color:#111827;direction:rtl;font-size:10.5px;line-height:1.25}main{width:100%}h1{text-align:center;font-size:18px;margin:0 0 10px}.authority{text-align:left;font-size:9px;border-bottom:1px solid #777;padding-bottom:4px;margin-bottom:8px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:3px 14px;margin:8px 0}.meta>*{white-space:nowrap}table{border-collapse:collapse;width:100%;margin-top:8px;page-break-inside:auto}thead{display:table-header-group}tr{page-break-inside:avoid;page-break-after:auto}th,td{border:1px solid #444;padding:3px 5px;text-align:right;vertical-align:middle}th{background:#f1f5f9;font-weight:700}.total{font-weight:bold;background:#f8fafc}.notice{margin-top:8px;padding:6px;border:1px solid #9aa6b8;font-size:9px}.print-note{margin-top:8px;font-size:8.5px;color:#374151}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><main><div class="authority">רשות המסים בישראל — הוראות להפקת קבצים במבנה אחיד, גרסה 1.31</div><h1>${title}</h1>${body}<div class="print-note">תוכנה: ${reportSoftwareIdentification()}</div></main></body></html>`;}

export class OpenFormatService {
  constructor(private readonly connection:DatabaseConnection,private readonly getBusiness:()=>BusinessSettingsRecord){ }
  export(input:OpenFormatExportInput):OpenFormatExportResult {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(input.fromDate)||!/^\d{4}-\d{2}-\d{2}$/.test(input.toDate)||input.fromDate>input.toDate)throw new Error("OPEN_FORMAT_INVALID_DATE_RANGE");
    if(!fs.existsSync(input.targetRoot))fs.mkdirSync(input.targetRoot,{recursive:true});
    const business=this.getBusiness(); if(!/^\d{9}$/.test(business.businessNumber.replace(/\D/g,"")))throw new Error("OPEN_FORMAT_INVALID_BUSINESS_NUMBER");
    const rows=this.connection.prepare(`SELECT id,receipt_number,payment_date,issued_at,client_name,client_phone,amount_agorot,payment_method,reference_number,status FROM receipts WHERE payment_date>=? AND payment_date<=? ORDER BY receipt_number`).all(input.fromDate,input.toDate) as unknown as ExportReceiptRow[];
    const compliance=validateReceiptBatch(rows);
    if(!compliance.valid){ const detail=compliance.errors.slice(0,10).map(i=>`${i.code}: קבלה ${i.receiptNumber} — ${i.message}`).join(" | "); throw new Error(`OPEN_FORMAT_CONTENT_VALIDATION_FAILED: ${detail}`); }
    let now=new Date(); const exportId=String(BigInt('1'+crypto.randomBytes(7).toString('hex').replace(/[a-f]/g,'').padEnd(14,'7').slice(0,14))).slice(0,15).padStart(15,'1');
    const allocatedPath=allocateOpenFormatFolder({targetRoot:input.targetRoot,businessNumber:business.businessNumber,productionDate:now});
    const folder=allocatedPath.folderPath;
    if(folder.length>50)throw new Error("OPEN_FORMAT_OUTPUT_PATH_TOO_LONG: יש לבחור יעד קצר יותר (למשל כונן D:\\), משום ששדה נתיב ההפקה מוגבל ל-50 תווים.");
    // When the same minute is already occupied, the specification requires the
    // next minute value. Use that effective time consistently in INI.TXT and reports.
    now=allocatedPath.effectiveProductionDate;
    const data:string[]=[]; let recordNo=1; data.push(a100(business,exportId,recordNo++));
    for(const [index,row] of rows.entries()){const link=index+1;data.push(c100(row,business,recordNo++,link));data.push(d120(row,business,recordNo++,link));}
    const total=data.length+1; data.push(z900(business,exportId,recordNo,total));
    const receiptFieldAudit=auditReceiptRecordFields(data);
    if(!receiptFieldAudit.valid){
      const detail=receiptFieldAudit.issues.filter(i=>i.severity==="error").slice(0,10).map(i=>`${i.code}: ${i.message}`).join(" | ");
      throw new Error(`OPEN_FORMAT_RECEIPT_FIELD_AUDIT_FAILED: ${detail}`);
    }
    const dataText=data.join("\r\n")+"\r\n";
    const dataFile=path.join(folder,"BKMVDATA.TXT");
    const dataBuffer=encodeIso88598(dataText);
    fs.writeFileSync(dataFile,dataBuffer);
    const a000=iniA000(input,business,exportId,total,folder,now);
    const headerAudit=auditOpenFormatHeaders(a000,data[0] ?? "",data.at(-1)??"",total);
    const iniLines=[a000,iniSummary("C100",rows.length),iniSummary("D120",rows.length)];
    const iniPath=path.join(folder,"INI.TXT"); fs.writeFileSync(iniPath,encodeIso88598(iniLines.join("\r\n")+"\r\n"));
    const byteAudit=auditOpenFormatBytes(fs.readFileSync(iniPath),dataBuffer);
    const simulatorFilesAudit={
      valid:true,
      generatedAt:now.toISOString(),
      files:[
        {name:"INI.TXT",path:iniPath,size:fs.statSync(iniPath).size},
        {name:"BKMVDATA.TXT",path:dataFile,size:fs.statSync(dataFile).size}
      ],
      compressed:false,
      issues:[] as string[]
    };
    const totalAmount=rows.reduce((s,r)=>s+r.amount_agorot,0);
    const report26DocumentCounts=Object.fromEntries(DOCUMENT_TYPES.map(({code})=>[code,code==="400"?rows.length:0]));
    const report26DocumentAmountsAgorot=Object.fromEntries(DOCUMENT_TYPES.map(({code})=>[code,code==="400"?totalAmount:0]));
    const report26Rows=DOCUMENT_TYPES.map(({code,label})=>`<tr><td>${code}</td><td>${label}</td><td>${(report26DocumentCounts[code] ?? 0)}</td><td>${(report26DocumentAmountsAgorot[code] ?? 0)===0?"0":htmlEscape(formatShekels(report26DocumentAmountsAgorot[code] ?? 0))}</td></tr>`).join("");
    const activeRows=rows.filter(row=>row.status==="active");
    const cancelledRows=rows.filter(row=>row.status==="cancelled");
    const activeAmount=activeRows.reduce((sum,row)=>sum+row.amount_agorot,0);
    const cancelledAmount=cancelledRows.reduce((sum,row)=>sum+row.amount_agorot,0);
    const report26Audit=auditReport26({expectedDocumentTypes:DOCUMENT_TYPES,renderedDocumentTypes:DOCUMENT_TYPES,documentCounts:report26DocumentCounts,documentAmountsAgorot:report26DocumentAmountsAgorot,c100Count:rows.length,c100AmountAgorot:totalAmount,activeReceiptCount:activeRows.length,cancelledReceiptCount:cancelledRows.length,activeAmountAgorot:activeAmount,cancelledAmountAgorot:cancelledAmount});
    const cancelledNotice=cancelledRows.length>0?`<div class="notice">לצורך התאמה מלאה לקובץ BKMVDATA.TXT, קוד 400 כולל ${cancelledRows.length} קבלות מבוטלות בסך ${htmlEscape(formatShekels(cancelledAmount))}. הקבלות מסומנות כמבוטלות בשדה 1228 ואינן נכללות בדוחות ההכנסה העסקיים.</div>`:"";
    const report26=reportShell("פלט לאימות נתונים — סעיף 2.6",`<div class="meta"><b>מספר עוסק: ${htmlEscape(business.businessNumber)}</b><b>שם העסק: ${htmlEscape(business.businessName)}</b><span>מתאריך: ${input.fromDate}</span><span>עד תאריך: ${input.toDate}</span></div><table><thead><tr><th>מספר המסמך</th><th>סוג המסמך</th><th>סה״כ כמותי</th><th>סה״כ כספי (בש״ח)</th></tr></thead><tbody>${report26Rows}<tr class="total"><td colspan="2">סה״כ</td><td>${rows.length}</td><td>${totalAmount===0?"0":htmlEscape(formatShekels(totalAmount))}</td></tr></tbody></table>${cancelledNotice}`);
    const report26Path=path.join(folder,"REPORT-2.6.html");fs.writeFileSync(report26Path,report26,"utf8");
    const counts={"100A":1,"100C":rows.length,"D110":0,"120D":rows.length,"100B":0,"110B":0,"M100":0,"900Z":1,total};
    const iniCounts={"100C":rows.length,"D110":0,"120D":rows.length,"100B":0,"110B":0,"M100":0};
    const dataCounts={"100A":1,"100C":rows.length,"D110":0,"120D":rows.length,"100B":0,"110B":0,"M100":0,"900Z":1};
    const report54Rows=[
      {code:"100C",description:"כותרת מסמך",count:rows.length},
      {code:"120D",description:"פרטי קבלה / הפקדה",count:rows.length}
    ].filter(row=>row.count>0);
    const report54SummaryTotal=report54Rows.reduce((sum,row)=>sum+row.count,0);
    const report54Audit=auditReport54({businessNumber:business.businessNumber,businessName:business.businessName,fromDate:input.fromDate,toDate:input.toDate,outputPath:folder,renderedRows:report54Rows,expectedCounts:iniCounts,fileRecordTotal:total});
    const report54TableRows=report54Rows.map(row=>`<tr><td>${row.code}</td><td>${htmlEscape(row.description)}</td><td>${row.count}</td></tr>`).join("");
    const report54=`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>הפקת קבצים במבנה אחיד — נספח 5.4</title><style>@page{size:A4;margin:18mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111;margin:0;direction:rtl;font-size:13px}.report{min-height:255mm;position:relative}.authority{font-size:12px;text-align:left;color:#333;border-bottom:1px solid #777;padding-bottom:7px}.title{text-align:center;font-size:22px;margin:24px 0 28px}.details{line-height:1.9;margin-bottom:18px}.details b{display:inline-block;min-width:150px}.path{direction:ltr;unicode-bidi:isolate;text-align:left;border:1px solid #777;padding:8px;margin:8px 0 20px;font-family:Consolas,monospace;overflow-wrap:anywhere}.table-title{text-align:center;font-weight:700;margin:22px 0 8px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #222;padding:8px;text-align:center}th{font-weight:700;background:#f2f2f2}.total{font-weight:700}.note{margin-top:18px;font-size:11px;line-height:1.6}.print-footer{position:absolute;bottom:0;left:0;right:0;border-top:1px solid #999;padding-top:6px;font-size:10px;display:flex;justify-content:space-between}.page-number:after{content:counter(page)}@media print{button{display:none}}</style></head><body><main class="report"><div class="authority">רשות המסים בישראל — הוראות להפקת קבצים במבנה אחיד, גרסה 1.31</div><h1 class="title">הפקת קבצים במבנה אחיד</h1><section class="details"><div><b>מספר עוסק מורשה:</b> ${htmlEscape(business.businessNumber)}</div><div><b>שם בית העסק:</b> ${htmlEscape(business.businessName)}</div><div><b>מתאריך:</b> ${htmlEscape(input.fromDate)} <b style="min-width:auto;margin-right:28px">עד תאריך:</b> ${htmlEscape(input.toDate)}</div><div><b>הנתונים נשמרו בנתיב הבא:</b></div><div class="path">${htmlEscape(folder)}</div></section><div class="table-title">סה״כ רשומות שהופקו לפי סוגי רשומות בקובץ BKMVDATA.TXT</div><table><thead><tr><th>קוד הרשומה</th><th>תיאור הרשומה</th><th>סך רשומות</th></tr></thead><tbody>${report54TableRows}<tr class="total"><td colspan="2">סה״כ רשומות נתונים</td><td>${report54SummaryTotal}</td></tr></tbody></table><div class="note">רשומות הפתיחה 100A והסגירה 900Z נכללות בקובץ הנתונים ובספירה הכוללת שלו, אך אינן רשומות נתונים המסוכמות בטבלה זו.</div><footer class="print-footer"><span>תוכנה: ${reportSoftwareIdentification()}</span><span>הופק: ${now.toLocaleString("he-IL")}</span><span>עמוד <span class="page-number"></span></span></footer></main></body></html>`;
    const report54Path=path.join(folder,"REPORT-5.4.html");fs.writeFileSync(report54Path,report54,"utf8");
    const summaryAudit=auditOpenFormatSummaries({iniCounts,dataCounts,totalRecords:report54SummaryTotal,report26DocumentCounts,report26DocumentAmountsAgorot,report54RecordCounts:iniCounts,report54TotalRecords:report54SummaryTotal});
    const errors:string[]=[...report26Audit.issues.filter(i=>i.severity==="error").map(i=>`${i.code}: ${i.message}`),...summaryAudit.issues.filter(i=>i.severity==="error").map(i=>`${i.code}: ${i.message}`),...report54Audit.issues.filter(i=>i.severity==="error").map(i=>`${i.code}: ${i.message}`),...headerAudit.issues.filter(i=>i.severity==="error").map(i=>`${i.code}: ${i.message}`),...byteAudit.issues.filter(i=>i.severity==="error").map(i=>`${i.code}: ${i.message}`),...receiptFieldAudit.issues.filter(i=>i.severity==="error").map(i=>`${i.code}: ${i.message}`)]; const warnings:string[]=[...report26Audit.issues.filter(i=>i.severity==="warning").map(i=>`${i.code}: ${i.message}`),...summaryAudit.issues.filter(i=>i.severity==="warning").map(i=>`${i.code}: ${i.message}`),...report54Audit.issues.filter(i=>i.severity==="warning").map(i=>`${i.code}: ${i.message}`),...compliance.warnings.map(i=>`קבלה ${i.receiptNumber}: ${i.message}`),...headerAudit.issues.filter(i=>i.severity==="warning").map(i=>`${i.code}: ${i.message}`),...byteAudit.issues.filter(i=>i.severity==="warning").map(i=>`${i.code}: ${i.message}`),...receiptFieldAudit.issues.filter(i=>i.severity==="warning").map(i=>`${i.code}: ${i.message}`)];
    if(rows.length===0)warnings.push("לא נמצאו קבלות בטווח שנבחר."); if(rows.length*2+2<2000)warnings.push("הקובץ כולל פחות מ־2,000 רשומות ואינו מתאים עדיין לבדיקת הסימולטור לצורך הגשת רישום.");
    const productionIssues:string[]=[];
    const normalizedBusinessNumber=business.businessNumber.replace(/\D/g,"");
    if(normalizedBusinessNumber!=="039375365")productionIssues.push("מספר העוסק בהפקה אינו 039375365. יש לבדוק את פרטי העסק לפני בדיקת הסימולטור.");
    if(!business.businessName.trim()||/עסק בדיקה|test business/i.test(business.businessName))productionIssues.push("שם העסק חסר או מכיל ערך בדיקה.");
    if(!business.ownerName.trim())productionIssues.push("שם העוסק חסר.");
    if(rows.some(row=>/לקוח בדיקה|test customer/i.test(row.client_name)))productionIssues.push("נמצאו קבלות עם שמות לקוח של נתוני דמה.");
    const productionAudit={
      valid:productionIssues.length===0,
      generatedAt:now.toISOString(),
      source:"application_database",
      fixture:false,
      business:{businessName:business.businessName,ownerName:business.ownerName,businessNumber:normalizedBusinessNumber,taxStatus:business.taxStatus},
      range:{fromDate:input.fromDate,toDate:input.toDate},
      receiptCount:rows.length,
      totalAmountAgorot:totalAmount,
      temporarySoftwareRegistrationNumber:headerAudit.parsed.softwareRegistrationNumber==="00000000",
      submissionReady:productionIssues.length===0&&headerAudit.submissionReady,
      issues:productionIssues,
      warnings:headerAudit.issues.filter(item=>item.severity==="warning").map(item=>`${item.code}: ${item.message}`),
    };
    fs.writeFileSync(path.join(folder,"OPEN-FORMAT-PRODUCTION-AUDIT.json"),JSON.stringify(productionAudit,null,2),"utf8");
    if(productionIssues.length>0)warnings.push(...productionIssues);
    const result:OpenFormatExportResult={exportId,folderPath:folder,iniPath,dataArchivePath:dataFile,report26Path,report54Path,fromDate:input.fromDate,toDate:input.toDate,documentCount:rows.length,totalAmountAgorot:totalAmount,counts,validation:{valid:errors.length===0,errors,warnings},createdAt:now.toISOString()};
    fs.writeFileSync(path.join(folder,"OPEN-FORMAT-HEADER-AUDIT.json"),JSON.stringify(headerAudit,null,2),"utf8");
    fs.writeFileSync(path.join(folder,"OPEN-FORMAT-BYTE-AUDIT.json"),JSON.stringify(byteAudit,null,2),"utf8");
    fs.writeFileSync(path.join(folder,"OPEN-FORMAT-SIMULATOR-FILES-AUDIT.json"),JSON.stringify(simulatorFilesAudit,null,2),"utf8");
    fs.writeFileSync(path.join(folder,"OPEN-FORMAT-RECEIPT-RECORD-AUDIT.json"),JSON.stringify(receiptFieldAudit,null,2),"utf8");
    const pathAudit=auditExistingOpenFormatFolder({folderPath:folder,targetRoot:input.targetRoot,businessNumber:business.businessNumber});
    pathAudit.productionDateTime=now.toISOString();
    pathAudit.collisionMinutesAdvanced=allocatedPath.audit.collisionMinutesAdvanced;
    if(!pathAudit.valid){
      const pathErrors=pathAudit.checks.filter(item=>!item.passed).map(item=>`${item.code}: ${item.message}`);
      result.validation.valid=false;
      result.validation.errors.push(...pathErrors);
    }
    fs.writeFileSync(path.join(folder,"OPEN-FORMAT-REPORT-2.6-AUDIT.json"),JSON.stringify(report26Audit,null,2),"utf8");
    fs.writeFileSync(path.join(folder,"OPEN-FORMAT-REPORT-5.4-AUDIT.json"),JSON.stringify(report54Audit,null,2),"utf8");
    fs.writeFileSync(path.join(folder,"OPEN-FORMAT-SUMMARY-AUDIT.json"),JSON.stringify(summaryAudit,null,2),"utf8");
    fs.writeFileSync(path.join(folder,"OPEN-FORMAT-PATH-AUDIT.json"),JSON.stringify(pathAudit,null,2),"utf8");
    fs.writeFileSync(path.join(folder,"EXPORT-SUMMARY.json"),JSON.stringify({...result,productionAudit,headerAudit,byteAudit,simulatorFilesAudit,receiptFieldAudit,report26Audit,report54Audit,summaryAudit,pathAudit},null,2),"utf8");
    return result;
  }
}