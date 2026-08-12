export interface Report54AuditIssue {
  code:string;
  severity:"error"|"warning";
  message:string;
}

export interface Report54Audit {
  valid:boolean;
  generatedAt:string;
  header:{businessNumber:string;businessName:string;fromDate:string;toDate:string;outputPath:string;};
  recordRows:Array<{code:string;description:string;count:number}>;
  dataRecordTotal:number;
  fileRecordTotal:number;
  issues:Report54AuditIssue[];
}

export function auditReport54(input:{
  businessNumber:string; businessName:string; fromDate:string; toDate:string; outputPath:string;
  renderedRows:Array<{code:string;description:string;count:number}>; expectedCounts:Record<string,number>;
  fileRecordTotal:number;
}):Report54Audit {
  const issues:Report54AuditIssue[]=[];
  if(!/^\d{9}$/.test(input.businessNumber.replace(/\D/g,""))) issues.push({code:"REPORT54_BUSINESS_NUMBER",severity:"error",message:"מספר העוסק בדוח 5.4 אינו בן 9 ספרות."});
  if(!input.businessName.trim()) issues.push({code:"REPORT54_BUSINESS_NAME",severity:"error",message:"שם העסק חסר בדוח 5.4."});
  if(!/^\d{4}-\d{2}-\d{2}$/.test(input.fromDate)||!/^\d{4}-\d{2}-\d{2}$/.test(input.toDate)||input.fromDate>input.toDate) issues.push({code:"REPORT54_DATE_RANGE",severity:"error",message:"טווח התאריכים בדוח 5.4 אינו תקין."});
  if(!input.outputPath.trim()) issues.push({code:"REPORT54_OUTPUT_PATH",severity:"error",message:"נתיב ההפקה חסר בדוח 5.4."});
  const expectedOrder=["100C","D110","120D","100B","110B","M100"].filter(code=>(input.expectedCounts[code]??0)>0);
  const actualOrder=input.renderedRows.map(r=>r.code);
  if(actualOrder.join("|")!==expectedOrder.join("|")) issues.push({code:"REPORT54_ROW_ORDER",severity:"error",message:"סדר סוגי הרשומות בדוח 5.4 אינו תואם למבנה הרשמי."});
  for(const row of input.renderedRows){
    const expected=input.expectedCounts[row.code]??0;
    if(row.count!==expected) issues.push({code:`REPORT54_COUNT_${row.code}`,severity:"error",message:`כמות ${row.code} בדוח 5.4 אינה תואמת לקובץ הנתונים.`});
  }
  const dataRecordTotal=input.renderedRows.reduce((sum,row)=>sum+row.count,0);
  const expectedDataTotal=expectedOrder.reduce((sum,code)=>sum+(input.expectedCounts[code]??0),0);
  if(dataRecordTotal!==expectedDataTotal) issues.push({code:"REPORT54_DATA_TOTAL",severity:"error",message:"סך רשומות הנתונים בדוח 5.4 אינו תואם לסכום סוגי הרשומות."});
  if(input.fileRecordTotal!==expectedDataTotal+2) issues.push({code:"REPORT54_FILE_TOTAL",severity:"error",message:"סך הרשומות בקובץ אינו שווה לרשומות הנתונים בתוספת פתיחה וסגירה."});
  return {valid:issues.every(i=>i.severity!=="error"),generatedAt:new Date().toISOString(),header:{businessNumber:input.businessNumber,businessName:input.businessName,fromDate:input.fromDate,toDate:input.toDate,outputPath:input.outputPath},recordRows:input.renderedRows,dataRecordTotal,fileRecordTotal:input.fileRecordTotal,issues};
}
