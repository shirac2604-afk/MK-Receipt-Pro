import type { PaymentMethod } from "../../database/src/types";

export interface ReceiptComplianceRow {
  receipt_number:number;
  payment_date:string;
  issued_at:string;
  client_name:string;
  client_phone:string|null;
  amount_agorot:number;
  payment_method:PaymentMethod;
  reference_number:string|null;
  status:"active"|"cancelled";
}
export interface ReceiptComplianceIssue { severity:"error"|"warning"; code:string; receiptNumber:number; field:string; message:string; }
export interface ReceiptComplianceResult { valid:boolean; errors:ReceiptComplianceIssue[]; warnings:ReceiptComplianceIssue[]; }

const isoDate=/^\d{4}-\d{2}-\d{2}(?:T.*)?$/;
const hasText=(v:string|null|undefined)=>Boolean(v?.trim());

export function validateReceiptFor100C120D(row:ReceiptComplianceRow):ReceiptComplianceResult {
  const issues:ReceiptComplianceIssue[]=[];
  const add=(severity:"error"|"warning",code:string,field:string,message:string)=>issues.push({severity,code,receiptNumber:row.receipt_number,field,message});
  if(!Number.isInteger(row.receipt_number)||row.receipt_number<=0)add("error","100C_DOCUMENT_NUMBER","1204/1304","מספר המסמך חייב להיות חיובי ועקבי בכותרת ובפרטי הקבלה.");
  if(!isoDate.test(row.issued_at))add("error","100C_ISSUED_DATE","1205","תאריך הפקת המסמך אינו תקין.");
  if(!isoDate.test(row.payment_date))add("error","100C_DOCUMENT_DATE","1216/1230/1322","תאריך המסמך/הערך אינו תקין.");
  if(!hasText(row.client_name))add("error","100C_CUSTOMER_NAME","1207","שם לקוח הוא שדה חובה בקבלה.");
  if((row.client_name??"").length>50)add("warning","100C_CUSTOMER_NAME_TRUNCATED","1207","שם הלקוח ארוך מ־50 תווים ויקוצר בייצוא.");
  if((row.client_phone??"").length>15)add("warning","100C_PHONE_TRUNCATED","1214","מספר הטלפון ארוך מ־15 תווים ויקוצר בייצוא.");
  if(!Number.isInteger(row.amount_agorot)||row.amount_agorot<=0)add("error","100C_AMOUNT","1223/1312","סכום הקבלה חייב להיות חיובי ולהישמר באגורות.");
  const supportedMethods = new Set(["cash","bank_transfer","bit","paybox"]);
  if(!supportedMethods.has(String(row.payment_method))){
    add("error","120D_UNSUPPORTED_PAYMENT_METHOD","1306","אמצעי התשלום אינו נתמך בגרסה 1.0. ניתן לייצא רק מזומן, העברה בנקאית, ביט או פייבוקס.");
  }
  if((row.payment_method==="bit"||row.payment_method==="paybox")&&!hasText(row.reference_number)){
    add("warning","120D_DIGITAL_REFERENCE_MISSING","1306/1324","מומלץ לשמור אסמכתה לתשלום דיגיטלי הממופה בקובץ המבנה האחיד לקוד 9.");
  }
  if(row.status!=="active"&&row.status!=="cancelled")add("error","100C_CANCEL_STATUS","1228","סטטוס המסמך אינו ניתן למיפוי לשדה מסמך מבוטל.");
  return {valid:!issues.some(i=>i.severity==="error"),errors:issues.filter(i=>i.severity==="error"),warnings:issues.filter(i=>i.severity==="warning")};
}

export function validateReceiptBatch(rows:ReceiptComplianceRow[]):ReceiptComplianceResult {
  const seen=new Set<number>(); const errors:ReceiptComplianceIssue[]=[]; const warnings:ReceiptComplianceIssue[]=[];
  for(const row of rows){
    if(seen.has(row.receipt_number))errors.push({severity:"error",code:"DUPLICATE_DOCUMENT_NUMBER",receiptNumber:row.receipt_number,field:"1204/1304",message:"מספר מסמך כפול בטווח הייצוא."});
    seen.add(row.receipt_number);
    const result=validateReceiptFor100C120D(row); errors.push(...result.errors); warnings.push(...result.warnings);
  }
  return {valid:errors.length===0,errors,warnings};
}
