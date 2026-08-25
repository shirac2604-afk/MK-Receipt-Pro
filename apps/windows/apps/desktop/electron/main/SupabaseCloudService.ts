import { safeStorage } from "electron";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, validateSupabaseConfig } from "./SupabaseCloudConfig";
import {MAX_PASSWORD_LENGTH,validateNewPassword} from "./passwordPolicy";
import type { PaymentMethod, ReceiptRecord, ReceiptSearchFilters, ReceiptSearchResult, CustomerRecord, CustomerProfile, CustomerCreateInput, CustomerUpdateInput, CustomerDuplicateQuery, CustomerDuplicateMatch, ReceiptCoreStatus, DateRangeReport, AnnualReport, MonthlyReportRow, ExpenseInput, ExpenseUpdateInput, ExpenseSearchFilters, ExpenseRecord, ExpenseSummary, BusinessSettingsInput, BusinessSettingsRecord, CancelReceiptResult, SupabaseCloudDevice } from "../../../../packages/database/src/types";
import type { LessonRecord } from "../../../../packages/database/src/studentTypes";

const MAX_CLOUD_EXPENSE_ATTACHMENT_BYTES=10*1024*1024;
type VerifiedExpenseAttachmentExtension=".pdf"|".png"|".jpg"|".webp";

function verifyCloudExpenseAttachment(bytes:Buffer):VerifiedExpenseAttachmentExtension{
  if(bytes.length<=0||bytes.length>MAX_CLOUD_EXPENSE_ATTACHMENT_BYTES)throw new Error("CLOUD_EXPENSE_ATTACHMENT_INVALID");
  if(bytes.length>=5&&bytes.subarray(0,5).toString("ascii")==="%PDF-")return ".pdf";
  if(bytes.length>=8&&bytes.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])))return ".png";
  if(bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return ".jpg";
  if(bytes.length>=12&&bytes.subarray(0,4).toString("ascii")==="RIFF"&&bytes.subarray(8,12).toString("ascii")==="WEBP")return ".webp";
  throw new Error("CLOUD_EXPENSE_ATTACHMENT_INVALID");
}

export interface SupabaseCloudStatus {
  connected:boolean;
  email:string|null;
  userId:string|null;
  businessId:string|null;
  businessName:string|null;
  deviceId:string|null;
  receipts:number;
  customers:number;
  expenses:number;
  message:string|null;
}


export interface CloudReceiptIssueInput {
  customerId?:string; clientName:string; clientPhone?:string; clientEmail?:string; description:string; amountAgorot:number; paymentDate:string; paymentMethod:string; referenceNumber?:string;
}
export interface CloudReceiptIssueResult { id:string; receiptNumber:number; issuedAt:string|null; status:string; reservationId:string; }

class EncryptedSessionStorage {
  private readonly filePath:string;
  constructor(userDataPath:string){
    this.filePath=path.join(userDataPath,"cloud","supabase-session.bin");
  }
  async getItem(_key:string):Promise<string|null>{
    try{
      if(!safeStorage.isEncryptionAvailable())return null;
      const encrypted=fs.readFileSync(this.filePath);
      return safeStorage.decryptString(encrypted);
    }catch{return null;}
  }
  async setItem(_key:string,value:string):Promise<void>{
    if(!safeStorage.isEncryptionAvailable())throw new Error("SECURE_STORAGE_UNAVAILABLE");
    fs.mkdirSync(path.dirname(this.filePath),{recursive:true});
    fs.writeFileSync(this.filePath,safeStorage.encryptString(value));
  }
  async removeItem(_key:string):Promise<void>{
    try{fs.rmSync(this.filePath,{force:true});}catch{}
  }
}

export class SupabaseCloudService {
  private readonly client:SupabaseClient;
  private readonly userDataPath:string;
  private status:SupabaseCloudStatus={connected:false,email:null,userId:null,businessId:null,businessName:null,deviceId:null,receipts:0,customers:0,expenses:0,message:"לא מחובר לענן המשותף"};
  private activeDeviceValidatedAt=0;
  private activeDeviceCheck:Promise<void>|null=null;

  constructor(userDataPath:string){
    validateSupabaseConfig();
    this.userDataPath=userDataPath;
    this.client=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
      auth:{
        storage:new EncryptedSessionStorage(userDataPath),
        autoRefreshToken:true,
        persistSession:true,
        detectSessionInUrl:false
      }
    });
  }

  async initialize():Promise<void>{
    const {data,error}=await this.client.auth.getSession();
    if(error){this.status={...this.status,message:error.message};return;}
    if(data.session)await this.refresh(false);
  }

  getStatus():SupabaseCloudStatus{return {...this.status};}

  async signIn(email:string,password:string):Promise<SupabaseCloudStatus>{
    if(!email.trim()||!password)throw new Error("CLOUD_CREDENTIALS_REQUIRED");
    const {data,error}=await this.client.auth.signInWithPassword({email:email.trim().toLowerCase(),password});
    if(error)throw new Error(`CLOUD_AUTH_FAILED:${error.message}`);
    if(!data.user)throw new Error("CLOUD_AUTH_EMPTY_USER");
    return this.refresh(true);
  }

  async signOut():Promise<SupabaseCloudStatus>{
    const {error}=await this.client.auth.signOut({scope:"local"});
    if(error)throw new Error(`CLOUD_SIGNOUT_FAILED:${error.message}`);
    this.activeDeviceValidatedAt=0;
    this.status={connected:false,email:null,userId:null,businessId:null,businessName:null,deviceId:null,receipts:0,customers:0,expenses:0,message:"החשבון נותק מהמחשב הזה"};
    return this.getStatus();
  }

  async changePassword(currentPassword:string,newPassword:string):Promise<void>{
    if(!currentPassword)throw new Error("AUTH_CURRENT_PASSWORD_REQUIRED");
    if(currentPassword.length>MAX_PASSWORD_LENGTH)throw new Error("AUTH_CURRENT_PASSWORD_INVALID");
    if(currentPassword===newPassword)throw new Error("AUTH_PASSWORD_UNCHANGED");
    await this.assertCurrentDeviceActive(0);
    if(!this.status.connected||!this.status.userId)throw new Error("AUTH_SESSION_REQUIRED");
    const {data:current,error:currentError}=await this.client.auth.getUser();
    if(currentError||!current.user?.email||current.user.id!==this.status.userId)throw new Error("AUTH_SESSION_REQUIRED");
    const passwordError=validateNewPassword(current.user.email,newPassword);
    if(passwordError)throw new Error(passwordError);
    const {data:verified,error:verifyError}=await this.client.auth.signInWithPassword({
      email:current.user.email.trim().toLowerCase(),
      password:currentPassword
    });
    if(verifyError||!verified.user)throw new Error("AUTH_CURRENT_PASSWORD_INVALID");
    if(verified.user.id!==current.user.id){
      await this.signOut().catch(()=>{});
      throw new Error("AUTH_IDENTITY_CHANGED");
    }
    const {error:updateError}=await this.client.auth.updateUser({password:newPassword});
    if(updateError)throw new Error("AUTH_PASSWORD_CHANGE_FAILED");
  }

  async refresh(allowDeviceReenroll=false):Promise<SupabaseCloudStatus>{
    const {data:userData,error:userError}=await this.client.auth.getUser();
    if(userError||!userData.user){
      this.status={connected:false,email:null,userId:null,businessId:null,businessName:null,deviceId:null,receipts:0,customers:0,expenses:0,message:userError?.message??"אין Session פעיל"};
      return this.getStatus();
    }

    const {data:membership,error:membershipError}=await this.client.from("business_members")
      .select("business_id,role").limit(1).maybeSingle();
    if(membershipError)throw new Error(`CLOUD_BUSINESS_LOOKUP_FAILED:${membershipError.message}`);
    if(!membership?.business_id)throw new Error("CLOUD_NO_BUSINESS_MEMBERSHIP");
    const businessId=String(membership.business_id);

    const {data:business,error:businessError}=await this.client.from("businesses")
      .select("id,business_name").eq("id",businessId).single();
    if(businessError)throw new Error(`CLOUD_BUSINESS_PROFILE_FAILED:${businessError.message}`);

    let deviceId:string;
    try{
      deviceId=await this.ensureWindowsDevice(businessId,allowDeviceReenroll);
    }catch(error){
      if(error instanceof Error&&error.message.includes("CLOUD_DEVICE_REVOKED")){
        await this.client.auth.signOut({scope:"local"}).catch(()=>{});
        this.status={connected:false,email:null,userId:null,businessId:null,businessName:null,deviceId:null,receipts:0,customers:0,expenses:0,message:"המחשב נותק מהעסק. כדי לחבר אותו מחדש נדרשת התחברות עם סיסמה."};
        return this.getStatus();
      }
      throw error;
    }
    const [receipts,customers,expenses]=await Promise.all([
      this.count("receipts",businessId),this.count("customers",businessId),this.count("expenses",businessId)
    ]);

    this.status={
      connected:true,
      email:userData.user.email??null,
      userId:userData.user.id,
      businessId,
      businessName:String(business.business_name??""),
      deviceId,
      receipts,customers,expenses,
      message:"Windows מחובר לאותו עסק בענן של Android"
    };
    this.activeDeviceValidatedAt=Date.now();
    return this.getStatus();
  }

  getClient():SupabaseClient{return this.client;}

  async assertCurrentDeviceActive(maxAgeMs=10000):Promise<void>{
    const current=this.status;
    if(!current.connected||!current.businessId||!current.deviceId)return;
    if(maxAgeMs>0&&Date.now()-this.activeDeviceValidatedAt<maxAgeMs)return;
    if(this.activeDeviceCheck)return this.activeDeviceCheck;
    const check=this.verifyCurrentDeviceActive(current.businessId,current.deviceId);
    this.activeDeviceCheck=check;
    try{await check;}finally{if(this.activeDeviceCheck===check)this.activeDeviceCheck=null;}
  }

  private async verifyCurrentDeviceActive(businessId:string,deviceId:string):Promise<void>{
    const {data,error}=await this.client.from("devices").select("id").eq("business_id",businessId).eq("id",deviceId).is("revoked_at",null).maybeSingle();
    if(error)throw new Error(`CLOUD_DEVICE_STATUS_CHECK_FAILED:${error.message}`);
    if(data?.id){this.activeDeviceValidatedAt=Date.now();return;}
    await this.client.auth.signOut({scope:"local"}).catch(()=>{});
    this.activeDeviceValidatedAt=0;
    this.status={connected:false,email:null,userId:null,businessId:null,businessName:null,deviceId:null,receipts:0,customers:0,expenses:0,message:"המחשב נותק מהעסק. כדי לחבר אותו מחדש נדרשת התחברות עם סיסמה."};
    throw new Error("CLOUD_DEVICE_REVOKED");
  }

  private requireBusinessId(message="CLOUD_CONNECTION_REQUIRED"):string{
    if(!this.status.connected||!this.status.businessId)throw new Error(message);
    return this.status.businessId;
  }

  private mapCustomer(row:any):CustomerRecord{
    return {id:String(row.id),displayName:String(row.display_name??""),phone:row.phone?String(row.phone):null,email:row.email?String(row.email):null,notes:row.notes?String(row.notes):null,createdAt:String(row.created_at??""),updatedAt:String(row.updated_at??"")};
  }

  async listCustomers():Promise<CustomerRecord[]>{
    await this.assertCurrentDeviceActive();
    const businessId=this.requireBusinessId("CLOUD_CONNECTION_REQUIRED_FOR_CUSTOMERS");
    const {data,error}=await this.client.from("customers").select("id,display_name,phone,email,notes,created_at,updated_at").eq("business_id",businessId).eq("is_archived",false).order("display_name",{ascending:true});
    if(error)throw new Error(`CLOUD_CUSTOMERS_LIST_FAILED:${error.message}`);
    return (data??[]).map(row=>this.mapCustomer(row));
  }

  async listLessonsForGoogleCalendar(fromIso:string,toIso:string):Promise<LessonRecord[]>{
    await this.assertCurrentDeviceActive();
    const businessId=this.requireBusinessId("CLOUD_CONNECTION_REQUIRED_FOR_LESSONS");
    const from=new Date(fromIso),to=new Date(toIso);
    if(Number.isNaN(from.getTime())||Number.isNaN(to.getTime())||to<=from)throw new Error("INVALID_LESSON_RANGE");
    const {data,error}=await this.client.from("lessons").select("id,business_id,series_id,kind,student_id,group_id,title,starts_at,ends_at,status,lesson_summary,homework").eq("business_id",businessId).gte("starts_at",from.toISOString()).lt("starts_at",to.toISOString()).order("starts_at",{ascending:true});
    if(error)throw new Error(`CLOUD_GOOGLE_CALENDAR_LESSONS_FAILED:${error.message}`);
    return (data??[]).map((row:any):LessonRecord=>({
      id:String(row.id),businessId:String(row.business_id),seriesId:row.series_id?String(row.series_id):null,
      kind:row.kind==="group"?"group":"individual",studentId:row.student_id?String(row.student_id):null,groupId:row.group_id?String(row.group_id):null,
      title:String(row.title??""),startsAt:String(row.starts_at),endsAt:String(row.ends_at),
      status:row.status==="cancelled"?"cancelled":row.status==="completed"?"completed":"scheduled",
      lessonSummary:row.lesson_summary?String(row.lesson_summary):null,homework:row.homework?String(row.homework):null
    }));
  }

  async getCustomerProfile(customerId:string):Promise<CustomerProfile>{
    await this.assertCurrentDeviceActive();
    const businessId=this.requireBusinessId("CLOUD_CONNECTION_REQUIRED_FOR_CUSTOMERS");
    const {data:row,error}=await this.client.from("customers").select("id,display_name,phone,email,notes,created_at,updated_at").eq("business_id",businessId).eq("id",customerId).eq("is_archived",false).single();
    if(error||!row)throw new Error(`CLOUD_CUSTOMER_LOOKUP_FAILED:${error?.message??"NOT_FOUND"}`);
    const customer=this.mapCustomer(row);
    const select="id,receipt_number,payment_date,issued_at,client_name,client_phone,client_email,description,amount_agorot,payment_method,reference_number,status,cancellation_reason,cancelled_at,content_hash,pdf_storage_key,cancellation_pdf_storage_key";
    const [byId,byName]=await Promise.all([
      this.client.from("receipts").select(select).eq("business_id",businessId).eq("customer_id",customerId),
      this.client.from("receipts").select(select).eq("business_id",businessId).eq("client_name",customer.displayName)
    ]);
    if(byId.error)throw new Error(`CLOUD_CUSTOMER_RECEIPTS_FAILED:${byId.error.message}`);
    if(byName.error)throw new Error(`CLOUD_CUSTOMER_RECEIPTS_FAILED:${byName.error.message}`);
    const merged=new Map<string,ReceiptRecord>();
    for(const item of [...(byId.data??[]),...(byName.data??[])]){const receipt=this.mapReceipt(item);merged.set(receipt.id,receipt);}
    const receipts=[...merged.values()].sort((a,b)=>b.receiptNumber-a.receiptNumber);
    const active=receipts.filter(item=>item.status==="active");
    return {customer,receipts,activeReceiptCount:active.length,cancelledReceiptCount:receipts.length-active.length,activeAmountAgorot:active.reduce((sum,item)=>sum+item.amountAgorot,0),lastReceiptDate:receipts[0]?.paymentDate??null};
  }

  private normalizePhone(value:string|null|undefined):string{return (value??"").replace(/\D/g,"");}
  private normalizeEmail(value:string|null|undefined):string{return (value??"").trim().toLowerCase();}

  async findCustomerDuplicates(query:CustomerDuplicateQuery):Promise<CustomerDuplicateMatch[]>{
    const phone=this.normalizePhone(query.phone),email=this.normalizeEmail(query.email);
    if(!phone&&!email)return [];
    const customers=await this.listCustomers();
    const matches:CustomerDuplicateMatch[]=[];
    for(const customer of customers){
      if(query.excludeId&&customer.id===query.excludeId)continue;
      const matchedBy:Array<"phone"|"email">=[];
      if(phone&&this.normalizePhone(customer.phone)===phone)matchedBy.push("phone");
      if(email&&this.normalizeEmail(customer.email)===email)matchedBy.push("email");
      if(matchedBy.length)matches.push({customer,matchedBy});
    }
    return matches;
  }

  async createCustomer(input:CustomerCreateInput):Promise<CustomerRecord>{
    await this.assertCurrentDeviceActive();
    const businessId=this.requireBusinessId("CLOUD_CONNECTION_REQUIRED_FOR_CUSTOMERS");
    const displayName=input.displayName.trim();
    if(displayName.length<2||displayName.length>160)throw new Error("INVALID_CUSTOMER");
    const phone=input.phone?.trim()||"",email=input.email?.trim().toLowerCase()||"",notes=input.notes?.trim()||"";
    if(phone && !/^[0-9+()\- ]{6,20}$/.test(phone))throw new Error("INVALID_CUSTOMER_PHONE");
    if(email && (email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))throw new Error("INVALID_CUSTOMER_EMAIL");
    if(notes.length>2000)throw new Error("INVALID_CUSTOMER_NOTES");
    const {data,error}=await this.client.from("customers").insert({business_id:businessId,display_name:displayName,phone:phone||null,email:email||null,notes:notes||null,is_archived:false}).select("id,display_name,phone,email,notes,created_at,updated_at").single();
    if(error||!data)throw new Error(`CLOUD_CUSTOMER_CREATE_FAILED:${error?.message??"EMPTY"}`);
    return this.mapCustomer(data);
  }

  async updateCustomer(input:CustomerUpdateInput):Promise<CustomerRecord>{
    await this.assertCurrentDeviceActive();
    const businessId=this.requireBusinessId("CLOUD_CONNECTION_REQUIRED_FOR_CUSTOMERS");
    const displayName=input.displayName.trim();
    if(!input.id.trim()||displayName.length<2)throw new Error("INVALID_CUSTOMER");
    const {data,error}=await this.client.from("customers").update({display_name:displayName,phone:input.phone?.trim()||null,email:input.email?.trim().toLowerCase()||null,notes:input.notes?.trim()||null,updated_at:new Date().toISOString()}).eq("business_id",businessId).eq("id",input.id).select("id,display_name,phone,email,notes,created_at,updated_at").single();
    if(error||!data)throw new Error(`CLOUD_CUSTOMER_UPDATE_FAILED:${error?.message??"EMPTY"}`);
    return this.mapCustomer(data);
  }

  private async ensureCustomerForReceipt(input:CloudReceiptIssueInput):Promise<string>{
    const businessId=this.requireBusinessId("CLOUD_CONNECTION_REQUIRED_FOR_CUSTOMERS");
    if(input.customerId){
      const {data}=await this.client.from("customers").select("id").eq("business_id",businessId).eq("id",input.customerId).eq("is_archived",false).maybeSingle();
      if(data?.id){await this.updateCustomer({id:String(data.id),displayName:input.clientName,...(input.clientPhone?{phone:input.clientPhone}:{}),...(input.clientEmail?{email:input.clientEmail}:{})});return String(data.id);}
    }
    const duplicates=await this.findCustomerDuplicates({...(input.clientPhone?{phone:input.clientPhone}:{}),...(input.clientEmail?{email:input.clientEmail}:{})});
    if(duplicates.length===1){
      const firstDuplicate=duplicates[0];
      if(!firstDuplicate) throw new Error("DUPLICATE_CUSTOMER_LOOKUP_EMPTY");
      const id=firstDuplicate.customer.id;
      await this.updateCustomer({id,displayName:input.clientName,...(input.clientPhone?{phone:input.clientPhone}:{}),...(input.clientEmail?{email:input.clientEmail}:{})});
      return id;
    }
    const {data,error}=await this.client.from("customers").insert({business_id:businessId,display_name:input.clientName.trim(),phone:input.clientPhone?.trim()||null,email:input.clientEmail?.trim().toLowerCase()||null,notes:null,is_archived:false}).select("id").single();
    if(error||!data?.id)throw new Error(`CLOUD_CUSTOMER_CREATE_FAILED:${error?.message??"EMPTY"}`);
    return String(data.id);
  }

  async issueReceipt(input:CloudReceiptIssueInput):Promise<CloudReceiptIssueResult>{
    await this.assertCurrentDeviceActive();
    const current=this.status;
    if(!current.connected||!current.businessId||!current.deviceId)throw new Error("CLOUD_CONNECTION_REQUIRED_FOR_RECEIPT");
    const customerId=await this.ensureCustomerForReceipt(input);
    const {data:reserved,error:reserveError}=await this.client.rpc("reserve_receipt_number",{p_business_id:current.businessId,p_device_id:current.deviceId,p_ttl_minutes:15});
    if(reserveError)throw new Error(`CLOUD_RECEIPT_RESERVE_FAILED:${reserveError.message}`);
    const reservation=Array.isArray(reserved)?reserved[0]:reserved;
    if(!reservation?.reservation_id||!reservation?.receipt_number)throw new Error("CLOUD_RECEIPT_RESERVE_EMPTY");
    const {data:issued,error:issueError}=await this.client.rpc("issue_receipt_from_reservation",{
      p_business_id:current.businessId,p_device_id:current.deviceId,p_reservation_id:String(reservation.reservation_id),p_payment_date:input.paymentDate,p_customer_id:customerId,
      p_client_name:input.clientName,p_client_phone:input.clientPhone??null,p_client_email:input.clientEmail??null,p_description:input.description,p_amount_agorot:input.amountAgorot,
      p_payment_method:input.paymentMethod,p_reference_number:input.referenceNumber??null
    });
    if(issueError)throw new Error(`CLOUD_RECEIPT_ISSUE_FAILED:${issueError.message}`);
    const row=Array.isArray(issued)?issued[0]:issued;
    if(!row?.id||!row?.receipt_number)throw new Error("CLOUD_RECEIPT_ISSUE_EMPTY");
    await this.refresh();
    return {id:String(row.id),receiptNumber:Number(row.receipt_number),issuedAt:row.issued_at?String(row.issued_at):null,status:String(row.status??"active"),reservationId:String(reservation.reservation_id)};
  }

  async uploadReceiptPdf(receiptId:string,receiptNumber:number,pdfPath:string):Promise<string>{
    await this.assertCurrentDeviceActive();
    const current=this.status;
    if(!current.connected||!current.businessId)throw new Error("CLOUD_CONNECTION_REQUIRED_FOR_PDF");
    const bytes=fs.readFileSync(pdfPath);
    const storageKey=`${current.businessId}/${receiptId}/receipt-${receiptNumber}.pdf`;
    const {error:uploadError}=await this.client.storage.from("receipt-documents").upload(storageKey,bytes,{contentType:"application/pdf",upsert:true});
    if(uploadError)throw new Error(`CLOUD_RECEIPT_PDF_UPLOAD_FAILED:${uploadError.message}`);
    const {error:updateError}=await this.client.rpc("link_receipt_pdf_storage_key",{p_business_id:current.businessId,p_receipt_id:receiptId,p_pdf_storage_key:storageKey});
    if(updateError)throw new Error(`CLOUD_RECEIPT_PDF_LINK_FAILED:${updateError.message}`);
    return storageKey;
  }

  private mapReceipt(row:any):ReceiptRecord{
    return {
      id:String(row.id),
      receiptNumber:Number(row.receipt_number),
      paymentDate:String(row.payment_date),
      issuedAt:String(row.issued_at),
      clientName:String(row.client_name??""),
      description:String(row.description??""),
      amountAgorot:Number(row.amount_agorot??0),
      paymentMethod:String(row.payment_method??"cash") as PaymentMethod,
      status:row.status==="cancelled"?"cancelled":"active",
      contentHash:String(row.content_hash??""),
      originalPdfPath:row.pdf_storage_key?String(row.pdf_storage_key):null,
      originalPdfHash:null,
      cancellationPdfPath:row.cancellation_pdf_storage_key?String(row.cancellation_pdf_storage_key):null,
      cancellationPdfHash:null,
      cancelledAt:row.cancelled_at?String(row.cancelled_at):null,
      cancellationReason:row.cancellation_reason?String(row.cancellation_reason):null,
      clientPhone:row.client_phone?String(row.client_phone):null,
      clientEmail:row.client_email?String(row.client_email):null,
      referenceNumber:row.reference_number?String(row.reference_number):null
    };
  }

  async searchReceipts(filters:ReceiptSearchFilters):Promise<ReceiptSearchResult>{
    await this.assertCurrentDeviceActive();
    const current=this.status;
    if(!current.connected||!current.businessId)throw new Error("CLOUD_CONNECTION_REQUIRED_FOR_HISTORY");
    let query=this.client.from("receipts")
      .select("id,receipt_number,payment_date,issued_at,client_name,client_phone,client_email,description,amount_agorot,payment_method,reference_number,status,cancellation_reason,cancelled_at,content_hash,pdf_storage_key,cancellation_pdf_storage_key")
      .eq("business_id",current.businessId);
    if(filters.fromDate)query=query.gte("payment_date",filters.fromDate);
    if(filters.toDate)query=query.lte("payment_date",filters.toDate);
    if(filters.status&&filters.status!=="all")query=query.eq("status",filters.status);
    if(filters.paymentMethod&&filters.paymentMethod!=="all")query=query.eq("payment_method",filters.paymentMethod);
    if(Number.isFinite(filters.minAmountAgorot))query=query.gte("amount_agorot",Number(filters.minAmountAgorot));
    if(Number.isFinite(filters.maxAmountAgorot))query=query.lte("amount_agorot",Number(filters.maxAmountAgorot));
    const {data,error}=await query.limit(5000);
    if(error)throw new Error(`CLOUD_RECEIPT_HISTORY_FAILED:${error.message}`);
    let items=(data??[]).map(row=>this.mapReceipt(row));
    const needle=(filters.query??"").trim().toLowerCase();
    if(needle){
      items=items.filter(item=>[item.receiptNumber,item.clientName,item.clientPhone,item.clientEmail,item.description,item.referenceNumber,item.amountAgorot/100].some(v=>String(v??"").toLowerCase().includes(needle)));
    }
    const sort=filters.sort??"newest";
    items.sort((a,b)=>{
      if(sort==="oldest")return a.issuedAt.localeCompare(b.issuedAt);
      if(sort==="amount_desc")return b.amountAgorot-a.amountAgorot;
      if(sort==="amount_asc")return a.amountAgorot-b.amountAgorot;
      if(sort==="number_desc")return b.receiptNumber-a.receiptNumber;
      if(sort==="number_asc")return a.receiptNumber-b.receiptNumber;
      return b.issuedAt.localeCompare(a.issuedAt);
    });
    return {items,totalItems:items.length,activeAmountAgorot:items.filter(x=>x.status==="active").reduce((sum,x)=>sum+x.amountAgorot,0)};
  }

  async getReceiptCoreStatus():Promise<ReceiptCoreStatus>{
    await this.assertCurrentDeviceActive();
    const businessId=this.requireBusinessId("CLOUD_CONNECTION_REQUIRED_FOR_DASHBOARD");
    const [{count,error:countError},{data:sequence,error:sequenceError},{data:latest,error:latestError}]=await Promise.all([
      this.client.from("receipts").select("id",{count:"exact",head:true}).eq("business_id",businessId),
      this.client.from("receipt_sequences").select("next_number,last_issued_number").eq("business_id",businessId).single(),
      this.client.from("receipts").select("id,receipt_number,payment_date,issued_at,client_name,client_phone,client_email,description,amount_agorot,payment_method,reference_number,status,cancellation_reason,cancelled_at,content_hash,pdf_storage_key,cancellation_pdf_storage_key").eq("business_id",businessId).order("receipt_number",{ascending:false}).limit(1).maybeSingle()
    ]);
    if(countError)throw new Error(`CLOUD_DASHBOARD_COUNT_FAILED:${countError.message}`);
    if(sequenceError)throw new Error(`CLOUD_SEQUENCE_STATUS_FAILED:${sequenceError.message}`);
    if(latestError)throw new Error(`CLOUD_LATEST_RECEIPT_FAILED:${latestError.message}`);
    return {receiptCount:count??0,nextReceiptNumber:Number(sequence.next_number),lastIssuedNumber:Number(sequence.last_issued_number),latestReceipt:latest?this.mapReceipt(latest):null};
  }

  async getRangeReport(filters:{fromDate?:string;toDate?:string}):Promise<DateRangeReport>{
    await this.assertCurrentDeviceActive();
    const businessId=this.requireBusinessId("CLOUD_CONNECTION_REQUIRED_FOR_REPORTS");
    let query=this.client.from("receipts").select("payment_date,amount_agorot,status").eq("business_id",businessId);
    if(filters.fromDate)query=query.gte("payment_date",filters.fromDate);
    if(filters.toDate)query=query.lte("payment_date",filters.toDate);
    const {data,error}=await query.limit(10000);
    if(error)throw new Error(`CLOUD_REPORT_RANGE_FAILED:${error.message}`);
    const rows=(data??[]) as Array<{payment_date:string;amount_agorot:number;status:string}>;
    const active=rows.filter(row=>row.status==="active"),cancelled=rows.filter(row=>row.status==="cancelled");
    const monthMap=new Map<string,MonthlyReportRow>();
    for(const row of rows){
      const month=String(row.payment_date).slice(0,7);
      const current=monthMap.get(month)??{month,incomeAgorot:0,activeReceiptCount:0,cancelledReceiptCount:0};
      if(row.status==="active"){current.incomeAgorot+=Number(row.amount_agorot??0);current.activeReceiptCount++;}else current.cancelledReceiptCount++;
      monthMap.set(month,current);
    }
    const income=active.reduce((sum,row)=>sum+Number(row.amount_agorot??0),0);
    return {fromDate:filters.fromDate??null,toDate:filters.toDate??null,incomeAgorot:income,activeReceiptCount:active.length,cancelledReceiptCount:cancelled.length,averageReceiptAgorot:active.length?Math.round(income/active.length):0,months:[...monthMap.values()].sort((a,b)=>a.month.localeCompare(b.month))};
  }

  async getAnnualReport(year:number):Promise<AnnualReport>{
    await this.assertCurrentDeviceActive();
    const range=await this.getRangeReport({fromDate:`${year}-01-01`,toDate:`${year}-12-31`});
    const byMonth=new Map(range.months.map(item=>[item.month,item]));
    const months:Array<MonthlyReportRow>=Array.from({length:12},(_,index)=>{const month=`${year}-${String(index+1).padStart(2,"0")}`;return byMonth.get(month)??{month,incomeAgorot:0,activeReceiptCount:0,cancelledReceiptCount:0};});
    return {...range,year,months};
  }

  async getReceiptById(receiptId:string):Promise<ReceiptRecord>{
    await this.assertCurrentDeviceActive();
    const current=this.status;
    if(!current.connected||!current.businessId)throw new Error("CLOUD_CONNECTION_REQUIRED_FOR_HISTORY");
    const {data,error}=await this.client.from("receipts")
      .select("id,receipt_number,payment_date,issued_at,client_name,client_phone,client_email,description,amount_agorot,payment_method,reference_number,status,cancellation_reason,cancelled_at,content_hash,pdf_storage_key,cancellation_pdf_storage_key")
      .eq("business_id",current.businessId).eq("id",receiptId).single();
    if(error)throw new Error(`CLOUD_RECEIPT_LOOKUP_FAILED:${error.message}`);
    return this.mapReceipt(data);
  }


  async cancelReceipt(receiptId:string,reason:string):Promise<CancelReceiptResult>{
    await this.assertCurrentDeviceActive();
    const businessId=this.requireBusinessId("CLOUD_CONNECTION_REQUIRED_FOR_CANCELLATION");
    const cleanReason=reason.trim();
    if(!receiptId.trim()||cleanReason.length<5)throw new Error("INVALID_CANCELLATION_REASON");
    const {error}=await this.client.rpc("cancel_receipt_cloud",{
      p_business_id:businessId,p_receipt_id:receiptId,p_reason:cleanReason
    });
    if(error)throw new Error(`CLOUD_RECEIPT_CANCEL_FAILED:${error.message}`);
    const receipt=await this.getReceiptById(receiptId);
    return {receipt,cancellationPdfCreated:false,cancellationPdfPath:null,warningCode:"CLOUD_CANCELLATION_RECORDED"};
  }

  async getReceiptPdfUrl(receiptId:string,kind:"original"|"cancellation"="original"):Promise<string>{
    await this.assertCurrentDeviceActive();
    const receipt=await this.getReceiptById(receiptId);
    const key=kind==="cancellation"?receipt.cancellationPdfPath:receipt.originalPdfPath;
    if(!key)throw new Error("PDF_NOT_FOUND");
    const {data,error}=await this.client.storage.from("receipt-documents").createSignedUrl(key,300);
    if(error||!data?.signedUrl)throw new Error(`CLOUD_RECEIPT_PDF_URL_FAILED:${error?.message??"EMPTY_URL"}`);
    return data.signedUrl;
  }

  async downloadReceiptPdf(receiptId:string):Promise<{receipt:ReceiptRecord;filePath:string}>{
    await this.assertCurrentDeviceActive();
    const receipt=await this.getReceiptById(receiptId);
    if(!receipt.originalPdfPath)throw new Error("PDF_NOT_FOUND");
    const {data,error}=await this.client.storage.from("receipt-documents").download(receipt.originalPdfPath);
    if(error||!data)throw new Error(`CLOUD_RECEIPT_PDF_DOWNLOAD_FAILED:${error?.message??"EMPTY_FILE"}`);
    const bytes=Buffer.from(await data.arrayBuffer());
    const folder=path.join(this.userDataPath,"cloud-receipts");
    fs.mkdirSync(folder,{recursive:true});
    const filePath=path.join(folder,`receipt-${receipt.receiptNumber}.pdf`);
    fs.writeFileSync(filePath,bytes);
    return {receipt,filePath};
  }


  private mapExpense(row:any):ExpenseRecord{
    return {
      id:String(row.id),expenseDate:String(row.expense_date??""),supplierName:String(row.supplier_name??""),amountAgorot:Number(row.amount_agorot??0),
      category:String(row.category??""),paymentMethod:row.payment_method?String(row.payment_method):null,notes:row.notes?String(row.notes):null,
      attachmentPath:row.attachment_storage_key?String(row.attachment_storage_key):null,attachmentOriginalName:row.attachment_original_name?String(row.attachment_original_name):null,
      createdAt:String(row.created_at??""),updatedAt:String(row.updated_at??row.created_at??"")
    };
  }

  async listExpenses(filters:ExpenseSearchFilters={}):Promise<ExpenseSummary>{
    await this.assertCurrentDeviceActive();
    const current=this.requireConnected();
    let query=this.client.from("expenses").select("*").eq("business_id",current.businessId);
    if(filters.fromDate)query=query.gte("expense_date",filters.fromDate);
    if(filters.toDate)query=query.lte("expense_date",filters.toDate);
    if(filters.category)query=query.eq("category",filters.category);
    query=query.order("expense_date",{ascending:false}).order("created_at",{ascending:false});
    const {data,error}=await query;
    if(error)throw new Error(`CLOUD_EXPENSE_LIST_FAILED:${error.message}`);
    let items=(data??[]).map(row=>this.mapExpense(row));
    const needle=filters.query?.trim().toLowerCase();
    if(needle)items=items.filter(item=>[item.supplierName,item.notes,item.paymentMethod,item.category,item.amountAgorot/100].some(v=>String(v??"").toLowerCase().includes(needle)));
    return {items,count:items.length,totalAgorot:items.reduce((sum,item)=>sum+item.amountAgorot,0)};
  }

  async addExpense(input:ExpenseInput):Promise<ExpenseRecord>{
    await this.assertCurrentDeviceActive();
    const current=this.requireConnected();
    const supplier=input.supplierName.trim(),category=input.category.trim();
    if(!supplier||!input.expenseDate||!category||!Number.isInteger(input.amountAgorot)||input.amountAgorot<=0)throw new Error("INVALID_EXPENSE_INPUT");
    const now=new Date().toISOString();
    const id=crypto.randomUUID();
    const row:any={id,business_id:current.businessId,expense_date:input.expenseDate,supplier_name:supplier,amount_agorot:input.amountAgorot,category,payment_method:input.paymentMethod?.trim()||null,notes:input.notes?.trim()||null,attachment_storage_key:null,attachment_original_name:null,created_at:now,updated_at:now};
    const {data,error}=await this.client.from("expenses").insert(row).select("*").single();
    if(error)throw new Error(`CLOUD_EXPENSE_ADD_FAILED:${error.message}`);
    if(input.attachmentSourcePath) return await this.uploadExpenseAttachment(this.mapExpense(data),input.attachmentSourcePath);
    await this.refreshCountsQuietly();
    return this.mapExpense(data);
  }

  async updateExpense(input:ExpenseUpdateInput):Promise<ExpenseRecord>{
    await this.assertCurrentDeviceActive();
    const current=this.requireConnected();
    const supplier=input.supplierName.trim(),category=input.category.trim();
    if(!input.id||!supplier||!input.expenseDate||!category||!Number.isInteger(input.amountAgorot)||input.amountAgorot<=0)throw new Error("INVALID_EXPENSE_INPUT");
    const existing=await this.getExpense(input.id);
    if(input.removeAttachment&&existing.attachmentPath){
      await this.client.storage.from("expense-attachments").remove([existing.attachmentPath]);
    }
    const patch:any={expense_date:input.expenseDate,supplier_name:supplier,amount_agorot:input.amountAgorot,category,payment_method:input.paymentMethod?.trim()||null,notes:input.notes?.trim()||null,updated_at:new Date().toISOString()};
    if(input.removeAttachment){patch.attachment_storage_key=null;patch.attachment_original_name=null;}
    const {data,error}=await this.client.from("expenses").update(patch).eq("business_id",current.businessId).eq("id",input.id).select("*").single();
    if(error)throw new Error(`CLOUD_EXPENSE_UPDATE_FAILED:${error.message}`);
    if(input.attachmentSourcePath)return await this.uploadExpenseAttachment(this.mapExpense(data),input.attachmentSourcePath);
    return this.mapExpense(data);
  }

  async deleteExpense(id:string):Promise<boolean>{
    await this.assertCurrentDeviceActive();
    const current=this.requireConnected();
    const existing=await this.getExpense(id);
    if(existing.attachmentPath){const {error}=await this.client.storage.from("expense-attachments").remove([existing.attachmentPath]);if(error)console.warn("Cloud expense attachment delete failed",error);}
    const {error}=await this.client.from("expenses").delete().eq("business_id",current.businessId).eq("id",id);
    if(error)throw new Error(`CLOUD_EXPENSE_DELETE_FAILED:${error.message}`);
    await this.refreshCountsQuietly();
    return true;
  }

  async openExpenseAttachment(id:string):Promise<string>{
    await this.assertCurrentDeviceActive();
    const expense=await this.getExpense(id);
    if(!expense.attachmentPath)throw new Error("EXPENSE_ATTACHMENT_NOT_FOUND");
    const {data,error}=await this.client.storage.from("expense-attachments").download(expense.attachmentPath);
    if(error||!data)throw new Error(`CLOUD_EXPENSE_ATTACHMENT_DOWNLOAD_FAILED:${error?.message??"empty"}`);
    const bytes=Buffer.from(await data.arrayBuffer());
    const ext=verifyCloudExpenseAttachment(bytes);
    const folder=path.join(this.userDataPath,"cloud-expenses");
    fs.mkdirSync(folder,{recursive:true});
    const filePath=path.join(folder,`expense-${crypto.randomUUID()}${ext}`);
    const tempPath=path.join(folder,`.download-${crypto.randomUUID()}.tmp`);
    try{
      fs.writeFileSync(tempPath,bytes,{flag:"wx",mode:0o600});
      fs.renameSync(tempPath,filePath);
      return filePath;
    }finally{
      try{fs.rmSync(tempPath,{force:true});}catch{}
    }
  }

  private async getExpense(id:string):Promise<ExpenseRecord>{
    const current=this.requireConnected();
    const {data,error}=await this.client.from("expenses").select("*").eq("business_id",current.businessId).eq("id",id).single();
    if(error)throw new Error(`CLOUD_EXPENSE_GET_FAILED:${error.message}`);return this.mapExpense(data);
  }

  private async uploadExpenseAttachment(expense:ExpenseRecord,sourcePath:string):Promise<ExpenseRecord>{
    const current=this.requireConnected();
    if(!fs.existsSync(sourcePath))throw new Error("EXPENSE_ATTACHMENT_SOURCE_NOT_FOUND");
    if(expense.attachmentPath){await this.client.storage.from("expense-attachments").remove([expense.attachmentPath]);}
    const original=path.basename(sourcePath),safe=original.replace(/[^a-zA-Z0-9._-]+/g,"-")||"attachment";
    const storageKey=`${current.businessId}/${expense.id}/${Date.now()}-${safe}`;
    const bytes=fs.readFileSync(sourcePath);const ext=path.extname(original).toLowerCase();
    const contentType=ext===".pdf"?"application/pdf":ext===".png"?"image/png":ext===".webp"?"image/webp":"image/jpeg";
    const {error:uploadError}=await this.client.storage.from("expense-attachments").upload(storageKey,bytes,{contentType,upsert:false});
    if(uploadError)throw new Error(`CLOUD_EXPENSE_ATTACHMENT_UPLOAD_FAILED:${uploadError.message}`);
    const {data,error}=await this.client.from("expenses").update({attachment_storage_key:storageKey,attachment_original_name:original,updated_at:new Date().toISOString()}).eq("business_id",current.businessId).eq("id",expense.id).select("*").single();
    if(error){await this.client.storage.from("expense-attachments").remove([storageKey]);throw new Error(`CLOUD_EXPENSE_ATTACHMENT_LINK_FAILED:${error.message}`);}
    return this.mapExpense(data);
  }

  private requireConnected():{businessId:string;deviceId:string}{
    if(!this.status.connected||!this.status.businessId||!this.status.deviceId)throw new Error("CLOUD_NOT_CONNECTED");
    return {businessId:this.status.businessId,deviceId:this.status.deviceId};
  }

  private async refreshCountsQuietly():Promise<void>{try{await this.refresh();}catch{}}


  async getBusinessSettings(local:BusinessSettingsRecord|null):Promise<BusinessSettingsRecord|null>{
    await this.assertCurrentDeviceActive();
    const businessId=this.requireBusinessId("CLOUD_CONNECTION_REQUIRED_FOR_BUSINESS_PROFILE");
    const {data,error}=await this.client.from("businesses").select("*").eq("id",businessId).single();
    if(error)throw new Error(`CLOUD_BUSINESS_PROFILE_FAILED:${error.message}`);
    if(!data)return local;
    let logoPath=local?.logoPath??null;
    const logoKey=data.logo_storage_key?String(data.logo_storage_key):null;
    if(logoKey){
      try{
        const {data:file,error:fileError}=await this.client.storage.from("business-assets").download(logoKey);
        if(!fileError&&file){
          const ext=path.extname(logoKey)||".png";
          const target=path.join(this.userDataPath,"cloud","branding",`business-logo${ext}`);
          fs.mkdirSync(path.dirname(target),{recursive:true});
          fs.writeFileSync(target,Buffer.from(await file.arrayBuffer()));
          logoPath=target;
        }
      }catch{}
    }
    const now=new Date().toISOString();
    return {
      id:businessId,businessName:String(data.business_name??local?.businessName??""),ownerName:String(data.owner_name??local?.ownerName??""),
      businessNumber:String(data.business_number??local?.businessNumber??""),taxStatus:String(data.tax_status??local?.taxStatus??"עוסק פטור"),
      phone:data.phone?String(data.phone):local?.phone??null,email:data.email?String(data.email):local?.email??null,address:data.address?String(data.address):local?.address??null,
      slogan:data.slogan?String(data.slogan):local?.slogan??null,setupCompleted:true,logoPath,signaturePath:local?.signaturePath??null,
      brandColor:String(data.brand_color??local?.brandColor??"#4F46E5"),backupFolder:local?.backupFolder??null,googleDriveFolder:local?.googleDriveFolder??null,
      pinConfigured:local?.pinConfigured??false,autoLockMinutes:local?.autoLockMinutes??0,createdAt:String(data.created_at??local?.createdAt??now),updatedAt:String(data.updated_at??local?.updatedAt??now)
    };
  }

  async saveBusinessSettings(input:BusinessSettingsInput):Promise<void>{
    await this.assertCurrentDeviceActive();
    const businessId=this.requireBusinessId("CLOUD_CONNECTION_REQUIRED_FOR_BUSINESS_PROFILE");
    let logoStorageKey:string|null=null;
    if(input.logoPath&&fs.existsSync(input.logoPath)){
      const ext=(path.extname(input.logoPath)||".png").toLowerCase();
      logoStorageKey=`${businessId}/branding/logo${ext}`;
      const bytes=fs.readFileSync(input.logoPath);
      const contentType=ext===".jpg"||ext===".jpeg"?"image/jpeg":ext===".webp"?"image/webp":"image/png";
      const {error:uploadError}=await this.client.storage.from("business-assets").upload(logoStorageKey,bytes,{contentType,upsert:true});
      if(uploadError)throw new Error(`CLOUD_BUSINESS_LOGO_UPLOAD_FAILED:${uploadError.message}`);
    }
    const payload:any={business_name:input.businessName.trim(),owner_name:input.ownerName.trim(),business_number:input.businessNumber.trim(),tax_status:input.taxStatus,phone:input.phone?.trim()||null,email:input.email?.trim().toLowerCase()||null,address:input.address?.trim()||null,slogan:input.slogan?.trim()||null,brand_color:input.brandColor||"#4F46E5",updated_at:new Date().toISOString()};
    if(logoStorageKey)payload.logo_storage_key=logoStorageKey;
    const {error}=await this.client.from("businesses").update(payload).eq("id",businessId);
    if(error)throw new Error(`CLOUD_BUSINESS_PROFILE_SAVE_FAILED:${error.message}`);
    await this.refresh();
  }

  async listDevices():Promise<SupabaseCloudDevice[]>{
    await this.assertCurrentDeviceActive();
    const {businessId}=this.requireConnected();
    const {data,error}=await this.client.from("devices").select("id,platform,display_name,last_seen_at,created_at").eq("business_id",businessId).is("revoked_at",null).order("last_seen_at",{ascending:false});
    if(error)throw new Error(`CLOUD_DEVICE_LIST_FAILED:${error.message}`);
    return (data??[]).map((row:any)=>({id:String(row.id),platform:row.platform,displayName:row.display_name?String(row.display_name):null,lastSeenAt:String(row.last_seen_at),createdAt:String(row.created_at)}));
  }

  async revokeDevice(targetDeviceId:string):Promise<void>{
    await this.assertCurrentDeviceActive();
    const {businessId,deviceId}=this.requireConnected();
    if(!targetDeviceId||targetDeviceId===deviceId)throw new Error("CANNOT_REVOKE_CURRENT_DEVICE");
    const {error}=await this.client.rpc("revoke_device",{p_business_id:businessId,p_device_id:targetDeviceId,p_current_device_id:deviceId});
    if(error)throw new Error(`CLOUD_DEVICE_REVOKE_FAILED:${error.message}`);
  }

  private async count(table:string,businessId:string):Promise<number>{
    const {count,error}=await this.client.from(table).select("id",{count:"exact",head:true}).eq("business_id",businessId);
    if(error)throw new Error(`CLOUD_COUNT_${table.toUpperCase()}_FAILED:${error.message}`);
    return count??0;
  }

  private deviceKeyPath():string{return path.join(this.userDataPath,"cloud","windows-device.json");}

  private saveDeviceKey(deviceKey:string):void{
    const filePath=this.deviceKeyPath();
    fs.mkdirSync(path.dirname(filePath),{recursive:true});
    fs.writeFileSync(filePath,JSON.stringify({deviceKey},null,2),"utf8");
  }

  private getOrCreateDeviceKey():string{
    const filePath=this.deviceKeyPath();
    try{
      const parsed=JSON.parse(fs.readFileSync(filePath,"utf8")) as {deviceKey?:string};
      if(parsed.deviceKey)return parsed.deviceKey;
    }catch{}
    const deviceKey=crypto.randomUUID();
    this.saveDeviceKey(deviceKey);
    return deviceKey;
  }

  private async registerWindowsDevice(businessId:string,deviceKey:string):Promise<string>{
    const {data,error}=await this.client.rpc("register_device",{
      p_business_id:businessId,
      p_device_key:deviceKey,
      p_platform:"windows",
      p_display_name:"מפתחות להצלחה Windows"
    });
    if(error){
      if(error.message.includes("DEVICE_REVOKED"))throw new Error("CLOUD_DEVICE_REVOKED");
      throw new Error(`CLOUD_DEVICE_REGISTRATION_FAILED:${error.message}`);
    }
    return String(data);
  }

  private async ensureWindowsDevice(businessId:string,allowDeviceReenroll:boolean):Promise<string>{
    const deviceKey=this.getOrCreateDeviceKey();
    try{return await this.registerWindowsDevice(businessId,deviceKey);}
    catch(error){
      if(!(error instanceof Error)||!error.message.includes("CLOUD_DEVICE_REVOKED")||!allowDeviceReenroll)throw error;
      const replacementKey=crypto.randomUUID();
      const deviceId=await this.registerWindowsDevice(businessId,replacementKey);
      this.saveDeviceKey(replacementKey);
      return deviceId;
    }
  }
}
