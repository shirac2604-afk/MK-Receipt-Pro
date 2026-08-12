import crypto from "node:crypto";
import type { DatabaseConnection } from "../DatabaseConnection";
import type { ReceiptCoreStatus, ReceiptRecord, PaymentMethod, ReceiptSearchFilters, ReceiptSearchResult, CustomerRecord, CustomerProfile, CustomerCreateInput, CustomerUpdateInput, CustomerDuplicateQuery, CustomerDuplicateMatch } from "../types";
import type { ReceiptPdfModel, PdfCreationResult } from "../../../pdf/src/types";

interface ReceiptRow {
  id:string; receipt_number:number; payment_date:string; issued_at:string; client_name:string; client_phone:string|null; client_email:string|null;
  description:string; amount_agorot:number; payment_method:PaymentMethod; reference_number:string|null; status:"active"|"cancelled";
  cancelled_at:string|null; cancellation_reason:string|null; content_hash:string; original_pdf_path:string|null; original_pdf_hash:string|null;
  cancellation_pdf_path:string|null; cancellation_pdf_hash:string|null;
}
interface ReceiptPdfRow extends ReceiptRow { business_snapshot_json:string; client_snapshot_json:string; receipt_snapshot_json:string }
interface SequenceRow { next_number:number; last_issued_number:number }
interface CountRow { count:number }
interface SumRow { total:number|null }

export interface NewReceiptRecord {
  id:string; receiptNumber:number; paymentDate:string; issuedAt:string; clientName:string; clientPhone:string|null; clientEmail:string|null;
  description:string; amountAgorot:number; paymentMethod:PaymentMethod; referenceNumber:string|null; customerId:string|null;
  businessSnapshotJson:string; clientSnapshotJson:string; receiptSnapshotJson:string; contentHash:string;
}

export class ReceiptRepository {
  constructor(private readonly connection:DatabaseConnection) { this.ensureSequence(); }
  private ensureSequence():SequenceRow {
    const existing=this.connection.prepare("SELECT next_number,last_issued_number FROM receipt_sequences WHERE sequence_key='receipt'").get() as unknown as SequenceRow|undefined;
    if(existing)return existing;
    const maxRow=this.connection.prepare("SELECT COALESCE(MAX(receipt_number),1000) AS max_number FROM receipts").get() as unknown as {max_number:number}|undefined;
    const lastIssued=Math.max(1000,Number(maxRow?.max_number??1000));
    const nextNumber=lastIssued+1;
    const now=new Date().toISOString();
    this.connection.prepare("INSERT INTO receipt_sequences(sequence_key,next_number,last_issued_number,updated_at) VALUES('receipt',?,?,?)").run(nextNumber,lastIssued,now);
    return {next_number:nextNumber,last_issued_number:lastIssued};
  }
  listCustomers():CustomerRecord[]{
    const rows=this.connection.prepare("SELECT id,display_name,phone,email,notes,created_at,updated_at FROM customers WHERE is_archived=0 ORDER BY display_name COLLATE NOCASE").all() as unknown as Array<{id:string;display_name:string;phone:string|null;email:string|null;notes:string|null;created_at:string;updated_at:string}>;
    return rows.map(row=>({id:row.id,displayName:row.display_name,phone:row.phone,email:row.email,notes:row.notes,createdAt:row.created_at,updatedAt:row.updated_at}));
  }
  getCustomerProfile(customerId:string):CustomerProfile{
    const row=this.connection.prepare("SELECT id,display_name,phone,email,notes,created_at,updated_at FROM customers WHERE id=? AND is_archived=0").get(customerId) as unknown as {id:string;display_name:string;phone:string|null;email:string|null;notes:string|null;created_at:string;updated_at:string}|undefined;
    if(!row)throw new Error("CUSTOMER_NOT_FOUND");
    const customer:CustomerRecord={id:row.id,displayName:row.display_name,phone:row.phone,email:row.email,notes:row.notes,createdAt:row.created_at,updatedAt:row.updated_at};
    const receiptRows=this.connection.prepare(this.selectSql()+" WHERE customer_id=? ORDER BY receipt_number DESC").all(customerId) as unknown as ReceiptRow[];
    const receipts=receiptRows.map(item=>this.map(item));
    const active=receipts.filter(item=>item.status==='active');
    return {customer,receipts,activeReceiptCount:active.length,cancelledReceiptCount:receipts.length-active.length,activeAmountAgorot:active.reduce((sum,item)=>sum+item.amountAgorot,0),lastReceiptDate:receipts[0]?.paymentDate??null};
  }
  private normalizePhone(value:string|null|undefined):string { return (value??"").replace(/\D/g,""); }
  private normalizeEmail(value:string|null|undefined):string { return (value??"").trim().toLowerCase(); }

  findCustomerDuplicates(query:CustomerDuplicateQuery):CustomerDuplicateMatch[]{
    const phone=this.normalizePhone(query.phone), email=this.normalizeEmail(query.email);
    if(!phone&&!email)return [];
    const rows=this.connection.prepare("SELECT id,display_name,phone,email,notes,created_at,updated_at FROM customers WHERE is_archived=0 AND (? IS NULL OR id<>?) ORDER BY display_name COLLATE NOCASE")
      .all(query.excludeId??null,query.excludeId??null) as unknown as Array<{id:string;display_name:string;phone:string|null;email:string|null;notes:string|null;created_at:string;updated_at:string}>;
    const matches:CustomerDuplicateMatch[]=[];
    for(const row of rows){
      const matchedBy:Array<"phone"|"email">=[];
      if(phone&&this.normalizePhone(row.phone)===phone)matchedBy.push("phone");
      if(email&&this.normalizeEmail(row.email)===email)matchedBy.push("email");
      if(matchedBy.length)matches.push({customer:{id:row.id,displayName:row.display_name,phone:row.phone,email:row.email,notes:row.notes,createdAt:row.created_at,updatedAt:row.updated_at},matchedBy});
    }
    return matches;
  }

  createCustomer(input:CustomerCreateInput):CustomerRecord{
    const displayName=input.displayName.trim(),phone=input.phone?.trim()||null,email=input.email?.trim().toLowerCase()||null,notes=input.notes?.trim()||null;
    if(displayName.length<2||displayName.length>160)throw new Error("INVALID_CUSTOMER");
    if(phone && !/^[0-9+()\- ]{6,20}$/.test(phone))throw new Error("INVALID_CUSTOMER_PHONE");
    if(email && (email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))throw new Error("INVALID_CUSTOMER_EMAIL");
    if(notes && notes.length>2000)throw new Error("INVALID_CUSTOMER_NOTES");
    const id=crypto.randomUUID(),now=new Date().toISOString();
    this.connection.prepare("INSERT INTO customers(id,display_name,phone,email,notes,is_archived,created_at,updated_at) VALUES(?,?,?,?,?,0,?,?)").run(id,displayName,phone,email,notes,now,now);
    return {id,displayName,phone,email,notes,createdAt:now,updatedAt:now};
  }

  updateCustomer(input:CustomerUpdateInput):CustomerRecord{
    const displayName=input.displayName.trim(),phone=input.phone?.trim()||null,email=input.email?.trim()||null,notes=input.notes?.trim()||null;
    if(!input.id.trim()||displayName.length<2)throw new Error("INVALID_CUSTOMER");
    const existing=this.connection.prepare("SELECT id FROM customers WHERE id=? AND is_archived=0").get(input.id) as unknown as {id:string}|undefined;
    if(!existing)throw new Error("CUSTOMER_NOT_FOUND");
    const now=new Date().toISOString();
    this.connection.prepare("UPDATE customers SET display_name=?,phone=?,email=?,notes=?,updated_at=? WHERE id=?").run(displayName,phone,email,notes,now,input.id);
    const row=this.connection.prepare("SELECT id,display_name,phone,email,notes,created_at,updated_at FROM customers WHERE id=?").get(input.id) as unknown as {id:string;display_name:string;phone:string|null;email:string|null;notes:string|null;created_at:string;updated_at:string};
    return {id:row.id,displayName:row.display_name,phone:row.phone,email:row.email,notes:row.notes,createdAt:row.created_at,updatedAt:row.updated_at};
  }

  saveOrUpdateCustomer(input:{customerId?:string;name:string;phone:string|null;email:string|null}):string{
    const now=new Date().toISOString();
    if(input.customerId){const existing=this.connection.prepare("SELECT id FROM customers WHERE id=? AND is_archived=0").get(input.customerId) as unknown as {id:string}|undefined;if(existing){this.connection.prepare("UPDATE customers SET display_name=?,phone=?,email=?,updated_at=? WHERE id=?").run(input.name,input.phone,input.email,now,input.customerId);return input.customerId;}}
    // A new customer is created only after the renderer has had a chance to show duplicate matches.
    // No silent merge is performed here: the user explicitly chooses an existing customer by customerId.
    const id=input.customerId?.trim()||crypto.randomUUID();this.connection.prepare("INSERT INTO customers(id,display_name,phone,email,notes,is_archived,created_at,updated_at) VALUES(?,?,?,?,NULL,0,?,?)").run(id,input.name,input.phone,input.email,now,now);return id;
  }
  allocateNextNumber():number {
    const row=this.ensureSequence();
    if(row.next_number<=row.last_issued_number) throw new Error("RECEIPT_SEQUENCE_INVALID");
    this.connection.prepare("UPDATE receipt_sequences SET last_issued_number=?,next_number=?,updated_at=? WHERE sequence_key='receipt'").run(row.next_number,row.next_number+1,new Date().toISOString());
    return row.next_number;
  }
  adoptCloudReceiptNumber(receiptNumber:number):number {
    if(!Number.isSafeInteger(receiptNumber)||receiptNumber<=0)throw new Error("INVALID_CLOUD_RECEIPT_NUMBER");
    const duplicate=this.connection.prepare("SELECT id FROM receipts WHERE receipt_number=?").get(receiptNumber) as unknown as {id:string}|undefined;
    if(duplicate)throw new Error("CLOUD_RECEIPT_NUMBER_ALREADY_EXISTS_LOCALLY");
    const row=this.ensureSequence();
    const next=Math.max(row.next_number,receiptNumber+1);
    const last=Math.max(row.last_issued_number,receiptNumber);
    this.connection.prepare("UPDATE receipt_sequences SET last_issued_number=?,next_number=?,updated_at=? WHERE sequence_key='receipt'").run(last,next,new Date().toISOString());
    return receiptNumber;
  }
  insert(record:NewReceiptRecord):void {
    this.connection.prepare(`INSERT INTO receipts(id,receipt_number,payment_date,issued_at,client_name,client_phone,client_email,description,amount_agorot,payment_method,reference_number,status,customer_id,business_snapshot_json,client_snapshot_json,receipt_snapshot_json,content_hash,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,'active',?,?,?,?,?,?,?)`).run(record.id,record.receiptNumber,record.paymentDate,record.issuedAt,record.clientName,record.clientPhone,record.clientEmail,record.description,record.amountAgorot,record.paymentMethod,record.referenceNumber,record.customerId,record.businessSnapshotJson,record.clientSnapshotJson,record.receiptSnapshotJson,record.contentHash,record.issuedAt,record.issuedAt);
  }
  attachOriginalPdf(receiptId:string,pdf:PdfCreationResult):void { this.connection.prepare("UPDATE receipts SET original_pdf_path=?,original_pdf_hash=?,original_pdf_size=?,pdf_template_version=?,pdf_created_at=?,updated_at=? WHERE id=?").run(pdf.path,pdf.fileHash,pdf.fileSize,pdf.templateVersion,pdf.createdAt,pdf.createdAt,receiptId); }
  attachCancellationPdf(receiptId:string,pdf:PdfCreationResult):void { this.connection.prepare("UPDATE receipts SET cancellation_pdf_path=?,cancellation_pdf_hash=?,cancellation_pdf_size=?,cancellation_pdf_created_at=?,updated_at=? WHERE id=? AND cancellation_pdf_path IS NULL").run(pdf.path,pdf.fileHash,pdf.fileSize,pdf.createdAt,pdf.createdAt,receiptId); }
  getPdfModel(receiptId:string):ReceiptPdfModel {
    const row=this.connection.prepare(`SELECT id,receipt_number,payment_date,issued_at,client_name,client_phone,client_email,description,amount_agorot,payment_method,reference_number,status,cancelled_at,cancellation_reason,content_hash,original_pdf_path,original_pdf_hash,cancellation_pdf_path,cancellation_pdf_hash,business_snapshot_json,client_snapshot_json,receipt_snapshot_json FROM receipts WHERE id=?`).get(receiptId) as unknown as ReceiptPdfRow|undefined;
    if(!row) throw new Error("RECEIPT_NOT_FOUND");
    return { receiptId:row.id,receiptNumber:row.receipt_number,issuedAt:row.issued_at,paymentDate:row.payment_date,business:JSON.parse(row.business_snapshot_json),client:JSON.parse(row.client_snapshot_json),receipt:JSON.parse(row.receipt_snapshot_json),...(row.status==='cancelled'?{cancellation:{cancelledAt:row.cancelled_at??new Date().toISOString(),reason:row.cancellation_reason??''}}:{}) };
  }
  getPdfPath(receiptId:string,kind:"original"|"cancellation"="original"):string|null {
    const column=kind==='cancellation'?'cancellation_pdf_path':'original_pdf_path';
    const row=this.connection.prepare(`SELECT ${column} AS path FROM receipts WHERE id=?`).get(receiptId) as unknown as {path:string|null}|undefined;
    if(!row) throw new Error("RECEIPT_NOT_FOUND"); return row.path;
  }
  findById(receiptId:string):ReceiptRecord|null { const row=this.connection.prepare(this.selectSql()+" WHERE id=?").get(receiptId) as unknown as ReceiptRow|undefined; return row?this.map(row):null; }
  cancel(receiptId:string,reason:string):ReceiptRecord {
    const current=this.findById(receiptId); if(!current) throw new Error("RECEIPT_NOT_FOUND"); if(current.status==='cancelled') throw new Error("RECEIPT_ALREADY_CANCELLED");
    const now=new Date().toISOString(); this.connection.prepare("UPDATE receipts SET status='cancelled',cancelled_at=?,cancellation_reason=?,updated_at=? WHERE id=? AND status='active'").run(now,reason,now,receiptId);
    const result=this.findById(receiptId); if(!result) throw new Error("RECEIPT_NOT_FOUND"); return result;
  }
  search(filters:ReceiptSearchFilters):ReceiptSearchResult {
    const clauses:string[]=[]; const params:(string|number)[]=[];
    if(filters.status && filters.status!=='all'){clauses.push('status=?');params.push(filters.status)}
    if(filters.fromDate){clauses.push('payment_date>=?');params.push(filters.fromDate)}
    if(filters.toDate){clauses.push('payment_date<=?');params.push(filters.toDate)}
    if(filters.paymentMethod && filters.paymentMethod!=='all'){clauses.push('payment_method=?');params.push(filters.paymentMethod)}
    if(typeof filters.minAmountAgorot==='number'){clauses.push('amount_agorot>=?');params.push(filters.minAmountAgorot)}
    if(typeof filters.maxAmountAgorot==='number'){clauses.push('amount_agorot<=?');params.push(filters.maxAmountAgorot)}
    const aliases:Record<string,string>={"ינואר":"01","פברואר":"02","מרץ":"03","אפריל":"04","מאי":"05","יוני":"06","יולי":"07","אוגוסט":"08","ספטמבר":"09","אוקטובר":"10","נובמבר":"11","דצמבר":"12","מזומן":"cash","העברה":"bank_transfer","ביט":"bit","פייבוקס":"paybox","פעילה":"active","מבוטלת":"cancelled"};
    const tokens=(filters.query??'').trim().toLowerCase().split(/\s+/).filter(Boolean).map(token=>aliases[token]??token);
    for(const token of tokens){const like=`%${token}%`;clauses.push(`(LOWER(client_name) LIKE ? OR LOWER(COALESCE(client_phone,'')) LIKE ? OR LOWER(COALESCE(client_email,'')) LIKE ? OR LOWER(description) LIKE ? OR CAST(receipt_number AS TEXT) LIKE ? OR CAST(amount_agorot/100.0 AS TEXT) LIKE ? OR LOWER(payment_method) LIKE ? OR LOWER(COALESCE(reference_number,'')) LIKE ? OR payment_date LIKE ? OR LOWER(status) LIKE ?)`); for(let i=0;i<10;i++)params.push(like)}
    const where=clauses.length?` WHERE ${clauses.join(' AND ')}`:'';
    const orderBy=filters.sort==='oldest'?'payment_date ASC, receipt_number ASC':filters.sort==='amount_desc'?'amount_agorot DESC, receipt_number DESC':filters.sort==='amount_asc'?'amount_agorot ASC, receipt_number DESC':filters.sort==='number_asc'?'receipt_number ASC':filters.sort==='number_desc'?'receipt_number DESC':'payment_date DESC, receipt_number DESC';
    const rows=this.connection.prepare(this.selectSql()+where+` ORDER BY ${orderBy} LIMIT 1000`).all(...params) as unknown as ReceiptRow[];
    const items=rows.map(r=>this.map(r)); return {items,totalItems:items.length,activeAmountAgorot:items.filter(i=>i.status==='active').reduce((s,i)=>s+i.amountAgorot,0)};
  }
  latest():ReceiptRecord|null { const row=this.connection.prepare(this.selectSql()+" ORDER BY receipt_number DESC LIMIT 1").get() as unknown as ReceiptRow|undefined; return row?this.map(row):null; }
  status():ReceiptCoreStatus { const count=this.connection.prepare("SELECT COUNT(*) AS count FROM receipts").get() as unknown as CountRow; const sequence=this.ensureSequence(); return {receiptCount:count.count,nextReceiptNumber:sequence.next_number,lastIssuedNumber:sequence.last_issued_number,latestReceipt:this.latest()}; }
  private selectSql():string { return `SELECT id,receipt_number,payment_date,issued_at,client_name,client_phone,client_email,description,amount_agorot,payment_method,reference_number,status,cancelled_at,cancellation_reason,content_hash,original_pdf_path,original_pdf_hash,cancellation_pdf_path,cancellation_pdf_hash FROM receipts`; }
  private map(row:ReceiptRow):ReceiptRecord { return {id:row.id,receiptNumber:row.receipt_number,paymentDate:row.payment_date,issuedAt:row.issued_at,clientName:row.client_name,clientPhone:row.client_phone,clientEmail:row.client_email,description:row.description,amountAgorot:row.amount_agorot,paymentMethod:row.payment_method,referenceNumber:row.reference_number,status:row.status,cancelledAt:row.cancelled_at,cancellationReason:row.cancellation_reason,contentHash:row.content_hash,originalPdfPath:row.original_pdf_path,originalPdfHash:row.original_pdf_hash,cancellationPdfPath:row.cancellation_pdf_path,cancellationPdfHash:row.cancellation_pdf_hash}; }
}
