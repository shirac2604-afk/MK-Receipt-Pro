import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import {supabase} from "../lib/supabase";

export type MobileBusinessReport={year:number;incomeAgorot:number;expensesAgorot:number;netAgorot:number;activeReceiptCount:number;cancelledReceiptCount:number;expenseCount:number;csvUri:string};
export type MonthlyManagementReport={month:string;incomeAgorot:number;expensesAgorot:number;activeReceiptCount:number};
export type ManagementReport={year:number;incomeAgorot:number;expensesAgorot:number;netAgorot:number;activeReceiptCount:number;cancelledReceiptCount:number;expenseCount:number;missingExpenseAttachmentCount:number;months:MonthlyManagementReport[];expensesByCategory:{category:string;amountAgorot:number}[]};
const money=(agorot:number)=>String((agorot/100).toFixed(2));
const cell=(value:unknown)=>`"${String(value??"").replaceAll('"','""')}"`;


// Retrieve every page so financial totals do not stop at the cloud row limit.
async function allReportRows(
 queryPage: (start: number, end: number) => PromiseLike<{data: any[] | null; error: {message: string} | null}>,
 errorCode: string,
): Promise<any[]> {
 const rows: any[] = [];
 const pageSize = 500;
 for (let start = 0; ; start += pageSize) {
  const result = await queryPage(start, start + pageSize - 1);
  if (result.error) throw new Error(`${errorCode}:${result.error.message}`);
  const page = result.data ?? [];
  rows.push(...page);
  if (page.length < pageSize) return rows;
 }
}

export async function getManagementReport(businessId:string,year=new Date().getFullYear(),period?:number):Promise<ManagementReport>{
 if(!businessId)throw new Error("REPORT_BUSINESS_REQUIRED");
 const {from,to}=period===undefined?{from:`${year}-01-01`,to:`${year}-12-31`}:getTaxAdvanceDateRange(year,period);
 const [receipts, expenses] = await Promise.all([
  allReportRows((start, end) => supabase.from("receipts")
   .select("id,payment_date,amount_agorot,status").eq("business_id",businessId)
   .gte("payment_date",from).lte("payment_date",to).order("id").range(start,end), "REPORT_RECEIPTS_FAILED"),
  allReportRows((start, end) => supabase.from("expenses")
   .select("id,expense_date,amount_agorot,category,attachment_storage_key").eq("business_id",businessId)
   .gte("expense_date",from).lte("expense_date",to).order("id").range(start,end), "REPORT_EXPENSES_FAILED"),
 ]);
 const months=Array.from({length:12},(_,index)=>({month:`${year}-${String(index+1).padStart(2,"0")}`,incomeAgorot:0,expensesAgorot:0,activeReceiptCount:0}));
 const monthMap=new Map(months.map(item=>[item.month,item])),categories=new Map<string,number>();

 const active=receipts.filter((row:any)=>row.status!=="cancelled");
 for(const receipt of active){const item=monthMap.get(receipt.payment_date.slice(0,7));if(item){item.incomeAgorot+=Number(receipt.amount_agorot||0);item.activeReceiptCount+=1;}}
 for(const expense of expenses){const amount=Number(expense.amount_agorot||0),item=monthMap.get(expense.expense_date.slice(0,7));if(item)item.expensesAgorot+=amount;const category=String(expense.category||"אחר");categories.set(category,(categories.get(category)??0)+amount);}
 const incomeAgorot=active.reduce((sum:number,row:any)=>sum+Number(row.amount_agorot||0),0);
 const expensesAgorot=expenses.reduce((sum:number,row:any)=>sum+Number(row.amount_agorot||0),0);
 return {year,incomeAgorot,expensesAgorot,netAgorot:incomeAgorot-expensesAgorot,activeReceiptCount:active.length,cancelledReceiptCount:receipts.length-active.length,expenseCount:expenses.length,missingExpenseAttachmentCount:expenses.filter((row:any)=>!row.attachment_storage_key).length,months,expensesByCategory:Array.from(categories,([category,amountAgorot])=>({category,amountAgorot})).sort((a,b)=>b.amountAgorot-a.amountAgorot)};
}

export async function createAndShareYearlyReport(businessId:string,year=new Date().getFullYear(),period?:number):Promise<MobileBusinessReport>{
 if(!businessId)throw new Error("REPORT_BUSINESS_REQUIRED");
 const {from,to}=period===undefined?{from:`${year}-01-01`,to:`${year}-12-31`}:getTaxAdvanceDateRange(year,period);
 const [receipts, expenses] = await Promise.all([
  allReportRows((start, end) => supabase.from("receipts")
   .select("id,receipt_number,payment_date,client_name,description,amount_agorot,payment_method,status")
   .eq("business_id",businessId).gte("payment_date",from).lte("payment_date",to)
   .order("payment_date").order("id").range(start,end), "REPORT_RECEIPTS_FAILED"),
  allReportRows((start, end) => supabase.from("expenses")
   .select("id,expense_date,supplier_name,category,amount_agorot,payment_method,notes")
   .eq("business_id",businessId).gte("expense_date",from).lte("expense_date",to)
   .order("expense_date").order("id").range(start,end), "REPORT_EXPENSES_FAILED"),
 ]);
 const active=receipts.filter((row:any)=>row.status!=="cancelled");
 const incomeAgorot=active.reduce((sum:number,row:any)=>sum+Number(row.amount_agorot||0),0);
 const expensesAgorot=expenses.reduce((sum:number,row:any)=>sum+Number(row.amount_agorot||0),0);
 const rows=[
  ["סוג","תאריך","מספר","לקוח או ספק","תיאור או קטגוריה","אמצעי תשלום","סכום","סטטוס"],
  ...receipts.map((row:any)=>["קבלה",row.payment_date,row.receipt_number,row.client_name,row.description,row.payment_method,money(Number(row.amount_agorot||0)),row.status]),
  ...expenses.map((row:any)=>["הוצאה",row.expense_date,"",row.supplier_name,row.category,row.payment_method,money(Number(row.amount_agorot||0)),row.notes??""])
 ];
 const directory=FileSystem.documentDirectory;if(!directory)throw new Error("REPORT_STORAGE_UNAVAILABLE");
 const reportName=period===undefined?String(year):`${from}_${to}`;
 const csvUri=`${directory}MK-Receipt-Pro-Report-${reportName}.csv`;
 await FileSystem.writeAsStringAsync(csvUri,`\ufeff${rows.map(row=>row.map(cell).join(",")).join("\n")}`,{encoding:FileSystem.EncodingType.UTF8});
 const info=await FileSystem.getInfoAsync(csvUri);if(!info.exists||!info.size)throw new Error("REPORT_WRITE_FAILED");
 if(!await Sharing.isAvailableAsync())throw new Error("REPORT_SHARING_UNAVAILABLE");
 await Sharing.shareAsync(csvUri,{mimeType:"text/csv",dialogTitle:`דוח MK Receipt Pro ${reportName}`,UTI:"public.comma-separated-values-text"});
 return{year,incomeAgorot,expensesAgorot,netAgorot:incomeAgorot-expensesAgorot,activeReceiptCount:active.length,cancelledReceiptCount:receipts.length-active.length,expenseCount:expenses.length,csvUri};
}

export function getTaxAdvanceDateRange(year: number, period: number) {
 if (!Number.isInteger(year) || year < 1000 || year > 9999 || !Number.isInteger(period) || period < 0 || period > 5) {
  throw new Error("REPORT_INVALID_PERIOD");
 }
 const endMonth = (period + 1) * 2;
 const month = (value: number) => String(value).padStart(2, "0");
 return {
  from: `${year}-${month(endMonth - 1)}-01`,
  to: `${year}-${month(endMonth)}-${new Date(Date.UTC(year, endMonth, 0)).getUTCDate()}`,
 };
}
