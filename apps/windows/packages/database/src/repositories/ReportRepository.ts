import type { DatabaseConnection } from "../DatabaseConnection";
import type { AnnualReport, DateRangeReport, MonthlyReportRow, ReportFilters, ReportReceiptRow, ReportExpenseRow, PaymentMethod } from "../types";

interface SummaryRow { income_agorot:number|null; active_count:number; cancelled_count:number; }
interface MonthlySqlRow { month:string; income_agorot:number|null; active_count:number; cancelled_count:number; }
interface ReceiptExportSqlRow { receipt_number:number; payment_date:string; client_name:string; description:string; amount_agorot:number; payment_method:PaymentMethod; reference_number:string|null; status:"active"|"cancelled"; original_pdf_path:string|null; cancellation_pdf_path:string|null; }
interface ExpenseExportSqlRow { id:string; expense_date:string; supplier_name:string; category:string; amount_agorot:number; payment_method:string|null; notes:string|null; attachment_path:string|null; attachment_original_name:string|null; }

export class ReportRepository {
  constructor(private readonly connection:DatabaseConnection) {}

  getRangeReport(filters:ReportFilters):DateRangeReport {
    const clauses:string[]=[]; const params:string[]=[];
    if(filters.fromDate){clauses.push("payment_date>=?");params.push(filters.fromDate)}
    if(filters.toDate){clauses.push("payment_date<=?");params.push(filters.toDate)}
    const where=clauses.length?` WHERE ${clauses.join(" AND ")}`:"";
    const summary=this.connection.prepare(`SELECT COALESCE(SUM(CASE WHEN status='active' THEN amount_agorot ELSE 0 END),0) AS income_agorot, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active_count, SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) AS cancelled_count FROM receipts${where}`).get(...params) as unknown as SummaryRow;
    const months=this.connection.prepare(`SELECT substr(payment_date,1,7) AS month, COALESCE(SUM(CASE WHEN status='active' THEN amount_agorot ELSE 0 END),0) AS income_agorot, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active_count, SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) AS cancelled_count FROM receipts${where} GROUP BY substr(payment_date,1,7) ORDER BY month`).all(...params) as unknown as MonthlySqlRow[];
    const activeCount=Number(summary.active_count??0); const income=Number(summary.income_agorot??0);
    return { fromDate:filters.fromDate??null,toDate:filters.toDate??null,incomeAgorot:income,activeReceiptCount:activeCount,cancelledReceiptCount:Number(summary.cancelled_count??0),averageReceiptAgorot:activeCount?Math.round(income/activeCount):0,months:months.map(this.mapMonth) };
  }

  getAnnualReport(year:number):AnnualReport {
    const fromDate=`${year}-01-01`,toDate=`${year}-12-31`; const range=this.getRangeReport({fromDate,toDate});
    const byMonth=new Map(range.months.map(row=>[row.month,row]));
    const months:MonthlyReportRow[]=[];
    for(let month=1;month<=12;month++){const key=`${year}-${String(month).padStart(2,"0")}`;months.push(byMonth.get(key)??{month:key,incomeAgorot:0,activeReceiptCount:0,cancelledReceiptCount:0});}
    return {...range,year,months};
  }

  getReceiptsForExport(filters:ReportFilters):ReportReceiptRow[] {
    const clauses:string[]=[]; const params:string[]=[];
    if(filters.fromDate){clauses.push("payment_date>=?");params.push(filters.fromDate)}
    if(filters.toDate){clauses.push("payment_date<=?");params.push(filters.toDate)}
    const where=clauses.length?` WHERE ${clauses.join(" AND ")}`:"";
    const rows=this.connection.prepare(`SELECT receipt_number,payment_date,client_name,description,amount_agorot,payment_method,reference_number,status,original_pdf_path,cancellation_pdf_path FROM receipts${where} ORDER BY receipt_number`).all(...params) as unknown as ReceiptExportSqlRow[];
    return rows.map(row=>({receiptNumber:row.receipt_number,paymentDate:row.payment_date,clientName:row.client_name,description:row.description,amountAgorot:row.amount_agorot,paymentMethod:row.payment_method,referenceNumber:row.reference_number,status:row.status,originalPdfPath:row.original_pdf_path,cancellationPdfPath:row.cancellation_pdf_path}));
  }
  getExpensesForExport(filters:ReportFilters):ReportExpenseRow[] {
    const clauses:string[]=[]; const params:string[]=[];
    if(filters.fromDate){clauses.push("expense_date>=?");params.push(filters.fromDate)}
    if(filters.toDate){clauses.push("expense_date<=?");params.push(filters.toDate)}
    const where=clauses.length?` WHERE ${clauses.join(" AND ")}`:"";
    const rows=this.connection.prepare(`SELECT id,expense_date,supplier_name,category,amount_agorot,payment_method,notes,attachment_path,attachment_original_name FROM expenses${where} ORDER BY expense_date,id`).all(...params) as unknown as ExpenseExportSqlRow[];
    return rows.map(row=>({id:row.id,expenseDate:row.expense_date,supplierName:row.supplier_name,category:row.category,amountAgorot:row.amount_agorot,paymentMethod:row.payment_method,notes:row.notes,attachmentPath:row.attachment_path,attachmentOriginalName:row.attachment_original_name}));
  }
  private mapMonth(row:MonthlySqlRow):MonthlyReportRow { return {month:row.month,incomeAgorot:Number(row.income_agorot??0),activeReceiptCount:Number(row.active_count??0),cancelledReceiptCount:Number(row.cancelled_count??0)}; }
}
