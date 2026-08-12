import fs from "node:fs";
import path from "node:path";
import type { AnnualReport, DateRangeReport, ReportFilters } from "../../../database/src/types";
import type { ReportRepository } from "../../../database/src/repositories/ReportRepository";

function safeCsv(value:unknown):string { const raw=String(value??""); const protectedValue=/^[=+\-@]/.test(raw)?`'${raw}`:raw; return `"${protectedValue.replace(/"/g,'""')}"`; }
function paymentLabel(value:string|null|undefined):string {
  return value==="cash"?"מזומן":value==="bank_transfer"?"העברה בנקאית":value==="bit"?"Bit":value==="paybox"?"PayBox":value??"";
}
function csvText(rows:ReturnType<ReportRepository["getReceiptsForExport"]>):string {
  const header=["מספר קבלה","תאריך","לקוח","תיאור","סכום בש״ח","אמצעי תשלום","אסמכתה","סטטוס"].map(safeCsv).join(",");
  const lines=rows.map(row=>[row.receiptNumber,row.paymentDate,row.clientName,row.description,(row.amountAgorot/100).toFixed(2),paymentLabel(row.paymentMethod),row.referenceNumber??"",row.status==="active"?"פעילה":"מבוטלת"].map(safeCsv).join(","));
  return `\uFEFF${[header,...lines].join("\r\n")}`;
}
function expenseCsvText(rows:ReturnType<ReportRepository["getExpensesForExport"]>):string {
  const header=["תאריך","ספק / בית עסק","קטגוריה","סכום בש״ח","אמצעי תשלום","הערה","שם אסמכתה","מצב אסמכתה"].map(safeCsv).join(",");
  const lines=rows.map(row=>[row.expenseDate,row.supplierName,row.category,(row.amountAgorot/100).toFixed(2),paymentLabel(row.paymentMethod),row.notes??"",row.attachmentOriginalName??"",row.attachmentPath?"מצורפת":"חסרה"].map(safeCsv).join(","));
  return `\uFEFF${[header,...lines].join("\r\n")}`;
}
function simpleCsv(headers:string[], rows:Array<Array<unknown>>):string {
  return `\uFEFF${[headers.map(safeCsv).join(","),...rows.map(row=>row.map(safeCsv).join(","))].join("\r\n")}`;
}
function monthKey(date:string):string { return date.slice(0,7); }
function cleanFilePart(value:string):string { return value.replace(/[<>:"/\\|?*\x00-\x1F]/g,"-").replace(/\s+/g," ").trim().slice(0,80)||"מסמך"; }

export class ReportService {
  constructor(private readonly repository:ReportRepository) {}
  getRange(filters:ReportFilters):DateRangeReport{return this.repository.getRangeReport(filters)}
  getAnnual(year:number):AnnualReport{return this.repository.getAnnualReport(year)}
  exportCsv(filters:ReportFilters,filePath:string):string { fs.mkdirSync(path.dirname(filePath),{recursive:true}); fs.writeFileSync(filePath,csvText(this.repository.getReceiptsForExport(filters)),"utf8"); return filePath; }
  exportAccountantPackage(year:number,targetRoot:string):string {
    const root=path.join(targetRoot,`מפתחות-להצלחה-חבילת-דיווח-שנתי-${year}`);
    const vatDir=path.join(root,"01-מע״מ-הצהרת-עוסק-פטור");
    const incomeTaxDir=path.join(root,"02-מס-הכנסה-דיווח-שנתי");
    const receiptPdfDir=path.join(incomeTaxDir,"מסמכים","קבלות");
    const expenseAttachmentDir=path.join(incomeTaxDir,"מסמכים","הוצאות");
    const dataDir=path.join(incomeTaxDir,"נתונים");
    const summaryDir=path.join(incomeTaxDir,"סיכומים");
    fs.rmSync(root,{recursive:true,force:true});
    [vatDir,receiptPdfDir,expenseAttachmentDir,dataDir,summaryDir].forEach(dir=>fs.mkdirSync(dir,{recursive:true}));

    const filters={fromDate:`${year}-01-01`,toDate:`${year}-12-31`};
    const receipts=this.repository.getReceiptsForExport(filters);
    const expenses=this.repository.getExpensesForExport(filters);
    const annual=this.repository.getAnnualReport(year);
    const activeReceipts=receipts.filter(row=>row.status==="active");
    const expenseAgorot=expenses.reduce((sum,row)=>sum+row.amountAgorot,0);
    const netAgorot=annual.incomeAgorot-expenseAgorot;

    const vatTurnoverRows=[
      ["שנת דיווח",year],
      ["מחזור לפי קבלות פעילות במערכת בש״ח",(annual.incomeAgorot/100).toFixed(2)],
      ["מספר קבלות פעילות",annual.activeReceiptCount],
      ["מספר קבלות מבוטלות",annual.cancelledReceiptCount]
    ];
    fs.writeFileSync(path.join(vatDir,`נתוני-מחזור-לעוסק-פטור-${year}.csv`),simpleCsv(["נתון","ערך"],vatTurnoverRows),"utf8");
    const vatReadme=[
      `מע״מ — הצהרת עוסק פטור — ${year}`,
      "",
      `מחזור לפי הקבלות הפעילות במערכת: ${(annual.incomeAgorot/100).toFixed(2)} ₪`,
      `קבלות פעילות: ${annual.activeReceiptCount}`,
      `קבלות מבוטלות: ${annual.cancelledReceiptCount}`,
      "",
      "הצהרת עוסק פטור למע״מ היא הצהרה על מחזור העסקאות של השנה שחלפה.",
      "הנתון בקובץ זה מבוסס על הקבלות הפעילות שנשמרו ב-MK Receipt Pro.",
      "לפני ההגשה יש לוודא שכל עסקאות השנה משתקפות במערכת.",
      "הקובץ הוא כלי הכנה בלבד ואינו טופס רשמי של רשות המסים."
    ].join("\r\n");
    fs.writeFileSync(path.join(vatDir,"00-קראי-לפני-הגשה.txt"),vatReadme,"utf8");

    fs.writeFileSync(path.join(dataDir,`קבלות-${year}.csv`),csvText(receipts),"utf8");
    fs.writeFileSync(path.join(dataDir,`הוצאות-${year}.csv`),expenseCsvText(expenses),"utf8");

    const expenseByMonth=new Map<string,{amount:number,count:number}>();
    for(const row of expenses){const key=monthKey(row.expenseDate),value=expenseByMonth.get(key)??{amount:0,count:0};value.amount+=row.amountAgorot;value.count+=1;expenseByMonth.set(key,value)}
    const monthlyRows=annual.months.map(month=>{const expense=expenseByMonth.get(month.month)??{amount:0,count:0};return [month.month,month.activeReceiptCount,month.cancelledReceiptCount,(month.incomeAgorot/100).toFixed(2),expense.count,(expense.amount/100).toFixed(2),((month.incomeAgorot-expense.amount)/100).toFixed(2)]});
    fs.writeFileSync(path.join(summaryDir,`סיכום-חודשי-${year}.csv`),simpleCsv(["חודש","קבלות פעילות","קבלות מבוטלות","הכנסות בש״ח","מספר הוצאות","הוצאות בש״ח","הפרש בש״ח"],monthlyRows),"utf8");

    const categoryMap=new Map<string,{count:number,amount:number}>();
    for(const row of expenses){const value=categoryMap.get(row.category)??{count:0,amount:0};value.count++;value.amount+=row.amountAgorot;categoryMap.set(row.category,value)}
    const categoryRows=[...categoryMap.entries()].sort((a,b)=>b[1].amount-a[1].amount).map(([category,value])=>[category,value.count,(value.amount/100).toFixed(2)]);
    fs.writeFileSync(path.join(summaryDir,`הוצאות-לפי-קטגוריה-${year}.csv`),simpleCsv(["קטגוריה","מספר הוצאות","סכום בש״ח"],categoryRows),"utf8");

    const paymentMap=new Map<string,{count:number,amount:number}>();
    for(const row of activeReceipts){const key=paymentLabel(row.paymentMethod),value=paymentMap.get(key)??{count:0,amount:0};value.count++;value.amount+=row.amountAgorot;paymentMap.set(key,value)}
    const paymentRows=[...paymentMap.entries()].sort((a,b)=>b[1].amount-a[1].amount).map(([method,value])=>[method,value.count,(value.amount/100).toFixed(2)]);
    fs.writeFileSync(path.join(summaryDir,`הכנסות-לפי-אמצעי-תשלום-${year}.csv`),simpleCsv(["אמצעי תשלום","מספר קבלות","סכום בש״ח"],paymentRows),"utf8");

    const missingRows:Array<Array<unknown>>=[]; let copiedReceipts=0,copiedExpenses=0;
    for(const row of receipts){
      const monthDir=path.join(receiptPdfDir,monthKey(row.paymentDate));fs.mkdirSync(monthDir,{recursive:true});
      if(row.originalPdfPath&&fs.existsSync(row.originalPdfPath)){fs.copyFileSync(row.originalPdfPath,path.join(monthDir,`קבלה-${row.receiptNumber}-${cleanFilePart(row.clientName)}.pdf`));copiedReceipts++}
      else missingRows.push(["קבלה",row.receiptNumber,row.paymentDate,row.clientName,"PDF קבלה חסר"]);
      if(row.status==="cancelled"){
        if(row.cancellationPdfPath&&fs.existsSync(row.cancellationPdfPath)){fs.copyFileSync(row.cancellationPdfPath,path.join(monthDir,`ביטול-קבלה-${row.receiptNumber}-${cleanFilePart(row.clientName)}.pdf`));copiedReceipts++}
        else missingRows.push(["ביטול קבלה",row.receiptNumber,row.paymentDate,row.clientName,"PDF ביטול חסר"]);
      }
    }
    for(const row of expenses){
      const monthDir=path.join(expenseAttachmentDir,monthKey(row.expenseDate));fs.mkdirSync(monthDir,{recursive:true});
      if(row.attachmentPath&&fs.existsSync(row.attachmentPath)){const ext=path.extname(row.attachmentPath)||path.extname(row.attachmentOriginalName??"");fs.copyFileSync(row.attachmentPath,path.join(monthDir,`${row.expenseDate}-${cleanFilePart(row.supplierName)}-${row.id.slice(0,8)}${ext}`));copiedExpenses++}
      else missingRows.push(["הוצאה","",row.expenseDate,row.supplierName,"אסמכתת הוצאה חסרה"]);
    }
    fs.writeFileSync(path.join(summaryDir,`מסמכים-חסרים-${year}.csv`),simpleCsv(["סוג","מספר","תאריך","לקוח / ספק","הערה"],missingRows),"utf8");

    const summaryRows=[["שנה",year],["הכנסות בש״ח",(annual.incomeAgorot/100).toFixed(2)],["הוצאות בש״ח",(expenseAgorot/100).toFixed(2)],["הפרש בש״ח",(netAgorot/100).toFixed(2)],["קבלות פעילות",annual.activeReceiptCount],["קבלות מבוטלות",annual.cancelledReceiptCount],["מספר הוצאות",expenses.length],["מסמכי קבלה / ביטול שהועתקו",copiedReceipts],["אסמכתאות הוצאה שהועתקו",copiedExpenses],["מסמכים חסרים",missingRows.length]];
    fs.writeFileSync(path.join(summaryDir,`סיכום-שנתי-${year}.csv`),simpleCsv(["מדד","ערך"],summaryRows),"utf8");
    fs.writeFileSync(path.join(summaryDir,`סיכום-שנתי-${year}.json`),JSON.stringify({year,incomeAgorot:annual.incomeAgorot,expenseAgorot,netAgorot,activeReceiptCount:annual.activeReceiptCount,cancelledReceiptCount:annual.cancelledReceiptCount,expenseCount:expenses.length,copiedReceipts,copiedExpenses,missingDocumentCount:missingRows.length},null,2),"utf8");

    const readme=[`חבילת דיווח שנתית לעוסק פטור — ${year}`,"","תקציר",`הכנסות: ${(annual.incomeAgorot/100).toFixed(2)} ₪`,`הוצאות: ${(expenseAgorot/100).toFixed(2)} ₪`,`הפרש: ${(netAgorot/100).toFixed(2)} ₪`,`קבלות פעילות: ${annual.activeReceiptCount}`,`קבלות מבוטלות: ${annual.cancelledReceiptCount}`,`הוצאות: ${expenses.length}`,`מסמכים חסרים: ${missingRows.length}`,"","מבנה החבילה","01-מע״מ-הצהרת-עוסק-פטור — נתוני המחזור השנתי וכלי בדיקה לפני הצהרת מע״מ.","02-מס-הכנסה-דיווח-שנתי/מסמכים — קבלות, ביטולים ואסמכתאות הוצאה לפי חודש.","02-מס-הכנסה-דיווח-שנתי/נתונים — קובצי CSV מלאים של קבלות והוצאות.","02-מס-הכנסה-דיווח-שנתי/סיכומים — סיכום שנתי, חודשי, קטגוריות, אמצעי תשלום ומסמכים חסרים.","","קובצי CSV נפתחים ישירות ב-Excel.","הסיכומים נועדו לעזור בהכנה עצמאית של הדיווחים; הם אינם מהווים טופס רשמי של רשות המסים ואינם קובעים מהי הוצאה מוכרת לצורכי מס.", "", "לפני הגשה עצמאית", "• בדקי שהמחזור השנתי תואם לכל הקבלות הפעילות.", "• עברי על רשימת המסמכים החסרים.", "• בדקי את סיווג ההוצאות לפני שימוש בהן לצורכי מס.", "• שמרי את החבילה יחד עם אישורי ההגשה הרשמיים לאחר הדיווח."].join("\r\n");
    fs.writeFileSync(path.join(root,"00-פתח-אותי.txt"),readme,"utf8");
    const afterFiling=[
      `מעקב לאחר הגשה — ${year}`,
      "",
      "מע״מ — הצהרת עוסק פטור",
      "□ שמרתי את אישור ההגשה הרשמי.",
      "□ שמרתי עותק של נתון המחזור שעל בסיסו הוגשה ההצהרה.",
      "",
      "מס הכנסה — דיווח שנתי",
      "□ שמרתי את אישור ההגשה הרשמי.",
      "□ שמרתי עותק של הדוח והנספחים שהוגשו.",
      "□ שמרתי מסמכים ואישורים חיצוניים ששימשו אותי בדיווח.",
      "",
      "MK Receipt Pro",
      "□ שמרתי את חבילת הדיווח השנתית.",
      "□ השלמתי מסמכים שסומנו כחסרים.",
      "",
      "רשימה זו היא כלי ארגוני בלבד ואינה רשימת דרישות רשמית של רשות המסים.",
      "",
      "בתוך MK Receipt Pro קיים גם צ'קליסט אינטראקטיבי שנשמר בנפרד לפי שנת דיווח."
    ].join("\r\n");
    fs.writeFileSync(path.join(root,"04-מעקב-לאחר-הגשה.txt"),afterFiling,"utf8");
    const externalDir=path.join(root,"03-מסמכים-ונתונים-נוספים");
    fs.mkdirSync(externalDir,{recursive:true});
    const externalGuide=[
      `מסמכים ונתונים נוספים לדוח השנתי — ${year}`,
      "",
      "תיקייה זו נפרדת מנתוני העסק שנוצרו ב-MK Receipt Pro.",
      "אפשר להשתמש בה כדי לרכז מסמכים ואישורים חיצוניים שתרצי לבדוק בעת הכנת הדוח השנתי.",
      "",
      "רשימת בדיקה אישית:",
      "□ בדקתי אם קיימים אישורים שנתיים או נתוני הכנסה נוספים שאינם במערכת.",
      "□ בדקתי אם יש מסמכים חיצוניים הרלוונטיים לדוח שלי.",
      "□ שמרתי עותקים של מסמכים שבהם השתמשתי בעת ההגשה.",
      "",
      "אין לראות ברשימה זו קביעה שמסמך מסוים נדרש או מזכה בהטבת מס.",
      "המערכת אינה מסווגת מסמכים חיצוניים אוטומטית לצורכי מס."
    ].join("\r\n");
    fs.writeFileSync(path.join(externalDir,"00-רשימת-בדיקה.txt"),externalGuide,"utf8");
    return root;
  }
}
