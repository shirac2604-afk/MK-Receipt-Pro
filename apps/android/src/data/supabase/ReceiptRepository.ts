import {supabase} from "../../lib/supabase";
import type {PaymentMethod,Receipt} from "../../domain/types";
import {getCloudDeviceId} from "./DeviceRepository";
import {reserveReceiptNumber} from "./ReceiptNumberRepository";
import {formatUnknownError} from "../../services/ErrorFormatter";

function mapReceipt(row:any):Receipt{return {id:String(row.id),receiptNumber:Number(row.receipt_number),paymentDate:String(row.payment_date),issuedAt:String(row.issued_at),clientName:String(row.client_name),description:String(row.description),amountAgorot:Number(row.amount_agorot),paymentMethod:row.payment_method as PaymentMethod,status:row.status,clientPhone:row.client_phone??null,clientEmail:row.client_email??null,referenceNumber:row.reference_number??null,originalPdfPath:row.pdf_storage_key??null,cancellationPdfPath:row.cancellation_pdf_storage_key??null,cancelledAt:row.cancelled_at??null,cancellationReason:row.cancellation_reason??null};}

export interface IssueCloudReceiptInput{customerId?:string|null;clientName:string;clientPhone?:string;clientEmail?:string;description:string;amountAgorot:number;paymentDate:string;paymentMethod:PaymentMethod;referenceNumber?:string;}

export class ReceiptRepository{
 constructor(private businessId:string){}
 async list():Promise<Receipt[]>{const {data,error}=await supabase.from("receipts").select("*").eq("business_id",this.businessId).order("receipt_number",{ascending:false});if(error)throw error;return (data??[]).map(mapReceipt);}
 async issue(input:IssueCloudReceiptInput):Promise<Receipt>{
  const deviceId=await getCloudDeviceId();
  if(!deviceId)throw new Error("שלב רישום מכשיר: DEVICE_NOT_REGISTERED");

  let reservation;
  try{
    reservation=await reserveReceiptNumber(this.businessId);
  }catch(error){
    throw new Error(`שלב הקצאת מספר קבלה נכשל\n${formatUnknownError(error)}`);
  }

  const {data,error}=await supabase.rpc("issue_receipt_from_reservation",{
    p_business_id:this.businessId,
    p_device_id:deviceId,
    p_reservation_id:reservation.reservationId,
    p_payment_date:input.paymentDate,
    p_customer_id:input.customerId||null,
    p_client_name:input.clientName.trim(),
    p_client_phone:input.clientPhone?.trim()||null,
    p_client_email:input.clientEmail?.trim().toLowerCase()||null,
    p_description:input.description.trim(),
    p_amount_agorot:input.amountAgorot,
    p_payment_method:input.paymentMethod,
    p_reference_number:input.referenceNumber?.trim()||null
  });

  if(error){
    throw new Error(`שלב הנפקת הקבלה בענן נכשל\n${formatUnknownError(error)}`);
  }

  const issued=Array.isArray(data)?data[0]:data;
  if(!issued?.id){
    throw new Error(`שלב הנפקת הקבלה בענן נכשל\nRECEIPT_ISSUE_EMPTY_RESPONSE`);
  }

  const {data:row,error:loadError}=await supabase
    .from("receipts")
    .select("*")
    .eq("business_id",this.businessId)
    .eq("id",issued.id)
    .single();

  if(loadError){
    throw new Error(`הקבלה הונפקה אך טעינתה נכשלה\n${formatUnknownError(loadError)}`);
  }
  return mapReceipt(row);
 }
 async setPdfStorageKey(receiptId:string,storageKey:string):Promise<Receipt>{
  const {error}=await supabase.rpc("link_receipt_pdf_storage_key",{
    p_business_id:this.businessId,
    p_receipt_id:receiptId,
    p_pdf_storage_key:storageKey
  });
  if(error)throw error;
  return this.getById(receiptId);
 }
 async cancel(receiptId:string,reason:string):Promise<Receipt>{
  const cleanReason=reason.trim();
  if(cleanReason.length<5)throw new Error("INVALID_CANCELLATION_REASON");
  const {error}=await supabase.rpc("cancel_receipt_cloud",{p_business_id:this.businessId,p_receipt_id:receiptId,p_reason:cleanReason});
  if(error)throw new Error(`CLOUD_RECEIPT_CANCEL_FAILED:${error.message}`);
  return this.getById(receiptId);
 }

 async getById(receiptId:string):Promise<Receipt>{
  const {data,error}=await supabase.from("receipts")
    .select("*")
    .eq("business_id",this.businessId)
    .eq("id",receiptId)
    .single();
  if(error)throw error;
  return mapReceipt(data);
 }

}
