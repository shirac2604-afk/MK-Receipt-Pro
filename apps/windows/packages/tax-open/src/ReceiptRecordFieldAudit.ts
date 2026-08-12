export interface ReceiptRecordFieldAuditIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  recordNumber?: number;
  receiptNumber?: string;
}

export interface ReceiptRecordFieldAuditResult {
  valid: boolean;
  generatedAt: string;
  receiptCount: number;
  c100Count: number;
  d120Count: number;
  paymentMethodCounts: Record<string, number>;
  issues: ReceiptRecordFieldAuditIssue[];
}

function field(record: string, startInclusive: number, endExclusive: number): string {
  return record.slice(startInclusive, endExclusive);
}
function digits(value: string): boolean { return /^\d+$/.test(value); }
function spaces(value: string): boolean { return /^ *$/.test(value); }
function signedAmount(value: string): boolean { return /^[+-]\d{14}$/.test(value); }
function validDate(value: string): boolean {
  if (!/^\d{8}$/.test(value)) return false;
  const y = Number(value.slice(0,4));
  const m = Number(value.slice(4,6));
  const d = Number(value.slice(6,8));
  if (y < 1900 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y,m-1,d));
  return date.getUTCFullYear()===y && date.getUTCMonth()===m-1 && date.getUTCDate()===d;
}
function validTime(value: string): boolean {
  if (!/^\d{4}$/.test(value)) return false;
  const h=Number(value.slice(0,2)); const m=Number(value.slice(2,4));
  return h>=0&&h<=23&&m>=0&&m<=59;
}
function trimmed(value:string):string{return value.trim();}

export function auditReceiptRecordFields(records: string[]): ReceiptRecordFieldAuditResult {
  const issues: ReceiptRecordFieldAuditIssue[]=[];
  const add=(severity:ReceiptRecordFieldAuditIssue["severity"],code:string,message:string,recordNumber?:number,receiptNumber?:string)=>issues.push({severity,code,message,...(recordNumber===undefined?{}:{recordNumber}),...(receiptNumber===undefined?{}:{receiptNumber})});
  const c100Records=records.filter(r=>r.slice(0,4)==="C100");
  const d120Records=records.filter(r=>r.slice(0,4)==="D120");
  const d120ByDocument=new Map<string,string[]>();
  const paymentMethodCounts:Record<string,number>={};

  d120Records.forEach((record,index)=>{
    const recordNumber=index+1;
    const documentNumber=trimmed(field(record,25,45));
    const method=field(record,49,50);
    paymentMethodCounts[method]=(paymentMethodCounts[method]??0)+1;
    const list=d120ByDocument.get(documentNumber)??[]; list.push(record); d120ByDocument.set(documentNumber,list);
    if(record.length!==222)add("error","120D_LENGTH",`אורך רשומת 120D הוא ${record.length} במקום 222.`,recordNumber,documentNumber);
    if(field(record,0,4)!=="D120")add("error","D120_CODE","קוד הרשומה אינו D120.",recordNumber,documentNumber);
    if(!digits(field(record,4,13)))add("error","120D_SEQUENCE","מספר הרשומה בקובץ אינו נומרי בן 9 ספרות.",recordNumber,documentNumber);
    if(!digits(field(record,13,22)))add("error","120D_BUSINESS_NUMBER","מספר העוסק אינו נומרי בן 9 ספרות.",recordNumber,documentNumber);
    if(field(record,22,25)!=="400")add("error","120D_DOCUMENT_TYPE","סוג המסמך ברשומת 120D חייב להיות 400 עבור קבלה.",recordNumber,documentNumber);
    if(!documentNumber)add("error","120D_DOCUMENT_NUMBER","מספר המסמך חסר.",recordNumber,documentNumber);
    if(!digits(field(record,45,49))||Number(field(record,45,49))<1)add("error","120D_LINE_NUMBER","מספר השורה במסמך חייב להיות חיובי.",recordNumber,documentNumber);
    if(!["1","4","9"].includes(method))add("error","120D_PAYMENT_METHOD","קוד אמצעי התשלום אינו נתמך בפרופיל גרסה 1.0.",recordNumber,documentNumber);
    if(!digits(field(record,50,103)))add("error","120D_CONDITIONAL_FIELDS","שדות התשלום המותנים 1307–1311 חייבים להיות נומריים ומאופסים כאשר אינם בשימוש.",recordNumber,documentNumber);
    if(!signedAmount(field(record,103,118)))add("error","120D_AMOUNT","סכום שורת התקבול אינו בפורמט חתום של 15 תווים.",recordNumber,documentNumber);
    if(!digits(field(record,118,119)))add("error","120D_CARD_COMPANY","שדה 1313 חייב להיות נומרי גם כאשר אינו בשימוש.",recordNumber,documentNumber);
    if(!spaces(field(record,119,139)))add("error","120D_CARD_NUMBER_PADDING","שדה 1314 חייב להיות ריק/מרופד ברווחים כאשר אינו בשימוש.",recordNumber,documentNumber);
    if(!digits(field(record,139,140)))add("error","120D_CARD_TRANSACTION_TYPE","שדה 1315 חייב להיות נומרי גם כאשר אינו בשימוש.",recordNumber,documentNumber);
    if(!spaces(field(record,140,147)))add("error","120D_BRANCH_PADDING","מזהה סניף 1320 חייב להיות ריק כאשר אין סניפים.",recordNumber,documentNumber);
    if(!validDate(field(record,147,155)))add("error","120D_DOCUMENT_DATE","תאריך המסמך בשדה 1322 אינו תקין.",recordNumber,documentNumber);
    if(!digits(field(record,155,162))||Number(field(record,155,162))<1)add("error","120D_HEADER_LINK","השדה המקשר לכותרת חייב להיות מספר חיובי בן 7 ספרות.",recordNumber,documentNumber);
    if(!spaces(field(record,162,222)))add("error","120D_FUTURE_PADDING","שטח הנתונים העתידי אינו מרופד ברווחים.",recordNumber,documentNumber);
    if(method==="9")add("warning","120D_PAYMENT_CODE_9_REQUIRES_CONFIRMATION","Bit/PayBox ממופים לקוד 9. יש לאמת מיפוי זה מול רשות המסים או מומחה לפני ההגשה.",recordNumber,documentNumber);
  });

  c100Records.forEach((record,index)=>{
    const recordNumber=index+1;
    const documentNumber=trimmed(field(record,25,45));
    if(record.length!==444)add("error","100C_LENGTH",`אורך רשומת 100C הוא ${record.length} במקום 444.`,recordNumber,documentNumber);
    if(field(record,0,4)!=="C100")add("error","C100_CODE","קוד הרשומה אינו C100.",recordNumber,documentNumber);
    if(!digits(field(record,4,13)))add("error","100C_SEQUENCE","מספר הרשומה בקובץ אינו נומרי בן 9 ספרות.",recordNumber,documentNumber);
    if(!digits(field(record,13,22)))add("error","100C_BUSINESS_NUMBER","מספר העוסק אינו נומרי בן 9 ספרות.",recordNumber,documentNumber);
    if(field(record,22,25)!=="400")add("error","100C_DOCUMENT_TYPE","סוג המסמך ברשומת 100C חייב להיות 400 עבור קבלה.",recordNumber,documentNumber);
    if(!documentNumber)add("error","100C_DOCUMENT_NUMBER","מספר המסמך חסר.",recordNumber,documentNumber);
    if(!validDate(field(record,45,53)))add("error","100C_ISSUE_DATE","תאריך הפקת המסמך אינו תקין.",recordNumber,documentNumber);
    if(!validTime(field(record,53,57)))add("error","100C_ISSUE_TIME","שעת הפקת המסמך אינה בפורמט HHMM תקין.",recordNumber,documentNumber);
    if(!trimmed(field(record,57,107)))add("error","100C_CUSTOMER_NAME","שם הלקוח חסר.",recordNumber,documentNumber);
    if(!digits(field(record,252,261)))add("error","100C_CUSTOMER_VAT","שדה מספר עוסק הלקוח חייב להיות נומרי/מאופס.",recordNumber,documentNumber);
    if(!validDate(field(record,261,269)))add("error","100C_VALUE_DATE","תאריך הערך אינו תקין.",recordNumber,documentNumber);
    if(!spaces(field(record,269,347)))add("error","100C_OPTIONAL_AMOUNT_FIELDS","שדות 1217–1222 חייבים להיות ריקים בקבלה רגילה שאינה חשבונית ייצוא.",recordNumber,documentNumber);
    if(!signedAmount(field(record,347,362)))add("error","100C_TOTAL_AMOUNT","סכום הקבלה בשדה 1223 אינו בפורמט חתום של 15 תווים.",recordNumber,documentNumber);
    if(!spaces(field(record,362,374)))add("error","100C_WITHHOLDING_PADDING","שדה ניכוי במקור 1224 חייב להיות ריק כאשר לא נוהל ניכוי.",recordNumber,documentNumber);
    if(!trimmed(field(record,374,389)))add("error","100C_CUSTOMER_KEY","מפתח הלקוח בשדה 1225 הוא חובה למסמך 400.",recordNumber,documentNumber);
    const cancelled=field(record,399,400); if(cancelled!==" "&&cancelled!=="1")add("error","100C_CANCELLED_FLAG","שדה מסמך מבוטל חייב להיות ריק או 1.",recordNumber,documentNumber);
    if(!validDate(field(record,400,408)))add("error","100C_DOCUMENT_DATE","תאריך המסמך בשדה 1230 אינו תקין.",recordNumber,documentNumber);
    if(!spaces(field(record,408,415)))add("error","100C_BRANCH_PADDING","מזהה סניף 1231 חייב להיות ריק כאשר אין סניפים.",recordNumber,documentNumber);
    if(!trimmed(field(record,415,424)))add("warning","100C_OPERATOR_EMPTY","מומלץ לשמור שם משתמש/מבצע פעולה בשדה 1233.",recordNumber,documentNumber);
    const headerLink=field(record,424,431); if(!digits(headerLink)||Number(headerLink)<1)add("error","100C_DETAIL_LINK","השדה המקשר לפרטים חייב להיות מספר חיובי בן 7 ספרות.",recordNumber,documentNumber);
    if(!spaces(field(record,431,444)))add("error","100C_FUTURE_PADDING","שטח הנתונים העתידי אינו מרופד ברווחים.",recordNumber,documentNumber);

    const details=d120ByDocument.get(documentNumber)??[];
    if(details.length!==1)add("error","RECEIPT_DETAIL_CARDINALITY",`לקבלה נדרשת רשומת 120D אחת בפרופיל הנוכחי; נמצאו ${details.length}.`,recordNumber,documentNumber);
    const detail=details[0];
    if(detail){
      if(field(detail,13,22)!==field(record,13,22))add("error","RECEIPT_BUSINESS_MISMATCH","מספר העוסק שונה בין 100C ל־120D.",recordNumber,documentNumber);
      if(trimmed(field(detail,25,45))!==documentNumber)add("error","RECEIPT_DOCUMENT_NUMBER_MISMATCH","מספר המסמך שונה בין 100C ל־120D.",recordNumber,documentNumber);
      if(field(detail,103,118)!==field(record,347,362))add("error","RECEIPT_AMOUNT_MISMATCH","הסכום שונה בין 100C ל־120D.",recordNumber,documentNumber);
      if(field(detail,147,155)!==field(record,400,408))add("error","RECEIPT_DATE_MISMATCH","תאריך המסמך שונה בין 100C ל־120D.",recordNumber,documentNumber);
      if(field(detail,155,162)!==headerLink)add("error","RECEIPT_LINK_MISMATCH","השדה המקשר שונה בין 100C ל־120D.",recordNumber,documentNumber);
    }
  });

  for(const documentNumber of d120ByDocument.keys()){
    if(!c100Records.some(record=>trimmed(field(record,25,45))===documentNumber))add("error","ORPHAN_120D","נמצאה רשומת 120D ללא כותרת 100C תואמת.",undefined,documentNumber);
  }

  return {valid:!issues.some(i=>i.severity==="error"),generatedAt:new Date().toISOString(),receiptCount:c100Records.length,c100Count:c100Records.length,d120Count:d120Records.length,paymentMethodCounts,issues};
}
