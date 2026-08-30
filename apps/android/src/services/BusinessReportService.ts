import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import {supabase} from "../lib/supabase";

export type MobileBusinessReport={year:number;incomeAgorot:number;expensesAgorot:number;netAgorot:number;activeReceiptCount:number;cancelledReceiptCount:number;expenseCount:number;csvUri:string};
export type MonthlyManagementReport={month:string;incomeAgorot:number;expensesAgorot:number;activeReceiptCount:number};
export type ManagementReport={year:number;incomeAgorot:number;expensesAgorot:number;netAgorot:number;activeReceiptCount:number;cancelledReceiptCount:number;expenseCount:number;missingExpenseAttachmentCount:number;months:MonthlyManagementReport[];expensesByCategory:{category:string;amountAgorot:number}[]};
const money=(agorot:number)=>String((agorot/100).toFixed(2));
const cell=(value:unknown)=>`"${String(value??"").replaceAll('"','""')}"`;

export async function getManagementReport(businessId:string,year=new Date().getFullYear()):Promise<ManagementReport>{
 if(!businessId)throw new Error("REPORT_BUSINESS_REQUIRED");
 const from=`${year}-01-01`,to=`${year}-12-31`;
 const [receiptsResult,expensesResult]=await Promise.all([
  supabase.from("receipts").select("payment_date,amount_agorot,status").eq("business_id",businessId).gte("payment_date",from).lte("payment_date",to),
  supabase.from("expenses").select("expense_date,amount_agorot,category,attachment_storage_key").eq("business_id",businessId).gte("expense_date",from).lte("expense_date",to)
 ]);
 if(receiptsResult.error)throw new Error(`REPORT_RECEIPTS_FAILED:${receiptsResult.error.message}`);
 if(expensesResult.error)throw new Error(`REPORT_EXPENSES_FAILED:${expensesResult.error.message}`);
 const months=Array.from({length:12},(_,index)=>({month:`${year}-${String(index+1).padStart(2,"0")}`,incomeAgorot:0,expensesAgorot:0,activeReceiptCount:0}));
 const monthMap=new Map(months.map(item=>[item.month,item])),categories=new Map<string,number>();
 const receipts=receiptsResult.data??[],expenses=expensesResult.data??[];
 const active=receipts.filter((row:any)=>row.status!=="cancelled");
 for(const receipt of active){const item=monthMap.get(receipt.payment_date.slice(0,7));if(item){item.incomeAgorot+=Number(receipt.amount_agorot||0);item.activeReceiptCount+=1;}}
 for(const expense of expenses){const amount=Number(expense.amount_agorot||0),item=monthMap.get(expense.expense_date.slice(0,7));if(item)item.expensesAgorot+=amount;const category=String(expense.category||"אחר");categories.set(category,(categories.get(category)??0)+amount);}
 const incomeAgorot=active.reduce((sum:number,row:any)=>sum+Number(row.amount_agorot||0),0);
 const expensesAgorot=expenses.reduce((sum:number,row:any)=>sum+Number(row.amount_agorot||0),0);
 return {year,incomeAgorot,expensesAgorot,netAgorot:incomeAgorot-expensesAgorot,activeReceiptCount:active.length,cancelledReceiptCount:receipts.length-active.length,expenseCount:expenses.length,missingExpenseAttachmentCount:expenses.filter((row:any)=>!row.attachment_storage_key).length,months,expensesByCategory:Array.from(categories,([category,amountAgorot])=>({category,amountAgorot})).sort((a,b)=>b.amountAgorot-a.amountAgorot)};
}

export async function createAndShareYearlyReport(businessId:string,year=new Date().getFullYear()):Promise<MobileBusinessReport>{
 if(!businessId)throw new Error("REPORT_BUSINESS_REQUIRED");
 const from=`${year}-01-01`,to=`${year}-12-31`;
 const [receiptsResult,expensesResult]=await Promise.all([
  supabase.from("receipts").select("receipt_number,payment_date,client_name,description,amount_agorot,payment_method,status").eq("business_id",businessId).gte("payment_date",from).lte("payment_date",to).order("payment_date",{ascending:true}),
  supabase.from("expenses").select("expense_date,supplier_name,category,amount_agorot,payment_method,notes").eq("business_id",businessId).gte("expense_date",from).lte("expense_date",to).order("expense_date",{ascending:true})
 ]);
 if(receiptsResult.error)throw new Error(`REPORT_RECEIPTS_FAILED:${receiptsResult.error.message}`);
 if(expensesResult.error)throw new Error(`REPORT_EXPENSES_FAILED:${expensesResult.error.message}`);
 const receipts=receiptsResult.data??[],expenses=expensesResult.data??[];
 const active=receipts.filter((row:any)=>row.status!=="cancelled");
 const incomeAgorot=active.reduce((sum:number,row:any)=>sum+Number(row.amount_agorot||0),0);
 const expensesAgorot=expenses.reduce((sum:number,row:any)=>sum+Number(row.amount_agorot||0),0);
 const rows=[
  ["סוג","תאריך","מספר","לקוח או ספק","תיאור או קטגוריה","אמצעי תשלום","סכום","סטטוס"],
  ...receipts.map((row:any)=>["קבלה",row.payment_date,row.receipt_number,row.client_name,row.description,row.payment_method,money(Number(row.amount_agorot||0)),row.status]),
  ...expenses.map((row:any)=>["הוצאה",row.expense_date,"",row.supplier_name,row.category,row.payment_method,money(Number(row.amount_agorot||0)),row.notes??""])
 ];
 const directory=FileSystem.documentDirectory;if(!directory)throw new Error("REPORT_STORAGE_UNAVAILABLE");
 const csvUri=`${directory}MK-Receipt-Pro-Report-${year}.csv`;
 await FileSystem.writeAsStringAsync(csvUri,`\ufeff${rows.map(row=>row.map(cell).join(",")).join("\n")}`,{encoding:FileSystem.EncodingType.UTF8});
 const info=await FileSystem.getInfoAsync(csvUri);if(!info.exists||!info.size)throw new Error("REPORT_WRITE_FAILED");
 if(!await Sharing.isAvailableAsync())throw new Error("REPORT_SHARING_UNAVAILABLE");
 await Sharing.shareAsync(csvUri,{mimeType:"text/csv",dialogTitle:`דוח MK Receipt Pro לשנת ${year}`,UTI:"public.comma-separated-values-text"});
 return{year,incomeAgorot,expensesAgorot,netAgorot:incomeAgorot-expensesAgorot,activeReceiptCount:active.length,cancelledReceiptCount:receipts.length-active.length,expenseCount:expenses.length,csvUri};
}
